#!/usr/bin/env node
/**
 * Release orchestrator — the deterministic, changelog-driven release.
 *
 * Run locally or from .github/workflows/release.yml (manual dispatch). It
 * keeps ALL release logic here so CI is a thin trigger and the same flow is
 * reproducible on a laptop.
 *
 * Sequence (real run):
 *   1. Require a clean tree (a release is cut from committed state).
 *   2. Gate on build:check (no stale / colliding dist/).
 *   3. Read the bump level — `auto` derives it from CHANGELOG `## Unreleased`
 *      (tools/changelog.js); an explicit patch|minor|major overrides.
 *   4. Compute the next version from package.json.
 *   5. Capture the Unreleased body → release/notes-v<version>.md (the GitHub
 *      Release body).
 *   6. `npm version <next> --no-git-tag-version` (updates package.json + lock).
 *   7. Roll the changelog: `## Unreleased` → `## <version> - <date>`, fresh
 *      empty Unreleased seeded above it.
 *   8. `npm run build` — regenerate dist/ (the emulator bundle inlines
 *      package.json, so the version bump restales it).
 *   9. Commit `release: v<version>` (hooks run — dist is fresh), tag it.
 *  10. Build the release zip from the tagged commit.
 *  11. With --push: push the branch + tag.
 *
 * Flags:
 *   --bump=auto|patch|minor|major   default auto (read from the changelog)
 *   --dry-run                       print the plan; change nothing. Safe on a
 *                                   dirty tree.
 *   --push                          push the release commit + tag to origin
 *   --skip-checks                   skip the build:check gate (CI ran it)
 */

const { spawnSync, execFileSync } = require('node:child_process');
const fs   = require('node:fs');
const path = require('node:path');
const cl   = require('./changelog.js');

const ROOT          = path.resolve(__dirname, '..');
const PKG_PATH      = path.join(ROOT, 'package.json');
const CHANGELOG     = path.join(ROOT, 'CHANGELOG.md');
const RELEASE_DIR   = path.join(ROOT, 'release');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const eq = hit.indexOf('=');
  return eq === -1 ? true : hit.slice(eq + 1);
}
const DRY        = process.argv.includes('--dry-run');
const PUSH       = process.argv.includes('--push');
const SKIP_CHECK = process.argv.includes('--skip-checks');
const BUMP_ARG   = String(arg('bump', 'auto'));

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', ...opts }).trim();
}
function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\nrelease aborted: \`${cmd} ${args.join(' ')}\` exited ${r.status}.`);
    process.exit(1);
  }
}

function main() {
  // Must be a git repo.
  try { git(['rev-parse', '--is-inside-work-tree'], { stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (_e) { console.error('error: not a git repository.'); process.exit(1); }

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const current = pkg.version;
  const md = fs.readFileSync(CHANGELOG, 'utf8');
  const section = cl.extractUnreleased(md);
  if (!section) { console.error('error: no ## Unreleased section in CHANGELOG.md'); process.exit(1); }

  // Resolve bump level (deterministic from the changelog, or explicit).
  let level;
  if (BUMP_ARG === 'auto') {
    try { level = cl.computeBump(section.body); }
    catch (e) { console.error(`error: ${e.message}`); process.exit(1); }
  } else if (['patch', 'minor', 'major'].includes(BUMP_ARG)) {
    // An override still needs notes, so the section must have content.
    try { cl.computeBump(section.body); }
    catch (e) { console.error(`error: ${e.message}`); process.exit(1); }
    level = BUMP_ARG;
  } else {
    console.error(`error: --bump must be auto|patch|minor|major (got "${BUMP_ARG}")`);
    process.exit(1);
  }

  const next = cl.nextVersion(current, level);
  const date = new Date().toISOString().slice(0, 10);
  const notes = cl.releaseNotes(section.body);

  console.log(`Release plan:`);
  console.log(`  bump:    ${level}${BUMP_ARG === 'auto' ? ' (from CHANGELOG ## Unreleased)' : ' (override)'}`);
  console.log(`  version: ${current} → ${next}`);
  console.log(`  date:    ${date}`);
  console.log(`  notes:   ${notes.split('\n').length} lines from ## Unreleased\n`);

  if (DRY) {
    console.log('--- release notes preview ---');
    console.log(notes.trimEnd());
    console.log('\n[dry-run] no files changed, no tag created.');
    return;
  }

  // Real run from here — require a clean tree and a fresh dist.
  if (git(['status', '--porcelain'])) {
    console.error('error: working tree is dirty. Commit or stash before releasing.');
    process.exit(1);
  }
  if (!SKIP_CHECK) run(process.execPath, [path.join(ROOT, 'tools', 'build.js'), '--check']);

  // Capture notes before rolling the changelog.
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const notesFile = path.join(RELEASE_DIR, `notes-v${next}.md`);
  fs.writeFileSync(notesFile, notes);

  // Bump version, roll changelog, rebuild dist.
  run('npm', ['version', next, '--no-git-tag-version']);
  fs.writeFileSync(CHANGELOG, cl.rollUnreleased(fs.readFileSync(CHANGELOG, 'utf8'), next, date));
  run('npm', ['run', 'build']);

  // Commit + tag (hooks run; dist is fresh so freshness gates pass).
  git(['add', 'package.json', 'package-lock.json', 'CHANGELOG.md', 'dist']);
  run('git', ['commit', '-m', `release: v${next}`]);
  run('git', ['tag', `v${next}`]);

  // Package the showcase zip from the tagged commit.
  run(process.execPath, [path.join(ROOT, 'tools', 'build-release-zip.js')]);

  if (PUSH) {
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    run('git', ['push', '--follow-tags', 'origin', branch]);
  }

  console.log(`\nReleased v${next}.`);
  console.log(`  tag:   v${next}${PUSH ? ' (pushed)' : ' (local — run with --push or push manually)'}`);
  console.log(`  notes: ${path.relative(ROOT, notesFile)}`);
  console.log(`  zip:   release/lattice-v${next}.zip`);
}

main();
