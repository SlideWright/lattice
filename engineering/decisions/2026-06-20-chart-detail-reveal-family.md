---
status: in-progress
summary: Which charts beyond the pie can take the per-mark interactive detail-reveal + present-mode CSS-3D tilt, and how to generalize the kernel + reveal layer so they're cheap to add. Decision — the treatment is TWO separable capabilities (A reveal, substrate-agnostic; B tilt, SVG-only); Tier 1 = funnel, quadrant, radar, map (clean SVG transfers, get A+B); generalize the pie's bespoke kernel + createChartInteract into a chart-family substrate, then opt each in. Radar reveals per-axis.
last-updated: 2026-06-20
companion:
  - 2026-06-19-css-3d-charts-feasibility.md
  - ../../lib/components/chart/_chart-family/chart-family.js
  - ../../docs/src/playground/drawing-board-chart-interact.js
---

# Per-mark detail reveal + present-mode tilt across the chart family

**Date:** 2026-06-20 · **Status:** assessment settled; generalization + Tier-1 build in progress.

## Question

The piechart shipped a per-slice interactive detail reveal (hover/tap/number-key
in present & practice, popover fed by an authored nested sublist) plus an
interaction-coupled CSS-3D tilt of the whole SVG. It reads beautifully. **Which
other charts can take the same treatment, and how do we make adding them cheap
instead of re-implementing the pie's bespoke wiring per chart?**

Builds directly on the [pie feasibility doc](2026-06-19-css-3d-charts-feasibility.md) —
read that first; it establishes why SVG stays canonical and why the tilt is a
present-mode-only flourish on the whole SVG sheet.

## The pie treatment, decomposed — two separable capabilities

The shipped pie bundles two things that have **different portability**:

- **A — per-mark detail reveal** (the high-value, broadly portable piece). Each
  data mark carries an index; an *optional* nested sublist authored under each
  top-level list item is captured into an inert `<template>` (renders nothing →
  export byte-identical); a parent-hosted reveal layer (`createChartInteract`)
  shows it in present/practice/preview; the same detail folds into the slide's
  **speaker note** as the print fallback. **Substrate-agnostic** — works on any
  chart with discrete, addressable marks, SVG or HTML.
- **B — interaction-coupled CSS-3D tilt.** The feasibility doc proved this only
  works as a tilt of the *whole SVG sheet* (`preserve-3d` is inert on SVG
  children, so you can't extrude internals — and shouldn't: extruding data marks
  distorts proportion). So B is a **free rider on any SVG chart**, but does not
  transfer to the HTML/CSS charts the same way (a tilted HTML grid letterboxes
  and the per-element DOM depth that *is* possible there is a different, lower-value
  project — noted under Future).

Keeping A and B separate is what makes "a lot of charts" tractable: A is the
deliverable; B comes for free on the SVG members.

## The two gating axes

Every candidate is scored on:

1. **Substrate** — SVG (gets A + B) vs HTML/table (gets A only, awkward tilt).
2. **Grammar headroom** — is there a *free nesting level* for the optional detail
   sublist (or does the chart already consume it for content — a collision), and
   do the marks genuinely *beg* for "why" elaboration (high reveal value) rather
   than being impressionistic (low value)?

## Candidate assessment (all 13 chart-family members)

| Chart | Substrate | Mark element | Free nest for detail? | Reveal value | Tier |
|---|---|---|---|---|---|
| **funnel** | SVG | `<polygon class="funnel-band">` | ✅ flat list, free | high — where it leaks / the lever per stage | **1** |
| **quadrant** | SVG | `<circle class="quadrant-dot">` | ✅ coords are inline pills; L3 sublist free | high — "why is this item here" | **1** |
| **radar** | SVG | axes (spokes) / `<polygon class="radar-poly" data-series>` | ✅ L3 sublist under an axis is free | high — what each axis measures | **1** |
| **map** | SVG | `<path class="map-region">` | ✅ flat list, free | high — region context / the number | **1** |
| state-chart | SVG | `<li class="state-node" data-index>` | ⚠️ nested `<ul>` already = transitions (collision) | med — entry/exit actions | 2 |
| gantt | HTML grid | `.gantt-bar` | ⚠️ lane→bars consumes the level; needs L3 | med-high — owner / dependencies | 2 |
| kanban | HTML | `.kanban-card` | ⚠️ already 3 levels deep | med | 2 |
| progress | HTML | `.progress-row` | ❌ nested note rendered **inline** already | low — nothing new to reveal | 3 |
| timeline-list | HTML | `.timeline-item` | ❌ body rendered **inline** already | low | 3 |
| roadmap | table | `<td class="cell-state">` | ❌ no list/sublist channel (table) | med, different mechanism | 3 |
| journey | HTML | `<li class="journey-task">` | ⚠️ complex multi-variant grammar | med, defer | 3 |
| word-cloud | HTML | `<text class="wc-word">` | ✅ flat | low — per-word popover is a gimmick | 3 |
| ~~piechart~~ | SVG | `<path class="wedge">` | — | — | **done** |

## Decision

**Tier 1 = funnel, quadrant, radar, map.** They are clean transfers of the exact
pie architecture (same kernel pattern, same reveal layer, same print fallback),
and being SVG they get the tilt for free. funnel + map are the cleanest (flat
lists, the detail nesting level is wholly free); quadrant + radar need the kernel
to capture one deeper sublist level, but their marks most demand "why" detail.

**Generalize first, then opt in.** The pie's reveal substrate is currently
bespoke (`buildPieChart` hard-codes `data-slice`, `.piechart-detail`,
`.piechart-details`, and a pie-only speaker-note builder; `createChartInteract`
hard-codes `.piechart-svg`, `.wedge[data-slice]`, the pie legend selectors, and a
pie-disc popover anchor). Per Hard Rules #1 and #15 (one source of truth, don't
reinvent), lift this into a chart-family substrate so each chart opts in with a
few lines rather than copy-pasting the wiring:

- **Kernel (`chart-family.js`):** a shared `captureMarkDetail(item)` that splits
  the optional nested detail sublist off a list item (the depth-aware logic
  `buildPieChart` already has), and a shared `buildChartDetails(details)` that
  emits the inert `<div class="chart-details" hidden><template class="chart-detail"
  data-mark="i">…</template></div>` payload + the speaker-note comment
  (generalize `buildPieDetailNote` to take a label/value/detail list). Each
  Tier-1 mark element gains `data-mark="i"`. Pie migrates onto the same
  substrate (its emitted attribute/class names become the family-generic ones;
  the painted pixels — and thus the exported PDF — are unchanged, since
  `data-*`/`template` are invisible).
- **Reveal layer (`createChartInteract`):** parameterize the pie-specific
  selectors into a small per-chart descriptor (mark selector, figure `<svg>`
  selector, detail-template selector, and a geometry hook for the lift vector +
  popover anchor box). Pie becomes one descriptor; funnel/quadrant/radar/map add
  one each. The popover content (label/value/colour-dot/body/meta) and the
  keyboard/pointer/preview plumbing stay shared.
- **Print fallback:** the speaker-note channel is already generic in spirit —
  generalize the builder so any chart's captured detail folds into the note.

### Radar reveals per-axis (decided)

A radar has two candidate reveal units — a spoke (axis) or a whole series
overlay. **Reveal per-axis** ("what this dimension measures, why the score") — it
is the more common presenter need and it generalizes to the family rule of *one
detail per labelled data point*. Per-series reveal is recorded as a future option
(it would key off the existing `data-series` polygons).

### Per-chart mark + geometry notes

- **funnel** — mark = the stage `<polygon>`; tag `data-mark="i"`. Lift = nudge the
  band along its vertical out; popover anchors to the funnel `<svg>` box. Detail
  sublist is wholly free (flat stage list).
- **map** — mark = the region `<path>`(s) for an authored row; tag each with the
  row's `data-mark`. A row can cover several region ids (a group), so the lift
  highlights all paths sharing the index. Popover anchors to the union box of the
  row's paths.
- **quadrant** — mark = the item `<circle class="quadrant-dot">`; the item's x,y
  are inline pills (free), so a nested sublist under an item is the detail. Lift =
  enlarge/raise the dot; popover anchors to the dot.
- **radar** — mark = the axis. Detail authored as a nested sublist under each axis
  item. Lift = emphasize the spoke + the vertices on it; popover anchors to the
  axis label.

## Tier 2 / Tier 3 — why deferred

- **state-chart (T2):** the nested `<ul>` is already the transition list, so detail
  needs a *separate* channel (a second sublist marker, or transition-level
  detail). Feasible, but it's a grammar design task, not a mechanical transfer.
- **gantt / kanban (T2):** HTML substrate — they'd get A (real value: a bar's
  owner/dependencies, a card's detail) but not the SVG tilt, and both need a
  deeper authored nesting level. The per-element DOM-3D depth that HTML *can* do
  (genuinely impossible inside SVG) is a separate, deliberate project.
- **progress / timeline-list (T3):** they already render their nested sublist
  **inline** on the slide, so there is no hidden detail to *reveal* — A adds
  nothing.
- **roadmap (T3):** table cells, no list/sublist channel; a detail reveal would
  need a different per-cell mechanism.
- **journey (T3):** the richest grammar (mood curve / swimlane / heatmap /
  weighted); worth revisiting once the substrate is proven on the simpler four.
- **word-cloud (T3):** a word cloud is impressionistic; a per-word popover is a
  gimmick, not a presenter tool.

## Future

- **Per-series radar reveal** (keyed off `data-series`).
- **HTML per-element DOM-3D depth** for gantt/kanban (the inverse of the SVG
  limitation — real `preserve-3d` on DOM marks), as a distinct project.
- **Presenter-window trigger + legend cross-light** (carried over from the pie
  doc — additive once the family substrate lands).

## Constraints (from the maker-checker review)

- **Detail sublists must be bullet (`-`/`*`) lists, not numbered (`1.`) lists.**
  The shared `splitDetail` captures the first nested `<ul>` only (mirroring the
  pie precedent); a nested `<ol>` is not split off and its text would leak into
  the label. Broadening to `<ol>` would also need quadrant's `<ul>`-only depth
  scanner widened, so it's deferred — documented in each chart's `detail` slot.
- **Two emit vocabularies during the interim.** The new charts emit
  `class="chart-detail"` / `data-mark`; the pie still emits its bespoke
  `piechart-detail` / `data-slice`. The generalized `createChartInteract` must
  recognise **both** until the pie is migrated onto the substrate (a follow-up).

## Status

- Assessment: settled (this doc).
- **Kernel substrate + export side: shipped** — `mark-detail.js` +
  funnel / map / quadrant / radar emit `data-mark`, the inert `<template>`
  payload, and the speaker-note PDF fallback (byte-identical when no detail is
  authored). Radar reveals per-axis (decided). Unit + parity + invariant tests
  green; maker-checker passed.
- **On-screen reveal: shipped** — `createChartInteract` is now chart-agnostic:
  generic mark access (`[data-slice], [data-mark]` scoped to the chart `<svg>`),
  a per-mark `infoFor()` (label/value/colour from `data-label`/`data-value`, the
  axis text node, or the pie legend), generic disc/lift geometry, and a dual
  template selector — so funnel/map/quadrant/radar AND the pie all drive one
  reveal layer (hover/tap/number-key + interaction-coupled tilt). The new charts
  carry an invisible `data-label`/`data-value` on each mark as the uniform title
  source (byte-identical export, like `data-mark`). Verified in the running
  playground for all five charts (correct label/value/body; pie regression-safe).
  Fixed a latent pie bug along the way: the reveal gate counted templates, so a
  chart with non-contiguous detail capped reveal short — it now gates on the mark
  count.
- Each chart's own gallery demonstrates the feature and carries every variant;
  per-feature demo deck (#9) `examples/chart-detail-reveal.md`. One branch / one
  PR (#17).
</content>
</invoke>
