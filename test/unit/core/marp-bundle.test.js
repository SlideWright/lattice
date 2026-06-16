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
  safeName, packageJson, vscodeSettings, readme,
} = require('../../../lib/core/marp-bundle');

describe('marp-bundle spec', () => {
  test('STATIC_ASSETS ships the minified stylesheet/runtime/mermaid; NO engine', () => {
    const byTo = Object.fromEntries(STATIC_ASSETS.map((a) => [a.to, a.from]));
    // lattice.css at the bundle root (minified) — it is the Marp themeSet base.
    assert.equal(byTo['lattice.css'], 'dist/lattice.min.css');
    assert.equal(byTo['lattice-runtime.min.js'], 'dist/lattice-runtime.min.js');
    assert.equal(byTo['mermaid-v11.min.js'], 'mermaid-v11.min.js');
    // The bundle is Marp-native: no emulator is shipped.
    assert.ok(!STATIC_ASSETS.some((a) => /emulator/.test(a.from) || /emulator/.test(a.to)));
    assert.equal(byTo['dist/lattice.css'], undefined);
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

  test('marp.config.cjs builds a themeSet from root lattice.css + themes/, no engine', () => {
    assert.match(MARP_CONFIG_CJS, /themeSet/);
    assert.match(MARP_CONFIG_CJS, /allowLocalFiles/);
    // lattice.css is registered from the bundle ROOT (not dist/), since the
    // emulator's dist/ folder is no longer shipped.
    assert.match(MARP_CONFIG_CJS, /path\.join\(__dirname, 'lattice\.css'\)/);
    assert.doesNotMatch(MARP_CONFIG_CJS, /'dist'/);
    assert.doesNotMatch(MARP_CONFIG_CJS, /@slidewright\/lattice\/config/);
  });

  test('vscodeSettings registers the bundled themes for Marp VS Code', () => {
    const s = vscodeSettings(['lattice.css', 'themes/indaco.css', 'themes/indaco-dark.css']);
    const parsed = JSON.parse(s);
    assert.deepEqual(parsed['markdown.marp.themes'], ['lattice.css', 'themes/indaco.css', 'themes/indaco-dark.css']);
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

  test('readme documents the VS Code + marp-cli routes and the browser-HTML fidelity note', () => {
    const r = readme({ name: 'demo', palette: 'indaco', themes: ['lattice.css', 'themes/indaco.css'] });
    assert.match(r, /Marp for VS Code/);
    assert.match(r, /markdown\.marp\.themes/);
    assert.match(r, /npm run pdf/);
    assert.match(r, /--theme-set lattice\.css themes/);
    assert.match(r, /open the exported HTML|open the HTML|Open the HTML/i);
    // Marp-native: the README must NOT point at a bundled emulator any more.
    assert.doesNotMatch(r, /lattice-emulator/);
  });
});
