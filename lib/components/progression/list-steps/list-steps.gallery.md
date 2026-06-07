---
marp: true
theme: indaco
paginate: true
header: "Lattice · list-steps"
---

<!-- _class: title silent -->

# list-steps

`Progression · Timeline · Structure`

Horizontal row of ordered step cards, each with a full description body (the `vertical` variant stacks them instead).

---

<!-- _class: list-steps -->
<!-- _footer: "Default · list-steps" -->

## What happens in the first hour of an incident, in theory.

1. Declare and page
   - Whoever notices opens the incident channel and pages on-call. Declaring is cheap; a missed page is the line item in the post-mortem.
2. Assign a commander
   - One person owns coordination and communication. They direct the response — they do not debug it, though they will be asked why they aren't.
3. Stop the bleeding
   - Mitigate before diagnosing. Roll back, fail over, or shed load first; find the root cause once customers are safe and the board has logged off.
4. Communicate on a clock
   - A status update every 30 minutes, even when it is "still investigating." Silence is what the retrospective remembers.


---

<!-- _class: list-steps vertical compact -->
<!-- _footer: "Vertical — strip flips row to column · list-steps vertical" -->

## Three phases, vertically arranged.

1. Discover
   - Interview eight stakeholders. Open questions only — listening for friction, not confirming the assumptions we arrived with.
2. Frame
   - Half-day workshop to align on root cause. Output is a ranked problem statement and a request for a second workshop.
3. Decide
   - Written sign-off on what is in scope, what is out, and what requires a separate decision we will defer.


---

<!-- _class: list-steps phase -->
<!-- _footer: "Phase — badge prefix becomes PHASE · list-steps phase" -->

## A four-phase engagement model.

1. Discovery
   - Eight weeks. Stakeholder interviews, current-state audit, and a problem-framing workshop produce a signed scope nobody rereads.
2. Design
   - Six weeks. Two design partners co-build the operating model and the change-management plan that survives until contact with the org.
3. Pilot
   - Twelve weeks. One business unit runs the model end-to-end with weekly retrospectives held biweekly.
4. Rollout
   - Phased by region. Pilot learnings shape the rollout cadence; the central team owns the playbook and the pager.


---

<!-- _class: list-steps milestone lettered -->
<!-- _footer: "Milestone — badge prefix becomes MILESTONE · list-steps milestone" -->

## Three milestones to GA.

1. Closed beta
   - Five design-partner accounts live on the platform. Daily standups; weekly retros; one account that actually logs in.
2. Open beta
   - Self-serve signup at the marketing site. Pricing visible but not enforced, which everyone treats as the real pricing.
3. GA
   - Billing enforcement on. SLA enters effect. Support escalation paths published, then immediately bypassed by the Slack DM.


---

<!-- _class: list-steps lettered -->
<!-- _footer: "Lettered — counter format becomes A, B, C · list-steps lettered" -->

## Three tracks for the next quarter.

1. Scoring hardening
   - Per-team calibration, automated weight updates, and the recalibration playbook nobody has had to run land in this track.
2. Audit posture
   - Auditor evidence pack v2 and the decision-log audit trail ship for the Q3 audit window, give or take a window.
3. Developer surface
   - Signal-SDK parity and the new CLI flags close out an API roadmap that reopens every quarter.


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

## Top three risks, ranked by exposure, owned by nobody in particular.

1. Renewal cohort
   - $2.1M ARR at risk if the pricing comp gap persists, which it has, comfortably.
2. Pipeline conversion
   - 11 pp below Q1; legal review is the chokepoint, as it was last quarter.
3. Competitive displacement
   - Seven losses to one competitor in the $80-200K tier, all to the same deck.


---

<!-- _class: list-steps tier roman -->
<!-- _footer: "Tier · list-steps tier" -->

## Three engagement tiers.

1. Strategic
   - Quarterly executive review, dedicated success manager, and a roadmap they are shown but not promised.
2. Growth
   - Monthly check-in, shared success pool, success defined later.
3. Self-serve
   - Async docs, community support, and the hope that the docs are current.


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

## What happens in the first hour of an incident, in theory.

1. Declare and page
   - Whoever notices opens the incident channel and pages on-call. Declaring is cheap; a missed page is the line item in the post-mortem.
2. Assign a commander
   - One person owns coordination and communication. They direct the response — they do not debug it, though they will be asked why they aren't.
3. Stop the bleeding
   - Mitigate before diagnosing. Roll back, fail over, or shed load first; find the root cause once customers are safe and the board has logged off.
4. Communicate on a clock
   - A status update every 30 minutes, even when it is "still investigating." Silence is what the retrospective remembers.


---

<!-- _class: list-steps compact -->
<!-- _footer: "Composition: compact · list-steps compact" -->

## What happens in the first hour of an incident, in theory.

1. Declare and page
   - Whoever notices opens the incident channel and pages on-call. Declaring is cheap; a missed page is the line item in the post-mortem.
2. Assign a commander
   - One person owns coordination and communication. They direct the response — they do not debug it, though they will be asked why they aren't.
3. Stop the bleeding
   - Mitigate before diagnosing. Roll back, fail over, or shed load first; find the root cause once customers are safe and the board has logged off.
4. Communicate on a clock
   - A status update every 30 minutes, even when it is "still investigating." Silence is what the retrospective remembers.


---

<!-- _class: list-steps accent -->
<!-- _footer: "Composition: accent · list-steps accent" -->

## What happens in the first hour of an incident, in theory.

1. Declare and page
   - Whoever notices opens the incident channel and pages on-call. Declaring is cheap; a missed page is the line item in the post-mortem.
2. Assign a commander
   - One person owns coordination and communication. They direct the response — they do not debug it, though they will be asked why they aren't.
3. Stop the bleeding
   - Mitigate before diagnosing. Roll back, fail over, or shed load first; find the root cause once customers are safe and the board has logged off.
4. Communicate on a clock
   - A status update every 30 minutes, even when it is "still investigating." Silence is what the retrospective remembers.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · list-steps" -->

## When NOT to reach for list-steps.

- **Light labels, no body.** If each step is a single label with no description, use `timeline`. list-steps earns its chrome only when the body adds substance.
- **Parallel options.** If the rows are alternatives the audience compares, use `cards-grid` or `verdict-grid`. The numbered prefix here reads as sequence — using it for parallel items mis-cues the audience.
- **Author-typed step numbers.** Don't write `**STEP 01**` into the markdown. The badge is CSS-generated from the `ol` counter; manual numbering double-stamps and breaks on reordering.

---

<!-- _class: closing silent -->

## See also.

`Related components`

- `timeline` — shorter labels per step, horizontal axis instead of vertical cards
- `list-criteria` — gating requirements rather than a sequence of actions
- `split-steps` — phase label + heading on the left, steps on the right
- `roadmap` — phased grid across multiple workstreams
- `principles` — tenets or values rather than a procedural sequence
