# The Lattice Design System

**Function · Form · Substance · Finish — organized as components.**

This document is the canonical mental model for Lattice. It is the
*meta*-organization that sits above the existing references — it tells
you what kind of thing each layout, modifier, chart engine, or palette
token *is*, and how they compose.

If you read exactly one Lattice document, read this one. The other
references (`skill.md`, `templates.md`, `theming.md`, `architecture.md`)
become specialist references for one layer once you have this model.

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
| **Statement**  | one declarative claim                              | `big-number`, `quote`, `split-panel`, `content` |
| **Inventory**  | a parallel set of related items                    | `cards-grid`, `cards-stack`, `list`, `actors`, `principles`, `agenda`, `tldr`, `glossary`, `list-tabular`, `checklist` |
| **Comparison** | how two or more options differ                    | `compare-prose`, `compare-code`, `compare-table`, `before-after`, `verdict-grid`, `decision`, `matrix-2x2` |
| **Progression**| an ordered movement through stages or time        | `timeline`, `list-steps`, `list-criteria`, `roadmap`, `gantt`, `kanban` |
| **Evidence**   | data that supports the argument                    | `stats`, `kpi`, `chart-family` (progress, piechart, timeline-list), `radar`, `quadrant`, `word-cloud`, `diagram`, `code` |
| **Imagery**    | a visual that carries its own meaning              | `image`, `featured` |

Test: an author opens a blank slide. The question "what is this slide
*for*?" must have an answer that is one of these seven. If a real
slide is hard to place, the families are wrong. The current ~35
layouts mapped cleanly into seven.

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
| **series**    | Tabular DSL (axes + datapoints as bullets)  | `lib/chart-family.js` + per-chart kernel            | SVG       |
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
  "docs": "docs/references/templates.md#cards-grid"
}
```

The manifest is the **single source of truth** for everything *outside*
the rendering pipeline:

- the **scaffolder** (`npm run new:slide <name>`) emits the `skeleton`
- **VS Code snippets** are generated from the skeleton + name
- the **docs catalog** (templates.md) groups by `function`
- the **autocomplete data** for editor plugins reads `variants`
- the **gallery decision-tree** uses `function` → `form` → `name`

The rendering pipeline (CSS rules, JS post-processors, Mermaid
integration) is unchanged. The manifest is metadata, not behavior.

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
`CHART_LAYOUTS` in `lib/chart-family.js`. Add CSS, manifest, demo
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

## 9. What this document is NOT

- **Not a tutorial.** That is `skill.md`.
- **Not a layout catalog.** That is `templates.md`, which is being
  reorganized to group by function family.
- **Not a palette spec.** That is `theming.md` + `design.md` §1.3–§1.6.
- **Not an architecture deep-dive.** That is `architecture.md`.
- **Not an authoring-grammar change.** Component names stay short.
  The four-layer model is for organizing the catalog, the docs, and
  the engine — not for typing.

---

## 10. The component model versus the alternatives

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

## 11. Status

**Shipped on this branch:**

- This document.
- The 7-family taxonomy + 10 forms + 4 substances vocabulary.
- `lib/components/*.json` — one manifest per layout.
- `tools/new-slide.js` — the scaffolder.
- `.vscode/lattice.code-snippets` — generated from manifests.
- `examples/design-system.md` — the demo deck.

**Deferred (open questions):**

- Variant proliferation guardrail. Today `inventory.ledger.bullets`
  has four sibling variants (`def`, `metric`, `spec`, `register`).
  When does a variant graduate to its own component? Suggested rule:
  when a variant changes the *shape* of the data (not just the visual
  treatment), it's a separate component.
- Multi-substance components. `featured` mixes prose + structure in
  one panel. The four-substance model says each component has one
  substance source. Either (a) `panel` components can mark their
  substance as `mixed`, or (b) we name a fifth substance `composite`.
  Recommend (a) for now; revisit if a second multi-substance form
  emerges.
- Third-party library boundary tightening. The four-substance
  contracts are abstract; the first real integration (D2? Vega-Lite?)
  should be code-reviewed for boundary shape and the contract
  documented per what was learned.
- Visual catalog (`docs/catalog.html` or a desktop-app panel). Doable
  from manifests; not in scope for this branch.
