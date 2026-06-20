---
status: proposed
summary: Feasibility study for converting the 25 `native` components to box-local `reflow` for portrait/tall boxes. Verdict — highly feasible and mostly cheap, BUT "lots of layouts are native" is partly a misframing: 8 of 25 are correctly native (centred single-column — reflow is a literal no-op), ~13 are cheap descendant-collapse reflows that copy the proven §12 sweep recipe (no export sign-off needed), 2 are wide tables needing a markup restructure, 1 (split-panel) already flips via `data-orientation` but the `@container` migration is the known §11 section-element blocker, and 1 (compare-table) is likely MISCLASSIFIED — it should be landscape-only, not a reflow target. Two contract findings flagged for the maintainer. **Part II (v2)** lifts the question one layer — from "are the components reflow-capable?" to "what does an end-to-end responsive *viewing* experience for the reader (the emailed-link-on-a-phone persona) require?" — and finds the responsive runtime is ~80% already built (the runtime already re-derives orientation from *measured* aspect on every resize); the missing pieces are a fluid-box viewer mode, a content-autofit actuator on the existing overflow watcher (with a legibility floor), and — now in scope — engine-owned re-pagination, which the capacity model already anticipates (`escalateTo: "split across slides"`).
version: 2
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

> **Two layers, two parts.** **Part I** (below, unchanged) answers the
> *component* question: are the layouts structurally reflow-*capable*? **Part II**
> (appended v2) answers the *capability* question that motivated it — what an
> end-to-end responsive **viewing** experience for the reader requires (fluid-box
> reflow, content autofit, and engine-owned re-pagination). Part II **stands on**
> Part I (a responsive viewer is only as good as the components it reflows) but
> deliberately steps past Part I's "structure axis only" scope: it also touches
> scale (autofit) and slide count (re-pagination). Read Part I for the cheap,
> shippable backlog; read Part II for the bigger capability and its phasing.

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

---

# Part II — the responsive *viewing* capability (v2)

Part I asks whether the components are reflow-*capable*. This part asks the
layer-up question that prompted it: **what does an end-to-end responsive viewing
experience for the reader actually require, and is it feasible?** It surfaced
while working through *who portrait is for* — so it starts there.

## Who portrait serves (the personas)

Portrait/social sizes serve four readers, not one. Naming them is what tells us
how big the type must be and who controls density:

| Persona | Where/how they view | Controls density? | Type need |
|---|---|---|---|
| **Publisher** — crafts a LinkedIn/IG carousel | phone, in-feed | **yes** (authors *for* portrait, keeps it sparse) | big, punchy |
| **Feed viewer** — scrolls past the publisher's carousel | phone, glance, sound-off, small in-feed preview first | n/a (consumes) | big enough to survive the shrunk feed thumbnail |
| **Distance presenter** — holds a phone up / vertical kiosk / mobile video share | phone at >arm's length | yes | biggest (distance dominates) |
| **Mobile reader (Persona 2)** — gets an emailed link, reads on a phone | phone, as a document | **NO** — reads whatever density the author shipped | device-native, legible |

**The anchor is the device, not the genre.** A 1080-wide frame shown full-screen
on a typical phone maps ~1080px → ~390 CSS px (scale ≈0.36). So today's 32px body
renders at **≈11.6px on the phone** — below iOS caption size. Hitting the iOS body
default (17px) needs **≈47–50px in-frame**. "Social-friendly ~50px" isn't *punchy*;
it's just *readable on the device portrait is consumed on*. Three of the four
personas want big and *expect* sparse; only Persona 2 can receive **uncontrolled**
density — and that is precisely what this capability must absorb.

**Why Persona 2 is the hard one — a structural fact.** Orientation is
**author-declared and fixed**: the `@size` directive emits a fixed `size: W H`
page box, and `orientationFor()` (`lib/engine/css.js`) derives the category from
that geometry. Nothing reads the viewer's screen. So Persona 2 splits in two:

- **2a — reads an author-made *portrait* deck on a phone:** portrait coefficients
  apply and density was the author's call (≈ the Publisher's output). Already well
  served by a bigger portrait ramp.
- **2b — reads a *landscape* deck on a phone:** it stays 16:9, letterboxed and
  small; the portrait type scale never fires. Untouched by any type decision.

Capabilities 1–3 below are what convert case **2b** from "pinch-zoom a tiny
16:9 deck" into a first-class portrait read — *without* compromising the big
global portrait target, because reflow handles the aspect and autofit floors the
density.

## Finding: the responsive runtime is ~80% already built

The runtime does **not** read a fixed geometry — it *measures* the live section
and already re-runs on every `resize` and DOM mutation:

- `stampOrientation()` (`lib/runtime/index.js`) sets `data-orientation` purely
  from the measured aspect (`offsetWidth/offsetHeight` → `>1.05` landscape /
  `≥0.95` square / else portrait).
- `patchSectionGeometry()` re-runs that **plus** the portrait canvas-scale
  (`injectOrientationStyle`) **plus** the cqi font stamp (`--_sec-1cqi`) on every
  resize.
- The Part-I `@container (aspect-ratio …)` reflows fire off the **box's own
  measured aspect** directly — they need no stamp at all.

So why is there no reflow today? **The slide box is pinned to the authored `@size`
aspect**, so `offsetWidth/offsetHeight` always reports the authored aspect no
matter the device. *Unpin the box and the existing machinery does the rest.*

A precision nuance that ties straight back to Part I's tiers: a fluid box gives
**Tier-A `@container` components the full four-family resolution**
(`wide/square/tall/strip`, `lib/adaptive/families.js`) for free, because their
queries read the box aspect. The **Tier-C `[data-orientation]` holdouts**
(`split-panel`, `citation-card`) ride the runtime's coarser three-bucket stamp
(`portrait/square/landscape`) until migrated — they still reflow, just at coarser
granularity. The Part-I backlog is therefore also the *quality* backlog for this
capability.

## Capability 1 — fluid-box responsive reflow  ·  *feasible; depends on Part I*

**Build:** a viewer/published-HTML mode where the section takes the *viewport's*
aspect (e.g. `100dvw × 100dvh`, or fit-width with natural height) instead of the
locked `size: W H` box. **Free on arrival:** `stampOrientation` flips a
phone-narrow section to portrait, the portrait canvas-scale applies, cqi type
re-fits, and every Tier-A `@container` component restyles to its tall/strip
family. **Cost:** (a) the fluid-box mode itself (CSS + the viewer entry point);
(b) finishing the Part-I Tier-A backlog so *every* bucket reflows cleanly, and
migrating the Tier-C holdouts off the coarse stamp for four-family fidelity.
**Out of its reach:** re-pagination — a fluid box reflows *one* slide's content
into a portrait layout; it does not split a too-dense slide. That's Capability 3;
until then, Capability 2 absorbs the overflow.

## Capability 2 — content autofit  ·  *feasible; detector exists, needs an actuator + a floor*

The detector already ships: `startOverflowWatcher()` (`lib/runtime/index.js`)
measures per-slide overflow (`scrollHeight > clientHeight + TOL`) on every
resize/mutation, idempotently and settled — today it only *warns* (an `.overflow`
class + an "Overflows" tab). **Autofit = give that watcher an actuator:** when a
slide overflows, step the type ramp down (reuse the existing `scale-*` /
`--canvas-scale` lever) until it fits — **but only to a legibility floor** (≈ the
device-17px-equivalent established above). If it still overflows at the floor,
*stop shrinking and keep the warning tab* — never shrink into illegibility. This
preserves the "portrait = sparse" contract and the Quality Bar while giving
Persona 2 a graceful cushion instead of a hard clip. The one risk — a stable
measure→shrink→re-measure loop — inherits the watcher's proven settle pattern
(tolerance + change-only writes). **This deliberately extends past Part I's
"structure axis only" scope: autofit touches scale, by design and with a floor.**

## Capability 3 — engine-owned re-pagination  ·  *in scope; the genuine deep end*

Splitting one too-dense slide into several portrait slides. **The data model
already anticipates it:** `adapt.capacity` declares both the trigger and the
intent — e.g. `cards-stack` ships
`"capacity": { …, "hard": 4, "escalateTo": ["list-tabular", "split across slides"] }`.
The *when* (count > hard) and the *what* ("split across slides") are already
authored per component. The missing pieces:

1. **A shared partition kernel (HARD RULE #1).** A pure
   `(content, per-component split-policy, target geometry) → slide partition`
   function in the shared kernel (`lib/core`/`lib/transformers`), consumed by
   **both** the build-time exporter (deterministic page counts) **and** the
   runtime viewer (client-side) — one source of truth, never two
   implementations.
2. **Per-component split policy.** Where a component may break: a list/stack
   splits *between items*; an atomic card, a 2×2 matrix, or a read-across
   `<table>` does **not** — it escalates via autofit or the manifest's other
   `escalateTo` (`list-tabular`), never mid-figure. Keyed on the existing
   `capacity.axis` + `hard` count, so no new contract — just a consumer of it.
3. **Continuation rendering.** Carried-over title + a `(cont.)` eyebrow, repeated
   masthead, continued numbering — editorial, but real.
4. **Test impact.** The PDF-page-count integration tier becomes
   **orientation-conditional** (one deck → different counts per `@size`).
   Rebaseline those assertions as orientation-aware rather than fixed.
5. **Blast radius.** High — engine now owns slide count, which it never has
   (slides are author-delimited by `---`). This is **maker–checker** work when
   built, with an independent checker on the partition kernel.

**The sub-fork inside re-pagination:** *build-time* splitting (the exporter
partitions at render time, knowing the target `@size`) is deterministic and
tractable; ***runtime* splitting (the viewer re-paginates live as the phone
rotates) is the hard part** — navigation, deep-link anchors, and progress all
shift as slides multiply. Recommendation captured below: **ship build-time
re-pagination first** (it already serves Persona 2 whenever the emailed link is a
per-device export), and treat *live* runtime re-pagination as a guarded stretch.

## Recommended phasing (Part II)

Each phase is one branch → one PR (HARD #17), gated by the same `families.test.js`
+ `checkAdaptDeclarations` machinery, with landscape held byte-identical.

- **P0 — fluid-box viewer mode** + finish the Part-I Tier-A backlog. Unlocks
  reflow for every `@container` component *for free* once the box is fluid; the
  single highest-leverage step.
- **P1 — autofit actuator + legibility floor** on the existing overflow watcher.
  Small, self-contained, immediately protects Persona 2 from clipping.
- **P2 — build-time re-pagination** via the shared partition kernel keyed on
  `adapt.capacity`. Deterministic, testable, maker–checker.
- **P3 — live runtime re-pagination** (stretch; the genuinely hard one). Only if
  the responsive-viewer demand justifies the navigation/anchor complexity.

**Export sign-off:** P2/P3 change the *bytes of exported artifacts* (page counts,
pagination) → both require the CLAUDE.md export-sign-off gate (render a
representative deck in dark + light, send for inspection) before merge. P0/P1 are
viewer/CSS behaviour and go through the normal visual-review path.

## Non-goals

- **Not converting the Tier-0 eight.** Centred single-column layouts are
  *correctly* native; adding inert reflow CSS is noise.
- **Not the nested-cell capability.** Part-I full-slide portrait reflow queries
  the *section* container and needs none of the export-sign-off `--_sec-1cqi`
  scale anchor (§11). Keep the two separate.
- **Not reviving `section-as-grid`** or making the manifest *generate* layout —
  the same boundaries the prior ADRs drew (`2026-06-16-retire-section-as-grid.md`)
  hold here.
- **Part I touches structure only.** Type/spacing stays continuous on `cqi` /
  orientation-aware `--fs-*` for the component-reflow backlog. **Part II Capability
  2 (autofit) is the one deliberate exception** — it steps the scale down to a
  legibility floor to absorb uncontrolled density; that is scoped, floored, and
  viewer-only.
- **Not *live* runtime re-pagination in the first build.** P3 is a guarded
  stretch; build-time re-pagination (P2) is the committed path.
