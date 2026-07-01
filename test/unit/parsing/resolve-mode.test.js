/**
 * Unit: the `mode:` register resolver (lib/core/resolve-mode.js).
 *
 * Pure mapping from the deck front-matter `mode:` value (the rendering MODE —
 * boardroom / sketch) to the CSS class tokens the three render paths append to
 * every section. The sibling of resolve-finish (the backdrop axis); the two compose.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  MODE_REGISTER,
  MODE_NAMES,
  MODE_TOKENS,
  readFrontMatterMode,
  isKnownMode,
  modeClasses,
  modeClassesFromSource,
} = require('../../../lib/core/resolve-mode');

describe('resolve-mode', () => {
  test('register maps each name to its class tokens', () => {
    assert.equal(modeClasses('sketch'), 'sketch');
    assert.equal(modeClasses('sketch-clean'), 'sketch sketch-clean-body');
    assert.equal(modeClasses('boardroom'), '', 'boardroom is the no-class baseline');
  });

  test('boardroom / omitted / unrecognized all resolve to no classes', () => {
    assert.equal(modeClasses('boardroom'), '');
    assert.equal(modeClasses(''), '');
    assert.equal(modeClasses('   '), '');
    assert.equal(modeClasses('sketchh'), '', 'typo → no classes (deck-lint flags it)');
    assert.equal(modeClasses(undefined), '');
    assert.equal(modeClasses(null), '');
  });

  test('value is case- and whitespace-insensitive', () => {
    assert.equal(modeClasses('  Sketch  '), 'sketch');
    assert.equal(modeClasses('SKETCH-CLEAN'), 'sketch sketch-clean-body');
  });

  test('isKnownMode recognizes the register names only', () => {
    assert.ok(isKnownMode('sketch'));
    assert.ok(isKnownMode('sketch-clean'));
    assert.ok(isKnownMode('boardroom'));
    assert.ok(!isKnownMode('sketchh'));
    assert.ok(!isKnownMode(''));
    assert.ok(!isKnownMode(undefined));
  });

  test('MODE_NAMES lists exactly the registered names', () => {
    assert.deepEqual([...MODE_NAMES].sort(), ['boardroom', 'sketch', 'sketch-clean']);
  });

  test('MODE_TOKENS names the per-slide override tokens (incl. the boardroom opt-out)', () => {
    assert.deepEqual([...MODE_TOKENS].sort(), ['boardroom', 'sketch', 'sketch-clean-body']);
  });

  test('readFrontMatterMode extracts the value from the front-matter block only', () => {
    const md = '---\nmarp: true\ntheme: carta\nmode: sketch\n---\n\n# H\n\n`mode: not-this` in body\n';
    assert.equal(readFrontMatterMode(md), 'sketch');
    assert.equal(modeClassesFromSource(md), 'sketch');
  });

  test('readFrontMatterMode accepts quotes and returns null when absent', () => {
    assert.equal(readFrontMatterMode('---\nmode: "sketch-clean"\n---\n'), 'sketch-clean');
    assert.equal(readFrontMatterMode("---\nmode: 'boardroom'\n---\n"), 'boardroom');
    assert.equal(readFrontMatterMode('---\ntheme: carta\n---\n'), null);
    assert.equal(readFrontMatterMode(''), null);
  });

  // Rot-guard: every style class the register maps to must have a real CSS rule in
  // base.sketch.css (and boardroom maps to nothing). Keeps the register in sync
  // with the stylesheet the same way resolve-finish guards base.finish.css.
  test('every style class resolves to a real CSS rule in base.sketch.css', () => {
    const css = fs.readFileSync(path.join(__dirname, '../../../lib/base/base.sketch.css'), 'utf8');
    const registered = new Set();
    for (const tokens of Object.values(MODE_REGISTER)) {
      for (const cls of tokens.split(/\s+/).filter(Boolean)) registered.add(cls);
    }
    for (const cls of registered) {
      assert.ok(new RegExp(`\\.${cls}\\b`).test(css), `style maps to .${cls} but base.sketch.css has no rule`);
    }
  });
});
