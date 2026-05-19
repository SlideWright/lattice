/**
 * State chart — kernel for the `state-chart` chart-family member.
 *
 * Pure parsing + SVG-geometry engine. Section dispatch and chart-frame
 * wrapping live in lib/chart-family/chart-family.js (state-chart is one
 * of CHART_LAYOUTS alongside progress / timeline-list / piechart / gantt
 * / kanban / radar / quadrant). This module turns a parsed model into a
 * `<div class="state-chart-figure">` HTML string.
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
 * Trailing inline-code on a state line is a closed vocabulary: `start`,
 * `end`, or one of the seven .chart-status keywords. Multiple metadata
 * tokens allowed; order is irrelevant. Unknown trailing codes stay in
 * the label. Nested <ul> <li>s are outgoing transitions; each holds one
 * inline-code arrow `event=>N` (event optional, whitespace insignificant).
 * Target slot accepts an index or the literal `self`.
 *
 * One default plus two modifier variants:
 *   state-chart                vertical stack, SVG edges on right gutter
 *   state-chart inline        no SVG; transitions render inline as chips
 *   state-chart horizontal     row layout; forward edges above, back below
 *
 * `dark` is a composable cross-cutting modifier handled in CSS.
 *
 * This module is pure: HTML string in, HTML string out. No DOM, no
 * markdown-it dependency. Geometry is deterministic.
 *
 * Callers of this kernel (three-renderer parity):
 *   - lib/chart-family/chart-family.js  engine-path dispatch (marp.config.js)
 *   - lattice-emulator.js               inline build-path dispatch
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

// Vertical-stack geometry. Pixel-perfect alignment between HTML rows and
// the SVG overlay depends on these numbers; both layers use them directly.
const GEOM = {
  rowHeight: 56,         // y-distance between state-node centres
  rowPad: 6,             // top padding before first row
  nodeRight: 360,        // x of the right edge of the node column (svg coords)
  gutterStep: 28,        // x-distance between successive edge lanes
  arrowSize: 7,          // arrowhead half-width
  selfLoopX: -22,        // left-gutter x for self-loop apex
  selfLoopR: 14,         // self-loop radius
  svgWidth: 540,         // viewBox width — accommodates ~6 forward lanes
  svgPadLeft: 40,        // left padding before node column (self-loop room)
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
// Mirrors radar.transform.js's findOuterUL / splitLis pattern. We need our
// own copy because chart-family.js doesn't export parseTopLevelLis and the
// kernel must stay self-contained for the runtime bundle.

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

// Peel trailing <code>…</code> tokens from the right edge of a lead string.
// Returns the unstripped lead first, then the array of pill texts (in
// document order — leftmost first).
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
// Whitespace anywhere is insignificant. Multi-word events are allowed.
//   `submit => 2`    → { event: 'submit', to: 2 }
//   `=>2`            → { event: '',        to: 2 }
//   `revise =>self`  → { event: 'revise',  to: 'self' }
//
// markdown-it and the lattice-emulator both HTML-escape `>` inside inline
// code to `&gt;`, so the parser accepts the literal `=>` OR the escaped
// form (decoded just-in-time before matching).
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
  // Separate the state's lead (label + metadata pills) from its nested
  // transition list. The lead is everything up to the first <ul>.
  const nestedIdx = liInner.search(/<ul[^>]*>/);
  let lead = nestedIdx >= 0 ? liInner.slice(0, nestedIdx) : liInner;
  let nested = nestedIdx >= 0 ? liInner.slice(nestedIdx) : '';

  // markdown-it wraps multi-line list items in <p>; strip those wrappers.
  lead = lead.replace(/<\/?p>/g, '').trim();

  // Peel trailing inline-code; classify each against the closed vocabulary.
  // Unknown pills get put back as literal <code> in the label.
  const { leadStripped, pills } = stripTrailingPills(lead);
  let isStart = false, isTerminal = false, status = null;
  const unknownPills = [];
  for (const p of pills) {
    if (p === 'start') isStart = true;
    else if (p === 'end') isTerminal = true;
    else if (STATUS_KEYWORDS.has(p)) {
      // Last-known-status wins if multiple appear; v1 grammar doesn't
      // restrict authors to one, but rendering shows one chip.
      status = p;
    } else {
      unknownPills.push(p);
    }
  }

  // Reassemble the rendered label: stripped lead text followed by any
  // unknown pills as inline code (the forgiving precedent).
  let label = leadStripped;
  if (unknownPills.length) {
    label = (label ? label + ' ' : '') +
      unknownPills.map(p => `<code>${escHtml(p)}</code>`).join(' ');
  }

  // Parse transitions from the nested <ul>. Each <li> in it should hold
  // exactly one inline-code arrow token. Anything that doesn't parse as a
  // transition is preserved as literal body text (so authors can drop a
  // note bullet without breaking parsing).
  const transitions = [];
  const annotations = [];
  if (nested) {
    const nestedOuter = findOuterList(nested, 'ul');
    if (nestedOuter) {
      const lis = splitTopLevelLis(nestedOuter.inner);
      for (const itemInner of lis) {
        const itemTrim = itemInner.replace(/<\/?p>/g, '').trim();
        // Extract first <code> token; the bullet must be exactly that token.
        const codeOnly = itemTrim.match(/^<code>([^<]+)<\/code>$/);
        if (codeOnly) {
          const t = parseTransitionToken(codeOnly[1]);
          if (t) {
            transitions.push(t);
            continue;
          }
        }
        annotations.push(itemTrim);
      }
    }
  }

  return { index, label, status, isStart, isTerminal, transitions, annotations };
}

// Top-level parser. Walks the <ol>'s top-level <li>s, parses each state,
// then resolves `self` targets, applies implicit start/terminal fallbacks,
// and flattens the transition list. Returns null if no states.
function parseStateChart(olInner) {
  const liItems = splitTopLevelLis(olInner);
  if (!liItems.length) return null;

  const states = liItems.map((inner, i) => parseStateLi(inner, i + 1));

  // Flatten transitions, resolving `self` and dropping refs to out-of-range
  // state indices (treated as authoring errors — preserved in annotations).
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
    // Drop the per-state transitions array now that the flat list exists.
    delete state.transitions;
  }

  // Implicit fallbacks: if no state has explicit `start`, state 1 is the
  // implicit start; if no `end` is declared, every state with no outgoing
  // transitions is implicit terminal.
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

// ── Lane assignment for non-adjacent edges ───────────────────────────────
// A vertical stack means each non-adjacent transition needs a lane in the
// right gutter so arcs don't overlap. Greedy interval-packing: sort by
// span ascending (shorter arcs hug the column, longer arcs push outward),
// then for each edge pick the lowest lane where no already-assigned edge
// at that lane intersects its [min, max] row interval.
//
// Forward edges (to > from) and back edges (to < from) get separate lane
// pools — forward sits to the right of the node column, back arcs further
// right with a dashed stroke (via data-dir="back" in CSS).
function assignEdgeLanes(edges) {
  const lanes = new Map();
  for (const dir of ['forward', 'back']) {
    const indexed = edges
      .map((e, idx) => ({ idx, e }))
      .filter(({ e }) => !e.isSelf && (dir === 'forward' ? e.to > e.from : e.to < e.from))
      .sort((a, b) => Math.abs(a.e.to - a.e.from) - Math.abs(b.e.to - b.e.from));

    const occupied = [];   // per-lane: array of [lo, hi] intervals
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

// ── SVG building blocks ──────────────────────────────────────────────────

function rowCentreY(index) {
  return GEOM.rowPad + (index - 0.5) * GEOM.rowHeight;
}

function svgEdge(edge, lane) {
  const yi = rowCentreY(edge.from);
  const yj = rowCentreY(edge.to);
  const xa = GEOM.nodeRight;
  const dir = edge.to > edge.from ? 'forward' : (edge.to < edge.from ? 'back' : 'self');
  const labelAttr = edge.event ? ` data-event="${escAttr(edge.event)}"` : '';

  if (edge.isSelf) {
    // Small left-gutter loop. Cubic Bezier from node-left to node-left,
    // bulging into negative-x space.
    const xl = 0;                          // left edge of node column in svg coords
    const y = yi;
    const r = GEOM.selfLoopR;
    const cx = GEOM.selfLoopX;             // peak x (negative — sits in the left gutter)
    const path = `M ${xl} ${y - 2} C ${cx} ${y - r}, ${cx} ${y + r}, ${xl} ${y + 2}`;
    const arrow = arrowhead(xl, y + 2, /* angle = */ -10, 'self');
    const labelEl = edge.event ? edgeLabel(cx - 4, y, edge.event, 'self') : '';
    return `<g class="state-edge-group" data-dir="self"${labelAttr}>` +
      `<path class="state-edge" data-dir="self" data-self="true" d="${path}"/>` +
      arrow + labelEl +
      `</g>`;
  }

  // Adjacent forward (to === from + 1) renders as a short straight tick on
  // the right edge — no arc, lane-less.
  if (dir === 'forward' && edge.to === edge.from + 1) {
    const path = `M ${xa - 4} ${yi + 8} L ${xa - 4} ${yj - 8}`;
    const arrow = arrowhead(xa - 4, yj - 8, 90, dir);
    const labelEl = edge.event
      ? edgeLabel(xa + 6, (yi + yj) / 2, edge.event, dir)
      : '';
    return `<g class="state-edge-group" data-dir="${dir}"${labelAttr}>` +
      `<path class="state-edge" data-dir="${dir}" d="${path}"/>` +
      arrow + labelEl +
      `</g>`;
  }

  // Lane-assigned arc.
  const xPeak = xa + (lane + 1) * GEOM.gutterStep;
  const path = `M ${xa} ${yi} C ${xPeak} ${yi}, ${xPeak} ${yj}, ${xa} ${yj}`;
  // Arrow at landing: pointing left, into the node.
  const arrow = arrowhead(xa, yj, 180, dir);
  const labelEl = edge.event
    ? edgeLabel(xPeak + 4, (yi + yj) / 2, edge.event, dir)
    : '';
  return `<g class="state-edge-group" data-dir="${dir}"${labelAttr}>` +
    `<path class="state-edge" data-dir="${dir}" d="${path}"/>` +
    arrow + labelEl +
    `</g>`;
}

function arrowhead(x, y, angleDeg, dir) {
  // Triangle pointing along `angleDeg` (0° = right, 180° = left, 90° = down).
  const s = GEOM.arrowSize;
  const rad = (angleDeg * Math.PI) / 180;
  const c = Math.cos(rad), si = Math.sin(rad);
  // Three points: tip, then two base corners offset perpendicular.
  const tip = { x, y };
  const baseCx = x - c * s;
  const baseCy = y - si * s;
  const px = -si, py = c;
  const b1 = { x: baseCx + px * (s * 0.55), y: baseCy + py * (s * 0.55) };
  const b2 = { x: baseCx - px * (s * 0.55), y: baseCy - py * (s * 0.55) };
  const pts = `${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${b1.x.toFixed(1)},${b1.y.toFixed(1)} ${b2.x.toFixed(1)},${b2.y.toFixed(1)}`;
  return `<polygon class="state-edge-arrow" data-dir="${dir}" points="${pts}"/>`;
}

function edgeLabel(x, y, event, dir) {
  return `<text class="state-edge-label" data-dir="${dir}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" dominant-baseline="middle">${escHtml(event)}</text>`;
}

// ── HTML state-node rendering ────────────────────────────────────────────

function renderStateNodes(states, variant) {
  const items = states.map(s => {
    const kindAttr = s.isStart ? ' data-kind="start"' : (s.isTerminal ? ' data-kind="terminal"' : '');
    const statusEl = s.status
      ? `<span class="chart-status" data-s="${escAttr(s.status)}">${escHtml(s.status)}</span>`
      : '';
    const indexEl = `<span class="state-index" aria-hidden="true">${s.index}</span>`;
    const labelEl = `<span class="state-label">${s.label}</span>`;
    const annotationEl = s.annotations && s.annotations.length
      ? `<span class="state-annotations">${s.annotations.join(' ')}</span>`
      : '';
    return `<li class="state-node" data-index="${s.index}"${kindAttr}>` +
      indexEl + labelEl + statusEl + annotationEl +
      `</li>`;
  }).join('');
  return `<ol class="state-nodes" data-variant="${escAttr(variant)}">${items}</ol>`;
}

// In the inline variant, transitions are siblings under each node as chips
// instead of being drawn in SVG.
function renderStateNodesInline(model) {
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
    return `<li class="state-node" data-index="${s.index}"${kindAttr}>` +
      indexEl + labelEl + statusEl + chipsEl +
      `</li>`;
  }).join('');
  return `<ol class="state-nodes" data-variant="inline">${items}</ol>`;
}

// ── Top-level builder ────────────────────────────────────────────────────

function buildStateChart(model, variant) {
  if (variant === 'inline') {
    const inner = renderStateNodesInline(model);
    return `<div class="state-chart-figure" data-variant="inline" data-states="${model.states.length}" data-transitions="${model.transitions.length}">${inner}</div>`;
  }

  // Default (vertical) and horizontal share the same DOM; CSS handles the
  // rotation. Horizontal would need a flipped edge geometry — punted to a
  // CSS rotate transform on the SVG for v1 (acceptable trade-off; reads
  // identically and ships now).
  const nodesHtml = renderStateNodes(model.states, variant);
  const lanes = assignEdgeLanes(model.transitions);
  const edgesHtml = model.transitions
    .map((e, idx) => svgEdge(e, lanes.get(idx) ?? 0))
    .join('');
  const totalHeight = GEOM.rowPad * 2 + model.states.length * GEOM.rowHeight;
  const viewBox = `${-GEOM.svgPadLeft} 0 ${GEOM.svgWidth + GEOM.svgPadLeft} ${totalHeight}`;
  const svg = `<svg class="state-chart-edges" viewBox="${viewBox}" role="img" aria-hidden="true" preserveAspectRatio="xMinYMin meet">${edgesHtml}</svg>`;
  return `<div class="state-chart-figure" data-variant="${escAttr(variant)}" data-states="${model.states.length}" data-transitions="${model.transitions.length}">${nodesHtml}${svg}</div>`;
}

// ── Eyebrow extraction (parity helper with radar / quadrant) ─────────────

function matchEyebrowText(sectionHtml) {
  const m = sectionHtml.match(/<p[^>]*>\s*<code>([^<]+?)<\/code>\s*<\/p>/);
  return m ? m[1].trim() : '';
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
  buildStateChart,
  matchEyebrowText,
  // Exposed for unit tests:
  rowCentreY,
  stripTrailingPills,
  splitTopLevelLis,
  findOuterList,
};
