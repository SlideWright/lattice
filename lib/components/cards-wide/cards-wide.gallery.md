---
marp: true
theme: indaco
paginate: true
header: "Lattice · cards-wide"
---

<!-- _class: title silent -->

# cards-wide

`Inventory · Stack · Structure`

Three or four wide rows, each a full-width card.

---

<!-- _class: cards-wide -->
<!-- _footer: "Default · cards-wide" -->

## When the items want full-width rows.

1. Each item has substantial body text
   - One to two sentences per item, more than a cards-grid card can hold without crowding. The row layout gives the body room to breathe.
2. The slide scans top-to-bottom
   - Reading order is sequential rather than parallel. The audience absorbs one row at a time rather than the whole set at a glance.
3. Three or four rows feels right
   - Beyond four rows the slide gets dense. For more items prefer list-tabular; for fewer items with shorter body prefer cards-stack.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · cards-wide" -->

## When NOT to reach for cards-wide.

- **Five or more rows.** The slide tips into wall-of-text past four rows. Move to list-tabular for reference density, or split across two cards-wide slides.
- **One-line rows.** If each row is a short phrase the wide cards look padded. Drop to `list` or `tldr` and let the short text speak for itself.
- **Comparison framing.** cards-wide is parallel inventory, not comparison. If the rows are weighed against shared criteria, use compare-table or verdict-grid.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `cards-stack` — two or three rows with shorter body per card
- `cards-grid` — four or fewer parallel items in a scannable grid
- `list-tabular` — five or more reference-style rows
- `list-steps` — rows carry an explicit, ordered sequence
