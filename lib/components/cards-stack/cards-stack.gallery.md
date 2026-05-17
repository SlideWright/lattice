---
marp: true
theme: indaco
paginate: true
header: "Lattice · cards-stack"
---

<!-- _class: title silent -->

# cards-stack

`Inventory · Stack · Structure`

Parallel items stacked vertically, full-width cards.

---

<!-- _class: cards-stack -->
<!-- _footer: "Default · cards-stack" -->

## When to reach for cards-stack.

- Vertical reading order matters.
  - The audience scans top to bottom, not grid-style. Each card builds on the previous one as the eye moves down the slide.
- Each card has more body than a grid card.
  - Two sentences instead of one. cards-grid forces parallel density; cards-stack lets each card breathe with longer body text.
- Two to three items, not four-plus.
  - Beyond three cards the slide overflows. For more items, split across multiple slides or switch to cards-grid with shorter text.


---

<!-- _class: cards-stack horizontal -->
<!-- _footer: "Horizontal cards · cards-stack horizontal" -->

## Three patterns, each with its own pull.

- Inventory.
  - Equal-weight items the audience scans without ordering. The cards-grid family lives here — grid, stack, wide, side.
- Comparison.
  - Two or more items weighed against shared criteria. The verdict and compare families live here — they take sides.
- Progression.
  - Items that carry an explicit sequence. The list-steps and timeline families live here — order is load-bearing.


---

<!-- _class: cards-stack -->
<!-- _footer: "Numbered stack · cards-stack numbered" -->

## Three reasons to keep cards-stack at three items.

1. Cognitive load
   - Three is the threshold the audience can hold without effort. Past three, the slide demands working memory the room shouldn't have to spend.
2. Vertical real estate
   - Each stacked card needs ~30% of the slide height to breathe. Four cards force you to shrink the cards until they stop reading as cards.
3. Build path symmetry
   - cards-stack pairs with cards-grid (3-4 items) and cards-wide (3-4 rows). Keeping cards-stack at 2-3 keeps the family's choices clean.


---

<!-- _class: cards-stack dark -->
<!-- _footer: "Composition: dark · cards-stack dark" -->

## When to reach for cards-stack.

- Vertical reading order matters.
  - The audience scans top to bottom, not grid-style. Each card builds on the previous one as the eye moves down the slide.
- Each card has more body than a grid card.
  - Two sentences instead of one. cards-grid forces parallel density; cards-stack lets each card breathe with longer body text.
- Two to three items, not four-plus.
  - Beyond three cards the slide overflows. For more items, split across multiple slides or switch to cards-grid with shorter text.


---

<!-- _class: cards-stack compact -->
<!-- _footer: "Composition: compact · cards-stack compact" -->

## When to reach for cards-stack.

- Vertical reading order matters.
  - The audience scans top to bottom, not grid-style. Each card builds on the previous one as the eye moves down the slide.
- Each card has more body than a grid card.
  - Two sentences instead of one. cards-grid forces parallel density; cards-stack lets each card breathe with longer body text.
- Two to three items, not four-plus.
  - Beyond three cards the slide overflows. For more items, split across multiple slides or switch to cards-grid with shorter text.


---

<!-- _class: cards-stack accent -->
<!-- _footer: "Composition: accent · cards-stack accent" -->

## When to reach for cards-stack.

- Vertical reading order matters.
  - The audience scans top to bottom, not grid-style. Each card builds on the previous one as the eye moves down the slide.
- Each card has more body than a grid card.
  - Two sentences instead of one. cards-grid forces parallel density; cards-stack lets each card breathe with longer body text.
- Two to three items, not four-plus.
  - Beyond three cards the slide overflows. For more items, split across multiple slides or switch to cards-grid with shorter text.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · cards-stack" -->

## When NOT to reach for cards-stack.

- **Four or more items.** The stack overflows past three. For four parallel items reach for cards-grid four; for richer per-item bodies, cards-wide handles three or four rows.
- **One-line cards.** If each card is a single short phrase, the stack reads as a padded list. Drop to `list` or `tldr` and reclaim the vertical space.
- **Forced sequence.** Cards-stack is parallel content read in vertical order, not a numbered sequence. For explicit steps, use list-steps or list-criteria.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `cards-grid` — three or four parallel items in a scannable grid
- `cards-wide` — three or four rows with more substantial per-card body
- `cards-side` — exactly two items in left-right balance
- `list-steps` — items carry an explicit, ordered sequence
