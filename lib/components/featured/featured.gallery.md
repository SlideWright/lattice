---
marp: true
theme: indaco
paginate: true
header: "Lattice · featured"
---

<!-- _class: title silent -->

# featured

`Imagery · Panel · Mixed`

Featured card + sub-grid — one prominent item with supporting cards.

---

<!-- _class: featured -->
<!-- _footer: "Default · featured" -->

## Applying the criteria, here is where the evidence points.

- Self-contained component folders.
  - One folder per component holding manifest, styles, transform (if needed), example, and README. Matches the pattern every mature design system uses, and lets the scaffolder, bundler, and docs generator read a single source of truth.
- Bundler concatenates CSS at build time.
  - Per-component sources combine into the shipped lattice stylesheet via the build-css tool. Committed bundle with a CI gate.
- Manifests are the single source of truth.
  - Scaffolder, snippets, this gallery, and docs all read from the same JSON.
- Tests stay scoped.
  - One test file per component under the components test path, runnable as a scoped npm script.


---

<!-- _class: featured mirror -->
<!-- _footer: "Mirror — featured on the right · featured mirror" -->

## After the audit, the recommendation lands on the right.

- Self-contained component folders.
  - One folder per component holding manifest, styles, transform (if needed), example, and README. Matches the pattern every mature design system uses, and lets the scaffolder, bundler, and docs generator read a single source of truth.
- Bundler concatenates CSS at build time.
  - Per-component sources combine into the shipped lattice stylesheet via the build-css tool.
- Manifests are the single source of truth.
  - Scaffolder, snippets, this gallery, and docs all read from the same JSON.
- Tests stay scoped.
  - One test file per component under the components test path.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · featured" -->

## When NOT to reach for featured.

- **Equal-weight options.** If all four items deserve the same weight, use `cards-grid`. featured demands a winner; without one the layout overstates the lead and the audience feels manipulated.
- **Hero card with one-line body.** A one-sentence featured card defeats the asymmetry — the sub-grid bullets out-mass it. Either give the hero the paragraph it needs or move to `cards-grid` where every card holds equal weight.
- **Sub-grid that argues against the hero.** If the supporting cards undermine the recommendation, the slide is a debate, not a verdict. Use `verdict-grid` for criteria-based scoring or `cards-side` for explicit two-option comparison.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `cards-grid` — all options carry equal weight; no winner declared
- `verdict-grid` — options scored against shared criteria, not picked
- `cards-side` — two options side by side, no hierarchy between them
- `decision` — the recommendation needs an explicit pro/con frame
- `split-brief` — the recommendation is a thesis sentence + supporting findings
