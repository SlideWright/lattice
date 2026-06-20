---
status: proposed
summary: Feasibility study for converting the 25 `native` components to box-local `reflow` for portrait/tall boxes. Verdict — highly feasible and mostly cheap, BUT "lots of layouts are native" is partly a misframing: 8 of 25 are correctly native (centred single-column — reflow is a literal no-op), ~13 are cheap descendant-collapse reflows that copy the proven §12 sweep recipe (no export sign-off needed), 2 are wide tables needing a markup restructure, 1 (split-panel) already flips via `data-orientation` but the `@container` migration is the known §11 section-element blocker, and 1 (compare-table) is likely MISCLASSIFIED — it should be landscape-only, not a reflow target. Two contract findings flagged for the maintainer.
version: 1
supersedes: none
builds-on: 2026-06-20-adaptive-manifest-contract.md, 2026-06-18-component-adaptive-sizing.md, 2026-06-16-orientation-in-the-form-model.md
---

# Native → reflow feasibility — what's actually convertible, and at what cost

**Date:** 2026-06-20
**Status:** Proposed (analysis; no code changed)

The worry: *"we have lots of layouts/components that are native instead of
reflow."* The adaptive-manifest contract (`2026-06-20-adaptive-manifest-contract.md`)
classified all 52 components — **25 reflow / 25 native / 2 single-orientation** —
and explicitly parked "reflow IMPLEMENTATION for components that still need it"
as a tracked follow-up. This note IS that follow-up's feasibility pass: for each
of the 25 `native` components, *would* a portrait/tall structural reflow help,
and *what would it cost*?

## TL;DR verdict

**Highly feasible, mostly cheap, and smaller than the headline `25` suggests.**
The honest reframe is that **"native" is not synonymous with "unfinished."**
Splitting the 25 by what conversion actually buys:

| Tier | Count | What it is | Cost |
|---|---|---|---|
| **0 — correctly native** | 8 | centred single-column / single-figure / full-bleed; a portrait box needs **no** structural change — reflow is a literal no-op | none — leave as `native`; this is the right answer |
| **A — cheap descendant reflow** | 13 | a multi-column grid/flex on **descendants** of the section; collapse to 1 column in a tall box by copying the proven §12 recipe | low — the sweep already shipped 10 this way; **no export sign-off** |
| **B — table restructure** | 2 | a wide `<table>`; CSS-only column-collapse destroys read-across, so it needs a table→stacked-card markup change (or accept scale-only) | moderate — markup + transform work |
| **C — section-element axis flip** | 1 | `split-panel` flips the **section's own** flex axis; `@container` can't restyle its own container element (§11) — already works via `data-orientation` | blocked on §11/§12; **already functional**, just not via the gated mechanism |
| **Reclassify** | 1 | `compare-table` — a wide ledger whose read-across is load-bearing; likely **landscape-only**, not a reflow target at all | a one-field manifest fix + lint entry |

So the **real reflow backlog is ~13 cheap + 2 moderate = 15 components**, not 25.
Of those, **zero require the export-sign-off scale anchor** — that gate
(`--_sec-1cqi` px stamp, §11) is only for the *nested-cell* capability, which is
orthogonal to full-slide portrait reflow.

## The cost model (why the tiers, not vibes)

The §11/§12 implementation notes already established the mechanism boundaries
empirically. This study just sorts the 25 against them:

1. **Descendant collapse is the proven, cheap path.** A `@container lattice
   (aspect-ratio <= X)` block restyles **descendants** of the section (a `> ul`,
   `> ol`, a grid `> li`). The §12 sweep shipped this for 10 components
   (`kpi`, `list`, `matrix-2x2`, `cards-grid`, `split-compare`, then `pricing`,
   `verdict-grid`, `stats`, `cards-stack`, `content`) by **mirroring each
   component's existing layout into a family query at matched specificity** (the
   doubled-class `section.X.X > …` reaches the `(0,2,N)` the old
   `[data-orientation]` attribute had). Landscape stays **byte-identical** (the
   query is inert above 1.05 aspect). Every Tier-A component below is the same
   move.
2. **A `@container` rule cannot restyle its own container element** (§11). So a
   layout that flips the **section's own** axis (`section.X { flex-direction }`)
   can't be migrated to `@container` without moving the flex axis onto a
   descendant wrapper (markup change). This is exactly why `split-panel` was
   deferred in §12 — it's Tier C.
3. **Wide tables can't column-collapse losslessly.** Dropping a comparison table
   to one column destroys the read-across that *is* the comparison. The honest
   options are (a) landscape-only, or (b) a transform that re-emits the table as
   stacked per-row cards in a tall box. Both are more than a CSS mirror — Tier B.
4. **The nested-cell scale anchor (export sign-off) is NOT on this path.** §11
   stages the `--_sec-1cqi` px stamp only so a *Cell* can become a query
   container without re-basing `cqi` type. Full-slide portrait reflow queries the
   *section* (already a `lattice` container) and needs none of that. Don't let
   that gate block this work.

## Per-component classification (all 25, render-readable evidence)

Verified by reading each component's `*.styles.css` (+ manifest/docs for markup).

### Tier 0 — correctly native (leave as `native`; reflow is a no-op) — 8

| component | bucket | why no reflow helps |
|---|---|---|
| `title` | anchor | centred `h1` + rule + subtitle; `justify/align: center` |
| `closing` | anchor | centred `h2` + `p` |
| `divider` | anchor | centred title + optional subtitle; rail is a section `::before` |
| `quote` | statement | centred blockquote + attribution; `max-width` is a measure cap, not a grid |
| `big-number` | statement | centred single number + caption stack |
| `agenda` | inventory | already a single-column `flex-direction: column` list |
| `checklist` | inventory | single-column flex; each `> li` is one baseline-aligned row |
| `code` | code | full-bleed monospace block; nothing to collapse |

These are native **by design and correctly so.** Converting them is busywork and
would only add inert CSS. The contract counting them as "native" is accurate, not
debt.

### Tier A — cheap descendant reflow (copy the §12 recipe) — 13

Each has a multi-column grid/flex on **descendants**; the portrait win is a
1-column collapse at matched specificity. None touches the section element's own
axis. Listed with the structure that collapses:

| component | bucket | descendant structure → collapse |
|---|---|---|
| `statute-stack` | legal | `> ul > li` `repeat(3, 1fr)` 3-col cards → 1-col (variants already collapse — design clearly anticipated it) |
| `authority-chain` | legal | `> ol > li` `grid-template-columns: 14cqi 1fr` tier-label + body → stack |
| `regulatory-update` | legal | 5-col grid (`.cards` 2-col, `.timeline` horizontal flow) → 1-col |
| `citation-card` | legal | `.split`/`.margin`/`.triptych` 2–3-col grids → 1-col (default is single-col, already native) |
| `actors` | inventory | per-item `grid-template-columns: 1fr auto` (body + actor-pill) → stack pill below |
| `list-tabular` | inventory | per-item 4-track grid (counter/name/desc/meta) → stacked rows |
| `logo-wall` | inventory | `> ul` `repeat(var(--logo-cols,4),1fr)` → fewer cols / 1-col (already a `--logo-cols` lever) |
| `q-and-a` | inventory | `.grid` variant 2×2 → 1-col (other variants already single-col) |
| `compare-prose` | comparison | 2-up flex cards → `flex-direction: column` (a `.vertical` variant already proves the path) |
| `decision` | comparison | horizontal co-equal card strip → vertical stack |
| `list-criteria` | progression | per-item `badge | content` 2-col → badge-over-content |
| `list-steps` | progression | horizontal step cards → vertical (a `.vertical` variant **already exists**; reflow promotes it automatically in tall boxes) |
| `math` | math | `.feature`/`.canvas`/`.matrix` 2-col (equation + legend/plot/properties) → 1-col. `.derivation` table + `.compare` `column-count` are **out of scope** (see Tier B note); `.theorem`/`.stats` are already vertical |

**Notes that affect the recipe, not the verdict:**
- `list-steps` and `compare-prose` already ship an authored `.vertical`
  variant. Auto-applying it in a tall box via `@container` is a *default-behaviour
  policy* call (an author who picked horizontal in a portrait deck), not a
  feasibility one — flag in review, don't silently override an explicit class.
- `math` is **variant-scoped**: convert the 2-col variants, leave the
  already-vertical and the table/multicol ones. Declare `adapt.mode: reflow` once
  any variant reflows (the mode is per-component).

### Tier B — wide table; needs restructure or scale-only — 2

| component | bucket | why it's not a CSS mirror |
|---|---|---|
| `glossary` | inventory | renders a 2-col term/definition `<table>`; clean portrait wants term-over-definition, which is a table→`<dl>`/card markup change (or accept the scaled 2-col, which is tolerable for 2 narrow columns) |
| `obligation-matrix` | legal | semantic `<table>` (obligation × state markers); a 1-col collapse loses read-across — portrait reflow needs a transform that re-emits rows as cards. Scale-only is acceptable today |

These are real but **moderate** — they earn a transform, not a CSS block. Lower
priority than Tier A.

### Tier C — section-element axis flip (the §11 blocker) — 1

| component | bucket | status |
|---|---|---|
| `split-panel` | statement | **Already reflows in portrait** via `section.split-panel[data-orientation="portrait"] { flex-direction: column }` (lines 109–110). It flips the *section's own* axis, so it cannot move to `@container` without putting the row/column flex on a descendant wrapper (markup change) — §12 deferred it for exactly this reason. **It works today**; migrating the *mechanism* is the only open item, and it's the known blocker, not new work |

## Two contract findings (for the maintainer)

The study surfaced two places where the shipped `adapt.mode` declaration is
arguably out of step with the component's behaviour. Both are one-field fixes;
flagging rather than changing, since they're judgment calls the contract says are
backed by "honest declaration + code review," not the static gate.

1. **`split-panel` is declared `native` but it makes a structural change.** The
   contract defines `native` as "adapts by scaling + orientation-aware type
   alone; **no structural change needed**." But `split-panel` flips
   `flex-direction: row → column` in portrait via `[data-orientation]`. The
   static gate doesn't catch it (the gate only enforces `@container … aspect-ratio
   ⟹ reflow`; it says nothing about `[data-orientation]` flips). So `split-panel`
   is **behaviourally a reflow** riding the older deck-stamp mechanism, mislabelled
   `native`. Either reclassify it `reflow` (honest — the #407-era
   `[data-orientation]` flips *are* structural reflow) or accept that `native`
   silently tolerates `[data-orientation]` axis flips and say so in the contract.
   *Recommendation: reclassify `reflow`; it reflows, the gate just can't see how.*
2. **`compare-table` is declared `native` but is probably landscape-only.** It's a
   wide ledger (`capacity.axis: row`, sweet 4 / hard 8) whose read-across is
   load-bearing — the same rationale the 2026-06-16 portrait audit used to mark
   `compare-code` (its sibling) `single-orientation: ["landscape"]`. `native`
   asserts it "must support both orientations," but a 4-column table scaled into a
   9:16 box crowds hard. *Recommendation: render its gallery at `size: story` and,
   if it crowds, move it to `orientation: ["landscape"]` + the
   `LANDSCAPE_ONLY_LAYOUTS` lint list — NOT onto the reflow backlog.*

(Both are render-verifiable in one pass; I've flagged rather than flipped them so
the call stays the maintainer's.)

## Recommended sequencing (if we proceed)

This slots straight into the §8 "sweep" of the adaptive-sizing ADR — same
mechanism, same recipe, same gate. One feature = one branch = one PR (HARD #17);
batch by cost tier so each PR is reviewable:

1. **Batch A1 — legal bucket** (`statute-stack`, `authority-chain`,
   `regulatory-update`, `citation-card`): highest visible payoff (3-col → 1-col is
   dramatic in portrait), self-contained bucket.
2. **Batch A2 — inventory + comparison + progression** (`actors`, `list-tabular`,
   `logo-wall`, `q-and-a`, `compare-prose`, `decision`, `list-criteria`,
   `list-steps`): the remaining descendant collapses; `list-steps`/`compare-prose`
   reuse their existing `.vertical` CSS.
3. **Batch A3 — `math` variants**: scoped to the 2-col variants only.
4. **Contract cleanup** (cheap, do alongside A1): the two findings above —
   reclassify `split-panel → reflow`, render-verify and likely
   `compare-table → landscape-only`.
5. **Tier B (later)** — `glossary`, `obligation-matrix` table restructures, only
   if portrait demand justifies the transform work.
6. **Tier C** — `split-panel` `@container` migration rides the §11 markup-wrapper
   or the staged nested-cell foundation; not urgent (it already works).

Each batch follows the proven contract: mirror the layout into the family query
at matched specificity, set `adapt.mode: reflow` + `adapt.families`, render at
`size: story` (reflow fires) **and** landscape (byte-identical), ship the demo
deck + committed PDF (HARD #9), and let `families.test.js` + `checkAdaptDeclarations`
gate it.

## Non-goals

- **Not converting the Tier-0 eight.** Centred single-column layouts are
  *correctly* native; adding inert reflow CSS is noise.
- **Not the nested-cell capability.** This is full-slide portrait reflow against
  the *section* container; it needs none of the export-sign-off `--_sec-1cqi`
  scale anchor (§11). Keep the two separate.
- **Not reviving `section-as-grid`** or making the manifest *generate* layout —
  the same boundaries the prior ADRs drew (`2026-06-16-retire-section-as-grid.md`)
  hold here.
- **Not touching scale.** Type/spacing stays continuous on `cqi` /
  orientation-aware `--fs-*`; this is purely the *structure* axis.
