/**
 * Unit: the Drawing Board settings module's persisted readers.
 *
 * The DOM (the settings panel itself) is verified headless. Here we prove the pure
 * persistence helper the chat feeds and the strip reads — the per-Lattice spend
 * tally — with in-memory localStorage/sessionStorage stubs (the module's reads are
 * guarded, so it loads in Node; we only need the globals when exercising spend).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

function memStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('per-Lattice spend tally (recordSpend / readSpend)', () => {
  test('accumulates session + all-time from usage.cost; ignores junk/non-positive', async () => {
    global.localStorage = memStore();
    global.sessionStorage = memStore();
    const { recordSpend, readSpend } = await import('../../../docs/src/playground/drawing-board-settings.js');

    assert.deepEqual(readSpend(), { total: 0, session: 0 });

    recordSpend(0.0375); // a real reply cost
    recordSpend(0.02);
    let s = readSpend();
    assert.ok(Math.abs(s.total - 0.0575) < 1e-9, 'all-time sums');
    assert.ok(Math.abs(s.session - 0.0575) < 1e-9, 'session sums');

    // non-positive / non-numeric costs are ignored (never corrupt the tally)
    recordSpend(0);
    recordSpend(-1);
    recordSpend('nope');
    recordSpend(null);
    recordSpend(undefined);
    assert.ok(Math.abs(readSpend().total - 0.0575) < 1e-9, 'junk ignored');

    delete global.localStorage;
    delete global.sessionStorage;
  });

  test('session is independent of all-time (different stores)', async () => {
    const local = memStore();
    global.localStorage = local;
    global.sessionStorage = memStore(); // fresh "tab" — empty session
    local.setItem('lattice-db-spend-total', '5.00'); // pretend prior sessions spent $5
    const { readSpend } = await import('../../../docs/src/playground/drawing-board-settings.js');
    const s = readSpend();
    assert.equal(s.total, 5);
    assert.equal(s.session, 0, 'a new tab starts the session tally at 0');
    delete global.localStorage;
    delete global.sessionStorage;
  });
});
