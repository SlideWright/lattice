# list-steps

> Vertical sequence of steps, each with full description body.

**Function** progression · **Form** timeline · **Substance** structure

## When to use

Use for richer sequential processes where each step needs a paragraph rather than a label. More verbose than timeline; more structured than a plain ordered list.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading naming the process. |
| steps | `ol > li` | yes | Ordered list; each li gets a step number. Body can be one paragraph or a nested bullet list. |

## Variants

Layout-specific: vertical, phase, milestone, lettered.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
