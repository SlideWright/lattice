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
  STATIC_ASSETS, AGENT_ASSETS, RUNTIME_SCRIPTS, MARP_CONFIG_CJS, withRuntimeScripts,
  safeName, packageJson, vscodeSettings, readme, agentsMd,
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

  describe('agent kit', () => {
    test('AGENT_ASSETS carries the component catalog into agent/', () => {
      const byTo = Object.fromEntries(AGENT_ASSETS.map((a) => [a.to, a.from]));
      assert.equal(byTo['agent/components.json'], 'dist/docs/components.json');
      // The kit is catalog data only — no engine, no heavy runtime.
      assert.ok(!AGENT_ASSETS.some((a) => /emulator|runtime|\.js$/.test(a.from)));
    });

    test('agentsMd is bundle-tailored: names the deck, the catalog path, capacity, and the frozen snapshot', () => {
      const a = agentsMd({ name: 'q3-review', version: '1.2.3' });
      assert.match(a, /AGENTS\.md/);
      assert.match(a, /q3-review\.md/);            // points at THIS bundle's deck
      assert.match(a, /agent\/components\.json/);   // and its own catalog path
      assert.match(a, /capacity/i);                 // teaches pick-by-capacity
      assert.match(a, /count first/i);
      assert.match(a, /frozen snapshot/i);
      assert.match(a, /Lattice 1\.2\.3/);           // provenance stamp
      // Bundle-tailored, NOT the repo's AGENTS.md: no repo-only tooling paths.
      assert.doesNotMatch(a, /npm run lint:deck|dist\/docs\/components\.json/);
    });

    test('agentsMd omits the version stamp gracefully when unknown', () => {
      const a = agentsMd({ name: 'demo' });
      assert.match(a, /frozen snapshot[\s\S]*Lattice\)/);
      assert.doesNotMatch(a, /Lattice undefined/);
    });

    test('readme adds the agent section + rows only when agent:true', () => {
      const base = { name: 'demo', palette: 'indaco', themes: ['lattice.css'] };
      const on = readme({ ...base, agent: true });
      assert.match(on, /Extend it with an AI agent/);
      assert.match(on, /`AGENTS\.md`/);
      assert.match(on, /`agent\/components\.json`/);
      const off = readme({ ...base, agent: false });
      assert.doesNotMatch(off, /Extend it with an AI agent/);
      assert.doesNotMatch(off, /agent\/components\.json/);
    });
  });
});
