/**
 * map kernel — parsing + SVG assembly for the `map` chart-family member, the
 * one component on the `spatial` form: regions placed by real-world geography
 * (a basemap), not by a grid or axis. A value (or category) per named region,
 * authored with the same series DSL the other charts use.
 *
 * Shape:
 *   ## Heading.
 *   - California `4.2`
 *   - Texas `3.1`
 *
 * Each `<li>` is one region: lead text = the region name (case/alias-tolerant
 * — `California` / `CA` / `Calif.` all resolve), trailing inline-code = the
 * value. Names the basemap can't match are REPORTED, not dropped: they land in
 * a `data-unmatched` attribute on the figure (the gallery test asserts it) and
 * in a muted legend row, so an author sees the typo instead of a silent gap.
 *
 * Two read modes (variants):
 *   - choropleth (default) — fill each named region on a sequential single-hue
 *     ramp off --cat1-hue (light→dark = low→high), exactly like funnel's band
 *     ramp. For "how much, where".
 *   - highlight (`map highlight`) — categorical: each named region takes a
 *     --catN slot; unnamed regions stay neutral. For "which ones". No magnitude.
 *
 * Like radar / quadrant / state-chart / funnel this is a kernel MODULE consumed
 * by the single chart-family dispatcher (lib/components/chart/_chart-family/
 * chart-family.js), which the registry adapter routes to all three render paths
 * (marp.config.js, lattice-emulator.js, lib/runtime/index.js). Write once,
 * render everywhere. Palette stays in CSS: the kernel emits only a `--mix`
 * percentage (choropleth) or a `--region-hue` var-reference (highlight) plus
 * marker classes styled in map.styles.css — no hard-coded colour.
 *
 * The basemap geometry (baked, projected SVG path data keyed by region id) is
 * the one large fixed asset in the catalog. It is generated, not hand-traced —
 * see tools/build-basemap.js and map.basemap.json. It ships inline in the
 * emulator/runtime JS bundles (never in dist/lattice.css, which carries only
 * the colour rules), preserving the zero-fetch contract.
 */

const BASEMAP = require('./map.basemap.json');

// Choropleth ramp endpoints, as color-mix percentages of --cat1-hue into the
// canvas. Floor keeps even the lowest region visibly tinted; ceiling stops
// short of full saturation so the hue stays legible against region borders.
const MIX_FLOOR = 24;
const MIX_CEIL = 88;
// Categorical slot cap for highlight mode — the same six-hue perceptual cap
// (Wong 2011) the rest of the chart family rotates through.
const CAT_SLOTS = 6;

// Walk a <ul> inner HTML and return its top-level <li> contents (depth-aware
// so a nested list can't terminate the outer item). Mirrors topLevelLis in
// funnel.transform.js / parseTopLevelLis in chart-family.js; kept local to
// keep the kernel self-contained.
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

// Normalize an author-supplied region name to the index key: lowercase, drop
// periods + apostrophes, collapse whitespace. "Calif." → "calif", "N.Y." →
// "ny", "  New York " → "new york".
function normName(s) {
  return String(s).toLowerCase().replace(/[.’']/g, '').replace(/\s+/g, ' ').trim();
}

// Build (and memoize) the name→postal index for a basemap: postal id, full
// name, and every curated alias, all normalized.
const _indexCache = new WeakMap();
function regionIndex(basemap) {
  if (_indexCache.has(basemap)) return _indexCache.get(basemap);
  const index = {};
  for (const [postal, r] of Object.entries(basemap.regions)) {
    index[normName(postal)] = postal;
    index[normName(r.name)] = postal;
  }
  for (const [alias, postal] of Object.entries(basemap.aliases || {})) {
    index[normName(alias)] = postal;
  }
  _indexCache.set(basemap, index);
  return index;
}

/** Pick the read-mode variant from the section's class tokens. */
function pickVariant(classTokens) {
  return classTokens.includes('highlight') ? 'highlight' : 'choropleth';
}

/**
 * Resolve which basemap a section's class tokens select. v1 ships one
 * (`us`); `us` is the default so a bare `map` works, and the token is
 * accepted for forward-compatibility with a future `world` basemap.
 */
function pickBasemap(_classTokens) {
  return BASEMAP;
}

/**
 * Parse the region list into a model. Returns null only when there is nothing
 * to draw (no list items) — an all-unmatched list still returns a model so the
 * basemap renders and the unmatched names are reported.
 */
function parseMap(ulInner, basemap = BASEMAP) {
  const index = regionIndex(basemap);
  const rows = topLevelLis(ulInner).map((item) => {
    const lead = item.replace(/<\/?p>/g, '').trim();
    const m = lead.match(/^([\s\S]*?)\s*<code>([^<]+)<\/code>\s*$/);
    const name = stripTags(m ? m[1] : lead);
    const valueRaw = m ? m[2].trim() : '';
    const numMatch = valueRaw.replace(/,/g, '').match(/-?[\d.]+/);
    const num = numMatch ? parseFloat(numMatch[0]) : 0;
    const postal = index[normName(name)] || null;
    return { name, valueRaw, num, postal };
  }).filter((r) => r.name || r.valueRaw);
  if (rows.length === 0) return null;

  const matched = rows.filter((r) => r.postal);
  const unmatched = rows.filter((r) => !r.postal);
  // Dedupe matched on postal (last value wins) so a duplicated region doesn't
  // double-fill; keep first-seen order for highlight slot assignment.
  const seen = new Set();
  const ordered = [];
  for (const r of matched) {
    if (seen.has(r.postal)) {
      const prev = ordered.find((x) => x.postal === r.postal);
      prev.valueRaw = r.valueRaw; prev.num = r.num; continue; // last value wins
    }
    seen.add(r.postal); ordered.push({ ...r });
  }
  const nums = ordered.map((r) => r.num);
  const minNum = nums.length ? Math.min(...nums) : 0;
  const maxNum = nums.length ? Math.max(...nums) : 0;
  return { basemap, matched: ordered, unmatched, minNum, maxNum };
}

// Choropleth ramp position (color-mix %) for a value within [min,max]. A flat
// series (min===max) pins to the ceiling so a single-value map still reads.
function rampMix(num, minNum, maxNum) {
  if (maxNum <= minNum) return MIX_CEIL;
  const t = (num - minNum) / (maxNum - minNum);
  return Math.round(MIX_FLOOR + t * (MIX_CEIL - MIX_FLOOR));
}

function buildMap(model, variant) {
  const { basemap, matched, unmatched, minNum, maxNum } = model;
  const fillByPostal = new Map(); // postal → { className, style }
  const legendRows = [];

  if (variant === 'highlight') {
    matched.forEach((r, i) => {
      const slot = (i % CAT_SLOTS) + 1;
      const style = `--region-hue:var(--cat${slot}-hue)`;
      fillByPostal.set(r.postal, { cls: 'map-region map-region--hl', style });
      legendRows.push({ swatchCls: 'map-swatch map-swatch--hl', style, name: r.name, value: r.valueRaw });
    });
  } else {
    // choropleth — legend ordered high→low so the ramp reads top-to-bottom.
    const sorted = [...matched].sort((a, b) => b.num - a.num);
    for (const r of sorted) {
      const mix = rampMix(r.num, minNum, maxNum);
      const style = `--mix:${mix}%`;
      fillByPostal.set(r.postal, { cls: 'map-region map-region--on', style });
      legendRows.push({ swatchCls: 'map-swatch map-swatch--on', style, name: r.name, value: r.valueRaw });
    }
  }

  // Draw every basemap region; named ones carry their fill class + style,
  // the rest stay neutral. Region order is basemap order (stable).
  const paths = Object.entries(basemap.regions).map(([postal, r]) => {
    const fill = fillByPostal.get(postal);
    const cls = fill ? fill.cls : 'map-region';
    const style = fill ? ` style="${fill.style}"` : '';
    return `<path class="${cls}"${style} d="${r.d}"><title>${esc(r.name)}</title></path>`;
  }).join('');

  const svg = `<svg class="map-svg" viewBox="${basemap.viewBox}" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">${paths}</svg>`;

  // Legend — one row per named region (swatch · name · value), plus a muted
  // row per unmatched name so the author sees the miss in the rendered slide.
  const legendItems = legendRows.map((row) =>
    `<li class="map-legend-row">` +
    `<span class="${row.swatchCls}" style="${row.style}"></span>` +
    `<span class="map-legend-name">${esc(row.name)}</span>` +
    (row.value ? `<span class="map-legend-value">${esc(row.value)}</span>` : '') +
    `</li>`,
  ).join('');
  const unmatchedItems = unmatched.map((r) =>
    `<li class="map-legend-row map-legend-row--unmatched">` +
    `<span class="map-swatch map-swatch--unmatched"></span>` +
    `<span class="map-legend-name">${esc(r.name)}</span>` +
    `<span class="map-legend-value">?</span>` +
    `</li>`,
  ).join('');
  const legend = (legendItems || unmatchedItems)
    ? `<ul class="map-legend">${legendItems}${unmatchedItems}</ul>`
    : '';

  const unmatchedAttr = unmatched.length
    ? ` data-unmatched="${esc(unmatched.map((r) => r.name).join(', '))}"`
    : '';

  return `<div class="map-figure" data-basemap="${esc(basemap.id)}"${unmatchedAttr}>${svg}${legend}</div>`;
}

module.exports = { parseMap, buildMap, pickVariant, pickBasemap, normName, regionIndex, BASEMAP, MIX_FLOOR, MIX_CEIL };
