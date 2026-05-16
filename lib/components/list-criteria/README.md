# list-criteria

> Numbered criteria list — each requirement is a row with rationale.

**Function** progression · **Form** ledger · **Substance** structure

## When to use

Use to enumerate the criteria a decision must meet, in priority order. Numbering signals weight; each row reads as a complete requirement.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading naming the framework. |
| criteria | `ol > li` | yes | One li per criterion. Lead each with **Criterion name.** then the rationale. |

## Variants

Layout-specific: *(none)*.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
