# tldr

> Single-line takeaways — the deck or section's headline points.

**Function** inventory · **Form** stack · **Substance** structure

## When to use

Use at the end of a section or deck to restate the takeaways in one line each. Each line should be a complete claim, not a category label.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading — typically 'In summary' or 'What this means'. |
| lines | `ul > li` | yes | One line per takeaway. Keep each under ~15 words. |

## Variants

Layout-specific: numbered.

Inherits all universal variants (`dark`, `bg-*`, `with-period`,
state, tone, chrome) and semi-universals (`compact`, `loose`,
`accent`) per `docs/design-system.md` §6.5.
