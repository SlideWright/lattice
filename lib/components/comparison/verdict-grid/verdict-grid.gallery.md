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

## Which data platform clears the bar.

- **Vendor North.**
  - [x] SOC 2 Type II
  - [x] In-region residency
  - [-] Self-serve export
- **Vendor West.**
  - [x] SOC 2 Type II
  - [ ] In-region residency
  - [x] Self-serve export
- **Build in-house.**
  - [ ] SOC 2 Type II
  - [-] In-region residency
  - [ ] Self-serve export


---

<!-- _class: verdict-grid dark -->
<!-- _footer: "Composition: dark · verdict-grid dark" -->

## Which data platform clears the bar.

- **Vendor North.**
  - [x] SOC 2 Type II
  - [x] In-region residency
  - [-] Self-serve export
- **Vendor West.**
  - [x] SOC 2 Type II
  - [ ] In-region residency
  - [x] Self-serve export
- **Build in-house.**
  - [ ] SOC 2 Type II
  - [-] In-region residency
  - [ ] Self-serve export


---

<!-- _class: verdict-grid compact -->
<!-- _footer: "Composition: compact · verdict-grid compact" -->

## Which data platform clears the bar.

- **Vendor North.**
  - [x] SOC 2 Type II
  - [x] In-region residency
  - [-] Self-serve export
- **Vendor West.**
  - [x] SOC 2 Type II
  - [ ] In-region residency
  - [x] Self-serve export
- **Build in-house.**
  - [ ] SOC 2 Type II
  - [-] In-region residency
  - [ ] Self-serve export


---

<!-- _class: verdict-grid accent -->
<!-- _footer: "Composition: accent · verdict-grid accent" -->

## Which data platform clears the bar.

- **Vendor North.**
  - [x] SOC 2 Type II
  - [x] In-region residency
  - [-] Self-serve export
- **Vendor West.**
  - [x] SOC 2 Type II
  - [ ] In-region residency
  - [x] Self-serve export
- **Build in-house.**
  - [ ] SOC 2 Type II
  - [-] In-region residency
  - [ ] Self-serve export


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
