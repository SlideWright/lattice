---
marp: true
theme: indaco
paginate: true
header: "Lattice · glossary"
---

<!-- _class: title silent -->

# glossary

`Inventory · Ledger · Structure`

Two-column term/definition table with auto-derived alphabetic range pill.

---

<!-- _class: glossary -->
<!-- _footer: "Default · glossary" -->

## Glossary

- Component
  - A self-contained unit at lib/components, one folder per component, with manifest plus styles plus example plus optional transform plus README.
- Function
  - The communication purpose a slide serves; one of seven families (Anchor, Statement, Inventory, Comparison, Progression, Evidence, Imagery).
- Form
  - The spatial composition of a slide; one of eleven shapes (bookend, divider, canvas, grid, stack, ledger, panel, matrix, scatter, timeline, split).
- Manifest
  - The JSON description of a component, consumed by the scaffolder, snippets, docs catalog, and autocomplete.
- Substance
  - The kind of data that fills the form; one of four (prose, structure, series, graph).


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · glossary" -->

## When NOT to reach for glossary.

- **Multi-sentence definitions.** Each entry is one short line. If a definition needs context or examples, the term deserves its own slide — use subtopic with the term as the heading.
- **Mixed term lengths.** If some terms are single words and others are full phrases, the left column gets ragged. Trim long terms to their canonical short form.
- **Hand-written range pill.** The runtime derives the range pill (e.g. "A – G") from the entries. Authoring it into the heading double-stamps it.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `list-tabular` — rows are key/value reference, not term/definition
- `subtopic` — one term needs a full slide of explanation
- `actors` — the left column is a named person, not a term
- `principles` — the entries are stated rules, not defined terms
