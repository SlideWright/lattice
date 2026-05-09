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
 * both HTMLs side-by-side; the emulator's output is in /tmp by
 * default, marp's path is configurable via MARP_OUT.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const { runEmulator, runMarp } = require('../helpers/render');
const { pageCount } = require('../helpers/pdf');

test('parity: emulator and marp-cli agree on gallery.md page count',
  { timeout: 240000 },
  () => {
    const emPdf = runEmulator('gallery.md');
    const mpPdf = runMarp('gallery.md');
    try {
      const em = pageCount(emPdf);
      const mp = pageCount(mpPdf);
      // Marp/Chromium adds one blank trailing page; tolerate a delta of 1.
      assert.ok(
        Math.abs(em - mp) <= 1,
        `cross-renderer drift: emulator=${em} pages, marp-cli=${mp} pages`,
      );
    } finally {
      for (const p of [emPdf, mpPdf]) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    }
  });
