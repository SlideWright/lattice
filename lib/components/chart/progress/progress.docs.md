# progress

> Horizontal progress bars — one row per item, percentage filled.

**Function** evidence · **Form** canvas · **Substance** series

Use for status-tracking across multiple parallel items (project readiness, OKR progress, capacity utilization). Status colors via on-track/at-risk/blocked.

## When to use

- **Parallel workstreams at a glance.** When the audience needs to scan five to eight workstreams and immediately spot the ones in trouble. The bar length carries the magnitude; the status pill carries the verdict.
- **Percent-complete is the natural unit.** Readiness, OKR progress, capacity utilization, rollout coverage. Any series where each row is a 0–100% completion against its own scale fits the layout. Mixed units belong in `kpi`.
- **Status framing matters as much as the number.** Use the `on-track`, `at-risk`, `blocked`, `deferred`, `done` vocabulary — the engine tints the bar fill to match. A 68% bar reads very differently when it is `at-risk` than when it is `on-track`.

## When NOT to use

- **Comparing unrelated metrics.** Revenue % of target, latency vs SLO, and headcount fill aren't comparable on a shared bar scale. Use `kpi` for value/target/status tiles or `stats` for an independent metric row.
- **More than eight rows.** Past eight workstreams the bars compress and the labels truncate. Split the view by owner or workstream group; the audience can't scan twelve bars at once anyway.
- **Decorative status pills.** Don't invent new status words for tone. `on-track`, `at-risk`, `blocked`, `deferred`, `done` are the vocabulary the engine recognises; everything else renders as a plain pill and breaks the at-a-glance read.

## Authoring

```markdown
<!-- _class: progress -->

`H1 2026 · Phase 1 readiness`

## Phase 1 readiness, by workstream.

Snapshot taken at 14:00 UTC. Status pills tint the bar fill.

- Codebook platform `92%` `on-track`
- Operations runbook `68%` `at-risk`
- Compliance audit pack `81%` `on-track`
- SDK polyglot parity `34%` `deferred`
- Dependency dashboard `12%` `blocked`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading framing the progress view. |
| `eyebrow` | `p > code` | no | Optional eyebrow caption above the heading. |
| `subtitle` | `p` | no | Optional plain subtitle after the heading. |
| `rows` | `ul > li` | yes | One li per item. Format: `Label — N% — status` where status is on-track / at-risk / blocked / done. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Progress heading.                      │
│                                         │
│  Goal A      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 70%   │
│  Goal B      ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 50%   │
│  Goal C      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░ 90%   │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`kpi`](../../evidence/kpi/kpi.docs.md) — value + target + status tiles, not a single percent
- [`stats`](../../evidence/stats/stats.docs.md) — independent headline metrics, no completion scale
- [`gantt`](../../chart/gantt/gantt.docs.md) — the rows are time-bound and need a date axis
- [`checklist`](../../inventory/checklist/checklist.docs.md) — binary done / not-done across a flat list
- [`timeline-list`](../../chart/timeline-list/timeline-list.docs.md) — the workstreams resolve in sequence, not in parallel

## Demo deck

See [progress.gallery.light.pdf](./progress.gallery.light.pdf) for rendered examples of every variant.
