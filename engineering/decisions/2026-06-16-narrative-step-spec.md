---
status: proposed
summary: Field-level spec for the narrative step model — authoring grammar and step data contract reusing the focus feature substrate
---

# Narrative step model — the field-level spec (increment 1)

**Status:** spec decided 2026-06-16. Makes the §6 authoring sketch of
`2026-06-16-narrative-step-model.md` real at field level — the **first staged
increment** (that ADR §11.1). Owns the **authoring grammar + the step data
contract**; the runtime/Present-mode engine that consumes it is increment 2
(§11.2), the overlay-PDF export increment 3, the motion vocabulary increment 4.
The anti-wizbang line (that ADR §8/§8.1) governs all of it.

The pivotal realization this spec rests on: **a build is "focus sequenced over
time."** The focus feature (`2026-06-16-focus-highlighting.md`) already ships the
exact substrate — an ordinal grammar over a slide's *primary collection*, resolved
per axis, with the **engine tagging elements and CSS doing the treatment** across
both render paths. The step model reuses that wholesale instead of inventing a
parallel mechanism.

---

## 1. The unit and the timeline

- A **step** reveals (or, later, transforms) one or more **steppable units**.
- A deck flattens to an ordered **step timeline**; a slide contributes
  `max(1, buildSteps)` steps, and slide boundaries are a subset of step boundaries.
- State is **accumulative**: at step *k* every unit with `step ≤ k` is shown. The
  final step of a slide = the fully-assembled slide = its static render.

## 2. Steppable units — DERIVED, reusing the focus axes

A build never hand-places elements. The unit set is the slide's **primary
collection** on one axis, the same resolution focus uses (`lib/transformers/focus.js`,
extracted to a shared `lib/core/collections.js` so focus + build share ONE
"find the collection for axis X" implementation — HARD RULE 15):

| axis | unit | source |
|---|---|---|
| `item` *(default)* | top-level `<li>` | the slide's first list / card grid |
| `row` | `<tbody> <tr>` | first table |
| `col` | the Nth cell of every row | first table |
| `line` | a code line (`<span class="ln">`) | first code block |

**Document order = step order**, by default one unit per step. No animation pane,
no per-element authoring — the markdown order *is* the build order (anti-wizbang
§8.1).

## 3. Authoring grammar — `_build`, mirroring `_focus`

A per-slide directive (deck-level `build: on` front-matter opts a whole deck in):

```
<!-- _build -->            one step per item of the primary collection (default axis)
<!-- _build: rows -->      pick the axis (item | rows | cols | lines)
<!-- _build: 1, 2-3, 4 --> grouping: step1=item1, step2=items2+3, step3=item4
<!-- _build: none -->      opt a slide OUT (when the deck defaults on)
```

Grammar is a strict subset of the focus ordinal grammar (ranges `2-4`, lists
`1, 3`), so authors learn it once. **Banned by construction** (§8.1): anything
beyond axis-selection + grouping — no easing, no per-unit effect, no manual order.

## 4. The tag contract — engine tags, CSS/runtime reveal

The kernel (a sibling transformer `lib/transformers/build.js`, one kernel ·
`applyToHtml` + `applyToDom`, idempotent on a `data-build-resolved` marker — exactly
focus's shape) stamps:

- on each steppable unit: **`data-build="N"`** — the 1-based step it appears at.
- on the `<section>`: **`data-build-steps="T"`** — the total step count.
- the *current* position is **`data-build-at="K"`** on the `<section>`, set by the
  consumer (runtime/player/export). **Absent ⇒ all units shown** — so a non-build
  render, the live preview, and the final-state PDF are unchanged by construction.

CSS (`lib/base/base.build.css`, palette-blind, bundled like base.focus.css) is the
only thing that hides/shows:

```css
section[data-build-at] [data-build]            { /* shown */ }
section[data-build-at="1"] [data-build="2"],
section[data-build-at="1"] [data-build="3"]    { /* hidden — N > K */ }
```

(Realized with a small `--build-at`/attribute comparison, not `:has()` — HARD RULE 12.)
Reveal is the only treatment in this spec; the *motion* of the reveal (instant vs a
typed `build` transition) is increment 4, and **`prefers-reduced-motion` is always
instant**.

## 5. Consumers (each its own increment)

- **Static, final-state (default):** no `data-build-at` → every unit shows →
  **pixel-identical to today**. This is the 0-pixel guarantee for the engine increment.
- **Overlay PDF (opt-in, increment 3):** render each step as a page by setting
  `data-build-at` = 1..T per `<section>`. Page-count = Σ steps. Doubles as the
  reduced-motion / async rendering.
- **Live / Present mode (increment 2):** the player holds a `(slide, step)` cursor;
  "next" increments `data-build-at` until `= data-build-steps`, then advances the
  slide; "prev" symmetric. Scroll driver (increment 5) maps scroll progress → cursor.

## 6. Discipline (inherited, non-negotiable)

Governed by `2026-06-16-narrative-step-model.md` §8/§8.1: derived · typed · meaning-
bearing · losslessly degradable. A build is for genuine narrative sequence — using
it to drip-feed a wall of text is a content smell, not a use case. **Morph stays a
gated, may-be-cut experiment (§3 there); this spec is reveal-only.**

## 7. Non-goals / out of scope here

- No engine/runtime code (increment 2); no overlay export (3); no motion (4); no
  scroll (5); no morph (6). This increment is the **contract** only.
- No new render path; no change to any non-build slide's output.
- The `_build` grammar deliberately admits nothing the focus grammar doesn't.

## 8. Open questions (resolve in increment 2)

- Per-component default step granularity (a 6-card grid: 6 steps, or 1 group?).
  Lean: one step per top-level unit; authors group down with the spec.
- Whether `build: on` deck default is worth shipping before per-slide proves out
  (probably per-slide first, matching how masthead-lift graduated).
- Interaction of a build with an existing `_focus` on the same slide (compose? last
  wins? — likely: focus applies at the final build step).

## 9. Gates (for the increments that carry code)

Engine increment: `tools/pixel-check.js` 0-diff on every existing deck (no
`data-build-at` ⇒ unchanged); per-axis unit tests (HTML kernel ↔ DOM mirror parity,
idempotence) mirroring `test/unit/transformers/*focus*`; lint · build:check · unit ·
integration green; maker-checker. Overlay increment: page-count = Σ steps; the
final-state export stays 0-diff.
