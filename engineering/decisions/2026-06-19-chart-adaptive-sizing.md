---
status: in-progress
summary: Charts restructure to the box they occupy, not just scale — own-renderers (11/13) re-lay-out per box family via box-local @container (sequential charts go vertical, radial stack-over-legend, square fill); Mermaid (gantt, journey) re-renders LR→TB. Phase 1 landed timeline-list as the proven vertical-rail pattern; phases 2–4 sequenced.
version: 1
supersedes: none
builds-on: 2026-06-18-component-adaptive-sizing.md, 2026-06-13-svg-native-legend.md
---

# Chart adaptive sizing — charts restructure to the box, not just scale

**Status:** in progress (Phase 1 landed: shared diagnosis + `timeline-list`
vertical restructure as the proven pattern). Phases 2–4 sequenced below.
**Related:** `2026-06-18-component-adaptive-sizing.md` (the box-local `@container`
foundation this builds on), `2026-06-13-svg-native-legend.md`.

---

## 1. The problem

Every chart renders its **landscape** internal layout (chart-beside-legend, bars
across the width, a left-to-right timeline) and is then scaled to fit its box. In
a tall box, fit-to-width shrinks that whole landscape-shaped composition into a
short horizontal band — tiny, illegible, with most of the canvas empty. Charts
**scale but don't restructure**. (Evidence: the 9:16 render of piechart, radar,
progress, funnel, quadrant, timeline-list, journey — every one a small band under
a sea of white.)

This is the chart-shaped instance of the box-local adaptive-sizing thesis: a
component should adapt to the **box it occupies**, not just scale.

## 2. Why it's tractable

11 of 13 charts are **own CSS/HTML renderers** — the `_chart-family` kernel pulls
the list out of the section and emits reflow-able markup wrapped in `.chart-frame`
(`.chart-header` / `.chart-body` / `.chart-caption`). Only **gantt** and
**journey** are opaque Mermaid SVG. So most charts can restructure with the *same*
box-local `@container lattice (aspect-ratio …)` mechanism the component sweep uses
— and because the rules gate to tall/square aspects, **landscape output stays
byte-identical** (normal visual review, not the export-gated path).

## 3. The decision (confirmed)

- **Own-renderers (11): CSS box-local restructure.** Not "fill/center better" —
  genuinely re-lay-out per box family. Keyed on the nearest `lattice` container,
  so it fires on a portrait deck AND inside a narrow nested cell.
- **Mermaid (gantt, journey): re-render in the box's natural direction.** Switch
  the Mermaid direction (LR → TB) so the diagram is authored vertical for a tall
  box, rather than an opaque landscape SVG scaled down. Keyed on the deck-wide
  orientation stamp (the pragmatic limit for opaque SVG — it's baked at render
  time, before the final box is known; the nested-cell case is out of reach for
  Mermaid and that's acceptable).

Rejected: a render-time kernel that emits different markup per family — it only
knows the deck-wide orientation (reintroducing the limitation the whole effort
moves away from) and it alters exported bytes (sign-off gate). CSS box-local is
the cheaper path that also composes with nesting.

## 4. Taxonomy — intrinsic dimensionality drives the move

| Class | Charts | Tall-box move |
|---|---|---|
| **Sequential / 1-D** | `timeline-list`, `progress`, `kanban`, `roadmap`, `funnel`* | **go vertical** — stack the sequence down the page, each item a full-width row on a left rail |
| **Radial / fixed-aspect** | `piechart`, `radar` | **stack chart-over-legend + enlarge** the dial to fill the width, centered |
| **Square / matrix** | `quadrant` | **fill width + center**; reflow axis labels / caption into the freed vertical space |
| **Spatial / graph** | `map`, `state-chart`, `word-cloud` | `word-cloud` already fills; `map` / `state-chart` = **tune / graceful letterbox**, no clean reflow |
| **Mermaid** | `gantt`, `journey` | **direction-switch** (§3) |

\* `funnel` is already vertical; it needs to *fill*, not restructure.

## 5. The proven pattern (Phase 1 — `timeline-list`)

The horizontal grid spine (`grid-auto-flow: column`) becomes a vertical timeline
via one `@container lattice (aspect-ratio <= 0.9)` block:

- `.timeline-spine` → `grid-auto-flow: row`, one column, `align-content:
  space-evenly`, full height — items distribute down the page.
- `.timeline-spine::before` (the spine line) → rotated to **vertical** (a left
  rail: `top/bottom` + `width: 2px` instead of `left/right` + `height`).
- `.timeline-item` → `display: grid; grid-template-columns: auto 1fr` — the **dot
  rides column 1 (the rail)**, everything else fills column 2 and left-aligns.
- Chips (date pill, status) get `justify-self: start` so they hug their content;
  title/body keep the default stretch so prose fills and wraps.

Verified by render at `size: story` (a clean vertical timeline) and landscape
(byte-identical horizontal timeline). **This `auto 1fr` rail is the template** the
other sequential charts reuse.

## 6. Per-chart plan (the queue)

- **`progress`** ✅ *(Phase 2)* — bars already stack but crowd the top; rows now
  fill the height (`space-evenly`) and tracks thicken. (Fill, not restructure.)
- **`kanban`** ✅ *(Phase 2)* — `.kanban-board` `row → column`, lanes distribute
  down the canvas, cards within a lane wrap as a row.
- **`funnel`** ⏭ *(Phase 4, render-time)* — SVG viewBox is baked landscape
  (`0 0 320 180`); CSS can only letterbox. Needs a portrait viewBox from
  `funnel.transform.js`.
- **`roadmap`** ⏭ *(Phase 4, render-time)* — table / `.horizons` hybrid; the
  kernel should select the transposed `.horizons` form for tall boxes.
- **`piechart` / `radar`** — `.chart-body` reflows chart-beside-legend → chart
  **above** legend; the SVG `max-width` lifts so the dial fills the width.
- **`quadrant`** — fill width, center; push axis labels into the vertical margin.
- **`gantt` / `journey`** — Mermaid direction-switch (Phase 4).
- **`map` / `state-chart`** — graceful center + fill; revisit if a real reflow
  emerges. **`word-cloud`** already fills any aspect (no change).

`adapt.families` is set on each chart manifest only once its layouts are
render-verified (the schema's render-backed rule).

## 7. Sequencing

1. **Phase 1 (landed):** diagnosis + `timeline-list` vertical (the pattern).
2. **Phase 2 (landed):** `kanban` (board `row → column`, lanes distribute, cards
   wrap as a row) + `progress` (rows fill the height, tracks thicken). Verified
   portrait + landscape; landscape byte-identical.
3. **Phase 3:** radial (`piechart`, `radar`) + square (`quadrant`) — frame
   chart-over-legend + enlarge.
4. **Phase 4 — render-time (kernel) work; touches exported bytes → sign-off +
   maker-checker:**
   - **`funnel`** — its SVG viewBox is baked landscape (`0 0 320 180`,
     `preserveAspectRatio=meet`), so CSS can only letterbox it. A tall funnel needs
     `funnel.transform.js` to emit a *portrait* viewBox per orientation. Same class
     as Mermaid: render-time, deck-orientation-keyed.
   - **`roadmap`** — table / `.horizons` hybrid; a clean reflow needs the kernel to
     pick the transposed `.horizons` form for tall boxes. Deferred with `funnel`.
   - **`gantt` / `journey`** — Mermaid LR → TB direction-switch.

Each phase: render at portrait + landscape, confirm reflow fires and landscape is
byte-identical, before setting `adapt.families`. The four-family thresholds stay
the single source in `lib/adaptive/families.js` (drift-guarded).
