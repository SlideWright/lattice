/**
 * Unit: lib/components/chart/map/map.transform.js — kernel for the `map`
 * chart-family member, the one component on the `spatial` form.
 *
 * Section dispatch + chart-frame wrapping live in chart-family.js (map is one
 * of CHART_LAYOUTS); this kernel produces the figure HTML. Tests here cover:
 *
 *   1. Name binding: full name / postal code / curated alias all resolve,
 *      case- and punctuation-insensitively.
 *   2. Unmatched reporting: names the basemap can't place are surfaced in a
 *      data-unmatched attribute + a muted legend row, never dropped.
 *   3. Choropleth: the single-hue ramp emits a per-region --mix percentage,
 *      monotonic with value, with the flat-series edge case pinned to the ceil.
 *   4. Highlight: each named region carries its --catN slot var-reference.
 *   5. Basemap integrity: the baked asset has 51 regions and a valid viewBox.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseMap,
  buildMap,
  pickVariant,
  normName,
  BASEMAP,
  MIX_FLOOR,
  MIX_CEIL,
} = require('../../../lib/components/chart/map/map.transform');

// Build the rendered-<li> inner HTML the dispatcher hands the kernel. Each row
// is `<li>Name <code>value</code></li>`, matching Marp Core / emulator output.
function ul(rows) {
  return rows.map(([name, value]) =>
    `<li>${name}${value != null ? ` <code>${value}</code>` : ''}</li>`).join('');
}

describe('map kernel', () => {
  describe('parseMap — name binding', () => {
    test('resolves full names, postal codes, and curated aliases', () => {
      const m = parseMap(ul([['California', '4'], ['TX', '3'], ['Calif.', '9'], ['N.Y.', '2']]));
      // California + Calif. collapse to one CA row (last value wins); TX + NY resolve.
      const postals = m.matched.map((r) => r.postal);
      assert.deepEqual(postals, ['CA', 'TX', 'NY']);
      assert.equal(m.matched.find((r) => r.postal === 'CA').num, 9, 'duplicate region: last value wins');
      assert.equal(m.unmatched.length, 0);
    });

    test('is case- and whitespace-insensitive', () => {
      const m = parseMap(ul([['  new YORK ', '1'], ['washington', '2']]));
      assert.deepEqual(m.matched.map((r) => r.postal), ['NY', 'WA']);
    });

    test('parses commas and units in the value', () => {
      const m = parseMap(ul([['California', '1,240 grants'], ['Texas', '$980']]));
      assert.equal(m.matched[0].num, 1240);
      assert.equal(m.matched[1].num, 980);
      assert.equal(m.matched[0].valueRaw, '1,240 grants');
    });

    test('returns null only when there are no list items', () => {
      assert.equal(parseMap(''), null);
      assert.ok(parseMap(ul([['Atlantis', '1']])), 'an all-unmatched list still returns a model');
    });
  });

  describe('parseMap — unmatched reporting', () => {
    test('collects names the basemap cannot place, never drops them', () => {
      const m = parseMap(ul([['California', '4'], ['Atlantis', '9'], ['Westeros', '1']]));
      assert.deepEqual(m.matched.map((r) => r.postal), ['CA']);
      assert.deepEqual(m.unmatched.map((r) => r.name), ['Atlantis', 'Westeros']);
    });

    test('buildMap stamps data-unmatched on the figure and adds muted legend rows', () => {
      const m = parseMap(ul([['California', '4'], ['Atlantis', '9']]));
      const html = buildMap(m, 'choropleth');
      assert.match(html, /data-unmatched="Atlantis"/);
      assert.match(html, /map-legend-row--unmatched/);
      assert.match(html, /map-swatch--unmatched/);
    });

    test('no unmatched names → no data-unmatched attribute', () => {
      const html = buildMap(parseMap(ul([['California', '4']])), 'choropleth');
      assert.doesNotMatch(html, /data-unmatched/);
    });
  });

  describe('buildMap — choropleth (default)', () => {
    test('emits a --mix percentage per named region, monotonic with value', () => {
      const m = parseMap(ul([['California', '100'], ['Texas', '50'], ['Florida', '0']]));
      const html = buildMap(m, 'choropleth');
      const mixes = [...html.matchAll(/map-region--on" style="--mix:(\d+)%"/g)].map((x) => +x[1]);
      // Three named regions, drawn in basemap order; values span the full ramp.
      assert.equal(mixes.length, 3);
      assert.ok(Math.max(...mixes) <= MIX_CEIL && Math.min(...mixes) >= MIX_FLOOR);
      // Highest value → ceil, lowest → floor.
      assert.equal(Math.max(...mixes), MIX_CEIL);
      assert.equal(Math.min(...mixes), MIX_FLOOR);
    });

    test('a flat series (all equal) pins to the ramp ceiling', () => {
      const m = parseMap(ul([['California', '5'], ['Texas', '5']]));
      const html = buildMap(m, 'choropleth');
      const mixes = [...html.matchAll(/--mix:(\d+)%/g)].map((x) => +x[1]);
      assert.ok(mixes.every((v) => v === MIX_CEIL));
    });

    test('draws every basemap region — named coloured, the rest neutral', () => {
      const html = buildMap(parseMap(ul([['California', '4']])), 'choropleth');
      const total = (html.match(/class="map-region/g) || []).length;
      assert.equal(total, Object.keys(BASEMAP.regions).length, 'all 51 regions drawn');
      assert.equal((html.match(/map-region--on/g) || []).length, 1, 'one region filled');
    });
  });

  describe('buildMap — highlight', () => {
    test('each named region carries a --catN slot var-reference, rotating the six-hue cap', () => {
      const names = ['California', 'Texas', 'New York', 'Florida', 'Illinois', 'Ohio', 'Georgia'];
      const m = parseMap(ul(names.map((n, i) => [n, String(i)])));
      const html = buildMap(m, 'highlight');
      // Region <path>s emit in basemap order; the legend preserves authored
      // order, so assert slot rotation there.
      const legend = html.slice(html.indexOf('map-legend'));
      const slots = [...legend.matchAll(/map-swatch--hl" style="--region-hue:var\(--cat(\d)-hue\)"/g)].map((x) => +x[1]);
      assert.deepEqual(slots, [1, 2, 3, 4, 5, 6, 1], 'seventh region wraps back to slot 1');
    });
  });

  describe('pickVariant', () => {
    test('defaults to choropleth, opts into highlight on the token', () => {
      assert.equal(pickVariant(['map']), 'choropleth');
      assert.equal(pickVariant(['map', 'highlight']), 'highlight');
    });
  });

  describe('normName', () => {
    test('lowercases, drops periods/apostrophes, collapses whitespace', () => {
      assert.equal(normName('  N.Y. '), 'ny');
      assert.equal(normName("Hawai'i"), 'hawaii');
      assert.equal(normName('New  York'), 'new york');
    });
  });

  describe('basemap asset integrity', () => {
    test('ships 51 regions (50 states + DC), each with a path', () => {
      const ids = Object.keys(BASEMAP.regions);
      assert.equal(ids.length, 51);
      for (const id of ids) {
        assert.ok(BASEMAP.regions[id].d.startsWith('M'), `${id} has an SVG path`);
        assert.ok(BASEMAP.regions[id].name, `${id} has a name`);
      }
      assert.match(BASEMAP.viewBox, /^-?\d+ -?\d+ \d+ \d+$/);
      assert.equal(BASEMAP.id, 'us-states');
    });
  });
});
