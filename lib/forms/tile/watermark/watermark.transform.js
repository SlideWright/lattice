/**
 * watermark Tile — kernel (single source of truth for all render paths).
 *
 * The section-number ghost behind every `form watermark` slide that falls
 * within a divider-delimited section: a large z-behind background glyph (the
 * two-digit section number). Reuses the same divider-derived section model as
 * the progress rail; no-op when the deck has no dividers (nothing to number).
 *
 * SELF-CONTAINED FORM TILE (issue #356, the self-containment reframing): unlike
 * the meta / progress injectors — which still live hand-copied in
 * lib/integrations/marp/plugins.js (the HTML-string path) AND lib/runtime/form-dom.js
 * (the DOM path) — the watermark Tile owns its logic, CSS (watermark.css) and
 * manifest in ONE folder, and exposes BOTH adapters from this single file:
 *
 *   · applyToHtml(html)  — the Marpit/engine HTML-string path (lattice CLI via
 *                          lib/engine, the docs playground, and BYO marp-cli via
 *                          marp.config.js). Depth-aware section walk via the
 *                          shared lib/core/split-sections walker.
 *   · applyToDom(doc)    — the live-DOM path (marp-vscode preview / published-HTML
 *                          runtime, lib/runtime/index.js).
 *
 * This mirrors the component kernel+adapter pattern (lib/components/<b>/<c>/<c>.transform.js)
 * so "three paths must agree" (HARD RULE 1) is a SHARED implementation, not a
 * drift risk across three hand-copied edits. Both adapters are pure and
 * idempotent (guarded on the `.tile-watermark` marker), so a preview re-render
 * that re-fires them is a no-op. See engineering/decisions/2026-06-15-form-implementation.md
 * and design/forms.md §11.
 */

const { splitSections } = require('../../../core/split-sections');

const MARKER = 'tile-watermark';

/** The two-digit section number for the glyph (01, 02, …). */
const glyph = (n) => String(n).padStart(2, '0');

/**
 * HTML-string adapter. Inject the ghost glyph into every `form watermark`
 * section within a divider-delimited section. No-op without dividers.
 * Idempotent (guarded on the marker class).
 */
function applyToHtml(html) {
  if (typeof html !== 'string') return html;
  const pieces = splitSections(html);
  const hasDivider = pieces.some((p) => p.type === 'section' && p.cls.split(/\s+/).includes('divider'));
  if (!hasDivider) return html;

  let cur = 0;
  return pieces.map((p) => {
    if (p.type === 'gap') return p.text;
    const tokens = p.cls.split(/\s+/);
    if (tokens.includes('divider')) cur += 1;
    let inner = p.inner;
    if (tokens.includes('form') && tokens.includes('watermark') && cur > 0 &&
        !inner.includes(`class="${MARKER}"`)) {
      inner += `<div class="${MARKER}" aria-hidden="true">${glyph(cur)}</div>`;
    }
    return p.openTag + inner + '</section>';
  }).join('');
}

/**
 * Live-DOM adapter. Same logic against a `document`: derive sections from
 * `divider` slides, inject the glyph into each `form watermark` slide within a
 * section. No-op without dividers. Idempotent.
 */
function applyToDom(doc) {
  if (!doc) return;
  const sections = [...doc.querySelectorAll('section[data-marpit-slide]')];
  if (!sections.some((s) => s.classList.contains('divider'))) return;
  let cur = 0;
  for (const s of sections) {
    if (s.classList.contains('divider')) cur += 1;
    if (!s.classList.contains('form') || !s.classList.contains('watermark') || cur === 0) continue;
    if (s.querySelector(`:scope > .${MARKER}`)) continue; // idempotent
    const wm = doc.createElement('div');
    wm.className = MARKER;
    wm.setAttribute('aria-hidden', 'true');
    wm.textContent = glyph(cur);
    s.appendChild(wm);
  }
}

module.exports = { applyToHtml, applyToDom };
