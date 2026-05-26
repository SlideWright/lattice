---
marp: true
theme: indaco
paginate: true
header: "Lattice · matrix-2x2"
---

<!-- _class: title silent -->

# matrix-2x2

`Comparison · Matrix · Structure`

Static 2×2 quadrant grid with author-placed items per cell.

---

<!-- _class: matrix-2x2 -->
<!-- _footer: "Default · matrix-2x2" -->

## Where each component substance lives.

- **Author-driven · DOM output.**
  - prose — headings + paragraphs
  - structure — nested lists
- **Author-driven · SVG output.**
  - series — tabular DSL
  - graph — external language
- **Data-driven · DOM output.**
  - (Lattice does not target this cell)
- **Data-driven · SVG output.**
  - chart-family kernels — radar, quadrant, piechart, gantt, kanban, progress, timeline-list


---

<!-- _class: matrix-2x2 dark -->
<!-- _footer: "Composition: dark · matrix-2x2 dark" -->

## Where each component substance lives.

- **Author-driven · DOM output.**
  - prose — headings + paragraphs
  - structure — nested lists
- **Author-driven · SVG output.**
  - series — tabular DSL
  - graph — external language
- **Data-driven · DOM output.**
  - (Lattice does not target this cell)
- **Data-driven · SVG output.**
  - chart-family kernels — radar, quadrant, piechart, gantt, kanban, progress, timeline-list


---

<!-- _class: matrix-2x2 compact -->
<!-- _footer: "Composition: compact · matrix-2x2 compact" -->

## Where each component substance lives.

- **Author-driven · DOM output.**
  - prose — headings + paragraphs
  - structure — nested lists
- **Author-driven · SVG output.**
  - series — tabular DSL
  - graph — external language
- **Data-driven · DOM output.**
  - (Lattice does not target this cell)
- **Data-driven · SVG output.**
  - chart-family kernels — radar, quadrant, piechart, gantt, kanban, progress, timeline-list


---

<!-- _class: matrix-2x2 accent -->
<!-- _footer: "Composition: accent · matrix-2x2 accent" -->

## Where each component substance lives.

- **Author-driven · DOM output.**
  - prose — headings + paragraphs
  - structure — nested lists
- **Author-driven · SVG output.**
  - series — tabular DSL
  - graph — external language
- **Data-driven · DOM output.**
  - (Lattice does not target this cell)
- **Data-driven · SVG output.**
  - chart-family kernels — radar, quadrant, piechart, gantt, kanban, progress, timeline-list


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · matrix-2x2" -->

## When NOT to reach for matrix-2x2.

- **Continuous-axis data.** If items have x/y coordinates rather than quadrant labels, use `quadrant`. matrix-2x2 is author-placed categorical, not plotted.
- **Empty quadrants left blank.** An empty cell still needs a label or an explicit (none) placeholder. A missing card breaks the 2×2 symmetry.
- **More than 4 items per cell.** Each quadrant holds 1–4 items. Past that the cells crowd. Promote inner items to their own slide if needed.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `quadrant` — items have continuous x/y coordinates rather than discrete quadrant labels
- `verdict-grid` — options scored across more than two dimensions
- `obligation-matrix` — many rows × many columns of state-marker cells
- `cards-grid` — the items don't divide along two axes
