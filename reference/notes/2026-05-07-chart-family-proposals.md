---
status: design-speculation
version: 2
supersedes: none
companion: 2026-05-04-authoring-proposals.md
last-status-update: 2026-05-15
---

# Lattice — Chart-Family Layout Proposals

> **Not canonical.** Sibling to [2026-05-04-authoring-proposals.md](2026-05-04-authoring-proposals.md). That note frames the component model, the modifier catalogue, the original 14 new-layout proposals, and the rollout plan. This note is the chart-family extension drafted three days later. For ground truth, use:
>
> - **`../references/templates.md`** — canonical template / layout reference.
> - **`../../examples/gallery.md`** — canonical authoring examples that actually render.
>
> When this document and either of those disagree, the gallery and template reference win.
>
> **Status legend (added 2026-05-15).** Each proposal carries a tag:
>
> - **Shipped** — canonical reference in `templates.md`. Authoring shape may differ from the original sketch; templates.md wins.
> - **Open** — not yet implemented; sketch below stands as the design starting point.
>
> The chart family has since grown beyond this catalogue: `quadrant` and `radar` shipped as chart-family members without going through these proposals. They are tracked in [2026-05-15-shipped-without-proposal.md](2026-05-15-shipped-without-proposal.md).

---

## Why this is its own note

The May 4 proposals catalogue covers content slides — the layouts authors fake out of `cards-grid` and `compare-prose` because nothing better exists. This note covers **chart slides** — the layouts authors today reach for Mermaid to draw, even when the underlying data shape is already a markdown list.

The shared frame: **list shape + inline-code pill = chart.** Each layout below pairs a markdown contract authors already know (ordered or unordered list, optional sub-bullet, inline-code chips) with a small renderer that reads structural meaning out of pill _position_ on the list item. The chip styling does not change; only the structural slots are new.

The discipline test for inclusion is the same one the May 4 note named: _"only promote when the markdown contract genuinely changes."_ Each layout in §1–§3 below earns that test against `gantt`, `cards-grid four`, or `compare-table`.

---

## 1. `timeline-list` — chronologies from pure list/sublist

> **Shipped.** Canonical reference: [Template 29b — `timeline-list`](../references/templates.md#template-29-chart-family-progress-timeline-list-piechart-gantt-kanban).

Lattice already ships an unstructured `timeline` layout. The proposal here is the **structured** sibling: a timeline whose markdown contract is a single ordered list, and whose visual richness is earned from the shape of the list itself — no Mermaid runtime, no DSL, no fenced block.

The user-visible promise is _"if you can write an outline, you have a timeline."_ Mermaid's `timeline` graph type renders beautifully, but it carries the full Mermaid theming surface, a parse step at runtime, and an authoring grammar that lives outside markdown. For the 80% case — three to seven dated stages, optionally grouped into eras, optionally annotated — a list-and-sublist contract is **already the data shape**. Lattice should render it directly.

**Authoring contract.**

```markdown
<!-- _class: timeline-list -->

## How the codebook architecture arrived in production.

1. `2024 Q3` Vault round-trip
   - First production tokenization shipped on a centralised vault. p99 60 ms; vault outages cascaded into application outages.
2. `2025 Q1` Codebook proposal `decision`
   - Architecture review accepts the in-process codebook model. Build approved over buy after a four-vendor evaluation.
3. `2025 Q3` Pilot `pilot`
   - One internal team, one workload, one quarter. Detokenize p99 lands at 8 ms.
4. `2026 Q1` Production `live`
   - Codebook signing live across all production tenants. HSM-anchored audit trail readable by Examiner role.
```

**Reading the shape.**

- The **ordered list** is the spine. Position in the list = position on the timeline. No date math required for ordering.
- The **inline-code prefix** on each title (`` `2024 Q3` ``) is the date pill — the same pill primitive Lattice already uses for eyebrows. The renderer pulls it out, renders it as a chip on the spine, and leaves the rest of the title as the headline.
- The **inline-code suffix** on the title (`` `decision` ``, `` `pilot` ``, `` `live` ``) is the status pill. One per item, optional. Reuses the existing pill component; semantic colours come from the modifier set (`status-decision`, `status-live`, etc. — same naming convention as `cards-grid` accent flags).
- The **single sub-bullet** is the body. Two-bullet maximum per item; anything richer belongs in `cards-stack` or the long-form `timeline`.

**Modifiers.**

- `horizontal` (default) — dot-on-line spine running left-to-right, items along the spine. Best for ≤ 5 items.
- `vertical` — spine runs top-to-bottom, content right of the spine. Best for ≥ 6 items or longer bodies.
- `era` — adjacent items sharing a date pill _prefix_ (`2025 Q1`, `2025 Q3` → era `2025`) collapse into named era bands behind the spine. Authors do not declare eras; the renderer infers them from the pill text. If they do not want grouping, they vary the prefix.
- `dated` — promotes the date pill to the primary label and demotes the title; useful for archaeology / changelog decks.
- `compact` / `loose` — standard cross-cutting density flags.

**Why this beats Mermaid for the 80% case.**

1. **Authoring stays in markdown.** No second grammar to learn. The same author writing `list-steps` already knows this shape.
2. **No runtime cost.** Pre-rendering a Mermaid timeline at build time is a 200 ms parse + SVG emit per slide; CSS-rendered timelines are free.
3. **Theme-aware by default.** Pills, spine, and eras read CSS variables, so `dark`, `accent`, and palette swaps work without a Mermaid var-map. (See [2026-04-30-mermaid-theming.md](2026-04-30-mermaid-theming.md) for the cost the var-map carries.)
4. **Linter-friendly.** The component manifest can validate the shape exactly the way it validates `cards-grid` or `list-steps` — Mermaid blocks are opaque to the linter today.

The escape hatch: when an author needs multi-track, branching, or curve-fitted dates, the existing `diagram` layout with a Mermaid timeline still ships. `timeline-list` is the default; Mermaid is the override.

---

## 2. `gantt` — schedules from list/sublist

> **Shipped.** Canonical reference: [Template 29d — `gantt`](../references/templates.md#template-29-chart-family-progress-timeline-list-piechart-gantt-kanban).

The natural sibling. A Gantt chart is two-dimensional — swimlanes on the y-axis, time on the x-axis, bars at the intersection — and that is exactly the shape of a two-level list with date pills. No fenced block, no Mermaid `gantt` grammar, no per-renderer theming. The authoring contract is:

> Top-level item = swimlane. Sub-bullet = bar in that swimlane. The bar's start and end come from inline-code pills on the sub-bullet.

**Authoring contract.**

```markdown
<!-- _class: gantt -->

## What ships in each phase, by workstream.

`2026 Q1 → 2026 Q4`

- Platform
  - Codebook signing `Q1 → Q2` `done`
  - Multi-tenant DEKs `Q2 → Q3` `live`
  - Per-purpose codebooks `Q3 → Q4` `at-risk`
- Operations
  - Manual rotation `Q1 → Q2`
  - Automated rotation `Q2 → Q3` `live`
  - Crypto-shred `Q3 → Q4`
- Compliance
  - Audit trail `Q1 → Q2` `done`
  - Centralised log `Q2 → Q3`
  - Examiner pack `Q3 → Q4`
```

**Reading the shape.**

- The **eyebrow** (`` `2026 Q1 → 2026 Q4` ``) declares the timeline window. The renderer divides the chart area into equal columns between those endpoints; intermediate gridlines come from the pills used by bars.
- Each **top-level bullet** is a swimlane label (sticky left column).
- Each **sub-bullet** is a bar. The bar's **range pill** (`` `Q1 → Q2` ``) is parsed for start and end. The arrow glyph is the convention; `→` and `..` and `–` all read.
- An optional **status pill** (`` `done` `live` `at-risk` ``) colours the bar — same status pill set as `timeline-list`, so the two layouts share visual language.
- The bar body text is the sub-bullet title. No nested sub-bullet beyond two levels — keeps the parse trivial and the linter rule cheap.

**Modifiers.**

- `quarters` (default) — column ticks at quarter boundaries. The eyebrow window is interpreted as quarters.
- `months` — column ticks at month boundaries. For shorter horizons.
- `weeks` — column ticks at week boundaries. For sprint-scale schedules.
- `today` — draws a vertical "now" rule at the current build date; bars whose end is before today render at full opacity, bars after today at 70%. Build-time only — no runtime clock.
- `dependencies` — when a sub-bullet contains an inline-code reference to another bar's title (`` `after: Codebook signing` ``), the renderer draws a thin dependency arrow between bars. Strictly opt-in; quiet when absent.
- `compact` / `loose` — density.
- `dark` — palette swap.

**Why this beats Mermaid Gantt.**

The same four reasons as `timeline-list`, plus one specific to Gantt:

5. **No date library.** Mermaid Gantt accepts ISO dates and emits a real time axis; that is powerful but overkill. `gantt` here treats the time axis as **categorical** (Q1, Q2, … or Jan, Feb, … or W14, W15, …), which is what executive-deck Gantts actually communicate. A bar starts at a tick; it ends at a tick; the audience reads relative position, not absolute days. Removing the date library removes the entire timezone / locale / date-format failure surface.

**Pill discipline.**

Both layouts inherit Lattice's existing pill primitive — inline-code spans rendered as small chips. The proposal adds **structural meaning** to specific pill positions (leading vs trailing on a list item; leading on the eyebrow), which is a contract the linter can enforce. The chip styling does not change. This means:

- Existing decks that put inline-code in titles for cosmetic reasons will not suddenly become timelines. The trigger is the layout class, not the pill.
- Authors who already understand pills as a visual primitive (`` `v2.4` `` in a card title, `` `configurable` `` in a header) get timeline / Gantt authoring for free — same primitive, new structural slot.
- The status pill set (`done`, `live`, `pilot`, `at-risk`, `decision`, `blocked`, `deferred`) is small, named, and shared across both layouts. Adding a new status is a one-line addition to the manifest.

**What this is not.**

- Not a project-management tool. There is no resource model, no critical path, no constraint solver. The output is a slide.
- Not a replacement for Mermaid where Mermaid is the right tool. Cross-link diagrams, real time-axis Gantts with daily resolution, and anything with curves or spatial layout still belong in `diagram` blocks.
- Not a new pill grammar. Inline-code is already the pill primitive; this proposal only assigns structural slots to its position on a list item.

The two layouts together cover, in my read of recent decks, every "we need a chart" moment that today gets faked with `compare-table` or hand-built Mermaid. They earn their keep on every roadmap, every retrospective, every status review.

---

## 3. The wider chart family — `piechart`, `progress`, `kanban`

The same authoring discipline (`list/sublist + leading/trailing pill = chart`) extends naturally to three more chart shapes. Each one earns a slide on the same retrospectives where `gantt` and `timeline-list` already would; each is one CSS pass plus a small DOM transform; none of them needs a new authoring grammar.

### 3.1 `piechart` — share-of-whole from a flat list

> **Shipped.** Canonical reference: [Template 29c — `piechart`](../references/templates.md#template-29-chart-family-progress-timeline-list-piechart-gantt-kanban).

A pie / donut chart is a flat list where each item carries a numeric pill. The renderer sums the pills, sweeps wedges proportionally, and emits an SVG. Authors do not pre-compute percentages; the math is the renderer's job.

```markdown
<!-- _class: piechart -->

## Where the engineering quarter went.

`H1 2026 · 1,840 person-hours`

- Codebook platform `46%`
- Operations runbook `22%`
- Compliance work `18%`
- Pilot support `9%`
- Toil & on-call `5%`
```

**Reading the shape.**

- Flat unordered list, one item per wedge.
- The trailing pill carries the share. Authors can write either percentages (`` `46%` ``, must sum to ≤ 100) or raw counts (`` `184` ``, renderer normalises). Mixing the two within one slide is a linter error.
- The wedge label is the bullet text; the legend is rendered to the right of the chart on landscape, beneath on portrait variants.

**Modifiers.**

- `donut` — hollow centre. The eyebrow's trailing fragment (`1,840 person-hours`) is centred in the hole as the total readout.
- `half` — semicircle (gauge-style). For "we are 73% done" framing where one number dominates.
- `legend-left` / `legend-bottom` — legend placement override.
- `compact` / `loose` / `dark` — standard.

**Why this beats Mermaid pie.** Mermaid's pie syntax (`pie title X / "label" : 46`) is a tiny DSL that does exactly what an inline-code pill already does. The list shape is honest about the data — it is a list of labelled magnitudes. Sorting, theming, and label overflow all become CSS / list operations.

### 3.2 `progress` — completion bars from list items

> **Shipped.** Canonical reference: [Template 29a — `progress`](../references/templates.md#template-29-chart-family-progress-timeline-list-piechart-gantt-kanban).

Many decks need a "where are we?" panel: three or four labelled progress bars stacked vertically. Today this gets faked with `stats` + emoji or a Mermaid timeline. The natural shape is a list with a percent pill.

```markdown
<!-- _class: progress -->

## Phase 1 readiness, by workstream.

- Codebook platform `92%` `on-track`
- Operations runbook `68%` `at-risk`
- Compliance audit pack `81%` `on-track`
- SDK polyglot parity `34%` `deferred`
```

**Reading the shape.**

- Flat unordered list, one row per bar.
- The first trailing pill is the completion percentage; renderer fills the bar.
- An optional second trailing pill is the **status pill** — same vocabulary as `timeline-list` and `gantt` (`on-track`, `at-risk`, `blocked`, `deferred`, `done`). It tints the filled portion.
- A sub-bullet (optional) becomes the row's footnote rendered below the bar in caption type. Use sparingly; one line max.

**Modifiers.**

- `target` — render a tick mark at a target percentage when the eyebrow declares one (e.g. `` `target 80%` ``). Bars past target get a chevron stamp.
- `stacked` — each row is a horizontal stacked bar; the percent pill becomes a sequence of pills (`` `done 60%` `` `` `in-progress 25%` `` `` `blocked 15%` ``). Useful for portfolio rollups.
- `radial` — render as concentric arcs instead of bars. Same data shape; spatial alternative for hero slides.
- `compact` / `loose` / `dark`.

**Why this is not just `stats`.** `stats` is dimensionless KPI numbers (a number + a label). `progress` carries a 0-100 magnitude and a target that is meaningful to fill against — a different visual contract. Authors today pick `stats` because it is the closest thing; the linter would reject `92%` as a `stats` value because it is not a delta or a count.

### 3.3 `kanban` — boards from a three-level list

> **Shipped.** Canonical reference: [Template 29e — `kanban`](../references/templates.md#template-29-chart-family-progress-timeline-list-piechart-gantt-kanban). Authoring contract migrated 2026-05-14 from 2-level + 3 trailing pills to a 3-level list with one pill per line (GitHub Projects nomenclature) — see the note below.

A Kanban board is the natural cousin of `gantt`: top-level items are columns instead of swimlanes, sub-bullets are cards instead of bars. The time axis is replaced by status. Same primitives, transposed.

> **Note — authoring convention updated 2026-05-14.** The original proposal
> put size, label, and status as trailing inline codes on a single card line.
> The shipped convention uses GitHub Projects nomenclature with one code per
> line; see Template 29e in `reference/engineering/templates.md` for the canonical reference.

```markdown
<!-- _class: kanban -->

## Where Phase 2 work stands today.

- Backlog
  - Per-purpose codebooks `S`
    - compliance
  - Crypto-shred runbook `M`
    - platform
  - Dependency dashboard `S`
- In progress
  - Multi-tenant DEKs `M`
    - platform `at-risk`
  - Examiner pack v2 `L`
    - compliance
- Review
  - Automated rotation `M`
    - platform
- Done
  - Codebook signing `L`
    - platform `done`
  - HSM audit trail `M`
    - compliance `done`
```

**Reading the shape.**

- Top-level item = column. Column count is whatever the author writes; renderer balances column widths.
- Second-level bullet = card. One optional trailing code is the **size badge** (`S` / `M` / `L` / `XL`), rendered as a square chip right-aligned in the title row.
- First sub-bullet of a card = **meta line**. Prose is the **label** (drives the coloured left stripe); one optional trailing code is the **status** (`done`, `at-risk`, `blocked`, …).
- Second sub-bullet of a card (optional) = **body text**, rendered italic and muted below the meta row.
- One inline code per line — never two codes on the same line.

**Modifiers.**

- `wip-limits` — when a column header carries a numeric pill (`Backlog `` `8` ``, `In progress `` `3` ``), the renderer stamps the limit and shades the column header red when card count exceeds it.
- `swimlanes` — adds a horizontal grouping axis: cards sharing a lane pill cluster into a horizontal band across all columns. Good for portfolio kanbans where lane ownership matters more than column.
- `compact` (default at ≥ 4 columns) / `loose` / `dark`.
- `numbered` — stamps a card index on each card (col 01-1, col 01-2, …) so the slide can be referenced precisely in voice-over.

**Why this beats a hand-built `cards-grid`.** Authors already fake kanban boards with `cards-grid four` and a header pattern; the result is visually OK but loses the column-as-status semantics — the linter cannot enforce "every card has a status", screen readers announce four card grids instead of four lists, and adding a column means rebuilding the grid. The two-level list shape is already the data; this just gives it a renderer.

### 3.4 Why this family belongs together

`piechart`, `progress`, and `kanban` complete a four-quadrant chart family alongside `gantt`:

| Layout      | Time?            | Magnitude?         | Spatial structure                  |
| ----------- | ---------------- | ------------------ | ---------------------------------- |
| `gantt`     | yes, categorical | duration           | swimlanes × time                   |
| `timeline-list` | yes, ordinal | n/a                | spine + items                      |
| `piechart`  | no               | share-of-whole     | radial wedges                      |
| `progress`  | no               | percentage to goal | horizontal bars                    |
| `kanban`    | no               | n/a (status flow)  | columns × cards                    |

Every cell shares the same primitives: ordered/unordered list, leading or trailing inline-code pills, optional sub-bullet for body. The linter rule for the family is one schema with five layout-specific slots — small enough to keep in `components.json` without it becoming a configuration sprawl.

### 3.5 Build cost reality check

Each chart layout is roughly:

- One DOM transform in `lattice-emulator.js` (parse list, extract pills, emit chart container).
- One CSS file or section in `lattice.css` (chart geometry, pill chips, palette hooks).
- One SVG-emitting helper (only `piechart` and `progress radial` need SVG; the rest is pure CSS layout).
- One linter rule (validate pill positions and counts).
- One gallery slide per modifier set.

That is a contained surface — far smaller than the Mermaid runtime / theming integration we already maintain (see [2026-04-30-mermaid-theming.md](2026-04-30-mermaid-theming.md) and the `mermaid-runtime-architecture` notes). The whole family ships in roughly the same effort budget as one new Mermaid graph type would cost to theme — and we keep the authoring grammar inside markdown.

---

## 4. Adjacent candidates worth considering

The discipline test for adding a layout is the one named in §1: _"only promote when the markdown contract genuinely changes."_ The five below pass that test — each has a shape that today gets faked with `cards-grid` or `compare-table` and loses information in the process. Listed in rough order of authoring frequency in real decks I have seen.

### 4.1 `funnel` — narrowing magnitude stages

> **Open.** Not yet shipped. No real-deck request yet.

Sales pipelines, conversion funnels, recruiting funnels, attention-to-action sequences. Same shape as `piechart` (flat list + magnitude pill) but the geometry is a stack of trapezoids whose width is proportional to the pill value, with a drop-off pill rendered between adjacent stages.

```markdown
<!-- _class: funnel -->

## Where Phase 1 candidates fell out of the pipeline.

`Top of funnel · 12,400 · → 184 hires`

- Sourced `12,400`
- Phone screen `2,180` `-82%`
- Onsite `640` `-71%`
- Offer `220` `-66%`
- Accepted `184` `-16%`
```

The trailing optional drop-off pill is sugar — if absent the renderer computes it. Modifiers: `inverted` (widening — adoption / coverage growth), `compact` / `loose` / `dark`.

### 4.2 `org` — hierarchies from nested lists

> **Open.** Not yet shipped. Mermaid `flowchart TB` covers the use case for now.

Nested unordered list = tree. Reporting structures, system component hierarchies, taxonomy slides. Today these get hand-built as Mermaid `flowchart TB` graphs; the authoring shape is already a list — no graph grammar required.

```markdown
<!-- _class: org -->

## Who reports into the codebook platform org.

- Platform Director `12 reports`
  - Codebook engineering `5`
    - Cryptography lead
    - Signing pipeline lead
    - SDK lead × 3
  - Operations `4`
    - Runbook owner
    - On-call lead × 3
  - Compliance liaison `2`
    - Audit lead
    - Examiner contact
```

Renderer walks the list, lays out a tree (top-down by default; left-right with the `flow` modifier), uses the trailing pill on each node as a count badge. Modifiers: `flow` (left-to-right), `radial` (centre-out, for ecosystem / partnership maps), `compact` / `dark`.

The escape hatch stays Mermaid `flowchart` for anything with cross-edges or non-tree topology. `org` is for clean trees, which is 90% of "show me the org chart" slides.

### 4.3 `heatmap` — categorical grid with intensity pills

> **Open.** Not yet shipped. `obligation-matrix` (legal family) overlaps for binary status grids; full numeric-heatmap layout still pending.

A two-axis grid where every cell carries a magnitude. Risk × impact, capability × team, calendar week × status. Authors fake this today with `compare-table` plus emoji or background-colour spans; the linter cannot validate it and the colour scale is inconsistent across decks.

```markdown
<!-- _class: heatmap -->

## Phase 2 risk register, by workstream and severity.

`Likelihood × Impact`

| Workstream  | Low      | Medium   | High      |
| ----------- | -------- | -------- | --------- |
| Platform    | `2`      | `1`      | `0`       |
| Operations  | `3`      | `2` `at-risk` | `1` `blocked` |
| Compliance  | `1`      | `0`      | `0`       |
| SDK         | `2`      | `1`      | `1` `at-risk` |
```

Each cell is a count pill with an optional status pill. Renderer reads the count, maps it to a single shared colour ramp, and applies the status pill as a corner stamp. Modifiers: `diverging` (centre-zero ramp, for delta heatmaps), `binary` (on/off only), `compact` / `dark`.

### 4.4 `q-and-a` — anticipated objections, paired

> **Open.** Not yet shipped. `cards-stack` with `Q.` / `A.` prefixes covers it informally.

Every meaningful deck ends with three or four expected questions and the team's prepared answer. Today these are faked with `cards-stack` and a `Q.` / `A.` prefix; the layout machinery does not know what it is, so the question and answer get the same visual weight and the slide reads as a flat list.

```markdown
<!-- _class: q-and-a -->

## What we expect to be asked, and what we will say.

- Why not extend the existing vault for two more years?
  - The vault model adds 50 ms per detokenize. With per-record reads in the new claims pipeline, that adds 8 minutes to a single batch — outside the SLA. The architecture cannot absorb it.
- What if the HSM vendor changes pricing in 2027?
  - Our KEK material is portable across the three HSMs in the procurement shortlist. A vendor swap is a 6-week project, not an architectural rewrite. The codebook model insulates us.
- How is this different from what Vendor X just announced?
  - Vendor X announced a hosted version of the same idea. We have the same architecture in-process, with no per-tenant licensing and no data leaving the boundary.
```

The top-level bullet is the question (renders larger, with a leading `Q.` chip); the sub-bullet is the answer (renders smaller, with a leading `A.` chip). Modifiers: `decision` (frames the answer card with an emphasis edge — for the question that determines the meeting outcome), `compact`.

### 4.5 `spectrum` — placement on a single axis

> **Open.** Not yet shipped. `radar` covers multi-axis maturity placement; single-axis spectrum still pending.

A horizontal axis with named endpoints and one or more markers. "Where does our team sit between centralised and federated?" "How mature is each capability?" Today this is hand-drawn in a diagram block.

```markdown
<!-- _class: spectrum -->

## Where each capability sits on the maturity axis.

`Reactive ←——————————→ Anticipatory`

- Codebook signing `0.9`
- Operations runbook `0.6`
- Compliance audit `0.7`
- SDK polyglot parity `0.3`
```

Eyebrow declares the axis with `←——→` markers between endpoint labels (renderer parses on `←` and `→` glyphs or `..`/`->` ascii equivalents). Each list item carries a position pill in `0.0–1.0`. Renderer draws the axis and stamps each marker. Modifiers: `vertical`, `dual` (two parallel axes for before / after placement), `compact`.

### 4.6 Why these five, and not the next ten

Five candidates I considered and held back, with the reason:

- **`persona`** — name + portrait + traits. The portrait slot pulls in image-handling complexity that does not fit the list/pill discipline; build it as a `cards-side media` modifier instead.
- **`radar` / `spider`** — multi-dimensional comparison. Genuinely useful, but the markdown shape (list of axes, each with N values per subject) is awkward and the SVG cost is non-trivial. Defer until two real decks ask for it.
- **`sankey`** — flow between categories. Beautiful when it works; the layout algorithm is the entire reason Mermaid exists for this. Stay in `diagram` blocks.
- **`fishbone` / `cause-effect`** — diagonal branches. The visual is iconic but the markdown shape is a tree we already cover with `org`. Promote later if the spine geometry earns it.
- **`mindmap`** — radial tree. Same argument as `sankey`: this is what Mermaid is for.

The pattern is consistent — promote when the markdown contract is already a list-shape we can read structurally; stay in `diagram` blocks when the layout algorithm itself is the value.

---

## Closing note

The chart family above is one DOM-transform pass per layout, one CSS section per layout, and one shared status-pill vocabulary across all of them. Compared to the Mermaid runtime cost catalogued in [2026-04-30-mermaid-theming.md](2026-04-30-mermaid-theming.md), the entire family fits under the budget of theming a single new Mermaid graph type — and keeps the authoring grammar inside markdown.

Rollout sequencing for these layouts should slot into the staged plan in [2026-05-04-authoring-proposals.md §4.6](2026-05-04-authoring-proposals.md#46-rollout-order); they are most naturally a fourth wave after the original new-layout proposals land.
