# compare-prose

> Two prose options side-by-side with a labeled corner tag on each.

**Function** comparison · **Form** split · **Substance** structure

## When to use

Use to weigh two approaches against each other in body text. Add the `chosen` or `decision` modifier to mark the verdict; add `vertical` to stack top/bottom instead of side-by-side.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading framing the comparison. |
| options | `ul > li` | yes | Exactly two list items, each one option. Lead each with **Option label.** then 1–3 sentences. |

## Variants

Layout-specific: mirror, chosen, decision, vertical.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
