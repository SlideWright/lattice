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
				'A live sandbox for Lattice: drop in a component, edit its Markdown, watch it render. Here’s the quick tour — it follows what you’d actually try.',
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
		element: '#editor-host',
		popover: {
			title: 'Edit its Markdown',
			description:
				'Tweak the example here in plain Lattice Markdown — autocomplete knows the component classes and theme tokens. Many components ship several shapes; the <strong>Variant</strong> menu above flips between them.',
			side: 'right',
			align: 'start',
		},
	},
	{
		element: '#preview',
		popover: {
			title: 'See it render live',
			description:
				'Your Markdown renders here as you type, through the same engine that produces the shipped PDFs — no build step, no refresh. On a phone, the Edit / Preview tabs swap between this and the editor.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '#pg-galleries-trigger',
		popover: {
			title: 'Or load a full deck',
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
				'Recolour everything from here — layouts are palette-blind, so the same Markdown looks at home in every theme, light or dark.',
			side: 'bottom',
			align: 'end',
		},
	},
	{
		popover: {
			title: 'That’s the Playground',
			description:
				'Replay this anytime from the <strong>Tour</strong> button up top. Ready for more? The <strong>Drawing Board</strong> builds full decks with an AI partner and version history; the <strong>Workbench</strong> crafts themes and components.',
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
