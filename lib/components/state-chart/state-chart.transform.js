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

const STATE_CHART_VARIANTS = ['inline', 'horizontal'];

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

// ── Variant dispatch ─────────────────────────────────────────────────────

function pickVariant(classTokens) {
  for (const v of STATE_CHART_VARIANTS) {
    if (classTokens.includes(v)) return v;
  }
  return 'default';
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

function buildDefault(model) {
  const nodes = model.states.map(renderHtmlNode).join('');
  // Serialise the transition list for the browser pass. Single-quoted attr,
  // so escape single quotes in the JSON (events can't contain them, but be safe).
  const data = escAttr(JSON.stringify(model.transitions));
  return `<div class="state-chart-figure" data-variant="default" data-states="${model.states.length}" data-transitions="${model.transitions.length}" data-sc-transitions="${data}">` +
    `<ol class="state-nodes">${nodes}</ol>` +
    `<svg class="state-chart-edges" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"></svg>` +
    `</div>`;
}

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

function buildStateChart(model, variant) {
  if (variant === 'inline' || variant === 'horizontal') return renderInline(model);
  return buildDefault(model);
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

  function startMarker(n) {
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

  function terminalMarker(n) {
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

  function edge(t, byIndex, lane) {
    const from = byIndex[t.from], to = byIndex[t.to];
    if (!from || !to) return '';
    const ev = t.event || '';

    // Cubic Bezier midpoint (t=0.5): 0.125·P0 + 0.375·P1 + 0.375·P2 + 0.125·P3.
    // Labels sit ON the line at this point, centred, with a background halo
    // (paint-order:stroke in CSS) masking the stroke behind them.
    function cubicMid(p0, p1, p2, p3) {
      return 0.125 * p0 + 0.375 * p1 + 0.375 * p2 + 0.125 * p3;
    }

    if (t.isSelf) {
      const y = from.y + from.h / 2;
      const yTop = y - G.selfHalf, yBot = y + G.selfHalf;
      const xd = from.x + from.w + G.gap;
      const xp = xd + G.selfPeak;
      const xl = xd + G.arrow;
      const d = 'M ' + xd.toFixed(1) + ' ' + yTop.toFixed(1) +
        ' C ' + xp + ' ' + (yTop - 4).toFixed(1) + ', ' + xp + ' ' + (yBot + 4).toFixed(1) +
        ', ' + xl.toFixed(1) + ' ' + yBot.toFixed(1);
      const mx = cubicMid(xd, xp, xp, xl);
      return '<g class="state-edge-group" data-dir="self">' +
        '<path class="state-edge" data-dir="self" data-self="true" d="' + d + '"/>' +
        arrowhead(xd, yBot, 180, 'self') +
        (ev ? edgeLabel(mx, y, ev, 'self', 'middle') : '') + '</g>';
    }

    const yi = from.y + from.h / 2, yj = to.y + to.h / 2;

    if (t.to === t.from + 1) {
      const x = from.x + from.w / 2;
      const ys = from.y + from.h + G.gap;
      const tip = to.y - G.gap;
      const ye = tip - G.arrow;
      const dd = 'M ' + x.toFixed(1) + ' ' + ys.toFixed(1) + ' L ' + x.toFixed(1) + ' ' + ye.toFixed(1);
      return '<g class="state-edge-group" data-dir="forward">' +
        '<path class="state-edge" data-dir="forward" d="' + dd + '"/>' +
        arrowhead(x, tip, 90, 'forward') +
        (ev ? edgeLabel(x, (ys + tip) / 2, ev, 'forward', 'middle') : '') + '</g>';
    }

    if (t.to > t.from + 1) {
      const xs = from.x + from.w + G.gap;
      const tipx = to.x + to.w + G.gap;
      const xe = tipx + G.arrow;
      const peak = Math.max(xs, tipx) + G.laneBase + lane * G.laneStep;
      const d2 = 'M ' + xs.toFixed(1) + ' ' + yi.toFixed(1) +
        ' C ' + peak + ' ' + yi.toFixed(1) + ', ' + peak + ' ' + yj.toFixed(1) +
        ', ' + xe.toFixed(1) + ' ' + yj.toFixed(1);
      const mx = cubicMid(xs, peak, peak, xe);
      return '<g class="state-edge-group" data-dir="forward">' +
        '<path class="state-edge" data-dir="forward" d="' + d2 + '"/>' +
        arrowhead(tipx, yj, 180, 'forward') +
        (ev ? edgeLabel(mx, (yi + yj) / 2, ev, 'forward', 'middle') : '') + '</g>';
    }

    // back edge
    const bxs = from.x - G.gap;
    const btip = to.x - G.gap;
    const bxe = btip - G.arrow;
    const bpeak = Math.min(bxs, btip) - G.laneBase - lane * G.laneStep;
    const d3 = 'M ' + bxs.toFixed(1) + ' ' + yi.toFixed(1) +
      ' C ' + bpeak + ' ' + yi.toFixed(1) + ', ' + bpeak + ' ' + yj.toFixed(1) +
      ', ' + bxe.toFixed(1) + ' ' + yj.toFixed(1);
    const bmx = cubicMid(bxs, bpeak, bpeak, bxe);
    return '<g class="state-edge-group" data-dir="back">' +
      '<path class="state-edge" data-dir="back" d="' + d3 + '"/>' +
      arrowhead(btip, yj, 0, 'back') +
      (ev ? edgeLabel(bmx, (yi + yj) / 2, ev, 'back', 'middle') : '') + '</g>';
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

    const lanes = assignLanes(transitions);
    const parts = [];
    nodes.forEach((n) => { if (n.isStart) parts.push(startMarker(n)); });
    transitions.forEach((t, i) => { parts.push(edge(t, byIndex, lanes[i] || 0)); });
    nodes.forEach((n) => { if (n.isTerminal) parts.push(terminalMarker(n)); });
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
  pickVariant,
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
