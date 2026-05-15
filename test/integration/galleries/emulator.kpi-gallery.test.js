/**
 * Integration: rebuild kpi-gallery.md through the lattice emulator and
 * assert the produced PDF matches the expected page count.
 *
 * Slow (~10s on cache miss; instant on hit). Lives under
 * test/integration so it doesn't run on the unit-test inner loop.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const { runEmulator } = require('../../helpers/render');
const { pageCount }   = require('../../helpers/pdf');
const expected = require('../../fixtures/expected-page-counts.json');

test('emulator: kpi-gallery.md builds and produces expected page count', { timeout: 180000 }, () => {
  const pdf = runEmulator('kpi-gallery.md');
  assert.equal(pageCount(pdf), expected['kpi-gallery'], 'kpi-gallery.md page count drifted');
});
