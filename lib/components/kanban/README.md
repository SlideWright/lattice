# kanban

> Kanban board — columns of cards by stage.

**Function** progression · **Form** timeline · **Substance** series

## When to use

Use for status snapshots: what's in each lane (todo/doing/done or similar). Each column is a stage; each card is a work item.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading. |
| lanes | `ul > li` | yes | Outer li per lane (stage), lead with **Stage name.**. Inner bullets per card in that lane. |

## Variants

Layout-specific: *(none)*.

Inherits universal and semi-universal variants per
`docs/design-system.md` §6.5.
