# Part 4: Layout Templates

All layouts are 1280×720 (16:9). Slide padding: 48-64px. Usable content area: approximately 1160×600.

26 templates plus 3 documented variants. CSS class names shown in `monospace` — use directly in `<!-- _class: name -->` directives.

## Layout Inventory: Structured vs Unstructured

Every layout falls into one of two categories. The distinction matters because it changes what the source markdown looks like and where bugs are most likely to live.

**Structured layouts** are post-processed by `lattice.js`: a flat `ul`/`ol` (sometimes with nested children) is rewritten into purpose-built DOM (`.card`, `.stat-item`, `.vcard`, `.feat-card`, `.compare-prose-inner`, `.panel-left`/`.panel-right`, etc.). The CSS targets that generated structure. Authors write a list; the post-processor turns it into the layout.

**Unstructured layouts** are rendered by CSS alone from the semantic markdown that Marp emits. No DOM rewriting happens — the headings, paragraphs, and lists you write are the headings, paragraphs, and lists the CSS styles.

| Category     | Class                                                                                                                                           | Post-processor                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Structured   | `cards-grid`, `cards-side`, `cards-stack`, `cards-wide`, `compare-prose`, `compare-code`, `featured`, `list-criteria`, `list-tabular`, `split-panel`, `stats`, `verdict-grid` | yes — `lattice.js` rewrites DOM |
| Unstructured | `title`, `divider`, `subtopic`, `closing`, `content`, `diagram`, `quote`, `list`, `list-steps`, `timeline`, `big-number`, `image`, `image left`, `image-full`, `code`         | no — CSS-only                   |

Modifiers (`dark`, image variants like `image left`, etc.) compose with both categories.

**Authoring implication:** every structured layout has a single canonical list shape documented in its template entry. Deviating from that shape (wrong list type, wrong nesting depth, missing `**Title.**` marker, etc.) causes the post-processor to fall back to the raw list rendering, which the CSS does not style. When a structured slide looks wrong, check the source list shape first.

**Audit implication:** structured layouts are where `lattice.js` and `marp-cli` are most likely to diverge — see [audit.md §11.4](./audit.md#114-comparison-workflow).

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
| Text           | T4 Content, T12 Quote, T14 List, T20 Criteria           | `content` `quote` `list` `list-criteria`            |
| Text variant   | T14v Tabular Inline                                     | `list-tabular`                                 |
| Data           | T5 Diagram, T6 Stats, T16 Big Number, T22 Compare Table | `diagram` `stats` `big-number` `compare-table` |
| Cards          | T7 Grid 2×2, T8 Grid 2+1, T9 Stacked, T10 Side-by-Side  | `cards-grid` `cards-stack` `cards-side`       |
| Cards cont.    | T19 Three-Row Wide, T21 Verdict Grid                    | `cards-wide` `verdict-grid`                  |
| Comparative    | T11 Comparison, T23 Featured                            | `compare-prose` `featured`                        |
| Layout         | T13 Timeline, T17 Split Panel                           | `timeline` `split-panel`          |
| Layout variant | T13v Step Cards                                         | `list-steps`                                        |
| Visual         | T15 Image Full                                          | `image-full`                                   |

## Modifiers

Modifiers are class flags that compose with any layout. They encode **authorial intent** — density, emphasis, orientation — rather than cosmetic switches. Every modifier is opt-in and additive: an existing slide's rendering never changes until an author adds the modifier to its `_class` directive.

**Composition syntax:** layout first, then modifiers, space-separated:

```markdown
<!-- _class: cards-grid compact dark -->
<!-- _class: closing accent -->
<!-- _class: list-steps phase -->
```

**Cascade rule:** when two modifiers tune the same variable (e.g. `compact loose`), the last one in the source wins. When modifiers tune disjoint properties (e.g. `compact dark`), they compose without conflict.

**Reference:** [proposals.md §2 (modifier catalogue)](./proposals.md) and the appendix matrix at the end of that file enumerate which modifiers attach to which layouts.

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

## Template 1: Title (dark bookend)

```
┌───────────────────────────────────────┐
│            [dark background]          │
│                                       │
│          EYEBROW LABEL                │
│                                       │
│       Display Title Here              │
│       ─────── (accent line)           │
│       Subtitle or tagline             │
│                                       │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│            [dark or accent bg]        │
│                                       │
│    ┌──────┐                           │
│    │  01  │   SECTION LABEL           │
│    └──────┘                           │
│              Section Title            │
│              ───────                  │
│                                       │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│                                       │
│          CATEGORY LABEL               │
│          Topic Title                  │
│                                       │
│          Brief orienting sentence     │
│          about what follows.          │
│                                       │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│                                       │
│  LABEL                                │
│  Slide Heading                        │
│                                       │
│  Body paragraph text here. Can be     │
│  2-3 sentences maximum. Keep it       │
│  focused on one idea.                 │
│                                       │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│           LABEL                       │
│         Diagram Title                 │
│         subtitle text                 │
│  ┌──────────────────────────────┐     │
│  │                              │     │
│  │      [diagram SVG/PNG]       │     │
│  │                              │     │
│  └──────────────────────────────┘     │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│             LABEL                     │
│           Stats Title                 │
│           description                 │
│                                       │
│      42       5       4       6       │
│    TOTAL   SHAPES  CLASSES  WIDE      │
│                                       │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│             LABEL                     │
│           Grid Title                  │
│                                       │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Card Title 1 │  │ Card Title 2 │   │
│  │ content      │  │ content      │   │
│  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Card Title 3 │  │ Card Title 4 │   │
│  │ content      │  │ content      │   │
│  └──────────────┘  └──────────────┘   │
│  footer                          1/19 │
└───────────────────────────────────────┘
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
- **Numbered cards** (`ol` source): flush top-left corner badge — accent background, white mono number, `--radius-md 0 --radius-sm 0` corners; card `padding-top` is automatically increased to clear the badge
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

```
┌───────────────────────────────────────┐
│  header                               │
│             LABEL                     │
│           Grid Title                  │
│                                       │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Card Title 1 │  │ Card Title 2 │   │
│  │ content      │  │ content      │   │
│  └──────────────┘  └──────────────┘   │
│  ┌─────────────────────────────────┐  │
│  │ Card Title 3 (full width)       │  │
│  │ content stretches across        │  │
│  └─────────────────────────────────┘  │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│             LABEL                     │
│           Slide Title                 │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │ Card Title 1                    │  │
│  │ content stretches full width    │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Card Title 2                    │  │
│  │ content stretches full width    │  │
│  └─────────────────────────────────┘  │
│  footer                          1/19 │
└───────────────────────────────────────┘
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
- Two full-width cards stacked vertically
- 16px gap between cards
- Each card takes roughly equal vertical space
- Sequential relationship: top leads to bottom
- Good for problem/solution, setup/payoff, context/detail

## Template 10: Two Cards Side-by-Side (horizontal)

```
┌───────────────────────────────────────┐
│  header                               │
│             LABEL                     │
│           Slide Title                 │
│                                       │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Card Title 1 │  │ Card Title 2 │   │
│  │              │  │              │   │
│  │ content      │  │ content      │   │
│  │              │  │              │   │
│  └──────────────┘  └──────────────┘   │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│             LABEL                     │
│         Comparison Title              │
│                                       │
│  ┌──────────────┐     ┌──────────────┐│
│  │ Before /     │  →  │ After /      ││
│  │ Option A     │     │ Option B     ││
│  │              │     │              ││
│  └──────────────┘     └──────────────┘│
│                                       │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

## Template 12: Quote / Testimonial

```
┌───────────────────────────────────────┐
│  header                               │
│                                       │
│                                       │
│       "Quote text goes here in        │
│        italic display font,           │
│        centered on the slide."        │
│                                       │
│              — Attribution            │
│                                       │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│             LABEL                     │
│          Process Title                │
│                                       │
│     ●──────●──────●──────●            │
│   Step 1  Step 2  Step 3  Step 4      │
│   desc    desc    desc    desc        │
│                                       │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│                                       │
│  LABEL                                │
│  List Heading                         │
│                                       │
│  •  First point clearly stated        │
│  •  Second point with enough room     │
│  •  Third point, well spaced          │
│  •  Fourth point if needed            │
│                                       │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

## Template 15: Image Full

One class, two authoring modes — caption is optional.

### Without caption

```
┌───────────────────────────────────────┐
│                header                 │
│             [image-full]              │
│                                       │
│                                       │
│                                       │
└───────────────────────────────────────┘
```

### With caption

```

┌───────────────────────────────────────┐
│                header                 │
│             [image-full]              │
│                                       │
│  ┌─ caption text ──────────────────┐  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

**CSS class:** `image-full`

**Without caption:**

```markdown
<!-- _class: image-full -->
<!-- _paginate: false -->

## [ Placeholder text shown in draft mode ]
```

**With caption:**

```markdown
<!-- _class: image-full -->
<!-- _paginate: false -->

## [ Placeholder text shown in draft mode ]

Caption text that appears as an overlay bar at the bottom.
```

- Caption bar is controlled by a trailing paragraph — include it or omit it
- The `## heading` text is the draft placeholder; replaced by the real image at `![bg](url)`
- `footer` is hidden — use the trailing paragraph for attribution instead
- Use for product screenshots, reference images, full-canvas visuals

## Template 16: Big Number / Single Stat

```
┌───────────────────────────────────────┐
│  header                               │
│                                       │
│                                       │
│              LABEL                    │
│                                       │
│              247                      │
│                                       │
│         description text              │
│         below the number              │
│                                       │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│ header                                │
│ ┌──────────┐                          │
│ │ EYEBROW  │  SECTION HEADING         │
│ │          │                          │
│ │ [accent  │  ┌──────────────────┐    │
│ │  panel]  │  │ Card Title 1     │    │
│ │          │  │ body text        │    │
│ │          │  └──────────────────┘    │
│ │ Panel    │  ┌──────────────────┐    │
│ │ Title    │  │ Card Title 2     │    │
│ └──────────┘  │ body text        │    │
│               └──────────────────┘    │
│              footer              1/19 │
└───────────────────────────────────────┘
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
- Supports both `ul` (no badge) and `ol` (flush top-left corner badge)
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
- `ol > li` = stacked card tiles with flush corner badge; `ul > li` = stacked card tiles without badge
- **Optional metadata footer** = a trailing `ul` placed *after* the main `ol`/`ul`. Renders pinned to the bottom of the right panel with a divider line above. Authored as `**Label** · body` items — typical use: audience, intent, scope, or other framing labels. Absent → panel renders as before.

## Template 18: Closing (dark bookend)

```
┌───────────────────────────────────────┐
│            [dark background]          │
│                                       │
│                                       │
│          BRAND / LABEL                │
│          ─────── (accent line)        │
│                                       │
│       Closing statement or            │
│       call to action in italic        │
│                                       │
│                                       │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL · CONTEXT                      │
│  Slide heading goes here.             │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │ [1]  Card Heading One           │  │
│  │       body text for this card.  │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ [2]  Card Heading Two           │  │
│  │       body text for this card.  │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ [3]  Card Heading Three         │  │
│  │       body text for this card.  │  │
│  └─────────────────────────────────┘  │
│  footer                          6/19 │
└───────────────────────────────────────┘
```

**CSS class:** `cards-wide`

**Layout spec:**

- `section.cards-wide`: flex column, 48px 64px padding
- Cards container: `display: flex; flex-direction: column; gap: 12px; flex: 1`
- Each card: `flex: 1; background: var(--bg-alt); border: 1px solid var(--border); border-radius: --radius-md; padding: --sp-sm --sp-md; display: flex; flex-direction: column; gap: --sp-xs`
- Card header row: `**Title**` (`strong`) displayed with inline numbered badge before it
  - Badge: `content: counter(wide-counter)` — mono pill, 16px, accent background, white text
  - Title: 16px (`--fs-body`) bold, `--text-heading`
- Card body (`ul > li`): 15px (`--fs-sm`), `--text-body`, full width
- Note: `**...**` is required for `cards-wide` — the CSS uses `li > strong` for the header and `strong::before` for the badge

**Marp markdown source:**

```markdown
<!-- _class: cards-wide -->

## Three scoring failure modes found in the pilot.

1. **Recency dominance**
   - High-recency noise crowding out durable signal. Teams set recency weight above 50% without empirical backing.
2. **Source concentration**
   - Single-customer signals inflating confidence scores. One vocal customer is not a market signal.
3. **Outcome misclassification**
   - PMs logging predicted outcomes that were too vague to score. Ambiguous outcomes cannot be calibrated.
```

**How the renderer maps this:**

- Each `1. **Title**` → one wide card; the numbered badge (1, 2, 3…) is auto-generated by CSS counter on `strong::before`
- `**Title**` → card header (bold, with inline badge)
- Nested `- body` → card body text
- `**...**` is required, not optional — the CSS targets `li > strong` as the header selector

**When to use:** Three parallel items that each need a title and a sentence of body context — three risks, three failure modes, three design constraints. Not for three items that fit as bullets (use T14) or three items that need comparison (use T22).

---

## Template 20: Numbered Criteria List

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL                                │
│  Here is what the criteria are.       │
│                                       │
│  01  Criterion Title One              │
│      Supporting description text.     │
│                                       │
│  02  Criterion Title Two              │
│      Supporting description text.     │
│                                       │
│  03  Criterion Title Three            │
│      Supporting description text.     │
│                                       │
│  04  Criterion Title Four             │
│      Supporting description text.     │
│                                       │
│  footer                          8/19 │
└───────────────────────────────────────┘
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

- **Speed**
  - Decisions must close within the window they are relevant to. Systems that add latency consume the value they exist to protect.
- **Auditability**
  - Every prioritization decision above a threshold must carry a traceable rationale. Required for alignment and compliance.
- **Adoption**
  - If the team won’t use it weekly, calibration never runs and the model never improves.
- **Calibration**
  - The system must improve over time. A static scoring model is a spreadsheet with extra steps.
```

**How the renderer maps this:**

- The sequence number (01, 02…) is auto-generated by CSS counter — do not author it in the Markdown
- Each `- **Title**` → one criteria row; `**...**` is required (CSS targets `li > strong` for the title)
- Nested `- description` → supporting text, 16px (`--fs-body`), `--text-body`
- 3–5 items maximum; if more, split across two slides

**When to use:** Ranked criteria, leadership principles, non-negotiable requirements, or any list where the items carry enough weight that a bullet point understates them. The number is a visual anchor, not a rank signal — reordering is fine.

---

## Template 21: Card Grid with Verdict Badges

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL                                │
│  We have four options.                │
│                                       │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Option 1     │  │ Option 2     │   │
│  │ ✓In-proc ✕Ops│  │ ✕In-proc ✓Ops│   │
│  │ description  │  │ description  │   │
│  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐*  │
│  │ Option 3     │  │ Option 4 ★   │   │
│  │ ✓In-proc ✓Ops│  │ ✓In-proc ✓Ops│   │
│  │ description  │  │ description  │   │
│  └──────────────┘  └──────────────┘   │
│  footer                          9/19 │
└───────────────────────────────────────┘
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

- **Option 1 · Label**
  - [x] In-process
  - [~] Independence
  - [x] Ops
  - [] Availability
  - The architectural model leadership wants, but the stand-up burden is prohibitive.
- **Option 2 · Label**
  - [ ] In-process
  - [ ] Independence
  - [x] Ops
  - [x] Availability
  - Consumed as delivered. Criterion relaxed is availability coupling.
- **Option 3 · Label**
  - [x] In-process
  - [x] Independence
  - [ ] Ops
  - [x] Availability
  - Honors architecture and independence, at the cost of a dedicated platform capability.
- **Option 4 · Label**
  - [x] In-process
  - [~] Independence
  - [x] Ops
  - [x] Availability
  - Co-develop the architecture needed. Same vendor, different engagement model.
```

**How the renderer maps this:**

- Each `- **Card Title**` → one card in the grid
- `**...**` is required (CSS targets `li > strong` for the card title)
- `[x]` → pass badge (green); `[ ]` → fail badge (red); `[~]` → warn badge (amber)
- **Badge colors (green/red/amber) render only in the Marp CLI / lattice.js path.** The VS Code preview shows all badges as neutral pills (`--bg` fill, `--text-muted` border).
- Last nested `li` (after all badge items) → card body description
- Last card in the grid gets accent-soft highlight automatically (`li:last-child` rule)

**When to use:** Option comparison, vendor evaluation, feature matrix where a recommended choice must be visible without hiding the tradeoffs. The badges let a reader scan all cards at once before reading any body text.

---

## Template 22: Comparison Table

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL                                │
│  Here are the numbers side by side.   │
│                                       │
│  ┌──────────┬──────────┬──────────┐   │
│  │          │ Option A │ Option B │   │
│  ├──────────┼──────────┼──────────┤   │
│  │ Row 1    │ ✓        │ ✕        │   │
│  │ Row 2    │ ✕        │ ✓        │   │
│  │ Row 3    │ ✓        │ ✓        │   │
│  │ Row 4    │ ⚠        │ ✓        │   │
│  └──────────┴──────────┴──────────┘   │
│  Footnote text for scope caveats.     │
│  footer                         11/19 │
└───────────────────────────────────────┘
```

**CSS class:** `compare-table`

**Layout spec:**

- `section.compare-table`: `display: flex; flex-direction: column; padding: 48px 64px`
- Slide heading (`h2`): 28-34px, `margin-bottom: 20px`
- Table wrapper: `flex: 1; overflow: hidden`
- `table`: `width: 100%; border-collapse: collapse; font-size: 13-15px`
- Header row (`thead th`): `font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); background: var(--bg-alt); padding: 10px 16px; text-align: left; border-bottom: 2px solid var(--border)`
- First column (row labels, `td:first-child`): `font-weight: 600; color: var(--text-heading); width: 28%; padding: 10px 16px; border-bottom: 1px solid var(--border)`
- Data cells (`td`): `padding: 10px 16px; border-bottom: 1px solid var(--border); color: var(--text-body)`
- Cell semantic tinting — apply via class on `<td>`:
  - `.cell-pass`: `background: rgba(45,106,63,0.08); color: #2d6a3f`
  - `.cell-fail`: `background: rgba(155,28,28,0.08); color: #9b1c1c`
  - `.cell-warn`: `background: rgba(146,100,0,0.08); color: #925c00`
  - No class: neutral, `color: var(--text-muted)`
- Use background tint only — never bold fills that obscure text
- Footnote paragraph after table: `font-size: 12px; font-style: italic; color: var(--text-muted); margin-top: 12px`
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

_Footnote: scope and timeline estimates are not included — this table covers architectural properties only._
```

**Note:** This template requires `html: true` in the Marp frontmatter. The `<table>` is written directly in the markdown — Marp passes it through when HTML is enabled. Cell classes (`.cell-pass`, `.cell-fail`, `.cell-warn`) must be defined in the deck's CSS theme.

**When to use:** Multi-vendor comparison, criteria matrix, architectural property grid. Use when the reader needs to scan both across a row (how one item compares across options) and down a column (what one option looks like in total). If you only need to compare two things, use T11 instead.

---

## Template 23: Featured Card + Sub-Grid

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL                                │
│  Here is where the evidence points.   │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │ ── THE EVIDENCE FAVORS OPTION 4 │  │
│  │                                 │  │
│  │ Featured thesis here. This is   │  │
│  │ the answer the slide asserts.   │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌──────────────┐   ┌──────────────┐  │
│  │ Sub Card 1   │   │ Sub Card 2   │  │
│  │ Condition or │   │ Condition or │  │
│  │ caveat.      │   │ fallback.    │  │
│  └──────────────┘   └──────────────┘  │
│  footer                         14/19 │
└───────────────────────────────────────┘
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

## Feature: Key Insight Panel

Any card-bearing layout that ends with a trailing `> blockquote` renders it as a **Key Insight panel** — an accent-tinted bar that pins below the card content.

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL                                │
│  Grid Title                           │
│                                       │
│  ┌──────────────┐   ┌──────────────┐  │
│  │ Card Title 1 │   │ Card Title 2 │  │
│  │ body text    │   │ body text    │  │
│  └──────────────┘   └──────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ KEY INSIGHT                     │  │
│  │ The key insight text here.      │  │
│  └─────────────────────────────────┘  │
│  footer                          1/19 │
└───────────────────────────────────────┘
```

**Layouts that support Key Insight:** `cards-grid`, `cards-side`, `compare-prose`, `list`, `list-criteria`, `cards-wide`, `list-steps`, `split-panel`

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

**Layouts that support below-note:** `cards-grid`, `compare-prose`, `verdict-grid`, `featured`, `list-criteria`, `cards-wide`

- Rule: hairline gradient from `--accent` to transparent
- Text: 16px (`--fs-body`), `--text-body`
- Use for source attribution, scope caveats, or a single sentence of additional context

---

## Documented Variants

These are named variations of existing templates. Use them when the base template almost fits but needs one structural addition.

### Variant: T11 with Below Note

Extends Template 12 (Comparison with connector). Adds a full-width framing paragraph below the two cards.

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL                                │
│  Comparison Heading                   │
│                                       │
│  ┌─────────────┐     ┌─────────────┐  │
│  │ Card A      │  →  │ Card B      │  │
│  │ content     │     │ content     │  │
│  └─────────────┘     └─────────────┘  │
│                                       │
│  Framing sentence that applies to     │
│  both sides equally. Max 30 words.    │
│                                       │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL                                │
│  How to roll this out.                │
│                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ STEP 01 │ │ STEP 02 │ │ STEP 03 │  │
│  │         │ │         │ │         │  │
│  │ Step    │ │ Step    │ │ Step    │  │
│  │ Title   │ │ Title   │ │ Title   │  │
│  │         │ │         │ │         │  │
│  │ body    │ │ body    │ │ body    │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│  footer                         12/19 │
└───────────────────────────────────────┘
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

### Variant: T14 Tabular Inline

Extends Template 15 (List / Bullet Points). Each list item carries right-aligned metadata columns — creating a pseudo-table within a list structure.

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL                                │
│  Growth is a change in thinking.      │
│                                       │
│ 01  Remember    Recall facts  Feature │
│ 02  Understand  Explain it    Module  │
│ 03  Apply       Use patterns  Service │
│ 04  Analyze     Decompose     System  │
│ 05  Evaluate    Judge option  Org     │
│ 06  Create      Synthesize    Entrp.  │
│                                       │
│  footer                          3/19 │
└───────────────────────────────────────┘
```

**CSS class:** `list-tabular` (or add `tabular` modifier to `list`)

**Layout spec:**

- `section.list-tabular ul`: `list-style: none; padding: 0; display: flex; flex-direction: column; gap: 14px`
- Each `li`: `display: grid; grid-template-columns: [varies by content]; align-items: baseline; gap: 0 20px`
- Define column widths explicitly — e.g. `grid-template-columns: 40px 140px 1fr 200px` for number + verb + description + scope
- Number column: `font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--accent)`
- Verb column: `font-size: 16-18px; font-weight: 700; color: var(--text-heading)`
- Description column: `font-size: 15-16px; color: var(--text-body)`
- Metadata column(s): `font-family: var(--font-mono); font-size: 13px; color: var(--text-muted); text-align: right`
- Use CSS grid — never use spaces or tabs to fake alignment
- Maximum 2 metadata columns on the right; if more structure is needed, use T22 (Comparison Table)

**Marp markdown source:**

```markdown
<!-- _class: list-tabular -->

## Growth is a change in thinking, not title.

- `01` **Remember** Recall facts, syntax, rules _Feature / Task_
- `02` **Understand** Explain behavior & dependencies _Component / Module_
- `03` **Apply** Use patterns in new contexts _Service / Product_
- `04` **Analyze** Decompose across boundaries _System / Platform_
- `05` **Evaluate** Judge options against strategy _Org / Multi-domain_
- `06` **Create** Synthesize new frameworks _Enterprise / Ecosystem_
```

**How the renderer maps this:** Each `li` is parsed for inline patterns: backtick code → number column; bold → verb column; plain text → description column; italic → metadata column. The renderer places each token into the grid column in order. Alternatively, use explicit `<span class="col-N">` wrappers inside each `li` for precise control.

**When to use:** A list where each item has structured metadata — level + scope, item + type + status, verb + description + context. Gives the list the scannability of a table while preserving the flowing left-to-right reading order of a list. Switch to T22 if readers need to scan down columns as much as across rows.

---

## Template 24: Image (text + background photo)

### Default (photo right)

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL             ┌───────────────┐  │
│  Heading           │               │  │
│                    │   [ photo ]   │  │
│  Body text here.   │               │  │
│                    └───────────────┘  │
│  footer                          1/19 │
└───────────────────────────────────────┘
```

### Variant: photo left

```
┌───────────────────────────────────────┐
│  header                               │
│  ┌───────────────┐  LABEL             │
│  │               │  Heading           │
│  │   [ photo ]   │                    │
│  │               │  Body text here.   │
│  └───────────────┘                    │
│  footer                          1/19 │
└───────────────────────────────────────┘
```

**CSS class:** `image` (default: image right) · `image left` (image left)

**Marp directive:**

```markdown
<!-- _class: image -->
```

- Text occupies left half; background image fills right half
- Use `image left` modifier to flip: image left, text right
- Text padding auto-adjusted so content never overlaps the photo

**Marp markdown source:**

```markdown
<!-- _class: image -->

`Layout · Image`

## Images sit naturally beside text when you need visual evidence.

Use `_class: image` with `![bg right fit](url)` — image-right is the default. The `fit` keyword tells Marp's renderer (and ours) to letterbox the image inside its slot rather than crop it.

![bg right fit](path/to/photo.jpg)
```

```markdown
<!-- _class: image left -->

`Layout · Image Left`

## Flip the image to the left when the composition benefits.

![bg left fit](path/to/photo.jpg)
```

- `` `inline code` `` paragraph = eyebrow label
- `h2` = heading
- `p` = body text
- `![bg right fit](url)` / `![bg left fit](url)` = Marp background image directive

**Image sizing — proportions are always preserved.**

Always include the `fit` keyword (`![bg right fit](url)`). It tells Marp to letterbox the image inside its slot at native aspect ratio, never cropped or distorted. Without `fit`, Marp's default is `cover`, which crops arbitrary photos. Whatever bands remain show the lattice pattern as intentional brand framing.

| Layout | Slot aspect | Ideal source |
|---|---|---|
| `image` / `image left` | ≈ 8 : 9 (half of 16 : 9 canvas) | 640 × 720, or any 8 : 9 portrait-ish photo |
| `image-full` | 16 : 9 | 1280 × 720, or any wide landscape |

Bring whatever you have. A square crop in a half-canvas slot will show small top/bottom bands. A portrait photo on a full canvas will show wide left/right bands. Both look intentional — the lattice frames the image instead of dead space.

---

## Template 25: Code

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL                                │
│  Slide Heading                        │
│  Language · Context label             │
│  ┌─────────────────────────────────┐  │
│  │ // code block fills remaining   │  │
│  │ // space below                  │  │
│  └─────────────────────────────────┘  │
│  footer                          1/19 │
└───────────────────────────────────────┘
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

````markdown
<!-- _class: code -->

`Implementation · Token Pipeline`

## The tokenization call is three lines of application code.

`JavaScript · SDK v2 interface`

```javascript
const tokens = await client.tokenize(input, {
  model: "signal-v2",
  format: "compact",
});
```
````

```

- `` `inline code` `` paragraph (first) = eyebrow
- `h2` = heading
- `` `inline code` `` paragraph (second, after `h2`) = language/context label above the code block
- Fenced code block = the code (fills remaining space)

---

## Template 26: Code Compare

```

┌───────────────────────────────────────┐
│ header │
│ LABEL Heading │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ Left label │ │ Right label │ │
│ │ │ │ │ │
│ │ // code │ │ // code │ │
│ │ │ │ │ │
│ └──────────────┘ └──────────────┘ │
│ footer 1/19 │
└───────────────────────────────────────┘

````

**CSS class:** `compare-code`

**Marp directive:**
```markdown
<!-- _class: compare-code -->
````

- Two equal code columns (`1fr 1fr`), gap `--sp-md`
- Each column: inline-code label (`p > code`) above a code block (`pre`)
- Same dark code style as `code` template

**Marp markdown source:**

````markdown
<!-- _class: compare-code -->

`Before & After · Key Distribution`

## File-distributed keys versus vault-integrated keys.

`Before · File-distributed`

```python
SECRET_KEY = os.environ["SECRET_KEY"]
hmac.new(SECRET_KEY, payload)
```
````

`After · HSM / KMS integrated`

```python
signature = vault.sign(payload, key_id="prod-hmac-v3")
```

````

- `` `inline code` `` paragraph before `h2` = optional eyebrow (spans both columns)
- `h2` = heading (spans both columns)
- `` `inline code` `` paragraph (first after `h2`) = left column label
- First code block = left column
- `` `inline code` `` paragraph (second after `h2`) = right column label
- Second code block = right column

**Why inline code, not `h3`, for column labels:** `h3` is a heading level and triggers heading-order lint rules. Column labels are display labels, not headings — the same semantic role as eyebrows on other slide types. Using inline-code paragraphs is consistent with the project-wide eyebrow convention and simplifies the CSS (eyebrow detection uses `:has(> p ~ h2)` rather than the ambiguous `:has(h3 ~ h2)`; nested `:has()` is avoided because Marp's Chromium build does not support it).

---

## Dark Modifier

**Applies to any layout class.** Add `dark` alongside the layout class to switch the slide to a dark palette using the theme's dark color tokens.

**Marp directive:**
```markdown
<!-- _class: content dark -->
<!-- _class: list dark -->
<!-- _class: divider dark -->
<!-- _class: image-full dark -->
````

- Retokens: `--bg`, `--bg-alt`, `--border`, `--text-*` all switch to `var(--dark-*)` values
- Spectrum bar changes: instead of a 4px solid top border, dark slides render a 1px spectrum line as a CSS `background` at the top
- Use for mid-deck emphasis slides, impactful data reveals, or transitional moments
- Gallery uses: `content dark`, `list dark`, `cards-stack dark`, `divider dark`, `image-full dark`

---
