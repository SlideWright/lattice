/**
 * collections.js — the slide's "primary collection" toolkit: pure, render-form-
 * agnostic helpers for finding and rewriting the ordinal collections a slide is
 * built from (list items, table rows/cells, code lines).
 *
 * Extracted verbatim from lib/transformers/focus.js so the focus resolver and the
 * narrative-build resolver share ONE implementation of "find the collection for
 * axis X and rewrite its members" (HARD RULE 15 — reuse, don't clone). A build is
 * "focus sequenced over time" (engineering/decisions/2026-06-16-narrative-step-spec.md),
 * so both transformers resolve the same axes (item · row · col · cell · line) off
 * the same string/DOM walkers; only the per-member tag differs (focus tags
 * `.lat-focus`/`.lat-recede`; build stamps `data-build-step="N"`).
 *
 * Pure & fs-free — safe for the browser bundle and unit-testable in isolation.
 * The string walkers are deliberately depth-aware hand-rolled scanners (not regex
 * across nesting) and the treatment they enable is explicit per-element tags, so
 * the consuming CSS never needs `:has()`/`:nth-child()` — both silently broken in
 * the Marp preview Chromium (CLAUDE.md HARD RULE 12).
 */

// ── attribute / class string helpers ─────────────────────────────────────────
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

// ── structural span walkers (HTML-string path) ───────────────────────────────
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

// The slide's first list, split into { pre, body, post, tag } so a caller can
// rewrite its direct <li> children and reassemble.
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

module.exports = {
  readAttr,
  setAttr,
  mergeClass,
  addClassToFirstTag,
  directChildren,
  rewriteSpans,
  allRows,
  rowCells,
  firstList,
  tbodyBody,
  splitCodeLines,
};
