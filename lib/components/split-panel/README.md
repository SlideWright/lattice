# split-panel

> Featured left panel + supporting list on the right.

**Function** statement · **Form** panel · **Substance** structure

## When to use

Use when one prominent statement deserves a dark sidebar and the right side carries the substantiating points.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| panel-heading | `h2` | yes | Heading shown in the dark left panel. |
| panel-eyebrow | `h3` | no | Optional rubric label below the panel heading. |
| points | `ul > li` | yes | Right-side supporting points. Lead each with **Label.** then body text. |

## Variants

Layout-specific: mirror.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
