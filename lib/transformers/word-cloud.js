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
 * Consumers + class mutation: see lib/transformers/roadmap.js — same
 * shape; word-cloud also does not mutate cls.
 */

const engine = require('../components/word-cloud/word-cloud.transform');

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
};
