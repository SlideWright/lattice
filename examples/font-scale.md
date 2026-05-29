---
marp: true
size: 4K
theme: cuoio
paginate: true
header: "Lattice · Global Font Scale"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Bigger when the room is bigger

`Typography · Global Font Scale`

One modifier bumps every font on a slide — or the whole deck — up in lockstep.

---

<!-- _class: cards-grid -->
<!-- _footer: "The three steps · cards-grid" -->

## Three steps, one knob.

- `scale-l` — ×1.15
  - Gentle bump. Slightly larger rooms; body lands near 18 pt.
- `scale-xl` — ×1.3
  - Strong. Projection and back-of-room reading; body near 21 pt.
- `scale-2xl` — ×1.5
  - Dramatic. Large halls and low-vision accessibility; body at 24 pt.
- One multiplier
  - `--fs-scale` feeds all 12 tokens, so proportions hold — only the magnitude moves.

---

<!-- _class: cards-grid -->
<!-- _footer: "Default footprint — no modifier · cards-grid" -->

## Default — tuned for desk distance.

- Body
  - Cards, lists, and prose at the baseline 16 pt.
- Headings
  - Every h-level at its normalized size.
- Chrome
  - Footer, pagination, and eyebrow labels.
- Hero
  - The one big number, when a slide has one.

---

<!-- _class: cards-grid scale-l -->
<!-- _footer: "Same slide, scale-l · cards-grid scale-l" -->

## scale-l — a gentle lift.

- Body
  - Cards, lists, and prose at the baseline 16 pt.
- Headings
  - Every h-level at its normalized size.
- Chrome
  - Footer, pagination, and eyebrow labels.
- Hero
  - The one big number, when a slide has one.

---

<!-- _class: cards-grid scale-xl -->
<!-- _footer: "Same slide, scale-xl · cards-grid scale-xl" -->

## scale-xl — projection size.

- Body
  - Cards, lists, and prose at the baseline 16 pt.
- Headings
  - Every h-level at its normalized size.
- Chrome
  - Footer, pagination, and eyebrow labels.
- Hero
  - The one big number, when a slide has one.

---

<!-- _class: cards-grid scale-2xl -->
<!-- _footer: "Same slide, scale-2xl · cards-grid scale-2xl" -->

## scale-2xl — the back row.

- Body
  - Prose at 24 pt.
- Headings
  - Lifted in lockstep.
- Chrome
  - Footer and page number grow too.
- Hero
  - Scales with everything.

---

<!-- _class: big-number scale-xl -->
<!-- _footer: "The hero scales too · big-number scale-xl" -->

`Across the Board`

- 1.3×
  - Even the display tier rides `--fs-scale`. The hero, the headings, and the chrome all move together — nothing is left behind at the original size.

---

<!-- _class: cards-grid -->
<!-- _footer: "Scope is native Marp class scoping · cards-grid" -->

## One slide, or the whole deck.

- One slide
  - `<!-- _class: cards-grid scale-xl -->` — the spot directive scales just this section.
- Whole deck
  - Put `class: scale-xl` in the front matter — every slide grows.
- Composes
  - Stacks with any layout or variant — `dark`, `kpi`, grids — it only sets a custom property.
- Not a size picker
  - For one wrong element, fix its token. Scale is for magnitude, not surgery.

---

<!-- _class: closing -->
<!-- _header: '' -->
<!-- _footer: "Closing · closing" -->
<!-- _paginate: false -->

`Reach for it when the room demands it`

## Same deck, two distances.

`Author once at desk-distance, then scale up for the projector — the proportions you tuned come along for free.`
