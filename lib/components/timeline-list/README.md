# timeline-list

> Date-stamped event list — spine with date pills, status pills, and body.

**Function** evidence · **Form** timeline · **Substance** series

## When to use

Use for milestone history or annotated timelines. Each item gets a date pill on the left, status pill on the right, body in the middle.

## Authoring

See `example.md` for the canonical authoring shape.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | Slide heading framing the timeline. |
| events | `ul > li` | yes | One li per event. Format: `Date — status — Title` then nested body bullets. |

## Variants

Layout-specific: *(none)*.

Inherits universals and semi-universals per
`docs/design-system.md` §6.5.
