# featured

> Featured card + sub-grid — one prominent item with supporting cards.

**Function** imagery · **Form** panel · **Substance** structure

## When to use

Use after a comparison or evaluation to land the recommendation: the featured card is the winner; the sub-grid shows the alternatives or context.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading framing the recommendation. |
| items | `ul > li` | yes | First li becomes the featured card; remaining lis form the sub-grid. Lead each with **Title.** then body. |

## Variants

Layout-specific: mirror.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
