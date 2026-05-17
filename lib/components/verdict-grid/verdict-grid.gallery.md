---
marp: true
theme: indaco
paginate: true
header: "Lattice · verdict-grid"
---

<!-- _class: title silent -->

# verdict-grid

`Comparison · Grid · Structure`

Options scored against criteria as a verdict matrix.

---

<!-- _class: verdict-grid -->
<!-- _footer: "Default · verdict-grid" -->

## Which option meets the criteria.

- **Folder shape.**
  - [x] Self-contained per component
  - [x] Familiar pattern from other libraries
  - [x] Tests can live with their component
- **Flat files.**
  - [x] Less restructuring upfront
  - [-] Per-component grouping by filename only
  - [ ] No room for transform.js or example.md
- **Hybrid.**
  - [-] Manifest stays flat, other files in subfolder
  - [ ] Splits the component across two locations
  - [ ] Defeats the self-contained goal


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · verdict-grid" -->

## When NOT to reach for verdict-grid.

- **Exactly two options.** Two options with shared criteria belong in `compare-prose` or `split-compare`. verdict-grid earns its layout at 3+ options.
- **Free-form text on the badge line.** Each inner bullet starts with a state marker, not a sentence. Naked prose breaks the badge chrome and the criteria stop scanning as a row.
- **Cards with different criteria.** When each option needs its own criteria list, the comparison fails — use `cards-stack` so each card has full prose breathing room instead.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `compare-prose` — exactly two options with prose bodies
- `split-compare` — two options with a bottom verdict bar
- `obligation-matrix` — many regimes scored on shared obligations in a table
- `compare-table` — cells are textual values, not state markers
- `checklist` — one set of criteria, not many options against them
