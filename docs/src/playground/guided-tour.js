// Shared guided-tour helper for the docs workspaces (Workbench + Drawing
// Board). Wraps driver.js (MIT, ~5 KB, zero-dep) so both pages get the same
// behaviour from one place: a "Take a tour" button in the topbar, a one-time
// auto-start on a visitor's first arrival, and palette-blind popover styling
// that reads from the same design tokens as the rest of the site.
//
// driver.js was chosen over intro.js / Shepherd.js because both of those are
// AGPL-3.0 (commercial licence otherwise) — a poison pill for an MIT repo that
// ships as @slidewright/lattice. driver.js is MIT and framework-agnostic, which
// matches this site's vanilla-JS / plain-CSS stack exactly.
//
// Per-page step decks live beside this file (workbench-tour.js,
// drawing-board-tour.js); they describe WHICH elements to spotlight, this owns
// HOW the tour runs.
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/guided-tour.css';

const SEEN_PREFIX = 'lattice-tour-seen-';

function prefersReducedMotion() {
	try {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	} catch {
		return false;
	}
}

// A step is "live" when it has no element (a centered modal card) or its
// selector resolves to an element that is actually rendered. Filtering keeps
// the tour graceful on narrow layouts where a panel may be tab-hidden, instead
// of stranding the user on a popover pinned to nothing.
function isStepLive(step) {
	if (!step?.element) return true;
	const el =
		typeof step.element === 'string'
			? document.querySelector(step.element)
			: step.element;
	if (!el) return false;
	// offsetParent is null for display:none; allow position:fixed (offsetParent
	// is also null there) by falling back to a client-rect check.
	if (el.offsetParent !== null) return true;
	const rect = el.getBoundingClientRect();
	return rect.width > 0 || rect.height > 0;
}

/**
 * Wire a guided tour into the current page.
 *
 * @param {object} opts
 * @param {string} opts.key        Stable id for the localStorage "seen" flag.
 * @param {Array}  opts.steps      driver.js step objects (element + popover).
 * @param {string} [opts.buttonLabel='Tour']
 * @param {string} [opts.buttonTitle='Take a guided tour of this page']
 * @param {boolean}[opts.autoStart=true]  Auto-run once on a first visit.
 * @param {number} [opts.autoStartDelay=550]  ms to let controllers mount first.
 * @returns {{ start: () => void }}
 */
export function initGuidedTour(opts) {
	const {
		key,
		steps,
		buttonLabel = 'Tour',
		buttonTitle = 'Take a guided tour of this page',
		autoStart = true,
		autoStartDelay = 550,
	} = opts || {};

	if (!key || !Array.isArray(steps) || steps.length === 0) return { start() {} };

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

	const start = () => {
		const live = steps.filter(isStepLive);
		if (live.length === 0) return;
		const tour = driver({
			showProgress: true,
			allowClose: true,
			animate: !prefersReducedMotion(),
			smoothScroll: !prefersReducedMotion(),
			overlayColor: 'rgba(16, 18, 22, 0.62)',
			overlayOpacity: 1,
			stagePadding: 6,
			stageRadius: 8,
			popoverClass: 'lattice-tour',
			nextBtnText: 'Next',
			prevBtnText: 'Back',
			doneBtnText: 'Done',
			progressText: '{{current}} of {{total}}',
			steps: live,
		});
		tour.drive();
	};

	// Topbar button — replay anytime. Slotted ahead of the existing actions so
	// it reads left-to-right before the palette / mode controls.
	const actions = document.querySelector('.topbar-actions');
	if (actions && !actions.querySelector('.tour-btn')) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'tour-btn';
		btn.title = buttonTitle;
		btn.setAttribute('aria-label', buttonTitle);
		btn.innerHTML = `<span class="tour-btn-glyph" aria-hidden="true">?</span><span class="tour-btn-label">${buttonLabel}</span>`;
		btn.addEventListener('click', () => {
			markSeen();
			start();
		});
		actions.insertBefore(btn, actions.firstChild);
	}

	// First-visit auto-run. Marked seen the moment it fires so a reload or an
	// early close never re-interrupts the same visitor.
	if (autoStart && !seen()) {
		window.setTimeout(() => {
			if (seen()) return;
			markSeen();
			start();
		}, autoStartDelay);
	}

	return { start };
}
