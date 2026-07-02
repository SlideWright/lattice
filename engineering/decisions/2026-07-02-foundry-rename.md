---
status: shipped
summary: Rename the Studio's theme/component/finish authoring view from "Fabricate" to "Foundry". Records why Fabricate was retired, why the front-runner "Weave" was rejected after a rebase surfaced collisions (the finish system owns loom/lattice-weave/mesh; mode: is a render axis), the three-lens red-team (inversion + two independent checkers), and the implementation.
last-updated: 2026-07-02
---

# Renaming the Studio "Fabricate" view → "Foundry"

**Date:** 2026-07-02
**Status:** Shipped — implemented on this branch.
**Surface:** the Studio view formerly at `view: 'compose' | 'fabricate'`
(`docs/src/components/studio/`), which hosts the Theme, Component, and Finish
sub-studios. The engine's stable surfaces (layouts, palette tokens) are
untouched; this is a UI-label + internal-identifier rename in the docs-site
Studio.

## The problem

"Fabricate" named the view where an author builds the visual system — themes,
components, and finishes. It was disliked for feeling generic and off, and it
has a concrete defect: **_fabricate_ also means _falsify_.** The Architect's
honesty code is saturated with that sense — "never a fabricated edit," "never a
fabricated answer," "not a fabricated figure." Naming the *creative* surface
after the word used for *the AI lying* is a self-collision.

## What we explored, and the two false premises a rebase exposed

The early front-runner was **"Weave"** (a lattice is woven; it spans
themes = color-threads and layouts = structure), inside a "two registers"
framing: *modes are verbs* (Compose/Weave/Present), *assistants are personas*
(Architect/Coach).

Rebasing onto `main` (+66 commits) invalidated that framing:

1. **"Mode" is now a first-class, user-facing engine axis.** `mode:`
   (`lib/core/resolve-mode.js`, `mode-catalog.ts`, `ModePicker.tsx`) selects the
   render mode (Boardroom / Sketch), with its own Inspector field — plus "Focus
   mode," "Light/Dark mode," "Practice mode." Labeling the top-level sections
   "Modes" would collide three ways.
2. **The weave/textile metaphor is owned by the `finish:` system.** Preset
   **`loom`** (blurb: "a woven lattice cross-hatch"), texture **`lattice`**
   (label "Lattice weave"), plus **`mesh` / `pinstripe` / `frame`**. A view named
   "Weave" would read as *where you apply woven finishes* — and those controls
   live *inside the very view*. Disqualifying.
3. Two premises the "systems" framing rested on were simply wrong in the current
   code: there is **one** AI persona (the **Architect**; "Coach"/"Chat" are its
   tabs), and the sections are not labeled Compose/Weave/Present (the compose
   view is "Decks"; Present/Share are verbs; Focus is a posture). **The only real
   rename target is the one view.**

## Method — inversion + independent checkers

Three agents ran against the current code, each a different lens
(cf. the Munger inversion pass in the website-copy review):

- **Inversion** — argued Weave and "Modes" are *wrong*, then proposed the right
  answer. Landed on "Design" / collective "Workspaces."
- **Collision audit** (independent) — mapped every user-facing appearance/section
  term with file:line evidence; confirmed "Weave" and "Modes" collide; found the
  zero-collision set **Foundry / Workshop / Forge**. (Also flagged an off-path
  bug: `RESERVED_FINISH_NAMES` is stale — logged separately, not fixed here, per
  HARD RULE #18.)
- **Brand-fit** (independent) — read the new "deterministic design" positioning;
  scored candidates; picked "Design" on voice, noting craft names read
  industrial.

## The decision: **Foundry**

The field collapsed to **Design** vs **Foundry**:

- **Design** is clearest and echoes the "already _designed_" positioning — but
  it is *generic*, the exact quality that made "Studio"/"Fabricate" unsatisfying,
  and "design" is already used as a verb in the Architect prompt.
- **Foundry** has zero user-facing collisions anywhere in `docs/src`, is
  distinctive, and is *apt*: a **type foundry** is where visual/design assets are
  cast — a precise home for the Theme + Component + Finish studios. It honors the
  **SlideWright** maker identity (a _wright_), and "cast identical parts from one
  mold" reinforces the deterministic-design message rather than fighting it.

The lattice/structure metaphor is now fully occupied by the finish system, so
"honor Lattice" is served where it belongs (the product name **Lattice Studio**
and the finish textures), and the view name is free to be a clear, distinctive
maker word. **Foundry.**

## Implementation

- `view: 'compose' | 'fabricate'` → `'compose' | 'foundry'`; component
  `Fabricate` → `Foundry`; file `Fabricate.tsx` → `Foundry.tsx`; prop
  `onFabricate` → `onFoundry`.
- User-facing copy: launcher item, command-palette entry ("Foundry — Theme &
  Component Studio"), lazy-load fallback ("Loading the Foundry…"), Library empty
  state, and the `studio.astro` meta description.
- Feature-context comments/adjectives ("your Fabricated themes", "the Fabricate
  studio") → Foundry forms. **Lowercase generic-verb and honesty uses were left
  untouched** ("a fabricated finish" as *constructed*; "never a fabricated
  answer"; the Deloitte "AI fabrications" example).
- Verified: 290 Studio vitest tests pass; docs typecheck clean; changed files
  lint clean.

## Not done here (off-path, logged)

`RESERVED_FINISH_NAMES` (`finish-library.ts`) omits the shipped
`nimbus/loom/savile/gallery` presets, so a user could save a custom finish that
shadows a built-in. Out of scope for a rename; tracked separately.
