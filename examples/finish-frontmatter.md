---
marp: true
theme: carta
finish: sketch
paginate: true
---

<!-- _class: title silent -->

`finish: sketch`

# One key, a hand-drawn deck.

Set the finish once in front matter and every slide inherits the register.

---

## The finish is a register, not a layout class.

`finish:` names the whole-deck voice in a single readable token — orthogonal
to `theme:`, which still owns the palette. The engine reads it once and
appends the mapped classes to every slide, so you never repeat `sketch` on a
per-slide directive.

- Boardroom
  - The clean baseline — omit the key and you get it.
- Sketch
  - Felt-tip headings, a hand-sans for prose, drawn boxes.
- Sketch-clean
  - Hand headings and boxes, but a clean body for dense slides.

---

<!-- _class: cards-grid -->

## It composes with per-slide layouts.

A per-slide `_class:` is appended to, not overwritten by, the deck-wide
finish — so `cards-grid` here renders as a hand-drawn grid with no extra
markup.

- Append, not replace
  - `finish: sketch` + `_class: cards-grid` becomes `cards-grid sketch`.
- Palette-blind
  - The finish wobbles type and geometry; the theme still colours it.
- Two render paths
  - The owned engine and the live preview both read the same key.

---

<!-- _class: agenda progress-2 -->

## How the deck is wired.

1. Front matter declares `finish: sketch` `once`
2. Every slide inherits the hand register `auto`
3. Per-slide layouts compose on top `cards-grid`
4. The linter guards against typos `unknown-finish`
5. Swap to `boardroom` to ship it clean `one line`

---

## A typo can't ship silently.

An unrecognized value resolves to no classes, so a misspelling like
`finish: sketchh` would quietly render the boardroom baseline. The deck
linter catches it first.

- The guard
  - `npm run lint:deck` flags it as an `unknown-finish` warning.
- The fix
  - Use one of `boardroom`, `sketch`, or `sketch-clean`.
- The principle
  - No magic default — the baseline has a name you can read.

---

<!-- _class: title silent -->

`one line to re-skin the room`

# Change the finish, keep the content.

Flip `finish:` to `boardroom` and the same Markdown ships as a clean
boardroom deck — no edits to a single slide.
