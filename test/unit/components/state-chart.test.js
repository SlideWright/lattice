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
  TRANSITION_RE,
  pickVariant,
  parseTransitionToken,
  parseStateLi,
  parseStateChart,
  buildStateChart,
  matchEyebrowText,
  STATE_CHART_BROWSER_JS,
  installStateChartLayout,
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

// ── Build-time HTML emission ──────────────────────────────────────────────
// Geometry now runs in the browser (installStateChartLayout). The build
// step emits HTML nodes the browser sizes + a transitions JSON attr + an
// empty SVG overlay. These tests pin that contract.

describe('buildStateChart (default)', () => {
  const html = buildStateChart(parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, '')), 'default');

  test('emits state-chart-figure with state/transition counts', () => {
    assert.match(html, /class="state-chart-figure"/);
    assert.match(html, /data-variant="default"/);
    assert.match(html, /data-states="6"/);
    assert.match(html, /data-transitions="8"/);
  });

  test('emits one HTML li.state-node per state with data-kind', () => {
    const nodeCount = (html.match(/class="state-node"/g) || []).length;
    assert.equal(nodeCount, 6);
    assert.match(html, /data-kind="start"/);
    assert.match(html, /data-kind="terminal"/);
  });

  test('emits an empty SVG overlay for the browser pass to fill', () => {
    assert.match(html, /<svg class="state-chart-edges"[^>]*><\/svg>/);
    // No build-time geometry — the kernel must not bake paths/arrows.
    assert.doesNotMatch(html, /class="state-edge"/);
    assert.doesNotMatch(html, /class="state-edge-arrow"/);
  });

  test('status renders as a chart-family .chart-status pill', () => {
    assert.match(html, /class="chart-status" data-s="on-track"/);
    assert.match(html, /class="chart-status" data-s="done"/);
    assert.match(html, /class="chart-status" data-s="live"/);
  });

  test('serialises the resolved transition list into data-sc-transitions', () => {
    const m = html.match(/data-sc-transitions="([^"]*)"/);
    assert.ok(m, 'data-sc-transitions present');
    // Attribute is HTML-escaped; decode the entities the kernel emits.
    const json = m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    const transitions = JSON.parse(json);
    assert.equal(transitions.length, 8);
    // self resolved to its own index, flagged isSelf
    const selfLoops = transitions.filter(t => t.isSelf);
    assert.equal(selfLoops.length, 1);
    assert.deepEqual(selfLoops[0], { from: 3, to: 3, event: 'revise', isSelf: true });
    // a back-edge survives
    assert.ok(transitions.some(t => t.from === 3 && t.to === 1 && t.event === 'reject'));
  });
});

describe('buildStateChart (inline / horizontal fallback)', () => {
  test('inline variant emits HTML chips, no SVG overlay', () => {
    const html = buildStateChart(parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, '')), 'inline');
    assert.match(html, /data-variant="inline"/);
    assert.doesNotMatch(html, /state-chart-edges/);
    assert.match(html, /class="state-chip"/);
  });

  test('horizontal variant uses the same HTML fallback', () => {
    const html = buildStateChart(parseStateChart(OL_WORKED.replace(/^<ol>|<\/ol>$/g, '')), 'horizontal');
    assert.match(html, /class="state-chip"/);
    assert.doesNotMatch(html, /state-chart-edges/);
  });
});

// ── Browser layout module ─────────────────────────────────────────────────

describe('STATE_CHART_BROWSER_JS', () => {
  test('is a self-invoking string carrying the layout function', () => {
    assert.equal(typeof STATE_CHART_BROWSER_JS, 'string');
    assert.match(STATE_CHART_BROWSER_JS, /getBoundingClientRect/);
    assert.match(STATE_CHART_BROWSER_JS, /data-sc-transitions/);
    // self-invoked against document
    assert.match(STATE_CHART_BROWSER_JS, /\)\(document\);\s*$/);
  });

  test('installStateChartLayout no-ops without a document (Node safety)', () => {
    // Passing a null doc must not throw — it's required at build time in Node.
    assert.doesNotThrow(() => installStateChartLayout(null));
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
