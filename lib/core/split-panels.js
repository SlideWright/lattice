/**
 * Split-* family DOM transform — HTML string rewrite for all six layouts
 * in the split-* sibling family: split-list, split-brief, split-metric,
 * split-steps, split-compare, split-statement. Each layout extracts a
 * left-panel header (varies per layout) and pairs it with right-panel
 * content; the CSS targets the .panel-left / .panel-right wrappers.
 *
 * Runs in the Marp Core engine render hook (marp.config.js) so marp-vscode
 * preview and the export pipeline see identical DOM without requiring a
 * runtime <script>.
 *
 * Why not a runtime script?
 * VS Code Marp preview filters HTML through Marp's allowlist, which excludes
 * <script> by default. Even with enableHtml set, relative-path resolution and
 * webview CSP make the script path unreliable. The engine render hook bakes
 * the transform into the rendered HTML at parse time.
 *
 * Sibling implementations:
 *   - lattice-emulator.js — post-process per-slide transform
 *   - lattice-runtime.js  — DOM fallback for web export
 */

const { parseTopLevelLis, extractFirstList } = require('../components/chart/_chart-family/chart-family');
const { liftSlotLabel } = require('./slot-label-lift');

const SPLIT_LAYOUTS = [
  'split-list', 'split-brief', 'split-metric', 'split-steps', 'split-compare', 'split-statement',
];

// Idempotent: lifts each top-level <li> of the first <ul>/<ol> in `html`
// via liftSlotLabel. Used by the right-panel rebuild paths so the engine
// works whether or not the slotLabelLift Marpit plugin has already run —
// the emulator and runtime contexts skip that plugin.
function liftFirstListItems(html) {
  const listResult = extractFirstList(html);
  if (!listResult) return html;
  const openTagEnd = html.indexOf('>', listResult.start) + 1;
  const openTag    = html.slice(listResult.start, openTagEnd);
  const closeTag   = html[listResult.start + 1] === 'o' ? '</ol>' : '</ul>';
  const items      = parseTopLevelLis(listResult.inner);
  const lifted     = items.map(item => `<li>${liftSlotLabel(item)}</li>`).join('');
  return html.slice(0, listResult.start) + openTag + lifted + closeTag + html.slice(listResult.end);
}

// ---------------------------------------------------------------------------
// Primitive extractors — each removes the first matching element from html
// and returns { matched, html }.
// ---------------------------------------------------------------------------

function extractHeader(html) {
  const m = html.match(/^(\s*<header[^>]*>[\s\S]*?<\/header>\s*)/);
  return m ? { matched: m[1], html: html.slice(m[0].length) } : { matched: '', html };
}

function extractCodeP(html) {
  let codeText = '';
  const out = html.replace(/<p[^>]*>\s*<code[^>]*>([^<]+)<\/code>\s*<\/p>/, (_m, t) => {
    codeText = t;
    return '';
  });
  return { codeText, html: out };
}

function extractH2(html) {
  let el = '';
  const out = html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/, (m) => { el = m; return ''; });
  return { el, html: out };
}

function extractFirstP(html) {
  let el = '';
  const out = html.replace(/<p[^>]*>[\s\S]*?<\/p>/, (m) => { el = m; return ''; });
  return { el, html: out };
}

function extractFirstBlockquote(html) {
  let el = '';
  const out = html.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/, (m) => { el = m; return ''; });
  return { el, html: out };
}

// ---------------------------------------------------------------------------
// Per-layout transforms
// ---------------------------------------------------------------------------

function applyBrief(inner) {
  if (inner.includes('class="brief-left"')) return inner;
  const { matched: header, html: r0 } = extractHeader(inner);
  const { codeText, html: r1 }        = extractCodeP(r0);
  const { el: h2,   html: r2 }        = extractH2(r1);
  const { el: introP, html: r3 }      = extractFirstP(r2);
  const eyebrow = codeText ? `<span class="eyebrow">${codeText}</span>` : '';
  return header +
    `<div class="brief-left">${eyebrow}${h2}${introP}</div>` +
    `<div class="brief-right">${liftFirstListItems(r3.trim())}</div>`;
}

function applyMetric(inner) {
  if (inner.includes('class="metric-left"')) return inner;
  const { matched: header, html: r0 } = extractHeader(inner);
  const { codeText, html: r1 }        = extractCodeP(r0);
  const { el: h2,   html: r2 }        = extractH2(r1);
  const { el: introP, html: r3 }      = extractFirstP(r2);
  const unitLabel = codeText ? `<span class="unit-label">${codeText}</span>` : '';
  const context   = introP
    ? `<span class="metric-context">${introP.replace(/<\/?p[^>]*>/g, '').trim()}</span>`
    : '';
  return header +
    `<div class="metric-left">${unitLabel}${h2}${context}</div>` +
    `<div class="metric-right">${liftFirstListItems(r3.trim())}</div>`;
}

function applySteps(inner) {
  if (inner.includes('class="steps-left"')) return inner;
  const { matched: header, html: r0 } = extractHeader(inner);
  const { codeText, html: r1 }        = extractCodeP(r0);
  const { el: h2,   html: r2 }        = extractH2(r1);
  const { el: introP, html: r3 }      = extractFirstP(r2);
  const phaseNum = codeText ? `<span class="phase-num">${codeText}</span>` : '';
  return header +
    `<div class="steps-left">${phaseNum}${h2}${introP}</div>` +
    `<div class="steps-right">${liftFirstListItems(r3.trim())}</div>`;
}

function applyCompare(inner) {
  if (inner.includes('class="compare-left"')) return inner;
  const { matched: header, html: r0 } = extractHeader(inner);
  const { codeText, html: r1 }        = extractCodeP(r0);
  const { el: h2,   html: r2 }        = extractH2(r1);
  const { el: introP, html: r3 }      = extractFirstP(r2);
  const { el: bq,   html: r4 }        = extractFirstBlockquote(r3);
  const frameLabel = codeText ? `<span class="frame-label">${codeText}</span>` : '';

  // Split the top-level li items from the options list into .option divs.
  // slotLabelLift has already run (Marpit plugin), so li > strong is in place.
  // liftSlotLabel is idempotent — a no-op when <strong> is already the lead.
  let optionDivs = '';
  const listResult = extractFirstList(r4);
  if (listResult) {
    const items = parseTopLevelLis(listResult.inner);
    optionDivs = items.map((item, i) => {
      const cls = i === 1 ? 'option preferred' : 'option';
      return `<div class="${cls}">${liftSlotLabel(item)}</div>`;
    }).join('');
  }

  const verdictHtml = bq ? `<div class="verdict">${bq}</div>` : '';
  return header +
    `<div class="compare-left">${frameLabel}${h2}${introP}</div>` +
    `<div class="compare-right"><div class="options">${optionDivs}</div>${verdictHtml}</div>`;
}

function applyStatement(inner) {
  if (inner.includes('class="statement-left"')) return inner;
  const { matched: header, html: r0 } = extractHeader(inner);
  const { el: bq,   html: r1 }        = extractFirstBlockquote(r0);
  const { codeText, html: r2 }        = extractCodeP(r1);
  const cite = codeText ? `<cite>${codeText}</cite>` : '';
  return header +
    `<div class="statement-left">${bq}${cite}</div>` +
    `<div class="statement-right">${liftFirstListItems(r2.trim())}</div>`;
}

/**
 * split-list (was "split-panel") — h2 + h5 + code-only-p go into the
 * dark left panel; everything after goes into the right panel. The
 * left panel includes a watermark glyph (first letter of the h2)
 * for atmospheric contrast.
 *
 * Mirrors lattice-emulator.js:~1478 to keep three-renderer parity.
 * Before this function existed, marp-cli emitted bare h2/h5/ul inside
 * the section and the .panel-left/.panel-right CSS had nothing to
 * target — the slide rendered without the two-panel split. The CSS-
 * only fallback at section.split-list:not(:has(.panel-left)) hid the
 * gap most of the time, but the watermark glyph and h5 positioning
 * required the DOM transform.
 */
function applyList(inner) {
  if (inner.includes('class="panel-left"')) return inner;
  const { matched: header, html: r0 } = extractHeader(inner);
  // h2 + h5 + code-only-p go in panel-left; rest in panel-right.
  const h2Match     = r0.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  const h5Match     = r0.match(/<h5[^>]*>[\s\S]*?<\/h5>/);
  const codePMatch  = r0.match(/<p[^>]*>\s*<code[^>]*>[^<]+<\/code>\s*<\/p>/);
  const h2          = h2Match ? h2Match[0] : '';
  const h5          = h5Match ? h5Match[0] : '';
  const codeP       = codePMatch ? codePMatch[0] : '';
  // Watermark: first character of h2 inner text, atmospheric glyph in the panel.
  const h2Text      = h2Match ? h2Match[1].replace(/<[^>]+>/g, '').trim() : '';
  const watermarkLetter = h2Text ? h2Text[0] : 'S';
  let rest = r0;
  if (h2)    rest = rest.replace(h2,    '');
  if (h5)    rest = rest.replace(h5,    '');
  if (codeP) rest = rest.replace(codeP, '');
  rest = rest.trim();
  return header +
    `<div class="panel-left">` +
      `<div class="watermark">${watermarkLetter}</div>` +
      codeP + h5 + h2 +
    `</div>` +
    `<div class="panel-right">${rest}</div>`;
}

// ---------------------------------------------------------------------------
// Section dispatcher
// ---------------------------------------------------------------------------

function transformSplitSection(innerHtml, cls) {
  const tokens = cls.trim().split(/\s+/);
  const layout = SPLIT_LAYOUTS.find(l => tokens.includes(l));
  if (!layout) return innerHtml;
  switch (layout) {
    case 'split-list':      return applyList(innerHtml);
    case 'split-brief':     return applyBrief(innerHtml);
    case 'split-metric':    return applyMetric(innerHtml);
    case 'split-steps':     return applySteps(innerHtml);
    case 'split-compare':   return applyCompare(innerHtml);
    case 'split-statement': return applyStatement(innerHtml);
    default:                return innerHtml;
  }
}

/**
 * Walk every `<section>` in Marpit's rendered HTML output and rewrite
 * split-* family slides in place. Non-split sections pass through unchanged.
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
    const openTag   = html.slice(open, tagEnd + 1);
    const classMatch = openTag.match(/\sclass="([^"]*)"/);
    const cls        = classMatch ? classMatch[1] : '';
    const isSplit    = SPLIT_LAYOUTS.some(l => cls.trim().split(/\s+/).includes(l));

    // Depth-aware </section> scan.
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

    if (!isSplit) {
      out += html.slice(open, closeEnd);
      i = closeEnd;
      continue;
    }

    const inner    = html.slice(tagEnd + 1, closeEnd - '</section>'.length);
    const newInner = transformSplitSection(inner, cls);
    out += openTag + newInner + '</section>';
    i = closeEnd;
  }
  return out;
}

module.exports = {
  SPLIT_LAYOUTS,
  applyToRenderedHtml,
  // Exposed for unit tests
  transformSplitSection,
  applyBrief,
  applyMetric,
  applySteps,
  applyCompare,
  applyStatement,
};
