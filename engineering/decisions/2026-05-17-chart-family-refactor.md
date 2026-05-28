# 2026-05-17 — chart-family refactor proposal

**Status:** Deferred — proposal captured here for a future cleanup
pass. Not blocking anything.

**Background.** During the Phase 5 `lib/` reorganization the chart-family
files were relocated wholesale: `lib/chart-family.js` →
`lib/chart-family/chart-family.js` and `lib/_chart-family.css` →
`lib/chart-family/chart-family.css`. The internal structure was left
intact.

This note describes the next-level cleanup that distributes chart-family
internals to align with the per-component-folder convention.

---

## The asymmetry to fix

Today, two of the seven chart-family members follow the per-component
pattern (radar, quadrant — their kernels live in
`lib/components/<name>/<name>.transform.js`) and five do not (progress,
timeline-list, piechart, gantt, kanban — their kernels live as inline
builder functions inside `chart-family.js`).

The asymmetry is historical: the inline builders predate the
per-component-transform convention that radar/quadrant later adopted.
By the principle "per-component pieces live with the component," all
seven should be symmetric.

---

## Proposed end-state

```
lib/components/
  progress/
    progress.transform.js     — NEW: was buildProgressBars in chart-family.js
    progress.{manifest,styles.css,docs.md,gallery.{md,pdf}}
  timeline-list/
    timeline-list.transform.js — NEW: was buildTimelineSpine
  piechart/
    piechart.transform.js     — NEW: was buildPieChart
  gantt/
    gantt.transform.js        — NEW: was buildGanttChart
  kanban/
    kanban.transform.js       — NEW: was buildKanbanBoard
  radar/
    radar.transform.js        — unchanged (already there)
  quadrant/
    quadrant.transform.js     — unchanged (already there)

lib/shared/
  shared.docs.md              — gains a section: "chart-family contract"
  shared.styles.css           — unchanged
  chart-frame.css             — was lib/chart-family/chart-family.css
                                 (the .chart-frame skeleton, opt-in via class)

lib/core/
  chart-family.js             — was lib/chart-family/chart-family.js
                                 SHRUNK to: dispatcher + shared parsing helpers
                                 (parseTopLevelLis, escAttr, stripTrailingPills,
                                 extractFirstList). All inline builders extracted.
```

The `lib/chart-family/` folder disappears.

---

## What disappears + what survives

| Concept | After refactor |
|---|---|
| The `.chart-frame` skeleton CSS | Lives in `lib/shared/` as a shared modifier alongside `compact`/`loose`/`accent`. Conceptually correct — it's a pattern shared among some components. |
| The chart-family JS dispatcher | Lives in `lib/core/` as engine machinery. Calls per-component `.transform.js` files. |
| The kernel protocol (`transformChartSection(html, classTokens)`) | Stays — every component's `<name>.transform.js` implements it. |
| The CHART_LAYOUTS registry | Stays in `lib/core/chart-family.js`. Adding a new member adds (a) the registry entry, (b) a per-component `.transform.js`. |
| The chart-family contract doc | Folds into `lib/shared/shared.docs.md` as a named section. Cross-links from each chart component's `<name>.docs.md`. |

---

## Why deferred

This is real refactor work:
- ~5 builder functions extracted into 5 new files (each is 30-80 lines).
- The dispatcher's `transformChartSection` switches structure: `if
  (chartLayout === 'progress') { ... }` becomes `kernels[chartLayout]
  .transform(...)`.
- Each chart component's per-component integration test re-renders
  through the new path; pixel-diff against pre-refactor PDFs to
  confirm zero visual change.
- Bundler change: chart-family CSS moves from `lib/chart-family/` to
  `lib/shared/`, bundle path update.

Estimated ~half-day of careful work. Scope-cut from Phase 5 because
the docs reorg was already a multi-step refactor and adding internal
code restructuring on top would inflate review surface unnecessarily.

---

## Test plan when executing

1. Capture pre-refactor PDFs for all 7 chart components.
2. Extract each builder into its own `<name>.transform.js`:
   - Move the function body.
   - Import the shared helpers (parseTopLevelLis etc.) from
     `lib/core/chart-family.js`.
   - Export `transformChartSection(html, classTokens)`.
3. Move `chart-family.css` → `lib/shared/chart-frame.css`. Update
   bundler.
4. Move `chart-family.js` → `lib/core/chart-family.js`. Shrink to
   dispatch + shared helpers. Require per-component transforms.
5. Update `marp.config.js` + `lattice-emulator.js` require paths.
6. Run `npm test` + per-component integration tests.
7. Render all 7 chart component galleries. Pixel-diff against
   pre-refactor — must be byte-equivalent (or pixel-clean with metadata
   noise only).
8. Render `examples/gallery.md` — pixel-diff against baseline — must
   be pixel-clean.
9. Delete `lib/chart-family/` folder.
10. Update `lib/shared/shared.docs.md` to absorb the chart-family
    contract content.
11. Update each chart component's `<name>.docs.md` to cross-link the
    chart-family contract section in `shared.docs.md`.

---

## Touch points for the future executor

- `lib/chart-family/chart-family.js` lines 108-435 contain the 5
  inline builders (`buildProgressBars`, `buildTimelineSpine`,
  `buildPieChart`, `buildGanttChart`, `buildKanbanBoard`).
- Lines 44-225 contain the shared helpers (`escAttr`,
  `parseTopLevelLis`, `stripTrailingPills`, `extractFirstList`,
  `parseGanttWindow`, `parseBarRange`) — these stay in the engine
  module.
- Lines 436-571 contain `transformChartSection` (the dispatcher) —
  rewrite this to call out to per-component kernels by name.
- Lines 572-633 contain `applyToRenderedHtml` (top-level entry) —
  rewrite to use the new dispatcher.

---

## Alternative considered: keep chart-family/ folder

The "do nothing" alternative leaves the current shape: chart-family
gets its own top-level folder; 5 inline builders stay in
chart-family.js; radar/quadrant remain the asymmetric outliers.

Trade-off:
- (+) Zero migration cost.
- (−) The asymmetry between 5 inline + 2 per-component kernels
  remains visible (`grep -n 'function build' lib/chart-family/chart-family.js`
  shows 5 builders; new contributors wonder why radar/quadrant don't
  appear).
- (−) The chart-family folder has both CSS and JS but neither is
  per-component — readers have to learn it's a special category.

Net: the refactor is worth doing, just not urgent.
