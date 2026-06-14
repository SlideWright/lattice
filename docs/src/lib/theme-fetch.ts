// Shared theme fetch + registration (the "ensureThemes" pattern).
//
// WRAP, DON'T REINVENT — and DON'T COPY. The marp render path lives in
// window.LatticePlayground (the on-demand engine bundle). Every docs surface
// that renders a live slide must first register the palette CSS the engine will
// theme with: fetch `themeBase + <name>.css`, hand the text to PG.addThemes,
// and avoid re-fetching/re-registering the same theme. That logic was copied
// verbatim across the landing bridge, the playground bridge, the specimen
// renderer, and both Workbench studios. This module is the single source.
//
// `createThemeFetcher(themeBase)` returns:
//   - fetch(name)            → Promise<cssText>, in-memory cached per name
//   - ensure(palette, mode)  → registers lattice + the palette (+ -dark in dark
//                              mode), each once; the exact single-slide pattern
//   - ensureBase()           → registers just lattice.css once (the studios'
//                              ensureBaseTheme: they register their own derived
//                              palettes, so they only need the base contract)
//   - has(name)              → PG.hasTheme(name)
//
// Touches window/fetch, so it lives outside the React tree. Callers that render
// must guarantee window.LatticePlayground exists first (whenReady / load-engine).

type PG = {
	addThemes: (css: string[]) => void;
	hasTheme: (name: string) => boolean;
};

declare global {
	interface Window {
		LatticePlayground?: PG;
	}
}

export function createThemeFetcher(themeBase: string) {
	const fetched: Record<string, Promise<string>> = {}; // theme name → Promise<cssText>
	let latticeReady: Promise<void> | null = null;

	/** Fetch `<themeBase><name>.css` once; cache the Promise per name. */
	function fetchTheme(name: string): Promise<string> {
		if (!fetched[name]) {
			fetched[name] = fetch(themeBase + name + '.css').then((r) => {
				if (!r.ok) throw new Error('theme ' + name + ' (' + r.status + ')');
				return r.text();
			});
		}
		return fetched[name];
	}

	/** True once the engine reports the named theme is registered. */
	function has(name: string): boolean {
		return Boolean(window.LatticePlayground?.hasTheme(name));
	}

	/** Register the base `lattice.css` contract exactly once. */
	function ensureBase(): Promise<void> {
		const PG = window.LatticePlayground;
		if (!PG) return Promise.reject(new Error('engine not ready'));
		if (!latticeReady) latticeReady = fetchTheme('lattice').then((css) => PG.addThemes([css]));
		return latticeReady;
	}

	/**
	 * Register lattice + the requested palette (+ its `-dark` companion when in
	 * dark mode), each fetched/registered at most once. Mirrors the inline
	 * ensureThemes every single-slide host used.
	 */
	function ensure(palette: string, mode: 'light' | 'dark'): Promise<void> {
		const PG = window.LatticePlayground;
		if (!PG) return Promise.reject(new Error('engine not ready'));
		const jobs: Promise<void>[] = [ensureBase()];
		if (!PG.hasTheme(palette)) jobs.push(fetchTheme(palette).then((css) => PG.addThemes([css])));
		if (mode === 'dark') {
			jobs.push(
				fetchTheme(palette + '-dark')
					.then((css) => PG.addThemes([css]))
					.catch(() => {}),
			);
		}
		return Promise.all(jobs).then(() => undefined);
	}

	return { fetch: fetchTheme, ensure, ensureBase, has };
}

export type ThemeFetcher = ReturnType<typeof createThemeFetcher>;
