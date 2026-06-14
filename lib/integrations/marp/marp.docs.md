# marp

Lattice's integration with [Marp](https://marp.app/) — the framework
Lattice is built on. Marp is the slide engine: it parses the slide
syntax (`---` separators), runs registered themes, calls plugins, and
emits HTML/PDF/PPTX/PNG.

Unlike `mermaid` / `highlight-js` / `katex` which are *optional*
integrations for specific features, **Marp is the foundation**. Every
component, every render path, every slide assumes Marp. This folder
holds Lattice's adapter layer — the small surface where Lattice's
conventions meet Marp's defaults.

**External dep:** `@marp-team/marp-cli` — **BYO** (no longer bundled; P4 retired
it). Install it yourself to render via `marp.config.js`; the owned engine
(`lib/engine` / the `lattice` CLI) needs no marp.

**Files in this folder:**

| File | What it implements |
|---|---|
| `marp.scaffold.css` | Marp Core override layer. Two rules using `!important` to win the cascade fight against Marp's scaffold defaults that load after the theme. Lives in `@layer scaffold`. |

Two related files live elsewhere (intentionally, with reason):

- **`lib/_theme.css`** — declares `@theme lattice` + `@size` directives
  at the top of the bundle, registering `lattice.css` as a Marp theme.
  Stays at `lib/` root because it's about the bundle's identity rather
  than Marp integration plumbing.
- **`marp.config.js`** at the repo root — Marp's config file (theme
  registration, render plugins, html allowlist, math enable, etc.).
  Marp expects to find it at the repo root by convention. Could in
  principle move to `lib/integrations/marp/marp.config.js` (Marp
  accepts a `--config` flag), but the move was deferred from Phase 5
  to avoid touching CI / build surface beyond docs scope.

---

## `marp.scaffold.css` — the override layer

Two CSS rules, both using `!important`:

1. **Header/footer paragraph reset.** Marp Core's default `p { margin }`
   stomps Lattice's chrome alignment. We re-assert font/size/margins
   so the header and footer render with Lattice's mono label
   typography.

2. **`section::after` positioning.** Marp's scaffold sets
   `padding: inherit` on the pagination pseudo-element, which inherits
   the section's bottom padding (~88px) and pushes the page number
   above where Lattice wants it. We re-position with absolute
   coordinates.

Both rules use `!important` because Marp Core's scaffold CSS loads
AFTER the theme in the cascade, so equal-specificity rules lose to
Marp. `@layer scaffold` flips cascade order in our favor when
`!important` is present.

This is the only file in Lattice that uses `!important` for
non-pedagogical reasons. Every other override works via specificity or
cascade order. The Marp Core scaffold is the exception that forces
the exception.

---

## Lattice as a Marp theme

The bundled `lattice.css` IS a Marp theme — specifically a palette-less
theme named "lattice". Authors *could* set `theme: lattice` in deck
front matter and render structurally-correct slides with no colors.
Useful for verifying palette `var()` fallback behavior; not used in
production.

The palette themes (`themes/indaco.css`, `themes/cuoio.css`, and 20+
more) each:
1. Declare their own `@theme <name>` directive at the top.
2. Declare their own `@size` directives (Marp doesn't propagate these
   through `@import`).
3. Do `@import 'lattice';` to pull in the structural layer.
4. Define palette tokens that override or supplement Lattice's
   structural tokens.

The chain:

```
themes/indaco.css   declares @theme indaco; imports 'lattice' (which is registered as lattice.css)
                                                  ↓
lattice.css         (bundled output) declares @theme lattice via lib/_theme.css
                                                  ↓
                    contains all of: lib/base/, lib/shared/,
                                     lib/integrations/{mermaid,highlight-js,marp}/,
                                     lib/components/chart/_chart-family/chart-family.css,
                                     and every lib/components/<bucket>/<name>/<name>.styles.css
```

Marp registers `lattice.css` and all the palette themes via
`marp.config.js`'s `themeSet` array. Authors pick a palette via
front-matter `theme:` directive.

---

## What stays in `marp.config.js`

The config file at the repo root carries:

- **`themeSet`**: list of `.css` files Marp registers as themes
  (lattice.css + every palette).
- **`html: true`**: allow raw HTML in markdown (Lattice uses it
  sparingly for slot-label lifts).
- **`allowLocalFiles: true`**: allow images / scripts from local paths.
- **`imageScale: 1`**: default PNG rasterization scale (3× via CLI
  flag for retina output).
- **`math`**: KaTeX enabled.
- **Engine plugins** that wrap Marp's `render` output:
  - `deckClassPropagate` — propagates front-matter `class:` to every
    section (Marp's native semantic discards it on per-slide `_class:`).
    sections at build time (theme reads via `attr()`).
  - `applyChartFamilyToHtml` — the chart-family post-processor.
  - `applySplitPanelsToHtml` — the split-list post-processor.

Plus the highlight.js + Mermaid registrations described in their own
integration docs.

---

## See also

- `lib/_theme.css` — the `@theme lattice` declaration that turns the
  bundle into a registered Marp theme.
- `themes/README.md` — palette authoring contract.
- `design/theming.md` — how palettes map their tokens onto Lattice's
  structural surface.
- `marp.config.js` — Marp's runtime config (lives at repo root).
- Marp upstream: <https://marpit.marp.app/> for the Marpit core spec
  Lattice extends.
