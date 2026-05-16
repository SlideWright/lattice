# gantt

> Gantt chart — task bars across a date axis.

**Function** progression · **Form** timeline · **Substance** series

## When to use

Use for project plans with overlapping or staggered tasks. Each task is a bar on the time axis; bars can span multiple periods.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading naming the plan. |
| tasks | `ul > li` | yes | One li per task. Format: `Task name — start, end[, status]`. |

## Variants

Layout-specific: *(none)*.

Inherits universal and semi-universal variants per
`docs/design-system.md` §6.5.
