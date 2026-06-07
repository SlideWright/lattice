// Host-frame CSS for Lattice slides rendered with `inlineSVG:false`.
//
// THE SINGLE SOURCE OF TRUTH for the intrinsic slide box. Every browser host
// that renders the engine without Marp's `<svg><foreignObject>` wrapper — the
// playground (docs/src/pages/playground.astro), the landing hero
// (docs/src/pages/index.astro), and the component-page specimens (via
// docs/src/playground/live-render.js) — MUST pin the 1280×720 box itself.
//
// WHY: dist/lattice.css sets `section{container-type:size}`. Size containment
// refuses to size the box from its contents, so without an explicit
// width/height the section collapses (height→0) and every cqi/cqh the layouts
// depend on resolves against a broken box — KaTeX-heavy variants (math.matrix /
// math.compare) render tiny, then jitter as the KaTeX stylesheet streams in
// async and the fit routine re-measures a moving width. In the PDF/marp path
// the box comes from the foreignObject; in the browser the host supplies it.
// See engineering/gotchas.md "Playground math … renders tiny + jumps/rescales".
//
// These three hosts previously inlined the dimensions independently and drifted
// (the hero pinned the wrapper but not `>section`; the playground pinned
// neither) — which is exactly how that bug entered. Import from here instead of
// re-typing the dimensions, so they can't drift again. The dynamic background
// (light/dark) is intentionally NOT here: each host appends its own
// `html,body{background:…}` rule, since CSS merges multiple rules per selector.

// The intrinsic slide box. Required by EVERY `inlineSVG:false` host — this is
// the line whose absence collapses `container-type:size`.
export const SLIDE_BOX = '.marpit>section{width:1280px;height:720px}';

// Single-slide hosts (landing hero, component specimens) render ONE slide and
// scale the whole iframe ELEMENT to fit, so they also lock the viewport + the
// `.marpit` wrapper to one slide. (The `>svg` rule is legacy belt-and-braces;
// `inlineSVG:false` emits no svg.) The playground renders a multi-slide deck
// and scales each `<section>` individually, so it uses SLIDE_BOX alone.
export const SINGLE_SLIDE_FRAME =
	'html,body{margin:0;padding:0;overflow:hidden;width:1280px;height:720px}' +
	'.marpit{width:1280px;height:720px}' +
	'.marpit>svg,svg[data-marpit-svg]{display:block;width:1280px;height:720px}' +
	SLIDE_BOX;
