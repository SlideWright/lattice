// debug-prefs.js — the viewer's SESSION OVERRIDE for the layout debug overlay.
//
// The deck's `debug:` front matter is the default (it travels with the deck and
// drives every preview surface). This override lets a viewer force the overlay on
// or off for THIS device without editing the deck — the quick flip while you work.
// Three states:
//   'on'   → force the overlay on even if the deck never asked
//   'off'  → force it off even if the deck says `debug: on-hover`
//   null   → follow the deck (the default; the key is absent from localStorage)
//
// Persisted (survives reloads) but never written into the deck and never exported.
// Mirrors the old bbox-prefs shape so the toolbar toggle + deck-setup switch can
// both read it cheaply without importing the overlay code.
const KEY = 'lattice-debug';
const listeners = new Set();

/** @returns {'on'|'off'|null} */
export function getDebugOverride() {
	try {
		const v = localStorage.getItem(KEY);
		return v === 'on' || v === 'off' ? v : null;
	} catch {
		return null;
	}
}

/** @param {'on'|'off'|null} val */
export function setDebugOverride(val) {
	try {
		if (val === 'on' || val === 'off') localStorage.setItem(KEY, val);
		else localStorage.removeItem(KEY);
	} catch {}
	for (const fn of listeners) {
		try {
			fn(getDebugOverride());
		} catch {}
	}
}

/** Subscribe to same-page changes. Returns an unsubscribe fn (void). */
export function onDebugOverrideChange(fn) {
	listeners.add(fn);
	return () => {
		listeners.delete(fn);
	};
}

/**
 * The effective on/off for the preview: the override wins, else the deck decides.
 * `deckHasDebug` is whether the deck's front matter turns debug on.
 */
export function debugEffectiveOn(deckHasDebug) {
	const o = getDebugOverride();
	return o === 'on' ? true : o === 'off' ? false : !!deckHasDebug;
}
