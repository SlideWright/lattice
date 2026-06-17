/**
 * svg-legend.js — the shared SVG-native legend + spine builder for the four
 * KEYED chart-family charts (piechart · radar · map · cohort quadrant).
 *
 * Why a shared module (not three copies): the whole point of going SVG-native is
 * that diagram + spine + key live in ONE viewBox and scale as one unit. For the
 * four charts to read as ONE FAMILY (identical key size, swatch, divider, row
 * rhythm) they must emit the SAME geometry — so it lives here once and each
 * kernel calls it. It is the SVG successor to the pure-CSS 70/30 rail that
 * chart-family.css used to key on the figure/legend classes.
 *
 * Pure JS — no DOM, no font metrics — so it runs identically in all three render
 * paths (HARD RULE 1): the emulator build, the marp-cli engine plugin, and the
 * vscode runtime all bundle this module from the same source.
 *
 * THE FAMILY RULE — font size is a RATIO of the diagram height, never a constant.
 * Each chart's diagram has its own viewBox height (pie 200, radar 300, quadrant
 * 320, map varies). When a figure is sized to fit the body, its viewBox HEIGHT
 * maps to the body height, so a taller viewBox scales DOWN more. A constant key
 * font in user units would therefore render PHYSICALLY SMALLER on radar than on
 * pie. Pinning the font to a fixed fraction of the diagram height
 * (`FS = 0.045 · height`, i.e. pie's tuned FS=9 at height 200) makes the key the
 * same physical size on all four. Every other metric (gaps, swatch, rail width)
 * is then a ratio of that font, so the rail proportion is constant too.
 *
 * See engineering/decisions/2026-06-13-svg-native-legend.md (§2, §4a, §3).
 */

// ── Family constants ────────────────────────────────────────────────────────
// FS is a fraction of the diagram viewBox height (the family rule above); every
// other metric is a ratio of FS. The anchors are the piechart spike's tuned
// values (FS=9 at height 200), so the family inherits the look the pie shipped.
const FS_OF_HEIGHT = 9 / 200;     // 0.045 — legend font as a fraction of height
const LH_R = 1.16;                // line height / FS
const ROW_GAP_R = 0.72;           // inter-row gap / FS
const SW_R = 1.04;                // swatch edge / FS
const GAP_R = 32 / 9;             // divider gap, each side of the spine / FS
const MARGIN_Y_R = 0.9;           // top/bottom breathing room / FS
const SWATCH_GAP_R = 5 / 9;       // swatch → label gap / FS
const LABEL_COL_R = 9.2;          // label column width / FS
const VALUE_COL_R = 3.0;          // value column width / FS (≈ "100%")
const RIGHT_PAD_R = 0.9;          // rail right padding / FS
const AVG_ADVANCE_R = 0.6;        // CONSERVATIVE average glyph advance / FS — the
                                  // wrap budget breaks EARLY (no font metrics in a
                                  // pure kernel), so a label never overruns the rail.
const SPINE_H_R = 0.78;           // spine height / viewH
const SPINE_W_R = 1.6 / 9;        // spine width / FS (pie spineW 1.6 at FS 9)
const STROKE_W_R = 0.09;          // swatch stroke width / SW

// Shared unique-id counter for the spine gradient — unique per chart instance so
// two keyed charts on one slide don't collide (the SVG duplicate-id trap). Both
// render paths bundle this module and process charts in the same order, so the
// ids match for the parity tier. Sibling: PIE_GRAD_SEQ in chart-family.js.
let SPINE_SEQ = 0;

function xmlEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Strip any HTML tags BEFORE wrapping/escaping, so a label counts by its visible
// length and can never be cut mid-tag nor break the SVG. (Mirror of
// chart-family.js svgText — kept local so this module is self-contained.)
function stripTags(s) {
  return String(s == null ? '' : s).replace(/<[^>]*>/g, '');
}

// Word-wrap a legend label to a character budget — FULLY, never clipping and
// never ellipsizing (the original HTML key's "labels wrap, no clip — if users go
// crazy" guarantee). The SVG-native key keeps the promise because more lines just
// grow the unit HEIGHT (which scales the whole unit down), never overflow. A
// single over-long token hard-breaks across lines (matching CSS overflow-wrap).
// See engineering/decisions/2026-06-13-svg-native-legend.md §4(a).
function wrapLabelToLines(label, maxChars) {
  const words = String(label).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let cur = '';
  const flush = () => { if (cur) { lines.push(cur); cur = ''; } };
  for (let word of words) {
    while (word.length > maxChars) {
      flush();
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    const trial = cur ? `${cur} ${word}` : word;
    if (trial.length <= maxChars) cur = trial;
    else { flush(); cur = word; }
  }
  flush();
  return lines.length ? lines : [''];
}

/**
 * Build the SVG-native legend rail (swatches · wrapping labels · optional values)
 * plus the gradient spine, laid out to the RIGHT of the diagram in shared viewBox
 * units. The caller composes the final <svg>:
 *
 *   <svg viewBox="0 0 {viewW} {viewH}">
 *     <defs>{diagramDefs}{legend.defs}</defs>
 *     <g transform="translate(0 {diagramDy})">{diagramInner}</g>
 *     {legend.body}
 *   </svg>
 *
 * @param {object}  o
 * @param {Array}   o.rows          row models, top to bottom. Each is either
 *                                  { swatchFill, swatchStroke?, label, value? } or
 *                                  { head: true, label } (a group heading — no swatch).
 * @param {number}  o.diagramRight  x of the diagram's right content edge (rail starts after a gap).
 * @param {number}  o.diagramHeight the diagram viewBox height (sets the font ratio).
 * @param {boolean} [o.hasValues]   reserve a right-aligned value column (default true).
 * @returns {{ defs:string, body:string, viewW:number, viewH:number, diagramDy:number, fs:number }}
 */
function buildSvgLegend({ rows, diagramRight, diagramHeight, hasValues = true }) {
  const FS = +(FS_OF_HEIGHT * diagramHeight).toFixed(3);
  const LH = FS * LH_R;
  const ROW_GAP = FS * ROW_GAP_R;
  const SW = FS * SW_R;
  const GAP = FS * GAP_R;

  const spineX = diagramRight + GAP;
  const swatchX = spineX + GAP;
  const labelX = swatchX + SW + FS * SWATCH_GAP_R;
  const valueColW = hasValues ? FS * VALUE_COL_R : 0;
  // A no-value chart (radar) lets its labels reclaim the would-be value column.
  const labelAvail = FS * LABEL_COL_R + (hasValues ? 0 : FS * VALUE_COL_R);
  const labelRight = labelX + labelAvail;
  const valueX = labelRight + valueColW;            // right anchor for value text
  const viewW = Math.ceil((hasValues ? valueX : labelRight) + FS * RIGHT_PAD_R);
  const maxChars = Math.max(5, Math.floor(labelAvail / (FS * AVG_ADVANCE_R)));

  // Measure first: wrap every label, sum the column height, so the unit grows in
  // HEIGHT for a long-tail key (never re-shrinking the font vs the diagram).
  const measured = rows.map((row) => {
    if (row.head) return { head: true, label: stripTags(row.label), lines: [stripTags(row.label)] };
    const lines = wrapLabelToLines(stripTags(row.label), maxChars);
    return {
      swatchFill: row.swatchFill,
      swatchStroke: row.swatchStroke || null,
      // Optional 0-based categorical slot — emitted as data-cat so an a11y theme
      // can texture the swatch to match its wedge. Absent for un-keyed legends.
      cat: row.cat,
      value: row.value != null ? stripTags(row.value) : null,
      lines,
    };
  });
  const rowHeights = measured.map((m) => Math.max(m.head ? FS : SW, (m.lines.length - 1) * LH + FS));
  const stackH = rowHeights.reduce((s, h) => s + h, 0) + ROW_GAP * Math.max(0, measured.length - 1);

  const viewH = Math.max(diagramHeight, Math.ceil(stackH + FS * MARGIN_Y_R * 2));
  const diagramDy = +((viewH - diagramHeight) / 2).toFixed(2);

  // ── rows ──────────────────────────────────────────────────────────────────
  let y = (viewH - stackH) / 2;
  const body = [];
  measured.forEach((m, i) => {
    const rowTop = y;
    y += rowHeights[i] + ROW_GAP;
    const baseFirst = rowTop + FS;                  // first-line text baseline
    const tspans = m.lines.map((ln, li) =>
      `<tspan x="${labelX.toFixed(2)}" y="${(baseFirst + li * LH).toFixed(2)}">${xmlEsc(ln)}</tspan>`).join('');
    if (m.head) {
      // Group heading (map) — label voice, no swatch, sat at the swatch inset.
      body.push(`<text class="chart-key-head" font-size="${FS.toFixed(2)}"><tspan x="${swatchX.toFixed(2)}" y="${baseFirst.toFixed(2)}">${xmlEsc(m.lines[0])}</tspan></text>`);
      return;
    }
    // Swatch centres on the FIRST line's optical middle (a wrapped 2–3 line label
    // still reads as one keyed row).
    const swatchY = baseFirst - FS * 0.34 - SW / 2;
    const stroke = m.swatchStroke
      ? ` stroke="${m.swatchStroke}" stroke-width="${(SW * STROKE_W_R).toFixed(2)}"`
      : '';
    const catAttr = m.cat != null ? ` data-cat="${m.cat}"` : '';
    body.push(
      `<rect class="chart-key-swatch"${catAttr} x="${swatchX.toFixed(2)}" y="${swatchY.toFixed(2)}" ` +
        `width="${SW.toFixed(2)}" height="${SW.toFixed(2)}" rx="${(SW * 0.22).toFixed(2)}" ` +
        `fill="${m.swatchFill}"${stroke}/>` +
      `<text class="chart-key-label" font-size="${FS.toFixed(2)}">${tspans}</text>` +
      (m.value != null
        ? `<text class="chart-key-value" font-size="${FS.toFixed(2)}" x="${valueX.toFixed(2)}" ` +
          `y="${baseFirst.toFixed(2)}" text-anchor="end">${xmlEsc(m.value)}</text>`
        : ''));
  });

  // ── spine ───────────────────────────────────────────────────────────────────
  // SVG mirror of the CSS `--chart-spine`: an accent fade transparent at both
  // ends so it melts into the canvas (a rule, not a hard divider). SVG fill can't
  // take a CSS gradient var, hence inline stops.
  const spineId = `chart-spine-${++SPINE_SEQ}`;
  const spineH = viewH * SPINE_H_R;
  const spineY = (viewH - spineH) / 2;
  const spineW = FS * SPINE_W_R;
  const defs =
    `<linearGradient id="${spineId}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" style="stop-color:transparent"/>` +
      `<stop offset="14%" style="stop-color:color-mix(in oklab, var(--accent) 32%, transparent)"/>` +
      `<stop offset="50%" style="stop-color:color-mix(in oklab, var(--accent) 60%, transparent)"/>` +
      `<stop offset="86%" style="stop-color:color-mix(in oklab, var(--accent) 32%, transparent)"/>` +
      `<stop offset="100%" style="stop-color:transparent"/></linearGradient>`;
  body.push(
    `<rect x="${(spineX - spineW / 2).toFixed(2)}" y="${spineY.toFixed(2)}" ` +
      `width="${spineW.toFixed(2)}" height="${spineH.toFixed(2)}" rx="${(spineW / 2).toFixed(2)}" ` +
      `fill="url(#${spineId})"/>`);

  // Accessibility: the key text now lives inside an SVG that the kernels mark
  // `role="img"` — which would otherwise collapse the whole chart to one opaque
  // image named only by its `<title>` (chart type), dropping the per-row names +
  // values from the a11y tree that the old HTML `<ol>` exposed. Re-enumerate the
  // key in a `<desc>` (the image's accessible DESCRIPTION) so a screen reader
  // still hears the data. Heads (map group clusters) read as "Group:". See
  // 2026-06-13-svg-native-legend.md §3.
  const descParts = rows.map((r) => {
    const lbl = stripTags(r.label);
    if (r.head) return `${lbl}:`;
    return r.value != null ? `${lbl} ${stripTags(r.value)}` : lbl;
  }).filter(Boolean);
  const desc = descParts.length ? `<desc>Key — ${xmlEsc(descParts.join(', '))}</desc>` : '';

  return { defs, body: body.join(''), desc, viewW, viewH, diagramDy, fs: FS };
}

module.exports = { buildSvgLegend, wrapLabelToLines, stripTags, xmlEsc };
