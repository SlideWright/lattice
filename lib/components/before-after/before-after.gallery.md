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

## What the manifest refactor produced.

- Before.
  - 35 layouts scattered across one 10,382-line lattice.css monolith. Per-layout rules grepped, not folder-located. No central metadata.
- After.
  - 45 components self-contained at lib/components, one folder each with manifest plus styles plus example plus README. Bundler concatenates per-component CSS; loader exposes the catalog via JSON.


---

<!-- _class: before-after dark -->
<!-- _footer: "Composition: dark · before-after dark" -->

## What the manifest refactor produced.

- Before.
  - 35 layouts scattered across one 10,382-line lattice.css monolith. Per-layout rules grepped, not folder-located. No central metadata.
- After.
  - 45 components self-contained at lib/components, one folder each with manifest plus styles plus example plus README. Bundler concatenates per-component CSS; loader exposes the catalog via JSON.


---

<!-- _class: before-after compact -->
<!-- _footer: "Composition: compact · before-after compact" -->

## What the manifest refactor produced.

- Before.
  - 35 layouts scattered across one 10,382-line lattice.css monolith. Per-layout rules grepped, not folder-located. No central metadata.
- After.
  - 45 components self-contained at lib/components, one folder each with manifest plus styles plus example plus README. Bundler concatenates per-component CSS; loader exposes the catalog via JSON.


---

<!-- _class: before-after accent -->
<!-- _footer: "Composition: accent · before-after accent" -->

## What the manifest refactor produced.

- Before.
  - 35 layouts scattered across one 10,382-line lattice.css monolith. Per-layout rules grepped, not folder-located. No central metadata.
- After.
  - 45 components self-contained at lib/components, one folder each with manifest plus styles plus example plus README. Bundler concatenates per-component CSS; loader exposes the catalog via JSON.


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
