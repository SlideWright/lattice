/**
 * Unit: autoToPrune — the retention policy for AI auto-checkpoints. The store's
 * IndexedDB plumbing can't run headless, but the rule that keeps History tidy MUST
 * be correct (it deletes revisions): keep every MANUAL checkpoint, cap AUTO ones to
 * the most recent N. Pure → verified here; the IDB read/write is device-checked.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  return import('../../../docs/src/playground/drawing-board-store.js');
}

describe('autoToPrune', () => {
  test('caps auto checkpoints to the most recent N, dropping the oldest', async () => {
    const { autoToPrune } = await load();
    const revs = Array.from({ length: 40 }, (_, i) => ({ id: i, auto: true, createdAt: i }));
    const ids = autoToPrune(revs, 30);
    assert.equal(ids.length, 10); // 40 − 30
    assert.deepEqual(ids.slice().sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); // the oldest
  });

  test('never prunes manual checkpoints, and ignores them in the cap math', async () => {
    const { autoToPrune } = await load();
    const revs = [
      { id: 'a', auto: true, createdAt: 1 },
      { id: 'b', auto: true, createdAt: 2 },
      { id: 'm', auto: false, createdAt: 3 }, // manual — sacred
    ];
    assert.deepEqual(autoToPrune(revs, 1), ['a']); // only the oldest AUTO; manual untouched
    assert.ok(!autoToPrune(revs, 0).includes('m'));
  });

  test('no-op under the cap and on empty/missing input', async () => {
    const { autoToPrune } = await load();
    assert.deepEqual(autoToPrune([{ id: 1, auto: true, createdAt: 1 }], 30), []);
    assert.deepEqual(autoToPrune([], 30), []);
    assert.deepEqual(autoToPrune(null), []);
  });
});
