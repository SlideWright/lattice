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
(`docs/theming.md`) make sense rather than feel arbitrary.

---

### The mental model in one picture

```
 your palette                  lattice.css                rendered slide
 ─────────────────             ─────────────────          ───────────────────
                            ╭─ var(--bg) ──────────────→  canvas background
 :root {                    │
   --bg: light-dark(…); ────┤   var(--accent) ──────────→  headings, links,
   --accent: …; ────────────┤                              eyebrow rules
   --cat-blue: …; ──────────┤   var(--cat-blue) ────────→  card stripes,
   --diagram-band-1: …; ────┤                              corner tags
   --diagram-stroke: …; ────┤   var(--diagram-band-3) ──→  mermaid SVG fills
   …                        │   var(--diagram-stroke) ──→  (DIAGRAM OVERRIDES
 }                          ╰                              in lattice.css)
```

One channel leaves a palette file: **CSS variables**. Layouts and the
DIAGRAM OVERRIDES section in `lattice.css` both consume them via
`var(--token)`. The diagram overrides reach inline Mermaid SVG through
the host page cascade — the same mechanism the runtime preview uses —
so palettes never write per-diagram CSS or get handed to Mermaid's
`themeCSS` init parameter. (Earlier versions did; see
`docs/notes/2026-05-12-diagram-tokens.md` for why we dropped it.)

The engine reads the file once. Authors edit one file.

---

### Anatomy of the palette file

```
┌──────────────────────────────────────────────────────────────────┐
│ /* @theme <name> */         ← Marp registration, must match file │
│ @import 'lattice';          ← pulls in layouts + structural vars │
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
│   /* chart palette */       ─ --chart-1 … --chart-6 + --scale-500│
│   /* categorical hues */    ─ --cat-blue … --cat-mauve (L≈60)    │
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
│   /* diagram tokens */      ─ --diagram-band-1..12 (+ -text-N    │
│     --diagram-band-N           paired), --diagram-stroke, -line, │
│     --diagram-band-text-N      --diagram-accent-warm,            │
│     --diagram-stroke           --diagram-quadrant-N-{fill,text}, │
│     --diagram-quadrant-N-*     --diagram-state-{active,done,     │
│     --diagram-state-*            critical,today,grid},           │
│     --diagram-note-*           --diagram-note-{bg,stroke},       │
│     --diagram-error-*          --diagram-error-{bg,text}         │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

`themes/indaco.css` is the canonical reference. Every other palette
follows this skeleton; the scaffolding command (below) stamps it for
you with TODO markers.

The DIAGRAM OVERRIDES section at the bottom of `lattice.css` consumes
the `--diagram-*` tokens via selectors against rendered Mermaid SVG.
It's palette-blind — declare the tokens and every diagram type picks
them up.

---

### Why two lightness bands?

Most colour decisions for diagrams collapse onto one rule:

```
   L ≈ 83  ┃ █ █ █ █ █ █ █ █ █ █  pale fills
   pale    ┃                       --diagram-band-1..12 — every coloured
   band    ┃                       fill Mermaid can paint (flowchart,
           ┃                       sequence, pie, journey, mindmap,
           ┃                       kanban, venn, c4, treemap, gitgraph)
           ┃                       → paired --diagram-band-text-N is
           ┃                         pinned to dark hex, ≥ 10:1 contrast
   ─────── ╋ ──────────────────────────────────────────────────────
   L ≈ 60  ┃ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓        mid-tone categorical
   mid     ┃                       --cat-blue … --cat-mauve,
   band    ┃                       cScale0..11, git0..7
           ┃                       → kanban renderer lightens these
           ┃                         to ≈70 before emitting
   ─────── ╋ ──────────────────────────────────────────────────────
   sat.    ┃ ▰ saturated red       alarm-only: --diagram-error-bg,
   alarm   ┃                        --diagram-state-critical — nowhere
           ┃                        else
```

The bands exist because Mermaid's kanban renderer applies an internal
lighten step. Feed it L≈90 and it emits L≈100 — invisible on white.
Feed it L≈60 and it lands on the pale band alongside everything else.
This is the single non-obvious rule new authors trip on; the rest of
the palette is "pick colours you like."

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

The `--diagram-band-text-N` tokens are an exception: pinned to a fixed
dark hex (not `light-dark(…)`), because the band fill itself stays pale
in dark mode and the text on top must stay dark to clear AA. The same
applies to `--diagram-error-text` (pinned white over saturated red).

---

### The five-minute path

```sh
# 1. stamp a starter palette from indaco
npm run new:theme verdigris

# 2. open the new file and edit the brand-axis hexes
$EDITOR themes/verdigris.css

# 3. build a deck with it
node lattice-emulator.js examples/gallery.md /tmp/verdigris.pdf verdigris

# 4. verify diagrams render correctly
node lattice-emulator.js examples/mermaid-gallery.md /tmp/verdigris-mermaid.pdf verdigris
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
3. **`--cat-*`** (eight mid-tone hues at L≈60). Used by kanban, mindmap,
   actor pills, corner tags. If you skip these, you inherit indaco's.
4. **Diagram band cycle** (`--diagram-band-1` … `--diagram-band-12`,
   each paired with `--diagram-band-text-N`). Pale tints at L≈83 used
   by every Mermaid fill. Pin the text tokens to a dark hex —
   `test/unit/contrast.test.js` asserts each pair clears 4.5:1.
5. **Diagram structural tokens** (`--diagram-stroke`, `--diagram-line`,
   `--diagram-quadrant-*`, `--diagram-state-*`, `--diagram-note-*`,
   `--diagram-error-*`). Borders, gantt state, sticky notes, parser
   errors.
6. **Dark variant tokens** (`--dark-*`). Used by `section.dark` and by
   the dark sides of every `light-dark(…)` pair.

You can ignore everything else on a first pass. The DIAGRAM OVERRIDES
section in `lattice.css` will work unchanged because every rule
references the `--diagram-*` tokens by name — your new values flow
through.

---

### When something doesn't render right

```
   symptom                                    likely cause
   ────────────────────────────────────────   ───────────────────────────────
   Mermaid diagram renders Mermaid defaults   --diagram-* token missing from
   (gray boxes, no brand colour)              palette — DIAGRAM OVERRIDES
                                              rule falls through. Run
                                              test/unit/palette.test.js to
                                              catch missing tokens.

   Kanban cards render invisible / white      --cat-* fed at L≈90 instead
                                              of L≈60 — kanban lightens to
                                              ≈100 against white canvas

   Mindmap text unreadable                    --cat-* fed too saturated —
                                              mindmap consumes them at full
                                              saturation, no lighten step

   Flowchart / sequence boxes "float" with    --diagram-stroke too pale —
   no visible border                          must be saturated to read on
                                              every pale fill including white

   Diagram band readable in light, white      --diagram-band-text-N declared
   text on pale band in dark mode             with light-dark(--text-heading,
                                              …) — the band stays pale in
                                              dark mode, so pin text to a
                                              fixed dark hex

   One slide is dark but the title shows      section.title pulls --dark-*
   wrong colours                              tokens directly; your dark
                                              variant block is incomplete
```

For deeper triage see `docs/references/gotchas.md`.

---

### Where to go from here

| You want to…                                   | Read                       |
|------------------------------------------------|----------------------------|
| Author a new palette, end to end               | `docs/theming.md`          |
| Understand why `themeCSS` was dropped          | `docs/notes/2026-05-12-diagram-tokens.md` |
| See every layout the engine ships              | `docs/architecture.md`     |
| Trace a colour from palette to rendered pixel  | `lattice.css` (search the token, then the DIAGRAM OVERRIDES section) |
| Diagnose a render that "looks wrong"           | `docs/references/gotchas.md` |
