# Slot-header auto-lift — bold is optional, never required

**Date:** 2026-06-07
**Status:** implemented (PR #72)
**Scope:** `lib/core/slot-label-lift.js`, `lib/integrations/markdown-it/plugins.js`,
`lib/runtime/index.js`, `lattice-emulator.js`, `lib/components/index.js`,
`lib/authoring/lint.js`, plus the `timeline` / `list-criteria` / `actors` /
`split-brief` / `split-metric` / `split-statement` manifests.

## Symptom

Several layouts rendered a list item's first line as a bold **header**, but
only if the author *typed* `**bold**` — the engine did not generate it. So a
deck authored as `1. Pilot` instead of `1. **Pilot**` lost its headers
silently. For the panel-split layouts this was disastrous: a `split-metric`
finding authored without bold collapsed the entire right panel into flat,
unhierarchied gray text (no error, just a broken boardroom slide).

## Findings

Lattice has **two** ways to make "the first line of a list item is a bold
header," and they are not interchangeable:

- **CSS li-weight** (cards-grid family) — the `<li>` is `font-weight:700`,
  the nested body bullet reset to `400`. The title is a bare text node. Pure
  CSS, no transform, can't fail to fire. Cannot position the title (a text
  node can't go in a grid cell / corner tag).
- **`slotLabelLift`** (`lib/core/slot-label-lift.js`) — a preprocessor wraps
  the lead in a real `<strong>`; CSS targets `> li > strong`. The title is an
  element, so it can be grid-placed, corner-tagged, recolored. Runs in all
  three render paths and is **idempotent** — an already-`<strong>` lead is
  left alone, so author-typed `**…**` is a no-op.

`slotLabelLift` is the strict superset (anything the CSS way does, the lift
also does; a bare text node can't be positioned). The lift only fires when an
item has a **nested body** — it wraps the lead *up to* the nested `<ul>/<ol>`,
which is how it knows where the title ends.

The real footgun is the **inline shape** `- Title. body` (everything on one
line). It breaks *both* mechanisms — CSS way bolds the whole line (body
included); lift way finds no boundary and bolds nothing — and it is
**fundamentally ambiguous**: with neither a `**` marker nor a nested bullet,
nothing says where the title ends, so it cannot be auto-resolved.

## Decision

1. **Auto-lift the layouts that were forcing bold.** Added `timeline`,
   `list-criteria`, `actors`, `split-brief`, `split-metric`, `split-statement`
   to the `slotLabelLift` allowlist (the `SLOT_LAYOUTS` regex in
   `lib/integrations/markdown-it/plugins.js`, plus the emulator and runtime mirrors).
   Their shipped samples / galleries / docs drop the bold and use the nested
   `- Title` / `  - body` shape. Existing decks that still type `**…**` render
   identically.

2. **`actors` chip-tail.** `actors` items carry a trailing inline-`code`
   actor-name pill (`- Owns the model \`Owner\``). An opt-in `chipTail` keeps
   that `<code>` a *sibling* of the lifted `<strong>` so its right-aligned
   grid placement survives. Default behavior (trailing code stays inside the
   label) is unchanged.

3. **Whole-class-token matching.** The allowlist now uses
   `(?<![\w-])name(?![\w-])` boundaries (and a `hasClass` helper in the
   emulator) so `timeline` does not match the unrelated `timeline-list` chart
   class — a plain `\b` boundary did, because `-` is a word boundary.

4. **Standardize the contract, not the engine.** Keep both mechanisms (each is
   legitimate); the thing standardized is the **authoring contract: nested
   form only, inline form lint-blocked.** A future unification *onto* the lift
   (migrating the CSS-li-weight cards to `> li > strong`) is a possible
   north-star, not a requirement — tracked as opportunistic, not big-bang.

5. **Guard what the lift can't rescue.** `findSplitBodylessItem` +
   `SPLIT_SLOT_LAYOUTS` (`lib/components/index.js`) flag a split right-panel
   item with no nested body — wired as an **error** in both the manifest
   validator and `npm run lint:deck` (`split-bodyless-item`). Three further
   **warnings** cover the by-element-type extraction footguns:
   `split-missing-headline` (no `## ` on an h2-anchored split — split-statement
   excluded, it's blockquote-anchored), `split-statement-missing-quote` (no
   `> `), `split-compare-option-count` (≠ 2 options). All 92 committed decks
   stay lint-clean.

## Intentionally left manual

- **`math` (`theorem`, `matrix`).** Not automated, by design. `theorem` labels
  (`**Definition.**`, `**Theorem.**`, `**Proof.**`) live inside **blockquotes**
  — we don't auto-format blockquote content — and the `**Definition.**`
  convention is exactly how mathematicians write formal statements; it reads
  correctly in raw markdown. `matrix`'s `- **label** — value` legend is the
  same specialized authoring. **This is the legitimate `<strong>` case; math
  authoring stays unconstrained — no lift, no guard, no lint rule references
  math. Do not "fix" it in a future audit.** (If a sweep re-flags it, the
  answer is this note.)
- **`citation-card`.** Its `:has(> strong:first-child)` eyebrow path is dead
  code in shipped decks (the bullets are plain prose), so it is not an
  author-bold burden — left as-is, not auto-lifted (lifting would wrongly bold
  every gloss sentence).

## See also

- Mechanism / where the kernel lives: `engineering/architecture.md`
  ("Where transforms live" → `lib/core/` structural primitives).
- The lift kernel + its three sibling implementations:
  `lib/core/slot-label-lift.js` header comment.
- Card-style sibling contract (the CSS-li-weight footgun + its validator):
  `CARD_STYLE_LAYOUTS` in `lib/components/index.js`.
