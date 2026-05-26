# Lattice — agent orientation

Lattice is a Marp-based slide-deck engine that renders boardroom-quality
PDFs from Markdown. It is the engine layer of the **SlideWright** org; a
Tauri desktop wrapper (also called SlideWright) embeds the same engine.

**The visual contract is `lattice.css`.** Layouts are palette-blind —
every colour goes through `var(--token)`. Themes (`themes/indaco.css`,
`themes/cuoio.css`, …) supply the tokens.

## Read these before non-trivial work

- **`reference/design-system.md`** — Function · Form · Substance · Finish.
  The canonical four-layer model. Tells you what kind of thing each
  layout, modifier, chart engine, or palette token *is*, and how they
  compose. Authors keep using short names like `cards-grid`; the model
  organizes the catalog, docs, and engine. If you read exactly one
  Lattice document, read this one.
- **`reference/engineering/workflow.md`** — branching, feature decks, commit
  discipline, the share-the-PDF rule, three-renderer gate. Canonical
  for all workflow conventions; this file is a thin pointer.
- **`reference/engineering/development.md`** — Node versions, npm scripts,
  test layout, lint, hooks, coverage, CI, integration cache, editor
  setup. Read before changing any tooling, lint config, hook, CI
  workflow, or test infrastructure. Includes the "when you do X, also
  do Y" rules for adding lib files, themes, and scripts.
- **`reference/engineering/gotchas.md`** — when something behaves strangely,
  check here FIRST. Symptoms in headings are searchable. Add an entry
  BEFORE committing any non-obvious fix; the commit can then link to it.
- **`reference/architecture.md`** — engine internals.
- **`reference/theming.md`** — palette tokens, Mermaid contract.
- **`reference/editorial.md`** — prose rules for the gallery and shipped decks.
- **`reference/skill.md`** — deck-authoring contract.
- **`reference/engineering/`** — canonical references (design, pipeline,
  mermaid, audit, gotchas, treatments, workflow, development,
  cascade).
- **`reference/engineering/cascade.md`** — read before touching the CSS
  cascade or `@layer` declarations. Captures why `@layer` is
  declared-but-inert (the `!important` interactions between
  marp.scaffold and base.variants), the trap that broke an earlier
  partial activation attempt, and the conditions required for a
  safe full activation.
- **`lib/base/base.docs.md`** — cross-cutting authoring contract
  (eyebrow, subtitle, key-insight, state markers, dark/mirror/numbered,
  treatments). Was previously inside
  `reference/engineering/templates.md`, retired 2026-05-17.
- **`lib/components/<bucket>/<name>/<name>.docs.md`** — per-component
  contracts (slots, variants, when/why, anti-patterns) generated from
  each manifest's prose fields. `<bucket>` is one of 12: anchor,
  statement, inventory, comparison, progression, evidence, imagery,
  chart, diagram, math, code, legal. See `design-system.md` §9.
- **`reference/notes/YYYY-MM-DD-topic.md`** — durable investigation notes.

## Three render paths must agree

Any authoring transform needs to land in all three or the paths drift:

1. **`lattice-emulator.js`** — build-time CLI; inline implementations.
2. **`marp.config.js`** → **`lib/engine/*.js`** + **`lib/components/chart/_chart-family/chart-family.js`** + **`lib/integrations/*/`** — the marp-cli path.
3. **`dist/lattice-runtime.js`** — DOM transforms for marp-vscode preview
   (esbuild bundle of `src/runtime/index.js`).

Each transform documents its sibling implementations in a header comment
(see `liftSlotLabel`, `chartFamily`, `splitPanelCounter`). The integration
tier asserts cross-renderer parity on slide count.

## The build — `dist/` and `npm run build`

Generated, committed artifacts live in **`dist/`**:
`dist/lattice.css` (engine bundle), `dist/lattice-runtime.js` (esbuild
runtime bundle), and `dist/docs/components.{md,html}` (the canonical
single-file component reference). These are the shipped/public paths —
decks load `dist/lattice.css` via `marp.config.js` `themeSet`, and the
README/jsdelivr URLs point into `dist/`. Do not hand-edit them.

- `npm run build` — regenerate every artifact in dependency order,
  behind the collision gate. `npm run build:check` is the CI/stale gate.
- `npm run check:ownership` — the collision guard. Many layers share
  shape on purpose (every theme defines the same tokens; the image
  scrim/asset/text-panel trio co-own the `image` class). The guard
  hard-fails on *accidental* collisions — duplicate transformer names,
  unlisted layout co-ownership, duplicate component CSS selectors,
  duplicate component names, missing core theme tokens — and forces the
  intentional cases into the allow-lists in `tools/check-ownership.js`.
  Individual generators (`css:build`, `runtime:build`, `snippets:build`,
  `docs:components`, `docs:portal`) still exist for targeted rebuilds.

## Tests and the regression baseline

- `npm test` — full unit suite (~4s, 334 tests). Inner loop.
- `npm run test:<scope>` — one slice (palette/mermaid/parsing/layouts/cli).
- `npm run test:watch` — re-run on file change.
- `npm run test:integration` — ~30s cold, ~0.2s warm (hash-keyed cache).
  Rebuilds the page-counted decks through both renderers. CI runs this
  before merge; cache is disabled when `CI=true`.
- `npm run test:all` — both tiers.

Full tooling details (scopes, hooks, CI structure, cache behaviour)
live in `reference/engineering/development.md`.

**Two regression tiers:**

- **Per-component galleries** (58 components × 2 themes = 116 PDFs,
  one pair per `lib/components/<bucket>/<name>/`). Every enriched
  manifest's `expectedGallerySlideCount()` is asserted against the
  light PDF page count, and the dark PDF must match the light count
  (catches transforms that drop slides under the dark variant). See
  `test/integration/components/component-galleries.test.js`. The KPI
  regression signal lives in
  `lib/components/evidence/kpi/kpi.gallery.light.pdf` (was the
  standalone `kpi-gallery.md` deck).
- **Per-bucket survey galleries** (9 buckets × 2 themes = 18 PDFs at
  `lib/components/<bucket>/<bucket>.gallery.{light,dark}.pdf`).
  Generated from `manifest.sample` via `npm run build:bucket-galleries`;
  see `test/integration/components/bucket-galleries.test.js`.
- **CI baseline deck** (page count inlined in the test file):
  `test/integration/baseline-decks/gallery.md` (89pp). A drift fails
  the integration tier; the cross-renderer parity gate also runs on
  it. Lives with the test infrastructure, not in `examples/`.
- **Mermaid showcase** (~31pp): now the `diagram` component's own
  hand-authored gallery at
  `lib/components/diagram/diagram/diagram.gallery.md` (marked
  `galleryAuthored: true` in the manifest). One slide per Mermaid
  diagram type — covers what the standalone `gallery-mermaid` deck
  used to cover, but lives with the component it documents.

`examples/gallery-jargon.md` is a long-running editorial showcase —
stable and shared, but not page-count-asserted. The isolation rule
applies to all baseline-tier decks — see workflow.md.

## The visual-iteration loop

**During development: `npm run preview` + `SendUserFile`.** Don't
commit per iteration. The preview tool auto-detects scope from
`git diff` (L0 nothing, L1 single deck, L2 component-scoped, L3
full), rebuilds only what's affected, pixel-diffs against the
last commit, and outputs the file paths to stream via
`SendUserFile`. Per-iteration cost drops from ~30s (build + commit
+ push + reviewer-fetch) to ~10s (build + send).

```text
edit source  →  npm run preview [-- <deck>]  →  SendUserFile <files>
```

Scope detection — what `npm run preview` does for each kind of change:

- L0 (no visual impact) — tests, docs, manifest, README. No build.
- L1 (single deck or example.md) — rebuild + diff that deck only.
- L2 (component CSS / transform) — rebuild every deck using the
  component class; diff per-page across them.
- L3 (shared CSS / engine / theme) — full rebuild of all 23 decks;
  send the top 5 diffs by pixel count.

`--full` overrides to L3 explicitly. `npm run preview:watch <deck>`
runs a file watcher and auto-rebuilds on the desktop (opens the PDF
in your default viewer; viewer reloads when the file changes).

**For desktop authors using VS Code**: the marp-vscode preview pane
is the fastest inner loop — no preview tool needed; the preview
updates live as you edit. `lattice-runtime.js` handles all the
runtime transforms (chart-family, structure post-processing).

**Final commit per PR includes all rebuilt PDFs** — external
reviewers still need raw-URL access to flip through the deliverable.
A pre-commit hook (lefthook) catches the "staged .md without .pdf"
case and the "stale .pdf relative to source" case. Bypassable via
`--no-verify` only as last resort.

The old per-iteration "build + commit + push + share raw URL" loop
is removed. PDFs being out-of-sync with source within a PR is now
caught by the hook instead of by reviewer eyeballs.

## High-friction reminders (the rules you forget)

- **Isolate feature/fix content from the long-running galleries.** Do
  not add slides or modifier examples to any of the six long-running
  decks while a feature is in development. Layouts graduate into them
  in a separate commit after review. See workflow.md.
- **Ship a per-feature demo deck.** Every feature or fix branch creates
  `examples/<slug>.md` (+ committed `.pdf`) so the reviewer can see the
  work in one click. Six to ten slides, title → demo → closing. Full
  authoring + build + share contract in workflow.md.
- **Use `npm run preview` for visual iteration.** Edit → preview →
  `SendUserFile`. No commits per iteration. The preview tool
  auto-detects scope (L0-L3) and surfaces only the affected files.
  See "The visual-iteration loop" above.
- **`SendUserFile` is the primary delivery during dev.** Raw
  `raw.githubusercontent.com` URLs go only in the FINAL PR-summary
  reply (so external reviewers have a permanent link). During
  iteration the user reads the PDF from `SendUserFile` directly.
- **Design before code on rethink requests.** When the user asks to
  "rethink X," write the design model first — name the axes, list
  candidate moves, recommend one. Confirm direction in one round trip
  before editing CSS or transforms. Bundle adjacent decisions in one
  `AskUserQuestion`. Kills the ship → critique → re-ship churn.
- **Consult component docs before authoring slides.** Before writing
  any slide that uses `<!-- _class: X -->`, locate the component's
  bucket-nested folder (use `find lib/components -name X -type d`) and
  open `lib/components/<bucket>/X/X.docs.md` AND grep
  `test/integration/baseline-decks/gallery.md` for a working example
  **in the same turn**. Same rule for base modifiers
  (`tint-*`, `mark-*`, `with-*`, `dark`, `numbered`, …): open
  `lib/base/base.docs.md` first. Do not author from memory of docs
  read earlier in the session. The docs name the slot syntax, the
  required nesting depth, the bullet shape, and the markdown footguns
  (e.g. literal `*` in prose triggers emphasis; literal `<tag>` in
  inline code needs escaping or `&lt;`). Skipping this step is how
  decks ship with `**Label.** body` when the layout actually wants
  `- Label\n  - body`, or with prose describing an abandoned
  implementation, or with `tint-<em>` leaking into rendered output.
- **Card-style layouts forbid inline `- **Title.** body`.** The
  CARD_STYLE_LAYOUTS set in `lib/components/index.js` lists 12
  layouts (cards-grid, cards-side, cards-stack, cards-wide, featured,
  split-list, compare-prose, matrix-2x2, verdict-grid, before-after,
  decision, citation-card) whose autobold li rule makes body text
  after `<strong>` inherit `font-weight:700`. The contract on every
  card-style slide is the nested format:
  ```
  - Title
    - body text continues here
  ```
  Not `- **Title.** body text`. The validator
  (`findInlineTitleBodyLine` + `test/unit/components/deck-authoring.test.js`)
  catches this across every `.md` deck in the repo at commit time —
  if a test fails with "inline `- **Title.** body` on card-style
  slides," apply the nested format.
- **Title slides use `title silent` + `\`eyebrow\`` + plain subtitle.**
  Per `lib/components/anchor/title/title.docs.md`: the `silent`
  modifier suppresses pagination, header, footer in one token. The
  eyebrow goes in backtick-wrapped inline code. The subtitle is a
  plain paragraph. Don't pile prose into a second paragraph —
  the title slot is a single tight composition: eyebrow → h1 →
  subtitle. Look at `lib/components/inventory/inventory.gallery.md`
  for the bucket-survey reference and any per-component gallery for
  the component-doc reference.
- **Commit messages are `area(scope): short summary`.** Match `git log`.
- **No hex literals in layout rules.** Always `var(--token)`.
- **Typography uses the 12-token system.** Three scales: content
  (`--fs-meta` 11.25 / `--fs-body-compact` 13.5 / `--fs-body` 16 /
  `--fs-message` 21 / `--fs-emphasis` 30 pt), heading (`--fs-h1` 48 …
  `--fs-h6` 11.25, per-level independent; h4/h5/h6 tied to
  message/body/meta), display (`--fs-hero` 86 pt, class-driven). Values
  are normalized to the proven legacy footprint (a touch above it), NOT
  the projection-floor inflation the first rethink shipped — Lattice
  makes boardroom PDFs read at desk distance, not projected at 20ft. All
  HTML headings auto-resolve via `base.elements.css`. The cascade default
  is `--fs-body` (16 pt) for cards / lists / inline prose; slide-level
  statement prose opts UP to `--fs-message` (21 pt); dense table/grid
  cells (list-tabular, glossary, compare-table, matrix-2x2, verdict-grid,
  obligation-matrix, actors) opt DOWN to `--fs-body-compact` (13.5 pt).
  `--fs-hero` is the ONE big number on a slide; rows of comparable
  metrics use `--fs-h1` (48 pt). A few layouts use documented explicit
  cqi sizes between tokens (split-statement / kpi.briefing supports at
  38 pt, split-list watermark at 110 pt). Picking by "feel" or t-shirt
  size (`fs-md` / `fs-lg`) is the legacy pattern; those names are
  retired. See `reference/engineering/typography.md`.
- **Avoid `:not(:has(...))` / `:is(:has(...), :has(...))` in theme CSS.**
  Silently broken in the Marp preview Chromium build. See
  `reference/engineering/gotchas.md`.
- **`.scratch/` has a 14-day lifecycle** (`npm run clean:scratch`). Use
  it for throwaway experiments.

## When you can't see the result

For visual changes (CSS, layouts, themes, gallery), tests verify code
correctness, not visual correctness. If you cannot rebuild and inspect
the PDF, **say so explicitly** rather than claim success. Hand off to
the desktop session for the visual check.

## Visually spot-check any PDF you rebuild as a side effect

A CSS or theme change that cascades into `examples/` or galleries
forces rebuilds across many decks. **Build success is not enough.**
The rebuilt PDFs reflect both your CSS change AND whatever latent
source bugs were there before — environmental drift (Chromium
version, fonts) and authoring bugs in the source surface identically
in a rebuild. Open at least one representative page per rebuilt deck
via `SendUserFile` before committing, or run
`node tools/pixel-check.js diff <label>` against a pre-change
snapshot so unexpected drift surfaces as a failed gate rather than
as committed broken output.

The `deck-authoring.test.js` gate catches the specific
inline-format-on-card-style-layouts violation at `npm test` time,
but it doesn't catch every authoring bug — only that pattern. The
visual spot-check is the general-purpose defense; the test is the
specific one.

**Rasterize PDFs through `tools/rasterize-for-review.sh`.** Lattice is
a design system; **visual fidelity is what we're checking**, so
downscaling a rasterized slide to fit a session image limit defeats
the purpose. The wrapper renders at full quality and gives you two
complementary modes so you never fragment the diagnosis:

- **`--overview`** — auto-picks a DPI so the WHOLE slide fits under
  2000px. Low-DPI rasterization of a vector PDF is NOT downscaling;
  text shapes are still computed at full mathematical precision,
  just sampled to a coarser pixel grid. Use this first to see the
  big picture.
- **`--region <name>` / `--crop "WxH+X+Y"`** — full DPI, partial
  slide. Use after overview identifies a specific area to inspect
  in detail (font edges, gradient stops, etc.).

```bash
# Big picture of a 4K slide — full layout visible
tools/rasterize-for-review.sh test/integration/baseline-decks/gallery.pdf -f 38 -l 38 --overview --check

# Detail of one region at full DPI
tools/rasterize-for-review.sh test/integration/baseline-decks/gallery.pdf -f 38 -l 38 --region left --check

# Custom geometry crop
tools/rasterize-for-review.sh ... --crop "1500x900+1000+500"
```

`--check` is the universal safety gate — refuses to succeed if any
output exceeds 2000px on longest side (the conversation API's
inline-image limit). Region shortcuts clamp dimensions automatically
so they always pass `--check`. The codebase's automated pipelines
(`tools/pixel-check.js`, `tools/preview.js`) rasterize at 72dpi for
their own use and don't need this wrapper.

**Workflow**: `--overview` to see the big picture → identify suspect
area → `--region` for full-quality detail. No more guess-and-check.

**`marp-cli` works in the cloud sandbox — set `CHROME_PATH` first.**
The puppeteer-cached chromium binary isn't on the system PATH, so
`npx marp` exits with "no suitable browser found" until you point it
at the cached binary. The integration test helper at
`test/helpers/render.js` inherits `process.env`, so the same env var
covers tests too.

```bash
CHROME_PATH=$(ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome | head -1) \
  npx marp <deck>.md --config-file marp.config.js \
    --allow-local-files --pdf -o <deck>.pdf
```

See `reference/engineering/gotchas.md` "marp-cli works in the cloud sandbox
— set `CHROME_PATH`" for the full entry. Same file documents the
matching `themeSet` requirement: any deck whose front-matter `theme:`
directive names a theme not listed in `marp.config.js` `themeSet`
renders without a palette (white bg, no tokens) — every theme under
`themes/` is registered there as of `6aad1e6`.
