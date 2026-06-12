/**
 * Shared transformer registry — the central plugin list consumed by all
 * three render paths (marp-cli, emulator, runtime).
 *
 * Before this module existed, each renderer hand-rolled its own ordered
 * dispatch list and reimplemented the per-transform logic inline. Adding a
 * new transform required editing three files in lock-step; drift between
 * them was caught only by visual diff of the gallery PDFs. The registry
 * inverts the dependency: each transformer declares itself, and the
 * renderers iterate the registry. See engineering/decisions/2026-05-17-shared-
 * transformer-registry.md for the migration plan.
 *
 * Transformer module shape:
 *
 *   module.exports = {
 *     name: 'chart-family',                   // unique, stable, used for ordering + logs
 *     selector: 'section.progress, ...',      // CSS selector identifying applicable sections;
 *                                             // informational for HTML adapters, used as a fast
 *                                             // scope filter by DOM adapters
 *     applyToHtml(html, ctx?) { ... },        // string rewrite — full Marpit HTML in, rewritten
 *                                             // HTML out (marp.config.js render hook + the
 *                                             // emulator via lib/engine). May append marker
 *                                             // classes to a <section> tag — e.g. chart-family
 *                                             // appends 'chart-frame'.
 *     applyToDom(root, ctx?) { ... },         // optional live-DOM walk (lattice-runtime bundle)
 *   };
 *
 * Order in TRANSFORMERS is significant. Adding a transformer that
 * depends on the output of an earlier one (e.g. compare-prose lifting
 * before split-compare structuring) goes AFTER its dependency.
 *
 * Idempotence rule: every transformer MUST be safe to run twice. The
 * marp-cli path and the runtime path may both fire on the same DOM
 * during marp-vscode preview refreshes; an early-return guard
 * (checking for the layout's marker class) is the standard pattern.
 */

const splitPanels    = require('./split-panels');
const chartFamily    = require('./chart-family');
const imageScrim     = require('./image-scrim');
const imageAsset     = require('./image-asset');
const imageTextPanel = require('./image-text-panel');
const pillTag        = require('./pill-tag');
const belowNote      = require('./below-note');
const mastheadLift   = require('./masthead-lift');
const featured       = require('./featured');
const compareCode    = require('./compare-code');

// Order matters. chart-family runs first so its `chart-frame` class
// addition is visible to anything later in the chain that filters by
// section class. Subsequent transformers operate on disjoint section
// classes, so their relative order doesn't affect correctness — but
// we preserve the historical marp.config.js render-hook order to
// keep cross-renderer parity easy to reason about.
//
// image-text-panel runs after image-asset / image-scrim because it
// wraps body content and we want the asset (img) and scrim (overlay
// div) to remain section-level siblings, not inner-wrapper children.
const TRANSFORMERS = [
  chartFamily,
  splitPanels,
  // Lifts the eyebrow + title into a .isl-masthead band on `islands`-opted
  // sections. Operates on a disjoint section set (section.islands) from every
  // other transformer, so its position is immaterial to correctness; grouped
  // with the structural transforms for readability.
  mastheadLift,
  imageScrim,
  imageAsset,
  imageTextPanel,
  // Component-coupled structural transforms migrated out of parseSlide (the
  // engine + marp-cli + runtime paths rendered a plain <ul> / flat code sequence
  // before). Disjoint section classes (section.featured / section.compare-code)
  // from every other transformer, so position is immaterial to correctness.
  featured,
  compareCode,
  // Runs last: tags genuine trailing-`code` pills (code immediately before a
  // nested list) after all structural transforms have settled the li/code
  // shape. The CSS gates on `li > code.lat-pill`, so order vs the image
  // transformers is immaterial — last keeps the dependency story simple.
  pillTag,
  // Truly last: wraps a layout's trailing `<p>` (the hairline note) only
  // after every structural transform above has settled what the section's
  // final trailing element is. Whole-document walk (applyToHtml/applyToDom)
  // only. See lib/transformers/below-note.js.
  belowNote,
];

function applyAllToHtml(html, ctx = {}) {
  let out = html;
  for (const t of TRANSFORMERS) {
    if (typeof t.applyToHtml === 'function') out = t.applyToHtml(out, ctx);
  }
  return out;
}

function applyAllToDom(root, ctx = {}) {
  for (const t of TRANSFORMERS) {
    if (typeof t.applyToDom === 'function') t.applyToDom(root, ctx);
  }
}

function getByName(name) {
  return TRANSFORMERS.find(t => t.name === name);
}

module.exports = {
  TRANSFORMERS,
  applyAllToHtml,
  applyAllToDom,
  getByName,
};
