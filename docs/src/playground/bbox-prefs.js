// Bounding-box preference — the single source of truth for whether the live
// preview shows debug bounding boxes (colour-coded element outlines) by default.
// Mirrors perf-overlay-prefs.js / tour-prefs.js: deliberately tiny and
// dependency-free so the toolbar toggle and the deck-setup drawer can both read
// it cheaply without dragging the overlay code into their bundle.
//
// This is the PERMANENT half of the feature: the drawer switch writes here
// (localStorage), so the choice survives reloads and is the baseline the
// Playground initialises from. The toolbar button is the TEMPORARY half — it
// flips the live view for the session without touching this flag.
//
// Default is OFF — a debugging aid, opt-in only, never exported with a deck.
const KEY = 'lattice-bbox';
const listeners = new Set();

export function bboxEnabled() {
	try {
		return localStorage.getItem(KEY) === 'on';
	} catch {
		return false;
	}
}

export function setBboxEnabled(on) {
	try {
		if (on) localStorage.setItem(KEY, 'on');
		else localStorage.removeItem(KEY);
	} catch {}
	for (const fn of listeners) {
		try {
			fn(!!on);
		} catch {}
	}
}

/** Subscribe to same-page changes. Returns an unsubscribe fn. */
export function onBboxEnabledChange(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}
