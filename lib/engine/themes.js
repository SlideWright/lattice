/**
 * lattice-engine — theme store.
 *
 * Marp registers palettes via `marp.themeSet.add(cssText)`, keyed by the
 * `@theme <name>` directive in each stylesheet, and resolves `@import 'lattice'`
 * + `@size` when it emits the per-render `css`. The store keys stored CSS by
 * `@theme` name; `cssFor(name)` returns the per-render stylesheet.
 *
 * P1.1 (done): `cssFor` composes the engine-owned scaffold (lib/engine/css.js)
 * with the selected theme, resolving `@import 'lattice'` against the registered
 * base theme and honouring the `size:` directive's `@size` geometry. The
 * scaffold is reverse-engineered from Marpit's — load-bearing rules only,
 * emitted correctly — so themes compose without marp-core's `!important`
 * override layer.
 */



const { composeCss } = require('./css');

const THEME_RE = /@theme\s+([A-Za-z0-9_-]+)/;
const BASE_THEME = 'lattice';

// A theme-name `@import 'name';` (single-token names like `concrete`, NOT
// `@import url(…)` font imports or paths). Mirrors Marpit's theme-to-theme
// import: a `*-dark` wrapper is literally `@import 'concrete'; :root{…}`.
const THEME_NAME_IMPORT_RE = /@import\s+(['"])([A-Za-z0-9_-]+)\1\s*;?/g;

class ThemeStore {
  constructor() {
    this.byName = new Map();
  }

  add(cssText) {
    const m = THEME_RE.exec(cssText || '');
    if (!m) return false;
    this.byName.set(m[1], cssText);
    return true;
  }

  has(name) {
    return this.byName.has(name);
  }

  /**
   * Inline theme-to-theme `@import 'name'` against the store, recursively, so a
   * `*-dark` wrapper (`@import 'concrete'; :root{color-scheme:dark}`) carries the
   * full base palette into composeCss. `@import 'lattice'` is left for composeCss
   * (it inlines the base scaffold); unknown / cyclic names are left in place (they
   * fall through to composeCss's URL-import hoisting, the pre-fix behaviour).
   * Without this the wrapper's import hoisted as a dead `@import 'concrete';` and
   * every `*-dark` sheet collapsed to scaffold-only (~2 KB, no tokens).
   */
  resolveThemeImports(cssText, seen) {
    return (cssText || '').replace(THEME_NAME_IMPORT_RE, (full, _q, importName) => {
      if (importName === BASE_THEME) return full; // composeCss resolves the base
      if (seen.has(importName) || !this.byName.has(importName)) return full;
      seen.add(importName);
      return this.resolveThemeImports(this.byName.get(importName), seen);
    });
  }

  /**
   * Return the per-render CSS for a registered theme: the engine scaffold +
   * the theme with theme-name imports (incl. `@import 'lattice'`) resolved
   * against the registered base. `sizeName` is the deck's `size:` directive
   * value (selects the `@size` geometry). Unknown themes return an empty string
   * rather than throwing.
   */
  cssFor(name, sizeName) {
    if (!this.byName.has(name)) return '';
    const themeCss = this.resolveThemeImports(this.byName.get(name), new Set([name]));
    return composeCss({
      themeCss,
      baseLatticeCss: this.byName.get(BASE_THEME) || '',
      sizeName,
    });
  }
}

module.exports = { ThemeStore };
