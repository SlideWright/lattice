# kanban

> Kanban board — columns of cards by stage.

**Function** progression · **Form** timeline · **Substance** series

Use for status snapshots: what's in each lane (todo/doing/done or similar). Each column is a stage; each card is a work item.

## When to use

- **Status snapshot by stage.** When the audience needs to see what is in each lane right now — backlog, in progress, review, done. The board reads as the current state of the work, not its history or schedule.
- **Mixed card density is informative.** Lanes that bulge or thin out tell the story — a fat 'in progress' column flags a WIP overload; an empty 'review' column flags a handoff stall. The visual imbalance is the signal.
- **Cards carry size and status meta.** Trailing inline-code badges (`S`/`M`/`L`/`XL`) sit in the title row; status pills (`at-risk`, `blocked`) push right on the meta row. The card stays scannable while the second channel of information rides along.

## When NOT to use

- **Schedule, not status.** If the question is when each task ships rather than where it sits today, reach for `gantt` (spans) or `roadmap` (phases). Kanban is a snapshot, not a timeline.
- **More than five lanes.** Past five columns the cards compress and the column headers crowd. Group adjacent stages or split into two boards (e.g. by team) instead.
- **Cards without meta.** A board of bare titles wastes the layout's affordances. Add at least a size badge and a lane label so the audience can scan workload and ownership at a glance.

## Authoring

```markdown
<!-- _class: kanban -->

`Phase 2 · Sprint 14`

## Where Phase 2 work stands today.

Four columns, mixed card density. Size badge sits in the title row.

- Backlog
  - Per-purpose codebooks `S`
  - Crypto-shred runbook `M`
  - Dependency dashboard `S`
- In progress
  - Multi-tenant DEKs `M`
    - platform `at-risk`
  - Examiner pack v2 `L`
    - compliance
- Review
  - Centralised log `S`
    - compliance
- Done
  - Codebook signing `M`
  - Manual rotation `S`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading. |
| `lanes` | `ul > li` | yes | Outer li per lane (stage), lead with **Stage name.**. Inner bullets per card in that lane. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Kanban heading.                        │
│                                         │
│  TODO         DOING        DONE         │
│  [card 1]     [card 4]     [card 7]     │
│  [card 2]     [card 5]     [card 8]     │
│  [card 3]     [card 6]                  │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [reference/design-system.md §6.5](../../reference/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`gantt`](../gantt/gantt.docs.md) — schedule of overlapping tasks across lanes, not current state
- [`roadmap`](../roadmap/roadmap.docs.md) — phased grid of deliverables across workstreams
- [`checklist`](../checklist/checklist.docs.md) — single list of items with done/in-flight/planned states
- [`verdict-grid`](../verdict-grid/verdict-grid.docs.md) — options scored against shared criteria, not stage-tracked

## Demo deck

See [kanban.gallery.pdf](./kanban.gallery.pdf) for rendered examples of every variant.
