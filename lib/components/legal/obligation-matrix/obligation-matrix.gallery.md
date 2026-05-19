---
marp: true
theme: indaco
paginate: true
header: "Lattice · obligation-matrix"
---

<!-- _class: title silent -->

# obligation-matrix

`Comparison · Matrix · Structure`

Regulation × obligation grid — state-marker cells encode applies / partial / exempt at a glance.

---

<!-- _class: obligation-matrix -->
<!-- _footer: "Default · obligation-matrix" -->

## Privacy obligations across regimes — neutral grid.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Filled = applies, half = partial, empty = exempt. Neutral ink — data first.


---

<!-- _class: obligation-matrix heat -->
<!-- _footer: "Heat — risk-axis palette · obligation-matrix heat" -->

## Same regimes, read for exposure — heat map.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Red = applies (exposure), green = exempt (relief). Brackets frame the structure.


---

<!-- _class: obligation-matrix asymmetric -->
<!-- _footer: "Asymmetric — card-per-row layout · obligation-matrix asymmetric" -->

## Privacy obligations — card-per-regime layout.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |

Each row promotes to a card with body-level breathing room.


---

<!-- _class: obligation-matrix dark -->
<!-- _footer: "Composition: dark · obligation-matrix dark" -->

## Privacy obligations across regimes — neutral grid.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Filled = applies, half = partial, empty = exempt. Neutral ink — data first.


---

<!-- _class: obligation-matrix compact -->
<!-- _footer: "Composition: compact · obligation-matrix compact" -->

## Privacy obligations across regimes — neutral grid.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Filled = applies, half = partial, empty = exempt. Neutral ink — data first.


---

<!-- _class: obligation-matrix accent -->
<!-- _footer: "Composition: accent · obligation-matrix accent" -->

## Privacy obligations across regimes — neutral grid.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Filled = applies, half = partial, empty = exempt. Neutral ink — data first.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · obligation-matrix" -->

## When NOT to reach for obligation-matrix.

- **Two regimes only.** Past one row vs another the grid loses its purpose. Use `compare-prose` or `compare-table` for two-regime comparisons.
- **Mixed cell content.** Don't mix state markers with prose values in the same matrix — the cell width has to grow to fit prose and the marker grid collapses. Pick one cell type.
- **Missing legend.** The trailing paragraph naming filled/half/empty is what onboards a first-time reader. Skipping it forces the audience to guess the mapping.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `compare-table` — cells are textual values, not state markers
- `verdict-grid` — options scored against criteria with a per-card layout instead of a table
- `matrix-2x2` — two axes, four cells, qualitative placement
- `checklist` — one set of obligations against one regime, not many
