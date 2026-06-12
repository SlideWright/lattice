/**
 * Islands — runtime (browser) DOM injectors.
 *
 * The DOM mirror of the islands deck-level injectors in
 * lib/integrations/marp/plugins.js (the marp-cli + emulator HTML-string path).
 * These run in the marp-vscode preview / published-HTML runtime, where the
 * sections are live DOM rather than an HTML string.
 *
 * Extracted from lib/runtime/index.js so they are a SINGLE, unit-tested
 * implementation instead of an untested inline copy — closing the
 * three-paths-must-agree drift risk for meta / progress / watermark. Each is
 * pure (takes the owning `document`, mutates it, returns nothing) and
 * idempotent (guarded on the island's marker class), so a preview re-render
 * that re-fires them is a no-op. Mirrors the kernels'
 * applyMastheadMetaToHtml / applyProgressRailToHtml / applyWatermarkToHtml.
 */

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * meta island — fill the reserved, empty `.m-bay` of every masthead-lifted
 * `islands` section with the `meta:` line(s). `metaString` is the raw
 * front-matter value; ` | ` splits into stacked lines.
 */
function injectMastheadMeta(doc, metaString) {
  if (!doc || !metaString) return;
  const lines = String(metaString).split('|').map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return;
  for (const bay of doc.querySelectorAll('section.islands .isl-masthead .m-bay')) {
    if (bay.querySelector(':scope > .isl-meta')) continue; // idempotent
    const el = doc.createElement('div');
    el.className = 'isl-meta';
    el.innerHTML = lines.map(escapeHtml).join('<br>');
    bay.appendChild(el);
  }
}

/**
 * progress island — derive sections from `divider` slides and inject the
 * footer-centre dot-rail into each `islands` slide within a section. No-op
 * without dividers; respects `no-progress` / `silent`.
 */
function injectProgressRail(doc) {
  if (!doc) return;
  const sections = [...doc.querySelectorAll('section[data-marpit-slide]')];
  const labels = [];
  for (const s of sections) {
    if (s.classList.contains('divider')) {
      const h = s.querySelector('h1, h2');
      labels.push(h ? h.textContent.replace(/\s+/g, ' ').trim() : '');
    }
  }
  const total = labels.length;
  if (total === 0) return;
  let cur = 0;
  for (const s of sections) {
    if (s.classList.contains('divider')) cur += 1;
    if (!s.classList.contains('islands') || cur === 0) continue;
    if (s.classList.contains('no-progress') || s.classList.contains('silent')) continue;
    if (s.querySelector(':scope > .isl-progress')) continue; // idempotent
    const nav = doc.createElement('nav');
    nav.className = 'isl-progress';
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
  }
}

/**
 * watermark island — section-number ghost behind every `islands watermark`
 * slide within a section. No-op without dividers.
 */
function injectWatermark(doc) {
  if (!doc) return;
  const sections = [...doc.querySelectorAll('section[data-marpit-slide]')];
  if (!sections.some((s) => s.classList.contains('divider'))) return;
  let cur = 0;
  for (const s of sections) {
    if (s.classList.contains('divider')) cur += 1;
    if (!s.classList.contains('islands') || !s.classList.contains('watermark') || cur === 0) continue;
    if (s.querySelector(':scope > .isl-watermark')) continue; // idempotent
    const wm = doc.createElement('div');
    wm.className = 'isl-watermark';
    wm.setAttribute('aria-hidden', 'true');
    wm.textContent = String(cur).padStart(2, '0');
    s.appendChild(wm);
  }
}

module.exports = { injectMastheadMeta, injectProgressRail, injectWatermark };
