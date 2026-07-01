---
marp: true
theme: indaco
paginate: true
header: "Lattice · layout debug"
debug: on
---

<!-- _class: title silent -->

`Feature demo · debug overlay`

# See the boxes your layout is made of.

Set `debug: on` in the front matter and every preview — Playground, Drawing Board,
Studio — outlines each box by its **layout mode**; **hover** one to read its label.
It travels with the deck, and it is **stripped from every export**, so a boardroom
PDF is byte-identical whether debug is on or off.

---

## Read the grid at a glance.

At rest you see only the outlines — each box colored by how it lays its children
out: **grid** (blue), **flex** (vermillion), **flow** (gray). **Hover** any box to
reveal its label (and its containers') in full detail. Want the whole map pinned on
at once instead? Use `debug: always`.

- Tool A · Chorus
  - [x] Speed
  - [-] Auditability
  - [x] Adoption
  - [ ] Calibration
  - Strong call recording and summarization. No decision logging or calibration loop.
- Tool B · Productboard
  - [ ] Speed
  - [x] Auditability
  - [x] Adoption
  - [ ] Calibration
  - Solid intake and prioritization. Decision logging is manual and rarely used.
- Tool C · Notion
  - [x] Speed
  - [x] Auditability
  - [-] Adoption
  - [ ] Calibration
  - Flexible enough to build the whole system — but the result is fragile to maintain.
- Tool D · Sprig + Decision Log
  - [x] Speed
  - [x] Auditability
  - [x] Adoption
  - [x] Calibration
  - Meets all four criteria within the weekly budget. Recommended.

<!-- _class: verdict-grid -->

---

<!-- _debug: all -->

## Pull every lever on one slide.

`<!-- _debug: all -->` turns on the full set — `identity · layout · size · class ·
box` — for **this slide only**. The deck-wide `debug: on` stays the default
everywhere else; a spot directive just overrides the box it sits on.

- Sizes are the **intrinsic** pixel box, read straight off the layout — not the
  scaled-down thumbnail you see in the filmstrip.
- `class` shows the raw CSS classes; `box` shows padding + gap. Both are opt-in,
  because on a dense slide they are more than you usually want to read.

---

<!-- _debug: off -->

## Mute a slide you have already checked.

`<!-- _debug: off -->` silences the overlay on one slide even while the deck is
debugging — handy once a layout is settled and the boxes are just noise.

Because labels are hover-summoned by default, a busy grid never becomes a wall of
chips: you pull detail in only where you point, one box (and its containers) at a time.

---

<!-- _class: closing -->

# Debug in the preview. Ship it clean.

`debug: on` is an authoring aid, not a deck style — the engine strips it from the
PDF, PPTX, and HTML exports, so it can never end up in front of a board.
