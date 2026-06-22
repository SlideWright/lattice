---
status: shipped
summary: The execution rubric for Fit Spine §6 — backfilling the solver's four declared inputs (priority, keepTogether, droppable, capacity) across 52 component manifests so collapse/shed/split is read, never guessed. Defines each field's assignment principle, the native-mode trap (native lists still split, so still declare intent), per-bucket archetypes, and the lint plan (flip the undeclared-intent gate to error only once priority hits 52/52). Inventory landed as the worked exemplar.
---

# Solver-intent backfill — the rubric that makes 52 manifests safe

**Date:** 2026-06-22 · **Status:** Accepted — rubric ratified; backfill complete
(52/52 `priority`); the undeclared-intent gate is **live** · **Decision owner:**
maintainer · **Parent:** `2026-06-22-the-fit-spine.md` §6 (this is its execution manual)

---

## Why this doc

The Fit Spine (§6) names the gap and forbids guessing: **the solver decides
collapse vs shed vs split by reading manifest declarations, never by inferring
from content; undeclared intent is a lint error, not a default.** Coverage today
is sparse — `priority` 23/52, `droppable` 5/52, `keepTogether` 11/52, `capacity`
14/52 — so the backfill is a hard prerequisite, not a nice-to-have. But a *wrong*
declaration is worse than the overflow ring: a solver that sheds a load-bearing
column, or splits where the author would have escalated, fails silently where the
ring would have failed honestly (the §4 inversion).

So the bulk can't be blasted by reflex. This doc is the rubric that converts
"52 components of judgment" into "apply this contract" — written once, applied
per bucket, each pass checked against the component's real slots/CSS.

---

## The four fields, and what the solver does with each

All live under `adapt` (`lib/components/manifest.schema.json`). The solver reads
them when `startOverflowWatcher` reports a Cell over budget (the Fit Ladder's
trigger), to choose its move:

| Field | The solver's question it answers | Assignment principle |
|---|---|---|
| **`priority`** | *What leads, and what sheds first?* Slots/roles in importance order, highest first. | The audience-function lead order: what the viewer must leave knowing comes first; chrome/secondary trails. Usually `title` → primary collection → decoration. **Every component declares it** — it is the one always-required field. |
| **`keepTogether`** | *What must never split across a reflow or a slide break?* | The atomic unit: the collection *member* (`["card"]`, `["row"]`, `["stat"]`) and/or a bound sub-part pair (`["value+label"]`, `["question+answer"]`). Name the member when splitting mid-member would orphan content; name a `a+b` pair when two sub-parts are meaningless apart. Empty/omitted **only** when members are genuinely atomic single units (a prose bullet, a logo). |
| **`droppable`** | *What may I shed in the narrowest (strip) box to save the rest?* | A **secondary/decorative role the strip CSS actually hides** — `status-pills`, `meta`, `subtitle`, an `eyebrow`. Reflow-only: declare a role here **only if it names a real sub-part the authored strip layout can drop without losing the component's job**. Never the primary collection. Absent/empty for atomic or `native` components (they don't shed — they split or ring). |
| **`capacity`** | *How many members fit per box, and where do I escalate?* Per-family `min/sweet/soft/hard` on `axis`, plus `escalateTo`. | The render-true budget per family (a Strip honestly holds fewer than a Wide). `hard` is what the **split move** reads as members-per-slide; `escalateTo` is the authored fallback the ring prints. Derive from the existing top-level `capacity` where present, scaled down tall→strip. |

### The native-mode subtlety (the trap this rubric exists to avoid)

`mode: native` means *no structural reflow* (collapse/shed are off) — but a native
component **still overflows and still splits**. So native components MUST still
declare `priority` + `keepTogether` + `capacity` so the **split** move has policy;
they legitimately omit `droppable` (nothing sheds). Missing solver intent on a
native list (e.g. `agenda`, `checklist`) was the single biggest correctness gap —
the solver would have had to *guess* where to break a list it can't reflow.

---

## Per-bucket archetypes (the default declaration shape)

| Bucket | Axis | priority lead | keepTogether | droppable | Split posture |
|---|---|---|---|---|---|
| **inventory** (list/grid/ledger) | `item`/`row` | title → collection | the member (`item`/`card`/`row`) or `q+a`, `term+definition` | a `meta`/`body`/`eyebrow` role *if* strip hides it | **splits** — the `item`/`row` axis the partition kernel owns |
| **comparison** (matrix/ledger/split) | `row`/`col` | title → columns/rows | the row, and column headers with their cells | rarely | **escalates** (read-across — never split a column) → `null` from `partitionAxis` |
| **evidence** (kpi/stats) | `item` | title → figures | `value+label` | `status-pills`, `subtitle` | splits (done — the exemplars) |
| **progression** (steps/criteria) | `item` | title → steps | the step (number+body) | rarely | splits, with `<ol>` continuation (the kernel renumbers) |
| **legal** (stacks/chains) | `item`/`row` | authority → body | citation with its holding | secondary notes | splits |
| **statement / anchor** (title/quote/big-number) | — | the single message | the whole (atomic) | none | **atomic** — escalate/ring, never split |
| **chart / diagram / math / code** | `line` (code) / — | figure → caption | the figure (never split a chart/diagram/equation) | caption/legend | **escalate** — atomic figures `null` from the kernel; code may split by `line` only if safe |
| **imagery** | — | image → prose | image with caption | caption | atomic |

The throughline: **inventory/evidence/progression/legal split** (independent
members on `item`/`row`); **comparison/chart/diagram/math/imagery/statement
escalate or ring** (read-across or atomic) — which is exactly the `null` the
`partitionAxis` kernel returns for `col`/`cell`/`line` and what the solver turns
into `escalateTo`.

---

## The lint plan (turn-on is the LAST step, not the first)

The "undeclared-intent" gate (Fit Spine §4/§6) makes missing `priority` a build
error. It **cannot flip to error until coverage is complete** — 29 components lack
`priority` today, so flipping now reddens the tree. Sequencing:

1. **Backfill** bucket by bucket against this rubric (each pass checker-verified).
2. While backfilling, a **coverage report** (not yet a gate) tracks the burn-down.
3. When `priority` hits 52/52, **flip the gate to error** in `tools/check-ownership.js`
   (one commit), so it can never regress. `keepTogether`/`droppable` stay
   *advisory-complete* (declared where meaningful, provably-empty where not).

✅ **Done.** `checkSolverIntentDeclared` (in `tools/check-ownership.js`, run by
`build:check`) now errors if any component omits `adapt.priority`; covered by
`test/unit/components/adapt-contract.test.js`. A new component cannot land without
declaring how the solver should treat it.

---

## Coverage burn-down

| Field | Start | Now (all buckets) | Target |
|---|---|---|---|
| `priority` | 23/52 | **52/52** ✅ | 52/52 (gated) |
| `keepTogether` | 11/52 | 26/52 | declared-or-justified-empty |
| `droppable` | 5/52 | 5/52 | declared-or-justified-empty |
| `capacity` (per-family) | 14/52 | 14/52 | dense families — a separate render-verified pass |

**Rubric discipline in action (the `logo-wall` case):** the first pass declared
`logo-wall` `droppable: ["eyebrow"]` — the eyebrow *is* a real, secondary slot, so
it read as an obvious shed. The maker-checker caught that **the strip CSS does not
actually hide it**: a `droppable` the layout doesn't honor would make the solver
*shed when it should reflow* — worse than no declaration (§4 inversion). Reverted.
This is exactly the "a wrong declaration is worse than the ring" trap the rubric
exists to catch: `droppable` names what the **strip CSS provably drops**, not what
merely *looks* secondary. `logo-wall` stays `priority`-only — its members (logos)
are atomic and nothing yet sheds.

**All 52 components now declare `priority`** — the gate threshold is met. Buckets,
in landing order:
- **inventory · progression · legal** — the splittable narrative families; the
  partition kernel's `item`/`row` consumers. Native `agenda`/`checklist`/
  `list-criteria` and matrix `obligation-matrix` had *no* intent (the biggest gap).
- **anchor · statement · imagery · comparison-remainder · code · diagram** — the
  atomic / escalate figures and messages: `priority` orders the message + its
  chrome; `keepTogether` binds the inseparable pairs (`number+caption`,
  `quotation+attribution`, `left+right`, table `row`). No member splits — they
  escalate or ring.
- **chart ×13** — every chart has `focusAxes: null` (no splittable axis), so it is
  inherently escalate-only; `priority` orders title → figure → detail and that is
  the complete, justified declaration (the figure is atomic).

**Working principle (post-`logo-wall`):** `priority` always; `keepTogether` for the
atomic member/pair; **`droppable` deferred to the strip-CSS pass** (P3) — declare a
shed only where the CSS provably drops it. `keepTogether`/`droppable` are now
declared-or-justified-empty across the catalog; the final step is the lint flip.
