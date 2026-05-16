# big-number

> Single oversized number as the focal claim.

**Function** statement · **Form** canvas · **Substance** prose

## When to use

Use to make ONE metric land. The number should be the headline — eyes
go straight to it. Supporting text is one short caption sentence
underneath; eyebrow above for category context.

If you need to show several numbers, use `stats` instead. If you need
target + actual + trend, use `kpi`.

## Authoring

```markdown
<!-- _class: big-number -->

`Optional eyebrow label`

- 92%
  - of customers reported a successful sign-in this quarter.
```

The first list item is rendered in display font at hero size — that's
the number. A nested bullet beneath it becomes the caption (body font,
muted, centered).

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| eyebrow | `p > code` | no | inline-code paragraph above the list |
| number | `ul > li:first-child` | yes | the big number itself |
| caption | `ul > li:first-child > ul > li` | no | one-line caption below |

## Variants

Layout-specific: *(none)*. Inherits universals + semi-universals.
