<!-- _class: list-steps -->

## How to add a new component to Lattice.

1. Create `lib/components/<name>/` with `manifest.json` (name, function, form, substance, slots, skeleton).
2. Write `styles.css` scoped to `section.<name>`. Wrap in `@layer components` once the layer migration completes.
3. Add `transform.js` if the substance is structure or series. Wire into all three render paths.
4. Author `example.md` and `README.md`. Run `npm run gallery:components` to refresh the catalog deck.
5. Add a unit test under `test/unit/components/<name>.test.js`. Run the full suite locally before pushing.
