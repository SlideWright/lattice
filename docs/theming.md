# Theming

Deep reference for authoring a Lattice palette. Covers the mental model
the engine has of a palette, the CSS variable contract, the per-diagram
Mermaid theming surface, and the parser limits a palette author needs
to know about.

> **First time here?** Start with `themes/README.md` — it's the
> one-screen mental model with ASCII diagrams and a five-minute
> scaffolded path. This file is the deep reference you graduate to
> when the README points you here.

## How to think about a palette

Two channels leave every palette file. The engine reads the file once
and routes each channel to its consumer:

```
 themes/<name>.css
 ─────────────────
   @theme <name>; @import 'lattice';

   :root {
     --bg, --accent, --cat-*, …        ╮
   }                                    │  channel 1
   :root { --dark-* }                   │  CSS variables
   :root { --hljs-* }                   │  ──────────────→  lattice.css
   :root { --mermaid-* }                ╯  via var(--token)  rules consume
                                                             the tokens at
                                                             every use site
   /* ===== MERMAID THEME CSS ===== */  ←  sentinel

   section .person { fill: … }          ╮
   section .venn-set-0 { … }            │  channel 2
   section .architecture-… { … }        │  Mermaid CSS  ──→  injected as
   …                                    ╯  (per-diagram)     themeCSS into
                                                             every Mermaid
                                                             SVG at build
                                                             time
```

The split exists because Mermaid exposes a `themeVariables` API for most
diagrams, but several types (journey, mindmap, c4, radar, venn, ishikawa,
treemap, packet, architecture, sankey) hardcode internal palettes that
ignore that API. Channel 2 is the patch surface for those gaps. Channel 1
is everything else — layout colours, ink, accents, semantic signals,
categorical hues, code syntax, and the slot tokens that Mermaid's
`themeVariables` API *does* respect.

Channel 1 is declarative: define the tokens, layouts pick them up.
Channel 2 is corrective: CSS selectors against rendered SVG, one rule
per Mermaid bug or gap. Authoring a new palette mostly edits channel 1
values and inherits channel 2 unchanged — because every override below
the sentinel uses `var(--token)`, your new values flow through without
touching a selector.

### Two lightness bands

Almost every colour choice collapses onto one rule: fills go in one of
two bands. The bands exist because Mermaid's kanban renderer applies
an internal lighten step (≈+10 lightness) before emitting fills. Feed
it L≈60 and it lands on L≈70 — pale enough for dark text, not invisible
on white. Feed it L≈90 and it lands on L≈100 — invisible.

```
   L ≈ 90  pale band       primary, secondary, all fillType*, pie slices,
                           gantt bars, sequence actor bg, c4 boxes, venn
                           sets, flowchart/sequence/class/ER/quadrant —
                           anywhere dark text sits on a colour
   L ≈ 60  mid-tone band   --cat-blue … --cat-mauve, cScale0..11, git0..7
                           — kanban lightens these in flight; mindmap and
                           actor pills consume them directly
   sat.    alarm only      --mermaid-error-bg, --mermaid-gantt-critical
                           — the deck's one saturated red, nowhere else
```

A palette that respects the bands inherits all the per-diagram overrides
correctly. A palette that pushes `--cat-*` to L≈90 to "make it pale"
breaks kanban; a palette that pushes the pale fills to L≈75 to "give them
some colour" breaks contrast on flowchart text. The two non-obvious
rules — kanban lightens, mindmap doesn't — are the entire reason for
the band split.

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
selectors against the rendered SVG). `themes/indaco.css` is the
canonical reference; every shipped palette follows this layout.

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

### Mermaid extensions

These are Mermaid-only color tokens. The slide layouts don't use them,
but the Mermaid theme variables map to them.

**Pale fills** (used for primary node backgrounds, sequence actor boxes,
gantt planned bars, etc.): `--mermaid-primary-color`, `--mermaid-secondary-color`.

**Borders and lines**: `--mermaid-border` (universal fill border that
reads on every pale surface — typically saturated brand navy), `--mermaid-line`
(arrows and signals — typically near-black).

**Mid-tone categorical palette** (8 hues; brand-level vars used by
`cScale0..11`, `git0..7`, and any layout that needs categorical colour
— e.g. actor pills): `--cat-blue`, `--cat-green`, `--cat-purple`,
`--cat-orange`, `--cat-teal`, `--cat-rose`, `--cat-slate`, `--cat-mauve`.
Pick at L≈60 because Mermaid's
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
  timeline, xy-chart) and remain visible — see docs/references/mermaid.md
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

The scaffolder is the fastest path. It copies `themes/indaco.css`,
rewrites the `@theme` directive, stamps `TODO(palette):` markers on
every value you're expected to change, and creates the matching
`<name>-dark.css` wrapper so the dark variant works on day one.

```sh
npm run new:theme verdigris
# → themes/verdigris.css       (starter palette, TODOs at every author-edit point)
# → themes/verdigris-dark.css  (3-line wrapper flipping color-scheme to dark)
```

Then, in order of impact:

1. **Brand axis** (`--brand-<hue>-deep`, `-mid`, `<hue>`). Pick three to
   five shades along a single hue; everything else hangs off them.
   `--bg-dark`, `--accent`, `--text-label`, and the spectrum gradient
   all derive from these.
2. **Surfaces** (`--bg`, `--bg-alt`, `--border`). Use `light-dark(…)`
   pairs so the dark variant works automatically.
3. **Ink ramp** (`--text-heading`, `-body`, `-label`, `-muted`,
   `--text-display`). Every text-bearing token must clear WCAG AA
   (4.5:1) against the surface it appears on.
4. **Accent** (`--accent`, `--accent-soft`, `--on-accent`). Most-seen
   colour after ink. Must clear contrast against `--bg` *and* against
   `--accent-soft`.
5. **Mermaid pale slots** (`--mermaid-primary-color`,
   `--mermaid-secondary-color`, `--mermaid-pie-*`). Pale band, L≈90.
   Used by flowchart/sequence/journey/pie/c4/venn fills.
6. **Categorical hues** (`--cat-blue` … `--cat-mauve`). Mid-tone band,
   L≈60. Used by kanban, mindmap, actor pills, corner tags. Inherit
   indaco's on a first pass if you don't have strong opinions.
7. **Dark-variant tokens** (`--dark-bg`, `--dark-text-*`, etc).
   Consumed by every `light-dark()` pair above and by `section.dark`.
8. **Semantic signals** (`--pass`, `--fail`, `--warn`). Usually the same
   green/red/amber across palettes; override if your brand specifies.

You can leave the per-diagram Mermaid CSS overrides untouched. They all
reference tokens by `var(--token)`, so your new colour values flow
through unchanged.

When the values look right:

```sh
# Build the regression galleries with your palette and inspect each PDF.
node lattice-emulator.js examples/gallery.md         /tmp/<name>.pdf         <name>
node lattice-emulator.js examples/mermaid-gallery.md /tmp/<name>-mermaid.pdf <name>
node lattice-emulator.js examples/kpi-gallery.md     /tmp/<name>-kpi.pdf     <name>
```

Then register the palette in `.vscode/settings.json` under
`markdown.marp.themes` so the Marp VS Code extension picks it up
for live preview.

### Authoring it by hand

If you prefer not to run the scaffolder:

1. Copy `themes/indaco.css` to `themes/<name>.css`.
2. Update the `@theme <name>` directive at the top of the file to match
   the filename (this is the value authors will type in front matter).
3. Edit the hex values in each `:root` block. Keep the variable names —
   the renderer's variable map references them by name.
4. Copy `themes/indaco-dark.css` to `themes/<name>-dark.css` and change
   the `@theme` directive and `@import` target to match.
5. Build a deck: `node lattice-emulator.js deck.md out.pdf <name>`.

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
