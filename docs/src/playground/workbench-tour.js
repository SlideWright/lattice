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
				'This is where you fabricate the parts of a deck. The Theme Studio — open now — turns a handful of colours into a full, WCAG-checked palette you can drop into any deck. Here is the tour.',
		},
	},
	{
		element: '.wb-faculty',
		popover: {
			title: 'Two studios, one bench',
			description:
				'The Workbench has two faculties. <strong>Theme Studio</strong> crafts a colour palette; <strong>Layout Studio</strong> authors a CSS-only component. Switch between them here anytime — this tour walks the Theme Studio.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '.studio-ai',
		popover: {
			title: 'Design with AI',
			description:
				'Describe the palette you want in plain language — “warm editorial”, “cooler”, “navy accent” — and the studio drafts it for you. Optional: works with or without a connected model.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '.studio-starters',
		popover: {
			title: 'Start from a preset',
			description:
				'Prefer to begin by hand? Pick a shipped palette as your starting point, then adjust. Every starter is a real Lattice theme.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '.studio-name',
		popover: {
			title: 'Name your theme',
			description:
				'This becomes the filename — <code>themes/&lt;name&gt;.css</code> — when you download. Keep it short and lowercase.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '.studio-fields',
		popover: {
			title: 'Set the essentials',
			description:
				'Choose just a few core colours. The studio derives the rest of the token contract — surfaces, text, borders, accents — so the whole palette stays coherent.',
			side: 'right',
			align: 'start',
		},
	},
	{
		element: '.studio-stage',
		popover: {
			title: 'Live specimen',
			description:
				'Every change renders instantly on a real specimen deck, using the exact same engine the Drawing Board and CLI use. What you see here is what ships.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '.studio-stage .studio-mode',
		popover: {
			title: 'Check light and dark',
			description:
				'Flip the specimen between light and dark to confirm your palette holds up both ways before you commit to it.',
			side: 'bottom',
			align: 'center',
		},
	},
	{
		element: '.studio-audit',
		popover: {
			title: 'Contrast audit',
			description:
				'The studio holds your palette to WCAG AA automatically. The meter flags any text/background pair that falls short, so accessibility is built in — not bolted on later.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '.studio-lib-block',
		popover: {
			title: 'Save to your library',
			description:
				'Save the current palette to keep iterating across visits — your library lives in this browser, no account needed.',
			side: 'top',
			align: 'start',
		},
	},
	{
		element: '.studio-actions',
		popover: {
			title: 'Copy or download',
			description:
				'When it’s ready, copy the CSS to the clipboard or download a drop-in <code>themes/&lt;name&gt;.css</code>. That single file is the whole theme.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '.wb-faculty',
		popover: {
			title: 'Next: the Layout Studio',
			description:
				'That’s the Theme Studio. Switch to <strong>Layout Studio</strong> to author a palette-blind component the same way. Replay this tour anytime from the <strong>Tour</strong> button up top.',
			side: 'bottom',
			align: 'start',
		},
	},
];

export function initWorkbenchTour() {
	return initGuidedTour({ key: 'workbench', steps: STEPS });
}
