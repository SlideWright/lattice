# `split:` — a front-matter key for heading-driven slide division

**Date:** 2026-06-13 · **Status:** landed (opt-in; default `rule`)

## Problem

Marp divides slides only on a `---` thematic break. Three dashes are easy to
forget, and a body full of bare `---` is exactly what markdownlint's `MD035`
and most house styles dislike. Lattice's "sticky rule" is already that the
first `#` is the lead title and each `##` is a slide title — so the headings
*could* do the dividing. We wanted one front-matter key to drive that, binary
(two modes, unlike Mermaid's many-knob theming), with a chosen default.

## Decision

A deck-wide front-matter key **`split:`** with two values:

| value | divides on | default? |
|---|---|---|
| `rule` | a top-level `---` only (Marp-compatible) | **yes** |
| `headings` | the first `#` (lead) + every `##`, **and** `---` (hybrid) | no |

- **Name `split:`** — already reserved for this in the 2026-06-10 Marp-replacement
  proposal §12.3, and consistent with the `finish:` / `islands:` / `theme:`
  single-noun directive convention.
- **Default `rule`** — chosen for forward least-surprise. Both modes are
  backward-compatible for *today's* corpus (see Evidence), so the constraint
  "what was written still works" does not force the choice; the deciding factor
  is a *future* deck that intentionally stacks two `##` on one slide (a
  comparison layout), which would silently fragment under a headings default.
  Shipping `headings` as a one-line opt-in now, with the invariance pinned by a
  regression test, leaves a **default flip as a safe, de-risked follow-up.**

## The semantics that mattered: eyebrow-aware, hybrid

Naively splitting before *every* heading (what marp-core's native
`headingDivider` integer does) is wrong for Lattice: ~40% of committed slides
(219 / 555) open with an eyebrow tag or a `<!-- _class -->` directive written
*above* the title. A naive split would orphan all of them onto the previous
slide. So `split: headings`:

- **is eyebrow-aware** — the break fires only before a slide's *second-or-later*
  heading, and is then **pulled back** over the heading's lead-in run (its
  directive comments + eyebrow paragraph) so that lead-in travels onto the new
  slide. Lead content above the *first* heading of a slide always stays put.
- **is hybrid** — an author-written `---` still forces a break, so a heading-less
  slide (an image) or two slides under one idea remain expressible.

Because the pull-back only ever fires on a slide's 2nd+ heading, it never
disturbs a `---`-split deck (whose every slide has exactly one heading).

## Evidence (why the default flip is safe later)

Measured over all 42 committed decks (555 slides):

- **0** slides carry 2+ headings at level ≤ 2 → headings adds no unexpected
  splits.
- **219** slides lead with content before their heading → a *naive* divider
  would orphan them; the eyebrow-aware rule does not.
- Simulated + then verified through the shipping plugin: **every deck splits to
  the identical slide count under `headings` as under `rule`.** Pinned by
  `test/unit/parsing/heading-split.test.js` (the corpus-invariance suite).

## Implementation — one shared divider, both export paths

`split:` resolves via the pure `lib/core/resolve-split.js` (mirrors
`resolve-finish.js`). The divider is **one markdown-it plugin** —
`headingSplit` in `lib/integrations/marp/plugins.js` — that injects top-level
`hr` tokens `.before('marpit_slide')`. Both render paths already split on
top-level `hr` (marp-core's `marpit_slide` ruler; `lib/engine/slides.js`
`splitOnHr`), so injecting `hr` makes them split **identically** with no
per-path logic (HARD RULE #1). Wired into the marp-cli engine
(`marp.config.js`), the owned engine (`lib/engine`, used by the emulator +
playground), and the playground's marp-core fallback. Directive comments are
recognized as `marpit_comment` (marp-core) **and** `html_block`/`html_inline`
(the engine) so pull-back behaves the same in both.

The deck linter warns on an unknown value (`unknown-split`, gated on
`SPLIT_NAMES`), and the Drawing Board's Deck Setup panel exposes it as the
"Slide splitting" picker (`docs/src/playground/deck-config.js`).

Demo: `examples/split-headings.md` — a 7-slide deck with **no `---`**.

## Known limitation — the VS Code live preview

The VS Code Marp **preview** path (`dist/lattice-runtime.js`) is a DOM
post-processor over the stock marp-vscode extension's marp-core, which does
**not** load `marp.config.js` — so it cannot run `headingSplit`, and a
`headings`-mode deck that omits `---` will under-segment *in the live preview*
while still **exporting correctly** through the emulator/marp-cli. Re-splitting
already-rendered DOM (re-deriving pagination/headers/islands per synthesized
section) is fragile and out of scope for v1. Documented; a runtime DOM
re-split is a possible follow-up.

## Follow-ups

1. **Default flip** to `headings` once the opt-in has mileage — the invariance
   regression makes it a small, evidence-backed change.
2. **Preview parity** — optional runtime DOM re-split for `split: headings`.
