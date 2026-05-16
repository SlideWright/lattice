<!-- _class: featured -->

## Applying the criteria, here is where the evidence points.

- **Self-contained component folders.** One folder per component holding manifest, styles, transform (if needed), example, and README. Matches the pattern every mature design system uses.
- **Bundler concatenates CSS at build time.** Per-component sources combine into the shipped lattice stylesheet via the build-css tool. Committed bundle with a CI gate.
- **Manifests are the single source of truth.** Scaffolder, snippets, this gallery, and docs all read from the same JSON.
- **Tests stay scoped.** One test file per component under the components test path, runnable as a scoped npm script.
