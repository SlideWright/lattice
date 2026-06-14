import { Settings } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CONFIG_PROFILES, createConfigPanel } from '@/playground/deck-config.js';

/**
 * Deck setup — the universal front-matter config panel (createConfigPanel,
 * shared with Workbench + Drawing Board) mounted inside a shadcn Sheet. The
 * panel itself is NOT rewritten: deck-config.js builds its own `.deck-config`
 * rows (styled by deck-config.css), and we host it in a React-owned div, calling
 * config.render() each time the Sheet opens. Writes flow setSource → editor →
 * onChange → live re-render, exactly as before.
 *
 * `noTheme` profile: the top-bar palette picker owns theme on this surface.
 * The trigger icon tints when the deck carries non-theme managed front matter
 * (readFrontMatter().configured) — the same cue the vanilla `is-set` class gave.
 */
export function DeckSetupSheet({
	getSource,
	setSource,
	palettes,
	finishes,
	configured,
}: {
	getSource: () => string;
	setSource: (next: string) => void;
	palettes: string[];
	finishes: string[];
	/** Whether the deck carries non-theme managed front matter (the trigger cue). */
	configured: boolean;
}) {
	const [open, setOpen] = React.useState(false);

	const getSourceRef = React.useRef(getSource);
	const setSourceRef = React.useRef(setSource);
	getSourceRef.current = getSource;
	setSourceRef.current = setSource;

	// A CALLBACK ref, not useEffect: Radix mounts (and on close unmounts) the
	// Sheet body, handing us a fresh host node each open. Building + rendering the
	// vanilla config panel the instant the node attaches sidesteps any effect-vs-
	// portal timing race (the node is guaranteed live here). createConfigPanel +
	// render() are the deck-config.js contract — not reimplemented.
	const mountHost = React.useCallback(
		(host: HTMLDivElement | null) => {
			if (!host) return; // detach on close — nothing to clean up (DOM goes with it)
			const panel = createConfigPanel({
				host,
				getSource: () => getSourceRef.current(),
				setSource: (next: string) => setSourceRef.current(next),
				palettes,
				finishes,
				fields: CONFIG_PROFILES.noTheme,
			});
			panel.render();
		},
		[palettes, finishes],
	);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="outline" size="sm" aria-label="Deck setup" title="Deck setup — front matter for this deck">
					<Settings className={configured ? 'text-primary' : undefined} />
					<span className="hidden sm:inline">Deck setup</span>
				</Button>
			</SheetTrigger>
			<SheetContent className="w-[360px] max-w-[88vw] gap-0 overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
						Deck setup
					</SheetTitle>
					<SheetDescription className="sr-only">
						Front matter for this deck — applied to the whole deck and exported with the .md.
					</SheetDescription>
				</SheetHeader>
				<div className="deck-config px-4 pb-4" ref={mountHost} />
			</SheetContent>
		</Sheet>
	);
}
