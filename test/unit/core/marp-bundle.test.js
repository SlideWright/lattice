/**
 * Unit: the shared Export-to-Marp bundle spec (lib/core/marp-bundle.js).
 *
 * This pure module is the SINGLE source of truth for the bundle's generated
 * files + static-asset manifest, shared by the CLI (tools/export-marp.js) and
 * the Drawing Board's in-browser export so they can't drift. The render parity
 * of the baked deck is covered by bake-splits.test.js; here we pin the spec.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  STATIC_ASSETS, RUNTIME_SCRIPTS, MARP_CONFIG_CJS, withRuntimeScripts,
  safeName, packageJson, readme,
} = require('../../../lib/core/marp-bundle');

describe('marp-bundle spec', () => {
  test('STATIC_ASSETS ships the minified engine/stylesheet under canonical names', () => {
    const byTo = Object.fromEntries(STATIC_ASSETS.map((a) => [a.to, a.from]));
    assert.equal(byTo['dist/lattice.css'], 'dist/lattice.min.css');
    assert.equal(byTo['dist/lattice-emulator.js'], 'dist/lattice-emulator.min.js');
    assert.equal(byTo['lattice-runtime.min.js'], 'dist/lattice-runtime.min.js');
    assert.equal(byTo['mermaid-v11.min.js'], 'mermaid-v11.min.js');
  });

  test('safeName slugs a deck title', () => {
    assert.equal(safeName('Q3 Board Review!'), 'Q3-Board-Review');
    assert.equal(safeName('  '), 'deck');
  });

  test('withRuntimeScripts appends the lint-ignored mermaid + runtime tags', () => {
    const out = withRuntimeScripts('# A\n\n## B\n');
    assert.match(out, /<!-- markdownlint-disable MD033 -->\n<script src="mermaid-v11\.min\.js"><\/script>\n<script src="lattice-runtime\.min\.js"><\/script>\s*$/);
    assert.ok(RUNTIME_SCRIPTS.includes('lattice-runtime.min.js'));
  });

  test('marp.config.cjs builds a themeSet and wires no render engine (marp purged)', () => {
    assert.match(MARP_CONFIG_CJS, /themeSet/);
    assert.match(MARP_CONFIG_CJS, /allowLocalFiles/);
    assert.doesNotMatch(MARP_CONFIG_CJS, /@slidewright\/lattice\/config/);
    assert.doesNotMatch(MARP_CONFIG_CJS, /\bengine\b/);
  });

  test('packageJson pins marp-cli only and scripts reference the deck', () => {
    const pkg = packageJson('My Deck');
    assert.ok(pkg.dependencies['@marp-team/marp-cli']);
    // The engine ships pre-bundled (dist/lattice-emulator.js), so it is NOT an
    // npm dependency — listing the unpublished @slidewright/lattice would 404
    // `npm install` and the recipient would never get marp-cli either.
    assert.strictEqual(pkg.dependencies['@slidewright/lattice'], undefined);
    assert.match(pkg.name, /^My-Deck-marp-export$/);
    assert.match(pkg.scripts.pdf, /My Deck\.md/);
  });

  test('readme documents the three render routes', () => {
    const r = readme({ name: 'demo', palette: 'indaco', themes: ['dist/lattice.css', 'themes/indaco.css'] });
    assert.match(r, /node dist\/lattice-emulator\.js demo\.md/);
    assert.match(r, /npm run pdf/);
    assert.match(r, /Open the HTML in a browser/);
  });
});
