/**
 * Integration: rebuild kpi-gallery.md through the lattice emulator and
 * assert the produced PDF matches the expected page count.
 *
 * Slow (~10s on cache miss; instant on hit). Lives under
 * test/integration so it doesn't run on the unit-test inner loop.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { runEmulator } = require('../../helpers/render');
const { pageCount }   = require('../../helpers/pdf');

const EXPECTED_PAGES = 13;

describe('emulator.kpi-gallery', () => {
  test('emulator: kpi-gallery.md builds and produces expected page count', { timeout: 180000 }, () => {
    const pdf = runEmulator('kpi-gallery.md');
    assert.equal(pageCount(pdf), EXPECTED_PAGES, 'kpi-gallery.md page count drifted');
  });
});
