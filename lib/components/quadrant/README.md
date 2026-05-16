# quadrant

> Native 2×2 scatter chart — items plotted on two continuous axes.

**Function** evidence · **Form** scatter · **Substance** series

## When to use

Use to position items by two numeric attributes (cost × value, effort × impact). Data-driven; for static categorical 2×2 grids, use matrix-2x2.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading framing the analysis. |
| axes | `p > code` | no | Optional axis-label eyebrow (inline-code paragraph). |
| items | `ul > li` | yes | One li per item. Format: `Label — x, y[, size]`. |

## Variants

Layout-specific: *(none)*.

Inherits universals and semi-universals per
`docs/design-system.md` §6.5.
