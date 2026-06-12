/**
 * Unit tests for the shared transformer registry.
 *
 * The registry is the central plugin list consumed by all three render
 * paths (marp-cli, lattice-emulator, lattice-runtime). These tests pin
 * the registry's shape contract and assert that the currently-registered
 * transformers each conform to it.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../../../lib/transformers/registry');

describe('transformer registry', () => {
  test('TRANSFORMERS is a non-empty array', () => {
    assert.ok(Array.isArray(registry.TRANSFORMERS));
    assert.ok(registry.TRANSFORMERS.length > 0);
  });

  test('every transformer has a unique name', () => {
    const names = registry.TRANSFORMERS.map(t => t.name);
    const unique = new Set(names);
    assert.equal(unique.size, names.length, `duplicate names: ${names.join(', ')}`);
    for (const n of names) {
      assert.equal(typeof n, 'string', 'transformer name must be a string');
      assert.ok(n.length > 0, 'transformer name must be non-empty');
    }
  });

  test('every transformer exposes at least one apply method', () => {
    for (const t of registry.TRANSFORMERS) {
      const hasApply = typeof t.applyToHtml === 'function' ||
                       typeof t.applyToSectionInner === 'function' ||
                       typeof t.applyToDom === 'function';
      assert.ok(hasApply, `transformer ${t.name} must expose at least one apply* method`);
    }
  });

  test('getByName finds a registered transformer', () => {
    const t = registry.getByName('split-panels');
    assert.ok(t, 'split-panels should be registered');
    assert.equal(t.name, 'split-panels');
  });

  test('getByName returns undefined for unknown names', () => {
    assert.equal(registry.getByName('does-not-exist'), undefined);
  });

  test('applyAllToHtml is a no-op on input without any registered layouts', () => {
    const input = '<section class="content"><h2>plain</h2><p>nothing to rewrite</p></section>';
    const out = registry.applyAllToHtml(input);
    assert.equal(out, input);
  });

  test('applyAllToHtml is idempotent', () => {
    const input =
      '<section class="split-panel">' +
      '<p><code>EYEBROW</code></p>' +
      '<h2>Title</h2>' +
      '<p>Intro paragraph.</p>' +
      '<ul><li>title<ul><li>body</li></ul></li></ul>' +
      '</section>';
    const once  = registry.applyAllToHtml(input);
    const twice = registry.applyAllToHtml(once);
    assert.equal(twice, once, 'second pass should be a no-op');
  });
});

describe('split-panels transformer (via registry)', () => {
  const splitPanels = registry.getByName('split-panels');

  test('declares the split-panel family layouts', () => {
    const expected = ['split-panel', 'split-compare'];
    assert.deepEqual([...splitPanels.layouts].sort(), [...expected].sort());
  });

  test('selector covers every layout', () => {
    for (const layout of splitPanels.layouts) {
      assert.ok(splitPanels.selector.includes(`section.${layout}`),
        `selector missing section.${layout}`);
    }
  });

  test('applyToSection rewrites split-panel; cls unchanged', () => {
    const inner =
      '<p><code>EYEBROW</code></p>' +
      '<h2>Title</h2>' +
      '<p>Intro paragraph.</p>' +
      '<ul><li>title<ul><li>body</li></ul></li></ul>';
    const { html, cls } = splitPanels.applyToSection(inner, 'split-panel');
    assert.match(html, /<div class="panel-left">/);
    assert.match(html, /<span class="panel-eyebrow">EYEBROW<\/span>/);
    assert.match(html, /<div class="panel-right">/);
    assert.equal(cls, 'split-panel', 'split-panels does not mutate cls');
  });

  test('applyToSection rewrites split-panel watermark into panel-left / panel-right', () => {
    const inner =
      '<h5>section heading</h5>' +
      '<p><code>Section 02</code></p>' +
      '<h2>List title</h2>' +
      '<ul><li>item</li></ul>';
    const { html } = splitPanels.applyToSection(inner, 'split-panel watermark');
    assert.match(html, /<div class="panel-left">/);
    assert.match(html, /<div class="watermark">L<\/div>/);
    assert.match(html, /<div class="panel-right">/);
  });

  test('applyToSection passes through non-split sections', () => {
    const inner = '<h2>Plain content</h2><p>nothing special.</p>';
    const { html, cls } = splitPanels.applyToSection(inner, 'content');
    assert.equal(html, inner);
    assert.equal(cls, 'content');
  });

  test('applyToSection is idempotent per layout', () => {
    const inner =
      '<p><code>20</code></p>' +
      '<h2>42%</h2>' +
      '<p>of teams report cycle wins.</p>' +
      '<ul><li>title<ul><li>body</li></ul></li></ul>';
    const once  = splitPanels.applyToSection(inner, 'split-panel metric');
    const twice = splitPanels.applyToSection(once.html,  'split-panel metric');
    assert.equal(twice.html, once.html);
  });

  test('applyToHtml runs against full Marpit HTML and rewrites only split-* sections', () => {
    const html =
      '<section class="content"><h2>plain</h2></section>' +
      '<section class="split-panel">' +
      '<p><code>E</code></p><h2>T</h2><p>intro.</p>' +
      '<ul><li>a</li></ul>' +
      '</section>';
    const out = splitPanels.applyToHtml(html);
    // Non-split section untouched.
    assert.ok(out.includes('<section class="content"><h2>plain</h2></section>'));
    // Split section rewritten.
    assert.match(out, /<div class="panel-left">/);
    assert.match(out, /<div class="panel-right">/);
  });
});

describe('chart-family transformer (via registry)', () => {
  const chartFamily = registry.getByName('chart-family');

  test('declares the chart-family layouts', () => {
    const expected = [
      'progress', 'timeline-list', 'piechart',
      'gantt', 'kanban', 'radar', 'quadrant',
      'state-chart', 'journey', 'word-cloud',
    ];
    for (const layout of expected) {
      assert.ok(chartFamily.layouts.includes(layout), `missing layout: ${layout}`);
    }
  });

  test('applyToSection on a progress slide wraps in chart-frame + appends class', () => {
    const inner =
      '<h2>Q3 progress</h2>' +
      '<p>Five workstreams.</p>' +
      '<ul>' +
      '<li>API surface <code>72</code> <code>on-track</code></li>' +
      '<li>Migrations <code>40</code> <code>at-risk</code></li>' +
      '</ul>';
    const { html, cls } = chartFamily.applyToSection(inner, 'progress');
    assert.match(html, /<div class="chart-header">/);
    assert.match(html, /<div class="chart-body">/);
    assert.match(html, /<div class="progress-bars">/);
    assert.ok(cls.split(/\s+/).includes('chart-frame'),
      `chart-frame should be appended to cls; got "${cls}"`);
  });

  test('applyToSection lifts a trailing caption into .chart-caption', () => {
    const inner =
      '<h2>Q3 progress</h2>' +
      '<ul><li>API <code>72</code></li></ul>' +
      '<p>Refreshed weekly.</p>';
    const { html } = chartFamily.applyToSection(inner, 'progress');
    assert.match(html, /<p class="chart-caption">Refreshed weekly\.<\/p>/,
      'trailing paragraph becomes the chart-caption');
    assert.doesNotMatch(html, /<\/div><p>Refreshed weekly\.<\/p>/,
      'no raw section-level caption left behind');
  });

  test('applyToSection lifts the caption even when a _footer follows it', () => {
    // Regression: Marpit appends <footer> after the user's trailing <p> when
    // a `_footer` directive is set, which used to defeat the end-anchored
    // caption match (gotchas.md "Chart caption swallowed when _footer is set").
    const inner =
      '<h2>Q3 progress</h2>' +
      '<ul><li>API <code>72</code></li></ul>' +
      '<p>Refreshed weekly.</p>' +
      '<footer>src · progress</footer>';
    const { html } = chartFamily.applyToSection(inner, 'progress');
    assert.match(html, /<p class="chart-caption">Refreshed weekly\.<\/p>/,
      'caption is lifted despite the trailing footer');
    assert.match(html, /<footer>src · progress<\/footer>/,
      'the footer is preserved');
    // Caption precedes footer in the output.
    assert.ok(html.indexOf('chart-caption') < html.indexOf('<footer>'),
      'caption renders before the footer');
  });

  test('applyToSection passes through non-chart sections', () => {
    const inner = '<h2>Plain</h2><p>nothing.</p>';
    const { html, cls } = chartFamily.applyToSection(inner, 'content');
    assert.equal(html, inner);
    assert.equal(cls, 'content');
  });

  test('applyToSection is idempotent — chart-frame already set is a no-op', () => {
    const inner =
      '<h2>Title</h2>' +
      '<ul><li>row <code>50</code></li></ul>';
    const once  = chartFamily.applyToSection(inner, 'progress');
    const twice = chartFamily.applyToSection(once.html, once.cls);
    // Idempotent at the class-list level — chart-frame should not double.
    const tokens = twice.cls.split(/\s+/).filter(Boolean);
    const frameCount = tokens.filter(t => t === 'chart-frame').length;
    assert.equal(frameCount, 1, `chart-frame appears ${frameCount} times in "${twice.cls}"`);
  });
});

describe('applyAllToSection — registry composition', () => {
  test('chart-family runs before split-panels (no-op on each other\'s sections)', () => {
    const chartInner =
      '<h2>Progress</h2>' +
      '<ul><li>row <code>50</code></li></ul>';
    const r = registry.applyAllToSection(chartInner, 'progress');
    assert.match(r.html, /<div class="chart-body">/, 'chart-family ran');
    assert.ok(r.cls.split(/\s+/).includes('chart-frame'));
  });

  test('applyAllToSection on a split-panel section runs split-panels (chart-family is a no-op)', () => {
    const inner =
      '<p><code>X</code></p><h2>T</h2><p>intro.</p>' +
      '<ul><li>a</li></ul>';
    const r = registry.applyAllToSection(inner, 'split-panel');
    assert.match(r.html, /<div class="panel-left">/);
    // chart-family didn't touch this section — cls unchanged
    assert.equal(r.cls, 'split-panel');
  });

  test('applyAllToSection on a plain section is a complete no-op', () => {
    const inner = '<h2>Plain</h2><p>nothing.</p>';
    const r = registry.applyAllToSection(inner, 'content');
    assert.equal(r.html, inner);
    assert.equal(r.cls, 'content');
  });
});
