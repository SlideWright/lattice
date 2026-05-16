/**
 * Integration: rebuild mermaid-gallery.md through the lattice emulator
 * and assert the produced PDF matches the expected page count.
 *
 * Very slow on cache miss (~2 minutes — 25 mmdc cold starts via
 * Puppeteer); instant on hit. Lives under test/integration; CI runs
 * it, the inner-loop `npm test` does not.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { runEmulator } = require('../../helpers/render');
const { pageCount }   = require('../../helpers/pdf');
const expected = require('../../fixtures/expected-page-counts.json');

describe('emulator.mermaid', () => {
  test('emulator: mermaid-gallery.md builds and produces expected page count',
    { timeout: 600000 },
    () => {
      const pdf = runEmulator('mermaid-gallery.md');
      assert.equal(pageCount(pdf), expected['mermaid-gallery'],
        'mermaid-gallery.md page count drifted');
    });
});
