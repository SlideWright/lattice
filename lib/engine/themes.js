/**
 * lattice-engine — theme store.
 *
 * Marp registers palettes via `marp.themeSet.add(cssText)`, keyed by the
 * `@theme <name>` directive in each stylesheet, and resolves `@import 'lattice'`
 * + `@size` when it emits the per-render `css`. This is the P1 stub: it keys
 * stored CSS by `@theme` name and returns it for `cssFor(name)`.
 *
 * P1.1 (tracked in the proposal): resolve `@import 'lattice'` against the
 * registered base theme, honour `@size` (the hd/4K page geometry in
 * lib/_theme.css), and emit the scaffold CSS marp-core currently injects
 * (the `section::after { content: attr(data-marpit-pagination) }` pagination
 * rule, header/footer, the box reset lattice.css overrides). Until then the
 * `css` field is informational only; PDF parity is asserted structurally on the
 * HTML, not on emitted CSS.
 */



const THEME_RE = /@theme\s+([A-Za-z0-9_-]+)/;

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
   * Return the CSS for a registered theme. P1 stub: the stored stylesheet
   * verbatim (its own `@import 'lattice'` is left for the consumer/bundler to
   * resolve, exactly as the playground page does today via /playground/themes/).
   * Unknown themes return an empty string rather than throwing.
   */
  cssFor(name) {
    return this.byName.get(name) || '';
  }
}

module.exports = { ThemeStore };
