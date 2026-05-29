---
marp: true
theme: indaco
paginate: true
header: "Lattice · timeline-list"
---

<!-- _class: title silent -->

# timeline-list

`Evidence · Timeline · Series`

Date-stamped event list — spine with date pills, status pills, and body.

---

<!-- _class: timeline-list -->
<!-- _footer: "Default · timeline-list" -->

`Decision framework`

## How the framework arrived in production.

Four stages over eighteen months, from the first workshop to the operating rhythm.

1. `2024 Q3` First workshop
   - The one where we agreed to agree on a definition of "signal." Output: a fifth workshop.
2. `2025 Q1` Framework approved `decision`
   - The steering committee accepts the scoring model. Build approved.
3. `2025 Q3` Pilot live `live`
   - Four product teams onboarded; the decision log opens. Eighteen entries to date.
4. `2026 Q1` Operating rhythm `live`
   - The weekly review lands on every team's calendar. Attendance, like the calibration step, remains aspirational.


---

<!-- _class: timeline-list -->
<!-- _footer: "Stress test · timeline-list" -->

`Framework architecture`

## Stress test — six milestones over three years.

1. `2023 Q4` Centralised spreadsheet round-trip
   - First production signal scoring on a centralised spreadsheet. a 6-week decision cycle.
2. `2024 Q2` In-process framework proposal `decision`
   - Architecture review accepts the in-process model.
3. `2024 Q4` Framework GA `live`
   - Phase 1 rollout complete; twelve production teams migrated.
4. `2025 Q2` Multi-team weighting model rotation `live`
   - Per-team key isolation shipped; caching cut cycle time under a week.
5. `2025 Q4` Cross-region replication `at-risk`
   - Active-active framework replication enters pilot.
6. `2026 Q2` Log purge tooling
   - Per-team deletion and board reviewer evidence pack in build.


---

<!-- _class: timeline-list dark -->
<!-- _footer: "Composition: dark · timeline-list dark" -->

`Decision framework`

## How the framework arrived in production.

Four stages over eighteen months, from the first workshop to the operating rhythm.

1. `2024 Q3` First workshop
   - The one where we agreed to agree on a definition of "signal." Output: a fifth workshop.
2. `2025 Q1` Framework approved `decision`
   - The steering committee accepts the scoring model. Build approved.
3. `2025 Q3` Pilot live `live`
   - Four product teams onboarded; the decision log opens. Eighteen entries to date.
4. `2026 Q1` Operating rhythm `live`
   - The weekly review lands on every team's calendar. Attendance, like the calibration step, remains aspirational.


---

<!-- _class: timeline-list compact -->
<!-- _footer: "Composition: compact · timeline-list compact" -->

`Decision framework`

## How the framework arrived in production.

Four stages over eighteen months, from the first workshop to the operating rhythm.

1. `2024 Q3` First workshop
   - The one where we agreed to agree on a definition of "signal." Output: a fifth workshop.
2. `2025 Q1` Framework approved `decision`
   - The steering committee accepts the scoring model. Build approved.
3. `2025 Q3` Pilot live `live`
   - Four product teams onboarded; the decision log opens. Eighteen entries to date.
4. `2026 Q1` Operating rhythm `live`
   - The weekly review lands on every team's calendar. Attendance, like the calibration step, remains aspirational.


---

<!-- _class: timeline-list accent -->
<!-- _footer: "Composition: accent · timeline-list accent" -->

`Decision framework`

## How the framework arrived in production.

Four stages over eighteen months, from the first workshop to the operating rhythm.

1. `2024 Q3` First workshop
   - The one where we agreed to agree on a definition of "signal." Output: a fifth workshop.
2. `2025 Q1` Framework approved `decision`
   - The steering committee accepts the scoring model. Build approved.
3. `2025 Q3` Pilot live `live`
   - Four product teams onboarded; the decision log opens. Eighteen entries to date.
4. `2026 Q1` Operating rhythm `live`
   - The weekly review lands on every team's calendar. Attendance, like the calibration step, remains aspirational.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · timeline-list" -->

## When NOT to reach for timeline-list.

- **Date-less steps.** If the items don't carry calendar dates, you have a sequence, not a timeline. Use `list-steps` for an ordered list or `journey` for stage-by-stage progress without a date axis.
- **Date-range bars.** If each milestone needs a start and an end on a shared time axis, the slide is a Gantt chart. Use `gantt` — the bar geometry will convey the durations the pill cannot.
- **Status pills as decoration.** The status pill is a verdict — `decision`, `live`, `at-risk`, `blocked`, `done`. Don't invent freeform tags; the engine only tints the recognised vocabulary, and decorative pills break the at-a-glance read.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `gantt` — milestones occupy date ranges, not single moments
- `list-steps` — the sequence has no dates, just an order
- `journey` — stage-by-stage progress without calendar dates
- `roadmap` — the timeline is forward-looking and bucketed by horizon
- `progress` — the events are parallel workstreams with completion percentages
