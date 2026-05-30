# timeline-list

> Date-stamped event list — spine with date pills, status pills, and body.

**Function** evidence · **Form** timeline · **Substance** series

**Tags** `changelog` · `milestones` · `status` · `retrospective`

Use for milestone history or annotated timelines. Each item gets a date pill on the left, status pill on the right, body in the middle.

## When to use

- **Milestones in time.** Project history, regulatory deadlines, deployment phases, incident post-mortems — anywhere the sequence is in calendar time and each entry needs a date, a verdict, and a sentence of body. The date pill anchors the spine.
- **Annotated, not just chronological.** Reach for timeline-list when each milestone needs a status read (`decision`, `live`, `at-risk`, `done`) AND a sentence of context. For a plain ordered list use `list-steps`; for time-bound bars use `gantt`.
- **Four to seven entries.** Below four the spine looks empty; past seven the body bullets compress. Trim the long tail or split the timeline by phase — a 'past' deck and a 'next' deck both read better than a twelve-item spine.

## When NOT to use

- **Date-less steps.** If the items don't carry calendar dates, you have a sequence, not a timeline. Use `list-steps` for an ordered list or `journey` for stage-by-stage progress without a date axis.
- **Date-range bars.** If each milestone needs a start and an end on a shared time axis, the slide is a Gantt chart. Use `gantt` — the bar geometry will convey the durations the pill cannot.
- **Status pills as decoration.** The status pill is a verdict — `decision`, `live`, `at-risk`, `blocked`, `done`. Don't invent freeform tags; the engine only tints the recognised vocabulary, and decorative pills break the at-a-glance read.

## Authoring

```markdown
<!-- _class: timeline-list -->

`Eyebrow · context`

## How it unfolded.

1. `2024 Q3` First milestone
   - One-sentence description of what shipped.
2. `2025 Q1` Second milestone `decision`
   - One-sentence description.
3. `2025 Q3` Third milestone `live`
   - One-sentence description.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading framing the timeline. |
| `events` | `ol > li` | yes | Ordered list (numbered). One li per event: a leading inline-code date pill, then the title, then an optional trailing inline-code status pill, then nested body bullets — e.g. 1. `2025 Q1` Framework approved `decision`. Status vocabulary: decision / live / at-risk / blocked / done / on-track / deferred. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Date-stamped timeline.                 │
│                                         │
│  2024-01-15  Event one — short note     │
│  2024-03-02  Event two — short note     │
│  2024-05-19  Event three — short note   │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`gantt`](../../chart/gantt/gantt.docs.md) — milestones occupy date ranges, not single moments
- [`list-steps`](../../progression/list-steps/list-steps.docs.md) — the sequence has no dates, just an order
- [`journey`](../../progression/journey/journey.docs.md) — stage-by-stage progress without calendar dates
- [`roadmap`](../../progression/roadmap/roadmap.docs.md) — the timeline is forward-looking and bucketed by horizon
- [`progress`](../../chart/progress/progress.docs.md) — the events are parallel workstreams with completion percentages

## Demo deck

See [timeline-list.gallery.light.pdf](./timeline-list.gallery.light.pdf) for rendered examples of every variant.
