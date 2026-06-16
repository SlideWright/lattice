import { Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const titleCase = (s: string) => s.replace(/(^|-)(\w)/g, (_m, sep, c) => (sep ? ' ' : '') + c.toUpperCase());

type ChromeBus = {
	getPalette: () => string;
	getMode: () => 'light' | 'dark';
	getPalettes: () => string[];
	applyTheme: (name: string) => void;
	toggleMode: () => 'light' | 'dark';
};
type ChromeSync = { palette: string; mode: 'light' | 'dark'; palettes: string[] };

declare global {
	interface Window {
		__dbChrome?: ChromeBus;
	}
}

/**
 * The Drawing Board top-bar palette + light/dark controls — a React + shadcn
 * island that REPLICATES the deck-theme-writing authoring semantics (it is NOT
 * the chrome-only site PaletteControls). A palette pick WRITES the deck's
 * `theme:` front matter through the vanilla render controller's chrome bus
 * (window.__dbChrome.applyTheme → __dbConfig.writeFrontMatter), and the chrome
 * mirrors the deck's theme back onto data-palette via syncThemeControls — which
 * fires the `db-chrome-sync` event this island listens for. This preserves the
 * verified authoring behaviour (drawing-board.astro applyTheme/syncThemeControls)
 * exactly; the island only owns the chrome, the controller owns the logic.
 *
 * The controller exposes its bus on window.__dbChrome and fires `db-chrome-ready`
 * once wired; until then the island drives nothing (the legacy bus simply isn't
 * present yet). It never owns first paint — the pre-paint <head> script does.
 */
export default function DrawingBoardTopbar({ palettes: initialPalettes }: { palettes: string[] }) {
	const [palette, setPalette] = React.useState(initialPalettes[0] ?? 'indaco');
	const [mode, setMode] = React.useState<'light' | 'dark'>('light');
	const [palettes, setPalettes] = React.useState(initialPalettes);

	React.useEffect(() => {
		// Sync from the live chrome bus (set by the pre-paint script + the render
		// controller). The bus may not be wired yet on mount; db-chrome-ready tells
		// us when it is, and db-chrome-sync pushes every later deck-theme change +
		// newly-saved library palette.
		const pull = () => {
			const bus = window.__dbChrome;
			if (!bus) return;
			setPalette(bus.getPalette());
			setMode(bus.getMode());
			const ps = bus.getPalettes();
			if (ps.length) setPalettes(ps);
		};
		const onSync = (e: Event) => {
			const d = (e as CustomEvent<ChromeSync>).detail;
			if (!d) return pull();
			setPalette(d.palette);
			setMode(d.mode);
			if (d.palettes?.length) setPalettes(d.palettes);
		};
		pull();
		window.addEventListener('db-chrome-ready', pull);
		window.addEventListener('db-chrome-sync', onSync as EventListener);
		// bfcache restores (Back into the board) — re-pull from the live DOM.
		window.addEventListener('pageshow', pull);
		return () => {
			window.removeEventListener('db-chrome-ready', pull);
			window.removeEventListener('db-chrome-sync', onSync as EventListener);
			window.removeEventListener('pageshow', pull);
		};
	}, []);

	const onPalette = (value: string) => {
		setPalette(value); // optimistic; the controller's sync confirms
		window.__dbChrome?.applyTheme(value);
	};
	const onMode = () => {
		const next = window.__dbChrome?.toggleMode();
		if (next) setMode(next);
	};

	return (
		<div className="lx-ui flex items-center gap-2">
			<Select value={palettes.includes(palette) ? palette : ''} onValueChange={onPalette}>
				<SelectTrigger
					size="sm"
					aria-label="Deck theme"
					title="Deck theme — written into this deck's front matter"
					className="w-[8.5rem]"
				>
					<SelectValue placeholder="Theme" />
				</SelectTrigger>
				<SelectContent className="max-h-[60vh]">
					{/* Brand themes only. The accessibility (colour-vision-deficiency)
					 * palettes are NOT themes — they are a separate viewer axis that
					 * overrides the theme, set via the Settings → Accessibility control
					 * (workspace) or the deck's `accessibility:` key, never picked here. */}
					{palettes
						.filter((p) => !p.startsWith('a11y-'))
						.map((p) => (
							<SelectItem key={p} value={p}>
								{titleCase(p)}
							</SelectItem>
						))}
				</SelectContent>
			</Select>
			<Button
				variant="outline"
				size="icon-sm"
				onClick={onMode}
				aria-label="Toggle light / dark"
				title="Toggle light / dark"
			>
				{mode === 'dark' ? <Sun /> : <Moon />}
			</Button>
		</div>
	);
}
