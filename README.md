<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/lattice-lockup-dark.svg">
    <img alt="Lattice" src="docs/public/lattice-lockup.svg" width="440">
  </picture>
</p>

# Lattice

A Marp-based slide deck system for boardroom-quality decks — PDF, HTML, PPTX, or PNG sets — from Markdown.

Lattice produces decks where every slide is a deliberate layout — title,
diagram, compare-prose, split-panel, verdict-grid, and 20+ more —
themed through a single CSS palette and rendered to your delivery format
with no manual formatting work. Decks read as ink-on-paper and pass
WCAG AA throughout.

You author every slide as plain Markdown — bullet lists, tables, fenced
code, `$…$` math — and Lattice renders it in the visual vocabulary your
field expects. Mathematicians and quants get KaTeX with
Definition/Theorem/Proof cards, derivation chains, and matrix
decompositions; project leads get gantt charts, kanban boards, and
roadmaps; engineers and architects get all 25 Mermaid diagram types and
side-by-side code diffs; lawyers and compliance get statute stacks,
authority chains, and obligation matrices; analysts get radar, quadrant,
and KPI layouts. Fifty-three layouts, one syntax you already know — no
drawing tools, no boxes, no pasted screenshots.

Lattice is the engine at the heart of **Lattice Style** — a project born
from a refusal to keep fighting the slide tools we all use, building
deck-quality documents with the discipline of a design system.
([Read the story](#why-lattice-style-exists).) The same Lattice engine that
runs from the command line will also run inside **SlideWright**, the desktop
app (under development), so a deck authored in either context renders
identically.

## Why Lattice Style exists

I built Lattice because I can't stand what the slide tools we all use do to
the people who use them.

PowerPoint was revolutionary when it arrived — and then three decades of
tools, desktop and web alike, copied its shape without ever questioning it.
The same blank canvas. The same master slide everything inherits from, until
the first override sends the whole deck drifting. They make authors
unproductive by design, and they have no guardrails — nothing stops poor
taste or poor authorship, so the burden of consistency falls on you, slide
after slide, the night before the meeting. You can't even tell what changed
between two versions. And so we all sit through presentations that are worse
than they needed to be — not because the author had nothing to say, but
because the tool fought them the entire way.

No amount of AI bolted on top can mask flaws that deep. The foundation is
wrong for today's work.

**Lattice is the answer I wanted to exist:** a deck as a text file, with the
discipline of a design system and taste built into the engine instead of
left to chance. You write the words. The structure holds. The finish is
consistent by default — and swapping it is one line, not a thousand
hand-edits. What changed shows up in a `git diff`, line by line. And poor
taste runs out of places to hide. **Lattice Style** is the project I'm
building around it.

## The name

A *lattice* is a frame of crossed members that holds everything it carries
in alignment — rigid where it must be, open everywhere else. That's the
engine: a structural frame for an argument, where every slide sits on the
same grid, the same palette, the same deliberate layouts. You bring the
meaning; the lattice keeps it straight.

*Style* is the other half, and it means two things at once. The literal one:
this is a styling engine — themes, palettes, one `lattice.css` contract, a
whole deck restyled in a single line. The deeper one: **style as craft.**
Lattice is built on four layers — **Function · Form · Substance · Finish** —
and that isn't engineering jargon, it's the vocabulary of anyone who makes
things well. A tailor talks about *form*. A shoemaker talks about *finish*.
Take style seriously — the way you'd take a well-made shoe seriously — and
those four words are exactly what it means: *does it work, what's its shape,
what's it made of, how is it finished.*

So **Lattice Style**: structure you can trust, with taste. The frame and the
finish — and it lives where it should, at [lattice.style](https://lattice.style).

> **Documentation:** <https://slidewright.github.io/lattice/> — intro,
> getting started, authoring and theming guides, and the interactive
> [component reference](https://slidewright.github.io/lattice/components/)
> (every layout, themable in any palette). Built from `docs/`; see
> [`docs/README.md`](docs/README.md).

## What you get

- **A renderer.** The bundled `lattice-emulator.js` emits PDF, PPTX, and PNG
  sets (plus an HTML sidecar) from the same source — the output extension picks
  the format, and PPTX/PNG rasterize from the same render as the PDF. `marp-cli`
  remains an alternative path if you already use it. Mermaid diagrams pre-render
  as inline SVG. Code blocks syntax-highlight. Slides are 1280×720.
- **Thirteen palettes.** `indaco` (cool indigo, the default) and `cuoio`
  (warm leather) are the canonical pair, alongside `ardesia`, `atelier`,
  `brina`, `burgundy`, `carbone`, `concrete`, `crepuscolo`, `laguna`,
  `magnolia`, `mustard`, and `onyx` — most with a paired dark-canvas
  variant. Authors pick one in front matter (`theme: indaco`). Each
  supplies pale fills, saturated brand borders, and dark ink; saturated
  red is reserved for alarm states. WCAG AA verified across every
  text-bearing surface. Preview them all in the
  [component reference](https://slidewright.github.io/lattice/components/).
- **53 layouts.** Title, divider, content, diagram, cards-grid, compare-prose,
  quote, timeline-list, big-number, split-panel, verdict-grid, more.
  Each layout has an authoring contract documented in [design/skill.md](design/skill.md).
- **Mermaid integration.** All 25 renderable Mermaid diagram types are
  themed to match the deck. Per-diagram CSS overrides for the nine that
  ignore `themeVariables`. Documented in [design/theming.md](design/theming.md).

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
| `@slidewright/lattice/default` | `dist/lattice-default.css` | **zero-config default** — engine + the cuoio palette, flattened into one drop-in stylesheet |
| `@slidewright/lattice/default/min` | `dist/lattice-default.min.css` | minified zero-config default — the leanest single-file `<link>` for browser use |
| `@slidewright/lattice/config` | `marp.config.js` | the marp-cli config (registers the theme set) |
| `@slidewright/lattice/runtime` | `dist/lattice-runtime.js` | the marp-vscode-preview / web-export runtime transforms |
| `@slidewright/lattice/runtime/min` | `dist/lattice-runtime.min.js` | minified runtime — production / CDN drop-in (no inline source map) |
| `@slidewright/lattice/css` | `dist/lattice.css` | the engine bundle — **palette-blind** (layouts only, no colour tokens) |
| `@slidewright/lattice/css/min` | `dist/lattice.min.css` | minified engine bundle (Marp `@theme`/`@size` directives preserved) |
| `@slidewright/lattice/themes/<name>.css` | `themes/<name>.css` | one palette — a **Marp theme file**, not a standalone stylesheet |
| `lattice` bin · `@slidewright/lattice` (`main`/`.`) | `dist/lattice-emulator.js` | the bundled CLI renderer / PDF exporter (`npx lattice deck.md out.pdf`) |
| `@slidewright/lattice/min` | `dist/lattice-emulator.min.js` | minified CLI bundle (shebang + executable bit preserved); the bin/main stays the unminified file |

The `.min` variants are byte-for-byte render-faithful to their unminified
siblings — the CSS minifier preserves Marp's directive comments, so a
minified bundle still registers as a theme. Pick the unminified files for
debugging (the CLI/runtime carry source maps; the CSS keeps comments) and
the `.min` files for production / CDN delivery.

**The default theme is cuoio** (warm leather/cream). In a Marp deck,
`theme: cuoio` selects it; with no theme chosen, decks render against the
engine's neutral built-in tokens. For a non-Marp / browser context, drop
in the flattened default — a single self-contained stylesheet:

```html
<link rel="stylesheet" href="…/@slidewright/lattice/default">  <!-- engine + cuoio -->
```

> **Per-theme files are Marp theme files, not drop-in CSS.** Each declares
> `@theme <name>` and pulls the engine in by name (`@import 'lattice'`),
> which only Marp's theme set resolves — a browser `<link>` to a *theme
> file* can't resolve it, and `dist/lattice.css` alone is palette-blind.
> The flattened `dist/lattice-default.css` is the exception: its
> `@import` is resolved at build time, so it is genuinely browser-droppable.
> Only cuoio is flattened today; other palettes would each be a new
> flatten target.

The published tarball ships only what these entry points need — engine
source, `dist/`, `themes/`, and the authoring docs. Regression-baseline
PDFs and per-bucket galleries stay in git but are excluded from the
package.

### Render to PDF, PPTX, or PNG

The bundled `lattice` bin (the emulator) emits all of them from one source —
the **output extension picks the format** — plus an HTML sidecar:

```sh
lattice deck.md deck.pdf     # vector PDF, selectable text
lattice deck.md deck.pptx    # PowerPoint, one full-bleed image per slide
lattice deck.md deck.png     # one PNG per slide → deck.001.png, deck.002.png, …
```

PPTX and PNG rasterize from the same headless-Chromium render as the PDF, so
every format is pixel-identical. Rendering needs Chromium — set `CHROME_PATH`
if no system Chrome is found.

> **PPTX note.** Slides export as one full-bleed *image* per slide (not editable
> text/shapes) — the same model marp uses for its default PPTX. Editable export
> (marp's `--pptx-editable`, which needs LibreOffice) is not included.

Already use marp-cli? It still works against the shipped config:

```sh
CONFIG=node_modules/@slidewright/lattice/marp.config.js
npx marp deck.md --config-file $CONFIG --pptx -o deck.pptx   # --pdf, --html, --images png
```

## Render the example galleries

```sh
node lattice-emulator.js examples/gallery.md examples/gallery.pdf
node lattice-emulator.js examples/gallery-mermaid.md examples/gallery-mermaid.pdf
```

The two galleries are committed to `examples/` as ground-truth fixtures
for what the renderer produces. Re-rendering them after an engine or
palette change should produce visually equivalent output; they're the
regression check for the project.

For other delivery formats from the same source, just change the output
extension — the deck's `theme:` front matter selects the palette:

```sh
node lattice-emulator.js deck.md deck.pptx   # PowerPoint (image slides)
node lattice-emulator.js deck.md deck.png    # → deck.001.png, deck.002.png, …
```

PNG slides rasterize at 2× the slide dimensions (2560×1440 from 1280×720) —
sharp on retina displays and projectors. PDF is vector throughout (text,
SVG-rendered Mermaid, code highlighting); the 2× scale only affects the raster
(PNG/PPTX) paths.

The full pipeline (Mermaid pre-rendering, image conversion, PPTX
assembly) lives in [engineering/pipeline.md](engineering/pipeline.md).

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
[design/theming.md](design/theming.md) for the variable contract and the per-diagram
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
│   ├── lattice-default.css    # engine + cuoio, flattened drop-in stylesheet
│   ├── lattice-runtime.js     # browser runtime BUNDLE — generated by esbuild
│   │                          # from lib/runtime/index.js + lib/transformers/*.
│   ├── lattice-emulator.js    # bundled CLI (the `lattice` bin/main) — esbuild
│   │                          # from the repo-root lattice-emulator.js source.
│   │                          # Rebuild everything: npm run build
│   ├── README.md              # generated index of this folder
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
├── engineering/               # internal engineering references
│   ├── architecture.md        # engine internals
│   ├── workflow.md            # branching, commits, three-renderer gate
│   ├── development.md         # tooling, tests, lint, CI, hooks
│   ├── gotchas.md             # symptom-keyed fixes — read first when something breaks
│   ├── cascade.md, mermaid.md, pipeline.md, typography.md, treatments.md, audit.md
│   └── decisions/             # durable investigation notes + design proposals
│
├── design/                    # design system + authoring contract
│   ├── design-system.md       # the canonical Function·Form·Substance·Finish model
│   ├── skill.md               # deck authoring contract (layouts + directives)
│   ├── theming.md             # palette + Mermaid theming
│   ├── editorial.md           # prose rules
│   └── design-principles.md   # visual hierarchy principles
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

## The Lattice Style project

Lattice is the engine at the core of **Lattice Style**, a project that
publishes tools for crafting deck-quality documents. The repositories
(current and planned, hosted at
[github.com/slidewright](https://github.com/slidewright) until the org
handle catches up to the name):

- **lattice** — this repo. The deck rendering engine + default palette.
- **SlideWright** — the desktop app (Tauri). Wraps the Lattice engine
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
