# content

> Generic prose slide — heading plus paragraphs or a short list.

**Function** statement · **Form** canvas · **Substance** prose

## When to use

The catch-all for explanatory content that doesn't fit a more
structured component. Useful for narrative beats, transitional
explanations, or single-thought slides.

**Resist using it.** If your slide is "a heading and some bullets,"
that's `list`. If it's "a heading and a few cards," that's
`cards-grid` or `cards-stack`. If it's "a heading and a number,"
that's `big-number` or `stats`. Reach for `content` only when none
of the more specific shapes fit.

## Authoring

```markdown
<!-- _class: content -->

## Slide heading.

Explanatory paragraph that develops the heading.

- Optional supporting point.
- Another supporting point.
```

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| heading | `h2` | yes | the slide heading |
| body | `section > p`, `section > ul` | yes | paragraphs or a short list (≤40 words total) |

## Variants

Layout-specific: *(none)*. Inherits universals — `dark`, `compact`,
`loose`, the `bg-*` family, `with-period`/`no-period`, state/tone/chrome
all apply.
