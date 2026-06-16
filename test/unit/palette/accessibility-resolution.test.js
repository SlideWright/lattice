/**
 * Unit: lib/core/resolve-accessibility.js — the accessibility override that
 * sits ABOVE the `theme:` chain.
 *
 * Pins the precedence the design doc fixes (2026-06-16-colour-blindness-
 * accessibility.md): workspace > front-matter `accessibility:` > off, and an
 * active setting always supersedes `theme:`. Each test asserts the resolved
 * `palette`/`type` AND the `source`, so a regression that flips precedence is
 * caught even when the resolved name coincides.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { resolveAccessibility, readFrontMatterAccessibility, A11Y_PALETTES } = require('../../../lib/core/resolve-accessibility.js');

const FM = type => `---\nmarp: true\ntheme: indaco\naccessibility: ${type}\n---\n\n# Slide`;
const FM_NONE = '---\nmarp: true\ntheme: indaco\n---\n\n# Slide';

describe('accessibility-resolution', () => {
  test('off when neither source is set', () => {
    const r = resolveAccessibility({ md: FM_NONE, env: {} });
    assert.deepEqual(r, { active: false, type: null, palette: null, source: 'off', unsupported: null });
  });

  test('front-matter activates and maps to a11y-<type>', () => {
    const r = resolveAccessibility({ md: FM('deuteranopia'), env: {} });
    assert.equal(r.active, true);
    assert.equal(r.type, 'deuteranopia');
    assert.equal(r.palette, 'a11y-deuteranopia');
    assert.equal(r.source, 'front-matter');
  });

  test('front-matter accepts short aliases (deutan → deuteranopia)', () => {
    const r = resolveAccessibility({ md: FM('deutan'), env: {} });
    assert.equal(r.palette, 'a11y-deuteranopia');
    assert.equal(r.source, 'front-matter');
  });

  test('workspace wins over a differing front-matter type', () => {
    const r = resolveAccessibility({ md: FM('deuteranopia'), workspace: 'tritanopia', env: {} });
    assert.equal(r.palette, 'a11y-tritanopia');
    assert.equal(r.source, 'workspace');
  });

  test('explicit workspace off overrides front-matter on', () => {
    const r = resolveAccessibility({ md: FM('deuteranopia'), workspace: 'off', env: {} });
    assert.equal(r.active, false);
    assert.equal(r.source, 'workspace');
  });

  test('unset workspace defers to front-matter', () => {
    const r = resolveAccessibility({ md: FM('protanopia'), workspace: '', env: {} });
    assert.equal(r.palette, 'a11y-protanopia');
    assert.equal(r.source, 'front-matter');
  });

  test('LATTICE_ACCESSIBILITY env acts as the workspace tier', () => {
    const r = resolveAccessibility({ md: FM_NONE, env: { LATTICE_ACCESSIBILITY: 'protanopia' } });
    assert.equal(r.palette, 'a11y-protanopia');
    assert.equal(r.source, 'workspace');
  });

  test('achromatopsia is recognized but deferred → off + unsupported flag', () => {
    const r = resolveAccessibility({ md: FM('achromatopsia'), env: {} });
    assert.equal(r.active, false);
    assert.equal(r.unsupported, 'achromatopsia');
    assert.equal(r.source, 'front-matter');
  });

  test('an unknown front-matter token is treated as unset (off), not a crash', () => {
    const r = resolveAccessibility({ md: FM('banana'), env: {} });
    assert.equal(r.active, false);
    assert.equal(r.source, 'off');
  });

  test('a typo in workspace does not suppress a valid front-matter setting', () => {
    const r = resolveAccessibility({ md: FM('deuteranopia'), workspace: 'banana', env: {} });
    assert.equal(r.palette, 'a11y-deuteranopia');
    assert.equal(r.source, 'front-matter');
  });

  test('readFrontMatterAccessibility ignores body text outside the block', () => {
    assert.equal(readFrontMatterAccessibility('# h\n\naccessibility: deuteranopia'), null);
  });

  test('A11Y_PALETTES are the three shipped dichromacies', () => {
    assert.deepEqual([...A11Y_PALETTES].sort(), ['a11y-deuteranopia', 'a11y-protanopia', 'a11y-tritanopia']);
  });
});
