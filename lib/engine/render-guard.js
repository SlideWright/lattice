/**
 * lib/engine/render-guard — fail-fast guard for headless-Chrome render calls.
 *
 * When Chrome's renderer or GPU process crashes mid-render, the CDP calls the
 * emulator awaits (`page.goto` / `page.evaluate` / `page.pdf`) can be left
 * waiting on a protocol response that never arrives. The export then HANGS to
 * the outer CI timeout instead of failing fast — turning a transient,
 * environmental Chrome crash into a multi-minute stall that masks the real
 * signal. See issue #502.
 *
 * `guard()` races each such call against:
 *   1. the browser's `disconnected` event (a crash / close → reject in ms), and
 *   2. a watchdog timer (a silent wedge that never emits `disconnected`),
 * so a wedged render rejects in seconds with a clear, classifiable error that
 * the caller can act on (one hardened retry, then a loud non-zero exit).
 *
 * Pure + dependency-free (no puppeteer, no fs) so it unit-tests in isolation
 * against fake page/browser doubles — HARD RULE #1 (shared kernel) + #7 style.
 */

// puppeteer/CDP error messages that mean "the target or browser went away".
// These should fail fast AND trigger the hardened retry (swiftshader GPU-process
// crashes surface as "Target closed"); they are not ordinary render errors.
// A renderer crash can also surface as "Target crashed" / "Page crashed!" or, on
// an in-flight `page.evaluate`, "Execution context was destroyed" — all included
// so a crash that DOESN'T emit `disconnected` still routes to the hardened retry.
// "Navigation timeout … exceeded" is deliberately NOT matched (that's a slow
// page, an author/asset problem, not a crash).
const TARGET_GONE_RE =
  /Target closed|Target crashed|Page crashed|Protocol error|Session closed|Connection closed|browser has disconnected|Navigation failed because|Execution context was destroyed/i;

/** True when `err` looks like a Chrome target/browser disconnect (vs. a real
 *  layout/eval error the deck author must fix). */
function isTargetGone(err) {
  if (!err) return false;
  if (err.wedged) return true;
  return TARGET_GONE_RE.test(err.message || String(err));
}

/** A per-call watchdog fired before the outer CI timeout — a wedge with no
 *  `disconnected` event. `wedged` marks it retry-eligible. */
class RenderTimeoutError extends Error {
  constructor(label, ms) {
    super(`render watchdog: "${label}" exceeded ${ms}ms — Chrome appears wedged`);
    this.name = 'RenderTimeoutError';
    this.wedged = true;
  }
}

/** Chrome disconnected (crashed / closed) while a call was in flight. */
class BrowserGoneError extends Error {
  constructor(label) {
    super(`render aborted: Chrome disconnected during "${label}" (Target closed)`);
    this.name = 'BrowserGoneError';
    this.wedged = true;
  }
}

// Detach an EventEmitter listener regardless of which removal alias the object
// exposes (puppeteer's Browser has both; doubles may have only one).
function removeListener(emitter, event, handler) {
  if (!emitter || !handler) return;
  const off = emitter.off || emitter.removeListener;
  if (typeof off === 'function') off.call(emitter, event, handler);
}

/**
 * Race a single render call against a disconnect event and a watchdog.
 *
 *   browser  a puppeteer Browser (anything with .on/.off('disconnected')), or
 *            `null` to skip the disconnect race (e.g. when guarding `launch()`
 *            or `close()` themselves — there is no browser to listen on yet).
 *   op       () => Promise — the puppeteer call to guard.
 *   label    human label used in the error message.
 *   ms       watchdog timeout in milliseconds.
 *
 * Resolves/rejects with `op()`'s settlement; rejects early with
 * BrowserGoneError on disconnect or RenderTimeoutError on the watchdog.
 * Always clears the timer and detaches the listener so nothing leaks.
 */
function guard(browser, op, label, ms) {
  let timer = null;
  let onDisconnect = null;
  const cleanup = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (browser && onDisconnect) removeListener(browser, 'disconnected', onDisconnect);
  };

  // The timer is ALWAYS cleared by `cleanup` when the race settles (op resolved,
  // disconnect, or the watchdog itself), so it can never outlive the call — no
  // `unref` needed (and unref'ing would stop it firing when it is the only thing
  // keeping the loop alive, e.g. under the unit harness).
  const watchdog = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new RenderTimeoutError(label, ms)), ms);
  });

  const disconnect = new Promise((_resolve, reject) => {
    if (!browser || typeof browser.on !== 'function') return; // never settles → inert
    onDisconnect = () => reject(new BrowserGoneError(label));
    browser.on('disconnected', onDisconnect);
  });

  // `Promise.resolve().then(op)` turns a synchronous throw inside op into a
  // rejection so it joins the race instead of escaping it.
  return Promise.race([Promise.resolve().then(op), watchdog, disconnect]).finally(cleanup);
}

module.exports = {
  guard,
  isTargetGone,
  removeListener,
  RenderTimeoutError,
  BrowserGoneError,
  TARGET_GONE_RE,
};
