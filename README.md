# Lattice

A Marp-based slide deck system for boardroom-quality PDFs from Markdown.

Lattice produces decks where every slide is a deliberate layout — title,
diagram, comparison, finding, split-panel, verdict-grid, and 20+ more —
themed through a single CSS palette and rendered to PDF with no manual
formatting work. Mermaid diagrams render with the same theme. Decks read
as ink-on-paper and pass WCAG AA throughout.

Lattice is the engine layer of [SlideWright](https://github.com/slidewright) —
a project for building deck-quality documents with discipline. The same
Lattice engine that runs from the command line will also run inside the
SlideWright desktop app (under development), so a deck authored in either
context renders identically.

## What you get

- **A renderer.** `node lattice.js deck.md lattice.css out.pdf` produces
  a paginated PDF. Mermaid diagrams pre-render as inline SVG. Code blocks
  syntax-highlight. Slides are 1280×720.
- **Two palettes.** `indaco` (cool indigo, default) and `cuoio` (warm
  leather). Authors pick one in front matter (`theme: indaco` or
  `theme: cuoio`). Both supply pale fills, saturated brand borders, and
  dark ink. Saturated red reserved for alarm states. WCAG AA verified
  across every text-bearing surface.
- **25+ layouts.** Title, divider, content, diagram, card-grid, comparison,
  quote, timeline, big-number, split-panel, finding, verdict-grid, more.
  Each layout has an authoring contract documented in [SKILL.md](SKILL.md).
- **Mermaid integration.** All 25 renderable Mermaid diagram types are
  themed to match the deck. Per-diagram CSS overrides for the nine that
  ignore `themeVariables`. Documented in [THEMING.md](THEMING.md).

## Install

```sh
git clone https://github.com/slidewright/lattice.git
cd lattice
npm install
```

Requires Node 18+, Mermaid CLI, and Puppeteer (which downloads a Chromium).

## Render the example galleries

```sh
node lattice.js examples/gallery.md lattice.css examples/gallery.pdf
node lattice.js examples/mermaid-gallery.md lattice.css examples/mermaid-gallery.pdf
```

The two galleries are committed to `examples/` as ground-truth fixtures
for what the renderer produces. Re-rendering them after an engine or
palette change should produce visually equivalent output; they're the
regression check for the project.

## Use a different palette

Set `theme:` in your deck's front matter:

```yaml
---
theme: indaco   # cool indigo (default)
---
```

or

```yaml
---
theme: cuoio    # warm leather
---
```

For CLI builds, the active palette can also be overridden positionally:

```sh
node lattice.js deck.md lattice.css out.pdf <palette-name>
```

The fourth positional argument names a file in `themes/`. The default is
`indaco`. To author a new palette, copy `themes/indaco.css`, change its
`@theme` directive to your name, and edit the tokens. See
[THEMING.md](THEMING.md) for the variable contract and the per-diagram
Mermaid override surface.

## Embed in a browser

For Marp live preview or web-export contexts, include `lattice-runtime.js`:

```html
<link rel="stylesheet" href="themes/indaco.css">
<link rel="stylesheet" href="lattice.css">
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script src="lattice-runtime.js"></script>
```

The runtime reads CSS custom properties from the loaded palette, derives
the Mermaid `themeVariables` object, and fetches the Mermaid CSS section
from the palette file. Same theme as the build path; one file to edit.

## Project layout

```
lattice/
├── README.md                  this file
├── SKILL.md                   deck authoring contract
├── THEMING.md                 palette + Mermaid theming
├── EDITORIAL.md               prose rules
├── ARCHITECTURE.md            engine internals
├── CHANGELOG.md
├── LICENSE
├── package.json
│
├── lattice.js                 renderer (build-time)
├── lattice-runtime.js         browser script (runtime)
├── lattice.css                slide layouts (engine, palette-blind)
│
├── themes/
│   ├── indaco.css             default palette: cool indigo + Mermaid CSS
│   └── cuoio.css              warm leather palette
│
└── examples/
    ├── gallery.md / gallery.pdf
    └── mermaid-gallery.md / mermaid-gallery.pdf
```

## SlideWright ecosystem

Lattice is part of [SlideWright](https://github.com/slidewright), an
organization that publishes tools for crafting deck-quality documents.
Other repositories under SlideWright (current and planned):

- **lattice** — this repo. The deck rendering engine + default palette.
- **slidewright** — the desktop app (Tauri). Wraps the Lattice engine
  with a markdown editor, live preview, theme picker, and PDF export.
  Aims to make Lattice approachable for people who don't run `node`
  from a terminal. (Under development.)
- **themes** — additional palette packs that can drop into Lattice.
  (Future.)

## Versioning

Lattice follows semantic versioning with one explicit contract: **layouts
and palette tokens are stable.** A breaking change to either is a major
version bump. New layouts and new palettes are additive minor versions.
Mermaid CSS overrides are internal and may change in patch versions.
See [CHANGELOG.md](CHANGELOG.md) for the per-version detail.

## License

MIT. See [LICENSE](LICENSE).
