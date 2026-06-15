// Practice-mode guided tour — the walkthrough for the full-screen rehearsal
// stage. It runs ON the "ready" pre-roll (before the clock starts), so a first-
// time presenter learns the controls before committing: press play to begin,
// flip Auto for hands-free pacing, read the three clocks, follow the arc.
//
// Reuses the shared driver.js wrapper (guided-tour.js) — same palette-blind
// popovers, reduced-motion handling, production gating, and a remembered "seen"
// flag (tour-prefs). It is CALLER-DRIVEN: the practice overlay covers the page
// topbar, so `mountTarget: null` skips the shared "?" button and the practice
// bar mounts its own; the practice module fires `start()` on the first ready
// screen (and on the bar's ? button), gated by the library's seen flag.
import { initGuidedTour } from './guided-tour.js';

const STEPS = [
	{
		popover: {
			title: 'Your rehearsal stage',
			description:
				'A quick lap of the controls before you start — the clock stays at zero until you press play.',
		},
	},
	{
		element: '.db-pv-ready-start',
		popover: {
			title: 'Press play to start',
			description:
				'Begins the run and starts the clock on your first slide. From there, <strong>swipe</strong> or use the <strong>on-screen arrows</strong> to move — on phone, tablet, or desktop.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '.db-pv-auto',
		popover: {
			title: 'Hands-free? Flip Auto',
			description:
				'Auto-advances each slide on its coached pace — derived from reading speed and the slide’s job, and tuned to your deck when a model is connected. Toggle it anytime.',
			side: 'bottom',
			align: 'end',
		},
	},
	{
		element: '.db-pv-readout',
		popover: {
			title: 'Three clocks, at a glance',
			description:
				'<strong>Elapsed</strong> since you began · time left on <strong>this slide</strong> · whether you’re <strong>on track, ahead, or over</strong>.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '.db-pv-spine',
		popover: {
			title: 'Where you are in the arc',
			description:
				'The deck by section — it fills as you move, so you always know what’s left. That’s the tour; replay it anytime from the <strong>?</strong>.',
			side: 'bottom',
			align: 'center',
		},
	},
];

export function initPracticeTour() {
	// Caller-driven: no shared topbar button (the overlay mounts its own ?).
	return initGuidedTour({ key: 'practice', steps: STEPS, autoStart: false, mountTarget: null });
}
