---
status: roadmap
version: 1
supersedes: none
last-status-update: 2026-06-10
---

# Drawing Board — live preview performance on very large decks

> **Diagnosis + roadmap.** The diagnosis section is settled (measured). The
> fix section is forward-looking: the long-term cure (progressive / virtualized
> rendering) is **not yet built**. When this note and a shipped surface
> disagree, the shipped surface wins.

## Symptom (2026-06-10)

On a very large deck (the "tokenization" showcase — well over a hundred
slides), the Drawing Board *felt* like the Architect had broken: Coach showed
its empty "Start a deck…" state on load and the editor hung for a second or two
while typing. It works fine on normal-sized decks.

## Diagnosis — it is **not** the Architect

The deterministic Coach engine is fast and is **not** the bottleneck. Profiled
the exact shared modules the panel calls — `lib/authoring/lint-core.js` +
`review-core.js` + `scorecard.js` — over generated decks:

| slides | chars   | lint + review + scorecard |
|-------:|--------:|--------------------------:|
| 100    | 35 KB   | ~3 ms                     |
| 400    | 141 KB  | ~11 ms                    |
| 800    | 282 KB  | ~19 ms                    |

Linear, sub-20ms even at 800 slides. The cross-slide checks (duplicate-heading,
monotone-openings) are Map-based O(n), not O(n²).

**The real cost is the live preview render.** `docs/src/pages/drawing-board.astro`
`render()` calls `PG.render(getSource(), theme)` — a *full, synchronous*
re-render of the **whole deck** through the engine, then a full iframe rewrite —
and `scheduleRender()` fired it on every edit. On a big deck that single pass is
~1–2s and blocks the main thread; the Architect, on the same thread, stalls
behind it (hence the "Coach is broken" appearance — it just hadn't run yet).

Confirmed live by the author: the editor holds the full markdown, Coach *does*
populate after the render completes, and the render takes "a second or two."

## Short-term mitigation (shipped)

PR #163 — `fix(drawing-board): scale the live-preview debounce with deck size`:

- `scheduleRender(len)` scales the debounce with source length: 220 ms default →
  400 ms (>40 KB) → 700 ms (>100 KB) → 1.2 s (>200 KB). The heavy render now
  coalesces to one pass once you pause typing instead of firing on every
  keystroke. Small decks are unchanged.
- `onEdit` reads the editor once per keystroke (was 3× — `getValue` stringifies
  the whole CodeMirror doc) and reuses it for preview / autosave / Architect.

This removes the *per-keystroke* freeze. It does **not** remove the cost of a
single full render, so a truly massive deck still pauses ~1–2s when the render
fires after a pause. Accepted as fine for now.

## Long-term fix (TODO — not built)

**Progressive / virtualized preview rendering.** Stop re-rendering the entire
deck on every change. Target shape:

- **Virtual list** for the preview filmstrip: render only the slides in (or near)
  the viewport, recycling nodes as you scroll — so a 200-slide deck costs the
  same to preview as a 10-slide one.
- **Incremental render**: re-render only the slide(s) whose source actually
  changed, keeping a per-slide cache keyed by slide source. Needs care around
  cross-slide concerns the engine resolves globally (pagination/numbering,
  shared CSS), so the per-slide unit must be well defined.
- **Off-main-thread** is a *secondary* lever and not a clean drop-in: the
  playground engine bundle applies **DOM-based** runtime transforms
  (chart-family, structure post-processing — see `lib/runtime/`), so
  `PG.render` can't simply move to a Web Worker without a DOM-free render path.
  Virtualization is the more tractable first move.

**Acceptance:** typing in a 100+ slide deck stays smooth (no multi-second
main-thread block); the preview updates without re-rendering off-screen slides.

**Why not now:** this is a real rework of the preview pipeline, and it can't be
profiled or verified in the cloud sandbox (no `docs/node_modules`; the deployed
site is unreachable behind the cert proxy). It wants a desktop session that can
run the Astro app, profile `PG.render`'s internal cost breakdown, and confirm
the virtual-list behavior interactively.
