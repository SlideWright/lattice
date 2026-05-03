# Theming

How to author a new palette for Lattice. Covers the CSS variable contract,
the per-diagram Mermaid theming surface, and the Mermaid parser limits a
palette author needs to know about.

## Anatomy of a palette

A palette is one CSS file: `themes/<name>.css`. Every palette extends
the lattice engine via `@import 'lattice'` at the top of the file, then
contains:

1. A `@theme <name>` directive (Marp registration; e.g. `@theme indaco`).
2. An `@import 'lattice'` line (pulls in layouts + structural tokens).
3. A `:root` block defining color tokens used by `lattice.css`.
4. A `:root` block defining `--dark-*` tokens used by the `section.dark`
   variant for cover/divider/closing slides on a dark canvas.
5. A `:root` block defining `--hljs-*` tokens for code-block syntax colors.
6. A `:root` block defining `--mermaid-*` tokens — colors used only by
   Mermaid diagrams (mid-tone categorical hues, pie cycle slots, quadrant
   fills, gantt task states, note background, error fill).
7. A sentinel comment `/* ===== MERMAID THEME CSS ===== */`, after which
   the file contains per-diagram Mermaid CSS overrides.

Sections 3-6 define the *what* (color values). Section 7 defines the
*where* (which diagram element gets which value, expressed as CSS
selectors against the rendered SVG).

The renderer reads the palette file once. It hands sections 1-4 to the
slide CSS pipeline as palette tokens. It pulls section 5 out (split on
the sentinel) and hands it to Mermaid's `themeCSS` parameter. Both halves
of the palette ship in one file.

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

### Mermaid extensions

These are Mermaid-only color tokens. The slide layouts don't use them,
but the Mermaid theme variables map to them.

**Pale fills** (used for primary node backgrounds, sequence actor boxes,
gantt planned bars, etc.): `--mermaid-primary-color`, `--mermaid-secondary-color`.

**Borders and lines**: `--mermaid-border` (universal fill border that
reads on every pale surface — typically saturated brand navy), `--mermaid-line`
(arrows and signals — typically near-black).

**Mid-tone categorical palette** (8 hues used by `cScale0..11` and
`git0..7`): `--mermaid-mid-blue`, `--mermaid-mid-green`, `--mermaid-mid-purple`,
`--mermaid-mid-orange`, `--mermaid-mid-teal`, `--mermaid-mid-rose`,
`--mermaid-mid-slate`, `--mermaid-mid-mauve`. Pick at L≈60 because Mermaid's
kanban renderer applies a lighten step that brings emitted fills to L≈70.

**Pie cycle extension** (5 additional pale tints for slots 7-12):
`--mermaid-pie-yellow`, `--mermaid-pie-red`, `--mermaid-pie-slate`,
`--mermaid-pie-sage`, `--mermaid-pie-violet`. Slots 1-6 reuse the primary,
secondary, and four pie tints (`--mermaid-pie-purple`, `-orange`, `-teal`,
`-rose`) defined alongside the pale fills.

**Quadrant chart**: 4 fill tints + 4 dark text colors per quadrant.
`--mermaid-quadrant-1-fill`..`-4-fill`, `--mermaid-quadrant-1-text`..`-4-text`.

**Gantt task states**: `--mermaid-gantt-active`, `-active-border`,
`-done`, `-done-border`, `-critical`, `-critical-border`, `-today`, `-grid`.
Critical is the deck's one alarm color (saturated red); the rest are pale
state hues paired with their darker borders.

**Notes (sequence diagram)**: `--mermaid-note-bg`, `--mermaid-note-border`.
The yellow accent used by `Note over` blocks. Distinct from the rest of
the palette by design — notes signal "aside."

**Error**: `--mermaid-error-bg`, `--mermaid-error-text`. The deck's only
saturated red, paired with white text. Used by Mermaid's parser-error
rendering across all diagram types.

## The lightness contract

The default `indaco` palette uses two distinct lightness bands:

- **Pale band, L≈90.** Primary, secondary, tertiary, all `fillType*`,
  pie slices, gantt task bars, sequence actor backgrounds, and most
  light surfaces. Dark text reads on these with 13:1+ contrast.
- **Mid-tone band, L≈60.** `cScale0..11` and `git0..7`. Fed at L≈60
  because Mermaid's kanban renderer applies an internal lighten step
  that brings emitted fills to L≈70 (where dark text still reads cleanly).

A new palette should respect the same band split. If you push cScale to
L≈90 to match the rest, kanban will lighten further and emit fills near
L≈100 — invisible against the white canvas.

Colors that ignore the bands:

- **Borders** (`--mermaid-border`): saturated, picked to read on every
  pale fill including white.
- **Lines** (`--mermaid-line`): near-black, on the white canvas.
- **Alarm states** (`--mermaid-error-bg`, `--mermaid-gantt-critical`):
  saturated red, the only place the deck breaks the pale-only rule.
- **Note background**: pale yellow, the one yellow tint, used as a
  category-distinct accent.

Every text-bearing token must clear WCAG AA (4.5:1) against the surface
it appears on. Decorative tokens (borders, hairlines, muted chrome,
spectrum gradient) are WCAG-exempt.

## The per-diagram Mermaid theming surface

Mermaid exposes a `themeVariables` API for theming most diagram types,
but several diagrams hardcode their internal palettes or expose no
configuration at all. The `themes/indaco.css` file ships per-diagram CSS
overrides for the gaps. A new palette must include these too — either
copying from `indaco.css` and updating colors, or omitting if you accept
Mermaid's default rendering for those diagrams.

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
  timeline, xy-chart) and remain visible — see references/mermaid.md
  §5.4 for the full convention and the diagnostic recipe.

## Mermaid parser limits

Two structural limits affect what you can put in the Mermaid CSS section:

**No CSS comments inside themeCSS.** Mermaid's `%%{init}%%` directive
parser silently rejects the entire `themeCSS` field if it contains
`/* ... */` blocks. The renderer strips comments before injection.
Comments are valid in the palette file source — just understand they
won't reach the rendered SVG.

**No `>` child combinator.** The `>` character breaks the init parser
the same way as comments. Use descendant selectors (`a b`) instead of
child selectors (`a > b`) in the Mermaid CSS section. Both are valid
CSS; only one survives Mermaid's init parser.

If your override silently fails to apply (the rule is in your palette
file but not in the rendered SVG), check for these two patterns first.

## Authoring a new palette

1. Copy `themes/indaco.css` to `themes/<name>.css`.
2. Update the `@theme <name>` directive at the top of the file to match
   the filename (this is the value authors will type in front matter).
3. Edit the hex values in each `:root` block. Keep the variable names —
   the renderer's variable map references them by name.
4. Decide whether the per-diagram Mermaid CSS section needs updating.
   For most palettes, the same selectors work; you'll just want to
   verify the pale fills reference your new color values rather than
   the original ones.
5. Register the palette in `.vscode/settings.json` under
   `markdown.marp.themes` so the Marp VS Code extension picks it up.
6. Build a deck: `node lattice.js deck.md lattice.css out.pdf <name>`.
7. Re-render `examples/mermaid-gallery.md` with your palette to verify
   every diagram type renders correctly.

## Verifying a palette

Two checks worth running:

**Contrast**: every text-bearing token against every surface it appears
on should clear 4.5:1 WCAG AA. Use a tool like Stark, Colorable, or
WebAIM's contrast checker. The default palette documents its measured
ratios in the `:root` block comments — adapt similar comments for your
palette.

**Mermaid render**: re-render the diagram gallery and visually inspect
each slide. The likely failure modes are:

1. cScale fed too pale → kanban renders fills at L≈100 (invisible).
2. cScale fed too saturated → mindmap text becomes unreadable.
3. Borders too pale → flowchart/sequence/class boxes don't read against
   the canvas.
4. Per-diagram override referenced a CSS variable name that doesn't exist
   in your palette → silent fallback to Mermaid's defaults.
