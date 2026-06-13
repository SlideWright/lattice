'use strict';

// Direct tests for the shared SVG-native legend builder — the keystone the four
// keyed charts (pie/radar/map/cohort quadrant) all emit through. The kernels
// cover it indirectly; these pin the load-bearing geometry/wrap/a11y logic so a
// regression in the shared module can't slip through on the kernels alone.
// See engineering/decisions/2026-06-13-svg-native-legend.md.

const { test } = require('node:test');
const assert = require('node:assert');
const { buildSvgLegend, wrapLabelToLines } = require('../../../lib/components/chart/_chart-family/svg-legend');

test('wrapLabelToLines: short label stays one line', () => {
  assert.deepEqual(wrapLabelToLines('hello world', 20), ['hello world']);
});

test('wrapLabelToLines: wraps at the word boundary within budget', () => {
  assert.deepEqual(wrapLabelToLines('hello world', 5), ['hello', 'world']);
});

test('wrapLabelToLines: hard-breaks a single over-long token (no ellipsis)', () => {
  // 21 chars, budget 5 → 5/5/5/5/1, every piece ≤ budget, nothing dropped.
  const lines = wrapLabelToLines('supercalifragilistic', 5);
  assert.ok(lines.every((l) => l.length <= 5), 'no line exceeds the budget');
  assert.equal(lines.join(''), 'supercalifragilistic', 'no characters dropped');
});

test('wrapLabelToLines: empty input yields a single empty line', () => {
  assert.deepEqual(wrapLabelToLines('', 10), ['']);
  assert.deepEqual(wrapLabelToLines('   ', 10), ['']);
});

test('buildSvgLegend: returns geometry + a11y desc; emits swatch/label/value', () => {
  const key = buildSvgLegend({
    rows: [{ swatchFill: 'red', swatchStroke: 'darkred', label: 'Alpha', value: '46%' }],
    diagramRight: 180, diagramHeight: 200, hasValues: true,
  });
  assert.ok(key.viewW > 180, 'viewW includes the rail past the diagram');
  assert.equal(key.viewH, 200, 'a one-row key fits the diagram height (no growth)');
  assert.equal(key.diagramDy, 0, 'no vertical offset when the key fits');
  assert.match(key.body, /class="chart-key-swatch"[^>]*fill="red"[^>]*stroke="darkred"/);
  assert.match(key.body, /class="chart-key-label"[^>]*>.*Alpha/);
  assert.match(key.body, /class="chart-key-value"[^>]*text-anchor="end">46%</);
  // a11y: the row data is re-enumerated in a <desc> (it lives inside role="img").
  assert.match(key.desc, /<desc>Key — Alpha 46%<\/desc>/);
});

test('buildSvgLegend: no-value (radar) reclaims the value column for the label', () => {
  // Regression guard for the dead-reclaim bug: a label (18 chars) that wraps to
  // two lines WITH a value column (budget 15) must fit on ONE line without it
  // (budget 20 — the reclaimed value-column width).
  const rows = [{ swatchFill: 'blue', label: 'Net promoter score' }];
  const withVal = buildSvgLegend({ rows: rows.map((r) => ({ ...r, value: '9' })), diagramRight: 300, diagramHeight: 300, hasValues: true });
  const noVal = buildSvgLegend({ rows, diagramRight: 300, diagramHeight: 300, hasValues: false });
  const linesWith = (withVal.body.match(/<tspan /g) || []).length;
  const linesNo = (noVal.body.match(/<tspan /g) || []).length;
  assert.ok(linesNo < linesWith, `no-value column should wrap fewer lines (got no=${linesNo}, with=${linesWith})`);
  assert.doesNotMatch(noVal.body, /chart-key-value/, 'no value text when hasValues is false');
});

test('buildSvgLegend: a long-tail key grows the viewBox HEIGHT, not the font', () => {
  const rows = Array.from({ length: 14 }, (_, i) => ({ swatchFill: 'red', label: `Row ${i}`, value: `${i}%` }));
  const key = buildSvgLegend({ rows, diagramRight: 180, diagramHeight: 200, hasValues: true });
  assert.ok(key.viewH > 200, 'tall key grows viewH');
  // font is a fixed ratio of diagramHeight (200), never re-shrunk per chart
  assert.match(key.body, /font-size="9.00"/);
});

test('buildSvgLegend: head rows render a heading with no swatch; desc prefixes them', () => {
  const key = buildSvgLegend({
    rows: [
      { head: true, label: 'Asia' },
      { swatchFill: 'red', label: 'India', value: '48' },
    ],
    diagramRight: 400, diagramHeight: 320, hasValues: true,
  });
  assert.match(key.body, /class="chart-key-head"[^>]*><tspan[^>]*>Asia</);
  assert.equal((key.body.match(/chart-key-swatch/g) || []).length, 1, 'only the data row gets a swatch');
  assert.match(key.desc, /Key — Asia:, India 48/);
});

test('buildSvgLegend: escapes & and < in both body and desc', () => {
  const key = buildSvgLegend({
    rows: [{ swatchFill: 'red', label: 'R&D', value: '<6' }],
    diagramRight: 180, diagramHeight: 200, hasValues: true,
  });
  assert.match(key.body, /R&amp;D/);
  assert.match(key.desc, /R&amp;D &lt;6/);
});

test('buildSvgLegend: strips inline HTML tags before wrapping/emitting', () => {
  const key = buildSvgLegend({
    rows: [{ swatchFill: 'red', label: 'Net<sup>2</sup>', value: '1' }],
    diagramRight: 180, diagramHeight: 200, hasValues: true,
  });
  assert.match(key.body, /Net2/);
  assert.doesNotMatch(key.body, /<sup>/);
});
