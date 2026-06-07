# gantt

> Gantt chart — task bars across a date axis.

**Function** progression · **Form** timeline · **Substance** series

**Tags** `swimlane` · `planning` · `milestones` · `agile`

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

- First workstream
  - First task `Q1 → Q2` `done`
  - Second task `Q2 → Q3` `live`
  - Third task `Q3 → Q4` `at-risk`
- Second workstream
  - First task `Q1 → Q2` `done`
  - Second task `Q2 → Q3`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the plan. |
| `tasks` | `ul > li` | yes | Outer li per workstream lane; nested bullets per task. Each task carries inline-code tokens for span (`Q1 → Q2`, or an en-dash / -> delimiter) and an optional status pill; the two pills may appear in any order. Status vocabulary: on-track / done / live / at-risk / warn / blocked / fail / deferred / pilot / decision. The range axis recognises quarters (Q1–Q4) or months (Jan–Dec); other vocabularies fall back to a four-column axis with no ticks. |

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

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`roadmap`](../../progression/roadmap/roadmap.docs.md) — phased grid of deliverables across workstreams without continuous spans
- [`timeline`](../timeline/timeline.docs.md) — single-lane sequence of milestones
- [`kanban`](../../chart/kanban/kanban.docs.md) — current state by stage rather than schedule by lane
- [`list-steps`](../../progression/list-steps/list-steps.docs.md) — sequential process with descriptive steps, no parallel lanes

## Demo deck

See [gantt.gallery.light.pdf](./gantt.gallery.light.pdf) for rendered examples of every variant.
