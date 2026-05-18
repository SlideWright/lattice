<!-- _class: title silent -->

# inventory

`13 components`

Inventory — parallel sets of related items.


---

<!-- _class: actors -->

## Who owns each part of the lifecycle.

- **Author.** Drafts the deck; owns content and framing.
- **Reviewer.** Validates clarity, factual accuracy, and audience-fit.
- **Engineer.** Ensures the build path renders the same PDF Marp preview shows.
- **Designer.** Owns the visual contract; palette tokens, layout balance, typography.
- **Operator.** Schedules the briefing; controls the room and the projector.

---

<!-- _class: agenda -->

## What this deck covers.

1. The four-layer model — Function · Form · Substance · Finish
2. Component manifests — the single source of truth
3. The forty-five shipped components, grouped by function
4. Discovery — scaffolder, snippets, this gallery
5. What ships next — open questions and follow-ups

---

<!-- _class: cards-grid -->

## The framework has four components.

- Signal Intake.
  - Weekly structured collection across customer conversations, market data, and competitive moves. Normalized into a common schema before scoring.
- Scoring Model.
  - Each signal scored on three dimensions — confidence, recency, and strategic relevance. Weights are team-configurable and reviewed quarterly.
- Decision Log.
  - Every decision recorded with the signals that informed it, the options considered, and the criteria applied. Feeds the calibration loop.
- Calibration Loop.
  - Monthly retrospective that compares predicted outcomes to actual outcomes and adjusts scoring weights accordingly.

---

<!-- _class: cards-side -->

## Two cards, equal weight, side-by-side.

- An explicit pair.
  - Two options, two phases, two artifacts presented with equal weight. The slide reads as a comparison without taking sides — neither half is the answer.
- Different from compare-prose.
  - compare-prose adds connector chrome and a chosen modifier. cards-side stays neutral and balanced — reach for it when neither option is the winner yet.

---

<!-- _class: cards-stack -->

## When to reach for cards-stack.

- Vertical reading order matters.
  - The audience scans top to bottom, not grid-style. Each card builds on the previous one as the eye moves down the slide.
- Each card has more body than a grid card.
  - Two sentences instead of one. cards-grid forces parallel density; cards-stack lets each card breathe with longer body text.
- Two to three items, not four-plus.
  - Beyond three cards the slide overflows. For more items, split across multiple slides or switch to cards-grid with shorter text.

---

<!-- _class: cards-wide -->

## When the items want full-width rows.

1. Each item has substantial body text
   - One to two sentences per item, more than a cards-grid card can hold without crowding. The row layout gives the body room to breathe.
2. The slide scans top-to-bottom
   - Reading order is sequential rather than parallel. The audience absorbs one row at a time rather than the whole set at a glance.
3. Three or four rows feels right
   - Beyond four rows the slide gets dense. For more items prefer list-tabular; for fewer items with shorter body prefer cards-stack.

---

<!-- _class: checklist -->

## Pre-flight checklist for a new component.

- [x] Pick function and form coordinates per the spec
- [x] Write the manifest with name, function, form, substance, and slots
- [x] Author CSS rules scoped to the section class
- [-] Add a transform module if substance is structure or series
- [-] Write a substantive example and README
- [ ] Update the templates catalog reference
- [ ] Add unit tests under the new component test path

---

<!-- _class: glossary -->

## Glossary

- Component
  - A self-contained unit at lib/components, one folder per component, with manifest plus styles plus example plus optional transform plus README.
- Function
  - The communication purpose a slide serves; one of seven families (Anchor, Statement, Inventory, Comparison, Progression, Evidence, Imagery).
- Form
  - The spatial composition of a slide; one of eleven shapes (bookend, divider, canvas, grid, stack, ledger, panel, matrix, scatter, timeline, split).
- Manifest
  - The JSON description of a component, consumed by the scaffolder, snippets, docs catalog, and autocomplete.
- Substance
  - The kind of data that fills the form; one of four (prose, structure, series, graph).

---

<!-- _class: list -->

## When the items truly are a list.

- Five to six short points, each under twelve words.
- No internal structure per item — if items have title + body, use cards-stack instead.
- Numbered (ol) when order matters; bulleted (ul) when it does not.
- Inline-code metadata at the end of a row becomes a pill via the universal-pill recipe.
- For richer items with descriptions, prefer list-tabular.

---

<!-- _class: list-tabular -->

## The four substance contracts a component plugs into.

1. Prose
   - Headings, paragraphs, inline emphasis — Marp markdown into semantic HTML.
   - _CSS-only; no post-processor required_
2. Structure
   - Headings plus nested lists with conventions; a post-processor rewrites the list into purpose-built DOM.
   - _Per-component transform.js in lib/components_
3. Series
   - Tabular DSL — axes and datapoints as bullets, parsed into geometry.
   - _Chart-family kernel (radar, quadrant, piechart, gantt, kanban)_
4. Graph
   - External graph language (Mermaid today; D2 or PlantUML in the future).
   - _External CLI; palette injected at build time_

---

<!-- _class: principles -->

## How we make calls when the spec is silent.

- **Default to the cheaper-to-reverse choice.** Reversible calls don't need a meeting; only the irreversible ones do.
- **Name the actor, never the system.** "The PM decides" lands; "the process decides" hides accountability.
- **Write down the bet on the same slide as the choice.** The decision and its predicted outcome live together — the calibration loop depends on it.
- **Form follows function.** Let the audience's need shape the layout, not the other way around.
- **One main idea per slide.** If you can't summarise it in one sentence, split it across two slides.

---

<!-- _class: statute-stack -->

## Children's data — three jurisdictions, three obligations.

- Federal
  - `15 U.S.C. §6501 · COPPA`
  - Verifiable parental consent for under-13 personal data.
  - Operators must post a clear notice and a deletion route.
  - `In effect since 2000`
- State
  - `Cal. Civ. Code §1798.120 · CCPA/CPRA`
  - Opt-in for selling or sharing under-16 data; opt-out for over-16.
  - DSAR handling within 45 days; deletion verified.
  - `Enforced 2023`
- Local
  - `NYC Admin Code §22-1201`
  - Bias-audit obligation for AEDTs used in employment decisions.
  - Annual audit + candidate notice + public summary.
  - `Effective 2023`

---

<!-- _class: tldr -->

## What this section will tell you, in five lines.

- Components stay short — `cards-grid` not `inventory.grid.cards`.
- The four layers organise the catalog; they do not name components.
- Manifests are the single source of truth for every component.
- Discovery happens via the scaffolder and IDE snippets, not the directive.
- Forty-five components ship — one folder each.
