# Changelog

All notable changes to Lattice are documented here. The project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) with one explicit
contract: **layouts and palette tokens are stable surfaces.** Breaking
changes to either are major version bumps. New layouts and new themes are
additive minor versions. Mermaid CSS overrides are internal and may change
in patch versions.

> **This file drives the release.** `## Unreleased` is the source of truth
> for the next version. `tools/changelog.js` reads its Keep-a-Changelog
> categories to pick the bump deterministically, and the release workflow
> rolls `## Unreleased` into a dated `## <version> - <date>` section:
>
> | Category in `## Unreleased` | Bump |
> |---|---|
> | `### Removed`, or any `**Breaking:**` bullet / `BREAKING CHANGE` token | **major** |
> | `### Added`, `### Changed`, `### Deprecated` | **minor** |
> | `### Fixed`, `### Security` | **patch** |
>
> Keep entries here current **as changes land** (see `CLAUDE.md`) — an empty
> `## Unreleased` means there is nothing to release. Flag a breaking change
> by leading the bullet with `**Breaking:**` so it counts as major even
> under `### Changed`.

## Unreleased

### Added

- **The four keyed charts get a portrait legend-below layout (Phase 4, render-time).**
  `piechart`, `radar`, cohort `quadrant`, and `map` bake their diagram **and** their
  legend into one wide SVG viewBox (`svg-legend.js`), so on a portrait deck the whole
  unit used to letterbox into a short band. The shared legend builder now has a
  portrait branch — the diagram sits on top, the key stacks centered beneath it with a
  horizontal accent rule between — keyed on the deck's `data-orientation` stamp. The
  builder returns a new `diagramDx` (horizontal centering offset) that the four kernels
  thread into their diagram transform; `radar` reserves extra side room so its axis
  labels don't clip. **Landscape output is byte-identical** (the right-rail path runs
  untouched when the deck isn't portrait). See
  `engineering/decisions/2026-06-19-chart-adaptive-sizing.md` §9 and
  `examples/legend-below-portrait.md`.
- **Charts restructure to a tall box — funnel fills the portrait canvas (Phase 4, render-time).**
  Charts whose layout is baked into an SVG viewBox can't be reflowed in CSS, so they
  restructure at *render time*: `funnel` now emits a tall portrait viewBox on a
  portrait deck (it filled only a short landscape band before), reading the deck's
  `data-orientation` stamp the slide pipeline already writes — no engine plumbing.
  Landscape output is byte-identical. This threading is the reusable foundation for
  the remaining render-time charts (the keyed radial/square charts via `svg-legend`,
  `roadmap`, and the Mermaid `gantt`/`journey` direction-switch). See
  `engineering/decisions/2026-06-19-chart-adaptive-sizing.md` §7.
- **Charts restructure to a tall box — sequential charts go vertical (Phases 1–2).**
  Charts previously kept their landscape internal layout and shrank into a tiny
  band on a portrait/tall slide. They now *restructure* box-locally via
  `@container lattice (aspect-ratio …)`, landscape byte-identical: `timeline-list`
  turns its left-to-right spine into a true vertical timeline (dots on a left rail,
  content filling the width); `kanban`'s side-by-side board stacks into full-width
  lanes (cards wrapping as a row within each); and `progress` distributes its bars
  down the full height with thicker tracks. This establishes the `auto 1fr` rail
  pattern; radial/square charts (`piechart`, `radar`, `quadrant`) and the
  render-time work (`funnel`/`roadmap` viewBox + Mermaid `gantt`/`journey`
  LR→TB) follow in phases 3–4. See
  `engineering/decisions/2026-06-19-chart-adaptive-sizing.md`.
- **Box-local adaptive sizing — components reflow to the box they occupy
  (pilot: 5 components).** Components now adapt their *structure* via CSS
  `@container lattice (aspect-ratio …)` queries over four box-families — `wide`
  (>1.05) · `square` (0.9–1.05) · `tall` (0.5–0.9) · `strip` (<0.5) — instead of
  the deck-wide `data-orientation` stamp. The query reads the nearest `lattice`
  container, so one rule handles a portrait deck today and (once a Cell names
  itself `lattice`) a narrow nested cell. Scale stays continuous (slide-anchored
  `cqi`); only structure steps between families. `kpi`, `list`, `matrix-2x2`,
  `cards-grid`, and `split-compare` are converted; `kpi`'s `strip` family
  additionally sheds its status pills (the declared `adapt.droppable`). The
  fully-nested case (a component tracking its *cell's* aspect, not the deck's)
  needs the engine to stamp a non-`cqi` `--_sec-1cqi` in every render path so
  cell type stays slide-anchored — that alters exported bytes, so it is staged
  behind sign-off (the foundation enables it). Manifests gain an `adapt`
  block (`adapt.families` support list + `priority` / `droppable` /
  `keepTogether` / per-family `capacity`) — declared intent the authored CSS
  honours and a future resolver can consume. Foundation: `section` is named the
  `lattice` query-container (`lib/base/base.elements.css`); the four thresholds
  live once in `lib/adaptive/families.js` (drift-guarded by a unit test). Demo:
  `examples/adaptive-sizing.md`. Landscape output is byte-identical. See
  `engineering/decisions/2026-06-18-component-adaptive-sizing.md`.
- **Box-local adaptive sizing — sweep batch 1 (5 more components).** `pricing`,
  `verdict-grid`, `stats`, `cards-stack`, and `content` now reflow box-locally via
  `@container lattice (aspect-ratio …)` — pricing/verdict-grid collapse to one
  column at `tall`/`strip`; stats/cards-stack/content reflow from `square` down
  (numbers stack and enlarge, cards de-balloon, prose measure caps). Each mirrors
  the component's existing `[data-orientation]` reflow (kept as fallback) at matched
  specificity, so a portrait deck is visually unchanged and **landscape output stays
  byte-identical** (the query is inert above 1.05 aspect); the win is that the reflow
  now also fires inside a narrow nested cell. `split-panel` is intentionally *not*
  converted — it reflows the section itself, which an `@container` rule cannot style
  (it can only style descendants), so it stays on `data-orientation` until the staged
  nested-cell foundation lands. Manifests gain an `adapt` block.
  See `engineering/decisions/2026-06-18-component-adaptive-sizing.md`.

### Fixed

- **Playground preview no longer freezes on iOS after opening a settings sheet.**
  On the /playground (Workbench), opening **Galleries** or **Deck setup** and then
  closing it left the live preview unscrollable on iOS Safari until focus changed
  or ~10s passed. The panels are shadcn **Sheets** (Radix Dialog) and defaulted to
  `modal`, which engages `react-remove-scroll`'s body scroll-lock — its non-passive
  `touchmove` blocker lingers on iOS after close. Both sheets are now non-modal
  (`modal={false}` + a new opt-out `overlay` prop on `ui/sheet.tsx`), so the page is
  never scroll-locked and the preview stays live while you edit. The Drawing Board
  (vanilla, no Radix) was never affected. See `engineering/gotchas.md`.

### Changed

- **The concept page’s “The lattice” section is now an explorable 3D-CSS graph.**
  Below the scroll hero, `/model/concepts/` renders the concept lattice as a live,
  manually-driven 3D constellation (the nine concepts + their typed edges): drag to
  orbit, a **Drill** control pushes into the **Form** node (the other axes fall
  away, Frame · Cell · Tile fan into depth — the same move the hero plays on
  scroll), an **Orbit** toggle pauses the gentle auto-turn, and **Reset** returns
  to the resting view. Pure CSS 3D (no WebGL, no dependency), themed on the live
  palette tokens, and self-centring so every node stays legible at any width;
  `prefers-reduced-motion` / no-JS fall back to the static `ConceptLattice`
  diagram. The graph reflects the shipped ontology — no recursive Frame-in-Cell
  edge. (`docs/src/components/model/ConceptGraph.astro`.)

- **The concept page opens with a scroll-driven 3D walkthrough — the lattice
  drills into Form and becomes a slide.** The `/model/concepts/` hero is now a
  single sticky CSS-3D stage (no WebGL, no dependency — real themed DOM) driven by
  one scroll-progress value: Act 1 shows the concept lattice as a 3D constellation;
  scrolling **drills into the Form node** (the other axes fall away, Frame · Cell ·
  Tile fan into depth); a crossfade hands that structural fan off to a real slide's
  exploded **z-planes**, which then **recompose** into one clean composed slide —
  making literal the `forms.md` note that z "would become literal depth in a
  spatial renderer." An Explode slider, Reset, and drag-to-orbit drive the slide
  directly; touch-drag suspends page scroll until release; `prefers-reduced-motion`
  falls back to a static slide and the 2D `ConceptLattice` remains the no-JS
  fallback below. Replaces the renderer bake-off staging from #431. The graph
  reflects the shipped ontology — no recursive Frame-in-Cell edge ([rejected](https://github.com/slidewright/lattice/blob/main/engineering/decisions/2026-06-18-frame-recursion-cells.md)).

- **One unified site header + a universal ⌘K command palette (docs site).** The
  top bar was eight copy-pasted topbars across two CSS systems (`TopBar.astro`,
  inline copies in six standalone pages, and the Starlight `Header.astro`); the
  docs zone and the standalone routes drifted apart and read as two apps. All of
  it collapses into ONE shared `SiteHeader.astro` rendered everywhere — identical
  brand, nav, theme controls, and search on every surface. The seven top-level
  links become a calmer set: Docs · Components · Features · Comparison inline, the
  three apps (Playground, Drawing Board, Workbench) under a **Tools** disclosure.
  Search is now a **universal ⌘K command palette** (the same on every page):
  navigate anywhere, switch theme/light-dark, and full-text-search the docs via
  Pagefind — replacing the docs-only search pill. One responsive rule (`lg`)
  governs the whole bar: a rich bar on desktop, a compact search-+-menu bar with a
  full Sheet below it. The component-reference toolbars (the page sub-bar, the
  specimen Preview/Edit toggle, the variant switcher) were realigned to the same
  button/segmented-control vocabulary so every bar in the app reads as one piece.
  Nav is one source of truth (`docs/src/lib/nav.mjs`); `TopBar.astro` is retired.

### Fixed

- **Present/Practice mobile stage — maximise + robust centering (CSS isolation).**
  The stage layout was sharing one cascade with the engine `out.css`, which
  clobbered the centering rules (`body`/`.marpit`/`section`) — so the slide fell
  to the engine's default flow and pushed up on mobile Safari. The slide is now
  wrapped in our own `#latt-stage`/`#latt-fit` elements (ID selectors `out.css`
  can't clobber, and *outside* `.marpit` so the slide's `transform` can't trap the
  fixed stage); `#latt-stage` fills `100dvh` and flex-centers `#latt-fit` (sized to
  the scaled slide box) — so the slide maximises + stays centered in portrait AND
  landscape, re-fitting on `orientationchange`/`visualViewport`. Verified centered
  in all three orientations in Chrome (desktop/portrait/landscape).

- **Present/Practice — title/closing/divider content no longer sits high.** The
  slide show/hide loop forced `display:block` on the active `<section>`, which
  clobbered the flex-centering layouts (`title`/`closing`/`divider` set
  `section{display:flex;…}` to vertically center their content) — collapsing them
  to top-of-box flow. Root cause, not the stage geometry: the section box was
  centered, the *content inside it* was not. Fixed by reverting the show/hide to
  the stylesheet value (`display:""` instead of `"block"`), so each layout keeps
  its own `display`. Measured h1 offset from section center: −55px → −1px.

### Added

- **Export-to-Marp bundles now carry an AI-agent kit, so recipients can keep authoring the deck.** Every Marp bundle (CLI `npm run export:marp` and the Drawing Board export) now ships a bundle-tailored `AGENTS.md` at the root + the machine-readable component catalog at `agent/components.json` — so an AI agent (Claude, Copilot, Cursor, …) dropped into the exported folder can extend the deck with full Lattice knowledge: pick the right component, honour its slots, and stay within each layout's **content capacity** instead of inventing `_class` names and overflowing slides. The catalog is a frozen snapshot stamped with the exporting Lattice version. On by default; opt out for a lean Marp-only bundle with `--no-agent` (CLI). Built on the shared bundle spec (`lib/core/marp-bundle.js` — `AGENT_ASSETS` + `agentsMd`) so the CLI and browser producers can't drift. See `engineering/decisions/2026-06-13-export-to-marp.md` §10.

- **Concept ontology — the relationship graph is now machine-readable and drift-gated.** The cross-level concept graph (the four axes Function · Form · Substance · Finish, the structural nouns Frame · Cell · Tile, the Component join, and the typed relationships between them) is encoded as `lib/concepts/concepts.json` and projected to a new machine catalog **`dist/docs/concepts.json`** (beside `components.json` / `forms.json`) by `tools/build-concepts.js` (`npm run docs:concepts`). A **two-tier drift gate** (`docs:concepts:check`, wired into `build:check`, so it runs at pre-push and in CI) checks both the **nodes** (every node's claimed vocabulary resolves in the live catalogs; the counts are *derived* from them, never hand-typed) and the **structural backbone edges** (`frame→cell` (produces) needs a Frame that really lists cells; the join edges need the `function` / `form` / `substance` fields they claim) — so the map can't assert a vocabulary, count, or structural relationship the engine doesn't ship. `design/concepts.md` drops its hardcoded `7/12/4` vocabulary counts and §9 records the new encoded-vs-prose state honestly (the node descriptors remain hand-authored prose).

- **Content-capacity contract — layouts declare how many elements they hold, and the linter warns before an overflow.** Each component manifest can now carry a `capacity` block (`{ axis, min, sweet, soft, hard, escalateTo, note }`) keyed to the collection it's built on (`item` / `row` / `col` / `cell` / `line` — a `focusAxes` member). The agent/author reads it from `components.json` to **pick a layout by content shape** (count first, then filter by capacity), and `lint:deck` emits an advisory warning — `capacity-crowd` past `soft`, `capacity-overflow` past `hard` — with an `escalateTo` fix, both live in the CLI and the Drawing Board. The count is approximate at authoring time (markdown, `lib/authoring/lint-core.js`), with a render-exact counting primitive (`lib/core/collections.js` `countAxis`) landed and tested for the staged render-time gate. The validator rejects an inert contract whose axis can't be measured in the component's own sample. Each component's generated `.docs.md` now shows a **Capacity** line. Seeded on the ten worst overflow offenders (`cards-grid`, `cards-stack`, `stats`, `list-steps`, `verdict-grid`, `compare-table`, `actors`, `agenda`, `checklist`, `kanban`); the rest backfill incrementally. Advisory only — never blocks, so galleries/`stressSample` stay free to push limits. See `engineering/decisions/2026-06-17-content-capacity-contract.md`.

- **`design/concepts.md` — the one concept map.** A new top-of-stack doc that names every Lattice concept on both levels — the four axes (Function · Form · Substance · Finish) and the structural nouns (Frame · Cell · Tile) — and the relationships between them, including the join: a component *is-a* Function, *selects* a Frame, *binds* Substance into Cells, *receives* Finish. Closes the gap where the axes were documented in `design-system.md` and the nouns in `forms.md` with nothing showing they are one system at two scales. Includes a Mermaid lattice diagram and an honest encoded-vs-prose status. Registered in the `CLAUDE.md` canonical-doc table and cross-linked from both docs it joins. Also published to the docs site as **`/model/concepts/`** (a new "The model" sidebar group) with a responsive HTML/CSS `ConceptLattice` diagram; the existing **Form model page moved `/spec/form-model/` → `/model/form-model/`** (redirected) so that group holds the engine's design model and "Specification" reads purely as the LFM standard.

- **Portrait "great" pass — stats reflow, de-ballooned cards, hero-number emphasis.** Social/mobile decks now command the tall frame instead of merely fitting it: `stats` stacks its numbers vertically and enlarges them (a new per-geometry `--stat-emphasis` param the engine emits alongside `--canvas-scale`); `list` / `cards-grid` / `cards-stack` keep each card content-height and distribute them to fill (no more one-line cards ballooning to ~600px); `content` prose caps its measure so lines don't sprawl; and the `square` canvas-scale rises 1.5 → 1.65 so square body clears the legibility floor. All keyed on `data-orientation` — landscape stays byte-identical. `kpi` already reflowed (#407) and keeps its variant hierarchy, so it is left as-is.

- **Declared portrait/landscape support per component, with a lint warning.**
  Every component manifest can now declare an `orientation` array — `["landscape",
  "portrait"]` (both, the default), `["landscape"]` (landscape-only), or
  `["portrait"]` (social-only, none yet). A full-catalog audit (every gallery
  rendered at 9:16 and judged on real output) classified all 54: **8 are
  landscape-only** — `gantt`, `journey`, `kanban`, `roadmap`, `state-chart`
  (horizontal-axis charts), `compare-code`, `redline` (side-by-side diffs), and
  `image` — the rest work in portrait. The field surfaces in
  `dist/docs/components.json`, and **`lint:deck` warns** (`orientation-mismatch`)
  when a portrait/mobile deck uses a landscape-only layout (or a landscape deck a
  portrait-only one). The lint set is kept in step with the manifests by a unit
  test. See `engineering/decisions/2026-06-16-orientation-in-the-form-model.md`.

- **Safe-area for vertical feeds — the `safe` modifier.** Keeps content clear of the platform caption / UI bands that vertical-video feeds overlay on a vertical post (top profile row, bottom caption + action rail). Opt-in (`safe`, or deck-wide `class: safe`); takes effect only on a portrait/square `@size`, where the engine emits px safe bands from the geometry (12% top / 20% bottom) that the modifier reserves as content padding and uses to lift the footer chrome above the caption band. Runtime preview matches the export. See `lib/base/base.docs.md`.

- **PPTX export follows the deck `@size`.** A portrait/square deck now exports a
  portrait/square `.pptx` instead of letterboxing into a 16:9 slide. The exporter
  derives the PowerPoint slide layout from the resolved geometry (custom layout at
  the deck aspect, normalized to a 13.333in longest edge); a 16:9 deck keeps the
  built-in `LAYOUT_WIDE` (byte-identical). Both the CLI
  (`lib/export/pptx-export.js`) and the Drawing Board export path are updated.

- **Portrait grid reflow for the data-dense layouts.** Building on the
  social/mobile `@size` work, the grid-based layouts now reflow on a
  portrait/square canvas instead of holding their landscape composition: `kpi`
  (every variant — briefing/ops/spotlight/trajectory — linearises to a centred
  metric column), `matrix-2x2`, `pricing` and `verdict-grid` collapse to a
  single column, and `split-panel` / `split-compare` stack their rail above the
  content. Each render path stamps a deck-wide `data-orientation` on the section
  (engine + runtime); landscape is unstamped → byte-identical. **Mermaid
  diagrams reorient** for portrait — a left-to-right flowchart becomes
  top-to-bottom (LR→TB, RL→BT) so it flows down the tall frame at legible size
  instead of shrinking to a thin strip (both the PDF and preview paths, via
  `lib/integrations/mermaid/reorient.js`). Charts (SVG, aspect-preserved) need no
  reflow. Demo: `examples/social-grid.md`. Remaining: `redline` (side-by-side
  diff is semantically load-bearing) is deliberately left landscape-composed.
  See `engineering/decisions/2026-06-16-social-mobile-portrait-sizes.md` (phase 3).

- **Narrative build — progressive disclosure via `_build`.** A slide opts into
  "assemble as you go" with a `<!-- _build -->` directive (a subset of the
  `_focus` grammar): bare builds the slide's primary collection one unit per step
  in document order; `_build: rows` picks the axis (`item` · `row` · `col` ·
  `line`); `_build: 1, 2-3, 4` groups units into steps; `_build: none` opts out.
  The engine only *tags* the steppable units (`data-build-step`); reveal is pure
  CSS gated on a consumer-set `data-build-at`, so a non-driven render and the
  final-state PDF are byte-identical to a deck with no build (the 0-pixel
  guarantee). Reveal-only; the live player driver and per-step overlay export are
  staged follow-ons. See `engineering/decisions/2026-06-16-narrative-step-spec.md`.

- **Docs site: a live, draggable performance overlay.** A small overlay renders
  two groups: **web vitals** (LCP / CLS / INP / FCP / TTFB, colour-rated by
  Google's thresholds) and a **runtime** group — **FPS** (frame rate), **MEM**
  (JS-heap in use), and **CPU≈** (main-thread busy %, a Long-Tasks proxy since
  browsers expose no true CPU API; the MEM and CPU≈ rows appear only where the
  browser supports them). All measured by the device's own browser — the
  zero-tooling way to check landing CLS / mobile LCP / jank on a real phone,
  which the CI/sandbox can't (it blocks the CDN fonts). Turn it on two ways: the
  **"Performance overlay" switch in the Drawing Board settings → Workspace** (a
  global, cross-surface switch like Guided tours — governs every page), or a
  **`?perf`** URL param (`?perf` on, `?perf=off` off) for the phone, which writes
  the same preference. A grip (⠿) on the header marks it draggable — drag to
  reposition (persisted); tap × to dismiss. Off by default. The `web-vitals`
  library is imported, and the runtime loops run, ONLY while the overlay is
  shown, so a normal page view pays nothing. Available in every environment
  (incl. production) until GA, then GA-gated via `PERF_OVERLAY_AVAILABLE` in
  `docs/src/playground/perf-overlay-prefs.js`. See
  `docs/src/components/site/PerfOverlay.astro`.

- **Native social-media & mobile slide sizes — portrait and square.** Four new
  `@size` presets join the landscape set: `square` (1080×1080, 1:1), `portrait`
  (1080×1350, 4:5), `story` (1080×1920, 9:16) and `mobile` (1080×2340, 9:19.5),
  each with aspect aliases (`1:1`, `4:5`, `9:16`) and `reel` for `story`. Opt in
  with one line — `size: story` in the front matter; components, palettes and
  treatments all work unchanged. The engine is now **orientation-aware**: a
  `--canvas-scale` magnitude lever (folded into every `--fs-*` / `--sp-*` token)
  boosts type and spacing so portrait/square decks read at phone distance, and
  the default flex-column layouts (title, statement, quote, divider, stats,
  big-number, closing, prose, lists) vertically centre to fill the taller frame.
  Landscape output is **byte-identical** (`--canvas-scale` is exactly 1; verified
  pixel-for-pixel against the committed baselines). Demo decks:
  `examples/social-{square,portrait,story,mobile}.md`. Design:
  `engineering/decisions/2026-06-16-social-mobile-portrait-sizes.md`.
  - Data-dense grid layouts (kpi, comparison, split, charts) render true-portrait
    but keep their landscape composition for now; a portrait reflow is tracked as
    follow-on. PPTX export remains 16:9-only (PDF export is correct at every size).

### Changed

- **Internal `!important` cleanup (cascade hygiene).** Removed 22 redundant
  `!important` declarations that only existed to win Lattice-vs-Lattice cascade
  races, keeping the cascade outcome pixel-identical (verified by per-cluster
  marp-cli / emulator pixel-diffs at fuzz 25%). Removed: all 12 in
  `scaffold.css` (the `section::after` pagination + `section header/footer > p`
  rules already win on source order over Marpit's equal-specificity scaffold
  defaults), the 1 pagination-colour `!important` in
  `chart-family.css` (`section.chart-frame.cover::after`, which now wins on
  specificity once scaffold's matching `!important` is gone), 2 in
  `base.variants.css` (the `section.silent/.no-header > header/footer`
  `display:none`, already specificity-winners), and 7 in `base.sketch.css`
  (card / blockquote borders + radii that outrank their component rules on
  specificity). Genuinely load-bearing internal `!important` were kept with a
  comment explaining what each beats: the `section.archived::after` stamp and
  `silent/.no-paginate::after { content:none }` (beat the owned engine
  scaffold's higher-specificity `div.marpit > section::after`), and the two
  sketch decision/compare-prose lifted-label overrides (the component's
  `:has(> strong:first-child)` selector outranks them). External-tool overrides
  (Mermaid / KaTeX / highlight.js, and the kanban/timeline/radar SVG sheets)
  were intentionally left untouched — `!important` is the correct mechanism
  against inline styles emitted by those tools.

- **The Drawing Board "Slide size" picker now lists the social/mobile formats.**
  #399 added `square` / `portrait` / `story` / `mobile` to the engine's `@size`
  registry, but the deck-config drawer's size dropdown was a separate hardcoded
  list of the three landscape sizes — so the portrait formats never appeared in
  the UI (you had to type `size: story` by hand). The picker options are now a
  curated module (`docs/src/playground/deck-sizes.js`) guarded by a unit test
  against the `@size` registry, so this can't silently drift again. The editor
  also autocompletes `size:` values from the same source.

- **One slide-size registry (engine source of truth).** The CLI/PDF emulator no
  longer carries its own hard-coded size table — it resolves `@size` through the
  engine's `resolveSize`, the same lookup the scaffold bakes into `@page`. Fixes
  a latent bug where `size: 16:9` silently rendered as `hd` in exported PDFs.

- **Docs site: the header/footer logo and browser-tab favicon now use the
  existing adaptive SVG mark instead of a 512² PNG.** The header/footer `<img>`
  points at `lattice-mark-min.svg` and the favicon at `favicon.svg` — both
  already shipped in `docs/public/` and both light/dark adaptive via
  `prefers-color-scheme`. Pixel-verified identical to the retired raster, but
  crisp at any DPR and ~25KB lighter on the first load of every page. The
  now-unused `docs/public/lattice-logo.png` was deleted.

### Removed

- **Breaking: the `featured` component is removed, superseded by the `focus`
  directive.** The `imagery/featured` layout (its `<!-- _class: featured -->`
  slides, the `feat-layout` / `feat-card` DOM, the `featured.mirror` swap, and
  the `featured` Form Frame) is gone; decks that authored a `featured`
  recommendation card should use a card-style layout (`cards-stack` /
  `cards-grid`) with `_focus` to spotlight the lead item. The Imagery bucket now
  holds a single component, `image`. See
  `engineering/decisions/2026-06-16-focus-highlighting.md`.

- **Breaking: the BYO marp-cli render path is retired — `marp.config.js` is
  deleted**, along with the `@slidewright/lattice/config` and
  `@slidewright/lattice/marp.config.js` package exports. Lattice's own engine
  (`lib/engine`, the `lattice` CLI/emulator + docs playground) and the browser
  runtime (`dist/lattice-runtime.js`) are the only render paths. The shared
  markdown-it plugin kernel moved from `lib/integrations/marp/` to
  `lib/integrations/markdown-it/`. Marp now survives only as the one-way
  **export-to-Marp** bundle (`export:marp`, the Drawing Board). Consumers who
  rendered Lattice decks via their own marp-cli + our config should switch to
  the bundled emulator (`node dist/lattice-emulator.js deck.md deck.pdf`).

- **Changed: the export-to-Marp bundle is now a MARP-NATIVE artifact — it ships
  no Lattice engine.** The bundle is meant to be rendered with **Marp** (the VS
  Code extension or marp-cli); Lattice supplies the deck (splits baked to `---`),
  the **minified** palette CSS (`lattice.css` + `themes/`, the latter now built as
  `dist/themes/*.min.css`), the browser runtime, and Mermaid. New: a
  `.vscode/settings.json` registers the palette via `markdown.marp.themes`, and
  `package.json` pins only marp-cli. Rendering with marp-cli / the VS Code preview
  applies slide splits + palette + CSS layouts; Mermaid diagrams and the
  JS-driven structural components render when the exported **HTML is opened in a
  browser** (the deck's trailing `<script>` tags load `lattice-runtime.min.js`).
  The previously-bundled zero-install emulator (`dist/lattice-emulator.js`) is no
  longer shipped.

- **Two phantom variants are removed: `compare-code mirror` and `kpi target`.**
  Both were declared and fully captioned in their manifests but had no backing
  CSS — `compare-code mirror` rendered identically to bare (the central mirror
  block never covered `compare-code`), and `kpi target` fell through to the
  briefing default. `cards-grid mirror` (a documented no-op on a symmetric grid)
  is dropped from `variants[]` too. Authoring any of these now lints as an
  unknown modifier rather than silently doing nothing. Removing `kpi target`
  also makes the "five layout modifiers" description accurate. Surfaced by the
  manifest-vs-CSS audit (`engineering/decisions/2026-06-15-manifest-css-audit.md`).

- **The Drawing-Board/Workbench "Token system" toggle and the `tokens:` deck
  directive are removed.** They existed for the universal-token migration A/B
  ("does my deck survive the flip?"); that migration is **complete** — there is
  one vocabulary now (universal), so the control retired along with the
  client-side flip machinery (`flipTokens`/`variantize`/the `-u` theme variants).
  A stray `tokens:` line in an old deck is simply ignored (it was Drawing-Board
  only; `marp-cli`/the emulator never read it). `lib/tokens/crosswalk.js` stays as
  the historical old→new map + the regression-lint source.
- **Breaking: the canonical flip is complete — the legacy per-theme token names
  are retired across the engine** (universal-token canonical flip, groups 2–5 —
  see `engineering/decisions/2026-06-11-universal-token-system.md` §11). The 14
  themes + the engine now declare only the new role-based names; rename any BYO
  theme or deck that references the old ones:
  - categorical: `--cN-light` / `--cN-dark` / `--c-ink-light` / `--c-ink-dark`
    → `--cat-N-fill` / `--cat-N-mark` / `--cat-on-fill` / `--cat-on-mark`
  - diagram-structural: `--c-stroke` / `--c-line` / `--c-accent-warm`
    → `--diagram-stroke` / `--diagram-line` / `--diagram-accent-warm`
  - diagram lifecycle: `--c-warm/cool/alarm/mark/note` (+ `-dark` marks)
    → `--diagram-active/done/critical/today/note` (+ `-mark`)
  - surfaces / scheme: `--bg-dark` → `--surface-inverse`; `--dark-*` → `--scheme-dark-*`

  Resolved colours are byte-identical (a pure rename, verified zero-pixel-drift).
  The old→new map lives in `lib/tokens/crosswalk.js` + the ADR §7 table; the
  Drawing-Board `tokens: current` option migrates a legacy-authored deck.
- **Breaking: the sequential colour-ramp tokens `--scale-50 … --scale-900` are
  retired in favour of `--seq-50 … --seq-900`** (universal-token canonical flip,
  group 1 — see `engineering/decisions/2026-06-11-universal-token-system.md`
  §11). The ramp is now anchored on `--seq-500` (themes set it; `base.tokens.css`
  derives the other nine stops via OKLab `color-mix`), and consumers already read
  `--seq-*`. Resolved colours are byte-identical — this is a pure rename that
  frees "scale" from colliding with the typographic multiplier `--fs-scale`. **If
  a BYO theme sets `--scale-500`, or a deck reads `var(--scale-NNN)`, rename to
  `--seq-*`.** (The Drawing-Board `tokens:` toggle resolves both vocabularies for
  decks mid-migration.)
- **Breaking: `@marp-team/marp-cli` is no longer a dependency — the installed
  package is marp-free.** Nothing in the shipped runtime ever imported marp (the
  emulator renders via its own Puppeteer path); marp-cli was pulled only for the
  internal parity gate, the old test oracle, and the benchmark baseline, so
  `npm install @slidewright/lattice` now skips ~42M of marp packages. **If you
  render via the shipped `marp.config.js` (the BYO `npx marp --config-file …`
  path), install marp-cli yourself** (`npm i @marp-team/marp-cli`) — the config
  and the marp-vscode CSS shims still ship, and the Export-to-Marp bundles are
  unaffected (they pin marp-cli for the recipient). The owned `lattice-engine`
  renders every first-party path (the `lattice` CLI + the docs playground); the
  docs playground's `?engine=marp` / `?css=marp` A/B toggle is removed (the owned
  engine is the sole renderer). The marp-vs-engine parity CI gate is retired in
  favour of the per-component semantic-invariant suite. See
  `engineering/decisions/2026-06-12-p4-regression-gate-retire-marp.md`.

### Fixed

- **`image` slides now render their asset regardless of the output directory.**
  The half-canvas/full-bleed image rode in an `<img>` whose deck-relative `src`
  resolved against the *output* directory, so any deck rendered to a PDF outside
  its own folder showed a broken-image placeholder. The image is now a CSS
  `background-image` on the `.lattice-bg` panel, with the asset URL resolved to
  an absolute `file://` URL against the deck directory. Moving off `<img>` also
  retires the 22 `!important` overrides `image.styles.css` carried to beat
  Marpit's `section img` catch-all. Visual output is unchanged (pixel-parity with
  the prior baseline). The half-canvas split now lives in the shared engine
  (class-aware + idempotent), so the docs playground / web runtime render the
  same split layout as the PDF path instead of collapsing it to a broken
  full-bleed. See `engineering/decisions/2026-06-17-image-rearchitecture.md`.

### Added

- **Colour-vision-deficiency accessibility — four first-class CVD themes.** Four
  selectable themes — `a11y-deuteranopia`, `a11y-protanopia`, `a11y-tritanopia`,
  `a11y-achromatopsia` — chosen exactly like any theme (`theme: a11y-deuteranopia`
  in front matter, or the Drawing Board theme picker's "Accessibility" group). No
  separate accessibility axis, directive, or override resolver: an accessibility
  need is met by picking the theme. Because colour alone distinguishes only ~1–2
  categories under dichromacy, each pairs **CVD-tuned status colours** (pass/warn/
  fail moved off the deficiency's confusion axis, verified distinct + AA) with
  **redundant non-colour encoding**: ✓/!/✗ **glyphs** on status pills, a distinct
  **texture pattern** per categorical slot on diagram fills (Mermaid `.section-N`
  and the Mermaid pie) and native chart fills (pie / funnel), and a per-series
  **line-style** on radar. The four share a `themes/a11y-base.css` foundation (the
  texture wiring + greyscale categorical ramp + forced light scheme); each theme
  adds only its status trio. They are **mode-invariant** — a fixed palette that
  ignores the light/dark toggle, so an accessibility render reads identically for
  every viewer (and colour-free decks stay readable by texture + glyph + line-style
  alone, the channels that also survive black-and-white **printing**). The engine
  emits the texture `<defs>` on every render. **The docs site honours them too** —
  picking an a11y theme (anywhere the palette persists) restyles the whole site
  (landing, component portal, Drawing Board chrome), not just the deck preview:
  the portal token generator now flattens each palette's `@import` chain (so a
  thin `a11y-*` palette resolves the full token contract via onyx) and emits
  mode-invariant blocks for them. The theme dropdown is now **one global
  component** (the shared `PaletteControls`, replacing the separate Drawing Board
  topbar) mounted on every surface — landing, playground, workbench, component
  pages, and the Drawing Board — listing the identical grouped set (brand
  palettes, then an "Accessibility · colour-blindness" group); it writes the
  deck's `theme:` on the Drawing Board and sets the site palette elsewhere. New:
  `themes/a11y-*` (+ `a11y-base`),
  `lib/theme/cvd.js` (Machado-2009 simulation), `lib/core/accessibility-textures.js`,
  `tools/cvd-audit.js`. See `engineering/decisions/2026-06-16-colour-blindness-accessibility.md`
  + `…-cvd-redundant-encoding.md`.
- **Editor autocomplete for focus, with a manifest-declared capability.** The
  Drawing Board now completes the `_focus` / `_focusStyle` / `_focusSteps`
  directives, the style values (`spotlight`/`blur`/`ring`/`list-fill`/`pop`), and
  the focus axes — and axis completion is **layout-aware**: a new manifest field
  `focusAxes` declares which axes a layout supports (`compare-table` →
  row/col/cell, a card grid → item, `code` → line), so the editor offers only
  the valid axes per slide. A parity gate ties the manifest, the lint vocab, and
  the completion vocab together so none can drift. Follows the
  `families`/`dataCompletion` self-maintenance pattern
  (`engineering/decisions/2026-06-11-autocomplete-self-maintenance.md`).

- **Focus & highlighting — tell a dense slide to focus the room on one thing.**
  A new `_focus:` directive names an ordinal target with one universal grammar —
  `<!-- _focus: row 4 -->`, `item 3`, ranges (`item 2-4`) and multiples
  (`row 2, row 5`). The focus resolver tags the target `.lat-focus` and its
  siblings `.lat-recede`; the treatment is pure CSS, palette-blind, and survives
  PDF **and** PPTX (no masks). Content-aware default — tables get a **ring**
  (keeps every cell legible), lists/grids get **spotlight** (recede the rest) —
  overridable with `<!-- _focusStyle: spotlight | blur | ring | list-fill | pop -->`
  (`blur` defocuses the rest and gives a list/grid target a subtle lift — the
  literal camera-focus; `pop` lifts the target forward while leaving every other
  row/card fully legible; both survive PDF + PPTX, using only hard-edged shapes
  so they hold up in Apple PDFKit). Axes:
  `item` (list/grid), `row` / `col` / `cell` (table), and `line` (code).
  `<!-- _focusSteps: A | B | C -->` expands one slide into N, walking the focus
  one step at a time (the static-format equivalent of a live build). The
  grammar is linted; worked deck in `examples/focus.md`. Design:
  `engineering/decisions/2026-06-16-focus-highlighting.md`.

- **Present mode — a live presentation player on the Drawing Board, beside
  Practice.** A new **Present** button (in the Slides panel header, before
  Practice) opens a full-screen player meant for presenting *to an audience*,
  where Practice rehearses *your delivery*. It renders the deck through the same
  engine + slide box as the live preview (pixel parity), and adds: clean
  navigation (keyboard, swipe, auto-hiding edge arrows, slide counter +
  progress), three-tier fullscreen (real Fullscreen API on desktop, CSS
  viewport-fill on mobile), a **universal speaker-notes slide-up sheet** (notes
  read through the canonical `notes-core` extractor), and a **dual-screen
  presenter view** (`window.open` + `postMessage`) showing the current + next
  slide, speaker notes, and an elapsed timer, with Window-Management-API
  auto-placement on a second screen where granted. It's the in-app ancestor of
  the player designed for the self-contained `.html` export
  (`engineering/decisions/2026-06-16-lattice-export-format.md`).

- **Proactive "type-ahead" completion in the Drawing Board editor.** The
  completion popup now opens automatically the moment the cursor enters a
  completable grammar context, before any search character is typed — so picking
  a component (and pressing space to cascade into its modifiers) needs no
  keystroke to surface the choices. By default this is scoped to the `_class:`
  directive (component name → modifiers); deck-level directives (`theme:`,
  `finish:`, fence languages, …) keep opening on typing / `Ctrl-Space`. A new
  **"Open suggestions automatically"** workspace preference (Settings →
  Workspace) extends it to *every* grammar context (`Everywhere`) or disables
  proactive open entirely (`Off`). Built on `startCompletion` (an explicit
  completion, so each source's existing "quiet on a bare position" guard yields
  the full list); the grammar classification is a pure, unit-tested
  `typeaheadContext` in `slide-context.js`. Inert when autocomplete is off.

- **Worked exemplar decks — "what good looks like" for Drafting.** A new
  `exemplars/` library of complete, boardroom-grade decks (one concrete fictional
  subject threaded through every slide, declarative takeaway titles, real-looking
  numbers) so authors start from a finished model, not a skeleton of placeholder
  stubs. **All 45 Drafting archetypes** are covered, across the five settings
  (General/Team, Corporate, Academic, Government/Public, Nonprofit) — e.g.
  *Investor pitch*, *Board update*, *Research findings*, *Policy briefing*,
  *Donor pitch*. Each is authored once as the full deck and trimmed to **short /
  standard / full** length variants by a pure, DRY tier filter
  (`lib/exemplars/tier-filter.js`), so a single source models both a lightning
  talk and a full 20–30-minute presentation.
  Design: `engineering/decisions/2026-06-14-worked-exemplar-decks.md`.
- **"Open a worked example" in the Drawing Board's Drafting picker.** Picking an
  archetype now offers the matching worked exemplar deck — a **Short · Standard ·
  Full** length chooser (with live slide counts) and an *Open the example* button
  that loads the real, finished deck into the editor — alongside the existing
  empty-structure scaffold (now the secondary path). The decks are staged as
  content-hashed assets and fetched on demand, then trimmed to the chosen length
  in the browser by the shared tier filter (`exemplar-core` bundle). This is the
  UI half of the worked-exemplars work above: the 45 decks are now reachable from
  the app, not just the repo.

- **A features page (`/features`).** A scannable, segmented capability catalog —
  the comparison page covers "vs. them"; this is the "just us" reference. Built
  as a single catalog table (the comparison matrix's styling, minus the
  competitor columns) with a Feature/Details split, grouped into Authoring, the
  53-layout field-native catalog (by bucket), Theming & brand, Output &
  rendering, Deck-as-code, AI authoring, and Ownership. Marketing prose stays on
  the landing; this page is the reference. Linked from the primary nav and footer.

- **Practice mode is now touch-first, with a guided intro, swipe navigation, and
  autoplay.** Opening a rehearsal lands on a calm **ready** pre-roll — the clock
  holds at 0:00 behind a Start button until you begin — and a first-time
  **walkthrough** (the shared `driver.js` guided tour, remembered after one view)
  introduces the controls; replay it from the **?**. The stage advances by
  horizontal **swipe** (touch/pen) and by auto-hiding overlay arrows that reveal
  on pointer-move / tap / keyboard-focus and fade while presenting — one gesture
  language on mobile, tablet, and desktop. **Autoplay** is a top-bar **Auto**
  toggle: once you start, it dwells each slide for the planner's per-slide target
  (reading-pace + role-weighted, AI-refined when a model is wired) then advances,
  stopping cleanly at the last slide. Keyboard rehearsal is unchanged, with `p`
  to toggle Auto. A **full-screen** toggle (auto-entered on Start, `Esc` to leave)
  reclaims the browser chrome, and on phones held **landscape** the bar + HUD
  compact so the 16:9 stage fills the freed height instead of a letterboxed sliver.
- **The Form composition model is now a first-class, engine-read manifest
  (`lib/forms/`).** Frame + Cell + Tile each get a folder-per-noun catalog
  (`frame/`, `tile/`, `cell/`, `schema/`) with a loader (`lib/forms/index.js`)
  mirroring the component-manifest infrastructure, generated into a machine
  catalog at `dist/docs/forms.json` (new `npm run docs:forms` / `:check`, wired
  into `npm run build`). The engine's `FORM_TOGGLE_SKIP` (the chrome-exempt
  sovereign Frames) is now **derived from the frame manifests** instead of a
  hardcoded array, so adding a sovereign Frame folder auto-updates the toggle's
  skip behaviour — the Open/Closed win (the derived set is behaviour-identical
  to the historical one). See `design/forms.md` §11 and
  `engineering/decisions/2026-06-15-form-implementation.md` §6.

- **A value-demonstrating Form gallery (`design/forms.gallery.md` + committed
  PDF) and a per-feature demo deck (`examples/form.md`).** The gallery makes the
  case for the model — author one block of Tiles, let a consumer select a Frame
  and the same Tiles re-flow — and proves the chart-collapse fix (a full-size
  `piechart donut` and `radar` inside the chrome), the footer-Cell contract (the
  rail no longer collides with the footer text), the masthead bay (`meta:` + a
  `confidential` status chip), the watermark Tile, and per-Cell `fill` discipline
  (`fill-center` vs `fill-anchor` on the same Tile). The payoff sequence carries
  one block of content under `form: standard`, `form: minimal`, and a sovereign
  `split-panel` Frame. See `design/forms.md`. An honest, sourced read on how
  Lattice stacks up against the field: AI generators (Gamma, Beautiful.ai,
  Decktopus, Presentations.ai, Plus AI, MagicSlides, SlidesAI), office suites
  (PowerPoint + Copilot, Google Slides + Gemini, Keynote), code engines (Marp,
  reveal.js, Slidev, Beamer, Quarto, Spectacle), and design/collab tools (Pitch,
  Canva, Figma Slides). It credits each rival's real strengths, makes the
  deterministic/boardroom case with a capability matrix and a cited evidence
  section, answers "isn't this just Marp?", states the bring-your-own-model
  stance (OpenRouter, your key/credits, default Claude Sonnet, plus the
  deterministic-first/prompt-caching/budget-cap cost controls), and concedes
  where Lattice is the wrong tool. Linked from the primary nav and footer;
  research source-of-truth in `engineering/decisions/2026-06-14-competitive-analysis.md`.

- **The LFM standard is now published on the docs site.** The owned standards
  that previously lived only as repo files (`spec/LFM-1.0.md`, `spec/diagnostics.md`)
  now have a web home: a new **Specification** section taught in two registers —
  a plain-words *Understanding LFM* front door for everyone, and the normative
  *LFM 1.0* spec + *Diagnostic Protocol* for implementers. The normative pages
  are generated from `spec/*.md` by `tools/build-spec-docs.js` (npm `docs:spec`,
  with a `docs:spec:check` freshness gate wired into the build), so the site can
  never drift from the canonical spec; repo-relative links are rewritten to site
  routes / GitHub source automatically.
- **Read-aloud in Practice mode — one consistent neural voice, never the
  per-device `speechSynthesis` lottery.** The rehearsal HUD gains a play control
  that narrates each slide's *speaker note* (falling back to the prose snippet),
  with real pause/resume — and barging in cleanly when you navigate. It runs on
  a `VoiceModel` voice ladder (twin of the architect model
  ladder): **OpenRouter audio** (`gpt-audio-mini`, spoken via the
  chat-completions audio modality — OpenRouter has no `/audio/speech` TTS route)
  when you've connected OpenRouter — reusing the same browser OAuth key,
  sub-cent/slide on your own credit, $0 to the project — falling back to
  **Kokoro-82M** (Apache-2.0, ONNX)
  summoned in-browser for a free, offline, no-account voice. `speechSynthesis`
  is a dev-only stand-in, never production. **Settings → Voice** configures it:
  the voice source (Auto · Cloud · On-device · Off), a curated picker of cloud
  and Kokoro voices each with a **play-sample** button, and the on-device
  download/remove. **The on-device (Kokoro) voice is desktop-only** — on a
  phone/tablet the ~80 MB onnxruntime load is the unreliable, memory-heavy path on
  Safari/iOS, so it isn't offered there; **mobile uses the cloud voice**, which
  needs no download. (The Settings Voice tab and the Practice control both reflect
  this: no download UI or On-device source on a coarse pointer, and a cloud-needed
  prompt in its place.) Playback uses **WebAudio** (an `AudioContext` resumed on
  the tap) so **iOS/Safari** permits the audio synthesized/fetched a moment later —
  it otherwise blocks programmatic playback after the async gap ("downloaded but
  silent") — and so it ignores the hardware ringer switch; on desktop the Kokoro
  model loads in a **same-origin worker** (off the main thread). The Practice
  button also reflects a **cached-but-not-loaded** model instead of a misleading
  "download" glyph. See `engineering/decisions/2026-06-14-read-aloud-kokoro.md`.
- **The Drawing Board now shows export progress and an error toast.** A
  one-click PDF/PPTX export rasterizes every slide in the browser — seconds to
  tens of seconds on a phone — but the only feedback was low-contrast text in
  the *preview* pane header, invisible from the editor pane where Export is
  tapped (so on mobile a slow export read as "nothing happened / it's broken").
  Export now raises a floating, pane-independent progress card with a
  determinate bar (slide _i_ of _N_ for PDF/PPTX, indeterminate for the Marp
  bundle's asset fetch + `.pptx` assembly), and a **failure surfaces as a toast
  with a one-tap Retry** instead of only a buried status line. The inline
  status still updates for desktop users who watch it. No change to exported
  file content. Fixes the "iOS export doesn't seem to work" report (it works —
  it was the missing feedback). See `docs/src/playground/drawing-board-export.js`
  and `docs/src/pages/drawing-board.astro`.
- **Export to Marp from the Drawing Board (the "Marp bundle" export).** The
  Export menu gains a **Marp bundle (.zip)** item that produces the same
  portable bundle as `npm run export:marp`, assembled in the browser: it bakes
  the slide splits into literal `---`, fetches the (minified) engine, stylesheet,
  runtime, mermaid + the deck's palette, and zips them with a `marp.config.cjs`
  + README via JSZip. The CLI and the browser share one pure spec
  (`lib/core/marp-bundle.js`) + split baker so they can't drift. The bundle now
  ships **minified** JS/CSS under the canonical names (emulator 1.5 MB → 360 KB)
  and DEFLATE-compresses to ~1.2 MB. Completes
  `engineering/decisions/2026-06-13-export-to-marp.md` (P3).
- **The bundled CLI now exports PPTX and PNG natively — no marp-cli.**
  `lattice deck.md out.pptx` writes an image-per-slide PowerPoint, and
  `lattice deck.md out.png` writes one PNG per slide (`out.001.png`, …). The
  output extension picks the format; `.pdf` still produces the vector,
  selectable-text PDF. PPTX/PNG rasterize from the same headless-Chromium render
  the PDF uses, so all formats are pixel-identical. PPTX assembly uses
  `pptxgenjs` (the same library and image-per-slide model as the Drawing Board's
  browser exporter), so the CLI and web paths emit comparable decks. This is the
  owned, marp-free export path; editable PPTX (marp's LibreOffice variant) is
  intentionally not included.

### Changed

- **Practice mode gets an immersive portrait layout.** On a phone/tablet held
  **portrait**, the rehearsal stage fills the viewport and the chrome floats as
  scrim overlays in the slide's natural top/bottom letterbox (covering no slide
  content): the top bar + edge arrows auto-hide for a clean slide and a tap
  reveals them, while the bottom timing readout stays put. Landscape keeps the
  compact grid (its letterbox is on the sides). A 16:9 slide is still a
  horizontal strip in portrait — this lifts the chrome off it and makes it
  full-width; the screen fills edge-to-edge in landscape.

- **Docs site now prefetches resources to make the in-browser experience feel
  instant.** Two layers, each matched to its cost. (1) Astro's built-in link
  prefetching is on site-wide (`hover` strategy): every internal link warms its
  destination HTML when you point at it. (2) The one heavy asset — the ~554KB-gz
  render engine bundle (`lattice-playground.js`) — gets a connection-first
  warming policy (`docs/src/lib/prefetch-engine.ts`): one decision function,
  identical on desktop/tablet/mobile, that drops a `<link rel="prefetch">` so the
  bundle is cached before a surface needs it. Capability drives it — `4g`/fast →
  eager (on the landing funnel) or on app-link intent elsewhere; `3g` → intent
  only; `2g`/`slow-2g`/`Save-Data`/`prefers-reduced-data` → off; unknown
  connection (Safari/Firefox have no Network Information API) falls back to the
  viewport as a proxy. Plus a `preconnect` to the Google Fonts hosts on every
  page so the webfont round-trip doesn't wait on the render-blocking `@import`.
  No change to what renders — purely a perceived-latency optimization.

- **Practice mode's per-slide time is promoted, and the Prev/Next buttons are
  gone.** The bottom HUD used to bury the slide's budget in a ~0.72rem grey
  "target 0:45" footnote behind two nav buttons. It's now a calm three-zone
  readout — **elapsed** (dominant) · **this slide** · **pace** — where "this
  slide" is a near-clock-weight countdown of the time *left* on the slide that
  flips warm the moment you run over. Navigation moved to swipe + the overlay
  arrows + keys (see Added), so the strip is one legible readout, not a crowd.
  The sliding section spine up top is unchanged.

- **Docs-site live previews now fetch the minified engine runtime + CSS.** The
  Playground, Drawing Board, and every component specimen inject the engine
  runtime and engine stylesheet into their preview iframes; the sync step
  (`docs/scripts/sync-playground-assets.mjs`) was staging the *readable* builds.
  It now stages the already-built minified variants (`lattice-runtime.min.js`,
  `lattice.min.css`) under the same content-hashed URLs — runtime ~1.5MB → 300KB,
  engine CSS ~727KB → 362KB per preview (~2.3MB → ~0.66MB total), with no change
  to what renders. The readable `dist/lattice-runtime.js` / `dist/lattice.css`
  remain the devtools/debug artifacts; the minified builds already backed the
  Export-to-Marp path, so this just shares them.
- **Breaking: the `islands` composition feature is renamed to `form`** — the
  canonical Form / Frame / Cell / Tile vocabulary (`design/forms.md`). The
  deck/section toggle `islands: on | minimal | off` becomes
  `form: standard | minimal | off` (`standard`/`true`/`on`/`yes` all map to
  `standard` — the seam for author-selected Frames); per-slide `islands` /
  `no-islands` classes become `form` / `no-form`; CSS hooks `.isl-*` →
  `.cell-*` / `.tile-*`, custom properties `--isl-*` → `--frame-*` / `--cell-*`.
  `masthead` / `progress` / `watermark` are kept (surviving Cell/Tile concepts).
  Landed lock-step across all three render paths (HARD RULE 1), pixel-identical
  (a control deck renders AE=0 before/after). See
  `engineering/decisions/2026-06-15-form-implementation.md` §7.

- **Per-Cell `fill` discipline on the stage** — `fill-center`, `fill-anchor`,
  and `fill-optical` opt a `form` slide's stage into a board-style content
  distribution instead of the default top-anchored flow (`design/forms.md` §5).

- **Chart spine tokens (`--chart-spine` / `-w` / `-h`) moved to
  `section.word-cloud`.** They lived on the shared `section.chart-frame` block,
  but since the four keyed charts went SVG-native (#240) only `word-cloud` still
  draws a CSS spine from them — so it now owns them. Rendering is unchanged; only
  a consumer overriding these (undocumented) tokens at `section.chart-frame` level
  would need to retarget `section.word-cloud`.

- **The `math canvas` plot fence is now ` ```functionplot ` (was ` ```latticeplot `).**
  The fence is renamed after the library that renders it (function-plot) — the
  same convention as ` ```mermaid ` and the `$$…$$` KaTeX math the same
  component already uses. Lattice never owned the plot config (the fence body is
  function-plot's schema verbatim); the old name implied an abstraction that
  doesn't exist, so it was corrected for honesty. Rendered output is unchanged.
  Internal: the placeholder is now `<div class="functionplot">` (was
  `latticeplot`), and the LFM spec (`spec/LFM-1.0.md` §3.3) documents fences as
  renderer-named, third-party sub-languages. See
  `engineering/decisions/2026-06-13-lfm-standard.md`.

### Deprecated

- **The ` ```latticeplot ` fence is deprecated — use ` ```functionplot `.** It is
  retained as a working alias for one release and will be removed in a future
  major version. Existing decks keep rendering unchanged in the meantime.

### Fixed

- **Slides render fully styled again in the playground, Drawing Board, and every
  browser-engine surface.** The marp purge switched those surfaces from the
  unminified palettes to the **minified** `dist/themes/*.min.css`, whose base
  import is written without a space (`@import"lattice"`). The engine's
  base-inlining regexes required `\s+` after `@import`, so the minified import
  never matched — every palette collapsed to scaffold-only CSS (~7 KB) and slides
  rendered as unstyled raw markup (no theme, no component layouts). Relaxed
  `THEME_IMPORT_RE` / `URL_IMPORT_RE` (`lib/engine/css.js`) and
  `THEME_NAME_IMPORT_RE` (`lib/engine/themes.js`) to `\s*` so minified and
  source palettes inline identically. The CLI/PDF path was unaffected (it
  registers the source themes); the regression was browser-only. Guarded by a
  sweep over the real minified dist palettes in `test/unit/engine/engine.test.js`.

- **`kpi` and `math` eyebrows now use the lint-safe inline-code form, not a
  heading.** Both manifests authored the eyebrow as an `### h3` above the `## h2`
  title — a heading-order violation (and, in `kpi`, two adjacent headings with no
  blank line, which isn't valid markdown). The eyebrow convention moved to an
  inline-code paragraph long ago (`base.modifiers.css` — "not a heading, so it
  never violates heading-order rules"); `kpi` and `math` were the last holdouts.
  Converted every skeleton / sample / variant sample (and `math`'s hand-authored
  gallery) to `` `Eyebrow` `` paragraphs, and repointed the eyebrow CSS + slot
  selectors. Renders identically (mono, tracked, uppercase); the authoring is now
  valid markdown that matches what the CSS supports.

- **The export-to-Marp bundle's `npm install` no longer 404s.** The generated
  `package.json` listed `@slidewright/lattice` as a dependency, but that package
  is unpublished — so a recipient following the README's marp-cli route
  (`npm install` → `npm run pdf`) hit `E404` and never even got marp-cli. The
  engine ships pre-bundled as `dist/lattice-emulator.js` (the README's
  zero-install primary route), so the dependency was both unnecessary and
  breaking; the bundle now pins only `@marp-team/marp-cli`.

- **`compare-prose` verdict variants now render — `chosen` / `decision` /
  `vertical` / `rejected` were silent no-ops.** Their CSS targeted a
  `.compare-prose-inner .card` DOM that no render path emits, so they rendered
  identically to plain `compare-prose`. Re-scoped to the live
  `> :is(ul,ol) > li` structure (the same DOM the working `transition` variant
  uses): `chosen` tints the winner card, `rejected` dims + strikes the dropped
  card, `decision` does both plus a labelled **DECISION** chevron, `vertical`
  stacks the two cards. The cross-cutting `mirror` modifier on `compare-prose`
  was dead for the same reason and is fixed alongside. Surfaced by the
  manifest-vs-CSS audit (`engineering/decisions/2026-06-15-manifest-css-audit.md`).
- **`redline` `split` / `stacked` / `three-col` show their OLD / NEW labels
  again.** A specificity regression in the central blockquote eyebrow rule had
  been overriding them with "KEY INSIGHT". The eyebrow rule now excludes
  `redline` (`:not(.redline)`), so a legal diff never inherits "KEY INSIGHT" and
  the variants' OLD/NEW labels apply unopposed.
- **`citation-card` samples no longer render an empty action item.** The
  `pull-quote` variant hides any gloss line without a bold lead, and the action
  box only fires on a bold-led item — but the skeleton/samples authored
  `- What we must do.` plain, so the action vanished (pull-quote) or lost its
  chrome (default). The samples now bold the action lead per the slot contract.
- **Component manifest descriptions corrected to match what the CSS actually
  renders.** A full manifest-vs-CSS audit found ~30 drifted claims; the prose is
  now aligned. Highlights: `checklist` `[ ]` is a hollow ring (not an "x");
  `title` eyebrow renders *above* the h1 (CSS reorders it); `kpi` pills are
  coloured by row position, not by recognised text; `journey` swimlane dots are
  *coloured* by mood, not sized; `timeline-list` is a horizontal spine with
  stacked items (not left/middle/right); `split-panel watermark` rubric is an
  `h3`; `roadmap` `horizons`/`milestones`, `piechart` donut, `obligation-matrix`
  `asymmetric`, `stats`, and `image museum` captions reworded to the real
  behaviour; several stale CSS header comments fixed to match. See
  `engineering/decisions/2026-06-15-manifest-css-audit.md`.
- **Worked exemplar decks: corrected four copy-paste authoring bugs.** The 45
  worked exemplars (`exemplars/**`) carried authoring forms that lint cannot
  catch but that degrade the render: (1) `list-steps` slides wrote each step as
  an inline `N. Title — body` line, which collapses the title/body typographic
  split into one bold blob — converted to the canonical `N. Title` / nested
  `- body` form; (2) `list-tabular` slides buried the headline figure in the
  description prose, leaving the right-hand meta column empty — lifted the figure
  to the inline-code meta on the name line; (3) `quote` slides printed a literal
  "Attribution" label because the attribution line read `Attribution — Name` —
  the component renders that verbatim, so it now reads `— Name` to match the
  gallery; (4) `kpi` slides authored the eyebrow as an `### ` h3 — #362 retired
  that in favour of the lint-safe inline-code paragraph, so all 38 are now
  `` `Eyebrow` `` paragraphs matching the corrected component. Also removed
  unsupported `` `Owner:` `` pills from a `list-steps` slide (the component has
  no pill slot).
- **`quote` component docs: the copyable example showed the wrong attribution
  form.** `quote.docs.md` demonstrated `Attribution — Person, Role`; the
  component renders that literally (no label is injected), so the example is now
  `— Person, Role`, matching the gallery. This was the source of the exemplar
  bug above.

- **Landing page no longer claims "Fifty-eight layouts."** Two marketing
  strings on the landing said 58; the catalog ships 53. Corrected to match the
  canonical count (`dist/docs/components.json`).

- **Overflow signalling split into authoring vs. delivery — and made
  accessible.** The loud signal (the red ring + a new labelled **"OVERFLOWS"
  corner tab** — text, not colour alone, fixing WCAG 1.4.1) now appears **only in
  the live preview** (VS Code / Drawing Board / playground), where the author is
  fixing. **Exported PDFs no longer burn in the ring** — a red box in front of a
  board is worse than the subtle clipping `overflow:hidden` already does, so the
  export stays clean **and warns the author in the console, listing the exact
  overflowing pages** to fix before delivering. (Previously the ring was burned
  into the PDF.) The export path enforces this two ways: it strips the
  `.overflow` class before printing, **and** drops the live-preview runtime
  (`lattice-runtime.js`) `<script>` tag from the export HTML — without that, a
  deck which embeds the runtime (as the galleries do) would have its
  MutationObserver / ResizeObserver / rAF watcher re-paint the ring and tab
  mid-print. The runtime is a documented no-op for the deliverable (Mermaid is
  pre-rendered to SVG; styling is the embedded `lattice.css`), and dropping the
  tag — rather than intercepting the request per page load — keeps every render
  fast (request interception slowed the 53-component invariants suite enough to
  time out in CI).

- **The Form (`form:`, formerly `islands:`) no longer paints chrome over
  content.** Three real defects are fixed at the root by making the masthead /
  stage / footer **Cells** reserve their boxes (`design/forms.md` §6):
  - **Masthead Cell.** An in-flow, content-height band: the hairline sits
    directly under the title (no dead space under a one-line title; the band
    grows for a two-line title). Components flow in the real stage below it; the
    footer is reserved via `padding-bottom`.
  - **Charts no longer collapse OR clip.** A `piechart donut` (and `radar`,
    `map`, the cohort `quadrant`) under the Form failed two ways: on a roomy
    slide it collapsed to a thumbnail (the `cqh`-against-`flex:1`-figure chain
    can't grow a replaced `<svg>` in print media); on a *dense* slide (2-line
    subtitle + caption) an interim `cqi`-height fix overflowed the squeezed
    `.chart-body` and `overflow:hidden` clipped the ring + legend to a fragment.
    Charts now size to the **`.chart-body` content box** (`container-type:size`
    on the body, `display:contents` on the figure, svg `height:100cqh`), which
    fills the stage reliably in the print context and tracks every chrome combo
    (0/1/2-line subtitle ± caption) — full ring, all legend rows, no clip, HD
    and 4K alike. Scoped to `section.form`. See
    `engineering/decisions/2026-06-15-form-chart-clip.md`.
  - **Footer no longer collides with the progress rail.** The footer Cell
    reserves three non-overlapping horizontal zones (footer-left ·
    progress-centre · pagination-right); footer text yields the reserved centre
    so it can never run through the section label.
  Body overflow is hard-clipped at the stage (`overflow: hidden`) so it can't
  bleed across the chrome Cells; the overflow warning ring still fires. (A soft
  content "fade" at the cut was considered and rejected — it's a scrollable-web
  idiom, false on a fixed page, and hides authored content; see `design/forms.md`
  §6.) All `section.form`-scoped → non-Form (boardroom) decks are
  byte-identical; resolution-invariant (all `cqi/cqh`, no fixed px). Completes
  Defect 1 of
  `engineering/decisions/2026-06-13-islands-sketch-density-collisions.md`
  (the masthead-reservation note's "M1 fixed the donut" claim was stale — the
  donut collapse was still live and is fixed here); see
  `engineering/decisions/2026-06-15-form-implementation.md`.

### Added

- **Export a single chart as a standalone `.svg`.** The four keyed charts
  (pie/radar/map/cohort quadrant) render the diagram, spine, and key as one
  `<svg>` — now you can lift one out of a deck as a self-contained file that
  opens correctly anywhere. `node tools/export-chart-svg.js <deck.md> [--slide N]
  [--mode dark] [-o out.svg]` (or `--all`) renders through the same engine the
  Drawing Board uses, flattens the theme colours to literals so the detached file
  needs no stylesheet, and embeds the fonts it uses as data-URIs. In the Drawing
  Board the same core powers a **"Chart SVG"** entry in the Export menu that
  appears **only when the cursor's slide has a chart**, exporting that one. See
  `chart-family.docs.md` § "Standalone export".

- **Export to Marp — a portable deck bundle (`npm run export:marp`).** Exports a
  deck as a self-contained directory or `.zip` for use outside Lattice: the
  `.md` with its `split: headings` boundaries **baked into literal `---`** (so it
  divides correctly in any Marp tool — incl. the marp-vscode preview — with no
  Lattice plugin), the engine stylesheet + the deck's palette, localized image
  assets, a bundled zero-install renderer, a `marp-cli` config, and a README.
  The baker (`lib/core/bake-splits.js`) shares its boundary computation with the
  live divider (`lib/core/heading-split-core.js`), so a baked deck is proven to
  produce the identical slides. The bundle also packs `mermaid` + the Lattice
  browser runtime and appends two `<script>` tags to the deck, so an exported
  **HTML** opened in a browser renders Mermaid/chart diagrams **and** structural
  components (card grids, split panels, islands, badges) client-side. Full
  fidelity also via the bundled engine / `marp-cli`; stock marp-core (no scripts)
  renders splits + styling + raw fences. See
  `engineering/decisions/2026-06-13-export-to-marp.md`.
- **The Drawing Board Coach can now _fix_ a flagged slide, not just explain it
  — when a capable model is connected.** Each judgement finding (a wall-of-text
  slide, a label-only title — the rules a rule can't mechanically rewrite) grows
  a **Fix** button next to *How to fix*. It asks the model to rewrite just that
  slide, shows the change as a reviewable ± diff, and applies nothing until you
  click **Apply** — at which point the deterministic engine re-scores (the model
  never owns correctness). It reuses the same EDIT-BLOCK protocol and diff card
  as Converse, respects the session budget cap, and caches the prompt where the
  provider supports it. The button only appears on a strong tier (cloud /
  WebLLM); with no model, the deterministic *How to fix* guidance and the exact
  mechanical *Apply fix* are unchanged — the floor loses nothing. The button also
  tracks the live tier — connect or disconnect a model mid-session and Fix
  appears or hides immediately (no deck edit needed). New module
  `architect-fix.js` (pure, headless-tested). See
  `engineering/decisions/2026-06-08-drawing-board-coach-vs-converse.md`.
- **The Architect is now grounded in the presentation canon (cloud tier).** A
  distilled principle pack — Minto, Duarte, Knaflic, Reynolds, and the
  common-pitfalls literature, as our own terse, attributed synthesis of the
  public *frameworks* — feeds the model the *why* behind each finding and how the
  field says to fix it. The cards matching a deck's findings ride the Converse
  prompt (so advice is canon-grounded, not generic), and the one card for a
  finding rides its **Fix** rewrite (so the rewrite follows the principle). New
  pure module `presentation-canon.js` (headless-tested); cloud-tier only, riding
  the per-turn tail so it never invalidates the cached primer. See
  `engineering/decisions/2026-06-13-coach-canon-knowledge-pack.md`.
- **Speaker notes — a non-directive HTML comment is that slide's note
  (Marp-faithful, LFM §3.5).** Any `<!-- … -->` that isn't a directive or a
  tooling pragma (`markdownlint`/`prettier`) becomes the slide's speaker note,
  matching Marp exactly. The emulator now embeds each note as a per-page **PDF
  text annotation** and a hidden **HTML presenter-notes channel**
  (`<aside class="lattice-notes">`), and `--notes` writes a plaintext
  `.notes.txt` sidecar. The PDF annotation is **hidden by default** — embedded
  and tool-extractable, but no icon marks the boardroom slide and it never
  prints; `--notes-icon` exposes a clickable sticky note instead. Extraction is
  single-sourced in `lib/authoring/notes-core.js` and run over the rendered
  slides, so the note index tracks the slide split (including `split: headings`);
  a parity test pins its keep/drop boundary to marp-core's own comment
  collection so the render paths can't drift (HARD RULE #1). Demo:
  `examples/speaker-notes.md`.
- **Breaking: decks divide on headings by default — the `split:` front-matter
  key.** A new deck-wide key chooses how the body splits into slides. The
  default is now **`split: headings`**: the first `#` is the lead slide and
  every subsequent `##` opens a new one, so a deck reads like a document with no
  separators to forget. Set **`split: rule`** to keep the classic
  separators-only behaviour (split only on `---`). The headings divider is
  **eyebrow-aware** — a slide's `<!-- _class -->` directive and its eyebrow
  (a `p` whose only child is one inline-`code` span), written above the title,
  are pulled onto that slide instead of orphaning onto the previous one — and
  **hybrid**: an explicit `---` still forces a break. Implemented as one shared
  `hr`-injection plugin so the Lattice engine, marp-cli, and the playground
  split identically (HARD RULE #1), and **slide-count-identical on every classic
  `---`-separated deck**, so existing decks are unaffected. Settable from the
  Drawing Board's Deck Setup panel; an unknown value warns (`unknown-split`) via
  the deck linter. Demo: `examples/split-headings.md`. Note: stock Marp (incl.
  the marp-vscode preview) doesn't run the divider — Marp portability is served
  by a planned Export-to-Marp bundle; the Lattice engine is the source of truth.
- **LFM — Lattice-Flavored Markdown, named and specified.** Lattice's authoring
  dialect now has a name and a versioned spec (`LFM 1.0-draft`) under `spec/`.
  LFM is defined as a **profile of Markdown** (`CommonMark + GFM task lists + the
  Lattice extension set`), with **graceful degradation** as its governing rule:
  every extension renders as readable Markdown in an LFM-unaware host. Ships
  `spec/LFM-1.0.md` — the extension set, three conformance levels, the
  degradation table (including the one known non-GFM-clean construct, the
  `[-]`/`[/]` state markers), conformance-test shapes per level, security
  considerations for the embedded sub-language fences, governance under a
  **CC-BY-4.0** spec license, and a worked end-to-end example. Also ships
  `spec/diagnostics.md` (the LFM Diagnostic Protocol — the stable finding shape
  and frozen rule registry the deck linter already emits) and a new generated
  artifact `dist/docs/grammar.json`: the machine-readable per-component grammar
  (each `_class` token, its slots + required slots, the modifiers it accepts,
  and the shared state-marker / fence sub-grammars), projected from the
  manifests by `tools/build-docs-portal.js` alongside `components.json`.
  Rationale and the embedding endgame:
  `engineering/decisions/2026-06-13-lfm-standard.md`.
- **Contracts + Layout-swapping — the `inventory` contract (first slice).** A new
  sibling tier (`lib/contracts/`) makes the **Function** layer first-class: a
  *contract* names a Purpose's content shape (slots + cardinalities + one
  canonical DOM + samples), and *conforming Layouts* style that DOM, so an author
  swaps the look for the **same Content** with one class — pure CSS, no
  re-author. Ships the `inventory` contract and four conforming, palette-blind
  Layouts — `layout-ledger`, `layout-cards`, `layout-timeline`,
  `layout-editorial` — bundled into `lattice.css` and recognised by the deck
  linter. Demo: `examples/contract-inventory.md` (one Content, four Layouts). The
  base KEY INSIGHT rule now excludes the `layout-*` tier (contract Layouts own
  their blockquote; pixel-identical for existing decks). Adds the two-register
  vocabulary (`design-system.md §2.5`) the model uses. See
  `engineering/decisions/2026-06-12-contracts-layout-swapping.md`.
- **The deck-setup front-matter panel is now universal — in the Playground and
  the Workbench too, not just the Drawing Board.** The config panel
  (`docs/src/playground/deck-config.js`, relocated from `drawing-board-config.js`)
  gained a `fields` profile so each surface shows the right subset: the
  Playground gets a **Deck setup** drawer (everything except `theme:`, which its
  palette picker owns); the Workbench's Theme + Layout Studios get a state-backed
  **Preview setup** that applies a finish / size / islands to the specimen or
  skeleton preview behind the scenes — so you can audit a theme or component
  under `sketch` without it leaking into the saved asset. Sensible defaults
  (boardroom / clean), full power on tap. Editor front-matter autocomplete for
  `finish:` rides along in the Playground.
- **New `finish:` front-matter key — apply a finish deck-wide by name.**
  `finish:` is a Lattice front-matter extension (orthogonal to `theme:`) that
  names the whole-deck finish in one readable token and propagates it to every
  slide, composing with any per-slide `_class:` (so `finish: sketch` +
  `_class: cards-grid` → `class="cards-grid sketch"`). The open register
  (`lib/core/resolve-finish.js`) ships three values: `boardroom` (the baseline,
  also the omitted default), `sketch`, and `sketch-clean` (hand headings +
  boxes, clean body for dense slides). All three render paths read it, and
  `npm run lint:deck` flags an unrecognized value as an `unknown-finish` warning
  so a typo surfaces instead of silently rendering the baseline. Prefer it over
  `class: sketch` when the intent is "this whole deck is sketch."
- **The Drawing Board surfaces `finish:` in both the deck-setup drawer and
  editor autocomplete.** The setup drawer gains a **Finish** picker (Boardroom /
  Sketch / Sketch · clean body) next to the theme control — picking Boardroom
  clears the key, since it's the baseline — and typing `finish:` in the front
  matter completes the register names from the same vocabulary the linter
  validates against, so the in-browser editor and the deck-lint stay in lockstep.

- **Guided tours for the docs workspaces.** The Playground, Workbench, and
  Drawing Board each ship a context-sensitive walkthrough (built on driver.js,
  MIT) that auto-runs once on a first visit and replays from a "Tour" button in
  the topbar. Tours are mobile-aware — they switch the active pane/tab to bring
  each step's target on screen — and palette-blind, themed entirely from the
  design tokens. A global **Guided tours** on/off toggle in the Drawing Board's
  Workspace settings governs all three surfaces and takes effect live. Tours
  activate on the production site only — never local dev or Cloudflare PR
  previews (gated build-time via `docs/src/lib/deploy-env.mjs`).

### Changed

- **The docs zone now reads as part of one website, not a bolted-on subsite.**
  The Starlight docs header is reskinned into the same topbar the landing,
  playground, and component pages carry — brand, the full global nav (incl.
  Workbench + GitHub), search, a palette `<select>`, and a light/dark toggle —
  wired to the shared `lattice-docs-palette` / `lattice-docs-mode` keys so a
  palette/mode chosen anywhere on the site carries across the jump. Starlight's
  `--sl-color-*` surface is remapped onto the site palette tokens, so **all 14
  palettes re-theme the whole docs chrome** (header, sidebar, prose, search
  dialog) in light and dark, exactly like the rest of the site. Navigation no
  longer dead-ends at the logo: on tablet/mobile the global links lead the
  sidebar/hamburger menu (Home … GitHub), so you can always get back out.
  Implemented as four small Starlight component overrides (`Header`,
  `ThemeProvider`, `Sidebar`, `MobileMenuFooter`) plus the token remap in
  `docs/src/styles/lattice.css`; no engine or deck behaviour changes.
  **Code blocks** join the theming too: the syntax highlighter switches from
  the default saturated night-owl to the restrained, low-saturation Vitesse
  pair so code sits calmly inside any palette (instead of a cool blue fighting
  the warm themes), and the block's interactive accents — focus ring, copy
  button, active-tab indicator, selection, scrollbar — bind to the palette
  accent. The frame already tracked the palette via Starlight's UI theme
  colours. The topbar's chrome glyphs (menu / moon / sun) now live in one
  shared `chrome-icons.css` imported by both the standalone pages and the docs
  skin (so the two topbars can't drift), and the docs mobile menu button is
  restyled to the same bordered-square toggle the rest of the site uses.
  **The site navigation is now one coherent taxonomy.** The primary nav lives
  in a single shared source (`docs/src/lib/nav.mjs`) consumed by every surface
  — the landing/playground/drawing-board/workbench topbars, the component
  topbar, and the docs header + mobile sidebar — so it can't drift. The two
  overlapping doc links (`Get started` + `Guides`) collapse into one **Docs**
  entry that lands on the Overview hub (now carding into Principles, What is
  Lattice?, Get started, the guides, and Components); the apps (Playground,
  Drawing Board, Workbench) and Components stay as their own entries. The docs
  sidebar is now docs-only — `Introduction` (Overview · What is Lattice? ·
  **Principles** · The story) → `Get started` → `Guides` — with the duplicate
  "Tools" group removed, so the mobile menu no longer stacks two near-identical
  navigations and Principles is no longer buried.
  **Fixed:** hand-written content links were hardcoded to the `/lattice/` base,
  so they 404'd on the Cloudflare (root-base) deployment. Content now uses
  base-less root-relative links and a `rehype-base-links` plugin prefixes the
  active base at build, so they resolve under both deploy targets; a branded,
  navigable **404** page replaces the dead-end. **Card icon tiles** keep their
  distinct per-card colours, but now drawn from each palette's own curated
  categorical series (`--chart-cat1…8`, tuned per palette AND light/dark, newly
  exposed to the docs) instead of Starlight's fixed rainbow — so they stay
  distinct yet on-palette with AA contrast in every theme and mode.

- **The CI visual-correctness gate is now a per-component semantic-invariant
  suite** (delivering the P4 pivot away from the retired pixel gate). Every
  component's example renders through the real emulator and is asserted on the
  *meaning* of its DOM, not its pixels — required slots resolve, no overflow,
  headings meet WCAG AA contrast, and transforming components render their real
  output (a chart's list → an `.chart-body` frame, glossary → a `<table>`, etc.).
  53 components, deterministic and machine-independent (no cross-runner flakiness),
  runs in the integration tier. See
  `engineering/decisions/2026-06-12-p4-regression-gate-retire-marp.md` §0.
- **The Drawing Board's Practice mode is now a real rehearsal coach.** It used to
  pace you against a word-count target and drop a one-word cue in the top bar.
  Now a **rehearsal planner** (`drawing-board-rehearsal.js`) turns the deck +
  your talk length into a per-slide plan — dwell time, a one-line *why*, and
  timed **coaching beats** (pause / look up for eye contact / breathe / signpost
  a section transition / emphasize) that surface at their moment over the slide.
  The plan is deterministic and instant by default (role + density heuristics,
  the proven floor, works offline); when a **capable** model is connected (cloud
  OpenRouter or a desktop WebLLM tier) it **auto-tailors** the pacing, rationale,
  and beats to *this* deck — reading a snippet of each slide's prose — memoised
  per deck-revision so an unchanged deck never re-bills and re-opening after an
  edit re-assesses. The cloud path honours the session **budget cap** and records
  spend in the tally, exactly like the chat; tiny/built-in tiers keep the proven
  floor rather than overriding it with weaker output. The start screen suggests a
  length from deck density and shows a **whole-deck read** — how the time splits
  (the ask %, the opening %), whether the deck fits the length, front-loading —
  recomputed live as you change the length (deterministic — opening it never
  bills). During the run, a **pace-aware "over time" nudge** surfaces once you
  linger past a slide's budget, keyed to your actual dwell. Guidance
  moved off the cramped top bar into a **single coaching pill on an unassuming
  gradient scrim** over the lower stage — it carries the slide's ambient guidance
  and becomes the timed beat at its moment — so the close button no longer shifts.
  And the stage now renders through the shared slide-box contract (`frame-css`),
  centring each slide exactly as the live preview does — fixing the slides that
  "rode high" — plus a no-zoom viewport that kills the iOS double-tap zoom. See
  `engineering/decisions/2026-06-08-architect-coach-features.md`.

- **Practice's running chrome is redesigned for legibility and stage room.** The
  top bar is now a pure **locator** — a per-slide progress **spine** that ticks
  each section boundary and names where you are (current section + position),
  with the **next section previewed** (`next · The ask`) so a transition never
  surprises you. All timing moved off the top into a composed **bottom HUD**: the
  clock is the dominant focal point, with pace and target grouped behind a
  hairline, balanced between Prev and Next. Pulling the clock and pace off the top
  edge hands that height back to the slide — the rehearsal stage is taller on
  every form factor. Responsive across desktop · tablet · mobile (the
  next-section preview drops on mobile to protect the width). See
  `engineering/decisions/2026-06-08-architect-coach-features.md`.

### Fixed

- **Practice's progress spine no longer barcodes — or breaks the layout — on a
  long deck.** The spine rendered one segment per slide with a fixed minimum
  width, so a 78-slide deck packed ~78 ticks past the viewport width; the
  overflow then widened the whole overlay and pushed the **Next** button off the
  right edge on a phone. It's now **one segment per section**, each sized to its
  slide count and filled left-to-right by your progress within it — a clean
  handful of bars at any deck size, and it can never widen the bar.

- **Practice slides no longer "ride high" on iOS.** The rehearsal stage centred
  each slide in a container sized with `100vh`, which inside an iframe on iOS
  Safari resolves to the *main* viewport rather than the iframe's box — so the
  slide centred against the wrong height and sat too high. The stage now fills
  its real container responsively (`height: 100%`) and the fit measures the
  iframe's own content box (`clientWidth/Height`) instead of viewport units, so a
  slide is centred identically on every browser. (The earlier "rode high" fix
  centred correctly on desktop but never reached iOS.)

- **Practice mode no longer mis-counts a `split: headings` (or fenced-`---`)
  deck as a single slide.** It re-implemented slide-splitting with a source
  regex that only knew about top-level `---`, so a deck the engine divides by
  heading collapsed to one giant slide — producing an absurd suggested length
  (e.g. "154 min for 1 slide") and a dead **Next** button. Practice now derives
  its slides from the engine's rendered `<section>` list (the authoritative
  segmentation, shared with the live preview), so the rehearsal plan, the
  whole-deck read, and navigation always match what the deck actually renders.
  The source split remains only as a fallback when the engine isn't ready.
- **The docs-site live preview no longer flickers, flashes, or leaves a dead
  scroll gap — and all four preview surfaces now share ONE controller.** The
  Playground, the Drawing Board, and both Workbench studios had each re-rolled the
  same "render → write iframe → scale every slide" routine and then drifted: only
  the Drawing Board had grown the visibility gate (anti first-paint flash) and the
  incremental section patch (anti per-keystroke reload flicker); the Playground
  and the two studios flashed (worst on the 4K jargon gallery, where un-scaled
  slides briefly painted at 3840px), flickered on every keystroke, left ~`SH·(1−scale)`
  of dead trailing scroll below the deck, and the studios weren't even size-aware
  (a `size: 4K` deck rendered 3× oversized). They now all run through one shared
  module (`docs/src/playground/deck-preview.js`, built on the unit-tested
  `preview-virtual.js` split kernel): a `.marpit` visibility gate revealed only
  once scaled, a height clamp that clips the last slide's un-scaled box tail,
  incremental patching of just the changed `<section>`s, and size-awareness
  everywhere. Short decks center in the preview (like the component specimens)
  while tall decks top-align and scroll (`justify-content: safe center`). The
  Drawing Board keeps its cursor↔slide sync, content-visibility virtualization,
  and PDF/PNG export unchanged.
- **Playground action bar fits a phone.** On narrow screens the truncated render
  status (a meaningless one-character sliver wedged between *Preview* and *Deck
  setup*) is hidden, and *Deck setup* / *Galleries* collapse to icon-only buttons
  (labels kept for screen readers and the desktop layout) so nothing overflows.
- **The keyed chart-family diagrams (`piechart`, `radar`, `quadrant`) are now
  responsive — they fill their box and scale with the available height instead
  of collapsing.** The pie disc was a fixed `32cqi` square (tied to slide
  *width*, blind to height), so any vertical squeeze — a masthead band under
  `islands: on`, a multi-line caption, or larger `finish: sketch` type —
  overflowed the flexed body and the slide's `overflow:hidden` clipped it to a
  half-ring; radar/quadrant under-filled and read inconsistently sized. Each
  diagram now fills its figure's OWN height (`height: 100cqh`, width via
  `aspect-ratio`) with **no per-chart max cap — the parent body is the only
  bound**, so they're a consistent size (radar no longer renders smaller than
  the pie) and shrink to a smaller FULL diagram under a squeeze. Axis/rim labels
  are SVG `<text>` in the viewBox, so they scale with the diagram. The HTML key
  stays a fixed `--fs-body-compact` (reliable proportional text scaling via
  `cqh` in `font-size` isn't achievable in CSS) — but because the diagram now
  shrinks under a squeeze, the freed room keeps the fixed key from truncating.
  (Surfaced by `gallery-jargon`'s `piechart donut` under `islands: on` — #229.)
- **`word-cloud` is responsive-safe under a vertical squeeze.** Its canvas was
  a fixed `85.9×25cqi` box (its absolutely-positioned children give it no
  in-flow size to shrink from); it now keeps that design size but caps at
  `max-width/max-height: 100%` of the flexed chart body, so a masthead band or
  tall caption scales the cloud + key + spine down together (the `wc-svg`
  viewBox `meet` letterboxes them) instead of risking overflow. With this, every
  chart-family graphic now fits its box: the fixed-aspect SVGs (`piechart`,
  `radar`, `quadrant`) fill their figure height, the wide SVGs (`funnel`, `map`,
  `word-cloud`) are width-bound, and the HTML+SVG charts fill width and flex. The
  shared keyed-chart key (the 70/30 rail) stays a fixed `--fs-body-compact` and
  no longer truncates, since the diagram shrinks under a squeeze to free the row.
- **Offline-rendered PDFs now embed the engine's intermediate font weights
  instead of synthesising them.** The self-hosted set the emulator base64-injects
  (`assets/fonts/` + `SELF_HOSTED_FACES`) was missing four faces the engine's
  `@import` actually requests — `Outfit 300/500/600` and `Shantell Sans 500` —
  so committed/offline PDFs faux-interpolated every `font-weight:300/500/600`
  body run (titles, `section strong`, meta/labels, sketch body) from the 400/700
  cuts. All 17 faces are now self-hosted on both PDF paths, matching what online
  renders already showed. A new **`fonts:check`** parity gate
  (`tools/check-fonts.js`, run by `build:check` and pre-commit) fails the build
  if the `@import` demand and the two offline supplies (the emulator's
  `SELF_HOSTED_FACES` + `assets/fonts/`, and the Drawing Board export's
  `font-embed.js`) ever drift again — closing the silent-font-fallback class of
  bug that the `finish: sketch` body-drop first surfaced.
- **Jargon gallery — closing-accent slide no longer overflows.** The final
  `closing accent` slide ran its body off the top and bottom of the frame (the
  "very thorough" punchline was clipped) in the default boardroom render; its
  body is trimmed to fit while keeping the joke. Same pass trimmed copy on a few
  slides that only overflowed under `finish: sketch` (`featured mirror`,
  `image full`, the `cards-grid compact` heading) and removed two zero-coverage
  appendix duplicates (the portrait `image full dark` stress-test slide that
  admitted it had "never been used in a real deck", and the `image left` slide
  that rendered pixel-identically to its `image mirror` alias) — 80 → 78 slides.
  Filed `engineering/decisions/2026-06-13-islands-sketch-density-collisions.md`
  documenting the broader islands/sketch chrome-reservation collisions the audit
  surfaced (not yet fixed; `islands: off` is the current workaround for dense
  decks).
- **The `lib/engine` render path now produces the full islands model** — the
  `islands:` toggle, the masthead `meta:` island, the footer progress-rail, and
  the section watermark. The engine only resolved the masthead band before, so
  `islands` decks rendered through the engine (the emulator after the P2 flip,
  and the Drawing Board / playground) lost their meta/progress/watermark islands.
  The toggle now runs before the transformer registry (so masthead-lift sees the
  `islands` class) and the three injectors run after, matching marp.config.js's
  render-hook order exactly.
- **`featured` and `compare-code` layouts now render under marp-cli and the
  marp-vscode preview, not just the emulator.** Both transforms — the featured
  hero/sub-card grid and the compare-code two-column structure — were bespoke to
  the emulator's `parseSlide`, so the marp-cli render path and the runtime emitted
  a plain `<ul>` (featured) or a flat `<p><code>`/`<pre>` sequence (compare-code).
  Migrated into the shared transformer registry (`lib/transformers/featured.js`,
  `compare-code.js`, with kernels in each component folder), so all three render
  paths agree. Emulator default output is byte-identical; engine↔marp parity holds.
- **Body copy now scales with the slide in every preview — it no longer
  collapses to a fixed ~10px (tiny on a 4K slide) while headings scaled.** The
  `--fs-*` typography tokens were the one family of section-OWN `cqi` properties
  never wired into the `--_sec-1cqi` hook that padding and the accent border
  already used. `section{container-type:size}` forbids the section from querying
  its own `cqi`, so its `font-size:var(--fs-body)` — which every gfm body element
  (`p`, `ul/li`, `td`, `blockquote`, …) inherits — fell back to the ICB; that's
  the slide only on the canonical emulator/print path (viewport = slide), but in
  an iframe/VS Code preview the ICB is the editor pane, so body text rendered
  pane-relative and shrank to a third of its size on a 4K slide. The `--fs-*`
  tokens now route through `var(--_sec-1cqi, 1cqi)` (`base.tokens.css`), so the
  docs-site preview/export AND the VS Code preview all render body copy at the
  intended size, while the `1cqi` fallback keeps the canonical/print render
  byte-identical. Headings were always correct (they're children, not
  section-own). The same root cause hit a handful of section-OWN **spacing**
  properties — chart-frame's footer safe-band, KPI's header-clearance padding,
  math/redline/citation grid gaps — so the `--sp-*` scale was given the same
  treatment (and the three remaining bare-`cqi` section-own literals —
  `chart-frame` padding, `citation-card.margin` columns, `accent` border —
  were wrapped too), closing the whole class. Affects rendering only; no
  authoring change, and the canonical/print render is byte-for-byte unchanged
  (verified by pixel-diff across the KPI + chart galleries).
- **`size: 4K` decks now preview and export correctly in the docs-site Drawing
  Board and Playground — they no longer render ~3× oversized, and PDF/PPTX
  export the full slide instead of a cropped corner.** The owned engine resolves
  the deck's
  `@size` geometry correctly (a 4K deck is a real 3840×2160 box), but every
  browser host that scales and exports the slide hardcoded HD: the preview
  fit-scaled by `w / 1280` (so a 3840-wide slide overflowed 3×) and the image
  exporters captured a 1280×720 crop onto a 1280×720 page (the top-left ninth of
  a 4K slide). The render now reports its resolved box (`render()` →
  `{ html, css, width, height }`), and the preview fit (Drawing Board +
  Playground), virtualization placeholder, print page, and export page/raster
  size all derive from it — so a
  4K deck previews identically to HD (same 16:9, just fit-scaled) and exports at
  native 4K. A `size:` edit now also forces a full preview rebuild (the box is
  baked into the iframe). Also fixed: image-PDF/PPTX content slides no longer
  show a full-slide rainbow fill — html-to-image mis-rendered the spectrum
  ribbon's gradient `border-image` as a whole-element fill, so the ribbon is now
  repainted as a thin top background strip during rasterization. Docs-only; the
  published engine and the marp-cli PDF path (which already sized 4K from the
  Puppeteer viewport) are unchanged.
- **The docs-site live preview now loads the sketch hand fonts — `finish:
  sketch` decks no longer render hand headings over a clean-sans body.** Each
  preview slide renders into an `srcdoc` iframe whose `<style>` concatenates the
  frame CSS before the theme CSS, which demoted the engine's Google-Fonts
  `@import` past the first-rule position where CSS honors it — so the iframe
  registered none of its own webfonts and showed only the faces the parent docs
  page happened to load (Playfair/Outfit/JetBrains). Caveat/Shantell were absent,
  so sketch headings fell to a system hand font (still hand-looking) while body
  fell to a system sans. The preview now registers the vendored faces directly
  (`previewFontFaceCss()` → `data.previewFontCss` for the Drawing Board's
  `writeFrame`; a lazy import in the shared single-slide renderer
  (`docs/src/lib/single-slide-render.ts`) for the landing hero, restyle and
  field-card islands, and the component specimens). Docs-only.
- **Drawing Board PDF / PowerPoint exports now embed every web font — body
  text on `finish: sketch` decks no longer drops to a system fallback.** The
  image exporters rasterize every slide through html-to-image, which chased the
  engine CSS's cross-origin Google-Fonts `@import` and lost a lazy-load race:
  Marp's template loads each face only for the active slide, so a font first
  needed by an off-screen slide (notably the Shantell Sans **body** face of a
  sketch deck) hadn't finished loading when its slide rasterized, and that slide
  fell back to a clean sans (headings kept Caveat only because a bookend slide
  was active). The export now vendors every engine text face (latin subset,
  Noto Color Emoji excluded) and hands html-to-image a precomputed data-URI
  `fontEmbedCSS`, so each rasterized slide is self-contained and all fonts embed
  deterministically. Affects PDF and PPTX (shared rasterizer); the vector
  `Print` path was never affected. Docs-only; the published engine and its
  Google-Fonts `@import` are unchanged.

### Changed

- **The four keyed charts (`piechart`, `radar`, `map`, cohort `quadrant`) now
  have SVG-native legends + spines — each chart is one self-contained, uniformly
  scaling unit.** The diagram, gradient divider spine, and key now share a single
  `<svg>` viewBox instead of a CSS 70/30 grid with an HTML legend, emitted by a
  shared builder (`svg-legend.js`) so all four read as **one family**. The whole
  chart scales as one with the container (no `cqh`-in-`font-size` drift): the key
  grows on `cover`, shrinks proportionally under a squeeze. The legend font is a
  **fixed ratio of the diagram height**, so the key renders at the **same physical
  size on every chart** regardless of each diagram's own viewBox; a pathological
  long-tail key grows the **viewBox height** so the whole unit scales down
  together (the 11-slice pie no longer clips). Labels **wrap fully — no
  ellipsis**; the swatch centres on the first line; every colour stays on palette
  tokens, and the labels route through `--font-label` so the `sketch` finish still
  reskins them in the hand sans. The map's swatches mirror its region fills
  (highlight hue / choropleth ramp), with group headings and a hollow `?` chip for
  unmatched names; radar/cohort reference series keep a quiet swatch. The key text
  is re-stated in an SVG `<desc>` so screen readers still hear the names + values
  (the chart is one `role="img"`). See
  `engineering/decisions/2026-06-13-svg-native-legend.md`.
- **PR reviews now get an inline before/after of any intended visual change.** A
  non-gating `golden-diff` CI job diffs THIS PR's committed gallery goldens
  against the base branch, rasterizes only the slides that *visually* changed (the
  pixel-diff filters out PDF byte-churn, so a rebuild-only golden reads as "no
  visual change"), and posts a sticky PR comment with the before │ after │ overlay
  montages embedded **inline** (hosted on the orphan `ci-drift-images` branch; the
  full set also uploads as the `golden-diff-changes` artifact). It compares two
  *committed* PDFs on one runner, so it's deterministic — unlike the pixel gate
  below.
- **The pixel-regression gate was _not_ adopted as a CI gate — P4 pivoted to
  per-component semantic invariants.** `npm run regress` (fresh render == committed
  golden) ships as a **local** spot-check only: across GitHub's runners Skia's
  CPU-dispatched rasterization isn't bit-identical (it flaked ~0.4–2% on a
  *different* gallery each CI run), and post-marp a self-golden pixel gate measures
  *change*, not *correctness*. The CI visual-correctness gate becomes the
  semantic-invariant suite (render via `lib/engine` → assert computed-style /
  structure; deterministic + machine-independent). See
  `engineering/decisions/2026-06-12-p4-regression-gate-retire-marp.md` §0.
- **The emulator (the `lattice` CLI / shipped `bin`) now renders through the
  owned `lib/engine` — one markdown implementation, the same engine that powers
  the marp-cli path.** The bespoke `parseSlide` regex parser the emulator shipped
  with is retired; the `LATTICE_EMULATOR_ENGINE` opt-in flag is gone (the engine
  is the only path). The swap was gated to **zero regressions** by a full-corpus
  per-page render A/B harness: every deck renders the same or better. The one
  visible render change is a **GFM-correctness improvement** — bold/emphasis
  markers inside inline code (`` `**x**` ``) now stay literal instead of being
  parsed as `<strong>`, matching CommonMark + the marp-cli path. Math (KaTeX) and
  syntax highlighting are handled by the engine; the deck-logo + island injectors
  still run in the emulator (they key off `data-lattice-slide`, stamped after the
  engine renders). See
  `engineering/decisions/2026-06-11-emulator-on-engine-p2.md` (P2 step d).
- **The reference trio's chart palettes are re-tuned to the quality bar they
  set.** `cuoio`, `indaco`, and `onyx` previously sat at grade C/C/B on
  `npm run scorecard` — the brand-triad curation that gives them tight brand
  affinity also clustered their categorical hues, which the scorecard penalises.
  Surgical, identity-preserving nudges (categorical pigments held to ΔE ≤ 0.05;
  chart-only `info`/`mute` free; semantic trios left untouched) lift all three to
  **B** (cuoio 83.6, indaco 85.2, onyx 89.2) with the hard chart-contrast gate
  still green. The standout fix: **onyx's `at-risk` gantt/kanban state was olive,
  nearly indistinguishable from its green `done`/`live`** — it's now a proper
  amber, so a blocked-but-on-track bar finally reads as a warning. onyx stays
  achromatic (its category grays are chroma-locked); indaco's change is
  imperceptible; cuoio's charts read a touch more vivid (more categorical
  separation). The previously-curated values remain in git history.
- **The `sketch` finish now hand-draws the metadata pills / badges too.** The
  shared `--pill-radius` (a machine-perfect `999px` lozenge) becomes a wobbled
  hand-drawn chip corner under `sketch`, so every metadata pill, state-marker
  chip, and label badge rides the hand like the cards around it (their text was
  already on the hand face). One token override; no per-component selectors.
- **Playground / Drawing Board now render via the owned `lattice-engine` by
  default** (HTML + the owned CSS emitter), with marp-core demoted to the
  `?engine=marp` / `?css=marp` escape hatch and live A/B oracle. The owned path
  reached full pixel parity with marp-core across the gallery corpus + the 89pp
  baseline and renders ~2.6× faster. The default `renderEngine` workspace pref and
  the playground module both flip to `lattice`. marp-core stays bundled for now;
  removing it is a later phase. (Docs-site only; the PDF/build path is unchanged.)
  - **Fix (dark mode):** the owned CSS emitter only resolved `@import 'lattice'`,
    so every `*-dark` theme — a thin wrapper (`@import '<base>'; :root{color-scheme:
    dark}`) — collapsed to a scaffold-only ~2 KB sheet (no tokens), rendering dark
    slides as unstyled near-black. The theme store now resolves theme-to-theme
    `@import 'name'` recursively against the registered themes, so all 13 dark
    wrappers inline their base palette + the lattice base. Guarded by a real-theme
    sweep in `test/unit/engine/engine.test.js`.

### Added

- **Workbench component bridge — local components reach the Drawing Board.** A
  CSS-only component authored and saved in the Workbench Layout Studio is now
  usable in the Drawing Board: it completes inside `_class:` (and offers its saved
  skeleton) marked *local*, renders live the moment a slide opts into its class,
  and **every Markdown export vendors only the components the deck references** as
  self-contained `<style>` blocks — so the exported `.md` renders the component
  across all three engine paths (marp-cli / emulator / runtime), not just in the
  browser. PDF / PPTX / Print already rasterize the live preview. Detection is one
  pure scan of the deck's `_class` directives that feeds both live render and
  export, so they can't drift. The Layout Studio blocks a local name that collides
  with a shipped component class at save time. CSS-only only; transform-bearing
  components remain graduation-only. See
  `engineering/decisions/2026-06-12-workbench-component-bridge.md`.
- **`islands: true` deck-wide toggle.** One front-matter flag enables the whole
  islands model across a deck — it resolves to the per-slide `islands` class on
  every eligible section, so the masthead band, bay (meta + status), progress
  rail, and watermarks just appear without tagging each slide. Bookends
  (`title` / `divider` / `closing`), the title-grid layouts (`math` /
  `compare-code`), the sovereign split layouts, and imagery are skipped
  automatically; a single slide opts out with `no-islands`. Applied in both
  server render paths (marp-cli + emulator) via one shared eligibility helper;
  build-time only, like the deck-wide `class:` / `logo:` directives (use a
  per-slide `islands` token in the marp-vscode preview). See `examples/islands.md`.
- **`islands:` deck-wide toggle (`off` / `on` / `minimal`).** One front-matter
  flag enables the islands model across a deck — it resolves to the per-slide
  `islands` class on every eligible section, so the masthead band, bay (meta +
  status), and progress rail just appear without tagging each slide. `on`
  (also `true`) is the full model; `minimal` keeps the band + bay but drops the
  progress rail (adds `no-progress`); `off` (also `false`, the default) is
  disabled. Bookends (`title` / `divider` / `closing`), the title-grid layouts
  (`math` / `compare-code`), the sovereign split layouts, and imagery are
  skipped automatically; a single slide opts out with `no-islands`. Applied in
  both server render paths (marp-cli + emulator) via one shared eligibility
  helper; build-time only, like the deck-wide `class:` / `logo:` directives.
  Surfaced in the Drawing Board **Deck setup** drawer (a three-way select) and
  in editor **autocomplete** (`off` / `on` / `minimal` after `islands:`). See
  `examples/islands.md`.
- **Watermark island (islands model, Phase 2c).** Add `watermark` to an
  `islands` slide and a large, palette-blind ghost of the current section
  number paints behind the content (z-behind, clipped by the section) —
  reinforcing the orientation the progress rail provides. Reuses the same
  divider-derived section model; no-op without dividers. Completes the five
  bay/footer/atmosphere islands of the model.
- **Progress island + island gap/clip contract (islands model, Phase 2b).** On
  `islands` slides, a footer-centre dot-rail orients the audience: it derives
  sections from the deck's `divider` slides and stamps one dot per section
  (current elongated + accented, labelled with the divider title) into every
  islands slide within a section — across all three render paths; absent when
  the deck has no dividers; opt out with `no-progress`. Islands now also keep
  a **defined gap** to their neighbours (a footer safe-area reserve) and
  **clip their own overflow**, so poorly-fitting content is cut at the berth
  rather than bleeding across islands.
- **Masthead-bay islands — `meta:` + re-docked status (islands model, Phase 2).**
  The reserved masthead bay (Phase 1) now carries two islands on `islands`
  slides. A new deck-wide `meta:` front-matter directive (date · owner ·
  classification; ` | ` splits into stacked lines) injects a `.isl-meta`
  island into the bay across all three render paths. And the label-type state
  markers (`confidential` · `wip` · `draft`) re-dock from their corner
  stamp / full-width band into a clean bay chip when combined with `islands`
  (their default treatment is unchanged without it). See `examples/islands.md`.
- **`islands` modifier — the masthead band (islands model, Phase 1).** Opt in
  with `<!-- _class: <layout> islands -->` and the slide's eyebrow + title lift
  out of content flow into a named `.isl-masthead` band (hairline rule + a
  reserved right bay for the meta/logo/status islands coming in Phase 2). The
  body stays a direct child of the section, so components compose unchanged.
  Wired through all three render paths via the shared transformer registry;
  incompatible with `math` / `compare-code` (they drive their own title grid).
  See `engineering/decisions/2026-06-11-islands.md` and `examples/islands.md`.
- **Universal token system — phase 1 (categorical vocabulary).** The overloaded
  `--cN-light` / `--cN-dark` categorical pair gains a self-describing, foreground/
  background-explicit vocabulary: `--cat-N-fill` (pale categorical surface),
  `--cat-N-mark` (saturated stroke / mark / cScale feed), `--cat-on-fill` /
  `--cat-on-mark` (ink for text placed on each). Where the old `-light` / `-dark`
  suffix named a *tier* yet collided with the color-scheme meaning of `--dark-*`
  and the `light-dark()` function, the new names say exactly what a token is and
  where it goes — color-scheme now lives only inside the `light-dark()` value.
  Phase 1 aliases new→old, so values are **byte-identical** (zero visual change;
  all 14 hand-audited / AA-tested palettes untouched) and every existing consumer
  (`mermaid.css`, the chart transforms) keeps resolving through the old names
  while the three render paths' Mermaid bridges read the new names. The emulator's
  offline palette resolver is upgraded to a real recursive evaluator
  (`lib/core/resolve-token-expr.js`: `var()`+fallback, `light-dark()`,
  `color-mix()` in oklab/srgb), the offline twin of `getComputedStyle`, so a
  bridge token may now hold any expression the three paths share. Design,
  crosswalk, and the remaining phases:
  `engineering/decisions/2026-06-11-universal-token-system.md`.
- **Universal token system — phase 2 (diagram-structural).** The structural
  foregrounds move off the overloaded `--c-` junk-drawer prefix onto the
  `--diagram-` group: `--diagram-stroke` (band borders, was `--c-stroke`),
  `--diagram-line` (edges / arrows / connectors, was `--c-line`), and
  `--diagram-accent-warm` (radar's second curve, was `--c-accent-warm`).
  Aliased new→old (byte-identical); the three render paths' Mermaid bridges
  read the new names while `mermaid.css`'s ~90 SVG rules and the radar override
  keep the old names via the alias and migrate later. Demo deck:
  `examples/universal-tokens-p2-structural.md`.
- **Universal token system — phase 3 (status + diagram lifecycle).** The three
  tangled "status" systems resolve into **two honest axes**. (1) A single STATUS
  vocabulary `--status-{pass,warn,fail,info,mute}` shared by the engine
  state-discs and the charts (`--pass/warn/fail` alias to it; info/mute borrow
  the chart family's canonical semantic hues). (2) A *separate* diagram
  lifecycle/annotation axis renamed off `--c-warm/cool/alarm/mark/note` onto
  semantic names — `--diagram-active` / `--diagram-done` / `--diagram-critical`
  (+ paired `-mark` strokes), `--diagram-today`, `--diagram-note` — because a
  gantt "in-progress" tone is not a "warn". Aliased new→old (byte-identical);
  the lifecycle bridges (gantt / notes / error in both renderers) read the new
  names, `mermaid.css` keeps the old via the alias. Demo deck:
  `examples/universal-tokens-p3-status.md`.
- **Universal token system — phase 4 (surfaces / scheme).** Fixes the P9
  collision where `--bg-dark` (a dark *panel* on a light deck — title / divider /
  closing / split rails / code) sat one keystroke from `--dark-bg` (the canvas
  in dark *mode*), opposite roles. `--bg-dark` → `--surface-inverse` (its 8
  component/integration consumers repointed, byte-identical); the `--dark-*`
  color-scheme inputs gain `--scheme-dark-*` names (vocabulary now; the per-theme
  `light-dark()` pairs flip later). `--bg` / `--bg-alt` / `--border` are kept
  as-is — clear and short, not magic. Demo deck:
  `examples/universal-tokens-p4-surfaces.md`.
- **Universal token system — phase 5 (sequential ramp).** Fixes the P8
  collision where "scale" meant two unrelated things — the ordered colour ramp
  `--scale-50…900` *and* the typographic multiplier `--fs-scale`. The ramp is
  renamed to the unambiguous `--seq-50…900` (sequential / quantitative
  encoding). Aliased to the existing stops (byte-identical); the sole consumer
  (the word-cloud heat-ramp) repoints to `--seq-*`, the `--scale-*` anchor +
  derivation stay as the source until the flip. `--fs-scale` is untouched and
  now the only "scale" left. Demo deck:
  `examples/universal-tokens-p5-sequential.md`.
- **Universal token system — phase 6 (chart categorical).** The chart-family
  colour spectrum moves off the bare `--cat1-{hue,fill,ink}` … `--cat8-*` — which
  sat one hyphen from phase 1's diagram `--cat-1-*` — onto its own namespaced
  `--chart-cat-1-{hue,fill,ink}` … `--chart-cat-8-*`. Unlike the earlier phases
  this is a **flip, not an alias**: the bare `cat` name is eliminated entirely
  (the spectrum is self-contained in the chart CSS + transforms, not bridge-fed),
  so the near-collision is gone rather than merely deprecated. Values are
  byte-identical; the theme override hooks `--chart-catN` are unchanged. The two
  categorical systems stay distinct by design (12 diagram band slots vs 8 chart
  slots — Wong 2011), now with names that say which is which. Demo deck:
  `examples/universal-tokens-p6-chart-cat.md`.
- **Universal token system — phase 7 (self-policing gate).** Adds
  `test/unit/palette/universal-token-vocabulary.test.js` — a CI gate that fails
  the build if any phase's vocabulary (`--cat-*`, `--diagram-*`, `--status-*`,
  `--surface-inverse`, `--scheme-dark-*`, `--seq-*`) is left undefined or its
  alias dropped, so the system stays honest going forward. The originally
  planned "move component knobs out of `:root`" is **reclassified, not
  executed**: investigation showed `--chart-fill-*` is already component-scoped
  and `--pill-*` / `--mark-*` / the state-disc knobs are genuine *universal
  component primitives* (consumed by `base.modifiers` + 10+ components) that
  correctly live in base — nothing to relocate. Capstone demo deck:
  `examples/universal-tokens-p7-system.md`. The remaining work (the canonical
  flip off the old names + the post-flip name lint) is documented in the
  decision note.
- **Workbench export bridge — library themes reach the Drawing Board.** A theme
  saved in the Workbench library is now selectable in the Drawing Board's palette
  picker (listed with a *(saved)* suffix), registers with the in-browser engine,
  and renders live — light *and* dark, resolved from its single `light-dark()`
  file. The choice persists in the deck's `theme:` front matter like any palette,
  and every export carries it: **Markdown** embeds the theme's CSS self-contained
  (so a re-import or a lattice-configured `marp-cli` run keeps the palette without
  installing the theme), while PDF / PPTX / Print already rasterize the themed
  preview. Components remain a follow-on slice. See
  `engineering/decisions/2026-06-11-workbench-export-bridge.md`.
- **Theme token parity — all 13 palettes are now fully self-curated.** Every
  shipped theme now defines its own chart-family palette (`--chart-cat1..8` +
  `--chart-state-*`) and its own semantic signal trio (`--pass` / `--warn` /
  `--fail`), tuned to the palette and AA-verified on both canvases, instead of
  leaning on the engine fallback. `carbone` gained the 12-slot `--c1..12`
  Mermaid band scale it was missing (which had left its corner tags and
  diagram fills undefined). The previously-curated `cuoio` / `indaco` / `onyx`
  remain the reference. A new `npm run scorecard` grades every theme on token
  completeness + palette quality, `npm run scorecard:check` and
  `test/unit/palette/token-parity.test.js` gate that no palette falls back to
  the lattice cascade for a contract token, and `chart-contrast.test.js` now
  gates the chart palette of all 13 (was 3).
- **Authoring validator catches two more inline-bold footguns.** The shared
  lint engine (`lib/authoring/lint-core.js` — used by the `lint:deck` CLI, the
  manifest `validate()` gate, and the Drawing Board / coach Architect panel) now
  flags: (1) the **ordered** flavour of the card-style footgun
  (`1. **Title.** body` on `cards-grid`/`cards-stack`/etc., not just the
  unordered `- **Title.** body`), and (2) a new `ledger-inline-title` rule for
  **ledger/numbered** layouts (`list-tabular`, `agenda`, `kpi`, `stats`,
  `list-criteria`, `list-steps`, `timeline-list`, `state-chart`,
  `authority-chain`, `regulatory-update`) authored as an unordered bold lead-in
  (`- **Name.** value`) instead of the numbered ledger shape (`1. Name` /
  `   - value`). These were the gaps that let broken authoring through the
  commit gate and out of the coach. Existing decks/manifests/docs were swept
  clean to satisfy the stricter rules.

- **Playground — "Load a deck" drawer.** The playground's ⚙ insert menu is now a
  slide-in **Galleries** drawer (a labeled grid-icon button, not a gear, so its
  function reads as "browse + load a full deck"). It lists the repo's showcase
  decks — **Jargon** and the **Design system** tour under *Showcases*, plus one
  survey deck per component family (Anchors → Legal) under *By family* — each
  with a slide count. Picking one drops the whole deck into the editor and renders
  it live in the chosen palette. The demoted per-component scaffold actions (reset
  to example / blank skeleton) move into the drawer's *This component* section.
  Local image assets in the loaded decks are inlined as data URIs at build time so
  they render in the sandboxed preview. Docs-site only.
- **Drawing Board — Deck setup drawer.** A new config button in the editor toolbar
  (beside Export — front matter is a document-level setting) opens a slide-in
  drawer for the deck's Marp front matter: theme, slide size
  (16:9 / 4K / 4:3), page numbers, running header & footer, plus a default slide
  class, math renderer (KaTeX / MathJax), and document language. The controls are
  pre-filled from the deck's current front matter and write a managed `---` block
  at the top of the source — so the Markdown body stays content-only, the values
  persist across refreshes (they ride the deck source into IndexedDB), and an
  exported `.md` finally carries `marp: true` + its directives instead of shipping
  naked. The config chip lights when the deck carries non-theme front matter.
- **Drawing Board — theme is now explicit + synced.** The top-bar palette picker,
  the Deck setup drawer's theme select, and the editor's `theme:` front matter are
  three views of one value: picking a palette writes `theme:` into the deck (no
  more silent render-time override), editing a valid `theme:` updates the picker
  and page chrome, and switching decks adopts each deck's theme. Only a registered
  palette propagates — an unknown/typo theme is left in the source but never
  applied (the deck can't render unstyled), with a caution note in the drawer. The
  deck's theme now travels with an exported `.md`.
- **`lattice-engine` owned CSS emitter, opt-in via `?css=engine`.** The owned
  engine can now emit its own theme-packed stylesheet instead of borrowing
  marp-core's packer — the last marp dependency on the playground/Drawing Board
  path. The emitter (`lib/engine/css.js`) faithfully mirrors Marpit's pack
  pipeline (root-replace + the `:not([\20 root])` specificity guard, slide-scoping
  prepend, `::after` pagination-content masking) so the cascade is byte-equivalent
  on the load-bearing rules — closing the mobile-WebKit regressions (collapsed cqi
  spacing, dropped CSS counters) that shelved the earlier P1.1 emitter. Gated by a
  new browser-independent CSS-pack parity test vs marp-core and by full desktop
  pixel parity across the 89pp baseline gallery + the full 65-gallery component
  corpus (`tools/engine-parity.mjs --own-css`). The owned sheet is ~43% smaller
  than marp's pack (drops twemoji / `marp-h1` auto-scaling / scroll-snap baggage)
  and the owned `composeCss` is ~7× faster than marp's packer, cutting the full
  playground render path to ~2.6× faster than marp. Default stays on marp's packer
  pending a real-device check; `?css=engine` (implies `?engine=lattice`) opts in.
- **`dist/lattice.css` now bundles the KaTeX base stylesheet.** `tools/build-css.js`
  vendors KaTeX's layout sheet from the installed `katex` package (font URLs
  rewritten to the pinned jsDelivr CDN, as marp-core does) into the engine bundle,
  so math glyphs are styled by `dist/lattice.css` alone — no marp-core injection
  required. This is what lets the owned CSS emitter reach math parity; it also
  means any drop-in `dist/lattice.css` consumer now renders `$…$` math correctly.

### Fixed

- **`word-cloud` now scales as one unit at any resolution.** The cloud was
  emitted as absolutely-positioned `<span>`s inside a fixed-px (1100×320)
  canvas, so at a larger render (e.g. `size: 4K`) the words stayed pinned at
  their HD pixel sizes while the slide grew around them — the last pure-HTML
  fixed-px chart (#180). The build-time spiral packer is unchanged (its
  coordinates were always an abstract 1100×320 space); only the emission
  changed — the cloud is now a `viewBox="0 0 1100 320"` SVG whose `<text>`
  nodes carry the packer's coordinates as viewBox units, so the whole cloud
  scales crisp with the slide (~3× at 4K), exactly like the pie/radar/quadrant
  SVG members. The canvas box moved from fixed px to cqi (85.9375 × 25cqi); the
  key rail + gradient spine stay HTML (already resolution-stable). All five
  variants verified light + dark at HD and 4K; `.wc-svg` joins the
  `check-svg-scaling` 4K fidelity gate. Fourth slice of the chart
  responsiveness epic (#180).
- **`state-chart` now scales as one unit at any resolution.** The state-machine
  diagram laid its nodes out entirely in fixed px (column gutters, gaps, node
  padding, max-widths, the SVG edge/label/marker strokes), so on a larger render
  the cqi-sized node text grew while the diagram chrome stayed pinned — the same
  fixed-px hazard as the chart caps (#180). Node layout is now cqi, and the
  browser-measured edge overlay (which draws edges/markers/labels in JS px from
  the measured node boxes) rescales every geometry constant by the live cqi
  factor — `S = (section px-per-cqi) / 12.8`, =1 at HD, ~3 at 4K — so edges,
  arrowheads, gap floors, and label metrics track the nodes instead of pinning
  small. All variants (default / curved / lr / inline, light + dark) verified at
  HD and 4K through all three renderers. Page counts unchanged; the px→cqi
  reflow shifts HD geometry sub-pixel, so the committed galleries were
  regenerated (no perceptible change). Third slice of the chart responsiveness
  epic (#180).
- **Chart-family captions no longer leak to the slide edge when a `_footer`
  is set.** A trailing caption paragraph on any chart-frame layout (piechart,
  gantt, radar, timeline-list, …) was only lifted into the centred
  `.chart-caption` when the slide had no footer — the caption matcher anchored
  to end-of-string, and a `_footer` directive makes Marpit append `<footer>`
  after the paragraph, so the caption fell through as a raw full-width,
  body-size `<p>` flush against the slide's left edge. `wrapChartFrame` now
  peels a trailing `<footer>` off before matching the caption and re-appends
  it. Single-source fix — all three render paths and all 13 chart-frame
  layouts. Surfaced on the `gallery-jargon` donut slide; the piechart `donut`
  sample now carries a caption so the case is covered. See
  `engineering/gotchas.md`.
- **The `.below-note` hairline now renders under marp-cli and the marp-vscode
  preview, not just the emulator.** The trailing-`<p>` hairline wrap was bespoke
  to the emulator's `parseSlide`, so the marp-cli render path and the runtime
  (marp-vscode preview) silently omitted it — the emulator had diverged from
  marp on every slide with an editorial below-note (the cross-renderer gate only
  checks page counts). The wrap is now a shared kernel (`lib/core/below-note.js`)
  wired into the transformer registry (`applyToHtml` / `applyToDom`), so all
  three render paths agree. The emulator's default output is byte-identical (it
  calls the same kernel as its last `parseSlide` step); engine↔marp parity holds
  across the full 65-deck gallery sweep. (Mirrors the chart-caption footer-peel
  above — same trailing-`<footer>` handling, applied to the hairline note.)
- **`split-panel` `metric` documented sample now uses `114<em>%</em>`, not
  `114*%*`.** The component's shipped sample + variant caption (in the manifest,
  the generated `split-panel.docs.md`, and `dist/docs/components.{md,json}`) and
  the `split-panel metric` footgun-lint fix-it hint taught `114*%*` to shrink the
  unit — but `*%*` is not CommonMark emphasis next to a digit, so marp-cli and the
  engine emit literal asterisks (only the emulator's lenient parser styled it).
  All those surfaces now use an explicit `<em>`.
- **Inline-code chips no longer flatten code blocks or run eyebrows off the
  slide.** A `white-space:nowrap` on `section code` (added to keep hyphenated
  identifier chips like `--bg-alt` from wrapping at the hyphen) also matched
  `<code>` inside `<pre>` — collapsing every fenced code block onto one
  clipped line — and long backtick eyebrows/labels, which then overflowed the
  slide and tripped the overflow ring. Reverted the blanket nowrap: inline
  code wraps normally again and block code keeps its newlines (the `pre code`
  reset now pins `white-space:pre`). Affected every deck with a `code` /
  `compare-code` slide or a long eyebrow. See `engineering/gotchas.md`.
- **`radar` and `quadrant` now scale with the slide at any resolution.** Their
  SVGs were ceilinged with a fixed `max-height: 360px`, so on a larger render
  (e.g. `size: 4K`) the chart stayed pinned small while the cqi-driven type and
  slide grew around it. The cap is now `50cqh` (50% of the slide height) — the
  same 360px at HD but resolution-independent, so the chart fills its slot and
  scales ~3× to 4K. A new render-based gate (`tools/check-svg-scaling.js`,
  wired into the integration tier) renders a fixture at HD and 4K and asserts
  each chart SVG scales, catching any future fixed-px cap. First step of the
  chart responsiveness epic (#180).
- **Chart borders, rules, and accent stripes now hold their weight at any
  resolution.** Every chart hairline was a fixed `1px` (and the spine `2px`,
  fill/phase accents `4px`/`6px`) — pinned px that visually thin toward nothing
  as the native render resolution climbs (a `1px` rule at 4K is a third the
  relative weight it has at HD). They now route through resolution-stable line
  tokens — `--chart-hairline`, `--chart-spine-w`, `--chart-fill-accent`,
  `--chart-accent-lg` — each a `clamp(<legacy px>, <cqi>, <cap>)` that floors at
  the legacy px (so HD output is byte-identical, no gallery churn) and grows to a
  tight ~2× cap above HD (a hairline never thickens into a bar at 4K/10K). Applies
  family-wide across gantt, kanban, progress, roadmap, map, piechart, quadrant,
  timeline-list, and the shared chart frame. Second step of #180; journey's
  decorative band/curve strokes (a proportional, not hairline, treatment) and the
  state-chart / word-cloud rebuilds remain tracked there.
- **`lattice-engine` pagination now counts like marp-core.** A `paginate: false`
  slide is still counted toward the page numbering, so the next slide reads its
  true absolute position and the total reflects the whole deck (the engine had
  renumbered after a hidden slide and undercounted the total — a deck with a
  `_paginate: false` cover read "1" where marp reads "2"). Caught by the parity
  sweep on the diagram gallery.
- **`lattice-engine` now matches marp-core on fenced code, soft breaks, and
  inline-math delimiters.** A full-corpus visual-parity sweep (the new
  `tools/engine-parity.mjs`, which rasterises every gallery slide through both
  engines and pixel-diffs them) caught three real divergences: (1) fenced code
  rendered as flat monochrome (no `hljs-*` token spans); (2) soft line breaks
  dropped their `<br>`, collapsing multi-line blockquotes (e.g. a math `stats`
  slide's CI/p-value lines) onto one line; (3) inline-math `$…$` had no delimiter
  guards, so currency prose ("$400M … up 28% … $18M") was swallowed as one math
  span and garbled. The engine now wires highlight.js into markdown-it
  (byte-identical spans to marp, Mermaid grammar included), sets `breaks: true`,
  and guards the math delimiters (opening `$` not followed by whitespace, closing
  `$` not preceded by whitespace nor followed by a digit). New direct dependency:
  `highlight.js` (pinned to `^11.11.1` to match the copy marp-core bundles).
- **Drawing Board / playground: decks with YAML front matter no longer render a
  spurious blank leading slide on the marp engine.** `lib/playground/index.js`
  forced the selected palette by prepending a `<!-- theme: … -->` comment, which
  pushed a `---` front-matter fence off line 0 — Marpit then stopped parsing it as
  front matter, emitting an empty leading slide and painting the directives as
  body text. The theme directive is now injected *inside* the front matter when
  present (a leading comment only when there is none). Caught by the parity sweep;
  Drawing Board (docs-site) only.

### Added

- **`@slidewright/lattice/engine`** — an experimental, owned markdown→slide
  engine (`lib/engine/`), the P1 core of the Marp-replacement effort
  (`engineering/decisions/2026-06-10-marp-replacement-proposal.md`). Built on
  `markdown-it` 14, it reproduces Marpit's slide/directive token contract so the
  existing Lattice plugins and the transformer registry run on it unchanged, and
  matches marp-core's per-section HTML structure across the full gallery corpus
  (55/55 decks; twemoji is the one intentional divergence — emoji render via
  font, not `<img class="emoji">`). It does **not** yet replace any shipping
  render path (marp-cli, the playground, and the emulator are untouched). New
  direct dependency: `markdown-it`.
- **`lattice-engine` now emits a complete stylesheet (P1.1).** `render().css` is
  no longer a stub: it composes an engine-owned scaffold with the selected
  theme, resolving `@import 'lattice'` against the registered base palette and
  honouring the `size:` directive's `@size` geometry (`lib/engine/css.js`). The
  scaffold is modeled on Marpit's — load-bearing rules only
  (slide box + `container-type`, pagination pseudo-element, `@page`/print
  fidelity), emitted *correctly* (no `padding:inherit` on the pagination
  number), so themes compose without the `!important` override layer marp-core's
  defaults force. It also reproduces Marpit's one load-bearing CSS-pack step —
  relocating each theme `:root { … }` token block onto the slide `:where(section)`
  so cqi-valued tokens (`--sp-*`, …) resolve against the slide's
  `container-type:size` container rather than the viewport; left on `:root` they
  render fine on desktop Chromium but collapse on mobile WebKit (gaps → 0,
  counters vanish). The marp-only baggage (twemoji img sizing, `marp-h1`
  auto-scaling, full `div.marpit > section` selector prefixing, the `video`
  webkit hack, `scroll-snap-align`) is deliberately absent. A deck now renders to
  a styled PDF through the engine alone, with no marp-core in the loop.
- **The docs playground can render through `lattice-engine` (P3, opt-in).** The
  playground bundle now carries both engines; `window.LatticePlayground` gains
  `setEngine('marp'|'lattice')` and an `engine` getter, and a `?engine=lattice`
  query param selects the owned engine on load. The default stays marp-core, so
  visitors and every existing gate are unchanged — but the Drawing Board now
  doubles as a live A/B harness for the Marp-replacement engine. Themes register
  on both engines, so switching needs no re-fetch.
- **Drawing Board: export provenance + a visible build tag.** Because the two
  engines render pixel-identically (the owned engine delegates CSS packing to
  marp's, so a marp-core and a lattice-engine PDF differ only by the writer's
  random PDF `/ID`), exports now record *which* engine produced them. PDF
  (jsPDF) and PPTX exports stamp the document properties — `Creator`/`Subject`
  carry the engine + Lattice version + build, and a structured `Keywords` string
  (`engine=…; lattice=…; build=…; theme=…; mode=…; slides=…; src=…`) packs the
  full context (the source field is a short FNV-1a hash of the deck markdown).
  The vector Print path encodes the engine into the PDF title (the only field
  Chromium lets us set). A matching `build <hash>` + live engine badge rides the
  Architect header row (right-aligned, stacked) on **PR-preview deploys only**,
  so a tester on a device can read off exactly which deploy + engine they loaded
  without it crowding the topbar. Drawing Board (docs-site) only — no engine or
  package change.
- **The Workbench — Theme Studio (Faculty 1).** A new docs-site page
  (`/workbench`) where you craft a palette from a handful of essential colours
  and watch it derived, contrast-audited, and rendered live on a specimen deck,
  then copy or download a droppable `themes/<name>.css`. Backed by a new pure,
  dependency-free engine module **`lib/theme/`** (`color`, `derive`, `contrast`,
  `serialize`, `starters`, `ai`): an essential set → the full ~100-token Lattice
  contract, repaired contrast-aware to clear WCAG AA in both canvas modes. The
  derivation + contrast maths are the SAME the Node tooling and the palette
  contrast gate use (the gate now shares `lib/theme/color.js`).
  - **AI tier (Phase 2):** one conversational box — *describe* a palette to
    originate ("warm editorial, terracotta") or *ask for a change* ("cooler",
    "navy accent") to adjust; the model infers which from your words (the
    current palette is sent as context), and recent prompts return as
    re-runnable chips. Uses the same on-device / OpenRouter model ladder the
    Drawing Board uses (connection shared through `localStorage`). The model
    only proposes an essential set; the deterministic derivation + contrast
    gate dispose. Degrades cleanly with a "connect a model" prompt when none
    is connected.
  - **Responsive:** a Design · Preview · Contrast tab bar on small screens;
    single-column reflow.

  Docs-site feature + additive engine module — no change to existing layouts,
  themes, or the render path.
- **The Workbench — Layout Studio (Faculty 2, CSS-only).** A second faculty on
  `/workbench` (a faculty switch in the header — Theme Studio ⇄ Layout Studio):
  author a CSS-only local *component* — palette-blind CSS scoped to its own
  `_class`, plus a manifest and a skeleton — and watch it rendered live and held
  to the engine's own invariants by a deterministic gate (tokens-only, `.<name>`
  selector scoping, manifest/skeleton coherence). Backed by a new pure engine
  module **`lib/layout/`** (`gate`, `scaffold`, `starters`): the SAME gates the
  unit tests run, bundled to the browser. Copy the CSS/manifest or download a
  graduation scaffold (`<name>.{manifest.json,styles.css,skeleton.md}` in the
  engine's own `lib/components/<bucket>/<name>/` folder shape). Browser-scoped
  for now. Docs-site feature + additive engine module — no change to existing
  layouts, themes, or the render path.
- **The Workbench — a saved-asset library (IndexedDB).** Both studios gain a
  **Library**: “Save current” persists the work as an asset record
  (`kind:'theme'` / `kind:'component'`), and saved assets load back for editing
  or delete — your crafted themes and components survive a reload. A first slice
  of the asset model (`2026-06-09-drawing-board-asset-import.md`): a dedicated
  `lattice-workbench` IndexedDB store, kept separate from the Drawing Board's DB
  so a first asset slice can't perturb its schema. The record SHAPES are the
  pure, unit-tested repo core (`themeAsset` in `lib/theme/serialize.js`,
  `componentAsset` in `lib/layout/scaffold.js`). Cross-surface reuse (the
  Drawing Board consuming library themes; deck-export materialization across all
  three render paths) is the next slice — the export bridge. Docs-site only.

### Changed

- **Color emoji now load as a webfont.** `lattice.css` adds `Noto Color Emoji`
  to its Google Fonts `@import` so raw unicode emoji can render in color on the
  owned render paths (`lattice-engine`, `lattice-emulator`), which emit emoji as
  plain text rather than twemoji `<img>`. Because Chromium honors an *installed*
  emoji font far more reliably than an `@font-face` one, CI and the cloud session
  hook now also install `fonts-noto-color-emoji`; the SlideWright desktop app
  must ensure a color emoji font is present in its WebView. The marp-cli /
  marp-vscode paths still use twemoji and keep the `:not(.emoji)` carve-outs. See
  `engineering/gotchas.md` "Color emoji needs an installed font on the owned
  render paths".

### Removed

- **Breaking: the Puter cloud tier is removed from the Drawing Board.** OpenRouter
  is now the only Converse cloud (the user's own account, any of 500+ models). The
  Puter backend, its SDK `<script>`, the "Connect Puter" button, and the dual-cloud
  "which cloud is active" chooser are all gone — along with the adapter surface
  (`connectPuter`, `setCloud`, `availability.puterReady`/`.cloud`). Anyone who was
  on Puter falls back to on-device AI or the deterministic floor until they connect
  OpenRouter. Drawing Board (docs-site) only — no engine change.
- **Breaking: `split-brief`, `split-metric`, `split-statement`, `split-steps`,
  and `split-list` are removed** — consolidated into a single **`split-panel`**
  component (the featured-left-panel + supporting-right-zone family; they
  differed only in finish). Migrate: `split-brief` → `split-panel` (default),
  `split-metric` → `split-panel metric`, `split-statement` → `split-panel pullquote`,
  `split-steps` → `split-panel steps`, `split-list` → `split-panel watermark`.
  `split-compare` is unchanged (its right zone is a distinct 2-option grid +
  verdict). The family's `form` is corrected from `split` to `panel`. The dead
  `splitPanelCounter` marp plugin (numbered the removed `split-list`) is also
  removed. See `engineering/decisions/2026-06-07-split-family-analysis.md`.
- **Breaking: the `before-after` layout is removed.** It was `compare-prose`
  with an arrow connector and an accent ring on the second ("after") card — the
  same two-card data shape — so it is now the `transition` variant of
  `compare-prose`: migrate `<!-- _class: before-after -->` to
  `<!-- _class: compare-prose transition -->` (write Before / After as the two
  labels; `banner-tag` still composes). The shared corner-tag / banner-tag CSS
  that had been hosted in `before-after.styles.css` moved to
  `compare-prose.styles.css`; `decision` (which also uses it) is unaffected.
  Part of the layout-redundancy consolidation.
- **Breaking: the `timeline` layout is removed.** It was `list-steps` with
  lighter, shorter rows — the same ordered-steps data shape, dots-on-a-spine
  instead of step cards — so it is now the `timeline` variant of `list-steps`:
  migrate `<!-- _class: timeline -->` to `<!-- _class: list-steps timeline -->`
  (`ol` → numbered discs, `ul` → plain dots, same as before). The Mermaid
  `timeline` *diagram* type and the `regulatory-update timeline` variant are
  unaffected. Part of the layout-redundancy consolidation (see
  `engineering/decisions/2026-06-07-layout-redundancy-analysis.md`).
- **Breaking: the `cards-side` layout is removed.** It was `compare-prose`
  minus the comparison chrome — the same two-co-equal-card data shape (title +
  nested body) — so it is dropped with no alias. Migrate
  `<!-- _class: cards-side -->` to `<!-- _class: compare-prose -->` (identical
  authoring shape: a top-level bullet is the card title, a nested bullet carries
  the body). Part of the layout-redundancy consolidation (see
  `engineering/decisions/2026-06-07-layout-redundancy-analysis.md`).
- **Breaking: the `tldr` and `principles` layouts are removed.** Both were flat
  one-line-item stacks that differed from `list` only in finish, so they are now
  `list` variants: migrate `<!-- _class: tldr -->` to `<!-- _class: list takeaway -->`
  (and `tldr numbered` to `list takeaway numbered`), and `<!-- _class: principles -->`
  to `<!-- _class: list principles -->` (with `lettered` / `roman` / `bullet` still
  composing: `list principles lettered`). The authoring shape is identical (a flat
  `ul`/`ol` of single-line items). Part of the layout-redundancy consolidation
  (see `engineering/decisions/2026-06-07-layout-redundancy-analysis.md`).
- **Breaking: the `subtopic` layout is removed.** Its bright-canvas, centered
  sub-section break is now the `light` variant of `divider` — migrate
  `<!-- _class: subtopic -->` to `<!-- _class: divider light -->` (and
  `subtopic numbered` to `divider light numbered`). The slots are identical
  (optional inline-code eyebrow + `h2` heading); only the dark-vs-light canvas
  differed, which is what the variant now carries. Part of the layout-redundancy
  consolidation (see `engineering/decisions/2026-06-07-layout-redundancy-analysis.md`).
- **Breaking: the `cards-wide` layout is removed.** `cards-stack` now covers
  its territory — three or four full-width rows with substantial per-card
  body — so the two no longer overlap. Migrate any `<!-- _class: cards-wide -->`
  slide to `<!-- _class: cards-stack -->`; the authoring shape is identical
  (a top-level bullet is the card title, a nested bullet carries the body),
  and a fourth row fits with the `compact` modifier.

### Changed

- **Drawing Board: the Architect's name no longer appears twice, and the deck
  gateway grows to fill the panel head.** The redundant "The Architect" panel
  title is gone — the name lives once, in the avatar mark below — so the head
  leads with the deck you're on. The deck-name gateway now flex-grows to fill
  the freed width (left-aligned label, caret pinned to the right edge like a
  real dropdown) instead of truncating at an 11rem cap. The model settings chip
  to its right reserves a constant width, so when its tier word settles async
  (connecting → Cloud / Local / …) the bar no longer reflows sideways. Most
  visible on mobile, where the deck name had the least room. Drawing Board
  (docs-site) only.
- **Drawing Board: the session spend figure now shows tokens too** — e.g. "This
  session: $0.081 (25K tokens)". Tokens accumulate locally from each reply's `usage`
  (recorded independently of cost, so a free model's tokens still count). The
  OpenRouter account line stays dollars-only — `/auth/key` returns no per-key token
  total. Drawing Board (docs-site) only.
- **Drawing Board: the Settings drawer is organized into tabs** — `Workspace ·
  Cloud AI · On-device` — instead of one long scroll (the Cloud AI section had
  grown dense). Each tab is a short pane; the model chip deep-links to the **Cloud
  AI** tab. Arrow-key tab nav + `tablist`/`tab`/`tabpanel` roles. Purely
  organizational — no control changed. Docs-site only.
- **State markers: `[ ]` reconciled to a neutral "todo / pending" across every
  layout, with a new colour-blind-safe `--mark-todo` open ring.** `[ ]` was
  decoded uniformly as `fail` + `✕` (red) everywhere, but it means a *neutral*
  "not yet" in most layouts — checklist `todo`, obligation-matrix `exempt`,
  roadmap `planned` — and only "not met" in verdict-grid. The decoder is now
  layout-aware: those neutral cases emit `state todo state-todo` and render as
  an **open ring on a neutral disc** (the shared `--mark-todo` mask, + a
  `--mark-todo-bold` for `checks-bold`); verdict-grid keeps `fail` + the red
  `✕`. **Breaking (visual):** existing `checklist` / `obligation-matrix` decks
  with `[ ]` items now render those rows **neutral instead of red** — the
  correct reading of "to-do", not "failed". The stable marks (✓ done · – partial
  · ╱ out-of-scope) are unchanged. Marks are vector CSS masks, so they stay
  pixel-crisp across PDF / HTML / raster exports. **`roadmap` now draws its
  state markers from the same shared `--state-mark` mask recipe** (its discs +
  masked symbols, default / horizons / status), so one theme-token set drives
  every chart *and* checkbox in lockstep — no more bespoke per-component glyphs.
- **`roadmap` folded into the chart family.** It is now a chart-frame member
  dispatched by the chart engine
  (`lib/components/chart/_chart-family/chart-family.js`) instead of a standalone
  transformer, and moves from the `progression` disk bucket to `chart` (its
  `function` stays `progression`). The workstream × phase grid now renders in
  the shared `.chart-frame` skeleton — eyebrow → centered `h2` → body →
  caption — with the table (or transposed `horizons` cards) wrapped in a
  `.roadmap-figure`; the grid opts down to the compact content step so a full
  set of rows clears the centered header. Authoring (the Markdown table, the
  `[x]/[-]/[ ]/[/]` markers, every variant) is unchanged.
- **`roadmap` state markers are now colour-blind-safe.** The retired
  fill-level glyphs — the half-filled disc (`in flight`) and the hollow
  outline ring (`planned`) — are replaced by shape-distinct white marks on the
  state-coloured disc: **check / dash / cross / slash** for
  shipped / in-flight / planned / out-of-scope, across the default, `horizons`,
  and `status` treatments. Each state now reads in greyscale and for
  colour-vision-deficient viewers (colour is the redundant channel, not the
  only one), matching the mark vocabulary `checklist` / `verdict-grid` /
  `obligation-matrix` already use.
- **`journey` and `word-cloud` folded into the chart family.** Both are now
  chart-frame members dispatched by the chart engine
  (`lib/components/chart/_chart-family/chart-family.js`) like every other
  chart, instead of standalone transformers. They render in the shared
  `.chart-frame` skeleton — eyebrow → centered `h2` → body → caption — so a
  `journey` or `word-cloud` slide now picks up the same header rule, caption
  treatment, and opt-in `.canvas` surface panel as `progress` / `radar` /
  `gantt`. `journey` also moves from the `progression` disk bucket to the
  `chart` bucket (its `function` stays `progression`); the authoring class
  names (`<!-- _class: journey -->`, `<!-- _class: word-cloud -->`) and every
  variant are unchanged. `word-cloud`'s bespoke frame-mirroring CSS (its own
  `> h2` rule and `.canvas` panel `::before`) is retired in favour of the real
  skeleton. Decks render identically across all three paths; only the visual
  framing of these two layouts changes.
- **The Drawing Board chat now styles Architect replies as they stream**, not
  only once the stream completes. Each token re-renders the accumulated reply
  through the existing zero-dependency `renderMarkdown` (no `unified`/`remark`
  added), coalesced to one paint per animation frame. A new `renderMarkdownStream`
  wrapper holds back the trailing *incomplete* construct (an open ```` ``` ````
  fence, a half-typed `` `code` `` span, a `[label](partial` link) so partial
  syntax never flashes a block that then unwraps; inline emphasis still degrades
  to literal until its closer arrives. The final render is unchanged and exact.
- **Disconnect OpenRouter now has a guardrail.** Forgetting the key (and re-doing
  OAuth) was a one-click action; it now mirrors deck deletion via the `deleteStyle`
  preference — an inline "Disconnect?" confirm bar, or an optimistic disconnect with
  a reversible "Undo" toast (the key is snapshotted and restored on Undo, no
  re-auth). Drawing Board (docs-site) only.
- **Inline code chips are now surface-aware.** The `section code` chip was a
  single context-blind rule (`--bg-alt` fill + `--accent` ink) tuned only for
  the default canvas, so it read as a glaring near-white box on dark bookends
  and the split-panel rail, vanished into `--bg-alt` cards, and went muddy on
  the key-insight panel. The chip now derives its fill and border from its own
  ink via `color-mix(currentColor)`, so it is always a subtle delta from
  whatever surface it sits on, and a new `--code-inline-fg` / `--code-inline-bg`
  / `--code-inline-border` token seam (distinct from the block-code
  `--code-bg` / `--code-text`) lets a surface or theme retune it by rebinding
  one value. The non-flipping dark islands (`title` / `divider` / `closing`
  bookends, split-panel dark rail) rebind the ink to the on-dark tier.
  **Every theme now curates `--code-inline-fg`** — an explicit, AA-audited chip
  ink per palette (light + dark), deepened toward the brand hue where the raw
  accent fell below 4.5:1 on the card wash (brina, cuoio, indaco, laguna,
  magnolia, mustard) or lifted on the dark card (burgundy); the high-contrast
  achromatic palettes keep the accent. See
  `engineering/decisions/2026-06-08-inline-code-contrast.md`.

- **The `list` component is now an equal-fill ledger.** All three registers
  (default pills, `takeaway`, `principles`) now fill the working area — each row
  takes an equal share of the slide height with its content vertically centred —
  so a slide reads edge-to-edge whether it carries three items or the layout's
  max, instead of a small block floating in the centre. Type steps up to the
  message scale (21pt; `principles` to the 30pt display register) and numbered
  counters share a centreline with their text. Existing `list` decks re-flow
  larger and fuller; no source changes needed.
- **Breaking: the `closing` and `divider` heading slot is now `h2`, not
  `h1`.** A deck has exactly one document `h1` — the `title` slide — so a
  `closing` or `divider` slide emitting a second `#` heading made every deck
  fail markdownlint's single-`h1` rule (MD025) and read as structurally
  invalid Markdown. Both layouts now style `h2` (rendered at the same
  `--fs-h1` size, so the slides look identical), and the dead `h1` rules are
  dropped. Migrate `closing`/`divider` slides from `# Heading` to
  `## Heading`; an unconverted `#` heading now renders unstyled. `title`
  keeps `h1` — it is the deck's one legitimate document heading. All shipped
  galleries, examples, and the baseline deck are converted.

- **`kpi` and `stats` no longer require `**bold**` for their numbers.** Both
  now auto-lift the parent list item's lead (the figure) into the display-type
  `<strong>` via `slotLabelLift`, so authors write `1. $2.4B` / `1. 73%`
  instead of `1. **$2.4B**` / `1. **73%**`; typing the bold is an idempotent
  no-op. **Breaking (stats only):** `stats` moves from the inline
  `1. **73%** faster close` shape to the nested shape every other slot layout
  uses — the caption is now a nested bullet:

  ```
  1. 73%
     - faster close
  ```

  The old emulator-only parse-and-rebuild into `.stats-row` is removed (marp
  and runtime already styled the raw list, so the three render paths now
  agree), and the `:has(.stats-row)` CSS fallback is gone. Migrate any
  `_class: stats` slide to the nested shape. `kpi` is unaffected — its decks
  already used the nested shape, so the de-bold is non-breaking. A new
  `number-slot-bodyless-item` lint warning flags a kpi/stats item authored
  without its nested label (the number won't render in display type). See
  `engineering/decisions/2026-06-07-slot-header-auto-lift.md`.
- **`timeline`, `list-criteria`, and `actors` no longer require `**bold**`
  markdown for their slot headers.** These layouts now auto-lift each
  top-level list item's lead text into the heading via `slotLabelLift` (the
  same mechanism `before-after`, `decision`, `statute-stack`, etc. already
  used), so authors write `1. Pilot` / `- Owns the model \`Owner\`` instead
  of `1. **Pilot**` / `- **Owns the model** \`Owner\``. Existing decks that
  still use the bold markdown render identically — the lift is idempotent,
  so `**…**` is now optional, never wrong. For `actors`, a trailing inline
  `code` actor-name pill is kept a sibling of the lifted heading so its
  right-aligned pill placement is preserved. The shipped samples, galleries,
  and per-component docs drop the bold; stale `compare-prose` / `split-list`
  doc text that told authors to write `**Label.**` is corrected to describe
  the automatic behavior.
- **The `split-brief`, `split-metric`, and `split-statement` right-panel
  titles no longer require `**bold**` either.** Same auto-lift treatment —
  their samples, skeletons, and docs drop the bold and use the nested
  `- Title` / `  - body` shape. A new author-lint rule (`split-bodyless-item`,
  also enforced on manifests) catches the one shape the lift *can't* rescue:
  a right-panel item with no nested body (inline `- Title. body` or a bare
  `- Title`), which renders as flat unhierarchied text because the lift needs
  a nested body to know where the title ends. `npm run lint:deck` now reports
  it as an error with the nested-shape fix.
- **Docs site — component search now persists, and the playground gained the
  reference's search + Group-by.** The component reference remembers your
  search term across a click-through to a component page (and the mobile
  drawer close), restoring and re-running it instead of discarding it
  (per-tab, via `sessionStorage`). The playground's component picker is now a
  searchable, groupable popover (fuzzy search + Family/Function/Substance/A–Z
  Group-by, reusing the reference's engine) in place of the long native
  `<select>`. The toolbar is slimmer: the `Insert example` / `Insert skeleton`
  buttons move into a ⚙ menu (selecting a component inserts its example; the
  menu holds *Reset to example* and *Insert blank skeleton*), and the Component
  trigger + Variant select now have a fixed footprint so a long label truncates
  instead of reflowing the bar to a new row. The toolbar is fully responsive:
  on a phone it splits into two rows — Component + Variant (labels stacked on
  top) above, Edit/Preview grouped at the left with the ⚙ at the right below —
  and the page is an app-shell flex column so the editor/preview split fills
  whatever height the bar takes. Both popovers (picker and ⚙) clamp themselves
  into the viewport so they're never clipped at a screen edge.
- **The browsable component reference is now built into the docs site as
  per-component pages.** Each component gets its own focused page
  (`/components/<bucket>/<name>/`) with a live preview that flips to an
  in-browser editor (CodeMirror — the whole sample, no scroll), a left-nav
  component tree with filter, and the full anatomy / slots / variants /
  when-why documentation — all themable live from the topbar palette and
  light/dark, like the playground. A new `/components/` index lands the
  catalog (searchable cards by name, description, or tag). The old
  single-file `dist/docs/components.html` portal is no longer generated;
  the shipped single-file references are now `dist/docs/components.md`
  (human) and `dist/docs/components.json` (agent catalog), and the
  `Components` link everywhere points at the new pages.

- **`split-compare`'s verdict is now a recommended card with a corner tag.**
  The recommendation bar was restyled from a flat full-accent band into a soft
  accent-container card (`--accent-soft` fill, accent border) with a flush
  top-left "RECOMMENDATION" corner tag (accent fill + `--on-accent` ink),
  matching the cards-grid ordered-list corner-tag pattern. The tag is the
  eye-catcher; the recommendation reads as normal body. The right column's
  bottom padding now clears the footer/pagination chrome so the card never
  bleeds into it.
- **`diagram` dark mode now renders natively per slide (dual-resolve), and the
  dark-flip CSS override layer is collapsed.** The emulator resolves the Mermaid
  `themeVariables` to the palette's *dark* branch and bakes the diagram with that
  set when its slide is dark (nearest `_class: … dark`, or a deck-wide dark
  signal) — instead of baking one light SVG and patching it with CSS. This mirrors
  the runtime, which already resolved tokens per-section via `getComputedStyle`;
  the emulator now matches it (parsing the palette CSS at build time, since mmdc
  has no live DOM). Mermaid bakes themeVariables to literal hex, so a light bake
  can't flip on a `section.dark` slide; baking the correct scheme per slide closes
  that gap natively — including Mermaid's own colour-math (edge labels, edge lines,
  arrowheads, sequence text/lines, gantt section titles, ER entity headers). With
  dark now baked correctly, the redundant dark-flip overrides in `mermaid.css` are
  removed (proven 0-pixel-identical under dual-render). ER dark improves: entity
  headers now show their brand category colour instead of a flat grey level.
  Single-scheme decks are unchanged (no second SVG); `LATTICE_MERMAID_SINGLE=1`
  forces the prior light-bake + overrides path. The only Mermaid CSS overrides
  that remain target surfaces no themeVariable controls: journey/timeline axes and
  `treeView` labels/lines (Mermaid emits literal `black`), ER crow's-foot marker
  fill, the ER zebra-row determinism pin, and mindmap branch-colour saturation.
- **`diagram` journey mood-faces get an on-brand fill; treeView reads in dark.**
  Journey faces fill with `--bg-alt` (eyes/mouth/outline stay on `--c-line`) and
  the dashed task→face connectors are restored. `treeView-beta` labels and tree
  lines now use the flipping ink/line tokens so they are legible on a dark slide.
- **`cards-stack` rebuilt on the nested-list card contract.** The title now
  renders **bold by default** (no `**…**` needed) and the nested-bullet body
  resets to normal weight — matching `cards-grid`/`cards-side`. Previously the
  title inherited body weight and the nested body rendered as a raw bulleted
  sublist. Existing `**Title.**`-wrapped slides keep rendering identically.
- **`cards-stack` supports metadata pills.** A trailing inline `` `code` `` on
  a card's title line now renders as a right-anchored pill, the same contract
  as `cards-grid`/`cards-side`. `cards-stack` graduates off the universal-pill
  deny list.
- **`cards-stack` gains a stronger `compact` modifier.** On top of the generic
  spacing shrink, `compact` now drops card body type to `--fs-body-compact` so
  a fourth card fits without crowding.

### Added

- **`agenda` gains five interchangeable styles + page references.** The default
  is now **`ledger`** — a contents page with hand-leadered rows and an optional
  right-aligned page reference (end any item with an inline-code `` `p.15` ``).
  Four opt-in style modifiers swap the structure: **`circles`** (numbers in drawn
  rings), **`rail`** (numbered nodes on a vertical journey line), **`cards`**
  (boxed rows), and **`checks`** (a progress checklist — with `progress-N`, past
  items get a tick, the current one an arrow, future ones an empty box). All five
  are palette-blind and compose with `progress-N`; the `sketch` finish re-skins
  each by hand (wobbled rings/cards/boxes, a wavy rail and active rule, hand
  arrow/tick) by swapping only mark shapes, never colour. **Changed:** a bare
  `agenda` slide now renders as the leadered ledger rather than the former plain
  ruled list — same markdown, new look.
- **A shared legend rail for the colour-categorical charts, and a status key
  for roadmap.** The four charts that encode meaning by colour — `piechart`,
  `radar`, `map`, and `quadrant·cohort` — now share one legend treatment: a
  deterministic **70/30 split** with the chart as the hero in a wide left zone,
  the key a consistent right rail, each centred in its own zone, a gradient
  **separator spine** on the boundary, and labels that **wrap** instead of
  clipping (map's long names no longer truncate). Swatches and label type are
  unified across all four, and the spine reads on both canvases. Separately, `roadmap` now emits a
  **bottom-centre status key** (✓ shipped · – in flight · ○ planned · ╱ out of
  scope) for the marker states actually present, so an emailed deck reader can
  decode the symbols; it is omitted on the `status` variant (already labelled
  per-cell) and `horizons` (its cards carry Now/Next/Later framing). And
  `journey` — a wide board — moves its actor + mood keys from the top-left to
  **bottom-centre** and centres the diagram vertically (all five variants).
  `gantt` (status by bar colour) gains a bottom-centre **swatch + label** key
  for the statuses present, each swatch reusing the bar's exact fill; and
  `word-cloud` joins the 70/30 rail with a vertical **size = frequency** key in
  the right zone. A consistency pass left-aligns every key at a fixed inset off
  the spine (so the gap is identical chart-to-chart), lets `map` fill its zone
  instead of a fixed width, keeps the `word-cloud` cloud clear of its divider,
  opens up `journey`'s bottom keys, and re-centres the `funnel` bands (they
  were drawn right-of-centre). New `--chart-legend-*` /
  `--chart-spine-*` tokens on `section.chart-frame` are the override hooks. See
  `engineering/decisions/2026-06-11-chart-legend-system.md` and the demo deck
  `examples/chart-legends.md`.
- **`roadmap·horizons` now shows the status key too.** The horizons grid sizes
  to its cards (instead of stretching to fill the body) and the figure centres
  the stack, so the bottom-centre ✓/–/○/╱ key sits in the freed space below the
  cards — at full card density, light and dark. It was the one variant the key
  skipped (#178).
- **Editor autocomplete is now a workspace preference (Settings → Workspace).**
  A new on/off toggle (on by default) silences the deck-grammar completion popup
  for authors who'd rather type without it. Persisted in localStorage like the
  other workspace prefs; applied live via a CodeMirror compartment, so flipping
  it takes effect without reloading. Drawing Board (docs-site) only.
- **`sketch` finish — a hand-drawn skin for any deck.** A new Finish-layer
  modifier (`class: sketch` deck-wide, or `_class: <layout> sketch` per slide)
  that swaps Lattice into a hand-drawn register: felt-tip headings (Caveat), a
  legible hand-sans for prose (Shantell Sans), a wobbly accent underline, and
  the card surface of every card-style layout (`cards-grid`, `cards-stack`,
  `verdict-grid`, `decision`, `matrix-2x2`, `pricing`, `featured`,
  `compare-prose`, `citation-card`) redrawn as a sketched box (asymmetric radius
  + offset ink stroke + per-card tilt). The hand treatment reaches every other
  structure that draws its own lines too — table frames + cell rules
  (`compare-table`, `glossary`, `obligation-matrix`, `list-tabular`), boxed
  blockquotes (`quote`, `redline`), bordered/ruled row layouts (`actors`, `list`,
  `checklist`, `agenda`), and the `<hr>`
  divider — under one rule: roughen the lines the deck draws, never invent a box
  (so `big-number`/`stats` pure-type slides and contained photos/`code`/chart SVG
  stay untouched; meaning-bearing borders keep their hue). The finish re-points the
  `--font-display` token (not just heading elements) at the felt-tip face, so the
  metric numerals that ~16 components pin to `var(--font-display)` — `stats`,
  `big-number`, `quote` text, KPI heroes — take the hand face too instead of
  falling through to the theme's serif. The structural "label voice" — eyebrows,
  table column headers, stat sub-labels, KEY INSIGHT, the running header/footer —
  rides the hand SANS too, via a new `--font-label` token (defaults to
  `--font-mono`, re-pointed under `sketch`), so labels read hand-drawn instead of
  "computer"; real `code`/`pre`/math stay on `--font-mono`. Pagination (Marp's
  `section::after`) joins them on the hand label face. The slide's default font
  itself goes hand under `sketch`, so every remaining text node a component
  doesn't explicitly font — emphasis, links, stray prose — is hand too, not just
  the enumerated elements. Plain bullet lists (the `content` / `split-compare`
  layouts) trade the mechanical disc for a hand-jotted en-dash in the felt-tip
  face. Every glyph of prose
  takes a hand face — including label pills/badges (via the `--pill-font` seam);
  only real inline `code` stays monospace. It is palette-blind —
  every stroke resolves through `var(--token)`, so any theme colours it. Default
  is full handwriting; `sketch-clean-body` returns prose to the clean engine face
  for text-dense slides. New tokens: `--sketch-font-display`, `--sketch-font-body`,
  `--sketch-ink`, the engine-level `--font-label` label-voice seam, and
  `--sketch-wave` (the hand-drawn rule). Lives in `lib/base/base.sketch.css`; the two hand fonts join the
  engine's existing Google-Fonts `@import`. The lines a deck draws — table cell
  rules, ledger/agenda row rules, the `<hr>` divider — wear `--sketch-wave`, a
  near-straight pen-waver rendered as a tiling SVG **mask** (shape in the mask,
  colour via `background-color: var(--sketch-ink)`, so it stays palette-blind);
  it's a static image, not the `feTurbulence` **filter** that collapses Marp's
  print scaling, so it survives the PDF. Documented in `lib/base/base.docs.md`; demo at
  `examples/sketch.md`. See `engineering/decisions/2026-06-11-sketch-finish.md`.
- **`carta` palette — warm paper and ink.** A new theme (`carta` / `carta-dark`),
  the blessed pairing for the `sketch` finish: a warm off-white sheet, near-black
  sepia-leaning ink, and a fountain-pen ink-blue accent. Registered in
  `marp.config.js` and `.vscode/settings.json`; contrast-verified.
- **Autocomplete is now self-maintaining, gated by a parity test.** Two new
  optional manifest fields make completion data co-located with the component:
  `families` (opt a layout into a scoped family modifier group, e.g.
  `["state-markers"]` for the `checks-*`/`heat` modifiers — membership now lives
  in the manifest instead of a central by-name list) and `dataCompletion` (the
  layout has a static body-data vocabulary the editor completes, e.g. `map`). A
  new unit gate (`autocomplete-parity.test.js`) asserts completion never offers
  a modifier the linter rejects, that no family token is offered nowhere, and
  that the `dataCompletion` flags match the editor's data-source registry — so a
  future layout/variant/modifier can't be added to the engine without flowing
  into completion. New `npm run new:component` scaffold templates these fields at
  creation. Migration is behavior-preserving (the same layouts get the same
  modifiers); see `engineering/decisions/2026-06-11-autocomplete-self-maintenance.md`.
- **Drawing Board autocomplete reaches beyond `_class:` into the rest of the
  deck grammar.** Four new deterministic, offline completion contexts: the
  registered `theme:` names in front matter (a theme the engine doesn't know
  renders an unstyled deck — caught at the keystroke); the slide directive
  names inside an HTML comment (`_paginate`, `_header`, `_footer`, …) plus
  `_paginate`'s `true`/`false`/`skip` values; the fence language id after
  ` ``` ` (the `mermaid`/`chart` blocks plus the eagerly-highlighted
  languages); and Mermaid diagram/flow keywords inside a ```mermaid fence. The
  Mermaid keyword list is now one source of truth shared with the editor's
  highlighter. Drawing Board (docs-site) only.
- **Family (scoped) modifiers are now discoverable in autocomplete.** The
  `checks-*` icon-style modifiers (and `heat`) on the state-bearing layouts,
  and `canvas` on charts, are cross-cutting section modifiers that apply to a
  *subset* of layouts — so they fit neither the universal nor the per-component
  variant tier and were therefore never **suggested** by the Drawing Board /
  playground class-name autocomplete (they rendered and linted fine). A new
  `FAMILY_MODIFIERS` registry (`lib/components/index.js`, + `familyModifiersFor`
  / `FAMILY_MODIFIER_TOKENS`) scopes them by component name / bucket; the
  docs-portal threads a per-component `familyModifiers` list into the catalog so
  autocomplete offers them **only on the layouts they apply to**, right after
  the component's own variants. `heat` and `canvas` move out of the faux-universal
  `BASE_MODIFIERS` into this tier (still accepted everywhere by the linter). See
  `design/design-system.md` §6.5 (now four tiers).
- **Drawing Board: spend budgeting & alerting for Converse.** An optional guardrail
  in the Cloud AI settings: set a **dollar cap** on this session's app spend and
  choose **Alert** (a toast) or **Stop** (block new sends) when it's reached, with a
  heads-up toast at **80%**. The budget is anchored to the user's real OpenRouter
  credit — the account strip flags a **low balance** (≤20% of a known key limit, or
  below a user-set floor for pay-as-you-go keys) — with the cap as an optional tighter
  self-limit. Checked per turn from each reply's `usage.cost` (no background polling);
  pure `budgetStatus` evaluation is unit-tested. Drawing Board (docs-site) only.
- **Drawing Board: model context windows + an account/spend readout in the picker.**
  Each OpenRouter model row (and the collapsed summary) now shows its **context
  window** (e.g. "200K ctx") alongside price, a **VISION** badge for image-capable
  models, and max-output/modality in the row tooltip. The Cloud AI section gains an
  **account strip**: the OpenRouter balance/usage for the connected key (`$X left ·
  $Y used`, hidden when unavailable) plus a **per-Lattice spend tally** ("Spent via
  Lattice: $A this session · $B all-time") accumulated locally from each reply's
  authoritative `usage.cost`. Drawing Board (docs-site) only.
- **Drawing Board: slide-context autocomplete in the editor.** Inside a
  `<!-- _class: … -->` directive the CodeMirror editor now completes component
  names (chip-tagged by bucket) and then the modifiers legal for that component
  — its own declared variants first, the universal modifiers (`dark`, `scale-l`,
  `silent`, treatments, state markers, …) after, with already-applied tokens
  filtered out. Deterministic, offline, zero model calls: the vocabulary is the
  same compact catalog + lint vocab the Architect already lints against, so
  completion and lint agree by construction. The slide-detection logic is now a
  single shared walker (`slide-context.js`), retiring the per-feature
  backward-walkers that had drifted from the grammar. Drawing Board (docs-site)
  only.
- **Drawing Board: slot-skeleton drop-in and a per-component data-source
  registry for the editor's autocomplete.** On the empty body of a classed
  slide, completion now offers a one-shot `skeleton` that inserts the
  component's slot scaffold (its manifest skeleton with the directive line
  stripped) in the correct nesting — the anti-footgun for card-style layouts —
  as plain text, and stays inert once the slide has any content so it never
  clobbers authored body. The map region completer is now one entry in a small
  data-source registry (`data-sources.js`): each completer is gated to its
  component(s) through the shared slide detection, so adding the next
  static-vocabulary data component is a one-line registration. Deterministic,
  offline, zero model calls. Drawing Board (docs-site) only.
- **`q-and-a` — a layout for anticipated questions paired with prepared
  answers** (inventory bucket, `stack` form). The end-of-pitch "what we expect
  to be asked" slide: a few weighty defenses of a recommendation, authored as a
  nested list (`- Question?` with the answer nested one level under). Questions
  are indexed automatically (01, 02, …), so a `ul` and an `ol` render the same.
  Ships with five mutually-exclusive looks: the **editorial ledger** default
  (numbered index + accent rule), `spine` (accent nodes on a vertical spine for
  a sequential walkthrough), `rail` (numbered question/answer columns), `tab`
  (a true accent underline beneath each question), and `grid` (a two-up density
  grid split by a gradient hairline cross, each header reserving two lines so
  rows align). The universal `solo` gives one question/answer the whole slide
  and `compact` tightens the ledger for five-plus pairs; every colour is a
  light-dark() token, so all five looks invert under `dark`. Pure CSS, no
  transform. Distinct from a reference FAQ (many terse look-ups) and from
  `list-criteria` (evaluation criteria + rationale) — q-and-a defends a
  recommendation.
- **Drawing Board: each cloud Architect reply is labelled with the model that
  produced it** — the bubble heading reads "The Architect (DeepSeek V4 Pro)", using
  *our* record of the model we sent the turn to, not the model's self-report (which
  is unreliable — models routinely misname themselves, and a prior identity claim in
  the history gets parroted forward). The label is captured per-message and
  persisted, so older replies keep the model that made them and a mid-conversation
  model switch is visibly applied on the next reply. Drawing Board (docs-site) only.
- **Drawing Board: an OpenRouter model picker accordion, prompt-caching control,
  and standing instructions.** The cramped native model `<select>` (300+ rows) is
  replaced by an in-place accordion in the Cloud AI settings section: collapsed it
  shows the current model + price with a "Tap to change model" hint; expanded it
  offers search, **Featured / Value / Free / All** filter tabs, and a
  vendor-grouped, priced list. (Value = a curated set of strong cost-effective
  models; Free = the catalog's $0 rows.) A
  **Prompt caching** switch lets the user opt out of the cached-prefix billing and
  is gated per-model (disabled with "Not supported by this model" for vendors that
  don't support it). A **Standing instructions** box (≤500 words) is appended to the
  Architect's cached prompt prefix and honored on every turn. Drawing Board
  (docs-site) only.
- **`map` component — a US-states basemap that fills regions by value or
  category** (`evidence · spatial · series`, `chart` bucket), the first layout
  on the new **`spatial`** form. For geographic stories — program reach,
  service territories, jurisdictions, where the grants landed (the gov /
  public-sector and nonprofit archetypes a flat `image` couldn't serve).
  Author one li per region with a trailing inline-code value
  (`- California \`48.2\``); region names resolve case- and
  punctuation-insensitively by full name, postal code, or common abbreviation
  (`California` / `CA` / `Calif.`). Two read modes: **choropleth** (default)
  shades each named region on a single-hue ramp off `--cat1-hue` (low→high),
  anchored on the neutral base so a low value never sinks below an empty region
  on a dark canvas; **highlight** (`map highlight`) gives each named region its
  own `--catN` slot and leaves the rest neutral, for membership rather than
  magnitude. Names the basemap can't place are reported — a muted legend row
  plus a `data-unmatched` attribute on the figure — never silently dropped.
  The basemaps are baked, pre-projected SVG path data generated from
  public-domain geodata via `tools/build-basemap.js` (no geo library ships):
  **US states** (d3.geoAlbersUsa, AK/HI insets, US Census boundaries) and
  **world countries** (`map world`, Natural Earth 110m). They inline into the
  emulator/runtime JS bundles, never into `dist/lattice.css`, preserving the
  zero-fetch contract (the world basemaps are the catalog's largest asset — each
  projection lifts the minified runtime/emulator bundles by ~70 KB of
  well-compressed path data). New chart-family kernel module
  (`map.transform.js`) wired through the single dispatcher, so it reaches all
  three render paths via the registry. Adds the 12th `form` (`spatial`) to the
  taxonomy (`design-system.md` §4, the schema + `index.js` enums).
  - **Regional / continental grouping** (world). A group name is a "fat alias"
    that expands to a set of member countries: name a continent
    (`North America`), a UN subregion (`Sub-Saharan Africa`), a curated
    composite (`Latin America`, `Middle East`), or a dated economic bloc
    (`European Union`, `ASEAN`, `G20`, `BRICS`, `OECD`) and the kernel fills
    every member — in choropleth (one value across the bloc) or highlight (one
    colour per bloc). Blocs carry an `asOf` year; **Global South / Global North**
    ship as first-class categories pinned to a stated, dated definition — South
    to the UN Group of 77 + China (the standard UN / UNCTAD operationalization),
    North to the developed economies — carrying the same `source` + `asOf`
    provenance as the blocs, plus per-continent slices of the South
    (`global-south-africa`, `global-south-asia`, `global-south-south-america`, …).
    "Global South" is contested, so rather than pick one definition the engine
    ships the **two most-recognized views** as distinct, sourced groups and lets
    the author choose: `global-south` (G77 + China, the default) and
    `global-south-brandt` (the 1980 Brandt-Report North–South line, built as the
    geographic complement — sweeps in Mexico / Turkey / the Koreas / Taiwan,
    files the former-Soviet Central-Asian states under the North). Shipping
    sourced, dated rosters is the transparent call: the definition travels with
    the data and an author can cite it, instead of every deck hand-rolling an
    undocumented ~130-country list. States in neither list (Russia, the
    post-Soviet / Balkan economies, disputed territories) belong to no `global-*`
    group. The `grouped` modifier clusters the legend by continent.
  - **Two world projections** (world). The default is **Equal Earth** — the
    area-preserving pseudocylindrical (Šavrič et al., 2018), so the Global South
    reads at its true size instead of the high-latitude inflation Robinson and
    Mercator introduce. **Robinson** ships as the `robinson` variant
    (`map world robinson`) for audiences who expect the familiar boardroom
    silhouette. Both are baked offline into sibling JSONs
    (`map.basemap.world.json` + `map.basemap.world-robinson.json`) — still no geo
    library in any bundle.
  - **The world is the default basemap.** Bare `map` is a world map (Equal
    Earth); `map us` (alias `map usa`) selects the US-states basemap. The tokens
    sit on orthogonal axes the manifest now models explicitly (a new
    `variantAxes` field): a **Basemap** axis (`us` · `world`) and a **Modifier**
    axis (`highlight` · `robinson` · `grouped`), so the docs / gallery / variant
    chips present them as composing axes, not a flat peer list. They already
    compose in any order (`map us highlight`, `map world robinson highlight`).
    Myanmar, Czechia) and a typo is a silent gap, so the static basemap
    vocabulary drives two deterministic, zero-token defences: a **CodeMirror
    autocomplete** that completes region + group names as you type a `map` list
    item (Drawing Board / playground editor), and a **"did you mean" lint rule**
    (`unknown-map-region`, in the shared `lint-core.js`) that flags an
    unresolved name with the nearest match (`Brasil` → `Brazil`) in both the
    CLI and the in-browser Architect.
  - v1 draws US states + world countries — not counties, districts, or city
    pins (and the world 110m cut omits the smallest city-states). Demo deck:
    `examples/map.md`.
- **`funnel` component — a tapering stage chart showing where a flow drops
  off** (`evidence · canvas · series`, `chart` bucket). For any narrowing
  pipeline — sales / conversion funnel, hiring pipeline, grant / donor
  pipeline. Author one li per stage in flow order with a trailing inline-code
  value (`- Signups \`4,800\``); the kernel draws centred trapezoid bands
  (width ∝ value), flanks each with its label and value, and prints the
  stage-to-stage conversion % in the gaps. Each stage takes a distinct hue
  from the categorical chart palette, rotating `--catN` exactly like the
  piechart wedges — so the colours are on-brand per theme (cuoio's curated
  earth pigments, etc.) and a funnel reads like the rest of the chart family.
  Labels and values sit on the canvas, so the fills never affect text contrast.
  New chart-family kernel module (`funnel.transform.js`) wired through the
  single dispatcher, so it reaches all three render paths via the registry with
  no per-renderer code. Demo deck: `examples/funnel.md`.
- **`pricing` component — plan tiers with prices, feature checklists, and one
  recommended column** (`comparison · grid · structure`). The plans / packages
  slide for commercial (sales, product launch), membership / fundraising
  (giving tiers), and procurement (RFP cost options) decks. Author one li per
  tier: a plain name (auto-bold), a trailing inline-code price (`$49 / mo`,
  `Custom`), an optional `*Most popular*` marker that renders as a ribbon and
  elevates the card, then nested `[x]` (included) / `[/]` (not, struck through)
  / `[-]` (limited) feature rows and a marker-less "who it's for" line.
  Variants `two` / `four` adjust the column count. Shares verdict-grid's badge
  machinery (the `[x]`/`[-]`/`[ ]`/`[/]` → badge transform now also fires on
  `.pricing` in all three render paths). Demo deck: `examples/pricing.md`.
- **`logo-wall` component — a grid of customer / partner / funder marks as
  social proof** (`inventory · grid · prose`). The credibility slide every
  go-to-market and mission-driven deck reaches for — *trusted by* (corporate),
  *our funders* (nonprofit), *participating agencies* (government). Author a
  bulleted list of inline images (`- ![Brand](brand.svg)`); marks render
  desaturated and uniform (the same grayscale treatment as the corner deck
  logo) so mismatched brand colours don't fight. Variants: `color` (keep brand
  hues for insignia / crests), `dense` (six columns for a longer roster).
  Pure CSS — no transform. Demo deck: `examples/logo-wall.md`.
- **The emulator now renders inline content images (`![alt](url)`).** Previously
  `lattice-emulator.js` only handled block-level `![bg …]` backgrounds, so an
  in-flow image rendered as literal markdown text; it now parses inline images
  to `<img>`, matching marp-core (the marp-cli and runtime paths already did
  this natively). Unblocks image-in-prose components such as `logo-wall`.
- **Drawing Board Converse adds OpenRouter as a second cloud AI tier.**
  Alongside Puter (free, user-pays, no key), the Architect can now Converse
  through the user's own OpenRouter account via one-click OAuth (PKCE — no key
  to paste, no backend). Side-by-side "Connect" buttons in Converse let the user
  pick either; the settings popover adds a Cloud AI section with a model picker
  (500+ models, live per-million pricing) and Disconnect. Puter stays the default
  cloud — when both are connected an active-cloud preference decides, defaulting
  to the proven tier. OpenRouter is OpenAI-compatible and streams; it's treated
  as a capable tier (full Lattice dossier + edit protocol), same as Puter/WebLLM.
  On the OpenRouter (Anthropic) path the static prompt prefix — persona + the
  Lattice primer + the edit protocol, ~10K tokens identical every turn — carries
  an `ephemeral` prompt-cache breakpoint (1-hour TTL, so it survives think-gaps
  across an authoring session rather than expiring after the default 5 minutes),
  so repeat turns bill that slice at ~10%
  instead of in full; only the per-deck score/findings/deck tail is re-read. The
  flattened (uncached) prompt other backends receive is byte-identical, so their
  behaviour is unchanged. Docs-site only — no engine render-path change.
- **`--accent-soft-body` token completes the soft accent-container vocabulary.**
  Soft accent surfaces (`--accent-soft` fill) now have a named body-text token
  alongside `--on-accent-soft` (emphasis/border) — it derives from `--text-body`
  (a pale tint takes canvas ink), so there's a single override seam and no new
  curated colour. `featured` consumes it. The accent-container ink-contract test
  now also guards `--accent-soft` fills against light-only inks (`--on-dark*` /
  bare white), so both the bold and soft containers are enforced.

- **Five opt-in checkbox style variants (`checks-ringed` *(default)*,
  `checks-knockout`, `checks-bold`, `checks-outline`, `checks-tonal`).** A
  universal section modifier (per-slide or per-deck) that switches the
  state-token disc treatment for `checklist` / `verdict-grid` /
  `obligation-matrix` without changing the marks or status colours. Each
  variant flips only scalar CSS knobs (`--state-fill-pct`, `--state-ring-*`,
  `--state-mark-pct`, `--state-disc-scale`) at section scope; the leaf disc
  mixes the real colours from `--state-color` + `--bg`, so variants stay
  theme-aware. The default, **Ringed Solid**, adds a hairline darker ring so a
  disc stays crisp on its own status-tinted row.
- **State-token mark tokens (`--mark-check`, `--mark-dash`, `--mark-x`,
  `--mark-slash`, plus `-bold` set) and disc-recipe knob tokens.** SVG-mask
  marks + the scalar knobs that drive the redesigned checkbox discs, in
  `lib/base/base.tokens.css`.
- **Universal pill structure tokens (`--pill-radius`, `--pill-pad-y`,
  `--pill-pad-x`, `--pill-font`, `--pill-fs`, `--pill-weight`,
  `--pill-tracking`).** A single structural contract for every status /
  metadata pill, defined in `lib/base/base.tokens.css`. Padding is em-based
  so a pill's box tracks its own text size and still scales HD → 4K. Colour
  stays per-pill via the existing `--pill-fg` / `--pill-bg` / `--pill-border`
  hooks — structure is universal, colour carries the semantics.
- **`--text-secondary` — an independent, on-brand, light/dark token for
  secondary content text.** Subtitles, eyebrows, captions, table headers,
  sub-labels and attributions previously borrowed the decorative
  `--text-muted` chrome token; they now ride a dedicated `light-dark()` pair
  curated from each theme's own ink, tuned to WCAG AA (≥4.5:1) on **both**
  the light and dark canvas across all 13 palettes (verified by
  `tools/contrast-audit.js` and a new unit gate,
  `test/unit/palette/structural-text-contrast.test.js`). Themes also gain
  `--dark-text-secondary`. The token is now part of the required-core-token
  contract (`tools/check-ownership.js`) and the `new:theme` scaffold.
- **Contrast audit now covers the secondary/label tiers and translucent
  on-dark ink.** `tools/contrast-audit.js` checks `--text-secondary` and
  `--text-label` on canvas and composites the `--on-dark-*` ramp over
  `--bg-dark` (it previously could not grade `color-mix(... transparent)`
  and had no subtitle/secondary pair at all).
- **Per-theme structural-text showcase decks** under
  `examples/token-contrast/` — one deck per palette exercising every
  affected element in both light and dark canvas modes.
- **Minified `.min` variants of every shipped CSS and JS artifact, with named
  export subpaths.** `dist/` now also carries `lattice.min.css`,
  `lattice-default.min.css`, `lattice-runtime.min.js`, and
  `lattice-emulator.min.js`, reachable via `@slidewright/lattice/css/min`,
  `/default/min`, `/runtime/min`, and `/min` respectively. The CSS minifier
  preserves Marp's `@theme`/`@size` directive comments, so a minified bundle
  still registers as a theme — the `.min` files are render-faithful to their
  unminified siblings (verified: a minified-vs-unminified render diff is
  smaller than two identical renders of the same source). Use the unminified
  files for debugging (source maps / comments) and the `.min` files for
  production / CDN delivery; the package `bin`/`main` stays the unminified
  emulator. Each build generator now emits both variants behind the same
  `build:check` freshness gate.

### Changed

- **State markers (`[x]`/`[-]`/`[ ]`/`[/]`) redesigned as colour + a distinct
  in-disc mark.** Across `checklist`, `verdict-grid`, and `obligation-matrix`
  every state is now the same status-coloured circle carrying a unique mark —
  **check / dash / x / slash** — replacing the old fill-level discs
  (filled / half / outline / slashed) and the layout-specific Unicode glyphs.
  The mark *shape* carries the meaning independently of colour, so the states
  are unambiguous in greyscale and for colour-vision-deficient viewers — the
  redundant encoding the fill-level discs lacked. Marks are font-independent
  SVG masks painted in theme tokens (knockout = `--bg`; disc = `--pass` /
  `--warn` / `--fail` / `--text-muted`), so they stay theme- and dark-mode
  aware, and `.heat` still composes. Authoring is unchanged (same markers,
  same classes); only the CSS that those classes paint changed, so the three
  render paths and page counts are unaffected. `roadmap` keeps its own dot
  vocabulary (its `planned` state is "future," not "fail") and is unchanged.
- **Every pill now shares one geometry.** The ordinary status/metadata pills
  across layouts — the universal trailing-code pill, verdict-grid badges,
  kpi, glossary range-pill, cards-grid / cards-side, obligation-matrix,
  regulatory-update (status / timeline / priority), statute-stack, and
  state-chart chips — are unified to the `--pill-*` structural tokens:
  consistent proportional padding, fully-rounded radius, and centre- /
  middle-aligned text via `inline-flex`. Pills now use the **body sans**
  (Outfit), not mono — a pill is a status / label chip, not code (mono was
  only inherited from the original trailing-`code` pill), and the sans also
  fixes vertical centring at the root: JetBrains Mono's metrics seated caps
  high in a flex-centred line box, while the sans lands them centred with no
  optical nudge. The genuinely identifier-like chips (legal citations etc.)
  are not pills and keep their own mono. Hardcoded `px` padding (glossary,
  state-chart) and the stray `9999px` radius (list-tabular) are gone, and the
  `600`/`700` font-weight split resolves to `--pill-weight`. Three pills stay
  as **sanctioned variants** that deliberately override specific axes —
  chart-status (bar-matching semi-round + gradient), list-tabular `register`
  (wide stamp), redline `.annotated` (footnote superscript / positioned
  counter) — but route everything non-deliberate through the same tokens.
  Pill colours and semantics are unchanged.
- **`--text-muted` is now decorative-only and a `light-dark()` pair.** It is
  reserved for genuinely decorative / de-emphasized marks — chrome
  (pagination/header/footer), empty-cell dashes, skipped/struck state, quote
  glyphs, code comments (DECORATIVE, WCAG-exempt) — and now carries a
  dark-canvas side (wiring in the previously orphaned `--dark-text-muted`).
  Every readable content role that used to borrow it (41 sites across 23
  files) was repointed to `--text-secondary`. `--text-label` was retuned to clear AA on canvas in the
  two themes where it sat just below (atelier, mustard). Decks that referenced
  `--text-muted` only through Lattice components are unaffected; a deck that
  hard-coded `var(--text-muted)` for body-adjacent *content* text should
  switch to `var(--text-secondary)`.
- **Chart-family fills now share one canvas-aware recipe, and warm hues no
  longer mud on the dark canvas.** kanban cards, gantt bars, progress fills,
  and state-chart nodes paint from a single shared fill recipe (the `--fill-*`
  hue/ink pair + a 1px hue-tint border + a vivid left accent). On dark the wash
  now mixes the hue toward `black` rather than the navy `--bg` (mirroring
  `--state-*-fill`), so amber / gold / red fills stay true instead of turning
  muddy. Two members specialize the geometry: **state-chart nodes are now
  neutral slate tiles** with the status carried entirely by the pill — a green
  "on-track" node no longer sits behind a green pill (no blend, and green keeps
  its one semantic), matching the kanban card ↔ pill relationship; and
  **progress bars now encode magnitude in the fill** — a horizontal gradient
  that "shoots forward" from a pale/dark origin to a saturated leading-edge head
  whose intensity scales with the percentage, with the track rail dropped so
  each bar floats like a gantt tile and the `%` readout riding the leading edge.
- **The categorical charts and the status pill now darken toward black too —
  completing the dark-mud fix.** The earlier pass moved the status/value *bar*
  fills off the navy `--bg`; this extends the same rule to the last fills that
  still mudded: the **pie wedge** and **quadrant zone** SVG gradients (which mix
  `--catN-hue` inline) now mix toward a new `--chart-cat-base` token —
  `light-dark(var(--bg), black)` — so on dark every category stays hue-true (a
  warm wedge reads gold, not brown) while the light canvas is unchanged. The
  shared **status pill** gradient and the `--catN-fill` token (quadrant dots,
  word-cloud) gain the same canvas-aware toward-black dark side. Net: quadrant
  zones, pie wedges, gantt/progress bars, kanban cards, and status pills all
  darken the one way on the dark canvas.
- **cuoio ships a curated chart palette — the first theme to flavour the
  chart family.** cuoio's charts no longer inherit the engine's default
  Apple-hue spectrum (which read as "indaco's charts" on the warm canvas);
  they now use cuoio's own earth pigments through the `--chart-catN` /
  `--chart-state-*` override hooks. Categorical colour adopts the palette
  audit's top-scored "Brand triad" set — the same `--cN` pigments cuoio's
  Mermaid diagrams use, so a pie and a flowchart read as one palette; status
  colour reuses cuoio's `--pass` / `--warn` / `--fail` so a gantt at-risk bar
  matches a `--warn` chip. See `design/theming.md` and `themes/palette-audit.md`.
- **onyx curates its charts around a slate · red · green triad.** onyx stays
  achromatic in its *chrome* (ink ramp, brand axis, mermaid, code) but its
  *charts* now carry a restrained three-colour identity — the signature red
  plus a slate and a green — over a grayscale value tail, so colour does the
  separating where it earns legibility (pie wedges, status) instead of every
  category collapsing to a gray. `--chart-cat*` leads red → slate → green →
  near-black → grays → olive; `--chart-state-*` draws from the same hues
  (pass = green, fail = the signature red, info = slate, warn = olive, mute =
  gray) so categorical and status read as one palette and a gantt at-risk bar
  matches a warn pill. Fills sit at the engine's readable depth, so the
  `--text-heading` label reads directly on every fill — measured ≥ 8:1 on both
  canvases — with no glow or plate behind the text. onyx-only; cuoio, indaco,
  and the shared engine are untouched.
- **indaco curates its charts around its cool blue-led spectrum — bringing all
  three flagship themes to one standard.** indaco now flavours the chart family
  with its own pigments instead of the engine default: `--chart-cat*` rides its
  blue-led spectrum (blue · rust · green · magenta · purple · teal · gold · cyan,
  ported from indaco's `--cN` pigments so a pie and a flowchart match), and
  `--chart-state-*` reuses indaco's living palette (`--pass`, brand blue,
  `--text-muted`) — porting its gold to a saddle-amber `warn` and curating a new
  cool **crimson** `fail`, since indaco's palette had no red. AA-verified both
  canvases. **cuoio, onyx, and indaco are now the three curated exemplars**; the
  remaining themes inherit the engine default until brought up to the same
  standard — the curation recipe and checklist live in
  `lib/components/chart/_chart-family/chart-family.style.md`.
- **Pie wedges return to the radial dome finish, shared with the quadrant.** The
  two solid-area charts (pie, quadrant) now use the *same* hub→rim area-fade
  (42/58/82 toward `--chart-cat-base`), so they read as one family — a centre-out
  fade for charts that radiate from a centre, distinct from the bar family's
  vertical wash. The flatter top→bottom wash prototyped earlier is retained as a
  documented **future variant** (see `chart-family.style.md` › "Fill finish").

### Fixed

- **Agenda "you are here" row no longer relies on background colour alone
  (WCAG 1.4.1).** The `progress` modifier marked the active row with an
  accent-soft background band (+ a thin accent left-border) — a colour-only
  cue that fails colour-blind viewers. It now triple-codes the active row:
  a **chevron pointer** in the left gutter (shape), the row **indents right**
  (position), the **label goes bold** (weight), and the background band stays
  (colour, for everyone who can see it) — plus the existing past/future
  opacity fade. Applies to every theme (clean chevron); the `sketch` finish
  draws a hand chevron and drops the active row's wavy rule so the pointer +
  band carry it. New `--agenda-marker` token holds the pointer SVG.
- **`sketch` finish — second audit pass (visible-defect fixes).** (1) **Wavy
  rules now read as hand-drawn** — the `--sketch-wave` amplitude was too low to
  perceive at slide scale, so table/ledger/agenda rules looked machine-straight;
  raised it so the wobble registers. (2) **Counters take the hand** — the
  numeral/step counters (`agenda`, `list`, `list-criteria`, `list-steps`) pinned
  `--font-mono`, so they stayed mono beside hand content; re-pointed them at
  `--font-label` (hand under `sketch`, identical mono everywhere else). (3)
  **Responsive guards so contained content stops overflowing under the wider
  hand font:** `list` rows step down to `--fs-body` to fit their equal-height
  bands (was overlapping); `split-panel` right-zone cards step to the compact
  size to fit the fixed panel (was clipping the last card); the `checklist`
  inter-row gap tightens so a 7-row set clears the footer. The principle: content
  that fit the engine face still fits; only a genuinely overstuffed slide
  overflows.
- **`sketch` finish robustness — a slide-by-slide audit of the finish on a
  full editorial deck fixed a batch of defects.** (1) **Dropped the `1.08em`
  body bump** — it enlarged every body element AND discarded the compact sizes
  dense layouts set (`--fs-body-compact`), overrunning fixed content budgets;
  it was the single biggest source of clipped slides (glossaries, tables).
  (2) **`--font-body` is now re-pointed as a token** under `sketch` (like
  `--font-display`/`--font-label`), so components that pin `var(--font-body)` on
  a nested element (big-number caption, key-insight body) get the hand sans
  instead of leaking the clean face; `sketch-clean-body` restores it via the new
  `--font-body-clean` alias. (3) **matrix-2x2 quadrants get the hand box** —
  the box selectors only matched `> ol > li`, missing the `ul`-based variant.
  (4) **The generic KEY INSIGHT blockquote** now becomes a drawn box like the
  cards/quote. (5) **No more synthetic italic on Caveat** — the quote face,
  which has no italic, was being slanted into a muddy oblique. (6) **Chart-frame
  slides no longer double-rule the heading** — the straight `.chart-header`
  hairline is suppressed (the hand wavy underline already draws it).
  (7) **list-principles dividers** join the wavy-rule family. Genuinely
  over-budget slides (a 3-card split-panel, a 4-state verdict-grid) still want
  `sketch-clean-body`; kpi separators + the cuoio dark-accent tone are noted
  follow-ups.
- **Inline `code` chips no longer fragment on hyphenated tokens.** `section code`
  gained `white-space:nowrap`, so an identifier like `--bg-alt` stays on one line
  instead of breaking to `--`/`bg-`/`alt` inside the chip (worst under the wider
  hand font, but a latent bug on every deck). Matches the state-pill, which
  already nowraps.
- **Committed deck PDFs embed the real fonts, even on a network-less render.**
  The emulator pulled its type from a Google-Fonts `<link>`/`@import`, so a build
  without network (the cloud sandbox, the pre-commit PDF rebuild) embedded a
  serif/sans **fallback** — the committed `.pdf`s (e.g. `examples/sketch.pdf`)
  shipped looking nothing like the design, and the page-count tests never caught
  it. `lattice-emulator.js` now base64-injects the full self-hosted type stack
  (`assets/fonts/` — Playfair Display incl. italics, Outfit, JetBrains Mono, and
  the `sketch` pair Caveat + Shantell Sans) as an inline `@font-face` block that
  wins over the `@import`, and waits on `document.fonts` before printing, so PDFs
  embed every face with no network — a network-less render is now the intended
  design, not a fallback. The shipped npm bin doesn't carry `assets/` (excluded
  from the tarball), so end users still resolve fonts from Google unchanged.
- **The Drawing Board editor mounts again.** The editor-mount script read the
  `autocomplete` workspace preference via `getPref(...)` but never imported it
  into that `<script>` module — and each Astro `<script>` is its own ES module,
  so the call threw `getPref is not a function` before CodeMirror mounted. The
  editor pane came up blank (the hidden no-JS seed textarea masked nothing once
  `html.db-js` was set). Fixed by importing `getPref` into the editor-mount
  block. Docs-site Drawing Board only — no engine change.
- **Editor cursor-line and selection highlights now read clearly on every palette
  and mode.** Both were a flat low-alpha wash of `--accent` (active line 6%,
  selection 22%), which left the cursor line near-invisible everywhere (WCAG
  band-contrast ~1.06–1.16) and the multi-line selection faint on the low-chroma
  and warm light palettes. The active line bumps to a visible band (12% — alpha
  far too low to touch text legibility), and the selection keeps its legibility-safe
  22% fill but gains a 1px `--accent` edge for definition a heavier fill can't buy
  without dimming code. The four values are now named tokens on the editor
  (`--cm-active-line`, `--cm-active-gutter`, `--cm-selection`, `--cm-selection-edge`,
  `--cm-match`) so a downstream theme can tune them. Playground / Drawing Board /
  Specimen editors (docs-site CodeMirror) only — no engine change.
- **Editor autocomplete popup is now legible on every palette and mode.** The
  dropdown reused `--bg` (identical to the editor) with a plain `--border` edge,
  so in light mode it floated with almost no visible boundary (border-vs-bg ~1.21
  on indaco-light); and the completion detail/type hint reused `--text-muted`,
  which drops to WCAG ~2.5 on the warm light palettes (magnolia, cuoio). Two new
  editor tokens fix both: `--cm-pop-border` (a muted-blended panel edge, lifted to
  ~1.87) and `--cm-detail` (a body-blended hint colour, lifted to ~3.85 while
  staying secondary to the label); the popup shadow is also deepened for
  elevation. Docs-site CodeMirror only — no engine change.
- **The editor autocomplete popup no longer renders as an unthemed white box
  (notably on iOS Safari).** The popup theme lived in the editor's scoped
  `EditorView.theme`, but CodeMirror renders completion tooltips in a
  fixed/detached layer that can fall outside the `.cm-editor` element, where the
  scoped rules don't reach — so the popup fell back to CodeMirror's default white
  panel, jarring on the dark editor. The theme now lives in a global stylesheet
  injected once (using the base palette tokens, which resolve anywhere under
  `<html>`; the editor's `--cm-*` tokens are scoped to `.cm-editor`). Drawing
  Board (docs-site) only.
- **The editor's first text selection on iOS Safari now uses the themed
  highlight, not the system tint.** iOS could paint the native (lavender)
  selection before applying CodeMirror's injected theme, so the first selection
  read wrong until a style recalc (e.g. a palette/mode toggle). The editor now
  forces one reflow on the frame after mount, applying the theme up front.
  Docs-site CodeMirror only.
- **The AI-tier status indicator no longer relies on colour alone (WCAG 1.4.1).** The
  green/grey connectivity dot — on the model chip and the settings "In use" row — is
  replaced by a per-state **Lucide glyph**: `cloud` (cloud tier) · `cpu` (on-device) ·
  `circle-slash` (off/floor) · `loader-circle` (reconnecting, spins, honors
  `prefers-reduced-motion`) · `triangle-alert` (load failed). The shape conveys the
  state, so it reads for colour-blind users; colour (accent/muted) is now a secondary
  cue. Bonus: the glyph names *which* tier is live at a glance. Drawing Board (docs-site) only.
- **You can reconnect OpenRouter from Settings.** After disconnecting, the Cloud AI
  section said "Open Converse to connect" but offered no control — leaving no obvious
  way back. It now has a **Connect OpenRouter** button (one-click OAuth), symmetric
  with Disconnect. Drawing Board (docs-site) only.
- **The spend readout no longer shows a misleading "$0.00 all-time".** The local
  tally can only count since the feature shipped on this device, so an all-time
  figure contradicted the real OpenRouter account total. The strip now shows the
  **authoritative account `used`/`left`** plus an honest **"This session: $X"** live
  tally — no phantom all-time. Drawing Board (docs-site) only.
- **`list-tabular`'s authoring skeleton no longer teaches a removed inline format.**
  Its `skeleton` (the scaffolder template, the docs "Authoring" block, and the
  Converse dossier's base) still showed the retired `- **Name.** description`
  ledger form — dead authoring that survived only because `list-tabular` isn't a
  card-style layout, so the inline-bold lint gate never fired on it. The skeleton
  and the `rows` slot contract now match the numbered/nested form the layout
  actually renders (and that its own `sample` and variants already use):
  `1. Name` + an optional nested `- description` row. Regenerates
  `dist/docs/components.{md,json}`.
- **Map region autocomplete now defaults to the world basemap.** The editor's
  `map` region completer inverted the component's default — a bare
  `<!-- _class: map -->` (a world map) offered US states, so every country and
  group (Global South, blocs, continents) was unreachable unless the author
  typed a redundant `world` token `map.docs.md` tells them to omit. It now
  matches the grammar: world by default, US states only on `map us` / `map usa`.
  Drawing Board (docs-site) only.
- **Drawing Board drawer close buttons are right-aligned again.** The flex
  spacer that pushes the `×` to the end of a drawer head was scoped to
  `.db-panel-head` only, so inside the Settings and Decks drawers
  (`.db-drawer-head`) it collapsed and the close button jammed against the
  title. The `.db-spacer` grow rule is now unscoped (a spacer grows in any
  flex row). Drawing Board (docs-site) only.
- **OpenRouter model picker no longer shows `$-1000000.000/M` for
  variable-priced models.** OpenRouter reports a `-1` sentinel for router/auto
  and other variable-priced rows; the picker multiplied it into a nonsense
  per-million figure. Pricing now parses through `orPricePerM`, which maps any
  negative/missing/non-numeric value to “no fixed price” (the option reads
  “pricing varies”) while keeping `0` as a genuine free model. Drawing Board only.
- **Mid-sentence inline code is no longer mis-promoted to a metadata pill.**
  The universal pill rule matched `code:has(+ :is(ul, ol))`, but the `+`
  combinator skips text nodes, so a mid-sentence reference on a row that merely
  had a nested list (`- The \`--accent\` token does X\n  - detail`) was styled
  as a pill. A new `pill-tag` transformer (shared across marp-cli, emulator,
  and runtime) tags only the genuine trailing-`code`-before-a-nested-list case
  with `.lat-pill`, and the CSS arm now matches that class; the `:last-child`
  pill (a truly trailing `code`) is unchanged. See
  `engineering/decisions/2026-06-08-inline-code-contrast.md`.

- **Docs site search boxes no longer trigger iOS Safari's focus-zoom.** The
  playground component search, the component-reference search, and the Group-by
  selects were below the 16px threshold that makes iOS zoom the page on focus;
  they now bump to 16px on coarse pointers (matching the editor textarea), so
  tapping search keeps the layout put.
- **Docs playground no longer renders `math` slides tiny + jittering.** The
  playground renders `inlineSVG:false` (bare `<section>`, no
  `<svg><foreignObject>` wrapper), and `section{container-type:size}` collapses
  a section that has no explicit box — so cqi/cqh-based layouts (notably
  `math.matrix` / `math.compare`) shrank to an unreadable size and visibly
  re-scaled as the KaTeX stylesheet streamed in async. `writeFrame` now pins
  each slide to its intrinsic 1280×720 (matching the specimen renderer), giving
  container queries a definite box and making the fit-to-width scale
  deterministic. PDFs were never affected.

- **Accent-filled surfaces now stay legible on pale-accent palettes.** Text on
  `var(--accent)` fills was reaching for a fixed light ink (`--on-dark*` /
  hardcoded `#fff`), which vanished whenever a theme's accent is pale (every
  palette's dark mode, plus achromatic palettes like concrete/atelier/ardesia).
  - The `--on-accent` muted tiers (`-secondary` / `-ghost` / `-watermark`) now
    **derive from each theme's curated `--on-accent`** by opacity instead of
    re-deriving from white, so the whole rail inherits the per-theme contrast
    tuning and overriding `--on-accent` alone carries the rest.
  - `split-compare` verdict (recommendation) bar, `split-list` panel heading +
    slide header/footer, and the `pinned` corner tag now read the accent pair
    instead of a light-on-dark ink.
  - The docs site projects `--on-accent` per palette/mode; the landing **Try it
    in your browser** CTA and the playground **Preview** toggle now use it, so
    their label no longer disappears on a pale accent.
- **Layout audit — T6 hex-fallback hygiene (audit round 2).**
  - `cards-grid`, `cards-side`, `cards-stack`, `split-list`, `timeline`:
    numbered-badge `::before` color changed from `var(--on-accent, var(--on-dark-primary, #fff))`
    to `var(--on-accent, var(--on-dark-primary))` — drops the `#fff` literal floor so the
    fallback chain bottoms out in a palette token.
  - `before-after` / `decision` / `compare-prose` corner-tag (flush + banner-tag variants):
    `before-after` / `banner-tag.before-after` label text changed from
    `var(--on-accent, var(--on-dark-primary, #fff))` → `var(--on-accent, var(--on-dark-primary))`.
    `decision` corner tags changed from `var(--on-cat, #fff)` → `var(--c-ink-dark)`:
    `--on-cat` is undefined (always resolved to `#fff`); `--c-ink-dark` (white on light,
    near-black on dark) is the correct text token for fills backed by `--cN-dark`
    (which are saturated on light canvas, pale on dark canvas).

- **Layout audit — T4 SVG chart label sizes (audit round 2).**
  - `radar`: axis labels raised from `9px` (≈6.4pt) to `11px` and tick marks from
    `6.5px` (≈4.6pt) to `9px` via scoped `--radar-axis-label-size` / `--radar-tick-size`
    custom properties with a bypass comment explaining SVG-unit sizing. Tick
    `font-weight` raised from 500→600 (matching the cover-variant's existing lift)
    so the faint sub-token-size ring labels get extra stroke weight.
  - `quadrant`: axis name raised from `11px` to `12px` and tick labels from `8px`
    (≈5.7pt) to `10px` via scoped `--quadrant-axis-size` / `--quadrant-tick-size`
    custom properties with bypass comment.

- **Layout audit — T5 dark-mode contrast fixes (audit round 2).**
  - `journey`: section-bar labels (`--journey-section-fg`) were `var(--on-accent)`,
    which flips to `--bg-dark` (navy) in dark mode — near-zero contrast against the
    dark bar. Changed to `var(--on-dark-primary)` (always-light token) for legible
    labels on both canvases.
  - `journey`: mood-legend numbers were `0.78125cqi` + `opacity:0.65` — compounded
    sub-token size and opacity fade made the 1–5 scale illegible. Raised to
    `var(--fs-meta)` (11.25pt) and `opacity:0.85`.
  - `journey`: hex `#fff` fallback on actor-dot color replaced with token floor
    `var(--on-dark-primary)`.
  - `agenda`: past rows at `opacity:0.4` on a dark canvas are near-invisible,
    flattening the past/active/future three-state hierarchy. Added a `section.dark`
    scoped bump: past rows → `0.55`, future rows → `0.65`, preserving the hierarchy
    while meeting minimum legibility.
  - `word-cloud`: dark-mode palette routed to `--catN-hue` (full-saturation
    categorical hues) by overriding `--catN-ink` tokens within `section.dark.word-cloud`.
    Previously `--catN-ink` dark branch was `color-mix(hue 78%, white)` which reads
    as pastel against navy; now the direct hue tokens give an analytical, vivid palette.
  - `compare-code`: column labels (`BEFORE`, `AFTER`) used `--text-label` which in dark
    mode drifts to a pale muted value, losing the accent-color signal that identifies
    each column. Changed to `var(--accent)`, which stays vivid in both themes and
    both canvases.

- **Layout audit — cross-component consistency (audit T-misc).** `stats` metric
  numbers now use the display serif (`--font-display`), matching `big-number` /
  `kpi` / `split-metric` (they were the lone sans outlier); `split-compare`'s
  preferred-option marker is now `✧`, matching `verdict-grid`'s focal glyph.
- **Layout audit — round 1 of fixes (anatomy, contracts, P0 render bugs).**
  - `kpi`: the running header overprinted the eyebrow on every slide with an
    `### eyebrow` (the section `padding-top` coincided with the absolute
    header's `top`); content now clears the header band.
  - `closing`: the heading styling targeted `h2` while the slot is `h1`, so the
    bookend lost its centering / max-width and the eyebrow rendered below the
    heading. Now mirrors `title` (centered hero `h1`, eyebrow reordered above).
  - `content`: stopped top-aligning (dead lower half) — now vertically centred —
    and capped paragraph/list line length so prose doesn't run ~90 chars wide.
  - `actors`: a 5-row roster clipped its last row off the slide bottom
    (`justify-content:center`); rows now top-align and stay on-canvas.
  - `list-tabular` `spec` / `spec+stacked`: the key name and the type both
    landed in one grid cell (overlapping glyphs) and overflowed the right edge;
    the key now sits in the name column, the type in the trailing column, and
    long mono keys/API paths wrap inside their cell.
  - `tldr` `numbered`: an inline `code` span in a takeaway fragmented the line
    across rows (grid blockified it); the counter is now a hanging indent so the
    takeaway flows as one line.
  - `piechart`: the disc was locked at `25cqi` and floated small in dead space;
    enlarged to `32cqi` (`36cqi` under `cover`) so the proportions read.
  - `redline` `three-col` / `split`: a long clause clipped mid-word; the content
    row is now `minmax(0,1fr)` with an overflow guard so it stays on-slide.
  - `citation-card`: the base "KEY INSIGHT" blockquote chrome contaminated its
    verbatim-quote panel on every non-pull-quote variant (light + dark) —
    citation-card is now excluded from that rule (it styles its own
    blockquote); the `pull-quote` watermark glyph was sunk behind the canvas
    (`z-index:-1`) and is now a visible watermark; and the `triptych` sample
    only supplied one gloss item so it rendered two panels — it now carries the
    translate + obligation items the three-panel layout expects.
  - **`diagram` dark mode — round 2 (per-diagram, scoped).** Fixed four more
  dark-mode surfaces, each scoped to its diagram type (no broad selectors):
  sequence lifelines + journey axis re-pointed at `--c-line`; mindmap branch
  edges restored to their per-section category colour, brightened via
  `color-mix` (an earlier over-broad edge rule had flattened them to mono);
  ER entity boxes levelled to `--bg-alt` on `section.dark` so header + attribute
  cells read with light ink. Light mode unchanged across all four.
- **`diagram` dark mode** — Mermaid bakes `edgeLabelBackground` and label ink
    as resolved hex at render time (in the light color-scheme), so on a dark
    slide flowchart/state/ER edge & relationship labels rendered as glaring
    white knockout boxes, sequence message text went invisible, and the edge
    LINES + arrowheads (baked #333) nearly vanished (dark-on-
    dark). `mermaid.css` now re-points those surfaces at `light-dark()` tokens
    (`var(--bg)` / `var(--c-ink-light)` / `var(--c-line)`) that resolve per the
    slide's color-scheme — identical on a light slide (no regression), correct
    on a dark one.
  - `state-chart`: the `lr` (horizontal) layout overran the slide and clipped
    the terminal node/marker at 5 states (a static PDF can't scroll) — tighter
    LR gutters fit the documented 4–6 node range; the `curved` variant clipped
    its terminal ◉ at the bottom — tighter vertical rhythm brings it on-canvas.
  - `roadmap`: phase date pills were white-on-pale in dark mode (the
    categorical `--cN-dark` fill flips pale on a dark canvas, but the ink stayed
    white) — a WCAG-AA failure on every dark variant. Pills now use
    `var(--c-ink-dark)` (white on the saturated light-canvas fill, near-black on
    the pale dark-canvas fill).
  - **Docs/contracts:** corrected ~22 `## Anatomy` diagrams that depicted a
    different layout than what renders (split-statement, split-brief, decision,
    timeline-list, list-steps, kpi, split-metric, math, image, featured,
    glossary, roadmap, progress, statute-stack, authority-chain,
    regulatory-update, tldr; added one for state-chart; dropped the dead
    `── accent ──` rule from title/divider/closing). Fixed misleading manifest
    contracts: `principles` skeleton (was `- **bold**`, generating card-style-
    invalid slides) + dropped its non-existent "justification" slot;
    `kpi`/`stats` list selectors (`ul`→`ol`) and kpi slot name; `split-list`
    `related` text; `authority-chain` `links`→`tiers` slot.

- **Subtitle / secondary-text contrast was broken across every theme.** The
  subtitle, eyebrow, caption, table-header, sub-label and attribution roles
  all rode the decorative, contrast-exempt `--text-muted` token, which is a
  single static value that never tracked the canvas — so secondary text fell
  below WCAG AA in most themes (and hard-failed in cuoio, magnolia, and on the
  dark canvas in concrete). They now use the new `--text-secondary` tier (AA on
  both canvases). The stale comment claiming `section.dark` "already remapped"
  `--text-muted` (it never did) was corrected. See
  `engineering/decisions/2026-06-05-token-structure-audit.md`.
- **Dark-panel text was invisible on every theme except cuoio.** The
  `--on-dark-*` opacity ramp (and the `--hljs-*` syntax fallbacks) were
  declared in a `:where(:root)` block. Marp/Marpit only rewrites a *bare*
  `:root`/`section` onto the slide `<section>`; wrapped in `:where()` it
  prefixes the slide path as a descendant, producing a "section inside a
  section" selector that never matches — so those tokens were **undefined in
  every rendered slide**. No-fallback consumers (`color:
  var(--on-dark-secondary)` on `title`/`closing`/`divider` and every split-*
  dark panel) then collapsed to the inherited dark body ink — invisible on
  dark surfaces — for all 12 themes that don't locally redefine the ramp
  (cuoio was the only one that did, which masked the bug). Moved the block to
  a plain `:root`; palette overrides still win by source order. Fixes title
  eyebrow/subtitle contrast and the blank left panel on `split-statement`,
  `split-brief`, `split-compare`, `split-metric`, and `split-list`.
- **`cards-wide` rendered all-bold and `featured` collapsed in the Marp
  preview / runtime path.** Both layouts styled their raw-markdown form behind
  a `:not(:has(.three-stack))` / `:not(:has(.feat-layout))` guard, which is
  silently broken in the Marp preview Chromium (see `engineering/gotchas.md`)
  — dropping the rules that reset body weight and build the card frames. The
  transformed and raw forms are mutually exclusive per render, so the guard
  was unnecessary: removed it, and the rules now apply unconditionally with no
  `:has()` dependency, so the layouts render in all three paths.
- **`content` lists rendered bulletless and undersized.** The layout styled
  only `<p>`, so an authored list (which `content.docs.md` permits) fell to
  base list styling — markers stripped, a size below the prose beside it.
  Added list styling at the prose tier with accent markers.
- **Mermaid radar (`radar-beta`) curves now ride the engine `--cN` palette.**
  The override block was a legacy two-curve hard-code (`--accent` /
  `--c-accent-warm`) living in the *native* radar component's stylesheet even
  though it styles *Mermaid* output. It now lives with the other Mermaid type
  overrides in `mermaid.css` and paints each series from `--c1-dark`…`--c8-dark`,
  so a radar with up to eight curves gets distinct, theme-flavoured colours that
  flip per canvas — not two fixed brand accents.
- **Pie wedge borders were off-by-one from their fills.** The piechart SVG
  emits `<defs>` (per-wedge gradients) as its first child, so the
  `nth-child`-based border palette counted from the wrong slot — every wedge's
  border took the *next* hue, and the 5th wedge landed on `--cat6` rose,
  painting a stray red line at the 12-o'clock seam. Wedge borders now count by
  `nth-of-type` (paths only). See `engineering/gotchas.md`.

### Added

- **Chart-family semantic colour system (`--state-*`).** Status-driven charts
  — gantt bars, progress fills, the shared status pills, kanban's "done"
  column, and the state-chart / timeline-list pills — now draw from a
  chart-exclusive semantic palette (`--state-{pass,warn,fail,info,mute}-{hue,
  fill,ink}`) instead of the engine-wide `--pass/--warn/--fail`. Curated to
  convey meaning (green / amber / red / blue / gray) and built like the catN
  spectrum: canvas-aware fill + ink via `light-dark()`, vivid on both modes.
  Gantt + progress bars fill with the same **hue-into-`bg` depth gradient** the
  pie / quadrant / radar SVG charts use (those read rich precisely because they
  gradient-fill ~42–82%, not a flat 24% tint — which is why the bars used to
  look muted). The gradient is capped where the shared `--text-heading` label
  still reads, so on-bar text flips the normal way (dark on light, light on
  dark), coherent with every chart in each mode. Radar's gap / delta segments
  move onto `--state-pass-ink` / `--state-fail-ink` too. Theme-overridable via
  `--chart-state-*`. The old per-`.dark` status overrides collapse into single
  canvas-aware rules.
- **Kanban cards are now swim-lane tiles.** Each card's background is a
  depth gradient of its own lane colour (same hue-into-bg language as the bars/
  zones, in the same richness band so kanban no longer reads pale), so a card
  reads as its lane. The lane tag drops its chip fill and becomes a quiet dot +
  neutral label, leaving the gradient status pill as the one loud chip on the card.
- **Status pills + gantt/progress bars share one depth-gradient recipe.** A
  status reads identically as a pill or a bar (hue-into-bg gradient, vivid ink
  border, `--text-heading` label).
- **Kanban lanes + word-cloud now ride the vivid catN spectrum.** Both moved
  off the engine `--cN` palette onto `--catN-ink`, so categorical colour reads
  consistently with pie / quadrant / radar across the whole chart family.
  (catN tokens are now also defined on `section.word-cloud`, which isn't a
  chart-frame member.)
- **New `canvas` modifier — opt into the chart surface panel.** Charts now sit
  directly on the slide by **default** (bare); add `canvas` to lift the chart
  onto its surface panel (`<!-- _class: piechart canvas -->`). Lets a deck mix
  canvas and non-canvas charts per slide; composes with `dark`. Pure CSS on
  `section.chart-frame.canvas:not(.state-chart) .chart-body` (and
  `section.word-cloud.canvas` for the free-floating word-cloud).
- **New `cover` modifier — a chart-family full-bleed with a caption band.**
  `cover` is a **chart-scoped** modifier (registered as a `cover` variant on the
  charts that support it — radar, piechart — *not* an all-layout universal). It
  takes the chart edge-to-edge, hides the header/footer, and reflows the slide
  heading + a one-line takeaway into a bottom **caption band** carrying the chart
  surface "sheen" (a `--text-heading`→`--bg` radial wash with a hairline edge),
  the page number reading through it. The generic treatment lives in
  `section.chart-frame.cover` (chart-family.css); per-chart rules tune the figure
  (radar centres the diagram + keeps a responsive legend column). Other
  chart-frame members can opt in as they're given an explicit cover figure size.
  Distinct from image's `full` photo variant (unchanged — see below). Documented
  via the radar/piechart `variantDocs`. Pure CSS — no transform/render-path
  change.
- **Chart surface panels — opt-in `canvas`, real glass not a tinted box.**
  Charts are **bare by default** (sit directly on the slide); the `canvas`
  modifier lifts a framed chart-family member onto a glass surface at
  editorial-whisper intensity. The fill is **never** a `--text-heading` mix:
  that token is a
  neutral gray, so mixing it into `--bg` painted a muddy gray box that read as
  a second background on the slide, not glass. Instead the pane tints toward
  white-frost and the form is carried by light on the edges + a shadow: on a
  LIGHT slide the pane is left **clear** (the slide shows straight through —
  no second background — read from a soft dark float shadow + a crisp hairline
  edge + a white top rim), and on a DARK slide it's a translucent **white
  frost veil** (lighter than the canvas) with a luminous edge. `light-dark()`
  picks the right one. Pure CSS on
  `section.chart-frame.canvas:not(.state-chart) .chart-body`. The float shadow is
  always black-based — `--text-heading` flips to white on dark and would cast
  a white glow / double-frame that bleeds over the footer. No `backdrop-filter` blur — unreliable in
  print-to-PDF and there's only flat `--bg` behind the pane, so it would cost
  risk for no payoff. The decoration is pinned to `.chart-body` — the one
  fixed-width container every member shares — so the panel is the **same size
  on every chart** rather than hugging each figure. Covers radar, quadrant,
  piechart, progress, gantt, kanban, and timeline-list. **word-cloud** gets the
  same surface via a `::before` painted behind its free-positioned words (it
  isn't a chart-frame member, so the family rule can't reach it). **state-chart
  is excluded** — its state flow fills the full chart-body height, leaving no
  room for a panel inset. The panel also takes a top margin so the
  `.chart-header::after` accent divider floats in the whitespace above the card
  instead of colliding with the lifted card's top edge.
- **state-chart gallery defaults to `lr`.** The default / dark / compact /
  accent demos now render left-to-right at five states (was a six-state
  top-to-bottom flow that overran the slide). The `lr` direction reads the
  machine as a horizontal pipeline and fits comfortably; the gallery and the
  manifest `sample` (which drives the chart bucket survey) are updated to
  match. No engine change — `lr` was already a supported modifier.
- **Apple-inspired categorical chart spectrum, decoupled from `cN`.** The
  chart-family (quadrant, piechart, radar, progress) now draws from its own
  vivid, well-spaced 8-hue spectrum — `--catN-hue` with an Apple-style master
  set whose dark-canvas value is a brighter same-hue sibling — instead of the
  engine-wide `cN` accents (which still drive roadmap / journey / legal /
  decision). The spectrum is theme-overridable via `--chart-catN` (a `:root`
  `light-dark()` pair); untuned themes inherit the master. Radar previously
  hardwired its `RADAR_PALETTE` to `cN` and so missed the shared model — it
  now consumes `--catN-hue` like its siblings.
- **Area-fade gradients on categorical charts.** Radar polygons, piechart
  wedges, and quadrant regions now carry a restrained SVG gradient — an
  Apple-Stocks-style area fade (near-transparent at the centre, denser toward
  the data rim on radar; pie wedges deepen from a light hub toward a vivid rim;
  quadrant regions share one radial centre at the axis crossing — faint where
  the axes meet, richer toward the outer corners). Built as per-shape
  `<linearGradient>`/`<radialGradient>` defs (SVG `fill` can't take a CSS
  gradient) with `stop-color` riding `--catN-hue`/`--catN-fill` so they still
  flip with the canvas. Landed in all three render paths (marp-cli, emulator,
  runtime) via the shared `lib/` transforms.
- **Global font-scale modifiers `scale-l` / `scale-xl` / `scale-2xl`.**
  Bump the readable fonts on a slide up in lockstep (×1.15 / ×1.3 / ×1.5)
  without re-picking sizes. A new unitless `--fs-scale` multiplier
  (default `1`) is baked into ten of the twelve typography tokens and the
  three documented between-token raw-cqi sites, so body, supporting
  headings (h3–h6), hero, and chrome all grow together and the tuned
  proportions hold. `--fs-h1` and `--fs-h2` are exempt — slide titles (and
  the KPI/stats numbers and table/chart headers that reuse those tokens)
  hold their designed size so titles don't balloon. Scope is native Marp class
  scoping: `<!-- _class: scale-xl -->` for one slide, `class: scale-xl` in
  the front matter for the whole deck. Composes with any layout or
  variant. See `engineering/typography.md` §7 and `lib/base/base.docs.md`.
- **`obligation-matrix` `pills` and `lanes` variants are now documented.**
  The variants are declared in the manifest; this adds their `variantDocs`
  so they render in the component gallery and surface in the reference and
  search index instead of being declared-but-invisible.
- **Agent authoring affordances.** Three additions help AI agents author
  decks correctly: a machine-readable catalog `dist/docs/components.json`
  (every component's axes, tags, slots, skeleton, and when/anti/related
  prose plus the controlled vocabularies, generated alongside
  `components.md/.html`); a draft-deck linter `npm run lint:deck -- <file>`
  (`tools/lint-deck.js` → `lib/authoring/lint.js`) that flags the markdown
  footguns — card-style inline-title, ordered-list bold, class typos — as
  structured, no-render diagnostics (wired into the pre-commit hook on
  staged decks and into CI via `npm run lint:deck:all`; errors block,
  unknown-class warnings are surfaced but non-blocking); and a
  vendor-neutral `AGENTS.md` entrypoint pointing agents at
  `design/skill.md`, the catalog, and the linter. See
  `design/design-system.md` §7.
- **Searchable component tags.** Every component manifest now declares a
  `tags` field (3–5 entries) — the *searcher's* vocabulary, complementary
  to the Function/Form/Substance axes. Tags are drawn from a controlled
  vocabulary (`TAG_GROUPS` in `lib/components/index.js`) across four
  dimensions (idiom, occasion, material, task) and must not restate the
  component's own axis values. They surface in each `<name>.docs.md`, the
  aggregated `dist/docs/components.md`, and as chips + a live filter facet
  in `dist/docs/components.html` (the portal filter now matches tags as
  well as name and description). `tools/check-ownership.js` gains a
  `checkTagClustering` guard that fails on un-allow-listed singleton tags
  and dead vocabulary, so the facets stay clustered. See
  `design/design-system.md` §7.
- **`dist/` is now a self-contained distribution.** It ships the bundled
  emulator CLI (`dist/lattice-emulator.js`, esbuild bundle of the engine
  graph — the package `bin`/`main`/`.` now resolve to it) and a generated
  `dist/README.md` indexing the folder, alongside the existing CSS/runtime
  bundles and the canonical component reference. A `npm run release:zip`
  target packages the full offline-browsable showcase (engine + themes +
  examples + gallery PDFs) for GitHub Releases.
- **Automated, changelog-driven releases.** The **Release** workflow
  (`workflow_dispatch`) derives the semver bump from this `## Unreleased`
  section (`tools/changelog.js`), rolls it into a dated section, tags,
  pushes, and publishes a GitHub Release with notes + the showcase zip
  (`tools/release.js`). `npm run release` / `release:dry` run it locally.
- **Documentation site.** A public Astro Starlight site under `docs/`
  (intro, getting started, authoring and theming guides) deployed to
  GitHub Pages via `.github/workflows/docs.yml`. Branded with the
  Lattice palette (indaco accent, Playfair/Outfit/JetBrains Mono).
- **Component reference portal.** `tools/build-docs-portal.js`
  aggregates every component manifest into a single canonical reference
  in two forms: `reference/components.html` — a self-contained, themable
  two-panel portal (clickable bucket→component sidebar with scroll-spy
  and live filter; a palette dropdown previews the catalog in any of the
  shipped palettes, light or dark, resolved from `themes/<name>.css`) —
  and `reference/components.md`, the plain-Markdown edition. Wired as
  `npm run docs:portal` with a `--check` gate; a lefthook job keeps it
  fresh against the manifests.

- **Custom deck logo.** Author-supplied SVG/PNG/JPEG renders as a
  discreet top-right watermark on every slide. A build-stage rewriter
  injects `<img class="deck-logo">` as the first child of each
  selected `<section>`; CSS desaturates the img to a faint grayscale
  watermark via `filter`, with brightness inverted on dark-canvas
  layouts (`.title`, `.divider`, `.closing`, `.dark`) so the mark
  stays legible without per-author light/dark variants. Real DOM
  (rather than a `::before` pseudo) lets the logo compose with every
  treatment, tints and marks alike. Three render
  paths: `applyDeckLogoToHtml` in `marp.config.js` (marp-cli), the
  same helper called from `lattice-emulator.js`'s post-render pass
  (emulator), and `applyDeckLogoFromFrontMatter` in
  `lattice-runtime.js` (published HTML). `logo-style: brand` keeps
  the logo's original colours on a soft `--bg-alt` plate;
  `logo-on: title` restricts the mark to the cover slide.
  Build-time-only — does not render in marp-vscode preview because
  the extension doesn't load workspace `marp.config.js` plugins;
  same constraint as `class: dark`. See
  `lib/base/base.docs.md § Custom logo` and `examples/custom-logo.md`.

### Fixed

- **Inline code now escapes HTML.** `parseInline` in
  `lattice-emulator.js` was wrapping backtick spans in `<code>` tags
  without escaping `<`/`>`/`&`, so authors who wrote sample HTML in
  inline code (e.g. `` `<section>` ``) ended up with the browser
  parsing literal text as real nested DOM elements, breaking page
  layout. Now escapes per standard markdown behaviour.
- **Overflow watcher scoped to Marp sections.** The watchers in
  `lattice-emulator.js` and `lattice-runtime.js` now select
  `section[data-lattice-slide]` instead of every `section`, so any
  literal `<section>` text that does end up in the DOM no longer
  pollutes the warning indices. Same scope applied to the
  per-section sizing override.

- **`quadrant` chart-family member.** Native 2×2 scatter chart joining
  the existing chart-family (progress / timeline-list / piechart /
  gantt / kanban / radar). Group-by-quadrant nested-list authoring;
  top-level items label the four corners in reading order (TL → TR →
  BL → BR), nested items carry a trailing `x, y` coord pill plotted
  inside the chart. Per-axis scale + threshold-line targets read from
  the eyebrow (`Effort 0–10 → Reach 0–100 · targets 6, 75`); falls
  back to auto-fit nice-ceil when omitted.

  Five modifier variants beyond the default:

  - `bubble` — third comma-separated value per item √-scales the dot
    (area-honest); numeric pill renders inside large bubbles.
  - `trail` — two coord pills per item; faded ring + dashed connector
    + solid dot reads "what moved" without an annotation.
  - `cohort` — top-level groups become cohorts; convex-hull region
    tints each cohort's footprint with a centroid label.
  - `threshold` — midlines replaced by explicit dashed target lines;
    four zones default to Star / On Pace / Lagging / At Risk.
  - `magic` — Gartner Magic Quadrant tribute with the canonical
    CHALLENGERS / LEADERS / NICHE PLAYERS / VISIONARIES vocabulary as
    fallback corner names.

  Palette flows through the existing `--c-quadrant-N-fill` /
  `--c-quadrant-N-text` theme aliases (AA-paired per slot). `minimal`
  and `dark` composable cross-cutting modifiers ride on top of any
  variant. Title-area styling defaults to the chart-frame `.minimal`
  treatment (centred accent hairline, no lucent gradient) — the dense
  scatter benefits from less chrome above the plot.

  Three-renderer kernel parity enforced as for radar: `lib/quadrant.js`
  is canonical; `lattice-emulator.js` inlines the build-path dispatch;
  `lattice-runtime.js` mirrors the kernel for the marp-vscode preview.
  Feature deck at `examples/quadrant.md` (+ committed PDF) demos every
  variant. Unit coverage in `test/unit/quadrant.test.js` (47 tests)
  covers parsing, eyebrow grammar, geometry, every variant, and
  chart-family integration. Reference doc:
  `docs/references/templates.md#quadrant`.

### Changed

- **Categorical charts recoloured onto a shared fill/mark model.**
  Quadrant, piechart, radar, and progress now draw from one chart-family
  colour contract (`--catN-fill` / `--catN-ink`, defined in
  `_chart-family.css`): each slot is a single curated hue rendered as a
  restrained *tint* fill plus a saturated, contrasting *mark* — pale tint
  + deep same-hue mark on a light canvas, and a muted **deep** tint +
  brighter (white-lifted) same-hue mark on a dark canvas. Both modes are
  equally restrained: the dark side is the light side's tint model
  inverted, not the hue painted at full strength (which read as a clashing
  Excel-default palette across 8 categories). Fill and mark always share a
  hue and the relationship flips automatically with the canvas, so the
  charts stay refined and on-palette in both modes. Quadrant
  cells map reading-order to slots 1–4; piechart wedges/legend swatches
  gain coloured borders; radar curves now draw from the chart spectrum
  (`--catN-hue`) like the other members, in both modes; progress's neutral
  bar uses the first slot hue (status bars still use pass/warn/fail).
  Quadrant text labels are neutral `--text-heading` ink (AA-safe) with a
  `--bg` halo. Both the native quadrant component and the Mermaid
  `quadrantChart` theme map now read the `cN` palette directly (see the
  removed `--c-quadrant-*` tokens below).
- **Piechart and quadrant fills unified onto radar's vivid area-fade
  model.** The three categorical charts now share one fill language. Pie/
  donut wedges previously rode the pale `--catN-fill` tint (which read
  pastel/washed-out); they now ride the vivid slot hue (`--catN-hue` — the
  canvas-saturated end radar strokes its curves with) as a hub→rim radial
  area-fade (lighter at the hub, vivid toward the rim), denser than radar's
  translucent overlay because wedges are opaque part-to-whole areas. Legend
  swatches become solid vivid chips matching the wedge identity. Quadrant
  zone fills now match the pie wedges exactly — the SAME opaque hub→rim mix
  of `--catN-hue` with `--bg` (42% at the axis crossing → 82% at the outer
  corners), replacing the former translucent wash, so the four zones read
  as vivid as the pie. The on-field labels take maximum-contrast ink
  (`--quadrant-label-ink`: true black on light, true white on dark via
  `light-dark()`) with no halo — a `--bg` halo reads as a visible outline on
  the saturated zones, and softened `--text-heading` reads a touch light, so
  pure black/white carries the labels on its own; only the dot/bubble marker
  rings keep a thin `--bg` ring (to stay visible on their same-hue zone). All
  three charts share the same `--catN-hue` source and
  hub→rim fade, so radar, pie, and quadrant read as one family on both
  canvases. Render-path + CSS only (no token or authoring change).
- **Documentation reorganized into two trees.** The internal engineering
  and design references moved from `docs/` to `reference/` (with the
  former `docs/references/` becoming `engineering/`), freeing
  `docs/` for the new public documentation site. All cross-references —
  CLAUDE.md, generators, the npm `files` list, tooling, and links — were
  updated accordingly.
- **BREAKING: `bg-*` decoration classes renamed to `tint-*` / `mark-*`.**
  The Background Library is now the Treatment Library, split into two
  semantic families: 12 `tint-*` gradient washes (corner glows, edge
  washes, atmospheric, multi-accent) and 11 `mark-*` SVG accent shapes,
  plus a `treatment-none` reset (was `bg-none`). `tint-corner` and
  `tint-edge` now carry an `at-*` placement axis — write
  `tint-corner at-tl` (was `bg-corner-tl`), `tint-edge at-right`
  (was `bg-edge-right`), etc. Both long and short forms are accepted
  (`at-tl` ≡ `top-left`), with a per-layer escape hatch (`tint-at-tl`)
  for composing two tints at different placements. Marks render at a
  fixed default home in v1 (e.g. `mark-orbit` defaults to bottom-right,
  matching the old `bg-orbit-br` position); writing `at-*` alongside a
  mark is silently ignored. The mark placement axis is a v2 follow-up.
  No alias period — `bg-*` classes are removed in this release. Source
  file renamed `lib/base/base.decorations.css` → `lib/base/base.treatments.css`;
  doc renamed `docs/references/backgrounds.md` → `docs/references/treatments.md`.
  Three marks switched rendering mechanism along the way because Apple
  PDFKit drops Chromium-emitted `mask-image` constructs unreliably:
  `mark-ticks` and `mark-pills` paint via `::before` + `box-shadow`
  copies (no mask), and `mark-seeds` paints as 12 stacked
  radial-gradients in the `--_bg-radial` slot. See
  `docs/references/treatments.md` for the catalogue,
  `docs/notes/2026-05-17-treatments-rename.md` for the rationale, and
  `docs/references/gotchas.md` → "Chromium PDF output of CSS
  `mask-image` renders inconsistently across viewers" for the
  underlying browser/PDF behaviour. Author migration: search-and-
  replace the `bg-X` class with its `tint-*` / `mark-*` equivalent
  per the table in the rename note.

- **BREAKING: Node 22 is now the minimum supported runtime.** `engines.node`
  bumped from `>=18.0.0` to `>=22.0.0`; CI matrix narrowed from `[18, 20, 22, 24]`
  to `[22, 24]`. Node 18 has been EOL since April 2025; Node 20 entered
  maintenance in April 2026. Lattice's test infrastructure now uses
  `node --test` glob arguments (Node 21+) and `describe({ concurrency: true })`
  (Node 20.10+) — supporting older versions would mean freezing into a
  pre-Node-21 API forever. Consumers on Node 18 or 20 should pin to
  Lattice 1.x.

- **Repository reorganization (pre-release).** The project layout was
  flattened, renamed, and re-tested in eight phases. Because Lattice
  has not been released into the wild, every change is a clean break
  with no aliases or compatibility shims.

  - `lattice.js` → `lattice-emulator.js`. The build-time renderer no
    longer steals the engine's name; `lattice` now refers to the CSS
    layouts + runtime + theming contract, `lattice-emulator` to the
    Marp-emulating PDF shim.
  - Documentation collapsed into `docs/`: `ARCHITECTURE.md`,
    `THEMING.md`, `EDITORIAL.md`, `SKILL.md`, and `references/` all
    moved under `docs/`. New `docs/notes/` folder for durable
    developer/agent investigation notes; the prior repo-root
    `AgentNote.md` is its first inhabitant.
  - `screenshot-slides.js` moved to `tools/`. The `.test/` folder of
    ad-hoc probe scripts (~85 files of historical investigation) was
    deleted along with stale `examples/*.html` and `examples/*.pptx`
    artifacts; `examples/*.html` is now gitignored.
  - Test runner switched from a single `smoke-test.js` to `node:test`
    with two tiers under `test/`: `unit/` (fast, no child processes —
    `npm test`) and `integration/` (rebuilds both galleries through
    both renderers — `npm run test:integration`). Shared plumbing
    lives under `test/helpers/`; the page-count contract lives in
    `test/fixtures/expected-page-counts.json`.
  - Test coverage expanded with `mermaid-var-map.test.js`, which
    extracts every CSS-var reference from the emulator's
    `MERMAID_VAR_MAP` and asserts both palettes define each token,
    plus `marp.gallery.test.js` and `parity.test.js` to assert
    cross-renderer agreement on slide count.
  - `@marp-team/marp-cli` promoted from `devDependencies` to
    `dependencies`. Lattice's runtime/preview path explicitly targets
    marp-cli output and the integration suite spawns it; there is no
    "lattice without marp" mode worth supporting.

### Removed

- **Breaking: the `--c-quadrant-N-fill` / `--c-quadrant-N-text` palette
  tokens are removed from every theme.** Quadrant charts (native and the
  Mermaid `quadrantChart` theme map) now read the `cN` categorical palette
  directly through the shared chart-family colour model, so the bespoke
  per-quadrant slot tokens — and their separate per-theme hue tuning — no
  longer exist. Consumers that overrode `--c-quadrant-*` must tune the `cN`
  palette instead. The `palette`/`contrast` unit suites no longer require
  or assert these tokens.

### Fixed

- **Quadrant chart internal border drift.** The emulator's
  `MERMAID_VAR_MAP` referenced `--mermaid-mid-slate` for
  `quadrantInternalBorderStrokeFill`, but no palette defined that
  token, so Mermaid silently fell back to its default colour. Pointed
  the entry at `--cat-slate` to match what `lattice-runtime.js`
  already uses for the same role. Caught by the new
  `mermaid-var-map.test.js`.

### Earlier (Unreleased)

- **Mermaid runtime: removed source-restoration anti-pattern; SSR-highlighted source
  doubles as the failure-mode UI.** `lattice-runtime.js` previously destroyed the
  `<pre><code>` Marp emitted, replaced it with `<div class="mermaid">`, then on parse
  failure copied a stashed `data-ll-source` back into the div as plaintext — losing
  Marp's native code styling and showing unstyled grey text on the slide. The new
  `wrapFences()` keeps the `<pre>` intact and adds a sibling `<div class="mermaid">`
  inside a `<div class="mermaid-block" data-state="…">` wrapper. CSS toggles
  visibility off `data-state` (`pending` → `rendered` hides pre / shows svg, `error`
  keeps pre visible and surfaces a themed `.mermaid-error` block with parser cause
  text). `initAndRun()` now drives `mermaid.render(id, source)` per-fence with
  per-block try/catch instead of a single `mermaid.run({nodes, suppressErrors:true})`.
- **Mermaid fences are now syntax-highlighted at SSR time.** Added
  `lib/mermaid-hljs.js`, a highlight.js language definition (diagram openers as
  `hljs-section`, keywords spanning flowchart/sequence/class/state/er/gantt/journey/
  pie/git/mindmap/timeline/kanban/quadrant/requirement/c4/architecture/packet/sankey/
  radar/xychart/block, frontmatter + `%%{init}%%` as `hljs-meta`, arrows + ER
  cardinalities as `hljs-operator`, strings, numbers, hex colors, HTML tags). Wired
  into marp-core's bundled hljs via a `registerMermaidHljs(marp)` engine hook in
  `marp.config.js`; marp's default `highlighter` picks it up automatically. Mermaid
  source now renders with the same hljs token classes as JS/Python/etc., including
  in marp-vscode preview when the same hljs language is registered there.

### Fixed

- **Mermaid theming gaps across 7 diagram types.** A full marp-cli + Puppeteer audit
  across 5 decks (37 diagrams) found 35 stray colors that escaped the brand palette:
  X11 named colors on journey actor avatars (cyan/lawngreen/darkseagreen), Tableau-10
  hardcoded palette on sankey nodes and link gradients, Mermaid's #087EBF service blue
  on architecture, the C4 dark-blue cycle on inner rects/labels, lightened cScale
  derivatives on mindmap and timeline `line.node-line-N` connectors, #EFEFEF on
  packet blocks, and a Mermaid-derived #F0F5FB on ER `g.row-rect-even` that drifted
  from `--bg-alt`. None of these were reachable through `themeVariables` — Mermaid
  bypasses the variable cascade for these surfaces. Added per-diagram-type CSS
  overrides to `themes/indaco.css` and `themes/cuoio.css` (journey faces/circles/
  strokes, c4 prefix-class catchall via `[class*="person"]`/`[class*="system"]`,
  mindmap+timeline connector strokes, sankey nodes/labels/links, packet blocks,
  architecture services/glyphs/edges, ER row-rect alternation). Tokenized the radar
  warm-orange contrast accent as `--mermaid-accent-warm` so audits recognize it.
  Audit verified deterministic across 3 rounds: 0 strays, 0 missing SVGs, 37/37
  diagrams on palette. Smoke test still passes (42 + 38 pages).
- **Silent diagram failures in browser runtime.** `lattice-runtime.js` was passing
  `layout: "tidy-tree"` to `mermaid.initialize()`, which is not a valid Mermaid 11
  layout algorithm (only `dagre` and `elk` are recognized). Mermaid threw
  "Unknown layout algorithm" mid-render, but `suppressErrorRendering: true` swallowed
  the error — leaving state, ER, class, and several other diagram types with
  `data-processed=true` but no SVG. Removed the bogus `layout` option; each diagram
  now picks its native layout. Verified with a synthetic Puppeteer harness covering
  cold load, section-replace, and in-place edits across both `<marp-pre>` and `<pre>`
  wrappers (8/8 deterministic across 3 runs each).

## 1.0.0

Initial public release.

### Engine

- Markdown-to-PDF renderer (`lattice-emulator.js`) with Marp-emulated HTML output,
  highlight.js syntax coloring, and per-diagram Mermaid pre-rendering.
- Browser runtime (`lattice-runtime.js`) for live Marp preview and web
  export contexts. Resolves the Mermaid theme from the loaded palette CSS
  at runtime.
- Single source of truth for color: every Mermaid theme variable derives
  from CSS custom properties in the active palette. The structural
  mapping (which Mermaid key gets which palette role) lives in `lattice-emulator.js`
  and does not change when palettes are swapped.

### Theme

- Two palettes: `indaco` (cool indigo, default) and `cuoio` (warm leather).
  Both extend `lattice.css` via `@import 'lattice'` and supply color tokens.
  Pale-cool / pale-warm designs with saturated brand borders and dark ink.
  Saturated red reserved for alarm states (gantt critical, error fills).
  Every other surface stays pale.
- Dark variant tokens (`section.dark` reskin) defined as part of the
  palette, so the same layouts work on either canvas.
- highlight.js syntax tokens defined as palette variables, so a theme
  can change syntax colors alongside slide colors.

### Layouts

- 25+ slide layouts including title, divider, content, diagram, two-column,
  card-grid, comparison, quote, timeline, list, full-bleed, big-number,
  split-panel, closing, finding, code-compare, image-half, stats,
  cards-stacked, criteria, verdict-grid, image-full, three-row, and dark
  variants.
- All layouts are palette-blind: every color reference goes through
  `var(--token)`, no hex literals.

### Mermaid

- Theme support for all 25 renderable Mermaid diagram types. ZenUML is
  documented as a non-renderable type in static-PDF contexts because the
  Mermaid CLI emits HTML/Tailwind classes without bundling the required
  stylesheet.
- Per-diagram CSS overrides for nine diagrams that ignore `themeVariables`
  or have hardcoded internal palettes (journey, mindmap, kanban, c4,
  radar, venn, ishikawa, treemap, plus a flowchart shape-coverage rule
  and a gantt outside-text fix).

### Examples

- `examples/gallery.md` and `gallery.pdf`: 40-slide layout gallery
  demonstrating every slide layout.
- `examples/mermaid-gallery.md` and `mermaid-gallery.pdf`: 31-slide
  diagram gallery covering all 25 Mermaid diagram types.

### Documentation

- `README.md`: project landing.
- `docs/skill.md`: deck authoring contract — layouts, directives, examples.
- `docs/theming.md`: how to author a palette, including the per-diagram
  Mermaid theming surface and parser limits.
- `docs/editorial.md`: prose rules for writing the words on the slides.
- `docs/architecture.md`: engine internals.

### Position in SlideWright

Lattice 1.0.0 is the first repository published under the
[SlideWright](https://github.com/slidewright) organization. Lattice is
the engine layer — the build pipeline, the layouts, the theme system.
The SlideWright desktop app (under development) will wrap this engine
with a GUI for non-developer deck authors.
