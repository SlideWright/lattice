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
- **`piechart` / `radar` / `quadrant` / `map`** ⏭ *(Phase 4, render-time)* — **CSS
  cannot reflow these.** Per `2026-06-13-svg-native-legend.md`, the dial/plot **and
  its legend share ONE `<svg>` viewBox** and scale as a single unit (pie `0 0 viewW
  viewH`, radar `300×300`, quadrant `420×320`) — the legend is SVG geometry, not an
  HTML sibling, so "chart-above-legend" can only be done by the kernel emitting a
  *tall* viewBox (legend below the dial). Same class as `funnel`. **(This corrects
  the original Phase 3 plan, which assumed a CSS-reflowable HTML legend.)**
- **`gantt` / `journey`** ⏭ *(Phase 4)* — Mermaid LR → TB direction-switch.
- **`state-chart`** ⏭ *(Phase 4)* — SVG graph; graceful center + fill, revisit if a
  real reflow emerges. **`word-cloud`** already fills any aspect (no change).

`adapt.families` is set on each chart manifest only once its layouts are
render-verified (the schema's render-backed rule).

## 7. Sequencing

1. **Phase 1 (landed):** diagnosis + `timeline-list` vertical (the pattern).
2. **Phase 2 (landed):** `kanban` (board `row → column`, lanes distribute, cards
   wrap as a row) + `progress` (rows fill the height, tracks thicken). Verified
   portrait + landscape; landscape byte-identical.
3. **CSS box-local work is COMPLETE.** Verifying Phase 3 before writing CSS showed
   the radial/square charts can't be reflowed in CSS (single-SVG, §6) — so the only
   CSS-figure charts (`timeline-list`, `kanban`, `progress`) are all done in Phases
   1–2. Everything else bakes its composition into an SVG/table/Mermaid render.
4. **Phase 4 — render-time (kernel) work; ONE effort; touches exported bytes →
   explicit sign-off + maker-checker.** All the remaining charts converge here
   because they all bake layout at render time:
   - **`piechart` / `radar` / `quadrant` / `map`** — emit a *tall* viewBox with the
     legend below the dial (via `svg-legend.js`), keyed on deck orientation.
   - **`funnel`** — portrait viewBox from `funnel.transform.js` (`0 0 320 180` →
     tall).
   - **`roadmap`** — kernel picks the transposed `.horizons` form for tall boxes.
   - **`gantt` / `journey`** — Mermaid LR → TB direction-switch.

   These are deck-orientation-keyed (render-time can't see a nested cell) — the
   pragmatic limit for baked-SVG/Mermaid, and acceptable since CSS can't reach them.

**Runtime ordering (the footgun a JS geometry-baking transform introduces).** A
chart transform that bakes orientation into geometry must see `data-orientation`
on its FIRST build — the `chart-frame` idempotency guard means a late stamp never
triggers a rebuild. On the export/engine path this is free (the slide pipeline
stamps during `md.render`, before `applyAllToHtml`). On the **runtime** path the
stamp lived in `patchSectionGeometry()`, which ran *after* the content transforms —
so the live preview rendered a landscape funnel on a portrait deck while the export
rendered the tall one (caught in maker-checker review). Fixed by hoisting a
lightweight `stampOrientation()` pass ahead of `runAllContentTransforms()` in the
runtime bootstrap; verified in a real browser that the preview now matches the
export. (CSS-reflow consumers are immune — a late attribute just flips a rule;
geometry-baking transforms are the first to need the early stamp.)

Each phase: render at portrait + landscape, confirm reflow fires and landscape is
byte-identical, before setting `adapt.families`. The four-family thresholds stay
the single source in `lib/adaptive/families.js` (drift-guarded).

## 8. Mobile padding — chart-frame width reclaim (landed with funnel)

A portrait/mobile chart read squeezed and its labels/numbers were hard to read.
Root cause is general, not funnel-specific: `--canvas-scale` reaches **2.29× on
9:19.5 mobile** and multiplies every `--sp-*` token, so a component with a large
horizontal inset (`.chart-body` used `--sp-2xl` in both its width calc and its
padding) balloons that inset on a narrow canvas and starves the figure. The outer
`section` gutter (5cqi, raw — NOT canvas-scaled) is fine; the gap is internal
horizontal insets scaling up where width is most precious.

Fix is **box-local, not systemic** (chosen after rendering both): a
`@container lattice (aspect-ratio <= 0.9)` rule pulls `.chart-body`'s side inset in
(`width: 100cqi − 2·--sp-sm`, `padding: --sp-md --sp-sm`). This is the right axis —
the squeeze is a *centered-figure* problem (the SVG sits centered in the body), so
it bites charts (incl. the SVG-baked `quadrant`/`radar`/`piechart`, all chart-frame
members) but NOT stacked-text components, which reflow full-width on mobile and were
visually unchanged by either option. A systemic `--canvas-scale` dampen was tried
and rejected: huge blast radius, and it mostly retunes *vertical* rhythm — the wrong
axis for this problem.

**Follow-up (separate — a reflow, not padding): `image`.** Its half-canvas split
stays side-by-side on a 9:19.5 mobile (text-left / image-right both ~540px wide),
crushing the text panel. The fix is a portrait box-local *reflow* — stack the image
over the text — not a padding tweak; tracked here for a later pass.
