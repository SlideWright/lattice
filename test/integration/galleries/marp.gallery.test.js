/**
 * Integration: rebuild gallery.md through marp-cli and assert the
 * produced PDF matches the expected page count.
 *
 * Chromium's PDF printer adds one blank trailing page when certain CSS
 * layout properties cause a fractional page overhang. This is a known
 * Marp/Chromium behaviour: the emulator's expected count + 1 is the
 * expected Marp page count. The parity test captures this delta.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const { runMarp }   = require('../../helpers/render');
const { pageCount } = require('../../helpers/pdf');
const expected = require('../../fixtures/expected-page-counts.json');

test('marp-cli: gallery.md builds and produces expected page count',
  { timeout: 180000 },
  () => {
    const pdf = runMarp('gallery.md');
    try {
      // Marp/Chromium adds one blank trailing page; allow gallery ± 1.
      const actual = pageCount(pdf);
      assert.ok(
        actual === expected.gallery || actual === expected.gallery + 1,
        `marp-cli gallery.md page count drifted from the contract: expected ${expected.gallery} or ${expected.gallery + 1}, got ${actual}`,
      );
    } finally {
      if (fs.existsSync(pdf)) fs.unlinkSync(pdf);
    }
  });
