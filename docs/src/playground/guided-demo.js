// Auto-demo — a self-driving walkthrough that PERFORMS the real authoring loop
// while the user watches. Where the tour (guided-tour.js) *describes* the
// workspace with passive popovers you click past, a demo *does the work itself*:
// it types a slide into the real editor, opens the theme menu and switches the
// palette, opens Export — each action spotlighted with a caption, advancing on
// its own. It's a product demo that drives the actual UI, not a mock.
//
// It reuses the tour's driver.js engine and palette-blind popover skin, adding:
//
//   1. A per-step `perform(ctx)` hook. On highlight the engine runs it; the hook
//      drives a real control (through the workspace's window buses) and calls
//      `ctx.next()` when the action is done. The engine then dwells a beat — so
//      the viewer sees the result — and auto-advances. A step WITHOUT `perform`
//      is a narration beat that auto-advances after a read pause.
//   2. A NON-BLOCKING overlay. The demo manipulates real controls — including
//      shadcn menus that portal OUTSIDE driver's spotlight cutout — so the
//      overlay keeps the spotlight's dimming but never traps pointer events, and
//      keyboard control is off (an Escape we dispatch to close a menu must not
//      also tear down the demo).
//   3. Snapshot + restore. The demo borrows the live canvas (it really types and
//      restyles the open deck); `snapshot()` captures the deck source up front
//      and `restore()` puts it back when the demo ends or is closed — so it is
//      non-destructive, handing the workspace back exactly as it was found.
//
// Production-gated and globally toggled exactly like the tour (toursAllowedHere +
// tour-prefs), so the Drawing Board's one "Guided tours" setting silences both.
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/guided-tour.css';
import '../styles/guided-demo.css';
import { toursAllowedHere } from './guided-tour.js';
import { onToursEnabledChange, toursEnabled } from './tour-prefs.js';

const SEEN_PREFIX = 'lattice-demo-seen-';
const READ_DWELL = 2600; // ms a narration beat stays before auto-advancing
const POST_ACTION_DWELL = 1000; // ms to let an action's result land before moving on
const STEP_TIMEOUT = 20000; // safety net: never strand on a step whose perform stalls (fits the ~10s typing beat)

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
// dropped so the demo never strands on empty space.
function isStepLive(step) {
	if (!step?.element) return true;
	if (typeof step.element !== 'string') return Boolean(step.element);
	return Boolean(document.querySelector(step.element));
}

/**
 * Wire a self-driving demo into the current page.
 *
 * @param {object} opts
 * @param {string} opts.key      Stable id for the localStorage "seen" flag.
 * @param {Array}  opts.steps    Demo steps: `{ element?, popover, perform? }`.
 *        `perform({ element, next, reduced })` drives a real control and calls
 *        `next()` once the action is done, returning a cleanup fn. Its presence
 *        marks an "act" step; its absence makes a narration beat.
 * @param {() => any} [opts.snapshot]  Capture mutable workspace state before the
 *        demo runs (e.g. the deck source).
 * @param {(snap: any) => void} [opts.restore]  Put that state back when the demo
 *        ends or is closed.
 * @param {(el: Element, step: object) => void} [opts.onReveal]  Bring a step's
 *        target on screen (e.g. switch the active mobile tab) before the spotlight.
 * @param {string} [opts.buttonLabel='Demo']
 * @param {string} [opts.buttonTitle]
 * @param {string|Element|null} [opts.mountTarget='.topbar-actions']  Where to put
 *        the launcher; `null` for a caller-driven demo with no button.
 * @returns {{ start: () => void, seen: () => boolean, markSeen: () => void }}
 */
export function initGuidedDemo(opts) {
	const {
		key,
		steps,
		snapshot,
		restore,
		onReveal,
		buttonLabel = 'Demo',
		buttonTitle = 'Watch an auto-demo build a deck',
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
	// Every timer the demo schedules, tracked so a close/teardown cancels them all
	// (a stray moveNext after destroy would reopen the demo on a torn-down driver).
	const timers = new Set();
	const later = (fn, ms) => {
		const id = window.setTimeout(() => {
			timers.delete(id);
			fn();
		}, ms);
		timers.add(id);
		return id;
	};
	const clearTimers = () => {
		for (const id of timers) window.clearTimeout(id);
		timers.clear();
	};
	const runCleanup = () => {
		if (activeCleanup) {
			try {
				activeCleanup();
			} catch {}
			activeCleanup = null;
		}
		document.body.classList.remove('demo-acting');
	};

	// Snapshot/restore the borrowed canvas. `snap` holds the captured state for the
	// life of one run; restore is idempotent (cleared after it fires).
	let snap = null;
	const takeSnapshot = () => {
		try {
			snap = typeof snapshot === 'function' ? snapshot() : null;
		} catch {
			snap = null;
		}
	};
	const putBack = () => {
		if (snap != null && typeof restore === 'function') {
			try {
				restore(snap);
			} catch {}
		}
		snap = null;
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
		takeSnapshot();

		const driverSteps = live.map((step, i) => {
			const isAct = typeof step.perform === 'function';
			const isLast = i === live.length - 1;
			return {
				element: step.element,
				popover: {
					...step.popover,
					// Narration beats read "Next"; an act step the demo is mid-way through
					// reads "Skip" (the escape hatch); the final card closes the demo.
					nextBtnText: isLast ? 'Done' : isAct ? 'Skip' : step.popover?.nextBtnText || 'Next',
				},
				onHighlightStarted: (el) => reveal(el, step),
				onHighlighted: (el) => {
					runCleanup();
					// Drop any timer left pending by the previous step — notably the
					// `safety` timer of an act step the user dismissed with "Skip"
					// (driver's built-in next bypasses our next()). Otherwise it would
					// fire later and force a phantom advance on this step.
					clearTimers();
					let advanced = false;
					// Advance once: dwell on the result, then move to the next step (or end).
					const advance = () => {
						if (advanced) return;
						advanced = true;
						runCleanup();
						later(() => {
							if (!activeDriver?.isActive()) return;
							if (isLast) activeDriver.destroy();
							else activeDriver.moveNext();
						}, POST_ACTION_DWELL);
					};
					if (!isAct) {
						later(advance, READ_DWELL);
						return;
					}
					document.body.classList.add('demo-acting');
					// Safety net: if a perform never calls next(), advance anyway.
					const safety = later(advance, STEP_TIMEOUT);
					const next = () => {
						window.clearTimeout(safety);
						timers.delete(safety);
						advance();
					};
					try {
						activeCleanup = step.perform({ element: el, next, reduced }) || null;
					} catch {
						activeCleanup = null;
						next();
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
			// The demo drives the controls itself; there's no "Back", and stray keys
			// (e.g. the Escape we send to close a menu) must never steer the demo.
			allowKeyboardControl: false,
			showButtons: ['next', 'close'],
			popoverClass: 'lattice-tour lattice-demo',
			progressText: '{{current}} of {{total}}',
			onPopoverRender: (popover, { state }) => {
				const idx =
					typeof state.activeIndex === 'number'
						? state.activeIndex
						: (activeDriver?.getActiveIndex() ?? 0);
				const isAct = typeof live[idx]?.perform === 'function';
				popover.wrapper.classList.toggle('is-act', isAct);
				// An "Auto" badge above the title on an act step marks the demo driving
				// (guard against a double insert on driver's resize/refresh re-render).
				if (isAct && !popover.wrapper.querySelector('.demo-badge')) {
					const chip = document.createElement('div');
					chip.className = 'demo-badge';
					chip.textContent = 'Auto';
					popover.wrapper.insertBefore(chip, popover.title);
				}
			},
			// Overriding onDestroyStarted means we own the close decision. The actual
			// teardown lives in onDestroyed, which driver runs on EVERY exit path —
			// the × / close (via here), the last step's direct destroy(), and the
			// global-toggle-off destroy() — so timers, cleanup, and restore can't be
			// skipped on the natural-finish path the way onDestroyStarted would be.
			onDestroyStarted: () => {
				activeDriver?.destroy();
			},
			onDestroyed: () => {
				clearTimers();
				runCleanup();
				markSeen();
				document.body.classList.remove('demo-running');
				putBack();
				activeDriver = null;
			},
			steps: driverSteps,
		});

		document.body.classList.add('demo-running');
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
		btn.className = 'tour-btn demo-btn';
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
