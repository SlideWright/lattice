/**
 * auto-split.js — the Fit Ladder's SPLIT move, applied at build time
 * (engineering/decisions/2026-06-22-the-fit-spine.md §3).
 *
 * A slide whose content exceeds its box overflows (it clips). Past the readable
 * per-orientation type floor the engine has no smaller size to reach for, so the
 * honest fix is MORE slides, not smaller type. This module re-emits an overflowing
 * slide as several, using the pure `partitionAxis` kernel (lib/core/collections.js).
 *
 * Two entry points, one kernel:
 *   · autoSplitDeck — the STATIC pass: split a slide whose collection count exceeds
 *     the layout's `capacity.hard`. A cheap pre-render first cut (count-based).
 *   · resplitDoc — the MEASURED pass: given the slides a real render found to
 *     OVERFLOW (and by how much — the scrollHeight/clientHeight ratio), divide each
 *     by that ratio so it fits. This is what catches DENSITY overflow — a slide with
 *     few but long items that no count threshold sees — which is the dominant cause
 *     in a tall/portrait box. The export driver runs it in a measure→split→re-measure
 *     loop until the deck fits (lattice-emulator.js).
 *
 * Build-time only. Splitting changes slide COUNT, which the engine owns at export,
 * never live — the spine rejects runtime re-pagination (§3). Knows where NOT to
 * split: axes that can't divide without destroying meaning (col/cell read-across,
 * line atomicity) return null from partitionAxis → the slide is LEFT for the ring.
 * Member-level keepTogether is honoured by construction — partitionAxis splits
 * BETWEEN collection members, never within one. Pure + fs-free (capacities and the
 * overflow measurement are passed in), so it is unit-testable in isolation.
 */

const { splitSections } = require('./split-sections');
const { countAxis, partitionAxis } = require('./collections');
const { carouselize } = require('./carousel');

const SPLITTABLE = new Set(['item', 'row']);

// The first class token carrying a capacity contract is the component the slide is
// built on (modifiers like `compact` carry none). Returns the cap (with its axis);
// each caller checks what it needs (autoSplitDeck wants `hard`, resplitDoc wants a
// splittable axis). Mirrors lint-core's capacity-rule token scan.
function capacityForClass(cls, capacityMap) {
  for (const t of String(cls || '').trim().split(/\s+/)) {
    const cap = capacityMap[t];
    if (cap?.axis || cap?.split) return cap;
  }
  return null;
}

// Re-emit a section's split `parts` as sibling sections. The continuation copies
// (2nd+) drop the engine's `id="…"` so the split never duplicates ids (the first
// keeps it; `data-lattice-slide` is the real per-slide key), and mark the repeated
// heading "(cont.)" so a split slide reads as part of the previous one. Every other
// attribute is slide-TYPE level (class, theme, paginate…) and correctly repeats.
function emitParts(openTag, parts) {
  const contTag = openTag.replace(/\s+id="[^"]*"/, '');
  return parts.map((inner, k) => {
    if (k === 0) return `${openTag}${inner}</section>`;
    const cont = inner.replace(/<\/(h[12])>/, ' <span class="lat-cont">(cont.)</span></$1>');
    return `${contTag}${cont}</section>`;
  });
}

// Stamp a small k-of-N progress rail into each section of a split set, so an auto-split
// slide reads as part of a sequence and leads into the next (the connective tissue).
// `<2` parts → no rail. The rail uses currentColor so it reads on both the accent cover
// and the body pages. Returns the joined HTML.
function withRail(sections) {
  const total = sections.length;
  if (total < 2) return sections.join('');
  return sections
    .map((sec, i) => {
      const segs = Array.from({ length: total }, (_, j) => `<span class="seg${j <= i ? ' on' : ''}"></span>`).join('');
      const rail = `<nav class="lat-split-rail" aria-hidden="true">${segs}</nav>`;
      return sec.replace(/<\/section>\s*$/, `${rail}</section>`);
    })
    .join('');
}

// STATIC pass — split a slide whose render-exact count EXCEEDS `capacity.hard`,
// into COMFORTABLE `sweet`-sized chunks (a slide packed to `hard` still crowds the
// footer; falls back soft → hard). Returns `{ html, splits }`; a non-overflowing
// deck is byte-identical (splits === 0).
function autoSplitDeck(html, capacityMap) {
  let splits = 0;
  const out = splitSections(html).map((p) => {
    if (p.type !== 'section') return p.text;
    const whole = `${p.openTag}${p.inner}</section>`;
    const cap = capacityForClass(p.cls, capacityMap);
    if (!cap || cap.hard == null || !SPLITTABLE.has(cap.axis)) return whole;
    if (countAxis(p.inner, cap.axis) <= cap.hard) return whole;
    const perSlide = cap.sweet ?? cap.soft ?? cap.hard;
    const parts = partitionAxis(p.inner, cap.axis, perSlide);
    if (!parts || parts.length <= 1) return whole; // not splittable → leave for the ring
    splits += 1;
    return withRail(emitParts(p.openTag, parts));
  });
  return { html: out.join(''), splits };
}

// MEASURED pass — given `overflow` (the slides a real render found to clip, each
// `{ slide, ratio }` where slide is the `data-lattice-slide` index and ratio is
// scrollHeight/clientHeight), divide each overflowing SPLITTABLE slide into
// `ceil(ratio)` pieces so it fits — regardless of item COUNT (this is what catches
// density overflow). Then renumber `data-lattice-slide` across the whole deck, since
// the splits shifted the indices. Returns `{ html, changed }`; changed === 0 means
// nothing here could be split (the remaining overflow is read-across / atomic / a
// single item taller than the page — for the ring, not the splitter). Operates on
// the fully-assembled export doc, so the caller can re-render and re-measure it.
function resplitDoc(docHtml, overflow, capacityMap) {
  const ratioOf = new Map(overflow.map((o) => [o.slide, o.ratio || 2]));
  let changed = 0;
  // The fully-assembled doc carries embedded <script>/<style> chrome whose comments
  // mention "<section …>" as prose — substrings that derail the depth-aware section
  // walker (it never balances a close and bails). The real slides are flat siblings
  // starting at the first data-lattice-slide; slice the head prefix off so the walker
  // only ever sees genuine slide elements. (A bare slide string → firstSlide 0 → no-op.)
  const firstSlide = docHtml.search(/<section\b[^>]*\bdata-lattice-slide=/);
  if (firstSlide < 0) return { html: docHtml, changed: 0 };
  const prefix = docHtml.slice(0, firstSlide);
  // The splits shift the running order, so renumber data-lattice-slide as we emit —
  // but ONLY within the section fragments, never the gaps (a trailing chrome
  // <script>/<style> can carry a literal `<section data-lattice-slide="N">` as prose;
  // renumbering it would corrupt the chrome). Gaps pass through byte-identical.
  let n = 0;
  const renumber = (frag) => frag.replace(/(<section\b[^>]*\bdata-lattice-slide=")\d+(")/g, (_, a, b) => `${a}${(n += 1)}${b}`);
  const body = splitSections(docHtml.slice(firstSlide))
    .map((p) => {
      if (p.type !== 'section') return p.text;
      const whole = `${p.openTag}${p.inner}</section>`;
      const sm = p.openTag.match(/data-lattice-slide="(\d+)"/);
      const slide = sm ? Number(sm[1]) : 0;
      if (!ratioOf.has(slide)) return renumber(whole);
      const cap = capacityForClass(p.cls, capacityMap);
      if (!cap) return renumber(whole);
      // Read-across with a carousel `split` recipe: re-author the slide as a sequence
      // (compare-prose's editorial cover/readings/verdict) instead of leaving it for
      // the ring. carouselize returns null if the section doesn't parse → fall through.
      if (cap.split) {
        const carousel = carouselize(p.openTag, p.inner, cap.split);
        if (carousel && carousel.length > 1) {
          changed += 1;
          return renumber(withRail(carousel));
        }
        return renumber(whole);
      }
      if (!SPLITTABLE.has(cap.axis)) return renumber(whole); // read-across / atomic → the ring
      const count = countAxis(p.inner, cap.axis);
      if (count <= 1) return renumber(whole); // a single item taller than the page — can't split
      const pieces = Math.max(2, Math.ceil(ratioOf.get(slide) - 0.02));
      const perSlide = Math.max(1, Math.ceil(count / pieces));
      if (perSlide >= count) return renumber(whole);
      const parts = partitionAxis(p.inner, cap.axis, perSlide);
      if (!parts || parts.length <= 1) return renumber(whole);
      changed += 1;
      return renumber(withRail(emitParts(p.openTag, parts)));
    })
    .join('');
  // Splitting/carouselizing inserts pages, so the page-number badge each section baked
  // at engine time (`data-lattice-pagination`) is now stale — a split set would repeat
  // the original's number on every copy. Re-paginate in document order: only sections
  // that carry the attribute (a `paginate:false` slide has none) advance the counter,
  // and the totals refresh to the new count. (`="` after `pagination` excludes the
  // `-total` attribute from the per-page renumber.)
  let html = prefix + body;
  let pg = 0;
  html = html.replace(/(\bdata-lattice-pagination=")\d+(")/g, (_, a, b) => `${a}${(pg += 1)}${b}`);
  if (pg > 0) html = html.replace(/(\bdata-lattice-pagination-total=")\d+(")/g, (_, a, b) => `${a}${pg}${b}`);
  return { html, changed };
}

module.exports = { autoSplitDeck, resplitDoc, capacityForClass };
