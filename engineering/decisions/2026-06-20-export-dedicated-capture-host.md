---
status: in-progress
summary: Drawing Board PDF/PPTX/chart export rasterized the live preview iframe, which goes blank (or collapsed) when exported from the phone Edit tab — the preview pane is display:none, so the iframe is hidden (visibility gate) and unlaid-out (container-query typography collapses to 0). Export now renders into its own dedicated, fully-laid-out, ungated offscreen capture host (reusing the engine render via __dbExportRender), so it is correct regardless of preview state.
version: 1
supersedes: none
builds-on: none
---

# Export renders into its own capture host, not the live preview

**Status:** in-progress (implemented on branch `claude/pdf-export-blank-edit-d9790i`).
**Area:** Drawing Board export (`docs/src/playground/drawing-board-export.js`,
`drawing-board-render.js`, `docs/src/pages/drawing-board.astro`)

## Symptom

Exporting a deck to PDF from the Drawing Board's **Edit** tab produced an
all-white PDF with the right page count but no content. On desktop the bug was
masked (the preview sits open beside the editor); on a **phone** it was the
default experience — you land on the Edit tab and export without ever opening
Preview. The reported workaround was telling: visit **Preview** once, return to
Edit, and the next export works.

## Root cause — export was coupled to the perf-optimized preview DOM

The one-click PDF/PPTX/chart exports rasterized the **live preview iframe**
(`#db-frame`) with `html-to-image`. That iframe is the shared filmstrip
controller (`deck-preview.js`), tuned for a smooth *on-screen* preview, not for
capture:

1. **Visibility gate (anti-flash).** The srcdoc ships `.marpit{visibility:hidden}`
   and an in-iframe FIT agent flips it to `visible` only after it can measure a
   width (`var w = marpit.clientWidth; if(!w) return;`). On a phone the Edit tab
   makes the preview pane `display:none` (`body[data-pane="editor"] .db-preview
   {display:none}`), so FIT never runs and `.marpit` stays hidden. `html-to-image`
   clones each `<section>` and copies its **computed** styles — including the
   inherited `visibility:hidden` — onto the clone → a fully transparent (blank)
   page. Visiting Preview gives the pane a width, FIT reveals `.marpit`, and the
   inline `visibility:visible` persists back in Edit — hence the workaround.

2. **No layout box → collapsed type.** Worse than blank: a `display:none` pane
   has no layout, so the section's `container-type:size` query container is `0`,
   and Lattice's container-query typography (`cqi/cqh`) resolves to `0px`. Forcing
   `visibility:visible` alone fixes *blank* but a hidden pane still rasterizes
   **collapsed** slides (all text piled on one line) for any container-query deck —
   i.e. every real deck. Verified: a 4K deck reads `section 0×0 / font 0px` under
   the hidden pane vs `3840×2160 / 192px` when laid out.

3. **Virtualization.** Off-screen slides carry `content-visibility:auto`; the old
   code already forced this `visible` per slide, but that doesn't help under (1)/(2).

The shape of the bug: export read state that only the *preview* owns, in a
condition the preview is allowed to be in. Patching the preview's gates from the
export side (force visibility; lay the live frame out off-screen) all worked in
prototypes but kept coupling export to preview internals.

## Decision

**Export gets its own render surface.** It no longer touches the live preview.
The render controller exposes `window.__dbExportRender()`, which reuses the
engine exactly as the live render does (component bridge + theme resolution) and
returns `{ html, css, mode, geom, runtimeUrl, fontCss }`. `createCaptureFrame`
mounts that into a throwaway iframe that is **fully laid out and ungated**:
`buildSrcdoc({ …, contentVisibility:false, cursor:false, sync:false,
printRules:false })`. Every slide lays out, FIT reveals against a real width,
container queries resolve, fonts + any async Mermaid settle, then each section
rasterizes — after which the host is disposed. `exportPdf` / `exportPptx` /
`exportChart` all take the render result instead of the live `frame`. (Markdown,
Marp-bundle, and Print are unchanged: Markdown/Marp work from source; Print uses
the browser's own engine on the live iframe, whose `@media print` block already
forces visibility.)

### Why reuse the render, not the live DOM, and not a full re-run

Three options were weighed (with the user):

- **Own host, reuse render (chosen).** Re-run the cheap engine render for the
  capture host. Identical output to the preview, no dependence on preview state,
  and diagrams render correctly because the host *is* laid out. The runtime
  (Mermaid) re-renders in the host; charts are server-rendered SVG already in the
  HTML, so only Mermaid needs the bounded `waitForDiagrams` settle.
- **Own host, fresh re-render of everything.** Maximal independence but slower and
  re-introduces the async-diagram wait the preview already solves — no upside over
  the above for our render model.
- **Prep the live preview in place** (lay it out off-screen + force visibility
  during capture). Smallest diff, but keeps export coupled to preview internals —
  the thing we're removing.

### Scroll-safety

The capture host is `position:fixed; left:0; top:0; width:0; height:0;
overflow:hidden; opacity:0; pointer-events:none; z-index:-1`. A 0×0 fixed box
cannot grow the document's scroll area (no stray scrollbar) or intercept input;
the iframe inside still lays out at the full slide width because a parent's
overflow clip does not change an iframe's internal layout. Verified: page
`scrollWidth/Height` are unchanged with the host attached.

## Belt-and-braces

`rasterizeSection` still forces `visibility` + `content-visibility` visible per
slide via `forceSectionVisibleForCapture` (unit-tested). It is redundant given an
ungated capture host, but cheap and defensive if a future caller ever points the
rasterizer at a gated surface again.

## Verification

End-to-end in headless Chrome through `buildSrcdoc` + `html-to-image` + `jsPDF`:
a 4K `examples/pricing.md` exported from the simulated phone Edit tab is blank/
collapsed via the live-preview path and renders correctly (light **and** dark)
via the capture host, with the page scroll area unchanged.
