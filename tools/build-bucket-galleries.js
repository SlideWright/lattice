#!/usr/bin/env node
/**
 * Build per-bucket survey gallery PDFs in light and dark themes.
 *
 * A bucket gallery is a curated walk through every component in one
 * bucket — one representative slide per component (drawn from the
 * manifest's `sample` field) plus an opening title slide that names
 * the bucket and lists its members. Output:
 *
 *   lib/components/<bucket>/<bucket>.gallery.light.pdf
 *   lib/components/<bucket>/<bucket>.gallery.dark.pdf
 *
 * For 9 buckets × 2 themes = 18 PDFs total. Generated, not hand-
 * authored: every component currently in the bucket appears,
 * regardless of when it was added. Adding a component to a bucket
 * automatically widens the next rebuild's gallery.
 *
 * See docs/notes/2026-05-18-component-reorg-and-modular-css.md (Phase 5).
 *
 * Usage:
 *   node tools/build-bucket-galleries.js                 # all buckets, both themes
 *   node tools/build-bucket-galleries.js --only chart    # one bucket
 *   node tools/build-bucket-galleries.js --theme light   # one theme
 *   node tools/build-bucket-galleries.js --check         # verify staleness
 *
 * Exit codes:
 *   0  every requested PDF built (or up-to-date in --check)
 *   1  a render failed; the PDF is missing or empty
 *   2  --only target not found
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadAll, groupByBucket, BUCKETS } = require('../lib/components');
const { injectDark, THEMES } = require('./build-galleries');

const ROOT = path.join(__dirname, '..');
const COMPONENTS_DIR = path.join(ROOT, 'lib', 'components');
const EMULATOR = path.join(ROOT, 'lattice-emulator.js');
const THEME_CSS = path.join(ROOT, 'lattice.css');

// Human-facing copy for the bucket title slides. Keep terse — the
// title slide is a wayfinder, not a tutorial. The audience-facing
// rationale lives in docs/design-system.md §3.
const BUCKET_BLURBS = Object.freeze({
  anchor:      'Anchor — where you are in the deck.',
  statement:   'Statement — one declarative claim per slide.',
  inventory:   'Inventory — parallel sets of related items.',
  comparison:  'Comparison — how two or more options differ.',
  progression: 'Progression — ordered movement through stages or time.',
  evidence:    'Evidence — data that supports the argument.',
  imagery:     'Imagery — visuals that carry their own meaning.',
  chart:       'Chart — series-substance data visualizations (SVG kernel).',
  diagram:     'Diagram — graph-substance network visuals (external renderer).',
});

function bucketGalleryMarkdownPath(bucket) {
  return path.join(COMPONENTS_DIR, bucket, `${bucket}.gallery.md`);
}

function bucketGalleryPdfPath(bucket, theme) {
  return path.join(COMPONENTS_DIR, bucket, `${bucket}.gallery.${theme}.pdf`);
}

// Compose the bucket-survey markdown. Opens with a title slide (bucket
// name + member list), then one slide per component using its
// `manifest.sample` (which already includes the _class directive).
function composeBucketGallery(bucket, manifests) {
  const blurb = BUCKET_BLURBS[bucket] || bucket;
  const members = manifests.map((m) => `\`${m.name}\``).join(' · ');

  const titleSlide = [
    '<!-- _class: title -->',
    '',
    `# ${bucket}`,
    '',
    `${blurb}`,
    '',
    `${manifests.length} component${manifests.length === 1 ? '' : 's'}: ${members}`,
    '',
  ].join('\n');

  const componentSlides = manifests
    .filter((m) => typeof m.sample === 'string' && m.sample.trim())
    .map((m) => m.sample.trim());

  const slides = [titleSlide, ...componentSlides];
  return slides.join('\n\n---\n\n') + '\n';
}

function buildOne(bucket, manifests, theme) {
  if (!manifests.length) {
    return { bucket, theme, skipped: true, reason: 'empty bucket' };
  }
  const md = composeBucketGallery(bucket, manifests);
  const mdSource = theme === 'dark' ? injectDark(md) : md;
  const mdPath = bucketGalleryMarkdownPath(bucket);
  const tmpPath = mdPath.replace(/\.gallery\.md$/, `.gallery.${theme}.tmp.md`);
  const outPdf = bucketGalleryPdfPath(bucket, theme);

  // Persist the light-theme markdown as the canonical bucket-gallery
  // source (so reviewers can see exactly what was rendered). The dark
  // variant is a transient transformation; we never commit a dark .md
  // alongside it.
  if (theme === 'light') {
    fs.writeFileSync(mdPath, md);
  }

  try {
    fs.writeFileSync(tmpPath, mdSource);
    execFileSync(
      process.execPath,
      [EMULATOR, tmpPath, THEME_CSS, outPdf, 'indaco', '-q'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }

  const ok = fs.existsSync(outPdf) && fs.statSync(outPdf).size > 10000;
  return {
    bucket,
    theme,
    members: manifests.length,
    pdfPath: outPdf,
    bytes: ok ? fs.statSync(outPdf).size : 0,
    failed: !ok,
  };
}

function checkOne(bucket, manifests, theme) {
  if (!manifests.length) return { bucket, theme, stale: false };
  const mdPath = bucketGalleryMarkdownPath(bucket);
  const outPdf = bucketGalleryPdfPath(bucket, theme);
  if (!fs.existsSync(outPdf)) return { bucket, theme, stale: true, reason: 'missing' };
  if (!fs.existsSync(mdPath)) return { bucket, theme, stale: true, reason: 'no source .md' };
  const expected = composeBucketGallery(bucket, manifests);
  const actual = fs.readFileSync(mdPath, 'utf8');
  if (expected !== actual) {
    return { bucket, theme, stale: true, reason: 'source .md drifted from manifests' };
  }
  const pdfStat = fs.statSync(outPdf);
  const mdStat = fs.statSync(mdPath);
  if (mdStat.mtimeMs > pdfStat.mtimeMs) {
    return { bucket, theme, stale: true, reason: 'source newer than PDF' };
  }
  return { bucket, theme, stale: false };
}

function main(argv) {
  const args = new Set(argv.filter((a) => a.startsWith('--')));
  const onlyIdx = argv.indexOf('--only');
  const themeIdx = argv.indexOf('--theme');
  const only = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;
  const themeFilter = themeIdx >= 0 ? argv[themeIdx + 1] : null;
  const checkMode = args.has('--check');

  if (only && !BUCKETS.includes(only)) {
    process.stderr.write(`error: --only must be one of ${BUCKETS.join(', ')}\n`);
    return 2;
  }
  if (themeFilter && !THEMES.includes(themeFilter)) {
    process.stderr.write(`error: --theme must be one of ${THEMES.join(', ')}\n`);
    return 2;
  }

  const targetThemes = themeFilter ? [themeFilter] : THEMES;
  const targetBuckets = only ? [only] : BUCKETS;
  const groups = groupByBucket(loadAll());

  const failures = [];
  const stale = [];
  let built = 0;
  let upToDate = 0;

  for (const bucket of targetBuckets) {
    const manifests = groups[bucket] || [];
    for (const theme of targetThemes) {
      if (checkMode) {
        const r = checkOne(bucket, manifests, theme);
        if (r.stale) stale.push(r);
        else upToDate += 1;
        continue;
      }
      try {
        const r = buildOne(bucket, manifests, theme);
        if (r.skipped) {
          process.stdout.write(`- ${bucket} [${theme}]: skipped (${r.reason})\n`);
          continue;
        }
        if (r.failed) {
          failures.push(r);
          process.stderr.write(`✗ ${bucket} [${theme}]: render failed\n`);
        } else {
          built += 1;
          process.stdout.write(
            `✓ ${bucket} [${theme}]: ${r.members} members, ${(r.bytes / 1024).toFixed(0)}kb\n`,
          );
        }
      } catch (e) {
        failures.push({ bucket, theme, error: e.message });
        process.stderr.write(`✗ ${bucket} [${theme}]: ${e.message}\n`);
      }
    }
  }

  if (checkMode) {
    if (stale.length === 0) {
      process.stdout.write(`✓ all ${upToDate} bucket-gallery PDFs up to date\n`);
      return 0;
    }
    process.stderr.write(`✗ ${stale.length} bucket-gallery PDFs are stale:\n`);
    for (const s of stale) {
      process.stderr.write(`    ${s.bucket} [${s.theme}]: ${s.reason}\n`);
    }
    process.stderr.write(`  Run \`npm run build:bucket-galleries\` to refresh.\n`);
    return 1;
  }

  process.stdout.write(`\n${built} PDFs built, ${failures.length} failed.\n`);
  return failures.length === 0 ? 0 : 1;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = {
  composeBucketGallery,
  bucketGalleryMarkdownPath,
  bucketGalleryPdfPath,
  BUCKET_BLURBS,
};
