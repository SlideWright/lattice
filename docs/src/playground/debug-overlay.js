// debug-overlay.js — the layout DEBUG overlay for the live preview. Color-codes
// every box by its LAYOUT MODE (grid / flex / flow) and draws an inside-corner
// LABEL on each structural box (the slide, every grid/flex container, and their
// cells/tiles) reading a configurable set of "levers": identity · layout · size
// (default), plus optional class / box. A debugging aid, never exported.
//
// DRIVEN BY THE DECK. The engine stamps `data-debug` on each <section> from the
// deck's `debug:` front matter (or a per-slide `<!-- _debug -->`); this agent
// reads it. A viewer's toolbar/localStorage toggle can OVERRIDE per session via
// `opts.force` ('on' | 'off' | null=follow-the-deck). The engine strips
// `data-debug` from every EXPORT, so nothing here can reach a boardroom PDF.
// See engineering/decisions/2026-07-01-debug-bounding-boxes.md.
//
// ZERO LAYOUT IMPACT. Outlines use `outline` (painted, no layout box), never
// `border`. Labels live in ONE `pointer-events:none` overlay layer appended as a
// sibling of the deck content — OUTSIDE the measured tree — so they can never
// reflow a slide or perturb the Fit Spine's height math (#20). We deliberately do
// NOT use `position:relative` + `::after` on content boxes: that re-anchors
// absolutely-positioned descendants (badges, focus rings, pagination) and CSS
// `content:` cannot read a computed width/height anyway.
//
// RENDER-MODEL AGNOSTIC. Label POSITION comes from getBoundingClientRect (post
// every transform, so it lands right whether the filmstrip scales each <section>
// or the Studio scales the whole iframe); the SIZE lever reads offsetWidth/Height
// (the layout box, transform-invariant), so it reports the real intrinsic px on
// both paths without any scale arithmetic.

export const DEBUG_STYLE_ID = 'lattice-debug-style';
export const DEBUG_OVERLAY_ID = 'lattice-debug-overlay';

// The levers. `identity size layout` is the default profile (`debug: on`); `class`
// and `box` are opt-in. Order here is the render order on the chip.
export const FACETS = ['identity', 'layout', 'size', 'class', 'box'];
const DEFAULT_FACETS = ['identity', 'layout', 'size'];
const OFF_VALUES = new Set(['off', 'false', 'no', '0']);
const ON_VALUES = new Set(['', 'on', 'true', 'yes', '1']);

// Layout-mode → outline hue. Okabe-Ito CVD-safe blue/vermillion + a neutral gray
// for ordinary flow (deliberately low-emphasis so grid/flex containers pop). Every
// hue clears WCAG AA non-text contrast (>=3:1) over BOTH preview backgrounds
// (near-black #0c0c0c and light #e7e7ea) — verified in
// test/unit/playground/debug-overlay.test.js. The mode WORD also rides on the
// label, so the encoding is never color-only (CVD redundancy, #16-06 CVD doc).
export const LAYOUT_COLORS = Object.freeze({
	grid: '#0072b2', //   grid containers — blue
	flex: '#d55e00', //   flex containers — vermillion
	flow: '#6e6e6e', //   normal block/inline flow — neutral gray
});

/**
 * Does a deck's front matter turn debug on? Reads the leading `---`…`---` block for
 * a `debug:` key with the same on/off vocabulary the engine directive uses (any
 * present, non-off value — incl. a bare `debug:` or a facet list — counts as on).
 * Lets a surface seed its toggle's effective state without a render round-trip.
 */
export function deckDebugOn(source) {
	const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(String(source || ''));
	if (!m) return false;
	const line = /^\s*debug\s*:\s*(.*)$/m.exec(m[1]);
	if (!line) return false;
	const v = line[1].trim().replace(/^['"]|['"]$/g, '').toLowerCase();
	return !OFF_VALUES.has(v);
}

/** getComputedStyle().display → one of grid | flex | flow. */
export function layoutMode(display) {
	const d = String(display || '');
	if (d === 'grid' || d === 'inline-grid') return 'grid';
	if (d === 'flex' || d === 'inline-flex') return 'flex';
	return 'flow';
}

/**
 * Resolve a section's `data-debug` value (+ a session override) to the facet set
 * to show, or null when debug is off for this box.
 *   force==='off'          → always off.
 *   force==='on'           → on; use the deck's facets if it named any, else default.
 *   force==null (follow)   → the deck's value decides (absent attr → off).
 * A `value` of null means the attribute is absent.
 */
export function resolveFacets(value, force) {
	if (force === 'off') return null;
	const has = value !== null && value !== undefined;
	const norm = has ? String(value).trim().toLowerCase() : null;
	if (force === 'on') {
		if (!has || ON_VALUES.has(norm) || OFF_VALUES.has(norm)) return DEFAULT_FACETS.slice();
		return parseFacetList(norm);
	}
	// follow the deck
	if (!has || OFF_VALUES.has(norm)) return null;
	if (ON_VALUES.has(norm)) return DEFAULT_FACETS.slice();
	return parseFacetList(norm);
}

// A space/comma list of facet tokens → the known subset (order normalized to
// FACETS). `all` expands to every facet. An empty/unknown-only list falls back to
// the default profile so a typo still shows something useful (the lint gate warns
// on unknown tokens separately).
function parseFacetList(norm) {
	if (norm === 'all') return FACETS.slice();
	const asked = new Set(norm.split(/[\s,]+/).filter(Boolean));
	const picked = FACETS.filter((f) => asked.has(f));
	return picked.length ? picked : DEFAULT_FACETS.slice();
}

/**
 * The chip text for one box: the enabled facets, joined by ' · '. Pure over a
 * plain descriptor so it is fully unit-testable without a DOM.
 *   info = { identity, mode, gap, w, h, className, padding }
 */
export function facetLabel(info, facets) {
	const parts = [];
	for (const f of facets) {
		if (f === 'identity' && info.identity) parts.push(info.identity);
		else if (f === 'layout') parts.push(info.gap ? `${info.mode} gap:${info.gap}` : info.mode);
		else if (f === 'size') parts.push(`${info.w}×${info.h}`);
		else if (f === 'class' && info.className) parts.push(`.${info.className.trim().split(/\s+/).join('.')}`);
		else if (f === 'box' && (info.padding || info.gap)) parts.push(`pad:${info.padding || 0} gap:${info.gap || 0}`);
	}
	return parts.join(' · ');
}

// The static stylesheet: outline color keyed on the `data-dbg-layout` the agent
// stamps, plus the label-chip + hover-isolate rules. Outline-only (never border),
// `outline-offset:-1px` so a child's line never bleeds past its parent.
export function debugCss() {
	const outline = (mode) =>
		`.lattice [data-dbg-layout="${mode}"]{outline:1px solid ${LAYOUT_COLORS[mode]}!important;outline-offset:-1px!important;}`;
	return [
		'/* lattice layout debug */',
		outline('grid'),
		outline('flex'),
		outline('flow'),
		// The overlay layer: a non-interactive sibling of the deck content. Fixed so
		// chips ignore the deck's own transforms/scroll containers and sit in viewport
		// space (positions are computed from getBoundingClientRect each redraw).
		`#${DEBUG_OVERLAY_ID}{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;}`,
		`#${DEBUG_OVERLAY_ID} .dbg-chip{position:absolute;transform:translateY(0);background:rgba(12,15,22,.92);color:#fff;padding:1px 5px;border-radius:0 0 4px 0;border-left:3px solid #fff;white-space:nowrap;max-width:60vw;overflow:hidden;text-overflow:ellipsis;}`,
		`#${DEBUG_OVERLAY_ID} .dbg-chip[data-dbg-layout="grid"]{border-left-color:${LAYOUT_COLORS.grid};}`,
		`#${DEBUG_OVERLAY_ID} .dbg-chip[data-dbg-layout="flex"]{border-left-color:${LAYOUT_COLORS.flex};}`,
		`#${DEBUG_OVERLAY_ID} .dbg-chip[data-dbg-layout="flow"]{border-left-color:${LAYOUT_COLORS.flow};}`,
		// Hover-isolate: when the pointer is over a labeled box, the agent adds
		// `.dbg-isolating` to the overlay and `.dbg-hot` to that box's chip. Everything
		// else dims so a dense grid stays readable. No pointer-events needed — the
		// agent hit-tests via elementFromPoint on the underlying document.
		`#${DEBUG_OVERLAY_ID}.dbg-isolating .dbg-chip{opacity:.18;}`,
		`#${DEBUG_OVERLAY_ID}.dbg-isolating .dbg-chip.dbg-hot{opacity:1;}`,
	].join('\n');
}

// Is this element worth a LABEL? The slide itself, any grid/flex CONTAINER, and a
// GRID CELL (a direct child of a grid — the tiles you size). Deliberately NOT the
// children of a flex row: those are usually leaf content (a heading, a badge, a
// line of prose), and labelling them turns a slide into a wall of chips. Everything
// is still OUTLINED by layout mode; only the structural boxes get a chip.
function isStructural(el, mode, parentMode) {
	if (el.tagName === 'SECTION') return true;
	if (mode === 'grid' || mode === 'flex') return true;
	return parentMode === 'grid';
}

// A short identity for a box: the slide number for a <section> (plus its component
// _class, if any), else the element's most specific class token, else its tag.
function identityOf(el, _win, sectionIndex) {
	if (el.tagName === 'SECTION') {
		const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
		// Skip the structural/mode classes the engine always adds; a leftover token is
		// the component the slide opted into via `_class`.
		const comp = cls.find((c) => !/^(form|dark|light|lattice)$/.test(c));
		return comp ? `slide ${sectionIndex + 1} · ${comp}` : `slide ${sectionIndex + 1}`;
	}
	const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
	return cls[0] || el.tagName.toLowerCase();
}

/**
 * Apply (or refresh) the debug overlay in `frame`'s document. Idempotent and safe
 * to call before the iframe has a document (no-op). `opts.force` is the session
 * override ('on' | 'off' | null). Returns nothing; call again to redraw.
 */
export function applyDebug(frame, opts = {}) {
	let doc;
	let win;
	try {
		doc = frame?.contentDocument;
		win = frame?.contentWindow;
	} catch {
		doc = null; // cross-origin (shouldn't happen for srcdoc) — bail quietly
	}
	if (!doc?.querySelector) return;
	const force = opts.force === undefined ? null : opts.force;

	// Tear down any prior pass first — a redraw always rebuilds from scratch, so it
	// holds no stale per-node state (survives patchSections' node swaps for free).
	teardown(doc, win);

	const sections = Array.from(doc.querySelectorAll('.lattice > section'));
	const enabled = sections
		.map((sec, i) => ({ sec, i, facets: resolveFacets(sec.getAttribute('data-debug'), force) }))
		.filter((s) => s.facets);
	if (!enabled.length) return;

	injectStyle(doc);
	const overlay = doc.createElement('div');
	overlay.id = DEBUG_OVERLAY_ID;
	(doc.body || doc.documentElement).appendChild(overlay);

	const getStyle = (el) => (win?.getComputedStyle ? win.getComputedStyle(el) : {});
	for (const { sec, i, facets } of enabled) {
		// Walk the section + descendants; stamp the layout mode (drives the outline
		// color) and label the structural boxes.
		const els = [sec, ...sec.querySelectorAll('*')];
		for (const el of els) {
			if (!el.getAttribute) continue;
			const cs = getStyle(el);
			const mode = layoutMode(cs.display);
			if (el.setAttribute) el.setAttribute('data-dbg-layout', mode);
			// The walk is in document order, so a parent is stamped before its children.
			const parentMode = el.parentElement?.getAttribute?.('data-dbg-layout') || null;
			if (!isStructural(el, mode, parentMode)) continue;
			const gap = pxInt(cs.gap || cs.gridGap || cs.columnGap);
			const info = {
				identity: identityOf(el, win, i),
				mode,
				gap,
				w: el.offsetWidth || 0,
				h: el.offsetHeight || 0,
				className: el.tagName === 'SECTION' ? '' : el.getAttribute('class') || '',
				padding: shortPadding(cs),
			};
			const text = facetLabel(info, facets);
			if (!text) continue;
			overlay.appendChild(makeChip(doc, el, mode, text, win));
		}
	}
	deoverlap(overlay);

	// Reposition on relayout (async Mermaid/KaTeX, resize) and a couple of backstop
	// timers — the same belt-and-braces the FIT agent uses. Store the observer so the
	// next applyDebug/ teardown disconnects it.
	const redraw = () => reposition(doc, win);
	if (win?.ResizeObserver) {
		const ro = new win.ResizeObserver(redraw);
		ro.observe(doc.documentElement);
		doc.__dbgRO = ro;
	}
	if (win?.addEventListener) {
		// The filmstrip scrolls its sections under the fixed overlay, so a scroll must
		// re-pin every chip to its box (getBoundingClientRect moves; the chip doesn't).
		win.addEventListener('resize', redraw);
		win.addEventListener('scroll', redraw, { passive: true });
		doc.__dbgResize = redraw;
		// Hover-isolate: hit-test the box under the pointer, light its chip, dim the rest.
		const move = (e) => isolate(doc, overlay, e);
		const leave = () => overlay.classList.remove('dbg-isolating');
		doc.addEventListener('mousemove', move);
		doc.addEventListener('mouseleave', leave);
		doc.__dbgMove = move;
		doc.__dbgLeave = leave;
	}
	if (win?.setTimeout) {
		for (const t of [80, 320, 1200]) win.setTimeout(redraw, t);
	}
}

function injectStyle(doc) {
	if (doc.getElementById(DEBUG_STYLE_ID)) return;
	const style = doc.createElement('style');
	style.id = DEBUG_STYLE_ID;
	style.textContent = debugCss();
	(doc.head || doc.documentElement).appendChild(style);
}

function makeChip(doc, el, mode, text, win) {
	const chip = doc.createElement('div');
	chip.className = 'dbg-chip';
	chip.setAttribute('data-dbg-layout', mode);
	chip.textContent = text; // trusted first-party text, set as textContent (never HTML) — #22
	placeChip(chip, el, win);
	chip.__dbgEl = el;
	return chip;
}

// Position a chip at the box's inside top-left corner, in viewport space (the
// overlay is position:fixed, so getBoundingClientRect coords map straight across).
function placeChip(chip, el, win) {
	if (!el.getBoundingClientRect) return;
	const r = el.getBoundingClientRect();
	const top = Math.max(0, r.top);
	chip.style.left = `${Math.max(0, r.left)}px`;
	chip.style.top = `${top}px`;
	// Nudge a chip that would sit above the viewport back into view.
	chip.style.visibility = r.bottom < 0 || r.top > (win?.innerHeight ? win.innerHeight : 1e9) ? 'hidden' : 'visible';
}

function reposition(doc, win) {
	const overlay = doc.getElementById(DEBUG_OVERLAY_ID);
	if (!overlay) return;
	for (const chip of Array.from(overlay.children)) {
		if (chip.__dbgEl) placeChip(chip, chip.__dbgEl, win);
	}
	deoverlap(overlay);
}

// A container and its first cell share a top-left corner, so their chips would
// stack. Cascade any collider straight down until it clears the chips already
// placed above it — so every label stays readable. O(n²) over a small n.
function deoverlap(overlay) {
	const chips = Array.from(overlay.children).filter((c) => c.style.visibility !== 'hidden');
	chips.sort((a, b) => (num(a.style.top) - num(b.style.top)) || (num(a.style.left) - num(b.style.left)));
	const placed = [];
	for (const chip of chips) {
		const left = num(chip.style.left);
		const w = chip.offsetWidth || 130;
		const h = chip.offsetHeight || 16;
		let top = num(chip.style.top);
		let guard = 0;
		while (guard++ < 60 && placed.some((p) => left < p.right && left + w > p.left && top < p.bottom && top + h > p.top)) {
			top = placed.find((p) => left < p.right && left + w > p.left && top < p.bottom && top + h > p.top).bottom + 1;
		}
		chip.style.top = `${top}px`;
		placed.push({ left, right: left + w, top, bottom: top + h });
	}
}

const num = (v) => Number.parseFloat(v) || 0;

function isolate(doc, overlay, e) {
	const chips = Array.from(overlay.children);
	const owned = new Set(chips.map((c) => c.__dbgEl));
	// Walk up from the box under the pointer to the nearest one that owns a chip.
	let node = doc.elementFromPoint ? doc.elementFromPoint(e.clientX, e.clientY) : null;
	let hotEl = null;
	while (node && node !== doc.body) {
		if (owned.has(node)) {
			hotEl = node;
			break;
		}
		node = node.parentElement;
	}
	if (!hotEl) {
		overlay.classList.remove('dbg-isolating');
		return;
	}
	overlay.classList.add('dbg-isolating');
	for (const chip of Array.from(overlay.children)) {
		chip.classList.toggle('dbg-hot', chip.__dbgEl === hotEl);
	}
}

function teardown(doc, win) {
	const style = doc.getElementById?.(DEBUG_STYLE_ID);
	if (style) style.remove();
	const overlay = doc.getElementById?.(DEBUG_OVERLAY_ID);
	if (overlay) overlay.remove();
	if (doc.__dbgRO) {
		doc.__dbgRO.disconnect();
		doc.__dbgRO = null;
	}
	if (win && doc.__dbgResize) {
		win.removeEventListener('resize', doc.__dbgResize);
		win.removeEventListener('scroll', doc.__dbgResize);
	}
	if (doc.__dbgMove) doc.removeEventListener('mousemove', doc.__dbgMove);
	if (doc.__dbgLeave) doc.removeEventListener('mouseleave', doc.__dbgLeave);
	doc.__dbgResize = doc.__dbgMove = doc.__dbgLeave = null;
	// Drop the per-element stamps so a toggled-off pass leaves the DOM pristine.
	if (doc.querySelectorAll) {
		for (const el of Array.from(doc.querySelectorAll('[data-dbg-layout]'))) el.removeAttribute('data-dbg-layout');
	}
}

const pxInt = (v) => {
	const n = Number.parseFloat(v);
	return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

function shortPadding(cs) {
	const t = pxInt(cs.paddingTop);
	const r = pxInt(cs.paddingRight);
	const b = pxInt(cs.paddingBottom);
	const l = pxInt(cs.paddingLeft);
	if (!t && !r && !b && !l) return 0;
	return t === r && r === b && b === l ? String(t) : `${t} ${r} ${b} ${l}`;
}

export default { applyDebug, debugCss, resolveFacets, facetLabel, layoutMode, FACETS, LAYOUT_COLORS };
