---
status: in-progress
version: 3
supersedes: none
last-status-update: 2026-06-10
---

# Drawing Board — scalable live preview (incremental, then virtualized)

> **Design-of-record + build log.** Diagnosis and architecture are settled
> (measured). Build is in progress: the pure kernel + the incremental-patch path
> have landed; viewport virtualization is the remaining layer. The DOM changes
> need a real browser to verify (the cloud sandbox can't run the Astro app).
> When this note and a shipped surface disagree, the shipped surface wins.

## The problem (one sentence)

Typing in a large deck (150+ slides) freezes the Drawing Board for 1–2s because
the preview **rebuilds every slide on every keystroke**. We want it to redo only
what changed.

## Diagnosis — measured

- **Not the Architect:** `lint-core` + `review-core` + `scorecard` run <20ms at
  800 slides / 282 KB.
- **Not the markdown render:** marp-core does 200 slides in ~58ms, 800 in ~286ms.
- **It's the browser-side rebuild.** `drawing-board.astro` did
  `frame.srcdoc = PG.render(getSource())` on every edit — a fresh browsing
  context that re-parses the doc, re-runs the runtime DOM transforms over *every*
  section, FIT-scales and lays out *all N* fixed 1280×720 slides. O(N) per
  keystroke.

## Architecture decision — persistent iframe, not shadow DOM

The preview lives in an **iframe** for CSS/JS isolation (the deck theme CSS uses
global selectors that would collide with the Starlight docs page). The question
was whether to virtualize *inside* the iframe or move slides into **shadow DOM**.

**Keystone finding (`lib/runtime/index.js:978`):** the runtime registers
`new MutationObserver(scheduleRun).observe(document.body, {subtree,childList})`
and re-applies *every* transform — global (badges, slot-labels) and
component-scoped (charts, split-panels, state-chart) alike — to any `<section>`
inserted into its document, **idempotently** (each skips slides it already did).
Patch-on-insert is the runtime's native model.

That decides it:
- **Iframe:** the runtime's transforms fire on inserted/replaced slides for
  free. Zero runtime changes.
- **Shadow DOM:** `document.querySelectorAll` can't see into a shadow root and
  the `document.body` observer doesn't watch it → would force a pervasive
  root-aware refactor of a file shared by all three render paths.

So: **keep the iframe, make it persistent, patch only changed slides.** (An
earlier draft of this note recommended shadow DOM, before the observer finding;
that recommendation is withdrawn.)

## Build status

**Landed — kernel (unit-tested in Node):**
`docs/src/playground/preview-virtual.js` + `test/.../preview-virtual.test.js`
(14 tests): `splitSections`, `diffSections`, `windowRange`, `spacers`,
`rangeChanged`.

**Landed — incremental patch (`drawing-board.astro`, needs browser verify):**
the persistent-iframe path. `render()` now full-writes the srcdoc only on first
render and on palette/mode change (theme CSS + Mermaid theming bake into the
document); on every other edit it `patchFrame()`s — splits the freshly-rendered
HTML into per-slide strings, replaces only the `<section>` nodes whose HTML
changed (`replaceChild`), and re-applies FIT + sync via exposed
`window.__latticeFit` / `__latticeTag` hooks. A slide insert/delete rebuilds the
`.marpit` body only (no script re-eval). The runtime observer transforms the
replaced sections; export/cursor-sync/pagination are untouched because all
sections stay mounted. Edit cost → O(changed slides).

**Landed — virtualization via `content-visibility:auto` (needs browser verify):**
slides are fixed 1280×720, so `content-visibility:auto` +
`contain-intrinsic-size:1280px 720px` on `.marpit>section` is the right
virtualization primitive — the browser skips layout/paint of off-screen slides
(fast initial render + smooth scroll on huge decks) while **every node stays in
the DOM**, so export / cursor-sync / incremental patch are untouched. Two
overrides keep it correct: `content-visibility:visible!important` in the print
CSS, and forcing it visible per-section in `drawing-board-export.js`
`rasterizeSection` (off-screen `content-visibility` content is otherwise dropped
from print + html-to-image).

This is the right tool for *fixed-size* items: a JS virtual list (Virtuoso-style)
earns its complexity on *variable-height* lists and when DOM-node count must
shrink. Here layout/paint was the cost, not node count, and the kernel’s
`windowRange`/`spacers` remain available if desktop profiling shows a chart-heavy
mega-deck still needs JS windowing (to also defer off-screen transform work) —
at which point export must materialize the full deck (it reads all sections from
`contentDocument`, `drawing-board-export.js:48`).

## Verification boundary

The DOM changes can't be exercised here (no `docs/node_modules`; the deployed
site is behind a cert proxy). The controller passes `node --check` (no syntax
errors), but "typing stays smooth on a 200-slide deck; charts/Mermaid still
draw on edited slides; export still emits every slide" must be confirmed
interactively on a desktop session.
