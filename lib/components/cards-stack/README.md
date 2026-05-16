# cards-stack

> Parallel items stacked vertically, full-width cards.

**Function** inventory · **Form** stack · **Substance** structure

## When to use

Use when the items want vertical reading order — sequential exploration rather than a-glance comparison. 2–3 items work best.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading. |
| cards | `ul > li` | yes | Each list item becomes one stacked card. Lead each li with **Card Title.** then body text. |

## Variants

Layout-specific: horizontal, numbered.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
