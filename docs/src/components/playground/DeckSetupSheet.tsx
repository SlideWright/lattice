import { Settings } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { bboxEnabled, onBboxEnabledChange, setBboxEnabled } from '@/playground/bbox-prefs.js';
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

	// modal={false} + overlay={false}: a non-modal side sheet over a LIVE preview.
	// A modal sheet engages react-remove-scroll's body scroll-lock, which lingers on
	// iOS Safari after close and freezes the preview until focus changes (see
	// engineering/gotchas.md). Non-modal keeps the preview scrollable and lets you
	// watch it update as you change front matter.
	return (
		<Sheet open={open} onOpenChange={setOpen} modal={false}>
			<SheetTrigger asChild>
				<Button variant="outline" size="sm" aria-label="Deck setup" title="Deck setup — front matter for this deck">
					<Settings className={configured ? 'text-primary' : undefined} />
					<span className="hidden sm:inline">Deck setup</span>
				</Button>
			</SheetTrigger>
			<SheetContent overlay={false} className="w-[360px] max-w-[88vw] gap-0 overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
						Deck setup
					</SheetTitle>
					<SheetDescription className="sr-only">
						Front matter for this deck — applied to the whole deck and exported with the .md.
					</SheetDescription>
				</SheetHeader>
				<div className="deck-config px-4 pb-4" ref={mountHost} />
				<div className="deck-config border-t border-border/60 px-4 pb-4 pt-3">
					<div className="db-settings-head">Preview · debug</div>
					<BboxPrefRow />
				</div>
			</SheetContent>
		</Sheet>
	);
}

/**
 * The PERMANENT half of the bounding-box debug feature: a switch that persists
 * the default via bbox-prefs (localStorage), so it survives reloads. It is a
 * VIEWER preference, not deck front matter — it never writes the Markdown and is
 * never exported. The toolbar button is the temporary, session-only counterpart;
 * PlaygroundApp seeds its live state from this flag and follows it (onBboxEnabled-
 * Change), so flipping this switch updates the preview immediately. Reuses the
 * shared `.deck-config` switch markup/styling (deck-config.css).
 */
function BboxPrefRow() {
	const [on, setOn] = React.useState(() => bboxEnabled());
	React.useEffect(() => {
		const unsubscribe = onBboxEnabledChange(setOn);
		return () => {
			unsubscribe();
		};
	}, []);
	return (
		<label className="db-or-switch">
			<span className="db-pref-text">
				<span className="db-pref-label">Bounding boxes</span>
				<span className="db-pref-hint">
					Outline every element in the preview for layout debugging. Stored on this device — not exported with the
					deck.
				</span>
			</span>
			<span className="db-switch">
				<input
					type="checkbox"
					className="db-switch-input"
					checked={on}
					aria-label="Bounding boxes"
					onChange={(e) => setBboxEnabled(e.target.checked)}
				/>
				<span className="db-switch-knob" />
			</span>
		</label>
	);
}
