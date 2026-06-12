// Playground guided tour — the step deck for the single-surface sandbox: pick a
// component or load a deck, edit the Markdown, watch it render live. The shared
// helper (guided-tour.js) owns the button, the first-visit auto-run, the global
// on/off, and the palette-blind popover styling.
import { initGuidedTour } from './guided-tour.js';

const STEPS = [
	{
		popover: {
			title: 'Welcome to the Playground',
			description:
				'A live sandbox for Lattice. Drop in any component, edit the Markdown, and watch boardroom-quality slides render through the real engine as you type. Here’s the quick tour.',
		},
	},
	{
		element: '#pg-template-trigger',
		popover: {
			title: 'Pick a component',
			description:
				'Browse the full catalog from this searchable picker — by name, tag, or description, grouped however you like. Choosing one drops a ready-made example into the editor.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '.pg-variant-picker',
		popover: {
			title: 'Switch variants',
			description:
				'Many components ship more than one shape. Once you’ve picked a component, this menu flips between its variants so you can compare them instantly.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '#editor-host',
		popover: {
			title: 'Edit the Markdown',
			description:
				'Write plain Lattice Markdown here. Autocomplete knows the component classes and theme tokens, so <code>&lt;!-- _class: … --&gt;</code> is a keystroke away. On a phone, the Edit / Preview tabs swap this for the slides.',
			side: 'right',
			align: 'start',
		},
	},
	{
		element: '#preview',
		popover: {
			title: 'Live slides',
			description:
				'Your Markdown renders here continuously through the same engine that produces the shipped PDFs — no build step, no refresh.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '#pg-galleries-trigger',
		popover: {
			title: 'Load a full deck',
			description:
				'Rather start from something complete? Open the galleries drawer to load a whole showcase or family-survey deck and explore it slide by slide.',
			side: 'bottom',
			align: 'end',
		},
	},
	{
		element: '#palette',
		popover: {
			title: 'Try any palette',
			description:
				'Recolour everything from this menu. Layouts are palette-blind, so the same Markdown looks at home in every theme.',
			side: 'bottom',
			align: 'end',
		},
	},
	{
		element: '#mode-toggle',
		popover: {
			title: 'Light or dark',
			description:
				'Flip between light and dark to check your slides read well both ways.',
			side: 'bottom',
			align: 'end',
		},
	},
	{
		popover: {
			title: 'That’s the Playground',
			description:
				'Replay this anytime from the <strong>Tour</strong> button up top. When you’re ready to build a full deck, the <strong>Drawing Board</strong> adds an AI partner and version history; the <strong>Workbench</strong> crafts themes and components.',
		},
	},
];

// On mobile the split collapses to Edit / Preview tabs (body[data-pane]). If a
// step targets the hidden pane, switch to its tab first. Topbar steps stay
// visible, so they need no reveal. A no-op on desktop, where both panes show.
function revealStep(el) {
	if (el.offsetParent !== null) return; // already on screen
	if (el.closest('.pg-pane.editor')) document.getElementById('tab-edit')?.click();
	else if (el.closest('.pg-pane.preview')) document.getElementById('tab-preview')?.click();
}

export function initPlaygroundTour() {
	return initGuidedTour({ key: 'playground', steps: STEPS, onReveal: revealStep });
}
