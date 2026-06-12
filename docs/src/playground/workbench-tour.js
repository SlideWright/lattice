// Workbench guided tour — the step deck for the Theme Studio (Faculty 1, the
// default bench). Steps spotlight the design → preview → audit → ship arc, then
// point at the faculty switch so authors discover the Layout Studio. The shared
// helper (guided-tour.js) owns the button, the first-visit auto-run, and the
// palette-blind popover styling.
import { initGuidedTour } from './guided-tour.js';

const STEPS = [
	{
		popover: {
			title: 'Welcome to the Workbench',
			description:
				'This is where you craft a theme. A Lattice palette is just a handful of colours — the studio derives the rest and holds it to WCAG AA. Here’s the tour, in the order you’d build one.',
		},
	},
	{
		element: '.studio-fields',
		popover: {
			title: 'Set a few core colours',
			description:
				'This is the whole job: pick a handful of essentials, and the studio derives the full token contract from them — surfaces, text, borders, accents — so the palette stays coherent. Start here.',
			side: 'right',
			align: 'start',
		},
	},
	{
		element: '.studio-ai',
		popover: {
			title: 'Or just describe it',
			description:
				'Rather not pick colours by hand? Describe the palette in plain language — “warm editorial”, “cooler”, “navy accent” — and the studio drafts the essentials for you. Works with or without a connected model.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '.studio-starters',
		popover: {
			title: 'Or begin from a preset',
			description:
				'A third way in: start from a shipped palette and adjust. Every starter is a real Lattice theme.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '.studio-stage',
		popover: {
			title: 'See it live',
			description:
				'Every change renders instantly on a real specimen deck, through the same engine the Drawing Board and CLI use — and you can flip the specimen between light and dark to check both. What you see is what ships.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '.studio-audit',
		popover: {
			title: 'Held to WCAG AA',
			description:
				'The meter checks every text/background pair as you go and flags anything that falls short — so accessible contrast is built in, not bolted on later.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '.studio-actions',
		popover: {
			title: 'Save it, then ship it',
			description:
				'Name the theme, save it to your library to keep iterating across visits, then copy the CSS or download a drop-in <code>themes/&lt;name&gt;.css</code> — that one file is the whole theme.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '.wb-faculty',
		popover: {
			title: 'There’s a second bench',
			description:
				'That’s the Theme Studio. Switch to <strong>Layout Studio</strong> to author a palette-blind component the same way. Replay this tour anytime from the <strong>Tour</strong> button up top.',
			side: 'bottom',
			align: 'start',
		},
	},
];

// On mobile a studio shows one pane at a time (Design · Preview · Contrast).
// If a step's target is in a hidden pane, switch to its tab first. Each pane
// maps to a studio-tab value; the buttons live inside the active faculty's
// <main class="studio">. A no-op on desktop, where all panes are visible.
const WB_TAB_OF = [
	['.studio-controls', 'design'],
	['.studio-stage', 'preview'],
	['.studio-audit', 'contrast'],
];

function revealStep(el) {
	if (el.offsetParent !== null) return; // already on screen
	for (const [sel, tab] of WB_TAB_OF) {
		const host = el.closest(sel);
		if (!host) continue;
		const main = host.closest('main.studio');
		const btn = main?.querySelector(`.studio-tab[data-tab="${tab}"]`);
		if (btn) btn.click();
		return;
	}
}

export function initWorkbenchTour() {
	return initGuidedTour({ key: 'workbench', steps: STEPS, onReveal: revealStep });
}
