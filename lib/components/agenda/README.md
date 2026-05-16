# agenda

> Auto-numbered table of contents for the deck.

**Function** inventory · **Form** stack · **Substance** structure

## When to use

Use as the second slide of any multi-section deck. Numbers are generated; authors just write the section titles.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading — typically 'Agenda' or 'What we'll cover'. |
| items | `ol > li` | yes | Ordered list of section titles. |

## Variants

Layout-specific: progress-2, progress-3, progress-4, progress-5.

Inherits all universal variants (`dark`, `bg-*`, `with-period`,
state, tone, chrome) and semi-universals (`compact`, `loose`,
`accent`) per `docs/design-system.md` §6.5.
