---
marp: true
theme: indaco
paginate: true
header: "Lattice · before-after"
---

<!-- _class: title silent -->

# before-after

`Comparison · Split · Structure`

Explicit state-change comparison — what was, what is.

---

<!-- _class: before-after -->
<!-- _footer: "Default · before-after" -->

## What writing decisions down actually changed.

- Before.
  - Decisions lived in the room they were made in. Six months on, nobody could say why we killed the project — only that someone senior had felt strongly. Every quarter relitigated the same three debates from memory.
- After.
  - Every decision is logged with its signals, its options, and the bet it made. We still relitigate, but now there is a record showing we already decided this in March. We ignore it, but faster.


---

<!-- _class: before-after banner-tag -->
<!-- _footer: "Banner tag — slot label as full-width header strip · before-after banner-tag" -->

## Three reasons we are building.

- BUILD
  - The platform is the product. Owning it owns the roadmap.
- WHY NOT BUY
  - No vendor matches our compliance posture without surrender of control.
- WHY NOT DELAY
  - Cost of waiting compounds: each quarter spent on workarounds is one fewer quarter on the platform.


---

<!-- _class: before-after dark -->
<!-- _footer: "Composition: dark · before-after dark" -->

## What writing decisions down actually changed.

- Before.
  - Decisions lived in the room they were made in. Six months on, nobody could say why we killed the project — only that someone senior had felt strongly. Every quarter relitigated the same three debates from memory.
- After.
  - Every decision is logged with its signals, its options, and the bet it made. We still relitigate, but now there is a record showing we already decided this in March. We ignore it, but faster.


---

<!-- _class: before-after compact -->
<!-- _footer: "Composition: compact · before-after compact" -->

## What writing decisions down actually changed.

- Before.
  - Decisions lived in the room they were made in. Six months on, nobody could say why we killed the project — only that someone senior had felt strongly. Every quarter relitigated the same three debates from memory.
- After.
  - Every decision is logged with its signals, its options, and the bet it made. We still relitigate, but now there is a record showing we already decided this in March. We ignore it, but faster.


---

<!-- _class: before-after accent -->
<!-- _footer: "Composition: accent · before-after accent" -->

## What writing decisions down actually changed.

- Before.
  - Decisions lived in the room they were made in. Six months on, nobody could say why we killed the project — only that someone senior had felt strongly. Every quarter relitigated the same three debates from memory.
- After.
  - Every decision is logged with its signals, its options, and the bet it made. We still relitigate, but now there is a record showing we already decided this in March. We ignore it, but faster.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · before-after" -->

## When NOT to reach for before-after.

- **Two competing options.** Use `compare-prose` or `split-compare` when both sides are alternatives under consideration. before-after is for a change that already happened.
- **More than two states.** If there is a middle state or a sequence of changes, use `list-steps` to show the progression. before-after is binary by construction.
- **Editorial labels on the cards.** The card label is always Before or After. Renaming them to Old way / New way defeats the universal grammar and breaks reader expectations.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `compare-prose` — two alternatives being weighed, not a transformation
- `split-compare` — binary decision with a verdict bar
- `redline` — the change is in verbatim text, not structural state
- `list-steps` — the change has more than two phases
