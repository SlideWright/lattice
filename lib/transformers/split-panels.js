/**
 * split-panels transformer — registry-shaped adapter around the engine
 * kernel at lib/engine/split-panels.js.
 *
 * The engine module owns the actual rewrite logic for all six split-*
 * layouts (split-list, split-brief, split-metric, split-steps,
 * split-compare, split-statement). This adapter exposes that logic in
 * the registry's transformer shape so the three render paths can
 * consume it through a single interface. See ./registry.js for the
 * shape contract.
 *
 * Consumers:
 *   - marp.config.js     — render hook calls registry.applyAllToHtml
 *                          (which dispatches to applyToHtml here)
 *   - lattice-emulator.js — per-slide parseSlide loop calls
 *                           applyToSectionInner(html, classAttr)
 *   - lattice-runtime.js  — currently keeps a hand-edited DOM mirror
 *                           inline. applyToDom below is the canonical
 *                           target a future bundler step will plug in.
 *                           A parity test asserts the runtime mirror
 *                           matches this kernel.
 */

const engine = require('../engine/split-panels');

module.exports = {
  name: 'split-panels',
  layouts: engine.SPLIT_LAYOUTS,
  selector: engine.SPLIT_LAYOUTS.map(l => `section.${l}`).join(', '),
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  // Per-section primitive: invoked once per <section>, given that
  // section's inner HTML and class attribute. Returns the rewritten
  // inner HTML. No-op when `cls` doesn't include a split-* token.
  applyToSectionInner(innerHtml, cls) {
    return engine.transformSplitSection(innerHtml, cls);
  },
  // applyToDom intentionally omitted for the pilot. lattice-runtime.js
  // keeps a hand-edited DOM mirror until the runtime is bundled; the
  // parity contract lives in test/integration/parity/.
};
