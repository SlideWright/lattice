# piechart

> Pie or donut chart with legend — proportional wedges.

**Function** evidence · **Form** canvas · **Substance** series

Use for part-to-whole breakdowns with three to six slices. Add the `donut` modifier for a hole in the middle — visually cleaner for executive decks.

## When to use

- **Three to six parts of a whole.** Time allocation, budget breakdown, mix-of-business. Past six slices the wedges become unreadable and the legend overwhelms — split or pick the top five plus an `Other` slice.
- **Proportions matter more than precision.** Pie charts are good at 'roughly a third', bad at 'is it 28% or 31%?'. If exact differences are the argument, reach for a bar chart (`progress`) where the eye can compare lengths directly.
- **Donut for executive decks.** The `donut` modifier hollows the centre — cleaner, less crowded, and the hole reads as composed rather than as a missing slice. Default to donut for board / investor decks; reserve solid pies for analyst working sessions.

## When NOT to use

- **Slices that don't sum to a whole.** A pie of unrelated metrics is meaningless — the visual implies parts of a whole. If your values are independent measures, use stats or a bar chart instead.
- **Two slices.** A two-slice pie is just a percentage with extra steps. Use big-number or split-metric — the audience can read '38% / 62%' faster than they can decode a half-and-half disc.
- **Comparing two pies.** Side-by-side pies force the audience to compare wedge angles across two figures — humans are bad at this. Use grouped bars or a slope chart to land the comparison cleanly.

## Authoring

```markdown
<!-- _class: piechart donut -->

`Eyebrow · context`

## What the breakdown shows.

- First slice `40%`
- Second slice `30%`
- Third slice `20%`
- Fourth slice `10%`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading framing the breakdown. |
| `slices` | `ul > li` | yes | One li per slice: label text then a trailing inline-code value pill, e.g. - Marketing `40%` (slices are drawn proportionally to the values). |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│          Distribution heading           │
│                                         │
│                  ╭──────╮               │
│                 │▓▓▓░░░░│               │
│             │▓▓░░░░░│  ◆ 40%            │
│             │░░░▓▓▓░│  ◇ 35%            │
│              ╰──────╯   ○ 25%           │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `donut` — Donut — hollow centre

Hollows the pie into a donut. Visually cleaner for executive decks; the centre can be left blank or used for a total label. Default pick for board and investor material.

```markdown
<!-- _class: piechart donut -->

`H1 2026 · 1,840 person-hours`

## Where the engineering quarter went.

Wedges drawn proportionally; legend reads in author order with raw values.

- Codebook platform `46%`
- Operations runbook `22%`
- Compliance work `18%`
- Pilot support `9%`
- Toil and on-call `5%`
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`progress`](../../chart/progress/progress.docs.md) — comparable parts but precise differences matter
- [`stats`](../../evidence/stats/stats.docs.md) — the values are independent metrics, not a partition
- [`big-number`](../../statement/big-number/big-number.docs.md) — the headline is one slice, not the breakdown
- [`kpi`](../../evidence/kpi/kpi.docs.md) — the slices need status framing and targets

## Demo deck

See [piechart.gallery.light.pdf](./piechart.gallery.light.pdf) for rendered examples of every variant.
