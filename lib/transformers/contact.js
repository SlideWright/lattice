/**
 * Registry adapter for the contact QR-card transform. Kernel:
 * lib/components/connect/contact/contact.transform.js.
 *
 *   - lattice-emulator.js (via lib/engine) → applyAllToHtml → applyToHtml
 *   - lattice-runtime.js → applyAllToDom → applyToDom
 *
 * Both paths share one kernel: applyToDom rewrites the live section's innerHTML
 * with the same renderCard the HTML path uses. Idempotent on `.qr-card`.
 */

const engine = require('../components/connect/contact/contact.transform');

function transformContactDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  for (const sec of root.querySelectorAll('section.contact')) {
    if (sec.querySelector(':scope > .qr-card')) continue; // idempotent
    sec.innerHTML = engine.renderCard(sec.innerHTML);
  }
}

module.exports = {
  name: 'contact',
  selector: 'section.contact',
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToDom(root) {
    transformContactDom(root);
  },
};
