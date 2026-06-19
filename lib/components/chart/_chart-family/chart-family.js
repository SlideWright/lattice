/**
 * Chart-family DOM transform — shared between the build path
 * (lattice-emulator.js) and the owned engine (lib/engine).
 *
 * Operates on rendered HTML strings so it can run in both contexts:
 *   - the emulator's per-slide HTML during PDF/HTML build
 *   - the marp-core engine's whole-render output for VS Code Marp preview
 *
 * This module is pure: no DOM, no markdown-it dependency. Inputs and outputs
 * are HTML strings.
 *
 * Why not a markdown-it ruler? The transform is structural (extract eyebrow
 * before h2, subtitle after h2, caption italic at the tail, rewrite the list
 * into chart-specific markup) and easier to express on rendered HTML than
 * on the token stream. The owned engine wraps `render`
 * and post-processes the resulting `html` string.
 *
 * Why ship through the engine instead of relying on a runtime <script>?
 * VS Code Marp preview filters HTML elements through Marp's allowlist,
 * which excludes <script> by default. Even with `markdown.marp.html: "all"`,
 * relative-path resolution and webview CSP made the runtime path unreliable.
 * The engine wrapper bakes the transform into the rendered HTML, so the
 * preview and the export pipelines see the same DOM.
 */

const CHART_LAYOUTS = ['progress', 'timeline-list', 'piechart', 'gantt', 'kanban', 'radar', 'quadrant', 'state-chart', 'funnel', 'map', 'journey', 'word-cloud', 'roadmap'];
// The six categorical slot hues, in rotation order — the rotation anchor for
// wedges and legend swatches (buildPieChart reads `.length` and derives each
// slot's --catN-hue per index). Wedges ride a hub→rim area-fade of --catN-hue
// (radar's vivid identity colour), not the pale --catN-fill, paired with the
// CSS --catN-ink wedge border (piechart.styles.css). Six is the perceptual
// cap (Wong 2011, IBM Carbon); pies past it should consolidate "Other".
const PIE_PALETTE = [
  'var(--chart-cat-1-hue)', 'var(--chart-cat-2-hue)', 'var(--chart-cat-3-hue)',
  'var(--chart-cat-4-hue)', 'var(--chart-cat-5-hue)', 'var(--chart-cat-6-hue)',
];

// Per-wedge radial-depth gradient counter. SVG fill can't take a CSS
// gradient, so each wedge gets its own <radialGradient> (hub slightly
// translucent → full at the rim) for a glassy depth that matches radar's
// area-fade restraint. Unique ids per render dodge the SVG duplicate-id trap.
// Siblings: radar.transform.js areaGradient, quadrant.transform.js.
let PIE_GRAD_SEQ = 0;

// Radar is a chart-family member. Its parsing + SVG geometry lives in
// lib/radar.js (the kernel); chart-family is the dispatch + chart-frame
// wrapping point. Three-renderer parity is enforced via the same kernel
// being called from lattice-emulator.js's inline chart-family block and
// from lattice-runtime.js's chart-family DOM mirror.
const radar = require('../radar/radar.transform');

// Quadrant — 2×2 scatter / matrix chart. Same kernel-as-module pattern
// as radar: lib/quadrant.js owns parsing + SVG emission; chart-family
// dispatches. Three-renderer parity enforced the same way.
const quadrant = require('../quadrant/quadrant.transform');

// State-chart — native finite-state-machine diagram. Numbered list of
// states, nested inline-code arrows for transitions. Kernel-as-module
// pattern; three-renderer parity via the same registry path.
const stateChart = require('../state-chart/state-chart.transform');

// Funnel — tapering stage chart. Same kernel-as-module pattern as radar /
// quadrant / state-chart: parse + SVG geometry live in the module, dispatch
// + chart-frame wrapping here.
const funnel = require('../funnel/funnel.transform');

// Map — spatial choropleth / highlight chart, the one component on the
// `spatial` form. Same kernel-as-module pattern; the baked basemap (projected
// SVG path data) lives in the kernel's map.basemap.json and ships inline in
// the JS bundles, never in dist/lattice.css.
const map = require('../map/map.transform');

// Journey — native user-journey board (mood curve / swimlane / heatmap /
// weighted). Folded into the chart family: a chart-frame member like the
// rest. Its kernel rewrites the nested list into a `.journey-board`; the
// chart-frame wrap then supplies the header/body/caption skeleton. Same
// kernel-as-module pattern as radar/quadrant; three-renderer parity via the
// same registry path. Lives at ../journey/ (chart bucket) since the fold.
const journey = require('../journey/journey.transform');

// Word-cloud — spiral-packed weighted terms. Also a chart-frame member; its
// kernel rewrites the first <ul> into a `.word-cloud-canvas` of absolutely
// positioned <span class="wc-word">, then the chart-frame wrap frames it.
// Before the fold it duplicated the chart-frame chrome in its own CSS; now it
// inherits the real skeleton. Kernel-as-module; three-renderer parity.
const wordCloud = require('../word-cloud/word-cloud.transform');

// Roadmap — workstream × phase grid (table) with cell state markers, plus a
// `horizons` variant that transposes the table into Now/Next/Later cards.
// Folded into the chart family: the kernel tags cells / transposes in place
// (it operates on a <table>, not a list), then the dispatch wraps the figure
// in `.roadmap-figure` so the div-based chart-frame body matcher catches it.
// Kernel-as-module; three-renderer parity. Lives at ../roadmap/ (chart bucket).
const roadmap = require('../roadmap/roadmap.transform');

// The shared SVG-native legend + spine builder — the keystone that keeps the four
// KEYED charts (pie/radar/map/cohort quadrant) one family. buildPieChart calls it
// here; the radar/map/quadrant kernels call it directly. See svg-legend.js and
// engineering/decisions/2026-06-13-svg-native-legend.md.
const { buildSvgLegend } = require('./svg-legend');

function escAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Roadmap's body is a <table> (default / status) or a transposed
// `<div class="horizons">` grid (horizons variant) — not a single labelled
// figure div like the list-based members. Wrap whichever is present in a
// `.roadmap-figure` div so the (div-based) chart-frame body matcher and its
// depth-aware close scan treat it as the body. Idempotent.
function wrapRoadmapFigure(html, legend = '') {
  if (/class="roadmap-figure"/.test(html)) return html;
  // The status-marker key (or '') rides INSIDE the figure, after the grid, so
  // the chart-frame body wrap treats [grid + legend] as one body unit and the
  // legend sits bottom-centre within the body (never spilling to the footer).
  const inject = legend || '';
  // Horizons variant: wrap the .horizons grid (depth-aware, it nests
  // .horizon-card divs).
  const hz = html.indexOf('<div class="horizons">');
  if (hz >= 0) {
    let depth = 0, pos = hz, end = -1;
    while (pos < html.length) {
      if (html.startsWith('<div', pos)) {
        const c = html.indexOf('>', pos);
        if (c < 0) break;
        depth++; pos = c + 1;
      } else if (html.startsWith('</div>', pos)) {
        depth--;
        if (depth === 0) { end = pos + 6; break; }
        pos += 6;
      } else { pos++; }
    }
    if (end > 0) {
      return html.slice(0, hz) + '<div class="roadmap-figure">' +
        html.slice(hz, end) + inject + '</div>' + html.slice(end);
    }
    return html;
  }
  // Default / status: wrap the <table> (roadmap tables never nest a table).
  const t = html.indexOf('<table');
  if (t >= 0) {
    const close = html.indexOf('</table>', t);
    if (close >= 0) {
      const end = close + '</table>'.length;
      return html.slice(0, t) + '<div class="roadmap-figure">' +
        html.slice(t, end) + inject + '</div>' + html.slice(end);
    }
  }
  return html;
}

// Walk a list's inner HTML and return its top-level `<li>` contents,
// tracking depth so a nested </li> doesn't terminate the outer item.
// Tolerates attributes on <li>, <ul>, <ol> (e.g. the engine renders
// ordered lists with `start="2"` for resumed numbering).
function parseTopLevelLis(inner) {
  const items = [];
  let depth = 0, _liStart = -1, liContentStart = -1, i = 0;
  const matchOpen = (tag, idx) => {
    if (!inner.startsWith('<' + tag, idx)) return -1;
    const next = inner.charCodeAt(idx + 1 + tag.length);
    // Either '>' or whitespace before attributes
    if (next === 0x3e /* '>' */ || next === 0x20 /* ' ' */ || next === 0x09 /* tab */) {
      const close = inner.indexOf('>', idx);
      return close < 0 ? -1 : close + 1;
    }
    return -1;
  };
  while (i < inner.length) {
    const liOpenEnd = matchOpen('li', i);
    if (liOpenEnd > 0) {
      if (depth === 0) liContentStart = liOpenEnd;
      depth++;
      i = liOpenEnd;
      continue;
    }
    if (inner.startsWith('</li>', i)) {
      depth--;
      if (depth === 0 && liContentStart !== -1) {
        items.push(inner.slice(liContentStart, i));
        liContentStart = -1;
      }
      i += 5;
      continue;
    }
    const ulOpenEnd = matchOpen('ul', i);
    if (ulOpenEnd > 0) { depth++; i = ulOpenEnd; continue; }
    const olOpenEnd = matchOpen('ol', i);
    if (olOpenEnd > 0) { depth++; i = olOpenEnd; continue; }
    if (inner.startsWith('</ul>', i) || inner.startsWith('</ol>', i)) {
      depth--; i += 5; continue;
    }
    i++;
  }
  return items;
}

function stripTrailingPills(lead) {
  const pills = [];
  let s = lead;
  while (true) {
    const m = s.match(/^([\s\S]*?)\s*<code>([^<]+)<\/code>\s*$/);
    if (!m) break;
    pills.unshift(m[2].trim());
    s = m[1];
  }
  return { leadStripped: s, pills };
}

function buildProgressBars(ulInner) {
  const items = parseTopLevelLis(ulInner);
  const rows = items.map(item => {
    const nestedIdx = item.search(/<ul[^>]*>/);
    const lead = nestedIdx >= 0 ? item.slice(0, nestedIdx) : item;
    let note = '';
    if (nestedIdx >= 0) {
      const nestedMatch = item.slice(nestedIdx).match(/<ul[^>]*>\s*<li[^>]*>([\s\S]*?)<\/li>\s*<\/ul>/);
      if (nestedMatch) note = nestedMatch[1].trim();
    }
    const { leadStripped, pills } = stripTrailingPills(lead.replace(/<\/?p>/g, '').trim());
    const pctRaw = pills[0] || '';
    const status = pills[1] || '';
    const pct = parseInt(pctRaw, 10) || 0;
    const labelText = leadStripped.trim();
    const statusAttr = status ? ` data-s="${escAttr(status)}"` : '';
    const statusEl = status
      ? `<span class="chart-status"${statusAttr}>${status}</span>`
      : '<span class="chart-status-empty"></span>';
    const noteEl = note ? `<div class="progress-note">${note}</div>` : '';
    return `<div class="progress-row">` +
      `<div class="progress-label">${labelText}</div>` +
      `<div class="progress-track"><div class="progress-fill"${statusAttr} style="--pct:${pct}"><span class="progress-pct">${pctRaw}</span></div></div>` +
      statusEl +
      noteEl +
      `</div>`;
  }).join('');
  return `<div class="progress-bars">${rows}</div>`;
}

function buildTimelineSpine(olInner) {
  const items = parseTopLevelLis(olInner);
  const itemEls = items.map(item => {
    const nestedIdx = item.search(/<ul[^>]*>/);
    let lead = nestedIdx >= 0 ? item.slice(0, nestedIdx) : item;
    let body = '';
    if (nestedIdx >= 0) {
      const nestedMatch = item.slice(nestedIdx).match(/<ul[^>]*>\s*<li[^>]*>([\s\S]*?)<\/li>\s*<\/ul>/);
      if (nestedMatch) body = nestedMatch[1].trim();
    }
    lead = lead.replace(/<\/?p>/g, '').trim();
    const leadingMatch = lead.match(/^<code>([^<]+)<\/code>\s*/);
    const datePill = leadingMatch ? leadingMatch[1].trim() : '';
    if (leadingMatch) lead = lead.slice(leadingMatch[0].length);
    const { leadStripped, pills } = stripTrailingPills(lead);
    const statusPill = pills[0] || '';
    const title = leadStripped.trim();
    const dateEl = datePill
      ? `<div class="timeline-pill">${datePill}</div>`
      : '<div class="timeline-pill timeline-pill--empty"></div>';
    const statusEl = statusPill
      ? `<span class="chart-status" data-s="${escAttr(statusPill)}">${statusPill}</span>`
      : '';
    const bodyEl = body ? `<div class="timeline-body">${body}</div>` : '';
    return `<div class="timeline-item">` +
      `<div class="timeline-dot"></div>` +
      dateEl +
      `<div class="timeline-title">${title}</div>` +
      statusEl +
      bodyEl +
      `</div>`;
  }).join('');
  return `<div class="timeline-spine">${itemEls}</div>`;
}

// wrapLabelToLines, the SVG-native legend/spine geometry, AND the legend text
// helpers (svgText/xmlEsc — strip inline HTML then escape at emit) moved to
// ./svg-legend.js (buildSvgLegend), shared by all four keyed charts so they stay
// one family. buildPieChart passes raw label/value strings; the builder handles
// stripping + escaping.

function buildPieChart(ulInner, isDonut, orientation) {
  const items = parseTopLevelLis(ulInner);
  const parsed = items.map(item => {
    // A slice may carry an optional nested sublist — captured as present-mode
    // detail (the popover payload). Split it off the lead BEFORE reading the
    // label/value pill, the same way buildProgressBars / buildTimelineSpine do.
    const nestedIdx = item.search(/<ul[^>]*>/);
    const leadPart = nestedIdx >= 0 ? item.slice(0, nestedIdx) : item;
    let detail = '';
    if (nestedIdx >= 0) {
      // Depth-aware (like the dispatch) — a naive /<ul>…<\/ul>/ would stop at a
      // DEEPER </ul> and emit unbalanced markup that the string and DOM paths
      // would then disagree on.
      const ext = extractFirstList(item.slice(nestedIdx));
      if (ext) detail = ext.inner.trim();
    }
    const lead = leadPart.replace(/<\/?p>/g, '').trim();
    const { leadStripped, pills } = stripTrailingPills(lead);
    const valueRaw = pills[0] || '0';
    const numMatch = valueRaw.match(/[\d.]+/);
    const num = numMatch ? parseFloat(numMatch[0]) : 0;
    return { label: leadStripped.trim(), valueRaw, num, detail };
  });
  const total = parsed.reduce((s, p) => s + p.num, 0) || 1;

  // ── SVG-native legend via the shared family builder (svg-legend.js) ──────────
  // diagram + spine + key share ONE viewBox, so the WHOLE unit scales with the
  // container — the key never fights `cqh` in a CSS font-size. Swatch fill is the
  // slot's wedge tone with the matching --catN-ink edge; labels route through
  // --font-label in CSS so the sketch finish reskins them. The disc lives in a
  // fixed 200-tall box and is centred by the builder's diagramDy (the unit only
  // grows taller for a pathological long-tail key). See
  // engineering/decisions/2026-06-13-svg-native-legend.md.
  const DIAGRAM_H = 200;
  const DISC_R_EDGE = 180;               // disc right edge (cx 100 + R 80)
  const rows = parsed.map((p, idx) => {
    const slot = (idx % PIE_PALETTE.length) + 1;
    return {
      // 0-based slot in the categorical cycle — lets an a11y theme texture the
      // legend swatch to MATCH its wedge (`.wedge:nth-of-type(6n+…)`). Inert
      // otherwise (no rule keys off [data-cat] under a colour theme).
      cat: idx % PIE_PALETTE.length,
      swatchFill: `color-mix(in oklab, var(--chart-cat-${slot}-hue) 82%, var(--bg))`,
      swatchStroke: `var(--chart-cat-${slot}-ink)`,
      label: p.label,
      value: p.valueRaw,
    };
  });
  const key = buildSvgLegend({ rows, diagramRight: DISC_R_EDGE, diagramHeight: DIAGRAM_H, hasValues: true, orientation });

  const cx = 100, cy = DIAGRAM_H / 2, R = 80, r = 50;
  let cumul = 0;
  const defs = [];
  const wedges = parsed.map((p, idx) => {
    const startAngle = (cumul / total) * 2 * Math.PI;
    cumul += p.num;
    const endAngle = (cumul / total) * 2 * Math.PI;
    const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
    const x1 = (cx + R * Math.sin(startAngle)).toFixed(2);
    const y1 = (cy - R * Math.cos(startAngle)).toFixed(2);
    const x2 = (cx + R * Math.sin(endAngle)).toFixed(2);
    const y2 = (cy - R * Math.cos(endAngle)).toFixed(2);
    const slot = (idx % PIE_PALETTE.length) + 1;
    const hue = `var(--chart-cat-${slot}-hue)`;
    // Radar's principle, tuned for a solid proportion. The wedge rides the
    // vivid slot hue (--catN-hue — the canvas-saturated end radar strokes its
    // curves with), NOT the pale --catN-fill tint that read pastel, with a
    // hub→rim area-fade: lighter at the hub, vivid toward the rim. Denser than
    // radar's translucent overlay fill because pie wedges are opaque, abutting
    // part-to-whole areas (not stacked curves you must see through); the mix
    // with --bg keeps each stop opaque and flips the whole wedge with the
    // canvas. Same hue source + same area-fade language as radar.transform.js
    // and the quadrant tints — the three categorical charts read as one family.
    const gradId = `pie-wedge-${++PIE_GRAD_SEQ}`;
    // Solid-area finish — a radial hub→rim DOME, the SAME area-fade the quadrant
    // zones use (identical 42/58/82 stops toward --chart-cat-base), so the two
    // solid-area charts read as one family: lighter at the hub, vivid toward the
    // rim. --chart-cat-base is --bg on light, black on dark, so warm wedges stay
    // hue-true on the navy canvas instead of mudding into it. The --catN-ink
    // stroke (piechart.styles.css) carries the hue at the wedge edge.
    //
    // The dome is the BASE finish: solid-area charts radiate from a centre, so a
    // centre-out fade reads more naturally than a bar's vertical wash, and it
    // matches the quadrant. A flatter top→bottom wash (the bar-family finish) was
    // prototyped and is held as a documented FUTURE VARIANT — see
    // chart-family.style.md › "Fill finish (a future variant)".
    defs.push(`<radialGradient id="${gradId}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${R}">` +
      `<stop offset="0%" style="stop-color:color-mix(in oklab, ${hue} 42%, var(--chart-cat-base))"/>` +
      `<stop offset="62%" style="stop-color:color-mix(in oklab, ${hue} 58%, var(--chart-cat-base))"/>` +
      `<stop offset="100%" style="stop-color:color-mix(in oklab, ${hue} 82%, var(--chart-cat-base))"/>` +
      `</radialGradient>`);
    const wedgeFill = `url(#${gradId})`;
    if (isDonut) {
      const ix1 = (cx + r * Math.sin(startAngle)).toFixed(2);
      const iy1 = (cy - r * Math.cos(startAngle)).toFixed(2);
      const ix2 = (cx + r * Math.sin(endAngle)).toFixed(2);
      const iy2 = (cy - r * Math.cos(endAngle)).toFixed(2);
      const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
      return `<path class="wedge" data-slice="${idx}" style="fill:${wedgeFill}" d="${d}"/>`;
    }
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return `<path class="wedge" data-slice="${idx}" style="fill:${wedgeFill}" d="${d}"/>`;
  }).join('');

  // The disc lives in a fixed 200-tall box; the builder centres it (diagramDy) in
  // the unit, appends the spine + key rail to its right, and sets the viewBox.
  const svg = `<svg class="piechart-svg" viewBox="0 0 ${key.viewW} ${key.viewH}" role="img"><title>Pie chart</title>${key.desc}` +
    `<defs>${defs.join('')}${key.defs}</defs>` +
    `<g transform="translate(${key.diagramDx} ${key.diagramDy})">${wedges}</g>` +
    `${key.body}</svg>`;
  // Optional per-slice detail → present-mode popover payload. Emitted as inert
  // <template>s (render nothing, so the exported PDF/SVG is byte-identical and a
  // deck without sublists is unchanged); the present-mode layer reads them by
  // data-slice. Print rendering of the authored detail is a separate, export-
  // gated decision — see piechart.docs.md › "Per-slice detail".
  const details = parsed
    .map((p, idx) => p.detail
      ? `<template class="piechart-detail" data-slice="${idx}">${p.detail}</template>`
      : '')
    .join('');
  const detailWrap = details ? `<div class="piechart-details" hidden>${details}</div>` : '';
  return `<div class="piechart-figure">${svg}${detailWrap}</div>`;
}

// Depth-aware extractor for the first <ul>/<ol> in src. Tolerates attributes
// on opening tags (the engine adds data-tight, id, class, start, etc.).
// Returns { inner, start, end } or null. Unlike /<ul>([\s\S]*?)<\/ul>/ this
// correctly handles nested lists (the lazy regex stops at the first inner </ul>).
function extractFirstList(src) {
  // Find first <ul or <ol with optional attributes
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
    const end = matchListOpen(i);
    if (end > 0) { s = i; break; }
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

// Parse the time window declared in the eyebrow (e.g. "2026 Q1 → 2026 Q4").
// Returns { ticks: string[], colMap: {[tick]: 1-indexed-col} }.
function parseGanttWindow(text) {
  const m = text.match(/(.+?)\s*(?:→|–|->)\s*(.+)/);
  if (!m) return { ticks: [], colMap: {} };
  const norm = (s) => {
    const q = s.match(/Q[1-4]/i); if (q) return q[0].toUpperCase();
    const allM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mo = allM.find(mn => new RegExp(mn, 'i').test(s)); if (mo) return mo;
    return s.trim();
  };
  const start = norm(m[1].trim()), end = norm(m[2].trim());
  const allQ = ['Q1','Q2','Q3','Q4'];
  const allM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const qs = allQ.indexOf(start), qe = allQ.indexOf(end);
  const ms = allM.indexOf(start), me = allM.indexOf(end);
  let ticks;
  if (qs >= 0 && qe >= 0 && qe >= qs)      ticks = allQ.slice(qs, qe + 1);
  else if (ms >= 0 && me >= 0 && me >= ms) ticks = allM.slice(ms, me + 1);
  else return { ticks: [], colMap: {} };
  const colMap = {};
  ticks.forEach((t, i) => { colMap[t] = i + 1; });
  return { ticks, colMap };
}

// Parse a bar's range pill (e.g. "Q1 → Q2") into { col, span } (1-indexed).
function parseBarRange(pill, colMap) {
  const m = pill.match(/(.+?)\s*(?:→|–|->)\s*(.+)/);
  if (!m) return { col: 1, span: 1 };
  const norm = (s) => {
    const q = s.match(/Q[1-4]/i); if (q) return q[0].toUpperCase();
    const allM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mo = allM.find(mn => new RegExp(mn, 'i').test(s)); if (mo) return mo;
    return s.trim();
  };
  const sc = colMap[norm(m[1].trim())], ec = colMap[norm(m[2].trim())];
  if (!sc || !ec) return { col: 1, span: 1 };
  return { col: sc, span: ec - sc + 1 };
}

function buildGanttChart(ulInner, eyebrowText) {
  const { ticks, colMap } = parseGanttWindow(eyebrowText || '');
  const numCols = ticks.length || 4;
  const tickHtml = ticks.map(t => `<div class="gantt-tick">${t}</div>`).join('');
  const axisRow = `<div class="gantt-axis-row"><div class="gantt-axis-spacer"></div>` +
    `<div class="gantt-ticks">${tickHtml}</div></div>`;

  const swimlanes = parseTopLevelLis(ulInner);
  // Status is encoded by BAR COLOUR (green = done, amber = at-risk, …) with no
  // text on the bar, so a cold-open / emailed reader can't decode it. Collect
  // the statuses actually used and emit a key below the chart (see legend).
  const presentStatuses = new Set();
  const lanesHtml = swimlanes.map(lane => {
    const sub = extractFirstList(lane);
    const laneLabel = (sub ? lane.slice(0, sub.start) : lane)
      .replace(/<\/?p>/g, '').trim();
    let barsHtml = '';
    if (sub) {
      const barItems = parseTopLevelLis(sub.inner);
      barsHtml = barItems.map(barContent => {
        const bc = barContent.replace(/<\/?p>/g, '').trim();
        const { leadStripped, pills } = stripTrailingPills(bc);
        const rangePill  = pills.find(p => /→|–|->/.test(p)) || '';
        const statusPill = pills.find(p => !/→|–|->/.test(p)) || '';
        const { col, span } = rangePill ? parseBarRange(rangePill, colMap) : { col: 1, span: 1 };
        const sAttr = statusPill ? ` data-s="${escAttr(statusPill)}"` : '';
        if (statusPill && KB_STATUS.includes(statusPill.trim().toLowerCase())) {
          presentStatuses.add(statusPill.trim().toLowerCase());
        }
        return `<div class="gantt-bar"${sAttr} style="--gantt-col-start:${col};--gantt-col-span:${span}">` +
          `${leadStripped.trim()}</div>`;
      }).join('');
    }
    return `<div class="gantt-lane">` +
      `<div class="gantt-lane-label">${laneLabel}</div>` +
      `<div class="gantt-bars">${barsHtml}</div>` +
      `</div>`;
  }).join('');

  // Status key — a swatch + label per status present, in canonical order (the
  // piechart-legend idiom, placed below the chart). The swatch reuses the bar's
  // exact --fill-hue/--fill-ink, so a key chip and a bar of the same status
  // read identically. Empty when no bar carries a recognised status.
  const keyStatuses = KB_STATUS.filter(s => presentStatuses.has(s));
  const legendHtml = keyStatuses.length
    ? `<div class="gantt-legend" role="list" aria-label="Status key">` +
      keyStatuses.map(s =>
        `<span class="gantt-legend-item" role="listitem" data-s="${s}">` +
          `<span class="gantt-legend-swatch" aria-hidden="true"></span>` +
          `<span class="gantt-legend-label">${s}</span>` +
        `</span>`
      ).join('') +
      `</div>`
    : '';

  return `<div class="gantt-chart" style="--gantt-cols:${numCols}">${axisRow}${lanesHtml}${legendHtml}</div>`;
}

const KB_STATUS = ['on-track','done','live','at-risk','warn','blocked','fail','pilot','decision','deferred'];
const KB_SIZE   = ['s','m','l','xl'];
const KB_DONE_NAMES = ['done','completed','shipped','closed'];
// Lane colours ride the chart-family's own vivid catN spectrum (the same
// Apple-inspired hues pie/quadrant use), canvas-aware via --catN-ink — not
// the engine-wide --cN palette.
const LANE_COLOR_VARS = [
  'var(--chart-cat-1-ink)','var(--chart-cat-2-ink)','var(--chart-cat-3-ink)','var(--chart-cat-4-ink)',
  'var(--chart-cat-5-ink)','var(--chart-cat-6-ink)','var(--chart-cat-7-ink)','var(--chart-cat-8-ink)',
];

function buildKanbanBoard(ulInner) {
  const laneColorMap = {};
  let laneColorIdx = 0;
  const getLaneColor = (lane) => {
    if (!lane) return '';
    const key = lane.toLowerCase();
    if (!laneColorMap[key]) laneColorMap[key] = LANE_COLOR_VARS[laneColorIdx++ % LANE_COLOR_VARS.length];
    return laneColorMap[key];
  };

  const columns = parseTopLevelLis(ulInner);
  const columnsHtml = columns.map(col => {
    const colSub = extractFirstList(col);
    const colHeader = (colSub ? col.slice(0, colSub.start) : col)
      .replace(/<\/?p>/g, '').trim();
    const isDone = KB_DONE_NAMES.includes(colHeader.toLowerCase());

    let cardsHtml = '';
    if (colSub) {
      const cardItems = parseTopLevelLis(colSub.inner);
      cardsHtml = cardItems.map(cardContent => {
        const bodySub = extractFirstList(cardContent);
        const cardLead = (bodySub ? cardContent.slice(0, bodySub.start) : cardContent)
          .replace(/<\/?p>/g, '').trim();
        // Size: one trailing size code on the title line
        let size = '', cardTitle = cardLead;
        const sizeM = cardLead.match(/^([\s\S]*?)\s*<code>([^<]+)<\/code>\s*$/);
        if (sizeM && KB_SIZE.includes(sizeM[2].trim().toLowerCase())) {
          size = sizeM[2].trim().toUpperCase();
          cardTitle = sizeM[1].trim();
        }

        // Label + status: first sub-bullet (prose = label, trailing code = status)
        let label = '', status = '', cardBody = '';
        if (bodySub) {
          const subItems = parseTopLevelLis(bodySub.inner);
          if (subItems[0]) {
            const metaLine = subItems[0].replace(/<\/?p>/g, '').trim();
            const statM = metaLine.match(/^([\s\S]*?)\s*<code>([^<]+)<\/code>\s*$/);
            if (statM && KB_STATUS.includes(statM[2].trim().toLowerCase())) {
              status = statM[2].trim();
              label  = statM[1].replace(/<[^>]+>/g, '').trim();
            } else {
              label = metaLine.replace(/<[^>]+>/g, '').trim();
            }
          }
          cardBody = subItems[1] ? subItems[1].replace(/<\/?p>/g, '').trim() : '';
        }

        const laneColor = getLaneColor(label);
        const laneStyle = laneColor ? ` style="--lane-color:${laneColor}"` : '';
        const sAttr     = status ? ` data-s="${escAttr(status)}"` : '';
        const sizeEl    = size  ? `<span class="kanban-size">${size}</span>` : '';
        const laneEl    = label
          ? `<span class="kanban-lane" style="--lane-color:${laneColor || 'var(--accent)'}">${escAttr(label)}</span>`
          : '';
        const statusEl  = status
          ? `<span class="chart-status" data-s="${escAttr(status)}">${status}</span>`
          : '';
        const titleEl   = `<div class="kanban-card-title"><span class="kanban-title-text">${cardTitle}</span>${sizeEl}</div>`;
        const metaEl    = (laneEl || statusEl) ? `<div class="kanban-card-meta">${laneEl}${statusEl}</div>` : '';
        const bodyEl    = cardBody ? `<div class="kanban-card-body">${cardBody}</div>` : '';

        return `<div class="kanban-card"${sAttr}${laneStyle}>${titleEl}${metaEl}${bodyEl}</div>`;
      }).join('');
    }

    const doneAttr = isDone ? ' data-done' : '';
    return `<div class="kanban-column"${doneAttr}>` +
      `<div class="kanban-column-header">${colHeader}</div>` +
      `<div class="kanban-cards">${cardsHtml}</div>` +
      `</div>`;
  }).join('');

  return `<div class="kanban-board">${columnsHtml}</div>`;
}

/**
 * Transform a single section's inner HTML for the given chart layout.
 *
 * @param {string} innerHtml — the section's inner HTML (between <section> tags)
 * @param {string} cls — the section's space-separated class list
 * @returns {{ html: string, cls: string, transformed: boolean }}
 *          transformed=false if the layout is not a chart layout, or the
 *          section is missing the required h2/list — the inputs are returned
 *          verbatim and the caller should not splice anything back.
 */
// `orientation` is the deck-wide stamp ('portrait' | 'square' | undefined for
// landscape) read off the section's `data-orientation` — the single source both
// render paths already carry. Charts whose layout is baked into an SVG/viewBox
// (funnel today; the keyed radial/square charts next) use it to emit a tall
// composition for a portrait box. See 2026-06-19-chart-adaptive-sizing.md §7.
function transformChartSection(innerHtml, cls, orientation) {
  const classTokens = String(cls).trim().split(/\s+/);
  const chartLayout = CHART_LAYOUTS.find(l => classTokens.includes(l));
  if (!chartLayout) return { html: innerHtml, cls, transformed: false };
  // Idempotency: a section already wrapped in chart-frame is a no-op.
  if (classTokens.includes('chart-frame')) return { html: innerHtml, cls, transformed: false };

  let html = innerHtml;

  // the engine's renderer adds id="..." to headings and may add attributes
  // to <ul>/<ol>; the regexes below all tolerate optional attributes on
  // the opening tag. Lattice's own emulator emits attribute-free tags so
  // the same patterns work for both render paths.
  if (chartLayout === 'progress') {
    html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/, (_full, ulInner) => buildProgressBars(ulInner));
  } else if (chartLayout === 'timeline-list') {
    html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/, (_full, olInner) => buildTimelineSpine(olInner));
  } else if (chartLayout === 'piechart') {
    const isDonut = classTokens.includes('donut');
    // Depth-aware extraction (like gantt/kanban/radar) — a naive non-greedy
    // /<ul>…<\/ul>/ stops at a slice's NESTED </ul>, truncating the list. A
    // slice may now carry a nested sublist (present-mode detail), so the outer
    // list must be matched by depth, not by the first close tag.
    const ulExtract = extractFirstList(html);
    if (ulExtract) {
      const pieHtml = buildPieChart(ulExtract.inner, isDonut, orientation);
      html = html.slice(0, ulExtract.start) + pieHtml + html.slice(ulExtract.end);
    }
  } else if (chartLayout === 'gantt') {
    const eyeMatch = html.match(/<p[^>]*>\s*<code[^>]*>([^<]+?)<\/code>\s*<\/p>/);
    const ulExtract = extractFirstList(html);
    if (ulExtract) {
      const ganttHtml = buildGanttChart(ulExtract.inner, eyeMatch ? eyeMatch[1] : '');
      html = html.slice(0, ulExtract.start) + ganttHtml + html.slice(ulExtract.end);
    }
  } else if (chartLayout === 'kanban') {
    const ulExtract = extractFirstList(html);
    if (ulExtract) {
      const kanbanHtml = buildKanbanBoard(ulExtract.inner);
      html = html.slice(0, ulExtract.start) + kanbanHtml + html.slice(ulExtract.end);
    }
  } else if (chartLayout === 'radar') {
    const ulExtract = extractFirstList(html);
    if (ulExtract) {
      const variant = radar.pickVariant(classTokens);
      const isMinimal = classTokens.includes('minimal');
      const model = radar.parseRadar(ulExtract.inner, variant === 'quadrant');
      if (model) {
        const scale = radar.resolveScale(model, radar.matchEyebrowText(html));
        const figureHtml = radar.buildRadar(model, variant, scale, isMinimal, orientation);
        html = html.slice(0, ulExtract.start) + figureHtml + html.slice(ulExtract.end);
      }
    }
  } else if (chartLayout === 'quadrant') {
    const ulExtract = extractFirstList(html);
    if (ulExtract) {
      const variant = quadrant.pickVariant(classTokens);
      const model = quadrant.parseQuadrant(ulExtract.inner);
      if (model) {
        const scale = quadrant.resolveScale(model, quadrant.matchEyebrowText(html));
        const figureHtml = quadrant.buildQuadrant(model, variant, scale, orientation);
        html = html.slice(0, ulExtract.start) + figureHtml + html.slice(ulExtract.end);
      }
    }
  } else if (chartLayout === 'state-chart') {
    const olExtract = extractFirstList(html);
    if (olExtract) {
      const model = stateChart.parseStateChart(olExtract.inner);
      if (model) {
        // Pass the full class-token list: state-chart reads two orthogonal
        // axes — presentation (inline) and direction (lr / tb). `orientation`
        // lets a portrait deck force the vertical default over an `lr` machine
        // that can't fit a tall box (state-chart.transform.js §buildStateChart).
        const figureHtml = stateChart.buildStateChart(model, classTokens, orientation);
        html = html.slice(0, olExtract.start) + figureHtml + html.slice(olExtract.end);
      }
    }
  } else if (chartLayout === 'funnel') {
    const ulExtract = extractFirstList(html);
    if (ulExtract) {
      const model = funnel.parseFunnel(ulExtract.inner);
      if (model) {
        const figureHtml = funnel.buildFunnel(model, orientation);
        html = html.slice(0, ulExtract.start) + figureHtml + html.slice(ulExtract.end);
      }
    }
  } else if (chartLayout === 'map') {
    const ulExtract = extractFirstList(html);
    if (ulExtract) {
      const basemap = map.pickBasemap(classTokens);
      const model = map.parseMap(ulExtract.inner, basemap);
      if (model) {
        const variant = map.pickVariant(classTokens);
        const figureHtml = map.buildMap(model, variant, classTokens, orientation);
        html = html.slice(0, ulExtract.start) + figureHtml + html.slice(ulExtract.end);
      }
    }
  } else if (chartLayout === 'journey') {
    // The kernel rewrites the nested <ul> into a `.journey-board` in place,
    // leaving the h2 for the chart-frame wrap below to lift into the header.
    html = journey.transformJourneySection(html, cls, orientation);
  } else if (chartLayout === 'word-cloud') {
    // The kernel rewrites the first <ul> into a `.word-cloud-canvas` in place,
    // leaving the h2 for the chart-frame wrap below.
    html = wordCloud.transformWordCloudSection(html, cls);
  } else if (chartLayout === 'roadmap') {
    // On a PORTRAIT deck, auto-select the horizons card form: the wide table
    // letterboxes in a tall box (5+ columns crushed, header collisions), while
    // the phase cards stack into a clean top-to-bottom read. Adding the token to
    // `cls` drives BOTH the transpose (transformRoadmapSection reads it) AND the
    // section-class-gated card CSS (`section.roadmap.horizons`) — and it rides
    // into newCls below, so the live section carries the class. The CSS then
    // stacks the cards to one column box-locally. 2026-06-19-chart-adaptive-sizing §10.
    if (orientation === 'portrait' && !classTokens.includes('horizons')) {
      cls = (cls + ' horizons').trim();
    }
    // The kernel tags the table's cells (and transposes to .horizons under the
    // `horizons` variant) in place. Unlike the list-based members, roadmap's
    // body is a <table> / .horizons grid, so wrap it in a `.roadmap-figure`
    // div for the (div-based) chart-frame body matcher below.
    html = roadmap.transformRoadmapSection(html, cls);
    // Build the status-marker key from the now-tagged cells and tuck it inside
    // the figure (bottom-centre under the grid). Empty when no markers exist.
    // Only `status` opts out: its heavy treatment already prints SHIPPED /
    // IN FLIGHT / … on every cell, so a key is redundant. (`horizons` once
    // opted out too — its cards filled the body — but the horizons grid now
    // sizes to content and centres, freeing a key row; see roadmap.styles.css.)
    const skipKey = /\bstatus\b/.test(cls);
    const roadmapKey = skipKey ? '' : roadmap.buildStatusLegend(html);
    html = wrapRoadmapFigure(html, roadmapKey);
  }

  // Wrap in chart-frame skeleton (eyebrow / h2 / subtitle, body, caption).
  const h2RE = /<h2[^>]*>[\s\S]*?<\/h2>/;
  const h2Match = h2RE.exec(html);
  const bodyRE = /<div\s+class="(?:progress-bars|timeline-spine|piechart-figure|gantt-chart|kanban-board|radar-figure|quadrant-figure|state-chart-figure|funnel-figure|map-figure|journey-board|word-cloud-canvas|roadmap-figure)"[^>]*>/;
  const bodyMatch = h2Match && bodyRE.exec(html.slice(h2Match.index + h2Match[0].length));
  if (!h2Match || !bodyMatch) return { html: innerHtml, cls, transformed: false };

  const h2El = h2Match[0];
  const beforeH2 = html.slice(0, h2Match.index);
  const afterH2 = html.slice(h2Match.index + h2El.length);
  const bodyStart = bodyMatch.index;
  // Depth-aware close-tag scan to find the matching </div> for chart-body.
  let depth = 0, pos = bodyStart, end = -1;
  while (pos < afterH2.length) {
    if (afterH2.startsWith('<div', pos)) {
      const close = afterH2.indexOf('>', pos);
      if (close < 0) break;
      depth++; pos = close + 1;
    } else if (afterH2.startsWith('</div>', pos)) {
      depth--;
      if (depth === 0) { end = pos + 6; break; }
      pos += 6;
    } else { pos++; }
  }
  if (end <= 0) return { html: innerHtml, cls, transformed: false };

  const between = afterH2.slice(0, bodyStart);
  const bodyHtml = afterH2.slice(bodyStart, end);
  const afterBody = afterH2.slice(end);

  let eyebrowEl = '';
  let beforeRest = beforeH2;
  const eyeMatch = beforeH2.match(/<p[^>]*>\s*<code>([^<]+?)<\/code>\s*<\/p>\s*$/);
  if (eyeMatch) {
    eyebrowEl = `<p class="chart-eyebrow"><code>${eyeMatch[1]}</code></p>`;
    beforeRest = beforeH2.slice(0, eyeMatch.index);
  }

  let subtitleEl = '';
  const subMatch = between.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (subMatch) {
    subtitleEl = `<p class="chart-subtitle">${subMatch[1]}</p>`;
  }

  let captionEl = '';
  let afterRest = afterBody;
  // A `_footer` directive makes Marpit append `<footer>…</footer>` after the
  // user's trailing caption paragraph, so the caption is no longer at the end
  // of `afterBody` — the `\s*$` anchor below would miss it and the caption
  // would fall through as a raw full-width <p> at the slide edge (the bug:
  // engineering/gotchas.md "Chart caption swallowed when _footer is set").
  // Peel a trailing <footer> off first, match the caption against the
  // remainder, then re-append the footer so its order is preserved.
  const footerM = afterRest.match(/\s*<footer\b[\s\S]*?<\/footer>\s*$/);
  const trailingFooter = footerM ? footerM[0] : '';
  const captionScope = footerM ? afterRest.slice(0, footerM.index) : afterRest;
  const capMatch = captionScope.match(/<p[^>]*>([\s\S]*?)<\/p>\s*$/);
  if (capMatch) {
    let cap = capMatch[1];
    const emM = cap.match(/^<em>([\s\S]*)<\/em>$/);
    if (emM) cap = emM[1];
    captionEl = `<p class="chart-caption">${cap}</p>`;
    afterRest = captionScope.slice(0, capMatch.index) + trailingFooter;
  }

  const newHtml = beforeRest +
    `<div class="chart-header">` + eyebrowEl + h2El + subtitleEl + `</div>` +
    `<div class="chart-body">` + bodyHtml + `</div>` +
    captionEl +
    afterRest;

  const newCls = classTokens.includes('chart-frame')
    ? cls
    : (cls + ' chart-frame').trim();

  return { html: newHtml, cls: newCls, transformed: true };
}

/**
 * Transform every chart-family `<section>` in a Marpit `render()` HTML output.
 * Used by the owned engine (lib/engine) so the preview
 * renders the same DOM the export pipeline does, without any runtime script.
 *
 * The regex finds Marpit's slide sections — `<section id="N" ... class="..."
 * data-lattice-slide="N" ...>...</section>` — and rewrites those whose class
 * list contains a chart layout token. Sections that don't match a chart
 * layout pass through unchanged.
 */
function applyToRenderedHtml(html) {
  // Marpit emits each slide as <section id="N" class="..." data-lattice-slide="N" ...>
  // We need a depth-aware scan because nested <section> can appear in user content.
  let out = '';
  let i = 0;
  while (i < html.length) {
    const open = html.indexOf('<section', i);
    if (open < 0) { out += html.slice(i); break; }
    out += html.slice(i, open);
    const tagEnd = html.indexOf('>', open);
    if (tagEnd < 0) { out += html.slice(open); break; }
    const openTag = html.slice(open, tagEnd + 1);
    // Extract class attribute — must use single-class-attr semantics
    const classMatch = openTag.match(/\sclass="([^"]*)"/);
    const cls = classMatch ? classMatch[1] : '';
    // Deck-wide orientation stamp (absent → landscape, byte-identical). Read off
    // the same `data-orientation` the slide pipeline already wrote on the section.
    const orientMatch = openTag.match(/\sdata-orientation="([^"]*)"/);
    const orientation = orientMatch ? orientMatch[1] : undefined;
    const classTokens = cls.trim().split(/\s+/);
    const isChart = CHART_LAYOUTS.some(l => classTokens.includes(l));

    // Find the matching </section> (depth-aware)
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
      } else {
        pos++;
      }
    }
    if (closeEnd < 0) { out += html.slice(open); break; }
    const inner = html.slice(tagEnd + 1, closeEnd - '</section>'.length);

    if (!isChart) {
      out += html.slice(open, closeEnd);
      i = closeEnd;
      continue;
    }

    const { html: newInner, cls: newCls, transformed } = transformChartSection(inner, cls, orientation);
    if (!transformed) {
      out += html.slice(open, closeEnd);
      i = closeEnd;
      continue;
    }
    // Rebuild the open tag with the updated class attribute.
    let newOpenTag;
    if (classMatch) {
      newOpenTag = openTag.replace(/\sclass="[^"]*"/, ` class="${escAttr(newCls)}"`);
    } else {
      // Section had no class attribute (shouldn't happen for chart slides, but defensive).
      newOpenTag = openTag.replace(/<section/, `<section class="${escAttr(newCls)}"`);
    }
    out += newOpenTag + newInner + '</section>';
    i = closeEnd;
  }
  return out;
}

module.exports = {
  CHART_LAYOUTS,
  PIE_PALETTE,
  transformChartSection,
  applyToRenderedHtml,
  // Exposed for unit tests
  parseTopLevelLis,
  stripTrailingPills,
  buildProgressBars,
  buildTimelineSpine,
  buildPieChart,
  buildGanttChart,
  buildKanbanBoard,
  extractFirstList,
};
