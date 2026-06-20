const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { loadAll, manifestBucket } = require('../../../lib/components');
const { checkAdaptDeclarations } = require('../../../tools/check-ownership');

const ROOT = path.join(__dirname, '..', '..', '..');
const COMPONENTS = path.join(ROOT, 'lib', 'components');
const VALID = new Set(['reflow', 'native', 'single-orientation']);

// Every component declares a valid adapt.mode — the contract is COMPLETE.
// (engineering/decisions/2026-06-20-adaptive-manifest-contract.md)
test('every component declares a valid adapt.mode', () => {
  const manifests = loadAll();
  assert.ok(manifests.length >= 50, 'expected the full component catalog');
  for (const m of manifests) {
    const mode = m.adapt?.mode;
    assert.ok(VALID.has(mode), `${m.name}: adapt.mode is ${JSON.stringify(mode)} (must be one of ${[...VALID].join(', ')})`);
  }
});

// The anti-drift invariant holds across the real tree: any component whose CSS
// carries `@container … aspect-ratio` is declared `reflow`. Re-derived here so a
// future @container rule added without flipping the manifest fails this test too
// (belt-and-braces with the build:check gate).
test('@container aspect-ratio CSS implies adapt.mode reflow', () => {
  const RE = /@container[^{]*aspect-ratio/;
  for (const m of loadAll()) {
    const bucket = manifestBucket(m);
    const candidates = [
      path.join(COMPONENTS, bucket, m.name, `${m.name}.styles.css`),
      path.join(COMPONENTS, m.name, `${m.name}.styles.css`),
      path.join(COMPONENTS, m.name, 'styles.css'),
    ];
    const css = candidates.filter(fs.existsSync).map((p) => fs.readFileSync(p, 'utf8')).join('\n');
    if (RE.test(css)) {
      assert.strictEqual(m.adapt.mode, 'reflow', `${m.name} has @container aspect-ratio CSS but adapt.mode is "${m.adapt.mode}"`);
    }
  }
});

// The gate logic rejects the failure shapes (synthetic manifests, no CSS on disk).
test('checkAdaptDeclarations flags invalid declarations', () => {
  const cases = [
    { name: '__x', bucket: 'evidence', adapt: { mode: 'wat' } },                                  // invalid enum
    { name: '__x', bucket: 'evidence', adapt: { mode: 'single-orientation' }, orientation: ['landscape', 'portrait'] }, // single but two
    { name: '__x', bucket: 'evidence', adapt: { mode: 'native' }, orientation: ['landscape'] },   // native but one
    { name: '__x', bucket: 'evidence' },                                                          // missing adapt
  ];
  for (const m of cases) {
    const errors = [];
    checkAdaptDeclarations([m], errors);
    assert.ok(errors.length > 0, `expected an error for ${JSON.stringify(m.adapt || null)} / orient=${JSON.stringify(m.orientation)}`);
  }
});

// …and accepts the valid shapes.
test('checkAdaptDeclarations accepts valid declarations', () => {
  const cases = [
    { name: '__x', bucket: 'evidence', adapt: { mode: 'native' }, orientation: ['landscape', 'portrait'] },
    { name: '__x', bucket: 'evidence', adapt: { mode: 'native' } },                               // omitted orientation = both
    { name: '__x', bucket: 'evidence', adapt: { mode: 'single-orientation' }, orientation: ['landscape'] },
    { name: '__x', bucket: 'evidence', adapt: { mode: 'reflow' }, orientation: ['landscape'] },   // reflow may be single-orientation
  ];
  for (const m of cases) {
    const errors = [];
    checkAdaptDeclarations([m], errors);
    assert.deepStrictEqual(errors, [], `expected no error for ${JSON.stringify(m)}`);
  }
});
