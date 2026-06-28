---
status: in-progress
summary: Retire the keystone of HARD RULE #20 — the base block-flow typographic margins (`section h2/h3/p { margin-bottom }`). The stage cell owns vertical prose rhythm via `gap` instead of per-element `margin-bottom`; the base element margins are zeroed; the few modifier riders re-home to `padding`/`gap`. An empirical check (44/53 components already self-space with `gap`/`padding` and reset the base prose margins; the title `h2` lifts into the masthead under Form) shows the real consumer of the base rhythm is generic prose, which sits as direct children of `.cell-stage` and is reachable by a stage `gap` — so this is a genuine conversion, not a sanction. Only the irreducible flex `margin-left:auto` push stays, enumerated. Drives MARGIN_BUDGET 12 → 0 (layout) with a named allowlist.
---

# Stage-flow without margins — retire the base typographic-rhythm keystone

**Closes the keystone of #556** (HARD RULE #20, `MARGIN_BUDGET → 0`). The
independent margin slices shipped in #557; the contract-tier margins went with
#563. This note is the last phase the ticket flagged as "design-doc-first."

## Context

HARD RULE #20 bars `margin` in engine layout CSS: it sits outside the box, so
`getBoundingClientRect()` / `offsetHeight` can't see it, and it margin-collapses
— both corrupt the height math a measuring layout (the overflow probe, autosplit,
the Fit Spine) depends on. The budget ratchet (`checkMarginDiscipline` in
`tools/check-ownership.js`) sits at **12**, target **0**.

The remaining 12 are the *keystone*: the base block-flow typographic rhythm.

| Where | Count | What |
|---|---|---|
| `base.elements.css` | 7 | `h2/h3/h4/h5/h6 { margin-bottom }`, `p { margin-bottom }`, `hr { margin: … auto }` — the vertical rhythm of all prose |
| `base.modifiers.css` | ~5 | eyebrow `margin-bottom`, the `.below-note` trailing-note `margin-top`, KaTeX-display `margin`, and an **irreducible flex `margin-left:auto`** push |

These resisted the #551/#557 mechanical sweep because two of their properties are
*features*, and neither `gap` nor `padding` obviously reproduces both:

1. **They cascade to every nesting depth.** `section p { margin-bottom }` spaces a
   paragraph whether it is a direct stage child or buried inside a component. A
   stage-level `gap` only reaches **direct children**.
2. **They collapse.** Adjacent block margins merge to the larger; the last child's
   trailing margin collapses away. `padding` doesn't collapse — it doubles at
   boundaries and leaves trailing space inside the clip. (This is the misfire that
   broke `kpi` in #555.)

## The decision I almost made — and why it was wrong

The cheap path was to **sanction** the typographic flow: declare it the rule's one
permanent exception, enumerate it in an allowlist, and call #20 "achieved (layout)."
The argument was that the conversion would break nested prose rhythm across all 53
components.

**That premise was never checked. When checked, it is false:**

- **44 / 53** component stylesheets set their own nonzero margins; **43 / 53** use
  `gap`. They explicitly *reset* the base prose margins (`section.title p { margin:0 }`,
  `closing`, `divider`, `split-compare`, `citation-card`, `list-steps`, …) and space
  with `padding` / `gap`. They do **not** lean on the cascade.
- The **9** that set no margin of their own are charts + grids (`funnel`, `gantt`,
  `map`, `piechart`, `progress`, `quadrant`, `glossary`, `inventory`,
  `obligation-matrix`) — they have a chart/grid body, not flowing prose, so they
  don't consume `section p { margin-bottom }` either.
- Under Form (the default) the **title `h2` lifts into the masthead band**, leaving
  the stage body with body prose + sub-headings (`h3`/`h4`, all `--sp-xs`). The one
  differential (`h2` wants `--sp-sm`) evaporates from the stage. Remaining rhythm is
  essentially **uniform `--sp-xs`** — exactly what a single stage `gap` expresses.

So the real consumer of the base typographic margins is **generic prose** (plain
markdown with no component CSS), and that flows as **direct children of `.cell-stage`**
— *reachable by a stage `gap`*. The "breaks 53 components" blast radius was imaginary.
Sanctioning would have been settling.

The measurement objection also doesn't actually bite for block-flow rhythm: inter-block
margins move the following boxes (so the spill the probe now measures via child
`getBoundingClientRect` *does* see them), and the only margin-invisible case — a
*trailing* margin-bottom inside the clip — is benign (it can't cause overflow). But
"not a hazard" is the argument for leaving margins; the point here is we don't need
them at all.

## Decision

**Convert, don't sanction.** Move vertical prose rhythm off per-element
`margin-bottom` and onto the flow container:

1. **`.cell-stage` owns the rhythm.** The stage cell is a flex column with
   `gap: var(--sp-xs)` (the universal prose step). The leading sub-heading / first
   block sits flush at the top; the gap spaces every subsequent block. This reaches
   the generic-prose direct children — the real consumers — and never leaves a
   trailing margin inside the clip.
2. **Zero the base element margins** (`base.elements.css` `h2…h6`, `p` → `margin:0`;
   `hr` centering → a non-margin centering). Components already reset these, so they
   are unaffected; generic prose now gets its rhythm from the stage gap.
3. **Re-home the riders** to `padding` / `gap` on their *own backgrounded boxes*
   (eyebrow, `.below-note` trailing note, KaTeX display).
4. **Sanction only the irreducible.** The flex `margin-left:auto` push (trailing-item
   shove in a flex row) has no non-margin equivalent; it stays, enumerated in a
   `SANCTIONED` allowlist with its justification — the same treatment the vendored
   hljs margin already gets. The gate becomes **layout budget 0 + named allowlist**,
   so #20 reads *"zero in layout CSS; the irreducible flex push is the one sanctioned
   exception"* — truthfully **achieved**.

## Blast radius & verification

The change touches the vertical rhythm of **every slide**, so it is verified the only
way that exercises all 53 components at once: **render the full gallery and pixel-diff
vs. the committed baseline** (the `golden-diff` CI tier, plus local
`tools/pixel-check.js`), in **both light and dark**. Any nested-prose container that
silently leaned on the cascade shows up as a diff; the fix for each is to give *that
container* a `gap` (the #20-compliant answer), not to restore the base margin. The
expectation is: generic-prose slides shift by sub-pixel rounding at most; components
do not move. Deviations are triaged before the budget is ratcheted.

## Consequences

- `MARGIN_BUDGET` is replaced by `LAYOUT_MARGIN_BUDGET = 0` + an enumerated
  `SANCTIONED` allowlist; `checkMarginDiscipline` fails on any *unlisted* margin.
- HARD RULE #20's wording moves from "exceed-only ratchet, target zero" to "zero in
  layout CSS; the sanctioned set is enumerated here."
- New components inherit prose rhythm from the stage for free; a component with a
  multi-block prose body provides its own `gap` (already the norm).

## References

- #556 (the ticket), HARD RULE #20 in `CLAUDE.md`, `engineering/gotchas.md` (#20 entry)
- `tools/check-ownership.js` `checkMarginDiscipline` / `MARGIN_BUDGET`
- `lib/forms/cell/stage/stage.css` (the block-flow note this supersedes)
- `2026-06-26-frames-as-flex-cell-trees.md` (the cell-tree the stage gap extends)
