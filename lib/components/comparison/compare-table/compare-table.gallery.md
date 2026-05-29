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

## How the three encryption models trade off.

| Model | Latency p99 | Blast radius | Key rotation |
| --- | --- | --- | --- |
| Central vault | 60 ms | Every tenant | Offline window |
| In-process codebook | < 5 ms | One tenant | Online |
| Client-side envelope | < 2 ms | One record | Manual, per client |


---

<!-- _class: compare-table dark -->
<!-- _footer: "Composition: dark · compare-table dark" -->

## How the three encryption models trade off.

| Model | Latency p99 | Blast radius | Key rotation |
| --- | --- | --- | --- |
| Central vault | 60 ms | Every tenant | Offline window |
| In-process codebook | < 5 ms | One tenant | Online |
| Client-side envelope | < 2 ms | One record | Manual, per client |


---

<!-- _class: compare-table compact -->
<!-- _footer: "Composition: compact · compare-table compact" -->

## How the three encryption models trade off.

| Model | Latency p99 | Blast radius | Key rotation |
| --- | --- | --- | --- |
| Central vault | 60 ms | Every tenant | Offline window |
| In-process codebook | < 5 ms | One tenant | Online |
| Client-side envelope | < 2 ms | One record | Manual, per client |


---

<!-- _class: compare-table accent -->
<!-- _footer: "Composition: accent · compare-table accent" -->

## How the three encryption models trade off.

| Model | Latency p99 | Blast radius | Key rotation |
| --- | --- | --- | --- |
| Central vault | 60 ms | Every tenant | Offline window |
| In-process codebook | < 5 ms | One tenant | Online |
| Client-side envelope | < 2 ms | One record | Manual, per client |


---

<!-- _class: list -->
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
