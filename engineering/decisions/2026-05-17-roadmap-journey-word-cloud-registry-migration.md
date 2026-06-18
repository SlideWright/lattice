---
status: shipped
summary: Phase 1 migration of roadmap, journey, and word-cloud into the shared transformer registry, bringing the dispatch to five
---

# roadmap / journey / word-cloud migrations to the shared transformer registry — phase 1

Date: 2026-05-17
Branch: `claude/shared-transformer-library-Qv38u`

## What changed

Three more transformers joined `lib/transformers/` following the same
pattern as chart-family phase 1 (HTML + per-section, runtime DOM walk
deferred). After this commit the registry dispatches **five**
transformers in order: `chart-family`, `split-panels`, `roadmap`,
`journey`, `word-cloud`.

Concretely:

- New `lib/transformers/roadmap.js`, `journey.js`, `word-cloud.js` —
  each ~30 lines, all wrap their existing `lib/components/<n>/<n>.transform.js`
  engine module. None of them mutate `cls`, so `applyToSection`
  returns `{ html, cls }` with `cls` unchanged.
- `lib/transformers/registry.js` — `TRANSFORMERS` list extended to the
  five-transformer chain in the same order `marp.config.js` used
  historically (cross-renderer parity is easier to reason about when
  the dispatch order matches).
- `marp.config.js` — the render hook's per-transformer calls collapse:
  ```js
  result.html = applyTransformerRegistryToHtml(result.html);
  result.html = applyDeckLogoToHtml(result.html, markdown);
  ```
  Three direct imports dropped. deck-logo stays separate because it
  operates on the rendered shell (front-matter-driven `<img>`
  injection across selected sections), not on per-section content;
  the shape doesn't fit the registry's per-section primitive.
- `lattice-emulator.js` — the three inline `if (cls.includes(X)) html
  = transformXSection(html, cls);` blocks are gone; the existing
  `registry.applyAllToSection(html, classAttr)` call handles them.
  Three direct imports dropped.
- Runtime bundle rebuilt (~939 KB; up from ~805 KB because the
  registry now pulls in three more engine modules transitively;
  tree-shaking limited by CJS as previously documented).

## Output verification

`examples/gallery.md` sidecar HTML is **byte-identical** before/after
(0-line diff against the post-token-fix baseline). All three affected
per-component galleries (`roadmap`, `journey`, `word-cloud`) rebuilt
through the registry path without visual regression.

Unit-suite: 483/483 pass. Bundle freshness check green.

## Line-count delta

`lattice-emulator.js` and `marp.config.js` together drop ~30 lines (six
import + call sites collapse into the existing registry call). The
new adapter modules add ~100 lines total. Net structural win is the
single dispatch chain rather than five hand-wired call sites.

## What's NOT in this PR

- **Runtime DOM walks.** Each of `chart-family`, `roadmap`, `journey`,
  `word-cloud` still has its own hand-edited DOM-walk block in
  `src/runtime/index.js`. Each one is the same `applyToDom`-deferred
  pattern from chart-family phase 1.
- **Deck-logo migration.** Different shape (shell-level, not
  per-section). Could fit the registry with a separate
  `applyToShell(html, markdown)` hook, but not in this PR.

## Where we are now in the original mission

| transformer  | HTML | per-section | DOM (runtime bundle) |
|--------------|------|-------------|----------------------|
| split-panels | ✓    | ✓           | ✓ (canonical in registry, plus +split-list fix) |
| chart-family | ✓    | ✓           | — runtime has inline mirror              |
| roadmap      | ✓    | ✓           | — runtime has inline mirror              |
| journey      | ✓    | ✓           | — runtime has inline mirror              |
| word-cloud   | ✓    | ✓           | — runtime has inline mirror              |
| deck-logo    | (specialized; lives outside the per-section pattern)              |

The big remaining piece is the DOM-side migration. The runtime's inline
mirrors are ~600 lines for chart-family, ~120 for roadmap, ~250 for
journey, ~280 for word-cloud — ~1,250 total. Each follows the
split-panels phase-2 recipe: lift into `applyToDom(root)`, parameterise
on the document handle, call from `runAllContentTransforms` via
`registry.applyAllToDom(document)`. chart-family additionally has the
~1000-line runtime-local radar/quadrant kernel deduplication to do
(route through `lib/components/{radar,quadrant}/*.transform.js`).
