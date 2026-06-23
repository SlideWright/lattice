/**
 * Unit: lib/engine/render-guard — the fail-fast guard for headless-Chrome
 * render calls (#502).
 *
 * The bug it fixes: when Chrome's renderer/GPU process crashes mid-render, the
 * awaited CDP call (`page.goto`/`page.evaluate`/`page.pdf`) can hang on a
 * protocol response that never arrives — stalling the export to the OUTER CI
 * timeout. `guard()` races each call against the browser's `disconnected` event
 * AND a watchdog, so a wedged Chrome rejects in milliseconds/seconds instead.
 *
 * Driven entirely against fake page/browser doubles — no puppeteer, no Chrome —
 * so it asserts the disconnect/watchdog/cleanup contract deterministically.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  guard,
  isTargetGone,
  RenderTimeoutError,
  BrowserGoneError,
} = require('../../../lib/engine/render-guard');

// A fake puppeteer Browser: an EventEmitter we can `emit('disconnected')` on.
function fakeBrowser() {
  const b = new EventEmitter();
  return b;
}

// A controllable pending promise. Used to model a CDP call that "never settles"
// (the Target-closed stall), then RELEASED after the race has already settled so
// no promise leaks to node:test's pending-promise diagnostic.
function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

describe('render-guard', () => {
  describe('guard()', () => {
    test('resolves with the op result when nothing goes wrong', async () => {
      const browser = fakeBrowser();
      const v = await guard(browser, async () => 42, 'op', 1000);
      assert.equal(v, 42);
      // Listener removed after settle — no leak.
      assert.equal(browser.listenerCount('disconnected'), 0);
    });

    test('a disconnect event rejects PROMPTLY even if the op never settles', async () => {
      const browser = fakeBrowser();
      // The op hangs — the exact "Target closed" stall #502 describes.
      const hang = deferred();
      const p = guard(browser, () => hang.promise, 'navigate', 60000);
      // Simulate Chrome crashing on the next tick.
      setImmediate(() => browser.emit('disconnected'));
      await assert.rejects(p, (e) => {
        assert.ok(e instanceof BrowserGoneError);
        assert.match(e.message, /Chrome disconnected during "navigate"/);
        assert.equal(e.wedged, true);
        return true;
      });
      assert.equal(browser.listenerCount('disconnected'), 0, 'listener detached on reject');
      hang.resolve(); // release after the race settled — no leak
    });

    test('the watchdog rejects a silent wedge (no disconnect event)', async () => {
      const browser = fakeBrowser();
      const hang = deferred();
      await assert.rejects(
        guard(browser, () => hang.promise, 'print pdf', 20),
        (e) => {
          assert.ok(e instanceof RenderTimeoutError);
          assert.match(e.message, /"print pdf" exceeded 20ms/);
          assert.equal(e.wedged, true);
          return true;
        },
      );
      assert.equal(browser.listenerCount('disconnected'), 0);
      hang.resolve();
    });

    test('a synchronous throw inside op is captured as a rejection', async () => {
      const browser = fakeBrowser();
      await assert.rejects(
        guard(browser, () => { throw new Error('boom'); }, 'op', 1000),
        /boom/,
      );
      assert.equal(browser.listenerCount('disconnected'), 0);
    });

    test('browser=null skips the disconnect race (guards launch/close)', async () => {
      // No browser to listen on yet — only the op + watchdog race.
      const v = await guard(null, async () => 'launched', 'browser launch', 1000);
      assert.equal(v, 'launched');
      const hang = deferred();
      await assert.rejects(
        guard(null, () => hang.promise, 'browser launch', 20),
        RenderTimeoutError,
      );
      hang.resolve();
    });

    test('a fast op beats the watchdog (no false timeout)', async () => {
      const browser = fakeBrowser();
      const v = await guard(browser, () => new Promise((r) => setTimeout(() => r('ok'), 5)), 'op', 1000);
      assert.equal(v, 'ok');
    });
  });

  describe('isTargetGone()', () => {
    test('classifies puppeteer/CDP disconnect messages as retry-eligible', () => {
      for (const msg of [
        'Protocol error (Runtime.callFunctionOn): Target closed',
        'Session closed. Most likely the page has been closed.',
        'Navigation failed because browser has disconnected!',
        'Connection closed',
        'Page crashed!',
        'Error: Target crashed',
        'Error: Execution context was destroyed, most likely because of a navigation.',
      ]) {
        assert.equal(isTargetGone(new Error(msg)), true, msg);
      }
    });

    test('a slow-page navigation TIMEOUT is NOT a target-gone (author/asset issue, not a crash)', () => {
      assert.equal(isTargetGone(new Error('Navigation timeout of 60000 ms exceeded')), false);
    });

    test('our own wedged errors are retry-eligible', () => {
      assert.equal(isTargetGone(new RenderTimeoutError('op', 100)), true);
      assert.equal(isTargetGone(new BrowserGoneError('op')), true);
    });

    test('an ordinary author-fixable error is NOT a target-gone (no retry)', () => {
      assert.equal(isTargetGone(new Error('Evaluation failed: ReferenceError: foo is not defined')), false);
      assert.equal(isTargetGone(null), false);
      assert.equal(isTargetGone(undefined), false);
    });
  });
});
