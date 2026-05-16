# actors

> Roster of responsibilities owned by named actors.

**Function** inventory · **Form** ledger · **Substance** structure

## When to use

Use to show 'who owns what' across a process, codebook, or org chart. Two-column layout: actor on left, responsibilities on right.

## Authoring

See `example.md` in this folder for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading. |
| rows | `ul > li` | yes | One row per actor. Lead each li with **Actor Name.** then a short responsibility summary. |

## Variants

Layout-specific: *(none)*.

Inherits all universal variants (`dark`, `bg-*`, `with-period`,
state, tone, chrome) and semi-universals (`compact`, `loose`,
`accent`) per `docs/design-system.md` §6.5.
