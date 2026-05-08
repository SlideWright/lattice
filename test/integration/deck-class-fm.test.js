/**
 * Integration: deck-wide `class:` directive in front matter.
 *
 * Marp distinguishes the deck-wide `class:` directive (no leading
 * underscore — applied to every slide) from the per-slide `_class:`
 * directive. The lattice-runtime path inherits Marp's native parsing.
 * The lattice-emulator path implements its own front-matter reader, so
 * this test pins the behaviour: every slide's <section> must carry the
 * deck-wide class, and per-slide directives must compose (append) with
 * it rather than replace it.
 *
 * Renders the fixture through the emulator and inspects the HTML
 * sidecar (avoids parsing PDF). Slow tier because the emulator always
 * runs the Chromium PDF stage as part of its pipeline.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const { spawnSync } = require('child_process');

const ROOT     = path.join(__dirname, '..', '..');
const EMULATOR = path.join(ROOT, 'lattice-emulator.js');
const FIXTURE  = path.join(ROOT, 'test', 'fixtures', 'deck-class-fm.md');

const TIMEOUT = 60000;

test('emulator: front-matter `class:` is applied to every slide and composes with `_class:`', { timeout: TIMEOUT }, () => {
  const dir  = fs.mkdtempSync(path.join(os.tmpdir(), 'lattice-classfm-'));
  const pdf  = path.join(dir, 'deck.pdf');
  const html = path.join(dir, 'deck.html');
  try {
    const r = spawnSync(
      process.execPath,
      [EMULATOR, FIXTURE, pdf, '--quiet'],
      { cwd: ROOT, encoding: 'utf8', timeout: TIMEOUT },
    );
    assert.equal(r.status, 0, `emulator failed: ${r.stderr}`);

    const sidecar = fs.readFileSync(html, 'utf8');
    const sections = [...sidecar.matchAll(/<section[^>]*\bid="(\d+)"[^>]*\bclass="([^"]*)"/g)]
      .map(m => ({ id: m[1], cls: m[2].split(/\s+/).filter(Boolean) }));

    assert.equal(sections.length, 3, 'expected 3 sections');

    // Every slide must carry the deck-wide `dark` class.
    for (const s of sections) {
      assert.ok(s.cls.includes('dark'), `slide ${s.id} missing 'dark' from front-matter; got class="${s.cls.join(' ')}"`);
    }

    // Slide 2 must also carry its per-slide `title` class (compose, don't replace).
    const slide2 = sections.find(s => s.id === '2');
    assert.ok(slide2.cls.includes('title'), `slide 2 missing per-slide 'title'; got class="${slide2.cls.join(' ')}"`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
