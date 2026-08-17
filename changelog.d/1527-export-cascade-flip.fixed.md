- **Fixed: a palette's curated colors now paint in an exported PDF.** The export
  path composed its stylesheet palette-first, so `dist/lattice.css`'s universal
  defaults loaded last and won — every value a theme curated for itself
  (`--hljs-*`, the status trio, the sequential ramp) was overridden in the
  artifact, while the Studio and the docs Playground rendered the theme's own
  value. Export now composes layout-first, matching `lib/engine/css.js`
  `composeCss`, so all three surfaces resolve one cascade. On a 32-palette
  rendered probe, 33 text runs move from below WCAG AA to above it; the only
  runs that move the other way are on a `redline stacked` pairing the CSS allows
  but no shipped deck writes.
