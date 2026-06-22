/**
 * Adaptive box-families — the SINGLE source of truth for the four structural
 * families a component reflows across (engineering/decisions/2026-06-18-
 * component-adaptive-sizing.md).
 *
 * "Size" splits into two independent problems:
 *   · SCALE     — type/spacing grows with the slide. Continuous, already solved
 *                 by the cqi token system (anchored to the slide via --_sec-1cqi).
 *   · STRUCTURE — 2-col → 1-col, rail stacks, drop-the-tertiary. A *step*, so it
 *                 is bucketed into the four families below and triggered by a
 *                 box-local `@container` aspect query.
 *
 * A component queries the nearest container named `lattice` (the engine names the
 * `section` that; a split/grid Cell can name itself the same so a NESTED
 * component resolves against ITS cell, not the deck). The query is on
 * aspect-ratio because that is what distinguishes a portrait deck AND a narrow
 * nested cell from a wide slide — inline-size alone can't (a 1080-wide portrait
 * slide is wider than a 960-wide 4:3 landscape one).
 *
 * `@container` conditions CANNOT read `var()`, so the numeric boundaries must be
 * written literally in each component's CSS. This module is the canonical list;
 * `test/unit/adaptive/families.test.js` asserts every piloted component's CSS
 * only uses these exact boundaries, so they can never silently drift.
 */

// The four families, widest-aspect first. `min` is exclusive, `max` inclusive,
// matching the `(aspect-ratio > min) and (aspect-ratio <= max)` CSS form.
const FAMILIES = Object.freeze([
  { name: 'wide',   min: 1.05, max: Infinity, intent: 'horizontal — side-by-side, multi-column' },
  { name: 'square', min: 0.9,  max: 1.05,     intent: 'balanced — 2×2 grids, 2-up' },
  { name: 'tall',   min: 0.5,  max: 0.9,      intent: 'vertical-leaning — 1–2 columns, paired rows' },
  { name: 'strip',  min: 0,    max: 0.5,      intent: 'single-column stream, biggest type, shed tertiary' },
]);

const FAMILY_NAMES = Object.freeze(FAMILIES.map((f) => f.name));

// The exact boundary numbers that may legally appear in an `@container
// (aspect-ratio …)` condition. Drift guard reads this.
const BOUNDARIES = Object.freeze([0.5, 0.9, 1.05]);

/**
 * The `@container` prelude for a family, e.g.
 *   familyQuery('tall') → '@container lattice (aspect-ratio > 0.5) and (aspect-ratio <= 0.9)'
 * Authoring helper / documentation — kept in sync with the literal CSS by the test.
 */
function familyQuery(name, container = 'lattice') {
  const f = FAMILIES.find((x) => x.name === name);
  if (!f) throw new Error(`unknown family: ${name}`);
  const parts = [];
  if (f.min > 0) parts.push(`(aspect-ratio > ${f.min})`);
  if (f.max !== Infinity) parts.push(`(aspect-ratio <= ${f.max})`);
  return `@container ${container} ${parts.join(' and ') || '(aspect-ratio > 0)'}`;
}

/** Classify a width/height (or aspect) into a family name — mirrors the CSS. */
function familyFor(aspect) {
  for (const f of FAMILIES) if (aspect > f.min && aspect <= f.max) return f.name;
  return 'strip';
}

/** Map the legacy 2-value `orientation` to the families it covers (derivation). */
const ORIENTATION_TO_FAMILIES = Object.freeze({
  landscape: Object.freeze(['wide', 'square']),
  portrait: Object.freeze(['tall', 'strip']),
});

// The 3-value deck orientation (landscape · square · portrait) each family maps
// to. This is the SINGLE source both the engine's server-side stamp
// (lib/engine/css.js orientationFor) and the runtime (lib/runtime/index.js
// stampOrientation) derive from, so `data-orientation` and `data-family` can
// never disagree (they used to: orientation's square boundary was 0.95, the
// family's is 0.9 — a box at 0.9–0.95 was portrait to the components but square
// to the Frame). See 2026-06-21-reflow-as-form-capability.md §7 (M1).
const FAMILY_TO_ORIENTATION = Object.freeze({
  wide: 'landscape',
  square: 'square',
  tall: 'portrait',
  strip: 'portrait',
});

/** The deck orientation (landscape|square|portrait) a box's aspect maps to,
 *  derived from its family — the one classifier the engine + runtime share. */
function orientationFor(aspect) {
  return FAMILY_TO_ORIENTATION[familyFor(aspect)];
}

module.exports = {
  FAMILIES,
  FAMILY_NAMES,
  BOUNDARIES,
  familyQuery,
  familyFor,
  ORIENTATION_TO_FAMILIES,
  FAMILY_TO_ORIENTATION,
  orientationFor,
};
