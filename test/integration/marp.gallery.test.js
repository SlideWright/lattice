/**
 * Integration: rebuild gallery.md through marp-cli and assert the
 * produced PDF matches the expected page count.
 *
 * marp-cli is the canonical renderer that lattice-emulator.js
 * emulates. The two paths must agree on slide count or the emulator
 * has drifted.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const { runMarp }   = require('../helpers/render');
const { pageCount } = require('../helpers/pdf');
const expected = require('../fixtures/expected-page-counts.json');

test('marp-cli: gallery.md builds and produces expected page count',
  { timeout: 180000 },
  () => {
    const pdf = runMarp('gallery.md');
    try {
      assert.equal(pageCount(pdf), expected.gallery,
        'marp-cli gallery.md page count drifted from the contract');
    } finally {
      if (fs.existsSync(pdf)) fs.unlinkSync(pdf);
    }
  });
