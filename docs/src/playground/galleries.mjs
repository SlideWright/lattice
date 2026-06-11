// Build-time loader for the playground's "Load a deck" drawer.
//
// The playground's component picker scaffolds ONE component at a time. This
// module surfaces the other half of the story: the full showcase decks that
// already live in the repo as regression baselines + editorial references —
// the Jargon gallery, the design-system tour, and the twelve per-bucket survey
// galleries. Picking one drops the whole deck into the editor so it renders in
// the preview, in the chosen palette (the engine's withTheme() injects the
// selected theme into each deck's front matter — see lib/playground/index.js).
//
// Runs in Astro frontmatter (SSG, Node) only — it reads repo markdown off the
// filesystem and inlines any local image assets as data URIs so the sandboxed
// preview iframe can render them without a fetch (the iframe has no path back
// to the repo's image files). The asset set is tiny + all SVG today (~11 KB),
// so base64-inlining is cheaper than wiring a second hashed-asset sync.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Editorial showcases — the headline decks, in featured order.
const SHOWCASES = [
  {
    id: 'jargon',
    label: 'Jargon',
    file: 'examples/gallery-jargon.md',
  },
  {
    id: 'design-system',
    label: 'Design system',
    file: 'design/design-system.gallery.md',
  },
];

// One survey deck per component family (bucket), in design-system catalog
// order. File path is derived: lib/components/<bucket>/<bucket>.gallery.md.
const FAMILIES = [
  ['anchor', 'Anchors'],
  ['statement', 'Statements'],
  ['inventory', 'Inventory'],
  ['comparison', 'Comparison'],
  ['progression', 'Progression'],
  ['evidence', 'Evidence'],
  ['imagery', 'Imagery'],
  ['chart', 'Charts'],
  ['diagram', 'Diagrams'],
  ['math', 'Math'],
  ['code', 'Code'],
  ['legal', 'Legal'],
];

// Markdown image syntax: ![alt](target). Captures the surrounding `![...](` and
// `)` so a replacement only swaps the target. Alt text can't contain `]`.
const IMG_RE = /(!\[[^\]]*\]\()\s*([^)\s]+)\s*(\))/g;
const IMG_EXT = /\.(svg|png|jpe?g|webp|gif)$/i;
const MIME = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

// Rewrite every LOCAL image target to a base64 data URI resolved against the
// deck's own directory. Remote (http) + already-inlined (data:) targets and
// non-image links are left untouched; a missing file is left as-is so the
// broken-link is visible rather than silently swallowed.
function inlineAssets(src, galleryDir) {
  return src.replace(IMG_RE, (whole, pre, target, post) => {
    if (/^(https?:|data:)/i.test(target) || !IMG_EXT.test(target)) return whole;
    const abs = resolve(galleryDir, target);
    if (!existsSync(abs)) return whole;
    const ext = target.match(IMG_EXT)[1].toLowerCase();
    const b64 = readFileSync(abs).toString('base64');
    return `${pre}data:${MIME[ext]};base64,${b64}${post}`;
  });
}

// Slide count = horizontal-rule fences minus the one that closes front matter
// (the opening fence is line 0, so N `---` lines yield N-1 slide separators →
// N-1 slides for a deck that opens with front matter). Good enough for a meta
// label; these decks don't use `---` for anything but slide breaks.
function slideCount(src) {
  const fences = (src.match(/^---[ \t]*$/gm) || []).length;
  return Math.max(1, fences - 1);
}

function loadOne(repoRoot, { id, label, file, group }) {
  const abs = join(repoRoot, file);
  if (!existsSync(abs)) return null;
  const raw = readFileSync(abs, 'utf8');
  return {
    id,
    label,
    group,
    slides: slideCount(raw),
    source: inlineAssets(raw, dirname(abs)),
  };
}

/**
 * Load the curated showcase + family galleries from the repo.
 * @param {string} repoRoot absolute path to the lattice repo root
 * @returns {Array<{id,label,group,slides,source}>}
 */
export function loadGalleries(repoRoot) {
  const out = [];
  for (const s of SHOWCASES) {
    const g = loadOne(repoRoot, { ...s, group: 'Showcases' });
    if (g) out.push(g);
  }
  for (const [bucket, label] of FAMILIES) {
    const g = loadOne(repoRoot, {
      id: `fam-${bucket}`,
      label,
      file: `lib/components/${bucket}/${bucket}.gallery.md`,
      group: 'By family',
    });
    if (g) out.push(g);
  }
  return out;
}

// Group metadata for the drawer — the order they render in, plus the one-line
// hint that makes each group's semantics legible.
export const GALLERY_GROUPS = [
  { key: 'Showcases', hint: 'Full editorial decks — every layout in context.' },
  { key: 'By family', hint: 'One survey deck per component family.' },
];
