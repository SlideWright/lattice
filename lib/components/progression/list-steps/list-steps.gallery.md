---
marp: true
theme: indaco
paginate: true
header: "Lattice · list-steps"
---

<!-- _class: title silent -->

# list-steps

`Progression · Timeline · Structure`

Vertical sequence of steps, each with full description body.

---

<!-- _class: list-steps -->
<!-- _footer: "Default · list-steps" -->

## What happens in the first hour of an incident.

1. Declare and page
   - Whoever notices opens the incident channel and pages on-call. Declaring is cheap; a missed page is not.
2. Assign a commander
   - One person owns coordination and communication. They direct the response — they do not debug it.
3. Stop the bleeding
   - Mitigate before diagnosing. Roll back, fail over, or shed load first; find the root cause once customers are safe.
4. Communicate on a clock
   - A status update every 30 minutes, even when it is "still investigating." Silence is what erodes trust.


---

<!-- _class: list-steps vertical compact -->
<!-- _footer: "Vertical — strip flips column to row · list-steps vertical" -->

## Three phases, vertically arranged.

1. Discover
   - Interview eight stakeholders. Open questions only — listening for friction, not confirming assumptions.
2. Frame
   - Half-day workshop to align on root cause. Output is a ranked problem statement.
3. Decide
   - Written sign-off on what is in scope, what is out, and what requires a separate decision.


---

<!-- _class: list-steps phase -->
<!-- _footer: "Phase — badge prefix becomes PHASE · list-steps phase" -->

## A four-phase engagement model.

1. Discovery
   - Eight weeks. Stakeholder interviews, current-state audit, and a problem-framing workshop produce a signed scope.
2. Design
   - Six weeks. Two design partners co-build the operating model and the change-management plan.
3. Pilot
   - Twelve weeks. One business unit runs the model end-to-end with weekly retrospectives.
4. Rollout
   - Phased by region. Pilot learnings shape the rollout cadence; central team owns the playbook.


---

<!-- _class: list-steps milestone lettered -->
<!-- _footer: "Milestone — badge prefix becomes MILESTONE · list-steps milestone" -->

## Three milestones to GA.

1. Closed beta
   - Five design-partner accounts live on the platform. Daily standups; weekly retros.
2. Open beta
   - Self-serve signup at the marketing site. Pricing visible but not enforced.
3. GA
   - Billing enforcement on. SLA enters effect. Support escalation paths published.


---

<!-- _class: list-steps lettered -->
<!-- _footer: "Lettered — counter format becomes A, B, C · list-steps lettered" -->

## Three tracks for the next quarter.

1. Platform hardening
   - Per-team weighting, automated recalibration, and the log purge runbook land in this track.
2. Compliance posture
   - Board pack v2 and the centralised audit log ship for the Q3 audit window.
3. Developer surface
   - Polyglot SDK parity and the new CLI flags close out the API roadmap.


---

<!-- _class: list-steps stage -->
<!-- _footer: "Stage · list-steps stage" -->

## Three stages, with explicit stage prefixes.

1. Plan
   - Define the work and the artifacts each stage produces.
2. Execute
   - Run the work against the plan; track variance.
3. Review
   - Compare actuals to plan; capture lessons for the next cycle.


---

<!-- _class: list-steps rank -->
<!-- _footer: "Rank · list-steps rank" -->

## Top three risks, ranked by exposure.

1. Renewal cohort
   - $2.1M ARR at risk if pricing comp gap persists.
2. Pipeline conversion
   - 11 pp below Q1; legal review is the chokepoint.
3. Competitive displacement
   - Seven losses to one competitor in the $80-200K tier.


---

<!-- _class: list-steps tier roman -->
<!-- _footer: "Tier · list-steps tier" -->

## Three engagement tiers.

1. Strategic
   - Quarterly executive review, dedicated success manager.
2. Growth
   - Monthly check-in, shared success pool.
3. Self-serve
   - Async docs, community support.


---

<!-- _class: list-steps phase roman -->
<!-- _footer: "Roman numerals · list-steps roman" -->

## Three phases, roman-numeral counter.

1. Discovery
   - Identify the constraints and the success criteria.
2. Design
   - Sketch options against the constraints; pick one.
3. Delivery
   - Build, ship, measure.


---

<!-- _class: list-steps dark -->
<!-- _footer: "Composition: dark · list-steps dark" -->

## What happens in the first hour of an incident.

1. Declare and page
   - Whoever notices opens the incident channel and pages on-call. Declaring is cheap; a missed page is not.
2. Assign a commander
   - One person owns coordination and communication. They direct the response — they do not debug it.
3. Stop the bleeding
   - Mitigate before diagnosing. Roll back, fail over, or shed load first; find the root cause once customers are safe.
4. Communicate on a clock
   - A status update every 30 minutes, even when it is "still investigating." Silence is what erodes trust.


---

<!-- _class: list-steps compact -->
<!-- _footer: "Composition: compact · list-steps compact" -->

## What happens in the first hour of an incident.

1. Declare and page
   - Whoever notices opens the incident channel and pages on-call. Declaring is cheap; a missed page is not.
2. Assign a commander
   - One person owns coordination and communication. They direct the response — they do not debug it.
3. Stop the bleeding
   - Mitigate before diagnosing. Roll back, fail over, or shed load first; find the root cause once customers are safe.
4. Communicate on a clock
   - A status update every 30 minutes, even when it is "still investigating." Silence is what erodes trust.


---

<!-- _class: list-steps accent -->
<!-- _footer: "Composition: accent · list-steps accent" -->

## What happens in the first hour of an incident.

1. Declare and page
   - Whoever notices opens the incident channel and pages on-call. Declaring is cheap; a missed page is not.
2. Assign a commander
   - One person owns coordination and communication. They direct the response — they do not debug it.
3. Stop the bleeding
   - Mitigate before diagnosing. Roll back, fail over, or shed load first; find the root cause once customers are safe.
4. Communicate on a clock
   - A status update every 30 minutes, even when it is "still investigating." Silence is what erodes trust.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · list-steps" -->

## When NOT to reach for list-steps.

- **Light labels, no body.** If each step is a single label with no description, use `timeline`. list-steps earns its chrome only when the body adds substance.
- **Parallel options.** If the rows are alternatives the audience compares, use `cards-grid` or `verdict-grid`. The numbered prefix here reads as sequence — using it for parallel items mis-cues the audience.
- **Author-typed step numbers.** Don't write `**STEP 01**` into the markdown. The badge is CSS-generated from the `ol` counter; manual numbering double-stamps and breaks on reordering.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `timeline` — shorter labels per step, horizontal axis instead of vertical cards
- `list-criteria` — gating requirements rather than a sequence of actions
- `split-steps` — phase label + heading on the left, steps on the right
- `roadmap` — phased grid across multiple workstreams
- `principles` — tenets or values rather than a procedural sequence
