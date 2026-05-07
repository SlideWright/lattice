/**
 * Integration: rebuild mermaid-gallery.md through the lattice emulator
 * and assert the produced PDF matches the expected page count.
 *
 * Very slow (~2 minutes — 25 mmdc cold starts via Puppeteer). Lives
 * under test/integration; CI runs it, the inner-loop `npm test` does
 * not.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const { runEmulator } = require('../helpers/render');
const { pageCount }   = require('../helpers/pdf');
const expected = require('../fixtures/expected-page-counts.json');

test('emulator: mermaid-gallery.md builds and produces expected page count',
  { timeout: 600000 },
  () => {
    const pdf = runEmulator('mermaid-gallery.md');
    try {
      assert.equal(pageCount(pdf), expected['mermaid-gallery'],
        'mermaid-gallery.md page count drifted');
    } finally {
      if (fs.existsSync(pdf)) fs.unlinkSync(pdf);
    }
  });
