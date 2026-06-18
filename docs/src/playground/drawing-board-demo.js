// Drawing Board auto-demo — the self-driving walkthrough behind the "Demo"
// launcher. It builds a slide IN THE REAL WORKSPACE, on autoplay: types a heading
// into the editor, opens the theme menu and switches palette, opens Export — then
// restores the deck you had open. The shared engine (guided-demo.js) owns HOW it
// runs (autoplay, spotlight, snapshot/restore); this file owns WHICH actions and
// HOW we drive them through the workspace's window buses.
import { initGuidedDemo } from './guided-demo.js';

// The slide the demo writes — a real `stats` layout (eyebrow + headline + three
// big figures) so the preview renders a boardroom-quality slide, not a bare
// heading. Authored per lib/components/evidence/stats/stats.docs.md.
const DEMO_SLIDE = [
	'<!-- _class: stats -->',
	'',
	'`Q3 · Company-wide`',
	'',
	'## Our quarter in three numbers.',
	'',
	'1. +24%',
	'   - revenue, year over year',
	'2. 2',
	'   - new markets, both profitable',
	'3. 91%',
	'   - net revenue retention',
].join('\n');

// Dispatch an Escape so a portalled shadcn/Radix menu closes itself. The demo's
// driver runs with keyboard control OFF, so this never tears the demo down.
function sendEscape() {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

// --- performers -------------------------------------------------------------
// Each drives a real control through its window bus and calls `next()` when the
// action is done. Returns a cleanup fn so a mid-action close cancels its timers.

// Type a slide into the editor. We drive `__dbEditor.setValue` with a growing
// slice for a live typing effect (each write re-renders the preview); reduced
// motion writes it in one shot. We must NOT touch `__dbEditor.onChange` — that's
// a single-subscriber slot owned by the render controller.
function performType({ next, reduced }) {
	const ed = window.__dbEditor;
	if (!ed || typeof ed.setValue !== 'function') {
		next();
		return null;
	}
	ed.focus?.();
	if (reduced) {
		ed.setValue(DEMO_SLIDE);
		next();
		return null;
	}
	let i = 0;
	const id = window.setInterval(() => {
		i = Math.min(DEMO_SLIDE.length, i + 3);
		ed.setValue(DEMO_SLIDE.slice(0, i));
		if (i >= DEMO_SLIDE.length) {
			window.clearInterval(id);
			next();
		}
	}, 42);
	return () => window.clearInterval(id);
}

// Switch the deck palette. Open the real theme menu (a visible button click),
// then apply a different palette through the chrome bus (`applyTheme` writes the
// deck's `theme:` front matter and recolours the whole deck), then dismiss the
// menu. Palette choice is data-driven: the first palette that isn't the current.
function performPalette({ next }) {
	const chrome = window.__dbChrome;
	if (!chrome || typeof chrome.applyTheme !== 'function') {
		next();
		return null;
	}
	const trigger = document.querySelector('[aria-label="Deck theme"]');
	trigger?.click();
	const t1 = window.setTimeout(() => {
		const current = chrome.getPalette?.();
		const all = chrome.getPalettes?.() || [];
		const pick = all.find((p) => p && p !== current);
		if (pick) chrome.applyTheme(pick);
	}, 720);
	const t2 = window.setTimeout(() => {
		sendEscape();
		next();
	}, 1600);
	return () => {
		window.clearTimeout(t1);
		window.clearTimeout(t2);
	};
}

// Open the Export menu — a real click on the export trigger — to reveal the
// formats, then close it. The demo shows the door without forcing a download.
function performExport({ next }) {
	const trigger = document.getElementById('db-export');
	if (!trigger) {
		next();
		return null;
	}
	trigger.click();
	const t = window.setTimeout(() => {
		sendEscape();
		next();
	}, 1700);
	return () => window.clearTimeout(t);
}

const STEPS = [
	{
		popover: {
			title: 'Watch me build a deck',
			description:
				'Sit back — I’ll write a slide, restyle it, and open Export myself, all in this real workspace. I’ll borrow the canvas for a moment and hand your deck back exactly as you left it.',
			nextBtnText: 'Skip intro',
		},
	},
	{
		element: '#db-editor',
		perform: performType,
		popover: {
			title: 'Writing a slide',
			description:
				'Decks are plain Lattice Markdown — a heading and two bullets is already a slide. Watch it appear, keystroke by keystroke.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '[aria-label="Deck theme"]',
		perform: performPalette,
		popover: {
			title: 'Restyling it',
			description:
				'Opening the theme menu and picking a new palette. Layouts are palette-blind, so the whole deck recolours at once — not a single slide is touched.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '#db-preview',
		popover: {
			title: 'Rendered live',
			description:
				'There it is — drawn by the same engine that makes the shipped PDFs, so what you see is what ships. Every edit updates it instantly.',
			side: 'left',
			align: 'center',
		},
	},
	{
		element: '#db-export',
		perform: performExport,
		popover: {
			title: 'Shipping it',
			description:
				'Opening Export — a vector PDF, image-based PowerPoint, plain Markdown, a portable Marp bundle, or straight to print. Whatever the moment needs.',
			side: 'left',
			align: 'start',
		},
	},
	{
		popover: {
			title: 'That’s the whole loop',
			description:
				'Write → restyle → render → ship — built in front of you. Your deck is back exactly as you left it. Replay anytime from <strong>Demo</strong>, or take the descriptive <strong>?</strong> tour for a full lap of the workspace.',
		},
	},
];

// On mobile the workspace shows one panel at a time. If an act step's target sits
// in a hidden panel, switch to its tab first; the topbar palette/export stay
// visible, so their steps need no reveal. A no-op on desktop. (Mirrors the tour.)
const DB_PANE_OF = {
	'db-architect': 'architect',
	'db-editor': 'editor',
	'db-preview': 'preview',
};

function revealStep(el) {
	if (el.offsetParent !== null) return; // already on screen
	const panel = el.closest('.db-panel');
	const pane = panel && DB_PANE_OF[panel.id];
	if (!pane) return;
	const tab = document.querySelector(`.db-mobile-tab[data-pane="${pane}"]`);
	if (tab) tab.click();
}

// Capture the open deck before the demo borrows the canvas, and put it back when
// the demo ends or is closed. The palette lives in the deck's front matter, so
// restoring the source restores the palette too.
//
// Crucially, we SUSPEND autosave for the demo's duration. Typing into the editor
// normally flows through onEdit → __dbStore.saveActive, which persists to
// IndexedDB and auto-titles the deck from its H1 — so without this the demo's
// transient slide would be durably written (and the deck renamed) the moment the
// user closed the tab mid-demo, which restoring the editor buffer can't undo.
// With autosave suspended, nothing the demo does is ever persisted; the durable
// deck stays exactly as it was, and we restore the live buffer on the way out.
function snapshot() {
	window.__dbStore?.setSuspended?.(true);
	return { source: window.__dbEditor?.getValue?.() ?? null };
}
function restore(snap) {
	if (snap?.source != null && window.__dbEditor?.setValue) {
		window.__dbEditor.setValue(snap.source);
	}
	// Resume autosave AFTER the buffer is back, so the restoring write is suppressed
	// too (the durable deck already holds this exact source) — no spurious save,
	// no updatedAt bump, no reordering of the deck list.
	window.__dbStore?.setSuspended?.(false);
}

export function initDrawingBoardDemo() {
	return initGuidedDemo({ key: 'drawing-board', steps: STEPS, snapshot, restore, onReveal: revealStep });
}
