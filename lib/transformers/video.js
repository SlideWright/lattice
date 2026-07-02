/**
 * Registry adapter for the `video` component. Kernel:
 * lib/components/imagery/video/video.transform.js.
 *
 * Turns a `section.video`'s authored video-URL bullet into a static poster +
 * play badge + provider label + scannable QR (never an iframe). Idempotent on
 * `.video-embed`.
 */

const engine = require('../components/imagery/video/video.transform');

const SEL = 'section.video';

function transformDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  for (const sec of root.querySelectorAll(SEL)) {
    if (sec.querySelector(':scope .video-embed')) continue; // idempotent
    sec.innerHTML = engine.renderSection(sec.innerHTML, sec.className);
  }
}

module.exports = {
  name: 'video',
  selector: SEL,
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToDom(root) {
    transformDom(root);
  },
};
