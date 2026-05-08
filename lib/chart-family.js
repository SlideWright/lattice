/**
 * Chart-family DOM transform — shared between the build path
 * (lattice-emulator.js) and the Marp Core engine plugin (marp.config.js).
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
 * on the token stream. The engine plugin in marp.config.js wraps `render`
 * and post-processes the resulting `html` string.
 *
 * Why ship through the engine instead of relying on a runtime <script>?
 * VS Code Marp preview filters HTML elements through Marp's allowlist,
 * which excludes <script> by default. Even with `markdown.marp.html: "all"`,
 * relative-path resolution and webview CSP made the runtime path unreliable.
 * The engine wrapper bakes the transform into the rendered HTML, so the
 * preview and the export pipelines see the same DOM.
 */

const CHART_LAYOUTS = ['progress', 'timeline-list', 'piechart'];
const PIE_PALETTE = [
  'var(--cat-blue)',  'var(--cat-green)', 'var(--cat-purple)', 'var(--cat-orange)',
  'var(--cat-teal)',  'var(--cat-rose)',  'var(--cat-mauve)',  'var(--cat-slate)',
];

function escAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Walk a list's inner HTML and return its top-level `<li>` contents,
// tracking depth so a nested </li> doesn't terminate the outer item.
// Tolerates attributes on <li>, <ul>, <ol> (e.g. Marp Core renders
// ordered lists with `start="2"` for resumed numbering).
function parseTopLevelLis(inner) {
  const items = [];
  let depth = 0, liStart = -1, liContentStart = -1, i = 0;
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
      `<div class="progress-track"><div class="progress-fill"${statusAttr} style="--pct:${pct}"></div></div>` +
      `<div class="progress-pct">${pctRaw}</div>` +
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

function buildPieChart(ulInner, isDonut) {
  const items = parseTopLevelLis(ulInner);
  const parsed = items.map(item => {
    const lead = item.replace(/<\/?p>/g, '').trim();
    const { leadStripped, pills } = stripTrailingPills(lead);
    const valueRaw = pills[0] || '0';
    const numMatch = valueRaw.match(/[\d.]+/);
    const num = numMatch ? parseFloat(numMatch[0]) : 0;
    return { label: leadStripped.trim(), valueRaw, num };
  });
  const total = parsed.reduce((s, p) => s + p.num, 0) || 1;
  const cx = 100, cy = 100, R = 80, r = 50;
  let cumul = 0;
  const wedges = parsed.map((p, idx) => {
    const startAngle = (cumul / total) * 2 * Math.PI;
    cumul += p.num;
    const endAngle = (cumul / total) * 2 * Math.PI;
    const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
    const x1 = (cx + R * Math.sin(startAngle)).toFixed(2);
    const y1 = (cy - R * Math.cos(startAngle)).toFixed(2);
    const x2 = (cx + R * Math.sin(endAngle)).toFixed(2);
    const y2 = (cy - R * Math.cos(endAngle)).toFixed(2);
    const fill = PIE_PALETTE[idx % PIE_PALETTE.length];
    if (isDonut) {
      const ix1 = (cx + r * Math.sin(startAngle)).toFixed(2);
      const iy1 = (cy - r * Math.cos(startAngle)).toFixed(2);
      const ix2 = (cx + r * Math.sin(endAngle)).toFixed(2);
      const iy2 = (cy - r * Math.cos(endAngle)).toFixed(2);
      const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
      return `<path class="wedge" style="fill:${fill}" d="${d}"/>`;
    }
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return `<path class="wedge" style="fill:${fill}" d="${d}"/>`;
  }).join('');
  const svg = `<svg class="piechart-svg" viewBox="0 0 200 200" role="img" aria-hidden="true">${wedges}</svg>`;
  const legendItems = parsed.map((p, idx) => {
    const fill = PIE_PALETTE[idx % PIE_PALETTE.length];
    return `<li>` +
      `<span class="legend-swatch" style="background:${fill}"></span>` +
      `<span class="legend-label">${p.label}</span>` +
      `<span class="legend-pct">${p.valueRaw}</span>` +
      `</li>`;
  }).join('');
  const legend = `<ol class="piechart-legend">${legendItems}</ol>`;
  return `<div class="piechart-figure">${svg}${legend}</div>`;
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
function transformChartSection(innerHtml, cls) {
  const classTokens = String(cls).trim().split(/\s+/);
  const chartLayout = CHART_LAYOUTS.find(l => classTokens.includes(l));
  if (!chartLayout) return { html: innerHtml, cls, transformed: false };
  // Idempotency: a section already wrapped in chart-frame is a no-op.
  if (classTokens.includes('chart-frame')) return { html: innerHtml, cls, transformed: false };

  let html = innerHtml;

  // Marp Core's renderer adds id="..." to headings and may add attributes
  // to <ul>/<ol>; the regexes below all tolerate optional attributes on
  // the opening tag. Lattice's own emulator emits attribute-free tags so
  // the same patterns work for both render paths.
  if (chartLayout === 'progress') {
    html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/, (_full, ulInner) => buildProgressBars(ulInner));
  } else if (chartLayout === 'timeline-list') {
    html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/, (_full, olInner) => buildTimelineSpine(olInner));
  } else if (chartLayout === 'piechart') {
    const isDonut = classTokens.includes('donut');
    html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/, (_full, ulInner) => buildPieChart(ulInner, isDonut));
  }

  // Wrap in chart-frame skeleton (eyebrow / h2 / subtitle, body, caption).
  const h2RE = /<h2[^>]*>[\s\S]*?<\/h2>/;
  const h2Match = h2RE.exec(html);
  const bodyRE = /<div\s+class="(?:progress-bars|timeline-spine|piechart-figure)"[^>]*>/;
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
  const capMatch = afterBody.match(/<p[^>]*>([\s\S]*?)<\/p>\s*$/);
  if (capMatch) {
    let cap = capMatch[1];
    const emM = cap.match(/^<em>([\s\S]*)<\/em>$/);
    if (emM) cap = emM[1];
    captionEl = `<p class="chart-caption">${cap}</p>`;
    afterRest = afterBody.slice(0, capMatch.index);
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
 * Used by the Marp Core engine plugin in marp.config.js so the preview
 * renders the same DOM the export pipeline does, without any runtime script.
 *
 * The regex finds Marpit's slide sections — `<section id="N" ... class="..."
 * data-marpit-slide="N" ...>...</section>` — and rewrites those whose class
 * list contains a chart layout token. Sections that don't match a chart
 * layout pass through unchanged.
 */
function applyToRenderedHtml(html) {
  // Marpit emits each slide as <section id="N" class="..." data-marpit-slide="N" ...>
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

    const { html: newInner, cls: newCls, transformed } = transformChartSection(inner, cls);
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
};
