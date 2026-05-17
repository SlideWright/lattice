# cards-wide

> Three or four wide rows, each a full-width card.

**Function** inventory · **Form** stack · **Substance** structure

Use when each item has enough body text to want its own row but the slide should still scan top-to-bottom.

## When to use

- **Substantial per-row body.** Each item carries one to two sentences — more than a cards-grid card can hold without crowding. The wide row gives the body real estate.
- **Top-to-bottom reading.** The audience absorbs one row at a time rather than the whole set at a glance. Use when sequence-of-reading matters even if items are parallel.
- **Three or four rows.** The layout is sized for three or four wide cards. Past four the slide gets dense; for longer reference lists move to list-tabular.

## When NOT to use

- **Five or more rows.** The slide tips into wall-of-text past four rows. Move to list-tabular for reference density, or split across two cards-wide slides.
- **One-line rows.** If each row is a short phrase the wide cards look padded. Drop to `list` or `tldr` and let the short text speak for itself.
- **Comparison framing.** cards-wide is parallel inventory, not comparison. If the rows are weighed against shared criteria, use compare-table or verdict-grid.

## Authoring

```markdown
<!-- _class: cards-wide -->

## Slide heading.

- **First row title.** Body text for the first wide row, one or two sentences.
- **Second row title.** Body text for the second wide row.
- **Third row title.** Body text for the third wide row.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading. |
| `cards` | `ul > li` | yes | Three or four list items, each one wide row. Lead each with **Card Title.** then 1–2 sentences. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Three wide rows heading.               │
│  ┌───────────────────────────────────┐  │
│  │ Wide row 1 — full content width   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Wide row 2 — full content width   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Wide row 3 — full content width   │  │
│  └───────────────────────────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`cards-stack`](../cards-stack/cards-stack.docs.md) — two or three rows with shorter body per card
- [`cards-grid`](../cards-grid/cards-grid.docs.md) — four or fewer parallel items in a scannable grid
- [`list-tabular`](../list-tabular/list-tabular.docs.md) — five or more reference-style rows
- [`list-steps`](../list-steps/list-steps.docs.md) — rows carry an explicit, ordered sequence

## Demo deck

See [cards-wide.gallery.pdf](./cards-wide.gallery.pdf) for rendered examples of every variant.
