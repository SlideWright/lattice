# cards-grid

> 2–4 parallel items, similar weight, scannable in a grid.

**Function** inventory · **Form** grid · **Substance** structure

## When to use

Use when the audience needs to compare or scan a small set of options at a glance. Avoid for more than 4 items — split into multiple slides. For ordered/numbered steps, use list-steps instead.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading. |
| cards | `ul > li` | yes | Each list item becomes one card. Lead each li with **Card Title.** then body text. |
| insight | `blockquote` | no | Optional key-insight panel above the cards. |

## Variants

Layout-specific: mirror, numbered, four, three.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
