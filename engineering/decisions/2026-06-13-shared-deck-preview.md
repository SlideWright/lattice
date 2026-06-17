---
status: shipped
summary: One shared filmstrip preview controller for all four docs-site surfaces, ending the per-surface render drift
---

# One filmstrip preview controller for all four docs-site surfaces

**Date:** 2026-06-13
**Status:** Adopted
**Area:** docs site (`docs/src/playground/`, `docs/src/pages/`)

> _Update 2026-06-14:_ this doc covers the **multi-slide filmstrip** controller
> (`deck-preview.js`), which still stands. The **single-slide** counterpart it
> mentions as `live-render.js` was later folded into
> `docs/src/lib/single-slide-render.ts` (consolidation #331), and the Drawing
> Board's former `is:inline` controller became the importable
> `drawing-board-render.js` (#335). The living map is now
> `engineering/architecture.md` § "Docs-site render bridges".

## Problem

The docs site has four surfaces that render a live, multi-slide "filmstrip"
preview — the **Playground**, the **Drawing Board**, and the Workbench's **Theme
Studio** and **Layout Studio**. Each had independently re-implemented the same
routine — render Markdown with the engine, write it into an `<iframe>` via
`srcdoc`, then scale every fixed-`@size` `<section>` down to the container width
with a CSS transform and stack them — and then they **drifted**:

| Surface | Geometry | Gap | Visibility gate | Height clamp | Incremental patch |
|---|---|---|---|---|---|
| Drawing Board | size-aware | 22 | ✅ | ❌ | ✅ + content-visibility + cursor sync |
| Playground | size-aware | 16 | ❌ | ❌ | ❌ |
| Theme Studio | **hardcoded HD** | 18 | ❌ | ❌ | ❌ |
| Layout Studio | **hardcoded HD** | 18 | ❌ | ❌ | ❌ |

Only the Drawing Board had grown the two fixes that matter: a **visibility gate**
(`.marpit{visibility:hidden}` revealed only after the FIT transform lands, so the
first paint never flashes the slides at full 1280/3840px width) and **incremental
section patching** (a persistent iframe whose changed `<section>`s are replaced in
place, instead of a full `srcdoc` rewrite that blanks the iframe on every
keystroke). The Playground and the two studios therefore flashed (worst on the 4K
`gallery-jargon` deck, where un-scaled slides briefly painted at 3840px),
flickered on every edit, and left a dead trailing scroll gap of `SH·(1−scale)`
below the last slide (the last section keeps its full-height layout box — the
transform only scales the paint). The studios weren't even size-aware, so a
`size: 4K` specimen rendered 3× oversized.

The user's question — *"why aren't they sharing the same preview component?"* —
was the right one. Only the slide-box sizing (`frame-css.js`) and the pure split
kernel (`preview-virtual.js`) had ever been extracted, and even the kernel was
re-inlined in the hosts.

## Decision

Extract one controller, **`docs/src/playground/deck-preview.js`**, modelled on the
Drawing Board's proven implementation, and route all four surfaces through it.
It owns *how* a rendered deck becomes a live preview:

- `buildSrcdoc(opts)` — assembles the iframe `srcdoc`: the visibility gate, the
  `slideBox()` pin (from `frame-css.js`), the FIT agent, and the per-surface
  knobs below.
- The **FIT agent** — scales each section by the constant `w/SW`, collapses the
  inter-slide gap with a negative margin, **clamps** `marpit` to the
  scaled-content height and `overflow:clip`s the last slide's box tail (killing
  the dead scroll gap), then reveals `.marpit`.
- `patchSections()` / `renderDeck()` — the persistent-iframe patch-or-write
  decision, keyed on a host-supplied `sig`.
- `splitSections` is **re-exported** from the unit-tested `preview-virtual.js`,
  not re-inlined.

Per-surface needs ride on options, so one module serves four hosts without
forcing any into another's mold:

- **Drawing Board** opts in to `sync` (the cursor↔slide agent), `cursor`,
  `activeOutline`, `printRules`, `contentVisibility`, `fontCss`, and a
  library-theme `colorScheme`. Its cursor-scroll math assumes slide 0 sits at the
  top, so it does **not** center.
- **Playground + both studios** set `center: true` — a short deck centers in the
  viewport (like the component-page specimens) via `justify-content: safe center`,
  which falls back to top-alignment the moment the deck overflows, so it never
  fights the scroll. The studios fingerprint their live-edited theme/component CSS
  into the `sig` (`hashString`) so a token edit forces a full rewrite, never a
  section patch that would leave a stale palette baked in the `<style>`.

The inline (`is:inline`) controllers (Playground, Drawing Board) reach the module
through a small bundled bridge that sets `window.LatticeDeckPreview`; the studios
(ES modules) import it directly.

The **gap constant stays per-surface** (Playground 16, studios 18, Drawing Board
22): it was three *accidentally* drifted hardcodes and is now one *intentional*
call-site knob that preserves each surface's prior spacing. The Drawing Board's
gap is threaded into both the FIT margin and the SYNC slot pitch from one value,
so they can no longer disagree.

## Deliberately out of scope

`live-render.js` + `specimen.js` (single-slide component-page hosts that scale the
*iframe element*), and `drawing-board-focus.js` / `drawing-board-practice.js`
(one-slide-at-a-time fenced-block / rehearsal surfaces) are a different preview
*shape* — they don't scale-and-stack N sections into a scrolling filmstrip.
Folding them in would force them into the filmstrip's mold; they stay on their own
small, already-shared (`frame-css.js`) paths.

## Verification

Build + lint clean; `test/unit/playground/deck-preview.test.js` (9 cases) locks
the `buildSrcdoc` contract and `hashString`. Puppeteer probes confirmed: the
patch path persists the iframe window across an edit (no reload flicker) on the
Playground and Drawing Board; the trailing scroll gap is gone (`scrollHeight ==
clientHeight` for a single slide; last-slide visual bottom == scroll bottom for a
tall deck); content-visibility still renders an off-screen slide after scroll on a
30-slide Drawing Board deck **with the clamp's `overflow:clip` in place**; cursor
sync still reports the scrolled slide; the 78-slide 4K `gallery-jargon` deck
renders with `marpit` revealed and correctly size-scaled. Screenshots: Playground
desktop/tablet/mobile × light/dark, Drawing Board + Workbench desktop.

## Follow-ups

- The Drawing Board's in-app **PDF/PNG export** runs off this preview document.
  The export *content* is per-section (html-to-image clones the section subtree;
  the print path overrides `.marpit` back to `visibility:visible; height:auto;
  overflow:visible`), so the clamp is invisible to it — but an export round-trip
  on a `size:4K` + Mermaid deck still wants a human eyeball per the QUALITY BAR's
  export sign-off rule.
- `scrollTo` uses `behavior:"smooth"`; consider honouring `prefers-reduced-motion`.
