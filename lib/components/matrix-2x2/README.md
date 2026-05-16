# matrix-2x2

> Static 2×2 quadrant grid with author-placed items per cell.

**Function** comparison · **Form** matrix · **Substance** structure

## When to use

Use for categorical 2×2 reasoning when the items are fixed and you control which cell each lands in. For data-plotted scatter on continuous axes, use quadrant instead.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading naming the framework. |
| axes | `ul > li` | yes | Four outer list items (one per cell). Lead each with **Quadrant label.** then the items as inner bullets. |

## Variants

Layout-specific: *(none)*.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
