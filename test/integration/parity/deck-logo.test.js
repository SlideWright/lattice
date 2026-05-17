/**
 * Integration: convenience `logo:` directive injects `<img class="deck-logo">`
 * as the first child of every section selected by the `logo-on` rule.
 *
 * Three render paths must agree:
 *   1. marp.config.js's `applyDeckLogoToHtml` (marp-cli path)
 *   2. lattice-emulator.js's HTML post-process (emulator path)
 *   3. lattice-runtime.js's `applyDeckLogoFromFrontMatter` (browser path)
 *
 * The first two run at build time. The third runs at view time and
 * gracefully no-ops in the vscode-webview sandbox per its sibling
 * `applyDeckClassFromFrontMatter`. The unit suite covers (1) via
 * `applyDeckLogoToHtml` directly; this integration pins (2) by
 * rendering through the emulator and inspecting the HTML sidecar.
 *
 * Slow tier because the emulator always runs the Chromium PDF stage
 * as part of its pipeline.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('path');
const fs     = require('fs');
const { ROOT, runEmulator } = require('../../helpers/render');

function readSidecar(pdfPath) {
  const htmlPath = pdfPath.replace(/\.pdf$/, '.html');
  if (!fs.existsSync(htmlPath)) throw new Error(`HTML sidecar missing: ${htmlPath}`);
  return fs.readFileSync(htmlPath, 'utf8');
}

describe('deck-logo', () => {
  const FIXTURE = path.join(ROOT, 'test', 'fixtures', 'deck-logo.md');

  test('emulator: `logo:` injects <img class="deck-logo"> as the first child of every section', { timeout: 60000 }, () => {
    const pdf = runEmulator(FIXTURE, { timeout: 60000 });
    const html = readSidecar(pdf);

    // Body of each <section>...</section>. Capture inner HTML so we can
    // assert position (first child).
    const bodies = [...html.matchAll(/<section\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/section>/g)]
      .map(m => ({ id: m[1], inner: m[2] }));
    assert.equal(bodies.length, 3, 'expected 3 sections');

    for (const s of bodies) {
      assert.match(s.inner, /^<img[^>]*\bclass="deck-logo"/,
        `slide ${s.id} should start with <img class="deck-logo">; got inner="${s.inner.slice(0, 120)}"`);
      assert.match(s.inner, /src="\.\/acme-logo\.svg"/,
        `slide ${s.id} should reference the logo path`);
      assert.match(s.inner, /aria-hidden="true"/,
        `slide ${s.id} logo should be aria-hidden`);
      assert.match(s.inner, /--deck-logo-src:url\(&quot;\.\/acme-logo\.svg&quot;\)/,
        `slide ${s.id} logo should carry the inline custom property for the mask rule`);
    }
  });
});
