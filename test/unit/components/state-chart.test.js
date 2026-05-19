/**
 * Unit: lib/components/state-chart/state-chart.transform.js — kernel for
 * the `state-chart` chart-family member.
 *
 * Section dispatch + chart-frame wrapping live in lib/chart-family/chart-family.js
 * (state-chart is one of CHART_LAYOUTS); this kernel just produces the figure HTML.
 * Tests cover the layers chart-family delegates to:
 *
 *   1. Transition-token lex: parseTransitionToken — `=>N`, `event=>N`,
 *      whitespace variants, `self` keyword, HTML-entity-escaped `&gt;`.
 *   2. State parsing: parseStateLi — label / status / start / end /
 *      unknown-pill fallthrough.
 *   3. Top-level parsing: parseStateChart — flatten transitions, resolve
 *      `self`, implicit start / terminal fallbacks.
 *   4. Lane assignment: assignEdgeLanes — greedy interval-packing.
 *   5. Variant dispatch: pickVariant.
 *   6. SVG emission: buildStateChart — figure structure, edge / arrow /
 *      label counts, data-dir attribution.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  STATE_CHART_VARIANTS,
  STATUS_KEYWORDS,
  GEOM,
  TRANSITION_RE,
  pickVariant,
  parseTransitionToken,
  parseStateLi,
  parseStateChart,
  assignEdgeLanes,
  buildStateChart,
  matchEyebrowText,
  rowCentreY,
} = require('../../../lib/components/state-chart/state-chart.transform');

// ── Fixtures ────────────────────────────────────────────────────────────

// Mirrors what markdown-it / lattice-emulator emit for the worked example
// in the manifest. `>` inside inline code is HTML-escaped to `&gt;`.
const OL_WORKED = (
  '<ol>' +
    '<li>Draft <code>start</code>' +
      '<ul>' +
        '<li><code>submit =&gt; 2</code></li>' +
        '<li><code>discard =&gt; 6</code></li>' +
      '</ul>' +
    '</li>' +
    '<li>Submitted <code>on-track</code>' +
      '<ul>' +
        '<li><code>review =&gt; 3</code></li>' +
      '</ul>' +
    '</li>' +
    '<li>In Review' +
      '<ul>' +
        '<li><code>approve =&gt; 4</code></li>' +
        '<li><code>reject =&gt; 1</code></li>' +
        '<li><code>revise =&gt; self</code></li>' +
      '</ul>' +
    '</li>' +
    '<li>Approved <code>done</code>' +
      '<ul>' +
        '<li><code>publish =&gt; 5</code></li>' +
      '</ul>' +
    '</li>' +
    '<li>Published <code>live</code>' +
      '<ul>' +
        '<li><code>archive =&gt; 6</code></li>' +
      '</ul>' +
    '</li>' +
    '<li>Archived <code>end</code></li>' +
  '</ol>'
);

// ── Transition token lex ────────────────────────────────────────────────

describe('parseTransitionToken', () => {
  test('basic: event with target index', () => {
    assert.deepEqual(parseTransitionToken('submit=>2'), { event: 'submit', to: 2 });
  });

  test('whitespace around arrow is insignificant', () => {
    const expected = { event: 'submit', to: 2 };
    assert.deepEqual(parseTransitionToken('submit => 2'), expected);
    assert.deepEqual(parseTransitionToken('submit =>2'), expected);
    assert.deepEqual(parseTransitionToken('submit=> 2'), expected);
    assert.deepEqual(parseTransitionToken('  submit  =>  2  '), expected);
  });

  test('event is optional', () => {
    assert.deepEqual(parseTransitionToken('=>3'), { event: '', to: 3 });
    assert.deepEqual(parseTransitionToken('=> 3'), { event: '', to: 3 });
  });

  test('self keyword resolves the target slot', () => {
    assert.deepEqual(parseTransitionToken('revise => self'), { event: 'revise', to: 'self' });
    assert.deepEqual(parseTransitionToken('=>self'), { event: '', to: 'self' });
  });

  test('multi-word events are allowed', () => {
    assert.deepEqual(parseTransitionToken('auth success => 4'), { event: 'auth success', to: 4 });
  });

  test('HTML-escaped &gt; decodes to => before matching', () => {
    assert.deepEqual(parseTransitionToken('submit =&gt; 2'), { event: 'submit', to: 2 });
    assert.deepEqual(parseTransitionToken('=&gt;self'), { event: '', to: 'self' });
  });

  test('malformed tokens return null', () => {
    assert.equal(parseTransitionToken('submit -> 2'), null);   // ASCII arrow rejected
    assert.equal(parseTransitionToken('submit → 2'), null);    // Unicode arrow rejected
    assert.equal(parseTransitionToken('=> notanumber'), null);
    assert.equal(parseTransitionToken('=>'), null);
    assert.equal(parseTransitionToken('just prose'), null);
  });
});

// ── State li parsing ────────────────────────────────────────────────────

describe('parseStateLi', () => {
  test('plain state has no metadata, no transitions', () => {
    const s = parseStateLi('In Review', 3);
    assert.equal(s.index, 3);
    assert.equal(s.label, 'In Review');
    assert.equal(s.status, null);
    assert.equal(s.isStart, false);
    assert.equal(s.isTerminal, false);
    assert.deepEqual(s.transitions, []);
  });

  test('start keyword routes to isStart, label is stripped', () => {
    const s = parseStateLi('Draft <code>start</code>', 1);
    assert.equal(s.label, 'Draft');
    assert.equal(s.isStart, true);
    assert.equal(s.status, null);
  });

  test('end keyword routes to isTerminal', () => {
    const s = parseStateLi('Archived <code>end</code>', 6);
    assert.equal(s.label, 'Archived');
    assert.equal(s.isTerminal, true);
  });

  test('status keyword routes to status pill', () => {
    const s = parseStateLi('Submitted <code>on-track</code>', 2);
    assert.equal(s.label, 'Submitted');
    assert.equal(s.status, 'on-track');
  });

  test('multiple metadata tokens in any order', () => {
    const a = parseStateLi('Draft <code>start</code> <code>on-track</code>', 1);
    const b = parseStateLi('Draft <code>on-track</code> <code>start</code>', 1);
    assert.equal(a.isStart, true);
    assert.equal(a.status, 'on-track');
    assert.equal(b.isStart, true);
    assert.equal(b.status, 'on-track');
  });

  test('unknown trailing tokens are preserved in the label', () => {
    const s = parseStateLi('Review <code>pending</code>', 3);
    assert.equal(s.status, null);
    assert.match(s.label, /Review/);
    assert.match(s.label, /pending/);
  });

  test('inline code mid-label is preserved as literal label content', () => {
    // `POST /submit handler` with code mid-label, then status pill trailing.
    const s = parseStateLi('<code>POST /submit</code> handler <code>on-track</code>', 2);
    assert.equal(s.status, 'on-track');
    assert.match(s.label, /POST \/submit/);
    assert.match(s.label, /handler/);
  });

  test('transitions parsed from nested ul', () => {
    const s = parseStateLi(
      'Draft<ul><li><code>submit =&gt; 2</code></li><li><code>discard =&gt; 6</code></li></ul>',
      1
    );
    assert.equal(s.transitions.length, 2);
    assert.deepEqual(s.transitions[0], { event: 'submit', to: 2 });
    assert.deepEqual(s.transitions[1], { event: 'discard', to: 6 });
  });

  test('non-transition nested bullets fall through to annotations', () => {
    const s = parseStateLi(
      'Draft<ul><li>just a note about this state</li><li><code>submit =&gt; 2</code></li></ul>',
      1
    );
    assert.equal(s.transitions.length, 1);
    assert.equal(s.annotations.length, 1);
    assert.match(s.annotations[0], /just a note/);
  });
});

// ── Top-level parse ─────────────────────────────────────────────────────

describe('parseStateChart', () => {
  test('null for empty list', () => {
    assert.equal(parseStateChart(''), null);
  });

  test('worked example: six states, eight transitions', () => {
    const model = parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, ''));
    assert.equal(model.states.length, 6);
    assert.equal(model.transitions.length, 8);

    // State 1: Draft, explicit start, no status
    assert.equal(model.states[0].label, 'Draft');
    assert.equal(model.states[0].isStart, true);

    // State 3 has the self-loop (revise => self resolved to => 3)
    const selfLoops = model.transitions.filter(t => t.isSelf);
    assert.equal(selfLoops.length, 1);
    assert.equal(selfLoops[0].from, 3);
    assert.equal(selfLoops[0].to, 3);
    assert.equal(selfLoops[0].event, 'revise');

    // Back-edges: reject => 1 (from 3 to 1)
    const backEdges = model.transitions.filter(t => t.to < t.from && !t.isSelf);
    assert.equal(backEdges.length, 1);
    assert.equal(backEdges[0].event, 'reject');
  });

  test('self keyword resolves to current state index', () => {
    const ol = '<li>A<ul><li><code>x =&gt; self</code></li></ul></li><li>B</li>';
    const model = parseStateChart(ol);
    assert.equal(model.transitions.length, 1);
    assert.deepEqual(model.transitions[0], { from: 1, to: 1, event: 'x', isSelf: true });
  });

  test('out-of-range targets land in annotations, not transitions', () => {
    const ol = '<li>A<ul><li><code>boom =&gt; 99</code></li></ul></li>';
    const model = parseStateChart(ol);
    assert.equal(model.transitions.length, 0);
    assert.equal(model.states[0].annotations.length, 1);
    assert.match(model.states[0].annotations[0], /unresolved/);
  });

  test('implicit start: state 1 when no explicit start declared', () => {
    const ol = '<li>A</li><li>B</li>';
    const model = parseStateChart(ol);
    assert.equal(model.states[0].isStart, true);
    assert.equal(model.states[1].isStart, false);
  });

  test('implicit terminal: states with no outgoing edges, when no end declared', () => {
    const ol = '<li>A<ul><li><code>=&gt; 2</code></li></ul></li><li>B</li>';
    const model = parseStateChart(ol);
    assert.equal(model.states[0].isTerminal, false);
    assert.equal(model.states[1].isTerminal, true);
  });

  test('explicit end disables implicit-terminal heuristic', () => {
    const ol = '<li>A<ul><li><code>=&gt; 2</code></li></ul></li><li>B <code>end</code></li><li>C</li>';
    const model = parseStateChart(ol);
    assert.equal(model.states[0].isTerminal, false);
    assert.equal(model.states[1].isTerminal, true);
    // C has no outgoing edges but isn't marked terminal because an explicit end exists.
    assert.equal(model.states[2].isTerminal, false);
  });
});

// ── Lane assignment ─────────────────────────────────────────────────────

describe('assignEdgeLanes', () => {
  test('non-overlapping forward skips share lane 0', () => {
    // 1→3 and 4→6: forward skips with non-overlapping row spans.
    const edges = [
      { from: 1, to: 3, isSelf: false },
      { from: 4, to: 6, isSelf: false },
    ];
    const lanes = assignEdgeLanes(edges);
    assert.equal(lanes.get(0), 0);
    assert.equal(lanes.get(1), 0);
  });

  test('overlapping forward skips go to different lanes', () => {
    // 1→4 and 2→5: forward skips whose spans overlap.
    const edges = [
      { from: 1, to: 4, isSelf: false },
      { from: 2, to: 5, isSelf: false },
    ];
    const lanes = assignEdgeLanes(edges);
    const used = new Set([lanes.get(0), lanes.get(1)]);
    assert.equal(used.size, 2);
  });

  test('forward skips and back edges use independent lane pools', () => {
    const edges = [
      { from: 1, to: 5, isSelf: false },   // forward skip, long
      { from: 5, to: 1, isSelf: false },   // back, long — same row interval
    ];
    const lanes = assignEdgeLanes(edges);
    // Independent pools (right vs left side) — both can have lane 0.
    assert.equal(lanes.get(0), 0);
    assert.equal(lanes.get(1), 0);
  });

  test('adjacent-forward edges (j = i+1) need no lane', () => {
    // Adjacent edges render as a straight centre line — no lane required.
    const edges = [
      { from: 1, to: 2, isSelf: false },
      { from: 2, to: 3, isSelf: false },
    ];
    const lanes = assignEdgeLanes(edges);
    assert.equal(lanes.size, 0);
  });

  test('self-loops are skipped (rendered as a fixed shape, no lane)', () => {
    const edges = [
      { from: 1, to: 3, isSelf: false },   // forward skip → lane 0
      { from: 2, to: 2, isSelf: true },    // self-loop → no lane
    ];
    const lanes = assignEdgeLanes(edges);
    assert.equal(lanes.size, 1);
    assert.equal(lanes.has(0), true);
    assert.equal(lanes.has(1), false);
  });
});

// ── Variant dispatch ────────────────────────────────────────────────────

describe('pickVariant', () => {
  test('default when no modifier present', () => {
    assert.equal(pickVariant(['state-chart']), 'default');
    assert.equal(pickVariant(['state-chart', 'dark']), 'default');
  });

  test('inline and horizontal are recognised', () => {
    assert.equal(pickVariant(['state-chart', 'inline']), 'inline');
    assert.equal(pickVariant(['state-chart', 'horizontal']), 'horizontal');
  });

  test('STATE_CHART_VARIANTS lists the registered modifiers', () => {
    assert.deepEqual(STATE_CHART_VARIANTS, ['inline', 'horizontal']);
  });
});

// ── Build ───────────────────────────────────────────────────────────────

describe('buildStateChart', () => {
  test('emits state-chart-figure with state/transition counts in data-attrs', () => {
    const model = parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, ''));
    const html = buildStateChart(model, 'default');
    assert.match(html, /class="state-chart-figure"/);
    assert.match(html, /data-variant="default"/);
    assert.match(html, /data-states="6"/);
    assert.match(html, /data-transitions="8"/);
  });

  test('emits an ol of state-nodes with correct count and data-kind for start/terminal', () => {
    const model = parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, ''));
    const html = buildStateChart(model, 'default');
    const nodeCount = (html.match(/class="state-node"/g) || []).length;
    assert.equal(nodeCount, 6);
    assert.match(html, /data-kind="start"/);
    assert.match(html, /data-kind="terminal"/);
  });

  test('renders SVG edges for every non-self transition + self-loop path', () => {
    const model = parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, ''));
    const html = buildStateChart(model, 'default');
    const edgeCount = (html.match(/class="state-edge"/g) || []).length;
    assert.equal(edgeCount, 8);   // one path element per transition (incl. self)
    assert.match(html, /data-dir="forward"/);
    assert.match(html, /data-dir="back"/);
    assert.match(html, /data-dir="self"/);
    assert.match(html, /data-self="true"/);
  });

  test('event labels render as state-edge-label text', () => {
    const model = parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, ''));
    const html = buildStateChart(model, 'default');
    assert.match(html, /class="state-edge-label"[^>]*>submit</);
    assert.match(html, /class="state-edge-label"[^>]*>reject</);
    assert.match(html, /class="state-edge-label"[^>]*>revise</);
  });

  test('status pills emit chart-status with data-s', () => {
    const model = parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, ''));
    const html = buildStateChart(model, 'default');
    assert.match(html, /class="chart-status" data-s="on-track"/);
    assert.match(html, /class="chart-status" data-s="done"/);
    assert.match(html, /class="chart-status" data-s="live"/);
  });

  test('inline variant drops the SVG layer and emits state-chip chips', () => {
    const model = parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, ''));
    const html = buildStateChart(model, 'inline');
    assert.match(html, /data-variant="inline"/);
    assert.doesNotMatch(html, /<svg /);
    assert.match(html, /class="state-chip"/);
  });

  test('horizontal variant preserves SVG layer', () => {
    const model = parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, ''));
    const html = buildStateChart(model, 'horizontal');
    assert.match(html, /data-variant="horizontal"/);
    assert.match(html, /<svg /);
  });
});

// ── Eyebrow helper ──────────────────────────────────────────────────────

describe('matchEyebrowText', () => {
  test('lifts <p><code>…</code></p> ahead of the body', () => {
    const html = '<p><code>Submission lifecycle</code></p><h2>Title</h2>';
    assert.equal(matchEyebrowText(html), 'Submission lifecycle');
  });

  test('returns empty string when absent', () => {
    assert.equal(matchEyebrowText('<h2>Title</h2><ol><li>A</li></ol>'), '');
  });
});

// ── Geometry ────────────────────────────────────────────────────────────

describe('rowCentreY', () => {
  test('monotonic increase with row index', () => {
    const a = rowCentreY(1);
    const b = rowCentreY(2);
    const c = rowCentreY(3);
    assert.ok(b > a);
    assert.ok(c > b);
    // Row step is nodeHeight + rowGap; row centres are exactly one step apart.
    assert.equal(b - a, GEOM.nodeHeight + GEOM.rowGap);
  });
});

// ── Start / terminal markers ────────────────────────────────────────────

describe('start / terminal markers', () => {
  test('worked example emits one start marker and one terminal marker', () => {
    const model = parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, ''));
    const html = buildStateChart(model, 'default');
    const startCount = (html.match(/state-marker"[^>]*data-kind="start"/g) || []).length;
    const terminalCount = (html.match(/state-marker"[^>]*data-kind="terminal"/g) || []).length;
    assert.equal(startCount, 1);
    assert.equal(terminalCount, 1);
  });

  test('start marker is a filled disc; terminal marker is a ring', () => {
    const model = parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, ''));
    const html = buildStateChart(model, 'default');
    assert.match(html, /class="state-marker-disc"/);
    assert.match(html, /class="state-marker-ring"/);
  });

  test('implicit start (no explicit `start`) still renders a start marker', () => {
    const ol = '<li>A<ul><li><code>=&gt; 2</code></li></ul></li><li>B</li>';
    const model = parseStateChart(ol);
    const html = buildStateChart(model, 'default');
    assert.match(html, /data-kind="start"/);
  });

  test('multiple terminals render multiple terminal markers', () => {
    const ol =
      '<li>A<ul><li><code>=&gt; 2</code></li><li><code>=&gt; 3</code></li></ul></li>' +
      '<li>B <code>end</code></li>' +
      '<li>C <code>end</code></li>';
    const model = parseStateChart(ol);
    const html = buildStateChart(model, 'default');
    const terminalCount = (html.match(/data-kind="terminal"/g) || []).length;
    // 2 marker groups + 2 state-node data-kind attributes
    assert.ok(terminalCount >= 2);
  });
});

// ── Status vocabulary ───────────────────────────────────────────────────

describe('STATUS_KEYWORDS', () => {
  test('matches the .chart-status[data-s=…] vocabulary in chart-family.css', () => {
    // Same set as lib/chart-family/chart-family.css. Drift here is a
    // canary that the kernel and the CSS have diverged.
    const expected = ['on-track', 'done', 'live', 'at-risk', 'warn', 'pilot', 'blocked', 'fail', 'decision', 'deferred'];
    for (const k of expected) assert.ok(STATUS_KEYWORDS.has(k), `missing: ${k}`);
    assert.equal(STATUS_KEYWORDS.size, expected.length);
  });
});
