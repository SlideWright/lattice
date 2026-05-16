---
marp: true
theme: indaco
paginate: true
header: "Lattice · compare-table"
---

<!-- _class: title silent -->

# compare-table

`Comparison · Ledger · Prose`

Multi-row comparison table with consistent columns.

---

<!-- _class: compare-table -->
<!-- _footer: "Default · compare-table" -->

## Where the four substance contracts come from.

| Substance | Author writes | Renderer | Output |
| --- | --- | --- | --- |
| prose | headings, paragraphs, lists | Marp markdown → semantic HTML | DOM |
| structure | nested lists with conventions | lib/*.js post-processor | DOM |
| series | tabular DSL (axes + datapoints) | chart-family kernel | SVG |
| graph | external graph language | external CLI (mmdc, future d2) | SVG |


---

<!-- _class: cards-grid -->
<!-- _footer: "Anti-patterns · compare-table" -->

## When NOT to reach for compare-table.

- **Cells full of prose.** Long sentences in a table cell wrap awkwardly and force the column wider. Move to `verdict-grid` for criteria with body text, or `cards-stack` for full prose rows.
- **More than 6 rows.** Past 6 rows the table density crowds the slide. Split into two slides or summarise the rows that don't differentiate.
- **State-marker rows.** When most cells are pass/fail/partial badges, the right layout is `obligation-matrix` or `verdict-grid`. compare-table is for textual values.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `compare-prose` — exactly two options with prose bodies
- `verdict-grid` — options scored against criteria with pass/partial/fail badges
- `obligation-matrix` — many regimes compared against shared obligations
- `cards-stack` — each row needs full-prose breathing room rather than a tabular cell
