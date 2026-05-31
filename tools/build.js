#!/usr/bin/env node
/**
 * The Lattice build orchestrator — one entry point that produces every
 * canonical generated artifact, in dependency order, behind a single
 * collision gate.
 *
 * Before this script the build was a loose bag of npm scripts
 * (css:build, runtime:build, snippets:build, docs:components,
 * docs:portal), each invoked by hand and each with its own --check
 * twin. Nothing ran them together or in a guaranteed order, and nothing
 * proved the separately-built single-canonical files didn't clobber each
 * other. `npm run build` now does both: it runs the ownership guard
 * first (fail fast), then regenerates every artifact.
 *
 * Steps (in order):
 *   0. ownership guard        tools/check-ownership.js   (gate — no output)
 *   1. lattice.css            tools/build-css.js
 *   2. lattice-default.css    tools/build-default-bundle.js  (engine + default palette)
 *   3. lattice-runtime.js     tools/build-runtime.js
 *   4. VS Code snippets       tools/build-snippets.js
 *   5. per-component docs      tools/build-component-docs.js
 *   6. canonical doc portal    tools/build-docs-portal.js
 *   7. landing tokens          tools/build-landing-tokens.js  (docs site palette CSS)
 *   8. playground bundle       tools/build-playground.js      (docs site browser engine)
 *
 * Gallery PDFs are NOT part of this build: they need Chromium, take tens
 * of seconds, and are regression artifacts rather than shipped source.
 * Build them explicitly with `npm run build:galleries` /
 * `build:bucket-galleries`.
 *
 * Usage:
 *   node tools/build.js            # regenerate every artifact
 *   node tools/build.js --check    # verify nothing is stale (CI gate);
 *                                  # exits 1 if any artifact would change
 *
 * Exit codes:
 *   0  success (or --check: everything up to date)
 *   1  a step failed, or (--check) an artifact is stale / a collision
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// Each step names its generator script and whether it accepts --check.
// The guard runs first and has no build/check distinction (it only
// reads), so it is always invoked plain.
const GUARD = { label: 'ownership guard', script: 'check-ownership.js' };

const STEPS = [
  { label: 'categorical tiers (themes/*.css)', script: 'build-categorical.js' },
  { label: 'chart palette (themes/*.css)', script: 'build-chart-palette.js' },
  { label: 'lattice.css', script: 'build-css.js' },
  { label: 'lattice-default.css', script: 'build-default-bundle.js' },
  { label: 'lattice-runtime.js', script: 'build-runtime.js' },
  { label: 'VS Code snippets', script: 'build-snippets.js' },
  { label: 'per-component docs', script: 'build-component-docs.js' },
  { label: 'doc portal (components.md/.html)', script: 'build-docs-portal.js' },
  { label: 'landing tokens (docs site)', script: 'build-landing-tokens.js' },
  { label: 'playground bundle (docs site)', script: 'build-playground.js' },
];

function runStep(step, check) {
  const args = [path.join(__dirname, step.script)];
  if (check) args.push('--check');
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  return r.status === 0;
}

function main(argv) {
  const check = argv.includes('--check');
  const mode = check ? 'check' : 'build';
  process.stdout.write(`Lattice ${mode}: ${STEPS.length} artifacts behind the ownership gate.\n\n`);

  // Gate first — a collision fails before anything is (re)generated.
  process.stdout.write(`▸ ${GUARD.label}\n`);
  if (!runStep(GUARD, false)) {
    process.stderr.write('\nbuild aborted: ownership guard failed.\n');
    return 1;
  }

  const failed = [];
  for (const step of STEPS) {
    process.stdout.write(`\n▸ ${step.label}\n`);
    if (!runStep(step, check)) failed.push(step.label);
  }

  process.stdout.write('\n');
  if (failed.length) {
    if (check) {
      process.stderr.write(
        `build:check FAILED — stale: ${failed.join(', ')}. Run \`npm run build\` and commit.\n`,
      );
    } else {
      process.stderr.write(`build FAILED — ${failed.join(', ')}.\n`);
    }
    return 1;
  }
  process.stdout.write(check ? 'build:check OK — all artifacts up to date.\n' : 'build OK — all artifacts regenerated.\n');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { STEPS, GUARD };
