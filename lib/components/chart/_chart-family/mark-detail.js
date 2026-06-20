/**
 * mark-detail — the shared substrate for per-mark interactive detail across the
 * SVG chart family (funnel / map / quadrant / radar today; the pie shipped the
 * pattern first with bespoke wiring — see
 * engineering/decisions/2026-06-20-chart-detail-reveal-family.md).
 *
 * One authored nested sublist under a chart's primary list item becomes TWO
 * coexisting surfaces, from one source:
 *   1. Present/Practice/Preview — an inert `<template class="chart-detail"
 *      data-mark="i">` (renders nothing) read by the parent-hosted reveal layer
 *      (docs/src/playground/drawing-board-chart-interact.js) via data-mark; the
 *      chart's mark element carries the matching `data-mark="i"`.
 *   2. Static PDF — the same detail folded into the slide's SPEAKER NOTE as a
 *      Marp-faithful `<!-- … -->` comment; notes-core lifts it into the per-slide
 *      note channel (a PDF text annotation + the hidden aside) and strips the
 *      comment BEFORE render, so the chart pixels stay byte-identical.
 *
 * Pure: HTML strings in, HTML strings out — no DOM, no markdown-it. Self-contained
 * (no requires) so the per-chart kernels can import it without a circular
 * dependency on chart-family.js (which requires THEM). This is the generalization
 * of buildPieChart's inline detail capture + buildPieDetailNote (Hard Rules #1/#15).
 */

// Depth-aware extractor for the first <ul>/<ol> in src. Tolerates attributes on
// opening tags (the engine adds data-tight, id, class, start, …). Returns
// { inner, start, end } or null. A naive /<ul>([\s\S]*?)<\/ul>/ stops at the
// first inner </ul> and unbalances nested lists — match by depth. Mirrors
// extractFirstList in chart-family.js; kept local so the kernels stay
// self-contained.
function extractFirstList(src) {
  const matchListOpen = (pos) => {
    if (src[pos] !== '<') return -1;
    const isUl = src.startsWith('ul', pos + 1);
    const isOl = src.startsWith('ol', pos + 1);
    if (!isUl && !isOl) return -1;
    const next = src.charCodeAt(pos + 3);
    if (next !== 0x3e && next !== 0x20 && next !== 0x09 && next !== 0x0a) return -1;
    const gt = src.indexOf('>', pos);
    return gt < 0 ? -1 : gt + 1;
  };
  const isListClose = (pos) =>
    (src.startsWith('</ul>', pos) || src.startsWith('</ol>', pos)) ? pos + 5 : -1;

  let s = -1;
  for (let i = 0; i < src.length; i++) {
    if (matchListOpen(i) > 0) { s = i; break; }
  }
  if (s < 0) return null;

  let depth = 0, pos = s, inner = '';
  while (pos < src.length) {
    const openEnd = matchListOpen(pos);
    if (openEnd > 0) {
      if (depth > 0) inner += src.slice(pos, openEnd);
      depth++; pos = openEnd; continue;
    }
    const closeEnd = isListClose(pos);
    if (closeEnd > 0) {
      depth--;
      if (depth === 0) return { inner, start: s, end: closeEnd };
      inner += src.slice(pos, closeEnd); pos = closeEnd; continue;
    }
    if (depth > 0) inner += src[pos];
    pos++;
  }
  return null;
}

// Depth-aware top-level <li> contents of a list's inner HTML (so a nested list
// can't terminate the outer item). Mirrors parseTopLevelLis in chart-family.js.
function topLevelLis(inner) {
  const items = [];
  let depth = 0, contentStart = -1, i = 0;
  const openEnd = (tag, idx) => {
    if (!inner.startsWith('<' + tag, idx)) return -1;
    const n = inner.charCodeAt(idx + 1 + tag.length);
    if (n === 0x3e || n === 0x20 || n === 0x09) {
      const close = inner.indexOf('>', idx);
      return close < 0 ? -1 : close + 1;
    }
    return -1;
  };
  while (i < inner.length) {
    const li = openEnd('li', i);
    if (li > 0) { if (depth === 0) contentStart = li; depth++; i = li; continue; }
    if (inner.startsWith('</li>', i)) {
      depth--;
      if (depth === 0 && contentStart !== -1) { items.push(inner.slice(contentStart, i)); contentStart = -1; }
      i += 5; continue;
    }
    const ul = openEnd('ul', i); if (ul > 0) { depth++; i = ul; continue; }
    const ol = openEnd('ol', i); if (ol > 0) { depth++; i = ol; continue; }
    if (inner.startsWith('</ul>', i) || inner.startsWith('</ol>', i)) { depth--; i += 5; continue; }
    i++;
  }
  return items;
}

/**
 * Split an optional nested detail sublist off a chart list item.
 * Returns { lead, detail } where `lead` is the item HTML BEFORE the first nested
 * list (the part the kernel parses for label/value), and `detail` is that list's
 * depth-aware inner HTML (the popover payload), or '' when there's no sublist.
 *
 * Call this FIRST, before reading the label/value pill — the same order
 * buildPieChart uses.
 */
function splitDetail(item) {
  const nestedIdx = item.search(/<ul[^>]*>/);
  if (nestedIdx < 0) return { lead: item, detail: '' };
  const ext = extractFirstList(item.slice(nestedIdx));
  return { lead: item.slice(0, nestedIdx), detail: ext ? ext.inner.trim() : '' };
}

/**
 * Emit the inert `<template>` payload for a chart's captured details.
 * @param {Array<{detail?: string}>} marks  one entry per mark, in mark order
 * @returns {string}  `<div class="chart-details" hidden>…</div>` or '' if none
 * carry detail. The mark elements themselves get `data-mark="i"` from the kernel;
 * here we emit the matching `<template class="chart-detail" data-mark="i">`.
 */
function detailPayload(marks) {
  const templates = marks
    .map((m, idx) => m?.detail
      ? `<template class="chart-detail" data-mark="${idx}">${m.detail}</template>`
      : '')
    .join('');
  return templates ? `<div class="chart-details" hidden>${templates}</div>` : '';
}

/**
 * Fold a chart's per-mark detail into one Marp-faithful speaker-note comment.
 * notes-core lifts it into the slide note (PDF annotation + hidden aside) and
 * strips the comment before render — so a detail chart's PDF gains the notes
 * WITHOUT touching the chart pixels. Returns '' when no mark carries detail.
 * One line per detailed mark: `Label (value): item · item`. Comment-safe (a
 * stray `-->` inside the detail can't terminate the note early) and decoded to
 * plain text. Generalizes buildPieDetailNote.
 * @param {Array<{label?: string, valueRaw?: string, detail?: string}>} marks
 */
function detailNote(marks) {
  const flatten = (html) => String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  const lines = [];
  for (const m of marks) {
    if (!m?.detail) continue;
    const items = topLevelLis(m.detail).map(flatten).filter(Boolean);
    const body = items.length ? items.join(' · ') : flatten(m.detail);
    if (!body) continue;
    const label = flatten(m.label || '');
    const value = m.valueRaw ? `(${flatten(m.valueRaw)})` : '';
    lines.push(`${[label, value].filter(Boolean).join(' ')}: ${body}`.trim());
  }
  if (!lines.length) return '';
  const safe = lines.join('\n').replace(/--+>?/g, '—');
  return `<!-- ${safe} -->`;
}

module.exports = { splitDetail, detailPayload, detailNote, extractFirstList, topLevelLis };
