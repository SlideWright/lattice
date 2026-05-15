/**
 * Integration: rebuild gallery.md through the lattice emulator and
 * assert the produced PDF matches the expected page count.
 *
 * Slow (~15s). Lives under test/integration so it doesn't run on the
 * unit-test inner loop.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const _path   = require('path');
const fs     = require('fs');
const { runEmulator } = require('../../helpers/render');
const { pageCount }   = require('../../helpers/pdf');
const expected = require('../../fixtures/expected-page-counts.json');

test('emulator: gallery.md builds and produces expected page count', { timeout: 180000 }, () => {
  const pdf = runEmulator('gallery.md');
  try {
    assert.equal(pageCount(pdf), expected.gallery, 'gallery.md page count drifted');
  } finally {
    if (fs.existsSync(pdf)) fs.unlinkSync(pdf);
  }
});
