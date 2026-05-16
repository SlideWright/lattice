# kpi

> Executive KPI system — one base, five layout modifiers.

**Function** evidence · **Form** ledger · **Substance** structure

## When to use

Use for KPI dashboards with status framing — current value, target, trend, attention-needed. The variants tune the visual emphasis.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading naming the KPI group. |
| subtitle | `h3` | no | Optional subtitle below the heading. |
| kpis | `ul > li` | yes | One li per KPI. Lead with **Metric name** then nested bullets for value, target, trend, status. |

## Variants

Layout-specific: target, attention, ops, compliance, trajectory, spotlight.

Inherits universal and semi-universal variants per
`docs/design-system.md` §6.5.
