# Theming

How to author a new palette for Lattice. Covers the CSS variable contract
and the diagram-token taxonomy.

## Anatomy of a palette

A palette is one CSS file: `themes/<name>.css`. Every palette extends
the lattice engine via `@import 'lattice'` at the top of the file, then
contains:

1. A `@theme <name>` directive (Marp registration; e.g. `@theme indaco`).
2. An `@import 'lattice'` line (pulls in layouts, structural tokens, and
   the diagram overrides).
3. A `:root` block defining color tokens used by `lattice.css` (surfaces,
   ink, accents, semantic signals).
4. A `:root` block defining `--dark-*` tokens used by the `section.dark`
   variant for cover/divider/closing slides on a dark canvas.
5. A `:root` block defining `--hljs-*` tokens for code-block syntax colors.
6. A `:root` block defining `--diagram-*` tokens — colors consumed by
   Mermaid diagrams (band cycle with paired text, structural stroke/line,
   quadrant fills, gantt state, note background, error fill).

Palettes are token-only. The per-diagram CSS overrides (`section .section-N
rect { fill: var(--diagram-band-3) }` and the rest) live in
`lattice.css`'s **DIAGRAM OVERRIDES** section at the bottom of the file
— palette-blind, loaded by every render path, applied to the inline SVG
via the host page cascade. Authoring a new palette is purely a
token-declaration job; no per-palette CSS rules are needed.

See `docs/notes/2026-05-12-diagram-tokens.md` for the architectural
rationale (why no `themeCSS` init parameter, why role-named tokens, why
contrast is asserted in `test/unit/contrast.test.js`).

## The variable contract

Every palette must define every variable below. A missing variable falls
through to the cascade root (typically unstyled), which makes gaps easy
to spot during palette development.

### Surfaces and ink (slide layouts)

| Token | Role |
|---|---|
| `--bg` | Slide canvas |
| `--bg-alt` | Card fill, alternate row, secondary surface |
| `--bg-dark` | Dark panel canvas (title, divider, closing) |
| `--border` | Hairline rule on light surfaces |
| `--text-display` | Text on dark surfaces |
| `--text-heading` | Primary text on light surfaces |
| `--text-body` | Body prose |
| `--text-label` | Mono eyebrows, small labels |
| `--text-muted` | Footnotes, chrome, decorative |
| `--accent` | Saturated brand color used for emphasis text and borders |
| `--accent-soft` | Pale brand-tinted panel fill |
| `--code-text` | Code text on dark code surface |

### Semantic signals

| Token | Use |
|---|---|
| `--pass` | Success indicator (badges, checkmarks) |
| `--fail` | Failure indicator |
| `--warn` | Warning indicator |
| `--pass-bg`, `--fail-bg`, `--warn-bg` | Tinted backgrounds for badges |

### Dark variant (slide reskin)

| Token | Role |
|---|---|
| `--dark-bg`, `--dark-bg-alt`, `--dark-border` | Surfaces |
| `--dark-text-heading`, `--dark-text-body`, `--dark-text-display` | Ink |
| `--dark-text-label`, `--dark-text-muted` | Chrome |

These tokens are inputs to the surface tokens via `light-dark()` — see
the [Dark mode](#dark-mode) section below. They also remain available
directly for any layout (e.g. `section.title`) that wants the dark canvas
regardless of the deck's color-scheme.

## Dark mode

The dark canvas is driven by the native CSS `color-scheme` cascade plus
`light-dark()` resolution on the surface tokens. No engine plugins, no
class-list surgery, no per-renderer logic — the same mechanism works in
marp-cli, the lattice emulator, and the VS Code Marp preview.

### Authoring paths

There are four ways to get a dark canvas:

| Goal | Front-matter / source |
|---|---|
| Whole deck dark, simplest | `theme: cuoio-dark` (or `indaco-dark`) — a 3-line wrapper that does the next path internally. |
| Whole deck dark, any theme | `style: ":root{color-scheme:dark}"` — Marp's native `style:` directive, one line. |
| Follow viewer's OS preference | `style: ":root{color-scheme:light dark}"` — `light-dark()` resolves per the viewer's `prefers-color-scheme`. |
| Single slide on an otherwise-light deck | `<!-- _class: dark -->` on that slide — `section.dark { color-scheme: dark }` flips just that section. |

Default is light. With no directive, `:where(:root) { color-scheme: light }`
applies at zero specificity, so any author override wins the cascade
automatically (no `!important` needed).

### How it resolves

Each palette declares surface tokens like
`--bg: light-dark(<light>, <dark>)`. The browser resolves the function
at every use site based on the computed `color-scheme` of the element:

- At `:root` scope, the deck-wide author override (`style:` directive or
  variant theme) sets the scheme; every section inherits.
- At section scope, `section.dark { color-scheme: dark }` overrides
  inheritance for that one element and its descendants.
- Inside Mermaid SVGs, `light-dark()` doesn't propagate cleanly because
  Mermaid renders the SVG in an isolated context. The lattice emulator's
  palette parser collapses `light-dark()` to the side that matches the
  palette's declared color-scheme before passing colors to Mermaid's
  themeVariables, so dark variants render dark diagrams and light decks
  render light diagrams. Author-flipped decks via `style:` still need the
  matching theme variant if they care about diagram color (the variant
  is the only signal the palette parser sees).

### highlight.js syntax

| Token | Highlight class |
|---|---|
| `--hljs-comment` | `.hljs-comment, .hljs-quote` |
| `--hljs-keyword` | `.hljs-keyword, .hljs-selector-tag, .hljs-addition` |
| `--hljs-number` | `.hljs-number, .hljs-literal, .hljs-built_in` |
| `--hljs-string` | `.hljs-string, .hljs-doctag, .hljs-regexp` |
| `--hljs-title` | `.hljs-title, .hljs-section, .hljs-function` |
| `--hljs-variable` | `.hljs-variable, .hljs-attr, .hljs-tag` |
| `--hljs-punctuation` | `.hljs-punctuation, .hljs-operator` |

### Diagram tokens (`--diagram-*`)

Role-named, palette-blind tokens consumed by `lattice.css`'s DIAGRAM
OVERRIDES section and by the renderer bridges (`lattice-runtime.js`,
`lattice-emulator.js`). Slide layouts don't use them; they're scoped to
the diagram layer.

**Band cycle** (12 pale-fill slots, paired with AA-tested text). The
canonical categorical surface: timeline periods, kanban columns, mindmap
levels, journey sections, c4 layers, pie slices, treemap leaves, gitgraph
label pills. Slot 1 doubles as the primary fill for any single-band
diagram (flowchart node, sequence actor).

- `--diagram-band-1`..`--diagram-band-12` — pale fills at L≈90.
- `--diagram-band-text-1`..`--diagram-band-text-12` — paired text colors.
  Pin to a fixed dark hex (not `light-dark(--text-heading,…)`); the band
  itself stays pale in dark mode, so the text on top must too.
  `test/unit/contrast.test.js` asserts each pair clears 4.5:1 in light
  and dark.

**Structural**

- `--diagram-stroke` — universal fill border. Saturated, reads on every
  band tint including white.
- `--diagram-line` — edges and arrows. Near-black on light canvas; uses
  `light-dark()` so it flips on dark canvases (where edges run on the
  dark surface, not inside a band fill).
- `--diagram-accent-warm` — radar's second curve, where a single warm
  hue against the cool band reads better than a second pale tint.

**Mid-tone categorical** (consumed beyond the diagram layer too — KPI
cards, chart-family lines, gitgraph dots). 8 hues at L≈60 (indaco) or
L≈30-45 (cuoio). Role name kept as `--cat-*` to signal "brand-level
categorical, not diagram-only": `--cat-blue`, `--cat-green`, `--cat-purple`,
`--cat-orange`, `--cat-teal`, `--cat-rose`, `--cat-slate`, `--cat-mauve`.
Pick indaco's at L≈60 because Mermaid's kanban renderer applies a lighten
step that brings emitted fills to L≈70 — fed L≈90 they'd clamp toward
white and disappear.

**Quadrant chart** (4-slot tonal ladder, fill + text paired):
`--diagram-quadrant-1-fill`..`-4-fill`, `--diagram-quadrant-1-text`..`-4-text`.

**State** (gantt task lifecycle — semantic, not a band cycle):
`--diagram-state-active`, `-active-stroke`, `-done`, `-done-stroke`,
`-critical`, `-critical-stroke`, `-today`, `-grid`. `state-critical` is
the deck's one alarm color (saturated red); the rest are pale state hues
paired with their darker strokes.

**Note (sequence diagram aside)**: `--diagram-note-bg`,
`--diagram-note-stroke`. Distinct from the rest of the palette by design
— notes signal "aside."

**Error / alarm**: `--diagram-error-bg`, `--diagram-error-text`. Saturated
red paired with fixed white text. Used by Mermaid's parser-error rendering
across all diagram types. Pin text to white (not `var(--bg)`, which would
flip to dark in dark mode and fail AA on the saturated red).

## The card-on-band rule

> **Band coloring stops at one level of nesting.**

When a diagram has an outer categorical grouping that contains inner
items, the band carries the category and the inner item is a neutral
`--bg-alt` card. When a diagram has no outer grouping — items
themselves are the categorical signal — each item gets its own band
tint.

| Pattern | Outer section | Inner item | Used by |
|---|---|---|---|
| **Card-on-band** | `--diagram-band-N` | `--bg-alt` card, `--text-heading` text | kanban, timeline, journey |
| **Tile-per-element** | (none) | `--diagram-band-N` per item, `--diagram-band-text-N` text | treemap, mindmap, gitgraph, quadrant |

Why this rule:

- **One signal per hue.** The band always means "category." Inner cards
  always mean "structural — I belong to the category above me, not to
  another category." The viewer learns the grammar once.
- **Figure/ground at projector distance.** `--bg-alt` is value-distinct
  from every pale band tint; a card on a band remains legible from
  across a boardroom. Hue-on-hue (band-N inside band-M) collapses at
  distance.
- **No new contrast pairs.** Text on `--bg-alt` uses `--text-heading`,
  already AA-tested in `test/unit/contrast.test.js` for every palette
  in both modes. Section header text on band-N keeps using
  `--diagram-band-text-N`, also AA-asserted. The rule re-uses pairs
  rather than introducing new ones.

Sites in `lattice.css`'s DIAGRAM OVERRIDES section that implement the
rule: the **CARD-ON-BAND ELEVATION** block (kanban + timeline) and the
**JOURNEY** block (tasks flattened to `--bg-alt`). Design rationale
captured in `docs/notes/2026-05-12-diagram-elevation.md`.

## The lightness contract

The default `indaco` palette uses two distinct lightness bands:

- **Pale band, L≈90.** `--diagram-band-1..12`, quadrant fills, gantt task
  bars (via `taskBkgColor`), sequence actor backgrounds, pie slices, and
  most light surfaces. Dark text reads on these with 13:1+ contrast.
- **Mid-tone band, L≈60.** `--cat-*` (feeds `cScale0..11` and `git0..7`).
  Fed at L≈60 because Mermaid's kanban renderer applies an internal
  lighten step that brings emitted fills to L≈70 (where dark text still
  reads cleanly).

A new palette should respect the same band split. If you push cScale to
L≈90 to match the rest, kanban will lighten further and emit fills near
L≈100 — invisible against the white canvas.

Colors that ignore the bands:

- **Strokes** (`--diagram-stroke`): saturated, picked to read on every
  band fill including white.
- **Lines** (`--diagram-line`): near-black on light canvas, light on dark.
- **Alarm states** (`--diagram-error-bg`, `--diagram-state-critical`):
  saturated red, the only place the deck breaks the pale-only rule.
- **Note background**: pale yellow (indaco) or parchment+saddle (cuoio),
  category-distinct accent.

Every text-bearing token must clear WCAG AA (4.5:1) against the surface
it appears on, in both light and dark mode. `test/unit/contrast.test.js`
asserts this on every shipped palette; new palettes inherit the assertion
automatically. Decorative tokens (borders, hairlines, muted chrome,
spectrum gradient) are WCAG-exempt.

## The per-diagram Mermaid theming surface

Mermaid exposes a `themeVariables` API for theming most diagram types,
but several diagrams hardcode their internal palettes or expose no
configuration at all. `lattice.css`'s DIAGRAM OVERRIDES section ships
per-diagram CSS overrides for the gaps. The rules are palette-blind
(they consume `var(--diagram-*)`), so a new palette gets them
automatically by defining the token contract — no per-palette CSS rules
are needed.

The current overrides cover:

- **Journey** — Mermaid hardcodes X11 named colors for sections. Override
  forces section bars and task tiles to pale fills with dark text.
- **Mindmap** — reads `cScale*` verbatim with no transformation. The
  mid-tone inputs render too saturated. Override forces pale fills per
  level. The root node has both `.section-root` and `.section--1` classes
  with conflicting hardcoded fills; both are overridden.
- **Kanban** — applies its own lighten step. With our mid-tone inputs
  this lands on the pale band, but the column section colors need
  explicit overrides to stay distinct per column.
- **C4** — uses hardcoded C4-Plant colors. The override repaints person,
  system, container, component fills to pale brand tints. Note: C4 emits
  some elements with inline `fill=` attributes that CSS selectors can
  reach but only with `!important` and high specificity.
- **Radar** — no per-curve theme variables. Override forces saturated
  blue + saturated orange curves with semi-transparent fills, plus
  pale-blue concentric grid (the default is gray).
- **Venn** — no per-set theme variables. Override forces three pale
  fills at full opacity, navy borders, and dark text on labels (which
  Mermaid otherwise tints with the set color).
- **Ishikawa** — internal palette baked in. Override forces pale branch
  heads with dark text.
- **Treemap** — applies its own lighten cycle. Override forces six
  per-cycle pale hues so the tree reads as categorical (matching
  quadrant's approach).
- **Flowchart** — node shape paths bypass `.node rect` selectors in some
  cases. Override targets `.node .label-container` to ensure all shape
  types pick up the pale fill.
- **Gitgraph** — branch label boxes (`.branchLabelBkg.label0..7`) need
  pale fills with dark text. The branch dots and lines stay mid-tone for
  trace visibility. Arrow paths default to black fill (drawing wedges
  between branches); override forces `fill: none`.
- **Gantt** — `taskTextOutsideLeft/Right` ignores `taskTextOutsideColor`
  in some renderer paths. Override forces dark text in the outside-bar
  margin. Documented Mermaid bug.
- **Diagram titles (all types)** — Mermaid renders its own `title`
  directive (or YAML frontmatter `title:`) inside the SVG, doubling up
  with the slide's `## heading`. The palette suppresses the in-SVG title
  for every diagram type with a CSS class on the title element:
  `.titleText` (gantt), `.pieTitleText` (pie), `.radarTitle` (radar),
  `.packetTitle` (packet), and the `[class$="TitleText"]` safety net
  (flowchart, class, ER, requirement, gitgraph). Six types render bare
  `<text>` titles with no class (sequence, journey, C4, quadrant,
  timeline, xy-chart) and remain visible — see docs/references/mermaid.md
  §5.4 for the full convention and the diagnostic recipe.

## Avoid in diagram CSS

One Chromium quirk in the Marp preview is worth knowing about even though
we no longer route through Mermaid's themeCSS init parameter:

**Avoid `:not(:has(...))` and `:is(:has(...), :has(...))` in the DIAGRAM
OVERRIDES section.** Silently broken in the marp-vscode preview Chromium
build (it ignores the rule rather than failing loudly). Plain `:has()` is
fine; nested `:has()` inside `:not()` / `:is()` isn't. See
`docs/references/gotchas.md`.

## Authoring a new palette

1. Copy `themes/indaco.css` to `themes/<name>.css`.
2. Update the `@theme <name>` directive at the top of the file to match
   the filename (this is the value authors will type in front matter).
3. Edit the hex values in each `:root` block. Keep the variable names —
   the renderer's variable map references them by name.
4. Register the palette in `.vscode/settings.json` under
   `markdown.marp.themes` so the Marp VS Code extension picks it up.
5. Build a deck: `node lattice-emulator.js deck.md out.pdf <name>`.
6. Re-render `examples/mermaid-gallery.md` with your palette to verify
   every diagram type renders correctly.
7. Run `node --test test/unit/*.test.js` — the contrast assertions will
   catch any band/text pair that slips below AA.

## Verifying a palette

Two checks worth running:

**Contrast**: `test/unit/contrast.test.js` parses every shipped palette
and asserts AA on every band/text pair, quadrant pair, `--text-heading`
on `--bg`/`--bg-alt`, and `--diagram-error-text` on `--diagram-error-bg`
— in both light and dark. Add your new palette to the test's loop (the
`['indaco', 'cuoio']` literal). If a pair fails, lift the text (darker
on light, lighter on dark) or lift the surface; don't lower the bar.

**Mermaid render**: re-render the diagram gallery and visually inspect
each slide. The likely failure modes are:

1. cScale fed too pale → kanban renders fills at L≈100 (invisible).
2. cScale fed too saturated → mindmap text becomes unreadable.
3. Strokes too pale → flowchart/sequence/class boxes don't read against
   the canvas.
4. A `--diagram-*` token your palette didn't define — `lattice.css`'s
   DIAGRAM OVERRIDES rules will fall through to Mermaid's defaults.
   Run `test/unit/palette.test.js` to catch missing tokens.
