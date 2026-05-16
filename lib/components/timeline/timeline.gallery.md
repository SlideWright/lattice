---
marp: true
theme: indaco
paginate: true
header: "Lattice · timeline"
---

<!-- _class: title silent -->

# timeline

`Progression · Timeline · Structure`

Horizontal ordered steps along a single axis, each a labeled dot.

---

<!-- _class: timeline -->
<!-- _footer: "Default · timeline" -->

## How a deck moves from draft to share.

1. **Draft**
   - *Author writes markdown with the appropriate `_class` directives.*
2. **Build**
   - *`npm run build:<deck>` renders HTML then PDF via Puppeteer.*
3. **Review**
   - *Reviewer opens the raw PDF link; the per-feature deck shows the change in context.*
4. **Ship**
   - *Merge the PR; CI rebuilds against main and refreshes the gallery.*


---

<!-- _class: cards-grid -->
<!-- _footer: "Anti-patterns · timeline" -->

## When NOT to reach for timeline.

- **Long body per step.** If each stage needs a paragraph, lift to `list-steps` where the cards have body room. Prose crammed into a timeline label crowds the axis.
- **Parallel options, not sequence.** If the items are alternatives rather than ordered stages, use `cards-grid`. The horizontal axis here reads as time.
- **Past six stages.** More than six dots compresses the axis and the labels collide. Split into two slides or roll up adjacent stages.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `list-steps` — each step needs body-paragraph room, not just a label
- `split-steps` — a phase anchor + heading reads on the left, steps on the right
- `journey` — each step carries actors and mood, not just a label
- `gantt` — tasks have duration and overlap across multiple workstreams
- `roadmap` — phased grid across multiple workstreams rather than a single axis
