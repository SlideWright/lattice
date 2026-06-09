---
status: design-speculation
version: 1
supersedes: none
last-status-update: 2026-06-09
---

# Asset import in the Drawing Board — in-browser import, persistence, and the two consumers

> **Not canonical.** Design-speculation, written ahead of implementation.
> No shipped behaviour yet. When this note and a shipped surface disagree,
> the shipped surface wins. Purpose: fix the *shape* of the capability in
> the **browser-side Drawing Board** before any code lands.

Companion to **`2026-06-09-asset-import.md`**, which fixes the *engine /
CLI / git* end of the same capability (vendor-don't-reference, deck-local
sidecars, three-renderer parity, hermetic baselines). That note explicitly
scopes the desktop/library out as "a SlideWright concern, not an engine
concern" — **this note is that other end**: importing, persisting, and
*using* assets inside the website's in-browser Drawing Board, where there
is no filesystem and no git. The two meet at **export** (last section).

It also widens the capability the way the prompt asked: assets don't only
render *into* decks and layouts — they also **augment the Architect**. So
this is one import subsystem with **two consumer families**.

## The governing constraint here: the Drawing Board renders client-side into a `srcdoc` iframe

The engine note's governing constraint was hermetic, hash-gated PDF
baselines. The Drawing Board's constraint is different and just as
decisive. It renders entirely in the browser:

- `window.LatticePlayground.render(markdown, theme) → { html, css }`
  (`lib/playground/index.js` — marp-core + the lattice plugins + the
  transformer registry, the same pieces `marp.config.js` wires).
- That `{ html, css }` is injected into an **iframe via `srcdoc`**
  (`live-render.js`, `drawing-board-practice.js`, `drawing-board-focus.js`).
- Persistence is **IndexedDB**, not git (`drawing-board-store.js`: a
  dependency-free promise wrapper; `decks`/`revisions`/`settings`/
  `chats`/`messages`; `navigator.storage.persist()` already requested).

Two facts fall straight out of this and decide most of the design:

1. **A `srcdoc` document has no base URL**, so a relative or even a
   `blob:` image reference can't be relied on inside the frame (srcdoc runs
   at an opaque origin; blob-URL access across that boundary is flaky).
   **Imported images must resolve to `data:` URIs** baked into the rendered
   HTML/CSS. `data:` always works in `srcdoc`.
2. **"Import" means store-the-bytes-in-IndexedDB**, the browser analogue of
   the engine note's "fetch-once-and-vendor." The web is a *source*, never
   a live *binding* — same rule, different substrate (an IndexedDB `Blob`
   instead of a vendored file in git).

## One subsystem, two consumer families

```
import (upload | public URL)
        │
        ▼
   persist  ──►  IndexedDB `assets` store (+ `chunks` for docs)
        │
        ├─►  RENDER INTO DECKS/LAYOUTS   (image · theme · dataset)
        │      resolve at render time, before PG.render / via addThemes
        │
        └─►  AUGMENT THE ARCHITECT       (doc · dataset)
               chunk → embed → retrieve → inject into the chat prompt
```

An asset may feed **both**: a dataset can render into a chart *and* brief
the Architect ("here's the data, help me frame the story"); an image can
sit on a slide *and* be context the Architect reasons about. The asset
record is therefore consumer-agnostic; `kind` (+ an optional `role`) routes
it.

## The asset model — one record

A single store, one shape, scoped per-deck or to a reusable library:

```
assets  (keyPath id; index deckId; index hash)
  { id, deckId|null,        // null = library (reusable across decks)
    kind: 'image'|'theme'|'dataset'|'doc',
    name, mime, hash,        // content hash → dedup + provenance
    blob|text,               // bytes (image/dataset) or text (theme/doc)
    role?,                   // doc: exemplar|factual|template
    sensitive?,              // doc/dataset: never send to the cloud tier
    provenance,              // 'upload' | source URL, fetched-date, license?
    addedAt }
chunks  (keyPath id; index sourceId; index deckId)   // docs only
  { id, sourceId, deckId, ord, text, vector: Float32Array|null }
```

A `DB_VERSION` bump adds the stores. (The Phase-2 `chats`/`messages` stores
were declared early to dodge a migration; assets is a genuinely new
capability, so a version bump is the right move here.)

## Import — two front doors, one ingestion

- **Upload** — File API → `Blob` (or `FileReader` → text for theme/doc).
- **Public URL** — `fetch(url)`. **CORS caveat (real):** arbitrary sites
  block client-side fetch; honest degradation is to try the fetch and, on a
  CORS/network failure, fall back to "paste the text / pick a local file."
  No backend proxy — the Drawing Board has none by design.

One ingestion path; branch on mime/kind. Content-hash on the way in for
dedup + provenance (re-importing the same file updates rather than
duplicates).

## Resolve per kind — the consumer end

### Image — `data:`-URI rewrite, a pre-render markdown transform

The author references an imported image by a stable handle (e.g.
`![alt](asset:ID)` or a chosen name). A **pre-render transform** rewrites
that handle to the stored bytes as a `data:` URI **before** the markdown
reaches `PG.render`, so the resolved `data:` URI lands in `out.html`/
`out.css` and renders in the `srcdoc` frame with no base-URL problem. Large
images bloat the per-render srcdoc string (~33 % base64 overhead); cache
the encoded URI per asset and only re-encode on change.

### Theme — `addThemes`, the hook already exists

`PG.addThemes([cssText])` + `PG.hasTheme(name)` already register palettes
(`live-render.js` fetches `themes/<name>.css` and registers them). An
imported theme is just CSS text registered the same way; the deck's
`theme:` front-matter names it. **Validate against the token contract**
(`design/theming.md`) on import — a theme missing tokens renders
half-styled, the browser mirror of the engine note's "themeSet requirement"
gotcha.

### Dataset — a new data-binding (the heaviest, scope separately)

As the engine note says, charts are authored *inline* today (markdown →
SVG via `chart-family`). A dataset import implies a binding that doesn't
exist yet: a chart block references a dataset asset, and a transform
expands it into the chart's markdown **before** render. Same determinism
rule (snapshot at import). In the Drawing Board this is a pre-render
markdown transform; for export it must also exist in the three engine
paths — which is exactly why the engine note defers it to its own proposal.
This note inherits that deferral.

### Doc — augment the Architect (chunk → embed → retrieve → inject)

The Architect consumer, reusing Phase-2 infrastructure verbatim:

1. **Ingest** — extract to text (md/txt as-is; PDF via a lazy CDN
   `pdf.js` import, the same on-demand-CDN pattern as the model tiers — no
   new npm dep), chunk into ~500–800-token passages.
2. **Embed** — `model.embed(chunks)` (`architect-model.js`, bge-small via
   CDN; returns `null` when unavailable → store text-only).
3. **Retrieve** — at a chat turn, `cosineRank(queryVec, chunkVecs)` (or
   `keywordRank` with no embedder) over this deck's + library chunks
   (`architect-retrieval.js`, reused verbatim).
4. **Inject** — `buildChatMessages` (`drawing-board-chat.js`) gains a
   `sources` param and injects a **role-aware**, **tier-budgeted** block
   beside `buildLatticePrimer`: *exemplar* chunks framed "match this voice/
   structure," *factual* chunks framed "use attributed, never fabricate."
   RICH (cloud/capable) gets several chunks; LEAN (small local) gets one or
   two — small models drown, which is *why* retrieval, not raw docs, is the
   mechanism. The deterministic floor still improves: "the passage most
   relevant to slide 4 is…" is a pure retrieval result with no model.

**Privacy is by model tier, not by git.** On-device tiers (Prompt API,
Transformers.js, WebLLM) keep injected text local; the **cloud** tier
(Puter/Claude) sends it off-device. So `sensitive: true` means "never
inject into the cloud tier" — warn when the active tier is cloud and
sensitive assets are attached. This is the real confidentiality boundary
for incident reports / unpublished research (nothing here is ever in git).

### Free exemplars: your own decks are already in the store

The `decks` IndexedDB store already holds every deck the author has
written. "Use another of my decks as a style exemplar" is therefore a
**picker over existing decks**, not an import — the cheapest, highest-signal
exemplar, available with zero ingestion. Only *external* material needs the
upload/URL path.

## Scope — per-deck binding, library for reuse (same single rule)

Mirrors the engine note's rule, re-expressed for IndexedDB:

> **The library is discovery/reuse; the binding is always per-deck.**

`deckId` scopes an asset to one deck (default). `deckId: null` is the
library — *available* to other decks, but it only enters a render (or a
prompt) when that deck actually references it (or retrieval surfaces it).
No live global reference, exactly as the engine note forbids one.

## The export bridge — where the two ends meet

A Drawing Board deck is browser-resident (markdown + IndexedDB assets). The
moment it leaves for the engine/CLI/git world — **`drawing-board-export.js`
(PDF), or "download as a real `.md` deck"** — the IndexedDB assets must be
**materialized**, or the exported deck renders asset-less elsewhere. Two
options, both already on the table:

- **Bake** `data:` URIs into the exported `.md`/HTML — self-contained, no
  sidecar, but a heavier file.
- **Vendor to a `<deck>.assets/` sidecar** + relative paths — exactly the
  engine note's deck-local model, so the same deck then renders hermetically
  through all three engine paths and the PDF baselines.

So: **Drawing Board import (IndexedDB + `data:` resolution) and engine
import (vendored sidecar + relative paths) are one capability with two
representations, and export is the converter.** Themes export by writing
the CSS to `themes/` + registering it (engine note); images/datasets export
by baking or vendoring per above.

## Parity caveat

Any Drawing-Board-only pre-render transform (the `asset:` → `data:` rewrite,
a dataset expansion) risks drifting from the three engine render paths
(CLAUDE.md "Three render paths must agree"). Keep the *reference syntax*
(`asset:ID`, the dataset binding) defined once and understood by both the
browser resolver and the export materializer, so an exported deck resolves
the same handles the Drawing Board did.

## Verification stance (matches the Phase-2 `MockBackend` culture)

- **Pure + unit-tested:** the `asset:`→`data:` rewrite, chunking, the
  role-aware `buildChatMessages` injection (extend its existing tests),
  retrieval over asset chunks (reuse the `cosineRank`/`keywordRank` suite),
  the `sensitive`→no-cloud gating predicate, theme token-contract
  validation.
- **Mock-tested:** ingest→persist→resolve→render with a fake `Blob`/store,
  and ingest→retrieve→inject→`complete` with a `MockBackend`.
- **Live-only (not claimed):** real PDF extraction via the pdf.js CDN, real
  HF embeddings, real cloud-tier egress, real `data:`-URI render in a
  browser. Wired, mock-tested, degrade-verified — the live paths need a
  desktop session, same as every other model surface.

## Phasing

1. **Image import.** `assets` store; upload/URL ingestion (CORS fallback);
   the `asset:`→`data:` pre-render rewrite; the Sources/Assets panel UI;
   per-deck scope. Lowest risk, immediately visible. Demo deck per
   workflow.md.
2. **Theme import.** CSS asset → `addThemes` + token-contract validation;
   `theme:` names it. Library scope.
3. **Doc → Architect.** `chunks` store; extraction (md/txt, then pdf.js
   CDN); keyword retrieval first, then `embed()` semantic; role-aware
   injection; the cloud-egress `sensitive` gate; the "use one of your own
   decks as an exemplar" picker.
4. **Export bridge.** Bake-or-vendor on PDF export / `.md` download, meeting
   the engine note's deck-local model.
5. **Dataset binding.** Its own design note (new data-binding across all
   render paths), per the engine note's deferral.

## Open questions

- **Export default** — bake `data:` URIs (self-contained, heavy) or vendor
  a `<deck>.assets/` sidecar (engine-note-aligned, hermetic)? Leaning
  sidecar for anything destined for git/CI; bake for a quick one-off
  download.
- **CORS fallback ergonomics** — is "paste text / pick file" the primary URL
  affordance with fetch as the optimization, given how often CORS blocks?
- **IndexedDB budget** — large images as `data:` strings inflate every
  render; cache encoded URIs, and consider a soft per-deck asset-size
  warning.
- **Auto-exemplar** — should the Architect proactively offer "match the
  voice of <your last deck>," or only when the author picks one?
- **Library curation** — once the library grows, does retrieval over *all*
  library chunks dilute relevance? May need per-deck opt-in of in-scope
  library assets.
