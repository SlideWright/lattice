# base

The foundation every component inherits. Authoring patterns that work on
any slide without needing a class modifier, plus the universal variants
that any component can opt into.

**Files in this folder:**

| File | What it implements |
|---|---|
| `base.tokens.css` | `:root { ... }` token definitions: spacing scale, font sizes, radii, line heights, palette consumers. Every other CSS file reads these. |
| `base.elements.css` | Semantic HTML defaults (`section`, `h1`-`h5`, `p`, `strong`, `em`, `code`, `hr`, `ul`, `ol`, `blockquote`). Element selectors only. |
| `base.modifiers.css` | Auto-detected chrome — eyebrow, subtitle, key-insight panel, below-note, annotation. Triggered by markdown patterns the author writes (no class needed). |
| `base.variants.css` | Universal opt-in variants — `dark`, `mirror`, `numbered`, `silent`, state markers, tone tokens. Composed via `_class:`. |
| `base.treatments.css` | 27 treatment utility classes — 12 tints (`tint-corner at-tl`, `tint-vignette`, etc.) and 11 marks (`mark-orbit`, `mark-seeds`, etc.) plus `treatment-none` — for peripheral atmospheric accents. |

---

## Auto-detected authoring patterns

These work on any slide without a class modifier. Write the markdown,
the CSS recognizes the shape, the chrome appears.

### Eyebrow labels

A paragraph containing only a single inline-code span, placed **above**
a heading or list, renders as a mono uppercase label.

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

The CSS pattern is `p:has(> code:only-child) + h1/h2/…`. Eyebrows are
**markdown-lint compliant**: a `<p>` containing code is not a heading,
so the eyebrow pattern can never violate heading-order rules.

Styling: `--font-mono`, 13px (`--fs-label`), 600 weight, 0.18em
letter-spacing, uppercase, `--text-secondary` (the AA-tuned secondary
content tier — a `light-dark()` pair, so it resolves correctly on `.dark`
slides and dark themes). Dark bookend slides (title, divider, closing)
override the color to `--on-dark-secondary` / `--on-dark-ghost`
automatically. (Before the 2026-06-05 token-structure audit the eyebrow
rode the decorative `--text-muted`, which dropped below AA in several
themes — see `engineering/decisions/2026-06-05-token-structure-audit.md`.)

**Exception — `title` layout.** Placing an inline-code paragraph
before `h1` triggers markdownlint MD041 (_first-heading-h1_) because
the paragraph becomes the first content element in the file. On title
slides the order is reversed: `h1` first (satisfies MD041), inline-code
eyebrow immediately after. CSS on
`section.title h1 + p:has(> code:only-child)` recognizes the swap.

**Note on `split-list`.** The inline-code eyebrow paragraph is placed
**between `h2` and `h3`** in the source. The CSS grid fallback routes
it to the left dark panel automatically.

### Subtitle labels

A paragraph containing only a single inline-code span, placed **below**
a heading, renders as body-font italic in `--text-secondary` — no pill, no
mono, no uppercase.

```markdown
## How signals move from input to decision.

`Four-stage processing pipeline — weekly cadence`
```

CSS pattern: `h* + p:has(> code:only-child)`. Layout-specific `> p`
rules (diagram, stats, title, closing, subtopic) govern container size
and color; the subtitle rule only strips the pill and applies italic.

This replaces the legacy `_em paragraph_` pattern for post-heading
descriptors — both are valid Markdown, but the inline-code form is more
explicit about intent.

**Exception — `title` layout.** On title slides the inline-code
paragraph after `h1` is claimed by the eyebrow rule, leaving no
inline-code slot for the subtitle. The subtitle is therefore a plain
paragraph placed immediately after the eyebrow:
`h1 → p:has(> code:only-child) → p`.

**What stays as `_em_`.** Table footnotes and body prose that happens
to be italic. These are not subtitles.

### Metadata pill (trailing inline code)

A trailing inline `code` span on a list row becomes a **pill** — a small,
fully-rounded status/metadata chip pinned to the end of the row.

```markdown
- Throughput target met `on track`
- API latency `at risk`
```

Authoring guidance: keep pill text to **one word (hyphenated is fine) or
two words at most**. Pills are `white-space: nowrap`, so a long phrase
will not wrap — it just makes a wide pill. (This is a guideline, not a
hard validator: enforcing a word count in CSS would require truncating
text, which hides content, so it is intentionally left to the author.)

**Pills share one structure, not one colour.** Every pill across every
layout draws its geometry — radius, proportional (em-based) padding, the
body sans, weight, tracking, and centre-/middle-aligned text — from the
universal `--pill-*` tokens in `base.tokens.css`. (Pills use the deck's
sans, not mono: a pill is a status / label chip, not code, and the sans
also vertically centres caps correctly where mono seats them high.) The
separate non-pill citation/identifier chips keep their own mono. Colour
stays per-pill:
a layout sets `--pill-fg` / `--pill-bg` / `--pill-border` (or its own
semantic hue tokens) to carry the meaning. Three pills are **sanctioned
variants** that deliberately override specific axes and document why at
their own CSS site: chart-status (a bar-matching semi-round chip),
list-tabular `register` (a wide "stamp"), and redline `.annotated`
(footnote superscript / positioned counter).

### Key Insight panel

Any card-bearing layout that ends with a trailing `> blockquote`
renders it as a **Key Insight panel** — an accent-tinted bar that pins
below the card content. Use it to surface the one takeaway the
audience should remember from a card-grid slide.

```markdown
<!-- _class: cards-grid -->

## The framework has four components.

- **Signal Intake.** Body text.
- **Scoring Model.** Body text.
- **Decision Log.** Body text.
- **Calibration Loop.** Body text.

> Key insight: signals without decisions are noise.
```

**Supported layouts:** `cards-grid`, `cards-stack`, `cards-side`,
`cards-wide`, `compare-prose`, `compare-table`, `verdict-grid`,
`featured`, `list`, `list-criteria`, `list-steps`, `list-tabular`,
`timeline`, `principles`, `tldr`, `matrix-2x2`, `decision`,
`before-after`, `actors`, `kpi`, `agenda`. Other layouts render
blockquote as default blockquote chrome.

### Below-Note

A short paragraph after a list/table/blockquote, prefixed by an em-dash
hairline rule. Use for caveats, footnotes, or qualifications that
shouldn't get card weight.

```markdown
<!-- _class: cards-grid -->

## …

- Card 1
- Card 2
- Card 3

— Note: figures are pre-audit; final numbers ship in Q3.
```

**Supported layouts:** same set as Key Insight Panel above —
`cards-grid`, `cards-stack`, `cards-side`, `cards-wide`,
`compare-prose`, `compare-table`, `verdict-grid`, `featured`, `list`,
`list-criteria`, `list-steps`, `list-tabular`, `timeline`,
`principles`, `tldr`, `matrix-2x2`, `decision`, `before-after`,
`actors`, `kpi`, `agenda`.

Renders as muted body text with a thin top border. Inherits the slide's
text color so it reads on either light or dark canvas.

### Annotation (HTML-comment register)

A trailing `<!-- annotation: text -->` HTML comment on any slide
renders as a corner overlay (top-right by default) for editorial or
process notes. Used during deck review to mark slides as `WIP`,
`needs-data`, `pending-legal`, etc.

```markdown
<!-- _class: content -->
<!-- annotation: WIP — numbers from May; needs June refresh -->

## …
```

Suppressed when `_class` includes `silent` (review chrome shouldn't
leak into final delivery).

### Annotation (italic-paragraph register)

A trailing paragraph whose only content is an `_italic_` span renders
as an annotation — a `✦` (U+2726) glyph in `--accent` followed by
smaller, muted, label-size text. No hairline rule. Distinct from a
below-note: lighter visual weight, lower information density, signals
"this is a footnote, not a continuation of the argument."

```markdown
<!-- _class: cards-grid -->

## Slide heading.

- Card Title 1
  - Card body.
- Card Title 2
  - Card body.

_Source: pilot retrospective, six months across four product teams._
```

CSS pattern: `p:has(> em:only-child)` — the paragraph must contain a
single `<em>` and nothing else (no leading/trailing text outside the
italic span). Glyph: `✦` at `0.95em` in `--accent`. Text: 15px
(`--fs-sm`) in `--text-secondary`. Use for source citations, scope
caveats, asterisk-style footnotes — content that *frames* the slide
rather than extending its argument.

**Supported layouts:** same set as Below-Note —
`cards-grid`, `cards-stack`, `cards-wide`, `compare-prose`,
`compare-table`, `verdict-grid`, `featured`, `list`, `list-criteria`,
`list-steps`, `list-tabular`, `timeline`, `principles`, `tldr`,
`matrix-2x2`, `decision`, `before-after`, `actors`, `kpi`, `agenda`.

### The three trailing-paragraph registers — comparison

The blockquote / plain-paragraph / italic-paragraph registers compose
by markdown shape on the same set of card-bearing layouts:

| Markdown shape | Renders as | Visual |
|---|---|---|
| `> blockquote` | **Key Insight** | accent-tinted panel, "KEY INSIGHT" eyebrow |
| Plain `<p>` (em-dash prefix) | **Below-Note** | hairline rule + body text |
| `<p>` containing only `_italic_` | **Annotation** | `✦` glyph + muted label-size text |

A slide may carry one Key Insight (blockquote) plus one trailing-
paragraph register (below-note OR annotation), in that order. See
`examples/gallery.md` slide 21 for key-insight + below-note,
slide 22 for key-insight + annotation.

### Labeled Corner Tag

The named-slot sibling of the numbered corner tag. On `before-after`,
`compare-prose`, and `decision`, the slot label sits at the top of
each card as a flush corner tag — same geometry as the numbered tag
(see Auto-Numbered Cards below), but the content is editorial text
instead of a counter. The card body fills from the top; no first line
is consumed by a label.

```markdown
<!-- _class: before-after -->

## Decisions used to require a quarterly re-litigation.

- Before
  - Every prioritization debate from first principles, average close 4 hours, billed as agility.
- After
  - Resolved against logged weights and prior outcomes, average close 18 min, billed as rigor.
```

**Layouts that support the labeled corner tag:** `before-after`,
`compare-prose`, `decision`.

**Authoring is plain.** Write the slot label as the first line of each
list item — no bold, no syntax. The build pipeline lifts it into a
`<strong>` automatically because in these named-slot layouts the
leading text is structurally a slot label, not editorial emphasis.
Authors don't carry presentational markup.

- Tag chrome matches the numbered corner tag — accent fill, white mono
  text, flush top-left geometry. The labeled and numbered variants are
  visually a family.
- `before-after` and `compare-prose` use the unified accent fill (their
  slots have semantic ordering: before/after, A/B). `decision` is the
  categorical case: each slot is an independent reason, so the tag and
  the bottom border cycle through the categorical palette (`--c1-dark`,
  `--c2-dark`, `--c3-dark`, …) — same palette and cycle as
  `kpi.trajectory`, inverted to the bottom edge so the two layouts read
  as siblings (kpi.trajectory = top accent, decision = bottom accent).
- Composes with `compare-prose` modifiers `chosen` / `decision` — the
  corner tag inherits the modifier's editorial signal.
- **`banner-tag` modifier** flips each card from a flush-corner tag
  into a full-width header strip:

  ```markdown
  <!-- _class: decision banner-tag -->
  ```

  The card becomes a vertical column-flex: tag fits its content height
  and spans the full card width; body stretches into the remaining
  height (vertically centred). Use when the slot label is the
  architectural signal of the card — the categorical case (`BUILD` /
  `WHY NOT BUY` / `WHY NOT DELAY`) — rather than a quiet marker.
  Default flush-corner stays for the editorial register where the body
  owns the card. Same lift infrastructure feeds both styles, so
  authoring is unchanged. Composes with all existing modifiers
  (`chosen`, `decision`, `mirror`, `vertical`).
- Named-slot only — `before-after`, `compare-prose`, and `decision`
  exist precisely to label their cards. Other card-bearing layouts
  (`cards-grid`, `cards-stack`, etc.) keep the in-card title row
  because their card titles are editorial sentences, not categorical
  labels.

### Auto-Numbered cards

A card-bearing layout authored as `ol` (`1. … 2. … 3.`) instead of
`ul` (`- … - … - …`) automatically stamps an accent corner tag on each
card with the index. Use whenever the cards carry a sequence —
problem → cause → fix, or step 1 → step 2 → step 3.

```markdown
<!-- _class: cards-grid -->

## Signal Intake produces three outputs.

1. Weekly Signal Brief
   - A ranked list of the top 10 signals…
2. Anomaly Alerts
   - Real-time flags when a signal exceeds the 2σ threshold…
3. Monthly Signal Index
   - The source of truth for the calibration loop…
```

> **Indentation rule for `ol`:** sublists must be indented **3 spaces**
> to clear the `1. ` prefix. 2 spaces breaks the nesting — Markdown
> treats it as a sibling list, not a child list.

**Layouts that auto-number when authored as `ol`:** `cards-grid`,
`cards-side`, `cards-stack` (incl. `horizontal`), `cards-wide`, `list`,
`list-criteria`, `list-steps`, `list-tabular`, `split-list`, `timeline`,
`principles`.

Each layout owns its own counter style (corner tag, header pill, mono
rail, "STEP 01" prefix, large accent block, circle node — see each
component's `<name>.docs.md`).

---

## Universal variants

Opt-in via `_class:`. Compose with any layout. The full set is defined
in `lib/components/index.js` as `UNIVERSAL_GROUPS`.

### `dark`

Reskins the slide canvas using the palette's `--dark-*` tokens. The
same layout structure works on either canvas. The dark bookend layouts
(`title`, `divider`, `closing`) include `dark` in their default chrome.

```markdown
<!-- _class: content dark -->
```

> **Not universal:** `cover` (the chart full-bleed-with-caption modifier)
> is **not** a universal variant — it is scoped to the chart family,
> registered as a `cover` variant on the charts that support it (radar,
> piechart). See those components' docs. Don't confuse it with image's
> own **`full`** photo variant.

### `mirror`

Flips the asymmetric half of a layout left/right. Applies only where
the layout has an inherent left/right asymmetry — symmetric grids
ignore it.

| Layout | Effect |
|---|---|
| `image` | image slot flips from right (default) to left. Alias of legacy `image left`. |
| `featured` | hero card moves from the left column to the right column. |
| `split-list` | accent panel moves from the left to the right. |
| `split-brief`, `split-statement`, `split-metric`, `split-steps` | same panel-flip semantics. |
| `compare-prose` | left and right cards swap; chosen/decision read from the left. |

```markdown
<!-- _class: image mirror -->
<!-- _class: compare-prose mirror chosen -->
```

`image left` is preserved as a deprecated alias for `image mirror`.
`mirror` composes with `full` and `contain` (e.g. `image full mirror`).

### `numbered`

Stamps an auto-incrementing index in the top-right corner of bookend
slides. Each layout carries its own counter — a `divider numbered`
series and a `closing numbered` series number independently.

| Layout | Counter token | Stamp position |
|---|---|---|
| `divider` | `lat-divider` | top-right |
| `subtopic` | `lat-subtopic` | top-right |
| `closing` | `lat-closing` | top-right |

```markdown
<!-- _class: divider numbered -->   → first stamps "01", next "02", …
<!-- _class: closing numbered -->   → independent counter, starts at "01"
```

The counter is set on `body` and walks the deck once. Authors do not
number sections manually — the layout does it.

### `silent`

Suppresses header, footer, and pagination on a single slide. Use on
bookend slides (`title`, `divider`, `closing`) where the dark canvas
should read uninterrupted, or to omit chrome from a single section
break.

```markdown
<!-- _class: title silent -->
```

Equivalent to writing all three Marp suppression directives
(`<!-- _paginate: false -->`, `<!-- _header: "" -->`,
`<!-- _footer: "" -->`) in one token.

### `scale-l` / `scale-xl` / `scale-2xl`

Bump the readable fonts on the slide up in lockstep. The typography
tokens are normalized for desk-distance reading; these steps raise the
global `--fs-scale` multiplier so body, supporting headings (h3–h6),
hero, and chrome all grow together — proportions hold, only the magnitude
moves. **The two largest headings (`h1`, `h2`) stay fixed** so slide
titles don't balloon or wrap; the body grows toward them instead. Reach
for these when a deck is headed to a projector, a large room, or needs an
accessibility bump — not to fix one oversized element (use the right
token for that).

| Class | Scale | Body lands at |
|---|---|---|
| `scale-l`   | ×1.15 | ~18 pt |
| `scale-xl`  | ×1.3  | ~21 pt |
| `scale-2xl` | ×1.5  | 24 pt  |

Scope is native Marp class scoping — the same class does both:

```markdown
<!-- _class: cards-grid scale-xl -->   <!-- this slide only -->
```

```yaml
---
marp: true
class: scale-xl                        # whole deck (front-matter directive)
---
```

Composes with any layout or variant (`dark`, `cards-grid`, …) since it
only sets one custom property. If a slide overflows at a higher scale,
it had too much content for that magnitude — split it or step down.

Coverage: tables (cells + headers), code blocks, quote text, and KaTeX
math all scale, alongside body, lists, and cards. The one structure it
does **not** reach is a **Mermaid diagram** — mermaid renders its own SVG
text at a fixed size, so a scaled slide grows the title and prose around
the diagram but not the labels inside it. Full contract:
`engineering/typography.md` §7.

### `with-period` / `no-period`

Typography variant pair. Default behavior: layouts that end headings
with a period (the Lattice editorial convention) — but some layouts
default to no-period. The pair lets authors override on a per-slide
basis.

### Tone tokens — `tone-pass`, `tone-warn`, `tone-fail`, `tone-skip`

Apply a semantic tone to the slide's accent strip. Used to signal
overall slide status (e.g. `tone-pass` for an "all green" KPI slide,
`tone-fail` for an alert slide).

```markdown
<!-- _class: kpi tone-warn -->
```

### State markers — `[x]`, `[-]`, `[ ]`, `[/]`

Three layouts — `checklist`, `verdict-grid`, and `obligation-matrix` —
accept state markers as a leading prefix on each item (or table cell).
The marker syntax, color tokens, **marks**, and class names are unified
so authors learn one vocabulary, and every layout renders identically.

```markdown
- [x] Done — succeeded / chosen
- [-] Partial — caveat / partial success
- [ ] Todo — not done / rejected
- [/] Out of scope — waived / N/A
```

Each marker is a **status-colored circle carrying a distinct mark**. The
mark *shape* carries the meaning independently of color — the
colour-blind-safe redundant channel — so the states stay unambiguous in
greyscale or for colour-vision-deficient viewers (the old fill-level
discs, distinguished only by how full they were, did not).

| Marker | Class | Token | Mark | Semantic |
|---|---|---|---|---|
| `[x]` | `state pass` | `--pass` | check (green) | succeeded, chosen, complete |
| `[-]` | `state warn` | `--warn` | dash (amber) | partial, caveat, qualified pass |
| `[ ]` | `state fail` | `--fail` | x (red) | not done, rejected, todo |
| `[/]` | `state skip` | `--text-muted` | slash (grey) | out of scope, waived, N/A (row struck through) |

**Why one convention covers all three.** `verdict-grid` evaluates
options against criteria, so `[ ]` reads as **rejected**; `checklist`
reports completion, so `[ ]` reads as **not yet done**;
`obligation-matrix` maps coverage, so `[ ]` reads as **not covered**. In
every case `[ ]` signals "this did not pass," and red + the x mark is
right either way — the difference between "rejected" and "todo" comes
from the layout's editorial framing, not a separate token.

**Style variants (`checks-*`).** The disc treatment is one of five
boardroom-ready styles, switchable per slide (`_class: checklist
checks-outline`) or per deck (`class: checks-bold`). The marks and
status colours never change — only the disc presentation:

| Variant | Disc treatment |
|---|---|
| *(default)* / `checks-ringed` | saturated fill + hairline darker ring + faint lift; knockout mark. Stays crisp on its own status-tinted row. |
| `checks-knockout` | flat saturated fill, knockout mark. Cleanest/classic. |
| `checks-bold` | larger disc + heavier marks, knockout. Reads across a room. |
| `checks-outline` | transparent fill + ring + status-colour mark. Editorial, low-ink. |
| `checks-tonal` | soft tint fill + ring + status-colour mark. Calm; best on plain (non-tinted) backgrounds. |

Each variant flips only scalar CSS knobs (`--state-fill-pct`,
`--state-ring-*`, `--state-mark-pct`, `--state-disc-scale`) at section
scope; the leaf disc mixes the actual colours from `--state-color` +
`--bg`, so variants stay theme-aware. See `base.modifiers.css`.

**Theme tokens:** `--pass`, `--warn`, `--fail` (disc fill + ring + left
bar) and `--pass-bg`, `--warn-bg`, `--fail-bg` (10% color-mix row
tints); `--text-muted` drives `[/]`. The knockout mark uses `--bg` (the
canvas), so it adapts to light/dark and to each theme. All foreground
tokens meet WCAG AA on body backgrounds. The `.heat` modifier remaps
`--state-color` to the load/risk axis and the discs follow.

**Implementation contract:** the marker is processed in three channels
that must stay in lockstep — Marp build (`marp.config.js`), emulator
(`lattice-emulator.js`), and VS Code preview (`lattice-runtime.js`).
Each strips the marker and adds
`class="state {pass|warn|fail|skip} {state-full|state-half|state-empty|state-slashed}"`
to the carrier element. The redesign changed only what those classes
*paint* (CSS), so the transforms are untouched and the three render
paths agree. CSS owns all visual chrome: the disc (`::before` / the
element) and the masked mark (`::after`).

### Treatments — `tint-*` and `mark-*`

27 utility classes for peripheral atmospheric accents — 12 tints
(gradient washes, vignettes) and 11 marks (SVG accent shapes), plus a
`treatment-none` reset. `tint-corner` and `tint-edge` carry a placement
axis (`at-tl`, `at-top`, etc.). All palette-blind via `var(--accent)`
so palette swap = treatment colour swap.

```markdown
<!-- _class: content tint-corner at-tl -->
<!-- _class: divider mark-orbit -->
<!-- _class: closing tint-vignette -->
```

Available classes: `treatment-none`, `tint-corner at-tl`, `mark-orbit`,
`tint-vignette`, `tint-edge at-right`, `mark-threads`, plus 21 more.

### Custom logo

A discreet author-supplied brand mark, top-right corner of every
slide. A build-stage rewriter injects `<img class="deck-logo"
src="…">` as the first child of each selected `<section>` — same
shape Marp uses for `<header>` and `<footer>`. CSS desaturates the
img to a faint grayscale watermark via `filter: grayscale(1)`,
inverting the brightness on dark-canvas layouts (`.title`,
`.divider`, `.closing`, `.dark`) so the mark stays legible on every
theme without per-author light/dark variants. Works on SVG, PNG, and
JPEG.

```yaml
---
logo: ./acme-logo.svg
logo-style: auto | brand          # optional, default `auto`
logo-on: all | title              # optional, default `all`
---
```

A real DOM element (rather than a `::before` pseudo) is what lets
the logo compose with every treatment — tints
(`tint-sweep`, `tint-spotlight`, `tint-corner at-tl`, `tint-vignette`, …) and
marks alike (`mark-orbit`, `mark-asterisks`,
`mark-grid`, `mark-chevron`, …). Each layer paints
independently.

**Three render paths must agree:**

1. `marp.config.js` — `applyDeckLogoToHtml(html, markdown)` runs in
   the `render()` wrapper alongside `applyChartFamilyToHtml`.
2. `lattice-emulator.js` — `require()`s the same helper from
   `marp.config.js` and calls it on the assembled HTML.
3. `lattice-runtime.js` — `applyDeckLogoFromFrontMatter()` mirrors
   the same DOM injection at view time for published HTML decks.

⚠️ **Build-time only for marp-vscode preview.** The extension doesn't
load workspace `marp.config.js` plugins, so the logo does not appear
there. The runtime path covers exported HTML viewed in a browser but
gracefully no-ops in the vscode-webview sandbox (fetch can't reach
workspace files). Same constraint `class: dark` has — see
`engineering/gotchas.md`.

**Brand style.** `logo-style: brand` adds `deck-logo-brand` to the
injected img. The silhouette mask is removed; the logo's original
colours render directly on a soft `--bg-alt` plate. Use when the
brand's colours carry meaning (government insignia, university
crests); reach for `auto` otherwise.

---

## Composition syntax

Modifiers compose space-separated after the layout name.

```markdown
<!-- _class: cards-grid compact dark -->
<!-- _class: closing accent -->
<!-- _class: list-steps phase -->
```

**Cascade rule:** when two modifiers tune the same variable (e.g.
`compact loose`), the last one in source wins. When modifiers tune
disjoint properties (e.g. `compact dark`), they compose without
conflict.

---

## Related

- `design/design-system.md §6.5` — the variant tier system (universal,
  semi-universal, layout-specific) and the rules manifests follow.
- `lib/shared/shared.docs.md` — the semi-universal modifiers
  (`compact`, `loose`, `accent`) that compose with most layouts.
- `lib/components/<name>/<name>.docs.md` — per-component contracts
  including layout-specific variants.
