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

`Proposal Companion · 2026-05-17`

Every `bg-*` class rendered once — the visual material the `tint-*` / `mark-*` rename will operate on. Footers show the current name and the proposed new name side by side. Companion to `docs/notes/2026-05-17-treatments-rename.md`.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 01 · Tints · Corner glows`

## Radial ellipses anchored at one corner of the canvas

---

<!-- _class: content bg-corner-tl -->
<!-- _footer: "bg-corner-tl  →  tint-corner at-tl" -->

`Tint · Corner Glow · Top-Left`

## `bg-corner-tl`

Radial ellipse anchored at the top-left corner. 12% peak accent, gone before reaching the content zone.

---

<!-- _class: content bg-corner-tr -->
<!-- _footer: "bg-corner-tr  →  tint-corner at-tr" -->

`Tint · Corner Glow · Top-Right`

## `bg-corner-tr`

Same weight and fade profile, anchored at top-right.

---

<!-- _class: content bg-corner-bl -->
<!-- _footer: "bg-corner-bl  →  tint-corner at-bl" -->

`Tint · Corner Glow · Bottom-Left`

## `bg-corner-bl`

Same profile, anchored at bottom-left.

---

<!-- _class: content bg-corner-br -->
<!-- _footer: "bg-corner-br  →  tint-corner at-br" -->

`Tint · Corner Glow · Bottom-Right`

## `bg-corner-br`

Same profile, anchored at bottom-right.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 02 · Tints · Edge washes`

## Linear gradients fading from one edge

---

<!-- _class: content bg-edge-top -->
<!-- _footer: "bg-edge-top  →  tint-edge at-top" -->

`Tint · Edge Wash · Top`

## `bg-edge-top`

Linear gradient down from the top edge. 10% at the edge, transparent by 35%.

---

<!-- _class: content bg-edge-right -->
<!-- _footer: "bg-edge-right  →  tint-edge at-right" -->

`Tint · Edge Wash · Right`

## `bg-edge-right`

Wash bleeding in from the right edge. Same opacity profile, transparent by 30%.

---

<!-- _class: content bg-edge-bottom -->
<!-- _footer: "bg-edge-bottom  →  tint-edge at-bottom" -->

`Tint · Edge Wash · Bottom`

## `bg-edge-bottom`

Wash rising from the bottom edge. Mirrors `bg-edge-top`.

---

<!-- _class: content bg-edge-left -->
<!-- _footer: "bg-edge-left  →  tint-edge at-left" -->

`Tint · Edge Wash · Left`

## `bg-edge-left`

Wash bleeding in from the left edge. Mirrors `bg-edge-right`.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 03 · Tints · Atmospheric`

## Full-canvas tonal effects that keep the center clean

---

<!-- _class: content bg-vignette -->
<!-- _footer: "bg-vignette  →  tint-vignette" -->

`Tint · Atmospheric · Vignette`

## `bg-vignette`

Accent-tinted perimeter, open center. Roughly a 700×400 clean zone in the middle of a 16:9 slide.

---

<!-- _class: content bg-spotlight -->
<!-- _footer: "bg-spotlight  →  tint-spotlight" -->

`Tint · Atmospheric · Spotlight`

## `bg-spotlight`

Reverse vignette — accent warmer at center, transparent at edges. Caps at 7% so it reads as warmth rather than colour.

---

<!-- _class: content bg-horizon -->
<!-- _footer: "bg-horizon  →  tint-horizon" -->

`Tint · Atmospheric · Horizon`

## `bg-horizon`

Heaviest at the top edge, fades to nothing by 45%. Suits slides about aspiration, elevation, the view from the top floor.

---

<!-- _class: content bg-ground -->
<!-- _footer: "bg-ground  →  tint-ground" -->

`Tint · Atmospheric · Ground`

## `bg-ground`

Mirror of horizon — heaviest at the bottom. Suits closing arguments, summaries, conclusions, landings.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 04 · Tints · Multi-accent`

## Two or more gradient layers composed; ink budget split between them

---

<!-- _class: content bg-duotone -->
<!-- _footer: "bg-duotone  →  tint-duotone" -->

`Tint · Multi-accent · Duotone`

## `bg-duotone`

Opposing-corner pair — top-left + bottom-right at 9% each. The two glows meet around mid-slide and fade before intersecting.

---

<!-- _class: content bg-frame -->
<!-- _footer: "bg-frame  →  tint-frame" -->

`Tint · Multi-accent · Frame`

## `bg-frame`

All four edges at half-weight (8% each, gone by 22% inset). Quiet all-round accent; no single side dominates.

---

<!-- _class: content bg-sweep -->
<!-- _footer: "bg-sweep  →  tint-sweep" -->

`Tint · Multi-accent · Sweep`

## `bg-sweep`

Diagonal accent wash from top-right to bottom-left. The most directional tint — suits forward motion, left-to-right reading.

---

<!-- _class: content bg-ambient -->
<!-- _footer: "bg-ambient  →  tint-ambient" -->

`Tint · Multi-accent · Ambient`

## `bg-ambient`

The lowest-key option — broad off-axis tint at 7%. A barely-there suggestion of colour that ensures the slide never reads as plain white.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 05 · Marks`

## SVG accent shapes painted through a mask at 28 % accent

---

<!-- _class: content bg-micro-tr -->
<!-- _footer: "bg-micro-tr  →  mark-micro  (default at-tr)" -->

`Mark · Micro Circles · Top-Right`

## `bg-micro-tr`

Nine micro circles, radius 2–4.5, scattered across the top-right header band.

---

<!-- _class: content bg-tick-right -->
<!-- _footer: "bg-tick-right  →  mark-ticks  (default at-right)" -->

`Mark · Ticks · Right Margin`

## `bg-tick-right`

Five horizontal ticks in the far-right margin. Strokes vary 1–1.5 in opacity 0.8–1.

---

<!-- _class: content bg-orbit-br -->
<!-- _footer: "bg-orbit-br  →  mark-orbit  (default at-br)" -->

`Mark · Orbit · Bottom-Right`

## `bg-orbit-br`

Concentric rings, center dot, three satellite dots. Already uses the cropped-viewBox `::before` pattern that the rename will generalise to every mark.

---

<!-- _class: content bg-slash-tr -->
<!-- _footer: "bg-slash-tr  →  mark-slashes  (default at-tr)" -->

`Mark · Slashes · Top-Right`

## `bg-slash-tr`

Five parallel 45° slashes in the top-right corner. Opacity steps down 1.0 → 0.6 along the cluster.

---

<!-- _class: content bg-seeds -->
<!-- _footer: "bg-seeds  →  mark-seeds  (placement-agnostic)" -->

`Mark · Seeds · All Four Corners`

## `bg-seeds`

Twelve elongated ellipses, three per corner, rotated. The first of two placement-agnostic marks.

---

<!-- _class: content bg-pills-right -->
<!-- _footer: "bg-pills-right  →  mark-pills  (default at-right)" -->

`Mark · Pills · Right Margin`

## `bg-pills-right`

Four horizontal pill shapes in the far-right margin. Widths vary 20–26.

---

<!-- _class: content bg-asterisk-scatter -->
<!-- _footer: "bg-asterisk-scatter  →  mark-asterisks  (placement-agnostic)" -->

`Mark · Asterisks · Opposing Corners`

## `bg-asterisk-scatter`

Asterisks plus micro dots at top-right AND bottom-left. The dual-corner geometry is why this mark stays placement-agnostic in the rename.

---

<!-- _class: content bg-thread-diagonal -->
<!-- _footer: "bg-thread-diagonal  →  mark-threads  (default at-tr)" -->

`Mark · Threads · Top-Right`

## `bg-thread-diagonal`

Three hairline diagonals (stroke 0.5) in the top-right corner. The pattern direction is diagonal — the placement is the corner.

---

<!-- _class: content bg-bracket-right -->
<!-- _footer: "bg-bracket-right  →  mark-brackets  (default at-right)" -->

`Mark · Brackets · Right Margin`

## `bg-bracket-right`

Two `]` bracket marks in the far-right margin. The most editorial of the marks.

---

<!-- _class: content bg-grid-micro -->
<!-- _footer: "bg-grid-micro  →  mark-grid  (default at-tr)" -->

`Mark · Grid · Top-Right`

## `bg-grid-micro`

Four-by-four dot grid in the top-right header band. A true fullbleed-grid variant is a follow-up feature, not a rename concern.

---

<!-- _class: content bg-chevron-bl -->
<!-- _footer: "bg-chevron-bl  →  mark-chevron  (default at-bl)" -->

`Mark · Chevrons · Bottom-Left`

## `bg-chevron-bl`

Three right-pointing chevrons in the bottom-left corner. Opacity ramps 1.0 → 0.65.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 06 · Composition and dark`

## How treatments compose and how they survive theme inversion

---

<!-- _class: content bg-vignette bg-edge-right -->
<!-- _footer: "bg-vignette bg-edge-right  →  tint-vignette tint-edge at-right" -->

`Composition · Two tints in different slots`

## Radial + linear in one class list

`bg-vignette` writes the radial slot, `bg-edge-right` writes the linear slot. The compositor rule assembles both into one `background-image` with two live layers.

---

<!-- _class: content bg-corner-tl bg-orbit-br -->
<!-- _footer: "bg-corner-tl bg-orbit-br  →  tint-corner at-tl mark-orbit" -->

`Composition · Tint plus mark`

## Gradient layer plus an SVG mark layer

The corner glow paints through the gradient slot; the orbit mark paints through its own `::before`. Two independent layers — no slot collision.

---

<!-- _class: content bg-horizon bg-seeds dark -->
<!-- _footer: "bg-horizon bg-seeds dark  →  tint-horizon mark-seeds dark" -->

`Composition · Dark canvas, two layers`

## Cross-mode safety, gradient + mark, dark surface

`var(--accent)` resolves via `light-dark()` so the gradient tint and the mask paint both remap automatically. No per-pattern dark overrides needed.

---

<!-- _class: content bg-corner-tl bg-edge-right bg-micro-tr -->
<!-- _footer: "bg-corner-tl bg-edge-right bg-micro-tr  →  tint-corner at-tl tint-edge at-right mark-micro" -->

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
