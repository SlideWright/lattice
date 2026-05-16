---
marp: true
theme: indaco
paginate: true
header: "Lattice · list-criteria"
---

<!-- _class: title silent -->

# list-criteria

`Progression · Ledger · Structure`

Numbered criteria list — each requirement is a row with rationale.

---

<!-- _class: list-criteria -->
<!-- _footer: "Default · list-criteria" -->

## What every component manifest must satisfy.

1. **Stable name.** Kebab-case, matching the `_class` directive authors type when invoking the component.
2. **Function coordinate.** One of seven families per the four-layer model: anchor, statement, inventory, comparison, progression, evidence, imagery.
3. **Form coordinate.** One of eleven spatial shapes: bookend, divider, canvas, grid, stack, ledger, panel, matrix, scatter, timeline, split.
4. **Substance coordinate.** One of four plugin contracts: prose, structure, series, graph (or mixed for panel-form components).
5. **Skeleton plus sample.** Skeleton scaffolds blank slides for the new-slide CLI; sample demonstrates the component substantively for the gallery.


---

<!-- _class: cards-grid -->
<!-- _footer: "Anti-patterns · list-criteria" -->

## When NOT to reach for list-criteria.

- **Parallel options, not gates.** If the items are alternatives the audience is choosing between, use `cards-grid` or `verdict-grid`. list-criteria is for requirements all of which must hold.
- **Rationale longer than two lines.** Each row is a one-sentence rationale. If a criterion needs a paragraph, lift it to `list-steps` or `split-brief` where the body has room to breathe.
- **Missing criterion title.** The bold lead on each li is what makes the ledger scannable. A naked sentence per row reads as paragraph soup; the bold title is the structure.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `list-steps` — rows are procedural steps with longer body, not gating criteria
- `checklist` — rows carry done/in-flight/planned state markers
- `verdict-grid` — options scored against shared criteria
- `principles` — tenets or values rather than gates a decision must clear
- `list-tabular` — rows carry structured metadata alongside the name and description
