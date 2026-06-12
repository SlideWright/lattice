/**
 * compare-code transform — pair each `<p><code>label</code></p>` + `<pre>` into
 * a `.code-col`, grouped inside `.code-cols`, after the eyebrow + heading:
 *
 *   {eyebrow p>code} {h2}
 *   <div class="code-cols">
 *     <div class="code-col"><p><code>Before…</code></p><pre>…</pre></div>
 *     <div class="code-col"><p><code>After…</code></p><pre>…</pre></div>
 *   </div>
 *
 * The eyebrow is the leading `<p><code>` before the `<h2>`; each column label is
 * a `<p><code>` after it. Was bespoke to lattice-emulator.js parseSlide; migrated
 * to the shared registry so marp-cli + the runtime produce it too (they rendered
 * the flat `<p><code>`/`<pre>` sequence before).
 * See engineering/decisions/2026-06-11-emulator-on-engine-p2.md.
 *
 * Sibling implementations via lib/transformers/compare-code.js:
 *   - marp.config.js      → applyToHtml (full Marpit HTML; depth-aware section walk)
 *   - lattice-emulator.js → applyToSection (one section's inner HTML)
 *   - lattice-runtime.js  → applyToDom (live DOM)
 *
 * Idempotent: guarded on the `.code-cols` marker.
 */

function transformCompareCodeSection(innerHtml, cls) {
  if (typeof innerHtml !== 'string' || !/\bcompare-code\b/.test(cls || '')) return innerHtml;
  if (innerHtml.indexOf('class="code-cols"') !== -1) return innerHtml; // idempotent

  // Preserve a leading <header> / trailing <footer> — present on the full-section
  // (marp / engine) path, absent on parseSlide's pre-chrome body. Both work.
  const headerMatch = innerHtml.match(/^\s*<header[\s\S]*?<\/header>/);
  const footerMatch = innerHtml.match(/<footer[\s\S]*?<\/footer>\s*$/);
  const header = headerMatch ? headerMatch[0] : '';
  const footer = footerMatch ? footerMatch[0] : '';
  let body = innerHtml;
  if (header) body = body.slice(header.length);
  if (footer) body = body.slice(0, body.length - footer.length);

  // Eyebrow = a leading p>code (before the h2); heading = the first h2.
  const eyeMatch = body.match(/^\s*(<p><code>[\s\S]*?<\/code><\/p>)/);
  const h2Match = body.match(/(<h2>[\s\S]*?<\/h2>)/);
  const eyeEl = eyeMatch ? eyeMatch[1] : '';
  const h2El = h2Match ? h2Match[1] : '';
  let rest = body;
  if (eyeEl) rest = rest.replace(eyeEl, '');
  if (h2El) rest = rest.replace(h2El, '');

  // Each remaining p>code starts a column; split on its boundary.
  const parts = rest.split(/(?=<p><code>)/).filter((s) => s.trim());
  if (parts.length === 0) return innerHtml;
  const cols = parts.map((p) => `<div class="code-col">${p.trim()}</div>`).join('');
  return `${header}${eyeEl}${h2El}<div class="code-cols">${cols}</div>${footer}`;
}

// Depth-aware <section> walk (mirrors lib/core/masthead-lift.js).
function applyToRenderedHtml(html) {
  if (typeof html !== 'string' || html.indexOf('compare-code') === -1) return html;
  let out = '';
  let i = 0;
  while (i < html.length) {
    const open = html.indexOf('<section', i);
    if (open < 0) { out += html.slice(i); break; }
    out += html.slice(i, open);
    const tagEnd = html.indexOf('>', open);
    if (tagEnd < 0) { out += html.slice(open); break; }
    const openTag = html.slice(open, tagEnd + 1);
    const classMatch = openTag.match(/\sclass="([^"]*)"/);
    const cls = classMatch ? classMatch[1] : '';

    let depth = 1;
    let pos = tagEnd + 1;
    let closeEnd = -1;
    while (pos < html.length) {
      if (html.startsWith('<section', pos)) {
        const e = html.indexOf('>', pos);
        if (e < 0) break;
        depth++;
        pos = e + 1;
      } else if (html.startsWith('</section>', pos)) {
        depth--;
        if (depth === 0) { closeEnd = pos + '</section>'.length; break; }
        pos += '</section>'.length;
      } else {
        pos++;
      }
    }
    if (closeEnd < 0) { out += html.slice(open); break; }

    const inner = html.slice(tagEnd + 1, closeEnd - '</section>'.length);
    out += openTag + transformCompareCodeSection(inner, cls) + '</section>';
    i = closeEnd;
  }
  return out;
}

module.exports = { transformCompareCodeSection, applyToRenderedHtml };
