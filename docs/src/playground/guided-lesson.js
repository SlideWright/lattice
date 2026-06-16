// Hands-on lessons — the "do it yourself" sibling of the guided tour. Where the
// tour (guided-tour.js) *describes* the workspace with passive popovers you read
// and click past, a lesson *coaches the user through real actions*: it spotlights
// a control, shows an instruction, and WAITS — advancing only once the user
// actually performs the step (types in the editor, switches the palette, runs an
// export). It reuses the same driver.js engine and palette-blind popover styling
// as the tour, adding two things on top:
//
//   1. A per-step `waitFor(ctx)` hook. The hook wires up a listener and calls
//      `ctx.done()` when the user completes the action, returning a cleanup fn. A
//      step WITH a `waitFor` is a "do" step (the app waits for the user); a step
//      WITHOUT one is a "read" beat (an explanatory card, advanced by the popover
//      button) — same shape as a tour step.
//   2. A NON-BLOCKING overlay. The tour traps interaction (you read, then click
//      Next). A lesson is the opposite: the user MUST be able to touch every real
//      control — including shadcn menus that portal OUTSIDE driver's spotlight
//      cutout — so lesson mode turns off the overlay's click-trapping (CSS in
//      guided-lesson.css) while keeping the spotlight's visual dimming. Keyboard
//      control is off too, so pressing Enter while typing a slide never advances.
//
// Production-gated and globally toggled exactly like the tour (toursAllowedHere +
// tour-prefs), so the Drawing Board's one "Guided tours" setting silences both.
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/guided-tour.css';
import '../styles/guided-lesson.css';
import { toursAllowedHere } from './guided-tour.js';
import { onToursEnabledChange, toursEnabled } from './tour-prefs.js';

const SEEN_PREFIX = 'lattice-lesson-seen-';

function prefersReducedMotion() {
	try {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	} catch {
		return false;
	}
}

// Same existence test as the tour: a step is kept when it has no element (a
// centered card) or its selector resolves. `onReveal` switches to the right
// mobile pane before the spotlight lands; steps that resolve to nothing are
// dropped so the lesson never strands on empty space.
function isStepLive(step) {
	if (!step?.element) return true;
	if (typeof step.element !== 'string') return Boolean(step.element);
	return Boolean(document.querySelector(step.element));
}

/**
 * Wire a hands-on lesson into the current page.
 *
 * @param {object} opts
 * @param {string} opts.key     Stable id for the localStorage "completed" flag.
 * @param {Array}  opts.steps   Lesson steps: `{ element?, popover, waitFor? }`.
 *        `waitFor({ element, done })` registers a listener for the user's action,
 *        calls `done()` once, and returns a cleanup fn. Its presence marks a "do"
 *        step; its absence makes a "read" beat.
 * @param {(el: Element, step: object) => void} [opts.onReveal]  Bring a step's
 *        target on screen (e.g. switch the active mobile tab) before the spotlight.
 * @param {string} [opts.buttonLabel='Try it']
 * @param {string} [opts.buttonTitle]
 * @param {string|Element|null} [opts.mountTarget='.topbar-actions']  Where to put
 *        the launcher; `null` for a caller-driven lesson with no button.
 * @returns {{ start: () => void, seen: () => boolean, markSeen: () => void }}
 */
export function initGuidedLesson(opts) {
	const {
		key,
		steps,
		onReveal,
		buttonLabel = 'Try it',
		buttonTitle = 'Learn by doing — a hands-on walkthrough',
		mountTarget = '.topbar-actions',
	} = opts || {};

	const noop = { start() {}, seen: () => true, markSeen() {} };
	if (!key || !Array.isArray(steps) || steps.length === 0) return noop;
	// Production-only, exactly like the tour: no launcher, no run on dev / preview.
	if (!toursAllowedHere()) return noop;

	const seenKey = SEEN_PREFIX + key;
	const seen = () => {
		try {
			return localStorage.getItem(seenKey) === '1';
		} catch {
			return false;
		}
	};
	const markSeen = () => {
		try {
			localStorage.setItem(seenKey, '1');
		} catch {}
	};

	let activeDriver = null;
	let activeCleanup = null;
	const runCleanup = () => {
		if (activeCleanup) {
			try {
				activeCleanup();
			} catch {}
			activeCleanup = null;
		}
		document.body.classList.remove('lesson-waiting');
	};

	const reveal = (element, step) => {
		if (typeof onReveal !== 'function') return;
		const el =
			element ||
			(typeof step?.element === 'string' ? document.querySelector(step.element) : step?.element);
		if (!el) return;
		try {
			onReveal(el, step);
		} catch {}
	};

	const start = () => {
		if (activeDriver) return;
		const live = steps.filter(isStepLive);
		if (live.length === 0) return;
		const reduced = prefersReducedMotion();

		const driverSteps = live.map((step, i) => {
			const isDo = typeof step.waitFor === 'function';
			const isLast = i === live.length - 1;
			return {
				element: step.element,
				popover: {
					...step.popover,
					// "Skip" on a do-step is the escape hatch; "Finish" closes the lesson.
					nextBtnText: isLast ? 'Finish' : isDo ? 'Skip' : step.popover?.nextBtnText || 'Next',
				},
				onHighlightStarted: (el) => reveal(el, step),
				onHighlighted: (el) => {
					runCleanup();
					if (!isDo) return;
					document.body.classList.add('lesson-waiting');
					let advanced = false;
					const done = () => {
						if (advanced) return;
						advanced = true;
						runCleanup();
						// Let the user SEE their action register before the lesson moves on.
						window.setTimeout(() => {
							if (activeDriver?.isActive()) activeDriver.moveNext();
						}, 420);
					};
					try {
						activeCleanup = step.waitFor({ element: el, done }) || null;
					} catch {
						activeCleanup = null;
					}
				},
				onDeselected: () => runCleanup(),
			};
		});

		activeDriver = driver({
			showProgress: true,
			allowClose: true,
			animate: !reduced,
			smoothScroll: !reduced,
			overlayColor: 'rgba(16, 18, 22, 0.55)',
			overlayOpacity: 1,
			stagePadding: 6,
			stageRadius: 8,
			// The user drives real controls; never let arrow/Enter keys (e.g. a
			// newline while typing a slide) advance the lesson behind their back.
			allowKeyboardControl: false,
			popoverClass: 'lattice-tour lattice-lesson',
			progressText: '{{current}} of {{total}}',
			onPopoverRender: (popover, { state }) => {
				const idx =
					typeof state.activeIndex === 'number' ? state.activeIndex : (activeDriver?.getActiveIndex() ?? 0);
				const isDo = typeof live[idx]?.waitFor === 'function';
				popover.wrapper.classList.toggle('is-do', isDo);
				// A small "Your turn" cue above the title on a do-step (guard against a
				// double insert on driver's resize/refresh re-render).
				if (isDo && !popover.wrapper.querySelector('.lesson-turn')) {
					const chip = document.createElement('div');
					chip.className = 'lesson-turn';
					chip.textContent = 'Your turn';
					popover.wrapper.insertBefore(chip, popover.title);
				}
			},
			// Overriding onDestroyStarted means we own the teardown call.
			onDestroyStarted: () => {
				runCleanup();
				markSeen();
				activeDriver?.destroy();
			},
			onDestroyed: () => {
				document.body.classList.remove('lesson-running');
				activeDriver = null;
			},
			steps: driverSteps,
		});

		document.body.classList.add('lesson-running');
		activeDriver.drive();
	};

	// Launcher button — mounted/unmounted on demand so the Drawing Board's "Guided
	// tours" setting flips it (and the "?" tour button) without a reload.
	const actions =
		mountTarget == null
			? null
			: typeof mountTarget === 'string'
				? document.querySelector(mountTarget)
				: mountTarget;
	let btn = null;
	const mountButton = () => {
		if (!actions || btn) return;
		btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'tour-btn lesson-btn';
		btn.title = buttonTitle;
		btn.setAttribute('aria-label', buttonTitle);
		btn.innerHTML = `<span class="tour-btn-glyph" aria-hidden="true">▶</span><span class="tour-btn-label">${buttonLabel}</span>`;
		btn.addEventListener('click', () => start());
		actions.insertBefore(btn, actions.firstChild);
	};
	const unmountButton = () => {
		if (btn) {
			btn.remove();
			btn = null;
		}
	};

	const applyEnabled = (on) => {
		if (on) mountButton();
		else {
			unmountButton();
			if (activeDriver) activeDriver.destroy();
		}
	};
	onToursEnabledChange(applyEnabled);
	if (toursEnabled()) mountButton();

	return { start, seen, markSeen };
}
