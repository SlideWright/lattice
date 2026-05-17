# Architecture

How Lattice works under the hood. Read this when you want to maintain
the engine, fork it, or understand a build failure. Most deck authors
don't need to read this.

> Debugging something subtle? Check
> [references/gotchas.md](./references/gotchas.md) first. It tracks the
> hacks, workarounds, and dependency quirks (Marpit, Mermaid, Chromium,
> marp-vscode) that the engine is structured around — many of which
> aren't self-documenting in the code.

## Why Marp emulation, not Marp itself

Lattice ships its own renderer (`lattice-emulator.js`) instead of calling the
Marp CLI for two reasons:

**Mermaid pre-rendering.** Marp CLI doesn't render Mermaid diagrams as
SVG; it leaves them as `<pre><code class="language-mermaid">` blocks
that the consuming environment (browser, viewer) is supposed to render
at view time. For PDF output that's a problem — the PDF is the final
artifact, there's no later environment. So Lattice intercepts every
Mermaid block, runs it through `mmdc` (the Mermaid CLI) to get an SVG,
and inlines the SVG into the slide HTML before the PDF render.

**Theme injection.** Mermaid's theming requires a `%%{init}%%` directive
inside each fenced block. Doing that manually in every diagram is
tedious. Lattice injects the directive automatically based on the
active palette (loaded from `themes/<n>.css`), so deck authors write
plain Mermaid without theme prefixes.

The renderer emulates Marp's HTML structure faithfully — the `<section>`
wrapper, the `data-marpit-pagination` attribute, the slide chrome
(`<header>`, `<footer>`, pagination via `::after`) — so any CSS written
for Marp works against Lattice output.

## The build pipeline

```text
deck.md  ─┐
          │
themes/   │
  indaco. │
  css   ──┼─→  parsePaletteVars()  ──→  resolveMermaidThemeVars()
          │              │                       │
lattice.  │              │                       └─→  themeVariables
  css     │              └─→  paletteCSS              ─┐
  (incl.  │                          │                 │
  DIAGRAM │                          │                 │
  OVER-   │                          ▼                 │
  RIDES   │                                            │
  section)│                                            │
          ▼                                            │
Mermaid blocks ──→ %%{init: { themeVariables } }%% ──→ │
  in deck                                              │
       │                                               │
       └─→ mmdc ──→ inline SVGs ──→ markdown with SVGs─┤
                                                       │
       lattice.css + paletteCSS ──→ <style> ──────────┘
                                                       │
                                                       ▼
                                              HTML emulating Marp
                                                       │
                                                       ▼
                                              puppeteer print PDF
```

The renderer is a single Node script. No framework, no plugins, ~1000
lines. Its job is:

1. Parse argv: `lattice-emulator.js source.md theme.css output.pdf [palette]`.
2. Read the palette file. Parse `:root { ... }` blocks into a flat
   variable map.
3. For each ` ```mermaid ` block in the source: prepend a `%%{init}%%`
   directive containing the resolved theme variables (no `themeCSS` —
   per-diagram CSS reaches the inline SVG via the host page cascade).
   Run `mmdc` on the block. Replace the fence with a `<div>` wrapping
   the rendered SVG.
4. Parse the slides from the markdown (split on `---`). For each
   slide: read frontmatter directives (`_class`, `_paginate`, etc.),
   render the body via a small markdown-it-compatible converter, apply
   per-class scaffolding (header, footer, pagination ::after).
   Structured layouts (`cards-grid`, `cards-stack`, `compare-prose`,
   `featured`, `split-list`, `stats`, etc. — full list below in
   [Layout categories: structured vs unstructured](#layout-categories-structured-vs-unstructured))
   rewrite their `ul`/`ol` body into purpose-built DOM the CSS targets;
   unstructured layouts pass through as plain semantic HTML.
5. Emit one HTML file. Inline `<style>` contains the palette CSS and
   the Marp theme CSS, in that order.
6. Hand the HTML to Puppeteer. Print to PDF at 1280×720 with the
   exact slide dimensions.

## Layout categories: structured vs unstructured

Every layout falls into one of two categories. The distinction matters
because it changes what the source markdown looks like and where bugs
are most likely to live.

**Structured layouts** are post-processed by `lattice-emulator.js`: a
flat `ul`/`ol` (sometimes with nested children) is rewritten into
purpose-built DOM (`.card`, `.stat-item`, `.vcard`, `.feat-card`,
`.compare-prose-inner`, `.panel-left`/`.panel-right`, etc.). The CSS
targets that generated structure. Authors write a list; the
post-processor turns it into the layout.

**Unstructured layouts** are rendered by CSS alone from the semantic
markdown that Marp emits. No DOM rewriting happens — the headings,
paragraphs, and lists you write are the headings, paragraphs, and
lists the CSS styles.

| Category | Classes | Post-processor |
|---|---|---|
| Structured | `cards-grid`, `cards-side`, `cards-stack`, `cards-wide`, `checklist`, `compare-prose`, `compare-code`, `featured`, `list-criteria`, `list-tabular`, `quadrant`, `radar`, `roadmap`, `split-list`, `stats`, `verdict-grid`, `word-cloud` | yes — `lattice-emulator.js` rewrites DOM |
| Unstructured | `title`, `divider`, `subtopic`, `closing`, `content`, `diagram`, `quote`, `list`, `list-steps`, `timeline`, `big-number`, `image`, `code` | no — CSS-only |

Modifiers (`dark`, `mirror`, image-specific `full` / `contain`, etc.)
compose with both categories.

**Authoring implication.** Every structured layout has a single
canonical list shape documented in its component's `<name>.docs.md`.
Deviating from that shape (wrong list type, wrong nesting depth,
missing `**Title.**` marker, etc.) causes the post-processor to fall
back to the raw list rendering, which the CSS does not style. When a
structured slide looks wrong, check the source list shape first.

**Audit implication.** Structured layouts are where
`lattice-emulator.js` and `marp-cli` are most likely to diverge — see
[references/audit.md §11.4](references/audit.md#114-comparison-workflow).
The three-renderer parity gate in the integration tier (running on
`examples/gallery.md`) catches structural drift before merge.

## The runtime path

`lattice-runtime.js` is the browser-side complement. Same theme
resolution logic, but operates against the live DOM:

1. On load, read CSS custom properties from `document.documentElement`
   (which has the palette's `:root` block applied via the loaded
   `<link rel=stylesheet>`). The same `MERMAID_VAR_MAP` shape from
   `lattice-emulator.js` resolves against these — feeding only
   themeVariables, not themeCSS.
2. Watch the DOM for `<pre><code class="language-mermaid">` and
   `<marp-pre><code>` blocks (Marp preview emits the latter). Upgrade
   them to `<div class="mermaid">` so Mermaid's own renderer picks them
   up. Call `mermaid.run()`.
3. A MutationObserver re-runs step 2 when the live preview re-renders
   the slide DOM after a markdown edit. The DIAGRAM OVERRIDES section
   of `lattice.css` is already loaded as a page stylesheet, so the
   rules cascade onto the in-DOM SVG without any per-diagram injection.

## Why two paths

The build path produces canonical PDFs. The runtime path produces live
HTML preview in editors that support Marp (VS Code, etc.). Both consume
the same palette file. Both produce visually equivalent output.

A theme author edits one file (`themes/<n>.css`); both paths update.
The structural mapping (`MERMAID_VAR_MAP`) is duplicated between
`lattice-emulator.js` and `lattice-runtime.js` because they target different
runtime environments — Node and browser, respectively. The maps are
verified byte-equivalent in the smoke test.

## The Mermaid theming wall

Mermaid's theming API has known limits we work around:

**Some diagrams ignore `themeVariables` entirely.** Journey hardcodes
X11 named colors. C4 hardcodes a Plant-spec palette. Mindmap reads
cScale verbatim. ZenUML doesn't render at all under `mmdc` (it emits
HTML/Tailwind classes that need an external stylesheet). The DIAGRAM
OVERRIDES section at the bottom of `lattice.css` patches the gaps with
palette-blind CSS rules that consume `var(--diagram-*)`. The rules
reach the inline SVG via the host page cascade — no Mermaid `themeCSS`
init parameter is used (which historically had its own parser quirks
around CSS comments and the `>` combinator; both now moot).

**Mermaid timeline's `section--1` offset.** The timeline renderer uses
`f = r % h - 1` for its section class index, so the first period gets
literal class `section--1` (double-dash, minus-one). Mermaid's
auto-generated CSS doesn't cover that selector; we cover it explicitly
in the DIAGRAM OVERRIDES section, and we also set `cScaleLabel0..11` so
even uncovered text elements fall back to a tested-contrast dark ink
rather than Mermaid's auto-derived white-on-pale.

## File layout, from the renderer's point of view

The renderer expects this layout relative to its own location:

```text
lattice-emulator.js
themes/
  indaco.css     (default palette; or whatever palette is named)
  cuoio.css
lattice.css      (passed as argv[2])
```

The palette file is resolved as `path.join(__dirname, 'themes', name + '.css')`.
The lattice engine theme is whatever path argv[2] points to. Examples and
other files have no fixed location requirement.

## The smoke test

`npm test` (defined in `package.json`) builds both example galleries
and runs a regression check: extract hex colors from each rendered
SVG, compare to the committed baselines. Drift → test fails. The
baselines live at `examples/*.pdf` (the visual ground truth) and a
small fixture directory with per-diagram color sets.

A new theme should pass the smoke test against its own baselines after
they're captured. The smoke test catches the most common breakage
pattern: a CSS variable rename or a Mermaid theme variable name
collision producing colors that no longer match the design intent.

## Adding a new layout

A new slide layout is a CSS class in `lattice.css`. The convention:
the `<!-- _class: foo -->` directive in the markdown maps to a CSS
class `section.foo`, and that class describes the layout. Layouts
should be palette-blind — no hex literals, only `var(--token)` color
references. See [skill.md](skill.md) for the existing layouts and
their authoring contracts.

If a layout needs new color tokens (not just rearrangements of
existing ones), add them to `themes/indaco.css` (and any other palette)
with semantic names
that describe the role rather than the appearance. `--accent-soft`
beats `--pale-blue-bg` because the role survives a palette swap.

## Dependencies

- **Mermaid CLI** (`mmdc`): pre-renders mermaid blocks. Bundled in
  `package.json`. The CLI brings its own Puppeteer/Chromium for
  rendering SVGs.
- **Puppeteer**: prints HTML to PDF. Bundled. Auto-downloads a
  Chromium on install.
- **highlight.js** (optional): syntax highlights code blocks. The
  renderer falls back to monochrome if `hljs` is missing.
- **No build system.** No webpack, no rollup, no TypeScript compiler.
  The renderer is plain Node, the runtime is plain ES2017+ JavaScript,
  the CSS is plain CSS. A future palette author or layout contributor
  shouldn't need a toolchain.
