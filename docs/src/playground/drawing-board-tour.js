// Drawing Board guided tour — the step deck for the three-panel workspace
// (Architect · Editor · Preview) plus its drawers. Spotlights the
// write → review → render → ship arc. The shared helper (guided-tour.js) owns
// the button, the first-visit auto-run, and the palette-blind popover styling.
import { initGuidedTour } from './guided-tour.js';

const STEPS = [
	{
		popover: {
			title: 'Welcome to the Drawing Board',
			description:
				'The shortest path from an idea to a finished deck: write Markdown, watch it render, ship it. Here’s the two-minute tour — it follows what you’ll actually do.',
		},
	},
	{
		element: '#db-editor',
		popover: {
			title: 'Start here — write',
			description:
				'This is the deck, in plain Lattice Markdown. Autocomplete knows the component classes and theme tokens, so <code>&lt;!-- _class: … --&gt;</code> is a keystroke away. Just start typing.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '#db-preview',
		popover: {
			title: '…and watch it render',
			description:
				'Your slides appear here as you type — through the same engine that produces the shipped PDFs, so what you see is what ships. No build step, no refresh. <strong>Practice</strong> up top rehearses them full-screen.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '#db-architect',
		popover: {
			title: 'Your deck partner',
			description:
				'The Architect reviews your slides against Lattice’s design contract and suggests fixes. <strong>Coach</strong> gives deterministic next-step chips with no model needed; <strong>Converse</strong> opens a chat once you connect one. Start in Coach — it works offline.',
			side: 'right',
			align: 'start',
		},
	},
	{
		element: '#db-config-open',
		popover: {
			title: 'Set up the deck',
			description:
				'Theme, slide size, pagination, header and footer — set them here instead of hand-editing front-matter.',
			side: 'bottom',
			align: 'end',
		},
	},
	{
		element: '#db-export',
		popover: {
			title: 'Ship it',
			description:
				'Export the finished deck as Markdown, a vector PDF, image-based PowerPoint, or straight to print — whatever the moment needs.',
			side: 'bottom',
			align: 'center',
		},
	},
	{
		element: '#db-decks-open',
		popover: {
			title: 'It’s all saved',
			description:
				'Your decks and their full revision history live in this browser. Every state is checkpointed, so you can always restore an earlier draft — nothing is lost.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '#db-model-chip',
		popover: {
			title: 'Settings',
			description:
				'Tune the workspace and choose how the Architect thinks — connect a model or run one on-device. It’s also where you can switch these guided tours off.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '#palette',
		popover: {
			title: 'Try any palette',
			description:
				'Recolour the whole workspace from here — layouts are palette-blind, so the same deck looks at home in every theme. That’s the tour; replay it anytime from the <strong>Tour</strong> button.',
			side: 'bottom',
			align: 'end',
		},
	},
];

// On mobile the workspace shows one panel at a time (Architect · Edit ·
// Preview). If a step's target is in a hidden panel, switch to its tab first.
// Each panel id maps to a mobile-tab pane; the topbar (palette, settings) stays
// visible so its steps need no reveal. A no-op on desktop, where all three
// panels show at once.
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

export function initDrawingBoardTour() {
	return initGuidedTour({ key: 'drawing-board', steps: STEPS, onReveal: revealStep });
}
