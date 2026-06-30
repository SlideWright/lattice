import { describe, expect, it } from 'vitest';
import {
	coerceRecipe,
	DEFAULT_RECIPE,
	EDGE_TYPES,
	type FinishRecipe,
	generateFinishCss,
	generateSwatch,
	MARK_TYPES,
	PRESET_RECIPES,
	safeFinishSlug,
	TEXTURE_TYPES,
	WASH_TYPES,
} from './finish-generate';

// Exercise every layer type so the export-safety assertions cover the full vocab.
const everyRecipe = (): FinishRecipe[] => {
	const out: FinishRecipe[] = [DEFAULT_RECIPE, ...Object.values(PRESET_RECIPES)];
	for (const w of WASH_TYPES) out.push({ ...DEFAULT_RECIPE, wash: { type: w, intensity: 12 } });
	for (const t of TEXTURE_TYPES) out.push({ ...DEFAULT_RECIPE, texture: { type: t, intensity: 9, scale: 30 } });
	for (const m of MARK_TYPES) out.push({ ...DEFAULT_RECIPE, mark: { type: m, placement: 'top-right' } });
	for (const e of EDGE_TYPES) out.push({ ...DEFAULT_RECIPE, edge: { type: e, intensity: 10 } });
	return out;
};

describe('finish-generate', () => {
	it('emits a section.finish.finish-<slug> rule that drives the engine compositor', () => {
		const css = generateFinishCss('my-finish', DEFAULT_RECIPE);
		expect(css.startsWith('section.finish.finish-my-finish {')).toBe(true);
		// All four engine layer slots are declared (self-defining — never inherits).
		expect(css).toContain('--fin-wash:');
		expect(css).toContain('--fin-texture:');
		expect(css).toContain('--fin-mark:');
		expect(css).toContain('--fin-edge:');
	});

	// Pull one slot's value out of the generated rule (e.g. `--fin-wash`). The slot
	// value runs to the terminating `;` (color-mix has no `;` inside it).
	const slotValue = (css: string, slot: string): string => new RegExp(`--${slot}:([^;]*)`).exec(css)?.[1] ?? '';

	it('is export-safe + exfil-safe for EVERY layer type: no full-bleed transparent fade, no mask, no url(, no hex', () => {
		for (const r of everyRecipe()) {
			const css = generateFinishCss('x', r);
			// OPAQUE-TO-OPAQUE — the load-bearing PDF rule (base.finish.css header). The
			// FULL-BLEED slots (wash z1, edge z4) must fade opaque→opaque: NO `transparent`
			// (a 0-alpha area fade grays into a muddy cloud in PDF export). Every stop is a
			// var(--accent)-mix or a var(--bg)/var(--ink) value.
			expect(slotValue(css, 'fin-wash'), `transparent in the full-bleed WASH: ${css}`).not.toMatch(/transparent/);
			expect(slotValue(css, 'fin-edge'), `transparent in the full-bleed EDGE: ${css}`).not.toMatch(/transparent/);
			// The ONLY sanctioned `transparent` is a thin stripe/dot GAP in the tiled
			// texture (a hard 1px stop, not an area fade) — and even then only as a HARD
			// length stop, never a percentage area fade.
			const tex = slotValue(css, 'fin-texture');
			if (/transparent/.test(tex)) {
				expect(tex, `texture transparent must be a hard length stop, not a % area fade: ${tex}`).not.toMatch(/transparent\s+\d+%/);
			}
			expect(css, 'mask drops in PDFKit').not.toMatch(/\bmask/i);
			expect(css, 'url() adds exfil surface').not.toMatch(/url\(/i);
			expect(css, 'hex literal violates HARD RULE #3').not.toMatch(/#[0-9a-f]{3,8}\b/i);
			expect(css, 'margin violates HARD RULE #20').not.toMatch(/(^|[\s;{])margin\b/i);
			// Palette-blind — color comes only through var()/color-mix.
			expect(css).toMatch(/var\(--accent\)|var\(--bg\)|var\(--ink/);
		}
	});

	it('re-sanitizes the slug (defense in depth — a crafted name cannot escape the selector)', () => {
		const css = generateFinishCss('evil } body { color: red ', DEFAULT_RECIPE);
		expect(css.startsWith('section.finish.finish-evil-body-color-red {')).toBe(true);
		expect(css).not.toContain('body {');
		expect(safeFinishSlug('  ')).toBe('custom');
		expect(safeFinishSlug('A B/C')).toBe('a-b-c');
	});

	it('intensity + scale flow into the output as numbers', () => {
		const css = generateFinishCss('a', { wash: { type: 'corner-glow', intensity: 14 }, texture: { type: 'grid', intensity: 9, scale: 32 }, mark: { type: 'none', placement: 'center' }, edge: { type: 'none', intensity: 6 } });
		expect(css).toContain('var(--accent) 14%');
		expect(css).toContain('var(--accent) 9%');
		expect(css).toContain('32px');
	});

	it('coerceRecipe clamps an out-of-vocab / out-of-range AI reply to the closed set', () => {
		const r = coerceRecipe({ wash: { type: 'rainbow', intensity: 999 }, texture: { type: 'grid', intensity: -5, scale: 5 }, mark: { type: 'skull', placement: 'nowhere' }, edge: {} });
		expect(WASH_TYPES).toContain(r.wash.type);
		expect(r.wash.type).toBe('none'); // unknown → none
		expect(r.wash.intensity).toBeLessThanOrEqual(20);
		expect(r.texture.intensity).toBeGreaterThanOrEqual(3);
		expect(r.texture.scale).toBeGreaterThanOrEqual(12);
		expect(MARK_TYPES).toContain(r.mark.type);
		expect(r.mark.type).toBe('none');
		expect(EDGE_TYPES).toContain(r.edge.type);
	});

	it('coerceRecipe never throws on garbage input', () => {
		expect(() => coerceRecipe(null)).not.toThrow();
		expect(() => coerceRecipe('nonsense')).not.toThrow();
		expect(() => coerceRecipe(42)).not.toThrow();
	});

	it('generateSwatch returns a usable background string for every preset', () => {
		for (const r of Object.values(PRESET_RECIPES)) {
			const sw = generateSwatch(r);
			expect(typeof sw.background).toBe('string');
			expect(sw.background.length).toBeGreaterThan(0);
		}
	});
});
