# Lattice

A Marp-based slide deck system for boardroom-quality PDFs from Markdown.

Lattice produces decks where every slide is a deliberate layout — title,
diagram, compare-prose, split-panel, verdict-grid, and 20+ more —
themed through a single CSS palette and rendered to PDF with no manual
formatting work. Mermaid diagrams render with the same theme. Decks read
as ink-on-paper and pass WCAG AA throughout.

Lattice is the engine layer of [SlideWright](https://github.com/slidewright) —
a project for building deck-quality documents with discipline. The same
Lattice engine that runs from the command line will also run inside the
SlideWright desktop app (under development), so a deck authored in either
context renders identically.

## What you get

- **A renderer.** `node lattice-emulator.js deck.md lattice.css out.pdf` produces
  a paginated PDF. Mermaid diagrams pre-render as inline SVG. Code blocks
  syntax-highlight. Slides are 1280×720.
- **Two palettes.** `indaco` (cool indigo, default) and `cuoio` (warm
  leather). Authors pick one in front matter (`theme: indaco` or
  `theme: cuoio`). Both supply pale fills, saturated brand borders, and
  dark ink. Saturated red reserved for alarm states. WCAG AA verified
  across every text-bearing surface.
- **26 layouts.** Title, divider, content, diagram, cards-grid, compare-prose,
  quote, timeline, big-number, split-panel, verdict-grid, more.
  Each layout has an authoring contract documented in [docs/skill.md](docs/skill.md).
- **Mermaid integration.** All 25 renderable Mermaid diagram types are
  themed to match the deck. Per-diagram CSS overrides for the nine that
  ignore `themeVariables`. Documented in [docs/theming.md](docs/theming.md).

## Install

```sh
git clone https://github.com/slidewright/lattice.git
cd lattice
npm install
```

Requires Node 18+. `npm install` pulls in Marp CLI, the Mermaid CLI,
and Puppeteer (which downloads a matching Chromium).

## Render the example galleries

```sh
node lattice-emulator.js examples/gallery.md lattice.css examples/gallery.pdf
node lattice-emulator.js examples/mermaid-gallery.md lattice.css examples/mermaid-gallery.pdf
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
node lattice-emulator.js deck.md lattice.css out.pdf <palette-name>
```

The fourth positional argument names a file in `themes/`. The default is
`indaco`. To author a new palette, copy `themes/indaco.css`, change its
`@theme` directive to your name, and edit the tokens. See
[docs/theming.md](docs/theming.md) for the variable contract and the per-diagram
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

```text
lattice/
├── README.md                  # this file
├── CHANGELOG.md
├── LICENSE
├── package.json
│
├── lattice-emulator.js        # build-time renderer (CLI; emulates marp-cli)
├── lattice-runtime.js         # browser runtime (preview path, marp-cli path)
├── lattice.css                # slide layouts; palette-blind
├── marp.config.js             # Marpit plugins consumed by marp-cli
│
├── lib/
│   └── mermaid-hljs.js        # highlight.js language for mermaid source
│
├── themes/
│   ├── indaco.css             # default palette: cool indigo + Mermaid CSS
│   └── cuoio.css              # warm leather palette
│
├── examples/
│   ├── gallery.md / gallery.pdf                  # 71-page layout gallery
│   ├── mermaid-gallery.md / mermaid-gallery.pdf  # 31-page diagram gallery
│   └── sample-image*.svg
│
├── docs/
│   ├── architecture.md        # engine internals
│   ├── theming.md             # palette + Mermaid theming
│   ├── editorial.md           # prose rules
│   ├── skill.md               # deck authoring contract (layouts + directives)
│   ├── notes/                 # durable developer / agent investigation notes
│   └── references/
│       ├── design.md, templates.md, pipeline.md,
│       ├── mermaid.md, audit.md
│       └── proposals.md       # forward-looking; explicitly non-canonical
│
├── test/
│   ├── unit/                  # fast (<100 ms); no child processes
│   ├── integration/           # spawns emulator + marp-cli; rebuilds galleries
│   ├── helpers/               # shared palette / pdf / render plumbing
│   └── fixtures/              # expected-page-counts.json
│
└── tools/
    └── screenshot-slides.js   # dev-only audit utility
```

## Testing

Two tiers, both built on Node's `node:test`:

```sh
npm test                  # unit tier — palette, var-map contract, source parse
npm run test:integration  # integration tier — rebuilds both galleries through
                          # lattice-emulator and marp-cli; cross-renderer parity
npm run test:all          # both tiers
```

The unit tier finishes in under 100 ms and is the inner loop. The
integration tier takes ~30 s (mostly the mermaid-gallery rebuild) and
is what CI runs before merge. Both galleries (`examples/gallery.md`
and `examples/mermaid-gallery.md`) are the authoritative test
fixtures; their committed PDFs are the regression baseline. Page
counts live in [test/fixtures/expected-page-counts.json](test/fixtures/expected-page-counts.json).

`marp-cli` is a runtime dependency, not a dev dependency — the
integration suite asserts cross-renderer parity, and the browser
preview path explicitly targets marp-cli output.

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
