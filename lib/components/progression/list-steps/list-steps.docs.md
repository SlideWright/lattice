# list-steps

> Vertical sequence of steps, each with full description body.

**Function** progression · **Form** timeline · **Substance** structure

Use for richer sequential processes where each step needs a paragraph rather than a label. More verbose than timeline; more structured than a plain ordered list.

## When to use

- **Steps need a sentence each.** When each step carries a label plus a sentence of description. Lighter rosters of steps with short labels live in `timeline`; richer descriptions belong here.
- **Three to five steps.** Two steps wastes the layout's ledger feel; six begins to crowd. Group adjacent steps or split the process at a natural phase break.
- **Prefix word names the unit.** The default `STEP` prefix can swap to `PHASE`, `STAGE`, `MILESTONE`, `RANK`, or `TIER`. Pick the noun that matches how the audience already thinks about the process.

## When NOT to use

- **Light labels, no body.** If each step is a single label with no description, use `timeline`. list-steps earns its chrome only when the body adds substance.
- **Parallel options.** If the rows are alternatives the audience compares, use `cards-grid` or `verdict-grid`. The numbered prefix here reads as sequence — using it for parallel items mis-cues the audience.
- **Author-typed step numbers.** Don't write `**STEP 01**` into the markdown. The badge is CSS-generated from the `ol` counter; manual numbering double-stamps and breaks on reordering.

## Authoring

```markdown
<!-- _class: list-steps -->

## How to roll this out.

1. First step — a sentence describing what you do here.
2. Second step — a sentence describing what you do here.
3. Third step — a sentence describing what you do here.
4. Fourth step — a sentence describing what you do here.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the process. |
| `steps` | `ol > li` | yes | Ordered list; each li gets a step number. Body can be one paragraph or a nested bullet list. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Step-by-step heading.                  │
│                                         │
│  [STEP 01]  First step label            │
│             supporting body             │
│  [STEP 02]  Second step label           │
│             supporting body             │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `vertical` — Vertical — strip flips column to row

Flips the step strip from a vertical stack into a horizontal row; arrow connectors rotate to down-arrows. Pairs well with `compact` for three-step decks where each step needs body-paragraph room.

```markdown
<!-- _class: list-steps vertical compact -->

## Three phases, vertically arranged.

1. Discover
   - Interview eight stakeholders. Open questions only — listening for friction, not confirming assumptions.
2. Frame
   - Half-day workshop to align on root cause. Output is a ranked problem statement.
3. Decide
   - Written sign-off on what is in scope, what is out, and what requires a separate decision.
```

### `phase` — Phase — badge prefix becomes PHASE

Swaps the default `STEP` prefix for `PHASE`. Use when the process is a sequence of phases rather than individual actions — common for rollout plans, release trains, and engagement models.

```markdown
<!-- _class: list-steps phase -->

## A four-phase engagement model.

1. Discovery
   - Eight weeks. Stakeholder interviews, current-state audit, and a problem-framing workshop produce a signed scope.
2. Design
   - Six weeks. Two design partners co-build the operating model and the change-management plan.
3. Pilot
   - Twelve weeks. One business unit runs the model end-to-end with weekly retrospectives.
4. Rollout
   - Phased by region. Pilot learnings shape the rollout cadence; central team owns the playbook.
```

### `milestone` — Milestone — badge prefix becomes MILESTONE

Swaps the prefix to `MILESTONE`. Use when each row is a discrete delivery checkpoint rather than an ongoing activity. Pairs with `lettered` for milestones tracked by letter rather than number.

```markdown
<!-- _class: list-steps milestone lettered -->

## Three milestones to GA.

1. Closed beta
   - Five design-partner accounts live on the platform. Daily standups; weekly retros.
2. Open beta
   - Self-serve signup at the marketing site. Pricing visible but not enforced.
3. GA
   - Billing enforcement on. SLA enters effect. Support escalation paths published.
```

### `lettered` — Lettered — counter format becomes A, B, C

Replaces the leading-zero decimal counter with letters. Composes with any prefix; useful when the rows are options or tracks rather than ordered work.

```markdown
<!-- _class: list-steps lettered -->

## Three tracks for the next quarter.

1. Platform hardening
   - Multi-tenant DEKs, automated rotation, and the crypto-shred runbook land in this track.
2. Compliance posture
   - Examiner pack v2 and the centralised audit log ship for the Q3 audit window.
3. Developer surface
   - Polyglot SDK parity and the new CLI flags close out the API roadmap.
```

### `stage` — Stage

Badge prefix becomes `STAGE 01`, `STAGE 02`, …

```markdown
<!-- _class: list-steps stage -->

## Three stages, with explicit stage prefixes.

1. Plan
   - Define the work and the artifacts each stage produces.
2. Execute
   - Run the work against the plan; track variance.
3. Review
   - Compare actuals to plan; capture lessons for the next cycle.
```

### `rank` — Rank

Badge prefix becomes `RANK 01`, `RANK 02`, … Use for ordered lists where each position is a competitive rank.

```markdown
<!-- _class: list-steps rank -->

## Top three risks, ranked by exposure.

1. Renewal cohort
   - $2.1M ARR at risk if pricing comp gap persists.
2. Pipeline conversion
   - 11 pp below Q1; legal review is the chokepoint.
3. Competitive displacement
   - Seven losses to one competitor in the $80-200K tier.
```

### `tier` — Tier

Badge prefix becomes `TIER 01`, `TIER 02`, … Use for stratified groupings where each tier is qualitatively distinct.

```markdown
<!-- _class: list-steps tier roman -->

## Three engagement tiers.

1. Strategic
   - Quarterly executive review, dedicated success manager.
2. Growth
   - Monthly check-in, shared success pool.
3. Self-serve
   - Async docs, community support.
```

### `roman` — Roman numerals

Counter format becomes `I`, `II`, `III` (composes with any prefix).

```markdown
<!-- _class: list-steps phase roman -->

## Three phases, roman-numeral counter.

1. Discovery
   - Identify the constraints and the success criteria.
2. Design
   - Sketch options against the constraints; pick one.
3. Delivery
   - Build, ship, measure.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`timeline`](../timeline/timeline.docs.md) — shorter labels per step, horizontal axis instead of vertical cards
- [`list-criteria`](../list-criteria/list-criteria.docs.md) — gating requirements rather than a sequence of actions
- [`split-steps`](../split-steps/split-steps.docs.md) — phase label + heading on the left, steps on the right
- [`roadmap`](../roadmap/roadmap.docs.md) — phased grid across multiple workstreams
- [`principles`](../principles/principles.docs.md) — tenets or values rather than a procedural sequence

## Demo deck

See [list-steps.gallery.pdf](./list-steps.gallery.pdf) for rendered examples of every variant.
