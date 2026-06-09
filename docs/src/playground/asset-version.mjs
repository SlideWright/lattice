// Build-time asset-version resolver for the playground's runtime-fetched
// assets (the engine bundle, the runtime bundle, and the theme/engine CSS).
//
// THE PROBLEM IT SOLVES. Those three are served from FIXED public/ URLs
// (`playground/themes/lattice.css`, `playground/lattice-runtime.js`,
// `playground/lattice-playground.js`). Astro content-hashes its own page JS,
// so a redeploy refreshes the page — but the fixed-URL assets are cached by
// the browser/CDN and served stale. The visible failure: after a release the
// component list (baked into the fresh page JS) shows a new component, but the
// stale `lattice.css` lacks its rules, so it renders unstyled (a blank funnel,
// a collapsed pricing grid). See the 2026-06 funnel/pricing incident.
//
// THE FIX. `sync-playground-assets.mjs` stages those assets into a
// content-hashed directory `public/playground/v/<hash>/…` each build; this
// resolver returns that `<hash>` so the pages can build cache-busted URLs
// (`playground/v/<hash>/themes/lattice.css`). A content change → a new hash →
// a new URL → a guaranteed cache miss → fresh assets. No change to the fetch
// sites (they only append a filename to `themeBase`).
//
// Build-time only — it reads the filesystem, so it runs in Astro frontmatter
// (SSG, Node), never in a client bundle. Falls back to '' (the legacy
// unversioned base) if sync hasn't run, so an editor/import can't hard-fail.

import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const versionedRoot = join(here, '..', '..', 'public', 'playground', 'v');

/** @returns {string} the content-hash dir name sync created, or '' if none. */
export function assetVersion() {
  try {
    const dirs = readdirSync(versionedRoot).filter((d) => /^[0-9a-f]{8,}$/.test(d));
    return dirs[0] || '';
  } catch {
    return '';
  }
}

/**
 * The path prefix the playground assets live under, hash-versioned when sync
 * has run. Always ends in a slash, so `prefix + 'themes/'` /
 * `prefix + 'lattice-runtime.js'` compose directly.
 * @returns {string}
 */
export function assetBase() {
  const v = assetVersion();
  return v ? `playground/v/${v}/` : 'playground/';
}
