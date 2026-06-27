import { FileText, LayoutGrid, Monitor, Pause, Sparkles, Volume2, X } from 'lucide-react';
import * as React from 'react';
import DeckPreview from '@/components/DeckPreview';
import type { SingleSlideOptions } from '@/lib/single-slide-render';
import { cn } from '@/lib/utils';

// Present = a verb (plan §17): a full-screen takeover you ENTER and exit, not a
// persistent tab. Read-aloud dock + reader-facing lens switch (meet the reader
// where they want to go). The slide is the real engine render.
export function PresentOverlay({ open, onClose, options, slide }: { open: boolean; onClose: () => void; options: SingleSlideOptions; slide: string }) {
	const [lens, setLens] = React.useState(0);
	React.useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);
	if (!open) return null;
	const lenses = [
		{ icon: <FileText className="size-3.5" />, label: 'Full deck' },
		{ icon: <Sparkles className="size-3.5" />, label: 'Exec summary' },
		{ icon: <LayoutGrid className="size-3.5" />, label: 'One-pager' },
	];
	return (
		<div className="lx-ui fixed inset-0 z-[100] flex flex-col items-center bg-background">
			<div className="flex w-full items-center px-5 py-3.5">
				<button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground" aria-label="Exit present"><X className="size-5" /></button>
				<div className="flex-1" />
				<div className="inline-flex gap-1 rounded-full border border-border bg-card p-1">
					{lenses.map((l, i) => (
						<button type="button" key={l.label} onClick={() => setLens(i)} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold', i === lens ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{l.icon}{l.label}</button>
					))}
				</div>
				<div className="flex-1" />
				<button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"><Monitor className="size-4" />Presenter screen</button>
			</div>

			<div className="flex min-h-0 flex-1 w-full items-center justify-center px-6">
				<DeckPreview options={options} sample={slide} mermaid={false} className="relative aspect-video w-full max-w-[960px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_rgba(10,22,40,.18)]" aria-label="Presented slide" />
			</div>

			<div className="mb-7 mt-4 flex items-center gap-3.5 rounded-full border border-border bg-card px-3.5 py-2.5 shadow-[0_8px_24px_rgba(10,22,40,.10)]">
				<button type="button" className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Pause read-aloud"><Pause className="size-5" /></button>
				<div className="relative h-[5px] w-[220px] rounded-full bg-border">
					<span className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-primary" />
					<span className="absolute -top-1 left-[38%] size-[13px] rounded-full bg-primary shadow" />
				</div>
				<span className="font-mono text-[11px] text-muted-foreground">0:21 / 0:54</span>
				<span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]"><Volume2 className="size-3.5" />Aria</span>
			</div>
		</div>
	);
}
