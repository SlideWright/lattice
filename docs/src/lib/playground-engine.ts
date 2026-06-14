// The thin imperative bridge to the irreducible engine pieces: the marp render
// (window.LatticePlayground, loaded as a classic <script>) and the filmstrip
// iframe controller (window.LatticeDeckPreview, the deck-preview.js module
// exposed on window). Neither is reimplemented — this module only orchestrates
// the SAME calls the old inline IIFE made (ensureThemes → PG.render →
// DP.renderDeck), with theme fetch/caching, so the React layer can call one
// `renderInto(...)` and get a status back.
//
// Everything here touches window/fetch, so it lives outside the React tree and
// the pure controller (playground-controller.ts). PlaygroundApp drives it.

import { renderSig, resolveThemeName } from './playground-controller';

type PG = {
	render: (source: string, theme: string) => { html: string; css: string; width?: number; height?: number };
	addThemes: (css: string[]) => void;
	hasTheme: (name: string) => boolean;
};
type DP = {
	renderDeck: (opts: Record<string, unknown>) => { state: PreviewState; count: number };
};
type PreviewState = { frameSig: string; lastSections: unknown };

declare global {
	interface Window {
		LatticePlayground?: PG;
		LatticeDeckPreview?: DP;
	}
}

export type RenderResult =
	| { status: 'rendered'; count: number; state: PreviewState; geom: { w: number; h: number } }
	| { status: 'error'; message: string }
	| { status: 'pending' }; // engine not loaded yet — caller should retry

/** Build the per-page engine bridge. `themeBase`/`runtimeUrl` come from pgData. */
export function createEngineBridge(themeBase: string, runtimeUrl: string) {
	const fetched: Record<string, Promise<string>> = {}; // theme name → Promise<cssText>
	let latticeReady: Promise<void> | null = null;

	function fetchTheme(name: string): Promise<string> {
		if (!fetched[name]) {
			fetched[name] = fetch(themeBase + name + '.css').then((r) => {
				if (!r.ok) throw new Error(`theme ${name} (${r.status})`);
				return r.text();
			});
		}
		return fetched[name];
	}

	function ensureThemes(palette: string, mode: 'light' | 'dark'): Promise<void> {
		const PGref = window.LatticePlayground;
		if (!PGref) return Promise.reject(new Error('engine not ready'));
		if (!latticeReady) latticeReady = fetchTheme('lattice').then((css) => PGref.addThemes([css]));
		const jobs: Promise<void>[] = [latticeReady];
		if (!PGref.hasTheme(palette)) jobs.push(fetchTheme(palette).then((css) => PGref.addThemes([css])));
		if (mode === 'dark') {
			jobs.push(
				fetchTheme(palette + '-dark')
					.then((css) => PGref.addThemes([css]))
					.catch(() => {}),
			);
		}
		return Promise.all(jobs).then(() => undefined);
	}

	/** True once both irreducible globals are present (engine bundle + bridge). */
	function ready(): boolean {
		return Boolean(window.LatticePlayground && window.LatticeDeckPreview);
	}

	/**
	 * One render pass: ensure themes, run the engine, hand the output to the
	 * shared filmstrip controller with the SAME args the inline controller used.
	 * `fresh` resets the iframe (explicit deck swaps) vs patching (edits).
	 */
	async function renderInto(
		frame: HTMLIFrameElement,
		source: string,
		palette: string,
		mode: 'light' | 'dark',
		state: PreviewState,
		fresh: boolean,
	): Promise<RenderResult> {
		const PGref = window.LatticePlayground;
		const DPref = window.LatticeDeckPreview;
		if (!PGref || !DPref) return { status: 'pending' };
		try {
			await ensureThemes(palette, mode);
			const theme = resolveThemeName(palette, mode, PGref.hasTheme(palette + '-dark'));
			const out = PGref.render(source, theme);
			const geom = { w: out.width || 1280, h: out.height || 720 };
			const r = DPref.renderDeck({
				frame,
				html: out.html,
				css: out.css,
				mode,
				geom,
				sig: renderSig(theme, mode, geom.w, geom.h),
				state: fresh ? { ...state, frameSig: '' } : state,
				fresh,
				runtimeUrl,
				gap: 16,
				contentVisibility: true,
				center: true,
			});
			return { status: 'rendered', count: r.count, state: r.state, geom };
		} catch (e) {
			return { status: 'error', message: String((e as Error)?.message || e) };
		}
	}

	return { ready, renderInto };
}

export type EngineBridge = ReturnType<typeof createEngineBridge>;
export type { PreviewState };
