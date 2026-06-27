---
marp: true
theme: indaco
paginate: true
header: "Lattice · statute-stack"
---

<!-- _class: title silent -->

# statute-stack

`Inventory · Ledger · Structure`

Citation hierarchy — federal / state / local rows with citation, headline obligation, and status.

---

<!-- _class: statute-stack -->
<!-- _footer: "Default · statute-stack" -->

## Children's data — three jurisdictions, three obligations.

- Federal `15 U.S.C. §6501`
  - Verifiable parental consent for under-13 personal data.
  - Operators must post a clear notice and a deletion route.
  - `In effect since 2000`
- State `Cal. Civ. §1798.120`
  - Opt-in for selling or sharing under-16 data; opt-out for over-16.
  - DSAR handling within 45 days; deletion verified.
  - `Enforced 2023`
- Local `NYC §22-1201`
  - Bias-audit obligation for AEDTs used in employment decisions.
  - Annual audit + candidate notice + public summary.
  - `Effective 2023`


---

<!-- _class: statute-stack hierarchy -->
<!-- _footer: "Authority pyramid · statute-stack hierarchy" -->

## Children's data — authority cascades downward.

- Federal `15 U.S.C. §6501`
  - Verifiable parental consent for under-13 personal data.
  - `In effect since 2000`
- State `Cal. Civ. §1798.120`
  - Opt-in for selling or sharing under-16 data; opt-out for over-16.
  - `Enforced 2023`
- Local `NYC §22-1201`
  - Bias-audit obligation for AEDTs used in employment decisions.
  - `Effective 2023`


---

<!-- _class: statute-stack bands -->
<!-- _footer: "Horizontal bands · statute-stack bands" -->

## Children's data — at-a-glance scorecard.

- Federal `15 U.S.C. §6501`
  - Verifiable parental consent for under-13 personal data.
  - `In effect since 2000`
- State `Cal. Civ. §1798.120`
  - Opt-in for selling or sharing under-16 data; opt-out for over-16.
  - `Enforced 2023`
- Local `NYC §22-1201`
  - Bias-audit obligation for AEDTs used in employment decisions.
  - `Effective 2023`


---

<!-- _class: statute-stack preemption -->
<!-- _footer: "Preemption cascade · statute-stack preemption" -->

## Federal preemption — how the cascade flows.

- Federal `15 U.S.C. §6501`
  - Sets the floor for under-13 personal data collection.
  - `Preempts state rules`
- State `Cal. Civ. §1798.120`
  - Stricter opt-in regime on top of COPPA's baseline.
  - `Survives preemption`
- Local `NYC §22-1201`
  - Bias-audit obligation distinct from privacy preemption scope.
  - `Independent of preemption`


---

<!-- _class: statute-stack lane -->
<!-- _footer: "Markdown table · statute-stack lane" -->

## Children's data — register view.

| Jurisdiction | Citation              | Headline obligation       | Status      |
| ------------ | --------------------- | ------------------------- | ----------- |
| Federal      | 15 U.S.C. §6501       | Parental consent <13 data | In effect   |
| State        | Cal. Civ. Code §1798  | Notice + opt-out + DSAR   | Enforced    |
| Local        | NYC §22-1201          | Annual AEDT bias audit    | Effective   |


---

<!-- _class: statute-stack dark -->
<!-- _footer: "Composition: dark · statute-stack dark" -->

## Children's data — three jurisdictions, three obligations.

- Federal `15 U.S.C. §6501`
  - Verifiable parental consent for under-13 personal data.
  - Operators must post a clear notice and a deletion route.
  - `In effect since 2000`
- State `Cal. Civ. §1798.120`
  - Opt-in for selling or sharing under-16 data; opt-out for over-16.
  - DSAR handling within 45 days; deletion verified.
  - `Enforced 2023`
- Local `NYC §22-1201`
  - Bias-audit obligation for AEDTs used in employment decisions.
  - Annual audit + candidate notice + public summary.
  - `Effective 2023`


---

<!-- _class: statute-stack compact -->
<!-- _footer: "Composition: compact · statute-stack compact" -->

## Children's data — three jurisdictions, three obligations.

- Federal `15 U.S.C. §6501`
  - Verifiable parental consent for under-13 personal data.
  - Operators must post a clear notice and a deletion route.
  - `In effect since 2000`
- State `Cal. Civ. §1798.120`
  - Opt-in for selling or sharing under-16 data; opt-out for over-16.
  - DSAR handling within 45 days; deletion verified.
  - `Enforced 2023`
- Local `NYC §22-1201`
  - Bias-audit obligation for AEDTs used in employment decisions.
  - Annual audit + candidate notice + public summary.
  - `Effective 2023`


---

<!-- _class: statute-stack accent -->
<!-- _footer: "Composition: accent · statute-stack accent" -->

## Children's data — three jurisdictions, three obligations.

- Federal `15 U.S.C. §6501`
  - Verifiable parental consent for under-13 personal data.
  - Operators must post a clear notice and a deletion route.
  - `In effect since 2000`
- State `Cal. Civ. §1798.120`
  - Opt-in for selling or sharing under-16 data; opt-out for over-16.
  - DSAR handling within 45 days; deletion verified.
  - `Enforced 2023`
- Local `NYC §22-1201`
  - Bias-audit obligation for AEDTs used in employment decisions.
  - Annual audit + candidate notice + public summary.
  - `Effective 2023`


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · statute-stack" -->

## When NOT to reach for statute-stack.

- **More than four rows.** The three-column rail collapses past four jurisdictions. For longer registers move to `lane` (table form) or split across two statute-stack slides by topic.
- **Citation without obligation.** Without the headline obligation sentence, the layout reads as a citation list. Use list-tabular spec when only the citation matters.
- **Mixed entry shapes.** Every row needs the same three parts — citation, obligation, status. A row missing the status pill or with prose instead of a citation breaks the visual contract.

---

<!-- _class: closing silent -->

## See also.

`Related components`

- `list-tabular` — the rows are citation-only references, no obligation prose
- `obligation-matrix` — obligations cross-tab against actors or controls
- `authority-chain` — the rows are a delegation lineage, not parallel jurisdictions
- `compare-table` — the comparison is across criteria, not jurisdictions
