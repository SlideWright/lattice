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
   * Return the per-render CSS for a registered theme: the engine scaffold +
   * the theme with `@import 'lattice'` resolved against the registered base.
   * `sizeName` is the deck's `size:` directive value (selects the `@size`
   * geometry). Unknown themes return an empty string rather than throwing.
   */
  cssFor(name, sizeName) {
    const themeCss = this.byName.get(name);
    if (themeCss === undefined) return '';
    return composeCss({
      themeCss,
      baseLatticeCss: this.byName.get(BASE_THEME) || '',
      sizeName,
    });
  }
}

module.exports = { ThemeStore };
