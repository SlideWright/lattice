/**
 * funnel chart kernel — parsing + SVG geometry for the `funnel` chart-family
 * member. A vertical stack of centred trapezoids whose width is proportional
 * to each stage's value, with the stage-to-stage conversion rate printed in
 * the gaps. The drop-off is the read.
 *
 * Shape (one default, no variants today):
 *   ## Heading.
 *   - Stage label `value`
 *   - Next stage   `value`
 *
 * Each `<li>` is one stage: lead text = label, trailing inline-code = the
 * value (any number; commas/units tolerated). Stages render top-to-bottom in
 * authored order; the widest value sets full width.
 *
 * Like radar / quadrant / state-chart this is a kernel MODULE consumed by the
 * single chart-family dispatcher (lib/components/chart/_chart-family/
 * chart-family.js), which the registry adapter routes to all three render
 * paths (marp.config.js, lattice-emulator.js, lib/runtime/index.js). Write
 * once, render everywhere. Palette stays in CSS: bands carry a `--i` index and
 * the text uses classes styled in funnel.styles.css, so the kernel emits no
 * hard-coded colour.
 */

const GEOM = {
  viewBox: '0 0 320 180',
  top: 16,
  bottom: 172,
  cx: 160, // funnel centre = viewBox centre, so the bands sit on the slide's
           // optical centre; labels (left) and values (right) flank symmetrically
           // (was 188, which pushed the whole composition right-of-centre).
  fullW: 150, // widest band spans cx ± fullW/2  → x 85 … 235
  labelX: 76, // right edge of the left-hand label column (text-anchor end)
  valueX: 244, // left edge of the right-hand value column (text-anchor start)
  gap: 12, // vertical gap between bands, where the conversion % sits
  minW: 14, // floor so a tiny stage still renders a visible band
};

// Walk a <ul> inner HTML and return its top-level <li> contents (depth-aware
// so a nested list can't terminate the outer item). Mirrors parseTopLevelLis
// in chart-family.js; kept local to keep the kernel self-contained.
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

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/**
 * Parse the stage list into a model. Returns null when there's nothing to
 * draw (so the dispatcher leaves the section untouched and the chart-frame
 * wrap bails — same contract as the other kernels).
 */
function parseFunnel(ulInner) {
  const stages = topLevelLis(ulInner).map((item) => {
    const lead = item.replace(/<\/?p>/g, '').trim();
    const m = lead.match(/^([\s\S]*?)\s*<code>([^<]+)<\/code>\s*$/);
    const label = stripTags(m ? m[1] : lead);
    const valueRaw = m ? m[2].trim() : '';
    const numMatch = valueRaw.replace(/,/g, '').match(/-?[\d.]+/);
    const num = numMatch ? parseFloat(numMatch[0]) : 0;
    return { label, valueRaw, num };
  }).filter((s) => s.label || s.valueRaw);
  if (stages.length < 2) return null;
  const maxNum = stages.reduce((m, s) => Math.max(m, s.num), 0) || 1;
  return { stages, maxNum };
}

function buildFunnel(model) {
  const { stages, maxNum } = model;
  const n = stages.length;
  const { top, bottom, cx, fullW, labelX, valueX, gap, minW } = GEOM;
  const bandH = (bottom - top - (n - 1) * gap) / n;
  const widthFor = (num) => Math.max(minW, (num / maxNum) * fullW);

  const parts = [];
  for (let i = 0; i < n; i++) {
    const s = stages[i];
    const y0 = top + i * (bandH + gap);
    const y1 = y0 + bandH;
    const yMid = (y0 + y1) / 2;
    const topW = widthFor(s.num);
    const botW = i < n - 1 ? widthFor(stages[i + 1].num) : topW;
    const pts = [
      [cx - topW / 2, y0], [cx + topW / 2, y0],
      [cx + botW / 2, y1], [cx - botW / 2, y1],
    ].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

    parts.push(`<polygon class="funnel-band" style="--i:${i}" points="${pts}"/>`);
    // Stage label flanks the band on the left; its value on the right. Both
    // sit on the canvas (not on the coloured band) so contrast is never at the
    // mercy of the fill ramp or a narrow band.
    if (s.label) parts.push(`<text class="funnel-label" x="${labelX}" y="${yMid.toFixed(1)}">${esc(s.label)}</text>`);
    if (s.valueRaw) parts.push(`<text class="funnel-value" x="${valueX}" y="${yMid.toFixed(1)}">${esc(s.valueRaw)}</text>`);

    // Conversion rate to the next stage, printed in the gap below this band.
    if (i < n - 1) {
      const prev = s.num, next = stages[i + 1].num;
      if (prev > 0) {
        const pct = Math.round((next / prev) * 100);
        parts.push(`<text class="funnel-conv" x="${cx}" y="${(y1 + gap / 2).toFixed(1)}">${pct}%</text>`);
      }
    }
  }

  const svg = `<svg class="funnel-svg" viewBox="${GEOM.viewBox}" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">${parts.join('')}</svg>`;
  return `<div class="funnel-figure" style="--funnel-stages:${n}">${svg}</div>`;
}

module.exports = { parseFunnel, buildFunnel, GEOM };
