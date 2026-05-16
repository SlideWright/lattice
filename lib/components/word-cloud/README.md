# word-cloud

> Spiral-packed word cloud — items sized by weight.

**Function** evidence · **Form** canvas · **Substance** series

## When to use

Use for qualitative summaries — retrospective themes, survey verbatims. Word size encodes frequency or weight; not a precise data viz.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading framing the cloud. |
| words | `ul > li` | yes | One li per word. Format: `word — weight` (weight is a number). |

## Variants

Layout-specific: *(none)*.

Inherits universals and semi-universals per
`docs/design-system.md` §6.5.
