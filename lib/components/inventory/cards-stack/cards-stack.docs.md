# cards-stack

> Parallel items stacked vertically, full-width cards.

**Function** inventory · **Form** stack · **Substance** structure

**Tags** `overview` · `summary` · `reference`

Use when the items want vertical reading order — sequential exploration rather than a-glance comparison. 2–3 items work best.

## When to use

- **Vertical reading order.** The audience scans top-to-bottom, not grid-style. Use when each card builds on the previous one as the eye moves down the slide.
- **Two sentences per card.** More body than cards-grid can hold without crowding. cards-stack lets each card carry one or two short sentences without losing the layout balance.
- **Two or three items.** Sweet spot is three. Past that the slide overflows — split across multiple slides or switch to cards-grid with shorter body text per card.

## When NOT to use

- **Four or more items.** The stack overflows past four. For five or more rows reach for list-tabular.
- **One-line cards.** If each card is a single short phrase, the stack reads as a padded list. Drop to `list` or `tldr` and reclaim the vertical space.
- **Forced sequence.** Cards-stack is parallel content read in vertical order, not a numbered sequence. For explicit steps, use list-steps or list-criteria.

## Authoring

```markdown
<!-- _class: cards-stack -->

## Slide heading.

- First card title
  - Body text for the first stacked card, two short sentences max.
- Second card title
  - Body text for the second stacked card.
- Third card title
  - Body text for the third stacked card.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading. |
| `cards` | `ul > li` | yes | Each list item becomes one stacked card. Authoring contract: a top-level bullet is the card title (renders bold by default); an indented bullet underneath carries the body text. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Stacked-cards heading.                 │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Card title 1 — claim or label     │  │
│  │ body text fills the wide row      │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Card title 2 — claim or label     │  │
│  └───────────────────────────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `vertical` — Vertical stack

Explicit alias for the default stacking direction — cards flow top-to-bottom. Use when the source needs the orientation to be self-documenting, or when a slide pairs a vertical and a horizontal variant side by side in a build.

```markdown
<!-- _class: cards-stack vertical -->

## Three forces are compressing the differentiation window.

- Infrastructure has commoditized.
  - The platform work that took us two years is now a managed service a competitor can switch on in an afternoon. The moat is no longer the stack.
- Release cycles have collapsed.
  - What used to ship annually now ships monthly. A visible advantage is matched before the next board meeting.
- Switching costs are rising.
  - Customers consolidate vendors and sign longer contracts. The window to win an account is shorter, and losing one lasts longer.
```

### `horizontal` — Horizontal cards

Stacked rows pivot to a left-aligned title column with the body to its right — useful when the card titles are short labels and the body carries the weight.

```markdown
<!-- _class: cards-stack horizontal -->

## Three patterns, each with its own pull.

- Inventory.
  - Equal-weight items the audience scans without ordering. The cards-grid family lives here — grid, stack, wide, side.
- Comparison.
  - Two or more items weighed against shared criteria. The verdict and compare families live here — they take sides.
- Progression.
  - Items that carry an explicit sequence. The list-steps and timeline families live here — order is load-bearing.
```

### `numbered` — Numbered stack

Authored as `ol` (`1.` source). Each row carries a flush corner number — use when the stack carries an implicit count ("three options", "four phases") even if the order is interchangeable.

```markdown
<!-- _class: cards-stack -->

## Three reasons to keep cards-stack at three items.

1. Cognitive load
   - Three is the threshold the audience can hold without effort. Past three, the slide demands working memory the room shouldn't have to spend.
2. Vertical real estate
   - Each stacked card needs ~30% of the slide height to breathe. Four cards force you to shrink the cards until they stop reading as cards.
3. Build path symmetry
   - cards-stack pairs with cards-grid (3-4 grid items) and cards-side (exactly 2). Keeping cards-stack at 2-4 keeps the family's choices clean.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`cards-grid`](../../inventory/cards-grid/cards-grid.docs.md) — three or four parallel items in a scannable grid
- [`cards-side`](../../inventory/cards-side/cards-side.docs.md) — exactly two items in left-right balance
- [`list-steps`](../../progression/list-steps/list-steps.docs.md) — items carry an explicit, ordered sequence

## Demo deck

See [cards-stack.gallery.light.pdf](./cards-stack.gallery.light.pdf) for rendered examples of every variant.
