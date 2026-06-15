# `split:` — a front-matter key for heading-driven slide division

**Date:** 2026-06-13 · **Status:** landed; **default flipped to `headings`** (see Update)

> **Update (2026-06-13, same day):** the default was flipped from `rule` to
> **`headings`** in a follow-up, and the architecture reframed: **Lattice's own
> engine is the source of truth**, and **Marp is an export *target*, not a live
> render path**. The marp-vscode preview limitation below is therefore no longer
> something we patch — the Lattice-native surfaces (Drawing Board preview, PDF
> export) are always correct, and vanilla-Marp portability is served by a planned
> "Export to Marp" bundle that bakes the computed splits into literal `---`
> (self-contained `.md` + themes + README). See §Known limitation / §Follow-ups.

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
| `headings` | the first `#` (lead) + every `##`, **and** `---` (hybrid) | **yes** (after the flip) |
| `rule` | a top-level `---` only (Marp-classic) | no — explicit opt-out |

*(Originally shipped with `rule` as the default to de-risk; flipped to `headings`
the same day once the corpus-invariance regression confirmed no committed deck
changes — see Update at top and §Evidence.)*

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
`headingSplit` in `lib/integrations/markdown-it/plugins.js` — that injects top-level
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

## Known limitation — vanilla Marp (incl. the marp-vscode live preview)

Stock Marp (the marp-vscode preview, a bare `marp-cli` invocation that doesn't
load our config) doesn't run `headingSplit`, so a default/`headings` deck that
omits `---` divides only on `---` there — under-segmenting relative to our
output. **This is by design under the reframed architecture:** Lattice's own
engine is the source of truth (the Drawing Board preview and the PDF export are
always correct), and Marp is an *export target*, not a live render path we keep
in lockstep. The right fix is therefore not to patch the preview but to ship
**Export to Marp** — a self-contained bundle (`.md` + themes + README) whose
`.md` has the computed splits **baked into literal `---`**, so it renders
correctly in any vanilla Marp tool with zero dependency on our code. (Emitting
Marp's native `headingDivider` was considered and rejected: it splits before
*every* heading, re-orphaning the eyebrow/`_class` lead-in our pull-back exists
to fix — verified — and conflicts with our splitter when both are present.)

## Follow-ups

1. ~~**Default flip** to `headings`.~~ **Done** (same-day follow-up) — the
   corpus-invariance regression confirmed no committed deck changes.
2. **Export to Marp** — the self-contained bundle (`.md` with splits baked into
   `---`, + themes + README). This is the sanctioned path for using a Lattice
   deck in any vanilla Marp tool, and the proper resolution of the preview
   limitation above. Its own feature, to be specced separately.
