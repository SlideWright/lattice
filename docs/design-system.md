# The Lattice Design System

**Function · Form · Substance · Finish — organized as components.**

This document is the canonical mental model for Lattice. It is the
*meta*-organization that sits above the existing references — it tells
you what kind of thing each layout, modifier, chart engine, or palette
token *is*, and how they compose.

If you read exactly one Lattice document, read this one. The other
references (`skill.md`, `theming.md`, `architecture.md`,
`lib/base/base.docs.md`, per-component `<name>.docs.md`) become
specialist references for one layer once you have this model.

---

## 1. The problem this solves

Lattice grew organically from a small palette and a handful of card
layouts into ~35 layouts, ~18 modifiers, five native chart engines, one
external diagram pipeline (Mermaid), three rendering paths, and 25
palettes. Each addition was internally consistent; collectively they
had no shared vocabulary.

Symptoms a new author hits:

- "Which layout do I want?" has no answer except *scroll the gallery*.
- "Charts" (quadrant, radar, native SVG) and "diagrams" (Mermaid) are
  authored, classed, and rendered three different ways even when they
  express the same thing (e.g. `matrix-2x2` vs `quadrant`).
- Cross-cutting modifiers (`dark`, `compact`, `loose`, `accent`,
  `mirror`, `numbered`) work on some layouts and silently no-op on
  others. The matrix of valid combinations isn't written down.
- New layouts get added ad hoc with inconsistent naming
  (`cards-grid` vs `verdict-grid` vs `matrix-2x2` vs `kpi`).
- Third-party libraries (Mermaid; potentially D2, Vega-Lite, PlantUML)
  have no clean plug-in boundary.

The diagnosis is not "too much" — it's **no taxonomy**. This document
supplies one.

---

## 2. The four layers

Every Lattice slide is a stack of four orthogonal decisions:

```text
┌────────────────────────────────────────────────────────────┐
│  FUNCTION   what the slide does for the audience           │  ← catalog
│             7 families — Anchor · Statement · Inventory ·  │     grouping
│             Comparison · Progression · Evidence · Imagery  │
├────────────────────────────────────────────────────────────┤
│  FORM       the spatial composition that holds the answer  │  ← ~10 shapes,
│             bookend · divider · canvas · grid · stack ·    │     not 35
│             ledger · panel · matrix · scatter · timeline · │
│             split                                          │
├────────────────────────────────────────────────────────────┤
│  SUBSTANCE  what fills the form                            │  ← 4 sources,
│             prose · structure · series · graph             │     one engine
│                                                            │     contract each
├────────────────────────────────────────────────────────────┤
│  FINISH     palette tokens + cross-cutting modifiers       │  ← already
│             dark · compact · loose · accent · mirror ·     │     clean
│             numbered · background · period                 │
└────────────────────────────────────────────────────────────┘
```

The four layers are **independently replaceable**:

- Swap **Finish** (palette + dark modifier) → same deck, new mood
- Swap **Form** (grid → stack) → same data, new shape
- Swap **Substance** source (Mermaid → D2) → same shape, different renderer
- Swap **Function** by re-classing → the slide says something else

The four layers also correspond to **the four audiences** Lattice serves:

| Layer       | Owned by              | Lives in                            |
|-------------|-----------------------|-------------------------------------|
| Function    | Deck authors          | choosing which component to use     |
| Form        | Layout designers      | `lattice.css` layout blocks         |
| Substance   | Engine maintainers    | `lib/*.js` post-processors, Mermaid |
| Finish      | Theme designers       | `themes/*.css`, modifier rules      |

---

## 3. The 7 functions

| Function       | The audience leaves knowing…                       | Examples |
|----------------|----------------------------------------------------|----------|
| **Anchor**     | where they are in the deck                         | `title`, `divider`, `subtopic`, `closing` |
| **Statement**  | one declarative claim                              | `big-number`, `quote`, `split-list`, `content` |
| **Inventory**  | a parallel set of related items                    | `cards-grid`, `cards-stack`, `list`, `actors`, `principles`, `agenda`, `tldr`, `glossary`, `list-tabular`, `checklist` |
| **Comparison** | how two or more options differ                    | `compare-prose`, `compare-code`, `compare-table`, `before-after`, `verdict-grid`, `decision`, `matrix-2x2` |
| **Progression**| an ordered movement through stages or time        | `timeline`, `list-steps`, `list-criteria`, `roadmap`, `gantt`, `kanban` |
| **Evidence**   | data that supports the argument                    | `stats`, `kpi`, `chart-family` (progress, piechart, timeline-list), `radar`, `quadrant`, `word-cloud`, `diagram`, `code` |
| **Imagery**    | a visual that carries its own meaning              | `image`, `featured` |

Test: an author opens a blank slide. The question "what is this slide
*for*?" must have an answer that is one of these seven. If a real
slide is hard to place, the families are wrong. The current ~35
layouts mapped cleanly into seven.

The audience-function taxonomy organizes the catalog and the docs. On
**disk**, components are grouped slightly differently: seven function
buckets plus two substance-defined buckets (`chart`, `diagram`) that
colocate components sharing a renderer kernel and palette-injection
pipeline. The `function` field on every manifest is unchanged; the
disk grouping is reflected in an optional `bucket` field. For 49
components `bucket === function`; for the 9 chart/diagram components
the bucket diverges to keep maintenance localized. See §9.

---

## 4. The 10 forms

| Form         | Description                                                 | Used by |
|--------------|-------------------------------------------------------------|---------|
| **bookend**  | Dark, centered, no chrome — full-canvas anchor              | Anchor (title, closing) |
| **divider**  | Dark band or full slide marking a section boundary          | Anchor |
| **canvas**   | One element fills the working area, centered                | Statement, Evidence, Imagery |
| **grid**     | N cells in M columns × K rows, each cell parallel           | Inventory, Comparison |
| **stack**    | N cells stacked vertically (or horizontally), each parallel | Inventory |
| **ledger**   | Row-per-item table with consistent columns                  | Inventory, Comparison, Progression, Evidence |
| **panel**    | Two zones: featured content + supporting context            | Statement, Imagery |
| **matrix**   | Cells indexed by two axes (categorical × categorical)       | Comparison, Progression, Evidence |
| **scatter**  | Points in a 2-D plane (continuous × continuous)             | Evidence |
| **timeline** | Items along a single ordered axis                           | Progression |
| **split**    | Two co-equal zones, side-by-side or top-bottom              | Comparison |

(Eleven entries: `split` is the eleventh because comparison's split is
co-equal halves where `panel` has a featured side.)

---

## 5. The 4 substances

The **substance** is what the author authors. Lattice supports exactly
four substance sources today, and a new chart library, diagram
language, or data format must plug in as one of these four — this is
the engine's only plugin point.

| Substance     | Author writes…                              | Renderer                                            | Output    |
|---------------|---------------------------------------------|-----------------------------------------------------|-----------|
| **prose**     | Headings, paragraphs, inline emphasis       | Marp markdown → semantic HTML; CSS does everything  | DOM       |
| **structure** | Headings + nested lists with conventions    | `lib/*.js` post-processor rewrites lists into purpose-built DOM | DOM       |
| **series**    | Tabular DSL (axes + datapoints as bullets)  | `lib/components/chart/_chart-family/chart-family.js` + per-chart kernel            | SVG       |
| **graph**     | External graph language (Mermaid today)     | External tool (mmdc) → SVG, palette injected        | SVG       |

**The unification this gives us.** "Chart" and "diagram" are no longer
separate concepts. They're both Evidence-function slides with SVG
substance. The split is by **data shape**: series is tabular,
graph is topological. Authors learn one question — "is your data a
table or a network?" — instead of memorizing engines.

A new graph language (D2, PlantUML) plugs into the **graph** contract;
a new chart library (Vega-Lite, Observable Plot) plugs into the
**series** contract; a new declarative layout plugs into **structure**;
a pure-CSS layout plugs into **prose**.

### The `mixed` escape hatch

Some boardroom-pitch components combine prose and structure in one
slot — e.g. `featured` (one prominent recommendation + supporting
cards). For these, the manifest declares `substance: "mixed"`. The
loader allows this **only when `form === 'panel'`**: the panel form
is what makes combining substances coherent (one prominent item
beside supporting structure). `mixed` is not a fifth plugin contract;
it's a declaration that the component composes two existing
contracts. The four-substance plugin point is unchanged.

---

## 6. The component model

**Each layout is a COMPONENT with a short, memorable name.**

This is the load-bearing decision in the design system, and it's
borrowed directly from mature web-component libraries (shadcn, Chakra,
Mantine, Lit, Storybook, Slidev, Notion blocks). Across all of them
the pattern is universal:

- **Invocation stays short** — one memorable name + optional variant
  props. Nobody writes `<communication-container.grid-form.card-variant>`;
  they write `<CardGrid>` or `<my-card>` or `layout: cover`.
- **Discovery happens outside the code** — Storybook, IDE autocomplete,
  slash commands, visual pickers, manifests. Not in the invocation.
- **Taxonomy organizes the docs, not the names** — the side-nav groups
  by category, but the component is still `<Tooltip>`, not
  `<feedback.overlay.tooltip>`.

Lattice follows the same pattern. The four-layer model organizes
**how we think about the catalog**. It does *not* organize the
authoring grammar. Authors write:

```markdown
<!-- _class: cards-grid compact dark -->
```

The first token is the **component name** (the layout). The rest are
**modifiers** (the variants). This is exactly how it has always
worked. Nothing to migrate.

### What's new

Each component now has a **manifest** — a JSON file describing it for
the catalog, the scaffolder, the IDE snippets, and the docs:

```text
lib/components/cards-grid.json
```

```json
{
  "name": "cards-grid",
  "function": "inventory",
  "form": "grid",
  "substance": "structure",
  "description": "2–4 parallel items, similar weight, scannable in a grid.",
  "purpose": "Use when the audience needs to compare or scan a small set of options at a glance. Avoid for more than 4 items — split into multiple slides.",
  "variants": ["compact", "loose", "dark", "mirror", "accent", "numbered", "four", "three"],
  "slots": {
    "title":  { "selector": "h2",         "required": true,  "description": "Slide heading." },
    "cards":  { "selector": "ul > li",    "required": true,  "description": "Each list item becomes one card. Lead each li with **Card Title.** then body text." },
    "insight":{ "selector": "blockquote", "required": false, "description": "Optional key-insight panel above the cards." }
  },
  "skeleton": "<!-- _class: cards-grid -->\n\n## Slide heading.\n\n- **First card title.** Body text for the first card, one sentence.\n- **Second card title.** Body text for the second card, one sentence.\n- **Third card title.** Body text for the third card, one sentence.\n- **Fourth card title.** Body text for the fourth card, one sentence.\n",
  "example": "examples/snippets/cards-grid.md",
  "anatomyBlock": "T7-card-grid-2x2"
}
```

The manifest is the **single source of truth** for everything *outside*
the rendering pipeline:

- the **scaffolder** (`npm run new:slide <name>`) emits the `skeleton`
- **VS Code snippets** are generated from the skeleton + name
- the **per-component docs** (`lib/components/<name>/<name>.docs.md`) are generated from the enriched manifest fields
- the **autocomplete data** for editor plugins reads `variants`
- the **gallery decision-tree** uses `function` → `form` → `name`

The rendering pipeline (CSS rules, JS post-processors, Mermaid
integration) is unchanged. The manifest is metadata, not behavior.

### 6.5 Universal variants — three tiers

Variants don't all belong to one component. Some apply to every layout
("dark", "with-period"); some apply to most ("compact", "loose",
"accent"); some are strictly per-layout ("mirror" for split-list,
"four" for cards-grid). The manifest model recognises three tiers:

**Tier 1 — Universal (25 variants).** Apply to every component. Added
automatically by `effectiveVariants()`; manifests must NOT list them.
Six categories:

| Category | Variants |
|---|---|
| Mood (1) | `dark` |
| Decoration (6) | `treatment-none`, `tint-corner at-tl`, `mark-orbit`, `tint-vignette`, `tint-edge at-right`, `mark-threads` |
| Typography (2) | `with-period`, `no-period` |
| Chrome (4) | `silent`, `no-header`, `no-footer`, `no-paginate` |
| State (8) | `wip`, `draft`, `tbd`, `confidential`, `redacted`, `archived`, `pinned`, `revised` |
| Tone (4) | `tone-pass`, `tone-warn`, `tone-fail`, `tone-skip` |

The State variants are the team-collaboration vocabulary — visible
markers for slides that are in-progress, confidential, or otherwise
need a meta-signal independent of the content. The Tone variants
reuse the state-token color system (pass/warn/fail/skip) at the
canvas level — a "this slide is the failure slide" treatment.

**Tier 2 — Semi-universal (3 variants).** Apply to most layouts but
not all. Manifests opt OUT via `excludes`; default is accepted.

| Variant | Excluded by |
|---|---|
| `compact` | layouts with no internal density (bookends, single-canvas) |
| `loose` | same |
| `accent` | dense ledger layouts where the focal is ambiguous |

**Tier 3 — Layout-specific.** The manifest's `variants` field. Things
like `mirror`, `numbered`, `four`, `chosen`, `donut`, etc. Specific to
one or a few layouts.

The validator rejects any manifest that lists a Tier 1 or Tier 2
variant in its `variants` array — those are added automatically, and
listing them risks drift if the universal set changes later.

---

## 7. Discovery

The decisive insight from rethinking the first pass: **a verbose
invocation does not aid discovery; tooling does.**

### For the CLI

```bash
npm run new:slide -- --list           # all components grouped by function
npm run new:slide -- cards-grid       # emit the skeleton to stdout
npm run new:slide -- cards-grid > my-slide.md
```

Implementation: `tools/new-slide.js`. Reads `lib/components/*.json`,
emits the `skeleton` field. With `--list`, groups by `function` and
prints `name — description` per row.

### For the editor

Generated `.vscode/lattice.code-snippets`. Typing `lattice-cards-grid`
in any `.md` file → autocomplete suggests the snippet → tab inserts
the full skeleton with placeholder slots. The snippet file is
generated from the same manifests; never hand-edited.

### For the browser (future)

A `docs/catalog.html` generated from manifests would deliver the
Storybook experience: every component with a thumbnail, description,
variant list, and example. Not in scope for the initial foundation;
the gallery decks fill this role partially today.

---

## 8. For each audience

### 8.1 Authors — pick the component, write the skeleton

A new author:

```bash
npm run new:slide -- --list           # browse the catalog
npm run new:slide -- compare-prose    # generate the skeleton
```

…copies the skeleton into their deck, fills in the slots, runs
`npm run build:gallery`, ships. The decision tree (which component
to use) lives in `docs/skill.md` and the visual gallery; it is not
encoded in the directive name.

Existing authors continue to write `<!-- _class: cards-grid -->` as
they always have. Nothing breaks. Nothing changes.

### 8.2 Theme designers — Finish ownership

Unchanged. Edit `themes/<name>.css`. Stay palette-blind: roles, not
colors. See `design.md` §1.3 and `docs/theming.md`.

### 8.3 Layout designers — adding a new component

1. Pick `function.form` coordinates. Confirm they're sanctioned in
   §4's matrix; if not, design first.
2. Write `lib/components/<name>.json` with the manifest fields.
3. Implement the CSS in `lattice.css`.
4. If `substance` is `structure`, add a post-processor in
   `lib/<name>.js` and wire into all three render paths.
5. Add a 6–10-slide demo deck in `examples/<name>.md` per
   `workflow.md`.
6. Regenerate VS Code snippets: `npm run snippets:build`.

The manifest is the contract; everything else flows from it.

### 8.4 Engine maintainers — the four substance contracts

The engine has exactly four plugin points, one per substance.

**Adding a new chart kind (substance = series).** Add a kernel module
`lib/<name>.js` exporting a function that takes the parsed list and
returns SVG sized to the chart-frame. Register the kind in
`CHART_LAYOUTS` in `lib/components/chart/_chart-family/chart-family.js`. Add CSS, manifest, demo
deck.

**Adding a new graph language (substance = graph).** Detect the fence
in `lattice-emulator.js`, `marp.config.js`, and `lattice-runtime.js`.
Resolve palette tokens. Inject into the language's theming API. Invoke
the external CLI. Inline the SVG. Add DIAGRAM OVERRIDES if needed.

**Adding a new structure layout (substance = structure).** Define the
canonical list shape. Write the post-processor. Wire into all three
render paths. Write the CSS. Manifest + demo deck.

**Adding a new prose layout (substance = prose).** Just CSS. Manifest
+ demo deck.

---

## 9. Component folder layout on disk

Each component is self-contained in a folder under its **bucket**:

```text
lib/components/inventory/cards-grid/
  cards-grid.manifest.json   ← schema-validated; declares bucket
  cards-grid.styles.css      ← extracted from lattice.css
  cards-grid.transform.js    ← post-processor (only for structure/series)
  cards-grid.docs.md         ← generated from manifest prose fields
  cards-grid.gallery.md      ← generated; the variant catalog source
  cards-grid.gallery.light.pdf  ← rendered light-theme gallery
  cards-grid.gallery.dark.pdf   ← rendered dark-theme gallery
```

### Buckets — the disk grouping

Components live under one of nine buckets. Seven match the audience-
function families from §3; two are substance-defined exceptions
introduced for maintenance colocation:

| Bucket       | Count | Origin |
|--------------|-------|--------|
| `anchor`     | 4     | function = anchor |
| `statement`  | 6     | function = statement |
| `inventory`  | 13    | function = inventory |
| `comparison` | 10    | function = comparison |
| `progression`| 8     | function = progression |
| `evidence`   | 6     | function = evidence |
| `imagery`    | 2     | function = imagery |
| `chart`      | 8     | substance = series (function stays evidence/progression) |
| `diagram`    | 1     | substance = graph (function stays evidence) |

For 49 of the 58 components `bucket === function`. The 9 chart/diagram
components (gantt, kanban, piechart, progress, quadrant, radar,
timeline-list, word-cloud → chart; diagram → diagram) declare their
`bucket` explicitly in the manifest; their `function` field is
unchanged. The audience-facing taxonomy in §3 is what authors use to
pick a component; the disk bucket is what engine maintainers use to
navigate the renderer-kernel-sharing code.

The bucket layout is reflected in three places only:
- the manifest's optional `bucket` field
- the filesystem path
- `groupByBucket()` in `lib/components/index.js`

Everything else — including the `<!-- _class: name -->` invocation —
is unchanged. Authors never type a bucket name.

### Per-bucket survey galleries

Each bucket has its own generated survey PDF:

```text
lib/components/inventory/
  inventory.gallery.md          ← generated from manifest.sample[…]
  inventory.gallery.light.pdf
  inventory.gallery.dark.pdf
```

The survey is one slide per bucket member (drawn from
`manifest.sample`) plus an opening title slide. Generated by
`npm run build:bucket-galleries`; never hand-edited.

### Shared infrastructure

Lives in flat subdirectories of `lib/`:

```text
lib/
  base/         ← tokens, elements, modifiers, variants, treatments
  chart-family/ ← shared dispatch for series substance
  engine/       ← match-section, resolve-palette, slot-label-lift, …
  helpers/      ← cross-cutting utilities
  shared/       ← shared.styles.css
  transformers/ ← registry.js + per-adapter shims
  components/   ← bucketed per-component folders
  _theme.css    ← top-level theme entry
```

The split is: per-component things go in the component folder;
catalog-shaped collections (components, integrations) nest per item;
flat infrastructure (base, engine, helpers, shared, transformers)
stays flat.

---

## 10. CSS architecture — bundling + `@layer`

Per-component CSS files (`lib/components/<name>/styles.css`) are
concatenated into `lattice.css` at build time. The bundled file is
committed (like `.vscode/lattice.code-snippets`) so the renderer
loads exactly one file with zero fetch dependency.

Cascade order is enforced via **CSS `@layer`** — independent of source
or bundle order:

```css
@layer base, root, scaffold, components, semi-universal, universal, diagram-overrides;
```

Each per-component CSS file wraps its rules in the `components`
layer:

```css
/* lib/components/cards-grid/styles.css */
@layer components {
  section.cards-grid h2 { … }
  section.cards-grid > ul { … }
}
```

Universal variants (`dark`, `with-period`, `tone-warn`, etc.) live in
`lib/_universal.css` wrapped in `@layer universal`, which always wins
over any component-level rule regardless of bundle order or
specificity. Adding a new universal variant is guaranteed safe — no
ordering bugs possible.

### The bundler

`tools/build-css.js` concatenates the following in declared order:

1. `lib/_base.css` — resets, `*`, `html`, `body`
2. `lib/_root.css` — `:root` tokens, font-face declarations
3. `lib/_scaffold.css` — `section`, `header`, `footer`, pagination
4. `lib/components/*/styles.css` — every per-component file (alphabetical)
5. `lib/_semi-universal.css` — `compact`, `loose`, `accent` rules
6. `lib/_universal.css` — `dark`, `with-period`, `tint-*`, `mark-*`, State, Tone, Chrome
7. `lib/_diagram-overrides.css` — Mermaid theme overrides

Output: `lattice.css` (committed). Header comment lists source files.

### npm scripts

| Script | Purpose |
|---|---|
| `npm run css:build` | Regenerate `lattice.css` from sources |
| `npm run css:check` | Fail if `lattice.css` is stale relative to sources (CI gate) |

The `css:check` script runs as part of the pre-push hook (along with
the snippets freshness gate). If anyone modifies a per-component
`styles.css` without regenerating, the push fails with a
"`npm run css:build` to regenerate" message.

### Migration

Components are extracted from the monolithic `lattice.css` in batches
of 5, with per-batch validation: rebuild the two baseline decks
(`gallery.md`, `gallery-mermaid.md`) plus the 58 per-component
galleries, then diff page-by-page (via `pdftoppm` rendering
to PNG) against the pre-batch baseline. Any visual change fails the
batch.

Until extraction is complete, un-migrated components' CSS remains in
`lib/_unmigrated.css` (the renamed residual `lattice.css` content),
which sits in `@layer components` alongside the migrated files.

---

## 11. What this document is NOT

- **Not a tutorial.** That is `skill.md`.
- **Not a layout catalog.** That role moved to per-component docs at
  `lib/components/<name>/<name>.docs.md`; this file's §3 keeps the
  function-family index that points there.
- **Not a palette spec.** That is `theming.md` + `design.md` §1.3–§1.6.
- **Not an architecture deep-dive.** That is `architecture.md`.
- **Not an authoring-grammar change.** Component names stay short.
  The four-layer model is for organizing the catalog, the docs, and
  the engine — not for typing.

---

## 12. The component model versus the alternatives

| Approach | Library that uses it | Pros | Cons |
|----------|----------------------|------|------|
| **Short component names + variant props** (this proposal) | shadcn, Chakra, Mantine, Slidev, Notion blocks | Terse author syntax. Familiar pattern. Discovery via tooling. | Two namespaces (components + variants) to learn. |
| Dotted/categorical names (`inventory.grid.cards`) | none in practice — was tried in commit `0ec93da`, reverted | Self-documenting at the call site. | Verbose. Authors learn ~70 path combinations vs ~35 names. Implementation surfaces (e.g. `evidence.canvas.chart.progress` for what used to be `progress`). |
| Atomic utility classes | Tailwind | Maximal composability. | Wrong layer — Lattice is at the slide level, not the property level. |
| HTML/JSX components | Spectacle, MDX decks | Slot semantics are explicit. Type-checkable. | Loses the Marp markdown-first contract. |
| Visual layout picker | PowerPoint, Keynote | Best discovery. | Requires a GUI; can't ship in a CLI tool. |

The short-name + manifest approach is the lowest-friction model that
keeps Marp markdown as the source format. The manifest layer adds the
discovery story that markdown alone can't provide.

---

## 13. Status

**Shipped on this branch:**

- This document — the canonical four-layer model + component contract.
- The 7-family taxonomy + 11 forms + 4 substances vocabulary.
- `lib/components/` — 58 manifests + loader + validator + universal-variant tiers. (Original 45 + 5 SPLIT-* + 6 legal-family + journey + post-Phase-5 renames, all promoted to first-class components.)
- `tools/new-slide.js` — the scaffolder.
- `.vscode/lattice.code-snippets` — generated from manifests.
- `examples/design-system.md` — the demo deck.
- Test scope rename — `test/unit/layouts/` → `test/unit/components/`, with `tools/affected-tests.js` updated to route changes under `lib/components/<name>/` to `test:components`.
- `cards-side` CSS extraction — split out of `cards-grid/styles.css` into its own `lib/components/cards-side/styles.css`. Validated by same-sandbox before/after PDF byte-compare on all five decks using either component (0–1 byte drift = pixel-identical).
- Per-component transform location — every component whose transform exists is now at `lib/components/<bucket>/<name>/<name>.transform.js`. The chart-family dispatcher itself lives at `lib/components/chart/_chart-family/chart-family.js` (underscore-prefixed so the component loader and bucket-wide CSS walker both skip it) — bucket-scoped shared infrastructure colocated with the bucket it serves.
- **`lib/_legacy.css` fully retired.** The 5,938-line monolith was split across 7 phases into 8 new source files (`_root.css`, `_base.css`, `_modifiers.css`, `_syntax-highlight.css`, `_chart-family.css`, `_backgrounds.css`, `_semi-universal.css`, `_diagram-overrides.css`) + 17 component folders. Bundle position of every block preserved to maintain cascade outcomes. See `docs/notes/2026-05-16-post-foundation-followups.md` for the open follow-ups (specificity-bump hacks introduced during extraction, @layer activation as the principled retirement path).
- **`tools/pixel-check.js`** — same-sandbox before/after PDF byte-compare with pdftoppm + ImageMagick pixel-diff fallback for mmdc non-determinism. Built mid-branch; got us through the 30+ extraction commits without a single false-positive regression slipping through.

**Shipped on the bucketed-layout branch (2026-05-18):**

- **Disk reorg into 9 buckets** (anchor, statement, inventory,
  comparison, progression, evidence, imagery + chart, diagram).
  58 components moved from flat `lib/components/<name>/` to
  bucket-nested `lib/components/<bucket>/<name>/`. Pixel-validated
  zero drift across all 89 pages of gallery.md against pre-move
  baseline in the same sandbox.
- **`bucket` field on the manifest schema**, with `BUCKETS`,
  `groupByBucket()`, `manifestBucket()` added to `lib/components/`.
  `loadAll()` learned the bucket-nested layout; backwards-compatible
  with the flat shape during migration.
- **Light/dark per-component galleries.** Every `<name>.gallery.pdf`
  renamed to `<name>.gallery.light.pdf`, and a sibling
  `<name>.gallery.dark.pdf` generated for all 58 components via
  `tools/build-galleries.js` (idempotent `dark` injection into every
  `_class` directive of the gallery source).
- **Per-bucket survey galleries.** 9 generated `<bucket>.gallery.md`
  sources composed from each bucket's `manifest.sample` set, rendered
  to `<bucket>.gallery.{light,dark}.pdf` via
  `tools/build-bucket-galleries.js`.
- **Discovery tools bucket-aware.** `tools/build-css.js`,
  `tools/build-component-docs.js`, `tools/preview.js`, and
  `tools/affected-tests.js` all tolerate both shapes during the
  migration; new collisions (the `diagram` component-name-equals-
  bucket-name case) handled explicitly.
- **Integration tests.** Each component now asserts BOTH light page
  count (= manifest formula) AND dark page count (must match light);
  each bucket asserts source-md-matches-manifests AND PDF page count
  = members + 1.

**Still deferred (see `docs/notes/2026-05-18-component-reorg-and-modular-css.md`):**

- State / Tone / Chrome universal-variant CSS — the metadata shipped
  in §6.5 but the actual CSS rules for these tiers haven't landed.
- **`@layer` activation across component CSS files (Phase 3.5).** The
  audit during the bucketed-layout refactor surfaced that only one
  component file (`regulatory-update`) currently carries an explicit
  `@layer` wrapper; the rest are unlayered. Full activation requires
  declaring layer order in `lib/_theme.css` AND wrapping every
  component + shared CSS file, which is a tractable but invasive
  follow-up that benefits from a human-reviewed design pass.
- **Modular CSS migration (Phase 4)** — moving component-specific
  universal-variant rules out of `lib/base/base.modifiers.css` and
  into each component's `<name>.styles.css`. Depends on the @layer
  activation above and on the per-rule token-set-vs-property-set
  audit. The disk-reorg phase has localized component sources so
  this is now mechanically straightforward; the design pass is still
  open.

**Ratified on this branch:**

- **Variant proliferation guardrail — doc rule, not a field.**
  When a variant changes the *shape* of the data (not just the
  visual treatment), it's a separate component. Today
  `inventory.ledger.bullets` has four sibling variants
  (`def`, `metric`, `spec`, `register`) — all the same flat-list
  shape, only the row layout differs, so they stay as variants.
  Kept as a review rule, not encoded in the manifest, to avoid
  inventing a `dataShape` field before we know we need one. Revisit
  if review judgement starts drifting.
- **Multi-substance components — `substance: "mixed"` on panel
  forms.** The four-substance plugin contract stays at four. Panel-
  form components that legitimately combine prose + structure
  (`featured` today) declare `substance: "mixed"` in their manifest.
  The loader allows this only when `form === 'panel'`. `mixed` is
  not a fifth plugin; it's a declaration that the component composes
  two existing contracts. See §5.

**Deferred (open questions):**

- Third-party library boundary tightening. The four-substance
  contracts are abstract; the first real integration (D2? Vega-Lite?)
  should be code-reviewed for boundary shape and the contract
  documented per what was learned.
- Visual catalog (`docs/catalog.html` or a desktop-app panel). Doable
  from manifests; not in scope for this branch.
