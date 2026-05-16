---
marp: true
theme: indaco
paginate: true
header: "Lattice · radar"
---

<!-- _class: title silent -->

# radar

`Evidence · Scatter · Series`

Native radar / spider chart — items rated across multiple axes.

---

<!-- _class: radar -->
<!-- _footer: "Default · radar" -->

`Scale · 0–10`

## How we stack up across the buying criteria.

- Lattice
  - Performance `9`
  - Pricing `7`
  - Support `8`
  - Ecosystem `6`
  - Security `9`
- Rival North
  - Performance `7`
  - Pricing `8`
  - Support `6`
  - Ecosystem `9`
  - Security `7`
- Rival West
  - Performance `6`
  - Pricing `9`
  - Support `7`
  - Ecosystem `8`
  - Security `8`


---

<!-- _class: cards-grid -->
<!-- _footer: "Anti-patterns · radar" -->

## When NOT to reach for radar.

- **More than four series.** Five overlapping polygons become a tangle of edges. Trim to the two or three options the audience is actually choosing between; the rest belong in an appendix table.
- **Three or fewer axes.** Three axes makes a triangle — barely a shape. Below four criteria, the spider collapses and the slide should be a `cards-grid` or `verdict-grid` instead.
- **Mixed scales across axes.** If one axis is 0–10 and another is 0–10,000, the larger axis dominates the polygon and the comparison is misleading. Normalise everything to a shared scale first.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `quadrant` — two axes are enough — the other six dimensions drop out
- `verdict-grid` — the criteria are categorical (pass/fail), not graded
- `kpi` — the comparison is one option's metrics, not multi-option
- `compare-table` — a precise tabular comparison reads better than a shape
- `piechart` — the question is part-to-whole, not multi-criterion
