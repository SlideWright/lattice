# timeline

> Horizontal ordered steps along a single axis, each a labeled dot.

**Function** progression · **Form** timeline · **Substance** structure

## When to use

Use for sequential processes with 3–6 stages. Ordered list (ol) renders numbered circles; unordered (ul) renders plain dots.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading naming the process. |
| steps | `ol > li, ul > li` | yes | One li per step. Lead each with **Step label** then a nested bullet for the description. |

## Variants

Layout-specific: *(none)*.

Inherits universal and semi-universal variants per
`docs/design-system.md` §6.5.
