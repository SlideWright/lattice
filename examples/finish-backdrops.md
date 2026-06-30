---
marp: true
theme: indaco
finish: blueprint
paginate: true
header: "Lattice · finishes"
---

<!-- _class: title silent backdrop-none -->

`Feature demo · finishes`

# A backdrop, set once.

A *finish* is the surface of a deck — the wax-and-polish layer over its
structure and palette. Set `finish: blueprint` in front matter and every slide
wears the same faint drafting grid. This title opts out with `backdrop-none`.

---

## The finish is a register, not per-slide markup.

`finish:` names the whole-deck surface in one token — orthogonal to `theme:`,
which still owns the palette. The engine reads it once and paints the backdrop
behind every slide, so you never repeat a class.

- Palette-blind
  - Every backdrop is `color-mix()` of the theme accent — swap the theme and it
    recolors itself.
- Export-safe
  - Pure CSS gradients (never masks), so the grid survives the PDF and PPTX.
- Legible by design
  - The accent stays faint, so text keeps its AA contrast with no scrim.

---

<!-- _class: list-tabular -->

## Five field backdrops ship in v1.

- Wash
  - A soft accent bloom from the top edge.
- Aurora
  - A two-corner glow for a sense of depth.
- Blueprint
  - A graph-paper grid — the drafting-table finish.
- Dots
  - A quiet dot grid behind your content.
- Hatch
  - Diagonal accent hatching, textured and energetic.

---

<!-- _class: backdrop backdrop-dots -->

## A slide can override the deck.

This slide carries `_class: backdrop backdrop-dots`, so its dot field replaces
the deck-wide blueprint grid for one slide. Per-slide wins; the rest of the deck
keeps its grid.

---

<!-- _class: agenda progress-2 -->

## How the backdrop is wired.

1. Front matter declares `finish: blueprint` `once`
2. The engine appends `backdrop backdrop-blueprint` `every slide`
3. The compositor paints it into the section `behind content`
4. A slide opts out with `backdrop-none` `per-slide`
5. The deck-lint guards typos `unknown-finish`

---

<!-- _class: kpi -->

## It composes with everything.

`Finish · indaco`

- Components
  - 53 layouts `unchanged`
- Treatments
  - tints + marks `compose`
- Render paths
  - engine + emulator + runtime `identical`

---

<!-- _class: backdrop-none silent -->

## Pick it in the Studio.

The Studio's Inspector has a **Finish** field — swatch-previewed, grouped Plain
and Backdrops — that writes this `finish:` register for you, with the live
preview updating as you choose. This slide is clean (`backdrop-none`).

---

<!-- _class: title silent -->

`one line to re-surface the room`

# Change the finish, keep the content.

Flip `finish:` to `wash`, `dots`, or `boardroom` and the same Markdown ships
with a new surface — no edits to a single slide.
