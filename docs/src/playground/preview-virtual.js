// preview-virtual.js — pure, DOM-free core for the Drawing Board's incremental
// live preview.
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
// Keep ONE persistent iframe. On edit, re-render the whole deck's HTML (cheap),
// split it into per-slide strings, diff against the previous render, and replace
// only the <section> nodes whose HTML changed — so the per-edit cost is
// O(changed slides), not O(deck). A full srcdoc rewrite still runs on first
// render and on palette/mode change (theme CSS + Mermaid theming bake into the
// document). Off-screen virtualization is the browser's own `content-visibility:
// auto` on the fixed-size slides (every node stays mounted; the browser skips
// off-screen layout/paint) — not a JS virtual list, so this kernel needs no
// windowing math.
//
// This module is the pure kernel of the patch path: splitting the rendered HTML
// into per-slide strings and diffing two renders. It is DOM-free and
// dependency-free so it is unit-tested directly in Node. The DOM/iframe
// controller that consumes it lives alongside the editor in
// `docs/src/pages/drawing-board.astro` (the in-iframe agent), which mirrors
// `splitSections` inline — see its header.

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
// (a structural change — insert/delete/reorder), and the new count. A plain
// string compare is the cheapest reliable signal; slide HTML is small and this
// runs once per (debounced) render, not per frame.
export function diffSections(prev, next) {
	const p = prev || [];
	const n = next || [];
	const changed = [];
	for (let i = 0; i < n.length; i++) {
		if (p[i] !== n[i]) changed.push(i);
	}
	return { changed, countChanged: p.length !== n.length, count: n.length };
}

export default { splitSections, diffSections };
