---
status: proposed
summary: Finish — the surface artifact of the existing Finish axis, the unbuilt half the model already reserved (`design-system.md:69` lists `background` as a Finish modifier that was never implemented). A finish is a composable surface layer over structure+palette with four facets — wash (gradients/tints) · texture (patterns/marks) · cover (full-bleed fill) · stamp (brand mark) — sourced three ways (pick a curated finish · fabricate one parametrically · bring your own asset), saved to the Studio Library beside themes, shared as a lattice-asset zip. Authored deck-wide via a new `background:` front matter (auto-completed from a curated, token-recolorable SVG library that adapts across aspect ratios) and per-slide via the `cover` Finish modifier. First slice: the engine `cover` primitive; generation parametric-first, AI later. No renames — "Finish" is already the axis; "finish" is its surface artifact, beside "theme" (its palette artifact).
---

# Finish — the surface layer designers have been missing

**The ask (from a creative-designer's-eye review of the Studio).** Lattice is
strong at *structure* (Form) and *palette* (the color half of Finish) but thin
on *atmosphere and identity*. A designer can pick a theme and a layout, but the
two moves that make a deck feel like *theirs* — a distinctive backdrop and their
brand mark — are exactly what's hard today. There is **no full-bleed cover** in
the engine (`cover` exists only inside the chart family), **no brand-mark slot**
that flows deck-wide, and **no way to pick, fabricate, or bring in** a surface
treatment. This note is the design model; it precedes any CSS or transform work
(CLAUDE.md "design-before-code").

## The reframe — one concept, not three features

Marks, gradients, full-bleed covers, and brand marks are **not** separate
features. They are facets of one thing: the *surface treatment* applied to a
slide after its structure and palette are set — the wax/polish/patina layer in a
cobbler's sense. The single model:

> **A *finish* is a composable surface layer over a slide's structure (Form) and
> palette (the theme).** Four facets, independently stackable:
>
> | Facet | What it is | Today |
> |---|---|---|
> | **wash** | color atmosphere — gradients, tints | partial: `tint-*` treatments (peripheral, not full-bleed) |
> | **texture** | patterns, repeating motifs, marks | partial: `mark-*` treatments (peripheral) |
> | **cover** | full-bleed fill behind all content (parametric, SVG, or brought-in image) | **missing** — the headline gap |
> | **stamp** | the brand mark / logo / maker's mark, persistently placed | **missing** — no deck-wide slot |

A finish can be just a wash, or a cover + stamp, or all four — they compose the
same way `tint-*` and `mark-*` already stack.

## Why "finish" is the right word — and why nothing gets renamed

This is **not** a new word competing for space. **Finish is already one of the
four canonical axes** of the system (`design/design-system.md §2`,
`design/concepts.md`):

> **Function · Form · Substance · Finish** — system word **Finish**, human word
> **Style** ("what should it feel like?").

`dark` / `sketch` / `compact` are *correctly* Finish modifiers — that is the
model, not a misnomer. And the canonical Finish-modifier list already reserves
the slot we need (`design-system.md:69`):

```
FINISH   dark · compact · loose · accent · mirror · numbered · background · period
```

**`background` is listed but was never implemented** — only an inert token stub
exists. So this feature does not invent a layer; it **builds out the unbuilt half
of the Finish axis.** The vocabulary lands cleanly with no renames:

- **Finish** (system) / **Style** (human) — the axis. Unchanged.
- A **theme** = the *palette* artifact of Finish (colors/tokens). Unchanged.
- A **finish** = the *surface* artifact of Finish (wash · texture · cover ·
  stamp). New. Where a theme answers "what colors," a finish answers "what
  surface treatment." A theme + a finish together = a deck's full Style.

The axis and the surface artifact share the word "finish" on purpose — a finish
*is* the axis's literal namesake act (the polish you apply); `theme` is the
established odd-one-out (it names the palette half). This was confirmed against
the strict `§2.5` "one system word, one human word, no third synonym" rule: we
add no synonym, only a second concrete artifact type under the axis, beside
`theme`.

## Authoring surface — two entry points

### Deck-wide: a `background:` front matter

The dominant entry point is a deck-level front-matter key — the same place
`theme:` lives — so a designer sets the surface once and it flows across every
slide:

```yaml
---
theme: indaco
background: blueprint      # ← a curated finish, applied deck-wide
---
```

`background:` is **auto-completable from a curated library** of finishes (see
below). It is the cheapest possible authoring move: one line, no per-slide
classing. (`background` is the already-reserved Finish-modifier name from
`design-system.md:69`, so the front-matter key and the modifier share it.)

### Per-slide: the `cover` Finish modifier

A single slide overrides or opts in via the Finish-modifier mechanism that
`dark` / `sketch` already use:

```markdown
<!-- _class: cover blueprint -->
```

Per-slide always wins over the deck-wide default, matching how Finish modifiers
already cascade.

## The curated SVG library — token-recolorable, size-adaptive

The "pick" library is a set of **SVG backgrounds whose colors are replaceable by
theme tokens** and which **adapt across aspect ratios** (Lattice is
portrait-everything per `2026-06-25-retire-landscape-locks-portrait-everything.md`,
so a finish must read well at 16:9, 4:3, and portrait). Two requirements with a
real technical constraint behind them:

**Colors must resolve through `var(--token)`** (HARD RULE #3 — palette-blind, so
a finish recolors automatically when the theme or `dark` changes). The catch: an
SVG embedded as a `background-image: url("data:…")` is **static** — it cannot read
`var(--token)`. The existing treatments library already solved this and gives us
three graded strategies:

1. **Mask-based** (single token color per layer) — the SVG is a shape/luminance
   `mask-image`; the *color* comes from a `var(--token)` painted behind it. This
   is exactly how 8 of today's `mark-*` treatments work. Cheapest, export-safe,
   pure CSS. Covers most single-accent patterns.
2. **Gradient-based** (washes) — no SVG at all; `color-mix()` of `var(--token)`
   composed into the existing `--_bg-radial` / `--_bg-linear` compositor slots
   (`lib/base/base.treatments.css`). For color atmosphere this is the whole job.
3. **Inline-SVG-in-DOM** (multi-token) — for backgrounds that need *two or more*
   theme colors, the SVG must be injected into the slide DOM (not a data URI) so
   `fill="var(--token)"` / `currentColor` resolve. This is the only facet that
   needs a **transform** (string + DOM, HARD RULE #1 parity) and therefore the
   only one that touches the **`sanitizeSlideHtml` preview-frame gate** (HARD RULE
   #22) and the export materialization path. It is deliberately the *last* facet
   to build, not the first.

**Size adaptivity** — curated SVGs declare how they fill: `tile` (repeat),
`cover` (scale to fill, crop), or `contain` (fit). `preserveAspectRatio` +
`viewBox` keep them clean across aspect ratios; the wash/gradient facet is
resolution-independent by construction.

## Sourcing — pick · fabricate · bring-your-own

One artifact, three ways to get one — matching what the two existing Fabricate
surfaces (Theme Studio, Component Studio) already do (`input → optional AI →
live gate/derive → save to Library → export zip`):

- **Pick** — choose a curated finish from the library (the `background:`
  auto-complete set). Baked, palette-blind, zero cost.
- **Fabricate** — generate a fresh finish. **Parametric first**: deterministic
  controls (gradient stops/angle, pattern density, vignette strength, stamp
  placement) → CSS / mask output. Palette-blind by construction, export-safe, no
  per-render cost, no XSS surface. An AI "describe the finish you want" front door
  is a *later* layer, exactly as the Theme Studio added AI on top of a
  deterministic derive kernel (`2026-06-29-studio-theme-ai.md`).
- **Bring-your-own** — upload a background image or a brand mark. Rides the
  **existing asset plumbing** (`2026-06-09-drawing-board-asset-import.md`): stored
  in IndexedDB, materialized to a `data:` URI at render so all three render paths
  agree.

Saved finishes land in the **same unified Library** as themes and components, and
share via the established **lattice-asset zip** contract
(`2026-06-29-lattice-asset-share.md`) — a new `kind: "finish"` beside `theme` /
`component`, with a live-rendered showcase PDF.

## The Studio surface — a third Fabricate faculty

This is the "another fabrication feature" the request named: a **Finish Studio**,
the third Fabricate faculty beside Theme Studio and Component Studio. It picks /
fabricates / brings in finishes over a live preview, and writes the `background:`
front matter (or a per-slide `cover` class) into the open deck. It is built on
top of the engine primitives below — **not before them** (building Studio UI on a
missing primitive is the trap we avoid).

## Sequencing — each slice stands alone

1. **Engine: the `cover` finish primitive** *(first slice, confirmed).* A
   palette-blind full-bleed surface layer that composes with `dark` / `sketch`,
   driven by a small **closed** set of custom properties, with the curated library
   as named presets. Print-fidelity-safe (PDF drops CSS backgrounds by default —
   reuse the treatments' element-layer / `print-color-adjust` approach, not a bare
   `background-image`). No transform needed for the mask + gradient facets — like
   `dark`, it is pure CSS keyed off a class + front matter. **HARD RULE #20**: the
   full-bleed layer is positioned with inset/`padding`, never `margin`.
2. **Engine: the `stamp` (brand-mark) slot.** Deck-wide persistent placement via
   front matter, materialized through the existing asset bridge. (A logo-URL
   capability already exists first-party per the transform-DSL registry —
   `2026-06-29-component-transform-dsl.md` — reuse it; don't reinvent, HARD RULE
   #15.)
3. **Studio: the Finish Studio faculty** — pick / fabricate / bring-your-own,
   Library save + `lattice-asset` `kind:"finish"` share.
4. **Generation depth** — parametric controls first; AI "describe it" front door
   later.

The multi-token inline-SVG facet (the only one needing a transform + the
`sanitizeSlideHtml` / export-materialization paths) is sequenced **after** the
mask + gradient facets, so the first slices carry no new security surface.

## Gates this must honor

- **#1** two-path parity — any facet that uses a transform ships `applyToHtml` +
  `applyToDom` with identical output (parity-tested).
- **#3** no hex in layout CSS — every finish color is `var(--token)`.
- **#9** a per-feature demo deck `examples/finish.md` (+ committed PDF).
- **#10 / #6** CHANGELOG + the canonical Finish docs (`design-system.md §6`,
  `lib/base/base.docs.md`, `design/theming.md`) updated *in the same change* —
  including flipping `background` from "reserved, inert" to "implemented."
- **#20** no `margin` in the full-bleed layer.
- **#22** any inline-SVG / brought-in HTML reaches the preview frame only through
  `sanitizeSlideHtml`.
- **Export sign-off (Quality Bar)** — the `cover` primitive alters exported
  bytes, so a representative demo deck renders in **dark and light** and goes back
  for inspection before that slice is called done.

## Open questions (resolve at build time, not now)

- **Stamp placement vocabulary** — corner slot(s)? opacity/scale? per-slide
  suppression on full-bleed cover slides? Likely a small front-matter object.
- **Cover + content legibility** — does a busy cover need an automatic scrim
  (a token-driven overlay) behind the content box to hold contrast? Probably yes;
  spec it with the WCAG audit the Theme Studio already runs.
- **Curated library size & taxonomy** — how many starter finishes, grouped how
  (blueprint / topo / grid / dot / wash families?). Start small, expand on use.
