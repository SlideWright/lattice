---
marp: true
theme: indaco
paginate: true
header: "SVG-native pie legend"
---

<!-- _class: title silent -->

# The pie, its key, and its divider — one SVG.

`Spike · piechart · 2026-06-13`

The diagram, the gradient spine, and the legend now share a single viewBox,
so the whole chart scales as one proportional unit.

---

<!-- _class: piechart -->
<!-- _footer: "Default — disc · spine · key, one unit" -->

`H1 2026 · 1,840 person-hours`

## Where the planning quarter actually went.

The key scales with the diagram; the spine floats in a comfortable gap.

- Deck production `46%`
- Meetings about meetings `22%`
- Realigning on priorities `18%`
- Stakeholder management `9%`
- Actually deciding `5%`

---

<!-- _class: piechart donut -->
<!-- _footer: "Donut — same unit, hollow centre" -->

`H1 2026 · 1,840 person-hours`

## The engineering quarter, as a donut.

Wedges, spine and key are all emitted in viewBox units.

- Signal Intake build `46%`
- Scoring policy work `22%`
- Decision Log integration `18%`
- Explaining the framework `9%`
- Toil and on-call `5%`

---

<!-- _class: piechart -->
<!-- _footer: "Long tail — the key fit-scales so every row fits" -->

`FY2026 · the long tail`

## Eleven slices still fit — the legend scales itself down.

No clipping: the font shrinks just enough to seat every keyed row.

- Signal Intake engineering `28%`
- Scoring policy work `16%`
- Decision Log integration `13%`
- Per-team calibration `11%`
- Explaining the framework to stakeholders `9%`
- Pilot and team support `7%`
- Documentation and gallery `5%`
- Adoption dashboard `4%`
- Auditor export `3%`
- Incident response `2%`
- Miscellaneous toil `2%`

---

<!-- _class: piechart cover -->
<!-- _footer: "Cover — the whole unit scales up, key included" -->

`H1 2026 · 1,840 person-hours`

## Where the planning quarter actually went.

Cover just works — the key scales up with the diagram, no special-casing.

- Deck production `46%`
- Meetings about meetings `22%`
- Realigning on priorities `18%`
- Stakeholder management `9%`
- Actually deciding `5%`

---

<!-- _class: piechart dark -->
<!-- _footer: "Dark — every colour is a palette token" -->

`H1 2026 · dark canvas`

## Spine, swatches, labels — all token-driven.

Every colour flips with the canvas; nothing is a baked literal.

- Signal Intake build `46%`
- Scoring policy work `22%`
- Decision Log integration `18%`
- Explaining the framework `9%`
- Toil and on-call `5%`

---

<!-- _class: title silent -->

# One viewBox, and it travels.

`piechart · SVG-native legend`

Proportional at any size, self-contained for export, and still
palette-blind and sketch-aware — the foundation the other keyed charts
graduate onto next.
