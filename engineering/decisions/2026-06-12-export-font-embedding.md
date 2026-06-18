---
status: shipped
summary: Drawing Board export embeds all web fonts, fixing the lazy-load race that dropped off-screen faces to fallbacks
---

# Drawing Board export embeds all web fonts — the lazy-load race fix

**Date:** 2026-06-12
**Status:** shipped (PDF + PPTX)
**Branch:** `claude/frontmatter-lattice-pdf-o3ww5t`
**Follows:** `2026-06-11-sketch-finish.md` (the two hand fonts that surfaced the
bug), `2026-06-11-workbench-export-bridge.md` (the export pipeline this touches).

## The bug

A `finish: sketch` deck exported from the docs-site Drawing Board (Export → PDF
or PowerPoint) came out with Caveat headings but a clean-Outfit body — the
Shantell Sans hand body face had dropped to a system fallback. The live preview
was correct; only the exported file was wrong, and only on some slides.

`finish: sketch` is *designed* to hand-draw everything: headings resolve through
`--sketch-font-display` (Caveat), body / card-titles / pills through
`--sketch-font-body` (Shantell Sans). So this was not a CSS gap — the body face
simply wasn't surviving export.

## Root cause — a lazy-load race the exporter never closed

The image exporters (`docs/src/playground/drawing-board-export.js`) rasterize
**every** slide through `html-to-image` (`toPng`), one PNG per page, including
slides they force-visible mid-loop (the preview virtualizes off-screen sections
with `content-visibility:auto`). Two facts collide:

1. Marp's bespoke slide template **lazy-loads each web-font face only when the
   active slide needs it** (documented in the sketch-finish note).
2. The exporter awaited `document.fonts.ready` **once**, up front — before it
   forced the off-screen slides visible and requested their faces.

So a face first needed by an off-screen slide hadn't finished loading from
Google Fonts when its slide rasterized, and that slide baked in whatever
fallback was resolved at that instant. Caveat headings survived only because a
bookend (title/divider/closing) slide happened to be active when export ran;
the body face, first exercised on an off-screen content slide, lost the race.

Letting `html-to-image` chase the engine CSS's cross-origin Google-Fonts
`@import` itself is no fix either: reading an imported cross-origin sheet's
`cssRules` is CORS-blocked, so its `@font-face` rules can't be collected
reliably.

## The fix — vendor the faces, embed deterministically

`docs/src/playground/font-embed.js`:

- Vendors every engine text face as a **latin-subset `.woff2`** under
  `docs/src/playground/fonts/` (Playfair Display incl. italics, Outfit, JetBrains
  Mono, Caveat, Shantell Sans — 17 faces, ~798 KB). Noto Color Emoji is excluded
  (10 MB+, impractical to inline).
- Builds **one** `@font-face` stylesheet with each face inlined as a `data:` URI
  (`fontEmbedCSS`), memoized. The fetches are same-origin (Vite-bundled assets),
  so it is fast and offline-safe.
- Exposes `ensureFontsLoaded(doc, css)` which injects the faces into the preview
  document and awaits them, so the live nodes `html-to-image` clones lay out with
  real metrics rather than the fallback's.

`drawing-board-export.js` then hands that precomputed `fontEmbedCSS` to every
`toPng` call (via the shared `rasterizeSection`), so each cloned slide is
self-contained — no network, no race, every font embedded. Covers **PDF and
PPTX** (shared rasterizer). The vector **Print** path renders through the
browser's own engine and was never affected.

The font module is **lazy-`import()`ed** inside `sectionsOf`, mirroring the
existing `jspdf` / `pptxgenjs` split: its `.woff2` imports aren't Node-loadable,
and the export module's pure markdown kernels (`embedThemeInMarkdown`, …) are
unit-tested under `node --test` (`test/unit/playground/export-embed.test.js`). A
static import would break that suite.

## Scope — docs-export only

The published engine and its Google-Fonts `@import` are untouched. npm consumers
and the live Drawing Board preview still load faces from Google; this change only
governs what the **export** bakes into the file. It is the web-export twin of the
marp-cli/emulator self-hosting that `lattice-emulator.js` already does for the
PDF render path (see the "rendered PDF shows serif/fallback type" gotcha).

## Verification

Driven end-to-end against a real Drawing Board export of the reported sketch
deck: body text, card titles, and metadata pills now rasterize in Shantell while
inline `code` correctly stays monospace (`--font-mono` is never re-pointed).
Verify by rasterizing a body slide and reading the pixels — `pdffonts` is
useless here because the export is an *image* PDF (text is baked into PNGs, not
embedded as PDF font objects).

## The live preview had the same blind spot

Investigating a follow-up report (sketch body still clean in the on-screen
preview, not just the export) surfaced a sibling bug with the same root — the
engine's Google-Fonts `@import` doesn't reach the iframe. Each preview slide
renders into an `srcdoc` whose `<style>` concatenates `frame-CSS + theme-CSS`;
the `@import` that sits at the top of the theme CSS lands **after** the frame
rules, and CSS ignores an `@import` that isn't the first rule. So the iframe
registers no webfonts of its own and renders only the faces the **parent docs
page** loaded into the shared same-origin font cache (Playfair/Outfit/JetBrains).
Caveat/Shantell are never loaded by the docs UI, so sketch headings fall to the
system hand font (`'Bradley Hand', cursive`) — still hand-looking — while body
falls to `system-ui` and looks clean. The token re-pointing was always correct;
the font was just absent.

Fix: register the vendored faces in the iframe directly via
`previewFontFaceCss()` (a lightweight `@font-face` block referencing the bundled
woff2 by URL, not inlined — the browser caches each once). The Drawing Board
threads it through `data.previewFontCss` into its `writeFrame` srcdoc; the shared
single-slide renderer (`docs/src/lib/single-slide-render.ts` — playground /
landing hero / component specimens) lazy-imports the same builder. _(Updated
2026-06-14: the deck-preview consolidation, #331/#335, folded the old
`live-render.js` into `single-slide-render.ts` and extracted the Drawing Board's
former `is:inline` controller into the importable `drawing-board-render.js` — so
the controller now imports rather than building the block in frontmatter.)_
Verified by inspecting the iframe's
`document.fonts` (Caveat/Shantell now register and load) and screenshotting a
sketch deck (body, eyebrows, bullets render in Shantell).

## Follow-ups

- Refresh the vendored woff2 if the engine's font set changes (re-run the
  latin-subset fetch). **Done (2026-06-13):** the `fonts:check` gate
  (`tools/check-fonts.js`, wired into `build:check` + the pre-commit hook) diffs
  the `@import` demand against both offline supplies — the emulator's
  `SELF_HOSTED_FACES` + `assets/fonts/` and this export's `font-embed.js` — and
  fails the build on drift, so a forgotten weight can't ship a fallback PDF. The
  same pass brought the emulator to full parity (it was missing `Outfit
  300/500/600` + `Shantell Sans 500`). A uniform re-subset of the woff2 still
  needs network and stays deferred.
- If extended-latin / non-latin decks need export fidelity, widen the vendored
  subset beyond `latin`.
