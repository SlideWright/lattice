---
marp: true
theme: indaco
paginate: true
header: "Lattice · piechart"
---

<!-- _class: title silent -->

# piechart

`Evidence · Canvas · Series`

Pie or donut chart with legend — proportional wedges.

---

<!-- _class: piechart -->
<!-- _footer: "Default · piechart" -->

`H1 2026 · 1,840 person-hours`

## Where the engineering quarter went.

Wedges drawn proportionally; legend reads in author order with raw values.

- Codebook platform `46%`
- Operations runbook `22%`
- Compliance work `18%`
- Pilot support `9%`
- Toil and on-call `5%`


---

<!-- _class: piechart donut -->
<!-- _footer: "Donut — hollow centre · piechart donut" -->

`H1 2026 · 1,840 person-hours`

## Where the engineering quarter went.

Wedges drawn proportionally; legend reads in author order with raw values.

- Codebook platform `46%`
- Operations runbook `22%`
- Compliance work `18%`
- Pilot support `9%`
- Toil and on-call `5%`


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · piechart" -->

## When NOT to reach for piechart.

- **Slices that don't sum to a whole.** A pie of unrelated metrics is meaningless — the visual implies parts of a whole. If your values are independent measures, use stats or a bar chart instead.
- **Two slices.** A two-slice pie is just a percentage with extra steps. Use big-number or split-metric — the audience can read '38% / 62%' faster than they can decode a half-and-half disc.
- **Comparing two pies.** Side-by-side pies force the audience to compare wedge angles across two figures — humans are bad at this. Use grouped bars or a slope chart to land the comparison cleanly.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `progress` — comparable parts but precise differences matter
- `stats` — the values are independent metrics, not a partition
- `big-number` — the headline is one slice, not the breakdown
- `kpi` — the slices need status framing and targets
