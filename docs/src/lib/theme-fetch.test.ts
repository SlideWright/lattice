import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createThemeFetcher } from './theme-fetch';

// Regression guard for the multi-level theme @import closure. The engine's
// resolveThemeImports only inlines an import whose target is already REGISTERED,
// so a chain like a11y-deuteranopia → a11y-base → onyx → lattice renders
// STRIPPED unless the fetcher registers every link. (The bug: only lattice +
// the picked theme were registered, so a11y-base/onyx were missing and the
// @import was dropped — the a11y machinery vanished in the Drawing Board.)

// Minimal theme graph mirroring the real chain.
const GRAPH: Record<string, string> = {
	'lattice.css': '/* @theme lattice */ section{}',
	'a11y-deuteranopia.css': "/* @theme a11y-deuteranopia */ @import 'a11y-base'; :root{--pass:#004982}",
	'a11y-base.css': "/* @theme a11y-base */ @import 'onyx'; :root{--cat-1-fill:#e8e8e8}",
	'onyx.css': "/* @theme onyx */ @import 'lattice'; :root{--bg:#fff}",
	'indaco.css': "/* @theme indaco */ @import 'lattice'; :root{--accent:#36c}",
};

describe('createThemeFetcher — transitive @import closure', () => {
	let registered: Set<string>;

	beforeEach(() => {
		registered = new Set();
		(globalThis as unknown as { window: unknown }).window = {
			LatticePlayground: {
				addThemes: (cssList: string[]) => {
					for (const css of cssList) {
						const m = css.match(/@theme\s+([\w-]+)/);
						if (m) registered.add(m[1]);
					}
				},
				hasTheme: (name: string) => registered.has(name),
			},
		};
		vi.stubGlobal('fetch', (url: string) => {
			const file = url.split('/').pop() as string;
			const body = GRAPH[file];
			return Promise.resolve({
				ok: body != null,
				status: body != null ? 200 : 404,
				text: () => Promise.resolve(body ?? ''),
			} as Response);
		});
	});

	it('registers the FULL chain for a multi-level theme (a11y-* → a11y-base → onyx → lattice)', async () => {
		const f = createThemeFetcher('/themes/');
		await f.ensure('a11y-deuteranopia', 'light');
		// Every link must be registered, or the engine drops the @import → stripped render.
		expect([...registered].sort()).toEqual(['a11y-base', 'a11y-deuteranopia', 'lattice', 'onyx']);
	});

	it('still registers a single-level theme (brand → lattice) without over-fetching', async () => {
		const f = createThemeFetcher('/themes/');
		await f.ensure('indaco', 'light');
		expect(registered.has('indaco')).toBe(true);
		expect(registered.has('lattice')).toBe(true);
		expect(registered.has('onyx')).toBe(false); // not in indaco's chain
	});

	it('tolerates a missing -dark companion (mode-invariant a11y theme) in dark mode', async () => {
		const f = createThemeFetcher('/themes/');
		await expect(f.ensure('a11y-deuteranopia', 'dark')).resolves.toBeUndefined();
		expect(registered.has('a11y-base')).toBe(true); // light chain still fully registered
	});
});
