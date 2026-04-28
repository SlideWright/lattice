# Changelog

All notable changes to Lattice are documented here. The project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) with one explicit
contract: **layouts and palette tokens are stable surfaces.** Breaking
changes to either are major version bumps. New layouts and new themes are
additive minor versions. Mermaid CSS overrides are internal and may change
in patch versions.

## 1.0.0

Initial public release.

### Engine

- Markdown-to-PDF renderer (`lattice.js`) with Marp-emulated HTML output,
  highlight.js syntax coloring, and per-diagram Mermaid pre-rendering.
- Browser runtime (`lattice-runtime.js`) for live Marp preview and web
  export contexts. Resolves the Mermaid theme from the loaded palette CSS
  at runtime.
- Single source of truth for color: every Mermaid theme variable derives
  from CSS custom properties in the active palette. The structural
  mapping (which Mermaid key gets which palette role) lives in `lattice.js`
  and does not change when palettes are swapped.

### Theme

- Two palettes: `indaco` (cool indigo, default) and `cuoio` (warm leather).
  Both extend `lattice.css` via `@import 'lattice'` and supply color tokens.
  Pale-cool / pale-warm designs with saturated brand borders and dark ink.
  Saturated red reserved for alarm states (gantt critical, error fills).
  Every other surface stays pale.
- Dark variant tokens (`section.dark` reskin) defined as part of the
  palette, so the same layouts work on either canvas.
- highlight.js syntax tokens defined as palette variables, so a theme
  can change syntax colors alongside slide colors.

### Layouts

- 25+ slide layouts including title, divider, content, diagram, two-column,
  card-grid, comparison, quote, timeline, list, full-bleed, big-number,
  split-panel, closing, finding, code-compare, image-half, stats,
  cards-stacked, criteria, verdict-grid, image-full, three-row, and dark
  variants.
- All layouts are palette-blind: every color reference goes through
  `var(--token)`, no hex literals.

### Mermaid

- Theme support for all 25 renderable Mermaid diagram types. ZenUML is
  documented as a non-renderable type in static-PDF contexts because the
  Mermaid CLI emits HTML/Tailwind classes without bundling the required
  stylesheet.
- Per-diagram CSS overrides for nine diagrams that ignore `themeVariables`
  or have hardcoded internal palettes (journey, mindmap, kanban, c4,
  radar, venn, ishikawa, treemap, plus a flowchart shape-coverage rule
  and a gantt outside-text fix).

### Examples

- `examples/gallery.md` and `gallery.pdf`: 40-slide layout gallery
  demonstrating every slide layout.
- `examples/mermaid-gallery.md` and `mermaid-gallery.pdf`: 31-slide
  diagram gallery covering all 25 Mermaid diagram types.

### Documentation

- `README.md`: project landing.
- `SKILL.md`: deck authoring contract — layouts, directives, examples.
- `THEMING.md`: how to author a palette, including the per-diagram
  Mermaid theming surface and parser limits.
- `EDITORIAL.md`: prose rules for writing the words on the slides.
- `ARCHITECTURE.md`: engine internals.

### Position in SlideWright

Lattice 1.0.0 is the first repository published under the
[SlideWright](https://github.com/slidewright) organization. Lattice is
the engine layer — the build pipeline, the layouts, the theme system.
The SlideWright desktop app (under development) will wrap this engine
with a GUI for non-developer deck authors.
