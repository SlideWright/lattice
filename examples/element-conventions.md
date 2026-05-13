---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · Trailing Element Registers"
footer: "Key Insight · Below-Note · Call-to-Action · Annotation"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Trailing element registers.

`Element Conventions · 2026`

Four markdown shapes, one canonical order, the bottom of every slide.

---

<!-- _class: cards-grid -->
<!-- _footer: "Overview · the four-register family" -->

## The four registers, composed by markdown shape.

- Key Insight
  - `> blockquote` — the observation. Accent-tinted panel with "KEY INSIGHT" eyebrow.
- Below-Note
  - Plain `<p>` — context. Gradient hairline above body text.
- Call-to-Action
  - `**bold**`-only `<p>` — the ask. Accent `▸` glyph before heading-color bold text.
- Annotation
  - `_italic_`-only `<p>` — the citation. Accent `✦` glyph before muted small text.

> The shape of the markdown picks the register. Selectors are mostly shape-based; the author's only job is canonical order.

---

<!-- _class: cards-grid -->
<!-- _footer: "Register 01 · Key Insight" -->

## Blockquote at the end of a slide becomes a Key Insight panel.

- The contract
  - One trailing `> blockquote` per slide.
- The shape
  - Accent-tinted bar, "KEY INSIGHT" eyebrow, body text in the heading color.
- The signal
  - "Here is the summary that ties the slide together."
- The exception
  - `quote` and `featured` layouts own the blockquote for primary content.

> The blockquote summarises; everything else extends. Reach for it when the slide needs a single sentence the room remembers.

---

<!-- _class: cards-grid -->
<!-- _footer: "Register 02 · Below-Note" -->

## A trailing plain paragraph becomes a Below-Note.

- The contract
  - One trailing plain `<p>` after the card content.
- The shape
  - Gradient accent hairline above, body-size text.
- The signal
  - "Context that frames the cards without summarising them."
- The neighbours
  - Goes between the Key Insight (above it) and the Call-to-Action (below it).

This is a below-note. It pins a single line of context under the cards with a hairline drawn above — visually separate from the card content but not a summary.

---

<!-- _class: decision -->
<!-- _footer: "Register 03 · Call-to-Action" -->

## Build vs. buy: build.

- Build
  - Three engineers, eight weeks, owns the data path end-to-end.
- Why not buy
  - Vendor lock-in on a hot-path primitive we cannot tune.
- Why not delay
  - Roadmap commitments slip past Q3, downstream teams stall.

**Approve scoping spike by Friday.**

---

<!-- _class: cards-grid -->
<!-- _footer: "Register 04 · Annotation" -->

## A trailing italic-only paragraph becomes an Annotation.

- The contract
  - One trailing `<p>` whose only child is `_italic_`.
- The shape
  - Accent `✦` glyph, then label-size muted text, lower hierarchy than below-note.
- The signal
  - "Skim this, don't dwell — source, scope, caveat, asterisk."
- The neighbours
  - Last in the trailing block, after any Call-to-Action.

_Source: pilot retrospective, six months across four product teams._

---

<!-- _class: cards-grid -->
<!-- _footer: "Composition · all four registers in canonical order" -->

## All four registers can compose on one slide.

- Key Insight
  - Blockquote — first of the trailing block.
- Below-Note
  - Plain paragraph — second, the context line.
- Call-to-Action
  - `**bold**` paragraph — third, the ask.
- Annotation
  - `_italic_` paragraph — fourth, the citation.

> Four registers, one canonical order — Key Insight first, Annotation last.

Use all four sparingly — a slide carrying summary plus context plus ask plus citation is doing too much.

**Pick the two registers that close the argument cleanly.**

_Lattice element conventions, May 2026 — see `docs/references/templates.md` § Trailing Element Registers._

---

<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _footer: '' -->

## Author trailing registers in canonical order.

The CLI render path composes any order cleanly. The Marp-preview path is position-sensitive — out-of-order trailing registers silently lose the hairline above the first one. Canonical order keeps both paths in agreement.

`docs/references/templates.md` § Trailing Element Registers
`docs/references/gotchas.md` § Trailing register out of canonical order
