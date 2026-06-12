/**
 * masthead-lift transformer — registry-shaped adapter around the kernel at
 * lib/core/masthead-lift.js (HTML-string path) plus the DOM-walk mirror for
 * the runtime bundle.
 *
 * The render paths consume this via the registry:
 *   - marp.config.js + lattice-emulator.js (via lib/engine) — applyAllToHtml → applyToHtml
 *   - lattice-runtime.js — content-transform loop → applyAllToDom → applyToDom
 *
 * Lifts the eyebrow (code-only <p>) + first <h2> into a `.isl-masthead` band
 * with a reserved `.m-bay`, on sections that opt in with `islands`. Body is
 * left as direct section children so components still compose. Idempotent —
 * guarded on the `.isl-masthead` marker. Phase 1 of the islands model
 * (engineering/decisions/2026-06-11-islands.md).
 */

const engine = require('../core/masthead-lift');

// ── DOM mirror — must match the kernel's element selection exactly ────────
function transformMastheadDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const doc = root.ownerDocument || root;
  for (const sec of root.querySelectorAll('section.islands')) {
    if (sec.querySelector(':scope > .isl-masthead')) continue;
    const h2 = sec.querySelector(':scope > h2');
    if (!h2) continue;

    // eyebrow = a leading top-level <p> whose only child is a <code>
    const eyebrow = [...sec.children].find(
      el => el.tagName === 'P' && el.childNodes.length === 1 &&
            el.firstChild && el.firstChild.tagName === 'CODE'
    );

    const band = doc.createElement('div');
    band.className = 'isl-masthead';
    const stage = doc.createElement('div');
    stage.className = 'm-stage';
    const bay = doc.createElement('div');
    bay.className = 'm-bay';

    // Insert the band where the eyebrow (or, failing that, the h2) sits, so
    // a Marp <header>/logo that precedes it keeps its position.
    const anchor = eyebrow || h2;
    sec.insertBefore(band, anchor);
    if (eyebrow) stage.appendChild(eyebrow); // moves it out of flow
    stage.appendChild(h2);
    band.appendChild(stage);
    band.appendChild(bay);
  }
}

module.exports = {
  name: 'masthead-lift',
  selector: 'section.islands',
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToDom(root) {
    transformMastheadDom(root);
  },
};
