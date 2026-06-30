// The Studio finish catalog — DISPLAY metadata for the Finish family, the
// surface artifact of the Finish axis (engineering/decisions/
// 2026-06-30-finish-the-surface-layer.md). The engine's single source of truth
// for name→class is FINISH_REGISTER (lib/core/resolve-finish.js), gated by the
// rot-guard in test/unit/parsing/resolve-finish.test.js. THIS file adds only the
// human layer the picker needs (label, blurb, swatch preview) and MUST stay in
// step with FINISH_REGISTER — every `name` here is a registered finish.
//
// A finish is authored deck-wide via the `finish:` front-matter register (no new
// key) or per-slide via `_class: backdrop …`. Backdrop swatches use var(--accent)
// so the chip recolors with the site theme, exactly like the real backdrop does.

export type FinishNature = 'parametric' | 'typographic';
export type FinishZone = 'field' | 'none';
export type FinishGroup = 'plain' | 'backdrop';

export type FinishEntry = {
	/** the `finish:` register value (and engine FINISH_REGISTER key) */
	name: string;
	label: string;
	blurb: string;
	group: FinishGroup;
	nature: FinishNature;
	zone: FinishZone;
	/** CSS for the preview chip — background (+ optional size for tiled motifs) */
	swatch: { background: string; backgroundSize?: string };
};

const A = (pct: number) => `color-mix(in srgb, var(--accent) ${pct}%, transparent)`;

// Ordered as the picker shows them. `boardroom` is the named baseline (omitting
// the key renders it). The chips are intentionally a touch more saturated than
// the real (deliberately subtle) backdrops so the motif reads at 16px.
export const FINISHES: FinishEntry[] = [
	{
		name: 'boardroom', label: 'Boardroom', group: 'plain', nature: 'typographic', zone: 'none',
		blurb: 'The clean baseline — no surface treatment.',
		swatch: { background: 'var(--bg)' },
	},
	{
		name: 'sketch', label: 'Sketch', group: 'plain', nature: 'typographic', zone: 'none',
		blurb: 'Hand-drawn skin — handwriting type and drawn boxes.',
		swatch: { background: `repeating-linear-gradient(8deg, ${A(34)} 0 1.5px, transparent 1.5px 5px)` },
	},
	{
		name: 'sketch-clean', label: 'Sketch · clean body', group: 'plain', nature: 'typographic', zone: 'none',
		blurb: 'Hand-drawn headings and boxes; clean body text.',
		swatch: { background: `repeating-linear-gradient(8deg, ${A(28)} 0 1.5px, transparent 1.5px 7px)` },
	},
	{
		name: 'wash', label: 'Wash', group: 'backdrop', nature: 'parametric', zone: 'field',
		blurb: 'A soft accent bloom from the top — lit from above.',
		swatch: { background: `radial-gradient(ellipse at 50% 0%, ${A(45)}, transparent 70%)` },
	},
	{
		name: 'aurora', label: 'Aurora', group: 'backdrop', nature: 'parametric', zone: 'field',
		blurb: 'A two-corner accent glow for a sense of depth.',
		swatch: { background: `radial-gradient(at 0% 0%, ${A(50)}, transparent 60%), radial-gradient(at 100% 100%, ${A(32)}, transparent 60%)` },
	},
	{
		name: 'blueprint', label: 'Blueprint', group: 'backdrop', nature: 'parametric', zone: 'field',
		blurb: 'A graph-paper grid — the drafting-table finish.',
		swatch: { background: `repeating-linear-gradient(0deg, ${A(38)} 0 1px, transparent 1px 6px), repeating-linear-gradient(90deg, ${A(38)} 0 1px, transparent 1px 6px)` },
	},
	{
		name: 'dots', label: 'Dots', group: 'backdrop', nature: 'parametric', zone: 'field',
		blurb: 'A quiet dot grid behind your content.',
		swatch: { background: `radial-gradient(circle, ${A(60)} 0 1px, transparent 1.6px)`, backgroundSize: '6px 6px' },
	},
	{
		name: 'hatch', label: 'Hatch', group: 'backdrop', nature: 'parametric', zone: 'field',
		blurb: 'Diagonal accent hatching — textured and energetic.',
		swatch: { background: `repeating-linear-gradient(45deg, ${A(34)} 0 1px, transparent 1px 5px)` },
	},
];

export const FINISH_BY_NAME: Record<string, FinishEntry> = Object.fromEntries(
	FINISHES.map((f) => [f.name, f]),
);

/** The active finish for a deck `finish:` value (defaults to boardroom). */
export function activeFinish(value: string | undefined | null): FinishEntry {
	const key = (value ?? '').trim().toLowerCase();
	return FINISH_BY_NAME[key] ?? FINISH_BY_NAME.boardroom;
}
