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
| `design/design-system.md` §3 | Note the function-vs-bucket distinction (7 audience families on the catalog, 9 disk buckets) |
| `design/design-system.md` §9 | Replace flat layout with bucket layout; explain function vs bucket |
| `design/design-system.md` §10 | Document modular CSS principle and the rule of three |
| `design/design-system.md` §13 | Move @layer activation from "Deferred" to "Shipped" |
| `CLAUDE.md` | `lib/components/<name>/` → `lib/components/<bucket>/<name>/` everywhere; dark/light gallery rule; bucket-gallery rule |
| `engineering/workflow.md` | "When adding a component" updated for bucket assignment |
| `engineering/development.md` | Multi-PDF gallery testing notes |

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

## Phase 7 — PDF sprawl cleanup (added 2026-05-18 after Phases 0-6 landed)

The 134 newly-generated per-component + bucket gallery PDFs do their
job — every component is self-documenting in both moods. That makes
many of the legacy `examples/*.md` decks redundant. This phase routes
each PDF by its primary purpose and retires the duplicates.

### Three roles, three homes

| Role | Primary purpose | Home |
|---|---|---|
| Regression test | Asserted by CI; failure = bug | `test/integration/baseline-decks/` |
| Self-documenting catalog | Reviewer opens the folder, sees what the thing does | Lives with the thing |
| Real-world example | Human reads it to learn; not asserted | `examples/` |

### What's where today (and where it ends up)

| File | Currently | Asserted? | Verdict | New home |
|---|---|---|---|---|
| `gallery.md` (89pp) | examples | ✓ emulator + marp + parity tests | Test baseline | `test/integration/baseline-decks/gallery.md` |
| `gallery-mermaid.md` (31pp) | examples | ✓ emulator test | Integration catalog | `lib/integrations/mermaid/mermaid.gallery.md` + .light/.dark.pdf |
| `palette-audit.md` | examples | ✗ but ref'd 4× from `design/theming.md` | Palette infra tool | `test/integration/baseline-decks/palette-audit.md` (update theming.md refs) |
| `gallery-jargon.md` | examples | ✗ | Editorial showcase | `examples/` (stay) |
| `design-system.md` | examples | ✗ | Pedagogical demo | `examples/` (stay) |
| `legal-layouts.md` + `-finalists.md` | examples | ✗ | Domain composition demo | `examples/` (stay) |
| `custom-logo.md` | examples | ✗ | Branding feature demo | `examples/` (stay) |
| `palette-demos/` | examples | ✗ | Palette demo collection | `examples/` (stay; subdirectory) |
| `chart-family-experiment.md` | examples | ✗ | Redundant with chart bucket gallery | **Retire** |
| `diagram-tokens.md` | examples | ✗ | Redundant with diagram gallery | **Retire** |
| `image-concepts.md` | examples | ✗ | Redundant with image gallery | **Retire** |
| `list-tabular-gallery.md` | examples | ✗ | Redundant with list-tabular gallery | **Retire** |
| `math.md` | examples | ✗ | Redundant with math gallery | **Retire** |
| `quadrant.md` | examples | ✗ | Redundant with quadrant gallery | **Retire** |
| `radar.md` | examples | ✗ | Redundant with radar gallery | **Retire** |
| `word-cloud.md` | examples | ✗ | Redundant with word-cloud gallery | **Retire** |
| `roadmap.md` | examples | ✗ | Redundant with roadmap gallery | **Retire** |
| `user-journey.md` | examples | ✗ | Redundant with journey gallery | **Retire** |
| `state-tokens.md` | examples | ✗ | Redundant with state-variant coverage | **Retire** (verify content first) |
| `treatments-catalog.md` | examples | ✗ | Redundant with treatments coverage | **Retire** (verify content first) |
| `route2-preview.md` | examples | ✗ | Stale experiment | **Retire** |

**Retire count: 13 decks × 2 files (md + pdf) = 26 files removed.**

The dual-role question (per-component galleries are BOTH asserted AND
self-documenting) is resolved in favor of self-documentation as the
primary purpose: they stay with their component. The page-count
assertion is a safety net on top of the catalog, not the other way
around. Same logic that places `<name>.docs.md` in the component
folder rather than in `test/`.

### The principle going forward

**`examples/` is for humans to read.** If a deck's primary purpose is
"assert page count = N" it doesn't belong there — it's a regression
test. If a deck is "showcase a feature in context" or "domain
composition demo," it stays.

### Reference updates needed

Beyond moving the files, the following references need a sweep:

| Reference | File | Update |
|---|---|---|
| `examples/gallery.md` paths | `design/skill.md` (4 places), `engineering/architecture.md` (1) | Update to `test/integration/baseline-decks/gallery.md` if moved, OR keep `gallery.md` filename and update path. Skill.md uses it as a CLI example — consider whether to redirect to a kept example instead |
| `examples/palette-audit.md` references | `design/theming.md` (4 places) | Update path to new location |
| `examples/design-system.md` reference | `design/design-system.md:583` | Stays — design-system.md is staying in examples |
| `ALL_DECKS` array | `tools/preview.js` (19 entries) | Remove retired entries; reorder remaining; add mermaid integration gallery if it should be previewable |
| `runEmulator('gallery.md')` calls | `test/helpers/render.js` resolves against EXAMPLES | Update EXAMPLES base path OR pass the new location explicitly |
| Top-level deck assertions | `test/integration/galleries/emulator.gallery*.test.js` | Update path resolution |
| Mermaid gallery test | `test/integration/galleries/emulator.gallery-mermaid.test.js` | Move alongside mermaid integration gallery, or keep here pointing to new location |
| CLAUDE.md baseline-deck rule | `CLAUDE.md` | Update path; rename "isolation rule applies to all three top-level decks" since list changes |

### Generator extensions

- `tools/build-galleries.js`: no change (already generic — component-driven)
- New: `tools/build-integration-galleries.js` (or extend build-galleries.js with `--scope=integrations`) — walks `lib/integrations/*/` and renders `<integration>.gallery.{light,dark}.pdf` from a hand-authored `<integration>.gallery.md` source
- `tools/build-bucket-galleries.js`: no change (already bucket-driven)

### Order of operations

1. **Move CI baselines first.** Update test paths, verify suite still green. Commit per file: `gallery.md → test/`, `gallery-mermaid.md → lib/integrations/mermaid/`, `palette-audit.md → test/`. Update docs references in same commits.
2. **Build mermaid dark gallery.** Generate `mermaid.gallery.dark.pdf` once the source is in its new home; assertion = same as light page count.
3. **Retire the 13 redundant decks.** Single commit. Delete .md + .pdf. Strip from `tools/preview.js` ALL_DECKS. Verify integration test still names only existing decks.
4. **Update docs.** CLAUDE.md baseline-deck rule, design-system.md §9 if it lists decks, workflow.md if any rules name retired decks.

### Risks

- **Stale reference in a deck someone authored against an example.** Mitigated by `grep -rn "examples/<retired-deck>"` before removal.
- **Mermaid dark gallery surfaces new visual bugs.** Same risk as Phase 2 — treat as polish backlog, not blocker.
- **`palette-demos/` subdirectory** — is anything in there asserted? Need to verify before deciding stay-vs-move.

### Open questions (resolved per `let's go` directive in chat)

1. ~~Per-component galleries — stay with components?~~ **Yes.** Primary purpose is self-documentation; page-count assertion is the safety net on top.
2. ~~`design-system.md` — testing or examples?~~ **Examples.** Not CI-asserted; it's pedagogical.
3. ~~`palette-demos/` — stays or moves?~~ **Stays in examples** pending verification of contents.
4. ~~`gallery.md` rename?~~ **Keep the name** for git-history-blame continuity. Path changes; filename doesn't.

## Original-plan open questions

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
| 3.5a  pixel-diff baseline harness | Shipped | Established that diffing against committed PDFs is misleading (Chromium-version drift); in-sandbox baselines are the only safe reference. |
| 3.5b  component-only `@layer` wrap | **Reverted** | Wrapping ONLY components in `@layer components` broke 100% of canary pages: the CSS spec rule "unlayered beats layered regardless of specificity" means component rules lost to whatever generic rule existed in shared files. Approach is not viable. |
| 3.5c  retire 7 cascade-workaround `!important` | Shipped | All 7 component-level cascade-workaround `!important` declarations removed; natural selector specificity already wins. Zero pixel drift across 35 affected pages. The 14 in `base.variants.css` stay locked-in (scaffold-vs-variants competition). |
| 3.5d  cascade docs | Shipped | `engineering/cascade.md` captures the investigation: why `@layer` is declared-but-inert, the rule-3 trap that broke 3.5b, what a safe full activation would require. Future contributors don't redo 3.5b. |
| 4  Modular CSS migration | **Deferred indefinitely** | Originally depended on Phase 3.5's `@layer` activation succeeding. Since broader activation is blocked on the `!important` competition (see cascade.md), modular migration is blocked too. Reopens only if the scaffold-vs-variants `!important` strategy gets rewritten. |
| 5  Bucket survey galleries | Shipped | 9 generated `.gallery.md` + 18 PDFs (9 × light/dark); integration test asserts membership |
| 6  Documentation | Shipped | design-system.md §3, §9, §13 updated; CLAUDE.md updated for the new paths and gallery rules |
| 7a PDF sprawl — move CI baseline | Shipped | `examples/gallery.md` → `test/integration/baseline-decks/`. palette-audit.md considered but reverted (not asserted; it's a theme-designer resource). |
| 7b PDF sprawl — mermaid integration shelf | Shipped | `examples/gallery-mermaid.md` → `lib/integrations/mermaid/mermaid.gallery.md` + generated `mermaid.gallery.dark.pdf` sibling. |
| 7c PDF sprawl — retire redundant decks | Shipped | Deleted 13 single-component demo decks (26 files) now covered by per-component galleries. Also deleted orphan `examples/preview-G/` (23 stale theme-comparison PDFs with no .md sources). `examples/` now holds 6 human-facing decks. |
| 7d PDF sprawl — docs | Shipped | CLAUDE.md baseline-deck rule updated; workflow.md feature-deck example switched to a surviving deck; this note's status table reflects what landed. |
| 8 chart-family colocation | Shipped | `lib/chart-family/` → `lib/components/chart/_chart-family/`. Bucket-scoped infrastructure now lives with the bucket. Establishes the leading-underscore convention for "not-a-component" subdirs under a bucket. |
| 9 diagram = mermaid showcase | Shipped | `lib/integrations/mermaid/mermaid.gallery.md` (31pp) → `lib/components/diagram/diagram/diagram.gallery.md`. New `manifest.galleryAuthored: true` flag opts a component out of the manifest-formula-driven gallery (for components like `diagram` where variation lives in slide CONTENT not modifier classes). Mermaid integration shelf is now just `mermaid.css` + `mermaid.docs.md` + `mermaid.hljs.js`; the standalone showcase deck is retired. |

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
