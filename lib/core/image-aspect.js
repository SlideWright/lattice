/**
 * Image aspect classification — the shared brain for the adaptive `image`
 * layout. An author hands us an arbitrary rectangle (phone crop, scan, portrait
 * photo, panorama); unlike every other layout, we don't control the content's
 * shape. So the treatment is RESOLVED from two axes:
 *
 *   1. the image's own aspect (this module) — measured in the browser, then
 *      bucketed here;
 *   2. the deck size in use (`data-orientation`) — stamped by the slide pipeline.
 *
 * This module is the axis-1 half: a pure `width,height → bucket` classifier
 * (no DOM, no fs — safe in Node AND the browser). CSS then resolves the
 * composition from `[data-img-bucket] × [data-orientation]`, with an explicit
 * author variant overriding. Clean (contain on a matte) is the floor: the one
 * composition that is safe for ANY rectangle, so an unbucketed or unreadable
 * image still lands somewhere boardroom-ready.
 *
 * See engineering/decisions/2026-06-19-adaptive-image.md.
 */

'use strict';

// Bucket thresholds on aspect = width / height. Boundaries chosen so a bucket
// names the shape an author would recognise, and so each maps to a composition
// that flatters it (see the resolution table in the decision doc / CSS):
//   pano   ≥ 2.00  — cinematic / panorama; wants a full-width band
//   wide   1.30..2 — landscape photo; fills a landscape canvas, tops a portrait one
//   square 0.77..1.30 — squarish; reverent frame reads at any size
//   tall   0.50..0.77 — portrait photo; wants a full-height column
//   column < 0.50   — very tall / strip; letterbox or a slim column
const BUCKETS = Object.freeze([
  { name: 'pano',   min: 2.0,  max: Infinity },
  { name: 'wide',   min: 1.3,  max: 2.0 },
  { name: 'square', min: 0.77, max: 1.3 },
  { name: 'tall',   min: 0.5,  max: 0.77 },
  { name: 'column', min: 0,    max: 0.5 },
]);

const BUCKET_NAMES = Object.freeze(BUCKETS.map((b) => b.name));

/**
 * Classify an image's pixel size into an aspect bucket.
 * @param {number} width   intrinsic width  (px)
 * @param {number} height  intrinsic height (px)
 * @returns {string|null} bucket name, or null if the size is unusable (≤0 /
 *   non-finite) — caller falls back to the Clean floor.
 */
function bucketForAspect(width, height) {
  const w = Number(width), h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const aspect = w / h;
  // `min` exclusive, `max` inclusive — except the open-topped `pano` (max
  // Infinity) and the floor `column` (min 0 inclusive of any positive ratio).
  for (const b of BUCKETS) {
    if (b.min === 0 ? aspect <= b.max : (aspect > b.min && aspect <= b.max)) return b.name;
  }
  return 'square'; // unreachable (ranges cover (0, ∞)); defensive
}

// ── Axis-2 resolution: (bucket × deck orientation) → composition ─────────────
// The principle: PUT THE IMAGE WHERE ITS ASPECT WANTS TO GO. A tall image wants
// a full-height column (→ split on a landscape deck); a wide image wants a
// full-width band (→ split-stacked on a portrait deck) or the whole canvas
// (→ statement when its aspect ≈ the canvas). A square is reverent in a frame
// (→ gallery) at any size. `split` and `statement` are themselves
// orientation-aware in CSS — the table only says WHICH composition; the
// composition decides its own axis. Clean (contain on a matte) is the floor.
const RESOLVE_LANDSCAPE = Object.freeze({ pano: 'statement', wide: 'statement', square: 'gallery', tall: 'split', column: 'split' });
const RESOLVE_PORTRAIT  = Object.freeze({ pano: 'split', wide: 'split', square: 'gallery', tall: 'statement', column: 'statement' });

const COMPOSITIONS = Object.freeze(['clean', 'split', 'statement', 'gallery', 'spotlight']);

/**
 * Resolve the composition for an image from its bucket and the deck orientation.
 * @param {string|null} bucket       from bucketForAspect (null → Clean floor)
 * @param {string} [orientation]     'portrait' selects the portrait table; any
 *                                   other value (landscape / square / undefined)
 *                                   uses the landscape table.
 * @returns {string} composition name (one of COMPOSITIONS)
 */
function resolveComposition(bucket, orientation) {
  if (!bucket) return 'clean';
  const table = orientation === 'portrait' ? RESOLVE_PORTRAIT : RESOLVE_LANDSCAPE;
  return table[bucket] || 'clean';
}

module.exports = {
  BUCKETS, BUCKET_NAMES, bucketForAspect,
  COMPOSITIONS, resolveComposition,
};

