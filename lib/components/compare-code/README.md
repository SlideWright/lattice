# compare-code

> Two fenced code blocks side-by-side, each with a label.

**Function** comparison · **Form** split · **Substance** structure

## When to use

Use to contrast a before/after refactor, two API styles, or two configurations. Each side gets an h3 label and one fenced block.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading framing the comparison. |
| left | `section > h3:first-of-type + pre` | yes | Left label (h3) and code block. |
| right | `section > h3:nth-of-type(2) + pre` | yes | Right label (h3) and code block. |

## Variants

Layout-specific: mirror.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
