---
date: 2026-07-01
issue: 640
status: shipped
summary: >
  Studio gains user-supplied reference docs that GROUND AI generation (theme /
  component / deck chat) — a brand guide, an existing deck, a brief. A live probe
  confirmed OpenRouter has no upload-by-id (`/api/v1/files` → 404), so the path is
  INLINE-ONLY: text/md inlines as delimited text; PDF inlines as a file
  content-part + the file-parser plugin (pdf-text), cloud-only, degrading honestly
  on-device. Docs persist to a SHARED, library-scoped IndexedDB store (reused
  across every deck), stored locally and never uploaded. The doc is untrusted input
  (HARD RULE #22): it is framed as DATA not instructions and only ever rides the
  USER turn; its tokens fold into the pre-send budget estimate (billed each run).
---

# Studio reference docs — ground generation in the user's own material (#640)

## Why

Live validation (#639) and the spend red-team (`2026-06-29-studio-spend-budget.md`
§ "Knowledge file") settled the boundary: file upload is the WRONG tool for our
static authoring canon (referencing a file still bills its content as input tokens
every call — the canon's cost is handled by prompt caching, #636), but it is the
RIGHT tool for a user attaching their OWN reference material to ground generation.
This is that feature — costed honestly, not a cost trick.

## The path is inline-only (settled by a live probe)

A hands-on probe (2026-07-01) against the live API confirmed the prior finding
still holds:

- `POST /api/v1/files` → **404** (an HTML page, not JSON). There is **no
  upload-by-id**; bytes must be inlined every call.
- **text/md** inlines trivially as text in the user turn (exact client-side token
  count; grounds on every model tier). Cost: ~$0.0007 for a small brand guide.
- **PDF** inlines as an OpenRouter `file` content-part (base64 data URL) with the
  **`file-parser` plugin** (`pdf-text` engine) extracting server-side — so no heavy
  client-side PDF library is bundled. Cost: ~$0.003 for a 144 KB PDF. Cloud tier
  only; on-device degrades to an honest note (can't parse a PDF locally).

Inline-only also kills the BYOK-workspace-storage concern (no file lands in each
user's OpenRouter workspace) and the upload/lifecycle/cleanup surface.

## Where it plugs in

The doc grounds the LAST user turn (never the cached system prefix) as clearly
delimited, framed material — reusing the exact pattern that already feeds
"similar components" / "current palette." Wired into all four generation entry
points (`generateComponent`, `generateTheme`, `runArchitect`, `chatComplete`) via a
single pure helper, `groundMessages`. UI: a paperclip picker in the Fabricate
prompt bar (theme + component) and the deck Architect chat.

## Threat model — HARD RULE #22

The doc is **untrusted input** — a prompt-injection surface. Two guards:

1. **Framed as data, not instructions.** A preamble (`DOC_PREAMBLE`) tells the
   model to treat the entire doc as reference DATA and ignore any directive inside
   it; control characters are stripped from text. Defense in depth, not the hard
   boundary.
2. **The output boundary is unchanged and sufficient.** The doc never reaches a
   preview frame directly — only the model's OUTPUT does, and every preview builder
   already runs slide HTML through `sanitizeSlideHtml` (DOMPurify), while
   `gateComponent` rejects raw HTML in a component skeleton. So a doc-steered
   attempt to emit a `<script>` is stripped at the same boundary that guards all
   generated HTML. `reference-doc.test.ts` locks the framing + this boundary.

## Shared library (persistence)

Attached docs were ephemeral (lost after one run). They now persist to the existing
Workbench IndexedDB asset store (`asset-store.js`, `kind:'refdoc'`), which is
**library-scoped, not deck-scoped** — a doc saved once is reusable across every
deck by construction. Stored **locally in the browser, never uploaded** (consistent
with inline-only). The picker lists saved docs (reuse / trash); it degrades to
empty when IndexedDB is unavailable (private mode).

## Cost honesty

The attached doc's tokens fold into the pre-send budget estimate (`estimateUsd` /
`cloudBudgetBlock` gained an `extraTokens` argument) so a large doc can trip the
hard cap, and the chip states "billed each run." The authoritative per-call cost
still rides back via `usage.cost`. No implied "free."

## Scope / not done

- Grounding is applied to the deck **chat** surface; the canned one-click reshape
  chips (StudioShell "Rewrite lead / Technical / Narrative") stay ungrounded — they
  are fixed presets, not doc-driven.
- `pdf-text` suits digital-text PDFs (brand guides, decks); scanned/image PDFs
  would need the pricier `mistral-ocr` engine — a later toggle if demand appears.
