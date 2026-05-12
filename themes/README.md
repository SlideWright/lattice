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
   …                        │                              corner tags
                            │
   /* ===== MERMAID THEME CSS ===== */
   .person { fill: …; } ─────── extracted at build time ─→  injected as
   .venn-set-0 { … }                                       Mermaid themeCSS
 }
```

Two channels leave a palette file:

1. **CSS variables** — read by every rule in `lattice.css` via
   `var(--token)`. Defines surfaces, ink, accents, semantic signals,
   categorical hues.
2. **Mermaid override CSS** — everything below the sentinel comment
   gets extracted and handed to Mermaid as `themeCSS`. Patches the
   ~15 diagram types whose hardcoded internal palettes ignore the
   normal `themeVariables` API.

The engine reads the file once. Authors edit one file.

---

### Anatomy of the palette file

```
┌──────────────────────────────────────────────────────────────────┐
│ /* @theme <name> */         ← Marp registration, must match file │
│ @import 'lattice';          ← pulls in layouts + structural vars │
│                                                                  │
│ :where(:root){ color-scheme:light; }   ← zero-spec default        │
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
│   /* on-dark tints */       ─ derived from white via color-mix   │
│   /* spectrum gradient */   ─ optional decorative ribbon         │
│ }                                                                │
│                                                                  │
│ :root {                                                          │
│   /* dark-variant tokens */ ─ --dark-bg, --dark-text-* …          │
│ }                            consumed by light-dark() above      │
│                                                                  │
│ :root { /* hljs tokens */ } ─ code syntax colours                │
│ section .hljs-keyword { … } ─ + the rules that apply them        │
│                                                                  │
│ :root {                                                          │
│   /* mermaid extensions */  ─ --mermaid-*, --cat-* (8 mid-tone   │
│ }                            hues), pie / quadrant / gantt slots │
│                                                                  │
│ /* ═══════════════════════════════════════ */                    │
│ /* ===== MERMAID THEME CSS ===== */         ← sentinel, do not   │
│                                                rename or move    │
│ section .journey-section { … }    ┐                              │
│ section .mindmap-node      { … }  │  per-diagram patches for     │
│ section .venn-set-0        { … }  ├─ Mermaid renderers that      │
│ section .architecture-…    { … }  │  ignore themeVariables       │
│ …                                 ┘                              │
└──────────────────────────────────────────────────────────────────┘
```

`themes/indaco.css` is the canonical reference. Every other palette
follows this skeleton; the scaffolding command (below) stamps it for
you with TODO markers.

---

### Why two lightness bands?

Most colour decisions for diagrams collapse onto one rule:

```
   L ≈ 90  ┃ █ █ █ █ █ █ █ █ █ █  pale fills
   pale    ┃                       flowchart, sequence, class, ER,
   band    ┃                       quadrant, pie, gantt, venn, c4 …
           ┃                       → dark text reads ≥ 13:1
   ─────── ╋ ──────────────────────────────────────────────────────
   L ≈ 60  ┃ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓        mid-tone categorical
   mid     ┃                       --cat-blue … --cat-mauve,
   band    ┃                       cScale0..11, git0..7
           ┃                       → kanban renderer lightens these
           ┃                         to ≈70 before emitting
   ─────── ╋ ──────────────────────────────────────────────────────
   sat.    ┃ ▰ saturated red       alarm-only: gantt critical,
   alarm   ┃                        errorBkgColor — nowhere else
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
4. **Mermaid pale slots** (`--mermaid-primary-color`,
   `--mermaid-secondary-color`, `--mermaid-pie-*`). Pale tints used
   by flowchart, sequence, journey, pie. Should sit at L≈90.
5. **Dark variant tokens** (`--dark-*`). Used by `section.dark` and by
   the dark sides of every `light-dark(…)` pair.

You can ignore everything else on a first pass. The Mermaid CSS
overrides at the bottom of the file will work unchanged because they
all reference tokens by `var(--token)` — your new values flow through.

---

### When something doesn't render right

```
   symptom                                    likely cause
   ────────────────────────────────────────   ───────────────────────────────
   Mermaid diagram renders Mermaid defaults   /* */ or `>` inside themeCSS
   (gray boxes, no brand colour)              section — both silently break
                                              Mermaid's init parser

   Kanban cards render invisible / white      --cat-* fed at L≈90 instead
                                              of L≈60 — kanban lightens to
                                              ≈100 against white canvas

   Mindmap text unreadable                    --cat-* fed too saturated —
                                              mindmap consumes them at full
                                              saturation, no lighten step

   Flowchart / sequence boxes "float" with    --mermaid-border too pale —
   no visible border                          must be saturated to read on
                                              every pale fill including white

   Per-diagram override appears to do         override references a token
   nothing                                    that doesn't exist in your
                                              palette → silent fallback to
                                              Mermaid default

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
| Understand the Mermaid override surface        | `docs/references/mermaid.md` |
| See every layout the engine ships              | `docs/architecture.md`     |
| Trace a colour from palette to rendered pixel  | `lattice.css` (search the token) |
| Diagnose a render that "looks wrong"           | `docs/references/gotchas.md` |
