---
status: design-decision
version: 1
supersedes: none
builds-on: 2026-06-16-social-mobile-portrait-sizes.md, 2026-06-16-form-manifest-medium-independent-contract.md, 2026-06-16-retire-section-as-grid.md
---

# Orientation in the Form model

Where does portrait/landscape live in the Form model (Frame · Cell · Tile ·
Component), and how is "this layout supports portrait" *declared* vs *made true*?

A four-figure walkthrough of the model these terms refer to is published on the
docs site: `/spec/form-model/` (source: `docs/src/content/docs/spec/form-model.mdx`;
figures are the live component `docs/src/components/spec/FormDiagram.astro`). The canonical model is `design/forms.md`.

## Context

The social/mobile work (`2026-06-16-social-mobile-portrait-sizes.md`) added
portrait `@size` presets and made the engine orientation-aware via a deck-wide
`data-orientation` stamp + the `--canvas-scale` lever + per-component reflow CSS
(PR #407). That works, but it raised the architectural question: *shouldn't the
Form model own orientation, so layouts are wired for both out of the box?*

Two facts constrain the answer:

1. **The Form model is "light"-coupled today** (`…form-manifest-medium-independent-contract.md`).
   Cell/Tile manifests are a *validated contract*, not a render-time layout
   engine. Placement is done by **transforms + CSS keyed on classes** — e.g. the
   `<h2>` title is moved into the masthead by `masthead.transform.js`, and the
   masthead/stage/footer Cell *CSS* positions the bands. The manifest never runs
   during a render.
2. **`section-as-grid` is retired** (`2026-06-16-retire-section-as-grid.md`).
   Component bodies stay **direct children of `section`**; there is no named-area
   grid wireframe the engine reshapes. The content's internal layout (kpi's
   metric grid) lives in **component CSS inside the stage**, not in Cells.

Together these mean: a Component's portrait behaviour is a **Component** concern
(its CSS), and the Form manifest cannot, by itself, *make* a layout responsive —
it can only *describe* whether it is.

## Decision

Treat orientation as **two separable things**, each seated where it belongs:

### A — Mechanism: orientation-aware CSS/transforms (where the work is)

The thing that *makes* a layout adapt is hand-written, exactly like all other
placement at the light rung:

- **Cell-level** (chrome / wireframe): a Cell's co-located CSS/transform may
  reshape per orientation — e.g. the `masthead`/`stage`/`footer` bands could
  stack or resize differently in portrait. This is the legitimate, bounded place
  for "Cells know portrait/landscape": it is the *wireframe* reshaping, and it
  does **not** revive `section-as-grid` (no fixed grid tracks; the bands stay
  in-flow, content-height). *(Not yet built; the chrome reshapes acceptably under
  `--canvas-scale` today.)*
- **Component-level** (content): a Component reflows its own internal layout via
  CSS keyed on `data-orientation` — the kpi/comparison/split reflow shipped in
  PR #407. This stays a Component concern by design (retired-grid decision).

We explicitly do **not** make the manifest *generate* the reflow (the "Medium/
Heavy" coupling rung). That remains deferred to its own ADR and a second
renderer, per the manifest-contract decision.

### B — Contract: a declared `orientation` support field (the honest catalog)

Because adaptation is hand-written, "does layout X work in portrait?" is a
*fact to declare*, not derive. Add an **`orientation` support field to each
component (and Tile) manifest**, surfaced into `dist/docs/components.json`:

```jsonc
"orientation": "native" | "reflow" | "landscape-only"
```

- **`native`** — correct in portrait from `--canvas-scale` alone (centred
  flex-column layouts: title, statement, quote, content, stats, …).
- **`reflow`** — has explicit portrait adaptation (the PR #407 set; diagrams
  reorient; charts aspect-preserve).
- **`landscape-only`** — portrait is not appropriate (e.g. `redline` — the
  side-by-side diff is load-bearing).

Verified by a **portrait audit** (render each component's gallery at 9:16,
classify with real renders — a full-catalog maker-checker sweep), and enforced
by `lint:deck`: a portrait/mobile deck that uses a `landscape-only` layout gets a
warning.

## Why this split

- It honours the model the team actually shipped: light coupling + retired
  section-as-grid. Adaptation is CSS/transform; the manifest is the contract.
- It gives "cells know orientation" a real, bounded home (chrome/wireframe Cell
  CSS) without reintroducing the rejected fixed grid.
- It makes the catalog *honest* — the field is the deliverable authors and the
  Drawing Board query, and the lint steers them — without overclaiming that the
  manifest "wires both orientations out of the box." It declares; the CSS does.

## Scope / sequencing

1. **PR #407 (in review)** — the reflow mechanism (A, component-level) + the
   `--canvas-scale` lever. Ships now as the working implementation.
2. **This ADR's increment (next PR)** — add the `orientation` field + schema,
   run the full-catalog portrait audit to populate it honestly, surface it in
   `components.json`, and add the `lint:deck` warning. (Chosen scope:
   full-catalog audit + lint enforcement.)
3. **Deferred** — Cell-level orientation reshape (chrome wireframe) as a discrete
   follow-up if/when the chrome needs more than `--canvas-scale` gives it; and the
   manifest-driven (Medium/Heavy) generation, which stays gated behind a second
   renderer per the manifest-contract ADR.

## Non-goals

- Not reviving `section-as-grid` — the bands stay in-flow and content-height.
- Not making the manifest generate layout (no Medium/Heavy coupling here).
- Not decomposing components into Cells — the content layout stays component CSS.
