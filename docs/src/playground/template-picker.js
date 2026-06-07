// Playground component picker: a searchable, groupable popover over the bar's
// "Component" trigger. Brings the component reference's discovery power
// (fuzzy search + a Group-by lens) into the playground, replacing the long
// native <select> grouped only by Function.
//
// Shares the engine with the reference browser (component-browser.js): the same
// buildCatalog shape, the same groupCatalog() lenses, and the same
// substring-first / Fuse-fallback search. It reads the enriched `components`
// array + `lenses` from #pg-data (built by playground.astro).
//
// It does NOT own the source/render — selecting a component dispatches a
// `pg-template-pick` CustomEvent that the page's inline controller handles
// (insert example, populate variants, render). window.__pgPicker.setCurrent()
// lets that controller push the active component back so the highlight tracks
// a deck loaded by paste / handoff / reload.

import Fuse from 'fuse.js';
import { groupCatalog } from '../lib/families.mjs';

const LENS_KEY = 'lattice-pg-lens'; // separate from the reference's lens key
const esc = (s) =>
	String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

// Nudge an open, absolutely-positioned popover horizontally so it stays within
// the viewport — the bar flex-wraps on mobile, which can move a trigger to the
// opposite edge from where its popover is CSS-anchored (e.g. the right-anchored
// ⚙ menu when the ⚙ wraps to the left). Keeps the popover attached to its
// trigger, just shifted on-screen. Re-run on resize while open. Exported +
// exposed on window so the inline ⚙ controller can reuse it.
export function clampPopover(pop) {
	if (!pop || pop.hidden) return;
	pop.style.transform = '';
	const margin = 8;
	const rect = pop.getBoundingClientRect();
	const vw = document.documentElement.clientWidth;
	let shift = 0;
	if (rect.right > vw - margin) shift = vw - margin - rect.right; // pull left off the right edge
	if (rect.left + shift < margin) shift = margin - rect.left; // but never clip the left edge
	if (shift) pop.style.transform = `translateX(${Math.round(shift)}px)`;
}

export function initTemplatePicker() {
	const dataEl = document.getElementById('pg-data');
	const wrap = document.getElementById('pg-template-picker');
	if (!dataEl || !wrap) return;

	let data;
	try {
		data = JSON.parse(dataEl.textContent);
	} catch {
		return;
	}
	const items = Array.isArray(data.components) ? data.components : [];
	if (!items.length) return;

	const trigger = document.getElementById('pg-template-trigger');
	const pop = document.getElementById('pg-template-pop');
	const searchEl = document.getElementById('pg-template-search');
	const groupSel = document.getElementById('pg-template-groupby');
	const listEl = document.getElementById('pg-template-list');
	if (!trigger || !pop || !searchEl || !groupSel || !listEl) return;

	// Same precise-substring-first, Fuse-fallback search the reference uses, so
	// real terms return tight results and misspellings still resolve.
	const fuse = new Fuse(items, {
		keys: [
			{ name: 'name', weight: 0.6 },
			{ name: 'tags', weight: 0.25 },
			{ name: 'familyLabel', weight: 0.1 },
			{ name: 'description', weight: 0.05 },
		],
		threshold: 0.3,
		ignoreLocation: true,
		minMatchCharLength: 3,
	});
	const hay = (it) =>
		`${it.name} ${it.tags.join(' ')} ${it.familyLabel} ${it.bucket} ${it.function} ${it.substance} ${it.description}`.toLowerCase();
	function subScore(it, q) {
		const n = it.name.toLowerCase();
		if (n === q) return 0;
		if (n.startsWith(q)) return 1;
		if (n.includes(q)) return 2;
		if (it.tags.some((t) => t.toLowerCase().includes(q))) return 3;
		if (`${it.familyLabel} ${it.bucket} ${it.function} ${it.substance}`.toLowerCase().includes(q)) return 4;
		return 5;
	}
	function search(q) {
		const sub = items.filter((it) => hay(it).includes(q));
		if (sub.length) {
			return sub
				.map((it) => ({ it, s: subScore(it, q) }))
				.sort((a, b) => a.s - b.s || a.it.name.localeCompare(b.it.name))
				.map((x) => x.it);
		}
		return fuse.search(q).map((r) => r.item);
	}

	let lens = readLens();
	let query = '';
	let current = '';
	let visible = []; // flat list of names in DOM order (for keyboard nav)
	let active = -1; // index into `visible`

	function readLens() {
		try {
			const v = localStorage.getItem(LENS_KEY);
			return v || 'function';
		} catch {
			return 'function';
		}
	}
	function saveLens(v) {
		try {
			localStorage.setItem(LENS_KEY, v);
		} catch {
			/* non-fatal */
		}
	}

	function optionHtml(name) {
		const on = name === current ? ' is-current' : '';
		const sel = name === current ? 'true' : 'false';
		return (
			`<li><button type="button" class="pg-picker-option${on}" role="option" ` +
			`aria-selected="${sel}" data-pick="${esc(name)}">${esc(name)}</button></li>`
		);
	}

	function render() {
		const q = query.trim().toLowerCase();
		visible = [];
		let html = '';
		if (q.length >= 2) {
			const list = search(q);
			if (!list.length) {
				listEl.innerHTML = '<p class="pg-picker-empty">No components match.</p>';
				active = -1;
				return;
			}
			html = `<ul class="pg-picker-flat">${list.map((it) => optionHtml(it.name)).join('')}</ul>`;
			visible = list.map((it) => it.name);
		} else {
			for (const g of groupCatalog(items, lens)) {
				html +=
					`<section class="pg-picker-group"><h3 class="pg-picker-group-title">${esc(g.label)}</h3>` +
					`<ul>${g.items.map((it) => optionHtml(it.name)).join('')}</ul></section>`;
				for (const it of g.items) visible.push(it.name);
			}
		}
		listEl.innerHTML = html;
		// Default the keyboard cursor to the current component if it's shown.
		active = current ? visible.indexOf(current) : -1;
		paintActive();
	}

	function optionEls() {
		return [...listEl.querySelectorAll('.pg-picker-option')];
	}
	function paintActive() {
		const els = optionEls();
		els.forEach((el, i) => {
			el.classList.toggle('is-active', i === active);
		});
		if (active >= 0 && els[active]) els[active].scrollIntoView({ block: 'nearest' });
	}
	function moveActive(delta) {
		if (!visible.length) return;
		active = (active + delta + visible.length) % visible.length;
		paintActive();
	}

	let open = false;
	function openPop() {
		if (open) return;
		open = true;
		query = '';
		searchEl.value = '';
		render();
		pop.hidden = false;
		trigger.setAttribute('aria-expanded', 'true');
		clampPopover(pop); // keep on-screen if the trigger wrapped near an edge
		searchEl.focus();
	}
	function closePop(refocus) {
		if (!open) return;
		open = false;
		pop.hidden = true;
		pop.style.transform = '';
		trigger.setAttribute('aria-expanded', 'false');
		if (refocus) trigger.focus();
	}
	window.addEventListener('resize', () => {
		if (open) clampPopover(pop);
	});

	function pick(name) {
		if (!name) return;
		current = name;
		window.dispatchEvent(new CustomEvent('pg-template-pick', { detail: { name } }));
		closePop(true);
	}

	// ── Events ───────────────────────────────────────────────────────────────
	trigger.addEventListener('click', (e) => {
		e.stopPropagation();
		open ? closePop(false) : openPop();
	});
	trigger.addEventListener('keydown', (e) => {
		if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !open) {
			e.preventDefault();
			openPop();
		}
	});

	searchEl.addEventListener('input', () => {
		query = searchEl.value;
		render();
	});
	searchEl.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			moveActive(1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			moveActive(-1);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (active >= 0) pick(visible[active]);
			else if (visible.length) pick(visible[0]);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			closePop(true);
		}
	});

	groupSel.value = lens;
	groupSel.addEventListener('change', () => {
		lens = groupSel.value;
		saveLens(lens);
		query = '';
		searchEl.value = '';
		render();
		searchEl.focus();
	});

	// Delegated click on options (covers both the flat and grouped renders, and
	// the SSR fallback markup before this module's first render() runs).
	listEl.addEventListener('click', (e) => {
		const btn = e.target.closest('[data-pick]');
		if (btn) {
			e.preventDefault();
			pick(btn.dataset.pick);
		}
	});

	// Close on outside click / Escape anywhere.
	document.addEventListener('click', (e) => {
		if (open && !wrap.contains(e.target)) closePop(false);
	});
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && open) closePop(true);
	});

	// Bridge for the inline controller: push the active component so the trigger
	// label's highlight tracks the editor (handoff / paste / reload).
	window.__pgPicker = {
		setCurrent(name) {
			current = name || '';
			// Update highlight in place if the list is currently rendered.
			for (const el of optionEls()) {
				const on = el.dataset.pick === current;
				el.classList.toggle('is-current', on);
				el.setAttribute('aria-selected', on ? 'true' : 'false');
			}
		},
	};
	window.__pgClampPopover = clampPopover; // shared with the inline ⚙ controller
	window.dispatchEvent(new Event('pg-picker-ready'));
}
