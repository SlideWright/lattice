// The Finish generator — turns a structured layer RECIPE (the four palette-blind
// layers of base.finish.css: wash / texture / mark / edge) into a single
// `section.finish.finish-<slug> { --fin-wash:…; --fin-texture:…; --fin-mark:…;
// --fin-edge:…; }` rule that drives the SAME engine compositor (lib/base/
// base.finish.css). The right-panel designer tunes the recipe; THIS file disposes
// it into CSS — exactly the model-proposes / code-disposes split the Theme + Component
// studios use.
//
// RICH-ON-SCREEN / SAFE-ON-EXPORT — a fabricated finish emits BOTH faces, exactly
// like the built-in presets (base.finish.css header, the dual-variant section):
//   • RICH (screen default) — the directional "dissolving" look: full-bleed fades
//     run to `transparent` (alpha), which the browser composites perfectly. This is
//     the value written into the `section.finish.finish-<slug>` default rule.
//   • OPAQUE (export fallback) — the PDF-clean look: every full-bleed fade ends on
//     `var(--bg)` (accent mixed INTO the bg, never into `transparent`); a fade to
//     0-alpha grays into a muddy cloud in the vector PDF. This is emitted in a
//     `@media print` block AND a `:where(.lattice-exporting)` block (the two export
//     paths: CLI vector PDF, and the Studio html-to-image raster, which tags the
//     capture root with `.lattice-exporting`).
// BOTH faces obey: NO mask-image (drops in Apple PDFKit), NO url() (zero exfil
// surface), NO hex (HARD RULE #3 — every color is a var()-mix), NO margin (HARD RULE
// #20). Only the OPAQUE face additionally bans the full-bleed alpha area-fade; the
// RICH face is screen-only, so its `transparent` stops are allowed there.
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
	mark: { type: MarkType; placement: Placement; glyph?: string };
	edge: { type: EdgeType; intensity: number };
};

export const DEFAULT_RECIPE: FinishRecipe = {
	wash: { type: 'corner-glow', intensity: 10 },
	texture: { type: 'grid', intensity: 7, scale: 38 },
	mark: { type: 'none', placement: 'bottom-right' },
	edge: { type: 'none', intensity: 6 },
};

// The author's own glyph for a monogram/numeral mark — their initials or a section
// number. The mark text is emitted into CSS `content:"…"`, so the value is SANITIZED
// to a short, quote/backslash-free string (no raw injection — a crafted glyph can't
// close the string or inject a declaration). Empty → the type's sensible default
// ('L' for a monogram, '03' for a numeral). Kept to ~3 chars (a monogram/section no.).
export function sanitizeGlyph(input: unknown, fallback: string): string {
	if (typeof input !== 'string') return fallback;
	// Drop anything that could escape a CSS string literal (quotes, backslash) or open
	// a tag (<, >), collapse all whitespace, then keep it short. What survives is plain
	// text safe inside content:"...". Letters/digits/harmless symbols ride through.
	const cleaned = input
		.replace(/["'\\<>{};]/g, '')
		.replace(/\s+/g, '')
		.slice(0, 3);
	return cleaned || fallback;
}

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
		mark: { type: oneOf(MARK_TYPES, m.type, 'none'), placement: oneOf(PLACEMENTS, m.placement, 'bottom-right'), ...(typeof m.glyph === 'string' && m.glyph.trim() ? { glyph: m.glyph } : {}) },
		edge: { type: oneOf(EDGE_TYPES, e.type, 'none'), intensity: clampInt(e.intensity, 3, 20, 6) },
	};
}

// ── CSS emitters — one gradient builder per layer type, in TWO faces. ──
// The face decides the fade END of every FULL-BLEED gradient (wash z1, edge z4):
//   • 'opaque' (export) — accent mixed INTO var(--bg); the fade ends on var(--bg).
//     A fade toward 0-alpha grays into a muddy cloud in the vector PDF, so the
//     export face never does it.
//   • 'rich'   (screen) — accent mixed into `transparent`; the fade ends on
//     `transparent` (the directional "dissolve" of the mockups). Screen-only, so
//     the browser composites the alpha cleanly. A touch more accent compensates for
//     the alpha falloff so the screen look reads as rich, not faint.
// A TILED texture (grid/dots/…) is the same in both faces — its `transparent` is a
// hard 1px GAP, not an area fade — except the rich face nudges the accent up and
// mixes the line/dot into `transparent` (so a faint pattern still composites over
// any canvas) while the opaque face mixes into var(--bg).
export type FinishFace = 'rich' | 'opaque';

// An accent mix at N%. The fade-base is var(--bg) for export, `transparent` for
// screen — the single knob that splits the two faces.
const mix = (pct: number, face: FinishFace) =>
	`color-mix(in srgb, var(--accent) ${Math.round(pct)}%, ${face === 'rich' ? 'transparent' : 'var(--bg)'})`;
// The end-stop of a full-bleed fade: the canvas for export, nothing for screen.
const fadeEnd = (face: FinishFace) => (face === 'rich' ? 'transparent' : 'var(--bg)');
// Rich nudges accent up a touch (the alpha falloff makes it read fainter than the
// same % over an opaque canvas), capped so text-on-bg AA still survives.
const lift = (pct: number, face: FinishFace) => (face === 'rich' ? Math.min(22, pct + 3) : pct);
// A solid accent fill (for rules/bars/ticks — a 1-stop "gradient" the slot expects).
const SOLID = 'linear-gradient(var(--accent), var(--accent))';

// Build the --fin-wash gradient (z1, full-bleed → export face fades opaque→opaque).
function washImage(type: WashType, i: number, face: FinishFace): string {
	const a = lift(i, face);
	const end = fadeEnd(face);
	switch (type) {
		case 'corner-glow':
			return `radial-gradient(ellipse 120% 90% at 100% 0%, ${mix(a, face)} 0%, ${end} ${face === 'rich' ? '60%' : '55%'})`;
		case 'duotone':
			return `linear-gradient(118deg, ${mix(a, face)} 0%, ${end} 42%, ${mix(lift(Math.max(3, i * 0.6), face), face)} 100%)`;
		case 'spotlight':
			return `radial-gradient(80% 70% at 50% 42%, ${mix(a, face)} 0%, ${end} 60%)`;
		case 'bands':
			return `linear-gradient(180deg, ${mix(a, face)} 0%, ${end} 30%, ${end} 70%, ${mix(lift(Math.max(3, i * 0.8), face), face)} 100%)`;
		default:
			return 'none';
	}
}

// Build the --fin-texture gradient (z2). Patterns are UNIFORM + faint (opaque
// lines/dots, transparent GAPS only — a hard stop, never an area fade). The line/dot
// color mixes into var(--bg) for export, into `transparent` for screen.
function textureImage(type: TextureType, i: number, s: number, face: FinishFace): string {
	const a = lift(i, face);
	const c = mix(a, face);
	switch (type) {
		case 'grid':
			return `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px ${s}px), repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px ${s}px)`;
		case 'dots':
			return `radial-gradient(${c} 0 1.3px, transparent 1.7px)`;
		case 'hatch':
			return `repeating-linear-gradient(-45deg, ${c} 0 1px, transparent 1px ${s}px)`;
		case 'contour':
			return `repeating-linear-gradient(-4deg, transparent 0 ${s - 1}px, ${c} ${s - 1}px ${s}px)`;
		case 'rings':
			return `repeating-radial-gradient(circle at 50% 42%, transparent 0 ${s - 1}px, ${c} ${s - 1}px ${s}px)`;
		case 'ruled':
			return `repeating-linear-gradient(180deg, transparent 0 ${s - 1}px, ${c} ${s - 1}px ${s}px)`;
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

// Build the EDGE gradient (z4 pseudo, full-bleed). Export face: opaque vignette/fold,
// never an alpha shadow. Screen face: fades to `transparent` for a softer dissolve.
function edgeImage(type: EdgeType, i: number, face: FinishFace): string {
	const end = fadeEnd(face);
	switch (type) {
		case 'vignette': {
			// RICH: clear center → low-alpha ink rim. OPAQUE: bg center → ink-in-bg rim.
			const rim =
				face === 'rich'
					? `color-mix(in srgb, var(--ink, var(--accent)) ${Math.round(Math.min(22, i + 2))}%, transparent)`
					: `color-mix(in srgb, var(--ink, var(--accent)) ${Math.round(i)}%, var(--bg))`;
			const center = face === 'rich' ? 'transparent 60%' : 'var(--bg) 62%';
			return `radial-gradient(78% 78% at 50% 50%, ${center}, ${rim} 100%)`;
		}
		case 'fold':
			return `linear-gradient(225deg, ${mix(lift(i, face), face)} 0%, ${end} 60%)`;
		case 'margin-rule':
			return SOLID;
		default:
			return 'none';
	}
}

/** The slot declarations (decl list, no selector) for a recipe, in one FACE.
 *  Each of the four layers writes the custom property the engine compositor blends.
 *  `face` decides the fade-end of the full-bleed wash/edge ('rich' = transparent,
 *  screen-only; 'opaque' = var(--bg), export-safe). The non-full-bleed slots (mark
 *  glyph/bar/tick, the alignment + size + position aux slots) are face-invariant. */
export function recipeSlots(r: FinishRecipe, face: FinishFace = 'opaque'): string[] {
	const decls: string[] = [];

	// z1 — wash (a single full-bleed gradient layer).
	const wash = washImage(r.wash.type, r.wash.intensity, face);
	decls.push(`--fin-wash:${wash}`);

	// z2 — texture.
	const tex = textureImage(r.texture.type, r.texture.intensity, r.texture.scale, face);
	decls.push(`--fin-texture:${tex}`);
	// The compositor lists texture FIRST then wash in one background-image; line the
	// auxiliary slots up with that order (texture layer, wash layer). These aux slots
	// (size/position/repeat) are face-invariant — both faces share the same layer
	// structure, so they're emitted only in the rich/default rule.
	const texCount = r.texture.type === 'grid' ? 2 : 1; // grid is two repeating gradients
	const texSize = textureSize(r.texture.type, r.texture.scale);
	const washSize = wash === 'none' ? 'auto' : 'cover';
	const washRepeat = 'no-repeat';
	const texRepeat = tex === 'none' ? 'no-repeat' : 'repeat';
	decls.push(`--fin-size:${Array(texCount).fill(texSize).join(', ')}, ${washSize}`);
	decls.push(`--fin-repeat:${Array(texCount).fill(texRepeat).join(', ')}, ${washRepeat}`);

	// z3 — mark. Marks are small/solid (a bar, a tick) or an opaque ghost glyph —
	// NOT a full-bleed area fade — so the same in both faces.
	switch (r.mark.type) {
		case 'bar':
			decls.push(`--fin-mark:${SOLID}`, '--fin-mark-position:left center', '--fin-mark-size-bg:1.1cqi 100%');
			break;
		case 'monogram':
			// The author's initials (default "L"), sanitized for content:"…" (no injection).
			decls.push(
				'--fin-mark:none',
				`--fin-mark-text:"${sanitizeGlyph(r.mark.glyph, 'L')}"`,
				`--fin-mark-color:${mix(10, 'opaque')}`,
				'--fin-mark-fs:42cqi',
				`--fin-mark-align:${flexAlign(r.mark.placement)}`,
				`--fin-mark-justify:${flexJustify(r.mark.placement)}`,
				'--fin-mark-pad:0 2cqi',
			);
			break;
		case 'numeral':
			// The author's number (default "03"), sanitized for content:"…".
			decls.push(
				'--fin-mark:none',
				`--fin-mark-text:"${sanitizeGlyph(r.mark.glyph, '03')}"`,
				`--fin-mark-color:${mix(9, 'opaque')}`,
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

	// z4 — edge (full-bleed → face-sensitive).
	const edge = edgeImage(r.edge.type, r.edge.intensity, face);
	decls.push(`--fin-edge:${edge}`);
	if (r.edge.type === 'vignette') decls.push('--fin-edge-position:center', '--fin-edge-size:cover');
	else if (r.edge.type === 'fold') decls.push('--fin-edge-position:top right', '--fin-edge-size:9.4cqi 9.4cqi');
	else if (r.edge.type === 'margin-rule') decls.push('--fin-edge-position:right center', '--fin-edge-size:0.47cqi 100%');

	return decls;
}

// The slots whose VALUE differs between faces, so the export override must re-emit
// them opaque: the full-bleed wash (z1) + edge (z4) AND the texture (z2). The texture
// is face-variant too — its line/dot color mixes into `transparent` on screen (a faint
// pattern that composites over any canvas) but must mix into var(--bg) on export, so it
// bakes opaque rather than carrying alpha into the PNG/PDF. This MIRRORS the built-in
// presets, which each ship a --fin-texture-opaque flipped by base.finish.css. The aux
// size/position/repeat slots and the marks ARE face-invariant (same layer count, opaque
// mark colors), so they stay on the rich/default rule only.
const OPAQUE_OVERRIDE_SLOTS = ['--fin-wash', '--fin-texture', '--fin-edge'] as const;

/** The export-face declarations for the `@media print` + `.lattice-exporting`
 *  override — the full-bleed wash/edge AND the texture, all recomputed opaque. */
function opaqueOverrideDecls(r: FinishRecipe): string[] {
	const opaque = recipeSlots(r, 'opaque');
	return opaque.filter((d) => OPAQUE_OVERRIDE_SLOTS.some((s) => d.startsWith(`${s}:`)));
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
	const sel = `section.finish.finish-${safe}`;
	// RICH (screen default) — the full slot stack, full-bleed fades to transparent.
	const rich = `${sel} {\n  ${recipeSlots(r, 'rich').join(';\n  ')};\n}`;
	// OPAQUE (export fallback) — re-point only the full-bleed slots to their opaque
	// values, in BOTH export guards (@media print = CLI vector PDF; .lattice-exporting
	// = Studio html-to-image raster). The body is identical between the two so they
	// can't drift; :where() keeps the class guard at zero specificity.
	const opaqueBody = opaqueOverrideDecls(r).join(';\n  ');
	const print = `@media print {\n  ${sel} {\n  ${opaqueBody};\n  }\n}`;
	// The export class matches an ANCESTOR (the CLI/preview capture root) OR the
	// section ITSELF — the latter is load-bearing for the Studio html-to-image raster,
	// which clones only the section (not its ancestors). See base.finish.css.
	const exporting = `:where(.lattice-exporting) ${sel},\n${sel}.lattice-exporting {\n  ${opaqueBody};\n}`;
	return `${rich}\n${print}\n${exporting}`;
}

/** A small preview-chip background for a recipe — its most salient layer, bumped
 *  for visibility at ~16px (chips are UI, not export, so a touch more saturation is
 *  fine). Used by the catalog swatches + saved-finish menu entries. */
export function generateSwatch(recipe: FinishRecipe): { background: string; backgroundSize?: string } {
	const r = coerceRecipe(recipe);
	// Chips are on-screen UI (not export), so use the opaque face on a known bg — it
	// reads as a solid swatch regardless of the chip's own background.
	if (r.wash.type !== 'none') return { background: washImage(r.wash.type, Math.min(40, r.wash.intensity * 3.5), 'opaque') };
	if (r.texture.type !== 'none') {
		const s = Math.max(6, Math.round(r.texture.scale / 4));
		return { background: textureImage(r.texture.type, Math.min(40, r.texture.intensity * 3), s, 'opaque'), backgroundSize: textureSize(r.texture.type, s) };
	}
	if (r.edge.type !== 'none') return { background: edgeImage(r.edge.type, Math.min(40, r.edge.intensity * 3), 'opaque') };
	return { background: 'var(--bg)' };
}
