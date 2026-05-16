# list-tabular

> Hairline-ruled ledger of items — name on the left, body on the right.

**Function** inventory · **Form** ledger · **Substance** structure

## When to use

Use for compact reference tables: glossary-style entries, key/value pairs, specs. Four variants tune the visual treatment (see variants).

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading. |
| rows | `ul > li` | yes | Each list item is one row. Lead each with **Name.** then the description/value. |

## Variants

Layout-specific: def, metric, spec, register, rule, solid, stacked, outline.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
