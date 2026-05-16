# checklist

> Items with state markers — done, partial, todo.

**Function** inventory · **Form** stack · **Substance** structure

## When to use

Use for completion reports, readiness audits, or pre-flight checks. State markers [x]/[-]/[ ] produce green/amber/red glyphs.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading. |
| items | `ul > li` | yes | Each item prefixed with [x] (done), [-] (partial), or [ ] (todo). Plain text follows the marker. |

## Variants

Layout-specific: *(none)*.

Inherits all universal variants (`dark`, `bg-*`, `with-period`,
state, tone, chrome) and semi-universals (`compact`, `loose`,
`accent`) per `docs/design-system.md` §6.5.
