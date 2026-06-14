/**
 * The ONE controller for the site's palette + light/dark controls.
 *
 * Every surface (landing, playground, drawing board, workbench, the component
 * reference, and the Starlight docs header) used to re-implement this wiring
 * inline. They now all drive the shared React `PaletteControls` island, which
 * goes through this module — so the read/write contract lives in exactly one
 * place.
 *
 * The contract (unchanged, so deck iframes + un-migrated code keep theming):
 *   • `data-palette` / `data-mode` on <html> drive the generated palette tokens
 *     (lattice-tokens.generated.css) and the deck `srcdoc` iframes, which read
 *     those attributes off the host (live-render.js).
 *   • `data-theme` is kept in lockstep with `data-mode` for Starlight's own CSS
 *     + code-block themes.
 *   • localStorage keys `lattice-docs-palette` / `lattice-docs-mode` (+
 *     `starlight-theme`) persist the choice across MPA navigations.
 *
 * The pre-paint scripts (ThemeProvider.astro on docs, the per-page inline
 * <head> script on standalone routes) still set these BEFORE first paint to
 * avoid FOUC — this module is the runtime controller, never the first paint.
 */

export const PALETTE_KEY = 'lattice-docs-palette';
export const MODE_KEY = 'lattice-docs-mode';
export const STARLIGHT_THEME_KEY = 'starlight-theme';
export const DEFAULT_PALETTE = 'indaco';

export type Mode = 'light' | 'dark';

const root = () => document.documentElement;

export function getPalette(): string {
	return root().getAttribute('data-palette') || DEFAULT_PALETTE;
}

export function setPalette(palette: string): void {
	root().setAttribute('data-palette', palette);
	try {
		localStorage.setItem(PALETTE_KEY, palette);
	} catch {
		/* private mode / storage disabled — attribute is still set */
	}
}

export function getMode(): Mode {
	return root().getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
}

export function setMode(mode: Mode): void {
	const r = root();
	r.setAttribute('data-mode', mode);
	r.dataset.theme = mode; // keep Starlight's CSS + code blocks in lockstep
	try {
		localStorage.setItem(MODE_KEY, mode);
		localStorage.setItem(STARLIGHT_THEME_KEY, mode);
	} catch {
		/* storage disabled */
	}
}

export function toggleMode(): Mode {
	const next: Mode = getMode() === 'dark' ? 'light' : 'dark';
	setMode(next);
	return next;
}

/**
 * Re-sync the <html> attributes from localStorage and return the current
 * state. Used on mount and on `pageshow` (bfcache restores, e.g. Back from the
 * playground, where the pre-paint <head> script doesn't re-run).
 */
export function syncFromStorage(): { palette: string; mode: Mode } {
	const r = root();
	try {
		const p = localStorage.getItem(PALETTE_KEY);
		if (p && p !== r.getAttribute('data-palette')) r.setAttribute('data-palette', p);
		const m = localStorage.getItem(MODE_KEY);
		if ((m === 'light' || m === 'dark') && m !== r.getAttribute('data-mode')) {
			r.setAttribute('data-mode', m as Mode);
			r.dataset.theme = m;
		}
	} catch {
		/* storage disabled */
	}
	return { palette: getPalette(), mode: getMode() };
}
