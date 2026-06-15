/**
 * Form — runtime (browser) DOM injectors.
 *
 * The DOM mirror of the Form deck-level injectors in
 * lib/integrations/marp/plugins.js (the marp-cli + emulator HTML-string path).
 * These run in the marp-vscode preview / published-HTML runtime, where the
 * sections are live DOM rather than an HTML string.
 *
 * Extracted from lib/runtime/index.js so they are a SINGLE, unit-tested
 * implementation instead of an untested inline copy — closing the
 * three-paths-must-agree drift risk for meta / progress. Each is
 * pure (takes the owning `document`, mutates it, returns nothing) and
 * idempotent (guarded on the Tile's marker class), so a preview re-render
 * that re-fires them is a no-op. Mirrors the kernels'
 * applyMastheadMetaToHtml / applyProgressRailToHtml.
 *
 * The watermark Tile is the first to go fully self-contained (issue #356): it
 * owns BOTH its adapters in one kernel (lib/forms/tile/watermark), so it is NOT
 * here — the meta / progress mirrors stay until they migrate the same way.
 */

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * meta Tile — fill the reserved, empty `.masthead-bay` of every masthead-lifted
 * `form` section with the `meta:` line(s). `metaString` is the raw
 * front-matter value; ` | ` splits into stacked lines.
 */
function injectMastheadMeta(doc, metaString) {
  if (!doc || !metaString) return;
  const lines = String(metaString).split('|').map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return;
  for (const bay of doc.querySelectorAll('section.form .cell-masthead .masthead-bay')) {
    if (bay.querySelector(':scope > .tile-meta')) continue; // idempotent
    const el = doc.createElement('div');
    el.className = 'tile-meta';
    el.innerHTML = lines.map(escapeHtml).join('<br>');
    bay.appendChild(el);
  }
}

/**
 * progress Tile — derive sections from `divider` slides and inject the
 * footer-centre dot-rail into each `form` slide within a section. No-op
 * without dividers; respects `no-progress` / `silent`.
 */
function injectProgressRail(doc) {
  if (!doc) return;
  const sections = [...doc.querySelectorAll('section[data-marpit-slide]')];
  const labels = [];
  for (const s of sections) {
    if (s.classList.contains('divider')) {
      // Prefer the divider's eyebrow (short `Section 01 · …` code label) over
      // its heading, which is often a long editorial sentence.
      const eb = s.querySelector('p > code');
      const h = s.querySelector('h1, h2');
      labels.push(((eb && eb.textContent) || (h && h.textContent) || '').replace(/\s+/g, ' ').trim());
    }
  }
  const total = labels.length;
  if (total === 0) return;
  let cur = 0;
  for (const s of sections) {
    if (s.classList.contains('divider')) cur += 1;
    if (!s.classList.contains('form') || cur === 0) continue;
    if (s.classList.contains('no-progress') || s.classList.contains('silent')) continue;
    if (s.querySelector(':scope > .tile-progress')) continue; // idempotent
    const nav = doc.createElement('nav');
    nav.className = 'tile-progress';
    nav.setAttribute('aria-hidden', 'true');
    if (labels[cur - 1]) {
      const seg = doc.createElement('span');
      seg.className = 'seg';
      seg.textContent = labels[cur - 1];
      nav.appendChild(seg);
    }
    for (let k = 0; k < total; k++) {
      const dot = doc.createElement('span');
      dot.className = 'dot' + (k === cur - 1 ? ' on' : '');
      nav.appendChild(dot);
    }
    s.appendChild(nav);
    // Footer Cell yields the reserved centre zone only when a rail is present.
    s.classList.add('has-progress');
  }
}

// The watermark Tile's DOM injector moved to its self-contained kernel
// (lib/forms/tile/watermark/watermark.transform.js → applyToDom), which owns
// both adapters. See issue #356.

module.exports = { injectMastheadMeta, injectProgressRail };
