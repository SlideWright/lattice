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

## Two ways to author.

**Native form** — uses only Marp built-in directives, so it renders identically in marp-cli, lattice-emulator, and the marp-vscode preview pane.

```yaml
class: with-logo
style: ':root{--deck-logo:url("./acme-logo.svg")}'
```

**Convenience directive** — one line, expands to the native form at build time.

```yaml
logo: ./acme-logo.svg
```

Caveat: the convenience directive does **not** render in the marp-vscode preview, because the extension doesn't load workspace `marp.config.js` plugins. For live-preview parity, use the native form.

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

<!-- _class: bg-corner-tr -->

## Corner gradient + logo coexist.

`bg-corner-tr` paints a soft accent glow in the top-right corner of this slide. The logo sits on top of it without contest — the gradient is rendered via `background-image` on the section, the logo silhouette via `::before`. Two layers, no fight.

**Caveat:** SVG-mark backgrounds (`bg-orbit-br`, `bg-asterisk-scatter`, `bg-grid-micro`, etc.) draw their accents through `::before` too. On a slide with both `with-logo` and one of those marks, only one wins — the modifier declared later in the cascade.

---

<!-- _class: with-logo-brand -->

## With the `brand` modifier.

Add `with-logo-brand` to a slide's class list and the silhouette flips to a full-colour rendering on a soft, theme-aware plate. The two-tone chevrons keep their hue; the plate softens contrast so the mark sits intentionally on whatever canvas it lands on.

Use sparingly — `auto` is the default for a reason.

---

<!-- _class: closing -->
<!-- _paginate: false -->

`Lattice · custom logo`

## Two lines of front matter. One CSS rule. Every theme.
