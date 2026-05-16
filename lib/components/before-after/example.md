<!-- _class: before-after -->

## What the manifest refactor produced.

- **Before.** 35 layouts scattered across one 10,382-line lattice.css monolith. Per-layout rules grepped, not folder-located. No central metadata.
- **After.** 45 components self-contained at lib/components, one folder each with manifest plus styles plus example plus README. Bundler concatenates per-component CSS; loader exposes the catalog via JSON.
