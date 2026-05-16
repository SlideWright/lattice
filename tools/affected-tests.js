#!/usr/bin/env node
/**
 * Map staged file paths → the npm test scripts that cover them.
 * Spawns each matching script in turn and exits non-zero on the first
 * failure. Used by the lefthook pre-commit hook for fast inner-loop
 * iteration; the full unit suite still runs in pre-push and CI.
 *
 * Safety: when a staged file isn't recognised, falls back to running
 * the full unit suite (`npm test`). Better to be slow than to miss a
 * regression.
 *
 * Usage:
 *   node tools/affected-tests.js <file>...
 *
 * Output:
 *   one line per script invoked, then the script's own output.
 */

const path = require('path');
const { spawnSync } = require('child_process');

// lib/<file>.js → scoped test script. Add new lib files here as they land.
// Note: per-component transforms now live at
// lib/components/<name>/transform.js — those are matched by the
// `lib/components/<name>/` rule below, not this table. Only files that
// remain at lib/ root after the component-folder migration belong here.
const SCRIPT_FOR_LIB = {
  'palette.js':           'test:palette',
  'resolve-palette.js':   'test:palette',
  'chart-family.js':      'test:components',
  'match-section.js':     'test:parsing',
  'slot-label-lift.js':   'test:parsing',
  'split-slides.js':      'test:parsing',
};

// Cross-cutting files: changing any of these can affect every test.
// Fall back to the full unit suite.
const FULL_SUITE_TRIGGER = new Set([
  'lattice-emulator.js',
  'lattice-runtime.js',
  'lattice.css',
  'marp.config.js',
  'mermaid-v11.min.js',
  'package.json',
  'package-lock.json',
  'biome.json',
  'jsconfig.json',
]);

// Files that are pure infrastructure and never touch test outcomes.
// Skip silently — no tests need to run for these.
function isSkippable(rel) {
  return rel.startsWith('docs/')
      || rel.startsWith('examples/')
      || rel.startsWith('.scratch/')
      || rel.startsWith('.github/')
      || rel.endsWith('.md')
      || rel.endsWith('.pdf')
      || rel === '.nvmrc'
      || rel === '.gitignore'
      || rel === 'lefthook.yml'
      || rel === '.c8rc.json'
      || rel.startsWith('tools/check-commit-msg')
      || rel.startsWith('tools/affected-tests');
}

const scripts = new Set();
let runAll = false;

for (const f of process.argv.slice(2)) {
  const rel = f.replace(/^\.\//, '');
  if (isSkippable(rel)) continue;

  if (FULL_SUITE_TRIGGER.has(rel)) { runAll = true; break; }

  // lib/components/<name>/* — component-folder migration target.
  // Manifest / styles / transform / example / README all belong to one
  // component; component-manifest + per-transform tests cover the lot.
  if (rel.startsWith('lib/components/') && !rel.endsWith('index.js')) {
    scripts.add('test:components');
    continue;
  }
  // lib/components/index.js — the loader + vocabularies. Cross-cutting.
  if (rel === 'lib/components/index.js') {
    scripts.add('test:components');
    continue;
  }

  // lib/<file>.js (top-level shared infrastructure)
  if (rel.startsWith('lib/') && rel.endsWith('.js')) {
    const script = SCRIPT_FOR_LIB[path.basename(rel)];
    if (script) scripts.add(script);
    else runAll = true;  // unknown lib file → safe default
    continue;
  }

  // lib/<file>.css — top-level shared stylesheet. Visual change, not
  // a unit-test concern; integration tier catches drift in CI.
  if (rel.startsWith('lib/') && rel.endsWith('.css')) continue;

  // test/unit/<scope>/*.test.js → run that scope
  const m = rel.match(/^test\/unit\/([^/]+)\//);
  if (m) { scripts.add(`test:${m[1]}`); continue; }

  // test/integration/* — pre-commit doesn't run integration; defer to CI
  if (rel.startsWith('test/integration/')) continue;

  // test/helpers/* or test/fixtures/* — affect multiple test files. Run all.
  if (rel.startsWith('test/')) { runAll = true; break; }

  // themes/*.css → palette tests
  if (rel.startsWith('themes/') && rel.endsWith('.css')) {
    scripts.add('test:palette');
    continue;
  }

  // tools/*.js — most are author tools, but anything imported by tests
  // would be flagged here. Conservative: full suite for unknown tool changes.
  if (rel.startsWith('tools/')) { runAll = true; break; }

  // Anything we don't recognise → safe default
  runAll = true;
  break;
}

const toRun = runAll ? ['test'] : [...scripts];

if (toRun.length === 0) {
  // No JS/test/theme changes — nothing to verify.
  process.exit(0);
}

console.log(`affected-tests: running ${toRun.join(', ')}`);

for (const script of toRun) {
  const r = spawnSync('npm', ['run', '--silent', script], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status);
}
