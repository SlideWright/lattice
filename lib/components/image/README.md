# image

> Image as the slide's anchor, with optional text alongside.

**Function** imagery · **Form** canvas · **Substance** prose

## When to use

Use when a visual carries meaning on its own. Modifiers control how the image fills the slide: `full` for edge-to-edge, `contain` for letterboxed, `museum` for a matted/framed treatment.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| image | `img` | yes | Marp background image syntax: `![bg](path)` or `![bg right](path)`. |
| heading | `h2` | no | Optional heading in the text slot. |
| body | `p` | no | Optional caption or body text. |

## Variants

Layout-specific: full, contain, museum, mirror.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
