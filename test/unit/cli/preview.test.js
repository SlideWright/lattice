/**
 * Unit: tools/preview.js — scope detection.
 *
 * The scope detector is pure (no I/O for the file-categorization
 * part), so these tests inject changes directly rather than touching
 * git. The build + diff phases are covered by integration tests.
 *
 * The taxonomy under test (see tools/preview.js header comment):
 *   L0  no visual impact
 *   L1  single deck or example
 *   L2  component-scoped
 *   L3  full
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { detectScope, decksUsingComponent, ALL_DECKS, SCOPE_LEVELS, PATTERNS } = require('../../../tools/preview');

describe('preview scope detector', () => {
  test('empty change set → L0', () => {
    assert.equal(detectScope([]).level, 'L0');
  });

  test('test or docs change only → L0', () => {
    assert.equal(detectScope(['test/unit/something.test.js']).level, 'L0');
    assert.equal(detectScope(['docs/design-system.md']).level, 'L0');
    assert.equal(detectScope(['package.json']).level, 'L0');
  });

  test('manifest.json change → L0 (scaffolder-only impact)', () => {
    assert.equal(detectScope(['lib/components/cards-grid/manifest.json']).level, 'L0');
  });

  test('README in component folder → L0', () => {
    assert.equal(detectScope(['lib/components/quote/README.md']).level, 'L0');
  });

  test('example.md → L1, component-gallery only', () => {
    const s = detectScope(['lib/components/quote/example.md']);
    assert.equal(s.level, 'L1');
    assert.deepEqual(s.decks, ['component-gallery']);
    assert.deepEqual(s.components, ['quote']);
  });

  test('multiple example.md → L1, component-gallery only', () => {
    const s = detectScope(['lib/components/quote/example.md', 'lib/components/cards-grid/example.md']);
    assert.equal(s.level, 'L1');
    assert.deepEqual(s.decks, ['component-gallery']);
  });

  test('deck source change → L1', () => {
    const s = detectScope(['examples/kpi-gallery.md']);
    assert.equal(s.level, 'L1');
    assert.deepEqual(s.decks, ['kpi-gallery']);
  });

  test('component CSS → L2, scoped to decks using that component', () => {
    const s = detectScope(['lib/components/cards-grid/styles.css']);
    assert.equal(s.level, 'L2');
    assert.deepEqual(s.components, ['cards-grid']);
    assert.ok(s.decks.includes('gallery'), 'gallery uses cards-grid');
    assert.ok(s.decks.includes('component-gallery'), 'component-gallery always included for component changes');
  });

  test('component transform.js → L2', () => {
    const s = detectScope(['lib/components/radar/transform.js']);
    assert.equal(s.level, 'L2');
    assert.deepEqual(s.components, ['radar']);
  });

  test('shared CSS → L3 (full)', () => {
    assert.equal(detectScope(['lib/_legacy.css']).level, 'L3');
    assert.equal(detectScope(['lib/_universal.css']).level, 'L3');
    assert.equal(detectScope(['lib/_scaffold.css']).level, 'L3');
    assert.equal(detectScope(['lattice.css']).level, 'L3');
  });

  test('theme change → L3', () => {
    assert.equal(detectScope(['themes/indaco.css']).level, 'L3');
  });

  test('renderer (engine) change → L3', () => {
    assert.equal(detectScope(['lattice-emulator.js']).level, 'L3');
    assert.equal(detectScope(['marp.config.js']).level, 'L3');
    assert.equal(detectScope(['lib/chart-family.js']).level, 'L3');
  });

  test('explicit deck override → L1 with that deck', () => {
    const s = detectScope([], { deck: 'mermaid-gallery' });
    assert.equal(s.level, 'L1');
    assert.deepEqual(s.decks, ['mermaid-gallery']);
  });

  test('--full override → L3 with all decks', () => {
    const s = detectScope([], 'full');
    assert.equal(s.level, 'L3');
    assert.deepEqual(s.decks, [...ALL_DECKS]);
  });

  test('mixed change with one full-diff trigger wins (L3)', () => {
    const s = detectScope([
      'lib/_legacy.css',
      'lib/components/cards-grid/example.md',
      'examples/kpi-gallery.md',
    ]);
    assert.equal(s.level, 'L3');
  });

  test('component CSS + deck source → L2 (component-scoped includes deck)', () => {
    const s = detectScope([
      'lib/components/cards-grid/styles.css',
      'examples/kpi-gallery.md',
    ]);
    assert.equal(s.level, 'L2');
    assert.ok(s.decks.includes('kpi-gallery'));
    assert.ok(s.decks.includes('component-gallery'));
  });

  test('unrecognized lib/ file → L3 (conservative default)', () => {
    const s = detectScope(['lib/some-new-thing.js']);
    assert.equal(s.level, 'L3');
    assert.match(s.reason, /unrecognized/);
  });

  test('SCOPE_LEVELS documents all four tiers', () => {
    assert.deepEqual(Object.keys(SCOPE_LEVELS).sort(), ['L0', 'L1', 'L2', 'L3']);
  });

  test('PATTERNS exports the public taxonomy', () => {
    assert.ok(Array.isArray(PATTERNS.noVisualImpact));
    assert.ok(Array.isArray(PATTERNS.fullDiff));
    assert.ok(PATTERNS.componentCss instanceof RegExp);
  });
});

describe('decksUsingComponent', () => {
  test('returns the decks whose source mentions the component class', () => {
    const decks = decksUsingComponent('cards-grid');
    assert.ok(decks.includes('gallery'), 'gallery uses cards-grid');
  });

  test('returns empty array for an unused component', () => {
    const decks = decksUsingComponent('totally-fake-component-xyz');
    assert.deepEqual(decks, []);
  });
});
