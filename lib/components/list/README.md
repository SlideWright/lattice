# list

> Plain bullet list under a heading.

**Function** inventory · **Form** stack · **Substance** prose

## When to use

Only when the items are GENUINELY a list — 5–6 short points without
internal structure. For richer items (title + body), prefer
`cards-grid`, `cards-stack`, or `list-tabular`.

Each bullet renders as a pill-card with an accent left border. Use
`ol` for numbered lists; numbers render as a tabular leading column.

## Authoring

```markdown
<!-- _class: list -->

## Slide heading.

- First short bullet point.
- Second short bullet point.
- Third short bullet point.
```

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | slide heading |
| items | `ul > li` / `ol > li` | yes | one li per point (≤12 words each) |

## Variants

Layout-specific: *(none)*. Inherits universals + semi-universals.
