// Golden before/after — what visually changed in THIS PR's committed goldens.
// Post a PR comment + before/after montage of the gallery slides whose committed golden moved vs the base branch.
//
// The regression gate (tools/regression-gate.mjs) answers the AUTHOR's question:
// "did I bless correctly?" (a fresh render == the committed golden). This tool
// answers the REVIEWER's question: "what does the intended visual change look
// like?" — by diffing the PR's committed golden PDFs against the base branch's,
// rasterizing only the slides that VISUALLY changed, and emitting a
// before │ after │ overlay montage PDF plus a markdown summary CI posts as a PR
// comment.
//
// WHY pixel-diff and not the git diff alone: committed gallery PDFs are NOT
// byte-reproducible (timestamps, font-subset ordering churn every rebuild), so a
// re-bless with no visual change still shows up in `git diff`. We use the git
// diff only as the cheap candidate filter, then rasterize and pixel-diff (the
// same comparator + tolerance the gate uses) so the report counts only slides
// that actually moved. A rebuild-only golden → 0 changed slides → "no visual
// change". See engineering/decisions/2026-06-12-p4-regression-gate-retire-marp.md §4.
//
// Usage:
//   node tools/golden-diff.mjs [--base <ref>] [--json]
//     --base   git ref/sha to diff against (default: origin/main)
//
// Output (under .scratch/golden-diff/):
//   changes.pdf   — combined before│after│overlay montage (CI artifact); only
//                   written when ≥1 slide changed
//   summary.md    — markdown comment body (always written)
//   report.json   — { changed, slides, galleries, … } (always written)
//
// Exit 0 always — this is informational and never gates (the regression gate is
// the blocker). A git/tool failure exits 2 so CI surfaces a broken run.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { pixelDiff, montageTriptych, pngsToPdf } = require('./pixel-check.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.scratch', 'golden-diff');

// Mirror the regression gate's tolerance so "what changed" agrees with "what the
// gate would catch": a page counts as changed only if its over-fuzz pixel count
// exceeds FAIL_FRACTION of the page (AA shimmer from rasterization is not drift).
const FUZZ = '3%';
const FAIL_FRACTION = 0.0005;

// A committed golden: lib/components/**/<name>.gallery.{light,dark}.pdf.
const GOLDEN_RE = /\.gallery\.(light|dark)\.pdf$/;

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// Candidate goldens this PR touched at all (byte-level git diff — the cheap
// filter; visual truth comes from the pixel-diff below).
function changedGoldens(base) {
  let raw;
  try {
    raw = git(['diff', '--name-only', base, '--', 'lib/components']);
  } catch (err) {
    process.stderr.write(`golden-diff: git diff against "${base}" failed: ${err.message}\n`);
    process.exit(2);
  }
  return raw.split('\n').map((s) => s.trim()).filter((p) => GOLDEN_RE.test(p)).sort();
}

// Write the base-branch blob of a path to a temp file; null if it didn't exist
// on base (a newly-added golden).
function baseBlob(base, relPath, tmp) {
  try {
    const buf = execFileSync('git', ['show', `${base}:${relPath}`], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
    writeFileSync(tmp, buf);
    return tmp;
  } catch {
    return null; // added on this branch — no base version
  }
}

// Pretty name + mood from a golden path: …/<name>.gallery.<mood>.pdf
function describe(relPath) {
  const m = relPath.match(/([^/]+)\.gallery\.(light|dark)\.pdf$/);
  return { name: m ? m[1] : relPath, mood: m ? m[2] : '?' };
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const baseIdx = args.indexOf('--base');
  const base = baseIdx >= 0 ? args[baseIdx + 1] : 'origin/main';

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const candidates = changedGoldens(base);
  const entries = []; // { name, mood, relPath, status, slides, montages: [png] }
  const montagePngs = [];

  for (const relPath of candidates) {
    const { name, mood } = describe(relPath);
    const headPath = join(ROOT, relPath);
    const tmpBase = join(OUT, `.base-${name}.${mood}.pdf`);
    const base0 = baseBlob(base, relPath, tmpBase);

    if (!existsSync(headPath)) {
      entries.push({ name, mood, relPath, status: 'removed', slides: 0 });
      if (base0) rmSync(base0, { force: true });
      continue;
    }
    if (!base0) {
      entries.push({ name, mood, relPath, status: 'added', slides: 0 });
      continue;
    }

    const diff = pixelDiff(base0, headPath, `golden-${name}-${mood}`, { fuzz: FUZZ });
    rmSync(base0, { force: true });
    const drifted = diff.perPage.filter(
      (p) => p.pixels === -1 || (p.total ? p.pixels / p.total > FAIL_FRACTION : p.pixels > 0),
    );
    if (!drifted.length) {
      entries.push({ name, mood, relPath, status: 'rebuild-only', slides: 0 });
      continue;
    }
    // Montage each changed slide. montageTriptych returns null when a tile is
    // missing, so the page-add/remove sentinels (one of old/new is null) are
    // skipped automatically; a page-RESIZE sentinel keeps both tiles and IS
    // montaged on purpose (a geometry change is a real visual diff to show).
    for (const d of drifted) {
      const m = join(diff.tmpDir, `gd-${name}-${mood}-${String(d.page).padStart(3, '0')}.png`);
      const made = montageTriptych(d, m, { title: `${name} · ${mood} · slide ${d.page}` });
      if (made) montagePngs.push(made);
    }
    entries.push({ name, mood, relPath, status: 'changed', slides: drifted.length });
  }

  const changedEntries = entries.filter((e) => e.status === 'changed');
  const totalSlides = changedEntries.reduce((n, e) => n + e.slides, 0);
  const added = entries.filter((e) => e.status === 'added');
  const removed = entries.filter((e) => e.status === 'removed');
  const changed = changedEntries.length > 0 || added.length > 0 || removed.length > 0;

  let artifact = null;
  if (montagePngs.length) artifact = pngsToPdf(montagePngs, join(OUT, 'changes.pdf'));

  // ── summary.md (the PR comment body) ────────────────────────────────────────
  const lines = ['### 🖼️ Golden before/after vs base', ''];
  if (!changed) {
    lines.push('✅ **No visual changes** to committed goldens on this branch.');
  } else {
    if (changedEntries.length) {
      lines.push(`**${totalSlides} slide${totalSlides === 1 ? '' : 's'} changed** across ${changedEntries.length} gallery·mood${changedEntries.length === 1 ? '' : 's'}.`, '');
      lines.push('| Gallery | Mood | Slides changed |', '|---|---|---|');
      for (const e of changedEntries.sort((a, b) => b.slides - a.slides || a.name.localeCompare(b.name))) {
        lines.push(`| \`${e.name}\` | ${e.mood} | ${e.slides} |`);
      }
      lines.push('');
      lines.push(artifact
        ? '↪ Flip through the full **before │ after │ overlay** montage in the **`golden-diff-changes`** artifact below.'
        : '_(montage artifact unavailable — ImageMagick `montage`/`convert` missing on the runner.)_');
    }
    if (added.length) lines.push('', `🆕 New goldens (no base to compare): ${added.map((e) => `\`${e.name}.${e.mood}\``).join(', ')}.`);
    if (removed.length) lines.push('', `🗑️ Removed goldens: ${removed.map((e) => `\`${e.name}.${e.mood}\``).join(', ')}.`);
    lines.push('', '_Rebuild-only goldens (PDF byte-churn, no pixels moved) are not listed — the pixel-diff filters them out._');
  }
  const summary = lines.join('\n') + '\n';
  writeFileSync(join(OUT, 'summary.md'), summary);

  const report = { base, changed, totalSlides, galleries: entries, artifact: artifact ? 'changes.pdf' : null };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(summary);
    if (artifact) process.stdout.write(`\nmontage: ${join('.scratch', 'golden-diff', 'changes.pdf')}\n`);
  }
  return 0;
}

process.exit(main());
