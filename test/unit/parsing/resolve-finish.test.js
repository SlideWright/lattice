/**
 * Unit: the `finish:` register resolver (lib/core/resolve-finish.js).
 *
 * Pure mapping from the deck front-matter `finish:` value to the CSS class
 * tokens the three render paths append to every section. No render — just the
 * register table + the front-matter reader.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  FINISH_REGISTER,
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

  // The catalog rot-guard (decision doc: "finish→primitive map is a single gated
  // source of truth — every finish resolves to a live class, every shipped
  // backdrop class is reachable from a finish"). FINISH_REGISTER is that source;
  // this test is the gate keeping it in sync with base.backdrops.css.
  test('every backdrop finish class resolves to a real CSS rule, and vice versa', () => {
    const css = fs.readFileSync(
      path.join(__dirname, '../../../lib/base/base.backdrops.css'),
      'utf8',
    );
    // The backdrop-* classes the register maps to.
    const registered = new Set();
    for (const tokens of Object.values(FINISH_REGISTER)) {
      for (const cls of tokens.split(/\s+/).filter(Boolean)) {
        if (cls.startsWith('backdrop-')) registered.add(cls);
      }
    }
    // The backdrop-* classes the CSS actually defines (section.backdrop-x rules).
    const defined = new Set(
      [...css.matchAll(/section\.(backdrop-[\w-]+)\b/g)].map((m) => m[1]),
    );
    // Every registered class must have a rule.
    for (const cls of registered) {
      assert.ok(defined.has(cls), `finish maps to .${cls} but base.backdrops.css has no rule`);
    }
    // Every defined class must be reachable from a finish, EXCEPT the documented
    // per-slide-only escape `backdrop-none` (not a deck finish).
    const escapes = new Set(['backdrop-none']);
    for (const cls of defined) {
      if (escapes.has(cls)) continue;
      assert.ok(registered.has(cls), `.${cls} defined but unreachable from any finish (rot)`);
    }
  });

  test('readFrontMatterFinish accepts quotes and returns null when absent', () => {
    assert.equal(readFrontMatterFinish('---\nfinish: "sketch-clean"\n---\n'), 'sketch-clean');
    assert.equal(readFrontMatterFinish("---\nfinish: 'boardroom'\n---\n"), 'boardroom');
    assert.equal(readFrontMatterFinish('---\ntheme: carta\n---\n'), null);
    assert.equal(readFrontMatterFinish(''), null);
    assert.equal(readFrontMatterFinish('# no front matter'), null);
  });
});
