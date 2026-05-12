---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · Roadmap redesign"
---

<!-- _class: title -->
<!-- _paginate: false -->

`Lattice · Feature deck`

# Five killer roadmap layouts.

Workstream × phase grids that earn the slide.

---

<!-- _class: subtopic -->

## What this deck shows.

Five table-driven roadmap layouts, all built from the same markdown source contract (workstream column on the left, phase columns to the right). One default plus four modifiers — `status`, `horizons`, `swimlane`, `milestones`. Each modifier adds visual chrome without changing how the table is authored.

---

<!-- _class: roadmap -->
<!-- _footer: "Default — roadmap" -->

`Layout · roadmap`

## What ships in each phase, by workstream.

| Workstream | Phase 01          | Phase 02              | Phase 03              |
| ---------- | ----------------- | --------------------- | --------------------- |
| Platform   | Codebook signing  | Multi-tenant DEKs     | Per-purpose codebooks |
| Operations | Manual rotation   | Automated rotation    | Crypto-shred          |
| Compliance | Audit trail (HSM) | Centralised log       | Examiner pack         |
| SDK        | Java              |                       | Polyglot parity       |

Workstream column carries a categorical lane stripe; phase headers carry numbered chrome; empty cells render as a thin dash.

---

<!-- _class: roadmap status -->
<!-- _footer: "Modifier — roadmap status" -->

`Layout · roadmap status`

## Where every workstream lands this quarter.

| Workstream | Phase 01              | Phase 02                  | Phase 03                  |
| ---------- | --------------------- | ------------------------- | ------------------------- |
| Platform   | [x] Codebook signing  | [-] Multi-tenant DEKs     | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation   | [-] Automated rotation    | [ ] Crypto-shred          |
| Compliance | [x] Audit trail (HSM) | [x] Centralised log       | [ ] Examiner pack         |
| SDK        | [x] Java              | [/] .NET                  | [ ] Polyglot parity       |

`[x]` shipped, `[-]` in flight, `[ ]` planned, `[/]` out of scope. Each marker tints the cell and prints a state eyebrow above the content.

---

<!-- _class: roadmap horizons -->
<!-- _footer: "Modifier — roadmap horizons" -->

`Layout · roadmap horizons`

## Now, next, and later — by workstream.

| Workstream | Now · Q2 2026          | Next · Q3 2026         | Later · Q4 2026       |
| ---------- | ---------------------- | ---------------------- | --------------------- |
| Platform   | Codebook signing       | Multi-tenant DEKs      | Per-purpose codebooks |
| Operations | Manual rotation        | Automated rotation     | Crypto-shred          |
| Compliance | Audit trail (HSM)      | Centralised log        | Examiner pack         |
| SDK        | Java                   |                        | Polyglot parity       |

Same source table, transposed into three phase cards. Each card carries the phase eyebrow, the phase title from the header, and the workstream commitments stacked below.

---

<!-- _class: roadmap swimlane -->
<!-- _footer: "Modifier — roadmap swimlane" -->

`Layout · roadmap swimlane`

## Each workstream as its own track.

| Workstream | Phase 01          | Phase 02              | Phase 03              |
| ---------- | ----------------- | --------------------- | --------------------- |
| Platform   | Codebook signing  | Multi-tenant DEKs     | Per-purpose codebooks |
| Operations | Manual rotation   | Automated rotation    | Crypto-shred          |
| Compliance | Audit trail (HSM) | Centralised log       | Examiner pack         |
| SDK        | Java              |                       | Polyglot parity       |

Workstream cell becomes a lane label on its row's categorical ground; phase cells read as outlined cards along the track.

---

<!-- _class: roadmap milestones -->
<!-- _footer: "Modifier — roadmap milestones" -->

`Layout · roadmap milestones`

## Phased rollout against the fiscal calendar.

| Workstream | Phase 01<br>*Q2 2026* | Phase 02<br>*Q3 2026* | Phase 03<br>*Q4 2026* |
| ---------- | --------------------- | --------------------- | --------------------- |
| Platform   | Codebook signing      | Multi-tenant DEKs     | Per-purpose codebooks |
| Operations | Manual rotation       | Automated rotation    | Crypto-shred          |
| Compliance | Audit trail (HSM)     | Centralised log       | Examiner pack         |
| SDK        | Java                  |                       | Polyglot parity       |

Phase headers carry a date subtitle authored with `<br>*Q2 2026*`. A coloured tick anchors each phase column to the spectrum-gradient timeline beneath the header.

---

<!-- _class: closing -->
<!-- _paginate: false -->

`Lattice · Feature deck`

# Inspect, then merge.

Five table-driven layouts. One markdown source contract. Palette-blind, theme-portable.
