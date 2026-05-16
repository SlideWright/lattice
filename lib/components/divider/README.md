# divider

> Section boundary slide. Dark canvas with a left-edge spectrum rail.

**Function** anchor · **Form** divider · **Substance** prose

## When to use

Marks the start of a major section. Use sparingly — every divider is a
context switch for the audience. A 30-slide deck typically has 3–5
dividers; more becomes navigation noise.

## Authoring

```markdown
<!-- _class: divider silent -->

`Section 01`

# Section name
```

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| heading | `h1` | yes | section name |
| eyebrow | `p > code` | no | optional section number/category |

## Variants

Layout-specific: `numbered` (auto-incrementing section number on the
side). Inherits universals + semi-universals.
