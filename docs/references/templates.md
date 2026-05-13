# Part 4: Layout Templates

All layouts are 1280×720 (16:9). Slide padding: 48-64px. Usable content area: approximately 1160×600.

28 templates plus 4 documented variants. CSS class names shown in `monospace` — use directly in `<!-- _class: name -->` directives.

## Layout Inventory: Structured vs Unstructured

Every layout falls into one of two categories. The distinction matters because it changes what the source markdown looks like and where bugs are most likely to live.

**Structured layouts** are post-processed by `lattice-emulator.js`: a flat `ul`/`ol` (sometimes with nested children) is rewritten into purpose-built DOM (`.card`, `.stat-item`, `.vcard`, `.feat-card`, `.compare-prose-inner`, `.panel-left`/`.panel-right`, etc.). The CSS targets that generated structure. Authors write a list; the post-processor turns it into the layout.

**Unstructured layouts** are rendered by CSS alone from the semantic markdown that Marp emits. No DOM rewriting happens — the headings, paragraphs, and lists you write are the headings, paragraphs, and lists the CSS styles.

| Category     | Class                                                                                                                                           | Post-processor                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Structured   | `cards-grid`, `cards-side`, `cards-stack`, `cards-wide`, `checklist`, `compare-prose`, `compare-code`, `featured`, `list-criteria`, `list-tabular`, `roadmap`, `split-panel`, `stats`, `verdict-grid`, `word-cloud` | yes — `lattice-emulator.js` rewrites DOM |
| Unstructured | `title`, `divider`, `subtopic`, `closing`, `content`, `diagram`, `quote`, `list`, `list-steps`, `timeline`, `big-number`, `image`, `code`         | no — CSS-only                   |

Modifiers (`dark`, `mirror`, and image-specific `full` / `contain`, etc.) compose with both categories.

**Authoring implication:** every structured layout has a single canonical list shape documented in its template entry. Deviating from that shape (wrong list type, wrong nesting depth, missing `**Title.**` marker, etc.) causes the post-processor to fall back to the raw list rendering, which the CSS does not style. When a structured slide looks wrong, check the source list shape first.

**Audit implication:** structured layouts are where `lattice-emulator.js` and `marp-cli` are most likely to diverge — see [audit.md §11.4](./audit.md#114-comparison-workflow).

## Eyebrow Labels

Many templates show a small label above the main heading — called an **eyebrow**. It identifies section, category, or slide type at a glance.

**Authoring syntax:** a paragraph containing only a single inline code span, placed immediately above the heading **or above a list** (e.g. `big-number`). The eyebrow is optional — omit it if no label is needed:

```markdown
`Section 01 · Foundations`

# Section Title
```

```markdown
`Context · Competitive Dynamics`

## Slide Heading
```

```markdown
`Calibration Result · 6-Month Pilot`

- 14×
  - Description text.
```

The CSS detects this pattern (`p:has(> code:only-child) + h1/h2/…`) and renders the code element as a mono uppercase label, without touching the heading hierarchy. This makes eyebrows **markdown-lint compliant**: a `<p>` containing code is not a heading and cannot violate heading-order rules.

**Styling:** `--font-mono`, 13px (`--fs-label`), 600 weight, 0.18em letter-spacing, uppercase, `--text-muted`. Dark bookend slides (title, divider, closing) override the color to `--on-dark-secondary` / `--on-dark-ghost` automatically.

**The inline-code paragraph is the universal eyebrow pattern** across every layout. `h3` is reserved for genuine structural sub-headings (notably the left-panel rubric in `split-panel`) and is no longer used as a label. Standardising on the inline-code form keeps eyebrows markdown-lint compliant on every slide regardless of the heading levels that follow.

**Note on `split-panel`:** the inline-code eyebrow paragraph is placed **between `h2` and `h3`** in the source. The CSS grid fallback routes it to the left dark panel automatically. (`h5` is no longer required here.)

**Exception — `title` layout:** Placing an inline-code paragraph before `h1` triggers **MD041** (_first-heading-h1_) in markdownlint, because the paragraph becomes the first content element in the file. On `title` slides, the order is therefore reversed: `h1` comes first (satisfying MD041), and the inline-code eyebrow is placed immediately **after** `h1`. CSS on `section.title h1 + p:has(> code:only-child)` overrides the normal subtitle rule and renders the code element with eyebrow styling instead. A plain paragraph following that inline-code block is treated as the subtitle (see below). Divider slides mid-document are not affected — they are not the first element in the file, so MD041 does not fire there and the eyebrow-before-`h1` pattern remains valid.

## Subtitle Labels

Many templates carry an optional short descriptor line immediately below the main heading — a **subtitle**. It adds context, a process label, or a qualifying clause without becoming a second heading.

**Authoring syntax:** a paragraph containing only a single inline code span, placed immediately below the heading:

```markdown
## How signals move from input to decision.

`Four-stage processing pipeline — weekly cadence`
```

The CSS detects `h* + p:has(> code:only-child)` and renders the code element as body-font italic in `--text-muted` — no pill, no mono, no uppercase. Layout-specific `> p` rules (diagram, stats, title, closing, subtopic) already govern the container's size, weight, and color; the subtitle block only strips the pill and applies italic.

This replaces the `_em paragraph_` pattern (`_text_`) for post-heading descriptors — both are valid Markdown, but the inline-code form is more explicit about intent and keeps the two roles visually distinguishable in the source.

**Exception — `title` layout:** On `title` slides the inline-code paragraph after `h1` is claimed by the eyebrow rule (see Eyebrow Labels exception above), leaving no inline-code slot for a subtitle. The subtitle on a `title` slide is therefore a plain paragraph placed immediately after the eyebrow: `h1 → p:has(> code:only-child) → p`. CSS on `section.title h1 + p:has(> code:only-child) + p` styles it as the subtitle (italic, `--on-dark-secondary`). No backticks, no `_em_`.

**What stays as `_em_`:** table footnotes and body prose that happens to be italic. These are not subtitles.

| Category       | Templates                                               | CSS class                                      |
| -------------- | ------------------------------------------------------- | ---------------------------------------------- |
| Structural     | T1 Title, T2 Divider, T3 Sub-Topic, T18 Closing         | `title` `divider` `subtopic` `closing`         |
| Text           | T4 Content, T12 Quote, T14 List, T20 Criteria, T28 Checklist | `content` `quote` `list` `list-criteria` `checklist` |
| Text variant   | T14 Tabular                                             | `list-tabular` (+ `def` / `metric` / `spec` / `register` variants) |
| Data           | T5 Diagram, T6 Stats, T16 Big Number, T22 Compare Table, T27 Glossary | `diagram` `stats` `big-number` `compare-table` `glossary` |
| Cards          | T7 Grid 2×2, T8 Grid 2+1, T9 Stacked, T10 Side-by-Side  | `cards-grid` `cards-stack` `cards-side`       |
| Cards cont.    | T19 Three-Row Wide, T21 Verdict Grid                    | `cards-wide` `verdict-grid`                  |
| Comparative    | T11 Comparison, T23 Featured                            | `compare-prose` `featured`                        |
| Layout         | T13 Timeline, T17 Split Panel                           | `timeline` `split-panel`          |
| Layout variant | T13v Step Cards                                         | `list-steps`                                        |
| Visual         | T24 Image (text + bg, full bleed)                       | `image` (`mirror`, `full`, `contain` modifiers)     |
| Code           | T25 Code, T26 Code Compare                              | `code` `compare-code`                          |

## State Convention

Two layouts — `verdict-grid` (T21) and `checklist` (T28) — accept **state markers** as a leading prefix on each list item. The marker syntax, color tokens, glyphs, and class names are unified across both so authors only learn one vocabulary.

**Authoring syntax:** `[x]`, `[-]`, or `[ ]` immediately after the bullet, followed by a space, followed by the label.

```markdown
- [x] Done — succeeded / chosen
- [-] Partial — caveat / partial success
- [ ] Todo — not done / rejected
```

**Canonical mapping:**

| Marker | Class       | Token   | Glyph       | Semantic                         |
| ------ | ----------- | ------- | ----------- | -------------------------------- |
| `[x]`  | `state pass` | `--pass` | ✓ (green)   | succeeded, chosen, complete      |
| `[-]`  | `state warn` | `--warn` | – (amber)   | partial, caveat, qualified pass  |
| `[ ]`  | `state fail` | `--fail` | ✗ on `verdict-grid`, ☐ on `checklist` (red) | not done, rejected, todo |

**Why one convention covers both layouts:**

- `verdict-grid` evaluates options against criteria — every cell got a verdict, so `[ ]` reads as **rejected**.
- `checklist` reports completion — items either done, partial, or **not yet done**.

In both cases, `[ ]` signals "this did not pass." Red is the right color either way; the difference between "rejected" and "todo" comes from the layout's editorial framing, not from a separate token. This keeps a single mental model: green = good, amber = qualified, red = not.

**Glyphs differ by layout** because each picks the most readable shape for its content density: `verdict-grid` packs many states into a small chip row, so the binary ✗ is clearest; `checklist` gives each row full width, so the empty checkbox ☐ — which matches the markdown source `[ ]` literally — is more legible at body size.

**Theme tokens:**

| Token        | Indaco             | Cuoio                   | Use                                            |
| ------------ | ------------------ | ----------------------- | ---------------------------------------------- |
| `--pass`     | brand green deep   | deep green (`#2d6a3f`)  | success colour, foreground glyph + left bar    |
| `--warn`     | dark amber-brown   | warm amber (`#925c00`)  | partial / caveat colour                        |
| `--fail`     | deep red           | deep red (`#9b1c1c`)    | failed / rejected / todo colour                |
| `--pass-bg`  | 10% pass on bg     | 10% pass on bg          | row tint when authored as `[x]`                |
| `--warn-bg`  | 10% warn on bg     | 10% warn on bg          | row tint when authored as `[-]`                |
| `--fail-bg`  | 10% fail on bg     | 10% fail on bg          | row tint when authored as `[ ]`                |

All foreground tokens meet WCAG AA on body backgrounds. The `*-bg` variants are 10% colour-mix fills so the tint is visible without competing with body text.

**Implementation contract:** the marker is processed in three channels and they must stay in lockstep:

| Channel               | File                                | Function                          |
| --------------------- | ----------------------------------- | --------------------------------- |
| Marp build (HTML/PDF) | [marp.config.js](../../marp.config.js) | `verdictGridBadges`, `checklistItemStates` |
| Emulator (PDF direct) | [lattice-emulator.js](../../lattice-emulator.js) | `cls.includes('verdict-grid')`, `cls.includes('checklist')` |
| VS Code preview       | [lattice-runtime.js](../../lattice-runtime.js)   | `transformVerdictGridBadges`, `transformChecklistItemStates` |

Both layouts strip the marker and add `class="state pass|warn|fail"` to the carrier element (a `<span class="badge …">` for verdict-grid, the `<li>` itself for checklist). CSS owns all the visual chrome from there.

## Modifiers

Modifiers are class flags that compose with any layout. They encode **authorial intent** — density, emphasis, orientation — rather than cosmetic switches. Every modifier is opt-in and additive: an existing slide's rendering never changes until an author adds the modifier to its `_class` directive.

**Composition syntax:** layout first, then modifiers, space-separated:

```markdown
<!-- _class: cards-grid compact dark -->
<!-- _class: closing accent -->
<!-- _class: list-steps phase -->
```

**Cascade rule:** when two modifiers tune the same variable (e.g. `compact loose`), the last one in the source wins. When modifiers tune disjoint properties (e.g. `compact dark`), they compose without conflict.

**Reference:** [2026-05-04-authoring-proposals.md §2 (modifier catalogue)](../notes/2026-05-04-authoring-proposals.md) and the appendix matrix at the end of that file enumerate which modifiers attach to which layouts.

### Cross-cutting modifiers

These modifiers apply across most layouts. They never change the layout's markdown contract — only how it renders.

#### `dark`

Reskins the slide canvas using the palette's `--dark-*` tokens. The same layout structure works on either canvas. The dark bookend layouts (`title`, `divider`, `closing`) include `dark` in their default chrome.

#### `compact`

Tightens the spacing scale ~25 % (`--sp-xs` … `--sp-2xl`). Card gaps, list gutters, and section LR padding follow because layouts read those variables via `var()`. The chrome reservation (top/bottom 88 px) is preserved so headers and footers never collide with content. Reach for `compact` when one more card needs to fit, or when prose runs the section by 1-2 lines.

```markdown
<!-- _class: cards-grid compact -->
```

#### `loose`

Inverse of `compact` — grows the spacing scale ~25 %. Reach for it when a slide carries a single editorial point and you want the page to feel deliberately quiet.

```markdown
<!-- _class: content loose -->
```

#### `accent`

Replaces the default rainbow top-stripe with a solid accent-colour stripe and tints the slide heading. Composes with `dark`: on the dark canvas, where the spectrum stripe is suppressed, `accent.dark` restores a solid accent stripe so the visual signal still reads.

```markdown
<!-- _class: closing accent -->
```

#### `mirror`

Flips the asymmetric half of a layout left/right. Applies only where the layout has an inherent left/right asymmetry — symmetric grids ignore it.

| Layout          | Effect                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| `image`         | image slot flips from right (default) to left. Alias of legacy `image left`. |
| `featured`      | hero card moves from the left column to the right column.              |
| `split-panel`   | accent panel moves from the left to the right.                         |
| `compare-prose` | left and right cards swap; chosen/decision read from the left.         |

```markdown
<!-- _class: image mirror -->
<!-- _class: featured mirror -->
<!-- _class: compare-prose mirror chosen -->
```

`image left` is preserved as a deprecated alias for `image mirror`. The cross-cutting `mirror` modifier composes with `full` and `contain` (e.g. `image full mirror`).

#### `numbered`

Stamps an auto-incrementing index in the top-right corner of bookend slides. Each layout (`divider`, `subtopic`, `closing`) carries its own counter, so a `divider numbered` series and a `closing numbered` series number independently.

| Layout     | Counter token   | Stamp position |
| ---------- | --------------- | -------------- |
| `divider`  | `lat-divider`   | top-right      |
| `subtopic` | `lat-subtopic`  | top-right      |
| `closing`  | `lat-closing`   | top-right      |

```markdown
<!-- _class: divider numbered -->   → first stamps "01", next "02", …
<!-- _class: closing numbered -->   → independent counter, starts at "01"
```

The counter is set on `body` and walks the deck once. Authors do not number sections manually — the layout does it.

### Layout-specific modifiers

#### `list-steps` family

Eight modifiers tune the step badge and the strip orientation. They compose along two independent axes — **prefix word** and **counter format** — plus an orthogonal **orientation** flag.

| Modifier    | Effect                                                       |
| ----------- | ------------------------------------------------------------ |
| `phase`     | badge prefix becomes `PHASE 01`, `PHASE 02`, …               |
| `stage`     | badge prefix becomes `STAGE 01`, `STAGE 02`, …               |
| `milestone` | badge prefix becomes `MILESTONE 01`, …                       |
| `rank`      | badge prefix becomes `RANK 01`, …                            |
| `tier`      | badge prefix becomes `TIER 01`, …                            |
| `lettered`  | counter format becomes `A`, `B`, `C` (composes with prefix)  |
| `roman`     | counter format becomes `I`, `II`, `III` (composes with prefix) |
| `vertical`  | strip orientation flips column → row; arrow becomes down-arrow |

Default prefix is `STEP`; default format is decimal-leading-zero (`01`, `02`, …). Examples:

```markdown
<!-- _class: list-steps phase -->            → PHASE 01, PHASE 02, PHASE 03
<!-- _class: list-steps milestone lettered -->→ MILESTONE A, MILESTONE B, MILESTONE C
<!-- _class: list-steps tier roman -->        → TIER I, TIER II, TIER III
<!-- _class: list-steps vertical compact -->  → vertical strip with compact spacing
```

The vertical orientation pairs well with `compact` for 3-step decks where each step needs body-paragraph room.

#### `compare-prose` family

Four modifiers name the editorial intent of a two-card comparison. The post-processor always emits left-then-right; authors put the option considered first and the choice second.

| Modifier   | Effect                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `chosen`   | right card is the winner — accent left-edge, accent-tinted background, accent title.                   |
| `rejected` | right card is the option dropped — title struck-through, body muted.                                    |
| `decision` | composes both: left card de-emphasised, right card emphasised, connector amplified and labelled `DECISION`. |
| `vertical` | stack the two cards vertically; arrow connector rotates 90°. For long-body comparisons.                 |

```markdown
<!-- _class: compare-prose chosen -->     → right card emphasised
<!-- _class: compare-prose decision -->   → left struck through, right emphasised, arrow labelled
<!-- _class: compare-prose vertical -->   → cards stacked, arrow rotated
```

`decision` is the most common variant in real decks — it names the "considered then chose" pattern directly.

#### `cards-grid` shape modifiers

Two modifiers tune the column count. Default is two columns.

| Modifier | Effect                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------- |
| `three`  | three equal columns instead of two. The 2+1 last-child span rule is reset to `auto`.           |
| `four`   | four equal columns instead of two. Pair with `compact` so the cards retain breathing room.     |

```markdown
<!-- _class: cards-grid three -->            → three equal columns
<!-- _class: cards-grid four compact -->     → four columns, tightened spacing
```

#### `cards-stack horizontal`

Flips the stack direction from vertical (cards as rows) to horizontal (cards as a row of columns). Use when the cards are short claims that read left-to-right and the audience scans across rather than down.

```markdown
<!-- _class: cards-stack horizontal -->
```

## New Layouts

Four authoring components introduced to replace the most common `cards-grid` / `compare-prose` hand-rolls in real decks. All four are CSS-only; their markdown contracts are simple list shapes Marp emits natively.

**Reference:** [2026-05-04-authoring-proposals.md §3.1–3.6](../notes/2026-05-04-authoring-proposals.md).

### `matrix-2x2` — quadrant grid

Used for SWOT, Eisenhower, BCG growth-share, risk × impact, build-vs-buy. Four top-level items in declaration order map to **top-left, top-right, bottom-left, bottom-right**. The fourth (bottom-right) cell carries an accent ring as the conventional "outcome" or "high-priority" cell.

```markdown
<!-- _class: matrix-2x2 -->

## How we sort vendors against our two axes.

`Coverage · Cost`

- High coverage / Low cost
  - body for the TL cell
- High coverage / High cost
  - body for the TR cell
- Low coverage / Low cost
  - body for the BL cell
- Low coverage / High cost
  - body for the BR cell (accent)
```

### `decision` — the verdict slide

Heavier than `closing`, lighter than `featured`. The heading carries the verdict verb in display weight; 2–4 short justifications below render as a horizontal strip with an accent left edge.

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

### `before-after` — explicit state-change

Two cards with a large arrow between. The right (After) card carries an accent ring to signal the new state. The leading `**Before**` / `**After**` bold prefix lifts into a flush top-left corner tag (accent fill, same chrome as the numbered tag) so the body fills from the top \u2014 see the **Labeled Corner Tag** universal feature. An optional trailing paragraph renders as a context note below the comparison.

```markdown
<!-- _class: before-after -->

## Detokenize used to require a vault round-trip.

`Latency story · before vs after`

- **Before**
  - Body explaining the prior state.
- **After**
  - Body explaining the new state.

Optional context sentence below the comparison.
```

### `principles` — declared statements

Numbered list of declarative one-liners in display weight. Each item is one paragraph (no nested body). Generous line-height; the leading counter renders in accent mono.

| Modifier   | Effect                                                |
| ---------- | ----------------------------------------------------- |
| (default)  | counter shows `01`, `02`, `03` (decimal-leading-zero) |
| `lettered` | counter shows `A`, `B`, `C`                           |
| `roman`    | counter shows `I`, `II`, `III`                        |
| `bullet`   | suppresses the counter; renders a middot prefix       |

```markdown
<!-- _class: principles -->

## How we make calls when the spec is silent.

1. We default to the choice that is cheaper to reverse.
2. We name the actor, never the system.
3. We write down the bet on the same slide as the choice.
```

### `roadmap` — phased multi-workstream grid

A markdown table that becomes a phased rollout grid. The first column carries the workstream label (sticky, bold) with a categorical lane stripe per row. Phase columns (everything after the first) carry the phase NAME as the header text plus an optional trailing inline-code element that becomes a right-anchored meta pill seated on the spectrum line — the pill takes the column's categorical accent and carries author-supplied meta (a date, an owner, a status tag). Header text and pill carry different information; the pill is never an auto-counter. Empty cells render as a thin muted dash so the eye reads "not in this phase" rather than "missing data."

```markdown
<!-- _class: roadmap -->

## What ships in each phase, by workstream.

| Workstream | Foundation `Q2 2026` | Hardening `Q3 2026` | Scale `Q4 2026`       |
| ---------- | -------------------- | ------------------- | --------------------- |
| Platform   | Codebook signing     | Multi-tenant DEKs   | Per-purpose codebooks |
| Operations | Manual rotation      | Automated rotation  | Crypto-shred          |
| SDK        | Java                 |                     | Polyglot parity       |
```

**State markers are universal.** Any cell in any roadmap variant can start with `[x]` shipped / `[-]` in flight / `[ ]` planned / `[/]` out of scope (the marker vocabulary is shared with `checklist` and `verdict-grid`). lib/roadmap.js strips the marker, tags the cell with a state class, and the CSS draws a small state-coloured glyph before the cell text — ✓ check for shipped, ◐ half-filled disc for in flight, ○ outlined empty disc for planned, ╱ diagonal slash plus strike-through for out of scope. Shipped / in flight / planned share a fullness gradient (filled → half → empty); out of scope sits outside that axis. The `status` modifier upgrades this to the heavy treatment.

| Modifier     | Effect                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| (default)    | workstream × phase grid; lane stripe per row; right-anchored meta pill on the spectrum line per phase header. State markers render as small coloured dots. |
| `status`     | upgrades the universal state markers to the heavy treatment: full left-edge ribbon, state-tinted ground, and a mono-caps state eyebrow (SHIPPED / IN FLIGHT / PLANNED / OUT OF SCOPE) above each cell's text. |
| `horizons`   | transposes the table into Now/Next/Later vertical phase cards. Each card carries an eyebrow (Phase 01/02/…), the phase header text, the trailing meta pill (lifted from the header's inline code), and the workstream commitments stacked underneath with their workstream labels. State markers flow through onto the card rows. |
| `swimlane`   | each row reads as a horizontal track: the workstream cell becomes a strong lane label on its row's categorical ground; phase cells render as outlined pills along the track. State markers render as dots. |
| `milestones` | quarter-anchored. Same authoring contract as the default; the difference is phase columns get a soft alternating tint so the timeline reads as a fiscal grid. State markers render as dots. |

### `kpi` — executive KPI system (one base, five layout modifiers)

Ordered or unordered list. Each item is one metric: bold = the figure, first nested bullet = the label, optional second nested bullet = the target/trend caption with **inline `` `code` ``** rendering as **pills** (status + audience).

Bare `kpi` defaults to the **briefing** layout (hero + 3 supports). Explicit modifiers cover the other executive use-cases:

| Modifier | Use-case | Layout |
| --- | --- | --- |
| (bare / `briefing`) | Board / financial summary | Hero card (✦, accent-soft, watermark numerals) on the left + three hairline supports stacked on the right |
| `ops`               | SLO / SLA review          | 2×2 equal grid; slipping metrics (rows 1 + 3 by default) render in `--warn` |
| `compliance`        | Legal / regulatory        | Vertical list with binary-state pills + optional source footnote paragraph |
| `trajectory`        | Investor / period-over-period | 4-up cards with categorical top stripes, content-centred |
| `spotlight`         | Single hero metric, monumentalised | Hero left with body copy + serif italic narrative + ✦; three muted supports right |

Additional modifier:

| Modifier | Effect |
| --- | --- |
| `attention` | Colours the hero card (row 1) in `--warn` — use when the headline metric is the one slipping. Stackable with any layout modifier (`kpi attention`, `kpi briefing attention`, …). |

**Pills.** Any trailing inline `` `code` `` on the target line becomes a pill. The first pill on each row carries the **status** colour (set per-row by the active modifier — pass / warn / fail); subsequent pills are neutral (audience / period / framework owner).

**Eyebrow.** An optional `h3` (`### Domain · Period`) above the `h2` renders as mono small-caps tracked uppercase, sitting above the headline. On decks with a global slide header, suppress it per-slide with `<!-- _header: '' -->` to avoid collision.

```markdown
<!-- _class: kpi attention -->
<!-- _header: '' -->

### Authentication · Q4 2026
## Where we are against quarter targets.

1. **94%**
   - Token-issuance success
   - target 99% · -5pp `At risk` `Board`
2. **8 ms**
   - p99 detokenize
   - target 10 ms `On plan` `SRE`
3. **0**
   - Examiner findings
   - target 0 `On plan` `Audit`
4. **3.2×**
   - Detokenize headroom
   - target 2× `On plan` `Platform`
```

### `agenda` — auto-numbered table of contents

Ordered list of section titles, optionally followed by a page reference (` — page N`). Counter renders in accent mono; rows are separated by hairline rules.

| Modifier      | Effect                                                                      |
| ------------- | --------------------------------------------------------------------------- |
| (default)     | all rows render at full opacity                                             |
| `progress-N`  | highlights the Nth row as "you are here"; rows above render muted, rows below render normal (N = 1-9) |

```markdown
<!-- _class: agenda progress-2 -->

## What this deck covers, in order.

1. The Design — page 7
2. The Phasing — page 18
3. The Choices — page 26
4. Closing — page 64
```

### `actors` — roster of responsibilities owned by named actors

Unordered list. Each item: bold = the responsibility / capability (left header), inline-code = the actor name (rendered as a filled accent pill, right-aligned), nested list line = the body. Bold-is-primary / code-is-chip is the consistent Lattice authoring convention.

```markdown
<!-- _class: actors -->

## Who owns each part of the codebook lifecycle.

- **Key custody** `HSM admin`
  - Manages KEK ceremonies and rotation. Never holds plaintext DEKs.
- **Policy** `Platform operator`
  - Owns codebook policy, signing keys, version floors, and revocation playbooks.
- **Oversight** `Examiner`
  - Reads the HSM audit trail; cannot read plaintext.
```

### `tldr` — single-line takeaways / recap

Unordered or ordered list of one-line takeaways. Optionally end each line with a `→ slide N` reference. Use as an executive summary or a section recap.

| Modifier   | Effect                                                  |
| ---------- | ------------------------------------------------------- |
| (default)  | plain takeaways with hairline separators                |
| `numbered` | adds a `01.`, `02.` accent mono prefix to each line     |

```markdown
<!-- _class: tldr numbered -->

## What this section will tell you, in five lines.

- The codebook model gets in-process latency with vault-grade key custody. → slide 8
- Rotation is a version-floor increment, not a coordinated cutover. → slide 12
- Per-tenant KEKs make crypto-shred a single HSM op. → slide 18
```

### `word-cloud` — spiral-packed weighted word cloud

Unordered list of words, each ending with a trailing inline-code element that holds the weight in `[1, 5]` (continuous floats allowed; defaults to `3` when omitted). `lib/word-cloud.js` sorts items by weight descending, computes size / rotation / colour per word from rank + weight, then runs a build-time Archimedean spiral packer to place each span at an absolute coordinate. No client-side JS, no randomness — the same source always produces the same layout.

```markdown
<!-- _class: word-cloud -->

## What the team called out in this quarter's retrospective.

- Execution `5`
- Discipline `4.5`
- Velocity `4`
- Talent `4`
- Focus `3`
- Trust `3`
- Risk `3`
- Capital `2`
- Brand `2`
- Cadence `1`
- Latency `1`
```

**Weight is continuous.** `Word `4.3`` is valid; the size interpolates via an ease-in curve over the variant's size spread. Out-of-range values clamp to `[1, 5]`; non-numeric trailing code defaults to weight `3`.

**Colour follows rank.** Top-weight words always render in `--accent` so the focal tier is unambiguous; bottom-weight words render in `--text-muted`. Mid-weight words rotate through six categorical tokens (`--cat-blue`, `--cat-orange`, `--cat-teal`, `--cat-rose`, `--cat-purple`, `--cat-green`) by rank. The `spectrum` modifier swaps the categorical rotation for the sequential `--scale-N` heat ramp; `constellation` tightens to a three-hue palette.

**Rotation is rank-keyed and deterministic.** A deterministic hash decides whether each mid-weight word renders at 90° (vertical). The top tier is never rotated; the bottom tier is never rotated in most variants. Variant `chance` settings: default 22%, dense 32%, focal 15%, constellation/spectrum 0%.

| Modifier        | Effect                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| (default)       | Moderate density, six-hue categorical rotation, occasional 90° on mid-weight words. The boardroom default — clean hierarchy with visible breadth. |
| `constellation` | Sparse. The spiral steps wider so words spread further from the centre, the size spread is steeper, the palette tightens to accent + one supporting hue + muted ink. 0° only. Use for 8–12 words that need air. |
| `dense`         | Packed mosaic. Tighter spiral step, smaller size spread, 32% rotation rate so the cloud locks together. Fits 25+ terms without spilling. Full categorical rotation. |
| `spectrum`      | Monochromatic. Same packer as the default, but colour follows weight via the `--scale-N` ramp instead of categorical rotation — size and saturation both encode importance. 0° only. |
| `focal`         | Hero treatment. Dramatic size spread (top tier ≈ 10× the bottom); the packer's shrink-to-fit keeps the hero anchored at centre even when its bounding box approaches the canvas edge. Cat satellites around the hero. |

**Canvas dimensions.** The packer works in a fixed 1100×320 px frame, sized to clear section chrome (h2 above, below-note paragraph beneath, section padding) without triggering the overflow watcher. If a word can't pack at its target size, the engine shrinks it up to 4× by 10% steps; if it still can't fit, it is dropped silently (authors should reduce its weight in that case).

**Determinism.** Same source → same layout. The spiral is parameterised, not random; rotation is rank-keyed; colour is rank-keyed. Rebuilds and renderer-cross-checks produce identical output.

## Template 1: Title (dark bookend)

```text
┌─────────────────────────────────────────┐
│             [dark background]           │
│                                         │
│          EYEBROW LABEL                  │
│                                         │
│       Display Title Here                │
│       ─────── (accent line)             │
│       Subtitle or tagline               │
│                                         │
└─────────────────────────────────────────┘
```

**CSS class:** `title`

**Marp directive:**

```markdown
<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->
```

- Background: `--bg-dark`
- Centered vertically and horizontally
- Eyebrow: 11px mono, letter-spaced, `--text-muted`
- Title: 54-72px display font, `--text-display`
- Accent line: 60px wide, 1px, `--accent`
- Subtitle: 16px body font, `--text-muted`
- No header, footer, or page number

**Marp markdown source:**

```markdown
# Slide Title Here

`Eyebrow Label · Optional`

Subtitle or tagline — plain paragraph, italic, muted.
```

- `h1` = title (large, display font) — **first element** to satisfy MD041
- `` `inline code` `` paragraph after `h1` = eyebrow (mono uppercase, faint) — CSS on `section.title h1 + p:has(> code:only-child)` overrides the normal subtitle rule
- plain `p` after the eyebrow = subtitle (italic, `--on-dark-secondary`) — CSS on `section.title h1 + p:has(> code:only-child) + p`
- Eyebrow and subtitle are both optional; omit either or both if not needed

## Template 2: Section Divider

```text
┌─────────────────────────────────────────┐
│            [dark or accent bg]          │
│                                         │
│    ┌──────┐                             │
│    │  01  │   SECTION LABEL             │
│    └──────┘                             │
│               Section Title             │
│              ───────                    │
│                                         │
└─────────────────────────────────────────┘
```

**CSS class:** `divider`

**Marp directive:**

```markdown
<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->
```

- Background: `--bg-dark` or accent-tinted
- Strong visual signal: large section number (40-60px) in bordered box, or accent-colored left bar, or full background color change
- Section label: 11px, uppercase, letter-spaced
- Title: 48px (`--fs-3xl`) display font, `--text-display`
- Must be visually distinct from content slides — dividers should jump out when flipping through
- No header, footer, or page number

**Marp markdown source:**

```markdown
`Section 01 · Foundations`

# Section Title Goes Here
```

- `` `inline code` `` = eyebrow label (faint, uppercase, top)
- `h1` = section title (large, display font)

## Template 3: Sub-Topic

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                                         │
│          CATEGORY LABEL                 │
│          Topic Title                    │
│                                         │
│          Brief orienting sentence       │
│           about what follows.           │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `subtopic`

**Marp directive:**

```markdown
<!-- _class: subtopic -->
```

- Background: `--bg` (light — same as content slides)
- Centered vertically and horizontally
- Lighter than a divider — orients, doesn't announce
- Eyebrow: 11px, `--text-muted`
- Title: 48px (`--fs-3xl`), `--text-heading`
- Description: 16-18px, `--text-body`; use `_em_` for the italic subtitle; 1-2 sentences max
- Header, footer, and page number visible

## Template 4: Content (text only)

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                                         │
│  LABEL                                  │
│  Slide Heading                          │
│                                         │
│  Body paragraph text here. Can be       │
│  2-3 sentences maximum. Keep it         │
│  focused on one idea.                   │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `content`

**Marp directive:**

```markdown
<!-- _class: content -->
```

- Background: `--bg`
- Left-aligned or centered (consistent within deck)
- Heading: 36px, `--text-heading`
- Body: 18-20px, `--text-body`, max 40 words

## Template 5: Diagram (single)

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                  LABEL                  │
│              Diagram Title              │
│              subtitle text              │
│     ┌─────────────────────────────┐     │
│     │                             │     │
│     │      [diagram SVG/PNG]      │     │
│     │                             │     │
│     └─────────────────────────────┘     │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `diagram`

**Marp directive:**

```markdown
<!-- _class: diagram -->
```

- Background: slightly different from `--bg` (use `--bg-alt` or warm-white) so diagram container stands out
- Title + subtitle above the container
- Diagram inside rounded-corner card (`--bg`, `--border`)
- Diagram occupies ~60-70% of slide area
- Container: 24-32px internal padding

## Template 6: Stats / KPI Row

```text
┌─────────────────────────────────────────┐
│  header                                 │
│             LABEL                       │
│           Stats Title                   │
│           description                   │
│                                         │
│       42       5       4       6        │
│     TOTAL   SHAPES  CLASSES  WIDE       │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `stats`

**Marp directive:**

```markdown
<!-- _class: stats -->
```

- Stat numbers: 52px (`--fs-stat`), body font (Outfit), `--accent`
- Stat labels: 13px (`--fs-label`), uppercase, letter-spaced, `--text-label`
- 3-5 stats in a horizontal row, evenly spaced
- Description above: 16px, italic, `--text-label`

**Marp markdown source:**

```markdown
`Impact · Pilot Results`

## Six months of results across four product teams.

`Measured against pre-framework baseline.`

1. **73%** faster close
2. **4.2×** signal recall
3. **18** decisions logged
4. **91%** team alignment
```

- `` `inline code` `` paragraph above `h2` = eyebrow
- `h2` = heading
- `` `inline code` `` paragraph after `h2` = italic subtitle, centered below heading
- `ol > li`: `**number**` = stat value; remaining text = label

## Template 7: Card Grid (2×2)

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                  LABEL                  │
│               Grid Title                │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Card Title 1 │     │ Card Title 2 │  │
│  │ content      │     │ content      │  │
│  └──────────────┘     └──────────────┘  │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Card Title 3 │     │ Card Title 4 │  │
│  │ content      │     │ content      │  │
│  └──────────────┘     └──────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `cards-grid`

**Marp directive:**

```markdown
<!-- _class: cards-grid -->
```

**Markdown format** — nested list, card header is auto-bolded by CSS:

```markdown
- Card Title
  - Body text for this card.
- Another Title
  - Body text for the second card.
```

Outer list may be `ul` (`-`) or `ol` (`1.`). Sublist may also be `ul` or `ol`.

> **Indentation rule:** When using `ol`, the sublist must be indented **3 spaces** (to clear the `1. ` prefix). 2 spaces breaks the nesting — Markdown treats it as a sibling list, not a child list.
>
> ```markdown
> 1. Card Title
>    - Body text. ← 3 spaces ✓
> ```

- 2×2 grid with 24px (`--sp-md`) gaps
- Cards: `--bg-alt` fill, `--border` border, `--radius-md` corner radius
- Card header: 18px (`--fs-md`) bold, `--text-heading` — auto-bolded by CSS, no `**...**` needed
- Card body (nested list): 16px (`--fs-body`), `--text-body`
- Equal-width, equal-height cards; last odd card spans full width automatically
- **Numbered cards** (`ol` source): flush top-left corner tag (numbered variant) — accent background, white mono number, `--radius-md 0 --radius-sm 0` corners; card `padding-top` is automatically increased to clear the tag
- Trailing `> blockquote` on this layout renders as a **Key Insight** panel (see Key Insight feature below)

**Inline code in card headers and body text:**

Inline `` `code` `` spans render correctly in both card title lines and body text with no special wrapper required.

**Card header (title line)** — Write inline code directly after the title text:

```markdown
- Signal Intake `v2.4`
  - Body text.
- Scoring Model `configurable`
  - Body text.
```

Visual result: bold card title on the left, compact pill badge right-aligned on the same row. The badge uses `--text-body` color, `--text-muted` border, and `--bg` background (matching verdict-grid pill style) — distinct from the accent-colored body code. Body text spans full card width below.

> **How it works**: The card `<li>` uses `grid-template-columns: 1fr auto`. Marp's Chromium rendering places the title text node in column 1 (`1fr`) and the `<code>` element is explicitly pinned to `grid-column:2; grid-row:1` via CSS, keeping them on the same visual row despite Chromium's anonymous block box behavior in SVG foreignObject context. The body `<ul>` carries `grid-column: 1 / -1` so it spans the full card width on the next row.

> **Backwards compat**: `**Title `code`**` (bold wrapper) still works — `<strong>` becomes a single block grid item spanning both columns, with text and code flowing inline inside it.

**Card body text** — Code placed within body bullet text renders **inline** within the prose without any special wrapper:

```markdown
- Card Title
  - Average latency: `4 min` from ingestion to scored entry.
  - Every prioritization change above `P2` must carry a rationale.
```

Visual result: accent-colored monospace pill appearing inline within the sentence.

> **Do not use inline code as a standalone line inside a card body** — a body bullet that contains only `` `code` `` and nothing else will be promoted to an eyebrow label by the subtitle/eyebrow rules. Mix it with surrounding prose.

## Template 8: Card Grid 2+1

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                  LABEL                  │
│               Grid Title                │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Card Title 1 │     │ Card Title 2 │  │
│  │ content      │     │ content      │  │
│  └──────────────┘     └──────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Card Title 3 (full width)         │  │
│  │ content stretches across          │  │
│  └───────────────────────────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `cards-grid`

**Marp directive:**

```markdown
<!-- _class: cards-grid -->
```

**Markdown format** — same nested list format as `cards-grid`, exactly 3 items:

```markdown
- Card Title
  - Body text.
```

- Top row: two equal cards, 24px gap — automatic from 2-column grid
- Bottom row: one card spanning full width — automatic (`li:last-child:nth-child(odd)` rule)
- Bottom card for summary, conclusion, or key takeaway
- Same card styling as 2×2
- **No separate class needed** — `cards-grid` handles 2, 3, and 4 items automatically

## Template 9: Two Cards Stacked (vertical)

```text
┌─────────────────────────────────────────┐
│  header                                 │
│             LABEL                       │
│           Slide Title                   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ Card Title 1                    │   │
│   │ content stretches full width    │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ Card Title 2                    │   │
│   │ content stretches full width    │   │
│   └─────────────────────────────────┘   │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `cards-stack`

**Marp directive:**

```markdown
<!-- _class: cards-stack -->
```

**Marp markdown source:**

```markdown
<!-- _class: cards-stack -->

## Two failure modes the framework is designed to prevent.

- **False signal amplification.** A single loud voice — one enterprise customer, one analyst report — dominates the decision without being weighed against the full signal set.
- **Signal hoarding.** Teams collect signals but do not log decisions, so the calibration loop has nothing to learn from.
```

- `h2` = heading
- Flat `ul`/`ol` — each top-level `li` becomes a card
- **Inline title contract:** `**Title.**` (bold, period-terminated) at the start of the `li` reads as the card title; body prose continues on the same line. Distinct from `cards-grid` where the title sits on its own line above a nested body list.
- **Ordered authoring (`1. `…):** opt into auto-numbered cards. The accent corner tag is the same chrome `cards-grid` uses; composes with the `horizontal` modifier (tag stays in the top-left of each card whether the row is vertical or horizontal). Use it whenever the cards carry a sequence — claim → evidence → implication, before → after, problem → root cause → fix.
- Two full-width cards stacked vertically
- 16px gap between cards
- Each card takes roughly equal vertical space
- Sequential relationship: top leads to bottom
- Good for problem/solution, setup/payoff, context/detail

## Template 10: Two Cards Side-by-Side (horizontal)

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                  LABEL                  │
│               Slide Title               │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Card Title 1 │     │ Card Title 2 │  │
│  │              │     │              │  │
│  │ content      │     │ content      │  │
│  │              │     │              │  │
│  └──────────────┘     └──────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `cards-side`

**Marp directive:**

```markdown
<!-- _class: cards-side -->
```

**Markdown format** — same nested list format as `cards-grid` (auto-bold, no `**...**` required):

```markdown
- Card Title
  - Body text.
```

- Two equal cards side by side
- 24px gap between cards
- Each card takes roughly equal width and full available height
- Parallel relationship: two topics shown together
- No connector or arrow — use Template 12 if you need one
- Good for two categories, two approaches, two perspectives

## Template 11: Comparison (side by side with connector)

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                  LABEL                  │
│            Comparison Title             │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Before /     │  →  │ After /      │  │
│  │ Option A     │     │ Option B     │  │
│  │              │     │              │  │
│  └──────────────┘     └──────────────┘  │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `compare-prose`

**Marp directive:**

```markdown
<!-- _class: compare-prose -->
```

**Markdown format** — same nested list format as `cards-grid`, exactly 2 items (auto-bold, no `**...**` required):

```markdown
- Before / Option A
  - Body text describing this side.
- After / Option B
  - Body text describing this side.
```

- Same physical layout as Template 11 but with visual connector (`❯` chevron) centered between cards
- Implies transformation, contrast, or choice
- Connector: `❯` at 30px (`--fs-xl`), `--text-muted`
- Cards are equal width
- Card header: 18px (`--fs-md`) bold, `--text-heading` — auto-bolded by CSS
- Card body (nested list): 16px (`--fs-body`), `--text-body`
- **Labeled corner tag (opt-in):** author the slot label as `**Option A**` / `**Option B**` and the bold prefix lifts into a flush top-left corner tag; cards without a leading `<strong>` render unchanged. See the **Labeled Corner Tag** universal feature.

## Template 12: Quote / Testimonial

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                                         │
│                                         │
│        "Quote text goes here in         │
│        italic display font,             │
│         centered on the slide."         │
│                                         │
│               — Attribution             │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `quote`

**Marp directive:**

```markdown
<!-- _class: quote -->
```

- Centered vertically and horizontally
- Quote: 28-36px, italic, display font, `--text-heading`
- Attribution: 14px, `--text-muted`, preceded by em dash
- Decorative opening/closing quote marks: 48px (`--fs-3xl`), `--text-muted`, rendered via `::before`/`::after` on the blockquote
- Max ~25 words in the quote

## Template 13: Timeline / Process

```text
┌─────────────────────────────────────────┐
│  header                                 │
│             LABEL                       │
│          Process Title                  │
│                                         │
│     ●──────●──────●──────●              │
│   Step 1  Step 2  Step 3  Step 4        │
│   desc    desc    desc    desc          │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `timeline`

**Marp directive:**

```markdown
<!-- _class: timeline -->
```

- Horizontal line with colored dots
- Use `ol` for numbered sequential steps (circles show 1, 2, 3…)
- Use `ul` for non-sequential milestones (plain dot circles)
- Each item: label on its own line, then `- description` as nested list (italic is optional but common)
- 3–6 steps maximum
- Example authoring:

```markdown
1. Signal Logged
   - Owner classifies and submits to intake queue
2. Scored
   - Model applies current weights, generates score
```

## Template 14: List / Bullet Points

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                                         │
│  LABEL                                  │
│  List Heading                           │
│                                         │
│  •  First point clearly stated          │
│  •  Second point with enough room       │
│  •  Third point, well spaced            │
│  •  Fourth point if needed              │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `list`

**Marp directive:**

```markdown
<!-- _class: list -->
```

- Items render as card-like rows: `--bg-alt` fill, `--border` border, 3px `--accent` left bar, `--radius-md` corners — not plain text bullets
- Heading: 36px (`--fs-2xl`), `--text-heading`
- Item text: 18px (`--fs-md`), `--text-body`, `--lh-base`
- 4-6 items maximum
- Optional nested `- sub-description` under each item renders in smaller muted text
- **`ol` variant**: items get a leading-zero counter (`01`, `02`…) in `--accent` mono, rendered as a grid row — use when order matters

**Marp markdown source (ul):**

```markdown
- First point clearly stated.
- Second point with enough room.
- Third point, well spaced.
```

**Marp markdown source (ol, numbered):**

```markdown
1. You have a regular prioritization cadence.
2. At least one person owns signal collection.
3. Leadership has agreed to log decisions.
```

## Template 15 — folded into Template 24

Full-bleed image is no longer a separate class. It is now a modifier on the
single `image` template — see Template 24 for the consolidated vocabulary
(`image`, `image mirror`, `image full`, `image full mirror`, `image contain`,
`image full contain`).

## Template 16: Big Number / Single Stat

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                                         │
│                                         │
│              LABEL                      │
│                                         │
│              247                        │
│                                         │
│         description text                │
│         below the number                │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `big-number`

**Marp directive:**

```markdown
<!-- _class: big-number -->
```

- Centered vertically and horizontally
- Number: 80-120px, display font, `--accent`
- Label above: 11px, `--text-muted`, uppercase
- Description below: 16-18px, `--text-body`, 1-2 sentences
- The number IS the slide — everything else supports it
- Authoring: nested list — `- 14×` then `  - description`

**Example:**

```markdown
`Eyebrow Label`

- 14×
  - Return on signal investment — one or two sentences of context.
```

## Template 17: Split Panel (colored sidebar)

```text
┌─────────────────────────────────────────┐
│ header                                  │
│ ┌──────────┐                            │
│ │ EYEBROW  │  SECTION HEADING           │
│ │          │                            │
│ │ [accent  │  ┌──────────────────┐      │
│ │  panel]  │  │ Card Title 1     │      │
│ │          │  │ body text        │      │
│ │          │  └──────────────────┘      │
│ │ Panel    │  ┌──────────────────┐      │
│ │ Title    │  │ Card Title 2     │      │
│ └──────────┘  │ body text        │      │
│               └──────────────────┘      │
│              footer              1/19   │
└─────────────────────────────────────────┘
```

**CSS class:** `split-panel`

**Marp directive:**

```markdown
<!-- _class: split-panel -->
```

- Left panel: 34% width, full-height accent color background
- Right panel: 66% width, `--bg`
- Left panel contains: inline-code eyebrow paragraph centered between the title (h2, bottom) and the top of the panel — use `` `Section Label` `` placed **between `h2` and `h3`** in the source. The CSS routes it to the left panel automatically.
- Right panel contains: `h3` subheading, optional `p` intro, then `ul`/`ol` card tiles
- Good for category-based slides where sidebar signals section or dimension
- **Card headers**: auto-bolded by CSS, no `**...**` required
- Supports both `ul` (no tag) and `ol` (flush top-left corner tag)
- **Authoring pattern:**

```markdown
## Slide Title

`Section Label`

### Section heading

Optional intro paragraph.

1. Card Title
   - Card body — description or supporting detail.
2. Card Title
   - Card body.
```

- `` `inline code` `` paragraph = left panel eyebrow (mono uppercase, faint, centered)
- `h2` = left panel title (white, bottom)
- `h3` = right panel subheading
- `p` = right panel intro text
- `ol > li` = stacked card tiles with flush corner tag; `ul > li` = stacked card tiles without tag
- **Optional metadata footer** = a trailing `ul` placed *after* the main `ol`/`ul`. Renders pinned to the bottom of the right panel with a divider line above. Authored as `**Label** · body` items — typical use: audience, intent, scope, or other framing labels. Absent → panel renders as before.

## Template 18: Closing (dark bookend)

```text
┌─────────────────────────────────────────┐
│             [dark background]           │
│                                         │
│                                         │
│          BRAND / LABEL                  │
│           ─────── (accent line)         │
│                                         │
│       Closing statement or              │
│        call to action in italic         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

**CSS class:** `closing`

**Marp directive:**

```markdown
<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->
```

- Mirrors title slide structure
- Background: `--bg-dark`
- Statement (`p` below the heading): 16px (`--fs-body`) italic, `--on-dark-secondary`
- Heading (`h2`): 48px display font, `--text-display`
- No header, footer, or page number

## Template 19: Three-Row Wide Cards

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL · CONTEXT                        │
│  Slide heading goes here.               │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ [1]  Card Heading One           │   │
│   │       body text for this card.  │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ [2]  Card Heading Two           │   │
│   │       body text for this card.  │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ [3]  Card Heading Three         │   │
│   │       body text for this card.  │   │
│   └─────────────────────────────────┘   │
│  footer                           6/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `cards-wide`

**Layout spec:**

- `section.cards-wide`: flex column, 48px 64px padding
- Cards container: `display: flex; flex-direction: column; gap: 12px; flex: 1`
- Each card: `flex: 1; background: var(--bg-alt); border: 1px solid var(--border); border-radius: --radius-md; padding: --sp-sm --sp-md; display: flex; flex-direction: column; gap: --sp-xs`
- Card header row: bare heading text (the part of the `<li>` before the nested bullet), auto-bolded by CSS, with inline numbered badge before it
  - Badge: `content: counter(wide-counter)` — mono pill, 16px, accent background, white text
  - Title: 16px (`--fs-body`) bold, `--text-heading`
- Card body (`ul > li`): 15px (`--fs-sm`), `--text-body`, full width
- Note: write the heading as plain text — no `**…**` needed. The layout bolds the entire `<li>` flow and resets the nested `<ul>` to body weight. Wrapping the heading in `**…**` is harmless but redundant.

**Marp markdown source:**

```markdown
<!-- _class: cards-wide -->

## Three scoring failure modes found in the pilot.

1. Recency dominance
   - High-recency noise crowding out durable signal. Teams set recency weight above 50% without empirical backing.
2. Source concentration
   - Single-customer signals inflating confidence scores. One vocal customer is not a market signal.
3. Outcome misclassification
   - PMs logging predicted outcomes that were too vague to score. Ambiguous outcomes cannot be calibrated.
```

**How the renderer maps this:**

- Each `1. Title` → one wide card; the numbered badge (1, 2, 3…) is auto-generated by CSS counter on `li::before`
- The bare heading text on the `1.` line → card header (auto-bolded, with inline badge); no `**…**` required
- Nested `- body` → card body text (auto-reset to body weight and colour)

**When to use:** Three parallel items that each need a title and a sentence of body context — three risks, three failure modes, three design constraints. Not for three items that fit as bullets (use T14) or three items that need comparison (use T22).

---

## Template 20: Numbered Criteria List

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL                                  │
│  Here is what the criteria are.         │
│                                         │
│  01  Criterion Title One                │
│       Supporting description text.      │
│                                         │
│  02  Criterion Title Two                │
│       Supporting description text.      │
│                                         │
│  03  Criterion Title Three              │
│       Supporting description text.      │
│                                         │
│  04  Criterion Title Four               │
│       Supporting description text.      │
│                                         │
│  footer                           8/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `list-criteria`

**Layout spec:**

- `section.list-criteria`: `display: flex; flex-direction: column; padding: 48px 64px`
- Slide heading (`h2`): 32-36px, `margin-bottom: 32px`
- Items list: `display: flex; flex-direction: column; gap: 24px; flex: 1; justify-content: center`
- Each item: `display: grid; grid-template-columns: 72px 1fr; align-items: start; gap: 0`
- Number cell: `font-family: var(--font-mono); font-size: 40-48px; font-weight: 700; color: var(--accent); line-height: 1; padding-right: 24px`
- Text cell: `display: flex; flex-direction: column; gap: 4px; padding-top: 6px` (nudge down to align with top of number)
  - Item title: `font-size: 17-19px; font-weight: 700; color: var(--text-heading)`
  - Item description: `font-size: 14-16px; color: var(--text-body); line-height: 1.6`
- Optional: thin `border-top: 1px solid var(--border)` above each item except the first
- Numbers are display elements — do not use `<ol>` list semantics; build with `<div>` grid rows
- 3-5 items maximum — if more, split across two slides

**Marp markdown source:**

```markdown
<!-- _class: list-criteria -->

## Four requirements every decision system must meet.

- Speed
  - Decisions must close within the window they are relevant to. Systems that add latency consume the value they exist to protect.
- Auditability
  - Every prioritization decision above a threshold must carry a traceable rationale. Required for alignment and compliance.
- Adoption
  - If the team won’t use it weekly, calibration never runs and the model never improves.
- Calibration
  - The system must improve over time. A static scoring model is a spreadsheet with extra steps.
```

**How the renderer maps this:**

- The sequence number (01, 02…) is auto-generated by CSS counter — do not author it in the Markdown
- Each `- Title` → one criteria row; the heading is auto-bolded by CSS, no `**…**` required (`**…**` is harmless if you prefer it)
- Nested `- description` → supporting text, 16px (`--fs-body`), `--text-body`
- 3–5 items maximum; if more, split across two slides

**When to use:** Ranked criteria, leadership principles, non-negotiable requirements, or any list where the items carry enough weight that a bullet point understates them. The number is a visual anchor, not a rank signal — reordering is fine.

---

## Template 21: Card Grid with Verdict Badges

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL                                  │
│  We have four options.                  │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Option 1     │     │ Option 2     │  │
│  │ ✓In-proc ✕Ops│     │ ✕In-proc ✓Ops│  │
│  │ description  │     │ description  │  │
│  └──────────────┘     └──────────────┘  │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Option 3     │     │ Option 4 ★   │  │
│  │ ✓In-proc ✓Ops│     │ ✓In-proc ✓Ops│  │
│  │ description  │     │ description  │  │
│  └──────────────┘     └──────────────┘  │
│  footer                           9/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `verdict-grid` (extends standard card grid)

**Layout spec:**

- Grid layout: identical to Template 8 (2×2, `display: grid; grid-template-columns: 1fr 1fr; gap: 16px`)
- Each card: `background: var(--bg-alt); border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; display: flex; flex-direction: column; gap: 10px`
- Card title: `font-size: 15-17px; font-weight: 700; color: var(--text-heading)`
- Badge row: `display: flex; flex-wrap: wrap; gap: 6px`
- Each badge: `display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 11px; font-weight: 600; border-radius: 999px; padding: 3px 8px`
- Badge color variants — define these CSS classes:
  - `.badge-pass`: `background: rgba(45,106,63,0.12); color: #2d6a3f`
  - `.badge-fail`: `background: rgba(155,28,28,0.12); color: #9b1c1c`
  - `.badge-warn`: `background: rgba(146,100,0,0.12); color: #925c00`
- Preferred card modifier `.card-preferred`:
  - `background: var(--accent-soft)` (or a light tint of `--accent` at 8-12% opacity)
  - `border-color: var(--accent)`
  - Card title: `color: var(--accent)`
- All four cards remain equal size — the highlight is color only, not size change

**Marp markdown source:**

```markdown
<!-- _class: verdict-grid -->

## We have four options, and they are not equally viable.

- Option 1 · Label
  - [x] In-process
  - [-] Independence
  - [x] Ops
  - [] Availability
  - The architectural model leadership wants, but the stand-up burden is prohibitive.
- Option 2 · Label
  - [ ] In-process
  - [ ] Independence
  - [x] Ops
  - [x] Availability
  - Consumed as delivered. Criterion relaxed is availability coupling.
- Option 3 · Label
  - [x] In-process
  - [x] Independence
  - [ ] Ops
  - [x] Availability
  - Honors architecture and independence, at the cost of a dedicated platform capability.
- Option 4 · Label
  - [x] In-process
  - [-] Independence
  - [x] Ops
  - [x] Availability
  - Co-develop the architecture needed. Same vendor, different engagement model.
```

**How the renderer maps this:**

- Each `- Card Title` → one card in the grid; the heading is auto-bolded by CSS, no `**…**` required (`**…**` is harmless if you prefer it)
- `[x]` → pass badge (green); `[ ]` → fail badge (red); `[-]` → warn badge (amber)
- **Badge colors (green/red/amber) render only in the Marp CLI / lattice-emulator.js path.** The VS Code preview shows all badges as neutral pills (`--bg` fill, `--text-muted` border).
- Last nested `li` (after all badge items) → card body description
- Last card in the grid gets accent-soft highlight automatically (`li:last-child` rule)

**When to use:** Option comparison, vendor evaluation, feature matrix where a recommended choice must be visible without hiding the tradeoffs. The badges let a reader scan all cards at once before reading any body text.

---

## Template 22: Comparison Table

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL                                  │
│  Here are the numbers side by side.     │
│                                         │
│  ┌───────────┬───────────┬───────────┐  │
│  │           │ Option A  │ Option B  │  │
│  ├───────────┼───────────┼───────────┤  │
│  │ Row 1     │ ✓         │ ✕         │  │
│  │ Row 2     │ ✕         │ ✓         │  │
│  │ Row 3     │ ✓         │ ✓         │  │
│  │ Row 4     │ ⚠         │ ✓         │  │
│  └───────────┴───────────┴───────────┘  │
│  Footnote text for scope caveats.       │
│  footer                          11/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `compare-table`

**Layout spec:**

- `section.compare-table`: `display: flex; flex-direction: column; padding: 48px 64px`
- Slide heading (`h2`): 28-34px, `margin-bottom: 20px`
- Table wrapper: `flex: 1; overflow: hidden`
- `table`: `width: 100%; border-collapse: collapse; font-size: 13-15px`
- Header row chrome (`thead tr`): `background: var(--spectrum) bottom / 100% 2px no-repeat` — the spectrum-gradient separator replaces a flat fill + border with the same brand chrome used by glossary, roadmap, and the slide top stripe
- Header cells (`thead th`): `font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.10em; text-transform: uppercase; color: var(--text-label); padding: 8px 16px 10px; text-align: left`
- First column (row labels, `td:first-child`): `font-weight: 600; color: var(--text-heading); width: 28%; padding: 10px 16px; border-bottom: 1px solid var(--border)`
- Data cells (`td`): `padding: 10px 16px; border-bottom: 1px solid var(--border); color: var(--text-body)`
- Cell semantic tinting — apply via class on `<td>`:
  - `.cell-pass`: `background: rgba(45,106,63,0.08); color: #2d6a3f`
  - `.cell-fail`: `background: rgba(155,28,28,0.08); color: #9b1c1c`
  - `.cell-warn`: `background: rgba(146,100,0,0.08); color: #925c00`
  - No class: neutral, `color: var(--text-muted)`
- Use background tint only — never bold fills that obscure text
- Trailing paragraph after the table follows the universal trailing-paragraph registers (see Feature: Below-Note and Feature: Annotation): a plain trailing `<p>` renders as a hairline-ruled below-note, and a trailing `<p>` whose only content is `_italic_` markdown renders as an annotation with the `✦` glyph. There is no `compare-table`-specific footnote rule.
- Maximum ~6 rows, ~5 columns before legibility breaks — split or simplify if more

**Marp markdown source:**

```markdown
<!-- _class: compare-table -->

## Here are the numbers side by side.

<table>
  <thead>
    <tr>
      <th></th>
      <th>Option A</th>
      <th>Option B</th>
      <th>Option C</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Runtime model</td>
      <td class="cell-pass">In-process</td>
      <td class="cell-fail">Out-of-process</td>
      <td class="cell-pass">In-process</td>
    </tr>
    <tr>
      <td>Availability coupling</td>
      <td class="cell-pass">Contained</td>
      <td class="cell-fail">Every app ≤ vendor</td>
      <td class="cell-pass">Contained</td>
    </tr>
    <tr>
      <td>Operational burden</td>
      <td class="cell-fail">Heavy</td>
      <td>Vendor-managed</td>
      <td class="cell-warn">Shared</td>
    </tr>
  </tbody>
</table>

_Scope and timeline estimates are not included — this table covers architectural properties only._
```

**Note:** This template requires `html: true` in the Marp frontmatter. The `<table>` is written directly in the markdown — Marp passes it through when HTML is enabled. Cell classes (`.cell-pass`, `.cell-fail`, `.cell-warn`) must be defined in the deck's CSS theme.

**Note on the trailing line:** the example uses an italic-only paragraph, which the universal annotation register renders with the `✦` glyph + label-size muted text. Drop the italics to get a below-note instead (full-width hairline rule + body text). Drop the line entirely if no scope-caveat is needed.

**When to use:** Multi-vendor comparison, criteria matrix, architectural property grid. Use when the reader needs to scan both across a row (how one item compares across options) and down a column (what one option looks like in total). If you only need to compare two things, use T11 instead.

---

## Template 23: Featured Card + Sub-Grid

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL                                  │
│   Here is where the evidence points.    │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ ── THE EVIDENCE FAVORS OPTION 4 │   │
│   │                                 │   │
│   │ Featured thesis here. This is   │   │
│   │ the answer the slide asserts.   │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌──────────────┐   ┌──────────────┐   │
│   │ Sub Card 1   │   │ Sub Card 2   │   │
│   │ Condition or │   │ Condition or │   │
│   │ caveat.      │   │ fallback.    │   │
│   └──────────────┘   └──────────────┘   │
│  footer                          14/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `featured`

**Layout spec:**

- `section.featured`: `display: flex; flex-direction: column; padding: 48px 64px`
- Slide heading (`h2`): 28-34px, `margin-bottom: 20px`
- Featured card: `background: var(--accent-soft); border: 1px solid var(--accent); border-radius: 12px; padding: 24px 28px; margin-bottom: 20px`
  - Featured label: `font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin-bottom: 12px` — prepend a short rule: use CSS `::before { content: '── '; }` or a `<span class="rule">── </span>`
  - Featured body: `font-size: 17-20px; color: var(--text-body); line-height: 1.7; max 2-3 sentences`
- Sub-card row: `display: flex; gap: 16px`
  - Each sub-card: `flex: 1; background: var(--bg-alt); border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px`
  - Sub-card title: `font-size: 15-16px; font-weight: 700; color: var(--accent)` (accent, not heading — signals it's subordinate to the featured label but still active)
  - Sub-card body: `font-size: 14px; color: var(--text-body); line-height: 1.6; margin-top: 8px`
- Hierarchy rule: featured card is larger, warmer, and has accent border — sub-cards are neutral. Never make all three areas equal weight.

**Marp markdown source:**

```markdown
<!-- _class: featured -->

## Applying the criteria, here is where the evidence points.

- The evidence favors this approach
  - Featured card body — the assertion the slide makes. Two to three sentences maximum.
- The path is not self-executing
  - First qualification or condition that the reader needs to act on.
- Option B is the right fallback
  - Second qualification or fallback condition.
```

**How the renderer maps this:**

- First top-level `li` → featured card (accent-soft background, accent border); card title is auto-bolded by CSS
- Remaining `li` items → sub-card row (equal width); sub-card titles also auto-bolded by CSS
- No `**...**` required — all card headers are auto-bolded
- Nested `ul/ol > li` → card body text

**When to use:** Assessment with a clear recommended direction plus qualifications or fallback conditions. This template asserts a direction — do not use it for three equal options (use T7 or T21). Use it when the deck needs to say "here is the answer, and here is the nuance."

---

## Trailing Element Registers

Any card-bearing layout can carry up to four trailing elements at the bottom of the slide, composed by markdown shape. They form a single family with a fixed canonical order:

1. `> blockquote` — **Key Insight** (the observation)
2. plain `<p>` — **Below-Note** (context)
3. `**bold**`-only `<p>` — **Call-to-Action** (the ask)
4. `_italic_`-only `<p>` — **Annotation** (the citation)

**Author trailing registers in canonical order.** Selectors are mostly shape-based and fire wherever each register sits, but the hairline rule that anchors a trailing block at the top is **position-sensitive** in the Marp-preview path (it attaches to the first `<p>` after a structural block). Out-of-canonical-order sources can silently lose the hairline in preview while still rendering correctly in CLI output. See `docs/references/gotchas.md` § "Trailing register out of order loses hairline in preview."

**At most one of each register per slide.** All four may coexist but rarely should — a slide with content + insight + note + ask + citation is doing too much. The common pairings are insight-only, insight + citation, content + ask.

---

## Feature: Key Insight Panel

Any card-bearing layout that ends with a trailing `> blockquote` renders it as a **Key Insight panel** — an accent-tinted bar that pins below the card content.

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL                                  │
│  Grid Title                             │
│                                         │
│   ┌──────────────┐   ┌──────────────┐   │
│   │ Card Title 1 │   │ Card Title 2 │   │
│   │ body text    │   │ body text    │   │
│   └──────────────┘   └──────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ KEY INSIGHT                     │   │
│   │ The key insight text here.      │   │
│   └─────────────────────────────────┘   │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**Layouts that support Key Insight:** every layout except `quote` and `featured` (which use the blockquote slot for primary content). In practice, reach for it on card- and list-bearing layouts where the trailing blockquote summarises the slide.

**Styling:**

- Panel: `--accent-soft` background, `1px solid var(--accent)` border, `--radius-md` corners
- "KEY INSIGHT" eyebrow: 13px (`--fs-label`) mono, bold, letter-spaced, `--accent` color
- Body text: 16px (`--fs-body`) body font, `--text-heading` color, not italic

**Marp markdown source:**

```markdown
<!-- _class: cards-grid -->

## Slide heading.

- Card Title 1
  - Card body.
- Card Title 2
  - Card body.

> The key insight text that ties the cards together. One sentence preferred.
```

**Note:** The blockquote must be the **last element** on the slide (or the last element before a trailing paragraph).

## Feature: Below-Note

A trailing plain paragraph (not a blockquote) on any card-bearing layout renders as a **below-note** — body-sized contextual text with a hairline gradient rule above it, visually separate from the card content.

```markdown
<!-- _class: cards-grid -->

## Slide heading.

- Card Title 1
  - Card body.
- Card Title 2
  - Card body.

This is a below-note. It appears below the cards with a hairline rule above it.
```

**Layouts that support below-note:** `cards-grid`, `cards-stack`, `cards-wide`, `compare-prose`, `compare-table`, `verdict-grid`, `featured`, `list`, `list-criteria`, `list-steps`, `list-tabular`, `timeline`, `principles`, `tldr`, `matrix-2x2`, `decision`, `before-after`, `actors`, `kpi`, `agenda`

- Rule: hairline gradient from `--accent` to transparent
- Text: 16px (`--fs-body`), `--text-body`
- Use for source attribution, scope caveats, or a single sentence of additional context

---

## Feature: Auto-Numbered Cards (ordered authoring)

Card-bearing layouts auto-number their cards when the source list is an ordered list (`1. `, `2. `, …) instead of a bulleted list (`-`). The author opts into the tag by changing the marker — no class, no directive. Each opting layout pins the number in its own visual register (corner tag, accent block, mono-rail, "STEP 01" label) so the chrome reads as part of the layout, not bolted on.

```markdown
<!-- _class: cards-stack horizontal -->

## Three-step argument.

1. **Claim.** First card carries badge `1`.
2. **Evidence.** Second card carries badge `2`.
3. **Implication.** Third card carries badge `3`.
```

**Layouts that auto-number when authored as `ol`:** `cards-grid`, `cards-side`, `cards-stack` (incl. `horizontal`), `cards-wide`, `list`, `list-criteria`, `list-steps`, `list-tabular`, `split-panel`, `timeline`, `principles`

- Switching from `-` to `1. ` is the entire authoring surface — no modifier class, no comment directive
- Each layout owns its counter style: cards-grid / cards-side / cards-stack render an accent corner tag; cards-wide renders an accent header pill; list / list-criteria / list-tabular render a mono `01` rail; list-steps renders "STEP 01"; split-panel renders a large accent block; timeline renders a circle node; principles supports `01` / `A` / `I` format modifiers
- Layouts that **do not** number on `ol` are intentional: state-bearing rows (`actors`, `checklist`, `verdict-grid`), named-slot rows (`featured`, `compare-prose`, `before-after`, `decision`, `matrix-2x2`), equal-weight summaries (`tldr`), and value-display layouts (`kpi`, `stats`, `big-number`)

---

## Feature: Labeled Corner Tag (`before-after`, `compare-prose`, `decision`)

The named-slot sibling of the numbered corner tag. The slot label sits at the top of each card as a flush corner tag — same geometry as the numbered tag, but the content is editorial text instead of a counter. The card body fills from the top; no first line is consumed by a label.

```markdown
<!-- _class: before-after -->

## Detokenize used to require a vault round-trip.

- Before
  - Every detokenize call: network round-trip to the central vault, p99 60 ms.
- After
  - Local function call against an in-process codebook, p99 8 ms.
```

**Layouts that support the labeled corner tag:** `before-after`, `compare-prose`, `decision`

- **Authoring is plain.** Write the slot label as the first line of each list item — no bold, no syntax. The build pipeline lifts it into a `<strong>` automatically because in these named-slot layouts the leading text is structurally a slot label, not editorial emphasis. Authors don't carry presentational markup.
- Tag chrome matches the numbered corner tag — accent fill, white mono text, flush top-left geometry. The labeled and numbered variants are visually a family.
- `before-after` and `compare-prose` use the unified accent fill because their slots have semantic ordering (before/after, A/B). `decision` is the categorical case: each slot is an independent reason, so the tag and the bottom border cycle through the categorical palette (`--cat-blue`, `--cat-green`, `--cat-purple`, …) — same palette and cycle as `kpi.trajectory`, inverted to the bottom edge so the two layouts read as siblings (kpi.trajectory = top accent, decision = bottom accent).
- Composes with `compare-prose` modifiers: `chosen` and `decision` continue to recolour / strike the lifted label, so the corner tag inherits the modifier's editorial signal.
- **Banner variant (`banner-tag` modifier).** Add `banner-tag` to the slide directive (e.g. `<!-- _class: decision banner-tag -->`) to flip each card from a flush-corner tag into a full-width header strip. The card becomes a vertical column-flex: tag fits its content height and spans the full card width; body stretches into the remaining height (vertically centred). Use when the slot label is the architectural signal of the card — the categorical case (`BUILD` / `WHY NOT BUY` / `WHY NOT DELAY`) — rather than a quiet marker. Default flush-corner stays for the editorial register where the body owns the card. Same lift infrastructure feeds both styles, so authoring is unchanged. Composes with all existing modifiers (`chosen`, `decision`, `mirror`, `vertical`).
- Named-slot only — `before-after`, `compare-prose`, and `decision` exist precisely to label their cards. Other card-bearing layouts (`cards-grid`, `cards-stack`, etc.) keep the in-card title row because their card titles are editorial sentences, not categorical labels.

---

## Feature: Annotation

A trailing paragraph whose only content is an `_italic_` span renders as an **annotation** — a `✦` (U+2726) glyph in `--accent` followed by smaller, muted, label-size text. No hairline rule. Distinct from a below-note: lighter visual weight, lower information density, signals "this is a footnote, not a continuation of the argument."

```markdown
<!-- _class: cards-grid -->

## Slide heading.

- Card Title 1
  - Card body.
- Card Title 2
  - Card body.

_Source: pilot retrospective, six months across four product teams._
```

**Layouts that support annotation:** same set as below-note — `cards-grid`, `cards-stack`, `cards-wide`, `compare-prose`, `compare-table`, `verdict-grid`, `featured`, `list`, `list-criteria`, `list-steps`, `list-tabular`, `timeline`, `principles`, `tldr`, `matrix-2x2`, `decision`, `before-after`, `actors`, `kpi`, `agenda`

- Selector: `p:has(> em:only-child)` — the paragraph must contain a single `<em>` and nothing else (no leading/trailing text outside the italic span)
- Glyph: `✦` (U+2726) in `--accent`, `0.95em`
- Text: 15px (`--fs-sm`), `--text-muted`
- Use for: source citations, scope caveats, asterisk-style footnotes — content that frames the slide rather than extending its argument

## Feature: Call-to-Action

A trailing paragraph whose only content is a `**bold**` span renders as a **call-to-action** — a `▸` (U+25B8) glyph in `--accent` followed by body-size bold text in `--text-heading`. Signals the **ask**: the decision needed, the deadline, the next step, the action that closes the slide. Distinct from a Key Insight (which observes), a Below-Note (which adds context), and an Annotation (which cites).

```markdown
<!-- _class: decision -->

## Build vs. buy: build.

- Build
  - Three engineers, eight weeks, owns the data path.
- Why not buy
  - Vendor lock-in on a hot-path primitive.
- Why not delay
  - Roadmap commitments slip past Q3.

**Approve scoping spike by Friday.**
```

**Layouts that support call-to-action:** same set as below-note and annotation — `cards-grid`, `cards-stack`, `cards-wide`, `compare-prose`, `compare-table`, `verdict-grid`, `featured`, `list`, `list-criteria`, `list-steps`, `list-tabular`, `timeline`, `principles`, `tldr`, `matrix-2x2`, `decision`, `before-after`, `actors`, `kpi`, `agenda`

- Selector: `p:has(> strong:only-child)` — the paragraph must contain a single `<strong>` and nothing else (no leading/trailing text outside the bold span)
- Glyph: `▸` (U+25B8) in `--accent`, `0.95em`
- Text: 16px (`--fs-body`), `--text-heading`, weight 600 (inherited from `section strong`)
- Hairline: solid 1px `--accent` above (in the wrapped CLI form, the `.below-note` wrapper carries the gradient hairline; in the Marp-preview raw form, the same line is drawn as `border-top` on the `<p>` itself)
- Use for: decision asks, deadlines, owner-action prompts, next steps — content that prompts an action rather than summarising the argument

**Note:** The four trailing registers compose by markdown shape on the same set of layouts. Canonical order, top → bottom:

| Order | Markdown shape                                | Renders as          | Visual chrome                              |
| :---: | --------------------------------------------- | ------------------- | ------------------------------------------ |
|   1   | `> blockquote`                                | **Key Insight**     | accent-tinted panel, "KEY INSIGHT" eyebrow |
|   2   | Plain `<p>`                                   | **Below-Note**      | gradient hairline + body text              |
|   3   | `<p>` with only `**bold**` markdown           | **Call-to-Action**  | `▸` glyph + bold heading-color body text   |
|   4   | `<p>` with only `_italic_` markdown           | **Annotation**      | `✦` glyph + muted label-size text          |

A slide may carry one of each register, in canonical order. The common pairings are insight-only, insight + annotation, and content + call-to-action. See `examples/element-conventions.md` for the full register family and a four-register composition example.

---

## Feature: Overflow Warning

Every slide is a fixed 1280×720 frame with `overflow: hidden`. Content that exceeds the frame is clipped silently — easy to miss in a deck of 60+ slides. Lattice tags any overflowing `<section>` with the class `overflow`, which the theme renders as a **4 px inset red ring**. Authors get a loud, unmissable signal in every render path.

**Detection.** Pure DOM measurement — `scrollHeight > clientHeight + 12` (12 px filters sub-pixel rounding noise from nested borders and shadows). Runs in three places:

| Pipeline                | Source                                         | When it fires                            |
| ----------------------- | ---------------------------------------------- | ---------------------------------------- |
| VS Code Marp preview    | `lattice-runtime.js` → `startOverflowWatcher()` | After Mermaid init, on every DOM mutation, on resize |
| `node lattice-emulator.js …`     | inline `<script>` baked into the HTML output    | On `DOMContentLoaded` and on resize      |
| `node lattice-emulator.js … pdf` | Puppeteer `page.evaluate()` before `page.pdf()` | Once per build; also logs `⚠ Overflow on slide N` to the console |

**What authors see.** The red ring is drawn via `box-shadow: inset` so it never shifts layout. Build-time also prints a console warning naming each offending slide. There is no opt-in, no debug flag, and no way to silence it short of fixing the slide.

**No false positives in the gallery.** A 12 px tolerance was chosen empirically: the Lattice gallery (71 slides) renders zero rings; injecting one item past the fold lights up the offending slide on the next save.
---

## Documented Variants

These are named variations of existing templates. Use them when the base template almost fits but needs one structural addition.

### Variant: T11 with Below Note

Extends Template 12 (Comparison with connector). Adds a full-width framing paragraph below the two cards.

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL                                  │
│  Comparison Heading                     │
│                                         │
│   ┌─────────────┐     ┌─────────────┐   │
│   │ Card A      │  →  │ Card B      │   │
│   │ content     │     │ content     │   │
│   └─────────────┘     └─────────────┘   │
│                                         │
│  Framing sentence that applies to       │
│   both sides equally. Max 30 words.     │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS addition to T11:**

- After the card row: `margin-top: 20px`
- Framing paragraph: `font-size: 15-17px; color: var(--text-body); line-height: 1.6; max-width: 800px`
- The note sits below the cards with more margin above it than the gap between the cards — this signals it is a comment on the comparison, not a third card

**Marp markdown source:**

```markdown
<!-- _class: compare-prose -->

## Heading

- **Option A**
  - Body text for the left card.
- **Option B**
  - Body text for the right card.

Optional framing sentence below the cards.
```

**How the renderer maps this:** Same as T11, except a trailing paragraph (not inside a list item) is rendered as the framing note below the cards.

---

### Variant: T13 Step Cards

Extends Template 14 (Timeline / Process). Replaces the dot-on-line with equal-width numbered step cards arranged horizontally.

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL                                  │
│  How to roll this out.                  │
│                                         │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│   │ STEP 01 │ │ STEP 02 │ │ STEP 03 │   │
│   │         │ │         │ │         │   │
│   │ Step    │ │ Step    │ │ Step    │   │
│   │ Title   │ │ Title   │ │ Title   │   │
│   │         │ │         │ │         │   │
│   │ body    │ │ body    │ │ body    │   │
│   └─────────┘ └─────────┘ └─────────┘   │
│  footer                          12/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `list-steps`

**Layout spec:**

- Each `li`: flex column card with `--bg-alt` fill, `--border` border, `--radius-md` corners
- **STEP badge**: auto-generated by CSS — `STEP 01`, `STEP 02`… — 13px mono, letter-spaced, `--text-muted`; do **not** author it in the Markdown
- Card header: 18px (`--fs-md`) bold, `--text-heading` — auto-bolded by CSS, no `**...**` required
- Card body (nested `ul/ol > li` or `p`): 16px (`--fs-body`), `--text-body`
- `❯` chevron connectors between cards: CSS-generated, not authored
- 2–4 cards; use T13 (dot-on-line) for 5–6 steps with shorter labels
- Use `ol` (not `ul`) to get the auto-generated `STEP 01` badge

**Marp markdown source:**

```markdown
<!-- _class: list-steps -->

## How to roll this out across your organization.

1. Pick one team and one decision type
   - Start with a team that already has a regular prioritization rhythm.
2. Log everything, decide nothing differently
   - In the first month, do not change how you make decisions. Log only.
3. Run your first retrospective
   - At day 30, score the logged decisions against outcomes. You will find patterns.
4. Expand to a second team
   - With one retrospective complete, you have evidence. Use it.
```

**How the renderer maps this:** Each `ol > li` → one step card. The first text line is the step title (auto-bolded by CSS). Nested `ul/ol > li` items form the card body. The `STEP 01` badge and `❯` chevron connectors are CSS-generated — do not author them in the Markdown.

**When to use:** Steps that need more content than a dot label can hold. Use dot-on-line (T13) for light orientation with short labels; use step cards when each step needs a title plus a sentence of description. Use `ol` to activate the `STEP 01` eyebrow badge.

---

### Variant: T14 Tabular

Extends Template 15 (List / Bullet Points). Each list item carries a name, a description, and a piece of metadata in a tabular row — table scannability with list authoring.

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL                                  │
│  Growth is a change in thinking.        │
│                                         │
│  01  Remember     Recall facts  FEATURE │
│  02  Understand   Explain it    MODULE  │
│  03  Apply        Use patterns  SERVICE │
│  04  Analyze      Decompose     SYSTEM  │
│  05  Evaluate     Judge option  ORG     │
│  06  Create       Synthesize    ENTRP.  │
│                                         │
│  footer                           3/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `list-tabular` — one base class with optional visual variants and fine-tuning modifiers. Author picks the class, modifiers compose with it.

**The authoring contract** (same across base + all variants):

```markdown
<!-- _class: list-tabular -->

## Slide heading.

1. Name `Meta string`
   - Description sentence.
2. Next name `Other meta`
   - Description sentence.
```

Two lines per item: the name with inline-code meta adjacent to it on the title line, then a single nested bullet for the description.

**The meta convention.** Metadata renders as inline code (backticks) **adjacent to what it qualifies** — on the same line as the name. This is the same convention `cards-stack` / `cards-grid` use for badge-style meta on card titles. Why adjacent: meta inherently labels something specific. A piece of meta on its own bullet isn't meta — it's just another bullet. Authoring it next to the name makes the relationship explicit and gives CSS a deterministic hook to pull the meta into its visual column at render time.

**Visual variants** (mutually exclusive — pick one or none):

| Modifier | Look |
|---|---|
| (none) | Default — hairline-ruled rows, display-serif name, mono uppercase meta right-aligned. The quiet boardroom-accounting look. |
| `def` | Editorial — counter at `fs-2xl` display-serif spans both rows; eyebrow caption above the name; name at `fs-lg`; description vertically centred in the right column. Glossary / definition look. |
| `metric` | Meta renders as a tile on the right (`132%`, `$14.2M`, `4.1d`). Scorecard pattern — OKRs, KPIs, capability scores. |
| `spec` | Name in mono (treated as a key), mono accent meta right-aligned. API-reference / spec-sheet feel. |
| `register` | Meta renders as an `--accent-soft` pill. Categorical-meta tables — risk registers, decision logs, status tables. |

**Fine-tuning modifiers** (compose with the variant above):

| Modifier | Works with | Effect |
|---|---|---|
| `compact` | any | Tighter row padding for 7-8 row decks |
| `rule` | `def` | Single continuous full-height accent rail down the ol's left edge |
| `solid` | `metric` | Filled accent tile with on-accent text, for hero stats |
| `stacked` | `spec` | Description on its own row beneath the name; counter scales up to `fs-2xl` and spans both rows |
| `outline` | `register` | Hairline-bordered tag instead of filled pill, for outline IDs (ADR-014, ticket numbers) |

**Composing:**

```markdown
<!-- _class: list-tabular -->                  ← default ledger
<!-- _class: list-tabular compact -->          ← default, tighter rows
<!-- _class: list-tabular def -->              ← editorial
<!-- _class: list-tabular def rule -->         ← editorial with accent rail
<!-- _class: list-tabular metric -->           ← scorecard with bordered tile
<!-- _class: list-tabular metric solid -->     ← scorecard with filled tile
<!-- _class: list-tabular spec -->             ← spec sheet
<!-- _class: list-tabular spec stacked -->     ← spec sheet, long descriptions
<!-- _class: list-tabular register -->         ← register with pill
<!-- _class: list-tabular register outline --> ← register with outlined tag
```

**Layout spec:**

- `section.list-tabular ol`: `display: flex; flex-direction: column`. No flex `gap` — hairlines between rows do the row separation.
- Each top-level `li`: `display: grid` with `grid-template-columns: 44px 200px 1fr auto` for the default. Variants override the grid template as needed (`def` uses 3 cols + 2 rows; `spec` widens col 2 to 260px; `spec.stacked` swaps to 2-row layout).
- Counter column: `::before` renders `counter(..., decimal-leading-zero)` in mono `--accent`. Size scales with item height — `fs-md` for single-row items, `fs-2xl` (spans rows, centred) for multi-row items like `def` and `spec.stacked`.
- Name comes from the `li`'s direct text node, placed by auto-flow into the name column.
- Description comes from the nested `<ul><li>` flattened via `display: contents`, explicit `grid-column` placement.
- Meta comes from the inline `<code>` element, explicit `grid-column` placement on the meta cell. Default reset (`background: none; border: none; padding: 0; border-radius: 0`) strips the chip styling from the global `section code` rule; each variant then adds its own meta treatment.
- All three render paths (marp-cli, `lattice-emulator.js`, `lattice-runtime.js`) ship the same markdown shape through identical CSS — no per-renderer DOM transform.

**One markdown gotcha:** if meta contains intraword underscores (`ml_v2`, `notify_batch`), the inline-code form works directly — `` `Flag · ml_v2` `` is unambiguous. The italic form `_Flag · ml_v2_` (legacy convention) would fail because CommonMark blocks the outer `_` pair from forming emphasis across an unpaired inner `_`.

**When to use:** A list where each item has structured metadata — level + scope, item + type + status, verb + description + context. Gives the list the scannability of a table while preserving the flowing left-to-right reading order of a list. Switch to T22 if readers need to scan down columns as much as across rows.

**Example deck:** `examples/list-tabular-gallery.md` ships ten slides — base default + four visual variants + their modifiers — for side-by-side comparison.

---

## Template 24: Image

One class, three modifiers. The `image` template covers every visual slide
shape in the deck: half-canvas image-right (default), half-canvas mirrored,
full-bleed cover, full-bleed letterbox, and the editorial-plate variant for
assets that must not crop.

### Default — half-canvas, cover

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL              │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  Heading            │ ▓▓▓ image ▓▓▓▓▓▓  │
│                     │ ▓▓ (cover) ▓▓▓▓▓  │
│  Body text here.    │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  footer       1/N   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
└─────────────────────────────────────────┘
                       ↑ 1px hairline divider
```

### Variant: `mirror` — image left

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │       LABEL         │
│  ▓▓▓ image ▓▓▓▓▓▓ │       Heading       │
│  ▓▓ (cover) ▓▓▓▓▓ │                     │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │       Body text.    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │                1/N  │
└─────────────────────────────────────────┘
```

### Variant: `contain` — letterbox on a clean matte (no crop)

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL              │ ░░░ ┌──────┐ ░░░  │
│  Heading            │ ░░░ │image │ ░░░  │
│                     │ ░░░ │native│ ░░░  │
│  Body text here.    │ ░░░ │ ratio│ ░░░  │
│  footer       1/N   │ ░░░ └──────┘ ░░░  │
└─────────────────────────────────────────┘
                       ↑ matte (--bg-alt)
                                  ↑ 1px frame around image
```

### Variant: `full` — full bleed

```text
┌─────────────────────────────────────────┐
│ TITLE OVERLAY ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │  ← gradient scrim
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│ ▓▓▓▓▓▓ image (cover, full bleed) ▓▓▓▓▓  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│ Caption text ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │  ← gradient scrim
└─────────────────────────────────────────┘
```

**CSS class:** `image` plus optional modifiers `mirror`, `full`, `contain`.

| Class                       | Effect                                                |
| --------------------------- | ----------------------------------------------------- |
| `image`                     | half-canvas image right, cover-fill (default)         |
| `image mirror`              | half-canvas image left, cover-fill                    |
| `image contain`             | half-canvas image right, letterbox on matte           |
| `image mirror contain`      | half-canvas image left, letterbox on matte            |
| `image full`                | full-bleed cover, optional title + caption scrim      |
| `image full contain`        | full-bleed letterbox on matte (no crop)               |
| `image full mirror`         | full bleed; title scrim drops to bottom edge          |

`image left` is a deprecated alias for `image mirror`, kept for one release.

**Marp markdown source:**

```markdown
<!-- _class: image -->

`Layout · Image`

## Image right is the default — text leads, evidence follows.

Body text describing the visual evidence.

![bg right](path/to/image.jpg)
```

```markdown
<!-- _class: image full -->
<!-- _paginate: false -->

## Optional title overlay at top

Optional caption overlay at bottom.

![bg](path/to/image.jpg)
```

- `` `inline code` `` paragraph = eyebrow label (half-canvas only)
- `h2` = heading (half-canvas) or title overlay (full bleed)
- `p` body = body text (half-canvas) or caption overlay (last `<p>` in full bleed)
- `![bg right](url)` / `![bg left](url)` / `![bg](url)` = Marp background image directive

**Image sizing — the class decides fit, not the markdown.**

In the consolidated vocabulary the slide class is the source of truth for
how the image is fitted into its slot. The Marp `fit` keyword is accepted
for back-compat but no longer load-bearing — CSS overrides it.

| Want                                              | Use                                |
| ------------------------------------------------- | ---------------------------------- |
| photo, magazine-tight, mild crop is OK            | `image` or `image full` (default)  |
| chart / screenshot / diagram, must show in full   | `image contain` / `image full contain` |
| flip image to the opposite slot                   | add `mirror`                       |

Slot aspect for reference:

| Layout                  | Slot aspect                    | Crop behaviour (cover)      |
| ----------------------- | ------------------------------ | --------------------------- |
| `image`                 | ≈ 8 : 9 (half of 16 : 9 canvas) | crops left/right of wide; top/bottom of tall |
| `image full`            | 16 : 9                          | crops sides of tall; top/bottom of square    |

Bring whatever asset you have. With the default cover treatment the image
fills its slot edge-to-edge — no placeholder pattern visible behind a real
photo. If a crop would destroy meaning (charts, diagrams, schematics),
add `contain` and the image lands on a clean `--bg-alt` matte at native
ratio, framed by a 1px hairline.

---

## Template 25: Code

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL                                  │
│  Slide Heading                          │
│  Language · Context label               │
│   ┌─────────────────────────────────┐   │
│   │ // code block fills remaining   │   │
│   │ // space below                  │   │
│   └─────────────────────────────────┘   │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `code`

**Marp directive:**

```markdown
<!-- _class: code -->
```

- Code block (`pre/code`) fills all remaining vertical space after the headings
- Dark code background (`#001D33`) with spectrum-colored bottom bar accent
- Monospace font (`--font-mono`), small size (`--fs-sm`), light text (`#C5D8F5`)

**Marp markdown source:**

```markdown
<!-- _class: code -->

`Implementation · Token Pipeline`

## The tokenization call is three lines of application code.

`JavaScript · SDK v2 interface`

~~~javascript
const tokens = await client.tokenize(input, {
  model: "signal-v2",
  format: "compact",
});
~~~
```

- `` `inline code` `` paragraph (first) = eyebrow
- `h2` = heading
- `` `inline code` `` paragraph (second, after `h2`) = language/context label above the code block
- Fenced code block = the code (fills remaining space)

---

## Template 26: Code Compare

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                  LABEL                  │
│            Comparison Title             │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Left label   │     │ Right label  │  │
│  │              │     │              │  │
│  │   // code    │     │   // code    │  │
│  │              │     │              │  │
│  └──────────────┘     └──────────────┘  │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `compare-code`

**Marp directive:**
```markdown
<!-- _class: compare-code -->
```

- Two equal code columns (`1fr 1fr`), gap `--sp-md`
- Each column: inline-code label (`p > code`) above a code block (`pre`)
- Same dark code style as `code` template

**Marp markdown source:**

```markdown
<!-- _class: compare-code -->

`Before & After · Key Distribution`

## File-distributed keys versus vault-integrated keys.

`Before · File-distributed`

~~~python
SECRET_KEY = os.environ["SECRET_KEY"]
hmac.new(SECRET_KEY, payload)
~~~

`After · HSM / KMS integrated`

~~~python
signature = vault.sign(payload, key_id="prod-hmac-v3")
~~~
```

- `` `inline code` `` paragraph before `h2` = optional eyebrow (spans both columns)
- `h2` = heading (spans both columns)
- `` `inline code` `` paragraph (first after `h2`) = left column label
- First code block = left column
- `` `inline code` `` paragraph (second after `h2`) = right column label
- Second code block = right column

**Why inline code, not `h3`, for column labels:** `h3` is a heading level and triggers heading-order lint rules. Column labels are display labels, not headings — the same semantic role as eyebrows on other slide types. Using inline-code paragraphs is consistent with the project-wide eyebrow convention and simplifies the CSS (eyebrow detection uses `:has(> p ~ h2)` rather than the ambiguous `:has(h3 ~ h2)`; nested `:has()` is avoided because Marp's Chromium build does not support it).

---

## Template 27: Glossary

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Glossary                  ╭─ A – G ─╮  │
│  TERM           DEFINITION              │
│  ──────────── spectrum ───────────      │
│  AES-256        Symmetric block cipher  │
│                 with a 256-bit key …    │
│  Audit anchor   The HSM unwrap log …    │
│  Codebook       A signed envelope …     │
│  DEK            Data Encryption Key …   │
│  …                                      │
│  Grover's …     Quantum search algo …   │
│  footer                          12/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `glossary`

**Authoring contract — write a 2-level nested bullet list:**

```markdown
<!-- _class: glossary -->

## Glossary

- AES-256
  - Symmetric block cipher with a 256-bit key. The cryptographic primitive underneath FF1.
- Audit anchor
  - The HSM unwrap log. The application cannot falsify it; examiners read it directly.
- DEK
  - Data Encryption Key. 32 bytes of AES-256 key material, used in-process to tokenize.
```

The runtime transforms that into a 2-column glossary table. The author **never writes the table, the `<strong>` tags, or the alphabet pill** — all three are derived.

**What the runtime does automatically:**

| Thing | Source | Result |
|---|---|---|
| 2-column table | first top-level `<ul>` in the slide | `<table><thead>…<tbody>…` |
| Header row | injected unconditionally | `<th>Term</th><th>Definition</th>` with spectrum-gradient bottom border |
| Term auto-bold | first child of each top-level `<li>` | `<strong>AES-256</strong>` in accent color |
| Definition cell | nested `<ul><li>` under each term | second `<td>` |
| Alphabet pill in h2 | first character of first and last term | `<span class="range-pill">A – G</span>` right-aligned in h2 |
| Zebra striping | `tbody tr:nth-child(odd)` | odd rows tinted with `--bg-alt` so the first body row pairs with the header chrome |

**Three pipelines, identical output:**

| Channel | Where | When |
|---|---|---|
| `marp-cli` build | [marp.config.js](../marp.config.js) `glossaryListToTable` + `glossaryRange` | parse-time, token-level |
| LLM-env emulator | [lattice-emulator.js](../lattice-emulator.js) post-processor | render-time, HTML-string |
| VS Code Marp preview | [lattice-runtime.js](../lattice-runtime.js) MutationObserver | client-side, DOM-level |

The runtime path is what makes the live preview work — VS Code's Marp extension does not load project-local Marpit plugins, so the DOM injector is the only channel for the preview, and it must stay in lockstep with the other two.

**Layout spec:**

- `section.glossary table`: `width: 100%; border-collapse: collapse; table-layout: auto`
- `thead tr`: `background: var(--spectrum) bottom / 100% 2px no-repeat` — the header row carries the same spectrum-gradient separator used by the slide top stripe and section dividers, replacing a flat 1px border with brand chrome
- `thead th`: uppercase mono label tone (`--text-muted`, `--fs-label`, `letter-spacing: 0.08em`) — TERM and DEFINITION share identical styling; do not tint the term header
- `td:first-child` (term): `color: var(--accent); font-weight: 600; white-space: nowrap; padding-right: var(--sp-md)` — keep terms short; long terms use a hyphen for line-break safety
- `td` (definition): `padding: 6px var(--sp-sm); color: var(--text-body); border-bottom: none`
- `tbody tr:nth-child(odd)`: `background: var(--bg-alt)` — zebra rows starting on row 1 so the header reads as paired chrome
- `h2`: `display: flex; justify-content: space-between` — pill is right-aligned to the slide edge with `margin-left: auto`
- `h2 .range-pill`: `border-radius: 999px; background: var(--accent-soft); border: 1px solid var(--accent); color: var(--accent); padding: 3px 12px; font-family: var(--font-mono); font-size: var(--fs-label); letter-spacing: 0.06em` — same recipe as `.badge`, sits naturally alongside other categorical chips

**Capacity:** 12–16 short entries fit per slide at the default density. Split alphabetically (A–G, H–R, S–Z) when the list runs longer.

**When to use:** appendix glossaries, term-of-art reference for technical decks, acronym pages. Use whenever you'd reach for a 2-column table whose left side is a short noun and right side is a sentence — the nested-list authoring is faster, harder to misformat, and free-of-charge gives you the alphabet pill that orients the reader on multi-page glossaries.

**Future:** the auto-derivation pattern (`{range}` was the original placeholder, since dropped in favor of unconditional injection) generalizes to other deck-wide tokens — `{date}`, `{slide-count}`, `{deck-version}`. When a second use case lands the runtime can grow a small token table; for now glossary range is the only consumer.

---

## Template 28: Checklist

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  EYEBROW                                │
│  ## Heading line.                       │
│                                         │
│  ┃ ✓  Done item one                     │
│  ┃ ✓  Done item two                     │
│  ┃ –  Partial item — annotation         │
│  │ ☐  Pending item                      │
│  │ ☐  Pending item — annotation         │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

**CSS class:** `checklist`

**Marp directive:**

```markdown
<!-- _class: checklist -->
```

- Vertical list of state-marked rows. Each item is one line: a state glyph (✓ / – / ☐) in the leading column, the label in the body column.
- States authored as a leading marker on each item — see [State Convention](#state-convention) for the full mapping:
  - `[x]` → done (✓, `--pass` green, soft pass tint, pass-coloured left bar)
  - `[-]` → partial (–, `--warn` amber, soft warn tint, warn-coloured left bar)
  - `[ ]` → todo (☐, `--fail` red, soft fail tint, fail-coloured left bar)
- Optional trailing inline `` `code` `` on any item floats right as a **status pill** — same convention used by `cards-grid`, `cards-side`, and `actors`. See [Trailing `code` → row pill](#trailing-code--row-pill) below.
- Optional `_em italic_` tail renders inline as a muted annotation in the same line.
- Rows space evenly to fill the slide height; standard density holds 5–8 items comfortably.

**Authoring contract — flat bullet list, one item per row:**

```markdown
<!-- _class: checklist -->

`Phase 1 · Acceptance review`

## What shipped, what slipped, what stayed open.

- [x] Codebook signing live across all production tenants
- [x] HSM-anchored audit trail readable by Examiner role
- [x] One reference client integrated end-to-end
- [-] TTL refresh under cold-start load — _open, see slide 27_
- [ ] Multi-tenant codebook operation — _Phase 2_
- [ ] Crypto-shred runbook hand-off to Platform — _Phase 2_
```

**How the renderer maps this:** A Marpit plugin (`checklistItemStates` in [marp.config.js](../../marp.config.js)) walks each top-level `<li>` whose text begins with `[x]`, `[-]`, or `[ ]`, strips the marker, and adds `class="state pass|warn|fail"` to the `<li>`. CSS draws the glyph as a `::before` pseudo-element. The same transformation runs in `lattice-emulator.js` (build pipeline) and `lattice-runtime.js` (VS Code preview) so the three channels stay in sync.

**State palette:** Reuses the `--pass` / `--warn` / `--fail` tokens (and their `*-bg` soft fills) that both themes ship at WCAG AA on body backgrounds. See the [State Convention](#state-convention) section for the canonical mapping shared with `verdict-grid`.

#### Trailing `code` → row pill

A trailing inline `` `code` `` on any row floats right as a small mono-font pill — the same universal pill convention used by `cards-grid`, `cards-side`, and `actors` (a `code` immediately following the card title becomes a header badge there). Authors do not learn anything new; the only rule is *put the metadata in backticks at the end of the row*.

```markdown
- [x] Codebook signing live across production `shipped 2026-Q1`
- [-] Cold-start TTL refresh under burst load `owner: platform`
- [ ] Multi-tenant codebook authoring `Phase 2`
```

**Visual recipe:** identical to the cards-grid badge — `--fs-label`, `font-weight:600`, `border-radius:999px`, `border-color:var(--text-muted)`, neutral background. Pure CSS, no plugin work — the rendered `<code>` element gets `margin-left:auto` to anchor right, and the universal pill paint is applied.

**Theming hooks:** the universal rule reads three custom properties — `--pill-border`, `--pill-bg`, `--pill-fg` — each falling back to the default neutral recipe. A layout (or a single slide via `style="--pill-border:var(--accent)"`) can recolor pills without restating the chrome. The `actors` layout already uses this hook to assign per-row accent colors.

**Where it applies:** the universal rule fires on `cards-grid`, `cards-side`, `actors`, `checklist`, and any future layout whose `> li` is `display:flex`. Layouts that partition the row with grid/scaffold (`list`, `list-criteria`, `list-tabular`, `cards-stack`, `cards-wide`) are explicitly excluded — `margin-left:auto` cannot right-anchor inside a grid track. To opt in, those layouts need a small per-layout placement override modeled on the `actors` rule (`grid-column`, `justify-self`, `align-self`); the chrome inherits for free.

**Long-text policy:** the pill stays on one line (`white-space:nowrap`, matching cards-grid). If the metadata phrase is too long to fit, **it is too long for the pill recipe** — push it back into the row body, or add a below paragraph for context. The pill is a tag, not a card.

**Risks worth naming:**

- **Pill abuse as second body.** Authors are tempted to write a full clause inside backticks once pills look pretty. *Pill text is a short status phrase — target under ~25 characters.* If you need a sentence, write it in the row body.
- **Mid-row code styled as a pill.** The CSS targets `> li > code` (any direct child), so an inline `` `code` `` snippet mid-row will also float right as a pill — it cannot tell the difference between *trailing metadata* and *mid-sentence reference to an identifier*. Authoring guidance: keep code references in the row body to a minimum, and reserve trailing backticks for status metadata. (This is the same trade-off cards-grid makes.)
- **Pill on a `[x]` row.** Allowed, so the rule is uniform — but editorially, *done is done*: a passed row rarely needs a follow-up tag. Reserve pills for `[-]` and `[ ]` rows where there's actual outstanding metadata.
- **Locale length drift.** Translated decks (EN → DE, EN → FI) can run 30–50 % longer; nowrap pills will overflow visibly. Authors translating a checklist deck should reshorten pill text in the target locale.

**When to use:** acceptance reviews, retro snapshots, "what shipped vs what slipped" summaries — any slide where the editorial point is *the mix of states*, not the body text behind each row. If items need a sentence of body context, reach for `verdict-grid` or `list-criteria` instead. If items are equal-weight bullets without state, use `tldr` or `list`.

---

## Template 29: Chart Family (`progress`, `timeline-list`, `piechart`, `gantt`, `kanban`)

A small family of list-and-pill chart layouts that share one **chart-frame** skeleton: a lucent header strip with eyebrow + h2 + subtitle, a dominant chart body, and an optional caption. Authors write a flat list with trailing inline `` `code` `` pills; the renderer rewrites the section into chart-specific markup at build time (`lattice-emulator.js`) and at preview time (`lattice-runtime.js`).

**Modifiers shared by all three layouts:**

- `dark` — dark canvas; status colours hold their AA contrast.
- `minimal` — quieter chrome (no lucent strip; an accent hairline replaces it).

**Status pill vocabulary** (used by `progress` row tints and as trailing pills in `timeline-list`):

| Token       | Reads as                       |
|-------------|---------------------------------|
| `on-track`  | green / `--pass`                |
| `done`      | green / `--pass`                |
| `live`      | green / `--pass`                |
| `at-risk`   | amber / `--warn`                |
| `warn`      | amber / `--warn`                |
| `pilot`     | amber / `--warn`                |
| `blocked`   | red / `--fail`                  |
| `fail`      | red / `--fail`                  |
| `decision`  | accent / theme accent           |
| `deferred`  | muted / `--text-muted`          |

### 29a — `progress` (horizontal bars with status pills)

```text
┌─────────────────────────────────────────┐
│  EYEBROW · BAR EYEBROW                  │
│  ## Phase readiness, by workstream.     │
│  Subtitle line — optional context.      │
│                                         │
│  Codebook platform   ████████▌  92%  ●  │
│  Operations runbook  █████▌     68%  ●  │
│  Compliance audit    ███████▌   81%  ●  │
│  SDK polyglot parity ███▌       34%  ●  │
│  Dependency dashbd.  █          12%  ●  │
│                                         │
│  Source · refreshed 2026-05-07          │
└─────────────────────────────────────────┘
```

**CSS class:** `progress` (composes with `dark`, `minimal`)

**Marp directive:**

```markdown
<!-- _class: progress -->
```

- One row per top-level `<li>`. Each row carries a label, a track (filled to `--pct` of its width), a numeric readout, and an optional status pill that tints the bar fill.
- Trailing inline `` `code` `` pills on each item: **first** is the percentage (`92%`), **second** (optional) is the status token (`on-track`, `at-risk`, etc.).
- Rows share a fixed grid template so all bar tracks come out the exact same length; the percentage column is left-aligned and the pill column is right-aligned.

**Authoring contract:**

```markdown
<!-- _class: progress -->

`H1 2026 · Phase 1 readiness`

## Phase 1 readiness, by workstream.

Snapshot taken at 14:00 UTC. Status pills tint the bar fill.

- Codebook platform `92%` `on-track`
- Operations runbook `68%` `at-risk`
- Compliance audit pack `81%` `on-track`
- SDK polyglot parity `34%` `deferred`
- Dependency dashboard `12%` `blocked`

_Source: Linear · refreshed 2026-05-07_
```

### 29b — `timeline-list` (horizontal spine with date pills)

```text
┌─────────────────────────────────────────┐
│  EYEBROW · CODEBOOK ARCHITECTURE        │
│  ## How the architecture arrived.       │
│  Subtitle — optional context.           │
│                                         │
│  ──●─────●─────●─────●──                │
│   ▢2024 ▢2025 ▢2025 ▢2026               │
│   Q3    Q1    Q3    Q1                  │
│   Vault Codeb Pilot Prod                │
│         (decn)(pilot)(live)             │
│   body  body  body   body               │
│                                         │
│  Caption — Cross-functional sign-off    │
└─────────────────────────────────────────┘
```

**CSS class:** `timeline-list` (composes with `dark`, `minimal`)

**Marp directive:**

```markdown
<!-- _class: timeline-list -->
```

- Ordered list (`<ol>`) — each `<li>` becomes a node on a horizontal spine.
- **Leading** inline `` `code` `` is the date pill (renders above the dot).
- **Trailing** inline `` `code` `` (optional) is the status pill (uses the same vocabulary as `progress`).
- Optional nested bullet under each item becomes the body text below the title.

**Authoring contract:**

```markdown
<!-- _class: timeline-list -->

`Codebook architecture`

## How the codebook architecture arrived in production.

Four stages over eighteen months. Date pill leads each item; status pill trails.

1. `2024 Q3` Vault round-trip
   - First production tokenization shipped on a centralised vault. p99 60 ms.
2. `2025 Q1` Codebook proposal `decision`
   - Architecture review accepts the in-process model.
3. `2025 Q3` Pilot `pilot`
   - One internal team, one workload, one quarter.
4. `2026 Q1` Production `live`
   - Codebook signing live across all production tenants.
```

### 29c — `piechart` (SVG pie/donut with legend)

```text
┌─────────────────────────────────────────┐
│  EYEBROW · 1,840 PERSON-HOURS           │
│  ## Where the engineering quarter went. │
│  Subtitle — optional context.           │
│                                         │
│      ╭───╮     ▣ Codebook plat.   46%   │
│     ╱     ╲    ▣ Operations rb.   22%   │
│    │   ◯   │   ▣ Compliance       18%   │
│     ╲     ╱    ▣ Pilot support     9%   │
│      ╰───╯     ▣ Toil and on-call  5%   │
│                                         │
│  Caption — Refreshed weekly             │
└─────────────────────────────────────────┘
```

**CSS class:** `piechart` (composes with `donut`, `dark`, `minimal`)

**Marp directives:**

```markdown
<!-- _class: piechart donut -->   <!-- ring with hollow centre -->
<!-- _class: piechart -->         <!-- solid wedges -->
```

- Flat bullet list with one trailing inline `` `code` `` per item carrying the magnitude (`46%`, `22%`, … or raw counts like `8`, `5`).
- Wedges are drawn proportionally; the legend reads in author order with the raw values.
- Wedge colours come from a fixed eight-colour categorical palette (`--cat-blue`, `--cat-green`, …) cycled in source order.

**Authoring contract:**

```markdown
<!-- _class: piechart donut -->

`H1 2026 · 1,840 person-hours`

## Where the engineering quarter went.

Wedges drawn proportionally; legend reads in author order with raw values.

- Codebook platform `46%`
- Operations runbook `22%`
- Compliance work `18%`
- Pilot support `9%`
- Toil and on-call `5%`

_Refreshed weekly · last updated 2026-05-07_
```

### 29d — `gantt` (categorical bar chart across a time axis)

```text
┌─────────────────────────────────────────┐
│  EYEBROW · 2026 Q1 → 2026 Q4           │
│  ## What ships in each phase.           │
│  Three workstreams across four qtrs.   │
│                                         │
│        Q1      Q2      Q3      Q4       │
│  Plat  ████████                         │
│                ████████                 │
│                        ████████         │
│  Ops   ████████                         │
│                ████████                 │
│                        ░░░░░░░░         │
│  Comp  ████████                         │
│                ████████                 │
│                        ░░░░░░░░         │
│                                         │
│  Product roadmap · 2026-05-07           │
└─────────────────────────────────────────┘
```

**CSS class:** `gantt` (composes with `dark`, `minimal`)

- Top-level bullets are **swimlanes** (rows). Each swimlane label becomes a row header on the left.
- Second-level bullets are **bars**. Bar text is the label rendered inside the bar. Two trailing inline codes are required: `start → end` (tick range) then an optional status pill.
- The tick axis is inferred from all `start` and `end` values across the slide. Short month names (`Jan`–`Dec`) and quarter shorthands (`Q1`–`Q4`) are both recognised.

**Authoring contract:**

```markdown
<!-- _class: gantt -->

`2026 Q1 → 2026 Q4`

## What ships in each phase, by workstream.

Three workstreams across four quarters.

- Platform
  - Codebook signing `Q1 → Q2` `done`
  - Multi-tenant DEKs `Q2 → Q3` `live`
  - Per-purpose codebooks `Q3 → Q4` `at-risk`
- Operations
  - Manual rotation `Q1 → Q2` `done`
  - Automated rotation `Q2 → Q3` `live`
  - Crypto-shred `Q3 → Q4`
- Compliance
  - Audit trail `Q1 → Q2` `done`
  - Centralised log `Q2 → Q3`
  - Examiner pack `Q3 → Q4`

_Product roadmap · committed baseline · 2026-05-07_
```

- The eyebrow (`\`2026 Q1 → 2026 Q4\``) is a human label only — the axis is built from the bar tick codes, not from it.
- Bars without a status pill render in the neutral track colour.
- Status pill colours match the shared vocabulary table above.

---

### 29e — `kanban` (board from a three-level list)

```text
┌─────────────────────────────────────────┐
│  EYEBROW · PHASE 2 · SPRINT 14         │
│  ## Where Phase 2 work stands today.   │
│  Four columns, mixed card density.     │
│                                         │
│  Backlog   In progress  Review  Done░░  │
│  ┌───────┐ ┌─────────┐ ┌─────┐ ┌─────┐ │
│  │Title M│ │Title  M │ │Titl │ │Titl │ │
│  │compl  │ │plat✗risk│ │ plat│ │plat │ │
│  ├───────┤ ├─────────┤ └─────┘ │  ✓  │ │
│  │Title S│ │Title  L │         └─────┘ │
│  │platfrm│ │complianc│                 │
│  └───────┘ └─────────┘                 │
└─────────────────────────────────────────┘
```

**CSS class:** `kanban` (composes with `dark`, `minimal`)

- **Top-level bullet** = column header.
- **Second-level bullet** = card. One optional trailing inline code is the **size badge** (`S` / `M` / `L` / `XL`), rendered as a square chip right-aligned in the title row.
- **First sub-bullet of a card** = meta line. Prose is the **label** (drives the coloured left stripe and a tinted lane pill on the meta row). One optional trailing inline code is the **status** (shared vocabulary — pushes right via `margin-left: auto`).
- **Second sub-bullet of a card** (optional) = **body text**, rendered italic and muted below the meta row, single line with ellipsis.
- The `Done` column dims automatically (`opacity: 0.52`).

**Card anatomy:**

```text
┌─────────────────────────────────┐
│ ▌ (3px left border — lane col.) │
│ Title text, up to 2 lines  [ M ]│  ← title row: text + size badge
│ [compliance]          [at-risk] │  ← meta row: label left, status right
│ Body text, one line, italic…    │  ← optional body
└─────────────────────────────────┘
```

**Authoring contract:**

```markdown
<!-- _class: kanban -->

`Phase 2 · Sprint 14`

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

Card with body text (third sub-bullet):

```markdown
  - External audit firm `M`
    - compliance `blocked`
    - Firm selection paused pending legal sign-off. Resuming W20.
```

**Rules:**

- One inline code per line. Size on the card title line; status on the label line. Never two codes on the same line.
- All three sub-levels are optional. A card with no sub-bullet gets no meta row.
- Label text (the prose on the first sub-bullet) drives the lane colour. Labels are free-form; the renderer maps them to categorical palette slots (`--cat-blue`, `--cat-green`, `--cat-purple`, …) consistently within a slide.
- Status tokens are a closed set — see the vocabulary table above.

---

### Shared frame (`chart-frame`)

The renderer wraps every chart-family slide in this skeleton:

```text
section.<layout>.chart-frame
├── div.chart-header
│   ├── p.chart-eyebrow > code      (the leading single-code paragraph)
│   ├── h2                          (the slide heading)
│   └── p.chart-subtitle            (optional: first <p> after h2)
├── div.chart-body
│   └── (chart-specific markup: progress-bars / timeline-spine / piechart-figure)
└── p.chart-caption                 (optional: trailing italic <p> after the list)
```

**How the renderer maps this:** Both `lattice-emulator.js` (build) and `lattice-runtime.js` (VS Code preview) walk every `section.progress | section.timeline-list | section.piechart`, extract the eyebrow / subtitle / caption, rewrite the list as the chart-specific markup, then add the `chart-frame` class. Both transforms are idempotent — re-running over an already-transformed section is a no-op.

**Risks worth naming:**

- **Eyebrow contract is strict.** The leading `<p>` is only treated as the eyebrow when it contains exactly one `<code>` and no other text. `` Phase 1 · `H1 2026` `` does *not* lift to the eyebrow strip — keep it as a single backticked phrase.
- **`donut` only composes with `piechart`.** Adding `donut` to `progress` or `timeline-list` is silently ignored.
- **Status pill words are a closed set.** Tokens outside the table above render with no colour — add the value to the vocabulary in `lattice.css` before using it.

**When to use:** progress slides for end-of-quarter readiness or capacity claims; `timeline-list` for shipping milestones over weeks–years; `piechart` for an allocation snapshot where the editorial point is *proportion*. If the data is more than one chart's worth, split across slides — the chart-frame is one chart per page.

---

## Dark Modifier

**Applies to any layout class.** Add `dark` alongside the layout class to switch the slide to a dark palette using the theme's dark color tokens.

**Marp directive:**
```markdown
<!-- _class: content dark -->
<!-- _class: list dark -->
<!-- _class: divider dark -->
<!-- _class: image full dark -->
```

- Retokens: `--bg`, `--bg-alt`, `--border`, `--text-*` all switch to `var(--dark-*)` values
- Spectrum bar changes: instead of a 4px solid top border, dark slides render a 1px spectrum line as a CSS `background` at the top
- Use for mid-deck emphasis slides, impactful data reveals, or transitional moments
- Gallery uses: `content dark`, `list dark`, `cards-stack dark`, `divider dark`, `image full contain dark`

---

## Template 30: Split Brief

```text
┌─────────────────────────────────────────┐
│ ┌──────────────┬──────────────────────┐ │
│ │ EYEBROW      │  • Lead point        │ │
│ │              │    Body detail.      │ │
│ │ ## Heading.  │                      │ │
│ │              │  • Lead point        │ │
│ │ Intro para.  │    Body detail.      │ │
│ │              │                      │ │
│ │  [dark]      │  • Lead point        │ │
│ │              │    Body detail.      │ │
│ └──────────────┴──────────────────────┘ │
└─────────────────────────────────────────┘
```

**CSS class:** `split-brief`

**Marp directive:**

```markdown
<!-- _class: split-brief -->
```

- Left panel (38%, dark): eyebrow label, `h2` heading, intro paragraph
- Right panel (62%, light): 2–4 list items, each with a lead label (auto-bolded) and one sub-bullet body
- Accent `border-left` on each top-level item; items distribute with `space-evenly`
- SlotLabelLift auto-bolds the first line of each top-level `li` — do not write explicit `**bold**`
- Sub-items use native list markers (`ul` → disc, `ol` → decimal)

**Authoring contract:**

```markdown
<!-- _class: split-brief -->

`Q2 Performance Review`

## Enterprise revenue stalled in Q2.

Three structural factors explain 90% of the shortfall.

- Renewal pricing complexity is driving churn at the segment ceiling
  - Four accounts totaling $2.1M ARR declined renewal. Win/loss interviews point to a quote-to-contract gap.
- Pipeline conversion dropped 11 pp below Q1 — legal review is the chokepoint
  - Contract length increased 18 days on average.
- Competitive displacement accelerated in the $80–200K ACV tier
  - Seven losses to a single competitor. Time-to-value gap is the exposure.
```

---

## Template 31: Split Metric

```text
┌─────────────────────────────────────────┐
│ ┌──────────────┬──────────────────────┐ │
│ │ UNIT LABEL   │  • Lead point        │ │
│ │              │    Body detail.      │ │
│ │ ## 114%      │                      │ │
│ │              │  • Lead point        │ │
│ │ Context      │    Body detail.      │ │
│ │ sentence.    │                      │ │
│ │  [light]     │  • Lead point        │ │
│ │              │    Body detail.      │ │
│ └──────────────┴──────────────────────┘ │
└─────────────────────────────────────────┘
```

**CSS class:** `split-metric`

**Marp directive:**

```markdown
<!-- _class: split-metric -->
```

- Left panel (44%, light): unit label, `h2` metric value, context sentence
- Right panel (56%, dark): 2–4 list items with lead label + body sub-bullet
- `h2` renders in display font at hero size; wrap a suffix in `*em*` for a smaller muted suffix (e.g. `## 114*%*`)
- SlotLabelLift auto-bolds lead lines; sub-items use native list markers
- Items distribute with `space-evenly`

**Authoring contract:**

```markdown
<!-- _class: split-metric -->

`Net Revenue Retention`

## 114*%*

Measured across all customers active for 12+ months.

- Existing customers are growing faster than we lose them
  - At 114%, every churned dollar is offset by $1.14 in expansion.
- Expansion is concentrated — three segments drive 80% of the gain
  - Enterprise accounts in the 201–500 seat range upgrade at twice the SMB rate.
- Sustained above 110%, this unlocks a capital-efficient growth path
  - NRR above 110% meets the investor threshold for venture-category efficiency.
```

---

## Template 32: Split Steps

```text
┌─────────────────────────────────────────┐
│ ┌──────────────┬──────────────────────┐ │
│ │ 02  [corner] │  ① Step label        │ │
│ │              │    Body detail.      │ │
│ │ ## Phase.    │  ② Step label        │ │
│ │              │    Body detail.      │ │
│ │ Intro para.  │  ③ Step label        │ │
│ │              │    Body detail.      │ │
│ │  [alt]       │  ④ Step label        │ │
│ │              │    Body detail.      │ │
│ └──────────────┴──────────────────────┘ │
└─────────────────────────────────────────┘
```

**CSS class:** `split-steps`

**Marp directive:**

```markdown
<!-- _class: split-steps -->
```

- Left panel (30%, `--bg-alt`): phase number as decorative corner watermark, `h2` heading, intro paragraph
- Right panel (70%, light): step list with connecting timeline spine between items
- **`ol`** → numbered accent circles (40px); **`ul`** → filled accent circles without numbers
- SlotLabelLift auto-bolds each step label; nested `ul`/`ol` sub-items use native markers

**Authoring contract:**

```markdown
<!-- _class: split-steps -->

`02`

## Discovery & Scoping

Four weeks. Shared definition of the problem before solution work begins.

1. Stakeholder Interviews
   - Eight cross-functional conversations. Open questions only.
2. Current-State Audit
   - System inventory, workflow documentation, and data quality review.
3. Problem Framing Workshop
   - Half-day session to align on root cause.
4. Scope Confirmation
   - Written sign-off on what is in, what is out.
```

---

## Template 33: Split Compare

```text
┌─────────────────────────────────────────┐
│ ┌──────────────┬──────────────────────┐ │
│ │ FRAME LABEL  │ ┌────────┬────────┐  │ │
│ │              │ │OPTION  │OPTION ✦│  │ │
│ │ ## Question? │ │────────│────────│  │ │
│ │              │ │• point │• point │  │ │
│ │ Framing      │ │• point │• point │  │ │
│ │ sentence.    │ └────────┴────────┘  │ │
│ │  [dark]      │ ▓ Recommendation ▓   │ │
│ └──────────────┴──────────────────────┘ │
└─────────────────────────────────────────┘
```

**CSS class:** `split-compare`

**Marp directive:**

```markdown
<!-- _class: split-compare -->
```

- Left panel (30%, dark): frame label, `h2` question, framing paragraph
- Right panel (70%, light): two option cards in a 2-column grid + optional verdict strip
- **First** top-level list item → left option; **second** → right option (automatically preferred: accent label + `✦` corner marker)
- SlotLabelLift auto-bolds the option label (first line of each top-level `li`)
- Sub-items under each option are the option's bullet points; `ul` → bullets, `ol` → numbers
- Verdict: optional `> blockquote` after the list; renders as an accent-background recommendation strip

**Authoring contract:**

```markdown
<!-- _class: split-compare -->

`Decision Required`

## Build the data layer or buy it?

Both paths are viable. The difference is where we spend the next 18 months.

- Build in-house
  - Full control over schema and roadmap
  - 2–3 engineer-quarters to reach feature parity
- Buy + configure
  - Ship in 6 weeks, not 9 months
  - Engineering capacity redirects to product-layer features

> Buy the infrastructure. Build the differentiation. Revisit in 24 months.
```

---

## Template 34: Split Statement

```text
┌─────────────────────────────────────────┐
│ ┌──────────────────┬──────────────────┐ │
│ │ "                │  • Lead point    │ │
│ │                  │    Body detail.  │ │
│ │  Pull quote      │                  │ │
│ │  spanning        │  • Lead point    │ │
│ │  lines."         │    Body detail.  │ │
│ │                  │                  │ │
│ │  — Attribution   │  • Lead point    │ │
│ │  [dark]          │    Body detail.  │ │
│ └──────────────────┴──────────────────┘ │
└─────────────────────────────────────────┘
```

**CSS class:** `split-statement`

**Marp directive:**

```markdown
<!-- _class: split-statement -->
```

- Left panel (50%, dark): blockquote pull quote + citation; decorative oversized `"` watermark
- Right panel (50%, light): 2–4 list items with lead label + body sub-bullet
- Blockquote: `> text` — renders in display italic at `--fs-xl`
- Citation: `` `Author · Role, Company, Year` `` — renders as `<cite>` in muted body type
- SlotLabelLift auto-bolds lead lines; sub-items use native list markers
- Items distribute with `space-evenly`

**Authoring contract:**

```markdown
<!-- _class: split-statement -->

> The best product does not win. The most understood product does.

`Morgan Chase · Head of Product, Vercel, 2024`

- Clarity is a product decision, not a marketing one
  - If a prospect cannot articulate our value in one sentence, it is a communication architecture problem.
- Onboarding is the product's first argument for itself
  - The moment a user first succeeds defines their frame for everything that follows.
- Understanding, not delight, is the retention driver at scale
  - Users who understand the system's logic stay through friction.
```

---
