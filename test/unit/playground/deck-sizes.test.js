/**
 * The deck-config "Slide size" picker (docs/src/playground/deck-sizes.js) must
 * stay in step with the engine's `@size` registry (lib/_theme.css): every value
 * it offers must be a real registered size, and the social/mobile formats added
 * in #399 must be present. This is the drift guard that was missing when the
 * picker offered only the three landscape sizes while the engine had eight.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseSizes } = require('../../../lib/engine/css');

const ROOT = path.join(__dirname, '..', '..', '..');
const themeCss = fs.readFileSync(path.join(ROOT, 'lib', '_theme.css'), 'utf8');
const registered = new Set(parseSizes(themeCss).keys());

describe('deck-config size picker ↔ @size registry', () => {
  // deck-sizes.js is a browser ESM module of pure data — import it dynamically.
  let SIZE_OPTIONS;
  test('load SIZE_OPTIONS', async () => {
    ({ SIZE_OPTIONS } = await import(
      path.join(ROOT, 'docs', 'src', 'playground', 'deck-sizes.js')
    ));
    assert.ok(Array.isArray(SIZE_OPTIONS) && SIZE_OPTIONS.length > 0);
  });

  test('the registry actually defines the social/mobile sizes (#399)', () => {
    for (const s of ['square', 'portrait', 'story', 'mobile']) {
      assert.ok(registered.has(s), `lib/_theme.css is missing @size ${s}`);
    }
  });

  test('every picker value is a registered @size', () => {
    for (const [value] of SIZE_OPTIONS) {
      assert.ok(registered.has(value), `picker offers '${value}' but no @size ${value} is registered`);
    }
  });

  test('the picker surfaces the social/mobile sizes (the #399 drift it missed)', () => {
    const values = new Set(SIZE_OPTIONS.map(([v]) => v));
    for (const s of ['square', 'portrait', 'story', 'mobile']) {
      assert.ok(values.has(s), `the size picker is missing '${s}'`);
    }
  });

  test('each option is a [value, label] pair with a non-empty label', () => {
    for (const opt of SIZE_OPTIONS) {
      assert.equal(opt.length, 2);
      assert.equal(typeof opt[1], 'string');
      assert.ok(opt[1].length > 0);
    }
  });

  // The editor autocomplete (grammar-vocab.js SIZE_VALUES) and the deck-config
  // picker (deck-sizes.js SIZE_OPTIONS) must offer the SAME formats — same
  // single source, no drift between the two UI surfaces.
  test('SIZE_VALUES (autocomplete) matches SIZE_OPTIONS (picker), and resolves to @sizes', async () => {
    const { SIZE_VALUES } = await import(
      path.join(ROOT, 'docs', 'src', 'playground', 'grammar-vocab.js')
    );
    assert.deepEqual(SIZE_VALUES, SIZE_OPTIONS.map(([v]) => v),
      'grammar-vocab SIZE_VALUES drifted from the deck-config picker SIZE_OPTIONS');
    for (const v of SIZE_VALUES) {
      assert.ok(registered.has(v), `autocomplete offers '${v}' but no @size ${v} is registered`);
    }
  });
});
