# cards-wide

> Three or four wide rows, each a full-width card.

**Function** inventory · **Form** stack · **Substance** structure

## When to use

Use when each item has enough body text to want its own row but the slide should still scan top-to-bottom.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading. |
| cards | `ul > li` | yes | Three or four list items, each one wide row. Lead each with **Card Title.** then 1–2 sentences. |

## Variants

Layout-specific: *(none)*.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
