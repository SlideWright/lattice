/**
 * Accessibility (CVD) categorical TEXTURE patterns — the M1 mechanism from
 * engineering/decisions/2026-06-16-cvd-redundant-encoding.md.
 *
 * Colour alone distinguishes only ~1-2 categories under dichromacy, so the
 * categorical cycle needs a non-colour channel: a distinct repeating texture
 * per slot. CSS cannot synthesise SVG pattern geometry, so this module emits a
 * shared `<defs>` of 12 `<pattern>`s that inline Mermaid/chart SVGs reference
 * via `fill: url(#latt-a11y-tex-N)` (wired in lib/_accessibility.css, scoped to
 * [data-a11y]).
 *
 * Each pattern paints the slot's colour (`var(--cat-N-fill)`, resolved at
 * :root — correct for the deck-wide light/dark scheme) THEN overlays a distinct
 * geometry in the paired ink at low opacity, so the texture reads without
 * burying label text and colour stays as a redundant channel. The defs are
 * injected once per page; this is the shared kernel both render paths call
 * (HARD RULE #1) — the owned engine wires it today, the runtime follows.
 *
 * Pure: no fs, no deps — bundles for the browser.
 */

// 12 distinct, low-density geometries (8×8 userSpace tile). Each entry declares
// whether its shapes are stroked (lines/outlines) or filled (solid dots/blocks)
// so the ink attributes are applied cleanly — the shape strings carry NO
// fill/stroke of their own. Order is chosen so ADJACENT slots differ maximally
// in orientation/shape, not just by one step.
const GEOMETRIES = [
  { mode: 'stroke', svg: '<path d="M0 8 L8 0"/>' },                                  // 1 diagonal /
  { mode: 'stroke', svg: '<path d="M0 0 L8 8"/>' },                                  // 2 diagonal \
  { mode: 'stroke', svg: '<path d="M0 4 H8"/>' },                                    // 3 horizontal
  { mode: 'stroke', svg: '<path d="M4 0 V8"/>' },                                    // 4 vertical
  { mode: 'fill',   svg: '<circle cx="4" cy="4" r="1.4"/>' },                        // 5 dots
  { mode: 'stroke', svg: '<path d="M0 8 L8 0 M0 0 L8 8"/>' },                        // 6 cross-hatch
  { mode: 'stroke', svg: '<path d="M0 4 H8 M4 0 V8"/>' },                            // 7 grid
  { mode: 'stroke', svg: '<path d="M0 2 H8 M0 6 H8" stroke-dasharray="2 2"/>' },     // 8 dashed rows
  { mode: 'stroke', svg: '<path d="M0 1 L4 7 L8 1"/>' },                             // 9 chevron
  { mode: 'stroke', svg: '<circle cx="4" cy="4" r="2.2"/>' },                        // 10 rings (outline)
  { mode: 'stroke', svg: '<path d="M2 0 V8 M6 0 V8" stroke-dasharray="2 2"/>' },     // 11 dashed cols
  { mode: 'fill',   svg: '<rect x="0" y="0" width="4" height="4"/><rect x="4" y="4" width="4" height="4"/>' }, // 12 checker
];

/**
 * The shared `<defs>` markup — TWO colour+texture pattern sets:
 *   - `latt-a11y-tex-1..12`      paint `--cat-N-fill` (the diagram/mermaid cycle)
 *   - `latt-a11y-chart-tex-1..8` paint `--chart-cat-N-fill` (the native chart
 *     family: pie, funnel, radar, …) with the chart's own paired `--chart-cat-N-ink`
 * Two sets because the two surfaces draw from different token ramps; a single
 * set would recolour one of them and mismatch its legend. Each pattern paints
 * the slot's own fill THEN overlays its geometry in the paired ink at low
 * opacity, so colour stays a redundant channel and labels stay legible.
 */
function patternSet(prefix, count, fillVar, inkVar) {
  return GEOMETRIES.slice(0, count).map(({ mode, svg }, i) => {
    const n = i + 1;
    const ink = mode === 'fill'
      ? `fill="var(${inkVar(n)})" fill-opacity="0.40"`
      : `fill="none" stroke="var(${inkVar(n)})" stroke-opacity="0.45" stroke-width="1" stroke-linecap="square"`;
    // Wrap the geometry in a <g> carrying the ink — no per-shape attribute
    // surgery, so no duplicate fill/stroke can sneak in.
    return (
      `<pattern id="${prefix}-${n}" patternUnits="userSpaceOnUse" width="8" height="8">` +
      `<rect width="8" height="8" fill="var(${fillVar(n)})"/>` +
      `<g ${ink}>${svg}</g>` +
      `</pattern>`
    );
  }).join('');
}

function texturePatternDefs() {
  const cat = patternSet('latt-a11y-tex', 12, n => `--cat-${n}-fill`, () => '--cat-on-fill');
  // Native charts compute --chart-cat-N-fill at section scope (unreachable from
  // this page-level <defs>), but the hue token --chart-catN is :root-level (the
  // a11y theme sets it), so paint that. White-ish ink reads on the deeper greys.
  const chart = patternSet('latt-a11y-chart-tex', 8, n => `--chart-cat${n}`, () => '--cat-on-mark');
  return `<svg width="0" height="0" aria-hidden="true" style="position:absolute" class="latt-a11y-defs"><defs>${cat}${chart}</defs></svg>`;
}

module.exports = { texturePatternDefs, GEOMETRIES };
