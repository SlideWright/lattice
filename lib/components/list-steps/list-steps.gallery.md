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

## How to add a new component to Lattice.

1. Scaffold the folder
   - Create `lib/components/<name>/` with a manifest declaring name, function, form, substance, slots, and skeleton.
2. Author the styles
   - Scope the CSS to the section class. Use palette tokens — no hex literals in layout rules.
3. Add a transform if needed
   - Substance `structure` or `series` ships a transform module wired into all three render paths.
4. Demo and document
   - Author `<name>.example.md` and enrich the manifest with sample, whenToUse, antiPatterns, and related. The generator emits the docs and gallery sidecars.


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
   - Multi-tenant DEKs, automated rotation, and the crypto-shred runbook land in this track.
2. Compliance posture
   - Examiner pack v2 and the centralised audit log ship for the Q3 audit window.
3. Developer surface
   - Polyglot SDK parity and the new CLI flags close out the API roadmap.


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
