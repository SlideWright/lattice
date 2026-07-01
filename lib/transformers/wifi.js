/**
 * Registry adapter for the wifi QR-card transform. Kernel:
 * lib/components/connect/wifi/wifi.transform.js.
 *
 *   - lattice-emulator.js (via lib/engine) → applyAllToHtml → applyToHtml
 *   - lattice-runtime.js → applyAllToDom → applyToDom
 *
 * Both paths share one kernel: applyToDom rewrites the live section's innerHTML
 * with the same renderCard the HTML path uses. Idempotent on `.qr-card`.
 */

const engine = require('../components/connect/wifi/wifi.transform');

function transformWifiDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  for (const sec of root.querySelectorAll('section.wifi')) {
    if (sec.querySelector(':scope > .qr-card')) continue; // idempotent
    sec.innerHTML = engine.renderCard(sec.innerHTML);
  }
}

module.exports = {
  name: 'wifi',
  selector: 'section.wifi',
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToDom(root) {
    transformWifiDom(root);
  },
};
