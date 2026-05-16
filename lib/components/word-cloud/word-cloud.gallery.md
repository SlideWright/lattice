---
marp: true
theme: indaco
paginate: true
header: "Lattice · word-cloud"
---

<!-- _class: title silent -->

# word-cloud

`Evidence · Canvas · Series`

Spiral-packed word cloud — items sized by weight.

---

<!-- _class: word-cloud -->
<!-- _footer: "Default · word-cloud" -->

## What this branch named, by weight.

- component `124`
- manifest `78`
- function `64`
- form `52`
- substance `47`
- gallery `41`
- folder `36`
- variant `32`
- universal `28`
- cascade `22`
- scaffolder `18`
- bundler `14`


---

<!-- _class: cards-grid -->
<!-- _footer: "Anti-patterns · word-cloud" -->

## When NOT to reach for word-cloud.

- **Precise comparisons.** If the audience needs to know that 'manifest' is 1.6× 'function', the spiral packing actively misleads. Use `progress` or a bar chart where the eye can compare lengths directly.
- **Two or three words.** A three-word cloud is a list with extra steps. Use `stats` for a metric row or `big-number` for a single weighted headline.
- **Multi-word phrases.** Each li should be a single token. Multi-word phrases blow out the layout and crowd the spiral; if your data is phrases, normalise to keywords first or use `quote` for verbatim text.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `progress` — the weights need precise visual comparison
- `stats` — the headline metrics are independent numbers, not a corpus
- `piechart` — the items are parts of a whole, not free-form themes
- `quote` — the verbatim language matters more than the frequency
- `tldr` — the qualitative summary is prose, not a packed cloud
