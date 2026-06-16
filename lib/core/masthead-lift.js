/**
 * Masthead-lift transform — builds the masthead Cell of the Form composition
 * model (design/forms.md; engineering/decisions/2026-06-15-form-implementation.md).
 *
 * On any section that opts in with the `form` class, lift the slide's
 * masthead — the leading code-eyebrow (kicker) + the first <h2> (title) —
 * out of content flow into a named band:
 *
 *   <div class="cell-masthead">
 *     <div class="masthead-lede"> {eyebrow} {h2} </div>
 *     <div class="masthead-bay"></div>   <!-- reserved: meta/logo/status Tiles -->
 *   </div>
 *   …the rest of the body, untouched…
 *
 * Deliberately conservative: only the eyebrow + title move. The body stays a
 * DIRECT child of <section>, so every component's `section.X > …` selectors
 * still compose (the stage Cell is the section content region, not a wrapper —
 * forms.md §4 / the ADR). (math / compare-code drive their own title grid via
 * `> h2` and are chrome-exempt in the toggle's skip set.) A Marp running
 * <header>, if present, stays at section level before the masthead band.
 *
 * Sibling implementations kept in lock-step via the shared registry:
 *   - lib/engine            → applyToRenderedHtml (HTML-string path)
 *   - lattice-emulator.js   → transformMastheadSection (per-section path)
 *   - lattice-runtime.js    → DOM walk (lib/transformers/masthead-lift.js)
 */

const OPT_IN = 'form';

function hasOptIn(cls) {
  return cls.trim().split(/\s+/).includes(OPT_IN);
}

// Capture (and remove) the first code-only paragraph — the eyebrow/kicker.
function extractEyebrowP(html) {
  let el = '';
  const out = html.replace(/<p[^>]*>\s*<code[^>]*>[\s\S]*?<\/code>\s*<\/p>/, (m) => { el = m; return ''; });
  return { el, html: out };
}

// Capture (and remove) the first <h2> — the title.
function extractH2(html) {
  let el = '';
  const out = html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/, (m) => { el = m; return ''; });
  return { el, html: out };
}

// Capture (and remove) a leading Marp running <header>, preserved before the band.
function extractHeader(html) {
  const m = html.match(/^(\s*<header[^>]*>[\s\S]*?<\/header>\s*)/);
  return m ? { matched: m[1], html: html.slice(m[0].length) } : { matched: '', html };
}

/**
 * Rewrite one section's inner HTML. No-op unless the class opts in, a title
 * is present, and the band hasn't already been built (idempotent).
 */
function transformMastheadSection(innerHtml, cls) {
  if (!hasOptIn(cls)) return innerHtml;
  if (innerHtml.includes('class="cell-masthead"')) return innerHtml;

  const { matched: header, html: r0 } = extractHeader(innerHtml);
  const { el: eyebrow, html: r1 } = extractEyebrowP(r0);
  const { el: h2, html: rest } = extractH2(r1);

  // A masthead needs a title; without one, leave the slide untouched.
  if (!h2) return innerHtml;

  const band =
    '<div class="cell-masthead">' +
      `<div class="masthead-lede">${eyebrow}${h2}</div>` +
      '<div class="masthead-bay"></div>' +
    '</div>';

  return `${header}${band}${rest}`;
}

/**
 * Walk every <section> in Marpit's rendered HTML and lift the masthead on
 * opted-in slides. Depth-aware </section> scan; non-opted sections pass
 * through unchanged. Mirrors the walker in lib/core/split-panels.js.
 */
function applyToRenderedHtml(html) {
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

    let depth = 1, pos = tagEnd + 1, closeEnd = -1;
    while (pos < html.length) {
      if (html.startsWith('<section', pos)) {
        const e = html.indexOf('>', pos);
        if (e < 0) break;
        depth++; pos = e + 1;
      } else if (html.startsWith('</section>', pos)) {
        depth--;
        if (depth === 0) { closeEnd = pos + '</section>'.length; break; }
        pos += '</section>'.length;
      } else { pos++; }
    }
    if (closeEnd < 0) { out += html.slice(open); break; }

    if (!hasOptIn(cls)) {
      out += html.slice(open, closeEnd);
      i = closeEnd;
      continue;
    }

    const inner = html.slice(tagEnd + 1, closeEnd - '</section>'.length);
    out += openTag + transformMastheadSection(inner, cls) + '</section>';
    i = closeEnd;
  }
  return out;
}

module.exports = {
  OPT_IN,
  hasOptIn,
  applyToRenderedHtml,
  transformMastheadSection,
};
