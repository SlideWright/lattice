# Sketch finish — a hand-drawn skin for Lattice

**Date:** 2026-06-11
**Status:** shipped (v1) — engine modifier + `carta` palette
**Files:** `lib/base/base.sketch.css`, `lib/base/base.tokens.css` (font
tokens + `@import`), `themes/carta.css`, `themes/carta-dark.css`,
`examples/sketch.md`, `lib/base/base.docs.md` (`### sketch`).

## What and why

A "stencil sketch" / hand-drawn aesthetic (the Rough.js / Excalidraw /
tldraw register) applied deck-wide. The request: it should live in the
engine (`lattice.css`) and be **colourable by any theme**, not be a
one-off theme.

That maps exactly onto the Function · Form · Substance · **Finish** model.
A sketch look changes **type and box geometry, not colour**, so:

- It cannot *be* a theme — themes in Lattice are colour-tokens only and
  carry no geometry or fonts.
- It belongs in the engine as a palette-blind **Finish modifier** (a class,
  like `dark`/`numbered`), every stroke through `var(--token)`.
- It pairs with a curated palette for the "start with curated colours"
  half of the ask. Hence two artifacts: the `sketch` modifier (engine)
  + the `carta` paper/ink palette (theme). Compose: `theme: carta` +
  `class: sketch`. `theme: indaco class: sketch` gives the same hand in
  blue.

This mirrors the existing treatments (`tint-*`/`mark-*`): engine-level,
palette-blind, class-applied. Sketch is their heavier sibling — it reaches
the content zone (type + card boxes) rather than staying peripheral.

## The load-bearing constraint: PDF fidelity

Lattice ships boardroom **PDFs**, and the codebase has a long documented
history that SVG `mask`/`filter` effects render unreliably through
Chromium → Apple PDFKit (see `engineering/gotchas.md`, the treatments
rendering notes). The *authentic* rough.js look depends on exactly that
risky primitive — `feTurbulence` + `feDisplacementMap` to wobble every
edge.

**Finding (validated in the spike):** an SVG displacement `filter` on
slide elements renders correctly **on screen** but **collapses Marp's
print-scale transform** — the whole slide shrinks into a corner of the
PDF page. Confirmed with a Puppeteer DOM diagnostic: the live layout was
correct (grid 750×321), only the *printed* page was wrong. So the roughen
filter is **out** for Lattice's PDF-first mission.

What ships instead is a **PDF-safe vector core**:

1. **Handwriting type** — `--sketch-font-display` (Caveat) on headings,
   `--sketch-font-body` (Shantell Sans) on prose. The single biggest
   signal, and fully reliable (fonts render natively).
2. **Hand-drawn boxes** — the asymmetric `border-radius`
   (`255px 12px 225px 15px / 15px 225px 15px 255px`) trick + an offset
   ink `box-shadow` + a per-`nth-child` micro-rotation so no two cards
   sit identically.
3. **Wobbly heading rule** — an asymmetric-radius `border-bottom` under
   the slide `h2`.

Intensity ladder we evaluated (rendered spike, four fonts × three tiers):
**headings-sketch** (body stays clean), **full handwriting** (the shipped
default), and **roughen filter** (cut, per above). The shipped `sketch`
is full handwriting; `sketch-clean-body` is the headings-only opt-out.

## Font choice

Default is full handwriting, so **body legibility became the dominant
criterion** (the font carries whole paragraphs). Scored Caveat / Kalam /
Architects Daughter / Shantell Sans:

- **Architects Daughter** — single weight (400 only); no real bold.
  Disqualified for a headings+body default.
- **Caveat** — strongest hand-drawn *warmth*; script tires over a full
  body slide. Best as the **display** face.
- **Shantell Sans** — a designed-for-UI hand-sans, full weight axis,
  most legible at body. Best as the **body** face.

Resolution: a **two-token pairing** — Caveat display + Shantell Sans body
— behind `--sketch-font-display` / `--sketch-font-body`, so dropping to a
single font is a one-line change.

## carta palette

A warm reskin of `indaco`: paper surfaces, warm near-black/sepia ink, a
fountain-pen ink-blue accent, warm-charcoal dark canvas. The categorical
(`--cN`), chart, and semantic token blocks are inherited verbatim from
indaco (contrast-proven) so diagrams stay legible. **Warming the
categorical fills to match the paper is deferred polish.**

## Deferred follow-ups

- **Hand-drawn chart/diagram *marks*.** The finish is CSS + fonts, so it
  reskins headings, HTML legends, and card text but cannot touch a chart's
  SVG geometry — wedges/bars/lines keep clean marks (a legible, defensible
  v1). Making the marks themselves hand-drawn needs per-chart work in the
  chart-family SVG engine (rough paths), independent of this modifier.
- **Warm categorical fills for carta.**
- **Mark placement / second hand font option** if authors want variety.

## Sandbox note (rendering this here)

In the cloud sandbox, Chromium cannot fetch the Google-Fonts CDN (TLS
proxy rejects the cert), so *any* marp-cli render — sketch or not — falls
back to system fonts. The committed `examples/sketch.pdf` was rendered via
a Puppeteer pipeline that embeds the woff2 files locally (and waits on
`document.fonts.ready` + force-loads every face, since Marp's bespoke
template lazy-loads fonts only for the active slide). In production the two
hand fonts ride the engine's existing Google-Fonts `@import` unchanged.
