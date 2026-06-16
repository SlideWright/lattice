/**
 * Focus resolver — tag the ordinal target of a `_focus:` directive.
 *
 * Design: engineering/decisions/2026-06-16-focus-highlighting.md. The author
 * names a target with an ordinal grammar on the slide directive —
 * `<!-- _focus: row 4 -->`, `item 3`, `col 5`, `cell 4,5`, `line 3-4`,
 * `row 2, row 5`, `item 2-4`. The directive apply step (lib/engine/directives.js)
 * has already stamped `data-focus="row 4"` on the <section>. This transformer
 * reads it, finds the slide's primary collection for that axis, and tags the
 * matched element(s) `.lat-focus` and their siblings `.lat-recede`. Treatment is
 * pure CSS keyed on those classes plus `data-focus-axis` / `data-focus-style`
 * (lib/base/base.focus.css); the engine never styles, only tags.
 *
 * Explicit tags (not `:nth-child`) are deliberate: the treatment CSS then needs
 * no `:has()` / `:not(:has())`, which are silently broken in the Marp preview
 * Chromium (CLAUDE.md HARD RULE 12).
 *
 * Axes (each shipped in BOTH render paths in lock-step — HARD RULE 1):
 *   item  — top-level <li> of the slide's first list (lists, card grids)
 *   row   — <tbody> <tr> (tables)
 *   col   — the Nth cell of every row (tables)
 *   cell  — a single <td>, addressed `cell R,C` (table body)
 *   line  — code lines; the <code> text is wrapped into per-line <span class="ln">
 *           (lines render as text, not elements, so they must be wrapped first)
 *
 * Two render forms, one kernel:
 *   - applyToHtml — full Marpit/engine HTML string (lattice-emulator via
 *                   lib/engine → PDF/PPTX/HTML). Depth-aware section + child walk.
 *   - applyToDom  — live DOM (lattice-runtime.js, marp-vscode preview).
 *
 * Idempotent: guarded on the `data-focus-resolved` marker (string + DOM).
 */

const { splitSections } = require('../core/split-sections');

const SUPPORTED_AXES = new Set(['item', 'row', 'col', 'cell', 'line']);

// Content-aware default (decision doc §5.2): table-like axes keep every cell
// legible (ring); list/grid/code recede the rest (spotlight). An explicit
// `_focusStyle` always overrides this.
function defaultStyle(axis) {
  return (axis === 'row' || axis === 'col' || axis === 'cell') ? 'ring' : 'spotlight';
}

// ── grammar ────────────────────────────────────────────────────────────────
// "row 4" · "item 2-4" · "row 2, row 5" · "col 5" · "cell 4,5" · "line 3-4".
// `cell` carries R,C pairs (extracted before the comma split, since comma is the
// general target separator); the rest become per-axis 1-based index Sets.
function parseFocusSpec(spec) {
  if (typeof spec !== 'string') return [];
  const groups = [];
  let cell = null;
  const rest = spec.replace(/\bcell\s+(\d+)\s*,\s*(\d+)/gi, (_, r, c) => {
    if (!cell) { cell = { axis: 'cell', pairs: [] }; groups.push(cell); }
    cell.pairs.push({ r: +r, c: +c });
    return '';
  });
  const byAxis = new Map();
  for (const part of rest.split(',')) {
    const m = /^\s*([a-z]+)\s+(.+?)\s*$/i.exec(part);
    if (!m) continue;
    const axis = m[1].toLowerCase();
    const indices = byAxis.get(axis) || new Set();
    byAxis.set(axis, indices);
    for (const tok of m[2].split(/\s+/)) {
      const r = /^(\d+)(?:-(\d+))?$/.exec(tok);
      if (!r) continue;
      const lo = +r[1];
      const hi = r[2] ? +r[2] : lo;
      for (let i = Math.min(lo, hi); i <= Math.max(lo, hi); i++) indices.add(i);
    }
  }
  for (const [axis, indices] of byAxis) groups.push({ axis, indices });
  return groups;
}

// ── shared string helpers ────────────────────────────────────────────────────
function readAttr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function setAttr(tag, name, val) {
  if (new RegExp(`\\s${name}="`).test(tag)) {
    return tag.replace(new RegExp(`\\s${name}="[^"]*"`), ` ${name}="${val}"`);
  }
  return tag.replace(/\s*\/?>$/, (close) => ` ${name}="${val}"${close}`);
}

function mergeClass(attrs, name) {
  if (new RegExp(`class="[^"]*\\b${name}\\b`).test(attrs)) return attrs;
  if (/class="/.test(attrs)) return attrs.replace(/class="([^"]*)"/, (_, c) => `class="${c} ${name}"`);
  return `${attrs} class="${name}"`;
}

function addClassToFirstTag(outer, name) {
  return outer.replace(/^(<[a-zA-Z][\w-]*)([^>]*)>/, (_, lead, attrs) => `${lead}${mergeClass(attrs, name)}>`);
}

// Top-level <tag>…</tag> spans within `html` (depth-aware; the tag may nest,
// e.g. li > ul > li). Returns { start, end } of each direct child, in order.
function directChildren(html, tag) {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const isBoundary = (ch) => ch === undefined || ch === '>' || /\s/.test(ch) || ch === '/';
  const out = [];
  let i = 0;
  while (i < html.length) {
    const s = html.indexOf(open, i);
    if (s < 0) break;
    if (!isBoundary(html[s + open.length])) { i = s + open.length; continue; }
    const tagEnd = html.indexOf('>', s);
    if (tagEnd < 0) break;
    if (html[tagEnd - 1] === '/') { out.push({ start: s, end: tagEnd + 1 }); i = tagEnd + 1; continue; }
    let depth = 1;
    let pos = tagEnd + 1;
    let endPos = -1;
    while (pos < html.length) {
      if (html.startsWith(open, pos) && isBoundary(html[pos + open.length])) {
        const e = html.indexOf('>', pos);
        if (e < 0) break;
        if (html[e - 1] !== '/') depth++;
        pos = e + 1;
      } else if (html.startsWith(close, pos)) {
        depth--;
        if (depth === 0) { endPos = pos + close.length; break; }
        pos += close.length;
      } else pos++;
    }
    if (endPos < 0) break;
    out.push({ start: s, end: endPos });
    i = endPos;
  }
  return out;
}

// Replace each child span (from directChildren / rowCells / allRows) with the
// result of fn(outerHtml, index1Based). Stable single-pass rewrite.
function rewriteSpans(html, spans, fn) {
  let out = '';
  let cursor = 0;
  spans.forEach((sp, idx) => {
    out += html.slice(cursor, sp.start);
    out += fn(html.slice(sp.start, sp.end), idx + 1);
    cursor = sp.end;
  });
  return out + html.slice(cursor);
}

// Every <tr>…</tr> in `html` (tr never nests — flat scan).
function allRows(html) {
  const spans = [];
  let i = 0;
  for (;;) {
    const s = html.indexOf('<tr', i);
    if (s < 0) break;
    const e = html.indexOf('</tr>', s);
    if (e < 0) break;
    spans.push({ start: s, end: e + 5 });
    i = e + 5;
  }
  return spans;
}

// Every <td>/<th> cell in a row's outer HTML, in order (cells never nest).
function rowCells(rowHtml) {
  const spans = [];
  let i = 0;
  for (;;) {
    const td = rowHtml.indexOf('<td', i);
    const th = rowHtml.indexOf('<th', i);
    let s = -1;
    let close = '';
    if (td >= 0 && (th < 0 || td < th)) { s = td; close = '</td>'; }
    else if (th >= 0) { s = th; close = '</th>'; }
    if (s < 0) break;
    const e = rowHtml.indexOf(close, s);
    if (e < 0) break;
    spans.push({ start: s, end: e + close.length });
    i = e + close.length;
  }
  return spans;
}

function firstList(inner) {
  const ulAt = inner.indexOf('<ul');
  const olAt = inner.indexOf('<ol');
  let at = -1;
  let tag = '';
  if (ulAt >= 0 && (olAt < 0 || ulAt < olAt)) { at = ulAt; tag = 'ul'; }
  else if (olAt >= 0) { at = olAt; tag = 'ol'; }
  if (at < 0) return null;
  const [span] = directChildren(inner.slice(at), tag);
  if (!span) return null;
  const open = inner.indexOf('>', at) + 1;
  const closeStart = at + span.end - (`</${tag}>`).length;
  return { pre: inner.slice(0, open), body: inner.slice(open, closeStart), post: inner.slice(at + span.end), tag };
}

function tbodyBody(inner) {
  const at = inner.indexOf('<tbody');
  if (at < 0) return null;
  const open = inner.indexOf('>', at) + 1;
  const closeStart = inner.indexOf('</tbody>', open);
  if (closeStart < 0) return null;
  return { pre: inner.slice(0, open), body: inner.slice(open, closeStart), post: inner.slice(closeStart) };
}

// Split highlighted code into lines at depth-0 newlines (a newline inside a
// hljs <span> — e.g. a multi-line string — stays within its line, so tags stay
// balanced). Returns an array of line HTML fragments.
function splitCodeLines(code) {
  const lines = [];
  let cur = '';
  let depth = 0;
  let i = 0;
  while (i < code.length) {
    if (code.startsWith('<span', i)) { const e = code.indexOf('>', i); if (e < 0) { cur += code.slice(i); break; } cur += code.slice(i, e + 1); depth++; i = e + 1; continue; }
    if (code.startsWith('</span>', i)) { cur += '</span>'; if (depth > 0) depth--; i += 7; continue; }
    const ch = code[i];
    if (ch === '\n' && depth === 0) { lines.push(cur); cur = ''; i++; continue; }
    cur += ch;
    i++;
  }
  lines.push(cur);
  return lines;
}

function wrapLines(lines, indices) {
  return lines
    .map((ln, idx) => `<span class="ln ${indices.has(idx + 1) ? 'lat-focus' : 'lat-recede'}">${ln}</span>`)
    .join('\n');
}

// ── string path (applyToHtml) ─────────────────────────────────────────────────
function resolveAxisHtml(inner, group) {
  const { axis, indices } = group;
  if (axis === 'item') {
    const list = firstList(inner);
    if (!list) return null;
    const kids = directChildren(list.body, 'li');
    if (!kids.length) return null;
    const body = rewriteSpans(list.body, kids, (o, n) => addClassToFirstTag(o, indices.has(n) ? 'lat-focus' : 'lat-recede'));
    return list.pre + body + `</${list.tag}>` + list.post;
  }
  if (axis === 'row') {
    const tb = tbodyBody(inner);
    if (!tb) return null;
    const rows = allRows(tb.body);
    if (!rows.length) return null;
    const body = rewriteSpans(tb.body, rows, (o, n) => addClassToFirstTag(o, indices.has(n) ? 'lat-focus' : 'lat-recede'));
    return tb.pre + body + tb.post;
  }
  if (axis === 'col') {
    const rows = allRows(inner);
    if (!rows.length) return null;
    return rewriteSpans(inner, rows, (rowHtml) => {
      const cells = rowCells(rowHtml);
      if (!cells.length) return rowHtml;
      return rewriteSpans(rowHtml, cells, (o, n) => addClassToFirstTag(o, indices.has(n) ? 'lat-focus' : 'lat-recede'));
    });
  }
  if (axis === 'cell') {
    const tb = tbodyBody(inner);
    if (!tb) return null;
    const rows = allRows(tb.body);
    if (!rows.length) return null;
    const body = rewriteSpans(tb.body, rows, (rowHtml, ri) => {
      const cols = new Set(group.pairs.filter((p) => p.r === ri).map((p) => p.c));
      if (!cols.size) return rowHtml;
      const cells = rowCells(rowHtml);
      return rewriteSpans(rowHtml, cells, (o, ci) => (cols.has(ci) ? addClassToFirstTag(o, 'lat-focus') : o));
    });
    return tb.pre + body + tb.post;
  }
  if (axis === 'line') {
    const codeOpen = inner.search(/<code\b/);
    if (codeOpen < 0) return null;
    const openEnd = inner.indexOf('>', codeOpen) + 1;
    const closeStart = inner.indexOf('</code>', openEnd);
    if (closeStart < 0) return null;
    const code = inner.slice(openEnd, closeStart);
    if (code.indexOf('class="ln') >= 0) return null; // idempotent
    return inner.slice(0, openEnd) + wrapLines(splitCodeLines(code), indices) + inner.slice(closeStart);
  }
  return null;
}

function resolveSectionHtml(openTag, inner) {
  const spec = readAttr(openTag, 'data-focus');
  if (!spec || /\sdata-focus-resolved/.test(openTag)) return { openTag, inner };
  let newInner = inner;
  let axisStamped = null;
  for (const group of parseFocusSpec(spec)) {
    if (!SUPPORTED_AXES.has(group.axis)) continue;
    const next = resolveAxisHtml(newInner, group);
    if (next != null) { newInner = next; axisStamped = group.axis; }
  }
  let newOpen = setAttr(openTag, 'data-focus-resolved', '');
  if (axisStamped) {
    newOpen = setAttr(newOpen, 'data-focus-axis', axisStamped);
    const explicit = readAttr(newOpen, 'data-focus-style');
    newOpen = setAttr(newOpen, 'data-focus-style', explicit || defaultStyle(axisStamped));
  }
  return { openTag: newOpen, inner: newInner };
}

function applyToHtml(html) {
  if (typeof html !== 'string' || html.indexOf('data-focus="') === -1) return html;
  const pieces = splitSections(html);
  let out = '';
  for (const p of pieces) {
    if (p.type === 'gap') { out += p.text; continue; }
    const { openTag, inner } = resolveSectionHtml(p.openTag, p.inner);
    out += openTag + inner + '</section>';
  }
  return out;
}

// ── DOM path (applyToDom) ────────────────────────────────────────────────────
function tableCells(tr) {
  return [...tr.children].filter((el) => el.tagName === 'TD' || el.tagName === 'TH');
}

function resolveAxisDom(sec, group) {
  const { axis, indices } = group;
  if (axis === 'item') {
    const list = sec.querySelector(':scope > ul, :scope > ol');
    const items = list ? [...list.children].filter((el) => el.tagName === 'LI') : [];
    if (!items.length) return false;
    items.forEach((el, i) => { el.classList.add(indices.has(i + 1) ? 'lat-focus' : 'lat-recede'); });
    return true;
  }
  if (axis === 'row') {
    const tbody = sec.querySelector(':scope table tbody');
    const rows = tbody ? [...tbody.children].filter((el) => el.tagName === 'TR') : [];
    if (!rows.length) return false;
    rows.forEach((el, i) => { el.classList.add(indices.has(i + 1) ? 'lat-focus' : 'lat-recede'); });
    return true;
  }
  if (axis === 'col') {
    const rows = [...sec.querySelectorAll(':scope table tr')];
    if (!rows.length) return false;
    for (const tr of rows) tableCells(tr).forEach((c, i) => { c.classList.add(indices.has(i + 1) ? 'lat-focus' : 'lat-recede'); });
    return true;
  }
  if (axis === 'cell') {
    const rows = [...sec.querySelectorAll(':scope table tbody tr')];
    if (!rows.length) return false;
    let any = false;
    for (const { r, c } of group.pairs) {
      const cell = tableCells(rows[r - 1] || {})[c - 1];
      if (cell) { cell.classList.add('lat-focus'); any = true; }
    }
    return any;
  }
  if (axis === 'line') {
    const code = sec.querySelector(':scope pre code');
    if (!code || code.querySelector('.ln')) return false;
    code.innerHTML = wrapLines(splitCodeLines(code.innerHTML), indices);
    return true;
  }
  return false;
}

function resolveSectionDom(sec) {
  if (sec.hasAttribute('data-focus-resolved')) return;
  const spec = sec.getAttribute('data-focus');
  if (!spec) return;
  let axisStamped = null;
  for (const group of parseFocusSpec(spec)) {
    if (!SUPPORTED_AXES.has(group.axis)) continue;
    if (resolveAxisDom(sec, group)) axisStamped = group.axis;
  }
  if (axisStamped) {
    sec.setAttribute('data-focus-axis', axisStamped);
    if (!sec.getAttribute('data-focus-style')) sec.setAttribute('data-focus-style', defaultStyle(axisStamped));
  }
  sec.setAttribute('data-focus-resolved', '');
}

function applyToDom(root) {
  const scope = root?.querySelectorAll ? root : root?.ownerDocument;
  if (!scope?.querySelectorAll) return;
  for (const sec of scope.querySelectorAll('section[data-focus]')) resolveSectionDom(sec);
}

module.exports = {
  name: 'focus',
  selector: 'section[data-focus]',
  applyToHtml,
  applyToDom,
  // exported for unit tests
  parseFocusSpec,
  directChildren,
  splitCodeLines,
  resolveSectionHtml,
};
