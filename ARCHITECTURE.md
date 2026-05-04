# Architecture

How Lattice works under the hood. Read this when you want to maintain
the engine, fork it, or understand a build failure. Most deck authors
don't need to read this.

## Why Marp emulation, not Marp itself

Lattice ships its own renderer (`lattice.js`) instead of calling the
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

```
deck.md  ─┐
          │
themes/   │
  indaco. │
  css   ──┼─→  parsePaletteVars()  ──→  resolveMermaidThemeVars()
          │              │                       │
lattice.  │              │                       └─→  themeVariables
  css     │              └─→  paletteCSS              ─┐
          │                          │                 │
          │                          │                 │
          │  splitOnSentinel() ──→ themeCSS ─────────┐ │
          │              │                            │ │
          ▼              │                            │ │
Mermaid blocks ──────────┴─→ %%{init}%% injection ──→ │ │
  in deck                                              │ │
       │                                               │ │
       └─→ mmdc ──→ inline SVGs ──→ markdown with SVGs┐│ │
                                                       ││ │
       lattice.css + paletteCSS ──→ <style> ────────│┴─┘
                                                       │
                                                       ▼
                                              HTML emulating Marp
                                                       │
                                                       ▼
                                              puppeteer print PDF
```

The renderer is a single Node script. No framework, no plugins, ~1000
lines. Its job is:

1. Parse argv: `lattice.js source.md theme.css output.pdf [palette]`.
2. Read the palette file. Parse `:root { ... }` blocks into a flat
   variable map. Split the file on the Mermaid sentinel comment;
   everything after is the per-diagram Mermaid CSS.
3. For each ` ```mermaid ` block in the source: prepend a `%%{init}%%`
   directive containing the resolved theme variables and Mermaid CSS.
   Run `mmdc` on the block. Replace the fence with a `<div>` wrapping
   the rendered SVG.
4. Parse the slides from the markdown (split on `---`). For each
   slide: read frontmatter directives (`_class`, `_paginate`, etc.),
   render the body via a small markdown-it-compatible converter, apply
   per-class scaffolding (header, footer, pagination ::after).
   Structured layouts (`cards-grid`, `cards-stack`, `compare-prose`,
   `featured`, `split-panel`, `stats`, etc. — full list in
   [references/templates.md](references/templates.md#layout-inventory-structured-vs-unstructured))
   rewrite their `ul`/`ol` body into purpose-built DOM the CSS targets;
   unstructured layouts pass through as plain semantic HTML.
5. Emit one HTML file. Inline `<style>` contains the palette CSS and
   the Marp theme CSS, in that order.
6. Hand the HTML to Puppeteer. Print to PDF at 1280×720 with the
   exact slide dimensions.

## The runtime path

`lattice-runtime.js` is the browser-side complement. Same theme
resolution logic, but operates against the live DOM:

1. On load, read CSS custom properties from `document.documentElement`
   (which has the palette's `:root` block applied via the loaded
   `<link rel=stylesheet>`). The same `MERMAID_VAR_MAP` from `lattice.js`
   resolves against these.
2. Find the Mermaid CSS section by walking `document.styleSheets` for a
   stylesheet whose source contains the sentinel comment. If the palette
   is a `<link>` (external CSS), fall back to fetching the file.
3. Watch the DOM for `<pre><code class="language-mermaid">` and
   `<marp-pre><code>` blocks (Marp preview emits the latter). Upgrade
   them to `<div class="mermaid">` so Mermaid's own renderer picks them
   up. Call `mermaid.run()`.
4. A MutationObserver re-runs steps 2-3 when the live preview re-renders
   the slide DOM after a markdown edit.

## Why two paths

The build path produces canonical PDFs. The runtime path produces live
HTML preview in editors that support Marp (VS Code, etc.). Both consume
the same palette file. Both produce visually equivalent output.

A theme author edits one file (`themes/<n>.css`); both paths update.
The structural mapping (`MERMAID_VAR_MAP`) is duplicated between
`lattice.js` and `lattice-runtime.js` because they target different
runtime environments — Node and browser, respectively. The maps are
verified byte-equivalent in the smoke test.

## The Mermaid theming wall

Mermaid's theming API has known limits we worked around:

**The `%%{init}%%` parser silently drops `themeCSS` containing CSS
comments.** Discovered during development: a `/* ... */` block anywhere
in `themeCSS` causes the parser to silently discard the entire field.
The renderer strips comments before injection. The palette source can
have comments (and does); they just don't reach the rendered SVG.

**The `>` child combinator breaks the parser the same way.** Use
descendant selectors only in the Mermaid CSS section.

**Some diagrams ignore `themeVariables` entirely.** Journey hardcodes
X11 named colors. C4 hardcodes a Plant-spec palette. Mindmap reads
cScale verbatim. ZenUML doesn't render at all under `mmdc` (it emits
HTML/Tailwind classes that need an external stylesheet). The per-diagram
Mermaid CSS section in `themes/indaco.css` patches the gaps.

## File layout, from the renderer's point of view

The renderer expects this layout relative to its own location:

```
lattice.js
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
references. See [SKILL.md](SKILL.md) for the existing layouts and
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
