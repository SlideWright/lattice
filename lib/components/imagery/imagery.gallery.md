<!-- _class: title -->

# imagery

Imagery — visuals that carry their own meaning.

2 components: `featured` · `image`


---

<!-- _class: featured -->

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

<!-- _class: image -->

## Image right is the default — text leads, evidence follows.

The image fills its half-canvas slot edge-to-edge. A 1px hairline marks the join between text and image — boardroom polish, no placeholder pattern visible behind a real photo. Replace the bg image directive with your own asset.

![bg right](sample-image-landscape.svg)
