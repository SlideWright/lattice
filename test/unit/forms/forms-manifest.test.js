/**
 * Unit: the Form composition-model manifest (lib/forms/**) — the engine-read
 * single source of truth for Frame + Cell + Tile (design/forms.md §11;
 * 2026-06-15-form-implementation.md §6).
 *
 * Asserts:
 *   (a) every manifest validates against the Cell / Frame / Tile shape;
 *   (b) referential integrity — Tile.fits → real Cell; every Cell.accepts kind
 *       is satisfied by ≥1 real Tile (or a Frame for 'frame'); Frame.cells /
 *       Frame.suppresses → real Cells;
 *   (c) the manifest-derived FORM_TOGGLE_SKIP equals the historical set;
 *   (d) dist/docs/forms.json is fresh (regenerating produces no diff) —
 *       mirrors the components.json freshness gate.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const forms = require('../../../lib/forms');
const plugins = require('../../../lib/integrations/markdown-it/plugins');
const { renderJson, JSON_FILE } = require('../../../tools/build-forms');

// The historical hardcoded skip list (the behaviour the manifests must preserve).
const HISTORICAL_SKIP = [
  'title', 'divider', 'closing',
  'math', 'compare-code',
  'split-panel', 'split-compare',
  'image', 'featured',
];

test('(a) every Cell manifest validates', () => {
  const cells = forms.loadCells();
  assert.ok(cells.length >= 9, `expected ≥9 cells, got ${cells.length}`);
  for (const c of cells) {
    assert.deepEqual(forms.validateCell(c, c.id), [], `cell ${c.id} should validate`);
  }
});

test('(a) every Frame manifest validates', () => {
  const frames = forms.loadFrames();
  assert.ok(frames.length >= 11, `expected ≥11 frames, got ${frames.length}`);
  for (const f of frames) {
    assert.deepEqual(forms.validateFrame(f, f.id), [], `frame ${f.id} should validate`);
  }
});

test('(a) every Tile manifest validates', () => {
  const tiles = forms.loadTiles();
  assert.equal(tiles.length, 14, 'expected the 14 registry tiles');
  for (const t of tiles) {
    assert.deepEqual(forms.validateTile(t, t.id), [], `tile ${t.id} should validate`);
  }
});

test('(b) referential integrity holds across the catalog', () => {
  const cells = forms.loadCells();
  const frames = forms.loadFrames();
  const tiles = forms.loadTiles();
  assert.deepEqual(forms.checkIntegrity({ cells, frames, tiles }), []);
  // loadCatalog throws if integrity fails — exercise that path too.
  assert.doesNotThrow(() => forms.loadCatalog());
});

test('(b) checkIntegrity catches a Tile fitting a non-existent Cell', () => {
  const errors = forms.checkIntegrity({
    cells: [{ id: 'stage', region: 'stage', z: 2, accepts: ['content'], capacity: 'one', fill: 'start' }],
    frames: [],
    tiles: [{ id: 'content', kind: 'content', fits: ['ghost'], z: 2, population: 'x', status: 'shipped' }],
  });
  assert.ok(errors.some((e) => /fits unknown cell "ghost"/.test(e)), errors.join('; '));
});

test('(b) checkIntegrity catches a Cell accepting a kind no Tile satisfies', () => {
  const errors = forms.checkIntegrity({
    cells: [{ id: 'overlay', region: 'overlay', z: 4, accepts: ['review'], capacity: 'one', fill: 'anchor' }],
    frames: [],
    tiles: [], // no review tile fits overlay
  });
  assert.ok(errors.some((e) => /accepts "review"/.test(e)), errors.join('; '));
});

test('(c) manifest-derived skip set equals the historical FORM_TOGGLE_SKIP', () => {
  const derived = forms.frameToggleSkip();
  assert.deepEqual([...derived].sort(), [...HISTORICAL_SKIP].sort());
});

test('(c) the browser-baked FORM_TOGGLE_SKIP_FALLBACK matches the manifest-derived set', () => {
  // The fallback literal is what the fs-free browser bundle uses; it must never
  // drift from the manifests (the Node-derived set). This guards that claim.
  assert.deepEqual([...plugins.FORM_TOGGLE_SKIP_FALLBACK].sort(), [...forms.frameToggleSkip()].sort());
  assert.deepEqual([...plugins.FORM_TOGGLE_SKIP].sort(), [...forms.frameToggleSkip()].sort());
});

test('(c) plugins.formToggleClass skips every historical sovereign Frame', () => {
  for (const skip of HISTORICAL_SKIP) {
    assert.equal(plugins.formToggleClass(skip, 'standard'), skip, `should skip ${skip}`);
  }
  // and still tags ordinary content
  assert.equal(plugins.formToggleClass('content', 'standard'), 'content form');
});

test('(d) dist/docs/forms.json is fresh (regenerating produces no diff)', () => {
  const current = fs.existsSync(JSON_FILE) ? fs.readFileSync(JSON_FILE, 'utf8') : null;
  assert.equal(current, renderJson(), 'dist/docs/forms.json is stale — run `node tools/build-forms.js`');
});
