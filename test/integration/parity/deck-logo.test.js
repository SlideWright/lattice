/**
 * Integration: convenience `logo:` directive parity.
 *
 * Two authoring shapes produce the SAME rendered output:
 *   1. Native form  — `class: with-logo` + `style: ':root{--deck-logo:url("...")}'`
 *   2. Convenience  — `logo: ./acme-logo.svg`
 *
 * Both should result in `with-logo` on every section's class attribute
 * (default `logo-on: all`) and a `--deck-logo` CSS custom property
 * scoped to `:root` carrying the same image URL. This is what makes
 * the convenience layer trustworthy: it's literally desugared to the
 * native form.
 *
 * The marp-cli side of the directive lives in marp.config.js (the
 * `deckLogo` Marpit plugin + `applyDeckLogoStyleToCss` helper). That
 * path is exercised by test/unit/parsing/marp-plugins.test.js via the
 * @marp-team/marp-core programmatic API. This file pins the emulator
 * side and demonstrates the desugaring symmetry.
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

function sectionClasses(html) {
  return [...html.matchAll(/<section[^>]*\bid="(\d+)"[^>]*\bclass="([^"]*)"/g)]
    .map(m => ({ id: m[1], cls: m[2].split(/\s+/).filter(Boolean) }));
}

describe('deck-logo', () => {
  const CONVENIENCE = path.join(ROOT, 'test', 'fixtures', 'deck-logo.md');
  const NATIVE      = path.join(ROOT, 'test', 'fixtures', 'deck-logo-native.md');

  test('emulator: convenience `logo:` adds `with-logo` to every section and injects --deck-logo', { timeout: 60000 }, () => {
    const pdf = runEmulator(CONVENIENCE, { timeout: 60000 });
    const html = readSidecar(pdf);
    const sections = sectionClasses(html);

    assert.equal(sections.length, 3, 'expected 3 sections');
    for (const s of sections) {
      assert.ok(s.cls.includes('with-logo'),
        `slide ${s.id} missing 'with-logo'; got class="${s.cls.join(' ')}"`);
    }
    // Slide 1's per-slide `_class: title` must compose, not replace.
    assert.ok(sections.find(s => s.id === '1').cls.includes('title'),
      `slide 1 lost 'title'`);
    // Slide 3's per-slide `_class: divider` must compose too.
    assert.ok(sections.find(s => s.id === '3').cls.includes('divider'),
      `slide 3 lost 'divider'`);

    // The --deck-logo custom property must be injected with the
    // author-supplied path quoted inside url(...).
    assert.match(html, /:root\{--deck-logo:url\("\.\/acme-logo\.svg"\)\}/);
  });

  test('emulator: native form produces the same class set and the same --deck-logo as the convenience form', { timeout: 60000 }, () => {
    const pdf = runEmulator(NATIVE, { timeout: 60000 });
    const html = readSidecar(pdf);
    const sections = sectionClasses(html);

    assert.equal(sections.length, 3);
    for (const s of sections) {
      assert.ok(s.cls.includes('with-logo'),
        `slide ${s.id} missing 'with-logo' (native path); got class="${s.cls.join(' ')}"`);
    }
    // The native form uses Marp's built-in `style:` directive; the
    // resulting CSS must contain the same custom property declaration
    // as the convenience form (modulo whitespace).
    assert.match(html, /--deck-logo:\s*url\(\s*["']?\.\/acme-logo\.svg["']?\s*\)/);
  });
});
