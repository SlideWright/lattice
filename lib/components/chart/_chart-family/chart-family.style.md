# Chart palette — style principles

How a theme curates the chart family to its own character — and why the
three curated themes (cuoio, onyx, indaco) read as **different yet similar**.

This is the *design rationale*. For the mechanical contract — the override
hooks, the token tables, the assessment method — see
`design/theming.md` › **Chart-family palette**. For the token definitions and
the canvas-aware fallback spectrum, see `chart-family.css`.

## One recipe, three expressions

The chart family ships a canvas-aware Apple-hue **default** spectrum, so an
untuned theme gets working charts for free. But a theme that stops there wears
*someone else's* charts — the default reads as "indaco's blues" no matter the
canvas. A curated theme re-expresses the **same recipe in its own pigments**, so
a pie and a flowchart read as one palette.

Three themes are curated today. They share a spine and differ on exactly one
axis each — that is the whole of "different yet similar."

## The shared spine — what every curation does

1. **Two spectrums, same hooks.** Every theme curates the same two token sets
   through the same `:root` override hooks: `--chart-cat1..8` (categorical) and
   `--chart-state-{pass,warn,fail,info,mute}` (semantic). A theme sets only the
   slots it wants to flavour; the `var()` indirection means the theme always
   wins, and unset slots inherit the default.

2. **Port, don't invent.** Categorical hues are lifted from the theme's *own*
   existing pigment spectrum (its `--cN` / brand palette), so charts speak the
   same colour language as the theme's Mermaid diagrams. Status roles *reuse*
   the theme's living semantic palette (`--pass` / `--warn` / `--fail`, muted)
   wherever it already has one — only the roles a theme genuinely lacks are
   curated fresh.

3. **Same canvas recipe.** Each token is a `light-dark(lightVivid, darkVivid)`
   pair. Fills mix the hue **toward the canvas on light** and **toward black on
   dark** — never into the dark `--bg`, because mixing a warm hue into a navy
   canvas neutralizes to brown. Toward black the hue stays true and vivid for
   every status. Marks / ink lift toward white on dark so they pop.

4. **Assessment-first.** Score candidate values *before* committing — resolve
   the full token chain (including each chart's deep gradient stop) and check,
   on **both** canvases: text-on-fill WCAG (AA on labels), marks vs canvas
   (≥3:1), and adjacent-slot OKLab distinctness (≥0.15). A passing palette-audit
   text-contrast score is a starting point, not proof the categories are
   distinguishable.

## The distinguishing axis — what each does differently

The one decision that separates the three is **how a theme makes eight
categories distinguishable**. A theme with chroma to spare differs by **hue**;
a theme whose identity forbids a chromatic spectrum differs by **value**.

> **Rule of thumb:** a theme distinguishes categories through whatever axis its
> identity allows — hue or value — and reuses its own semantic palette for
> status, curating only the roles it lacks.

### cuoio — warm hue (brand-triad)

Categories adopt the palette audit's top-scored **earth "Brand triad"** — the
same `--cN` pigments cuoio's Mermaid diagrams use, so a pie and a flowchart are
one warm-leather palette. Status is **full reuse**: `--chart-state-*` points
straight at cuoio's own `--pass` / `--warn` / `--fail`, so a gantt at-risk bar
matches a `--warn` chip. The shipped default theme; the worked example.

### onyx — value, not hue (achromatic + red)

Onyx's identity forbids a chromatic spectrum, so categories differ by
**value**: a grayscale ramp ordered most-distinct-first, all in the dark half
so every mark clears 3:1 on white, plus the signature red and two faint accents
(slate, olive). Status draws from that same **red / olive / slate / grays**
(fail = red, warn = olive, info = slate, pass / mute = grays) — meaning is
carried by value **plus the pill's text label**, not a chromatic status code.
The counter-example that proves the recipe survives without hue.

### indaco — cool hue (+ a curated crimson)

Categories ride indaco's **blue-led pigment spectrum** (blue · rust · green ·
magenta · purple · teal · gold · cyan). Status is **reuse-first with two
edits**: pass / info / mute reuse indaco's living palette (`--pass`, brand blue,
`--text-muted`); warn ports indaco's gold to a saddle-amber; and fail is
**newly curated** — a cool crimson, because indaco's palette had no red, tuned
to sit with the blues rather than fight them. Shows the "curate only the gap"
half of the rule: seven of eight roles reuse, one is invented.

## Status is reuse-first

Categorical colour is *ported* (principle 2); status colour is *reused*. The
difference matters: categories are decorative identity (any well-spaced set
works), but status is **meaning** — and a theme almost always already encodes
green-good / red-stop somewhere. Reuse keeps a chart's "at-risk" reading
identical to the rest of the deck. Curate a status hue only when the theme has
no equivalent (indaco's crimson `fail`), and tune the new hue to the theme's
canvas, not a generic red.

## See also

- `design/theming.md` › **Chart-family palette** — the hooks, token tables, and
  the full assessment procedure (the *how*).
- `chart-family.css` — the `--catN-*` / `--state-*` token definitions and the
  canvas-aware fallback spectrum (the *defaults*).
- `themes/palette-audit.md` — ranked candidate values per theme.
- `themes/cuoio.css`, `themes/onyx.css`, `themes/indaco.css` — the three
  curations in source.
