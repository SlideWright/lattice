---
status: shipped
summary: Make adaptivity a REQUIRED, deterministic manifest declaration — `adapt.mode` ∈ {reflow, native, single-orientation} on every one of the 52 components — backed by a CI gate (check-ownership checkAdaptDeclarations) that cross-checks the declaration against reality, so it can never silently drift. Fixes the prior jank: 10 components declared adaptivity, 25 actually adapt, and nothing caught the gap. Backfilled all 52 (25 reflow / 25 native / 2 single-orientation). Reflow IMPLEMENTATION for components that still need it stays a tracked follow-up; the end-state goal is zero "unhandled" components.
version: 1
supersedes: none
builds-on: 2026-06-18-component-adaptive-sizing.md
---

# Adaptive manifest contract — declare it, gate it

**Date:** 2026-06-20
**Status:** Adopted

## The problem

"Adaptive" had drifted into a non-deterministic mess: you could not trust the
manifest to tell you what a component does.

- **10** components declared `adapt.families`.
- **25** actually adapt to the box/orientation: 16 via their own `@container …
  aspect-ratio` CSS, 3 (`map`, `piechart`, `word-cloud`) via the SHARED
  chart-frame `@container` rule alone, and 6 via a `*.transform.js` / image
  resolver / mermaid reorient.
- The charts that reflowed but **declared nothing** (`gantt`, `journey`,
  `kanban`, `progress`, `roadmap`, `state-chart`, `timeline-list`, plus the three
  shared-rule ones above).
- **No gate** cross-checked the declaration against the code, so the gap was
  invisible and free to grow.

On top of that, `adapt.families` *omitted* silently meant "derived from
orientation" — so a blank field was ambiguous (not-adaptive, or adaptive but
undeclared?).

A second confusion fed the worry: there are **two adaptivity axes**, and they
were conflated.

- **Type adaptivity (orientation fonts)** — after the typography-categories work
  this is **universal and automatic** for all 52 (the `--fs-*` tokens are
  orientation-aware system-wide). It is *not* per-component and is *not* declared.
- **Layout adaptivity (box reflow)** — per-component, and the thing this contract
  governs.

## The decision (confirmed via AskUserQuestion)

1. **Declare it with a mode enum.** Every component carries a required
   `adapt.mode`:
   - `reflow` — ships DISTINCT per-family structural layouts (the box is
     restructured): `@container lattice (aspect-ratio …)` CSS, a `*.transform.js`
     that branches geometry on orientation, or the mermaid reorient.
   - `native` — adapts by the universal cqi scaling + orientation-aware type
     alone; no structural change needed (most prose/figure layouts). Must support
     **both** orientations (it adapts by scaling, so it can't be restricted).
   - `single-orientation` — deliberately ONE orientation (its `orientation` field
     lists one), e.g. `redline`'s side-by-side diff, `compare-code`.
2. **Gate it with a static cross-check** (`tools/check-ownership.js`
   `checkAdaptDeclarations`, run by `build:check` + pre-commit; mirrored by
   `test/unit/components/adapt-contract.test.js`). Deterministic, no rendering.
   Four rules: COMPLETE (every component has a valid mode) · ANTI-DRIFT
   (`@container … aspect-ratio` in CSS ⟹ `reflow`) · CONSISTENT
   (`single-orientation` ⟺ one orientation; `native` ⟹ both) · SANE (native
   carries no `@container` aspect rule).
3. **Backfill honestly now; implement reflow later.** All 52 declared this PR
   (25 reflow / 25 native / 2 single-orientation). Authoring box-local reflow for
   components that would benefit but are `native` today is a tracked follow-up —
   not blocked on this contract.

## The determinism boundary (deliberate)

The gate **enforces** the one mechanism it can read unambiguously: a CSS
`@container … aspect-ratio` rule ⟹ `reflow`. That is precise, has no false
positives, and catches the exact class of drift we found (and any future CSS
mislabel). It reads each component's own `<name>.styles.css` AND — for
chart-bucket components — the shared `_chart-family/chart-family.css`, whose
box-local `@container` rule restructures every chart-frame member's `.chart-body`
on tall boxes. (Missing that shared file was a real false-negative the
maker-checker caught: `map` / `piechart` / `word-cloud` reflow *only* through it,
and would otherwise have masqueraded as `native`.)

The remaining reflow mechanisms with **no single static marker** — the image
composition resolver's `[data-orientation]` CSS (`image`) and the mermaid
reorient (`diagram`) — have nothing that catches them without false positives.
Those are **author-declared `reflow`, render-backed by their transforms**, and out
of the static gate's reach *by design*. Trying to regex-detect every JS idiom would reintroduce the jank (fuzzy,
mechanism-specific) this contract removes. The gate guarantees the declaration is
complete, internally consistent, and CSS-truthful; the rest is honest declaration
the decision doc + code review back.

## End state

"Every component adaptable" is now an **enforced, visible** target rather than a
vibe: every manifest declares, the catalog reports `reflow` / `native` /
`single-orientation` counts, and the gate keeps each honest. Moving a component
from `native` to `reflow` is a deliberate, render-verified change that flips one
field and adds the `@container`/transform layouts — never a silent drift again.

## Coverage at adoption

| mode | count | components |
|---|---|---|
| `reflow` | 25 | cards-grid, cards-stack, content, diagram, funnel, gantt, image, journey, kanban, kpi, list, map, matrix-2x2, piechart, pricing, progress, quadrant, radar, roadmap, split-compare, state-chart, stats, timeline-list, verdict-grid, word-cloud |
| `native` | 25 | actors, agenda, authority-chain, big-number, checklist, citation-card, closing, code, compare-prose, compare-table, decision, divider, glossary, list-criteria, list-steps, list-tabular, logo-wall, math, obligation-matrix, q-and-a, quote, regulatory-update, split-panel, statute-stack, title |
| `single-orientation` | 2 | compare-code, redline |
