<!-- _class: featured -->

## Applying the criteria, here is where the evidence points.

- **Self-contained component folders.** One `lib/components/<name>/` per component, holding manifest + styles + transform + example + README. Matches the pattern every mature design system uses.
- **Bundler concatenates CSS at build time.** Per-component sources combine into `lattice.css` via `tools/build-css.js`; committed bundle, CI gate.
- **Manifests are the single source of truth.** Scaffolder, snippets, this gallery, and docs all read from the same JSON.
- **Tests stay scoped.** `test/unit/components/<name>.test.js` per component, runnable as `npm run test:layouts`.
