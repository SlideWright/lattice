# Component reorganization and modular CSS — refactor plan

Date: 2026-05-18
Branch: `claude/organize-components-AmQcL`

## Background

`lib/components/` currently holds 58 components in a flat tree. Every
manifest tags itself with the four design-system axes (function, form,
substance, finish) but the filesystem expresses none of them. New
contributors face "where does X go?" with no answer except scrolling
the directory.

Two related decisions came out of the discussion that motivates this
refactor:

1. **Group components on disk by their design-system bucket.** Seven
   audience-function families (anchor, statement, inventory,
   comparison, progression, evidence, imagery) — plus two
   substance-defined exceptions for the components whose maintenance
   lives or dies together (chart, diagram). Nine buckets total.
2. **Adopt modular CSS principles.** Component-specific universal-
   variant rules move out of the shared `_universal.css` /
   `_semi-universal.css` files and into each component's own
   `<name>.styles.css`. Generic universals that apply to every section
   stay shared. No DRY-ing across components until a pattern proves
   itself in three or more places.

Both changes are scoped to the engine and authoring tools. Author-
visible surface (the `<!-- _class: name -->` invocation, the gallery
decks, the deck output) does not change.

## The bucket assignment

Nine buckets. Seven by function (matches `manifest.function`); two by
substance (chart = `series`, diagram = `graph`).

| Bucket | Count | Components |
|---|---|---|
| anchor | 4 | closing, divider, subtopic, title |
| statement | 6 | big-number, content, quote, split-brief, split-list, split-statement |
| inventory | 13 | actors, agenda, cards-grid, cards-side, cards-stack, cards-wide, checklist, glossary, list, list-tabular, principles, statute-stack, tldr |
| comparison | 10 | before-after, compare-code, compare-prose, compare-table, decision, matrix-2x2, obligation-matrix, redline, split-compare, verdict-grid |
| progression | 8 | authority-chain, journey, list-criteria, list-steps, regulatory-update, roadmap, split-steps, timeline |
| evidence | 6 | citation-card, code, kpi, math, split-metric, stats |
| imagery | 2 | featured, image |
| **chart** | 8 | gantt, kanban, piechart, progress, quadrant, radar, timeline-list, word-cloud |
| **diagram** | 1 | diagram |

Total: 58. `manifest.function` is unchanged for all components. A new
`manifest.bucket` field records disk location. For 49 components,
`bucket === function`; for the nine bolded above, the manifest declares
the substance-flavored bucket explicitly.

This divergence is deliberate. The audience-function taxonomy in
design-system.md §3 is preserved — `radar` is still Evidence for
authors choosing components. The maintenance reality is that the eight
series-substance components share a chart kernel and palette injection
pipeline; colocating them on disk supports the engine maintainer
without disturbing the author's mental model.

## Principles being locked in

| Principle | Concrete meaning |
|---|---|
| One axis on disk, documented exceptions | Disk groups by `bucket`; the chart/diagram exceptions are named in design-system.md §9 |
| Manifest is single source of truth | `manifest.function` = audience intent; `manifest.bucket` = disk location |
| Self-contained component CSS | Rules that *shape* a component live in `<name>.styles.css` — including its `.dark`, `.compact`, `.accent` blocks. Rules that *define* shared primitives (tokens, fonts, resets) stay shared |
| Rule of three | No extracting shared patterns until they appear in 3+ components |
| `@layer` enforces cascade | `base, root, scaffold, components, semi-universal, universal, diagram-overrides` — source order within a layer doesn't matter |
| Pixel-diff gates every phase | `tools/pixel-check.js` against a Phase 0 baseline; zero unexplained drift |

## Phases

### Phase 0 — Baseline snapshot

Capture pixel-perfect rasterizations of every existing PDF so
subsequent phases can diff against them.

- `npm run build:gallery && npm run build:examples`
- `pdftoppm` to PNG at fixed DPI; store under `.scratch/baseline/`
- `git tag refactor-baseline-2026-05-18` for rollback reference

No code changes; no commits.

### Phase 1 — Add `bucket` field to manifests

Pure metadata. No moves, no rebuilds. Sets up Phase 3.

- Extend `lib/components/manifest.schema.json`: `bucket` enum with 9
  values.
- `lib/components/index.js` — `validate()` checks the field; default
  `bucket = function` when absent.
- 9 explicit `"bucket"` entries on the chart/diagram manifests; rest
  rely on default.
- Add `groupByBucket()` alongside `groupByFunction()`.
- Tests: `test/unit/components/loader.test.js` assertions for the new
  field and defaulting behavior.

Single commit. No PDFs rebuilt.

### Phase 2 — Multi-theme component galleries

Every component gets a dark sibling to its existing gallery PDF.

- `tools/build-component-galleries.js` gains `--theme={light,dark}`.
  Dark mode adds `dark` to every slide's class via a Marp directive.
- 58 renames: `<name>.gallery.pdf` → `<name>.gallery.light.pdf`.
- 58 new files: `<name>.gallery.dark.pdf`.
- `test/integration/components/component-galleries.test.js` — two
  assertions per component (light and dark page counts).
- `lefthook.yml` — "stale PDF" check covers both files.
- CLAUDE.md — per-component gallery wording updated.

**Clobbering risk:** Low. Dark mode is exercised in baseline decks
today. Per-component dark rendering may surface visual bugs in
components that have never been rendered dark; these become a "dark-
mode polish" follow-up rather than Phase 2 blockers.

**Pixel-diff:** Light PDFs must match Phase 0 baseline exactly. Dark
PDFs are new baselines.

### Phase 3 — Disk reorganization

58 folder moves keyed by `manifest.bucket`. Nine commits, one per
bucket, each with a green pixel-diff before the next.

| Step | Files | Count |
|---|---|---|
| Folder moves | `lib/components/<name>/` → `lib/components/<bucket>/<name>/` | 58 `git mv` |
| Manifest `$schema` | `"../manifest.schema.json"` → `"../../manifest.schema.json"` | 58 edits |
| Emulator requires | hardcoded transform paths | 5 in `lattice-emulator.js` (radar, quadrant, roadmap, journey, word-cloud) |
| Adapter requires | kernel paths | 3 in `lib/transformers/{roadmap,journey,word-cloud}.js` |
| CSS bundler glob | `lib/components/*/styles.css` → `lib/components/*/*/styles.css` | 1 in `tools/build-css.js` |
| Affected-tests regex | path pattern | 1 in `tools/affected-tests.js` |
| Tests | `loadAll()` already recursive | 0 |
| Lefthook | `startsWith('lib/components/')` still matches | 0 |

**Clobbering risk: medium.** Two concrete watchpoints:

1. **CSS concat order changes.** Today `lib/components/*/styles.css`
   bundles flat alphabetical. After the move, `lib/components/*/*/`
   bundles two-level alphabetical: `anchor/closing`, `anchor/divider`,
   …, `chart/gantt`, …. `@layer components` makes this safe in
   principle, but design-system.md §13 lists specificity-bump hacks in
   `citation-card`, `redline`, `regulatory-update`, `split-*` that
   depend on source order. **See Phase 3.5.**
2. **Git history.** `git mv` preserves blame, but cross-file history
   can degrade. Per-bucket commits (9 commits) bound the noise.

**Pixel-diff:** Every PDF must match Phase 0 baseline byte-for-byte
(pixel-for-pixel for Mermaid). Any drift is a real bug.

### Phase 3.5 — `@layer` activation and hack retirement

The §13 follow-up that has been deferred. The disk reorganization
exposes the source-order dependency; this phase retires the
dependency.

- Activate `@layer` in all per-component CSS files (today some are
  in the layer, some aren't — full inventory needed).
- Retire the duplicate-class specificity bumps in `citation-card`,
  `redline`, `regulatory-update`, and the `split-*` files. The
  `!important` audit that §13 lists as a blocker happens here.
- Update design-system.md §13: move this item from "Deferred" to
  "Shipped".

**Pixel-diff:** Every PDF must match Phase 0 baseline exactly.

### Phase 4 — Modular CSS migration

The highest-risk phase. Component-specific universal-variant rules
move from `_universal.css` and `_semi-universal.css` into each
component's `<name>.styles.css`. Generic universals stay shared.

| Step | What |
|---|---|
| Audit | Categorize each rule in `_universal.css` / `_semi-universal.css`: (a) applies to all sections — stays shared; (b) targets a specific component — moves |
| Migrate | Each moved rule lands in `lib/components/<bucket>/<name>/<name>.styles.css` inside `@layer universal { section.<name>.<variant> { … } }` |
| Bundler | `tools/build-css.js` — component files now contribute to both `@layer components` and `@layer universal` |
| Keep shared | `section.dark { --bg: … }` token-level rules stay in `_universal.css` (token cascade is inherently shared) |
| Cleanup | Each migrated rule is removed from the shared file in the same commit as it moves |
| Document | design-system.md §10 — the modular principle and the rule of three |

**Clobbering risks — explicit:**

1. **Cascade interaction within `@layer universal`.** Today one source
   contributes; after, 58 sources do. Within a layer, source order
   matters when specificity ties. **Mitigation:** every component's
   universal block targets its own selector (`section.<name>.<variant>`)
   — no two components share a selector, so no ties possible.
2. **Token-level overrides.** Rules like `section.dark { --bg: black }`
   apply to every section via inheritance. These MUST stay shared —
   pushing them into one component scopes them to that component only.
   **Mitigation:** audit per-rule: "token-set or property-set?" Only
   property-setting rules migrate.
3. **Specificity-bump hacks (§13).** Already addressed in Phase 3.5;
   this phase assumes `@layer` is activated everywhere.
4. **Theme files.** `themes/*.css` define tokens. Components must
   reference (`var(--token)`) but never define (`--token: …`).
   **Mitigation:** lint rule or grep check on component CSS files.

**Pixel-diff:** Every PDF must match Phase 0 baseline exactly. This
phase's diff IS the validation that the cascade is preserved.

Commits: 3-5. Audit in one commit; migration in batches of ~12
components; shared-file cleanup in the last commit.

### Phase 5 — Bucket galleries

Per-bucket survey decks, generated from `groupByBucket()`.

- `tools/build-bucket-gallery.js` — for each bucket emits a markdown
  deck: title slide + one slide per component (using `manifest.sample`
  or a comparable representative slide).
- Build × 9 buckets × 2 themes = 18 PDFs at
  `lib/components/<bucket>.gallery.{light,dark}.pdf`.
- `test/integration/components/bucket-galleries.test.js` — per bucket,
  light and dark page counts equal `bucket-membership + 1` (the title
  slide).
- CLAUDE.md — note that bucket galleries are auto-generated, not hand-
  authored.

**Clobbering risk:** Low. Generated artifacts in new paths.

**Pixel-diff:** New baselines.

### Phase 6 — Documentation

| File | Change |
|---|---|
| `docs/design-system.md` §3 | Note the function-vs-bucket distinction (7 audience families on the catalog, 9 disk buckets) |
| `docs/design-system.md` §9 | Replace flat layout with bucket layout; explain function vs bucket |
| `docs/design-system.md` §10 | Document modular CSS principle and the rule of three |
| `docs/design-system.md` §13 | Move @layer activation from "Deferred" to "Shipped" |
| `CLAUDE.md` | `lib/components/<name>/` → `lib/components/<bucket>/<name>/` everywhere; dark/light gallery rule; bucket-gallery rule |
| `docs/references/workflow.md` | "When adding a component" updated for bucket assignment |
| `docs/references/development.md` | Multi-PDF gallery testing notes |

## Risk register

Ordered top-down by severity.

| Risk | Phase | Likelihood | Mitigation |
|---|---|---|---|
| §13 specificity-bump hacks break under concat reorder | 3 | Medium | Phase 3.5 retires the hacks before Phase 4 |
| Token-setting rule migrated accidentally, becomes component-scoped | 4 | Medium | Per-rule audit: token-set vs property-set; lint prohibiting token definitions in component files |
| Component dark mode visually broken (never exercised before) | 2 | Medium | Surfaced bugs become a "dark-mode polish" backlog, not Phase 2 blockers |
| Pixel-diff false positives on Mermaid output | 3, 4 | Low | `tools/pixel-check.js` mmdc tolerance — validated through 30+ legacy.css extraction commits |
| Bucket gallery generator misses new components | 5 | Low | Tests assert bucket gallery membership equals `groupByBucket()[bucket].length` |
| Author confusion between function and bucket | All | Low | §9 update + a comment in `manifest.schema.json`; 49 of 58 components have function === bucket so it rarely matters |

## Commit shape

| Phase | Commits |
|---|---|
| 0 | 0 (tag only) |
| 1 | 1 (metadata) |
| 2 | 2-3 (build infra, generation, tests) |
| 3 | 9 (one per bucket, each pixel-validated) |
| 3.5 | 1-2 (@layer activation + hack retirement) |
| 4 | 3-5 (audit, batched migration, cleanup) |
| 5 | 2 (generator, tests) |
| 6 | 1-2 (docs) |
| **Total** | **~20 commits** |

Each commit pixel-validates against `refactor-baseline-2026-05-18`.

## Open questions

1. **Phase 3.5 — confirmed in scope?** Design-system.md §13 deferred
   it; this refactor exposes the source-order dependency. Folding it
   in is the cleanest sequence but adds 1-2 commits.
2. **Bucket gallery slide content.** `manifest.sample` is a single
   illustrative slide per component. Acceptable as the bucket-gallery
   row, or do bucket galleries want 2-3 slides per component to show
   form variants?
3. **Dark mode coverage.** Phase 2 surfaces components that have never
   rendered dark. Treat fixes as a follow-up, not Phase 2 blockers?

## Execution status (2026-05-18)

| Phase | Status | Commit / notes |
|---|---|---|
| 0  Baseline snapshot | Shipped | `refactor-baseline-2026-05-18` tag at `00da89f` |
| 1  `bucket` field on manifests | Shipped | 9 manifests carry explicit bucket; loader + tests extended |
| 2  Light/dark component galleries | Shipped | 58 light renamed, 58 dark built; integration test asserts both |
| 3  Disk reorganization | Shipped | 58 components moved into 9 buckets; 311 files changed; pixel-diff zero across all 89 pages of gallery.md |
| 3.5  `@layer` activation | **Deferred** | Audit revealed only `regulatory-update` carries `@layer` today; full activation needs layer-order declaration in `lib/_theme.css` + every component + every shared file. Tractable but invasive — benefits from human design pass before execution |
| 4  Modular CSS migration | **Deferred** | Depends on Phase 3.5. The disk reorg has localized component sources so this is mechanically straightforward when it lands |
| 5  Bucket survey galleries | Shipped | 9 generated `.gallery.md` + 18 PDFs (9 × light/dark); integration test asserts membership |
| 6  Documentation | Shipped | design-system.md §3, §9, §13 updated; CLAUDE.md updated for the new paths and gallery rules |

Deferred work is captured here, in design-system.md §13's "Still
deferred" section, and is independent of the disk-reorganization
goals. No regressions blocked: integration assertions on light + dark
page counts catch transform-level slide drops; bucket-gallery
integration asserts composition stays in sync with manifests; pixel-
diff at the gallery-source level verified zero visual drift.

## What this plan is NOT

- Not an authoring-grammar change. `<!-- _class: cards-grid -->` is
  unchanged. Modifier vocabulary is unchanged.
- Not a function-family change. The seven audience-function families in
  design-system.md §3 are unchanged. The disk adds two substance-defined
  buckets without renaming or redefining the function taxonomy.
- Not a unification reversal. The "chart and diagram are unified as
  Evidence-substance-SVG" insight in design-system.md §5 holds — it's
  about taxonomy, not file paths. Disk colocation supports the engine
  maintainer; the taxonomy serves the deck author.
- Not a per-feature deck. This refactor doesn't author a demo deck; the
  bucket galleries and per-component dark/light galleries are the
  deliverable.
