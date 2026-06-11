/**
 * lattice-engine — CSS emitter.
 *
 * Produces the per-render stylesheet the engine hands back as `render().css`:
 * a clean, marp-baggage-free scaffold + the resolved theme. This is the P1.1
 * deliverable from engineering/decisions/2026-06-10-marp-replacement-proposal.md
 * — it REVERSE-ENGINEERS Marpit's CSS contract rather than reproducing its
 * output. We emit only the rules that are load-bearing for a fixed-page PDF and
 * we emit them CORRECTLY, so themes compose onto the scaffold without the
 * `!important` override layer marp-core's foreign defaults forced
 * (lib/integrations/marp/marp.scaffold.css). Every kept rule documents why it
 * stays; the marp-only baggage (twemoji img sizing, `marp-h1` auto-scaling,
 * the `div.marpit > section` selector prefixing + `:where()` specificity
 * zeroing, the `video::-webkit-media-controls` web hack, `scroll-snap-align`)
 * is deliberately absent.
 *
 * Marpit reference (mirrored, not vendored):
 *   @marp-team/marpit/lib/theme/scaffold.js  → the section box + pagination
 *   @marp-team/marpit/lib/postcss/printable.js → @page + @media print
 *   @marp-team/marpit/lib/theme_set.js (pack) → @import + @size resolution
 */



// `@size <name> <width> <height>` lives inside the `/* @theme … */` comment
// block (Marpit parses it from there). hd is Lattice's default geometry.
const SIZE_RE = /@size\s+([A-Za-z0-9:_-]+)\s+(\S+)\s+(\S+)/g;
const DEFAULT_SIZE = { width: '1280px', height: '720px' };

// `@import 'lattice'` / `@import "lattice"` — the theme-name import every
// palette uses to pull in the base contract. Matched specifically so real
// `@import url(…)` font imports (e.g. the Noto Color Emoji webfont in
// lattice.css) are left untouched and hoisted separately.
const THEME_IMPORT_RE = /@import\s+(['"])lattice\1\s*;?/g;

// Real remote imports we must keep at the top of the emitted sheet — CSS
// ignores `@import` that isn't before all other rules, so inlining the base
// theme (which carries its own font @import) requires re-hoisting these.
const URL_IMPORT_RE = /@import\s+(?:url\([^)]*\)|(['"])(?!lattice\1)[^'"]*\1)[^;]*;/g;

/**
 * Parse every `@size` declaration out of a stylesheet's `@theme` comment.
 * Returns a Map name → { width, height }.
 */
function parseSizes(cssText) {
  const sizes = new Map();
  if (!cssText) return sizes;
  SIZE_RE.lastIndex = 0;
  let m;
  while ((m = SIZE_RE.exec(cssText))) {
    sizes.set(m[1], { width: m[2], height: m[3] });
  }
  return sizes;
}

/**
 * Resolve the page geometry for a render: the `size:` directive's named
 * `@size`, else hd, else the 1280×720 default. `sources` is the list of
 * stylesheets to search (theme first, then base).
 */
function resolveSize(sizeName, sources) {
  const wanted = sizeName || 'hd';
  for (const css of sources) {
    const sizes = parseSizes(css);
    if (sizes.has(wanted)) return sizes.get(wanted);
  }
  // hd not declared anywhere → first declared size, else the hard default.
  for (const css of sources) {
    const sizes = parseSizes(css);
    const first = sizes.values().next();
    if (!first.done) return first.value;
  }
  return DEFAULT_SIZE;
}

/**
 * The engine-owned scaffold. Reverse-engineered from Marpit's, stripped to
 * load-bearing rules, emitted correctly. `width`/`height` come from `@size`.
 */
function scaffold({ width, height }) {
  return `/* lattice-engine scaffold — owned section chrome (no marp-core baggage). */

/* Slide box. @size drives the geometry; box-sizing / overflow / position are
   the fixed-page contract every layout assumes. container-type:size makes the
   section a query container so lattice.css's cqi units resolve against the
   slide (pagination at bottom:1.875cqi, watermarks, etc.). */
section {
  width: ${width};
  height: ${height};
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  container-type: size;
}

/* Pagination pseudo-element. Marpit had this pseudo inherit the section's
   bottom padding, which misplaced the page number — the sole reason
   marp.scaffold.css needed !important. We zero the padding so the theme
   positions it cleanly; pointer-events:none keeps it non-interactive. */
section::after {
  content: attr(data-marpit-pagination);
  position: absolute;
  padding: 0;
  pointer-events: none;
}

/* No pagination attribute on the slide → no number rendered. */
section:not([data-marpit-pagination])::after {
  display: none;
}

/* PDF page geometry + print fidelity. @page sizes the sheet to the slide and
   zeroes margins. The print block forces one slide per page and exact colour
   reproduction (headless Chromium otherwise re-quantizes backgrounds in print,
   washing out palette fills). */
@page {
  size: ${width} ${height};
  margin: 0;
}

@media print {
  html,
  body {
    margin: 0;
  }

  section {
    page-break-before: always;
    break-before: page;
  }

  section,
  section * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}`;
}

/**
 * Hoist real `@import url(…)`/quoted-url imports to the top of `css` so they
 * survive the spec rule that `@import` must precede all other rules. Order
 * among them is preserved; duplicates are collapsed.
 */
function hoistImports(css) {
  const seen = new Set();
  const hoisted = [];
  const body = css.replace(URL_IMPORT_RE, (stmt) => {
    const key = stmt.trim();
    if (!seen.has(key)) {
      seen.add(key);
      hoisted.push(key);
    }
    return '';
  });
  if (hoisted.length === 0) return css;
  return `${hoisted.join('\n')}\n${body}`;
}

/**
 * Compose the per-render stylesheet.
 *
 *   themeCss        the selected palette's stylesheet (carries `@import
 *                   'lattice'` + token overrides)
 *   baseLatticeCss  the registered `lattice` base theme (dist/lattice.css)
 *   sizeName        the deck's `size:` directive value, if any
 *
 * Output order = cascade order: scaffold first (so the theme overrides it at
 * equal specificity), then the theme with `@import 'lattice'` inlined.
 */
function composeCss({ themeCss = '', baseLatticeCss = '', sizeName } = {}) {
  const geometry = resolveSize(sizeName, [themeCss, baseLatticeCss]);
  const resolvedTheme = themeCss.replace(THEME_IMPORT_RE, () => baseLatticeCss);
  const sheet = `${scaffold(geometry)}\n\n${resolvedTheme}`;
  return hoistImports(sheet);
}

module.exports = { composeCss, scaffold, parseSizes, resolveSize, hoistImports };
