// Single canonical ambient declaration of the on-demand engine globals
// (`window.LatticePlayground` — the marp render bridge — and
// `window.LatticeDeckPreview` — the filmstrip controller). Both are attached by
// the classic-script engine bundle (`lattice-playground.js`); callers guard their
// presence via `whenReady`/`ensureEngine` before use.
//
// WHY THIS FILE EXISTS: every lib module that touches these globals used to
// re-`declare global { interface Window … }` with its OWN local `PG` type — one
// said `unknown`, others said `{ render, addThemes, hasTheme }`, another the
// subset `{ addThemes, hasTheme }`. TypeScript merges those declarations and, on
// the conflicting member types, both reports TS2717 ("subsequent property
// declarations must have the same type") AND collapses `Window.LatticePlayground`
// to `{}` — which then cascaded into every `.render`/`.addThemes`/`.hasTheme`
// "does not exist on type '{}'" error. Declaring the globals exactly once here,
// with the full shape, is the fix.

export interface LatticePlaygroundEngine {
	render: (
		source: string,
		theme: string,
		opts?: { baseUrl?: string },
	) => { html: string; css: string; width?: number; height?: number };
	addThemes: (css: string[]) => void;
	hasTheme: (name: string) => boolean;
}

export interface LatticeDeckPreviewController {
	renderDeck: (
		opts: Record<string, unknown>,
	) => { state: { frameSig: string; lastSections: unknown }; count: number };
}

declare global {
	interface Window {
		LatticePlayground?: LatticePlaygroundEngine;
		LatticeDeckPreview?: LatticeDeckPreviewController;
	}
}
