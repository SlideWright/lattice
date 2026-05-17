# Changelog

All notable changes to Lattice are documented here. The project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) with one explicit
contract: **layouts and palette tokens are stable surfaces.** Breaking
changes to either are major version bumps. New layouts and new themes are
additive minor versions. Mermaid CSS overrides are internal and may change
in patch versions.

## Unreleased

### Added

- **Custom deck logo.** Author-supplied SVG/PNG/JPEG renders as a
  discreet top-right watermark on every slide. The image is used as
  a CSS `mask-image` painted in `currentColor` at ~15% opacity, so
  the silhouette auto-adapts to whatever ink the active slide uses —
  no per-author light/dark variants required. Two authoring shapes:
  the native form (`class: with-logo` + `style: ':root{--deck-logo:url("…")}'`)
  works in marp-cli, lattice-emulator, exported HTML, and the
  marp-vscode preview; the convenience `logo:` directive expands to
  the native form at build time and is supported on the marp-cli /
  emulator paths only (documented limitation, mirrors
  `class: dark`). `logo-style: brand` keeps the logo's original
  colours on a soft `--bg-alt` plate; `logo-on: title` restricts the
  mark to the cover slide. See `lib/base/base.docs.md § Custom logo`
  and `examples/custom-logo.md`.

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
