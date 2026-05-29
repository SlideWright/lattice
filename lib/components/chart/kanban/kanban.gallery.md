---
marp: true
theme: indaco
paginate: true
header: "Lattice · kanban"
---

<!-- _class: title silent -->

# kanban

`Progression · Timeline · Series`

Kanban board — columns of cards by stage.

---

<!-- _class: kanban -->
<!-- _footer: "Default · kanban" -->

`Phase 2 · Sprint 14`

## Where Phase 2 work stands today.

Eight items across four stages; multi-tenant DEKs is the only card flagged at-risk.

- Backlog
  - Per-purpose codebooks `S`
    - compliance
  - Crypto-shred runbook `M`
    - platform
  - Dependency dashboard `S`
    - platform
- In progress
  - Multi-tenant DEKs `M`
    - platform `at-risk`
  - Examiner pack v2 `L`
    - compliance
- Review
  - Centralised log `S`
    - compliance
- Done
  - Codebook signing `M`
    - platform
  - Manual rotation `S`
    - operations


---

<!-- _class: kanban -->
<!-- _footer: "Stress test · kanban" -->

`Phase 2 · Sprint 14`

## Stress test — four lanes, fifteen cards, mixed sizes.

- Backlog
  - Per-purpose codebook caching `L`
    - platform
  - Crypto-shred runbook `M`
    - operations
  - Dependency dashboard `S`
    - platform
  - Edge runtime bindings `L`
    - platform
- In progress
  - Multi-tenant DEK rotation `M`
    - platform `at-risk`
  - Examiner evidence pack v2 `L`
    - compliance
  - Polyglot SDK parity `M`
    - platform
  - Centralised examiner log `S`
    - compliance `blocked`
- Review
  - Automated rotation pipeline `M`
    - operations
  - Continuous audit trail `S`
    - compliance
  - Incident response runbook `S`
    - operations
- Done
  - Codebook signing service `M`
    - platform
  - Manual key rotation `S`
    - operations
  - Java and .NET parity `M`
    - platform
  - Audit trail v1 `S`
    - compliance


---

<!-- _class: kanban dark -->
<!-- _footer: "Composition: dark · kanban dark" -->

`Phase 2 · Sprint 14`

## Where Phase 2 work stands today.

Eight items across four stages; multi-tenant DEKs is the only card flagged at-risk.

- Backlog
  - Per-purpose codebooks `S`
    - compliance
  - Crypto-shred runbook `M`
    - platform
  - Dependency dashboard `S`
    - platform
- In progress
  - Multi-tenant DEKs `M`
    - platform `at-risk`
  - Examiner pack v2 `L`
    - compliance
- Review
  - Centralised log `S`
    - compliance
- Done
  - Codebook signing `M`
    - platform
  - Manual rotation `S`
    - operations


---

<!-- _class: kanban compact -->
<!-- _footer: "Composition: compact · kanban compact" -->

`Phase 2 · Sprint 14`

## Where Phase 2 work stands today.

Eight items across four stages; multi-tenant DEKs is the only card flagged at-risk.

- Backlog
  - Per-purpose codebooks `S`
    - compliance
  - Crypto-shred runbook `M`
    - platform
  - Dependency dashboard `S`
    - platform
- In progress
  - Multi-tenant DEKs `M`
    - platform `at-risk`
  - Examiner pack v2 `L`
    - compliance
- Review
  - Centralised log `S`
    - compliance
- Done
  - Codebook signing `M`
    - platform
  - Manual rotation `S`
    - operations


---

<!-- _class: kanban accent -->
<!-- _footer: "Composition: accent · kanban accent" -->

`Phase 2 · Sprint 14`

## Where Phase 2 work stands today.

Eight items across four stages; multi-tenant DEKs is the only card flagged at-risk.

- Backlog
  - Per-purpose codebooks `S`
    - compliance
  - Crypto-shred runbook `M`
    - platform
  - Dependency dashboard `S`
    - platform
- In progress
  - Multi-tenant DEKs `M`
    - platform `at-risk`
  - Examiner pack v2 `L`
    - compliance
- Review
  - Centralised log `S`
    - compliance
- Done
  - Codebook signing `M`
    - platform
  - Manual rotation `S`
    - operations


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · kanban" -->

## When NOT to reach for kanban.

- **Schedule, not status.** If the question is when each task ships rather than where it sits today, reach for `gantt` (spans) or `roadmap` (phases). Kanban is a snapshot, not a timeline.
- **More than five lanes.** Past five columns the cards compress and the column headers crowd. Group adjacent stages or split into two boards (e.g. by team) instead.
- **Cards without meta.** A board of bare titles wastes the layout's affordances. Add at least a size badge and a lane label so the audience can scan workload and ownership at a glance.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `gantt` — schedule of overlapping tasks across lanes, not current state
- `roadmap` — phased grid of deliverables across workstreams
- `checklist` — single list of items with done/in-flight/planned states
- `verdict-grid` — options scored against shared criteria, not stage-tracked
