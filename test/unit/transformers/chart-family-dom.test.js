/**
 * Unit tests for the chart-family transformer's applyToDom (DOM-walk path).
 *
 * applyToDom delegates to engine.transformChartSection — same kernel
 * marp.config.js and lattice-emulator.js use. These tests cover three
 * of the seven layouts (progress, piechart, radar) with the simplest
 * input that exercises each one's branch. The HTML-string kernel is
 * covered separately in registry.test.js and the integration suite.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const chartFamily = require('../../../lib/transformers/chart-family');

function makeDoc(bodyHtml) {
  const dom = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`);
  return dom.window.document;
}

describe('chart-family.applyToDom', () => {
  test('progress: wraps in chart-frame + emits .progress-bars', () => {
    const doc = makeDoc(`
      <section class="progress">
        <h2>Q3 status</h2>
        <ul>
          <li>API <code>72</code> <code>on-track</code></li>
          <li>UI  <code>40</code> <code>at-risk</code></li>
        </ul>
      </section>
    `);
    chartFamily.applyToDom(doc);
    const sec = doc.querySelector('section.progress');
    assert.ok(sec.classList.contains('chart-frame'),
      'chart-frame class added to section.progress');
    assert.ok(sec.querySelector('.chart-header'), 'chart-header wrapper present');
    assert.ok(sec.querySelector('.chart-body .progress-bars'),
      'progress-bars container in chart-body');
  });

  test('piechart: builds SVG wedges + legend', () => {
    const doc = makeDoc(`
      <section class="piechart">
        <h2>Mix</h2>
        <ul>
          <li>A <code>40</code></li>
          <li>B <code>35</code></li>
          <li>C <code>25</code></li>
        </ul>
      </section>
    `);
    chartFamily.applyToDom(doc);
    const sec = doc.querySelector('section.piechart');
    assert.ok(sec.classList.contains('chart-frame'));
    assert.ok(sec.querySelector('.piechart-figure svg.piechart-svg'),
      'piechart SVG emitted');
    // SVG-native legend (2026-06-13-svg-native-legend.md): the key is now inside
    // the diagram's <svg> as a swatch <rect> + label/value <text> per series,
    // not an HTML <ol>. Three series → three labels, values and swatches.
    assert.equal(sec.querySelectorAll('.piechart-svg .chart-key-label').length, 3,
      'three legend labels');
    assert.equal(sec.querySelectorAll('.piechart-svg .chart-key-value').length, 3,
      'three legend values');
    assert.equal(sec.querySelectorAll('.piechart-svg .chart-key-swatch').length, 3,
      'three legend swatches');
  });

  test('radar: builds polygons with per-series colours from the chart spectrum (--catN-hue)', () => {
    const doc = makeDoc(`
      <section class="radar">
        <h2>Skills</h2>
        <ul>
          <li>Teacher
            <ul>
              <li>Calculus <code>9</code></li>
              <li>Geometry <code>7</code></li>
              <li>Algebra  <code>8</code></li>
            </ul>
          </li>
          <li>Student
            <ul>
              <li>Calculus <code>7</code></li>
              <li>Geometry <code>8</code></li>
              <li>Algebra  <code>9</code></li>
            </ul>
          </li>
        </ul>
      </section>
    `);
    chartFamily.applyToDom(doc);
    const sec = doc.querySelector('section.radar');
    assert.ok(sec.classList.contains('chart-frame'));
    const polys = sec.querySelectorAll('polygon.radar-poly');
    assert.equal(polys.length, 2, 'two series → two polygons');
    // Radar now draws from the chart-family's own Apple-inspired spectrum
    // (--catN-hue), decoupled from the engine-wide cN accents — same token the
    // quadrant/pie/progress members consume. Guard against a regression back to
    // the raw cN scale (or an undefined --cat-<name> token).
    const styles = [...polys].map(p => p.getAttribute('style') || '');
    for (const s of styles) {
      assert.match(s, /--series-color:\s*var\(--chart-cat-\d-hue\)/,
        `series-color resolves through the chart spectrum (--chart-cat-N-hue); got "${s}"`);
    }
    // Each default-variant polygon also carries the area-fade gradient.
    for (const s of styles) {
      assert.match(s, /fill:url\(#radar-area-\d+\)/,
        `radar-poly fills with its per-series area gradient; got "${s}"`);
    }
  });

  test('passes through non-chart sections', () => {
    const doc = makeDoc(`
      <section class="content"><h2>plain</h2><p>nothing.</p></section>
    `);
    const before = doc.querySelector('section.content').outerHTML;
    chartFamily.applyToDom(doc);
    const after = doc.querySelector('section.content').outerHTML;
    assert.equal(after, before);
  });

  test('idempotent: a second pass is a no-op', () => {
    const doc = makeDoc(`
      <section class="progress">
        <h2>Test</h2>
        <ul><li>A <code>50</code></li></ul>
      </section>
    `);
    chartFamily.applyToDom(doc);
    const once = doc.querySelector('section.progress').innerHTML;
    const onceCls = doc.querySelector('section.progress').className;
    chartFamily.applyToDom(doc);
    const twice = doc.querySelector('section.progress').innerHTML;
    const twiceCls = doc.querySelector('section.progress').className;
    assert.equal(twice, once);
    assert.equal(twiceCls, onceCls, 'chart-frame should not double-append');
  });

  test('safely returns on null / non-DOM root', () => {
    assert.doesNotThrow(() => chartFamily.applyToDom(null));
    assert.doesNotThrow(() => chartFamily.applyToDom(undefined));
    assert.doesNotThrow(() => chartFamily.applyToDom({}));
  });
});
