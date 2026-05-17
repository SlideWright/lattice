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
      '<section class="split-brief">' +
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

  test('declares the six split-* layouts', () => {
    const expected = [
      'split-list', 'split-brief', 'split-metric',
      'split-steps', 'split-compare', 'split-statement',
    ];
    for (const layout of expected) {
      assert.ok(splitPanels.layouts.includes(layout), `missing layout: ${layout}`);
    }
  });

  test('selector covers every layout', () => {
    for (const layout of splitPanels.layouts) {
      assert.ok(splitPanels.selector.includes(`section.${layout}`),
        `selector missing section.${layout}`);
    }
  });

  test('applyToSectionInner rewrites split-brief into brief-left / brief-right', () => {
    const inner =
      '<p><code>EYEBROW</code></p>' +
      '<h2>Title</h2>' +
      '<p>Intro paragraph.</p>' +
      '<ul><li>title<ul><li>body</li></ul></li></ul>';
    const out = splitPanels.applyToSectionInner(inner, 'split-brief');
    assert.match(out, /<div class="brief-left">/);
    assert.match(out, /<span class="eyebrow">EYEBROW<\/span>/);
    assert.match(out, /<div class="brief-right">/);
  });

  test('applyToSectionInner rewrites split-list into panel-left / panel-right', () => {
    const inner =
      '<h5>section heading</h5>' +
      '<p><code>Section 02</code></p>' +
      '<h2>List title</h2>' +
      '<ul><li>item</li></ul>';
    const out = splitPanels.applyToSectionInner(inner, 'split-list');
    assert.match(out, /<div class="panel-left">/);
    assert.match(out, /<div class="watermark">L<\/div>/);
    assert.match(out, /<div class="panel-right">/);
  });

  test('applyToSectionInner passes through non-split sections', () => {
    const inner = '<h2>Plain content</h2><p>nothing special.</p>';
    const out = splitPanels.applyToSectionInner(inner, 'content');
    assert.equal(out, inner);
  });

  test('applyToSectionInner is idempotent per layout', () => {
    const inner =
      '<p><code>20</code></p>' +
      '<h2>42%</h2>' +
      '<p>of teams report cycle wins.</p>' +
      '<ul><li>title<ul><li>body</li></ul></li></ul>';
    const once  = splitPanels.applyToSectionInner(inner, 'split-metric');
    const twice = splitPanels.applyToSectionInner(once,  'split-metric');
    assert.equal(twice, once);
  });

  test('applyToHtml runs against full Marpit HTML and rewrites only split-* sections', () => {
    const html =
      '<section class="content"><h2>plain</h2></section>' +
      '<section class="split-brief">' +
      '<p><code>E</code></p><h2>T</h2><p>intro.</p>' +
      '<ul><li>a</li></ul>' +
      '</section>';
    const out = splitPanels.applyToHtml(html);
    // Non-split section untouched.
    assert.ok(out.includes('<section class="content"><h2>plain</h2></section>'));
    // Split section rewritten.
    assert.match(out, /<div class="brief-left">/);
    assert.match(out, /<div class="brief-right">/);
  });
});
