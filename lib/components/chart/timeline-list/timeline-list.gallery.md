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
   - The steering committee accepts the scoring model. Build approved; the build team is the steering committee.
3. `2025 Q3` Pilot live `live`
   - Four product teams onboarded; the decision log opens. Eighteen entries to date, against roughly three hundred decisions made.
4. `2026 Q1` Operating rhythm `live`
   - The weekly review lands on every team's calendar. Attendance, like the calibration step, remains aspirational.


---

<!-- _class: timeline-list -->
<!-- _footer: "Stress test · timeline-list" -->

`Decision framework`

## Stress test — six milestones over three years, each described as inevitable in hindsight.

1. `2023 Q4` Quarterly re-litigation
   - Every prioritisation argued from first principles in a recurring meeting. Average close 4 hours, and the worst one ran an entire offsite, precisely when the board joined.
2. `2024 Q2` Framework proposal `decision`
   - Architecture review accepts the scoring model. The review board and the build team are the same six people.
3. `2024 Q4` Scoring policy GA `live`
   - Phase 1 rollout complete; twelve product teams onboarded, all of whom asked to go back to the spreadsheet once.
4. `2025 Q2` Per-team calibration `live`
   - Per-team scoring weights shipped; the calibration loop cut p99 decision close to 18 minutes. The slide does not mention what the cold path costs.
5. `2025 Q4` Org-wide enablement `at-risk`
   - Org-wide adoption enters pilot. "Org-wide" remains one pilot team with ambitions.
6. `2026 Q2` Auditor export
   - Decision-log export and the auditor evidence pack in build — demoed once, never yet run in anger.


---

<!-- _class: timeline-list dark -->
<!-- _footer: "Composition: dark · timeline-list dark" -->

`Decision framework`

## How the framework arrived in production.

Four stages over eighteen months, from the first workshop to the operating rhythm.

1. `2024 Q3` First workshop
   - The one where we agreed to agree on a definition of "signal." Output: a fifth workshop.
2. `2025 Q1` Framework approved `decision`
   - The steering committee accepts the scoring model. Build approved; the build team is the steering committee.
3. `2025 Q3` Pilot live `live`
   - Four product teams onboarded; the decision log opens. Eighteen entries to date, against roughly three hundred decisions made.
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
   - The steering committee accepts the scoring model. Build approved; the build team is the steering committee.
3. `2025 Q3` Pilot live `live`
   - Four product teams onboarded; the decision log opens. Eighteen entries to date, against roughly three hundred decisions made.
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
   - The steering committee accepts the scoring model. Build approved; the build team is the steering committee.
3. `2025 Q3` Pilot live `live`
   - Four product teams onboarded; the decision log opens. Eighteen entries to date, against roughly three hundred decisions made.
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

## See also.

`Related components`

- `gantt` — milestones occupy date ranges, not single moments
- `list-steps` — the sequence has no dates, just an order
- `journey` — stage-by-stage progress without calendar dates
- `roadmap` — the timeline is forward-looking and bucketed by horizon
- `progress` — the events are parallel workstreams with completion percentages
