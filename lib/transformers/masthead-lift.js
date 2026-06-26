/**
 * masthead-lift transformer — registry-shaped adapter around the masthead Cell
 * kernel at lib/forms/cell/masthead/masthead.transform.js (HTML-string path)
 * plus the DOM-walk mirror for the runtime bundle. The kernel is co-located with
 * the Cell's manifest + CSS (issue #356), exactly as compare-code bridges
 * its co-located component kernel into the registry here.
 *
 * The render paths consume this via the registry:
 *   - lattice-emulator.js (via lib/engine) — applyAllToHtml → applyToHtml
 *   - lattice-runtime.js — content-transform loop → applyAllToDom → applyToDom
 *
 * Lifts the eyebrow (code-only <p>) + first <h2> into a `.cell-masthead` band
 * with a reserved `.masthead-bay`, on sections that opt in with `form`. Body is
 * left as direct section children so components still compose. Idempotent —
 * guarded on the `.cell-masthead` marker. The masthead Cell of the Form model
 * (design/forms.md; engineering/decisions/2026-06-15-form-implementation.md).
 */

const engine = require('../forms/cell/masthead/masthead.transform');

// ── DOM mirror — must match the kernel's element selection exactly ────────
function transformMastheadDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const doc = root.ownerDocument || root;
  for (const sec of root.querySelectorAll('section.form')) {
    if (sec.querySelector(':scope > .cell-masthead')) continue;
    if (sec.querySelector(':scope > .cell-stage')) continue; // idempotent
    const h2 = sec.querySelector(':scope > h2');
    const wrap = engine.wrapsStageBody(sec.className);
    // Nothing to do for a non-generic, title-less slide (e.g. a bare chart).
    if (!h2 && !wrap) continue;

    let band = null;
    if (h2) {
      // eyebrow = a leading top-level <p> whose only child is a <code>
      const eyebrow = [...sec.children].find(
        el => el.tagName === 'P' && el.childNodes.length === 1 &&
              el.firstChild && el.firstChild.tagName === 'CODE'
      );
      band = doc.createElement('div');
      band.className = 'cell-masthead';
      const stage = doc.createElement('div');
      stage.className = 'masthead-lede';
      const bay = doc.createElement('div');
      bay.className = 'masthead-bay';
      // Insert the band where the eyebrow (or, failing that, the h2) sits, so
      // a Marp <header>/logo that precedes it keeps its position.
      const anchor = eyebrow || h2;
      sec.insertBefore(band, anchor);
      if (eyebrow) stage.appendChild(eyebrow); // moves it out of flow
      stage.appendChild(h2);
      band.appendChild(stage);
      band.appendChild(bay);
    }

    // Generic-prose: wrap the remaining flow body into a bounded `.cell-stage`
    // cell — the frame's third cell — with OR without a masthead band (mirror of
    // the kernel; flex cell-tree §6). A trailing Marp <footer> stays out of the
    // cell (footer band, not the clipped stage).
    if (wrap) {
      const cell = doc.createElement('div');
      cell.className = 'cell-stage';
      // Start after the band if present, else from the first child.
      let trailingFooter = null;
      let node = band ? band.nextSibling : sec.firstChild;
      while (node) {
        const next = node.nextSibling;
        if (node.tagName === 'FOOTER' && !next) { trailingFooter = node; break; }
        cell.appendChild(node); // moves node out of the section into the cell
        node = next;
      }
      sec.appendChild(cell);
      if (trailingFooter) sec.appendChild(trailingFooter); // keep footer last
    }
  }
}

module.exports = {
  name: 'masthead-lift',
  selector: 'section.form',
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToDom(root) {
    transformMastheadDom(root);
  },
};
