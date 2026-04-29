# Marp Slide Deck Pipeline — Complete LLM Skill

## What This Document Is

Complete instructions for an LLM to create presentation decks using Marp-flavored Markdown as the single source of truth, with conversion to PDF, PPTX, and image sets. Covers design principles, 25 layout templates (plus 3 documented variants), CSS theme architecture, Mermaid diagram integration, rendering pipeline, and multi-format output.

**This file is the source of truth for visual output.** All three rendering modes below are expected to produce output faithful to the specifications here. When output from any mode deviates from this spec, the spec wins — not the renderer.

---

## Rendering Modes

Lattice decks can be rendered in three ways. The same `.md` source file works in all three — no source changes needed.

### Mode 1 — VS Code + Marp Extension (preview and export)

Install the [Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode) extension. Open any `.md` file with `marp: true` in the frontmatter. The extension renders a live preview in the editor. Export from the command palette: **Marp: Export slide deck** → choose PDF, HTML, PPTX, or PNG/JPEG.

- Theme files must be registered in VS Code settings (`markdown.marp.themes`).
- Pagination is rendered by Marp's engine via `section::after`.
- Some post-processing scaffolding (e.g., `.comparison-inner`, `.card-grid-inner`) is **not** applied by the Marp extension — VS Code fallback CSS rules in `lattice.css` handle these layouts directly from the raw `ul`/`ol` HTML. The output is functionally correct but does not go through the same DOM transformation as the CLI path.

### Mode 2 — Marp CLI (preferred for production output)

Use when `marp` or `npx @marp-team/marp-cli` is available in the environment.

```bash
# HTML
npx @marp-team/marp-cli deck.md --theme-set themes/indaco.css lattice.css --html --output output.html

# PDF
npx @marp-team/marp-cli deck.md --theme-set themes/indaco.css lattice.css --pdf --output output.pdf

# PPTX
npx @marp-team/marp-cli deck.md --theme-set themes/indaco.css lattice.css --pptx --output output.pptx

# Images (one PNG per slide)
npx @marp-team/marp-cli deck.md --theme-set themes/indaco.css lattice.css --images png --output output/
```

Marp CLI is the canonical renderer. Its PDF output is the reference against which all other modes are calibrated.

### Mode 3 — lattice.js emulator (LLM environments without Marp CLI)

`lattice.js` is a Node.js renderer that emulates Marp CLI output using Puppeteer. Use it when `marp-cli` is not available in the current environment.

```bash
node lattice.js examples/gallery.md lattice.css output.pdf
```

`lattice.js` post-processes the markdown into the same scaffold HTML that Marp CLI produces (`.card-grid-inner`, `.comparison-inner`, `.stats-row`, etc.), then renders via headless Chrome to PDF. It is not identical to Marp CLI — it is an approximation. Known differences:

- Mermaid diagrams may fail to render if `mmdc` (Mermaid CLI) is not installed; a placeholder is shown instead.
- Font rendering and PDF compression differ slightly from Puppeteer vs. Marp's Chromium build.
- PPTX output is not supported — PDF and HTML only.

### Choosing a mode

| Situation | Use |
|-----------|-----|
| Developing or reviewing in VS Code | Mode 1 (Marp Extension) |
| Producing final PDF/HTML/PPTX for delivery | Mode 2 (Marp CLI) |
| LLM environment without Marp CLI installed | Mode 3 (lattice.js) |
| Verifying layout spec compliance | Mode 2 preferred, Mode 3 acceptable |

**Check for Marp CLI first.** Before falling back to `lattice.js`, verify availability:

```bash
npx @marp-team/marp-cli --version
# or
marp --version
```

If either returns a version number, use Marp CLI. Only use `lattice.js` when both commands fail.

---

# Part 1: Design Principles

## 1.1 Visual Hierarchy (strict, never violated)

```
Display title (48-72px)
  > Slide heading (32-42px)
    > Subheading / card title (18px)
      > Body content (16px)  ← smallest readable text
        > Eyebrow labels / captions (13px)  ← orientation only
          > Page numbers (13px)  ← reference only
```

Every level must be visibly distinct from adjacent levels. If two levels look the same size, the hierarchy is broken.

Content text (16-20px) is the floor for readable text. Everything above it is bigger. Everything below it is not content — it's navigation or decoration.

## 1.2 Spacing Scale

All spacing uses an 8px base scale:

| Token | Size | Usage |
|-------|------|-------|
| `--sp-xs` | 8px | Tight: inside compact cards |
| `--sp-sm` | 16px | Default: between related elements |
| `--sp-md` | 24px | Comfortable: between sections within a slide |
| `--sp-lg` | 32px | Generous: between major blocks |
| `--sp-xl` | 48px | Dramatic: slide padding from edges |
| `--sp-2xl` | 64px | Maximum: title slide breathing room |

Never use arbitrary values. Pick from the scale.

## 1.3 Color Token System

Every deck defines these base tokens. Slide classes inherit from them — they never define colors from scratch.

| Token | Purpose |
|-------|---------|
| `--bg` | Slide background (light) |
| `--bg-alt` | Card / container background |
| `--bg-dark` | Dark slides (title, closing, dividers) |
| `--border` | Card borders, dividers |
| `--text-display` | Display titles on dark backgrounds |
| `--text-heading` | Slide headings |
| `--text-body` | Body content |
| `--text-muted` | Labels, captions, page numbers |
| `--accent` | Stat numbers, key highlights, accent lines |
| `--accent-soft` | Accent tint for backgrounds |

Accent colors for categories, levels, or themes extend this palette — they don't replace it.

## 1.4 Typography Rules

- One font stack for all outputs (HTML, PDF, PPTX, images)
- Fonts must be available on Google Fonts
- Define explicit PPTX fallback if exact font unavailable (e.g., Cormorant Garamond → Georgia)
- Display/heading font: serif or distinctive sans
- Body font: clean sans-serif
- Mono font (optional): for labels, code, badges
- Minimum body content: 16px
- Minimum eyebrow/caption: 11px
- Page number: 13px — same size as footer/eyebrow labels (`--fs-label`)
- No text below 9px for any purpose

### Font Pairing Suggestions

| Style | Display Font | Body Font | Mono Font |
|-------|-------------|-----------|-----------|
| Warm editorial | Cormorant Garamond | Nunito Sans | — |
| Modern refined | Playfair Display | Outfit | JetBrains Mono |
| Clean corporate | Libre Baskerville | Source Sans 3 | — |
| Contemporary | DM Serif Display | DM Sans | DM Mono |

## 1.5 Content Limits

- Maximum ~40 words of body text per slide
- If content overflows, split into two slides — never shrink font
- Diagrams should occupy at least 50% of slide area
- One main idea per slide
- Maximum 6 bullet points per list slide
- Maximum 4 cards per grid slide
- Maximum 6 steps per timeline
- Maximum ~25 words in a quote slide

## 1.6 Contrast & Readability

- All text must have sufficient contrast against its background
- Light text on dark backgrounds: use `--text-display`
- Dark text on light backgrounds: use `--text-heading` / `--text-body`
- Card text must contrast against `--bg-alt`, not just `--bg`
- Never place muted-color text on similarly muted background
- Test readability at actual presentation scale, not zoomed in

## 1.7 Slide Structure

- **Spectrum bar:** every content slide has a 4px rainbow gradient border at the very top (`border-top: 4px solid; border-image-source: var(--spectrum); border-image-slice: 1`). Dark slides (`title`, `divider`, `closing`) suppress this (`border-top: none`) and instead render a 1px top spectrum line via `background` if the `dark` modifier is used.
- Dark bookend slides: title (first) and closing (last) use `--bg-dark`
- Section dividers may also use `--bg-dark` or a strong accent
- Content slides: light background using `--bg`
- Consistent slide padding: 48-64px from all edges
- Content must never overflow into page number zone
- Page numbers: bottom-right, `bottom:24px; right:30px` — same vertical anchor as footer (`bottom:24px; left:30px`)
- Page number font, size, weight, letter-spacing, and color are identical to the footer
- Header: top area, consistent across content slides
- Footer: bottom-left, consistent across content slides

## 1.8 Cards & Containers

- All cards use rounded corners (border-radius: 10-16px)
- Cards have visible but subtle borders using `--border`
- Cards have internal padding (16-24px)
- Optional subtle box-shadow (blur 8-16px, opacity 0.03-0.06)
- Diagram containers: at least 0.8" margin from slide edges
- Cards never touch slide edges — always padded inside
- Card headers are auto-bolded by CSS on all card layouts — no `**...**` required in the Markdown. Writing `**text**` still works as a compatibility shim (it becomes a `<strong>` which CSS suppresses the redundant bold on)
- Card body is regular weight

## 1.9 Centering & Alignment

- Title, divider, sub-topic, closing, quote, big-number slides: all content centered vertically and horizontally
- Content and list slides: left-aligned or centered, consistent within the deck
- Card grids: centered as a group on the slide
- Stats rows: centered with even spacing
- Diagrams: centered within their container
- Nothing should feel off-center or floating to one side unless the layout explicitly calls for asymmetry (e.g., two-column, split panel)

---

# Part 2: Marp Directives

## 2.1 Frontmatter

```yaml
---
marp: true
theme: uncover
paginate: true
html: true
header: 'Deck Title or Brand'
footer: 'Subtitle or Date'
style: |
  /* Full CSS theme here */
---
```

## 2.2 Per-Slide Directives

| Directive | Scope | Effect |
|-----------|-------|--------|
| `<!-- _class: X -->` | This slide only | CSS class on section |
| `<!-- _paginate: false -->` | This slide only | Hide page number |
| `<!-- _header: '' -->` | This slide only | Hide header |
| `<!-- _footer: '' -->` | This slide only | Hide footer |
| `<!-- header: 'New' -->` | This slide onward | Change header |
| `<!-- footer: 'New' -->` | This slide onward | Change footer |

Underscore prefix = this slide only. No underscore = this slide and all following.

Title, divider, and closing slides should suppress header, footer, and pagination:

```markdown
<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->
```

## 2.3 Header, Footer & Pagination CSS

All three chrome elements share the same font, size, weight, and color. They differ only in position.

```css
section header {
  position: absolute; top: 24px; left: 30px; right: 30px;
  font-family: var(--font-mono);
  font-size: var(--fs-label);    /* 13px */
  font-weight: 500;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--text-muted);
}

section footer {
  position: absolute; bottom: 24px; left: 30px; right: 80px;
  font-family: var(--font-mono);
  font-size: var(--fs-label);    /* 13px */
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

/* Pagination — Marp CLI renders via section::after pseudo-element.
   The custom renderer (lattice.js) renders via .marp-slide-pagination span.
   Both are overridden to match footer exactly. */
section::after {
  font-family: var(--font-mono);
  font-size: var(--fs-label);    /* 13px — same as footer */
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  bottom: 24px;                  /* same vertical anchor as footer */
  right: 30px;
  padding: 0;                    /* REQUIRED: cancels Marp's padding:inherit which
                                    inherits section's padding-bottom:88px and
                                    pushes the number 88px above its anchor */
}

.marp-slide-pagination {         /* custom renderer span (lattice.js) */
  position: absolute;
  bottom: 24px; right: 30px;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
```

**Critical:** `padding: 0` on `section::after` is mandatory. Marp's base rule sets `padding: inherit`, which inherits the section's `padding-bottom: 88px`, causing the page number to appear ~88px above its `bottom` anchor in the VS Code preview and Marp CLI HTML output.

**CSS variables:** `--marp-slide-pagination-color` and `--marp-slide-pagination-font-size` are defined in `:root` for reference but are **not** consumed by Marp's engine `section::after` rule. Font and color must be set directly on `section::after` and `.marp-slide-pagination`.

For the custom renderer (non-Marp CLI): parse header/footer from frontmatter, inject into each slide's HTML, position via CSS. Respect per-slide overrides.

---

# Part 3: Slide Hierarchy

Slides in a deck follow this nesting:

```
Title (1 slide)
  └─ Section Divider (marks major section boundary)
       └─ Sub-Topic (introduces specific topic)
            └─ Content slides (the material)
       └─ Sub-Topic
            └─ Content slides
  └─ Section Divider
       └─ Sub-Topic
            └─ Content slides
Closing (1 slide)
```

Not every deck needs all levels. A short deck might just be: Title → Content → Content → Closing. A long deck with multiple sections needs dividers and sub-topics for orientation.

---

# Part 4: Layout Templates

All layouts are 1280×720 (16:9). Slide padding: 48-64px. Usable content area: approximately 1160×600.

25 templates plus 3 documented variants. CSS class names shown in `monospace` — use directly in `<!-- _class: name -->` directives.

| Category | Templates | CSS class |
|----------|-----------|-----------|
| Structural | T1 Title, T2 Divider, T3 Sub-Topic, T19 Closing | `title` `divider` `subtopic` `closing` |
| Text | T4 Content, T13 Quote, T15 List, T22 Criteria | `content` `quote` `list` `criteria` |
| Text variant | T15v Tabular Inline | `list-tabular` |
| Data | T5 Diagram, T7 Stats, T17 Big Number, T24 Compare Table | `diagram` `stats` `big-number` `compare-table` |
| Cards | T8 Grid 2×2, T9 Grid 2+1, T10 Stacked, T11 Side-by-Side | `card-grid` `cards-stacked` `cards-side` |
| Cards cont. | T21 Three-Row Wide, T23 Verdict Grid | `cards-wide-3` `verdict-grid` |
| Comparative | T12 Comparison, T20 Finding, T25 Featured | `comparison` `finding` `featured` |
| Layout | T6 Two-Column, T14 Timeline, T18 Split Panel | `two-column` `timeline` `split-panel` |
| Layout variant | T14v Step Cards | `steps` |
| Visual | T16 Image Full | `image-full` |

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
##### Section 01 · Foundations

# Section Title Goes Here
```
- `h5` = eyebrow label (faint, uppercase, top)
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

## Template 6: Two-Column (text + visual)

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL                                │
│  ┌────────────┐  ┌───────────────┐    │
│  │ Heading     │  │               │   │
│  │             │  │   [visual /   │   │
│  │ Body text   │  │    diagram /  │   │
│  │ here.       │  │    image]     │   │
│  │             │  │               │   │
│  └────────────┘  └───────────────┘    │
│  footer                          1/19 │
└───────────────────────────────────────┘
```

**CSS class:** `two-column`

**Marp directive:**
```markdown
<!-- _class: two-column -->
```

- Two equal columns (`1fr 1fr`), column gap `--sp-lg` (32px)
- `h3` spans full width above both columns
- `h2` + `p` go into the left column
- `> blockquote` goes into the right column as a visual placeholder panel

**Marp markdown source:**
```markdown
### Eyebrow Label

## Slide Heading

Body text for the left column. One to two sentences.

> Visual: description of the diagram, screenshot, or image to place here
```
- `h3` = full-width eyebrow
- `h2` = left column heading
- `p` = left column body
- `> blockquote` = right panel (rendered as a `--bg-alt` card with centered muted text)

## Template 7: Stats / KPI Row

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
### Impact · Pilot Results

## Six months of results across four product teams.

_Measured against pre-framework baseline._

1. **73%** faster close
2. **4.2×** signal recall
3. **18** decisions logged
4. **91%** team alignment
```
- `h3` = eyebrow
- `h2` = heading
- `_em_` paragraph = italic description, centered below heading
- `ol > li`: `**number**` = stat value; remaining text = label

## Template 8: Card Grid (2×2)

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

**CSS class:** `card-grid`

**Marp directive:**
```markdown
<!-- _class: card-grid -->
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
>    - Body text.   ← 3 spaces ✓
> ```

- 2×2 grid with 24px (`--sp-md`) gaps
- Cards: `--bg-alt` fill, `--border` border, `--radius-md` corner radius
- Card header: 18px (`--fs-md`) bold, `--text-heading` — auto-bolded by CSS, no `**...**` needed
- Card body (nested list): 16px (`--fs-body`), `--text-body`
- Equal-width, equal-height cards; last odd card spans full width automatically
- **Numbered cards** (`ol` source): flush top-left corner badge — accent background, white mono number, `--radius-md 0 --radius-sm 0` corners; card `padding-top` is automatically increased to clear the badge
- Trailing `> blockquote` on this layout renders as a **Key Insight** panel (see Key Insight feature below)

## Template 9: Card Grid 2+1

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

**CSS class:** `card-grid`

**Marp directive:**
```markdown
<!-- _class: card-grid -->
```

**Markdown format** — same nested list format as `card-grid`, exactly 3 items:
```markdown
- Card Title
  - Body text.
```

- Top row: two equal cards, 24px gap — automatic from 2-column grid
- Bottom row: one card spanning full width — automatic (`li:last-child:nth-child(odd)` rule)
- Bottom card for summary, conclusion, or key takeaway
- Same card styling as 2×2
- **No separate class needed** — `card-grid` handles 2, 3, and 4 items automatically

## Template 10: Two Cards Stacked (vertical)

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

**CSS class:** `cards-stacked`

**Marp directive:**
```markdown
<!-- _class: cards-stacked -->
```

- Two full-width cards stacked vertically
- 16px gap between cards
- Each card takes roughly equal vertical space
- Sequential relationship: top leads to bottom
- Good for problem/solution, setup/payoff, context/detail

## Template 11: Two Cards Side-by-Side (horizontal)

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

**Markdown format** — same nested list format as `card-grid` (auto-bold, no `**...**` required):
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

## Template 12: Comparison (side by side with connector)

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

**CSS class:** `comparison`

**Marp directive:**
```markdown
<!-- _class: comparison -->
```

**Markdown format** — same nested list format as `card-grid`, exactly 2 items (auto-bold, no `**...**` required):
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

## Template 13: Quote / Testimonial

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

## Template 14: Timeline / Process

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

## Template 15: List / Bullet Points

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

## Template 16: Image Full

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

## Template 17: Big Number / Single Stat

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
##### Eyebrow Label

- 14×
  - Return on signal investment — one or two sentences of context.
```

## Template 18: Split Panel (colored sidebar)

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
- Left panel contains: `h5` eyebrow label pinned top-left, `h2` title pinned bottom-left
- Right panel contains: `h3` subheading, optional `p` intro, then `ul`/`ol` card tiles
- Good for category-based slides where sidebar signals section or dimension
- **Card headers**: auto-bolded by CSS, no `**...**` required
- Supports both `ul` (no badge) and `ol` (flush top-left corner badge)
- **Authoring pattern:**

```markdown
##### Section Label

## Slide Title

### Section heading

Optional intro paragraph.

1. Card Title
   - Card body — description or supporting detail.
2. Card Title
   - Card body.
```

- `h5` = left panel eyebrow (faint, top)
- `h2` = left panel title (white, bottom)
- `h3` = right panel subheading
- `p` = right panel intro text
- `ol > li` = stacked card tiles with flush corner badge; `ul > li` = stacked card tiles without badge

## Template 19: Closing (dark bookend)

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

## Template 20: Finding / Verdict

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL · FINDING 01                   │
│  The heading states the finding.      │
│                                       │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ What worked  │  │ What blocked │   │
│  │              │  │              │   │
│  │ body text    │  │ body text    │   │
│  └──────────────┘  └──────────────┘   │
│  ┌─────────────────────────────────┐  │
│  │ Secondary finding (full width)  │  │
│  │ nuance, context, or data point  │  │
│  └─────────────────────────────────┘  │
│  ● Verdict — one sentence.            │
│  footer                          4/19 │
└───────────────────────────────────────┘
```

**CSS class:** `finding`

**Layout spec:**
- `section.finding`: `display: flex; flex-direction: column; padding: 48px 64px 64px;`
- Slide heading (`h2`): 28-32px — shorter than standard to give cards vertical room
- Top card row: `display: flex; gap: 16px; flex: 1;` — each card `flex: 1`
- Bottom card: full width, `margin-top: 16px; flex: 0 0 auto`
- All cards: `background: var(--bg-alt); border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px`
- Card title (`strong` or `h4`): 15-16px bold, `color: var(--text-heading)`
- Card body: 14-15px, `color: var(--text-body); line-height: 1.6`
- Verdict line: `position: absolute; bottom: 32px; left: 64px; right: 64px; font-size: 13px; font-weight: 600; color: var(--accent)` — prepend a colored dot using `::before { content: '●'; margin-right: 8px; }`
- For pass/fail semantics: define `--verdict-pass: #2d6a3f` and `--verdict-fail: #9b1c1c` and apply via modifier class (`.finding.pass`, `.finding.fail`)

**Marp markdown source:**

```markdown
<!-- _class: finding -->

## The in-process model performed well, but the operational burden is prohibitive.

- **What worked**
  - Body text describing what succeeded. Keep to 2–3 sentences.
- **What blocked it**
  - Body text describing the blocker. Keep to 2–3 sentences.
- **Secondary finding**
  - Full-width nuance, data point, or contextual note. One sentence preferred.

*Not viable — one sentence verdict goes here.*
```

**How the renderer maps this:**
- Each `- **Title**` → opens a card; `**Title**` becomes the bold card header; nested list items form the card body
- First two top-level items → top row (flex side-by-side)
- Third top-level item (when present, odd count) → bottom full-width card spanning both columns
- Final `*italic paragraph*` → verdict line with `●` accent dot prepended
- Note: `**...**` is required for `finding` — the CSS uses `li > strong` as the card header selector

**When to use:** A finding has a clear go/no-go signal that must be visible at a glance. Top cards frame parallel perspectives (what worked vs. what blocked); bottom card adds secondary context; verdict line states the bottom line.

---

## Template 21: Three-Row Wide Cards

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

**CSS class:** `cards-wide-3`

**Layout spec:**
- `section.cards-wide-3`: flex column, 48px 64px padding
- Cards container: `display: flex; flex-direction: column; gap: 12px; flex: 1`
- Each card: `flex: 1; background: var(--bg-alt); border: 1px solid var(--border); border-radius: --radius-md; padding: --sp-sm --sp-md; display: flex; flex-direction: column; gap: --sp-xs`
- Card header row: `**Title**` (`strong`) displayed with inline numbered badge before it
  - Badge: `content: counter(wide-counter)` — mono pill, 16px, accent background, white text
  - Title: 16px (`--fs-body`) bold, `--text-heading`
- Card body (`ul > li`): 15px (`--fs-sm`), `--text-body`, full width
- Note: `**...**` is required for `cards-wide-3` — the CSS uses `li > strong` for the header and `strong::before` for the badge

**Marp markdown source:**
```markdown
<!-- _class: cards-wide-3 -->

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

**When to use:** Three parallel items that each need a title and a sentence of body context — three risks, three failure modes, three design constraints. Not for three items that fit as bullets (use T15) or three items that need comparison (use T24).

---

## Template 22: Numbered Criteria List

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

**CSS class:** `criteria`

**Layout spec:**
- `section.criteria`: `display: flex; flex-direction: column; padding: 48px 64px`
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
<!-- _class: criteria -->

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

## Template 23: Card Grid with Verdict Badges

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
  - [X] Ops
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

## Template 24: Comparison Table

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

*Footnote: scope and timeline estimates are not included — this table covers architectural properties only.*
```

**Note:** This template requires `html: true` in the Marp frontmatter. The `<table>` is written directly in the markdown — Marp passes it through when HTML is enabled. Cell classes (`.cell-pass`, `.cell-fail`, `.cell-warn`) must be defined in the deck's CSS theme.

**When to use:** Multi-vendor comparison, criteria matrix, architectural property grid. Use when the reader needs to scan both across a row (how one item compares across options) and down a column (what one option looks like in total). If you only need to compare two things, use T12 instead.

---

## Template 25: Featured Card + Sub-Grid

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

**When to use:** Assessment with a clear recommended direction plus qualifications or fallback conditions. This template asserts a direction — do not use it for three equal options (use T8 or T23). Use it when the deck needs to say "here is the answer, and here is the nuance."

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

**Layouts that support Key Insight:** `card-grid`, `cards-side`, `comparison`, `list`, `criteria`, `cards-wide-3`, `finding`, `steps`, `split-panel`

**Styling:**
- Panel: `--accent-soft` background, `1px solid var(--accent)` border, `--radius-md` corners
- "KEY INSIGHT" eyebrow: 13px (`--fs-label`) mono, bold, letter-spaced, `--accent` color
- Body text: 16px (`--fs-body`) body font, `--text-heading` color, not italic

**Marp markdown source:**
```markdown
<!-- _class: card-grid -->

## Slide heading.

- Card Title 1
  - Card body.
- Card Title 2
  - Card body.

> The key insight text that ties the cards together. One sentence preferred.
```

**Note:** The blockquote must be the **last element** on the slide (or the last element before a trailing paragraph). The `finding` layout uses the same pattern; its Key Insight panel also accepts semantic coloring via the layout's verdict line.

## Feature: Below-Note

A trailing plain paragraph (not a blockquote) on any card-bearing layout renders as a **below-note** — body-sized contextual text with a hairline gradient rule above it, visually separate from the card content.

```markdown
<!-- _class: card-grid -->

## Slide heading.

- Card Title 1
  - Card body.
- Card Title 2
  - Card body.

This is a below-note. It appears below the cards with a hairline rule above it.
```

**Layouts that support below-note:** `card-grid`, `comparison`, `verdict-grid`, `featured`, `finding`, `criteria`, `cards-wide-3`

- Rule: hairline gradient from `--accent` to transparent
- Text: 16px (`--fs-body`), `--text-body`
- Use for source attribution, scope caveats, or a single sentence of additional context

---

## Documented Variants

These are named variations of existing templates. Use them when the base template almost fits but needs one structural addition.

### Variant: T12 with Below Note

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

**CSS addition to T12:**
- After the card row: `margin-top: 20px`
- Framing paragraph: `font-size: 15-17px; color: var(--text-body); line-height: 1.6; max-width: 800px`
- The note sits below the cards with more margin above it than the gap between the cards — this signals it is a comment on the comparison, not a third card

**Marp markdown source:**

```markdown
<!-- _class: comparison -->

## Heading

- **Option A**
  - Body text for the left card.
- **Option B**
  - Body text for the right card.

Optional framing sentence below the cards.
```

**How the renderer maps this:** Same as T12, except a trailing paragraph (not inside a list item) is rendered as the framing note below the cards.

---

### Variant: T14 Step Cards

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

**CSS class:** `steps`

**Layout spec:**
- Each `li`: flex column card with `--bg-alt` fill, `--border` border, `--radius-md` corners
- **STEP badge**: auto-generated by CSS — `STEP 01`, `STEP 02`… — 13px mono, letter-spaced, `--text-muted`; do **not** author it in the Markdown
- Card header: 18px (`--fs-md`) bold, `--text-heading` — auto-bolded by CSS, no `**...**` required
- Card body (nested `ul/ol > li` or `p`): 16px (`--fs-body`), `--text-body`
- `❯` chevron connectors between cards: CSS-generated, not authored
- 2–4 cards; use T14 (dot-on-line) for 5–6 steps with shorter labels
- Use `ol` (not `ul`) to get the auto-generated `STEP 01` badge

**Marp markdown source:**
```markdown
<!-- _class: steps -->

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

**When to use:** Steps that need more content than a dot label can hold. Use dot-on-line (T14) for light orientation with short labels; use step cards when each step needs a title plus a sentence of description. Use `ol` to activate the `STEP 01` eyebrow badge.

---

### Variant: T15 Tabular Inline

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
- Maximum 2 metadata columns on the right; if more structure is needed, use T24 (Comparison Table)

**Marp markdown source:**

```markdown
<!-- _class: list-tabular -->

## Growth is a change in thinking, not title.

- `01` **Remember** Recall facts, syntax, rules *Feature / Task*
- `02` **Understand** Explain behavior & dependencies *Component / Module*
- `03` **Apply** Use patterns in new contexts *Service / Product*
- `04` **Analyze** Decompose across boundaries *System / Platform*
- `05` **Evaluate** Judge options against strategy *Org / Multi-domain*
- `06` **Create** Synthesize new frameworks *Enterprise / Ecosystem*
```

**How the renderer maps this:** Each `li` is parsed for inline patterns: backtick code → number column; bold → verb column; plain text → description column; italic → metadata column. The renderer places each token into the grid column in order. Alternatively, use explicit `<span class="col-N">` wrappers inside each `li` for precise control.

**When to use:** A list where each item has structured metadata — level + scope, item + type + status, verb + description + context. Gives the list the scannability of a table while preserving the flowing left-to-right reading order of a list. Switch to T24 if readers need to scan down columns as much as across rows.

---

## Template 26: Image (text + background photo)

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

### Layout · Image

## Images sit naturally beside text when you need visual evidence.

Use `_class: image` with `![bg right](url)` — image-right is the default.

![bg right](path/to/photo.jpg)
```

```markdown
<!-- _class: image left -->

### Layout · Image Left

## Flip the image to the left when the composition benefits.

![bg left](path/to/photo.jpg)
```

- `h3` = eyebrow label
- `h2` = heading
- `p` = body text
- `![bg right](url)` / `![bg left](url)` = Marp background image directive

---

## Template 27: Code

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
```markdown
<!-- _class: code -->

### Implementation · Token Pipeline

## The tokenization call is three lines of application code.

### JavaScript · SDK v2 interface

```javascript
const tokens = await client.tokenize(input, {
  model: 'signal-v2',
  format: 'compact',
});
```
```

- `h3` (first) = eyebrow
- `h2` = heading
- `_em_` paragraph (optional) = italic subtitle
- `h3` (second) = language/context label above the code block
- Fenced code block = the code (fills remaining space)

---

## Template 28: Code Compare

```
┌───────────────────────────────────────┐
│  header                               │
│  LABEL          Heading               │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Left label   │  │ Right label  │   │
│  │              │  │              │   │
│  │ // code      │  │ // code      │   │
│  │              │  │              │   │
│  └──────────────┘  └──────────────┘   │
│  footer                          1/19 │
└───────────────────────────────────────┘
```

**CSS class:** `code-compare`

**Marp directive:**
```markdown
<!-- _class: code-compare -->
```

- Two equal code columns (`1fr 1fr`), gap `--sp-md`
- Each column: label (`h3`) above a code block (`pre`)
- Same dark code style as `code` template

**Marp markdown source:**
```markdown
<!-- _class: code-compare -->

### Before & After · Key Distribution

## File-distributed keys versus vault-integrated keys.

### Before · File-distributed

```python
SECRET_KEY = os.environ["SECRET_KEY"]
hmac.new(SECRET_KEY, payload)
```

### After · HSM / KMS integrated

```python
signature = vault.sign(payload, key_id="prod-hmac-v3")
```
```

- `h3` (first) = eyebrow (spans both columns)
- `h2` = heading (spans both columns)
- `h3` (second) = left column label
- First code block = left column
- `h3` (third) = right column label
- Second code block = right column

---

## Dark Modifier

**Applies to any layout class.** Add `dark` alongside the layout class to switch the slide to a dark palette using the theme's dark color tokens.

**Marp directive:**
```markdown
<!-- _class: content dark -->
<!-- _class: list dark -->
<!-- _class: divider dark -->
<!-- _class: image-full dark -->
```

- Retokens: `--bg`, `--bg-alt`, `--border`, `--text-*` all switch to `var(--dark-*)` values
- Spectrum bar changes: instead of a 4px solid top border, dark slides render a 1px spectrum line as a CSS `background` at the top
- Use for mid-deck emphasis slides, impactful data reveals, or transitional moments
- Gallery uses: `content dark`, `list dark`, `cards-stacked dark`, `divider dark`, `image-full dark`

---

# Part 5: Mermaid Diagram Integration

## 5.1 Diagrams in Markdown

Always use `<div class="mermaid">`, NOT fenced code blocks. Fenced blocks rely on Marp's built-in Mermaid which is unreliable in PDF export.

```html
<div class="mermaid-box">
<div class="mermaid">
mindmap
  root{{Root}}
    [Category]
      (Item)
</div>
</div>
```

For the PDF pipeline, these divs are for browser preview only. The actual PDF uses pre-rendered SVGs.

## 5.2 Node Shapes Reference

| Syntax | Shape | Use For |
|--------|-------|---------|
| `root` | Default | Auto |
| `((Text))` | Circle | Emphasis nodes |
| `(Text)` | Rounded rectangle | Leaf nodes / items |
| `[Text]` | Square | Category nodes |
| `{{Text}}` | Hexagon | Root / group nodes |
| `)Text(` | Cloud | Ideas / concepts |
| `))Text((` | Bang | Alerts / highlights |

Use different shapes for different hierarchy levels to aid visual scanning.

## 5.3 Mermaid Theme Matching

Match the Mermaid theme variables to the slide CSS palette:

```
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '<--bg-alt value>',
  'primaryTextColor': '<--text-heading value>',
  'primaryBorderColor': '<--border value>',
  'lineColor': '<--text-muted value>',
  'secondaryColor': '<--bg value>',
  'tertiaryColor': '<--bg value>',
  'fontFamily': '<--font-body value>',
  'fontSize': '14px'
}}}%%
```

---

# Part 6: Rendering Pipeline

## 6.1 Architecture

```
Source:     deck.md (Marp markdown + CSS theme)
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           │           │
 .mmd files     │           │
 (extracted)    │           │
    │           │           │
    ▼           │           │
 .svg files     │           │
 (via mmdc)     │           │
    │           │           │
    ├──► .png   │           │
    │  (sharp)  │           │
    │    │      ▼           │
    │    │   deck.html      │
    │    │   (SVGs inline)  │
    │    │      │           │
    │    │      ▼           │
    │    │   deck.pdf       │
    │    │   (Puppeteer)    │
    │    │      │           │
    │    │      ▼           │
    │    │   slide-*.jpg    │
    │    │   (pdftoppm)     │
    │    │                  │
    │    ▼                  │
    │  deck.pptx            │
    │  (PptxGenJS + PNGs)   │
    └───────────────────────┘
```

## 6.2 Architecture Decisions

**Why not Marp CLI?** Sandboxed LLM environments often lack network access. The custom renderer handles the subset of Markdown the deck uses. If Marp CLI IS available, use it — but don't depend on it.

**Why Puppeteer/Playwright for PDF?** The decks use CSS-driven layouts that LaTeX cannot reproduce. The PDF must be pixel-identical to the browser render.

**Why pre-render Mermaid to SVG?** JavaScript-dependent diagrams fail during PDF print. Pre-rendered SVGs are static content that Puppeteer prints reliably.

**Why SVG to PNG for PPTX?** PowerPoint does not natively render SVG. PNG is universally supported.

## 6.3 Prerequisites Check

```bash
# Required tools
which node && node --version
which npx
which mmdc && mmdc --version
which pdftoppm

# Find Chrome binary (STORE THIS PATH)
CHROME_PATH=$(find /home/claude/.cache/puppeteer -name "chrome" -type f 2>/dev/null | grep chrome-linux64 | head -1)
echo "Chrome: $CHROME_PATH"

# If no Puppeteer Chrome, check Playwright
PLAYWRIGHT_CHROME=$(find /home/claude/.cache -path "*/chromium*/chrome" -type f 2>/dev/null | head -1)
echo "Playwright Chrome: $PLAYWRIGHT_CHROME"

# npm packages
for pkg in pptxgenjs sharp @mermaid-js/mermaid-cli; do
  ls /home/claude/.npm-global/lib/node_modules/$pkg 2>/dev/null && echo "$pkg: found" || echo "$pkg: MISSING"
done
```

## 6.4 Step 1: Render Mermaid Diagrams

### Create Puppeteer Config

```bash
CHROME_PATH=$(find /home/claude/.cache/puppeteer -name "chrome" -type f | grep chrome-linux64 | head -1)

cat > /home/claude/puppeteer-config.json << EOF
{
  "executablePath": "$CHROME_PATH",
  "args": ["--no-sandbox", "--disable-setuid-sandbox"]
}
EOF
```

### Create .mmd Files

```bash
cat > /home/claude/diagram1.mmd << 'EOF'
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#EDE6D8',
  'primaryTextColor': '#3A342C',
  'primaryBorderColor': '#D4C5A0',
  'lineColor': '#B0A898',
  'fontFamily': 'Nunito Sans, sans-serif',
  'fontSize': '14px'
}}}%%
mindmap
  root{{Root}}
    [Category]
      (Item)
EOF
```

### Render to SVG

```bash
mmdc -i /home/claude/diagram1.mmd \
     -o /home/claude/diagrams/diagram1.svg \
     -b transparent \
     -p /home/claude/puppeteer-config.json
```

### Convert SVG to PNG

```javascript
const sharp = require('/home/claude/.npm-global/lib/node_modules/sharp');
const path = require('path');

async function convert(name) {
  await sharp(path.join('/home/claude/diagrams', `${name}.svg`), { density: 200 })
    .png()
    .toFile(path.join('/home/claude/diagrams', `${name}.png`));
}

const diagrams = ['diagram1', 'diagram2'];
Promise.all(diagrams.map(convert)).catch(console.error);
```

## 6.5 Step 2: Build HTML

The HTML file must:
- Set `@page { size: 1280px 720px; margin: 0; }` for 16:9 slides
- Use `page-break-after: always` on each slide element
- Embed pre-rendered SVGs directly (read SVG file contents, insert into HTML)
- Include all CSS inline
- Load fonts via Google Fonts `<link>` tag
- NOT require any JavaScript execution

```bash
SVG1=$(cat /home/claude/diagrams/diagram1.svg)

cat > /home/claude/deck.html << HTMLEOF
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=FONTS&display=swap" rel="stylesheet">
<style>
@page { size: 1280px 720px; margin: 0; }
.slide {
  width: 1280px; height: 720px;
  page-break-after: always;
}
/* Full CSS theme */
</style>
</head>
<body>
<div class="slide slide-title"><!-- content --></div>
<div class="slide slide-diagram">
  <div class="mermaid-box">$SVG1</div>
</div>
</body>
</html>
HTMLEOF
```

### Alternative: Custom Markdown-to-HTML Renderer

For pure-Markdown decks with no HTML divs, write a renderer that parses Marp markdown directly:

```javascript
const fs = require('fs');
const md = fs.readFileSync('deck.md', 'utf8');
const css = fs.readFileSync('theme.css', 'utf8');

// Strip frontmatter, split slides, parse markdown, wrap in HTML
// See Part 8 for renderer requirements
```

## 6.6 Step 3: Render PDF

### With Puppeteer

```javascript
const puppeteer = require('/home/claude/.npm-global/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve('/home/claude/deck.html'), {
    waitUntil: 'networkidle0', timeout: 30000
  });
  await page.pdf({
    path: '/home/claude/deck.pdf',
    width: '1280px', height: '720px',
    printBackground: true,
    preferCSSPageSize: true
  });
  await browser.close();
})();
```

### With Playwright

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file:///home/claude/deck.html', { waitUntil: 'networkidle' });
  await page.pdf({
    path: '/home/claude/deck.pdf',
    width: '1280px', height: '720px',
    printBackground: true
  });
  await browser.close();
})();
```

### Critical PDF Settings

| Setting | Value | Why |
|---------|-------|-----|
| `printBackground` | `true` | Background colors won't render without this |
| `preferCSSPageSize` | `true` | Respects `@page` dimensions (Puppeteer only) |
| `waitUntil` | `networkidle0` / `networkidle` | Ensures Google Fonts load |
| `width` / `height` | `1280px` / `720px` | 16:9 slide dimensions |

## 6.7 Step 4: Convert to Images

```bash
mkdir -p /home/claude/slides
pdftoppm -jpeg -r 200 /home/claude/deck.pdf /home/claude/slides/slide
ls /home/claude/slides/slide-*.jpg
```

Filenames are zero-padded: `slide-1.jpg` for <10 pages, `slide-01.jpg` for 10-99. Always use `ls` to find actual filenames.

## 6.8 Step 5: Convert to PPTX

```javascript
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";  // 10" × 5.625"

// Mirror CSS palette
const C = { bg: "F5F0E8", text: "3A342C", accent: "8B6914", /* ... */ };

// Title slide
const s1 = pres.addSlide();
s1.background = { fill: C.text };
s1.addText("Title", { x: 0, y: 2, w: 10, h: 1, fontSize: 54, fontFace: "Georgia", color: C.bg, align: "center" });

// Diagram slide with embedded PNG
const sN = pres.addSlide();
sN.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.8, y: 1.9, w: 8.4, h: 3.3,
  fill: { color: C.bg }, line: { color: C.border, width: 1 }, rectRadius: 0.12
});
sN.addImage({
  path: "/home/claude/diagrams/diagram1.png",
  x: 1.2, y: 2.0, w: 7.6, h: 3.0,
  sizing: { type: "contain", w: 7.6, h: 3.0 }
});

pres.writeFile({ fileName: "/home/claude/deck.pptx" });
```

### PPTX Layout Reference

| Element | Position (inches) |
|---------|------------------|
| Category label | x:0, y:0.4, w:10, align:center |
| Slide title | x:0, y:0.8, w:10, align:center |
| Subtitle | x:0, y:1.4, w:10, align:center |
| Diagram container | x:0.8, y:1.9, w:8.4, h:3.3 |
| Diagram image | x:1.2, y:2.0, w:7.6, h:3.0 |
| Body text | x:1.5, y:2.2, w:7, h:varies |
| Stat number | fontSize:40, fontFace:"Georgia" |
| Stat label | fontSize:9, charSpacing:2 |
| Page number | x:8.8, y:5.1, w:1, align:right |

### PPTX Tips

- Use `sizing: { type: "contain" }` for images
- Use `charSpacing` not `letterSpacing` (silently ignored)
- Use `rectRadius` on `ROUNDED_RECTANGLE` for cards
- Set `margin: 0` on text boxes when aligning with shapes
- Use `breakLine: true` in text arrays for multi-line
- Never use unicode bullets — use `bullet: true`

## 6.9 Step 6: Deliver

```bash
cp /home/claude/deck.md /mnt/user-data/outputs/
cp /home/claude/deck.pdf /mnt/user-data/outputs/
cp /home/claude/deck.pptx /mnt/user-data/outputs/
cp /home/claude/slides/*.jpg /mnt/user-data/outputs/
# Present via present_files tool
```

---

# Part 7: Custom Renderer Requirements

When Marp CLI is unavailable, the custom renderer must handle:

## From Frontmatter

- `marp: true` — confirm it's a Marp deck
- `theme` — ignored (CSS is inline)
- `paginate` — true/false, controls page number rendering
- `html` — true, enables HTML passthrough
- `header` — string, persistent header text
- `footer` — string, persistent footer text
- `style` — CSS block, inline into `<style>` tag

## From Slide Content

- Slide splitting on `\n---\n`
- Class directives: `<!-- _class: X -->` → class on `<section>`
- Pagination override: `<!-- _paginate: false -->`
- Header/footer overrides (both `_` and non-`_` variants)
- Markdown: headings, paragraphs, lists (2 levels), blockquotes, horizontal rules, inline bold/italic/code
- HTML passthrough: `<div>`, `<span>`, `<script>`, etc.

## Into HTML Output

- Each slide as `<section>` with class attribute
- Page number injected unless suppressed
- Header/footer injected unless suppressed
- CSS inlined in `<style>` tag
- Google Fonts loaded via `<link>` tag

## What the Renderer Does NOT Handle

- Tables (use cards instead)
- Ordered lists (use unordered with manual numbering)
- Images (embed as HTML `<img>`)
- Links (not clickable in PDF/PPTX)
- Nesting beyond 2 levels
- Marp-specific sizing directives (`w:`, `h:`, `bg:`)

## CSS Element Order Dependency

CSS themes use positional selectors (`p:first-of-type`, `p:nth-of-type(2)`, `ul > li:first-child`) to style elements by position. **Reordering elements in the Markdown breaks layout.** Document the required element order for each slide class in a per-deck companion file.

---

# Part 8: Workflow Checklist

```
□ Create Marp markdown source (deck.md) with CSS theme in frontmatter
□ Find Chrome binary path (Puppeteer or Playwright)
□ Create Puppeteer config (puppeteer-config.json)
□ Extract Mermaid blocks to .mmd files (if any diagrams)
□ Render .mmd → .svg using mmdc with puppeteer config
□ Convert .svg → .png using sharp (for PPTX embedding)
□ Build HTML with embedded SVGs and full CSS inline
□ Render HTML → PDF using Puppeteer or Playwright
□ Convert PDF → image set using pdftoppm
□ Build PPTX using PptxGenJS with embedded PNGs
□ Copy all outputs to /mnt/user-data/outputs/
□ Present files to user
```

---

# Part 9: Troubleshooting

| Problem | Fix |
|---------|-----|
| `mmdc` fails with `EISDIR` | `-p` flag needs a JSON file path, not a directory |
| PDF has no background colors | Add `printBackground: true` |
| Fonts don't render in PDF | Use `waitUntil: 'networkidle0'`, ensure Google Fonts `<link>` in HTML |
| SVGs don't appear in PPTX | Convert to PNG first using `sharp` |
| `pdftoppm` filename padding | Auto-pads by page count — use `ls` to find files |
| Puppeteer Chrome not found | `find /home/claude/.cache/puppeteer -name "chrome" -type f` |
| npm packages not found | Use full paths: `require('/home/claude/.npm-global/lib/...')` |
| Mermaid theme not applying | Include `%%{init: {...}}%%` at top of each `.mmd` |
| `str_replace` match fails | Always `view` file before editing — previous edits make views stale |
| Font size cascade | Use `px` values, not `em` — base section font-size affects `em` |
| Slide splitter eating `---` | Use `***` or `___` for horizontal rules inside slides |
| `charSpacing` in PPTX | Use `charSpacing`, not `letterSpacing` (silently ignored) |
| Google Fonts offline | Download fonts, use `@font-face` instead of `@import` |
| Heading overflow | Shorten text or widen column — never shrink font |
| Double bullets in PPTX | Never use unicode `•` — use `bullet: true` |
| Content overflows into page number | Increase bottom padding or reduce content |
| Cards touching slide edges | Add minimum 48px padding from all edges |

---

# Part 10: File Naming Convention

```
project_deck.md             Marp markdown source
project_deck.html           Intermediate HTML (debugging)
project_deck.pdf            Final PDF
project_deck.pptx           PowerPoint version
project_slide-01.jpg        Individual slide images
puppeteer-config.json       Puppeteer Chrome config
diagrams/                   Mermaid .mmd, .svg, .png files
```
