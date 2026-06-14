import { ChevronDown } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ExportBus = {
	run: (kind: string) => void;
	hasActiveChart: () => boolean;
};

declare global {
	interface Window {
		__dbExport?: ExportBus;
	}
}

type Item = { kind: string; label: string; hint: string; chartOnly?: boolean };

const ITEMS: Item[] = [
	{ kind: 'md', label: 'Markdown', hint: '.md — the source' },
	{ kind: 'pdf', label: 'PDF', hint: '.pdf — one click' },
	{ kind: 'pptx', label: 'PowerPoint', hint: '.pptx — image slides' },
	{ kind: 'print', label: 'Print', hint: 'vector + selectable text' },
	{ kind: 'charts-svg', label: 'Export chart', hint: ".svg or .png — this slide's chart", chartOnly: true },
	{ kind: 'marp', label: 'Marp bundle', hint: '.zip — portable, renders anywhere' },
];

/**
 * The Export menu CHROME — a React + shadcn DropdownMenu. The export LOGIC and
 * OUTPUT are UNTOUCHED (sign-off-gated): selecting an item calls the vanilla
 * controller's bus (window.__dbExport.run → runExport → drawing-board-export.js).
 * The island only restyles the menu; it never imports or alters the export
 * pipeline. "Export chart" appears only when the cursor's slide carries a chart,
 * queried via hasActiveChart() each time the menu opens (matching the old
 * activeChartSection gate).
 */
export default function DrawingBoardExportMenu() {
	const [open, setOpen] = React.useState(false);
	const [hasChart, setHasChart] = React.useState(false);
	// `client:idle` can hydrate before OR after the export module script wires
	// window.__dbExport. We never block on it (clicks optional-chain), but mark
	// the bus as live once the controller fires db-export-ready so any chart-gated
	// re-query reflects reality on the next open. A no-op state nudge is enough.
	const [, bumpReady] = React.useReducer((n: number) => n + 1, 0);
	React.useEffect(() => {
		if (window.__dbExport) return; // already wired before hydration
		const onReady = () => bumpReady();
		window.addEventListener('db-export-ready', onReady, { once: true });
		return () => window.removeEventListener('db-export-ready', onReady);
	}, []);

	const onOpenChange = (next: boolean) => {
		if (next) setHasChart(Boolean(window.__dbExport?.hasActiveChart?.()));
		setOpen(next);
	};

	const run = (kind: string) => {
		// runExport is async / fire-and-forget, so the menu close isn't blocked by
		// the export. Optional-chaining no-ops a pre-wire click instead of throwing.
		window.__dbExport?.run(kind);
	};

	return (
		<DropdownMenu open={open} onOpenChange={onOpenChange}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="db-btn"
					id="db-export"
					title="Export this deck"
					aria-label="Export this deck"
				>
					Export
					<ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="lx-ui w-56">
				{ITEMS.filter((it) => !it.chartOnly || hasChart).map((it) => (
					<DropdownMenuItem
						key={it.kind}
						onSelect={() => run(it.kind)}
						className="flex-col items-start gap-0.5"
					>
						<span className="font-medium">{it.label}</span>
						<span className="text-xs text-muted-foreground">{it.hint}</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
