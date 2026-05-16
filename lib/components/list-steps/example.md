<!-- _class: list-steps -->

## How to add a new component to Lattice.

1. Create the component folder with a manifest declaring name, function, form, substance, slots, and skeleton.
2. Write the styles scoped to the section class. Wrap in the components layer once the cascade migration completes.
3. Add a transform module if the substance is structure or series. Wire it into all three render paths.
4. Author example.md and README.md. Regenerate the catalog gallery from the manifests.
5. Add a unit test under the component test path. Run the full suite locally before pushing.
