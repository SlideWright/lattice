/**
 * Integration: per-component gallery PDFs match the page count their
 * manifest implies via `expectedGallerySlideCount()`.
 *
 * This is the decentralized replacement for the central
 * `test/fixtures/expected-page-counts.json` snapshot. The expected
 * count is DERIVED from the manifest (title + sample + variant count
 * + anti-patterns + closing), not hand-maintained. Adding a variant
 * to the manifest automatically updates the expected count; a
 * transform that silently drops a slide fails the assertion.
 *
 * Coverage grows with the Phase 2 migration: a manifest qualifies for
 * this tier once `isEnriched()` returns true (it carries at least
 * one of sample/whenToUse/antiPatterns/related/variantDocs).
 * Components not yet migrated are skipped via `t.skip()`.
 *
 * Cold runs are slow (one PDF per enriched component). The render
 * helper's cache hashes the manifest + styles.css + bundle so warm
 * runs are near-instant. CI disables the cache.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { loadAll } = require('../../../lib/components');
const {
  isEnriched,
  expectedGallerySlideCount,
  targetPaths,
} = require('../../../tools/build-component-docs');
const { runEmulator } = require('../../helpers/render');
const { pageCount } = require('../../helpers/pdf');

describe('component-galleries', () => {
  const manifests = loadAll();
  for (const m of manifests) {
    const enriched = isEnriched(m);
    test(
      `${m.name}: gallery page count matches manifest formula`,
      { timeout: 180000, skip: enriched ? false : 'not yet migrated (no enriched prose fields)' },
      () => {
        const galleryPath = targetPaths(m).gallery;
        assert.ok(
          fs.existsSync(galleryPath),
          `gallery source missing: ${path.relative(process.cwd(), galleryPath)} — run \`npm run docs:components\``,
        );
        const pdf = runEmulator(galleryPath);
        assert.equal(
          pageCount(pdf),
          expectedGallerySlideCount(m),
          `${m.name}.gallery.pdf page count drifted from manifest formula`,
        );
      },
    );
  }
});
