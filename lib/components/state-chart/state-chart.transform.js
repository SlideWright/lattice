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
// Event label is any run of characters up to the `=>` arrow (CJK, accents,
// punctuation — not just ASCII); `[^=]` stops before the arrow's first `=`.
const TRANSITION_RE = /^\s*([^=]*?)\s*=>\s*(\d+|self)\s*$/;

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

function buildDefault(model, dir, style) {
  const nodes = model.states.map(renderHtmlNode).join('');
  // Serialise the transition list for the browser pass.
  const data = escAttr(JSON.stringify(model.transitions));
  const d = dir === 'lr' ? 'lr' : 'tb';
  const styleAttr = style === 'curved' ? ' data-sc-style="curved"' : '';
  return `<div class="state-chart-figure" data-variant="default" data-sc-dir="${d}"${styleAttr} data-states="${model.states.length}" data-transitions="${model.transitions.length}" data-sc-transitions="${data}">` +
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
  const style = tokens.includes('curved') ? 'curved' : 'orthogonal';
  return inline ? renderInline(model, dir) : buildDefault(model, dir, style);
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

  // Measures rendered label width in px, using the same 11px monospace as
  // the .state-edge-label rule (resolves --font-mono from the figure). One
  // shared canvas context; returns 0 for empty events.
  function makeLabelW(fig) {
    let ctx = null;
    let font = '11px monospace';
    try {
      const mono = (getComputedStyle(fig).getPropertyValue('--font-mono') || '').trim();
      if (mono) font = '11px ' + mono;
      const c = doc.createElement('canvas');
      ctx = c.getContext('2d');
      ctx.font = font;
    } catch { ctx = null; }
    return (s) => {
      if (!s) return 0;
      if (ctx) return ctx.measureText(s).width;
      return String(s).length * 6.6;
    };
  }

  // Geometry-aware bow packing. Each non-adjacent edge must clear (a) the
  // WIDEST node across its [lo..hi] span and (b) every inner edge already
  // placed on the same side whose rows it overlaps — including that edge's
  // label, which is horizontal text and so consumes cross-axis width. We
  // sort by span ascending (innermost first) and carry a per-row frontier
  // of the outermost extent consumed so far; each edge bows G.laneBase past
  // the deeper of its node-clearance and that frontier, then publishes its
  // own outer extent (curve apex + label half-width) back to the frontier.
  // Sets t._peak (the control-point cross coordinate) per edge. Forward
  // skips and back-edges pack independently (opposite gutters).
  function assignBows(transitions, dir, labelW) {
    ['skip', 'back'].forEach((side) => {
      const isSkipSide = side === 'skip';
      // Detour gutter: TB sends forward skips right (max) / backs left (min);
      // LR is the 90° transpose — forward skips arc over the top (min) and
      // backs under the bottom (max).
      const max = dir === 'lr' ? !isSkipSide : isSkipSide;
      const list = [];
      transitions.forEach((t) => {
        if (t.isSelf) return;
        const isSkip = t.to > t.from + 1, isBack = t.to < t.from;
        if (isSkipSide ? !isSkip : !isBack) return;
        list.push({ t, lo: Math.min(t.from, t.to), hi: Math.max(t.from, t.to), span: Math.abs(t.to - t.from) });
      });
      list.sort((a, b) => a.span - b.span || a.lo - b.lo);
      const frontier = {};
      list.forEach((it) => {
        const t = it.t;
        const nodeClear = (dir === 'lr' ? (max ? t._maxB : t._minT) : (max ? t._maxR : t._minL)) + (max ? G.gap : -G.gap);
        let front = max ? -Infinity : Infinity;
        for (let r = it.lo; r <= it.hi; r++) {
          if (frontier[r] == null) continue;
          front = max ? Math.max(front, frontier[r]) : Math.min(front, frontier[r]);
        }
        const base = max ? Math.max(nodeClear, front) : Math.min(nodeClear, front);
        const peak = base + (max ? G.laneBase : -G.laneBase);
        t._peak = peak;
        // The curve apex sits exactly at peak and its label centres there, so
        // the outer extent is peak plus the label half-width (overhang) and a
        // pad. The next outer edge clears that.
        const half = labelW(t.event || '') / 2;
        const reserve = (half > 0 ? half : 0) + 8;
        const outer = peak + (max ? reserve : -reserve);
        for (let r = it.lo; r <= it.hi; r++) frontier[r] = outer;
      });
    });
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
  // Each gutter-side face exposes 5 fixed anchor slots at (i+1)/6 of the
  // edge. A skip/back edge picks one slot per endpoint: a lone connection
  // takes the middle (s2); when several edges share a face they spread
  // evenly across the 5 slots, ordered by the OTHER endpoint's flow
  // position so the arcs fan out without crossing. Forward skips attach on
  // the forward gutter face (TB right / LR top), backs on the other (TB
  // left / LR bottom). Sets fromOff / toOff (the along-face coordinate:
  // TB y, LR x). The straight adjacent spine stays on the face centre.
  function assignPorts(transitions, byIndex, dir) {
    const reg = {};
    const R = (idx) => (reg[idx] || (reg[idx] = { fwd: [], back: [] }));
    const selfs = [];
    transitions.forEach((t) => {
      const from = byIndex[t.from], to = byIndex[t.to];
      if (!from || !to) return;
      if (t.isSelf) { selfs.push(t); return; }
      if (t.to > t.from + 1) {
        R(t.from).fwd.push({ t, role: 'from', other: t.to });
        R(t.to).fwd.push({ t, role: 'to', other: t.from });
      } else if (t.to < t.from) {
        R(t.from).back.push({ t, role: 'from', other: t.to });
        R(t.to).back.push({ t, role: 'to', other: t.from });
      }
    });
    // Self-loops are CORNER loops, not slot edges: they route on the emptier
    // side face (ties → conventional: right for TB, bottom for LR) and wrap
    // the corner between that face and the trail face. They keep their own
    // fixed anchors, so they don't consume a skip/back slot — just tag side.
    selfs.forEach((t) => {
      const r = R(t.from);
      const useBack = r.fwd.length === r.back.length ? dir === 'lr' : r.back.length < r.fwd.length;
      t._selfSide = dir === 'lr' ? (useBack ? 'bottom' : 'top') : (useBack ? 'left' : 'right');
    });
    const flowOf = (idx) => { const n = byIndex[idx]; return dir === 'lr' ? n.x + n.w / 2 : n.y + n.h / 2; };
    Object.keys(reg).forEach((idx) => {
      const n = byIndex[idx];
      if (!n) return;
      const lo = dir === 'lr' ? n.x : n.y;
      const ext = dir === 'lr' ? n.w : n.h;
      ['fwd', 'back'].forEach((kind) => {
        const list = reg[idx][kind];
        if (!list.length) return;
        // Arcs nest by span (longer skip bows deeper), so the FARTHEST other
        // endpoint takes the top slot and becomes the outer arc — sort by
        // other-endpoint flow position descending.
        list.sort((a, b) => flowOf(b.other) - flowOf(a.other));
        const N = list.length;
        list.forEach((item, k) => {
          let frac;
          if (N === 1) frac = 0.5;                       // lone connection → middle slot
          else if (N <= 5) frac = (Math.round(k * 4 / (N - 1)) + 1) / 6;  // even across the 5 slots
          else frac = (k + 1) / (N + 1);                 // overflow → subdivide finer
          const off = lo + frac * ext;
          if (item.role === 'from') item.t.fromOff = off; else item.t.toOff = off;
        });
      });
    });
  }

  // ── Edges ──
  // TB flows down the centre; adjacent steps run straight bottom→top.
  // Skip/back edges attach to the gutter-side faces — forward skips on the
  // RIGHT face (arrow points left into it), backs on the LEFT face (arrow
  // points right) — and a single cubic bows out to the gutter peak. The
  // attachment point along the face comes from the 5-slot picker
  // (fromOff/toOff). Self-loops stay on the right. LR is the 90° transpose:
  // forward skips arc over the TOP face, backs under the BOTTOM.
  function edgeTB(t, from, to, ev, style) {
    if (t.isSelf) {
      // Corner loop: tail on the TOP edge, head on the side edge, wrapping the
      // top corner. Right side T5→R1, left side T1→R1's mirror (T1→L1).
      const P = G.selfPeak;
      const ty = from.y - G.gap;                 // tail exits above the top edge
      const hy = from.y + from.h / 6;            // head near the top of the side edge (slot 1)
      if (t._selfSide === 'left') {
        const tx = from.x + from.w / 6;          // T1
        const tip = from.x - G.gap;              // arrow tip just left of left edge
        const hx = tip - G.arrow;                // curve end (base)
        const d = 'M ' + tx.toFixed(1) + ' ' + ty.toFixed(1) +
          ' C ' + tx.toFixed(1) + ' ' + (ty - P).toFixed(1) + ', ' + (hx - P).toFixed(1) + ' ' + hy.toFixed(1) + ', ' + hx.toFixed(1) + ' ' + hy.toFixed(1);
        return '<path class="state-edge" data-dir="self" data-self="true" d="' + d + '"/>' +
          arrowhead(tip, hy, 0, 'self') +
          (ev ? edgeLabel(from.x - P * 0.7, ty - P * 0.2, ev, 'self', 'middle') : '');
      }
      const tx = from.x + from.w * 5 / 6;        // T5
      const tip = from.x + from.w + G.gap;       // arrow tip just right of right edge
      const hx = tip + G.arrow;                  // curve end (base)
      const d = 'M ' + tx.toFixed(1) + ' ' + ty.toFixed(1) +
        ' C ' + tx.toFixed(1) + ' ' + (ty - P).toFixed(1) + ', ' + (hx + P).toFixed(1) + ' ' + hy.toFixed(1) + ', ' + hx.toFixed(1) + ' ' + hy.toFixed(1);
      return '<path class="state-edge" data-dir="self" data-self="true" d="' + d + '"/>' +
        arrowhead(tip, hy, 180, 'self') +
        (ev ? edgeLabel(from.x + from.w + P * 0.7, ty - P * 0.2, ev, 'self', 'middle') : '');
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
    // Skip/back bow. Endpoint y comes from the 5-slot picker. Two styles:
    // ORTHOGONAL (default) — round out to peak, run STRAIGHT down the gutter
    // at peak (every intermediate node cleared by construction), round back
    // in. CURVED — a single cubic bow; its peak is boosted to _peakCurved so
    // the reduced reach still clears the widest node (capped). Back-edges
    // mirror on the left.
    const yi = t.fromOff != null ? t.fromOff : from.y + from.h / 2;
    const yj = t.toOff != null ? t.toOff : to.y + to.h / 2;
    const dir = yj >= yi ? 1 : -1;
    const r = Math.max(2, Math.min(Math.abs(yj - yi) / 2 - 1, 16));
    const track = (px, sx, ex) =>
      'M ' + sx.toFixed(1) + ' ' + yi.toFixed(1) +
      ' C ' + px.toFixed(1) + ' ' + yi.toFixed(1) + ', ' + px.toFixed(1) + ' ' + yi.toFixed(1) + ', ' + px.toFixed(1) + ' ' + (yi + dir * r).toFixed(1) +
      ' L ' + px.toFixed(1) + ' ' + (yj - dir * r).toFixed(1) +
      ' C ' + px.toFixed(1) + ' ' + yj.toFixed(1) + ', ' + px.toFixed(1) + ' ' + yj.toFixed(1) + ', ' + ex.toFixed(1) + ' ' + yj.toFixed(1);
    const curve = (px, sx, ex) =>
      'M ' + sx.toFixed(1) + ' ' + yi.toFixed(1) + ' C ' + px.toFixed(1) + ' ' + yi.toFixed(1) + ', ' + px.toFixed(1) + ' ' + yj.toFixed(1) + ', ' + ex.toFixed(1) + ' ' + yj.toFixed(1);
    const my = (yi + yj) / 2;
    if (t.to > t.from + 1) {
      const xs = from.x + from.w + G.gap;
      const tipx = to.x + to.w + G.gap;
      const xe = tipx + G.arrow;
      const peak = t._peak != null ? t._peak : (t._maxR != null ? t._maxR : Math.max(from.x + from.w, to.x + to.w)) + G.gap + G.laneBase;
      if (style === 'curved') {
        const pk = Math.min(Math.max(peak, t._peakCurved != null ? t._peakCurved : peak), peak + 260);
        return '<path class="state-edge" data-dir="forward" d="' + curve(pk, xs, xe) + '"/>' +
          arrowhead(tipx, yj, 180, 'forward') +
          (ev ? edgeLabel(0.75 * pk + 0.125 * (xs + xe), my, ev, 'forward', 'middle') : '');
      }
      return '<path class="state-edge" data-dir="forward" d="' + track(peak, xs, xe) + '"/>' +
        arrowhead(tipx, yj, 180, 'forward') +
        (ev ? edgeLabel(peak, my, ev, 'forward', 'middle') : '');
    }
    const bxs = from.x - G.gap;
    const btipx = to.x - G.gap;
    const bxe = btipx - G.arrow;
    const bpeak = t._peak != null ? t._peak : (t._minL != null ? t._minL : Math.min(from.x, to.x)) - G.gap - G.laneBase;
    if (style === 'curved') {
      const pk = Math.max(Math.min(bpeak, t._peakCurved != null ? t._peakCurved : bpeak), bpeak - 260);
      return '<path class="state-edge" data-dir="back" d="' + curve(pk, bxs, bxe) + '"/>' +
        arrowhead(btipx, yj, 0, 'back') +
        (ev ? edgeLabel(0.75 * pk + 0.125 * (bxs + bxe), my, ev, 'back', 'middle') : '');
    }
    return '<path class="state-edge" data-dir="back" d="' + track(bpeak, bxs, bxe) + '"/>' +
      arrowhead(btipx, yj, 0, 'back') +
      (ev ? edgeLabel(bpeak, my, ev, 'back', 'middle') : '');
  }

  function edgeLR(t, from, to, ev, style) {
    if (t.isSelf) {
      // Corner loop (LR transpose): tail on the LEFT edge, head on the gutter
      // edge (bottom or top), wrapping the left corner.
      const P = G.selfPeak;
      const tx = from.x - G.gap;                 // tail exits left of the left edge
      const hx = from.x + from.w / 6;            // head near the left of the gutter edge
      if (t._selfSide === 'top') {
        const ty = from.y + from.h / 6;          // L1
        const tip = from.y - G.gap;              // arrow tip just above the top edge
        const hy = tip - G.arrow;
        const d = 'M ' + tx.toFixed(1) + ' ' + ty.toFixed(1) +
          ' C ' + (tx - P).toFixed(1) + ' ' + ty.toFixed(1) + ', ' + hx.toFixed(1) + ' ' + (hy - P).toFixed(1) + ', ' + hx.toFixed(1) + ' ' + hy.toFixed(1);
        return '<path class="state-edge" data-dir="self" data-self="true" d="' + d + '"/>' +
          arrowhead(hx, tip, 90, 'self') +
          (ev ? edgeLabel(tx - P * 0.2, from.y - P * 0.7, ev, 'self', 'middle') : '');
      }
      const ty = from.y + from.h * 5 / 6;        // L5
      const tip = from.y + from.h + G.gap;       // arrow tip just below the bottom edge
      const hy = tip + G.arrow;
      const d = 'M ' + tx.toFixed(1) + ' ' + ty.toFixed(1) +
        ' C ' + (tx - P).toFixed(1) + ' ' + ty.toFixed(1) + ', ' + hx.toFixed(1) + ' ' + (hy + P).toFixed(1) + ', ' + hx.toFixed(1) + ' ' + hy.toFixed(1);
      return '<path class="state-edge" data-dir="self" data-self="true" d="' + d + '"/>' +
        arrowhead(hx, tip, 270, 'self') +
        (ev ? edgeLabel(tx - P * 0.2, from.y + from.h + P * 0.7, ev, 'self', 'middle') : '');
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
    // Side-face racetrack (LR transpose). Forward skips leave the left node's
    // TOP face, round up to the gutter peak, run STRAIGHT across at peak (so
    // intermediate nodes are cleared), then round down into the right node's
    // top face (arrow down). Back-edges mirror under the bottom.
    const xi = t.fromOff != null ? t.fromOff : from.x + from.w / 2;
    const xj = t.toOff != null ? t.toOff : to.x + to.w / 2;
    const dir = xj >= xi ? 1 : -1;
    const r = Math.max(2, Math.min(Math.abs(xj - xi) / 2 - 1, 16));
    const track = (py, sy, ey) =>
      'M ' + xi.toFixed(1) + ' ' + sy.toFixed(1) +
      ' C ' + xi.toFixed(1) + ' ' + py.toFixed(1) + ', ' + xi.toFixed(1) + ' ' + py.toFixed(1) + ', ' + (xi + dir * r).toFixed(1) + ' ' + py.toFixed(1) +
      ' L ' + (xj - dir * r).toFixed(1) + ' ' + py.toFixed(1) +
      ' C ' + xj.toFixed(1) + ' ' + py.toFixed(1) + ', ' + xj.toFixed(1) + ' ' + py.toFixed(1) + ', ' + xj.toFixed(1) + ' ' + ey.toFixed(1);
    const curve = (py, sy, ey) =>
      'M ' + xi.toFixed(1) + ' ' + sy.toFixed(1) + ' C ' + xi.toFixed(1) + ' ' + py.toFixed(1) + ', ' + xj.toFixed(1) + ' ' + py.toFixed(1) + ', ' + xj.toFixed(1) + ' ' + ey.toFixed(1);
    const mx = (xi + xj) / 2;
    if (t.to > t.from + 1) {
      const ys = from.y - G.gap;
      const tipy = to.y - G.gap;
      const ye = tipy - G.arrow;
      const peak = t._peak != null ? t._peak : (t._minT != null ? t._minT : Math.min(from.y, to.y)) - G.gap - G.laneBase;
      if (style === 'curved') {
        const pk = Math.max(Math.min(peak, t._peakCurved != null ? t._peakCurved : peak), peak - 260);
        return '<path class="state-edge" data-dir="forward" d="' + curve(pk, ys, ye) + '"/>' +
          arrowhead(xj, tipy, 90, 'forward') +
          (ev ? edgeLabel(mx, 0.75 * pk + 0.125 * (ys + ye), ev, 'forward', 'middle') : '');
      }
      return '<path class="state-edge" data-dir="forward" d="' + track(peak, ys, ye) + '"/>' +
        arrowhead(xj, tipy, 90, 'forward') +
        (ev ? edgeLabel(mx, peak, ev, 'forward', 'middle') : '');
    }
    const bys = from.y + from.h + G.gap;
    const btipy = to.y + to.h + G.gap;
    const bye = btipy + G.arrow;
    const bpeak = t._peak != null ? t._peak : (t._maxB != null ? t._maxB : Math.max(from.y + from.h, to.y + to.h)) + G.gap + G.laneBase;
    if (style === 'curved') {
      const pk = Math.min(Math.max(bpeak, t._peakCurved != null ? t._peakCurved : bpeak), bpeak + 260);
      return '<path class="state-edge" data-dir="back" d="' + curve(pk, bys, bye) + '"/>' +
        arrowhead(xj, btipy, 270, 'back') +
        (ev ? edgeLabel(mx, 0.75 * pk + 0.125 * (bys + bye), ev, 'back', 'middle') : '');
    }
    return '<path class="state-edge" data-dir="back" d="' + track(bpeak, bys, bye) + '"/>' +
      arrowhead(xj, btipy, 270, 'back') +
      (ev ? edgeLabel(mx, bpeak, ev, 'back', 'middle') : '');
  }

  function edge(t, byIndex, dir, style) {
    const from = byIndex[t.from], to = byIndex[t.to];
    if (!from || !to) return '';
    const ev = t.event || '';
    const body = dir === 'lr' ? edgeLR(t, from, to, ev, style) : edgeTB(t, from, to, ev, style);
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

    const dir = fig.getAttribute('data-sc-dir') === 'lr' ? 'lr' : 'tb';
    const style = fig.getAttribute('data-sc-style') === 'curved' ? 'curved' : 'orthogonal';
    const measure = makeLabelW(fig);

    // Stretch the node gap so a labeled ADJACENT edge's connector outruns its
    // label (line visible on both sides). TB labels cross the line (constant
    // height), LR labels ride it (measured width). Only labeled adjacent edges
    // drive this, so label-free charts stay compact. Set before measuring.
    const ol = fig.querySelector('.state-nodes');
    if (ol) {
      let need = 0;
      transitions.forEach((t) => {
        if (t.isSelf || t.to !== t.from + 1 || !t.event) return;
        const extent = dir === 'lr' ? measure(t.event) : 16;
        const g = extent + 2 * 9 + G.arrow + 2 * G.gap;
        if (g > need) need = g;
      });
      ol.style.gap = Math.max(dir === 'lr' ? 56 : 34, need).toFixed(1) + 'px';
    }

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

    assignPorts(transitions, byIndex, dir);
    // Clearance: a non-adjacent edge must clear the DEEPEST node in its span.
    // Orthogonal runs straight at peak so the extreme node extents suffice;
    // the curved variant also records _peakCurved — the peak a single cubic
    // needs so its (reduced) reach still clears each intermediate node at the
    // node's row (reach = 3·t·(1−t), clamped; capped against ballooning).
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
      if (style === 'curved') {
        const from = byIndex[t.from], to = byIndex[t.to];
        const max = dir === 'lr' ? t.to < t.from : t.to > t.from;
        const ext = (n) => (dir === 'lr' ? (max ? n.y + n.h : n.y) : (max ? n.x + n.w : n.x));
        const xs = ext(from), xe = ext(to);
        let req = max ? -Infinity : Infinity;
        for (let idx = lo + 1; idx < hi; idx++) {
          const n = byIndex[idx];
          if (!n) continue;
          const p = (idx - lo) / (hi - lo);
          const reach = Math.max(0.18, 3 * p * (1 - p));
          const blend = (1 - p) ** 3 * xs + p ** 3 * xe;
          const target = ext(n) + (max ? 12 : -12);
          const r = blend + (target - blend) / reach;
          req = max ? Math.max(req, r) : Math.min(req, r);
        }
        if (Number.isFinite(req)) t._peakCurved = req;
      }
    });
    assignBows(transitions, dir, measure);
    const parts = [];
    nodes.forEach((n) => { if (n.isStart) parts.push(startMarker(n, dir)); });
    transitions.forEach((t) => { parts.push(edge(t, byIndex, dir, style)); });
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
