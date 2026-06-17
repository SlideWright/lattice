/**
 * Universal `![bg …]` background-image handling for half-canvas image layouts.
 *
 * Lattice renders the `image` layout as its OWN `lattice-bg` / `image-text`
 * structure (NOT Marpit's inline-SVG advanced background): an absolutely-
 * positioned `.lattice-bg` panel carrying the image as a CSS `background-image`
 * (no `<img>`), beside a `.image-text` wrapper that constrains the prose to the
 * other half. The asset URL is resolved to an absolute file:// URL against the
 * deck directory so it renders regardless of the output location.
 *
 * lib/engine, by contract, matches marp-core's WEB mode, which collapses
 * `bg left/right` to a single full-bleed CSS background with no `<img>` — so the
 * emulator's engine-backed path (which renders PDFs, where the split panel is
 * wanted) would lose the layout. This kernel lifts the lattice-bg handling out so
 * that path can reproduce it without touching lib/engine's web↔marp parity
 * contract:
 *
 *   - `liftBgImages(md)` — markdown pre-pass: rewrite each `![bg side](url)` into
 *     the raw `.lattice-bg` div BEFORE engine.render, so the engine's basic-mode
 *     background ruler never consumes (and collapses) the directive.
 *   - `wrapImageText(sectionHtml)` — HTML post-pass: wrap a half-canvas image
 *     section's prose in `.image-text`, leaving header / footer / the lattice-bg
 *     div as siblings (header · lattice-bg · image-text · footer order).
 *
 * `bgDiv` / `bgSide` / `isHalfCanvasImage` give the directive grammar + the panel
 * markup a single home. See
 * engineering/decisions/2026-06-11-emulator-on-engine-p2.md (P2 step c→d).
 */

const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Marp background-image directive, anchored to line start so an inline `![bg…]`
// inside backtick code is not consumed.
const BG_RE = /^!\[bg((?:\s+\w+)*)\]\(([^)]+)\)/gm;

// `bg right` / `bg left` choose the split side; anything else is full-bleed.
function bgSide(keywords = '') {
  if (/\bright\b/.test(keywords)) return 'right';
  if (/\bleft\b/.test(keywords)) return 'left';
  return 'full';
}

// Resolve a deck-relative asset URL to an absolute file:// URL against `baseDir`
// (the deck's directory). Remote (http/https/data/file/protocol-relative) and
// already-absolute paths pass through untouched. Without a baseDir the URL is
// returned verbatim (the web/runtime path resolves against its own origin).
// This is the fix for the path bug: a `![bg](relative.svg)` rendered to a PDF
// in any directory but the deck's used to resolve against the output dir and
// 404. See engineering/decisions/2026-06-17-image-rearchitecture.md.
function resolveAssetUrl(url, baseDir) {
  if (!baseDir || /^(?:[a-z]+:|\/\/)/i.test(url)) return url;
  const abs = path.isAbsolute(url) ? url : path.resolve(baseDir, decodeURI(url));
  return pathToFileURL(abs).href;
}

// The canonical panel markup. The image rides as a CSS `background-image` on the
// `.lattice-bg` div (no `<img>`) — so image.styles.css needs no `!important` to
// beat Marpit's `section img` catch-all (that contract no longer applies).
function bgDiv(keywords, url, baseDir) {
  const resolved = resolveAssetUrl(url.trim(), baseDir).replace(/'/g, '%27');
  return `<div class="lattice-bg lattice-bg-${bgSide(keywords)}" style="background-image:url('${resolved}')"></div>`;
}

// Markdown pre-pass for the engine path: `![bg side](url)` → the lattice-bg div.
// `baseDir` (the deck's directory) resolves deck-relative asset URLs to absolute.
function liftBgImages(md, baseDir) {
  if (typeof md !== 'string' || md.indexOf('![bg') === -1) return md;
  return md.replace(BG_RE, (_whole, keywords, url) => bgDiv(keywords, url, baseDir));
}

// Half-canvas image = the `image` class minus the full-bleed variants (full /
// contain / museum), which fill the canvas edge-to-edge and carry no text panel.
function isHalfCanvasImage(cls = '') {
  return /\bimage\b/.test(cls) && !/\b(?:full|contain|museum)\b/.test(cls);
}

// HTML post-pass: wrap a half-canvas image section's prose in `.image-text`,
// keeping header / footer / the lattice-bg div as siblings (the bg panel and the
// chrome are absolutely positioned, not text-slot content). Idempotent.
function wrapImageText(sectionHtml) {
  if (typeof sectionHtml !== 'string') return sectionHtml;
  const open = sectionHtml.match(/^<section\b[^>]*>/i);
  if (!open) return sectionHtml;
  const clsMatch = open[0].match(/class="([^"]*)"/);
  if (!isHalfCanvasImage(clsMatch ? clsMatch[1] : '')) return sectionHtml;
  if (sectionHtml.indexOf('class="image-text"') !== -1) return sectionHtml; // idempotent
  const closeIdx = sectionHtml.lastIndexOf('</section>');
  if (closeIdx === -1) return sectionHtml;
  const inner = sectionHtml.slice(open[0].length, closeIdx);
  const header = (inner.match(/<header[\s\S]*?<\/header>/) || [''])[0];
  const bg = (inner.match(/<div class="lattice-bg[\s\S]*?<\/div>/) || [''])[0];
  const footer = (inner.match(/<footer[\s\S]*?<\/footer>/) || [''])[0];
  let body = inner;
  for (const part of [header, bg, footer]) if (part) body = body.replace(part, '');
  return `${open[0]}${header}${bg}<div class="image-text">${body.trim()}</div>${footer}</section>`;
}

module.exports = { BG_RE, bgSide, bgDiv, resolveAssetUrl, liftBgImages, isHalfCanvasImage, wrapImageText };
