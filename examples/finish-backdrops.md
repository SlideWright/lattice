---
marp: true
theme: indaco
finish: atrium
paginate: true
header: "Lattice · finishes"
---

<!-- _class: title silent finish-none -->

`Feature demo · finishes`

# A finish is a stack of layers.

A *finish* is the surface of a deck — the wax-and-polish layer over its
structure and palette. Each preset composites up to four palette-blind layers
behind your content: a **wash**, a **texture**, a **mark**, and an **edge**. Set
`finish: atrium` once and every slide wears the same composition. This title
opts out with `finish-none`.

---

## The finish is a register, not per-slide markup.

`finish:` names the whole-deck surface in one token — orthogonal to `theme:`,
which still owns the palette. The engine reads it once and paints the layered
finish behind every slide, so you never repeat a class.

- Layered
  - A finish stacks `wash + texture + mark + edge` by z-index — layers combine,
    they don't replace each other.
- Palette-blind
  - Every layer is `color-mix()` of the theme accent — swap the theme and it
    recolors itself.
- Export-safe
  - Pure CSS gradients (never masks); every fade is opaque-to-opaque, so they
    survive the PDF and PPTX with no muddy gray.

---

<!-- _class: finish finish-meridian -->

## Meridian — duotone, contours, a ghost numeral.

This slide overrides the deck with `_class: finish finish-meridian`. A diagonal
duotone wash carries faint contour lines, and an oversized ghost numeral anchors
the bottom-right corner — all from one preset class.

---

<!-- _class: finish finish-strata list-tabular -->

## Strata — bands, a dot-matrix, a corner tick.

- Wash
  - Soft horizontal bands with a bold accent hairline pinned to the top edge.
- Texture
  - A fine 26px dot-matrix, even and faint across the slide.
- Mark
  - A corner registration tick in the top-right.

---

<!-- _class: finish finish-halo -->

## Halo — a spotlight section treatment.

A centered spotlight, concentric rings, and a whisper of a vignette frame the
slide — the bookend finish for a section or closing, on a clean light canvas with
dark, legible text. Set per-slide with `_class: finish finish-halo`.

---

<!-- _class: finish finish-ledger -->

## Ledger — ruled lines, a margin bar, a fold.

This slide carries `_class: finish finish-ledger`: fine horizontal ruled lines, a
bold accent bar down the left margin, and a top-right corner fold — a board-memo
surface. The deck-wide Atrium finish is replaced for this one slide.

---

<!-- _class: finish finish-nimbus -->

## Nimbus — a gradient mesh of soft blooms.

A new `mesh` wash floats three or four soft accent blooms across the slide — an
organic gradient-mesh atmosphere with no pattern at all, seated by a whisper of
a vignette. The wash intensity tunes how strong the blooms read. Pure premium
air, set per-slide with `_class: finish finish-nimbus`.

---

<!-- _class: finish finish-loom list-tabular -->

## Loom — a woven lattice, a movable glow.

- Texture
  - A new `lattice` cross-hatch — two diagonal weaves at ±45° — on-brand for the
    product, with the weave pitch tunable by scale.
- Wash
  - A corner glow, here moved to the top-left to show the placement axis at work.
- Tunable
  - Move the glow, change the weave scale, and the whole surface re-tailors.

---

<!-- _class: finish finish-savile -->

## Savile — a tailored pinstripe, a placed monogram.

A new `pinstripe` texture rules fine vertical lines — Savile Row on a slide —
with the pitch tuned by scale. A movable monogram (your initials, via the glyph
param) sits in the bottom-right corner. Editorial and tailored, set with
`_class: finish finish-savile`.

---

<!-- _class: finish finish-gallery -->

## Gallery — a museum keyline frame.

A new `frame` edge draws a thin inset keyline border — no soft shadow, just four
crisp accent strips — around a centered spotlight, with a movable ghost numeral
labeling the plate. Museum framing, set per-slide with `_class: finish
finish-gallery`.

---

<!-- _class: agenda progress-2 -->

## How the finish is wired.

1. Front matter declares `finish: atrium` `once`
2. The engine appends `finish finish-atrium` `every slide`
3. The compositor blends the layer props `behind content`
4. A slide overrides with `_class: finish finish-<name>` `per-slide`
5. A slide opts out with `finish-none` `clean`

---

<!-- _class: finish-none silent -->

## Pick it in the Studio.

The Studio's Inspector has a **Finish** field — swatch-previewed, grouped Plain
and Finishes — that writes this `finish:` register for you, with the live preview
updating as you choose. This slide is clean (`finish-none`), so you see the
deck's default Atrium finish nowhere here.

---

<!-- _class: title silent -->

`one line to re-surface the room`

# Change the finish, keep the content.

Flip `finish:` to `halo`, `ledger`, or `boardroom` and the same Markdown ships
with a new surface — no edits to a single slide.
