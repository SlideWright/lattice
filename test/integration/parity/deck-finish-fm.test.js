/**
 * Integration: deck-wide `finish:` register in front matter.
 *
 * `finish:` is a Lattice extension (Marpit has no native key): the three render
 * paths read it, map it to CSS class tokens (lib/core/resolve-finish.js), and
 * APPEND those to every section — the same compose-not-replace semantic as the
 * deck-wide `class:` directive. So `finish: sketch` + `_class: cards-grid`
 * becomes `class="cards-grid sketch"`, and a bare slide becomes `class="sketch"`.
 *
 * This pins the emulator side (mirrors deck-class-fm.test.js); the marp-cli
 * plugin path applies the identical merge via deckClassPropagate in
 * lib/integrations/markdown-it/plugins.js (unit-covered in parsing/marp-plugins).
 *
 * Renders the fixture through the cached emulator helper and inspects the HTML
 * sidecar (avoids parsing PDF). Slow tier because the emulator always runs the
 * Chromium PDF stage.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('path');
const fs     = require('fs');
const { ROOT, runEmulator } = require('../../helpers/render');

describe('deck-finish-fm', () => {
  const FIXTURE = path.join(ROOT, 'test', 'fixtures', 'deck-finish-fm.md');

  test('emulator: front-matter `finish: sketch` applies `sketch` to every slide and composes with `_class:`', { timeout: 60000 }, () => {
    const pdf = runEmulator(FIXTURE, { timeout: 60000 });
    const htmlPath = pdf.replace(/\.pdf$/, '.html');
    if (!fs.existsSync(htmlPath)) throw new Error(`HTML sidecar missing: ${htmlPath}`);
    const sidecar = fs.readFileSync(htmlPath, 'utf8');

    const sections = [...sidecar.matchAll(/<section[^>]*\bid="(\d+)"[^>]*\bclass="([^"]*)"/g)]
      .map(m => ({ id: m[1], cls: m[2].split(/\s+/).filter(Boolean) }));

    assert.equal(sections.length, 3, 'expected 3 sections');

    // Every slide carries the finish-mapped `sketch` token.
    for (const s of sections) {
      assert.ok(s.cls.includes('sketch'),
        `slide ${s.id} missing finish-mapped 'sketch'; got class="${s.cls.join(' ')}"`);
    }

    // Slide 2's per-slide `_class: cards-grid` composes with the finish class,
    // not replaced — both tokens present.
    const slide2 = sections.find(s => s.id === '2');
    assert.ok(slide2.cls.includes('cards-grid'),
      `slide 2 lost per-slide 'cards-grid'; got class="${slide2.cls.join(' ')}"`);
    assert.ok(slide2.cls.includes('sketch'),
      `slide 2 missing finish 'sketch'; got class="${slide2.cls.join(' ')}"`);
  });
});
