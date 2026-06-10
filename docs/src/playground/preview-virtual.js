// preview-virtual.js — pure, DOM-free core for the Drawing Board's virtualized,
// incremental live preview.
//
// WHY THIS EXISTS
// The preview re-rendered the WHOLE deck into the iframe on every edit:
// `frame.srcdoc = <all N slides>`, which makes the browser re-parse the doc,
// re-run the runtime DOM transforms over every <section>, FIT-scale them, and
// lay out N fixed 1280x720 slides — O(N) per keystroke, seconds on a big deck.
// (The markdown->HTML render itself is cheap: marp-core does 800 slides in
// ~285ms; the cost is the browser-side mount/layout of every slide.)
//
// THE MODEL
// Slides are fixed-size, so the filmstrip geometry is fully deterministic. We
// keep ONE persistent iframe and:
//   1. mount only the slides in (or near) the viewport — a virtual list — so
//      layout/transform cost is O(viewport), independent of deck length;
//   2. on edit, re-render the whole deck's HTML (cheap), diff it against the
//      previous render, and patch only the slides whose HTML changed and are
//      currently mounted.
//
// This module is the pure kernel of that: splitting the rendered HTML into
// per-slide strings, diffing two renders, and the windowing math (which indices
// to mount + the spacer heights that preserve scroll geometry). It is DOM-free
// and dependency-free so it is unit-tested directly in Node. The DOM/iframe
// controller that consumes it lives alongside the editor in
// `docs/src/pages/drawing-board.astro` (the in-iframe agent) — see its header.

// Split marp's rendered HTML into one HTML string per slide.
//
// The Drawing Board renders with `inlineSVG:false`, so each slide is a flat,
// non-nested `<section …>…</section>` (no SVG/foreignObject wrapper); marp may
// append a wrapper <div>/<script> after the last slide, which we ignore. Pairing
// each `<section>` with the next `</section>` is correct for this flat output
// (user content is escaped, so no stray section tags appear inside a slide).
export function splitSections(html) {
	const out = [];
	if (!html) return out;
	const open = /<section\b[^>]*>/gi;
	const CLOSE = '</section>';
	let m;
	while ((m = open.exec(html))) {
		const close = html.indexOf(CLOSE, m.index);
		if (close === -1) break;
		out.push(html.slice(m.index, close + CLOSE.length));
		open.lastIndex = close + CLOSE.length;
	}
	return out;
}

// Diff two arrays of per-slide HTML. Returns the indices (into `next`) whose HTML
// differs from `prev` at the same position, whether the slide COUNT changed
// (a structural change — insert/delete/reorder needs spacers recomputed), and
// the new count. A plain string compare is the cheapest reliable signal; slide
// HTML is small and this runs once per (debounced) render, not per frame.
export function diffSections(prev, next) {
	const p = prev || [];
	const n = next || [];
	const changed = [];
	for (let i = 0; i < n.length; i++) {
		if (p[i] !== n[i]) changed.push(i);
	}
	return { changed, countChanged: p.length !== n.length, count: n.length };
}

// Which slide indices to mount, given scroll geometry. `slotH` is the full height
// of one slide slot in the filmstrip (the FIT-scaled slide height + the row gap),
// in px. `buffer` pre-mounts a few slots above and below the viewport so a fast
// scroll doesn't flash blank. Returns a half-open range [start, end).
export function windowRange(scrollTop, viewportH, slotH, count, buffer = 2) {
	if (!(count > 0) || !(slotH > 0)) return { start: 0, end: 0 };
	const top = Math.max(0, scrollTop);
	let start = Math.floor(top / slotH) - buffer;
	let end = Math.ceil((top + Math.max(0, viewportH)) / slotH) + buffer;
	if (start < 0) start = 0;
	if (end > count) end = count;
	if (end < start) end = start;
	return { start, end };
}

// Spacer heights (px) that hold the full scroll height while only [start, end)
// is mounted: `top` stands in for the slots above the window, `bottom` for those
// below. Keeping the scrollbar honest means scroll position is stable as the
// window slides.
export function spacers(start, end, count, slotH) {
	const s = Math.max(0, Math.min(start, count));
	const e = Math.max(s, Math.min(end, count));
	const h = slotH > 0 ? slotH : 0;
	return { top: s * h, bottom: (count - e) * h };
}

// True when the mount window must change — i.e. the newly computed range differs
// from what is currently mounted. Lets the controller skip work on scrolls that
// stay within the already-mounted buffer.
export function rangeChanged(a, b) {
	return !a || !b || a.start !== b.start || a.end !== b.end;
}

export default { splitSections, diffSections, windowRange, spacers, rangeChanged };
