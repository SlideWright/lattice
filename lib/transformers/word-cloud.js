/**
 * word-cloud transformer — registry-shaped adapter around the engine
 * kernel at lib/components/word-cloud/word-cloud.transform.js.
 *
 * The engine module rewrites the first <ul> into a .word-cloud-canvas
 * with weighted <span class="wc-word"> children. One source contract
 * feeds the default + four modifier variants (default, dark, compact,
 * accent, focal) — all visual variance is CSS, the transform output
 * is identical across variants.
 *
 * Consumers: see lib/transformers/roadmap.js for the canonical list
 * (marp.config.js render hook, lattice-emulator parseSlide loop,
 * lib/runtime/index.js content-transform loop).
 *
 * Class mutation: transformWordCloudSection does NOT mutate cls.
 *
 * DOM-walk strategy: delegates to engine.transformWordCloudSection
 * rather than maintaining a parallel DOM spiral-packer + emitter. The
 * kernel operates on a section's inner HTML; replacing section.innerHTML
 * with the result gives the same DOM the marp-cli render hook produces.
 * Idempotence is provided by the kernel. See lib/transformers/journey.js
 * for the trade-off discussion.
 */

const engine = require('../components/chart/word-cloud/word-cloud.transform');

module.exports = {
  name: 'word-cloud',
  layouts: ['word-cloud'],
  selector: 'section.word-cloud',
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToSection(innerHtml, cls) {
    return { html: engine.transformWordCloudSection(innerHtml, cls), cls };
  },
  applyToDom(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    for (const section of root.querySelectorAll('section.word-cloud')) {
      const rewritten = engine.transformWordCloudSection(section.innerHTML, section.className);
      if (rewritten !== section.innerHTML) section.innerHTML = rewritten;
    }
  },
};
