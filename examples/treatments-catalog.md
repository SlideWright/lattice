---
marp: true
theme: mustard
size: 4k
paginate: true
header: "Lattice · Treatments Catalog"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "Title · title" -->

# The Treatments Catalog

`Visual Catalog · 2026-05-17`

Every treatment class rendered once — 12 tints (corner glows, edge washes, atmospheric, multi-accent) and 11 marks (circles, ticks, orbits, slashes, seeds, pills, asterisks, threads, brackets, grids, chevrons) plus 4 composition examples and a dark-canvas demo. Each footer carries the exact class spec used on the slide. See `docs/references/treatments.md` for the full catalogue and `docs/notes/2026-05-17-treatments-rename.md` for the design rationale.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 01 · Tints · Corner glows`

## Radial ellipses anchored at one corner of the canvas

---

<!-- _class: content tint-corner at-tl -->
<!-- _footer: "tint-corner at-tl" -->

`Tint · Corner Glow · Top-Left`

## `tint-corner at-tl`

Radial ellipse anchored at the top-left corner. 12% peak accent, gone before reaching the content zone.

---

<!-- _class: content tint-corner at-tr -->
<!-- _footer: "tint-corner at-tr" -->

`Tint · Corner Glow · Top-Right`

## `tint-corner at-tr`

Same weight and fade profile, anchored at top-right.

---

<!-- _class: content tint-corner at-bl -->
<!-- _footer: "tint-corner at-bl" -->

`Tint · Corner Glow · Bottom-Left`

## `tint-corner at-bl`

Same profile, anchored at bottom-left.

---

<!-- _class: content tint-corner at-br -->
<!-- _footer: "tint-corner at-br" -->

`Tint · Corner Glow · Bottom-Right`

## `tint-corner at-br`

Same profile, anchored at bottom-right.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 02 · Tints · Edge washes`

## Linear gradients fading from one edge

---

<!-- _class: content tint-edge at-top -->
<!-- _footer: "tint-edge at-top" -->

`Tint · Edge Wash · Top`

## `tint-edge at-top`

Linear gradient down from the top edge. 10% at the edge, transparent by 35%.

---

<!-- _class: content tint-edge at-right -->
<!-- _footer: "tint-edge at-right" -->

`Tint · Edge Wash · Right`

## `tint-edge at-right`

Wash bleeding in from the right edge. Same opacity profile, transparent by 30%.

---

<!-- _class: content tint-edge at-bottom -->
<!-- _footer: "tint-edge at-bottom" -->

`Tint · Edge Wash · Bottom`

## `tint-edge at-bottom`

Wash rising from the bottom edge. Mirrors `tint-edge at-top`.

---

<!-- _class: content tint-edge at-left -->
<!-- _footer: "tint-edge at-left" -->

`Tint · Edge Wash · Left`

## `tint-edge at-left`

Wash bleeding in from the left edge. Mirrors `tint-edge at-right`.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 03 · Tints · Atmospheric`

## Full-canvas tonal effects that keep the center clean

---

<!-- _class: content tint-vignette -->
<!-- _footer: "tint-vignette" -->

`Tint · Atmospheric · Vignette`

## `tint-vignette`

Accent-tinted perimeter, open center. Roughly a 700×400 clean zone in the middle of a 16:9 slide.

---

<!-- _class: content tint-spotlight -->
<!-- _footer: "tint-spotlight" -->

`Tint · Atmospheric · Spotlight`

## `tint-spotlight`

Reverse vignette — accent warmer at center, transparent at edges. Caps at 7% so it reads as warmth rather than colour.

---

<!-- _class: content tint-horizon -->
<!-- _footer: "tint-horizon" -->

`Tint · Atmospheric · Horizon`

## `tint-horizon`

Heaviest at the top edge, fades to nothing by 45%. Suits slides about aspiration, elevation, the view from the top floor.

---

<!-- _class: content tint-ground -->
<!-- _footer: "tint-ground" -->

`Tint · Atmospheric · Ground`

## `tint-ground`

Mirror of horizon — heaviest at the bottom. Suits closing arguments, summaries, conclusions, landings.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 04 · Tints · Multi-accent`

## Two or more gradient layers composed; ink budget split between them

---

<!-- _class: content tint-duotone -->
<!-- _footer: "tint-duotone" -->

`Tint · Multi-accent · Duotone`

## `tint-duotone`

Opposing-corner pair — top-left + bottom-right at 9% each. The two glows meet around mid-slide and fade before intersecting.

---

<!-- _class: content tint-frame -->
<!-- _footer: "tint-frame" -->

`Tint · Multi-accent · Frame`

## `tint-frame`

All four edges at half-weight (8% each, gone by 22% inset). Quiet all-round accent; no single side dominates.

---

<!-- _class: content tint-sweep -->
<!-- _footer: "tint-sweep" -->

`Tint · Multi-accent · Sweep`

## `tint-sweep`

Diagonal accent wash from top-right to bottom-left. The most directional tint — suits forward motion, left-to-right reading.

---

<!-- _class: content tint-ambient -->
<!-- _footer: "tint-ambient" -->

`Tint · Multi-accent · Ambient`

## `tint-ambient`

The lowest-key option — broad off-axis tint at 7%. A barely-there suggestion of colour that ensures the slide never reads as plain white.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 05 · Marks`

## SVG accent shapes painted through a mask at 28 % accent

---

<!-- _class: content mark-micro -->
<!-- _footer: "mark-micro" -->

`Mark · Micro Circles · Top-Right`

## `mark-micro`

Nine micro circles, radius 2–4.5, scattered across the top-right header band.

---

<!-- _class: content mark-ticks -->
<!-- _footer: "mark-ticks" -->

`Mark · Ticks · Right Margin`

## `mark-ticks`

Five horizontal ticks in the far-right margin. Painted as a `::before` plus four `box-shadow` copies — no mask — so it survives Apple PDFKit's mask-drop bug intact.

---

<!-- _class: content mark-orbit -->
<!-- _footer: "mark-orbit" -->

`Mark · Orbit · Bottom-Right`

## `mark-orbit`

Concentric rings, center dot, three satellite dots. The prototype for the cropped-viewBox `::before` pattern shared by the rest of the mask-based mark family.

---

<!-- _class: content mark-slashes -->
<!-- _footer: "mark-slashes" -->

`Mark · Slashes · Top-Right`

## `mark-slashes`

Five parallel 45° slashes in the top-right corner. Opacity steps down 1.0 → 0.6 along the cluster.

---

<!-- _class: content mark-seeds -->
<!-- _footer: "mark-seeds" -->

`Mark · Seeds · All Four Corners`

## `mark-seeds`

Twelve elongated ellipses, three per corner. Renders as 12 stacked radial-gradients in the `--_bg-radial` slot, not a mask — four-corner geometry has no small bbox, so the orbit-pattern escape doesn't help. Placement-agnostic; conflicts with corner glows and other `--_bg-radial` tints.

---

<!-- _class: content mark-pills -->
<!-- _footer: "mark-pills" -->

`Mark · Pills · Right Margin`

## `mark-pills`

Four horizontal pill shapes in the far-right margin. Same `box-shadow` approach as `mark-ticks` — `border-radius` on the `::before` propagates to the shadow copies so each pill is rounded.

---

<!-- _class: content mark-asterisks -->
<!-- _footer: "mark-asterisks" -->

`Mark · Asterisks · Opposing Corners`

## `mark-asterisks`

Asterisks plus micro dots at top-right AND bottom-left. The dual-corner geometry is why this mark is placement-agnostic — the TR cluster lives in `::before`, the BL cluster in `::after`, each cropped to its own bbox.

---

<!-- _class: content mark-threads -->
<!-- _footer: "mark-threads" -->

`Mark · Threads · Top-Right`

## `mark-threads`

Three hairline diagonals (stroke 0.5) in the top-right corner. The pattern direction is diagonal — the placement is the corner.

---

<!-- _class: content mark-brackets -->
<!-- _footer: "mark-brackets" -->

`Mark · Brackets · Right Margin`

## `mark-brackets`

Two `]` bracket marks in the far-right margin. The most editorial of the marks.

---

<!-- _class: content mark-grid -->
<!-- _footer: "mark-grid" -->

`Mark · Grid · Top-Right`

## `mark-grid`

Four-by-four dot grid in the top-right header band. A true fullbleed-grid variant is a follow-up feature, not a rename concern.

---

<!-- _class: content mark-chevron -->
<!-- _footer: "mark-chevron" -->

`Mark · Chevrons · Bottom-Left`

## `mark-chevron`

Three right-pointing chevrons in the bottom-left corner. Opacity ramps 1.0 → 0.65.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 06 · Composition and dark`

## How treatments compose and how they survive theme inversion

---

<!-- _class: content tint-vignette tint-edge at-right -->
<!-- _footer: "tint-vignette tint-edge at-right" -->

`Composition · Two tints in different slots`

## Radial + linear in one class list

`tint-vignette` writes the radial slot, `tint-edge at-right` writes the linear slot. The compositor rule assembles both into one `background-image` with two live layers.

---

<!-- _class: content tint-corner at-tl mark-orbit -->
<!-- _footer: "tint-corner at-tl mark-orbit" -->

`Composition · Tint plus mark`

## Gradient layer plus an SVG mark layer

The corner glow paints through the gradient slot; the orbit mark paints through its own `::before`. Two independent layers — no slot collision.

---

<!-- _class: content tint-horizon mark-seeds dark -->
<!-- _footer: "tint-horizon mark-seeds dark" -->

`Composition · Dark canvas, two layers`

## Cross-mode safety, gradient + mark, dark surface

`var(--accent)` resolves via `light-dark()` so the gradient tint and the mask paint both remap automatically. No per-pattern dark overrides needed.

---

<!-- _class: content tint-corner at-tl tint-edge at-right mark-micro -->
<!-- _footer: "tint-corner at-tl tint-edge at-right mark-micro" -->

`Composition · Three layers, three slots`

## Two tints plus a mark — every slot occupied once

Radial corner, linear edge, SVG mark — three independent layers, no conflict. The maximum useful density before the slide starts to feel busy.

---

<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _footer: "Closing · closing" -->

# That is the full catalogue

`27 classes · 4 composition examples · 1 cross-mode demo`

Rename PR will sweep every class name in this deck (`bg-*` → `tint-*` / `mark-*`) and the rest is the same pixels.
