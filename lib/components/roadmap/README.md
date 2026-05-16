# roadmap

> Phased multi-workstream grid — phases across the top, workstreams down the side.

**Function** progression · **Form** matrix · **Substance** structure

## When to use

Use to show what ships in each phase across multiple parallel workstreams. Cells render as state-token discs (pass/warn/fail/skip).

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading naming the plan. |
| rows | `ul > li` | yes | Outer li per workstream, lead with **Workstream.**. Inner bullets per phase, marked [x]/[-]/[ ]/[/] then the deliverable. |

## Variants

Layout-specific: horizons.

Inherits universal and semi-universal variants per
`docs/design-system.md` §6.5.
