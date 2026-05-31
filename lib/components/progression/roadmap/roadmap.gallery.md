---
marp: true
theme: indaco
paginate: true
header: "Lattice · roadmap"
---

<!-- _class: title silent -->

# roadmap

`Progression · Matrix · Structure`

Phased multi-workstream grid — phases across the top, workstreams down the side.

---

<!-- _class: roadmap -->
<!-- _footer: "Default · roadmap" -->

`H2 2026 · Rollout plan`

## What ships in each phase, by workstream.

| Workstream | Foundation `Q2 2026`   | Hardening `Q3 2026`      | Scale `Q4 2026`         |
| ---------- | ---------------------- | ------------------------ | ----------------------- |
| Framework  | [x] Signal taxonomy    | [-] Scoring model v2     | [ ] Per-team weighting  |
| Adoption   | [x] Pilot onboarding   | [-] Weekly signal review | [ ] Org-wide rollout    |
| Governance | [x] Decision log       | [x] Calibration cadence  | [ ] Board reporting     |
| Tooling    | [x] Intake form        | [/] Dashboards           | [ ] Self-serve exports  |


---

<!-- _class: roadmap horizons -->
<!-- _footer: "Horizons — three-horizon planning framing · roadmap horizons" -->

`Three-horizon planning`

## Where the platform invests across horizons.

| Workstream | Horizon 1 `Now`          | Horizon 2 `Next`         | Horizon 3 `Later`         |
| ---------- | ------------------------ | ------------------------ | ------------------------- |
| Platform   | [x] Pack signing     | [-] Multi-tenant adapters    | [ ] Per-purpose packs |
| Operations | [x] Manual rotation      | [-] Automated rotation   | [ ] Deprovision          |
| Compliance | [x] Audit trail          | [x] Centralised log      | [ ] Examiner pack         |
| SDK        | [x] Java                 | [/] .NET                 | [ ] Polyglot parity       |

Horizons frame the read: H1 is core business, H2 is emerging, H3 is the option set.


---

<!-- _class: roadmap status -->
<!-- _footer: "Status — heavy state treatment · roadmap status" -->

`Layout · roadmap status`

## Delivery status by workstream.

| Workstream | Foundation `Q2 2026` | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | -------------------- | ---------------------- | ------------------------- |
| Platform   | [x] Pack signing | [-] Multi-tenant adapters  | [ ] Per-purpose packs |
| Operations | [x] Manual rotation  | [-] Automated rotation | [ ] Deprovision          |
| Compliance | [x] Audit trail      | [x] Centralised log    | [ ] Examiner pack         |
| SDK        | [x] Java             | [/] .NET               | [ ] Polyglot parity       |

State markers `[x]/[-]/[ ]/[/]` are universal: ✓ shipped, ◐ in flight, ○ planned, ╱ out of scope.


---

<!-- _class: roadmap swimlane -->
<!-- _footer: "Swimlane — horizontal tracks · roadmap swimlane" -->

`Layout · roadmap swimlane`

## Each team's track across the year.

| Workstream | Foundation `Q2 2026` | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | -------------------- | ---------------------- | ------------------------- |
| Platform   | Pack signing     | Multi-tenant adapters      | Per-purpose packs     |
| Operations | Manual rotation      | Automated rotation     | Deprovision              |
| Compliance | Audit trail          | Centralised log        | Examiner pack             |
| SDK        | Java                 | .NET                   | Polyglot parity           |


---

<!-- _class: roadmap milestones -->
<!-- _footer: "Milestones — calendar-aware · roadmap milestones" -->

`Layout · roadmap milestones`

## The dated path to GA.

| Workstream | Beta `Q2 2026`       | RC `Q3 2026`           | GA `Q4 2026`              |
| ---------- | -------------------- | ---------------------- | ------------------------- |
| Platform   | Pack signing     | Multi-tenant adapters      | Per-purpose packs     |
| Operations | Manual rotation      | Automated rotation     | Deprovision              |
| Compliance | Audit trail          | Centralised log        | Examiner pack             |


---

<!-- _class: roadmap dark -->
<!-- _footer: "Composition: dark · roadmap dark" -->

`H2 2026 · Rollout plan`

## What ships in each phase, by workstream.

| Workstream | Foundation `Q2 2026`   | Hardening `Q3 2026`      | Scale `Q4 2026`         |
| ---------- | ---------------------- | ------------------------ | ----------------------- |
| Framework  | [x] Signal taxonomy    | [-] Scoring model v2     | [ ] Per-team weighting  |
| Adoption   | [x] Pilot onboarding   | [-] Weekly signal review | [ ] Org-wide rollout    |
| Governance | [x] Decision log       | [x] Calibration cadence  | [ ] Board reporting     |
| Tooling    | [x] Intake form        | [/] Dashboards           | [ ] Self-serve exports  |


---

<!-- _class: roadmap compact -->
<!-- _footer: "Composition: compact · roadmap compact" -->

`H2 2026 · Rollout plan`

## What ships in each phase, by workstream.

| Workstream | Foundation `Q2 2026`   | Hardening `Q3 2026`      | Scale `Q4 2026`         |
| ---------- | ---------------------- | ------------------------ | ----------------------- |
| Framework  | [x] Signal taxonomy    | [-] Scoring model v2     | [ ] Per-team weighting  |
| Adoption   | [x] Pilot onboarding   | [-] Weekly signal review | [ ] Org-wide rollout    |
| Governance | [x] Decision log       | [x] Calibration cadence  | [ ] Board reporting     |
| Tooling    | [x] Intake form        | [/] Dashboards           | [ ] Self-serve exports  |


---

<!-- _class: roadmap accent -->
<!-- _footer: "Composition: accent · roadmap accent" -->

`H2 2026 · Rollout plan`

## What ships in each phase, by workstream.

| Workstream | Foundation `Q2 2026`   | Hardening `Q3 2026`      | Scale `Q4 2026`         |
| ---------- | ---------------------- | ------------------------ | ----------------------- |
| Framework  | [x] Signal taxonomy    | [-] Scoring model v2     | [ ] Per-team weighting  |
| Adoption   | [x] Pilot onboarding   | [-] Weekly signal review | [ ] Org-wide rollout    |
| Governance | [x] Decision log       | [x] Calibration cadence  | [ ] Board reporting     |
| Tooling    | [x] Intake form        | [/] Dashboards           | [ ] Self-serve exports  |


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · roadmap" -->

## When NOT to reach for roadmap.

- **One workstream.** A single row of phases is a `timeline` or `list-steps`, not a roadmap. Roadmap earns its grid only when at least two workstreams move in parallel.
- **No state markers.** A grid of bare deliverables loses half its value. Add `[x]`/`[-]`/`[ ]`/`[/]` so the audience reads progress alongside scope.
- **Past five workstreams.** More than five rows compresses cell text and the lane stripes lose their categorical read. Group adjacent workstreams or split by phase.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `gantt` — continuous task bars across a date axis rather than discrete phase cells
- `kanban` — current state by stage rather than phased schedule
- `list-steps` — single workstream sequence without parallel lanes
- `verdict-grid` — options scored against shared criteria, not phased delivery
- `checklist` — single list with state markers, no workstream dimension
