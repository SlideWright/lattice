## Themes — palettes for Lattice

A **theme** is one CSS file that decides every colour on every slide.
Layouts (in `lattice.css`) are palette-blind: they only ever reference
`var(--token)`. A palette supplies the tokens. Swap palettes, every
colour changes; nothing about layout, spacing, or typography moves.

This directory ships ten palette pairs (`indaco`, `cuoio`, `atelier`,
`brina`, `burgundy`, `crepuscolo`, `laguna`, `magnolia`, `mustard`,
`onyx`) plus three structural extras (`ardesia`, `carbone`, `concrete`).
Each ships a `-dark` variant — a three-line wrapper that flips the
deck onto a dark canvas without touching colour values.

If you're here to author a new palette: skip to **The five-minute
path** below. The diagrams above it explain the model the engine has
of a palette, which is what makes the rules in the deep reference
(`reference/theming.md`) make sense rather than feel arbitrary.

---

### The mental model in one picture

```
 your palette                  lattice.css                rendered slide
 ─────────────────             ─────────────────          ───────────────────
                            ╭─ var(--bg) ──────────────→  canvas background
 :root {                    │
   --bg: light-dark(…); ────┤   var(--accent) ──────────→  headings, links,
   --accent: …; ────────────┤                              eyebrow rules
   --c1-light: …;  ─────────┤   var(--c1-light) ────────→  pale categorical
   --c1-dark:  …;  ─────────┤                              fills (mermaid SVG,
   --c-stroke: …;  ─────────┤                              decision-list nth-
   --c-ink-light: …; ───────┤                              child rotations,
   …                        │   var(--c-stroke) ────────→  every other layout
 }                          ╰                              the engine ships)
```

One channel leaves a palette file: **CSS variables**. Layouts and the
DIAGRAM OVERRIDES section in `lattice.css` both consume them via
`var(--token)`. The diagram overrides reach inline Mermaid SVG through
the host page cascade — the same mechanism the runtime preview uses —
so palettes never write per-diagram CSS or get handed to Mermaid's
`themeCSS` init parameter. (Earlier versions did; see
`reference/notes/2026-05-12-diagram-tokens.md` for why we dropped it.)

The engine reads the file once. Authors edit one file.

---

### Anatomy of the palette file

```
┌──────────────────────────────────────────────────────────────────┐
│ /* @theme <name> */         ← Marp registration, must match file │
│ @import 'lattice';          ← pulls in layouts + universal       │
│                               semantic palette + structural vars │
│                                                                  │
│ :where(:root){ color-scheme:light; }   ← zero-spec default       │
│                                                                  │
│ :root {                                                          │
│   /* brand axis */          ─ 4-6 hex anchors, your single       │
│     --brand-<hue>-deep        source of truth for the hue        │
│                                                                  │
│   /* surfaces & ink */      ─ light-dark(<light>, <dark>) pairs  │
│     --bg, --bg-alt, --bg-dark, --border                          │
│     --text-heading, --text-body, --text-label, --text-muted      │
│     --accent, --accent-soft, --on-accent                         │
│                                                                  │
│   /* semantic signals */    ─ --pass / --fail / --warn (+ -bg)   │
│   /* scale */               ─ --scale-500 anchor; derives 9 stops│
│   /* on-dark tints */       ─ derived from white via color-mix   │
│   /* spectrum gradient */   ─ optional decorative ribbon         │
│ }                                                                │
│                                                                  │
│ :root {                                                          │
│   /* dark-variant tokens */ ─ --dark-bg, --dark-text-* …         │
│ }                            consumed by light-dark() above      │
│                                                                  │
│ :root { /* hljs tokens */ } ─ code syntax colours                │
│ section .hljs-keyword { … } ─ + the rules that apply them        │
│                                                                  │
│ :root {                                                          │
│   /* categorical palette */                                      │
│     --c1-light..--c12-light ─ 12 pale fills, L≈87                │
│     --c1-dark ..--c12-dark  ─ 12 deep strokes/inks, L≈32         │
│     --c-ink-light           ─ dark text on cN-light, fixed hex   │
│     --c-ink-dark            ─ light text on cN-dark, default #FFF│
│                                                                  │
│   /* structural */                                               │
│     --c-stroke              ─ universal saturated stroke         │
│     --c-line                ─ edges, arrows (light-dark)         │
│     --c-accent-warm         ─ secondary warm accent (radar etc.) │
│                                                                  │
│   /* quadrant slot mapping */                                    │
│     --c-quadrant-1..4-fill  ─ aliases onto --cN-light slots      │
│     --c-quadrant-1..4-text  ─ paired text colour                 │
│                                                                  │
│   /* optional universal-semantic overrides */                    │
│     --c-warm-{light,dark}   ─ inherit lattice.css defaults if    │
│     --c-cool-{light,dark}     omitted (most themes do); override │
│     --c-alarm, --c-alarm-dark only if you have curated values    │
│     --c-mark, --c-note        (cuoio overrides for leather feel) │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

`themes/indaco.css` is the canonical reference. Every other palette
follows this skeleton; the scaffolding command (below) stamps it for
you with TODO markers.

The DIAGRAM OVERRIDES section at the bottom of `lattice.css` consumes
the `--c-*` tokens via selectors against rendered Mermaid SVG. It's
palette-blind — declare the tokens and every diagram type picks them
up.

---

### The lightness contract

Categorical fills come in two lightness tiers. Status signals (warm /
cool / alarm / mark / note) live in `lattice.css` as universal defaults
that themes can override:

```
   L ≈ 87  ┃ █ █ █ █ █ █ █ █ █ █ █ █  pale fills (12 slots)
   pale    ┃                          --c1-light..--c12-light — every
   tier    ┃                          coloured fill Mermaid can paint
           ┃                          (flowchart, sequence, pie, journey,
           ┃                          mindmap, kanban, c4, treemap,
           ┃                          gitgraph label pills, decision
           ┃                          accents, roadmap horizons)
           ┃                          → paired --c-ink-light is a fixed
           ┃                            dark hex, ≥10:1 contrast
   ─────── ╋ ──────────────────────────────────────────────────────
   L ≈ 32  ┃ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓  deep strokes/inks (12 slots)
   deep    ┃                          --c1-dark..--c12-dark — saturated
   tier    ┃                          marks: decision-list deep accents,
           ┃                          piechart wedges, gitgraph branch
           ┃                          dots, sankey nodes, kpi trajectory
           ┃                          borders, xy-chart plot palette
           ┃                          → paired --c-ink-dark is white
           ┃                            (themes can override to a warm
           ┃                            off-white)
   ─────── ╋ ──────────────────────────────────────────────────────
           ┃ universal semantic palette (lattice.css defaults)
   status  ┃ --c-warm-light + --c-warm-dark   in-progress / warn pair
   signals ┃ --c-cool-light + --c-cool-dark   done / muted / grid pair
           ┃ --c-alarm + --c-alarm-dark       saturated red, alarm pair
           ┃ --c-mark                         saturated yellow highlight
           ┃ --c-note                         pale yellow aside surface
```

Slot 1 of the categorical cycle doubles as the canonical primary fill
for any single-band diagram (flowchart node, sequence actor). Brand
hue anchors slot 1 by convention; subsequent slots follow whichever
strategy the palette adopted (Brand triad is the default, generated
from `examples/palette-audit.md`).

`test/unit/contrast.test.js` asserts AA (4.5:1) on every
`--cN-light` / `--c-ink-light` pair and every `--cN-dark` / `--c-ink-dark`
pair, in both light and dark canvas modes.

---

### Dark mode in four lines

```
   author wants…                                     they write…
   ──────────────────────────────────────────────    ─────────────────────────
   whole deck dark, simplest                         theme: <name>-dark
   whole deck dark, with any palette                 style: ":root{color-scheme:dark}"
   follow viewer's OS preference                     style: ":root{color-scheme:light dark}"
   one slide dark on an otherwise-light deck         <!-- _class: dark -->
```

How: every surface token is declared as `light-dark(<light>, <dark>)`.
The browser resolves the function at every use site against the active
`color-scheme`. No engine plugins, no class-list surgery, no per-renderer
shims — the same mechanism works in marp-cli, the lattice emulator, and
the VS Code Marp preview.

The `--c-ink-light` and `--c-ink-dark` tokens are an exception: pinned
to fixed hex (not `light-dark(…)`), because the categorical fills
themselves stay in their lightness tier in both canvas modes — the text
on top must too. Same for `--c-mark`, `--c-alarm`, `--c-alarm-dark`,
`--c-note` (the universal semantic palette is canvas-mode-independent
by design).

---

### The five-minute path

```sh
# 1. stamp a starter palette from indaco
npm run new:theme verdigris

# 2. open the new file and edit the brand-axis hexes + cycle values
$EDITOR themes/verdigris.css

# 3. build a deck with it (-p selects the palette override)
node lattice-emulator.js examples/gallery.md /tmp/verdigris.pdf -p verdigris

# 4. verify diagrams render correctly
node lattice-emulator.js examples/mermaid-gallery.md /tmp/verdigris-mermaid.pdf -p verdigris
```

The scaffolder copies `themes/indaco.css`, rewrites the `@theme`
directive, and adds `TODO(palette):` markers on every value you're
expected to change. It also stamps the matching `<name>-dark.css`
wrapper so the dark variant works on day one.

What to change, in order of impact:

1. **Brand axis** (`--brand-<hue>-deep`, `--brand-<hue>-mid`,
   `--brand-<hue>`). These feed `--bg-dark`, `--accent`, `--text-label`.
   Pick four shades along a single hue; everything else hangs off them.
2. **Accent** (`--accent`, `--on-accent`). The most-seen colour after
   ink. Must clear 4.5:1 against `--bg` and against `--accent-soft`.
3. **Categorical cycle** (`--c1-light` / `--c1-dark` through
   `--c12-light` / `--c12-dark`, plus `--c-ink-light` and `--c-ink-dark`).
   Sourced from `examples/palette-audit.md` — the rank-1 Brand-triad
   proposal for your theme is a known-good starting point. Each pair
   must clear AA against its paired ink — the contrast test will catch
   slips.
4. **Structural tokens** (`--c-stroke`, `--c-line`, `--c-accent-warm`).
   The saturated brand stroke (reads on every pale fill including
   white), the edge/arrow line, and a secondary warm accent for
   radar's second curve and similar.
5. **Quadrant slot mapping** (`--c-quadrant-1..4-fill` / `-text`). Each
   theme picks which `--cN-light` slot maps to each quadrant — indaco
   uses Q1→c1, Q2→c2, Q3→c7 (yellow = "hold"), Q4→c3, but a theme can
   re-map the semantics if its palette puts e.g. yellow in a different
   slot.
6. **Universal semantic palette** (`--c-warm-light` / `--c-warm-dark`
   / `--c-cool-light` / `--c-cool-dark` / `--c-alarm` / `--c-alarm-dark`
   / `--c-mark` / `--c-note`). The deck's status-signaling colours.
   Inherit lattice.css defaults (cuoio is the one theme that overrides
   for its leather aesthetic).
7. **Dark variant tokens** (`--dark-*`). Used by `section.dark` and by
   the dark sides of every `light-dark(…)` pair.

You can ignore everything else on a first pass. The DIAGRAM OVERRIDES
section in `lattice.css` will work unchanged because every rule
references the `--c-*` tokens by name — your new values flow through.

---

### When something doesn't render right

```
   symptom                                    likely cause
   ────────────────────────────────────────   ───────────────────────────────
   Mermaid diagram renders Mermaid defaults   --c-* token missing from
   (gray boxes, no brand colour)              palette — DIAGRAM OVERRIDES
                                              rule falls through. Run
                                              test/unit/palette.test.js to
                                              catch missing tokens.

   Build-time "Palette missing CSS variable"  parsePaletteVars in
   warning + black gantt / sequence / error   lattice-emulator.js is reading
   fills in the rendered PDF                  the wrong CSS slice; check that
                                              it parses (layoutCSS + paletteCSS)
                                              so lattice.css's universal
                                              semantic palette is visible.

   Flowchart / sequence boxes "float" with    --c-stroke too pale — must be
   no visible border                          saturated to read on every pale
                                              fill including white

   Pale fill readable in light mode, white    --c-ink-light declared with
   text on pale fill in dark mode             light-dark(--text-heading,…) —
                                              the fill stays pale in dark
                                              mode, so pin --c-ink-light
                                              to a fixed dark hex

   One slide is dark but the title shows      section.title pulls --dark-*
   wrong colours                              tokens directly; your dark
                                              variant block is incomplete
```

For deeper triage see `reference/engineering/gotchas.md`.

---

### Where to go from here

| You want to…                                   | Read                       |
|------------------------------------------------|----------------------------|
| Author a new palette, end to end               | `reference/theming.md`          |
| See the scored palette proposals per theme     | `examples/palette-audit.md` (build the PDF if not present) |
| Understand why `themeCSS` was dropped          | `reference/notes/2026-05-12-diagram-tokens.md` |
| See every layout the engine ships              | `reference/architecture.md`     |
| Trace a colour from palette to rendered pixel  | `lattice.css` (search the token, then the DIAGRAM OVERRIDES section) |
| Diagnose a render that "looks wrong"           | `reference/engineering/gotchas.md` |
