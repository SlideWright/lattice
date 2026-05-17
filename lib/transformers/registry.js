/**
 * Shared transformer registry — the central plugin list consumed by all
 * three render paths (marp-cli, emulator, runtime).
 *
 * Before this module existed, each renderer hand-rolled its own ordered
 * dispatch list and reimplemented the per-transform logic inline. Adding a
 * new transform required editing three files in lock-step; drift between
 * them was caught only by visual diff of the gallery PDFs. The registry
 * inverts the dependency: each transformer declares itself, and the
 * renderers iterate the registry. See docs/notes/2026-05-17-shared-
 * transformer-registry.md for the migration plan.
 *
 * Transformer module shape:
 *
 *   module.exports = {
 *     name: 'split-panels',                   // unique, stable, used for ordering + logs
 *     selector: 'section.split-list, ...',    // CSS selector identifying applicable sections;
 *                                             // informational for HTML adapters, used as a fast
 *                                             // scope filter by DOM adapters
 *     applyToHtml(html, ctx?) { ... },        // string rewrite — full Marpit HTML in, rewritten
 *                                             // HTML out (marp.config.js render hook + emulator
 *                                             // full-deck path)
 *     applyToSectionInner(inner, cls, ctx?),  // optional per-section primitive — operates on the
 *                                             // inner HTML of one <section>, given its className
 *                                             // (emulator's parseSlide loop)
 *     applyToDom(root, ctx?) { ... },         // optional live-DOM walk (lattice-runtime.js);
 *                                             // until the runtime is bundled, this is the
 *                                             // canonical implementation that the runtime's
 *                                             // hand-edited mirror must match
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

const splitPanels = require('./split-panels');

const TRANSFORMERS = [
  splitPanels,
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
