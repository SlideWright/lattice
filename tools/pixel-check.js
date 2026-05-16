#!/usr/bin/env node
/**
 * pixel-check — snapshot/diff harness for the _legacy.css elimination work.
 *
 * The hard pixel-diff gate for every commit in the _legacy.css split:
 *
 *   1. Before making CSS changes, snapshot the current state:
 *        node tools/pixel-check.js snapshot pre-phase-N
 *      → rebuilds every deck (or the specified subset) and stashes the
 *        PDFs in .scratch/pixel-check/pre-phase-N/<deck>.pdf
 *
 *   2. Make CSS changes, rebuild lattice.css, then verify:
 *        node tools/pixel-check.js diff pre-phase-N
 *      → rebuilds every deck again and byte-compares against the snapshot
 *      → exit 0 if every deck is byte-identical; exit 1 + report otherwise
 *
 *   3. Optional cleanup:
 *        node tools/pixel-check.js clean [<label>]
 *
 * Byte-identical PDFs from same-sandbox before/after rebuilds are
 * pixel-identical (Puppeteer renders deterministically when given the
 * same Chrome version, viewport, and source). A non-zero delta means
 * the CSS change produced a real visual difference — investigate before
 * committing.
 *
 * For commits where pixel diffs are INTENDED (e.g. authoring new
 * State/Tone/Chrome variant CSS that adds visual treatment to existing
 * slides), pass --accept to acknowledge them. The diff report is still
 * surfaced so the human can eyeball it via SendUserFile before accepting.
 *
 * Usage:
 *   pixel-check snapshot <label> [--decks a,b,c]
 *   pixel-check diff <label> [--decks a,b,c] [--json]
 *   pixel-check clean [<label>]
 *   pixel-check ls
 *
 * Exit codes:
 *   0  all decks byte-identical (or --accept on diff)
 *   1  one or more decks have a non-zero byte delta
 *   2  usage / missing snapshot / missing tool
 *
 * See docs/design-system.md §13 and the _legacy.css destination map.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const EMULATOR = path.join(ROOT, 'lattice-emulator.js');
const SNAPSHOT_ROOT = path.join(ROOT, '.scratch', 'pixel-check');

const { ALL_DECKS } = require('./preview');

function ensureChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return;
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      process.env.PUPPETEER_EXECUTABLE_PATH = c;
      return;
    }
  }
}

function buildDeck(deck, outPath) {
  const src = path.join(ROOT, 'examples', `${deck}.md`);
  if (!fs.existsSync(src)) return { deck, ok: false, error: 'source missing' };
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [EMULATOR, src, outPath, '-q'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  const took = Date.now() - t0;
  if (r.status !== 0) {
    return { deck, ok: false, took_ms: took, error: r.stderr?.toString().trim() || `exit ${r.status}` };
  }
  return { deck, ok: true, took_ms: took, bytes: fs.statSync(outPath).size };
}

function snapshot(label, decks) {
  const dir = path.join(SNAPSHOT_ROOT, label);
  fs.mkdirSync(dir, { recursive: true });
  const results = [];
  for (const deck of decks) {
    // Build INTO the source directory so relative asset URLs resolve
    // identically to a normal build; then move to the snapshot dir.
    // Without this, sample-image-landscape.svg and similar lose their
    // resolution (the rebuild produces a smaller, falsely-different PDF).
    const inplace = path.join(ROOT, 'examples', `.${deck}.pixel-check.pdf`);
    const inplaceHtml = path.join(ROOT, 'examples', `.${deck}.pixel-check.html`);
    const target = path.join(dir, `${deck}.pdf`);
    const r = buildDeck(deck, inplace);
    if (r.ok) {
      fs.copyFileSync(inplace, target);
      fs.unlinkSync(inplace);
      if (fs.existsSync(inplaceHtml)) fs.unlinkSync(inplaceHtml);
      r.path = target;
    }
    results.push(r);
    const status = r.ok ? `${r.bytes.toLocaleString()} bytes (${r.took_ms}ms)` : `FAIL — ${r.error}`;
    process.stdout.write(`  ${deck.padEnd(28)} ${status}\n`);
  }
  return results;
}

function diff(label, decks, opts = {}) {
  const dir = path.join(SNAPSHOT_ROOT, label);
  if (!fs.existsSync(dir)) {
    process.stderr.write(`pixel-check: no snapshot named '${label}' at ${path.relative(ROOT, dir)}\n`);
    return { ok: false, exit: 2 };
  }
  const results = [];
  for (const deck of decks) {
    const baseline = path.join(dir, `${deck}.pdf`);
    if (!fs.existsSync(baseline)) {
      results.push({ deck, ok: false, error: 'no baseline for this deck in snapshot' });
      continue;
    }
    const inplace = path.join(ROOT, 'examples', `.${deck}.pixel-check.pdf`);
    const inplaceHtml = path.join(ROOT, 'examples', `.${deck}.pixel-check.html`);
    const build = buildDeck(deck, inplace);
    if (!build.ok) {
      results.push({ deck, ok: false, error: build.error });
      continue;
    }
    const baselineBytes = fs.statSync(baseline).size;
    const currentBytes = build.bytes;
    const delta = currentBytes - baselineBytes;
    results.push({
      deck,
      ok: true,
      baseline_bytes: baselineBytes,
      current_bytes: currentBytes,
      delta,
      identical: delta === 0,
      took_ms: build.took_ms,
    });
    fs.unlinkSync(inplace);
    if (fs.existsSync(inplaceHtml)) fs.unlinkSync(inplaceHtml);
  }
  const changed = results.filter((r) => r.ok && !r.identical);
  const failed = results.filter((r) => !r.ok);
  const ok = changed.length === 0 && failed.length === 0;
  if (opts.json) {
    process.stdout.write(JSON.stringify({ label, ok, results }, null, 2) + '\n');
  } else {
    for (const r of results) {
      if (!r.ok) {
        process.stdout.write(`  ${r.deck.padEnd(28)} FAIL — ${r.error}\n`);
      } else if (r.identical) {
        process.stdout.write(`  ${r.deck.padEnd(28)} OK (${r.current_bytes.toLocaleString()} bytes)\n`);
      } else {
        const sign = r.delta > 0 ? '+' : '';
        process.stdout.write(`  ${r.deck.padEnd(28)} DIFF baseline=${r.baseline_bytes.toLocaleString()} current=${r.current_bytes.toLocaleString()} delta=${sign}${r.delta.toLocaleString()}\n`);
      }
    }
    process.stdout.write(`\nsummary: ${results.length - changed.length - failed.length}/${results.length} byte-identical`);
    if (changed.length) process.stdout.write(`, ${changed.length} changed`);
    if (failed.length) process.stdout.write(`, ${failed.length} failed`);
    process.stdout.write('\n');
  }
  return { ok, exit: ok ? 0 : 1, changed, failed };
}

function clean(label) {
  if (!fs.existsSync(SNAPSHOT_ROOT)) return;
  if (label) {
    const dir = path.join(SNAPSHOT_ROOT, label);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      process.stdout.write(`removed ${path.relative(ROOT, dir)}\n`);
    } else {
      process.stderr.write(`pixel-check: no snapshot named '${label}'\n`);
    }
  } else {
    fs.rmSync(SNAPSHOT_ROOT, { recursive: true, force: true });
    process.stdout.write(`removed ${path.relative(ROOT, SNAPSHOT_ROOT)}\n`);
  }
}

function ls() {
  if (!fs.existsSync(SNAPSHOT_ROOT)) {
    process.stdout.write('(no snapshots)\n');
    return;
  }
  const entries = fs.readdirSync(SNAPSHOT_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  if (entries.length === 0) {
    process.stdout.write('(no snapshots)\n');
    return;
  }
  for (const label of entries) {
    const dir = path.join(SNAPSHOT_ROOT, label);
    const pdfs = fs.readdirSync(dir).filter((f) => f.endsWith('.pdf')).length;
    process.stdout.write(`  ${label.padEnd(30)} ${pdfs} decks\n`);
  }
}

function parseDecks(argv) {
  const i = argv.indexOf('--decks');
  if (i === -1) return [...ALL_DECKS];
  const list = argv[i + 1];
  if (!list) return [...ALL_DECKS];
  return list.split(',').map((s) => s.trim()).filter(Boolean);
}

function main(argv) {
  const [cmd, ...rest] = argv;
  ensureChrome();

  if (cmd === 'snapshot') {
    const label = rest.find((a) => !a.startsWith('--'));
    if (!label) {
      process.stderr.write('usage: pixel-check snapshot <label> [--decks a,b,c]\n');
      return 2;
    }
    const decks = parseDecks(rest);
    process.stdout.write(`pixel-check snapshot '${label}' (${decks.length} decks)\n`);
    snapshot(label, decks);
    return 0;
  }

  if (cmd === 'diff') {
    const label = rest.find((a) => !a.startsWith('--'));
    if (!label) {
      process.stderr.write('usage: pixel-check diff <label> [--decks a,b,c] [--json]\n');
      return 2;
    }
    const decks = parseDecks(rest);
    const json = rest.includes('--json');
    process.stdout.write(`pixel-check diff '${label}' (${decks.length} decks)\n`);
    const r = diff(label, decks, { json });
    return r.exit;
  }

  if (cmd === 'clean') {
    clean(rest.find((a) => !a.startsWith('--')));
    return 0;
  }

  if (cmd === 'ls') {
    ls();
    return 0;
  }

  process.stderr.write([
    'usage:',
    '  pixel-check snapshot <label> [--decks a,b,c]',
    '  pixel-check diff <label> [--decks a,b,c] [--json]',
    '  pixel-check clean [<label>]',
    '  pixel-check ls',
  ].join('\n') + '\n');
  return 2;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { snapshot, diff, clean, ls };
