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

- component `5`
- manifest `4`
- function `4`
- form `3`
- substance `3`
- gallery `2`
- variant `2`
- universal `1`
- cascade `1`


---

<!-- _class: word-cloud constellation -->
<!-- _footer: "Constellation — airy, two-tone · word-cloud constellation" -->

## What this branch named, by weight.

- component `5`
- manifest `4`
- function `3`
- form `3`
- substance `2`
- gallery `1`


---

<!-- _class: word-cloud dense -->
<!-- _footer: "Dense — tight pack · word-cloud dense" -->

## Every term this branch touched.

- component `5`
- manifest `5`
- function `4`
- form `4`
- substance `4`
- gallery `3`
- folder `3`
- variant `3`
- universal `2`
- cascade `2`
- scaffolder `2`
- bundler `1`
- transform `1`
- selector `1`
- palette `1`


---

<!-- _class: word-cloud spectrum -->
<!-- _footer: "Spectrum — heat ramp · word-cloud spectrum" -->

## What this branch named, by weight.

- component `5`
- manifest `4`
- function `4`
- form `3`
- substance `3`
- gallery `2`
- variant `2`
- universal `1`


---

<!-- _class: word-cloud focal -->
<!-- _footer: "Focal — one dominant term · word-cloud focal" -->

## The one word that defined the branch.

- variants `5`
- gallery `2`
- manifest `2`
- docs `1`
- declared `1`


---

<!-- _class: word-cloud dark -->
<!-- _footer: "Composition: dark · word-cloud dark" -->

## What this branch named, by weight.

- component `5`
- manifest `4`
- function `4`
- form `3`
- substance `3`
- gallery `2`
- variant `2`
- universal `1`
- cascade `1`


---

<!-- _class: word-cloud compact -->
<!-- _footer: "Composition: compact · word-cloud compact" -->

## What this branch named, by weight.

- component `5`
- manifest `4`
- function `4`
- form `3`
- substance `3`
- gallery `2`
- variant `2`
- universal `1`
- cascade `1`


---

<!-- _class: word-cloud accent -->
<!-- _footer: "Composition: accent · word-cloud accent" -->

## What this branch named, by weight.

- component `5`
- manifest `4`
- function `4`
- form `3`
- substance `3`
- gallery `2`
- variant `2`
- universal `1`
- cascade `1`


---

<!-- _class: list -->
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
