/**
 * State chart — kernel for the `state-chart` chart-family member.
 *
 * ARCHITECTURE: browser-measured layout (Option 1).
 *
 * Build time (this module, pure string transform) emits only:
 *   - HTML state nodes (a centred column the BROWSER sizes to their
 *     content — any label, any script, any font, wraps naturally),
 *   - the transition list serialised as a `data-sc-transitions` JSON attr,
 *   - an empty <svg class="state-chart-edges"> overlay.
 * No geometry is computed at build time, because a string transform can't
 * measure text. Guessing glyph widths (the old charPx approach) could not
 * withstand arbitrary user content.
 *
 * Browser (installStateChartLayout, self-contained so it can be serialised
 * via .toString() into the emulator's bootstrap script AND imported by the
 * runtime bundle) measures each laid-out node with getBoundingClientRect
 * and draws the edges + markers into the SVG overlay. Real measurement →
 * robust to content we've never seen.
 *
 * Render-path wiring (three-renderer parity):
 *   - lattice-emulator.js  emits `<script>${STATE_CHART_BROWSER_JS}</script>`;
 *                          puppeteer runs it on DOMContentLoaded before the
 *                          PDF print (same pre-render-then-PDF flow as
 *                          function-plot).
 *   - marp.config.js       marp-cli's export path (follow-up: same bootstrap).
 *   - src/runtime/index.js calls installStateChartLayout(document) for the
 *                          marp-vscode preview (+ ResizeObserver/fonts.ready).
 *
 * Authoring (numbered list of states, nested bullets are transitions):
 *
 *   <!-- _class: state-chart -->
 *   `Submission lifecycle`
 *   ## Document approval flow.
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
 * Variants: default (SVG canvas), `inline` (HTML chips, no SVG),
 * `horizontal` (HTML chips, row flow). `dark` composes via CSS.
 */

// Two orthogonal axes expressed as modifier classes:
//   direction:    lr (left-to-right) — default is tb (top-to-bottom)
//   presentation: inline (HTML chips, no SVG) — default is the SVG canvas
// `horizontal` is a backwards-compatible alias for `lr inline`.
const STATE_CHART_VARIANTS = ['lr', 'inline'];

const STATUS_KEYWORDS = new Set([
  'on-track', 'done', 'live',
  'at-risk', 'warn', 'pilot',
  'blocked', 'fail',
  'decision',
  'deferred',
]);

const STATE_ATTR_KEYWORDS = new Set(['start', 'end']);

function escHtml(s) {
  return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function escAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ── List walking (depth-aware) ───────────────────────────────────────────

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
const TRANSITION_RE = /^\s*([A-Za-z0-9_\-/ ]*?)\s*=>\s*(\d+|self)\s*$/;

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
  const nested = nestedIdx >= 0 ? liInner.slice(nestedIdx) : '';
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

// ── Build-time HTML emission ─────────────────────────────────────────────
// Default variant: HTML node column (browser-sized) + transitions JSON +
// empty SVG overlay. The browser pass fills the SVG. inline/horizontal:
// HTML chips, no SVG (the fallback presentations).

function renderHtmlNode(s) {
  const kindAttr = s.isStart ? ' data-kind="start"' : (s.isTerminal ? ' data-kind="terminal"' : '');
  const statusEl = s.status
    ? `<span class="chart-status" data-s="${escAttr(s.status)}">${escHtml(s.status)}</span>`
    : '';
  const indexEl = `<span class="state-index" aria-hidden="true">${s.index}</span>`;
  const labelEl = `<span class="state-label">${s.label}</span>`;
  return `<li class="state-node" data-index="${s.index}"${kindAttr}>` +
    indexEl + labelEl + statusEl +
    `</li>`;
}

function buildDefault(model, dir) {
  const nodes = model.states.map(renderHtmlNode).join('');
  // Serialise the transition list for the browser pass.
  const data = escAttr(JSON.stringify(model.transitions));
  const d = dir === 'lr' ? 'lr' : 'tb';
  return `<div class="state-chart-figure" data-variant="default" data-sc-dir="${d}" data-states="${model.states.length}" data-transitions="${model.transitions.length}" data-sc-transitions="${data}">` +
    `<ol class="state-nodes">${nodes}</ol>` +
    `<svg class="state-chart-edges" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"></svg>` +
    `</div>`;
}

function renderInline(model, dir) {
  const d = dir === 'lr' ? 'lr' : 'tb';
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
  return `<div class="state-chart-figure" data-variant="inline" data-sc-dir="${d}" data-states="${model.states.length}" data-transitions="${model.transitions.length}"><ol class="state-rows">${items}</ol></div>`;
}

// Build entry. `opts` is the slide's class-token array (chart-family passes
// it through). Two orthogonal axes: presentation (inline chips vs SVG) and
// direction (lr vs tb, mirroring Mermaid). `horizontal` is kept as a
// backwards-compatible alias for `lr inline`.
function buildStateChart(model, opts) {
  const tokens = Array.isArray(opts) ? opts : (typeof opts === 'string' ? [opts] : []);
  const inline = tokens.includes('inline') || tokens.includes('horizontal');
  const dir = (tokens.includes('lr') || tokens.includes('horizontal')) ? 'lr' : 'tb';
  return inline ? renderInline(model, dir) : buildDefault(model, dir);
}

// ── Eyebrow helper (parity with radar / quadrant) ────────────────────────

function matchEyebrowText(sectionHtml) {
  const m = sectionHtml.match(/<p[^>]*>\s*<code>([^<]+?)<\/code>\s*<\/p>/);
  return m ? m[1].trim() : '';
}

// ── Browser-measured layout (self-contained) ─────────────────────────────
// Runs in a browser (puppeteer for PDF, marp-vscode webview for preview).
// MUST be fully self-contained — no references to module scope — so it can
// be serialised with .toString() for the emulator's bootstrap script.
//
// It measures each laid-out node with getBoundingClientRect (real text
// metrics, any content) and draws the edges + markers into the SVG overlay.
function installStateChartLayout(rootDoc) {
  const doc = rootDoc || (typeof document !== 'undefined' ? document : null);
  if (!doc) return;

  const G = {
    arrow: 7,        // arrowhead tip-to-base length
    gap: 5,          // gap between arrow tip and node boundary
    laneStep: 26,    // x-distance between edge lanes
    laneBase: 30,    // x-distance from node edge to first lane peak
    selfPeak: 30,    // x-distance from node-right to self-loop apex
    selfHalf: 12,    // y-offset of self-loop top/bottom from row centre
    startR: 6,       // start-marker filled disc radius
    termOuter: 10,   // terminal-marker outer ring
    termInner: 5,    // terminal-marker inner disc
    markerGap: 22,   // distance from node edge to marker centre
  };

  function arrowhead(x, y, angleDeg, dir) {
    const s = G.arrow;
    const rad = angleDeg * Math.PI / 180;
    const c = Math.cos(rad), si = Math.sin(rad);
    const bcx = x - c * s, bcy = y - si * s;
    const px = -si, py = c, hw = s * 0.5;
    const p = x.toFixed(1) + ',' + y.toFixed(1) + ' ' +
            (bcx + px * hw).toFixed(1) + ',' + (bcy + py * hw).toFixed(1) + ' ' +
            (bcx - px * hw).toFixed(1) + ',' + (bcy - py * hw).toFixed(1);
    return '<polygon class="state-edge-arrow" data-dir="' + dir + '" points="' + p + '"/>';
  }

  function escText(t) {
    return String(t).replace(/[&<>]/g, (ch) => ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;');
  }

  function edgeLabel(x, y, event, dir, anchor) {
    return '<text class="state-edge-label" data-dir="' + dir + '" x="' + x.toFixed(1) +
      '" y="' + y.toFixed(1) + '" text-anchor="' + (anchor || 'middle') +
      '" dominant-baseline="middle">' + escText(event) + '</text>';
  }

  // Greedy interval-packing for non-adjacent edges. Forward-skips and
  // back-edges use independent lane pools (right vs left of the column).
  function assignLanes(transitions) {
    const lanes = {};
    ['forwardSkip', 'back'].forEach((side) => {
      const indexed = [];
      transitions.forEach((e, idx) => {
        if (e.isSelf) return;
        if (side === 'forwardSkip' ? e.to > e.from + 1 : e.to < e.from) {
          indexed.push({ idx: idx, e: e, span: Math.abs(e.to - e.from) });
        }
      });
      indexed.sort((a, b) => a.span - b.span);
      const occupied = [];
      indexed.forEach((it) => {
        const lo = Math.min(it.e.from, it.e.to), hi = Math.max(it.e.from, it.e.to);
        let lane = 0;
        for (;;) {
          const ivs = occupied[lane] || [];
          const clash = ivs.some((iv) => !(hi < iv[0] || lo > iv[1]));
          if (!clash) { (occupied[lane] = occupied[lane] || []).push([lo, hi]); lanes[it.idx] = lane; break; }
          lane++;
        }
      });
    });
    return lanes;
  }

  // Cubic Bezier midpoint (t=0.5): 0.125·P0 + 0.375·P1 + 0.375·P2 + 0.125·P3.
  function cubicMid(p0, p1, p2, p3) {
    return 0.125 * p0 + 0.375 * p1 + 0.375 * p2 + 0.125 * p3;
  }

  // ── Markers ──
  // TB: start disc sits above the first node (arrow down in); terminal ring
  // below the last (arrow down out). LR transposes: start to the left
  // (arrow right in), terminal to the right (arrow right out).
  function startMarker(n, dir) {
    if (dir === 'lr') {
      const cy = n.y + n.h / 2;
      const discCx = n.x - G.markerGap;
      const lineStart = discCx + G.startR;
      const tipX = n.x - G.gap;
      const lineEnd = tipX - G.arrow;
      return '<g class="state-marker" data-kind="start">' +
        '<circle class="state-marker-disc" cx="' + discCx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + G.startR + '"/>' +
        '<path class="state-marker-line" d="M ' + lineStart.toFixed(1) + ' ' + cy.toFixed(1) + ' L ' + lineEnd.toFixed(1) + ' ' + cy.toFixed(1) + '"/>' +
        arrowhead(tipX, cy, 0, 'start') + '</g>';
    }
    const cx = n.x + n.w / 2;
    const discCy = n.y - G.markerGap;
    const lineStart = discCy + G.startR;
    const tipY = n.y - G.gap;
    const lineEnd = tipY - G.arrow;
    return '<g class="state-marker" data-kind="start">' +
      '<circle class="state-marker-disc" cx="' + cx + '" cy="' + discCy.toFixed(1) + '" r="' + G.startR + '"/>' +
      '<path class="state-marker-line" d="M ' + cx + ' ' + lineStart.toFixed(1) + ' L ' + cx + ' ' + lineEnd.toFixed(1) + '"/>' +
      arrowhead(cx, tipY, 90, 'start') + '</g>';
  }

  function terminalMarker(n, dir) {
    if (dir === 'lr') {
      const cy = n.y + n.h / 2;
      const right = n.x + n.w;
      const ringCx = right + G.markerGap;
      const lineStart = right + G.gap;
      const tipX = ringCx - G.termOuter - G.gap;
      const lineEnd = tipX - G.arrow;
      return '<g class="state-marker" data-kind="terminal">' +
        '<path class="state-marker-line" d="M ' + lineStart.toFixed(1) + ' ' + cy.toFixed(1) + ' L ' + lineEnd.toFixed(1) + ' ' + cy.toFixed(1) + '"/>' +
        arrowhead(tipX, cy, 0, 'terminal') +
        '<circle class="state-marker-ring" cx="' + ringCx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + G.termOuter + '"/>' +
        '<circle class="state-marker-disc" cx="' + ringCx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + G.termInner + '"/>' + '</g>';
    }
    const cx = n.x + n.w / 2;
    const bottom = n.y + n.h;
    const ringCy = bottom + G.markerGap;
    const lineStart = bottom + G.gap;
    const tipY = ringCy - G.termOuter - G.gap;
    const lineEnd = tipY - G.arrow;
    return '<g class="state-marker" data-kind="terminal">' +
      '<path class="state-marker-line" d="M ' + cx + ' ' + lineStart.toFixed(1) + ' L ' + cx + ' ' + lineEnd.toFixed(1) + '"/>' +
      arrowhead(cx, tipY, 90, 'terminal') +
      '<circle class="state-marker-ring" cx="' + cx + '" cy="' + ringCy.toFixed(1) + '" r="' + G.termOuter + '"/>' +
      '<circle class="state-marker-disc" cx="' + cx + '" cy="' + ringCy.toFixed(1) + '" r="' + G.termInner + '"/>' + '</g>';
  }

  // ── Ports ──
  // When several edges attach to the same node side they must not pile onto
  // one point. assignPorts distributes attachment offsets along each node's
  // cross-extent (TB: height on the left/right sides; LR: width on the
  // top/bottom sides), sorted by the other endpoint's flow position to keep
  // crossings down. Each transition is tagged with fromOff / toOff / selfOff
  // (the cross-axis coordinate of its attachment); edges fall back to the
  // node centre when a side has no contention.
  function assignPorts(transitions, byIndex, dir) {
    const sides = {};
    const bucket = (idx) => (sides[idx] || (sides[idx] = { max: [], min: [] }));
    const flowPos = (n) => (dir === 'lr' ? n.x + n.w / 2 : n.y + n.h / 2);
    transitions.forEach((t) => {
      const from = byIndex[t.from], to = byIndex[t.to];
      if (!from || !to) return;
      if (t.isSelf) { bucket(t.from).max.push({ t, role: 'self', other: flowPos(from) }); return; }
      if (t.to > t.from + 1) {
        bucket(t.from).max.push({ t, role: 'from', other: flowPos(to) });
        bucket(t.to).max.push({ t, role: 'to', other: flowPos(from) });
      } else if (t.to < t.from) {
        bucket(t.from).min.push({ t, role: 'from', other: flowPos(to) });
        bucket(t.to).min.push({ t, role: 'to', other: flowPos(from) });
      }
    });
    Object.keys(sides).forEach((idx) => {
      const n = byIndex[idx];
      if (!n) return;
      ['max', 'min'].forEach((side) => {
        const list = sides[idx][side];
        if (!list.length) return;
        list.sort((a, b) => a.other - b.other);
        const ext = dir === 'lr' ? n.w : n.h;
        const start = dir === 'lr' ? n.x : n.y;
        const m = list.length;
        list.forEach((item, k) => {
          // Spread within the middle 70% of the side so ports avoid corners.
          const off = start + (0.15 + 0.7 * ((k + 1) / (m + 1))) * ext;
          if (item.role === 'self') item.t.selfOff = off;
          else if (item.role === 'from') item.t.fromOff = off;
          else item.t.toOff = off;
        });
      });
    });
  }

  // Bow depth: lane spacing plus a small span term so long edges sit a touch
  // further out than short ones sharing the gutter.
  function bowDepth(lane, span) {
    return G.laneBase + lane * G.laneStep + Math.min(span, 6) * 3;
  }

  // ── Edges ──
  // TB flows down the centre; forward skips bow right, back-edges bow left,
  // self-loops on the right. LR is the 90° transpose: flow goes right,
  // forward skips bow down, back-edges bow up, self-loops below. Endpoints
  // use the per-edge port offsets from assignPorts (centre when unset).
  function edgeTB(t, from, to, lane, ev) {
    if (t.isSelf) {
      const y = t.selfOff != null ? t.selfOff : from.y + from.h / 2;
      const yTop = y - G.selfHalf, yBot = y + G.selfHalf;
      const xd = from.x + from.w + G.gap;
      const xp = xd + G.selfPeak;
      const xl = xd + G.arrow;
      const d = 'M ' + xd.toFixed(1) + ' ' + yTop.toFixed(1) +
        ' C ' + xp + ' ' + (yTop - 4).toFixed(1) + ', ' + xp + ' ' + (yBot + 4).toFixed(1) +
        ', ' + xl.toFixed(1) + ' ' + yBot.toFixed(1);
      return '<path class="state-edge" data-dir="self" data-self="true" d="' + d + '"/>' +
        arrowhead(xd, yBot, 180, 'self') +
        (ev ? edgeLabel(cubicMid(xd, xp, xp, xl), y, ev, 'self', 'middle') : '');
    }
    if (t.to === t.from + 1) {
      const x = from.x + from.w / 2;
      const ys = from.y + from.h + G.gap;
      const tip = to.y - G.gap;
      const ye = tip - G.arrow;
      return '<path class="state-edge" data-dir="forward" d="M ' + x.toFixed(1) + ' ' + ys.toFixed(1) + ' L ' + x.toFixed(1) + ' ' + ye.toFixed(1) + '"/>' +
        arrowhead(x, tip, 90, 'forward') +
        (ev ? edgeLabel(x, (ys + tip) / 2, ev, 'forward', 'middle') : '');
    }
    const yi = t.fromOff != null ? t.fromOff : from.y + from.h / 2;
    const yj = t.toOff != null ? t.toOff : to.y + to.h / 2;
    if (t.to > t.from + 1) {
      const xs = from.x + from.w + G.gap;
      const tipx = to.x + to.w + G.gap;
      const xe = tipx + G.arrow;
      const clear = (t._maxR != null ? t._maxR : Math.max(xs, tipx)) + G.gap;
      const peak = clear + bowDepth(lane, t.to - t.from);
      const d2 = 'M ' + xs.toFixed(1) + ' ' + yi.toFixed(1) +
        ' C ' + peak.toFixed(1) + ' ' + yi.toFixed(1) + ', ' + peak.toFixed(1) + ' ' + yj.toFixed(1) + ', ' + xe.toFixed(1) + ' ' + yj.toFixed(1);
      return '<path class="state-edge" data-dir="forward" d="' + d2 + '"/>' +
        arrowhead(tipx, yj, 180, 'forward') +
        (ev ? edgeLabel(cubicMid(xs, peak, peak, xe), (yi + yj) / 2, ev, 'forward', 'middle') : '');
    }
    const bxs = from.x - G.gap;
    const btip = to.x - G.gap;
    const bxe = btip - G.arrow;
    const bclear = (t._minL != null ? t._minL : Math.min(bxs, btip)) - G.gap;
    const bpeak = bclear - bowDepth(lane, t.from - t.to);
    const d3 = 'M ' + bxs.toFixed(1) + ' ' + yi.toFixed(1) +
      ' C ' + bpeak.toFixed(1) + ' ' + yi.toFixed(1) + ', ' + bpeak.toFixed(1) + ' ' + yj.toFixed(1) + ', ' + bxe.toFixed(1) + ' ' + yj.toFixed(1);
    return '<path class="state-edge" data-dir="back" d="' + d3 + '"/>' +
      arrowhead(btip, yj, 0, 'back') +
      (ev ? edgeLabel(cubicMid(bxs, bpeak, bpeak, bxe), (yi + yj) / 2, ev, 'back', 'middle') : '');
  }

  function edgeLR(t, from, to, lane, ev) {
    if (t.isSelf) {
      const x = t.selfOff != null ? t.selfOff : from.x + from.w / 2;
      const xLeft = x - G.selfHalf, xRight = x + G.selfHalf;
      const yd = from.y + from.h + G.gap;
      const yp = yd + G.selfPeak;
      const yl = yd + G.arrow;
      const d = 'M ' + xLeft.toFixed(1) + ' ' + yd.toFixed(1) +
        ' C ' + (xLeft - 4).toFixed(1) + ' ' + yp + ', ' + (xRight + 4).toFixed(1) + ' ' + yp +
        ', ' + xRight.toFixed(1) + ' ' + yl.toFixed(1);
      return '<path class="state-edge" data-dir="self" data-self="true" d="' + d + '"/>' +
        arrowhead(xRight, yd, 270, 'self') +
        (ev ? edgeLabel(x, cubicMid(yd, yp, yp, yl), ev, 'self', 'middle') : '');
    }
    if (t.to === t.from + 1) {
      const y = from.y + from.h / 2;
      const xs = from.x + from.w + G.gap;
      const tip = to.x - G.gap;
      const xe = tip - G.arrow;
      return '<path class="state-edge" data-dir="forward" d="M ' + xs.toFixed(1) + ' ' + y.toFixed(1) + ' L ' + xe.toFixed(1) + ' ' + y.toFixed(1) + '"/>' +
        arrowhead(tip, y, 0, 'forward') +
        (ev ? edgeLabel((xs + tip) / 2, y, ev, 'forward', 'middle') : '');
    }
    const xi = t.fromOff != null ? t.fromOff : from.x + from.w / 2;
    const xj = t.toOff != null ? t.toOff : to.x + to.w / 2;
    if (t.to > t.from + 1) {
      const ys = from.y + from.h + G.gap;
      const tipy = to.y + to.h + G.gap;
      const ye = tipy + G.arrow;
      const clear = (t._maxB != null ? t._maxB : Math.max(ys, tipy)) + G.gap;
      const peak = clear + bowDepth(lane, t.to - t.from);
      const d2 = 'M ' + xi.toFixed(1) + ' ' + ys.toFixed(1) +
        ' C ' + xi.toFixed(1) + ' ' + peak.toFixed(1) + ', ' + xj.toFixed(1) + ' ' + peak.toFixed(1) + ', ' + xj.toFixed(1) + ' ' + ye.toFixed(1);
      return '<path class="state-edge" data-dir="forward" d="' + d2 + '"/>' +
        arrowhead(xj, tipy, 270, 'forward') +
        (ev ? edgeLabel((xi + xj) / 2, cubicMid(ys, peak, peak, ye), ev, 'forward', 'middle') : '');
    }
    const bys = from.y - G.gap;
    const btip = to.y - G.gap;
    const bye = btip - G.arrow;
    const bclear = (t._minT != null ? t._minT : Math.min(bys, btip)) - G.gap;
    const bpeak = bclear - bowDepth(lane, t.from - t.to);
    const d3 = 'M ' + xi.toFixed(1) + ' ' + bys.toFixed(1) +
      ' C ' + xi.toFixed(1) + ' ' + bpeak.toFixed(1) + ', ' + xj.toFixed(1) + ' ' + bpeak.toFixed(1) + ', ' + xj.toFixed(1) + ' ' + bye.toFixed(1);
    return '<path class="state-edge" data-dir="back" d="' + d3 + '"/>' +
      arrowhead(xj, btip, 90, 'back') +
      (ev ? edgeLabel((xi + xj) / 2, cubicMid(bys, bpeak, bpeak, bye), ev, 'back', 'middle') : '');
  }

  function edge(t, byIndex, lane, dir) {
    const from = byIndex[t.from], to = byIndex[t.to];
    if (!from || !to) return '';
    const ev = t.event || '';
    const body = dir === 'lr' ? edgeLR(t, from, to, lane, ev) : edgeTB(t, from, to, lane, ev);
    const d = t.isSelf ? 'self' : (t.to > t.from ? 'forward' : 'back');
    return '<g class="state-edge-group" data-dir="' + d + '">' + body + '</g>';
  }

  function draw(fig) {
    const raw = fig.getAttribute('data-sc-transitions');
    if (raw == null) return;
    let transitions;
    try { transitions = JSON.parse(raw); } catch (e) { return; }
    const svg = fig.querySelector('.state-chart-edges');
    const nodeEls = fig.querySelectorAll('.state-node');
    if (!svg || !nodeEls.length) return;

    const figRect = fig.getBoundingClientRect();
    if (!figRect.width || !figRect.height) return;
    const byIndex = {};
    const nodes = [];
    for (let k = 0; k < nodeEls.length; k++) {
      const el = nodeEls[k];
      const r = el.getBoundingClientRect();
      const n = {
        index: parseInt(el.getAttribute('data-index'), 10),
        x: r.left - figRect.left,
        y: r.top - figRect.top,
        w: r.width,
        h: r.height,
        isStart: el.getAttribute('data-kind') === 'start',
        isTerminal: el.getAttribute('data-kind') === 'terminal',
      };
      nodes.push(n);
      byIndex[n.index] = n;
    }

    svg.setAttribute('viewBox', '0 0 ' + figRect.width.toFixed(1) + ' ' + figRect.height.toFixed(1));
    svg.setAttribute('width', figRect.width.toFixed(1));
    svg.setAttribute('height', figRect.height.toFixed(1));

    const dir = fig.getAttribute('data-sc-dir') === 'lr' ? 'lr' : 'tb';
    assignPorts(transitions, byIndex, dir);
    // Clearance: a non-adjacent edge must bow past the DEEPEST node in its
    // span, not just its own endpoints — otherwise a short skip past a wide
    // node tucks its curve (and label) behind that node, which paints over
    // the edge layer. Record the extreme node extents across [from..to].
    transitions.forEach((t) => {
      if (t.isSelf || t.to === t.from + 1) return;
      const lo = Math.min(t.from, t.to), hi = Math.max(t.from, t.to);
      let maxR = -Infinity, minL = Infinity, maxB = -Infinity, minT = Infinity;
      for (let idx = lo; idx <= hi; idx++) {
        const n = byIndex[idx];
        if (!n) continue;
        if (n.x + n.w > maxR) maxR = n.x + n.w;
        if (n.x < minL) minL = n.x;
        if (n.y + n.h > maxB) maxB = n.y + n.h;
        if (n.y < minT) minT = n.y;
      }
      t._maxR = maxR; t._minL = minL; t._maxB = maxB; t._minT = minT;
    });
    const lanes = assignLanes(transitions);
    const parts = [];
    nodes.forEach((n) => { if (n.isStart) parts.push(startMarker(n, dir)); });
    transitions.forEach((t, i) => { parts.push(edge(t, byIndex, lanes[i] || 0, dir)); });
    nodes.forEach((n) => { if (n.isTerminal) parts.push(terminalMarker(n, dir)); });
    svg.innerHTML = parts.join('');
  }

  function drawAll() {
    const figs = doc.querySelectorAll('.state-chart-figure[data-sc-transitions]');
    for (let i = 0; i < figs.length; i++) draw(figs[i]);
  }

  // Always redraw on call (content may have changed). Attach the one-shot
  // listeners and observers only once per document — the runtime invokes
  // this on every transform pass, so re-attaching would leak observers.
  drawAll();
  if (doc.__scLayoutInstalled) return;
  doc.__scLayoutInstalled = true;

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', drawAll);
  }
  // Re-measure once webfonts settle (label widths shift when Outfit loads).
  if (doc.fonts && doc.fonts.ready && typeof doc.fonts.ready.then === 'function') {
    doc.fonts.ready.then(drawAll);
  }
  // Live preview: re-draw on resize.
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => { drawAll(); });
    const figs2 = doc.querySelectorAll('.state-chart-figure');
    for (let j = 0; j < figs2.length; j++) ro.observe(figs2[j]);
  }
}

// Serialised form for the emulator's bootstrap <script>. Self-invoking.
const STATE_CHART_BROWSER_JS = '(' + installStateChartLayout.toString() + ')(document);';

module.exports = {
  STATE_CHART_VARIANTS,
  STATUS_KEYWORDS,
  STATE_ATTR_KEYWORDS,
  TRANSITION_RE,
  parseTransitionToken,
  parseStateLi,
  parseStateChart,
  buildStateChart,
  matchEyebrowText,
  installStateChartLayout,
  STATE_CHART_BROWSER_JS,
  // Exposed for unit tests:
  stripTrailingPills,
  splitTopLevelLis,
  findOuterList,
};
