# glossary

> Two-column term/definition table with auto-derived alphabetic range pill.

**Function** inventory · **Form** ledger · **Substance** structure

## When to use

Use for jargon-heavy decks where the audience needs a reference page. The runtime auto-adds a range pill (e.g. 'A – G') to the heading.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading — typically 'Glossary'. |
| entries | `ul > li` | yes | Nested bullets: outer li is the term, inner li is the definition. |

## Variants

Layout-specific: *(none)*.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
