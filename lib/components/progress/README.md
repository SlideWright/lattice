# progress

> Horizontal progress bars — one row per item, percentage filled.

**Function** evidence · **Form** canvas · **Substance** series

## When to use

Use for status-tracking across multiple parallel items (project readiness, OKR progress, capacity utilization). Status colors via on-track/at-risk/blocked.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading framing the progress view. |
| eyebrow | `p > code` | no | Optional eyebrow caption above the heading. |
| subtitle | `p` | no | Optional plain subtitle after the heading. |
| rows | `ul > li` | yes | One li per item. Format: `Label — N% — status` where status is on-track / at-risk / blocked / done. |

## Variants

Layout-specific: minimal.

Inherits universals and semi-universals per
`docs/design-system.md` §6.5.
