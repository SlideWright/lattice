/**
 * Orientation contract sync — the lint's hardcoded LANDSCAPE_ONLY_LAYOUTS /
 * PORTRAIT_ONLY_LAYOUTS sets (lib/authoring/lint-core.js, fs-free for the
 * browser) must stay in step with the component manifests' `orientation` array,
 * so the portrait-support audit can't silently drift. See
 * engineering/decisions/2026-06-16-orientation-in-the-form-model.md.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAll } = require('../../../lib/components');
const {
  LANDSCAPE_ONLY_LAYOUTS,
  PORTRAIT_ONLY_LAYOUTS,
  deckOrientation,
} = require('../../../lib/authoring/lint-core');

// A manifest with `orientation` declares its supported set; omitted = both.
function namesWhereOrientationIs(predicate) {
  return loadAll()
    .filter((m) => Array.isArray(m.orientation) && predicate(m.orientation))
    .map((m) => m.name)
    .sort();
}

describe('orientation contract sync (lint ↔ manifests)', () => {
  test('LANDSCAPE_ONLY_LAYOUTS matches manifests with orientation: ["landscape"]', () => {
    const fromManifests = namesWhereOrientationIs(
      (o) => o.length === 1 && o[0] === 'landscape',
    );
    assert.deepEqual([...LANDSCAPE_ONLY_LAYOUTS].sort(), fromManifests,
      'lint-core LANDSCAPE_ONLY_LAYOUTS drifted from the manifests — update one to match.');
  });

  test('PORTRAIT_ONLY_LAYOUTS matches manifests with orientation: ["portrait"]', () => {
    const fromManifests = namesWhereOrientationIs(
      (o) => o.length === 1 && o[0] === 'portrait',
    );
    assert.deepEqual([...PORTRAIT_ONLY_LAYOUTS].sort(), fromManifests);
  });

  test('every declared orientation array is a non-empty subset of landscape/portrait', () => {
    for (const m of loadAll()) {
      if (m.orientation === undefined) continue;
      assert.ok(Array.isArray(m.orientation) && m.orientation.length >= 1, `${m.name}: orientation must be a non-empty array`);
      for (const v of m.orientation) assert.ok(['landscape', 'portrait'].includes(v), `${m.name}: bad orientation '${v}'`);
    }
  });

  test('deckOrientation reads the size: directive', () => {
    assert.equal(deckOrientation('---\nsize: story\n---\n'), 'portrait');
    assert.equal(deckOrientation('---\nsize: 9:16\n---\n'), 'portrait');
    assert.equal(deckOrientation('---\nsize: hd\n---\n'), 'landscape');
    assert.equal(deckOrientation('# no front matter\n'), 'landscape');
  });
});
