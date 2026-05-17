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

`Lattice · Discreet brand mark in one line of front matter`

A grayscale watermark in the top-right corner — brightness adapts to dark and light canvases without per-author variants.

---

<!-- _class: subtopic -->

`How it works`

## A filter, not a fork.

CSS desaturates the injected image to a faint grayscale watermark and inverts the brightness on dark-canvas layouts so the mark stays legible on every theme.

---

<!-- _class: content -->

## How it lands in the DOM.

A build-stage rewriter injects an `img` element with class `deck-logo` as the first child of every selected section — same shape Marp uses for `header` and `footer`. CSS positions it absolutely top-right and applies the filter chain. A real DOM element rather than a `::before` pseudo is what lets the logo compose with `::before`-based chrome like the SVG-mark backgrounds.

```yaml
logo: ./acme-logo.svg
logo-style: auto | brand          # optional, default `auto`
logo-on: all | title              # optional, default `all`
```

Build-time only. The directive does not render in the marp-vscode preview pane because the extension does not load workspace `marp.config.js` plugins.

---

<!-- _class: compare-prose -->

## When to use which style.

- Auto · default
  - A faint grayscale watermark, brightness inverted on dark-canvas layouts so the mark stays legible on every theme. Best for marks you want present but not loud — a watermark, not a statement.
- Brand
  - Original colours preserved on a soft surface plate. Best for logos whose colours carry meaning — government insignia, university crests, marks that *are* the brand.

---

<!-- _class: content bg-corner-tl bg-edge-right -->

## Layered gradient background, logo on top.

`bg-corner-tl` adds a top-left radial glow; `bg-edge-right` adds a right-edge linear wash; both compose into the section's `background-image` slot. The watermark sits on top, darkened automatically because the canvas is light — same SVG, same rule, the filter just inverts brightness based on the layout class.

---

<!-- _class: content dark bg-vignette -->

## Same logo on a dark canvas.

`dark` flips the section to a dark background; `bg-vignette` adds a subtle edge darkening. The watermark inverts its brightness automatically — same SVG, same rule, the filter just brightens instead of darkening because the layout class changed. No second asset, no per-theme variant.

---

<!-- _class: closing -->
<!-- _paginate: false -->

`Lattice · custom logo`

## One line of front matter. One CSS rule. Every theme.
