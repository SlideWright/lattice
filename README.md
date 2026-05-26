# Lattice

A Marp-based slide deck system for boardroom-quality decks — PDF, HTML, PPTX, or PNG sets — from Markdown.

Lattice produces decks where every slide is a deliberate layout — title,
diagram, compare-prose, split-list, verdict-grid, and 20+ more —
themed through a single CSS palette and rendered to your delivery format
with no manual formatting work. Mermaid diagrams render with the same
theme. Decks read as ink-on-paper and pass WCAG AA throughout.

Lattice is the engine layer of [SlideWright](https://github.com/slidewright) —
a project for building deck-quality documents with discipline. The same
Lattice engine that runs from the command line will also run inside the
SlideWright desktop app (under development), so a deck authored in either
context renders identically.

> **Documentation:** <https://slidewright.github.io/lattice/> — intro,
> getting started, authoring and theming guides, and the interactive
> [component reference](https://slidewright.github.io/lattice/components.html)
> (every layout, themable in any palette). Built from `docs/`; see
> [`docs/README.md`](docs/README.md).

## What you get

- **A renderer.** Two paths from the same source: `marp-cli` (preferred —
  emits PDF, HTML, PPTX, or PNG sets) and `lattice-emulator.js` (for
  sandboxed/no-network builds — emits PDF plus an HTML sidecar). Mermaid
  diagrams pre-render as inline SVG. Code blocks syntax-highlight. Slides
  are 1280×720.
- **Thirteen palettes.** `indaco` (cool indigo, the default) and `cuoio`
  (warm leather) are the canonical pair, alongside `ardesia`, `atelier`,
  `brina`, `burgundy`, `carbone`, `concrete`, `crepuscolo`, `laguna`,
  `magnolia`, `mustard`, and `onyx` — most with a paired dark-canvas
  variant. Authors pick one in front matter (`theme: indaco`). Each
  supplies pale fills, saturated brand borders, and dark ink; saturated
  red is reserved for alarm states. WCAG AA verified across every
  text-bearing surface. Preview them all in the
  [component reference](https://slidewright.github.io/lattice/components.html).
- **26 layouts.** Title, divider, content, diagram, cards-grid, compare-prose,
  quote, timeline, big-number, split-list, verdict-grid, more.
  Each layout has an authoring contract documented in [reference/skill.md](reference/skill.md).
- **Mermaid integration.** All 25 renderable Mermaid diagram types are
  themed to match the deck. Per-diagram CSS overrides for the nine that
  ignore `themeVariables`. Documented in [reference/theming.md](reference/theming.md).

## Install

```sh
git clone https://github.com/slidewright/lattice.git
cd lattice
npm install
```

Requires Node 22+. `npm install` pulls in Marp CLI, the Mermaid CLI,
and Puppeteer (which downloads a matching Chromium).

## Use as a package

Distributed as `@slidewright/lattice` (npm publishing is pending — see
[RELEASE.md](RELEASE.md)). Lattice is a **Marp theme set**, so the two
supported ways to consume it both go through the Marp pipeline:

```sh
npm install @slidewright/lattice

# 1. The emulator, exposed as a bin. Resolves the engine + every theme
#    relative to the installed package, so it works from any directory.
npx lattice deck.md deck.pdf

# 2. marp-cli with the shipped config, which registers the whole theme
#    set (engine + 25 palettes). Author decks with `theme: indaco` etc.
npx marp deck.md --config-file node_modules/@slidewright/lattice/marp.config.js --pdf
```

The package also exposes these named entry points:

| Subpath | Resolves to | For |
|---|---|---|
| `@slidewright/lattice/config` | `marp.config.js` | the marp-cli config (registers the theme set) |
| `@slidewright/lattice/runtime` | `dist/lattice-runtime.js` | the marp-vscode-preview / web-export runtime transforms |
| `@slidewright/lattice/css` | `dist/lattice.css` | the engine bundle — **palette-blind** (layouts only, no colour tokens) |
| `@slidewright/lattice/themes/<name>.css` | `themes/<name>.css` | one palette — a **Marp theme file**, not a standalone stylesheet |

> **Themes are Marp theme files, not drop-in CSS.** Each one declares
> `@theme <name>` and pulls the engine in by name (`@import 'lattice'`),
> which only Marp's theme set resolves — a browser `<link>` to a theme
> file cannot resolve it. There is **no flattened, browser-droppable
> bundle today** (one would be a new `dist/` build target).

The published tarball ships only what these entry points need — engine
source, `dist/`, `themes/`, and the authoring docs. Regression-baseline
PDFs and per-bucket galleries stay in git but are excluded from the
package.

## Render the example galleries

```sh
node lattice-emulator.js examples/gallery.md examples/gallery.pdf
node lattice-emulator.js examples/gallery-mermaid.md examples/gallery-mermaid.pdf
```

The two galleries are committed to `examples/` as ground-truth fixtures
for what the renderer produces. Re-rendering them after an engine or
palette change should produce visually equivalent output; they're the
regression check for the project.

For other delivery formats from the same source, run marp-cli from the
repo root — [marp.config.js](marp.config.js) registers both palettes and
sets the image scale; the deck's `theme:` front matter selects which
palette to use:

```sh
npx @marp-team/marp-cli deck.md --pdf --output deck.pdf
# or --html, --pptx, --images png
```

The marp config sets `--image-scale 3`, so PNG output rasterizes at 3×
the slide dimensions (3840×2160 from 1280×720) — sharp on retina
displays and projectors. PDF and HTML are vector throughout (text,
SVG-rendered Mermaid, code highlighting); image scale only affects the
PNG path. From outside the repo root, pass both palettes explicitly:

```sh
npx @marp-team/marp-cli deck.md \
  --theme-set themes/indaco.css themes/cuoio.css dist/lattice.css \
  --image-scale 3 --pdf --output deck.pdf
```

The full pipeline (Mermaid pre-rendering, image conversion, PPTX
assembly) lives in [reference/engineering/pipeline.md](reference/engineering/pipeline.md).

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
node lattice-emulator.js deck.md out.pdf <palette-name>
```

The third positional argument names a file in `themes/`. The default is
`indaco`. To author a new palette, copy `themes/indaco.css`, change its
`@theme` directive to your name, and edit the tokens. See
[reference/theming.md](reference/theming.md) for the variable contract and the per-diagram
Mermaid override surface.

## Embed in a browser

For Marp live preview or web-export contexts, include `dist/lattice-runtime.js`:

```html
<link rel="stylesheet" href="themes/indaco.css">
<link rel="stylesheet" href="dist/lattice.css">
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script src="dist/lattice-runtime.js"></script>
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
├── marp.config.js             # Marpit plugins consumed by marp-cli
│
├── dist/                      # generated, committed build artifacts
│   ├── lattice.css            # slide layouts; palette-blind
│   ├── lattice-runtime.js     # browser runtime BUNDLE — generated by esbuild
│   │                          # from src/runtime/index.js + lib/transformers/*.
│   │                          # Rebuild everything: npm run build
│   └── docs/                  # canonical component reference (components.md/.html)
│
├── src/
│   └── runtime/index.js       # browser-runtime source (esbuild entry)
│
├── lib/
│   └── mermaid-hljs.js        # highlight.js language for mermaid source
│
├── themes/                    # 13 palettes (+ paired dark variants)
│   ├── indaco.css             # default palette: cool indigo + Mermaid CSS
│   ├── cuoio.css              # warm leather palette
│   └── …                      # ardesia, atelier, brina, burgundy, carbone, …
│
├── examples/
│   ├── gallery.md / gallery.pdf                  # 71-page layout gallery
│   ├── gallery-mermaid.md / gallery-mermaid.pdf  # 31-page diagram gallery
│   └── sample-image*.svg
│
├── docs/                      # public documentation site (Astro Starlight)
│
├── reference/                 # internal engineering & design references
│   ├── design-system.md       # the canonical Function·Form·Substance model
│   ├── architecture.md        # engine internals
│   ├── theming.md             # palette + Mermaid theming
│   ├── editorial.md           # prose rules
│   ├── skill.md               # deck authoring contract (layouts + directives)
│   ├── components.html / .md  # generated component reference (all layouts)
│   ├── notes/                 # durable developer / agent investigation notes
│   │                          # (also: forward-looking design proposals)
│   └── engineering/           # canonical deep references
│       └── workflow.md, development.md, gotchas.md, cascade.md, mermaid.md, …
│
├── test/
│   ├── unit/                  # fast (<100 ms); no child processes
│   ├── integration/           # spawns emulator + marp-cli; rebuilds galleries
│   ├── helpers/               # shared palette / pdf / render plumbing
│   └── fixtures/              # markdown fixtures for parsing tests
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
integration tier takes ~30 s (mostly the gallery-mermaid rebuild) and
is what CI runs before merge. Both top-level galleries
(`examples/gallery.md` and `examples/gallery-mermaid.md`) are the
authoritative test fixtures; their committed PDFs are the regression
baseline. Expected page counts are inlined in each test file; the 58
per-component galleries derive their counts from the manifest itself
via `expectedGallerySlideCount()`.

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
