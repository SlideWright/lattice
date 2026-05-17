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

`Lattice · A discreet brand mark in one line of front matter.`

A grayscale watermark in the top-right corner — auto-adapting brightness so the mark stays legible on dark or light canvases without per-author variants.

---

<!-- _class: subtopic -->

## How it works.

A build-stage rewriter injects an `img` element with class `deck-logo` as the first child of every selected section. CSS desaturates it via `filter: grayscale(1)` and tunes brightness per canvas: darker on light themes, brighter on dark themes.

One CSS rule covers SVG, PNG, and JPEG. No per-author light/dark variants required.

---

<!-- _class: subtopic -->

## How it lands in the DOM.

Same shape Marp uses for `header` and `footer`: a real DOM element, absolutely positioned, removed from flow. A real element rather than a `::before` pseudo is what lets the logo compose with `::before`-based chrome like the SVG-mark backgrounds (`bg-orbit-br`, `bg-grid-micro`, `bg-asterisk-scatter`). Each decoration paints on its own layer.

```yaml
logo: ./acme-logo.svg
logo-style: auto | brand          # optional, default `auto`
logo-on: all | title              # optional, default `all`
```

⚠️ Build-time only. The directive does **not** render in the marp-vscode preview pane because the extension doesn't load workspace `marp.config.js` plugins.

---

<!-- _class: compare-prose -->

## When to use which style.

- Auto · default
  - A faint grayscale watermark, brightness inverted on dark-canvas layouts so the mark stays legible on every theme. Best for marks you want present but not loud — a watermark, not a statement.
- Brand
  - Original colours preserved on a soft surface plate. Best for logos whose colours carry meaning — government insignia, university crests, marks that *are* the brand.

---

<!-- _class: bg-sweep -->

## Body slide on a light canvas with `bg-sweep`.

The watermark darkens automatically on light canvases. Same SVG, same rule — the filter just inverts brightness based on the layout class.

Gradient backgrounds (`bg-sweep`, `bg-spotlight`, `bg-vignette`, the corner gradients) all compose cleanly with the logo because they paint on the section background, not through `::before`.

---

<!-- _class: bg-orbit-br -->

## SVG-mark background and logo coexist.

`bg-orbit-br` draws its concentric-ring accent through `section::before`. Earlier iterations of this feature put the logo on `::before` too — and the two collided. The current implementation injects the logo as a real `img` element, so it sits on a different render layer.

Every `bg-` class — gradients and SVG marks alike — composes with the logo.

---

<!-- _class: closing -->
<!-- _paginate: false -->

`Lattice · custom logo`

## One line of front matter. One CSS rule. Every theme.
