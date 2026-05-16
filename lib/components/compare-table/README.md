# compare-table

> Multi-row comparison table with consistent columns.

**Function** comparison · **Form** ledger · **Substance** prose

## When to use

Use when you have 3+ options or 4+ rows of criteria. Wider data than compare-prose can hold legibly.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading framing the comparison. |
| table | `table` | yes | Markdown table with header row and 2+ data rows. |

## Variants

Layout-specific: *(none)*.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
