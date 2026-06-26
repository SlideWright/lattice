// The Drawing Board's mobile pane state machine — extracted so it is ONE tested
// source of truth.
//
// This is the same bug class the Playground's pane-sync fix closed: a pane
// change must update EVERY surface that reflects it, or they drift apart. On the
// mobile single-pane layout (drawing-board.css `body[data-pane='…']`) the active
// pane is reflected in four places — the `body[data-pane]` attribute (what the
// layout shows), each tab's `aria-selected` flag (what the control says), the
// persisted pane (so a reload returns you where you were), and the preview
// render (Preview must be live when shown). Routing every pane change — a tab
// click AND a programmatic `setPane` (onboarding, restore, a deck (re)load) —
// through this one function is what keeps them from diverging.

/** localStorage key the Drawing Board persists the last pane under. */
export const DB_PANE_KEY = 'lattice-db-pane';

/** The valid mobile panes. An unknown / retired pane (e.g. the old 'decks') lands on Edit. */
const PANES = { architect: 1, editor: 1, preview: 1 };

/** True for a pane the layout actually has. */
export function isPane(which) {
	return Boolean(PANES[which]);
}

/**
 * Wire the mobile pane tabs and return the single `setPane`.
 *
 * @param {object} opts
 * @param {Iterable<Element>} opts.tabs  the `.db-mobile-tab` controls (each carries `data-pane`)
 * @param {() => void} [opts.render]     called when the Preview pane becomes active (keep it live)
 * @param {Element} [opts.body]          the element carrying `data-pane` (defaults to document.body)
 * @param {Pick<Storage,'setItem'>|null} [opts.storage]  where the pane is persisted (defaults to localStorage)
 * @returns {{ setPane: (which: string) => string }}
 */
export function createPaneTabs({ tabs, render, body = defaultBody(), storage = defaultStorage() }) {
	const list = Array.from(tabs || []);

	function setPane(which) {
		if (!PANES[which]) which = 'editor'; // unknown / retired pane → land on Edit
		body?.setAttribute('data-pane', which);
		try {
			storage?.setItem(DB_PANE_KEY, which);
		} catch (_e) {
			/* private mode / quota — persistence is best-effort */
		}
		for (const t of list) {
			t.setAttribute('aria-selected', t.getAttribute('data-pane') === which ? 'true' : 'false');
		}
		if (which === 'preview') render?.();
		return which;
	}

	for (const t of list) {
		t.addEventListener('click', () => setPane(t.getAttribute('data-pane')));
	}

	return { setPane };
}

function defaultBody() {
	return typeof document !== 'undefined' ? document.body : null;
}

function defaultStorage() {
	try {
		return typeof window !== 'undefined' ? window.localStorage : null;
	} catch {
		return null;
	}
}
