---
marp: true
theme: indaco
paginate: true
header: "Lattice · progress"
---

<!-- _class: title silent -->

# progress

`Evidence · Canvas · Series`

Horizontal progress bars — one row per item, percentage filled.

---

<!-- _class: progress -->
<!-- _footer: "Default · progress" -->

`H1 2026 · Phase 1 readiness`

## Phase 1 readiness, by workstream.

Snapshot at 14:00 UTC. One workstream is blocked and two more are behind plan.

- Framework `92%` `on-track`
- Adoption & enablement `68%` `at-risk`
- Decision log `81%` `on-track`
- Calibration cadence `34%` `deferred`
- Board reporting `12%` `blocked`


---

<!-- _class: progress -->
<!-- _footer: "Stress test · progress" -->

`H1 2026 · Phase 1 readiness`

## Stress test — eight workstreams, full status range.

- Scoring platform `92%` `on-track`
- Operations runbook `68%` `at-risk`
- Compliance audit pack `81%` `on-track`
- SDK polyglot parity `34%` `deferred`
- Dependency dashboard `12%` `blocked`
- Continuous audit trail `100%` `done`
- Log purge tooling `45%` `deferred`
- Board reviewer log rollout `73%` `on-track`


---

<!-- _class: progress dark -->
<!-- _footer: "Composition: dark · progress dark" -->

`H1 2026 · Phase 1 readiness`

## Phase 1 readiness, by workstream.

Snapshot at 14:00 UTC. One workstream is blocked and two more are behind plan.

- Framework `92%` `on-track`
- Adoption & enablement `68%` `at-risk`
- Decision log `81%` `on-track`
- Calibration cadence `34%` `deferred`
- Board reporting `12%` `blocked`


---

<!-- _class: progress compact -->
<!-- _footer: "Composition: compact · progress compact" -->

`H1 2026 · Phase 1 readiness`

## Phase 1 readiness, by workstream.

Snapshot at 14:00 UTC. One workstream is blocked and two more are behind plan.

- Framework `92%` `on-track`
- Adoption & enablement `68%` `at-risk`
- Decision log `81%` `on-track`
- Calibration cadence `34%` `deferred`
- Board reporting `12%` `blocked`


---

<!-- _class: progress accent -->
<!-- _footer: "Composition: accent · progress accent" -->

`H1 2026 · Phase 1 readiness`

## Phase 1 readiness, by workstream.

Snapshot at 14:00 UTC. One workstream is blocked and two more are behind plan.

- Framework `92%` `on-track`
- Adoption & enablement `68%` `at-risk`
- Decision log `81%` `on-track`
- Calibration cadence `34%` `deferred`
- Board reporting `12%` `blocked`


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · progress" -->

## When NOT to reach for progress.

- **Comparing unrelated metrics.** Revenue % of target, latency vs SLO, and headcount fill aren't comparable on a shared bar scale. Use `kpi` for value/target/status tiles or `stats` for an independent metric row.
- **More than eight rows.** Past eight workstreams the bars compress and the labels truncate. Split the view by owner or workstream group; the audience can't scan twelve bars at once anyway.
- **Decorative status pills.** Don't invent new status words for tone. `on-track`, `at-risk`, `blocked`, `deferred`, `done` are the vocabulary the engine recognises; everything else renders as a plain pill and breaks the at-a-glance read.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `kpi` — value + target + status tiles, not a single percent
- `stats` — independent headline metrics, no completion scale
- `gantt` — the rows are time-bound and need a date axis
- `checklist` — binary done / not-done across a flat list
- `timeline-list` — the workstreams resolve in sequence, not in parallel
