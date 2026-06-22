---
size: 4K
theme: indaco
paginate: true
header: "Lattice · Auto-split"
footer: "Auto-split — the Fit Ladder's split move"
autosplit: on
---

<!-- _class: title -->

# Auto-split

`Fit Ladder · the split move`

When a slide holds more than it can show, it becomes several — automatically, at export.

---

<!-- _class: content -->

## The problem auto-split solves

- Every layout declares how many items it holds comfortably — its **capacity**
- Past that budget the slide **overflows**: the title clips off the top, the last items off the bottom
- Below the readable type floor the engine has nothing smaller to reach for
- The honest fix is **more slides, not smaller type** — readability is the floor, never the variable

---

<!-- _class: content -->

## How it works

- At export, a slide past its `capacity.hard` is **divided into several** that each fit
- The **heading repeats** on every part; ordered lists **renumber** across the break
- **Nothing is lost** — every item survives, in order
- **Read-across** content (table columns, code) is **never split** — it escalates to a sibling layout instead
- Opt in per deck with `autosplit: on` in the front-matter

---

<!-- _class: checklist -->

## Launch readiness — fourteen checks

- [x] Signal intake wired
- [x] Scoring model calibrated
- [x] Decision log live
- [x] Calibration loop running
- [x] Weekly review scheduled
- [x] Quarterly audit booked
- [x] Stakeholder map signed off
- [ ] Risk register populated
- [ ] Budget tracker reconciled
- [ ] Hiring plan approved
- [ ] Roadmap published
- [ ] Retrospective template ready
- [ ] Metrics review automated
- [ ] Customer interviews booked

---

<!-- _class: content -->

## What you just saw

- The fourteen-item checklist exceeded the layout's comfortable budget
- Rather than clip, it split into **two clean slides** — the heading carried onto both
- The author wrote one slide; the export produced the right number
- No deck without `autosplit: on` is affected — existing decks render unchanged

---

<!-- _class: closing -->

# More slides, never smaller type

`Readability is the floor`
