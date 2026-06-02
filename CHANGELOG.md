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
- **Chart surface panels — Apple "Liquid Glass" material.** Every framed
  chart-family member now sits on its own glass surface, Apple Liquid-Glass
  inspired at editorial-whisper intensity: a translucent base with a faint
  top-glow tint, a specular top gloss line, a bright inset rim, a soft float
  shadow lifting the pane off the slide, and a larger Apple-squircle-ish
  corner. Pure CSS on `section.chart-frame:not(.state-chart) .chart-body`,
  canvas-aware (mixes against `--text-heading`/`--bg`, so it flips light/dark);
  the two glass cues are complementary across canvases (the always-dark float
  shadow carries the read on light, the white specular rim + gloss carry it on
  dark), so one rule covers both modes. The float shadow is black-based, **not**
  `--text-heading` — that token flips to white on dark canvases, which cast a
  white glow / double-frame around the pane that bled over the footer. No `backdrop-filter` blur — unreliable in
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
  `section[data-marpit-slide]` instead of every `section`, so any
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
