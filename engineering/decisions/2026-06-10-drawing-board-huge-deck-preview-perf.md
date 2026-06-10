---
status: in-progress
version: 2
supersedes: none
last-status-update: 2026-06-10
---

# Drawing Board — scalable live preview (virtualized + incremental)

> **Design-of-record + build log.** The diagnosis and architecture are settled
> (measured). Build is in progress: the pure kernel has landed with unit tests;
> the iframe/DOM controller is the remaining piece and needs interactive
> verification in a real browser. When this note and a shipped surface disagree,
> the shipped surface wins.

## Symptom

On a very large deck (150+ slides) the Drawing Board froze for a second or two
while typing, and Coach showed its empty "Start a deck…" state on load. It works
fine on normal decks. (First read as "Coach is broken" — it isn't; see below.)

## Diagnosis — measured

**It is not the Architect.** The deterministic Coach engine (`lib/authoring/`
`lint-core` + `review-core` + `scorecard`) runs in **<20ms even at 800 slides /
282 KB**, linear. Cross-slide checks are Map-based O(n).

**It is not the markdown render.** marp-core (`@marp-team/marp-core`,
`new Marp().render`) does **200 slides in ~58ms, 800 in ~286ms** — cheap.

**It is the browser-side mount.** `docs/src/pages/drawing-board.astro` did
`frame.srcdoc = PG.render(getSource())` on every edit — rewriting the whole
iframe in a fresh browsing context, which forces the browser to re-parse the
doc, re-run the runtime DOM transforms (`lib/runtime/`) over **every** section,
FIT-scale them, and lay out **all N** fixed 1280×720 slides. O(N) per keystroke;
seconds on a big deck. The render is cheap; mounting every slide is not.

## Architecture — virtualized + incremental

Slides are fixed-size, so the filmstrip geometry is deterministic. Keep **one
persistent iframe** and:

1. **Virtualize the mount.** Insert into the live iframe only the slides in (or
   near) the viewport; off-screen slides are known-height spacers that
   materialize on scroll. Layout/transform cost → O(viewport), independent of
   deck length.
2. **Incremental patch on edit.** Re-render the whole deck's HTML (cheap ~100ms),
   diff it against the previous render, and patch only the slides whose HTML
   changed **and** are currently mounted. No whole-iframe rewrite.

Edit and scroll both become O(viewport). marp render stays whole-deck (cheap);
per-slide markdown rendering is **not** needed.

### Invariants to preserve
- **PDF export** (Slice 4) must materialize **all** slides on demand (the export
  path can't virtualize).
- **Cursor↔slide sync**, **click-to-jump**, and the **"Slide X of Y"** indicator
  must keep working against the virtualized section set (absolute indices, not
  mounted indices).
- **Pagination** is baked per-section by marp (`data-marpit-pagination`); after
  assembly, re-number mounted sections by absolute index.

## Build status

**Landed (this PR), unit-tested in Node:**
`docs/src/playground/preview-virtual.js` — the pure, DOM-free kernel:
`splitSections` (marp flat-`<section>` output → per-slide HTML), `diffSections`
(changed indices + count change), `windowRange` (which indices to mount for a
scroll position), `spacers` (heights that keep the scrollbar honest),
`rangeChanged` (skip work when the window didn't move). Tests in
`test/unit/playground/preview-virtual.test.js`.

**Remaining (needs a real browser to verify):** the in-iframe controller +
`drawing-board.astro` integration that consumes the kernel — a persistent iframe
document that mounts a windowed set of sections, runs the runtime transforms on
newly-mounted sections only, patches changed mounted sections on edit, re-numbers
pagination, and bridges scroll/click/sync + the export path. This is the part the
cloud sandbox can't exercise (no `docs/node_modules`; the deployed site is behind
a cert proxy), so it must be verified interactively — typing stays smooth on a
200-slide deck, scrolling materializes slides, export still emits all slides.

## Why kernel-first, not all-at-once
The kernel is the scalable logic and is fully verifiable here, so it lands
proven. The DOM wiring is mechanical but only meaningful when seen running; it
gets built against this tested kernel and verified on a desktop session rather
than claimed-working blind.
