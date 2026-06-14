// The landing page's thin bridge to the irreducible slide engine.
//
// WRAP, DON'T REINVENT. The marp render path lives in window.LatticePlayground
// (loaded as a classic <script> in index.astro). This module only orchestrates
// the SAME calls the old inline IIFE made (fetch theme css → PG.addThemes →
// PG.render → write an isolated `srcdoc` iframe + scale it to its host), so the
// React islands (HeroPreview, RestyleShowcase, FieldCardsLive) can call one
// `renderInto(host, …)` and get the live slide. Nothing here reimplements the
// engine; it touches window/fetch/DOM, so it stays OUTSIDE the React tree.
//
// It is the de-duplicated successor of index.astro's bottom inline <script>
// (the per-island copies of ensureThemes / srcdoc / scaleFrame / renderInto).

const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
const SLIDE_W = 1280;
const SLIDE_H = 720;

type PG = {
	render: (source: string, theme: string) => { html: string; css: string };
	addThemes: (css: string[]) => void;
	hasTheme: (name: string) => boolean;
};

declare global {
	interface Window {
		LatticePlayground?: PG;
	}
}

/** Resolve `<html data-palette/-mode>` → the palette + mode to render with. */
export function currentPaletteMode(paletteOverride?: string): { palette: string; mode: 'light' | 'dark' } {
	const root = document.documentElement;
	return {
		palette: paletteOverride || root.getAttribute('data-palette') || 'indaco',
		mode: root.getAttribute('data-mode') === 'dark' ? 'dark' : 'light',
	};
}

/** Build the landing engine bridge. `themeBase`/`runtimeUrl`/`frameCss` come from the page data payload. */
export function createLandingEngine(themeBase: string, runtimeUrl: string, frameCss: string) {
	const fetched: Record<string, Promise<string>> = {};
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

	/** Assemble the isolated `srcdoc` for one slide (intrinsic 1280×720, never scaled). */
	function srcdoc(html: string, css: string, mode: 'light' | 'dark', mermaid: boolean): string {
		const bg = mode === 'dark' ? '#0c0c0c' : '#e7e7ea';
		let s =
			'<!doctype html><html><head><meta charset="utf-8"><style>' +
			frameCss +
			'html,body{background:' +
			bg +
			'}' +
			css +
			'</style></head><body>' +
			html;
		if (mermaid) s += '<scr' + 'ipt src="' + MERMAID + '"></scr' + 'ipt>';
		s += '<scr' + 'ipt src="' + runtimeUrl + '"></scr' + 'ipt></body></html>';
		return s;
	}

	/** Scale the fixed-box iframe to fill its (16:9) host; driven by the host's current width. */
	function scaleFrame(host: HTMLElement) {
		const fr = host.querySelector<HTMLIFrameElement>('iframe.live');
		if (!fr) return;
		const w = host.clientWidth;
		if (w > 0) fr.style.transform = 'scale(' + (w / SLIDE_W).toFixed(5) + ')';
	}

	/** True once the engine bundle has loaded. */
	function ready(): boolean {
		return Boolean(window.LatticePlayground);
	}

	/**
	 * Render one slide into `host` (creating/updating its `iframe.live`), themed by
	 * the current (or overridden) palette + mode. Resolves true on success.
	 */
	function renderInto(host: HTMLElement, sample: string, mermaid: boolean, paletteOverride?: string): Promise<boolean> {
		const PGref = window.LatticePlayground;
		if (!PGref) return Promise.resolve(false);
		const { palette, mode } = currentPaletteMode(paletteOverride);
		return ensureThemes(palette, mode)
			.then(() => {
				const theme = mode === 'dark' && PGref.hasTheme(palette + '-dark') ? palette + '-dark' : palette;
				const out = PGref.render(sample, theme);
				let fr = host.querySelector<HTMLIFrameElement>('iframe.live');
				if (!fr) {
					fr = document.createElement('iframe');
					fr.className = 'live';
					fr.setAttribute('title', 'Live-rendered Lattice slide');
					fr.setAttribute('scrolling', 'no');
					fr.setAttribute('tabindex', '-1');
					// Fixed intrinsic slide box, scaled to fit via a CSS transform set in
					// scaleFrame. transform-origin top-left so the scaled box aligns to the
					// host's corner (without it, scaling shrinks around center → offset slide).
					fr.style.position = 'absolute';
					fr.style.top = '0';
					fr.style.left = '0';
					fr.style.border = '0';
					fr.style.width = SLIDE_W + 'px';
					fr.style.height = SLIDE_H + 'px';
					fr.style.transformOrigin = 'top left';
					host.appendChild(fr);
					if (typeof ResizeObserver !== 'undefined') {
						new ResizeObserver(() => scaleFrame(host)).observe(host);
					}
				}
				fr.onload = () => scaleFrame(host);
				fr.srcdoc = srcdoc(out.html, out.css, mode, mermaid);
				scaleFrame(host);
				host.classList.add('is-live');
				return true;
			})
			.catch((e) => {
				console.error('landing live render failed', e);
				return false;
			});
	}

	/** Resolve when the engine bundle is present (poll, like the playground). */
	function whenReady(): Promise<void> {
		if (ready()) return Promise.resolve();
		return new Promise((resolve) => {
			const t = setInterval(() => {
				if (ready()) {
					clearInterval(t);
					resolve();
				}
			}, 50);
		});
	}

	return { ready, whenReady, renderInto };
}

export type LandingEngine = ReturnType<typeof createLandingEngine>;
