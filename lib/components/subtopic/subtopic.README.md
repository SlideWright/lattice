# subtopic

> Sub-section boundary — lighter than divider, no canvas reskin.

**Function** anchor · **Form** divider · **Substance** prose

## When to use

Introduces a specific topic within a section. Use between a `divider`
and a sequence of content slides for finer-grained orientation. Lighter
treatment than divider: same light canvas as content slides, centered
heading, no special background.

## Authoring

```markdown
<!-- _class: subtopic -->

`Topic family`

## Sub-topic name.
```

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| heading | `h2` | yes | sub-topic name |
| eyebrow | `p > code` | no | optional topic-family label |

## Variants

Layout-specific: `numbered`. Inherits universals + semi-universals.
