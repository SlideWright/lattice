# timeline-list

> Date-stamped event list rendered as a horizontal spine — a dot per event with its date pill above and title, status pill, and body stacked below.

**Function** evidence · **Form** timeline · **Substance** series

**Tags** `changelog` · `milestones` · `status` · `retrospective`

**Density** up to ~16 words per item (overflows past 24) — one stage in a sentence.

Use for milestone history or annotated timelines. Each event sits on a left-to-right spine: a dot with its date pill above it, then the title, an optional status pill, and a short body stacked beneath.

## When to use

- **Milestones in time.** Project history, regulatory deadlines, deployment phases, incident post-mortems — anywhere the sequence is in calendar time and each entry needs a date, a verdict, and a sentence of body. The date pill anchors the spine.
- **Annotated, not just chronological.** Reach for timeline-list when each milestone needs a status read (`decision`, `live`, `at-risk`, `done`) AND a sentence of context. For a plain ordered list use `list-steps`; for time-bound bars use `gantt`.
- **Four to seven entries.** Below four the spine looks empty; past seven the body bullets compress. Trim the long tail or split the timeline by phase — a 'past' deck and a 'next' deck both read better than a twelve-item spine.

## When NOT to use

- **Date-less steps.** No calendar dates? You have a sequence, not a timeline. Use `list-steps` for an ordered list or `journey` for stage-by-stage progress.
- **Date-range bars.** If each milestone needs a start and end on a shared axis, it's a Gantt chart. Use `gantt` — bar geometry conveys the durations a pill cannot.
- **Status pills as decoration.** The status pill is a verdict — `decision`, `live`, `at-risk`, `blocked`, `done`. Don't invent freeform tags; the engine tints only the known vocabulary.

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
│        Dated milestones heading         │
│                                         │
│          ●─────────●─────────●          │
│      2024-01    2024-03    2024-05      │
│    Event one  Event two  Event three    │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This component accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`gantt`](../../chart/gantt/gantt.docs.md) — milestones occupy date ranges, not single moments
- [`list-steps`](../../progression/list-steps/list-steps.docs.md) — the sequence has no dates, just an order
- [`journey`](../../chart/journey/journey.docs.md) — stage-by-stage progress without calendar dates
- [`roadmap`](../../chart/roadmap/roadmap.docs.md) — the timeline is forward-looking and bucketed by horizon
- [`progress`](../../chart/progress/progress.docs.md) — the events are parallel workstreams with completion percentages

## Demo deck

See [timeline-list.gallery.light.pdf](./timeline-list.gallery.light.pdf) for rendered examples of every variant.
