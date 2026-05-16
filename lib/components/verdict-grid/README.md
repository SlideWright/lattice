# verdict-grid

> Options scored against criteria as a verdict matrix.

**Function** comparison · **Form** grid · **Substance** structure

## When to use

Use to evaluate 2–4 options against the same set of criteria, with pass/partial/fail badges. Each card represents one option; badges per criterion.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading naming the choice. |
| options | `ul > li` | yes | Outer li per option, lead with **Option name.**. Inner li per criterion, prefixed with [x]/[-]/[ ] then the criterion text. |

## Variants

Layout-specific: *(none)*.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
