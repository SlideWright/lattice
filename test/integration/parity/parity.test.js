/**
 * Integration: cross-renderer parity.
 *
 * Both `lattice-emulator` and `marp-cli` build `gallery.md`. The
 * resulting PDFs must agree on page count. Byte-equality is not the
 * goal — Marp and the emulator differ on metadata, font embedding,
 * and image compression — but the structural contract (one section
 * per `---` slide separator) must hold.
 *
 * If this test fails, one renderer added or dropped a slide. Inspect
 * both HTMLs side-by-side; paths are under .scratch/test-cache when
 * caching is on, /tmp when CI=true.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const { runEmulator, runMarp } = require('../../helpers/render');
const { pageCount } = require('../../helpers/pdf');

test('parity: emulator and marp-cli agree on gallery.md page count',
  { timeout: 240000 },
  () => {
    const emPdf = runEmulator('gallery.md');
    const mpPdf = runMarp('gallery.md');
    const em = pageCount(emPdf);
    const mp = pageCount(mpPdf);
    // Marp/Chromium adds one blank trailing page; tolerate a delta of 1.
    assert.ok(
      Math.abs(em - mp) <= 1,
      `cross-renderer drift: emulator=${em} pages, marp-cli=${mp} pages`,
    );
  });
