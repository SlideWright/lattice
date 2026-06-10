/**
 * Unit: lib/components/chart/funnel/funnel.transform.js — kernel for the
 * `funnel` chart-family member.
 *
 * Section dispatch + chart-frame wrapping live in chart-family.js (funnel is
 * one of CHART_LAYOUTS); this kernel just produces the figure HTML. Tests
 * here cover the layers chart-family delegates to:
 *
 *   1. Source parsing: parseFunnel — label / value split, comma + unit
 *      tolerance, the depth-aware top-level <li> walk, the < 2-stage bail.
 *   2. Geometry: buildFunnel band widths are proportional to value, the
 *      widest sets full width, and a tiny stage is floored to minW.
 *   3. Conversion read: the stage-to-stage % printed in the gaps (n − 1 of
 *      them, rounded), and the per-band --i palette index.
 *   4. Escaping: author text with &, <, > survives into the SVG escaped.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseFunnel,
  buildFunnel,
  GEOM,
} = require('../../../lib/components/chart/funnel/funnel.transform');

// Build the <ul> inner HTML the dispatcher hands the kernel. Each stage is
// `<li>Label <code>value</code></li>`, matching Marp Core / emulator output.
function ul(rows) {
  return rows
    .map(([label, value]) => `<li>${label}${value != null ? ` <code>${value}</code>` : ''}</li>`)
    .join('');
}

describe('funnel kernel', () => {
  describe('parseFunnel — source parsing', () => {
    test('splits each li into label, raw value, and a parsed number', () => {
      const m = parseFunnel(ul([['Visitors', '12,000'], ['Signups', '4,800'], ['Paid', '864']]));
      assert.deepEqual(m.stages.map((s) => s.label), ['Visitors', 'Signups', 'Paid']);
      assert.deepEqual(m.stages.map((s) => s.valueRaw), ['12,000', '4,800', '864']);
      assert.deepEqual(m.stages.map((s) => s.num), [12000, 4800, 864]);
    });

    test('tolerates commas and units in the value, keeping the raw text', () => {
      const m = parseFunnel(ul([['Impressions', '240,000 views'], ['Clicks', '$38.4k']]));
      assert.equal(m.stages[0].num, 240000);
      assert.equal(m.stages[0].valueRaw, '240,000 views');
      // The first numeric run wins; the raw label text is preserved verbatim.
      assert.equal(m.stages[1].num, 38.4);
      assert.equal(m.stages[1].valueRaw, '$38.4k');
    });

    test('maxNum is the largest stage value (full-width anchor)', () => {
      const m = parseFunnel(ul([['A', '600'], ['B', '1000'], ['C', '320']]));
      assert.equal(m.maxNum, 1000);
    });

    test('a flat all-zero series falls back to maxNum 1 (never divides by zero)', () => {
      const m = parseFunnel(ul([['A', '0'], ['B', '0']]));
      assert.equal(m.maxNum, 1);
    });

    test('returns null below two stages — nothing to taper', () => {
      assert.equal(parseFunnel(''), null);
      assert.equal(parseFunnel(ul([['Only one', '1']])), null);
      assert.ok(parseFunnel(ul([['A', '2'], ['B', '1']])), 'two stages is the floor');
    });

    test('the top-level <li> walk is depth-aware — a nested list adds no stage', () => {
      const m = parseFunnel('<li>Top <code>10</code><ul><li>child</li></ul></li><li>Bottom <code>5</code></li>');
      assert.equal(m.stages.length, 2, 'nested <li> is not counted as its own stage');
    });
  });

  describe('buildFunnel — figure scaffold', () => {
    test('wraps an SVG in a funnel-figure carrying the stage count', () => {
      const html = buildFunnel(parseFunnel(ul([['A', '100'], ['B', '50'], ['C', '25']])));
      assert.match(html, /<div class="funnel-figure" style="--funnel-stages:3">/);
      assert.match(html, new RegExp(`viewBox="${GEOM.viewBox}"`));
      assert.match(html, /aria-hidden="true"/);
    });

    test('emits one band per stage, each tagged with its palette index', () => {
      const html = buildFunnel(parseFunnel(ul([['A', '100'], ['B', '50'], ['C', '25']])));
      const idx = [...html.matchAll(/funnel-band" style="--i:(\d+)"/g)].map((x) => +x[1]);
      assert.deepEqual(idx, [0, 1, 2]);
    });

    test('emits a label and a value text node per stage', () => {
      const html = buildFunnel(parseFunnel(ul([['Visitors', '12,000'], ['Paid', '864']])));
      assert.equal((html.match(/class="funnel-label"/g) || []).length, 2);
      assert.equal((html.match(/class="funnel-value"/g) || []).length, 2);
      assert.match(html, />Visitors</);
      assert.match(html, />12,000</);
    });
  });

  describe('buildFunnel — band geometry', () => {
    // Pull each polygon's top-edge width (x of second point − x of first).
    const topWidths = (html) =>
      [...html.matchAll(/points="([\d.]+),[\d.]+ ([\d.]+),/g)].map((x) => +x[2] - +x[1]);

    test('the widest value spans full width; others scale proportionally', () => {
      const html = buildFunnel(parseFunnel(ul([['A', '100'], ['B', '50']])));
      const [wA, wB] = topWidths(html);
      assert.equal(wA, GEOM.fullW, 'the max-value band is full width');
      assert.ok(Math.abs(wB - GEOM.fullW / 2) < 0.5, 'half the value → half the width');
    });

    test('a tiny stage is floored to minW so it still renders', () => {
      const html = buildFunnel(parseFunnel(ul([['Big', '1000'], ['Tiny', '1']])));
      const [, wTiny] = topWidths(html);
      assert.equal(wTiny, GEOM.minW, 'below the floor clamps to minW, not to ~0');
    });
  });

  describe('buildFunnel — conversion read', () => {
    test('prints a rounded stage-to-stage % in each gap (n − 1 of them)', () => {
      const html = buildFunnel(parseFunnel(ul([['A', '100'], ['B', '50'], ['C', '20']])));
      const convs = [...html.matchAll(/funnel-conv[^>]*>(\d+)%/g)].map((x) => +x[1]);
      assert.deepEqual(convs, [50, 40], 'B/A = 50%, C/B = 40%; no conv after the last stage');
    });

    test('rounds to the nearest integer percent', () => {
      const html = buildFunnel(parseFunnel(ul([['A', '12000'], ['B', '4800']])));
      const convs = [...html.matchAll(/funnel-conv[^>]*>(\d+)%/g)].map((x) => +x[1]);
      assert.deepEqual(convs, [40]);
    });
  });

  describe('buildFunnel — escaping', () => {
    test('author text with &, <, > is escaped into the SVG', () => {
      const html = buildFunnel(parseFunnel(ul([['R&D pipeline', '100'], ['Shipped', '40']])));
      assert.match(html, />R&amp;D pipeline</);
      assert.doesNotMatch(html, /R&D pipeline/);
    });
  });
});
