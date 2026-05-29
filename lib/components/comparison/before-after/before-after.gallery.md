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

## What moving off the central vault changed.

- Before.
  - Every tokenization call round-tripped to a central vault. p99 latency 60 ms, a single regional outage took every tenant down, and key rotation meant a four-hour maintenance window.
- After.
  - Codebooks run in-process beside the service. p99 under 5 ms, an outage is scoped to one tenant, and rotation happens online with no window at all.


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

## What moving off the central vault changed.

- Before.
  - Every tokenization call round-tripped to a central vault. p99 latency 60 ms, a single regional outage took every tenant down, and key rotation meant a four-hour maintenance window.
- After.
  - Codebooks run in-process beside the service. p99 under 5 ms, an outage is scoped to one tenant, and rotation happens online with no window at all.


---

<!-- _class: before-after compact -->
<!-- _footer: "Composition: compact · before-after compact" -->

## What moving off the central vault changed.

- Before.
  - Every tokenization call round-tripped to a central vault. p99 latency 60 ms, a single regional outage took every tenant down, and key rotation meant a four-hour maintenance window.
- After.
  - Codebooks run in-process beside the service. p99 under 5 ms, an outage is scoped to one tenant, and rotation happens online with no window at all.


---

<!-- _class: before-after accent -->
<!-- _footer: "Composition: accent · before-after accent" -->

## What moving off the central vault changed.

- Before.
  - Every tokenization call round-tripped to a central vault. p99 latency 60 ms, a single regional outage took every tenant down, and key rotation meant a four-hour maintenance window.
- After.
  - Codebooks run in-process beside the service. p99 under 5 ms, an outage is scoped to one tenant, and rotation happens online with no window at all.


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
