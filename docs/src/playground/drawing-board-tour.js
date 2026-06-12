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
				'A full deck workspace: write Markdown, get live review from the Architect, and watch boardroom-quality slides render as you type. Here’s the two-minute tour.',
		},
	},
	{
		element: '#db-architect',
		popover: {
			title: 'The Architect',
			description:
				'Your deck partner. It reviews your slides against Lattice’s design contract and suggests fixes — deterministically, so the same deck always gets the same read.',
			side: 'right',
			align: 'start',
		},
	},
	{
		element: '#db-arch-modes',
		popover: {
			title: 'Coach or Converse',
			description:
				'<strong>Coach</strong> offers deterministic next-step chips and findings — no model required. <strong>Converse</strong> opens a chat once you connect a model. Start in Coach; it works offline.',
			side: 'right',
			align: 'start',
		},
	},
	{
		element: '#db-arch-composer',
		popover: {
			title: 'Ask the Architect',
			description:
				'Type a question about your deck — “is this slide too dense?”, “suggest a layout for these three points”. Answers ground in your actual Markdown and the component catalog.',
			side: 'top',
			align: 'start',
		},
	},
	{
		element: '#db-editor',
		popover: {
			title: 'The Markdown editor',
			description:
				'Write the deck here in plain Lattice Markdown. Autocomplete knows the component classes and theme tokens, so <code>&lt;!-- _class: … --&gt;</code> and friends are a keystroke away.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '#db-config-open',
		popover: {
			title: 'Deck setup',
			description:
				'Set the front-matter without hand-editing it: theme, slide size, pagination, header and footer all live in this drawer.',
			side: 'bottom',
			align: 'end',
		},
	},
	{
		element: '#db-preview',
		popover: {
			title: 'Live slides',
			description:
				'Your deck renders here continuously through the real Lattice engine — the same one that produces the shipped PDFs. No build step, no refresh.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '#db-practice-open',
		popover: {
			title: 'Practice mode',
			description:
				'Rehearse full-screen with pacing when the deck is ready — a presenter view without leaving the page.',
			side: 'bottom',
			align: 'center',
		},
	},
	{
		element: '#db-export',
		popover: {
			title: 'Export anywhere',
			description:
				'Ship the deck as Markdown, a vector PDF, image-based PowerPoint, or straight to print — all from here.',
			side: 'bottom',
			align: 'center',
		},
	},
	{
		element: '#db-decks-open',
		popover: {
			title: 'Decks & versions',
			description:
				'Your decks and their full revision history live in this browser. Every state is checkpointed, so you can always restore an earlier draft — nothing is lost.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '#db-model-chip',
		popover: {
			title: 'Settings & on-device AI',
			description:
				'Tune the workspace and choose how the Architect thinks — connect a model or run a smaller one on-device. The chip shows the current tier at a glance.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '#palette',
		popover: {
			title: 'Try any palette',
			description:
				'Recolour the entire workspace from this menu — layouts are palette-blind, so the same deck looks at home in every theme. That’s the whole tour; replay it anytime from the <strong>Tour</strong> button.',
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
