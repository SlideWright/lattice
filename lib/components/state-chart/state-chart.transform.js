/**
 * State chart — kernel for the `state-chart` chart-family member.
 *
 * Pure parsing + SVG-canvas layout engine. Section dispatch and chart-
 * frame wrapping live in lib/chart-family/chart-family.js (state-chart
 * is one of CHART_LAYOUTS alongside progress / timeline-list / piechart
 * / gantt / kanban / radar / quadrant). This module turns a parsed model
 * into a single `<svg class="state-chart-canvas">` element — node
 * rectangles, edge paths, and marker glyphs all rendered into one SVG
 * coordinate space so geometry stays exact under any zoom.
 *
 * Authoring (numbered list of states, nested bullets are transitions):
 *
 *   <!-- _class: state-chart -->
 *
 *   `Submission lifecycle`
 *   ## Document approval flow.
 *
 *   1. Draft `start`
 *      - `submit => 2`
 *      - `discard => 6`
 *   2. Submitted `on-track`
 *      - `review => 3`
 *   3. In Review
 *      - `approve => 4`
 *      - `reject => 1`
 *      - `revise => self`
 *   …
 *
 * Each top-level <li> is a state; its index in the ol is the stable ref.
 * Trailing inline-code is a closed vocabulary: `start`, `end`, or one of
 * the 10 .chart-status keywords. Nested <ul> <li>s are transitions; each
 * carries one inline-code arrow `event => N` or `event => self`. The
 * arrow is the typeable two-char `=>`; whitespace inside the code is
 * insignificant.
 *
 * Layout engine (no third party):
 *   - Node sizing: width auto-sized to label length via a character-pixel
 *     approximation, clamped to [nodeMinW, nodeMaxW]; height fixed.
 *   - Node positioning: vertical column on the canvas centre line in
 *     author order (numbered authoring IS the layout commitment).
 *   - Edge routing:
 *     adjacent forward (j === i+1) → straight line through the centre,
 *     forward skip   (j  >  i+1) → cubic Bezier bowing right of column,
 *     back           (j  <  i  ) → cubic Bezier bowing left  of column,
 *     self           (j === i  ) → small loop on the right side.
 *     Forward-skip and back edges get lane-packed by row-span ascending
 *     so longer arcs sit further from the column.
 *   - Markers: start states get a filled-disc (●) glyph above with an
 *     arrow into the state; terminal states get a concentric-ring (◎)
 *     glyph below with an arrow out of the state.
 *   - Arrowheads: polygon tips computed from the edge's tangent direction
 *     at the endpoint so they land cleanly on the node boundary.
 *
 * One default plus two modifier variants:
 *   state-chart                pure SVG canvas (this module)
 *   state-chart inline         HTML fallback: transitions as inline chips,
 *                              no SVG; for very dense decks or when an
 *                              SVG overlay is undesirable
 *   state-chart horizontal     reserved; currently renders like inline
 *                              with horizontal flow (no SVG)
 *
 * `dark` is a composable cross-cutting modifier handled in CSS.
 *
 * The kernel is pure: HTML string in, HTML string out. No DOM, no
 * markdown-it dependency. Geometry is deterministic.
 *
 * Callers (three-renderer parity):
 *   - lib/chart-family/chart-family.js  engine-path dispatch (marp.config.js)
 *   - lattice-emulator.js               build-path dispatch
 *   - src/runtime/index.js              bundled via esbuild → lattice-runtime.js
 */

const STATE_CHART_VARIANTS = ['inline', 'horizontal'];

// Status pill vocabulary. Must stay aligned with .chart-status[data-s=…]
// rules in lib/chart-family/chart-family.css.
const STATUS_KEYWORDS = new Set([
  'on-track', 'done', 'live',
  'at-risk', 'warn', 'pilot',
  'blocked', 'fail',
  'decision',
  'deferred',
]);

const STATE_ATTR_KEYWORDS = new Set(['start', 'end']);

// SVG canvas geometry. All measurements are in viewBox units (≈ px at
// 1× zoom). The kernel emits a single <svg> with these dimensions; the
// browser scales it via CSS to fit the slide.
const GEOM = {
  canvasWidth: 640,         // viewBox width
  centerX: 320,             // canvasWidth / 2
  nodeMinWidth: 120,
  nodeMaxWidth: 280,
  nodeHeight: 44,
  nodePadX: 16,             // horizontal padding inside the node rect
  charPx: 7.2,              // approximate average char width at 13px sans-serif
  rowGap: 32,               // vertical gap between consecutive node rects
  padTop: 60,               // canvas padding above row 1 (room for start marker)
  padBottom: 60,            // canvas padding below last row (room for terminal marker)
  laneStep: 28,             // x-distance between successive edge lanes
  laneBase: 32,             // x-distance from node edge to first lane peak
  arrowSize: 7,             // arrowhead tip-to-base length
  selfLoopPeak: 30,         // x-distance from node-right to self-loop apex
  selfLoopHalfY: 12,        // y-offset of self-loop top/bottom from row centre
  startRadius: 6,           // filled-disc start marker radius
  terminalOuterR: 10,       // outer ring of terminal marker
  terminalInnerR: 5,        // filled centre of terminal marker
  markerGap: 22,            // distance from state edge to marker centre
};

function escHtml(s) {
  return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function escAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// ── List walking (depth-aware) ───────────────────────────────────────────
// Mirrors radar.transform.js's findOuterUL / splitLis pattern.

function findOuterList(html, tag) {
  const start = html.indexOf('<' + tag);
  if (start < 0) return null;
  const openEnd = html.indexOf('>', start);
  if (openEnd < 0) return null;
  let depth = 1, i = openEnd + 1;
  while (i < html.length) {
    if (html.startsWith('<' + tag, i) &&
        (html.charCodeAt(i + tag.length + 1) === 0x3e /* '>' */ ||
         /\s/.test(html.charAt(i + tag.length + 1)))) {
      depth++;
      i = html.indexOf('>', i) + 1;
      if (i === 0) return null;
      continue;
    }
    if (html.startsWith('</' + tag + '>', i)) {
      depth--;
      if (depth === 0) {
        return { inner: html.slice(openEnd + 1, i), start, end: i + tag.length + 3 };
      }
      i += tag.length + 3;
      continue;
    }
    i++;
  }
  return null;
}

function splitTopLevelLis(inner) {
  const items = [];
  let depth = 0, liStart = -1, i = 0;
  const liOpen = (idx) => {
    if (!inner.startsWith('<li', idx)) return -1;
    const next = inner.charCodeAt(idx + 3);
    if (next === 0x3e /* '>' */ || next === 0x20 /* ' ' */ || next === 0x09) {
      const close = inner.indexOf('>', idx);
      return close < 0 ? -1 : close + 1;
    }
    return -1;
  };
  while (i < inner.length) {
    const after = liOpen(i);
    if (after > 0) {
      if (depth === 0) liStart = after;
      depth++;
      i = after;
      continue;
    }
    if (inner.startsWith('</li>', i)) {
      depth--;
      if (depth === 0 && liStart !== -1) {
        items.push(inner.slice(liStart, i));
        liStart = -1;
      }
      i += 5;
      continue;
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
  return { leadStripped: s.trim(), pills };
}

// ── Transition token parsing ─────────────────────────────────────────────
// Grammar: optional event name, then `=>`, then state index or `self`.
// Whitespace anywhere is insignificant. Multi-word events allowed.
// markdown-it and lattice-emulator both HTML-escape `>` inside inline
// code to `&gt;`, so we decode just-in-time before matching.
const TRANSITION_RE = /^\s*([A-Za-z0-9_\-\/ ]*?)\s*=>\s*(\d+|self)\s*$/;

function decodeEntities(s) {
  return String(s)
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function parseTransitionToken(text) {
  const decoded = decodeEntities(text);
  const m = decoded.match(TRANSITION_RE);
  if (!m) return null;
  const event = m[1].trim();
  const target = m[2] === 'self' ? 'self' : parseInt(m[2], 10);
  return { event, to: target };
}

// ── State parsing ────────────────────────────────────────────────────────

function parseStateLi(liInner, index) {
  const nestedIdx = liInner.search(/<ul[^>]*>/);
  let lead = nestedIdx >= 0 ? liInner.slice(0, nestedIdx) : liInner;
  let nested = nestedIdx >= 0 ? liInner.slice(nestedIdx) : '';
  lead = lead.replace(/<\/?p>/g, '').trim();

  const { leadStripped, pills } = stripTrailingPills(lead);
  let isStart = false, isTerminal = false, status = null;
  const unknownPills = [];
  for (const p of pills) {
    if (p === 'start') isStart = true;
    else if (p === 'end') isTerminal = true;
    else if (STATUS_KEYWORDS.has(p)) status = p;
    else unknownPills.push(p);
  }

  let label = leadStripped;
  if (unknownPills.length) {
    label = (label ? label + ' ' : '') +
      unknownPills.map(p => `<code>${escHtml(p)}</code>`).join(' ');
  }

  const transitions = [];
  const annotations = [];
  if (nested) {
    const nestedOuter = findOuterList(nested, 'ul');
    if (nestedOuter) {
      const lis = splitTopLevelLis(nestedOuter.inner);
      for (const itemInner of lis) {
        const itemTrim = itemInner.replace(/<\/?p>/g, '').trim();
        const codeOnly = itemTrim.match(/^<code>([^<]+)<\/code>$/);
        if (codeOnly) {
          const t = parseTransitionToken(codeOnly[1]);
          if (t) { transitions.push(t); continue; }
        }
        annotations.push(itemTrim);
      }
    }
  }

  return { index, label, status, isStart, isTerminal, transitions, annotations };
}

function parseStateChart(olInner) {
  const liItems = splitTopLevelLis(olInner);
  if (!liItems.length) return null;

  const states = liItems.map((inner, i) => parseStateLi(inner, i + 1));

  const transitions = [];
  for (const state of states) {
    for (const t of state.transitions) {
      const to = t.to === 'self' ? state.index : t.to;
      if (to < 1 || to > states.length) {
        state.annotations.push(
          `<code>${escHtml(t.event ? `${t.event} => ${t.to}` : `=> ${t.to}`)}</code> (unresolved)`
        );
        continue;
      }
      transitions.push({
        from: state.index,
        to,
        event: t.event || '',
        isSelf: state.index === to,
      });
    }
    delete state.transitions;
  }

  const anyExplicitStart = states.some(s => s.isStart);
  if (!anyExplicitStart && states[0]) states[0].isStart = true;

  const anyExplicitEnd = states.some(s => s.isTerminal);
  if (!anyExplicitEnd) {
    const hasOutgoing = new Set(transitions.map(t => t.from));
    for (const s of states) {
      if (!hasOutgoing.has(s.index)) s.isTerminal = true;
    }
  }

  return { states, transitions };
}

// ── Variant dispatch ─────────────────────────────────────────────────────

function pickVariant(classTokens) {
  for (const v of STATE_CHART_VARIANTS) {
    if (classTokens.includes(v)) return v;
  }
  return 'default';
}

// ── Layout engine ────────────────────────────────────────────────────────
// Numbered authoring drives the topology — state i renders at row i in
// the centre column. This function computes each node's bounding box
// (x, y, w, h) from its label text. Width is text-aware (clamped to
// [nodeMinWidth, nodeMaxWidth]); height is fixed.

function layoutNodes(states) {
  const placed = [];
  let cursorY = GEOM.padTop;
  for (const s of states) {
    const labelText = stripTags(s.label);
    const labelLen = Math.max(1, labelText.length);
    const intrinsicW = labelLen * GEOM.charPx + 2 * GEOM.nodePadX;
    // Extra padding when status pill present (rendered as a small chip on
    // the right side of the node so the label can't crowd it).
    const statusReserve = s.status ? 60 : 0;
    const w = Math.min(
      GEOM.nodeMaxWidth,
      Math.max(GEOM.nodeMinWidth, intrinsicW + statusReserve)
    );
    const h = GEOM.nodeHeight;
    const x = GEOM.centerX - w / 2;
    placed.push({ ...s, x, y: cursorY, w, h });
    cursorY += h + GEOM.rowGap;
  }
  const totalHeight = cursorY - GEOM.rowGap + GEOM.padBottom;
  return { nodes: placed, totalHeight };
}

// ── Lane assignment for non-adjacent edges ───────────────────────────────
// Forward-skip and back edges sit on opposite sides of the column. Within
// a side, greedy interval-packing by row-span ascending keeps longer arcs
// further out so they don't cross shorter ones. Adjacent forward (j ===
// i+1) and self-loops are fixed shapes and skip lane assignment.

function assignEdgeLanes(edges) {
  const lanes = new Map();
  for (const side of ['forwardSkip', 'back']) {
    const indexed = edges
      .map((e, idx) => ({ idx, e }))
      .filter(({ e }) => {
        if (e.isSelf) return false;
        if (side === 'forwardSkip') return e.to > e.from + 1;
        return e.to < e.from;
      })
      .sort((a, b) => Math.abs(a.e.to - a.e.from) - Math.abs(b.e.to - b.e.from));

    const occupied = [];
    for (const { idx, e } of indexed) {
      const lo = Math.min(e.from, e.to);
      const hi = Math.max(e.from, e.to);
      let lane = 0;
      while (true) {
        const intervals = occupied[lane] || [];
        const clash = intervals.some(([a, b]) => !(hi < a || lo > b));
        if (!clash) {
          (occupied[lane] = occupied[lane] || []).push([lo, hi]);
          lanes.set(idx, lane);
          break;
        }
        lane++;
      }
    }
  }
  return lanes;
}

// ── SVG primitives ───────────────────────────────────────────────────────

// Arrowhead polygon. `angleDeg` is the direction the tip points along:
// 0° = right, 90° = down, 180° = left, -90°/270° = up. The arrow has
// width 0.55× length so it reads as a slim triangle, not a chunky wedge.
function arrowhead(x, y, angleDeg, dir) {
  const s = GEOM.arrowSize;
  const rad = (angleDeg * Math.PI) / 180;
  const c = Math.cos(rad), si = Math.sin(rad);
  const baseCx = x - c * s;
  const baseCy = y - si * s;
  const px = -si, py = c;
  const halfW = s * 0.5;
  const b1x = baseCx + px * halfW;
  const b1y = baseCy + py * halfW;
  const b2x = baseCx - px * halfW;
  const b2y = baseCy - py * halfW;
  return `<polygon class="state-edge-arrow" data-dir="${dir}" points="${x.toFixed(1)},${y.toFixed(1)} ${b1x.toFixed(1)},${b1y.toFixed(1)} ${b2x.toFixed(1)},${b2y.toFixed(1)}"/>`;
}

function edgeLabel(x, y, event, dir, anchor) {
  const a = anchor || 'middle';
  return `<text class="state-edge-label" data-dir="${dir}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${a}" dominant-baseline="middle">${escHtml(event)}</text>`;
}

// ── State-node rendering (SVG) ───────────────────────────────────────────

function renderNode(node) {
  const kindAttr = node.isStart
    ? ' data-kind="start"'
    : (node.isTerminal ? ' data-kind="terminal"' : '');
  const labelText = stripTags(node.label);
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;

  const rect = `<rect class="state-rect" x="${node.x.toFixed(1)}" y="${node.y.toFixed(1)}" width="${node.w.toFixed(1)}" height="${node.h.toFixed(1)}" rx="6" ry="6"/>`;
  const label = `<text class="state-label" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="central">${escHtml(labelText)}</text>`;

  // Status chip — small rounded badge on the right side of the node.
  // Width is approximated from the status keyword's length; height is
  // fixed at 16. The text uses the same data-s attribute the rest of
  // chart-family.css keys colours off.
  let statusEl = '';
  if (node.status) {
    const stText = node.status;
    const stW = Math.max(40, stText.length * 6 + 12);
    const stH = 16;
    const stX = node.x + node.w - stW - 6;
    const stY = node.y + (node.h - stH) / 2;
    statusEl =
      `<g class="state-status" data-s="${escAttr(node.status)}">` +
      `<rect class="state-status-bg" data-s="${escAttr(node.status)}" x="${stX.toFixed(1)}" y="${stY.toFixed(1)}" width="${stW}" height="${stH}" rx="8" ry="8"/>` +
      `<text class="state-status-text" data-s="${escAttr(node.status)}" x="${(stX + stW / 2).toFixed(1)}" y="${(stY + stH / 2).toFixed(1)}" text-anchor="middle" dominant-baseline="central">${escHtml(stText)}</text>` +
      `</g>`;
  }

  // Index badge — subtle corner number so authors can see what to cite.
  const idx =
    `<text class="state-index" x="${(node.x + 6).toFixed(1)}" y="${(node.y + 6).toFixed(1)}" text-anchor="start" dominant-baseline="hanging">${node.index}</text>`;

  return `<g class="state-node" data-index="${node.index}"${kindAttr}>${rect}${label}${statusEl}${idx}</g>`;
}

function renderNodes(nodes) {
  return `<g class="state-nodes">${nodes.map(renderNode).join('')}</g>`;
}

// ── Start / terminal markers (SVG) ───────────────────────────────────────

function renderStartMarker(node) {
  const cx = node.x + node.w / 2;
  const discCy = node.y - GEOM.markerGap;
  const lineStart = discCy + GEOM.startRadius;
  const lineEnd = node.y - GEOM.arrowSize;
  return `<g class="state-marker" data-kind="start">` +
    `<circle class="state-marker-disc" cx="${cx}" cy="${discCy.toFixed(1)}" r="${GEOM.startRadius}"/>` +
    `<path class="state-marker-line" d="M ${cx} ${lineStart.toFixed(1)} L ${cx} ${lineEnd.toFixed(1)}"/>` +
    arrowhead(cx, node.y, 90, 'start') +
    `</g>`;
}

function renderTerminalMarker(node) {
  const cx = node.x + node.w / 2;
  const stateBottom = node.y + node.h;
  const ringCy = stateBottom + GEOM.markerGap;
  const lineStart = stateBottom;
  const lineEnd = ringCy - GEOM.terminalOuterR - GEOM.arrowSize;
  return `<g class="state-marker" data-kind="terminal">` +
    `<path class="state-marker-line" d="M ${cx} ${lineStart.toFixed(1)} L ${cx} ${lineEnd.toFixed(1)}"/>` +
    arrowhead(cx, ringCy - GEOM.terminalOuterR, 90, 'terminal') +
    `<circle class="state-marker-ring" cx="${cx}" cy="${ringCy.toFixed(1)}" r="${GEOM.terminalOuterR}"/>` +
    `<circle class="state-marker-disc" cx="${cx}" cy="${ringCy.toFixed(1)}" r="${GEOM.terminalInnerR}"/>` +
    `</g>`;
}

function renderMarkers(nodes) {
  const starts = nodes.filter(n => n.isStart).map(renderStartMarker).join('');
  const ends = nodes.filter(n => n.isTerminal).map(renderTerminalMarker).join('');
  return `<g class="state-markers">${starts}${ends}</g>`;
}

// ── Edge rendering (SVG) ─────────────────────────────────────────────────
// One renderer per edge kind. Endpoints land precisely on the node
// boundary; the arrowhead is a separate polygon at the tangent direction
// so the line and the head meet seamlessly at the boundary.

function renderAdjacentEdge(edge, from, to) {
  const x = from.x + from.w / 2;
  const yStart = from.y + from.h;
  const yEnd = to.y - GEOM.arrowSize;
  const path = `M ${x} ${yStart.toFixed(1)} L ${x} ${yEnd.toFixed(1)}`;
  const labelEl = edge.event
    ? edgeLabel(x + 10, (yStart + to.y) / 2, edge.event, 'forward', 'start')
    : '';
  return `<g class="state-edge-group" data-dir="forward">` +
    `<path class="state-edge" data-dir="forward" d="${path}"/>` +
    arrowhead(x, to.y, 90, 'forward') +
    labelEl +
    `</g>`;
}

function renderForwardSkip(edge, from, to, lane) {
  const yStart = from.y + from.h / 2;
  const yEnd = to.y + to.h / 2;
  const xStart = from.x + from.w;
  const xEndPath = to.x + to.w + GEOM.arrowSize;   // line ends arrow-length outside the node
  const xEndArrow = to.x + to.w;                    // arrow tip lands on the right edge
  // Peak x is offset from the further-right of the two endpoints so the
  // curve always bows outward.
  const peakBaseX = Math.max(xStart, to.x + to.w);
  const xPeak = peakBaseX + GEOM.laneBase + lane * GEOM.laneStep;
  const path = `M ${xStart.toFixed(1)} ${yStart.toFixed(1)} C ${xPeak} ${yStart.toFixed(1)}, ${xPeak} ${yEnd.toFixed(1)}, ${xEndPath.toFixed(1)} ${yEnd.toFixed(1)}`;
  const labelEl = edge.event
    ? edgeLabel(xPeak + 6, (yStart + yEnd) / 2, edge.event, 'forward', 'start')
    : '';
  return `<g class="state-edge-group" data-dir="forward">` +
    `<path class="state-edge" data-dir="forward" d="${path}"/>` +
    arrowhead(xEndArrow, yEnd, 180, 'forward') +
    labelEl +
    `</g>`;
}

function renderBackEdge(edge, from, to, lane) {
  const yStart = from.y + from.h / 2;
  const yEnd = to.y + to.h / 2;
  const xStart = from.x;
  const xEndPath = to.x - GEOM.arrowSize;
  const xEndArrow = to.x;
  const peakBaseX = Math.min(xStart, to.x);
  const xPeak = peakBaseX - GEOM.laneBase - lane * GEOM.laneStep;
  const path = `M ${xStart.toFixed(1)} ${yStart.toFixed(1)} C ${xPeak} ${yStart.toFixed(1)}, ${xPeak} ${yEnd.toFixed(1)}, ${xEndPath.toFixed(1)} ${yEnd.toFixed(1)}`;
  const labelEl = edge.event
    ? edgeLabel(xPeak - 6, (yStart + yEnd) / 2, edge.event, 'back', 'end')
    : '';
  return `<g class="state-edge-group" data-dir="back">` +
    `<path class="state-edge" data-dir="back" d="${path}"/>` +
    arrowhead(xEndArrow, yEnd, 0, 'back') +
    labelEl +
    `</g>`;
}

function renderSelfLoop(edge, from) {
  const y = from.y + from.h / 2;
  const yTop = y - GEOM.selfLoopHalfY;
  const yBot = y + GEOM.selfLoopHalfY;
  const xStart = from.x + from.w;
  const xPeak = xStart + GEOM.selfLoopPeak;
  const xEnd = xStart + GEOM.arrowSize;
  const path = `M ${xStart.toFixed(1)} ${yTop.toFixed(1)} C ${xPeak} ${(yTop - 4).toFixed(1)}, ${xPeak} ${(yBot + 4).toFixed(1)}, ${xEnd.toFixed(1)} ${yBot.toFixed(1)}`;
  const labelEl = edge.event
    ? edgeLabel(xPeak + 6, y, edge.event, 'self', 'start')
    : '';
  return `<g class="state-edge-group" data-dir="self">` +
    `<path class="state-edge" data-dir="self" data-self="true" d="${path}"/>` +
    arrowhead(xStart, yBot, 180, 'self') +
    labelEl +
    `</g>`;
}

function renderEdge(edge, nodes, lane) {
  const from = nodes[edge.from - 1];
  const to = nodes[edge.to - 1];
  if (edge.isSelf) return renderSelfLoop(edge, from);
  if (edge.to === edge.from + 1) return renderAdjacentEdge(edge, from, to);
  if (edge.to > edge.from + 1) return renderForwardSkip(edge, from, to, lane);
  return renderBackEdge(edge, from, to, lane);
}

function renderEdges(edges, nodes, lanes) {
  return `<g class="state-edges">${
    edges.map((e, i) => renderEdge(e, nodes, lanes.get(i) ?? 0)).join('')
  }</g>`;
}

// ── Inline variant (HTML chips, no SVG) ──────────────────────────────────
// The SVG canvas is the headline rendering; the inline variant is the
// fallback for dense decks where chips read better than a chart.

function renderInline(model) {
  const byFrom = new Map();
  for (const t of model.transitions) {
    if (!byFrom.has(t.from)) byFrom.set(t.from, []);
    byFrom.get(t.from).push(t);
  }
  const items = model.states.map(s => {
    const kindAttr = s.isStart ? ' data-kind="start"' : (s.isTerminal ? ' data-kind="terminal"' : '');
    const statusEl = s.status
      ? `<span class="chart-status" data-s="${escAttr(s.status)}">${escHtml(s.status)}</span>`
      : '';
    const indexEl = `<span class="state-index" aria-hidden="true">${s.index}</span>`;
    const labelEl = `<span class="state-label">${s.label}</span>`;
    const outgoing = byFrom.get(s.index) || [];
    const chips = outgoing.map(t => {
      const dir = t.isSelf ? 'self' : (t.to > t.from ? 'forward' : 'back');
      const evt = t.event ? `<span class="state-chip-event">${escHtml(t.event)}</span>` : '';
      const dest = t.isSelf ? '↺' : `→ ${t.to}`;
      return `<span class="state-chip" data-dir="${dir}">${evt}<span class="state-chip-arrow">${dest}</span></span>`;
    }).join('');
    const chipsEl = chips ? `<span class="state-transitions">${chips}</span>` : '';
    return `<li class="state-node-row" data-index="${s.index}"${kindAttr}>` +
      labelEl + statusEl + indexEl + chipsEl +
      `</li>`;
  }).join('');
  return `<div class="state-chart-figure" data-variant="inline" data-states="${model.states.length}" data-transitions="${model.transitions.length}"><ol class="state-rows">${items}</ol></div>`;
}

// ── Top-level builder ────────────────────────────────────────────────────

function buildStateChart(model, variant) {
  if (variant === 'inline' || variant === 'horizontal') {
    return renderInline(model);
  }

  const { nodes, totalHeight } = layoutNodes(model.states);
  const lanes = assignEdgeLanes(model.transitions);
  const edgesHtml = renderEdges(model.transitions, nodes, lanes);
  const markersHtml = renderMarkers(nodes);
  const nodesHtml = renderNodes(nodes);

  // Edges render first so node rectangles paint over edge endpoints
  // cleanly (any sub-pixel overhang gets hidden by the rect fill).
  const viewBox = `0 0 ${GEOM.canvasWidth} ${totalHeight.toFixed(0)}`;
  return `<div class="state-chart-figure" data-variant="${escAttr(variant)}" data-states="${model.states.length}" data-transitions="${model.transitions.length}">` +
    `<svg class="state-chart-canvas" viewBox="${viewBox}" preserveAspectRatio="xMidYMin meet" role="img" aria-hidden="true">` +
    edgesHtml + markersHtml + nodesHtml +
    `</svg>` +
    `</div>`;
}

// ── Eyebrow helper (parity with radar / quadrant) ────────────────────────

function matchEyebrowText(sectionHtml) {
  const m = sectionHtml.match(/<p[^>]*>\s*<code>([^<]+?)<\/code>\s*<\/p>/);
  return m ? m[1].trim() : '';
}

// ── Backwards-compatible row-centre helper (kept for tests) ──────────────
function rowCentreY(index) {
  return GEOM.padTop + (index - 1) * (GEOM.nodeHeight + GEOM.rowGap) + GEOM.nodeHeight / 2;
}

module.exports = {
  STATE_CHART_VARIANTS,
  STATUS_KEYWORDS,
  STATE_ATTR_KEYWORDS,
  GEOM,
  TRANSITION_RE,
  pickVariant,
  parseTransitionToken,
  parseStateLi,
  parseStateChart,
  assignEdgeLanes,
  layoutNodes,
  buildStateChart,
  matchEyebrowText,
  // Exposed for unit tests:
  rowCentreY,
  stripTrailingPills,
  splitTopLevelLis,
  findOuterList,
};
