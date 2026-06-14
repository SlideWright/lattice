---
status: design-speculation
version: 1
supersedes: none
last-status-update: 2026-06-14
---

# Importing foreign presentations — client-side ingest, brand-faithful theming, and the deterministic/model split

> **Not canonical.** Design-speculation, written ahead of implementation.
> No shipped behaviour yet. When this note and a shipped surface disagree,
> the shipped surface wins. Purpose: fix the *shape* of the capability —
> the ingest classes, the fidelity contract, and where (the few) model
> tokens get spent — before any code lands.

The prompt (2026-06-14): authors should be able to **import an existing
presentation** — PPTX, PDF, Marp, and the popular web-deck formats — through
the **Workbench / Drawing Board**, and have AI help craft a Lattice theme
that is *faithful* to the source. Hard constraints: do it **entirely
client-side**, with model calls via the user's own **OpenRouter-style
connection** (the existing model ladder), and **minimise transfer and token
cost** by doing as much as possible deterministically in the browser.

This note does three things: (1) splits the request into the two problems it
actually contains, (2) defines *faithful* so it stops fighting the engine,
and (3) draws the line between the work that is free (deterministic,
in-browser) and the two narrow places a model earns its tokens.

## Two problems, not one — keep them on separate tracks

The request bundles two capabilities with very different cost and feasibility
profiles. Conflating them is the expensive mistake.

| Track | What it produces | Difficulty | Token cost |
|---|---|---|---|
| **A. Theme** | A palette → Lattice token CSS file | Easy | **Cheap** (small, structured) |
| **B. Content** | Source slides → Lattice markdown + component picks | Hard | Potentially expensive |

They share an ingest front-end (parse the source once, client-side) but
diverge immediately after. Track A is ~80% built today; Track B is greenfield.
Ship A first.

## The governing constraints

Three facts decide most of the design.

1. **It all runs in the browser, no backend.** Parsing, rendering, linting,
   and contrast-auditing already work client-side; the only network call is
   the model, via the existing ladder in
   `docs/src/playground/architect-model.js` (Chrome Prompt API on-device →
   WebLLM/WebGPU → OpenRouter PKCE OAuth on the user's own account →
   Transformers.js WASM → deterministic floor). "OpenConnect" maps to the
   OpenRouter tier: PKCE, CORS, user pays, no server.

2. **A Lattice theme is token CSS, nothing else.** Layouts are palette-blind
   (`var(--token)` everywhere; HARD RULE #3). So "craft a faithful theme"
   reduces to *emit ~40–60 custom-property values* anchored on a 4–6-hex brand
   axis (`--brand-canvas/-accent/-bright/-alt`), from which surfaces, the ink
   ramp, the 12 categorical pairs, and chart colours derive. This is a tiny,
   JSON-shaped output — the canonical thing a small/on-device model is good at.
   The contract is `design/theming.md`; the existing path is `lib/theme/ai.js`
   + the Workbench Theme Studio.

3. **The render target has no base URL** (the Drawing Board's `srcdoc`
   iframe — see `2026-06-09-drawing-board-asset-import.md`). Any image pulled
   out of a source deck must be vendored to a `data:` URI / IndexedDB blob,
   never live-referenced. Import means *store-the-bytes*, same rule as the
   asset-import subsystem; this feature is a producer for it.

## Defining *faithful* — brand-faithful, Lattice-native (the chosen model)

Lattice exists to produce boardroom-10/10 decks under a fixed type scale and a
strict colour/contrast contract. A pixel-faithful clone of an arbitrary
corporate PPTX is the *opposite* of that goal, and much of it isn't even
expressible in the token system. So "faithful" is scoped deliberately:

- **Faithful = the source's brand, levelled up.** We extract the source's
  *identity* — its palette, and where detectable its type character and
  density — into a proper Lattice theme, then **re-express the content in
  Lattice's curated components.** The author recognises their brand; the deck
  is built the Lattice way.
- **Explicitly out of scope: layout reproduction.** We do not recreate
  absolute positioning, overlap, or off-grid composition. That fights the
  palette-blind component model, can't pass the contrast/lint gates, and is
  the wrong altitude for this engine.

This choice is what keeps Track A cheap and Track B tractable: we are mapping
*intent*, not pixels.

## The ingest front-end — think in classes, not vendors

Almost every presentation tool collapses into five **parse strategies**. Most
"formats" are just exports of one of them, so we support a long tail of
vendors *for free* by covering the classes. Four of the five parse with **zero
tokens**, fully in-browser.

| Ingest class | Client-side parse | Covers (natively or via export) | Token cost |
|---|---|---|---|
| **OOXML / ZIP-XML** | `jszip` (already a dep) + XML walk | **PPTX**; PowerPoint; Google Slides / Keynote / Canva *via PPTX export* | Zero |
| **Markdown-family** | one normaliser | **Marp**, Slidev, reveal-markdown, remark, mdx-deck | Zero |
| **HTML-DOM decks** | `DOMParser`, read `<section>`s | **slides.com / reveal.js**, impress.js | Zero |
| **PDF** | `pdfjs-dist` (new dep) | universal fallback; Prezi / Figma / Keynote exports | Zero (lossy) |
| **Image-only** | vision model / OCR | scanned PDFs, PNG-per-slide exports | Model (costly) |

Notes that matter:

- **PPTX + PDF are the universal escape hatch.** Google Slides, Keynote,
  Canva, Prezi, and Figma Slides all export to one or the other. We do **not**
  build bespoke parsers for them; the docs say "export to PPTX (preferred) or
  PDF." Keynote's native `.key` is binary snappy-compressed protobuf inside a
  ZIP — not worth a client-side parser; route it through its PPTX/PDF export.
- **slides.com is the reason to add the HTML-DOM class.** It's built on
  reveal.js, so its export is a DOM of `<section>`s — popular *and* trivially
  parseable client-side. This is the only format worth a native path beyond
  the three originally named.
- **Fidelity is ranked**, and the UI must say so: OOXML & Markdown & HTML-DOM
  → high (real structure); PDF → "good-enough draft" (coordinates, not
  semantics); Image-only → best-effort, model-gated, opt-in.

Each parser normalises to one **intermediate representation (IR)** — an array
of slides, each `{ texts[] (with role hints), images[] (blobs), colours{},
fonts{}, raw geometry }` — so both tracks consume one shape regardless of
source format.

## Where the (few) tokens get spent

The whole point of "as much as we can in the browser." Everything that *can*
be deterministic *is*; the model is reserved for two genuine judgment calls.

**Free, in-browser, zero tokens**

- Parse / unzip / DOM-walk the source → IR.
- **Palette extraction**: dominant-colour clustering over the IR's colour
  fields + slide rasters (k-means in a worker). Produces the raw brand
  anchors deterministically.
- **Render**: `window.LatticePlayground.render(markdown, theme) → {html, css}`
  (`lib/playground/index.js`) — the full Lattice pipeline, client-side.
- **Validate**: in-browser lint (`lib/authoring/lint-core.js`) + the existing
  WCAG-AA contrast audit before anything is shown.
- **Image vendoring**: blobs → IndexedDB → `data:` URIs at render time.

**Track A model call — palette → tokens (small, one-shot)**

Hand the model the *extracted* colours + the token contract from
`design/theming.md`; get back the ~40–60 semantic token assignments (role
mapping + the 12-step categorical ramp + dark-variant + chart palette). This
is the call `lib/theme/ai.js` already shapes. Even this can be shrunk: do the
colour→role mapping with heuristics and use the model only to *fill and
balance* the categorical ramp. Then run the deterministic contrast audit and
`tools/new-theme.js`-style scaffold to emit the file.

**Track B model call — slide → component (catalog-constrained)**

The expensive-if-done-naively step, made cheap by **making the model pick from
a catalog, not author from scratch.** `dist/docs/components.json` (53
components tagged by function/form/substance/idiom/occasion) is exactly the
constrained vocabulary. Per slide, send the IR's structure + a *pre-filtered*
candidate shortlist (filtered locally by detected substance — prose/series/
graph/structure) and get back a `<!-- _class: X -->` choice + slot-filling.
Batch slides; cache the static catalog prefix (the chat path already does
1h-TTL prompt caching for OpenRouter/Anthropic). No free-form CSS ever leaves
the model.

End-to-end, zero-server: **parse (local) → extract (local) → two narrow model
calls → render + lint + contrast-audit (local) → author refines in the Drawing
Board.**

## Phasing

1. **PPTX → theme** (highest value / lowest risk; mostly wiring existing
   parts). `jszip` extraction → `lib/theme/ai.js` → Theme Studio preview /
   contrast audit / `.css` export. Lands Track A on the cleanest format.
2. **PPTX → deck draft** (Track B, first format). IR → catalog-constrained
   component mapping → render in Drawing Board → author refines. Establishes
   the component-mapping loop.
3. **Markdown-family + HTML-DOM** ingest (near-free; adds Marp/Slidev/reveal/
   slides.com via the normaliser + `DOMParser`).
4. **PDF** ingest (`pdfjs-dist`; ship with the explicit "good-enough draft"
   fidelity label).
5. **Image-only** path (model-gated, opt-in) — last, because it's the only
   token-heavy parse.

## Open questions

- **Per-deck or global** for imported themes/assets — inherits the open
  question from `2026-06-09-drawing-board-asset-import.md`; resolve together.
- **Type fidelity**: how far to push font matching given the sandbox's webfont
  limits and Lattice's fixed 12-token type scale (`engineering/typography.md`).
  Likely: match *character* (serif/sans/weight), not exact face.
- **Where the import UI lives** — Workbench (it fabricates parts: themes) vs.
  Drawing Board (it composes decks: content). Probably both, one per track.

## Why this is feasible today

The hard infrastructure already exists: client-side render (`lib/playground`),
the model ladder + OpenRouter PKCE (`architect-model.js`), the theme-AI path
(`lib/theme/ai.js` + Workbench), in-browser lint + contrast audit, the machine
catalog (`dist/docs/components.json`), and the asset-vendoring design
(`2026-06-09-drawing-board-asset-import.md`). The new work is the **ingest
parsers (deterministic)** and the **catalog-constrained component mapper** —
not new rendering, not new theming primitives, and not a server.
