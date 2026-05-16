# code

> Single fenced code block as the slide's centerpiece.

**Function** evidence · **Form** canvas · **Substance** prose

## When to use

Use when the code IS the slide — an API snippet, a config example, a migration. For comparing two versions, use compare-code.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading framing what the code shows. |
| code | `pre > code` | yes | Fenced code block — language tag drives syntax highlighting. |

## Variants

Layout-specific: *(none)*.

Inherits all universal variants and semi-universals per
`docs/design-system.md` §6.5.
