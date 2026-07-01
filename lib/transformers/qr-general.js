/**
 * Registry adapter for the general `qr` variant. Kernel:
 * lib/components/connect/_qr-card/qr-general.transform.js.
 *
 * Adds a `<figure class="qr-figure">` to a `qr`-variant host (closing / divider /
 * split-panel). Must run AFTER split-panels so a split-panel section is already
 * restructured into .panel-left/.panel-right. Idempotent on `.qr-figure`.
 */

const engine = require('../components/connect/_qr-card/qr-general.transform');

const SEL = 'section.closing.qr, section.divider.qr, section.split-panel.qr';

function transformDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  for (const sec of root.querySelectorAll(SEL)) {
    if (sec.querySelector(':scope .qr-figure')) continue; // idempotent
    sec.innerHTML = engine.renderSection(sec.innerHTML, sec.className);
  }
}

module.exports = {
  name: 'qr-general',
  selector: SEL,
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToDom(root) {
    transformDom(root);
  },
};
