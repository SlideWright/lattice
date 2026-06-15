/**
 * Depth-aware <section> splitter — the shared HTML-string section walker.
 *
 * Splits rendered Marpit/engine HTML into ordered pieces — `gap` (text between
 * sections) and `section` ({ openTag, inner, cls }) — with a depth-aware
 * </section> scan that survives nested sections. Reassemble with
 * `openTag + inner + '</section>'`.
 *
 * Pure + fs-free, so both the Node render kernels (lib/integrations/markdown-it/plugins.js
 * progress rail) and the browser-bundled Form Tile kernels (lib/forms/tile/*)
 * can share ONE implementation instead of hand-copying the walker. Mirrors the
 * inline walks in lib/core/masthead-lift.js / below-note.js (those operate
 * section-by-section; this one returns the full ordered piece list).
 */
function splitSections(html) {
  const pieces = [];
  let i = 0;
  while (i < html.length) {
    const open = html.indexOf('<section', i);
    if (open < 0) { pieces.push({ type: 'gap', text: html.slice(i) }); break; }
    if (open > i) pieces.push({ type: 'gap', text: html.slice(i, open) });
    const tagEnd = html.indexOf('>', open);
    if (tagEnd < 0) { pieces.push({ type: 'gap', text: html.slice(open) }); break; }
    const openTag = html.slice(open, tagEnd + 1);
    const cm = openTag.match(/\sclass="([^"]*)"/);
    let depth = 1, pos = tagEnd + 1, closeEnd = -1;
    while (pos < html.length) {
      if (html.startsWith('<section', pos)) { const e = html.indexOf('>', pos); if (e < 0) break; depth++; pos = e + 1; }
      else if (html.startsWith('</section>', pos)) { depth--; if (depth === 0) { closeEnd = pos + 10; break; } pos += 10; }
      else pos++;
    }
    if (closeEnd < 0) { pieces.push({ type: 'gap', text: html.slice(open) }); break; }
    pieces.push({ type: 'section', openTag, inner: html.slice(tagEnd + 1, closeEnd - 10), cls: cm ? cm[1] : '' });
    i = closeEnd;
  }
  return pieces;
}

module.exports = { splitSections };
