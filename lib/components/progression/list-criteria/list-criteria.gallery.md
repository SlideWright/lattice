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

## What a vendor must clear before procurement signs.

1. SOC 2 Type II
   - A current report with no exceptions in the security or availability criteria.
2. Data residency
   - Customer data stays in-region; every sub-processor is disclosed and contractually bound.
3. Exit guarantee
   - Full data export in a documented format, available without opening a support ticket.
4. Breach notification
   - A 72-hour notice obligation written into the contract, not the marketing page.
5. Uptime history
   - Twelve months of published status at 99.9% or better, verifiable independently.


---

<!-- _class: list-criteria dark -->
<!-- _footer: "Composition: dark · list-criteria dark" -->

## What a vendor must clear before procurement signs.

1. SOC 2 Type II
   - A current report with no exceptions in the security or availability criteria.
2. Data residency
   - Customer data stays in-region; every sub-processor is disclosed and contractually bound.
3. Exit guarantee
   - Full data export in a documented format, available without opening a support ticket.
4. Breach notification
   - A 72-hour notice obligation written into the contract, not the marketing page.
5. Uptime history
   - Twelve months of published status at 99.9% or better, verifiable independently.


---

<!-- _class: list-criteria compact -->
<!-- _footer: "Composition: compact · list-criteria compact" -->

## What a vendor must clear before procurement signs.

1. SOC 2 Type II
   - A current report with no exceptions in the security or availability criteria.
2. Data residency
   - Customer data stays in-region; every sub-processor is disclosed and contractually bound.
3. Exit guarantee
   - Full data export in a documented format, available without opening a support ticket.
4. Breach notification
   - A 72-hour notice obligation written into the contract, not the marketing page.
5. Uptime history
   - Twelve months of published status at 99.9% or better, verifiable independently.


---

<!-- _class: list-criteria accent -->
<!-- _footer: "Composition: accent · list-criteria accent" -->

## What a vendor must clear before procurement signs.

1. SOC 2 Type II
   - A current report with no exceptions in the security or availability criteria.
2. Data residency
   - Customer data stays in-region; every sub-processor is disclosed and contractually bound.
3. Exit guarantee
   - Full data export in a documented format, available without opening a support ticket.
4. Breach notification
   - A 72-hour notice obligation written into the contract, not the marketing page.
5. Uptime history
   - Twelve months of published status at 99.9% or better, verifiable independently.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · list-criteria" -->

## When NOT to reach for list-criteria.

- **Parallel options, not gates.** If the items are alternatives the audience is choosing between, use `cards-grid` or `verdict-grid`. list-criteria is for requirements all of which must hold.
- **Rationale longer than two lines.** Each row is a one-sentence rationale. If a criterion needs a paragraph, lift it to `list-steps` or `split-brief` where the body has room to breathe.
- **Missing criterion title.** The lead line on each li — rendered bold automatically — is what makes the ledger scannable. A naked sentence per row reads as paragraph soup; the title is the structure.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `list-steps` — rows are procedural steps with longer body, not gating criteria
- `checklist` — rows carry done/in-flight/planned state markers
- `verdict-grid` — options scored against shared criteria
- `principles` — tenets or values rather than gates a decision must clear
- `list-tabular` — rows carry structured metadata alongside the name and description
