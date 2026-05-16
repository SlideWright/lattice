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

Four columns, mixed card density. Size badge sits in the title row.

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

<!-- _class: cards-grid -->
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
