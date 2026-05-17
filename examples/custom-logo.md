---
marp: true
theme: indaco
size: hd
paginate: true
logo: ./acme-logo.svg
---

<!-- _class: title -->
<!-- _paginate: false -->

# Custom Logo

`Lattice · A discreet brand mark in two lines of front matter.`

A theme-aware silhouette in the top-right corner — auto-adapting to dark and light canvases without per-author variants.

---

<!-- _class: subtopic -->

## How it works.

The image becomes a CSS `mask-image`. Lattice paints the silhouette in `currentColor` at watermark opacity, so the mark inherits whatever ink the active slide uses — white on the dark title canvas, dark on body slides over a light theme.

One rule in `lattice.css` covers SVG, PNG, and JPEG. No per-author light/dark variants required.

---

<!-- _class: subtopic -->

## How it lands in the DOM.

A small Marpit-stage rewriter injects `<img class="deck-logo" src="…">` as the first child of every selected `<section>` — same shape Marp uses for `<header>` and `<footer>`. CSS positions it absolutely top-right and applies the silhouette via `mask-image` on the img's own src.

A real DOM element (rather than a `::before` pseudo) is what lets the logo compose with `::before`-based chrome like `bg-orbit-br`, `bg-grid-micro`, or `bg-asterisk-scatter`. Each decoration paints on its own layer.

```yaml
logo: ./acme-logo.svg
logo-style: auto | brand          # optional, default `auto`
logo-on: all | title              # optional, default `all`
```

⚠️ Build-time only — the directive does **not** render in the marp-vscode preview, because the extension doesn't load workspace `marp.config.js` plugins. The published-HTML path (`lattice-runtime.js`) restores it for any deck served from a web origin.

---

<!-- _class: compare-prose -->

## When to use which style.

- **`auto` (default).** Silhouette painted in `currentColor` at 15% opacity. Quiet brand chrome that harmonises with any theme. Best for marks you want present but not loud — a watermark, not a statement.
- **`brand`.** Original colours preserved on a soft surface plate (`var(--bg-alt)` at 70% with a slight backdrop blur). Best for logos whose colours carry meaning — government insignia, university crests, marks that *are* the brand.

---

<!-- _class: bg-sweep -->

## Body slide on a light canvas with `bg-sweep`.

The watermark renders here too, painted in `currentColor` against the body canvas — typically dark ink on a light background.

Same SVG. Same rule. Different tone. The mask gets recoloured by the cascade, so every theme is covered without authoring a second asset. Gradient backgrounds (`bg-sweep`, `bg-spotlight`, `bg-corner-*`, `bg-vignette`, …) compose cleanly with the logo.

---

<!-- _class: bg-orbit-br -->

## SVG-mark background + logo coexist.

`bg-orbit-br` draws its concentric-ring accent through `section::before`. Earlier iterations of this feature put the logo on `::before` too — and the two collided. The current implementation injects the logo as a real `<img>` element, so it sits on a different render layer and the two compose without contest.

Every `bg-*` class — gradients (`bg-sweep`, `bg-spotlight`, `bg-corner-*`, `bg-vignette`) and SVG marks (`bg-orbit-br`, `bg-asterisk-scatter`, `bg-grid-micro`, `bg-chevron-bl`, …) — composes with the logo.

---

---

<!-- _class: closing -->
<!-- _paginate: false -->

`Lattice · custom logo`

## Two lines of front matter. One CSS rule. Every theme.
