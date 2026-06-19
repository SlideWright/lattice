---
status: shipped
summary: CSS-3D can't replace SVG for the chart family (PDF zoom rasterizes CSS, vector SVG stays crisp; preserve-3d is inert inside SVG). Decision — SVG stays canonical; CSS 3D is a present-mode-only tilt of the whole SVG. Shipped a kernel substrate — piechart captures an optional per-slice sublist as an inert data-slice/<template> detail payload (byte-identical export) — plus a dispatch depth-aware fix; present-mode wiring + print fallback deferred.
last-updated: 2026-06-19
companion:
  - ../../lib/components/chart/piechart/piechart.docs.md
  - ../../lib/components/chart/_chart-family/chart-family.docs.md
---

# CSS-3D charts — feasibility, and the per-slice-detail slice it produced

**Date:** 2026-06-19 · **Status:** investigation settled; one kernel slice landed,
present-mode wiring + print-fallback deferred.

## Question

Could the chart family be built in **CSS 3D** instead of SVG — for "interactivity
and visual pop", with a flat 2D fallback for PDF?

## What the spikes showed (all rendered, in `.scratch/css3d/`)

1. **"CSS 3D draws more shapes" is a category error.** CSS 3D adds *forms* (flat
   faces oriented in perspective), not 2D *outlines*. Richer outlines come from
   `clip-path: path()` / SVG, not 3D.
2. **CSS can match the family look — gradient and legend included.** A flat CSS pie
   (conic + radial dome) and a CSS radar (hex grid, dashed target, delta markers,
   legend) were near-indistinguishable from the shipped SVG and survived the print
   path. So "it can't look like ours" is **false** — the earlier claim was wrong.
3. **The real SVG edge is generation + scale-independence + export, not looks.**
   The CSS versions are hand-computed trig and dozens of positioned nodes; SVG is
   `points` + `stroke-dasharray` + one `viewBox` that scales geometry *and* text as a
   unit, and is standalone-exportable. Per-chart bytes are a wash (single-digit KB,
   sub-2KB gzipped either way).
4. **CSS 3D on an SVG: tilt the whole sheet — yes; extrude internals — no.** A CSS
   3D transform on the `<svg>` element tilts/pans/zooms the whole vector chart,
   crisp, and it survives the PDF print path. But `transform-style: preserve-3d` is
   inert on SVG *children* — you cannot give the chart internal depth/parallax.
   (Empirically confirmed: `translateZ` on inner wedges does nothing.)
5. **PDF zoom is the decider.** Zoomed into the exported PDF, SVG stays razor-sharp
   (vector path operators) while CSS gradients are **rasterized to a fixed-resolution
   bitmap** and pixelate. For a boardroom-PDF engine that disqualifies CSS for the
   canonical path.

## Decision

**SVG stays canonical** for the chart family (crisp, scalable, exportable, print-true).
**CSS 3D is a present-mode-only flourish**, applied to the *whole* SVG as a restrained
tilt (≤~16° envelope, pointer-follow, damped, snaps back to flat — starts 2D). Never
extrude data marks (it's both impossible inside SVG and a proportion-distorting
dataviz anti-pattern). The interactive value worth shipping is **per-slice detail**, not
3D depth.

## Shipped this branch (kernel substrate + prototype)

- **`buildPieChart`** now captures an optional nested sublist per slice and emits it as
  an inert `<template class="piechart-detail" data-slice="i">`; every wedge `<path>`
  carries `data-slice="i"`. Both render nothing in print → exported PDF/SVG is
  **byte-identical**; a pie without sublists is unchanged. (`piechart.manifest.json`
  documents the `detail` slot.)
- **Dispatch fix:** the piechart branch now extracts its `<ul>` with the depth-aware
  `extractFirstList` (like gantt/kanban/radar) instead of a naive non-greedy
  `/<ul>…<\/ul>/` that truncated at a slice's nested `</ul>`. Detail capture uses the
  same depth-aware extractor (a maker-checker pass caught a first cut that re-used the
  lazy regex and diverged between the string and DOM render paths).
- **Prototype** at docs route `/proto/css3d-pie/` (`docs/src/pages/proto/css3d-pie.astro`,
  one isolated file): flat-by-default pie, restrained CSS-3D tilt of the SVG, per-slice
  popover fed by the **real kernel templates** (rendered through `transformChartSection`
  in frontmatter), responsive (desktop/tablet/mobile bottom-sheet), a11y + reduced-motion.

## Open / deferred

- **Print fallback (export-gated):** how the authored sublist renders *in the static
  PDF* so the detail isn't lost off-screen — changes exported bytes, so it needs export
  sign-off. Until then detail is present-mode only.
- **Production present-mode wiring:** the proto's hydration must become a real module the
  drawing-board present mode calls; legend cross-lighting needs `data-slice` on the
  SVG-native legend rows (`svg-legend.js`), not added here.
- **Demo deck (#9):** deferred until the present-mode layer lands — the static PDF of a
  detail-pie is identical to a normal pie, so a demo deck adds nothing until interactive.

## Discovered, out of scope (separate ticket)

`progress` and `timeline-list` use the **same naive non-greedy regex** in the dispatch
(`transformChartSection`). A `progress`/`timeline-list` whose item carries any nested
sublist **truncates and renders zero bars today**. The identical one-line fix
(`extractFirstList`) applies; not changed here to keep this branch to one feature
(Hard Rule #17).
