---
status: proposed
summary: The foundational spine for responsive/dense-slide work — Frames are the single owner of box-response; a solver fits content by COLLAPSE → SHED → SPLIT and stops at a readability FLOOR, never shrinking. Defines the earn-its-keep ledger (keep/refactor/purge for every existing adaptive mechanism), the Munger inversion that produces the design rules, the red-team that attacks them, and a phased clean-canvas teardown that keeps the tree green at every step. Supersedes the de-boost and reframes per-component reflow as a Frame property.
---

# The Fit Spine — Frames own box-response; a solver fits without shrinking

**Date:** 2026-06-22 · **Status:** Proposed (the spine; no code changed yet) ·
**Decision owner:** maintainer

This is the **spine**: the load-bearing model that the responsive / dense-slide
work hangs off, and the acceptance test every future change is measured against.
It does not introduce a feature. It decides *what the system is* so that the
features (de-boost purge, Frame slicing, the partition solver, the data backfill)
each have one obvious place to live and one reason to exist.

It builds on, and partly supersedes, the scattered prior work:
`2026-06-21-reflow-as-form-capability.md` (Frames as the reflow owner — **kept,
promoted to invariant**), `2026-06-20-native-to-reflow-feasibility.md` (the
solver/pagination scoping — **kept, re-sequenced**), `2026-06-21-portrait-prose-deboost.md`
(text de-boost — **superseded; purged**), and `design/forms.md` (the Frame · Cell ·
Tile grammar — **the spine's vocabulary, unchanged**).

---

## 0. The one-sentence spine

> **A Frame fits its content to whatever box it is given by COLLAPSING, then
> SHEDDING, then SPLITTING — and if none of those make it fit at the readability
> floor, it shows an honest overflow, it never shrinks the type.**

Everything below is the justification, the boundaries, and the demolition plan for
that sentence. Two corollaries fall straight out of it and are the heart of the
rework:

- **Box-response has exactly one owner: the Frame.** Not 32 components, not three
  competing signals. (§2)
- **Readability is a hard floor, not a soft preference.** There is no
  shrink-to-fit primitive anywhere in the system; "make it smaller until it fits"
  is not a move the engine can make. (§3)

---

## 1. First principles (the axioms the spine is derived from)

Stated so the rest is *derivation*, not opinion. If a later decision contradicts
one of these, the decision is wrong, not the axiom.

1. **Readability is the single most valuable property.** A slide that is smaller
   than legible has failed, regardless of whether "it fit." We would rather show a
   visible overflow than an illegible slide.
2. **A look is a function, not a picture.** `(Frame × box × resolution × theme) →
   look` (`forms.md` §1, `reflow-as-form-capability.md` §1). Responsiveness is not
   a mode; it is the *box* argument changing. This is why box-response belongs to
   the Frame — the Frame is the function.
3. **One source of truth per concern (HARD RULE #1).** Box-response, the split
   kernel, the type floor, the box-shape signal — each has exactly one
   implementation, consumed everywhere.
4. **Delivered content is never silently lost (`forms.md` §6 — clip+ring over
   fade).** Shedding *relocates* or *honestly flags*; it never makes authored
   content vanish without a trace.
5. **Earn-its-keep.** A mechanism survives only if it serves the spine. "It works"
   and "it's already here" are not reasons to keep it. The default for anything
   that doesn't serve the spine is **delete**, not deprecate-in-place — a
   deprecated mechanism is a broken window.

---

## 2. The Frame is the sole owner of box-response

### 2.1 What "remove reflow" actually resolves to

"Reflow" in today's tree is **three** unrelated mechanisms (the deep assessment
established this). The earn-its-keep test resolves each:

| Mechanism | Today | Serves the spine? | Verdict |
|---|---|---|---|
| **(a) Per-component `@container` self-adaptation** — 32 components each answer "what do *I* do in a tall box?" | component `.styles.css` | **No** — 32 owners of one concern; the exact drift HARD #1 forbids | **Refactor up** into Frame slicing; retire the per-component CSS as components become Tiles |
| **(b) `[data-orientation]` section-element flips** — split-panel, citation-card flip their own axis | 2 components | **No** — rides a *second*, coarser signal (3-bucket) | **Refactor up** — become Frames with `tall`/`strip` slicing |
| **(c) Collapse-to-one-column** — a 3-col grid → 1 col on a phone | emergent from (a) | **Yes, intrinsically** — it is physics, not a strategy | **Keep, relocate** — owned by the Frame, expressed once |

The honest finding, stated plainly so we don't lie to ourselves later:
**collapse-to-one-column cannot be removed.** A four-up card grid at 390px gives
~120px columns; that is illegible, and you forbade shrinking, and four atomic
cards can't be split or shed without losing 75% of the slide. *Something* must
make it one column. The win is not eliminating that move — it is **moving it from
32 component stylesheets to one Frame contract.** "Remove reflow" = *"no component
ever decides its own box-response; the Frame decides, the Tile fills."* That is
coherent, buildable, and is exactly `reflow-as-form-capability.md` §9.

> **Red-team, answered up front:** *"Then you didn't remove reflow, you renamed
> it."* Correct, and we say so. We remove the **duplication and the ownership
> sprawl**, not the capability. The capability collapses from 32 owners to 1. If
> the intent were *zero* box-responsive CSS anywhere, the only consistent way to
> honor it is build-time-only rendering with no live preview responsiveness — a
> worse product (no authoring feedback, churn on resize) for a purity that buys
> nothing. **Rejected branch**, named so it stays rejected.

### 2.2 One signal, not three

Today three signals encode "what shape is this box": `data-orientation` (3-bucket,
runtime), `@container … aspect-ratio` family queries (4-bucket, CSS), and the new
`data-family` stamp (4-bucket, runtime). Three encodings of one fact is three
chances to disagree at the seam.

**The spine signal is `data-family` (wide / square / tall / strip), classified by
the single `lib/adaptive/families.js` boundary set.** `data-orientation` is
retired into it; `@container` family queries either migrate to `[data-family]`
selectors or are subsumed when the component becomes a Tile. One classifier, one
stamp, one set of boundaries `[0.5, 0.9, 1.05]`.

---

## 3. The Fit Ladder — the only four moves, in priority order

A Frame fitting content to a box has **exactly four** moves. They are ordered;
each fires only when the cheaper one above is exhausted. This closed list *is* the
solver's policy — there is no fifth move, and crucially **no shrink move.**

| # | Move | Owner | Continuous or discrete | Loses content? |
|---|---|---|---|---|
| 1 | **Collapse** — give the Tile a narrower Cell (3-col → 1-col) | Frame slicing (CSS keyed on `data-family`) | continuous (CSS, no churn) | no |
| 2 | **Shed** — relocate a low-priority Cell (chrome bay → footer) or, if genuinely redundant, `region: null` | Frame slicing | continuous | no (relocate) / explicit (null) |
| 3 | **Split** — re-paginate across frames at a declared seam | the partition kernel | **discrete, build-time** | no (continuation) |
| 4 | **Floor** — none of 1–3 fit at the legible floor → stop, show the overflow ring | overflow watcher | terminal | no (honest failure) |

Three properties make this the spine and not just a list:

- **Moves 1–2 are continuous and declarative.** Collapse and shed are generated
  Frame CSS keyed on the measured `data-family`; they respond to a live-resizing
  fluid box with zero churn, because they restyle, they don't re-paginate. This is
  what makes a live preview viable.
- **Move 3 is discrete and build-time.** Splitting changes slide *count*, which
  the engine has never owned. It runs once at render time against a known target
  geometry (the per-device export the emailed-link reader receives). **Live
  runtime re-pagination is rejected** — re-breaking and re-numbering slides as a
  phone rotates is churn and a navigation/anchor maintenance nightmare (the
  inversion in §4 derives this).
- **Move 4 is a hard stop, by design.** The floor is the curated per-orientation
  type scale (already shipped — `2026-06-20-typography-categories.md`). Below it,
  the engine does **not** have a smaller size to reach for. The overflow ring is
  the contract: *readability, or a visible honest failure — never a silent
  shrink.*

---

## 4. Munger inversion — design the failure, then forbid it

Instead of asking "how do we build this well," ask **"what would guarantee this
becomes a tech-debt maintenance nightmare?"** Each failure mode inverts directly
into a binding design rule.

| If we wanted to GUARANTEE failure, we would… | …so the rule is |
|---|---|
| Scatter box-response across N component stylesheets so every one drifts | **One owner: the Frame. One signal: `data-family`.** (§2) |
| Ship a shrink-to-fit escape hatch — it silently becomes the default crutch and the readability bar erodes everywhere, invisibly | **No shrink primitive exists.** The floor is a hard stop with a visible ring. (§3) |
| Build the split logic twice (build-time + runtime) so they diverge | **One pure partition kernel** (HARD #1), consumed by both; runtime *re-pagination* rejected outright. |
| Let the solver guess shed/split when a component declares no priority | **Missing `priority`/`droppable`/`keepTogether` is a lint error, not a guess.** The solver refuses to act on undeclared intent. (§6) |
| Let "shed" silently drop authored content | **Shed relocates or rings; never silent drop** (axiom 4). |
| Keep dead mechanisms "just in case" / deprecate-in-place | **Earn-its-keep: not serving the spine ⟹ deleted**, not parked. (§5) |
| Re-introduce per-named-size layout variants to "handle phones" | **Looks are a function of the box, never enumerated per size** (axiom 2). |
| Mask the density problem so we can't see it | **Purge the de-boost first** — it hides clipping behind shrunk type; removing it makes the real problem visible, which is the precondition for solving it. (§7) |

The last row is the sharpest piece of inversion and it sets the teardown order: a
**masked** problem is worse than a visible one, because you optimize against the
mask. The de-boost is the mask. It comes out first.

---

## 5. The earn-its-keep ledger — every adaptive mechanism, judged

The question for each: *does it serve the Frame spine?* Keep / Refactor-up /
Purge. This is the clean-canvas inventory.

### Keep — load-bearing for the spine

| Mechanism | Why it earns its keep |
|---|---|
| **Form / Frame / Cell / Tile model** (`design/forms.md`, `lib/forms/`) | The spine itself. |
| **`families.js` four-family classifier** | The single box-shape signal (§2.2). |
| **Capacity contract** (`adapt.capacity` + `priority` / `droppable` / `keepTogether`) | The solver's decision inputs (§6). Keep the schema; **backfill coverage** is a workstream. |
| **`countAxis` / `collections.js`** | The solver's render-exact measurement. Extend with `partitionAxis`. |
| **`startOverflowWatcher`** | The Fit Ladder's trigger (when to act) and its move-4 terminal (the ring). |
| **Curated per-orientation type scales** | They *are* the readability floor (move 4). |
| **Fluid-box viewer** (`#472`) | The host for continuous collapse/shed **and** the authoring preview — **not** a live re-paginator. |

### Refactor up — capability is right, ownership is wrong

| Mechanism | Move it to |
|---|---|
| **Per-component `@container` reflow** (32 components) | Frame slicing; retire the per-component CSS as each component becomes a Tile. |
| **`[data-orientation]` flips** (split-panel, citation-card) | Frames with `tall`/`strip` slicing; retire the coarse stamp. |
| **`adapt.mode` manifest field + `checkAdaptDeclarations` gate** | Re-aim: today it gates "CSS has `@container` ⟹ mode `reflow`." When reflow becomes a Frame property the gate's subject changes; keep the *discipline* (a static gate proving box-response is declared, not drifted), retarget the *assertion*. |

### Purge — does not serve the spine; deletion, not deprecation

| Mechanism | Why it goes |
|---|---|
| **Prose de-boost** (`--prose-deboost`, `--dense-body`/`-compact`/`-message`) | It is shrink-to-fit by another name; violates the readability floor (§3) and masks the density problem (§4). Hermetic removal — see `2026-06-21-portrait-prose-deboost.md` purge map; landscape stays byte-identical. |
| **`data-orientation` as a primary signal** | Duplicate of `data-family` (§2.2). |

### Stays rejected (re-affirm, so it doesn't creep back)

- **Frame recursion** (`2026-06-18-frame-recursion-cells.md`).
- **Live runtime re-pagination** (§3, §4).
- **`section-as-grid`** (`2026-06-16-retire-section-as-grid.md`).
- **Per-named-size layout variants** (axiom 2).

---

## 6. The solver's inputs are declared, not inferred — and currently sparse

The solver decides *collapse vs shed vs split* by reading manifest declarations,
never by guessing from content. The contract exists; coverage is the gap:

| Field | Meaning to the solver | Declared on |
|---|---|---|
| `capacity` (`axis`, `sweet`/`soft`/`hard`, `escalateTo`) | when a Cell is over budget, and the authored escape | 14 / 52 |
| `priority` | what leads; what sheds first | 23 / 52 |
| `droppable` | what may be shed in `strip` | 5 / 52 |
| `keepTogether` | what must never be split mid-figure | 11 / 52 |

Per the inversion (§4), **undeclared intent is a lint error, not a default
guess.** That makes the backfill a hard prerequisite, not a nice-to-have: a solver
that splits where the author would have shed, or sheds a load-bearing column, is
worse than the overflow ring. Sizing it honestly: ~40 components need a `priority`
audit, ~47 need a `droppable`/`keepTogether` pass. This is the unglamorous bulk of
the work and the doc names it so it is planned, not discovered.

---

## 7. The clean-canvas teardown — green at every step, no broken windows

Each phase is one branch → one PR (HARD #17), independently shippable, tree green
throughout. Ordered by the inversion: **unmask first, unify second, build third.**

- **P0 — ratify this spine** (this doc). The acceptance test for P1–P6.
- **P1 — purge the de-boost.** Hermetic, low-risk, landscape byte-identical.
  *Effect:* dense portrait slides clip again — the problem becomes **visible and
  honest** (the overflow ring now tells the truth). Precondition for solving it
  well. Restores axiom 1's terminal state as the baseline.
- **P2 — one signal.** Retire `data-orientation` into `data-family`; align the
  boundary tests. No behavior change intended — a unification PR.
- **P3 — Frame slicing: collapse + shed (continuous moves).** Generate
  `data-family`-keyed Cell slicing from Frame manifests (`reflow-as-form-capability.md`
  §7 same-band landed; build cross-band relocation + `region:null` shed). Fold
  split-panel / citation-card in as Frames.
- **P4 — the partition kernel (the split move).** Pure
  `partitionAxis(content, axis, count, geometry) → [slide…]` in `lib/core`,
  build-time, per-component split policy from `capacity`/`keepTogether`, plus
  continuation rendering. **Maker–checker + export sign-off** (it changes exported
  bytes / page counts).
- **P5 — backfill solver data** (§6) across the catalog; turn on the
  undeclared-intent lint.
- **P6 — retire per-component `@container` reflow** as components graduate to
  Tiles; re-aim the `adapt` gate (§5).

P1 and P2 are pure subtractions/unifications and can land immediately. P3–P6 are
the build, gated by this spine.

---

## 8. Red team — attack the spine before we commit to it

- **"Collapse-as-Frame-CSS is reflow you didn't delete."** Acknowledged in §2.1.
  Claim is *consolidation* (32 → 1), not elimination. Honest and stated.
- **"Build-time pagination makes the engine own slide count — huge blast
  radius."** Yes. It is gated by export sign-off + maker–checker, deterministic
  and testable. It is the committed P2-class work from the feasibility study, not
  the rejected live-runtime P3.
- **"Sparse solver data means the solver can't act for most components."** True
  today — which is why §6 makes the backfill a prerequisite and §7 schedules it
  before the lint turns on. Not hand-waved.
- **"Read-across tables can't collapse, shed, or split without losing meaning."**
  Correct, and already handled: `compare-table` / `compare-code` / `redline` are
  quarantined `single-orientation: ["landscape"]`. The solver *escalates* (move 3's
  `escalateTo`), it never splits a read-across ledger. The closed move-list makes
  this a rule, not a special case.
- **"An atomic card that overflows even at 1-column + floor?"** Move 4 fires: the
  overflow ring. The system guarantees *readability or a visible honest failure*,
  by design, with no silent shrink. That is the contract, not a gap.
- **"Is the fluid viewer still worth its keep if it can't re-paginate live?"**
  Yes — it hosts the continuous moves (collapse/shed) and is the authoring preview.
  Delivery to Persona 2 is the per-device build-time export. Two surfaces, one
  Frame model, no churn.

---

## 9. What this doc decides (so the next PR is unambiguous)

1. **Box-response has one owner — the Frame — and one signal — `data-family`.**
2. **The Fit Ladder is a closed four-move list: collapse → shed → split → floor.
   There is no shrink move.**
3. **Continuous moves (collapse, shed) are declarative Frame CSS; the one discrete
   move (split) is a build-time pure kernel. Live runtime re-pagination is
   rejected.**
4. **The de-boost is purged; `data-orientation` is retired; per-component reflow
   refactors up into the Frame.**
5. **Solver intent is declared, never inferred; the backfill is a prerequisite.**
6. **Teardown order is unmask → unify → build, green at every step.**

The single fork left for the owner is whether §3's resolution of "remove reflow"
(consolidate box-response into the Frame, which *is* still box-responsive CSS at
the Frame altitude) matches the intent — or whether the stricter "zero
box-responsive CSS, solver-only" reading is wanted (the rejected branch in §2.1,
which costs the live preview and buys nothing). The spine above takes the former.
