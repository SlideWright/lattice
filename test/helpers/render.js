/**
 * Render helpers: spawn the emulator and marp-cli, return paths to
 * built artifacts. Used by integration tests.
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');
const { execFileSync } = require('child_process');

const ROOT     = path.join(__dirname, '..', '..');
const EXAMPLES = path.join(ROOT, 'examples');
const THEME    = path.join(ROOT, 'lattice.css');
const EMULATOR = path.join(ROOT, 'lattice.js'); // renamed in Phase 4

function tmpFile(suffix) {
  return path.join(os.tmpdir(), `lattice-test-${process.pid}-${Date.now()}${suffix}`);
}

function runEmulator(mdFile, { palette = 'indaco', timeout = 600000 } = {}) {
  const out = tmpFile('.pdf');
  execFileSync(
    process.execPath,
    [EMULATOR, path.join(EXAMPLES, mdFile), THEME, out, palette],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], timeout },
  );
  if (!fs.existsSync(out) || fs.statSync(out).size < 10000) {
    throw new Error(`Emulator produced empty/missing PDF: ${out}`);
  }
  return out;
}

function runMarp(mdFile, { timeout = 600000 } = {}) {
  const out = tmpFile('.pdf');
  execFileSync(
    'npx',
    ['--no-install', 'marp', '--config', path.join(ROOT, 'marp.config.js'),
     '--theme-set', THEME, '--allow-local-files',
     '--pdf', '-o', out, path.join(EXAMPLES, mdFile)],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], timeout, env: { ...process.env } },
  );
  if (!fs.existsSync(out) || fs.statSync(out).size < 10000) {
    throw new Error(`marp-cli produced empty/missing PDF: ${out}`);
  }
  return out;
}

module.exports = { ROOT, EXAMPLES, THEME, EMULATOR, runEmulator, runMarp, tmpFile };
