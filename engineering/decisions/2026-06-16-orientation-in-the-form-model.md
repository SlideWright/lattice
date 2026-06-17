---
status: proposed
summary: Where portrait/landscape orientation lives in the Form model and how a layout declares vs is made to support portrait
version: 1
supersedes: none
builds-on: 2026-06-16-social-mobile-portrait-sizes.md, 2026-06-16-form-manifest-medium-independent-contract.md, 2026-06-16-retire-section-as-grid.md
---

# Orientation in the Form model

Where does portrait/landscape live in the Form model (Frame · Cell · Tile ·
Component), and how is "this layout supports portrait" *declared* vs *made true*?

A four-figure walkthrough of the model these terms refer to is published on the
docs site: `/model/form-model/` (source: `docs/src/content/docs/model/form-model.mdx`;
figures are the live component `docs/src/components/model/FormDiagram.astro`). The canonical model is `design/forms.md`.

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

Because adaptation is hand-written, the orientations a layout is *designed for*
are a **fact to declare**, not derive — and the contract is **bidirectional**
(a component can be landscape-only, portrait-only, or both). Add an
**`orientation` support array** to each component manifest, surfaced into
`dist/docs/components.json`:

```jsonc
"orientation": ["landscape", "portrait"]   // both — the default
"orientation": ["landscape"]               // landscape-only — e.g. redline
"orientation": ["portrait"]                // portrait/social-only (future)
```

- **both** — works in either orientation, whether *natively* (correct from
  `--canvas-scale` alone — centred flex-column layouts: title, quote, content,
  stats…) or via *reflow* (explicit portrait adaptation — the PR #407 set;
  diagrams reorient; SVG charts aspect-preserve). The native-vs-reflow nuance is
  an audit note, not a separate field.
- **landscape-only** (`["landscape"]`) — portrait is not appropriate (e.g.
  `redline`, whose side-by-side before/after diff is load-bearing; wide tables).
- **portrait-only** (`["portrait"]`) — built for the vertical feed and *not*
  meant for a 16:9 deck. None ship today, but the model must allow a
  social-native chart; the array makes that first-class.

Verified by a **portrait audit** (render each component's gallery at 9:16,
classify with real renders — a full-catalog maker-checker sweep), and enforced
**both ways** by `lint:deck`: a portrait/mobile deck that uses a landscape-only
layout warns, and a landscape deck that uses a portrait-only layout warns.

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

## Audit result (2026-06-16)

Full-catalog portrait audit: every component's gallery rendered at `size: story`
(9:16) and judged on real output (parallel maker-checker review for the
wide/horizontal candidates). **8 of 54 are landscape-only**; the rest are `both`
(work in portrait, natively via `--canvas-scale` or via the PR #407 reflow).
No component is portrait-only today (the model allows it for a future
social-native chart).

**`orientation: ["landscape"]`** — horizontal-axis or side-by-side layouts whose
content clips/squishes in portrait (verified by render):

| component | bucket | why landscape-only |
|---|---|---|
| `gantt` | chart | time axis squishes; bar labels truncate |
| `journey` | chart | horizontal stage axis; stage chips bleed off the right |
| `kanban` | chart | 4 columns crammed; card text clipped |
| `roadmap` | chart | multi-column horizon board; headers/cells collide |
| `state-chart` | chart | horizontal lifecycle flow runs off the right edge |
| `compare-code` | code | side-by-side before/after diff; the AFTER panel clips |
| `image` | imagery | full-bleed caption clips; split squeezes text to a sliver |
| `redline` | comparison | side-by-side before/after diff is load-bearing (per #407) |

The set is mirrored in `lib/authoring/lint-core.js` (`LANDSCAPE_ONLY_LAYOUTS`)
and kept in step with the manifests by `test/unit/authoring/orientation-sync.test.js`.
`lint:deck` warns (`orientation-mismatch`) when a portrait/mobile deck uses one.
Notes: a few `both` layouts have a single landscape-favoured *variant*
(`redline.split`, `state-chart` default vs `inline`, `q-and-a.spine`) — classified
by their primary/default behaviour, since the contract is per-component.
