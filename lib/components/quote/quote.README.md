# quote

> A pulled quotation, centered, with attribution.

**Function** statement · **Form** canvas · **Substance** prose

## When to use

Use to land a phrase verbatim — customer voice, expert claim, mission
statement, principle. The quote IS the slide; everything else (heading,
chart, supporting prose) is wrong tool.

Keep the quotation under ~25 words. If you can't, it's not a quote slide
— it's a long-form excerpt that belongs in a `content` slide with the
quoted text in a blockquote and surrounding context as prose.

## Authoring

```markdown
<!-- _class: quote -->

> The quoted sentence sits here.

Attribution — Person, Role
```

The blockquote (`>`) renders centered with serif italic, framed with
quotation marks via CSS pseudo-elements. The plain paragraph after it
becomes the attribution line — small, muted, centered below.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| quotation | `blockquote > p` | yes | the quote text itself |
| attribution | `section > p:last-child` | no | one-line attribution |

## Variants

Layout-specific: *(none — quote has no per-component variants)*.

Inherits all 25 universal variants (`dark`, `bg-*`, `with-period`,
state, tone, chrome) and the semi-universals (`compact`, `loose`,
`accent`) per `docs/design-system.md` §6.5.
