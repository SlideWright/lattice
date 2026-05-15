---
marp: true
theme: indaco
size: hd
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

| Workstream | Foundation `Q2 2026`  | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | --------------------- | ---------------------- | ------------------------- |
| Platform   | [x] Codebook signing  | [-] Multi-tenant DEKs  | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation   | [-] Automated rotation | [ ] Crypto-shred          |
| Compliance | [x] Audit trail (HSM) | [x] Centralised log    | [ ] Examiner pack         |
| SDK        | [x] Java              | [/] .NET               | [ ] Polyglot parity       |

Header text is the phase NAME; the trailing inline-code element becomes a right-anchored meta pill on the spectrum line. State markers `[x]/[-]/[ ]/[/]` are universal — they render as a small state-coloured glyph before the cell text: ✓ shipped, ◐ in flight, ○ planned, ╱ out of scope.

---

<!-- _class: roadmap status -->
<!-- _footer: "Modifier — roadmap status" -->

`Layout · roadmap status`

## Where every workstream lands this quarter.

| Workstream | Foundation `Q2 2026`  | Hardening `Q3 2026`       | Scale `Q4 2026`           |
| ---------- | --------------------- | ------------------------- | ------------------------- |
| Platform   | [x] Codebook signing  | [-] Multi-tenant DEKs     | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation   | [-] Automated rotation    | [ ] Crypto-shred          |
| Compliance | [x] Audit trail (HSM) | [x] Centralised log       | [ ] Examiner pack         |
| SDK        | [x] Java              | [/] .NET                  | [ ] Polyglot parity       |

Same `[x]/[-]/[ ]/[/]` markers as the other variants. The `status` modifier upgrades them from the universal light treatment to a heavy one: full left-edge ribbon, tinted ground, and a mono-caps state eyebrow (SHIPPED / IN FLIGHT / PLANNED / OUT OF SCOPE) above the cell text.

---

<!-- _class: roadmap horizons -->
<!-- _footer: "Modifier — roadmap horizons" -->

`Layout · roadmap horizons`

## Now, next, and later — by workstream.

| Workstream | Now `Q2 2026`           | Next `Q3 2026`            | Later `Q4 2026`           |
| ---------- | ----------------------- | ------------------------- | ------------------------- |
| Platform   | [x] Codebook signing    | [-] Multi-tenant DEKs     | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation     | [-] Automated rotation    | [ ] Crypto-shred          |
| Compliance | [x] Audit trail (HSM)   | [x] Centralised log       | [ ] Examiner pack         |
| SDK        | [x] Java                |                           | [ ] Polyglot parity       |

Same source table, transposed into three phase cards. State markers on the source cells flow through onto the card rows — each row's left rail picks up the state colour and the row carries the state glyph.

---

<!-- _class: roadmap swimlane -->
<!-- _footer: "Modifier — roadmap swimlane" -->

`Layout · roadmap swimlane`

## Each workstream as its own track.

| Workstream | Foundation `Q2 2026`  | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | --------------------- | ---------------------- | ------------------------- |
| Platform   | [x] Codebook signing  | [-] Multi-tenant DEKs  | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation   | [-] Automated rotation | [ ] Crypto-shred          |
| Compliance | [x] Audit trail (HSM) | [x] Centralised log    | [ ] Examiner pack         |
| SDK        | [x] Java              |                        | [ ] Polyglot parity       |

Workstream cell becomes a lane label on its row's categorical ground; phase cells read as outlined cards along the track.

---

<!-- _class: roadmap milestones -->
<!-- _footer: "Modifier — roadmap milestones" -->

`Layout · roadmap milestones`

## Phased rollout against the fiscal calendar.

| Workstream | Foundation `Q2 2026`  | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | --------------------- | ---------------------- | ------------------------- |
| Platform   | [x] Codebook signing  | [-] Multi-tenant DEKs  | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation   | [-] Automated rotation | [ ] Crypto-shred          |
| Compliance | [x] Audit trail (HSM) | [x] Centralised log    | [ ] Examiner pack         |
| SDK        | [x] Java              |                        | [ ] Polyglot parity       |

Same meta-pill convention as the other roadmaps — the difference is the calendar identity: phase columns get a soft alternating tint so the timeline reads as a fiscal grid.

---

<!-- _class: closing -->
<!-- _paginate: false -->

`Lattice · Feature deck`

# Inspect, then merge.

Five table-driven layouts. One markdown source contract. Palette-blind, theme-portable.
