---
status: shipped
version: 1
supersedes: none
last-status-update: 2026-06-11
---

# Drawing Board — the Deck setup (front-matter config) drawer

The prompt (2026-06-11): the Drawing Board needs a **config button next to
the settings button** that lets authors set front-matter values, so "the
deck stays clean and behind the scenes we can modify front matter and make
it persistent … and survive refreshes." A drawer with contextual inputs,
some pre-filled.

This note records the design decisions, because the storage model had a
real fork worth fixing for future work.

## How front matter worked before this

It didn't — Drawing Board decks carried **no YAML front matter at all**.

- New decks start from the starter scaffold (a component `sample`, e.g.
  `verdict-grid`'s) or the Architect's onboarding scaffold — both bare
  Markdown (a `<!-- _class -->` comment + content), no `---` block.
- The deck **source is the single persisted + exported channel**: stored
  as `decks[].source` in IndexedDB (`drawing-board-store.js`), autosaved on
  every edit, reloaded on refresh. Anything in the source survives a reload
  for free.
- **Theme/palette is separate UI state**, not deck content: the top-bar
  palette `<select>` + light/dark toggle write `lattice-docs-palette` /
  `lattice-docs-mode` to localStorage, and `withTheme()`
  (`lib/playground/index.js`) injects the chosen palette as a `theme:`
  directive at render time, **overriding** any source `theme:`.
- So `size` / `paginate` / `header` / `footer` were unsettable, and an
  exported `.md` shipped **naked** — no `marp: true`, no pagination — so it
  rendered differently under marp-cli than in the studio.

## Decision 1 — store the front matter as a managed `---` block in the source

Considered: (a) a managed YAML block at the top of the deck source vs.
(b) a separate per-deck IndexedDB record injected at render + export.

**Chose (a).** The source is already the only channel that persists and
exports, so a block there survives refreshes and fixes the naked-`.md` bug
with **zero extra plumbing** — no second data channel to merge into the
live render and every export path, and no reconciliation when someone
hand-edits. Option (b) is the one that *sounds* clean but is riskier (the
multi-path drift the engine docs warn against), and it still has to emit
YAML at export anyway.

"The deck stays clean" is satisfied by **friendly controls, not a hidden
store**: the author never types YAML, and we re-emit a **minimal** block —
only non-default keys, always led by `marp: true`, and removed entirely
when nothing is configured (back to a pristine deck).

## Decision 2 — theme is NOT a control here

The top-bar palette picker owns the live theme and `withTheme()` overrides
any source `theme:`, so a theme control would be a live no-op that fights
the picker. The drawer owns what the picker doesn't: `size`, `paginate`,
`header`, `footer`, and the lower-traffic `class` / `math` / `lang`. A note
in the drawer points authors at the palette picker.

(Consequence left open: an exported `.md` still carries no `theme:`, so it
renders under marp-cli's default theme, not the studio palette. Same gap as
before this change; baking the active palette into the export block is a
separate export-fidelity nicety, not done here.)

## Decision 3 — `math` offers KaTeX / MathJax only (no "off")

marp-core's `math` global directive accepts only `katex` or `mathjax`
(`{value:e=>"katex"===e||"mathjax"===e?{math:e}:{}}`); it can't disable
math (that's a constructor option). So the control offers those two and
omits the key for the KaTeX default — no misleading "Off" that wouldn't
work.

## Shape

- `docs/src/playground/drawing-board-config.js` — pure `readFrontMatter` /
  `writeFrontMatter` (fs-free, DOM-free, unit-tested) + `createConfigPanel`
  (the DOM drawer). Writes go back through `window.__dbEditor.setValue`, so
  a change re-renders + autosaves via the controller's `onEdit`.
- The drawer reuses the existing slide-in drawer infra in
  `drawing-board.astro` (a third entry in the `defs` map, beside decks +
  settings) and the settings panel's row/switch/select styling.
- `writeFrontMatter` canonicalizes managed keys (re-quoting only when a
  value would break a flat YAML read) and **preserves unmanaged keys
  verbatim** (`style`, `backgroundColor`, a hand-typed `theme`, …), so the
  drawer composes with manual edits instead of clobbering them.

## Not done / out of scope

- Per-slide spot directives (`_class`, `_paginate`, …). The prompt's "per
  slide" was resolved to **deck-wide front matter only**; a per-slide
  section keyed to the active filmstrip slide is a future extension.
- Baking the active palette into the export block (see Decision 2).
