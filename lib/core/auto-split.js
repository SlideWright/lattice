/**
 * auto-split.js — the Fit Ladder's SPLIT move, applied at build time
 * (engineering/decisions/2026-06-22-the-fit-spine.md §3).
 *
 * A slide whose primary collection exceeds the layout's `capacity.hard` overflows
 * (it clips). Past the readable per-orientation type floor the engine has no
 * smaller size to reach for, so the honest fix is MORE slides, not smaller type.
 * This driver detects such slides and re-emits each as several, using the pure
 * `partitionAxis` kernel (lib/core/collections.js).
 *
 * Build-time only. Splitting changes slide COUNT, which the engine owns at export,
 * never live — the spine rejects runtime re-pagination (§3 "Move 3 is discrete and
 * build-time"). So the export driver (lattice-emulator.js) calls this on the
 * resolved HTML BEFORE slide-index re-tagging; the existing index-based numbering
 * then renumbers the copies for free (the same way `_focusSteps` multiplies slides
 * — lib/integrations/markdown-it/plugins.js).
 *
 * Knows where NOT to split: axes that can't divide without destroying meaning
 * (col/cell read-across, line atomicity) return null from partitionAxis → the
 * slide is LEFT for the honest overflow ring, never split. Member-level
 * keepTogether is honoured by construction — partitionAxis splits BETWEEN
 * collection members, never within one. Pure + fs-free (the capacity map is
 * passed in), so it is unit-testable in isolation.
 */

const { splitSections } = require('./split-sections');
const { countAxis, partitionAxis } = require('./collections');

// The first class token carrying a capacity contract is the component the slide
// is built on (modifiers like `compact` carry none). Mirrors lint-core's
// capacity-rule token scan.
function capacityForClass(cls, capacityMap) {
  for (const t of String(cls || '').trim().split(/\s+/)) {
    const cap = capacityMap[t];
    if (cap?.axis && cap.hard != null) return cap;
  }
  return null;
}

// Re-emit `html` with every OVER-CAPACITY, splittable slide partitioned into
// several of at most `capacity.hard` members. `capacityMap` is component-name →
// `{ axis, hard, … }` (from the manifests). A slide is split only when its
// render-exact count EXCEEDS `hard` AND the axis is splittable (partitionAxis
// returns >1 part); otherwise it passes through byte-identical. Returns
// `{ html, splits }` — `splits` is how many slides were multiplied (0 ⇒ the input
// is unchanged, so an export of a non-overflowing deck is byte-for-byte the same).
function autoSplitDeck(html, capacityMap) {
  let splits = 0;
  const out = splitSections(html).map((p) => {
    if (p.type !== 'section') return p.text;
    const whole = p.openTag + p.inner + '</section>';
    const cap = capacityForClass(p.cls, capacityMap);
    if (!cap) return whole;
    if (countAxis(p.inner, cap.axis) <= cap.hard) return whole;
    const parts = partitionAxis(p.inner, cap.axis, cap.hard);
    if (!parts || parts.length <= 1) return whole; // not splittable → leave for the ring
    splits += 1;
    // Strip the engine's `id="…"` from the CONTINUATION copies so the split never
    // introduces duplicate ids (the first keeps it; `data-lattice-slide`, added
    // downstream per slide, is the real per-slide key). Every other attribute is
    // slide-TYPE level (class, theme, paginate…) and correctly repeats.
    const contTag = p.openTag.replace(/\s+id="[^"]*"/, '');
    return parts.map((inner, k) => (k === 0 ? p.openTag : contTag) + inner + '</section>').join('');
  });
  return { html: out.join(''), splits };
}

module.exports = { autoSplitDeck, capacityForClass };
