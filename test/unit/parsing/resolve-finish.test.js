/**
 * Unit: the `finish:` register resolver (lib/core/resolve-finish.js).
 *
 * Pure mapping from the deck front-matter `finish:` value to the CSS class
 * tokens the three render paths append to every section. No render — just the
 * register table + the front-matter reader.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  FINISH_NAMES,
  readFrontMatterFinish,
  isKnownFinish,
  finishClasses,
  finishClassesFromSource,
} = require('../../../lib/core/resolve-finish');

describe('resolve-finish', () => {
  test('register maps each name to its class tokens', () => {
    assert.equal(finishClasses('sketch'), 'sketch');
    assert.equal(finishClasses('sketch-clean'), 'sketch sketch-clean-body');
    assert.equal(finishClasses('boardroom'), '', 'boardroom is the no-class baseline');
  });

  test('backdrop finishes map to the backdrop base class + their variant', () => {
    assert.equal(finishClasses('wash'), 'backdrop backdrop-wash');
    assert.equal(finishClasses('aurora'), 'backdrop backdrop-aurora');
    assert.equal(finishClasses('blueprint'), 'backdrop backdrop-blueprint');
    assert.equal(finishClasses('dots'), 'backdrop backdrop-dots');
    assert.equal(finishClasses('hatch'), 'backdrop backdrop-hatch');
    // every backdrop finish carries the base `backdrop` token (the compositor hook)
    for (const name of ['wash', 'aurora', 'blueprint', 'dots', 'hatch']) {
      assert.ok(
        finishClasses(name).split(/\s+/).includes('backdrop'),
        `${name} must include the base backdrop class`,
      );
    }
  });

  test('boardroom / omitted / unrecognized all resolve to no classes', () => {
    assert.equal(finishClasses('boardroom'), '');
    assert.equal(finishClasses(''), '');
    assert.equal(finishClasses('   '), '');
    assert.equal(finishClasses('sketchh'), '', 'typo → no classes (deck-lint flags it)');
    assert.equal(finishClasses(undefined), '');
    assert.equal(finishClasses(null), '');
  });

  test('value is case- and whitespace-insensitive', () => {
    assert.equal(finishClasses('  Sketch  '), 'sketch');
    assert.equal(finishClasses('SKETCH-CLEAN'), 'sketch sketch-clean-body');
  });

  test('isKnownFinish recognizes the register names only', () => {
    assert.ok(isKnownFinish('sketch'));
    assert.ok(isKnownFinish('sketch-clean'));
    assert.ok(isKnownFinish('boardroom'));
    assert.ok(!isKnownFinish('sketchh'));
    assert.ok(!isKnownFinish(''));
    assert.ok(!isKnownFinish(undefined));
  });

  test('FINISH_NAMES lists exactly the registered names', () => {
    assert.deepEqual(
      [...FINISH_NAMES].sort(),
      ['aurora', 'blueprint', 'boardroom', 'dots', 'hatch', 'sketch', 'sketch-clean', 'wash'],
    );
  });

  test('readFrontMatterFinish extracts the value from the front-matter block only', () => {
    const md = '---\nmarp: true\ntheme: carta\nfinish: sketch\n---\n\n# H\n\n`finish: not-this` in body\n';
    assert.equal(readFrontMatterFinish(md), 'sketch');
    assert.equal(finishClassesFromSource(md), 'sketch');
  });

  test('readFrontMatterFinish accepts quotes and returns null when absent', () => {
    assert.equal(readFrontMatterFinish('---\nfinish: "sketch-clean"\n---\n'), 'sketch-clean');
    assert.equal(readFrontMatterFinish("---\nfinish: 'boardroom'\n---\n"), 'boardroom');
    assert.equal(readFrontMatterFinish('---\ntheme: carta\n---\n'), null);
    assert.equal(readFrontMatterFinish(''), null);
    assert.equal(readFrontMatterFinish('# no front matter'), null);
  });
});
