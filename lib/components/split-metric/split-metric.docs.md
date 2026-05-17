# split-metric

> One number owns the room — light left with the hero metric, dark right with supporting findings.

**Function** evidence · **Form** split · **Substance** structure

Use when a single KPI is the argument. The hero number is the headline; the right-side list explains why the number matters and what the trend implies.

## When to use

- **One KPI deserves the room.** When a single number — NRR, NPS, gross margin, error budget burn — carries the slide and the audience needs to see why it matters. The hero scale on the left earns the focus; the right panel earns the explanation.
- **Three findings, not three numbers.** The right panel is for the implications of the headline number — the driver, the trend, the unlock. If the panel needs four more metrics to explain the first, use `kpi` instead.
- **Italics for the unit.** Wrap the unit in `*…*` (e.g. `114*%*`, `4.2*×*`, `$420*M*`) so the headline reads as 'one-fourteen percent' rather than letting the symbol dominate the eye. The italic glyph drops a weight relative to the number.

## When NOT to use

- **Two metrics on the left panel.** If two numbers compete for the hero slot the layout breaks visually. Either trust one number to carry the slide or move to `stats` for a metric row.
- **Findings that just restate the number.** Bullets like 'NRR is 114%' or 'Up from 110%' don't earn the panel — the headline already said that. Use the right-side findings for the driver, the cohort, and the unlock.
- **No context line under the metric.** A number with no measurement window or cohort is a boast, not a finding. The context line is what makes the metric audit-defensible — name the cohort, the window, the comparison.

## Authoring

```markdown
<!-- _class: split-metric -->

`Metric name`

## 114*%*

Measurement window and qualifying detail in one short sentence.

- **First supporting point.** Why this metric matters and what's driving it.
- **Second supporting point.** What concentration or trend explains it.
- **Third supporting point.** What this number unlocks or threatens.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `unit` | `p:first-of-type > code` | no | Optional inline-code unit label above the metric (e.g. 'Net Revenue Retention'). |
| `metric` | `h2` | yes | The hero number. Wrap a unit in *italics* (e.g. '114*%*') to render at smaller weight. |
| `context` | `p` | yes | One-sentence context line below the metric — measurement window, cohort, comparison. |
| `findings` | `ul > li` | yes | Right-side supporting findings. Lead each with **Title.** then nested body. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  ┌────────────┐                         │
│  │ METRIC     │  ┌─────────┐            │
│  │            │  │   42×   │            │
│  │ Heading    │  └─────────┘            │
│  │            │  Caption text           │
│  └────────────┘                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, decoration backgrounds). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`big-number`](../big-number/big-number.docs.md) — the number is the whole slide — no supporting findings needed
- [`stats`](../stats/stats.docs.md) — a row of comparable headline metrics instead of one focal KPI
- [`kpi`](../kpi/kpi.docs.md) — the metric needs targets, status pills, and a dashboard frame
- [`split-statement`](../split-statement/split-statement.docs.md) — the left is a quote, not a metric
- [`split-brief`](../split-brief/split-brief.docs.md) — the left is a thesis statement, not a number

## Demo deck

See [split-metric.gallery.pdf](./split-metric.gallery.pdf) for rendered examples of every variant.
