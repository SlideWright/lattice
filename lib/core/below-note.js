/**
 * Universal below-note — wrap a layout's trailing `<p>` (the editorial
 * hairline note that follows a structural block) in `.below-note` so it
 * renders with the full-width hairline treatment.
 *
 * Structural primitive: a layout opts IN simply by not being on the
 * exclusion list. It is coupled to no single component, so it lives in
 * lib/core (per engineering/architecture.md § "Where transforms live").
 *
 * Three render paths consume one kernel (the "three paths must agree"
 * contract — see CLAUDE.md):
 *
 *   - lattice-emulator.js — calls `wrapTrailingNote` on a section BODY
 *     (pre-chrome) as the LAST parseSlide transform, after the bespoke
 *     crit/glossary transforms have settled the trailing-`<p>` shape.
 *     The emulator path is intentionally guard-free so its default-path
 *     output stays byte-identical to the inline regex it replaced.
 *   - marp.config.js — registry `applyAllToHtml` → `applyToHtml(fullHtml)`,
 *     which iterates top-level sections (depth-aware so nested split-panels
 *     stay intact), reads each section's class for the exclusion check, and
 *     wraps the trailing `<p>` that precedes the marp `<footer>` chrome.
 *   - lattice-runtime.js — registry `applyAllToDom` → `applyToDom(root)`.
 *
 * Before this kernel, the wrap was bespoke to `parseSlide`, so marp-cli and
 * the runtime never produced it — the emulator had silently diverged from
 * marp on these slides (the cross-renderer gate only checks page counts).
 * See engineering/decisions/2026-06-11-emulator-on-engine-p2.md.
 *
 * Sibling adapter: lib/transformers/below-note.js (registry wiring).
 */

// Layouts that claim their trailing `<p>` for something else (caption,
// attribution, main content, italic legend) or carry no body `<p>` — they
// must not gain the hairline. Mirrors the emulator's original list exactly.
const EXCLUDED = [
  'title', 'closing', 'quote', 'big-number', 'divider', 'image',
  'split-panel', 'split-compare', 'content', 'diagram', 'stats', 'code',
  'roadmap', 'progress', 'timeline-list', 'piechart', 'gantt', 'kanban',
  'image-razor', 'image-brief', 'image-chamber',
];

function isExcluded(cls = '') {
  return EXCLUDED.some(x => cls.includes(x));
}

// Trailing `<p>` immediately after a structural close, anchored to the end of
// the section content. An optional trailing marp `<footer>` is matched but
// left in place — it is present in the full-section HTML path and absent in
// the emulator's pre-chrome body, so one regex serves both. The whitespace
// around the footer is NOT captured, so the no-footer (emulator) case is
// byte-identical to the original inline `…</p>\s*$` wrap.
const TRAILING_NOTE =
  /((?:<\/div>|<\/ul>|<\/ol>|<\/table>|<\/pre>|<\/blockquote>)\s*)<p>([\s\S]*?)<\/p>\s*(<footer\b[^>]*>[\s\S]*?<\/footer>)?\s*$/;

// Pure per-section wrap. No idempotence guard — the emulator applies it once,
// to a fresh body; the HTML/DOM adapters add their own re-run guards.
function wrapTrailingNote(inner) {
  if (typeof inner !== 'string' || inner.indexOf('<p>') === -1) return inner;
  return inner.replace(TRAILING_NOTE, '$1<div class="below-note"><p>$2</p></div>$3');
}

// Emulator entry point: skip excluded layouts, else wrap. `cls` is the
// section's class string. Kept here so the exclusion list has one home.
function wrapSectionBody(inner, cls) {
  return isExcluded(cls) ? inner : wrapTrailingNote(inner);
}

// Depth-aware top-level `<section>` walk over the full Marpit HTML string.
// Nested sections (split-panels) are carried inside their excluded outer
// section and never processed independently.
function applyToHtml(html) {
  if (typeof html !== 'string' || html.indexOf('<section') === -1) return html;
  const openRe = /<section\b[^>]*>/g;
  const tagRe = /<section\b[^>]*>|<\/section>/g;
  let out = '';
  let i = 0;
  while (i < html.length) {
    openRe.lastIndex = i;
    const open = openRe.exec(html);
    if (!open) { out += html.slice(i); break; }
    out += html.slice(i, open.index);
    const bodyStart = openRe.lastIndex;
    // Find the matching </section>, counting nested opens.
    let depth = 1;
    let close = -1;
    tagRe.lastIndex = bodyStart;
    let t;
    while ((t = tagRe.exec(html))) {
      if (t[0].charAt(1) === '/') {
        if (--depth === 0) { close = t.index; break; }
      } else {
        depth++;
      }
    }
    if (close === -1) { out += html.slice(open.index); break; }
    const inner = html.slice(bodyStart, close);
    const clsMatch = open[0].match(/class="([^"]*)"/);
    const cls = clsMatch ? clsMatch[1] : '';
    const wrapped = isExcluded(cls) || inner.indexOf('class="below-note"') !== -1
      ? inner
      : wrapTrailingNote(inner);
    out += open[0] + wrapped + '</section>';
    i = close + '</section>'.length;
  }
  return out;
}

const STRUCTURAL = new Set(['DIV', 'UL', 'OL', 'TABLE', 'PRE', 'BLOCKQUOTE']);

// Live-DOM walk (marp-vscode preview). Finds each non-excluded section's
// trailing content `<p>` — the last element child, skipping a trailing
// `<footer>` — and wraps it when it follows a structural sibling.
function applyToDom(root) {
  const doc = root && root.ownerDocument ? root.ownerDocument : root;
  const scope = root && typeof root.querySelectorAll === 'function' ? root : doc;
  if (!scope || typeof scope.querySelectorAll !== 'function') return;
  for (const section of scope.querySelectorAll('section')) {
    if (isExcluded(section.className || '')) continue;
    if (section.querySelector(':scope > .below-note')) continue; // idempotent
    let last = section.lastElementChild;
    while (last && last.tagName === 'FOOTER') last = last.previousElementSibling;
    if (!last || last.tagName !== 'P') continue;
    const prev = last.previousElementSibling;
    if (!prev || !STRUCTURAL.has(prev.tagName)) continue;
    const wrap = doc.createElement('div');
    wrap.className = 'below-note';
    last.parentNode.insertBefore(wrap, last);
    wrap.appendChild(last);
  }
}

module.exports = {
  EXCLUDED,
  isExcluded,
  wrapTrailingNote,
  wrapSectionBody,
  applyToHtml,
  applyToDom,
};
