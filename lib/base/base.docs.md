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
| `base.decorations.css` | 27 decoration utility classes (`bg-corner-tl`, `bg-orbit-br`, `bg-vignette`, etc.) for peripheral atmospheric accents. |

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
letter-spacing, uppercase, `--text-muted`. Dark bookend slides (title,
divider, closing) override the color to `--on-dark-secondary` /
`--on-dark-ghost` automatically.

**Exception — `title` layout.** Placing an inline-code paragraph
before `h1` triggers markdownlint MD041 (_first-heading-h1_) because
the paragraph becomes the first content element in the file. On title
slides the order is reversed: `h1` first (satisfies MD041), inline-code
eyebrow immediately after. CSS on
`section.title h1 + p:has(> code:only-child)` recognizes the swap.

**Note on `split-panel`.** The inline-code eyebrow paragraph is placed
**between `h2` and `h3`** in the source. The CSS grid fallback routes
it to the left dark panel automatically.

### Subtitle labels

A paragraph containing only a single inline-code span, placed **below**
a heading, renders as body-font italic in `--text-muted` — no pill, no
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
`featured`, `kpi`. Other layouts render blockquote as default
blockquote chrome.

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

Renders as muted body text with a thin top border. Inherits the slide's
text color so it reads on either light or dark canvas.

### Annotation

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
`list-criteria`, `list-steps`, `list-tabular`, `split-panel`, `timeline`,
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

### `mirror`

Flips the asymmetric half of a layout left/right. Applies only where
the layout has an inherent left/right asymmetry — symmetric grids
ignore it.

| Layout | Effect |
|---|---|
| `image` | image slot flips from right (default) to left. Alias of legacy `image left`. |
| `featured` | hero card moves from the left column to the right column. |
| `split-panel` | accent panel moves from the left to the right. |
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

### State markers — `[x]`, `[-]`, `[ ]`

Two layouts — `verdict-grid` and `checklist` — accept state markers as
a leading prefix on each list item. The marker syntax, color tokens,
glyphs, and class names are unified so authors learn one vocabulary.

```markdown
- [x] Done — succeeded / chosen
- [-] Partial — caveat / partial success
- [ ] Todo — not done / rejected
```

| Marker | Class | Token | Glyph | Semantic |
|---|---|---|---|---|
| `[x]` | `state pass` | `--pass` | ✓ (green) | succeeded, chosen, complete |
| `[-]` | `state warn` | `--warn` | – (amber) | partial, caveat, qualified pass |
| `[ ]` | `state fail` | `--fail` | ✗ on `verdict-grid`, ☐ on `checklist` (red) | not done, rejected, todo |

**Why one convention covers both layouts.** `verdict-grid` evaluates
options against criteria — every cell got a verdict, so `[ ]` reads as
**rejected**. `checklist` reports completion — items either done,
partial, or **not yet done**. In both cases, `[ ]` signals "this did
not pass." Red is the right color either way; the difference between
"rejected" and "todo" comes from the layout's editorial framing, not a
separate token.

**Glyphs differ by layout** because each picks the most readable shape
for its content density: `verdict-grid` packs many states into a small
chip row, so the binary ✗ is clearest; `checklist` gives each row full
width, so the empty checkbox ☐ — which matches the markdown source
`[ ]` literally — is more legible at body size.

**Theme tokens:** `--pass`, `--warn`, `--fail` (foreground glyph + left
bar) and `--pass-bg`, `--warn-bg`, `--fail-bg` (10% color-mix row
tints). All foreground tokens meet WCAG AA on body backgrounds.

**Implementation contract:** the marker is processed in three channels
that must stay in lockstep — Marp build (`marp.config.js`:
`verdictGridBadges`, `checklistItemStates`), emulator
(`lattice-emulator.js`), and VS Code preview (`lattice-runtime.js`:
`transformVerdictGridBadges`, `transformChecklistItemStates`). Both
layouts strip the marker and add `class="state pass|warn|fail"` to the
carrier element. CSS owns all the visual chrome from there.

### Decoration backgrounds — `bg-*`

27 utility classes for peripheral atmospheric accents (gradient washes,
SVG accent marks, vignettes). All palette-blind via `var(--accent)` so
palette swap = background color swap.

```markdown
<!-- _class: content bg-corner-tl -->
<!-- _class: divider bg-orbit-br -->
<!-- _class: closing bg-vignette -->
```

Available classes: `bg-none`, `bg-corner-tl`, `bg-orbit-br`,
`bg-vignette`, `bg-edge-right`, `bg-thread-diagonal`, plus 21 more.

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

- `docs/design-system.md §6.5` — the variant tier system (universal,
  semi-universal, layout-specific) and the rules manifests follow.
- `lib/shared/shared.docs.md` — the semi-universal modifiers
  (`compact`, `loose`, `accent`) that compose with most layouts.
- `lib/components/<name>/<name>.docs.md` — per-component contracts
  including layout-specific variants.
