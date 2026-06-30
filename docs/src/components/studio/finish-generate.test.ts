import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, type FinishBase, generateFinishCss, generateSwatch } from './finish-generate';

const BASES: FinishBase[] = ['wash', 'aurora', 'blueprint', 'dots', 'hatch'];

describe('finish-generate', () => {
	it('every base emits a section.<name> rule using the compositor slots', () => {
		for (const base of BASES) {
			const css = generateFinishCss('backdrop-x', DEFAULT_PARAMS[base]);
			expect(css.startsWith('section.backdrop-x {')).toBe(true);
			expect(css).toMatch(/--_bg-(radial|linear)/);
		}
	});

	it('is palette-blind and export/exfil-safe: var(--accent) only, no url(), no hex', () => {
		for (const base of BASES) {
			const css = generateFinishCss('backdrop-x', DEFAULT_PARAMS[base]);
			expect(css).toContain('var(--accent)');
			expect(css).not.toMatch(/url\(/i); // no remote reference → no exfil surface
			expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i); // no hex literal (HARD RULE #3)
			expect(css).not.toMatch(/\bmask/i); // never a mask → survives PDFKit
		}
	});

	it('each variant zeroes the slot it does not use (single backdrop is self-defining)', () => {
		expect(generateFinishCss('a', DEFAULT_PARAMS.blueprint)).toContain('--_bg-radial:none');
		expect(generateFinishCss('a', DEFAULT_PARAMS.dots)).toContain('--_bg-linear:none');
		expect(generateFinishCss('a', DEFAULT_PARAMS.wash)).toContain('--_bg-linear:none');
	});

	it('intensity + scale flow into the output', () => {
		const css = generateFinishCss('a', { base: 'blueprint', intensity: 9, scale: 32, angle: 45 });
		expect(css).toContain('var(--accent) 9%');
		expect(css).toContain('32px');
	});

	it('generateSwatch returns a usable background string', () => {
		const sw = generateSwatch(DEFAULT_PARAMS.dots);
		expect(typeof sw.background).toBe('string');
		expect(sw.background.length).toBeGreaterThan(0);
	});
});
