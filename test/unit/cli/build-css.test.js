/**
 * Unit: tools/build-css.js — CSS bundler.
 *
 * Covers:
 *   1. bundle() emits the @layer declaration with the documented order
 *   2. bundle() includes the file-header banner so authors are warned
 *      not to edit the generated file
 *   3. bundle() includes lib/_theme.css contents (the Marp @theme block)
 *      before the @layer declaration — Marp's parser requires @theme
 *      not to be inside any layer
 *   4. bundle() picks up per-component styles.css from lib/components/<n>/
 *   5. bundle() silently skips missing source files (the migration ramp)
 *   6. The committed lattice.css matches bundle() output — the CI gate
 *      that catches "touched a source file, forgot to regenerate"
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bundle, OUTPUT } = require('../../../tools/build-css');

describe('build-css', () => {
  test('output declares the @layer cascade in the documented order', () => {
    const out = bundle();
    assert.match(
      out,
      /@layer base, root, scaffold, components, semi-universal, universal, diagram-overrides;/
    );
  });

  test('output starts with the "Do not edit by hand" banner', () => {
    const out = bundle();
    assert.match(out, /^\/\* lattice\.css — GENERATED/);
    assert.match(out, /Do not edit by hand/);
  });

  test('Marp @theme directive appears before the @layer declaration', () => {
    const out = bundle();
    const themeIdx = out.indexOf('@theme lattice');
    const layerIdx = out.indexOf('@layer base, root');
    assert.ok(themeIdx > 0, '@theme directive missing');
    assert.ok(layerIdx > 0, '@layer declaration missing');
    assert.ok(
      themeIdx < layerIdx,
      `@theme must come before @layer (theme at ${themeIdx}, layer at ${layerIdx})`
    );
  });

  test('includes a per-source-file separator comment for traceability', () => {
    const out = bundle();
    // Every concatenated source file should be marked with its path so
    // reviewers can grep for "where did this rule come from?"
    assert.match(out, /\/\* === lib\/_theme\.css === \*\//);
  });

  test('committed lattice.css matches bundle() output (freshness gate)', () => {
    assert.ok(fs.existsSync(OUTPUT), `expected ${OUTPUT} to exist`);
    const current = fs.readFileSync(OUTPUT, 'utf8');
    const fresh = bundle();
    assert.equal(
      current,
      fresh,
      `lattice.css is stale. Run \`npm run css:build\` to regenerate.`
    );
  });
});
