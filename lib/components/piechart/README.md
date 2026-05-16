# piechart

> Pie or donut chart with legend — proportional wedges.

**Function** evidence · **Form** canvas · **Substance** series

## When to use

Use for part-to-whole breakdowns with 3–6 slices. Add `donut` modifier for a hole in the middle (cleaner for executive decks).

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading framing the breakdown. |
| slices | `ul > li` | yes | One li per slice. Format: `Label — value` (values are proportional). |

## Variants

Layout-specific: donut.

Inherits universals and semi-universals per
`docs/design-system.md` §6.5.
