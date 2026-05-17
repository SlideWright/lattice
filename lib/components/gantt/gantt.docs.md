# gantt

> Gantt chart — task bars across a date axis.

**Function** progression · **Form** timeline · **Substance** series

Use for project plans with overlapping or staggered tasks. Each task is a bar on the time axis; bars can span multiple periods and carry status tints.

## When to use

- **Overlapping work across lanes.** When tasks run in parallel across multiple workstreams and the audience needs to see who is busy when. The lane-stacked bars make concurrency visible at a glance.
- **Span is the story.** Each bar's length encodes its duration. Use gantt when start dates, end dates, and overlap are what you want the audience to remember.
- **Status pills add a second channel.** Tint bars with `done` / `live` / `at-risk` / `blocked` to layer health onto schedule. The plan reads as both 'when' and 'how it's going' in one chart.

## When NOT to use

- **Single workstream.** One lane of bars is a timeline, not a gantt. Use `timeline` or `list-steps` when there is no parallel work to coordinate.
- **More than five lanes.** Past five workstreams the bars compress and the labels crowd. Group lanes (collapse 'SDK' subdomains into 'SDK') or split into two slides.
- **No spans.** If tasks are point-in-time milestones rather than durations, use `timeline` or `roadmap milestones`. gantt earns its chrome only when bars have meaningful length.

## Authoring

```markdown
<!-- _class: gantt -->

`2026 Q1 → 2026 Q4`

## What ships in each phase, by workstream.

Three workstreams across four quarters. Status pills tint each bar.

- Platform
  - Codebook signing `Q1 → Q2` `done`
  - Multi-tenant DEKs `Q2 → Q3` `live`
  - Per-purpose codebooks `Q3 → Q4` `at-risk`
- Operations
  - Manual rotation `Q1 → Q2` `done`
  - Automated rotation `Q2 → Q3` `live`
  - Crypto-shred `Q3 → Q4`
- Compliance
  - Audit trail `Q1 → Q2` `done`
  - Centralised log `Q2 → Q3`
  - Examiner pack `Q3 → Q4`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the plan. |
| `tasks` | `ul > li` | yes | Outer li per workstream lane; nested bullets per task. Each task carries inline-code tokens for span (`Q1 → Q2`) and optional status (`done` / `live` / `at-risk` / `blocked`). |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Gantt chart heading.                   │
│                                         │
│  Task A         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░    │
│  Task B         ▓▓▓▓▓▓▓▓░░░░░░░░░░░░    │
│  Task C         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░    │
│  Task D         ▓▓▓▓▓▓░░░░░░░░░░░░░░    │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, decoration backgrounds). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`roadmap`](../roadmap/roadmap.docs.md) — phased grid of deliverables across workstreams without continuous spans
- [`timeline`](../timeline/timeline.docs.md) — single-lane sequence of milestones
- [`kanban`](../kanban/kanban.docs.md) — current state by stage rather than schedule by lane
- [`list-steps`](../list-steps/list-steps.docs.md) — sequential process with descriptive steps, no parallel lanes

## Demo deck

See [gantt.gallery.pdf](./gantt.gallery.pdf) for rendered examples of every variant.
