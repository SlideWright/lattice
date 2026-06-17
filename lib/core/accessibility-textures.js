/**
 * Accessibility (CVD) categorical TEXTURE patterns — the M1 mechanism from
 * engineering/decisions/2026-06-16-cvd-redundant-encoding.md.
 *
 * Colour alone distinguishes only ~1-2 categories under dichromacy, so the
 * categorical cycle needs a non-colour channel: a distinct repeating texture
 * per slot. CSS cannot synthesise SVG pattern geometry, so this module emits a
 * shared `<defs>` of 12 `<pattern>`s that inline Mermaid/chart SVGs reference
 * via `fill: url(#latt-a11y-tex-N)`. The fill wiring lives in the a11y themes
 * (themes/a11y-base.css); these defs are emitted on every render (inert unless
 * an a11y-* theme references them), so picking `theme: a11y-*` just works.
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

// Fixed greyscale ramps, LITERAL hex (no var, no CSS). MUST mirror the a11y
// theme's ramps in themes/a11y-base.css (--cat-N-fill / --chart-catN). They live
// here as literals on purpose — see texturePatternDefs() for why.
const CAT_FILLS = [
  '#e8e8e8', '#dedede', '#d5d5d5', '#cccccc', '#c3c3c3', '#bababa',
  '#b1b1b1', '#a8a8a8', '#a0a0a0', '#979797', '#8e8e8e', '#868686',
];
const CHART_FILLS = ['#2e2e2e', '#3b3b3b', '#484848', '#565656', '#656565', '#737373', '#838383', '#929292'];
const CAT_INK = '#1a1a1a';   // dark overlay ink — reads on the light categorical fills
const CHART_INK = '#f5f5f5'; // light overlay ink — reads on the deeper chart greys

/**
 * The shared `<defs>` markup — TWO texture pattern sets:
 *   - `latt-a11y-tex-1..12`      the diagram/mermaid categorical cycle (light greys)
 *   - `latt-a11y-chart-tex-1..8` the native chart family (pie, funnel, …; deep greys)
 * Each pattern paints its slot's fill THEN overlays its geometry in a contrasting
 * ink at low opacity, so the texture reads without burying labels.
 *
 * The fills + ink are LITERAL HEX in presentation attributes — NOT `var(--token)`,
 * NOT a CSS `<style>`. The defs are injected once at PAGE level, outside any
 * `<section>`; resolving a token there proved fragile on real iOS Safari (the
 * `:root`→`:where(section)` relocation put the tokens out of reach, and `var()`
 * in a presentation attribute isn't honoured on older WebKit) — both rendered the
 * pie ALL BLACK (SVG's default fill) on devices we couldn't emulate here. Literal
 * hex has zero resolution dependency: it paints on every SVG renderer ever
 * shipped. The values mirror the a11y ramps in themes/a11y-base.css (the defs are
 * only ever referenced by the a11y-* themes, so fixed values are correct).
 */
function patternSet(prefix, fills, ink) {
  return GEOMETRIES.slice(0, fills.length).map(({ mode, svg }, i) => {
    const n = i + 1;
    const inkAttr = mode === 'fill'
      ? `fill="${ink}" fill-opacity="0.40"`
      : `fill="none" stroke="${ink}" stroke-opacity="0.45" stroke-width="1" stroke-linecap="square"`;
    return (
      `<pattern id="${prefix}-${n}" patternUnits="userSpaceOnUse" width="8" height="8">` +
      `<rect width="8" height="8" fill="${fills[i]}"/>` +
      `<g ${inkAttr}>${svg}</g>` +
      `</pattern>`
    );
  }).join('');
}

function texturePatternDefs() {
  const cat = patternSet('latt-a11y-tex', CAT_FILLS, CAT_INK);
  const chart = patternSet('latt-a11y-chart-tex', CHART_FILLS, CHART_INK);
  return `<svg width="0" height="0" aria-hidden="true" style="position:absolute" class="latt-a11y-defs"><defs>${cat}${chart}</defs></svg>`;
}

module.exports = { texturePatternDefs };
