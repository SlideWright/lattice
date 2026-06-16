// Drawing Board hands-on lesson — the "do it yourself" walkthrough behind the
// "Try it" launcher. It coaches a newcomer through the whole authoring loop with
// their own hands: write a slide → restyle it → watch it render → ship it. Each
// "do" step waits for the real action before advancing. The shared engine
// (guided-lesson.js) owns HOW it runs (spotlight, non-blocking overlay, the "Your
// turn" cue); this file owns WHICH actions and HOW we detect them.
import { initGuidedLesson } from './guided-lesson.js';

// --- action detectors -------------------------------------------------------
// Each returns a cleanup fn and calls `done()` once — exactly once — when the
// user performs the step. They read the live workspace through its existing
// window buses without disturbing them.

// Typing in the editor. We must NOT use `window.__dbEditor.onChange`: it is a
// SINGLE-subscriber slot already owned by the render controller (wiring it here
// would silence the live preview). So we poll `getValue()` and advance once the
// deck has grown — i.e. the user has added something.
function waitEditorEdited({ done }) {
	const ed = window.__dbEditor;
	if (!ed || typeof ed.getValue !== 'function') {
		done();
		return null;
	}
	const base = (ed.getValue() || '').replace(/\s+$/, '');
	const id = window.setInterval(() => {
		const now = (ed.getValue() || '').replace(/\s+$/, '');
		if (now !== base && now.length > base.length) done();
	}, 280);
	return () => window.clearInterval(id);
}

// Switching the deck theme. The topbar palette control writes the deck's theme
// and the render controller echoes every change back as a `db-chrome-sync` event
// — a clean semantic signal, far better than scraping the portalled shadcn menu.
function waitPaletteChanged({ done }) {
	const start = window.__dbChrome?.getPalette?.();
	const onSync = (e) => {
		const p = e?.detail?.palette ?? window.__dbChrome?.getPalette?.();
		if (p && p !== start) done();
	};
	window.addEventListener('db-chrome-sync', onSync);
	return () => window.removeEventListener('db-chrome-sync', onSync);
}

// Running an export. The export menu calls `window.__dbExport.run(kind)`; we wrap
// it to fire on any real export, then restore the original on cleanup. If the bus
// is not wired yet, fall back to the trigger click.
function waitExportRun({ done }) {
	const bus = window.__dbExport;
	if (bus && typeof bus.run === 'function') {
		const orig = bus.run;
		bus.run = function wrappedRun(...args) {
			try {
				return orig.apply(this, args);
			} finally {
				done();
			}
		};
		return () => {
			if (bus.run !== orig) bus.run = orig;
		};
	}
	const trigger = document.getElementById('db-export');
	const onClick = () => done();
	trigger?.addEventListener('click', onClick);
	return () => trigger?.removeEventListener('click', onClick);
}

const STEPS = [
	{
		popover: {
			title: 'Build a deck — together',
			description:
				'A two-minute, hands-on lap: you’ll write a slide, restyle it, watch it render, and export it. I’ll wait at each step until you’ve done it — nothing here is destructive. Ready?',
			nextBtnText: 'Start',
		},
	},
	{
		element: '#db-editor',
		waitFor: waitEditorEdited,
		popover: {
			title: 'Write a slide',
			description:
				'Click into the editor and type a heading — try <code># Our Q3 results</code>. Decks are plain Lattice Markdown, so that one line is already a slide.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '[aria-label="Deck theme"]',
		waitFor: waitPaletteChanged,
		popover: {
			title: 'Restyle it',
			description:
				'Open the theme menu and pick a different palette. Layouts are palette-blind, so the whole deck recolours at once — you never touch a slide.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '#db-preview',
		popover: {
			title: 'Watch it render',
			description:
				'Your slides live here, drawn by the same engine that makes the shipped PDFs — what you see is what ships, and every edit updates it instantly.',
			side: 'left',
			align: 'center',
			nextBtnText: 'Got it',
		},
	},
	{
		element: '#db-export',
		waitFor: waitExportRun,
		popover: {
			title: 'Ship it',
			description:
				'Open Export and choose <strong>Markdown</strong> — a safe, instant download of your source. (PDF, PowerPoint and a portable Marp bundle live here too.)',
			side: 'left',
			align: 'start',
		},
	},
	{
		popover: {
			title: 'That’s the whole loop',
			description:
				'Write → restyle → render → ship. You just built and exported a deck. Replay this anytime from <strong>Try it</strong>, or take the descriptive <strong>?</strong> tour for a full lap of the workspace.',
		},
	},
];

// On mobile the workspace shows one panel at a time. If a "do" step's target sits
// in a hidden panel, switch to its tab first; the topbar palette stays visible,
// so its step needs no reveal. A no-op on desktop. (Mirrors the tour's mapping.)
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

export function initDrawingBoardLesson() {
	return initGuidedLesson({ key: 'drawing-board', steps: STEPS, onReveal: revealStep });
}
