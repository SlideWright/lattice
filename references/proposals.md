# Lattice — Authoring Enhancement Proposals

> A design document, not a spec. Every proposal here is reversible: it adds capability without changing what already works. Existing decks render identically until an author opts into a new modifier or layout.

This document is a tour of where Lattice could go next as an authoring system. It is organised into three parts and a closing plan:

1. **The component model** — the shared idea that turns layouts and modifiers into a system rather than a pile of CSS classes.
2. **Modifier catalogue** — proposed modifiers for every existing layout, plus a small set of cross-cutting ones that apply almost everywhere.
3. **New layout proposals** — components that today's deck authors hand-roll out of `cards-grid` and `compare-prose` because nothing better exists.
4. **Authoring DX & rollout plan** — the small bets in tooling that compound, and the order I would ship the rest in.

---

## Part 1 — The component model

### What a Lattice layout already is

A Lattice layout, today, is three things at once:

1. **A markdown contract.** The author writes a fixed shape — `## heading`, then `ol > li > strong + p`, etc. Each layout has a single canonical shape (see [templates.md §Layout Inventory](./templates.md)).
2. **A DOM transformation.** For structured layouts, `lattice.js` rewrites the contract into purpose-built HTML (`.cards-grid-inner > .card`, `.stats-row > .stat-item`). For unstructured layouts, the markdown emits its own HTML directly.
3. **A visual contract.** CSS targets the resulting DOM and produces the rendered slide.

Read together, that is a **component**: an authorial intent (`compare two paths`), a stable input shape (`two top-level list items, each with title + body`), and a stable output (`two cards, optional connector, optional below-note`). The author writes intent; the renderer guarantees the output.

This is already the right model. We just have not yet exploited it.

### What is missing today

The system has 26 layouts and **two** modifiers (`dark` everywhere, `left` on `image`). That is a stark imbalance. Every layout has exactly one rendered form, and any deviation from that form requires authoring a new layout.

Authors today work around the gap in three predictable ways:

- **They overload `cards-grid` and `compare-prose`** for any mid-deck content slide. Look at any non-trivial deck (the tokenization deck on screen right now is a faithful sample): half the slides are one of these two layouts because nothing more specific exists.
- **They rebuild visual variations by hand** — duplicating `cards-stack` slides and tweaking one to feel "more important", or pasting `## STAGE 01` strings into `list-steps` because the layout only knows the word `STEP`.
- **They mix presentation and prose** when a slide needs to feel different — putting `> blockquote` panels everywhere because that is the only "this matters more" primitive.

Every one of these is a missing modifier or a missing layout.

### What a modifier should be

A modifier is **a named adjustment to a layout that preserves the markdown contract**. The author adds a class word to `<!-- _class: name -->` and the rendered output changes; the markdown source does not.

Three rules separate a real modifier from a cosmetic flag:

1. **Encodes editorial intent, not appearance.** `compact` is appearance. `phase` is intent — and `phase` happens to render compactly because phases are usually three or four wide. The intent name survives a future redesign; the appearance name does not.
2. **Composes cleanly.** A modifier should stack with `dark`, with the layout's own variants, and (where it makes sense) with other modifiers. If two modifiers conflict, that is a signal to split them or rename them, not to add precedence rules.
3. **Earns its keep.** A modifier exists because authors are working around its absence today. The catalogue below is bounded by that test — every entry below is one I can point to authoring in the wild trying to fake.

A modifier is _not_ a layout. The boundary: if the markdown contract changes, it is a layout; if only the rendering changes, it is a modifier. `list-steps` with `phase` is still steps. `list-steps` with `swot` would be a different markdown shape (four labelled quadrants), so `swot` is its own layout.

### The component contract, made explicit

Every Lattice layout should publish four things:

```
Layout: list-steps
  Intent:    A horizontal sequence of N labelled stages.
  Markdown:  ## heading + ol > li (**title** + body)
  DOM:       section.list-steps > ol > li[STEP NN]
  Modifiers: phase | stage | rank | milestone | vertical | compact | …
```

That block is what a SKILL.md entry, a snippet, and a linter rule all read from. Today it lives implicitly in CSS comments and prose. Making it explicit (Part 4 below) is what turns Lattice from "a theme with conventions" into "a slide component library."

---

## Part 2 — Modifier catalogue

### 2.1 Cross-cutting modifiers

These compose with most layouts. Each one names an authorial intent that recurs across content types.

| Modifier   | Intent                                                                       | Applies to                                                                              | Effect                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `dark`     | _existing_ — invert canvas for emphasis                                      | every layout (already)                                                                  | Remap `--bg`/`--text-*` to dark tokens                                                                                                          |
| `accent`   | "this slide matters more than its neighbours, but does not need to go dark"  | `content`, `cards-grid`, `cards-stack`, `compare-prose`, `featured`, `quote`, `closing` | Tints `--bg` toward `--accent-soft`, promotes border to `--accent`. Lighter than dark, heavier than default.                                    |
| `compact`  | "I have one more bullet than fits"                                           | every list/grid layout                                                                  | One step down on `--sp-*` and `--fs-*` body sizes; gap shrinks by one tier.                                                                     |
| `loose`    | "I have only two items and want them to feel monumental"                     | every list/grid layout                                                                  | One step up on padding + gap; minimum item height enforced.                                                                                     |
| `mirror`   | "flip the asymmetric layout"                                                 | `image`, `featured`, `split-panel`, `cards-side`, `compare-prose`                       | Swap left/right halves. Replaces today's `image left` (which becomes `image mirror` for consistency).                                           |
| `centered` | "this is a moment, not a working slide"                                      | `content`, `list`, `cards-stack`                                                        | Centers heading + body horizontally. Pairs with `loose` for ceremonial slides mid-deck.                                                         |
| `framed`   | "treat the slide as a single panel" (heavy border, inset chrome)             | `diagram`, `image`, `quote`, `code`                                                     | Adds 1px accent border at slide-edge inset, suppresses the top spectrum bar. Good for "exhibit" slides.                                         |
| `numbered` | "this slide is the Nth of a series; show the index"                          | `divider`, `subtopic`, `closing`                                                        | Renders a stamped numeric badge in a corner using a CSS counter scoped to siblings of the same class. Auto-increments without author bookkeeping. |
| `silent`   | "this slide should not paginate or appear in the page count"                 | every layout                                                                            | Sets `paginate: false` semantics via CSS, adds a `data-skip` flag for downstream tooling.                                                       |

`dark` and `accent` are the **emphasis tier**. `compact` and `loose` are the **density tier**. `mirror` and `centered` are the **orientation tier**. They are independent dimensions and stack: `cards-grid dark compact mirror` is a legitimate combination.

### 2.2 Per-layout modifiers

Each entry below is the layout, the modifiers I propose, and a one-line rationale. Where the user explicitly called something out (`list-steps` family), I expand.

#### Bookend layouts

**`title`**
- `cover` — full-bleed background image; title overlays, no dark canvas. For decks that lead with imagery.
- `chapter` — large numeric badge ("01", "II") next to the title. Replaces hand-rolled chapter openers.
- `minimal` — eyebrow + title only, no subtitle, no accent line. For decks where the title is the whole moment.

**`divider`**
- `numbered` — auto-increments "01 / N" using a CSS counter scoped to `section.divider`. The author writes the title; the index is computed.
- `appendix` — distinct treatment (lighter weight, `APPENDIX` label, no accent bar). Solves the user's tokenization-deck pattern (`Appendix A · Infrastructure`) without manual styling.
- `progress` — stamps tick marks for total sections with the current one filled. Makes "where am I in the deck" legible.

**`subtopic` / `closing`**
- `quote` (closing) — turns the closing slide into a quoted thought rather than a tagline. Closing slides should not all look the same.
- `cta` (closing) — bumps a single line of text to display weight. For "the action is X" finals.
- `signature` (closing) — adds a date/author footer line in the editorial style.

#### Content & prose layouts

**`content`**
- `lead` — drop cap on the first paragraph, larger body, like a magazine opener. For long-prose context slides.
- `letter` — formatted as a personal note (signature line, mono date stamp). Niche but high-impact for pitch decks.
- `essay` — narrower measure (~640px max-width) with generous line-height. For when the whole slide is one paragraph.

**`quote`**
- `attribution` — large attribution treatment (portrait-slot + name + role on one line beneath the quote).
- `pull` — smaller chrome, no quotation marks, intended as a pull quote inside a section rather than a standalone slide.
- `manifesto` — multi-paragraph body, smaller font. For a series of declarations.

**`list`**
- `compact` / `loose` (cross-cutting)
- `check` — green checkmark pill before each item (positive list).
- `cross` — red ✗ before each item (anti-list — "things we are not doing").
- `bullet` — restore visible bullets. (Today the layout strips them; some content reads better with them.)

**`list-criteria`**
- `score` — adds a numeric score badge per item, right-aligned.
- `weighted` — shows percentage weight as a meter bar. For criteria-with-weights audits.
- `pass-fail` — replaces the leading number with a ✓ / ✗ / ~ badge. Decision-grid alternative to `verdict-grid` when the criteria are binary.

**`list-steps` ★** (user-prompted; this is the exemplar for naming-as-intent)

The current layout writes `STEP 01`, `STEP 02`. That word is wrong half the time. Each modifier below changes the prefix and, where appropriate, the visual chrome:

- `phase` — `PHASE 01`. Period-of-time semantics. Heavier separator between cards (the gap between phases is meaningful).
- `stage` — `STAGE 01`. Discrete plateau semantics. Slightly different connector glyph (chevron → bar).
- `milestone` — `MILESTONE 01`. Achievement semantics. Diamond connector, accent fill on each card's badge.
- `rank` — drops the prefix entirely; the number itself is the point. For top-3 / top-5 lists where order = priority, not chronology.
- `tier` — `TIER 01`. Hierarchy semantics. Accent intensity grows from left to right (or top to bottom in `vertical`).
- `vertical` — flips the row to a column. Content gets more room per item; usable for 5-7 steps where horizontal fails.
- `lettered` — A, B, C instead of 01, 02, 03. For when steps are options, not sequence.
- `roman` — I, II, III. For ceremonial decks.

A slide carrying `<!-- _class: list-steps phase -->` is then both editorially clearer and visually correct. The author did not have to rename anything; the prefix word followed the intent.

**`list-tabular`**
- `compact` (cross-cutting)
- `dense` — restores full grid borders for ledger feel.
- `monospaced` — body in `--font-mono` for spec/protocol slides.

#### Card layouts

**`cards-grid`**
- `three` — 3 columns instead of 2.
- `four` — 4 columns. Auto-shrinks body type.
- `compact` / `loose` (cross-cutting)
- `inset` — softer chrome (no border, only `--bg-alt` fill). Reads as "informal", contrasts with the bordered default.

**`cards-stack`** ★ (user explicitly mentioned `vertical`/`horizontal`)
- `horizontal` — flips the stack to a row of equal-width cards. (Default stays vertical.) Gives authors a shorthand for "3-up cards without nested bullets."
- `compact` / `loose` (cross-cutting)
- `inset` — see above.
- `accordion` — narrow strip per item with a leading marker. For long lists where each item is short.

**`cards-side`**
- `mirror` (cross-cutting) — already implicit; make it official.
- `media` — first card slot becomes an image placeholder.

**`cards-wide`**
- `phases` / `milestones` / `stages` — same prefix-rename family as `list-steps`. Authors should not have to choose between the two layouts based on which word the layout supports.
- `lettered` / `roman` — number style.

**`featured`**
- `mirror` — hero on the right.
- `tall` — hero spans full slide height (current).
- `wide` — hero spans both columns at top, sub-cards in a row below. New shape.

**`verdict-grid`**
- `winner` (current default — last card accented).
- `runner-up` — first card accented, others diminished. For "the decision was already made" reveal.
- `ranked` — explicit 1st / 2nd / 3rd / 4th badges replace the spotlight glyph. For comparison decks where ordering is explicit.

#### Layout & relational

**`split-panel`**
- `mirror` — left/right swap.
- `chapter` — big chapter numeral on the dark panel (replaces the watermark with a numeric stamp).
- `metrics` — right side becomes a stat block instead of a list. For "section opener with the section's KPIs."

**`compare-prose`** ★ (heavy use in the user's deck)

This is the layout authors abuse most because there is no native "decision" layout. Modifiers turn it into one:

- `tradeoff` — neutral two-card (current default).
- `chosen` — second card highlighted as the chosen path (accent fill, `CHOSEN` badge).
- `rejected` — first card visually de-emphasized as rejected (struck title, muted body, `REJECTED` badge).
- `decision` — pairs `rejected` + `chosen` automatically; both badges appear.
- `three` — three-way comparison.
- `vertical` — stack the cards vertically. For long-body comparisons where horizontal forces ellipsis.

The author of the tokenization deck has eight `compare-prose` slides, every one of which is a "considered then chose" — `decision` would name that intent directly.

**`compare-table`**
- `striped` — zebra rows.
- `score` — last column emphasised as a score/total column.
- `flagged` — marks one row (by `**bold**` cell or class) as the chosen row.

**`compare-code`**
- `diff` — green/red gutter on changed lines (parses fence content for `+` / `-` markers, or relies on `diff` language).
- `before-after` — labels swap to BEFORE / AFTER pills.
- `vertical` — stack the two blocks. For mobile-aspect or long-line code.
- `editor` — adds editor chrome (filename tab) — see also `code` modifiers.

#### Data layouts

**`stats`**
- `delta` — each stat is a before/after pair with a delta arrow.
- `axis` — adds a subhead per stat (e.g. unit, time window).
- `four` — four stats per row.
- `vertical` — stack stats vertically as a roll-up summary.

**`big-number`**
- `pair` — two big numbers side-by-side (often the most-asked-for variant).
- `delta` — before → after with arrow.
- `units` — explicit unit suffix style (`14×`, `99.95%`, `<5ms`) rendered in mono at smaller weight.
- `compact` — smaller hero so subtitle gets more room.

**`timeline`**
- `vertical` — vertical orientation; left-aligned dot column with content right.
- `dated` — date as primary label, item title secondary.
- `era` — group adjacent items into named eras with breaks between groups.

**`diagram`**
- `framed` — frame chrome around the diagram.
- `caption-top` — caption above instead of below.
- `wide` — diagram fills almost full width (suppresses padding).
- `tall` — diagram fills vertically; caption shifted to side.

**`code`**
- `terminal` — terminal-window chrome (three dots).
- `editor` — editor chrome (filename tab, line numbers).
- `output` — diff-coded output style.
- `ascii` — preserves whitespace, smaller font, for ASCII art / fixed-width tables.

#### Image layouts

**`image`** (today: `image` + `image left`)
- `mirror` (renamed from `left`; `left` kept as alias).
- `cover` — image becomes full-bleed background, text overlays.
- `frame` — polaroid-style frame around the image.
- `caption` — caption strip below image.

**`image-full`** (today: `image-full` + `image-full dark`)
- `dark` (existing).
- `subtitle` — caption strip becomes subtitle band.
- `cinema` — letterbox bars top/bottom.
- `quote` — overlay a `> blockquote` centered over the image.

---

## Part 3 — New layout proposals

These are the layouts I would add next, in priority order. Every one is something I see authors building manually today out of `cards-grid` or `compare-prose`. Each carries a markdown contract — written exactly once, then reusable forever.

### 3.1 `matrix-2x2` — the 2×2 quadrant layout

Used for: SWOT, Eisenhower, BCG growth-share, risk × impact, build-vs-buy quadrants, anything that splits two binary axes.

```markdown
<!-- _class: matrix-2x2 -->

## How we sort vendors against our two axes.

`Coverage · Cost`

- High coverage / Low cost
  - Vendor A
  - Vendor B
- High coverage / High cost
  - Vendor C
- Low coverage / Low cost
  - Vendor D
- Low coverage / High cost
  - _none — and that's the signal_
```

Four top-level items in declaration order = top-left, top-right, bottom-left, bottom-right. Axis labels come from the eyebrow (split on `·`).

Modifiers: `swot` (auto-labels the four quadrants S/W/O/T), `eisenhower` (Urgent×Important), `risk` (Likelihood×Impact, accent gradient on bottom-right).

### 3.2 `decision` — the verdict slide

The "we picked X" slide. Heavier than `closing`, lighter than `featured`. Authors fake this today with `big-number` + a paragraph or with `compare-prose chosen`.

```markdown
<!-- _class: decision -->

## We are building, not buying.

`Decision · 2026 Q1`

- **Build**
  - Owns the architecture, owns the operating model, owns the timeline.
- **Why not buy**
  - Three vendors evaluated; none cover the regulatory boundary in-process.
- **Why not delay**
  - The compliance window closes in 18 months.
```

A single decision verb in big display weight, three short justifications below. Modifiers: `build` / `buy` / `defer` / `pivot` (semantic colour treatment per verb).

### 3.3 `roadmap` — multi-phase rollout

A grid: rows = workstreams, columns = phases, cells = deliverables. Authors today fake this with `compare-table`, but the visual emphasis on phase progression is missing.

```markdown
<!-- _class: roadmap -->

## What ships in each phase, by workstream.

| Workstream | Phase 01           | Phase 02              | Phase 03              |
| ---------- | ------------------ | --------------------- | --------------------- |
| Platform   | Codebook signing   | Multi-tenant DEKs     | Per-purpose codebooks |
| Operations | Manual rotation    | Automated rotation    | Crypto-shred          |
| Compliance | Audit trail (HSM)  | Centralised log       | Examiner pack         |
```

The first column is treated as a workstream label (sticky). Phase columns get phase chrome (number badge, accent gradient progressing left-to-right). Empty cells render as a thin dash.

### 3.4 `kpi` — metrics dashboard slide

Like `stats`, but with trend signals. For business decks where every number has a delta and a target.

```markdown
<!-- _class: kpi -->

## Where we are against quarter targets.

1. **94%**
   - Token-issuance success — _target 99%, +2pp QoQ_
2. **8 ms**
   - p99 detokenize — _target 10 ms, -3 ms QoQ_
3. **0**
   - Examiner findings — _target 0, flat_
```

Number, label, sub-line with target + trend. Trend arrows colour by direction. Modifiers: `target` (highlights gap), `trend` (sparkline placeholder).

### 3.5 `before-after` — explicit state-change slide

Two halves with a big arrow between. Today authors use `compare-code before-after` for code, but there is no equivalent for prose.

```markdown
<!-- _class: before-after -->

## Detokenize used to require a vault round-trip.

`Latency story · before vs after`

- **Before**
  - Every detokenize call: network round-trip to the central vault, average 18 ms, p99 60 ms. Vault outages cascaded into application outages.
- **After**
  - Detokenize is a local function call. p99 8 ms. Vault outages do not affect tokenized-record reads.
```

Renders left card, large arrow, right card. Modifier `vertical` stacks them with the arrow rotated.

### 3.6 `principles` / `tenets` — declared values

Several short proclamations stacked with numeric or roman prefix. Sparser than `cards-stack`, larger than `list`. Used for values pages, design tenets, codes of conduct.

```markdown
<!-- _class: principles -->

## How we make calls when the spec is silent.

1. We default to the choice that is cheaper to reverse.
2. We name the actor, never the system.
3. We write down the bet on the same slide as the choice.
```

Short body, 24-32px, line-height generous. Modifiers: `numbered` (default), `lettered`, `roman`, `bullet` (no prefix at all).

### 3.7 `actors` / `roles` — who does what

A list of actors with their responsibilities, formatted as role-tag chips + body. Today authors fake this with `cards-grid`, but the chip + role visual signal is specific.

```markdown
<!-- _class: actors -->

## Who owns each part of the codebook lifecycle.

- **HSM admin** `key custody`
  - Manages KEK ceremonies and rotation. Never holds plaintext DEKs.
- **Platform operator** `policy`
  - Owns codebook policy, signing keys, version floors.
- **Application team** `consumption`
  - Holds time-bound codebooks; tokenizes/detokenizes in-process.
```

Strong = role name; inline-code = role tag (chip); body = responsibility.

### 3.8 `tldr` / `recap` — executive summary slide

A list of single-line takeaways with optional reference numbers ("→ slide 14"). Used at the top of a section or as the opening of an executive deck.

```markdown
<!-- _class: tldr -->

## What this section will tell you, in five lines.

`Section 03 · Recap`

- The codebook model gets in-process latency with vault-grade key custody. → slide 8
- Rotation is a version-floor increment, not a coordinated cutover. → slide 12
- Per-tenant KEKs make crypto-shred a single HSM op. → slide 18
- Phase 1 ships the architecture, Phase 2 ships the operations. → slide 22
- Five questions stay open until Phase 1 closes them on the record. → slide 27
```

Modifier: `numbered` adds `01.` prefix.

### 3.9 `agenda` — auto-numbered table of contents

Used between sections in long decks. Author writes section titles; the layout numbers them and shows the page (when paired with paginate metadata).

```markdown
<!-- _class: agenda -->

## What this deck covers, in order.

1. The Design                — page 7
2. The Phasing               — page 18
3. The Choices               — page 26
4. Appendices                — page 35
```

Modifier: `progress N` highlights the Nth row as "you are here."

### 3.10 `glossary` — term/definition pairs

Term left, definition right, two-column. Useful for spec / protocol / jargon-heavy slides.

```markdown
<!-- _class: glossary -->

## The vocabulary used in this deck.

- **Codebook**
  - The signed envelope an SDK installs. Carries policy, wrapped DEK, version, expiry.
- **DEK**
  - Data encryption key. Wrapped by a KEK; lives plaintext only in native memory.
- **KEK**
  - Key encryption key. Lives in the HSM, never exported.
```

### 3.11 `legend` — the explicit key

Small layout, very high payoff for technical decks. A row of colour/shape markers with labels, optionally a body sentence below.

```markdown
<!-- _class: legend -->

## How to read the diagrams in the appendix.

- **Solid arrow** `data flow`
- **Dashed arrow** `control flow`
- **Double border** `trust boundary`
- **Filled diamond** `policy gate`
```

### 3.12 `checklist` — completion summary

Pure checkbox list. Each item has a state (`[x]`, `[ ]`, `[~]`).

```markdown
<!-- _class: checklist -->

## Phase 1 acceptance, by item.

- [x] Codebook signing in production
- [x] HSM-anchored audit trail
- [x] One client integrated end-to-end
- [~] TTL refresh under cold-start load — _open, see slide 27_
- [ ] Multi-tenant operation — _Phase 2_
```

States colour-mapped: ✓ pass, ~ warn, ☐ pending. Reuses the `--pass`/`--warn`/`--fail` palette.

### 3.13 `manifesto` — formal proclamation

Cousin of `principles`, but each line is a complete declarative sentence in display weight. Sparser, more ceremonial. Use for values pages or the literal manifesto slide.

```markdown
<!-- _class: manifesto -->

`Our four commitments.`

1. We will name the bet on the same slide as the choice.
2. We will not ship a layout we would not author for our own deck.
3. We will keep markdown the source of truth for every slide.
4. We will treat every modifier as an authorial intent.
```

### 3.14 `footnote` / `references`

The last-slide-of-section citation list. Numbered, mono, smaller font. Today authors fake this with `list compact` but the citation format is consistent enough to deserve its own layout.

```markdown
<!-- _class: footnote -->

## References cited in this section.

1. NIST SP 800-38G — _FF1 / FF3-1 specification_
2. PCI-SSC Tokenization Guidelines v2.0 — _Type 1 substitution model_
3. Internal audit AUDIT-2025-Q3-014 — _vendor evaluation_
```

### 3.15 Layouts I considered and rejected (yet)

- `versus` — head-to-head with portraits. Too narrow a use case to earn a layout; falls under `compare-prose` with a `mirror` + portrait variant later.
- `pricing` — rejected; `compare-table flagged` covers this.
- `hero` — rejected; `big-number loose` covers this.
- `swot` — promoted to a modifier on `matrix-2x2` rather than its own layout.

The discipline: only promote to a layout when the markdown contract genuinely changes.

---

## Part 4 — Authoring DX & rollout plan

### 4.1 The component manifest

Every layout should be addressable from a single machine-readable source. I propose a `components.json` (or `components.yaml`) that declares the contract for every layout and modifier:

```jsonc
{
  "list-steps": {
    "intent": "Horizontal sequence of N labelled stages.",
    "markdown": "## heading\n\n<ol>\n  <li><strong>Title</strong>\n    <ul><li>body</li></ul>\n  </li>\n</ol>",
    "structured": true,
    "modifiers": ["phase", "stage", "milestone", "rank", "tier",
                  "vertical", "compact", "loose", "lettered", "roman", "dark"],
    "compatible_with": ["dark", "compact", "loose"],
    "since": "1.0"
  }
}
```

This file becomes the source for:

- The SKILL.md authoring tables (auto-rendered).
- VS Code snippet generation (one snippet per layout × per common modifier set).
- A linter (see §4.3).
- The gallery (auto-generates a slide for every modifier combination).

### 4.2 Snippets

A snippet pack keyed off the manifest. `lattice-cards-grid` expands to a complete slide. `lattice-list-steps-phase` expands to a `list-steps` slide pre-stamped with `phase`. Authors stop typing comment directives by hand. (This is the single biggest authoring-friction win.)

### 4.3 The lattice linter

A small CLI (`node lattice-lint <file.md>`) that reads the manifest and validates:

- Every `_class` directive references a known layout.
- Every modifier on a class is declared compatible with that layout.
- Structured layouts have the markdown shape their contract requires (e.g. `cards-stack` requires a flat `ul` of `**Title.**`-style items).
- Heading sentences end with a period (per [EDITORIAL.md](../EDITORIAL.md)).
- Eyebrow paragraphs use the inline-code form, not the deprecated `### Eyebrow` form.

This is cheap to build because the rules already exist; they are scattered across CSS comments and prose docs.

### 4.4 The modifier gallery

Today's `examples/gallery.md` shows one slide per layout. Add `examples/modifier-gallery.md` that shows every layout × every modifier combination as a labelled slide, generated from the manifest. This is the "design system showroom" — when an author asks _"what does `cards-stack horizontal compact` look like?"_, they open one URL.

### 4.5 The migration story for existing decks

Every modifier proposed here is **opt-in and additive**. No existing deck's rendering changes until an author opts into a new modifier. Two things need a soft migration:

- **`image left` → `image mirror`.** Keep `left` as an alias for one release. Update gallery + templates to use `mirror`. Remove the alias in a later major version.
- **`list-steps` default prefix word.** Today the prefix is `STEP`. That stays as the default. New modifiers (`phase`, `stage`, `milestone`, `rank`, `tier`) opt in. A future release could promote `phase` (or no prefix) to default if the data says authors use it more often.

Everything else is additive.

### 4.6 Rollout order

If I had to pick the order to ship this, it is roughly:

1. **`compact` / `loose` / `accent` cross-cutting modifiers.** Highest leverage; trivially defined as variable overrides.
2. **`list-steps` family (`phase` / `stage` / `milestone` / `rank` / `tier` / `vertical`).** User-prompted; clearest authoring win; isolated CSS surface.
3. **`compare-prose` family (`chosen` / `rejected` / `decision` / `three` / `vertical`).** High user-deck impact; the layout most authors abuse today.
4. **`cards-stack horizontal`** + **`cards-grid three`/`four`.** The "shape" modifiers — small surface, big payoff.
5. **`mirror` everywhere.** Renames `image left` and extends to `featured`, `cards-side`, `split-panel`.
6. **`numbered` on bookend layouts.** CSS-counter scoped per class; trivial implementation.
7. **The component manifest + snippets.** Tooling.
8. **The linter.** Tooling.
9. **First wave of new layouts: `matrix-2x2`, `decision`, `before-after`, `principles`.** The four with clearest authoring demand from real decks.
10. **Second wave: `roadmap`, `kpi`, `agenda`, `actors`, `tldr`.** Higher complexity, narrower fit.
11. **Third wave: `glossary`, `legend`, `checklist`, `manifesto`, `footnote`.** Niche but cheap.
12. **The modifier gallery.** Once 1-9 land, the showroom writes itself from the manifest.

### 4.7 What I am deliberately not proposing

- **Per-slide custom CSS.** Lattice's whole point is that authoring lives in markdown. The moment authors reach for a `<style>` block, the system has failed.
- **JavaScript-driven layouts.** The post-processor stays a build-time transformation. Runtime JS is reserved for things that genuinely need it (Mermaid).
- **Theming knobs as modifiers.** `dark` is an emphasis tier, not a theme choice. Multi-theme support stays at the palette layer (`themes/<name>.css`); modifiers do not pretend to be palettes.
- **Modifier inheritance / cascading rules.** A modifier either applies to a layout or it does not. No silent cascading. If a modifier should work on a parent class of layouts, declare it on each one explicitly. The manifest enforces this.

---

## Appendix — Quick-reference modifier matrix

For a one-page view of which modifiers attach to which layouts. Crossed cells are deliberate non-applicability (e.g. `compact` on `title` is incoherent).

| Layout         | dark | accent | compact | loose | mirror | centered | framed | numbered | layout-specific (selected)               |
| -------------- | :--: | :----: | :-----: | :---: | :----: | :------: | :----: | :------: | ---------------------------------------- |
| title          |  ●   |   ○    |    ✕    |   ✕   |   ○    |    ●     |   ✕    |    ✕     | cover · chapter · minimal                |
| divider        |  ●   |   ●    |    ✕    |   ✕   |   ○    |    ✕     |   ✕    |    ●     | appendix · progress                      |
| subtopic       |  ○   |   ○    |    ✕    |   ●   |   ✕    |    ●     |   ✕    |    ●     | —                                        |
| closing        |  ●   |   ○    |    ✕    |   ●   |   ✕    |    ●     |   ✕    |    ●     | quote · cta · signature                  |
| content        |  ●   |   ●    |    ●    |   ●   |   ✕    |    ●     |   ✕    |    ✕     | lead · letter · essay                    |
| diagram        |  ●   |   ○    |    ●    |   ●   |   ○    |    ✕     |   ●    |    ✕     | caption-top · wide · tall                |
| quote          |  ●   |   ●    |    ✕    |   ●   |   ✕    |    ●     |   ●    |    ✕     | attribution · pull · manifesto           |
| list           |  ●   |   ●    |    ●    |   ●   |   ✕    |    ●     |   ✕    |    ✕     | check · cross · bullet                   |
| list-steps     |  ●   |   ●    |    ●    |   ●   |   ✕    |    ✕     |   ✕    |    ✕     | **phase · stage · milestone · rank · tier · vertical · lettered · roman** |
| list-criteria  |  ●   |   ●    |    ●    |   ●   |   ✕    |    ✕     |   ✕    |    ✕     | score · weighted · pass-fail             |
| list-tabular   |  ●   |   ○    |    ●    |   ○   |   ✕    |    ✕     |   ✕    |    ✕     | dense · monospaced                       |
| timeline       |  ●   |   ○    |    ●    |   ●   |   ○    |    ●     |   ✕    |    ✕     | vertical · dated · era                   |
| stats          |  ●   |   ●    |    ●    |   ●   |   ✕    |    ●     |   ✕    |    ✕     | delta · axis · four · vertical           |
| big-number     |  ●   |   ●    |    ✕    |   ●   |   ✕    |    ●     |   ✕    |    ✕     | pair · delta · units · compact           |
| cards-grid     |  ●   |   ●    |    ●    |   ●   |   ✕    |    ✕     |   ✕    |    ✕     | three · four · inset                     |
| cards-stack    |  ●   |   ●    |    ●    |   ●   |   ✕    |    ✕     |   ✕    |    ✕     | **horizontal** · inset · accordion       |
| cards-side     |  ●   |   ●    |    ●    |   ○   |   ●    |    ✕     |   ✕    |    ✕     | media                                    |
| cards-wide     |  ●   |   ●    |    ●    |   ●   |   ✕    |    ✕     |   ✕    |    ✕     | phases · milestones · stages · roman     |
| compare-prose  |  ●   |   ●    |    ●    |   ●   |   ●    |    ✕     |   ✕    |    ✕     | **chosen · rejected · decision · three · vertical** |
| compare-code   |  ●   |   ○    |    ●    |   ○   |   ✕    |    ✕     |   ●    |    ✕     | diff · before-after · vertical · editor  |
| compare-table  |  ●   |   ○    |    ●    |   ○   |   ✕    |    ✕     |   ✕    |    ✕     | striped · score · flagged                |
| split-panel    |  ●   |   ●    |    ●    |   ●   |   ●    |    ✕     |   ✕    |    ●     | chapter · metrics                        |
| featured       |  ●   |   ●    |    ●    |   ●   |   ●    |    ✕     |   ✕    |    ✕     | tall · wide                              |
| verdict-grid   |  ●   |   ●    |    ●    |   ●   |   ✕    |    ✕     |   ✕    |    ✕     | winner · runner-up · ranked              |
| image          |  ●   |   ○    |    ✕    |   ✕   |   ●    |    ✕     |   ●    |    ✕     | cover · frame · caption                  |
| image-full     |  ●   |   ✕    |    ✕    |   ✕   |   ✕    |    ✕     |   ✕    |    ✕     | subtitle · cinema · quote                |
| code           |  ●   |   ○    |    ●    |   ○   |   ✕    |    ✕     |   ●    |    ✕     | terminal · editor · output · ascii       |

Legend: ● = primary use, ○ = legitimate but secondary, ✕ = deliberately unsupported.

---

## Closing thought

Lattice today is a careful set of layouts. The proposal here is to make it a careful set of **components**: each layout publishes its intent, its markdown contract, and its modifiers; the renderer guarantees the visual contract; the tooling (snippets, linter, gallery) makes the system discoverable. Authors stop choosing between cosmetic flags and stop pasting comment directives from memory. They write what they mean — `<!-- _class: list-steps phase -->` — and the system does the rest.

Everything in this document is reversible. Nothing changes the rendering of an existing deck. The work compounds: each modifier added gets one slide of validation in the gallery; each new layout shipped earns its keep on the next deck written; each tool (manifest → snippets → linter) makes the next addition cheaper than the last.

The system is already good. This is how it gets to great.
