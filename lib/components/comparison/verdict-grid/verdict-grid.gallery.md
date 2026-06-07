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

- **Build in-house.**
  - [ ] Certified
  - [-] Residency
  - [ ] Export
  - Full control of every axis, and three engineer-quarters from having any of it.
- **Vendor North.**
  - [x] Certified
  - [x] Residency
  - [-] Export
  - Certified and in-region, but data export is support-gated, not self-serve.
- **Vendor West.**
  - [x] Certified
  - [x] Residency
  - [x] Export
  - Certified, in-region, and self-serve on every axis. Recommended.


---

<!-- _class: verdict-grid dark -->
<!-- _footer: "Composition: dark · verdict-grid dark" -->

## Which data platform clears the bar.

- **Build in-house.**
  - [ ] Certified
  - [-] Residency
  - [ ] Export
  - Full control of every axis, and three engineer-quarters from having any of it.
- **Vendor North.**
  - [x] Certified
  - [x] Residency
  - [-] Export
  - Certified and in-region, but data export is support-gated, not self-serve.
- **Vendor West.**
  - [x] Certified
  - [x] Residency
  - [x] Export
  - Certified, in-region, and self-serve on every axis. Recommended.


---

<!-- _class: verdict-grid compact -->
<!-- _footer: "Composition: compact · verdict-grid compact" -->

## Which data platform clears the bar.

- **Build in-house.**
  - [ ] Certified
  - [-] Residency
  - [ ] Export
  - Full control of every axis, and three engineer-quarters from having any of it.
- **Vendor North.**
  - [x] Certified
  - [x] Residency
  - [-] Export
  - Certified and in-region, but data export is support-gated, not self-serve.
- **Vendor West.**
  - [x] Certified
  - [x] Residency
  - [x] Export
  - Certified, in-region, and self-serve on every axis. Recommended.


---

<!-- _class: verdict-grid accent -->
<!-- _footer: "Composition: accent · verdict-grid accent" -->

## Which data platform clears the bar.

- **Build in-house.**
  - [ ] Certified
  - [-] Residency
  - [ ] Export
  - Full control of every axis, and three engineer-quarters from having any of it.
- **Vendor North.**
  - [x] Certified
  - [x] Residency
  - [-] Export
  - Certified and in-region, but data export is support-gated, not self-serve.
- **Vendor West.**
  - [x] Certified
  - [x] Residency
  - [x] Export
  - Certified, in-region, and self-serve on every axis. Recommended.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · verdict-grid" -->

## When NOT to reach for verdict-grid.

- **Exactly two options.** Two options with shared criteria belong in `compare-prose` or `split-compare`. verdict-grid earns its layout at 3+ options.
- **Missing the rationale line.** Every option must end with a marker-less prose line — the verdict for that card. Omit it and the card renders empty below the badges, and the focal last card has nothing to recommend. The rationale is required, not optional.
- **Badge longer than two words.** The text after the marker is a badge, not a sentence — two words at most (`Residency`, `Self-serve`). A sentence on a badge line breaks the row scan; prose belongs only on the final rationale line.
- **Cards with different criteria.** When each option needs its own criteria list, the comparison fails — use `cards-stack` so each card has full prose breathing room instead.

---

<!-- _class: closing silent -->

## See also.

`Related components`

- `compare-prose` — exactly two options with prose bodies
- `split-compare` — two options with a bottom verdict bar
- `obligation-matrix` — many regimes scored on shared obligations in a table
- `compare-table` — cells are textual values, not state markers
- `checklist` — one set of criteria, not many options against them
