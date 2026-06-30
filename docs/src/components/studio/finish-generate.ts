// The Finish generator — turns a structured layer RECIPE (the four palette-blind
// layers of base.finish.css: wash / texture / mark / edge) into a single
// `section.finish.finish-<slug> { --fin-wash:…; --fin-texture:…; --fin-mark:…;
// --fin-edge:…; }` rule that drives the SAME engine compositor (lib/base/
// base.finish.css). The right-panel designer tunes the recipe; THIS file disposes
// it into CSS — exactly the model-proposes / code-disposes split the Theme + Component
// studios use.
//
// EXPORT-SAFE BY CONSTRUCTION (the load-bearing rules, all proven — see the
// base.finish.css header + 2026-06-30-finish-the-surface-layer.md):
//   • OPAQUE-TO-OPAQUE gradients only. Every full-bleed fade is
//     `color-mix(in srgb, var(--accent) N%, var(--bg))` → `var(--bg)`; a fade
//     toward `transparent`/0-alpha grays into a muddy cloud in PDF export. The ONE
//     sanctioned `transparent` is the GAP of a thin repeating stripe (a hard 1px
//     stop, not an area fade) — composited over the opaque layer beneath.
//   • NO mask-image (drops in Apple PDFKit), NO url() (zero exfil surface), NO hex
//     (HARD RULE #3 — every color is a var()-mix), NO margin (HARD RULE #20).
// The generator re-sanitizes the slug (defense in depth) and only ever interpolates
// numbers (Math.round/clamp), never raw caller strings, so a crafted recipe can't
// close the selector or inject a second rule into the same-origin preview frame
// (HARD RULE #22).

// ── The closed vocabulary — the only layer types the designer (and the AI) speak.
export const WASH_TYPES = ['none', 'corner-glow', 'duotone', 'spotlight', 'bands'] as const;
export const TEXTURE_TYPES = ['none', 'grid', 'dots', 'hatch', 'contour', 'rings', 'ruled'] as const;
export const MARK_TYPES = ['none', 'monogram', 'tick', 'bar', 'numeral'] as const;
export const EDGE_TYPES = ['none', 'vignette', 'margin-rule', 'fold'] as const;
export const PLACEMENTS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'left'] as const;

export type WashType = (typeof WASH_TYPES)[number];
export type TextureType = (typeof TEXTURE_TYPES)[number];
export type MarkType = (typeof MARK_TYPES)[number];
export type EdgeType = (typeof EDGE_TYPES)[number];
export type Placement = (typeof PLACEMENTS)[number];

// A layer recipe — what the controls bind to and the AI returns. Intensity is an
// accent-into-bg mix percentage (kept low so text-on-bg AA survives without a scrim);
// placement steers a positioned layer (mark glyph, corner glow).
export type FinishRecipe = {
	wash: { type: WashType; intensity: number };
	texture: { type: TextureType; intensity: number; scale: number };
	mark: { type: MarkType; placement: Placement };
	edge: { type: EdgeType; intensity: number };
};

export const DEFAULT_RECIPE: FinishRecipe = {
	wash: { type: 'corner-glow', intensity: 10 },
	texture: { type: 'grid', intensity: 7, scale: 38 },
	mark: { type: 'none', placement: 'bottom-right' },
	edge: { type: 'none', intensity: 6 },
};

// The 5 shipped presets, expressed as recipes so "Start from preset" populates the
// four controls (the engine CSS in base.finish.css is the rendered truth; these
// mirror its layer choices so a preset is a tweakable starting point, not a black box).
export const PRESET_RECIPES: Record<string, FinishRecipe> = {
	atrium: {
		wash: { type: 'corner-glow', intensity: 10 },
		texture: { type: 'grid', intensity: 7, scale: 38 },
		mark: { type: 'bar', placement: 'left' },
		edge: { type: 'none', intensity: 6 },
	},
	meridian: {
		wash: { type: 'duotone', intensity: 7 },
		texture: { type: 'contour', intensity: 6, scale: 46 },
		mark: { type: 'numeral', placement: 'bottom-right' },
		edge: { type: 'none', intensity: 6 },
	},
	strata: {
		wash: { type: 'bands', intensity: 5 },
		texture: { type: 'dots', intensity: 13, scale: 26 },
		mark: { type: 'tick', placement: 'top-right' },
		edge: { type: 'none', intensity: 6 },
	},
	halo: {
		wash: { type: 'spotlight', intensity: 6 },
		texture: { type: 'rings', intensity: 6, scale: 56 },
		mark: { type: 'none', placement: 'center' },
		edge: { type: 'vignette', intensity: 5 },
	},
	ledger: {
		wash: { type: 'none', intensity: 8 },
		texture: { type: 'ruled', intensity: 8, scale: 40 },
		mark: { type: 'bar', placement: 'left' },
		edge: { type: 'fold', intensity: 16 },
	},
};

// ── Coercion — clamp/snap any input (a control, or an AI reply) to the vocab. ──
const oneOf = <T extends string>(opts: readonly T[], v: unknown, fallback: T): T =>
	(opts as readonly string[]).includes(String(v)) ? (v as T) : fallback;
const clampInt = (v: unknown, lo: number, hi: number, fallback: number): number => {
	const n = Math.round(Number(v));
	return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
};

/** Coerce an arbitrary object (untrusted — an AI reply or partial state) into a
 *  full, in-vocabulary recipe. Never throws; always returns a renderable recipe. */
export function coerceRecipe(input: unknown): FinishRecipe {
	const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
	const w = (o.wash ?? {}) as Record<string, unknown>;
	const t = (o.texture ?? {}) as Record<string, unknown>;
	const m = (o.mark ?? {}) as Record<string, unknown>;
	const e = (o.edge ?? {}) as Record<string, unknown>;
	return {
		wash: { type: oneOf(WASH_TYPES, w.type, 'none'), intensity: clampInt(w.intensity, 3, 20, 10) },
		texture: { type: oneOf(TEXTURE_TYPES, t.type, 'none'), intensity: clampInt(t.intensity, 3, 18, 7), scale: clampInt(t.scale, 12, 64, 38) },
		mark: { type: oneOf(MARK_TYPES, m.type, 'none'), placement: oneOf(PLACEMENTS, m.placement, 'bottom-right') },
		edge: { type: oneOf(EDGE_TYPES, e.type, 'none'), intensity: clampInt(e.intensity, 3, 20, 6) },
	};
}

// ── CSS emitters — one opaque-safe gradient builder per layer type. ──
// An accent-into-bg mix at N% (opaque — the PDF-clean fade end is var(--bg)).
const mix = (pct: number) => `color-mix(in srgb, var(--accent) ${Math.round(pct)}%, var(--bg))`;
// A solid accent fill (for rules/bars/ticks — a 1-stop "gradient" the slot expects).
const SOLID = 'linear-gradient(var(--accent), var(--accent))';

// Build the --fin-wash gradient (z1, full-bleed → must be opaque→opaque).
function washImage(type: WashType, i: number): string {
	switch (type) {
		case 'corner-glow':
			return `radial-gradient(ellipse 120% 90% at 100% 0%, ${mix(i)} 0%, var(--bg) 55%)`;
		case 'duotone':
			return `linear-gradient(118deg, ${mix(i)} 0%, var(--bg) 42%, ${mix(Math.max(3, i * 0.6))} 100%)`;
		case 'spotlight':
			return `radial-gradient(80% 70% at 50% 42%, ${mix(i)} 0%, var(--bg) 60%)`;
		case 'bands':
			return `linear-gradient(180deg, ${mix(i)} 0%, var(--bg) 30%, var(--bg) 70%, ${mix(Math.max(3, i * 0.8))} 100%)`;
		default:
			return 'none';
	}
}

// Build the --fin-texture gradient (z2). Patterns are UNIFORM + faint (opaque
// lines/dots, transparent GAPS only — a hard stop, never an area fade).
function textureImage(type: TextureType, i: number, s: number): string {
	switch (type) {
		case 'grid':
			return `repeating-linear-gradient(0deg, ${mix(i)} 0 1px, transparent 1px ${s}px), repeating-linear-gradient(90deg, ${mix(i)} 0 1px, transparent 1px ${s}px)`;
		case 'dots':
			return `radial-gradient(${mix(i)} 0 1.3px, transparent 1.7px)`;
		case 'hatch':
			return `repeating-linear-gradient(-45deg, ${mix(i)} 0 1px, transparent 1px ${s}px)`;
		case 'contour':
			return `repeating-linear-gradient(-4deg, transparent 0 ${s - 1}px, ${mix(i)} ${s - 1}px ${s}px)`;
		case 'rings':
			return `repeating-radial-gradient(circle at 50% 42%, transparent 0 ${s - 1}px, ${mix(i)} ${s - 1}px ${s}px)`;
		case 'ruled':
			return `repeating-linear-gradient(180deg, transparent 0 ${s - 1}px, ${mix(i)} ${s - 1}px ${s}px)`;
		default:
			return 'none';
	}
}
// The matching background-size for a texture (dots tile to a square; the rest auto).
const textureSize = (type: TextureType, s: number): string => (type === 'dots' ? `${s}px ${s}px` : 'auto');

// Placement → the engine's mark position keyword(s).
function markPos(p: Placement): string {
	switch (p) {
		case 'top-left':
			return 'top 2.7cqi left 3.1cqi';
		case 'top-right':
			return 'top 2.7cqi right 3.1cqi';
		case 'bottom-left':
			return 'bottom 2.7cqi left 3.1cqi';
		case 'left':
			return 'left center';
		case 'center':
			return 'center';
		default:
			return 'bottom 2.7cqi right 3.1cqi';
	}
}
const flexAlign = (p: Placement): string => (p.startsWith('top') ? 'flex-start' : p === 'center' ? 'center' : 'flex-end');
const flexJustify = (p: Placement): string => (p.endsWith('left') || p === 'left' ? 'flex-start' : p === 'center' ? 'center' : 'flex-end');

// Build the EDGE gradient (z4 pseudo) — opaque vignette/fold, never an alpha shadow.
function edgeImage(type: EdgeType, i: number): string {
	switch (type) {
		case 'vignette':
			return `radial-gradient(78% 78% at 50% 50%, var(--bg) 62%, color-mix(in srgb, var(--ink, var(--accent)) ${Math.round(i)}%, var(--bg)) 100%)`;
		case 'fold':
			return `linear-gradient(225deg, ${mix(i)} 0%, var(--bg) 60%)`;
		case 'margin-rule':
			return SOLID;
		default:
			return 'none';
	}
}

/** The slot declarations (decl list, no selector) for a recipe — each of the four
 *  layers writes the custom property the engine compositor blends. */
export function recipeSlots(r: FinishRecipe): string[] {
	const decls: string[] = [];

	// z1 — wash (a single full-bleed gradient layer).
	const wash = washImage(r.wash.type, r.wash.intensity);
	decls.push(`--fin-wash:${wash}`);

	// z2 — texture.
	const tex = textureImage(r.texture.type, r.texture.intensity, r.texture.scale);
	decls.push(`--fin-texture:${tex}`);
	// The compositor lists texture FIRST then wash in one background-image; line the
	// auxiliary slots up with that order (texture layer, wash layer).
	const texCount = r.texture.type === 'grid' ? 2 : 1; // grid is two repeating gradients
	const texSize = textureSize(r.texture.type, r.texture.scale);
	const washSize = wash === 'none' ? 'auto' : 'cover';
	const washRepeat = 'no-repeat';
	const texRepeat = tex === 'none' ? 'no-repeat' : 'repeat';
	decls.push(`--fin-size:${Array(texCount).fill(texSize).join(', ')}, ${washSize}`);
	decls.push(`--fin-repeat:${Array(texCount).fill(texRepeat).join(', ')}, ${washRepeat}`);

	// z3 — mark.
	switch (r.mark.type) {
		case 'bar':
			decls.push(`--fin-mark:${SOLID}`, '--fin-mark-position:left center', '--fin-mark-size-bg:1.1cqi 100%');
			break;
		case 'monogram':
			decls.push(
				'--fin-mark:none',
				'--fin-mark-text:"L"',
				`--fin-mark-color:${mix(10)}`,
				'--fin-mark-fs:42cqi',
				`--fin-mark-align:${flexAlign(r.mark.placement)}`,
				`--fin-mark-justify:${flexJustify(r.mark.placement)}`,
				'--fin-mark-pad:0 2cqi',
			);
			break;
		case 'numeral':
			decls.push(
				'--fin-mark:none',
				'--fin-mark-text:"03"',
				`--fin-mark-color:${mix(9)}`,
				'--fin-mark-fs:40cqi',
				`--fin-mark-align:${flexAlign(r.mark.placement)}`,
				`--fin-mark-justify:${flexJustify(r.mark.placement)}`,
				'--fin-mark-pad:0 1cqi',
			);
			break;
		case 'tick':
			decls.push(
				`--fin-mark:${SOLID}, ${SOLID}`,
				`--fin-mark-position:${markPos(r.mark.placement)}, ${markPos(r.mark.placement)}`,
				'--fin-mark-size-bg:2.65cqi 0.16cqi, 0.16cqi 2.65cqi',
				'--fin-mark-repeat:no-repeat, no-repeat',
			);
			break;
		default:
			decls.push('--fin-mark:none', '--fin-mark-text:""');
	}

	// z4 — edge.
	const edge = edgeImage(r.edge.type, r.edge.intensity);
	decls.push(`--fin-edge:${edge}`);
	if (r.edge.type === 'vignette') decls.push('--fin-edge-position:center', '--fin-edge-size:cover');
	else if (r.edge.type === 'fold') decls.push('--fin-edge-position:top right', '--fin-edge-size:9.4cqi 9.4cqi');
	else if (r.edge.type === 'margin-rule') decls.push('--fin-edge-position:right center', '--fin-edge-size:0.47cqi 100%');

	return decls;
}

/** Sanitize arbitrary text to a safe class slug fragment (`[a-z0-9-]`), or 'custom'. */
export function safeFinishSlug(name: string): string {
	return (
		String(name)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 40)
			.replace(/-+$/, '') || 'custom'
	);
}

/**
 * The full CSS rule for a fabricated finish: `section.finish.finish-<slug> { … }`,
 * which the engine compositor (base.finish.css) blends exactly like a built-in
 * preset. The slug is RE-SANITIZED here (defense in depth — never trust the caller),
 * so a crafted name can't escape the selector. Pass a recipe straight from the
 * controls or from `coerceRecipe(aiReply)`.
 */
export function generateFinishCss(slug: string, recipe: FinishRecipe): string {
	const safe = safeFinishSlug(slug);
	const r = coerceRecipe(recipe);
	return `section.finish.finish-${safe} {\n  ${recipeSlots(r).join(';\n  ')};\n}`;
}

/** A small preview-chip background for a recipe — its most salient layer, bumped
 *  for visibility at ~16px (chips are UI, not export, so a touch more saturation is
 *  fine). Used by the catalog swatches + saved-finish menu entries. */
export function generateSwatch(recipe: FinishRecipe): { background: string; backgroundSize?: string } {
	const r = coerceRecipe(recipe);
	if (r.wash.type !== 'none') return { background: washImage(r.wash.type, Math.min(40, r.wash.intensity * 3.5)) };
	if (r.texture.type !== 'none') {
		const s = Math.max(6, Math.round(r.texture.scale / 4));
		return { background: textureImage(r.texture.type, Math.min(40, r.texture.intensity * 3), s), backgroundSize: textureSize(r.texture.type, s) };
	}
	if (r.edge.type !== 'none') return { background: edgeImage(r.edge.type, Math.min(40, r.edge.intensity * 3)) };
	return { background: 'var(--bg)' };
}
