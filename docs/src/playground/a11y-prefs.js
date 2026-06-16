// Workspace accessibility (CVD) preference — the live viewer's declared
// colour-vision need. The single source of truth for the workspace tier of
// lib/core/resolve-accessibility.js's precedence (workspace > front matter >
// off). Tiny and dependency-free, mirroring tour-prefs.js, so the Settings
// drawer can import it without dragging the resolver/render code along.
//
// The value is the bare CVD type ('deuteranopia' | 'protanopia' | 'tritanopia'
// | 'achromatopsia') or '' for off. It is BOTH persisted to localStorage AND
// stamped onto `<html data-a11y>` so the render controllers (and the pre-paint
// script) can read it synchronously. Global to the docs workspaces, like the
// palette/mode/tour prefs — a viewer's need follows them across surfaces.
const KEY = 'lattice-docs-a11y';
const listeners = new Set();

/** The current workspace setting: a canonical type, or '' (off). */
export function a11ySetting() {
	try {
		return localStorage.getItem(KEY) || '';
	} catch {
		return '';
	}
}

/** Set (or clear, with '' / null) the workspace accessibility need. Persists,
 *  stamps `<html data-a11y>`, and notifies same-page listeners. */
export function setA11ySetting(type) {
	const val = type || '';
	try {
		if (val) localStorage.setItem(KEY, val);
		else localStorage.removeItem(KEY);
	} catch {}
	try {
		const r = document.documentElement;
		if (val) r.setAttribute('data-a11y', val);
		else r.removeAttribute('data-a11y');
	} catch {}
	for (const fn of listeners) {
		try {
			fn(val);
		} catch {}
	}
}

/** Subscribe to same-page changes. Returns an unsubscribe fn. */
export function onA11yChange(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}
