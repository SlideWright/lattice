---
marp: true
theme: indaco
paginate: true
header: "Lattice · compare-prose"
---

<!-- _class: title silent -->

# compare-prose

`Comparison · Split · Structure`

Two prose options side-by-side with a labeled corner tag on each.

---

<!-- _class: compare-prose -->
<!-- _footer: "Default · compare-prose" -->

## Two options, equal weight, head-to-head.

- First option
  - Two-sentence description of the first option, including the strongest argument for it. Equal-density prose lets the audience compare line by line.
- Second option
  - Two-sentence description of the second option, including the strongest argument for it. The `chosen` or `decision` modifier marks the verdict when one has been made.


---

<!-- _class: compare-prose mirror -->
<!-- _footer: "Mirror — swap left and right · compare-prose mirror" -->

## Same comparison, columns swapped.

- First option
  - Now rendered on the right, second in the reading order. Useful when the natural argument flow wants the alternative considered before the lead.
- Second option
  - Now rendered on the left. Pair with `chosen` to mark the swapped position as the verdict.


---

<!-- _class: compare-prose chosen -->
<!-- _footer: "Chosen — second card is the winner · compare-prose chosen" -->

## The right card is the verdict.

- Build in-house
  - Full control of the schema and roadmap, but 2–3 engineer-quarters before feature parity. Maintenance burden stays internal.
- Buy + configure
  - Ships in 6 weeks, not 9 months. Engineering capacity redirects to product-layer features; exit risk is manageable via contractual data export.


---

<!-- _class: compare-prose decision -->
<!-- _footer: "Decision — left rejected, right chosen, connector labelled · compare-prose decision" -->

## Build vs buy — decided.

- Build in-house
  - Full control of the schema and roadmap, but 2–3 engineer-quarters before feature parity. Maintenance burden stays internal.
- Buy + configure
  - Ships in 6 weeks, not 9 months. Engineering capacity redirects to product-layer features; exit risk is manageable via contractual data export.


---

<!-- _class: compare-prose vertical -->
<!-- _footer: "Vertical — stack cards top-to-bottom · compare-prose vertical" -->

## Long-body options stacked for room.

- Build in-house
  - Full control over the schema and the roadmap, with 2–3 engineer-quarters before feature parity. Ongoing maintenance burden stays internal; the team owns every escalation, every migration, every breaking change. Worth it when the data model is the differentiation; expensive when it isn't.
- Buy + configure
  - Ships in 6 weeks rather than 9 months, with engineering capacity redirecting to product-layer features the customer actually pays for. Exit risk is bounded by contractual data export; switching cost is a known number rather than a moving target. The right call when the data layer is plumbing rather than differentiation.


---

<!-- _class: compare-prose dark -->
<!-- _footer: "Composition: dark · compare-prose dark" -->

## Two options, equal weight, head-to-head.

- First option
  - Two-sentence description of the first option, including the strongest argument for it. Equal-density prose lets the audience compare line by line.
- Second option
  - Two-sentence description of the second option, including the strongest argument for it. The `chosen` or `decision` modifier marks the verdict when one has been made.


---

<!-- _class: compare-prose compact -->
<!-- _footer: "Composition: compact · compare-prose compact" -->

## Two options, equal weight, head-to-head.

- First option
  - Two-sentence description of the first option, including the strongest argument for it. Equal-density prose lets the audience compare line by line.
- Second option
  - Two-sentence description of the second option, including the strongest argument for it. The `chosen` or `decision` modifier marks the verdict when one has been made.


---

<!-- _class: compare-prose accent -->
<!-- _footer: "Composition: accent · compare-prose accent" -->

## Two options, equal weight, head-to-head.

- First option
  - Two-sentence description of the first option, including the strongest argument for it. Equal-density prose lets the audience compare line by line.
- Second option
  - Two-sentence description of the second option, including the strongest argument for it. The `chosen` or `decision` modifier marks the verdict when one has been made.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · compare-prose" -->

## When NOT to reach for compare-prose.

- **Code comparison.** Use `compare-code` for two fenced blocks. compare-prose is for sentences, not snippets.
- **Three or more options.** compare-prose is strictly two. For three or more, use `cards-grid three` or `verdict-grid` with criteria badges.
- **Verbatim text differences.** When the diff lives inside the prose itself — legal language, contract clauses — use `redline` so insertions and deletions render inline.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `before-after` — two states of one system, not two alternatives
- `compare-code` — the columns are code, not prose
- `split-compare` — the verdict needs a bottom recommendation bar
- `verdict-grid` — three or more options scored against shared criteria
- `decision` — the verdict slide that lands after a comparison
