---
marp: true
theme: indaco
paginate: true
header: "Lattice · q-and-a"
---

<!-- _class: title silent -->

# q-and-a

`Inventory · Stack · Structure`

Anticipated questions paired with prepared answers — the end-of-pitch 'what we expect to be asked' slide.

---

<!-- _class: q-and-a -->
<!-- _footer: "Default · q-and-a" -->

## What the board will press on.

- Why not extend the current vendor one more year?
  - The renewal lands in Q3 and locks us in through 2028. Switching now costs a single quarter of migration; switching after renewal costs three.
- What happens to the team mid-migration?
  - No headcount change. The same four engineers run both stacks through the eight-week overlap, then the legacy stack is decommissioned.
- How confident are we in the savings?
  - The $1.2M is contracted, not projected — the signed rate differential, before any usage growth.


---

<!-- _class: q-and-a solo -->
<!-- _footer: "Solo — one question, one answer · q-and-a solo" -->

## The one question we know is coming.

- If the pilot fails, what have we actually lost?
  - One quarter and $180K, fully recoverable. The contract caps exposure at the pilot scope, with no auto-renewal and a thirty-day exit. The downside is bounded; the upside is the whole thesis.


---

<!-- _class: q-and-a compact -->
<!-- _footer: "Stress test · q-and-a" -->

`Anticipated questions`

## Five we expect, numbered and tightened.

1. Why now rather than next fiscal year?
   1. The incentive credits expire in December; waiting forfeits $400K.
2. What is the rollback plan?
   1. A one-command revert to the pinned release, rehearsed weekly in staging.
3. Who signs off on go-live?
   1. The change-advisory board, the Thursday before each wave.
4. How does this affect the SLA?
   1. The 99.9% target holds — the migration runs behind a feature flag.
5. What if adoption stalls?
   1. Usage is opt-in for thirty days with a fallback, so a stall costs time, not money.


---

<!-- _class: q-and-a dark -->
<!-- _footer: "Composition: dark · q-and-a dark" -->

## What the board will press on.

- Why not extend the current vendor one more year?
  - The renewal lands in Q3 and locks us in through 2028. Switching now costs a single quarter of migration; switching after renewal costs three.
- What happens to the team mid-migration?
  - No headcount change. The same four engineers run both stacks through the eight-week overlap, then the legacy stack is decommissioned.
- How confident are we in the savings?
  - The $1.2M is contracted, not projected — the signed rate differential, before any usage growth.


---

<!-- _class: q-and-a compact -->
<!-- _footer: "Composition: compact · q-and-a compact" -->

## What the board will press on.

- Why not extend the current vendor one more year?
  - The renewal lands in Q3 and locks us in through 2028. Switching now costs a single quarter of migration; switching after renewal costs three.
- What happens to the team mid-migration?
  - No headcount change. The same four engineers run both stacks through the eight-week overlap, then the legacy stack is decommissioned.
- How confident are we in the savings?
  - The $1.2M is contracted, not projected — the signed rate differential, before any usage growth.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · q-and-a" -->

## When NOT to reach for q-and-a.

- **A flat FAQ of one-liners.** Six or more terse question/answer pairs you flip back to as a reference belong in `faq` or `glossary`, which are built to stack many short look-ups. q-and-a is for a few defended answers, not a help page.
- **Rhetorical questions with no answer.** Every question needs a nested answer that genuinely closes it. A bare question used as a section header or a hook is a `divider` or a `statement`, not a Q&A pair.
- **Evaluation criteria in disguise.** If the top-level item is a requirement you are scoring against (with a rationale below), that is `list-criteria`, not a question you expect to be asked. q-and-a defends; list-criteria evaluates.

---

<!-- _class: closing silent -->

## See also.

`Related components`

- `faq` — many terse reference questions to flip back to, not a few weighty defenses
- `glossary` — term/definition reference pairs rather than question/answer pairs
- `list-criteria` — numbered criteria with rationale — evaluation, not anticipated objections
- `cards-stack` — parallel co-equal cards with no question/answer role split
- `decision` — a single verdict to state rather than a set of questions to defend
