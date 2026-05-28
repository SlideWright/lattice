# chart-family migration to the shared transformer registry — phase 1

Date: 2026-05-17
Branch: `claude/shared-transformer-library-Qv38u`

## What changed

`chart-family` is the second transformer to join `lib/transformers/`,
following `split-panels`. Phase 1 covers the **HTML and per-section
paths**; phase 2 will lift the runtime's DOM walk (a separate PR
because chart-family's DOM mirror is ~1450 lines including
runtime-local copies of the radar and quadrant kernels).

Concretely:

- New `lib/transformers/chart-family.js` — adapter wrapping
  `lib/chart-family/chart-family.js`. Exposes `applyToHtml` and
  `applyToSection`. Does NOT yet expose `applyToDom` — the runtime
  keeps its inline `applyChartFamily(document)` block for now.
- `lib/transformers/registry.js`:
  - Added `chart-family` to `TRANSFORMERS` (BEFORE `split-panels` —
    order matters because chart-family appends `chart-frame` to the
    section's class list, and downstream transformers might filter by
    class).
  - Renamed the per-section primitive from `applyToSectionInner`
    (returning `string`) to `applyToSection` (returning `{ html, cls }`).
    This is the contract change needed to support chart-family's
    class mutation.
  - Added `applyAllToSection(innerHtml, cls)` that iterates every
    transformer's `applyToSection` in order, threading the cumulative
    `{ html, cls }` through.
- `lib/transformers/split-panels.js` — adapter updated to the new
  `applyToSection` shape. split-panels never mutates `cls`, so it
  always returns the input unchanged in the `cls` field.
- `marp.config.js` — drops the direct `applyChartFamilyToHtml` import
  and call. The registry's `applyAllToHtml` now dispatches it.
- `lattice-emulator.js` — the inline ~500-line chart-family block at
  the former L1687–2188 is **deleted**, along with the duplicate
  `parseTopLevelLis` / `stripTrailingPills` / `extractFirstList` /
  `buildProgressBars` / `buildTimelineSpine` / `buildPieChart` /
  `buildGanttChart` / `buildKanbanBoard` helpers it carried.
  Replaced by a single call to `registry.applyAllToSection(html,
  classAttr)`. The split-panels call site is also folded into this
  one registry call.
- `test/unit/transformers/registry.test.js` — updated existing
  split-panels tests to the new `applyToSection` shape; added 7 new
  tests covering chart-family's shape contract, idempotence, the
  `chart-frame` class append, and the registry's composition behavior.

## Output verification

`examples/gallery.md` sidecar HTML is **byte-identical** before/after
(0-line diff). Seven chart-family per-component galleries
(`progress`, `timeline-list`, `piechart`, `gantt`, `kanban`, `radar`,
`quadrant`) rebuilt through the registry path. Six split-* component
galleries re-rebuilt through the updated registry shape.

Unit-suite delta: +7 tests (now 480/480 pass).

## Line-count delta

`lattice-emulator.js`: −502 lines (the inline chart block plus its
helpers).

The bundle picks up the chart-family adapter transitively, which
costs ~10 KB in the bundled JS (the `chart-family.js` engine kernel
was already inlined for the split-panels engine's `parseTopLevelLis`
import). Net runtime bundle change: ~480 KB → ~795 KB → ~804 KB.

## What's NOT in this PR

- **Runtime DOM walk migration (phase 2).** The runtime still owns
  its inline `applyChartFamily(document)` block at
  `src/runtime/index.js` (~475 lines), plus the local
  `rParseRadar`/`rBuildRadar`/`qParseQuadrant`/`qBuildQuadrant`
  kernels (~1000 lines). Lifting these into the adapter's
  `applyToDom` is a big enough change that bundling it with phase 1
  would make the diff hard to review. Phase 2 also gets the chance
  to delete the runtime-local radar/quadrant kernels by routing
  through the shared `lib/components/radar` and `lib/components/quadrant`
  modules (which the HTML kernel already uses).

- **Other transformers.** `roadmap`, `journey`, `word-cloud` still
  have direct imports in `marp.config.js`. They have shared
  `*.transform.js` modules, so the adapter pattern is mechanical —
  one PR per transformer.

## Follow-up sequence

1. Phase 2: chart-family `applyToDom` — lift runtime DOM walk +
   route radar/quadrant through the shared modules.
2. roadmap → registry.
3. journey → registry.
4. word-cloud → registry.
5. After (4), `marp.config.js`'s render hook becomes a single
   `result.html = registry.applyAllToHtml(result.html);` line.
