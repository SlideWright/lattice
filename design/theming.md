# Theming

How to author a new palette for Lattice. Covers the CSS variable contract
and the categorical-token taxonomy.

> **First time here?** Start with `themes/README.md` — it's the
> one-screen mental model and a five-minute scaffolded path. This file
> is the deep reference you graduate to when the README points you here.
> The lightness contract that governs every fill choice is at the end
> of this file under **The lightness contract**.

## Anatomy of a palette

A palette is one CSS file: `themes/<name>.css`. Every palette extends
the lattice engine via `@import 'lattice'` at the top of the file, then
contains:

1. A `@theme <name>` directive (Marp registration; e.g. `@theme indaco`).
2. An `@import 'lattice'` line (pulls in layouts, structural tokens, and
   the universal semantic palette + diagram overrides).
3. A `:root` block defining color tokens used by `lattice.css` (surfaces,
   ink, accents, semantic signals).
4. A `:root` block defining `--dark-*` tokens used by the `section.dark`
   variant for cover/divider/closing slides on a dark canvas.
5. A `:root` block defining `--hljs-*` tokens for code-block syntax colors.
6. A `:root` block defining `--c-*` tokens — the categorical palette
   (12-slot paired light/dark cycle, paired ink, structural stroke/line,
   plus optional overrides of the universal semantic palette).

Palettes are token-only. The per-diagram CSS overrides (`section .section-N
rect { fill: var(--c3-light) }` and the rest) live in `lattice.css`'s
**DIAGRAM OVERRIDES** section at the bottom of the file — palette-blind,
loaded by every render path, applied to the inline SVG via the host page
cascade. Authoring a new palette is purely a token-declaration job; no
per-palette CSS rules are needed.

See `engineering/decisions/2026-05-12-diagram-tokens.md` for the architectural
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

Custom-logo authors point `logo:` in front matter at an image file.
A build-stage rewriter injects `<img class="deck-logo">` as the
first child of each section; CSS desaturates the img to a faint
grayscale watermark via `filter`, inverting the brightness on
dark-canvas layouts so the mark stays legible without a theme-specific
asset. See [lib/base/base.docs.md § Custom logo](../lib/base/base.docs.md)
for the authoring contract.

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

### Categorical tokens (`--c-*`)

Role-named, palette-blind tokens consumed by `lattice.css`'s DIAGRAM
OVERRIDES section and by the renderer bridges (`lattice-runtime.js`,
`lattice-emulator.js`). Slide layouts also consume them directly for
nth-child cycles (decision list, roadmap horizons, actor pills, kpi
trajectory).

**Categorical cycle** (12 paired slots, light + dark tiers).

- `--c1-light`..`--c12-light` — pale fills at L≈87. The canonical
  categorical surface: timeline periods, kanban columns, mindmap
  levels, journey sections, c4 layers, pie slices, treemap leaves,
  gitgraph label pills. Slot 1 doubles as the primary fill for any
  single-band diagram (flowchart node, sequence actor).
- `--c1-dark`..`--c12-dark` — deep strokes / inks at L≈32. Saturated
  marks: decision-list deep accents, piechart wedges, gitgraph branch
  dots, sankey nodes, kpi trajectory borders, xy-chart plot palette,
  Mermaid cScale feeds.

Each pair is generated via the Brand-triad strategy in
`themes/palette-audit.md` (rank-1 proposal per theme). The audit
deck scores five strategies × 13 themes and shows the resolved hex
swatches; copy the rank-1 values into your new palette for a
known-good starting point.

**Paired ink** (non-flipping):

- `--c-ink-light` — dark text colour paired with every `--cN-light`
  fill. Pin to a fixed dark hex (not `light-dark(--text-heading,…)`);
  the fill itself stays pale in dark mode, so the text on top must
  too. `test/unit/contrast.test.js` asserts each pair clears 4.5:1 in
  both modes.
- `--c-ink-dark` — light text paired with every `--cN-dark` fill.
  Default `#FFFFFF`; warm-palette themes can override to a cream
  off-white if pure white feels icy on warm-deep slots.

**Structural**

- `--c-stroke` — universal fill border. Saturated, reads on every
  `--cN-light` tint including white.
- `--c-line` — edges and arrows. Near-black on light canvas; uses
  `light-dark()` so it flips on dark canvases (where edges run on the
  dark surface, not inside a band fill).
- `--c-accent-warm` — secondary warm brand accent (radar's second
  curve, where a single warm hue against the cool band reads better
  than a second pale tint).

**Quadrant chart** is now a native chart-family component, not a mermaid
diagram — it draws from the chart-family's own `--catN-*` spectrum (tunable
per theme via `--chart-catN`) and no longer uses theme-defined
`--c-quadrant-*` slot tokens. See `lib/components/chart/quadrant/`.

### Chart-family palette (`--chart-catN`, `--chart-state-*`)

The chart bucket (pie, quadrant, radar, gantt, kanban, progress,
state-chart, timeline-list, word-cloud) draws from its **own** two
spectrums, defined in
`lib/components/chart/_chart-family/chart-family.css` and decoupled from
the engine-wide `--cN` accents:

- **Categorical** — `--catN-*` (N = 1–8), the well-spaced hue set pie
  wedges / radar curves / kanban lanes cycle through.
- **Semantic** — `--state-{pass,warn,fail,info,mute}-*`, the status
  colours gantt bars / progress fills / status pills use to encode meaning.

Both ship a canvas-aware Apple-hue **default**, so an untuned theme gets a
working chart palette for free. A theme **curates** charts to its own
character by setting the override hooks at `:root`, each a
`light-dark(lightCanvasVivid, darkCanvasVivid)` pair:

| Hook | Overrides |
|---|---|
| `--chart-cat1` … `--chart-cat8` | the 8 categorical hues |
| `--chart-state-pass` / `-warn` / `-fail` / `-info` / `-mute` | the 5 semantic hues |

The `var()` indirection means a theme always wins, and it need only set the
slots it wants to flavour. **cuoio is the worked example**: its
`--chart-catN` is the palette audit's top-scored "Brand triad" earth
spectrum (so charts share the `--cN` language of its Mermaid diagrams), and
its `--chart-state-*` reuses cuoio's own `--pass` / `--warn` / `--fail` so a
gantt at-risk bar matches a `--warn` chip. See `themes/cuoio.css` and the
ranked proposals in `themes/palette-audit.md`.

### Universal semantic palette (`--c-warm-*`, `--c-cool-*`, `--c-alarm*`, `--c-mark`, `--c-note`)

Status-signaling colours shared across every theme. **Defined in
`lattice.css` as universal defaults; themes override only if curated
values differ.**

| Token | Role | Default |
|---|---|---|
| `--c-warm-light` | Pale peach — in-progress, warn fills | `#F5E6D8` |
| `--c-warm-dark` | Warm brown — paired stroke for c-warm-light | `#92400E` |
| `--c-cool-light` | Pale slate — done, muted, grid lines | `#E0E4EA` |
| `--c-cool-dark` | Saturated slate — paired stroke for c-cool-light | `#475569` |
| `--c-alarm` | Saturated red — critical / blocked / error | `#C20000` |
| `--c-alarm-dark` | Deep red — paired stroke for c-alarm | `#8B0000` |
| `--c-mark` | Saturated yellow — today markers, highlights, note borders | `#F6C700` |
| `--c-note` | Pale yellow — aside / footnote surface | `#FFFBE6` |

Gantt task lifecycle uses warm + cool + alarm + mark. Sequence-diagram
notes use note + mark. Mermaid's `errorBkgColor` resolves to `c-alarm`.
The deck-wide alarm signal is one colour; pre-consolidation it was
spelled `--diagram-state-critical` AND `--diagram-error-bg` (both
saturated red), now `--c-alarm` covers both.

cuoio is the one shipped theme that overrides the universal palette —
its leather aesthetic wants a warm pale gold-wash + saddle leather
pair instead of the indaco-derived peach + brown defaults.

## The card-on-band rule (scope: kanban only)

> **A `--bg-alt` inner card on a `--cN-light` parent surface.**
> Applies only when the inner item physically sits on top of a
> band-tinted parent surface.

Kanban is the one Mermaid diagram type that has this structure:

- Lane = `<g class="cluster section-N"><rect/></g>` painted with
  `--cN-light`. A large tinted rectangle.
- Ticket = `<g class="node">` inside `.items`, painted with `--bg-alt`.
  A small near-white card on top of the lane.

The contrast between `--bg-alt` (#F2F5FA in indaco) and a pale c-light
tint (e.g. #DCE9F5) gives the reading "card lifted off the lane."

**Timeline and journey are NOT card-on-band**, even though their syntax
suggests a parent-child relationship between period/section and
event/task. The period header is a small `--cN-light` rect at the *top*
of a column; tasks and events stack *below* it on the slide canvas
(`--bg` white). There is no band underneath each card. `--bg-alt` on
`--bg` is virtually invisible, so the rule collapses. These diagrams
follow the **tile-per-element** pattern — events inherit their period's
`--cN-light` fill via the `.section-N` rule, with `--c-stroke` providing
the card outline against the white canvas.

| Diagram | Structure | Pattern |
|---|---|---|
| **kanban** | lane (cN-light rect) → ticket on top | card-on-band ✓ |
| **timeline** | period header (cN-light) → events stack below on canvas | tile-per-element (each event = its period's cN-light) |
| **journey** | section header (cN-light) → tasks stack below on canvas | tile-per-element (each task = its section's cN-light) |
| **treemap / mindmap / gitgraph / quadrant** | no outer grouping | tile-per-element (each tile = its own cN-light) |

Audit and design rationale: `engineering/decisions/2026-05-12-diagram-elevation.md`.

## The lightness contract

The default `indaco` palette uses two distinct lightness tiers for the
categorical cycle, plus a small universal semantic palette for status
signals:

- **Pale tier, L≈87.** `--c1-light`..`--c12-light`,
  sequence actor backgrounds, pie slices, and most light surfaces.
  `--c-ink-light` reads on these with 10:1+ contrast.
- **Deep tier, L≈32.** `--c1-dark`..`--c12-dark`. Saturated marks:
  decision-list accents, piechart wedges, sankey nodes, gitgraph
  branch dots, xy-chart plot palette, Mermaid's cScale feed.
  `--c-ink-dark` (default `#FFFFFF`) reads on these with 5:1+ contrast.

A new palette should respect the same tier split. Each rank-1 proposal
in `themes/palette-audit.md` lands its pale tier at L≈87 and its
deep tier at L≈32, anchored to AA against the paired ink — if you copy
the proposal values, you inherit the contract for free.

Colors that ignore the tier split:

- **Strokes** (`--c-stroke`): saturated, picked to read on every
  `--cN-light` tint including white.
- **Lines** (`--c-line`): near-black on light canvas, light on dark.
- **Universal semantic palette** (`--c-warm-*` / `--c-cool-*` /
  `--c-alarm*` / `--c-mark` / `--c-note`): status-signaling colours
  outside the tier system. Alarm is saturated red, mark is saturated
  yellow, note is pale yellow — pinned values, not theme-cycle members.

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
(they consume `var(--c-*)`), so a new palette gets them automatically
by defining the token contract — no per-palette CSS rules are needed.

The current overrides cover:

- **Journey** — Mermaid hardcodes X11 named colors for sections. Override
  forces section bars and task tiles to pale fills with dark text.
- **Mindmap** — reads `cScale*` verbatim with no transformation. The
  deep-tone inputs render too saturated. Override forces pale fills per
  level. The root node has both `.section-root` and `.section--1` classes
  with conflicting hardcoded fills; both are overridden.
- **Kanban** — applies its own lighten step. With our deep-tier inputs
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
  pale fills with dark text. The branch dots and lines use `--cN-dark`
  for trace visibility. Arrow paths default to black fill (drawing
  wedges between branches); override forces `fill: none`.
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
  timeline, xy-chart) and remain visible — see engineering/mermaid.md
  §5.4 for the full convention and the diagnostic recipe.

## Avoid in diagram CSS

One Chromium quirk in the Marp preview is worth knowing about even though
we no longer route through Mermaid's themeCSS init parameter:

**Avoid `:not(:has(...))` and `:is(:has(...), :has(...))` in the DIAGRAM
OVERRIDES section.** Silently broken in the marp-vscode preview Chromium
build (it ignores the rule rather than failing loudly). Plain `:has()` is
fine; nested `:has()` inside `:not()` / `:is()` isn't. See
`engineering/gotchas.md`.

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
5. **Categorical cycle** (`--c1-light` / `--c1-dark` through
   `--c12-light` / `--c12-dark`, plus `--c-ink-light` / `--c-ink-dark`).
   Copy the rank-1 Brand-triad proposal from `themes/palette-audit.md`
   as a known-good starting point; AA against the paired ink is checked
   by the contrast suite.
6. **Structural tokens** (`--c-stroke`, `--c-line`, `--c-accent-warm`).
   Borders, edge lines, and the secondary warm accent.
7. **Universal semantic overrides** (optional — only if your theme has
   curated alternatives to lattice.css defaults for `--c-warm-*`,
   `--c-cool-*`, `--c-alarm*`, `--c-mark`, `--c-note`). cuoio is the
   one shipped theme that overrides; most new palettes inherit.
8. **Dark-variant tokens** (`--dark-bg`, `--dark-text-*`, etc).
   Consumed by every `light-dark()` pair above and by `section.dark`.
9. **Semantic signals** (`--pass`, `--fail`, `--warn`). Usually the same
   green/red/amber across palettes; override if your brand specifies.

You don't write per-diagram CSS overrides. They live in `lattice.css`'s
DIAGRAM OVERRIDES section and reference tokens by `var(--c-*)`, so your
new colour values flow through unchanged.

When the values look right:

```sh
# Build the regression galleries with your palette and inspect each PDF.
node lattice-emulator.js examples/gallery.md         /tmp/<name>.pdf         -p <name>
node lattice-emulator.js examples/gallery-mermaid.md /tmp/<name>-mermaid.pdf -p <name>
node lattice-emulator.js examples/gallery-jargon.md  /tmp/<name>-jargon.pdf  -p <name>
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
5. Register both palettes in `.vscode/settings.json` under
   `markdown.marp.themes` so the Marp VS Code extension picks them up.
6. Build a deck: `node lattice-emulator.js deck.md out.pdf -p <name>`.
7. Re-render `examples/mermaid-gallery.md` with your palette to verify
   every diagram type renders correctly.
8. Run `node --test test/unit/*.test.js` — the contrast assertions will
   catch any pair that slips below AA.

## Verifying a palette

Two checks worth running:

**Contrast**: `test/unit/palette/contrast.test.js` parses every shipped
palette and asserts AA on every `--cN-light` / `--c-ink-light` pair, every
`--cN-dark` / `--c-ink-dark` pair, `--text-heading`
on `--bg`/`--bg-alt`, and `--c-ink-dark` on `--c-alarm` — in both light
and dark. Add your new palette to the test's loop (the `['indaco',
'cuoio']` literal). If a pair fails, lift the text (darker on light,
lighter on dark) or lift the surface; don't lower the bar.

**Mermaid render**: re-render the diagram gallery and visually inspect
each slide. The likely failure modes are:

1. `--cN-dark` slot too saturated → mindmap text becomes unreadable.
2. Strokes too pale → flowchart/sequence/class boxes don't read against
   the canvas.
3. A `--c-*` token your palette didn't define — `lattice.css`'s DIAGRAM
   OVERRIDES rules will fall through to Mermaid's defaults. Run
   `test/unit/palette.test.js` to catch missing tokens.
4. Build-time "Palette missing CSS variable" warning — the emulator's
   `parsePaletteVars` must read `layoutCSS + paletteCSS` so universal
   semantic defaults from lattice.css are visible. This is the
   engine's responsibility; report as a bug if it ever surfaces.
