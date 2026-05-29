---
marp: true
theme: indaco
paginate: true
header: "Lattice · checklist"
---

<!-- _class: title silent -->

# checklist

`Inventory · Stack · Structure`

Items with state markers — done, partial, todo.

---

<!-- _class: checklist -->
<!-- _footer: "Default · checklist" -->

## Go-live readiness for the codebook rollout.

- [x] Load test passed at 3× projected peak throughput
- [x] Key-rotation runbook signed off by security
- [x] Tenant migration rehearsed end to end in staging
- [-] Examiner audit pack drafted, pending compliance review
- [-] On-call rotation staffed, one gap in the EU window
- [ ] Customer comms scheduled with named owners
- [ ] Rollback plan rehearsed against production data


---

<!-- _class: checklist dark -->
<!-- _footer: "Composition: dark · checklist dark" -->

## Go-live readiness for the codebook rollout.

- [x] Load test passed at 3× projected peak throughput
- [x] Key-rotation runbook signed off by security
- [x] Tenant migration rehearsed end to end in staging
- [-] Examiner audit pack drafted, pending compliance review
- [-] On-call rotation staffed, one gap in the EU window
- [ ] Customer comms scheduled with named owners
- [ ] Rollback plan rehearsed against production data


---

<!-- _class: checklist compact -->
<!-- _footer: "Composition: compact · checklist compact" -->

## Go-live readiness for the codebook rollout.

- [x] Load test passed at 3× projected peak throughput
- [x] Key-rotation runbook signed off by security
- [x] Tenant migration rehearsed end to end in staging
- [-] Examiner audit pack drafted, pending compliance review
- [-] On-call rotation staffed, one gap in the EU window
- [ ] Customer comms scheduled with named owners
- [ ] Rollback plan rehearsed against production data


---

<!-- _class: checklist accent -->
<!-- _footer: "Composition: accent · checklist accent" -->

## Go-live readiness for the codebook rollout.

- [x] Load test passed at 3× projected peak throughput
- [x] Key-rotation runbook signed off by security
- [x] Tenant migration rehearsed end to end in staging
- [-] Examiner audit pack drafted, pending compliance review
- [-] On-call rotation staffed, one gap in the EU window
- [ ] Customer comms scheduled with named owners
- [ ] Rollback plan rehearsed against production data


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · checklist" -->

## When NOT to reach for checklist.

- **All-done lists.** If every item is `[x]` the state markers are decoration. Use `list` or `tldr` for celebratory recaps; checklist earns its weight when the mix matters.
- **Long per-item prose.** Each item is one short line. If a row needs a sentence of explanation, the right home is cards-stack or list-tabular.
- **Custom state markers.** Only `[x]`, `[-]`, and `[ ]` map to the glyph palette. Authoring `[?]` or `[!]` renders as literal text and breaks the visual contract.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `list` — items have no state — just bullets
- `tldr` — summary lines without per-item completion tracking
- `list-tabular` — rows need a label-plus-description structure, not state
- `cards-stack` — each item needs two sentences of body
