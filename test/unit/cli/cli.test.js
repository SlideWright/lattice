/**
 * Unit: CLI behavior for the project's command-line tools.
 *
 * Tests --help / --version, friendly error paths, and exit codes by
 * spawning each tool as a subprocess and asserting on exit code,
 * stdout, and stderr. No Chromium / no Marp pipeline runs — these
 * exit before any heavy work, so the suite stays in the "<100 ms
 * inner loop" budget for the unit tier.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('path');
const { spawnSync } = require('child_process');

describe('cli', () => {
  const ROOT = path.join(__dirname, '..', '..', '..');
  const EMULATOR = path.join(ROOT, 'lattice-emulator.js');
  const SCREENSHOT = path.join(ROOT, 'tools', 'screenshot-slides.js');

  function run(script, args = [], { env = {} } = {}) {
    return spawnSync(process.execPath, [script, ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...env },
      timeout: 10000,
    });
  }

  // ── lattice-emulator ──────────────────────────────────────────────────────

  test('emulator: --help exits 0 with usage on stdout', () => {
    const r = run(EMULATOR, ['--help']);
    assert.equal(r.status, 0, `expected 0, got ${r.status}; stderr: ${r.stderr}`);
    assert.match(r.stdout, /USAGE/);
    assert.match(r.stdout, /lattice-emulator/);
    assert.match(r.stdout, /EXIT CODES/);
  });

  test('emulator: -h is a synonym for --help', () => {
    const r = run(EMULATOR, ['-h']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /USAGE/);
  });

  test('emulator: --version exits 0 with version string', () => {
    const r = run(EMULATOR, ['--version']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /^lattice-emulator \d+\.\d+\.\d+/);
  });

  test('emulator: -v is a synonym for --version', () => {
    const r = run(EMULATOR, ['-v']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /^lattice-emulator \d/);
  });

  test('emulator: no args exits 1 with usage on stderr', () => {
    const r = run(EMULATOR);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Usage/);
    assert.equal(r.stdout, '');
  });

  test('emulator: unknown flag exits 1 with friendly error', () => {
    const r = run(EMULATOR, ['--bogus', 'deck.md', 'out.pdf']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unknown option: --bogus/);
    assert.doesNotMatch(r.stderr, /at .+\.js:\d+/, 'stderr should not contain a stack trace');
  });

  test('emulator: --palette without value exits 1', () => {
    const r = run(EMULATOR, ['deck.md', 'out.pdf', '--palette']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /--palette requires a value/);
  });

  test('emulator: missing source.md exits 1 with friendly message (no stack trace)', () => {
    const r = run(EMULATOR, ['does-not-exist.md', 'out.pdf']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /source markdown not found/);
    assert.doesNotMatch(r.stderr, /at .+\.js:\d+/);
  });

  test('emulator: missing custom CSS exits 1 with friendly message', () => {
    const r = run(EMULATOR, ['examples/gallery.md', 'does-not-exist.css', 'out.pdf']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /layout CSS not found/);
  });

  test('emulator: bad palette exits 1 and lists available palettes', () => {
    const r = run(EMULATOR, ['examples/gallery.md', 'out.pdf', 'nonesuch']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /palette not found: nonesuch/);
    assert.match(r.stderr, /available palettes:.*indaco/);
  });

  // ── screenshot-slides ─────────────────────────────────────────────────────

  test('screenshot: --help exits 0 with usage on stdout', () => {
    const r = run(SCREENSHOT, ['--help']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /USAGE/);
    assert.match(r.stdout, /SELECTOR FORMS/);
    assert.match(r.stdout, /EXIT CODES/);
  });

  test('screenshot: -h is a synonym for --help', () => {
    const r = run(SCREENSHOT, ['-h']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /USAGE/);
  });

  test('screenshot: --version exits 0 with version string', () => {
    const r = run(SCREENSHOT, ['--version']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /^screenshot-slides \d+\.\d+\.\d+/);
  });

  test('screenshot: missing HTML exits 1 with friendly message', () => {
    const r = run(SCREENSHOT, ['does-not-exist.html']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /HTML not found/);
    assert.doesNotMatch(r.stderr, /at .+\.js:\d+/);
  });

  test('screenshot: bad scale exits 1 with explanation', () => {
    const r = run(SCREENSHOT, ['--scale', 'abc']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /scale must be a number ≥ 1/);
  });

  test('screenshot: unknown flag exits 1', () => {
    const r = run(SCREENSHOT, ['--bogus']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unknown option: --bogus/);
  });

  test('screenshot: --selector without value exits 1', () => {
    const r = run(SCREENSHOT, ['--selector']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /--selector requires a value/);
  });
});
