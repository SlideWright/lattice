---
marp: true
theme: indaco
paginate: true
header: "Lattice · gantt"
---

<!-- _class: title silent -->

# gantt

`Progression · Timeline · Series`

Gantt chart — task bars across a date axis.

---

<!-- _class: gantt -->
<!-- _footer: "Default · gantt" -->

`2026 Q1 → 2026 Q4`

## What ships in each phase, by workstream.

Three workstreams across four quarters. Status pills tint each bar.

- Platform
  - Codebook signing `Q1 → Q2` `done`
  - Multi-tenant DEKs `Q2 → Q3` `live`
  - Per-purpose codebooks `Q3 → Q4` `at-risk`
- Operations
  - Manual rotation `Q1 → Q2` `done`
  - Automated rotation `Q2 → Q3` `live`
  - Crypto-shred `Q3 → Q4`
- Compliance
  - Audit trail `Q1 → Q2` `done`
  - Centralised log `Q2 → Q3`
  - Examiner pack `Q3 → Q4`


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · gantt" -->

## When NOT to reach for gantt.

- **Single workstream.** One lane of bars is a timeline, not a gantt. Use `timeline` or `list-steps` when there is no parallel work to coordinate.
- **More than five lanes.** Past five workstreams the bars compress and the labels crowd. Group lanes (collapse 'SDK' subdomains into 'SDK') or split into two slides.
- **No spans.** If tasks are point-in-time milestones rather than durations, use `timeline` or `roadmap milestones`. gantt earns its chrome only when bars have meaningful length.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `roadmap` — phased grid of deliverables across workstreams without continuous spans
- `timeline` — single-lane sequence of milestones
- `kanban` — current state by stage rather than schedule by lane
- `list-steps` — sequential process with descriptive steps, no parallel lanes
