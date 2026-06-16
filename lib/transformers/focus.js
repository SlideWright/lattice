/**
 * Focus resolver — tag the ordinal target of a `_focus:` directive.
 *
 * Design: engineering/decisions/2026-06-16-focus-highlighting.md. The author
 * names a target with an ordinal grammar on the slide directive —
 * `<!-- _focus: row 4 -->`, `item 3`, `row 2, row 5`, `item 2-4`. The directive
 * apply step (lib/engine/directives.js) has already stamped `data-focus="row 4"`
 * on the <section>. This transformer reads it, finds the slide's primary
 * collection for that axis, and tags the matched element(s) `.lat-focus` and
 * their siblings `.lat-recede`. Treatment is pure CSS keyed on those classes
 * plus `data-focus-axis` (lattice.css); the engine never styles, only tags.
 *
 * Explicit tags (not `:nth-child`) are deliberate: the treatment CSS then needs
 * no `:has()` / `:not(:has())`, which are silently broken in the Marp preview
 * Chromium (CLAUDE.md HARD RULE 12).
 *
 * Two render forms, one kernel (HARD RULE 1 — both paths ship every axis in
 * lock-step, never one alone):
 *   - applyToHtml — full Marpit/engine HTML string (lattice-emulator via
 *                   lib/engine → PDF/PPTX/HTML). Depth-aware section + child walk.
 *   - applyToDom  — live DOM (lattice-runtime.js, marp-vscode preview).
 *
 * First cut: `item` (list / card grid) and `row` (table tbody). `col` / `cell`
 * / `line` (needs code line-wrapping) and `_focusSteps` expansion land in the
 * next increment, both paths together.
 *
 * Idempotent: guarded on the `data-focus-resolved` marker (string + DOM).
 */

const { splitSections } = require('../core/split-sections');

// ── grammar ────────────────────────────────────────────────────────────────
// "row 4" · "item 2-4" · "row 2, row 5" · "item 1 3" → grouped per axis.
// `cell`/`col`/`line` are parsed-but-unsupported here (returned, ignored by the
// taggers below) until their increment lands — never mis-tags.
const SUPPORTED_AXES = new Set(['item', 'row']);

// Content-aware default (engineering/decisions/2026-06-16-focus-highlighting.md
// §5.2): table-like axes keep every cell legible (ring); list/grid/code recede
// the rest (spotlight). An explicit `_focusStyle` always overrides this.
function defaultStyle(axis) {
  return (axis === 'row' || axis === 'col' || axis === 'cell') ? 'ring' : 'spotlight';
}

function parseFocusSpec(spec) {
  if (typeof spec !== 'string') return [];
  const byAxis = new Map();
  for (const part of spec.split(',')) {
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
  return [...byAxis].map(([axis, indices]) => ({ axis, indices }));
}

// ── string helpers (applyToHtml) ─────────────────────────────────────────────
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
// e.g. li > ul > li). Returns the outer HTML of each direct child, in order.
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
    const selfClose = html[tagEnd - 1] === '/';
    if (selfClose) { out.push({ start: s, end: tagEnd + 1 }); i = tagEnd + 1; continue; }
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

// Isolate the first <ul>/<ol> in `inner` and return { pre, open, body, post }
// where the list is `open + body + '</ul|ol>'`. null when no list present.
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
  return {
    pre: inner.slice(0, open),
    body: inner.slice(open, closeStart),
    post: inner.slice(at + span.end),
    tag,
  };
}

// Isolate the <tbody>…</tbody> body. null when absent.
function tbodyBody(inner) {
  const at = inner.indexOf('<tbody');
  if (at < 0) return null;
  const open = inner.indexOf('>', at) + 1;
  const closeStart = inner.indexOf('</tbody>', open);
  if (closeStart < 0) return null;
  return {
    pre: inner.slice(0, open),
    body: inner.slice(open, closeStart),
    post: inner.slice(closeStart),
  };
}

// Tag the direct `childTag` children of `body`: those at a 1-based index in
// `indices` get `.lat-focus`, the rest `.lat-recede`. Returns rewritten body.
function tagChildren(body, childTag, indices) {
  const kids = directChildren(body, childTag);
  if (kids.length === 0) return null;
  let out = '';
  let cursor = 0;
  kids.forEach((span, idx) => {
    out += body.slice(cursor, span.start);
    const outer = body.slice(span.start, span.end);
    const cls = indices.has(idx + 1) ? 'lat-focus' : 'lat-recede';
    out += addClassToFirstTag(outer, cls);
    cursor = span.end;
  });
  out += body.slice(cursor);
  return out;
}

function resolveSectionHtml(openTag, inner) {
  const spec = readAttr(openTag, 'data-focus');
  if (!spec || /\sdata-focus-resolved/.test(openTag)) return { openTag, inner };
  let newInner = inner;
  let axisStamped = null;
  for (const { axis, indices } of parseFocusSpec(spec)) {
    if (!SUPPORTED_AXES.has(axis)) continue;
    if (axis === 'item') {
      const list = firstList(newInner);
      if (!list) continue;
      const tagged = tagChildren(list.body, 'li', indices);
      if (tagged == null) continue;
      newInner = list.pre + tagged + `</${list.tag}>` + list.post;
      axisStamped = 'item';
    } else if (axis === 'row') {
      const tb = tbodyBody(newInner);
      if (!tb) continue;
      const tagged = tagChildren(tb.body, 'tr', indices);
      if (tagged == null) continue;
      newInner = tb.pre + tagged + tb.post;
      axisStamped = 'row';
    }
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
function collectionFor(sec, axis) {
  if (axis === 'item') {
    const list = sec.querySelector(':scope > ul, :scope > ol');
    return list ? [...list.children].filter((el) => el.tagName === 'LI') : [];
  }
  if (axis === 'row') {
    const tbody = sec.querySelector(':scope table tbody');
    return tbody ? [...tbody.children].filter((el) => el.tagName === 'TR') : [];
  }
  return [];
}

function resolveSectionDom(sec) {
  if (sec.hasAttribute('data-focus-resolved')) return;
  const spec = sec.getAttribute('data-focus');
  if (!spec) return;
  let axisStamped = null;
  for (const { axis, indices } of parseFocusSpec(spec)) {
    if (!SUPPORTED_AXES.has(axis)) continue;
    const coll = collectionFor(sec, axis);
    if (coll.length === 0) continue;
    coll.forEach((el, idx) => { el.classList.add(indices.has(idx + 1) ? 'lat-focus' : 'lat-recede'); });
    axisStamped = axis;
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
  resolveSectionHtml,
};
