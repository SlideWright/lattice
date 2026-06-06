// Component browser: fuzzy search + a user-selectable "Group by" lens for the
// reference's left menu (and the catalog index grid). Inspired by the
// playground's picker — a search box and a select that re-organize the set
// without a round trip.
//
// Fuzzy search (Fuse) matches name (weighted highest), tags, and description
// ("content"). The "Group by" select switches lens — Family (default),
// Function, Substance, A–Z — reusing groupCatalog() from lib/families.mjs so
// the client produces the exact structure the page server-rendered.
//
// Progressive enhancement: the nav + index ship server-rendered in the default
// Family grouping (works with no JS); this module takes over rendering once it
// loads, so search/regroup are instant.

import Fuse from 'fuse.js';
import { groupCatalog } from '../lib/families.mjs';

const LENS_KEY = 'lattice-components-lens';
const tc = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const esc = (s) =>
	String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

export function initComponentBrowser() {
	const catEl = document.getElementById('component-catalog');
	const cfgEl = document.getElementById('browser-config');
	if (!catEl || !cfgEl) return;

	const items = JSON.parse(catEl.textContent);
	const cfg = JSON.parse(cfgEl.textContent); // { base, current }
	const base = cfg.base;
	const current = cfg.current; // active component name, or null on the index

	const url = (p) => `${base}/${p}`.replace(/([^:])\/{2,}/g, '$1/');

	// Typo-tolerant fallback only — see search() below. The primary pass is a
	// precise substring match so real terms (a name, a tag, "legal", "charts")
	// return tight, expected results; Fuse catches misspellings ("tabel",
	// "radr") when the substring pass finds nothing.
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

	// Everything a query can match against, for the substring pass.
	const hay = (it) =>
		`${it.name} ${it.tags.join(' ')} ${it.familyLabel} ${it.bucket} ${it.function} ${it.substance} ${it.description}`.toLowerCase();

	// Rank a substring hit: name beats tag beats family/bucket beats description.
	function subScore(it, q) {
		const n = it.name.toLowerCase();
		if (n === q) return 0;
		if (n.startsWith(q)) return 1;
		if (n.includes(q)) return 2;
		if (it.tags.some((t) => t.toLowerCase().includes(q))) return 3;
		if (`${it.familyLabel} ${it.bucket} ${it.function} ${it.substance}`.toLowerCase().includes(q)) return 4;
		return 5; // description only
	}

	// Precise substring first; fall back to fuzzy for misspellings.
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

	const navScroll = document.querySelector('.cnav-scroll');
	const idxResults = document.querySelector('.cindex-results');
	const searchInputs = [...document.querySelectorAll('[data-browser-search]')];
	const groupSelects = [...document.querySelectorAll('[data-browser-groupby]')];
	const countEls = [...document.querySelectorAll('[data-browser-count]')];

	let query = '';
	let lens = readLens();

	function readLens() {
		try {
			return localStorage.getItem(LENS_KEY) || 'family';
		} catch {
			return 'family';
		}
	}
	function saveLens(v) {
		try {
			localStorage.setItem(LENS_KEY, v);
		} catch {
			/* non-fatal */
		}
	}

	// Ranked flat list when searching (≥2 chars), else null → grouped view.
	function ranked() {
		const q = query.trim().toLowerCase();
		if (q.length >= 2) return search(q);
		return null;
	}

	function navItem(it) {
		const cur = it.name === current ? ' aria-current="page"' : '';
		return (
			`<li class="cnav-item"><a href="${url(`components/${it.bucket}/${it.name}/`)}"${cur}>` +
			`${esc(it.name)}</a></li>`
		);
	}

	function renderNav() {
		if (!navScroll) return;
		const list = ranked();
		let html = `<a class="cnav-home" href="${url('components/')}"${current == null ? ' aria-current="page"' : ''}>All components</a>`;
		if (list) {
			html += list.length
				? `<ul class="cnav-list">${list.map(navItem).join('')}</ul>`
				: '<p class="cnav-empty">No components match.</p>';
		} else {
			for (const g of groupCatalog(items, lens)) {
				html +=
					`<section class="cnav-bucket"><h2 class="cnav-bucket-title">${esc(g.label)}</h2>` +
					`<ul>${g.items.map(navItem).join('')}</ul></section>`;
			}
		}
		navScroll.innerHTML = html;
	}

	function card(it) {
		const pills = ['function', 'form', 'substance']
			.map((k) => `<span class="ffs-pill">${esc(tc(it[k]))}</span>`)
			.join('');
		const tags = (it.tags || []).map((t) => `<span class="ccard-tag">${esc(t)}</span>`).join('');
		return (
			`<a class="ccard" href="${url(`components/${it.bucket}/${it.name}/`)}">` +
			`<div class="ccard-top"><h3>${esc(it.name)}</h3><div class="ccard-ffs">${pills}</div></div>` +
			`<p class="ccard-desc">${esc(it.description)}</p>` +
			(tags ? `<div class="ccard-tags">${tags}</div>` : '') +
			'</a>'
		);
	}

	function renderIndex() {
		if (!idxResults) return;
		const list = ranked();
		if (list) {
			idxResults.innerHTML = list.length
				? `<div class="cindex-grid">${list.map(card).join('')}</div>`
				: '<p class="cindex-empty">No components match that search.</p>';
			return;
		}
		let html = '';
		for (const g of groupCatalog(items, lens)) {
			html +=
				`<section class="cindex-bucket"><header class="cindex-bucket-head"><h2>${esc(g.label)}</h2>` +
				`<span class="cindex-bucket-count">${g.items.length}</span></header>` +
				`<div class="cindex-grid">${g.items.map(card).join('')}</div></section>`;
		}
		idxResults.innerHTML = html;
	}

	function updateCount() {
		const list = ranked();
		for (const el of countEls) el.textContent = list ? `${list.length} of ${items.length}` : '';
	}

	function renderAll() {
		renderNav();
		renderIndex();
		updateCount();
	}

	for (const s of groupSelects) {
		s.value = lens;
		s.addEventListener('change', () => {
			lens = s.value;
			saveLens(lens);
			for (const o of groupSelects) o.value = lens;
			renderAll();
		});
	}
	for (const i of searchInputs) {
		i.addEventListener('input', () => {
			query = i.value;
			for (const o of searchInputs) if (o !== i) o.value = query;
			renderAll();
		});
	}

	renderAll();
}
