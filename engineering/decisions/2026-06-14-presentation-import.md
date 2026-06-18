---
status: proposed
summary: Importing across board + bench — brand-faithful themes (Workbench) and Lattice-native content (Drawing Board)
---

# Importing — board + bench, two personas: brand-faithful themes (Workbench) and Lattice-native content (Drawing Board)

> **Not canonical.** Design-speculation, written ahead of implementation.
> No shipped behaviour yet. When this note and a shipped surface disagree,
> the shipped surface wins. Purpose: fix the *shape* of the capability — the
> persona split, the single universal on-ramp, and where the (few) model
> tokens get spent — before any code lands.

The goal (2026-06-14): **reduce adoption friction**, so a new customer's first
Lattice experience already feels like *them* — without us supporting, or even
naming, the legacy presentation tools they're leaving. The frame is *not*
"import every format." It's "bring what you have, get a Lattice-native result
fast." Everything client-side; the only network call is the model, via the
existing ladder (`docs/src/playground/architect-model.js` — Chrome Prompt API
on-device → WebLLM → OpenRouter PKCE on the user's own account → Transformers.js
→ deterministic floor).

## The principle: board + bench — import splits by persona onto the surface that owns the output

The two surfaces already divide cleanly: the **Workbench** (bench) *fabricates
parts* — themes, layouts; the **Drawing Board** (board) *composes decks*.
Import follows that line — each persona imports on the surface that owns what
they produce, single responsibility, easy to reason about:

| Persona | Surface | Input | Output | Fidelity |
|---|---|---|---|---|
| **Designer** | **Workbench** (Theme Studio) | logo/image · PPTX · PDF · website URL | a faithful Lattice **theme** (token CSS) | **brand-faithful** |
| **Author** | **Drawing Board** | a deck (PPTX · PDF) | slides re-expressed in Lattice **components** | **Lattice-native layout** |

The two share a common **ingest front-end** (parse a source once → one
intermediate representation) but the consumers live on different surfaces and
diverge immediately. This mirrors the asset-import note's "one subsystem, two
consumer families" shape (`2026-06-09-drawing-board-asset-import.md`).

**Where the output lands:** the theme stays at the bench (Theme Studio preview
/ export). The content import *is a Drawing Board action* — the imported deck
opens directly into the board's editor as a Lattice deck the author keeps
working on with the existing AI help (Architect / Converse). The bench
fabricates the theme; the board both imports and composes the deck.

## Fidelity is defined, and deliberately not "pixel-faithful"

Lattice produces boardroom-10/10 decks under a fixed type scale and a strict
colour/contrast contract; cloning an arbitrary legacy layout fights that and
isn't even expressible in the token system. So both tracks target *intent*,
not pixels:

- **Theme = the source's brand, levelled up.** Extract its *identity* —
  palette, and where detectable its type character and density — into a proper
  Lattice theme. The customer recognises their brand instantly; that is the
  friction win.
- **Content = the source's substance, re-laid-out.** Pull the text and
  structure out of each slide and **map it onto Lattice components**
  (`<!-- _class: X -->`). We do **not** reproduce absolute positioning or
  overlap. A messy source becomes a clean Lattice deck — which is the point.

## The governing constraints

1. **All client-side, no backend.** Parsing, rendering
   (`window.LatticePlayground.render` via `lib/playground/index.js`), linting
   (`lib/authoring/lint-core.js`), and the WCAG-AA contrast audit already run
   in-browser. The model is the only network call.
2. **A Lattice theme is token CSS, nothing else.** Layouts are palette-blind
   (`var(--token)`; HARD RULE #3). "Faithful theme" reduces to *emit ~40–60
   custom-property values* off a 4–6-hex brand axis
   (`--brand-canvas/-accent/-bright/-alt`) — a tiny JSON-shaped output. Contract:
   `design/theming.md`; existing path: `lib/theme/ai.js` + Theme Studio.
3. **Imported images vendor to `data:` URIs.** The render target is a `srcdoc`
   iframe with no base URL, so any picture pulled from a source deck is stored
   as an IndexedDB blob and inlined at render time — same rule as the
   asset-import subsystem, which this feature produces into.

## The on-ramp: one universal path, not a format zoo

Supporting many vendor formats *adds* friction (more failure modes, more lossy
results to maintain). We collapse to the fewest sources that cover the most
people, and we never name the tools the customer is leaving.

- **PDF — the universal on-ramp.** Every presentation tool exports PDF, so this
  one path covers everyone (Google Slides, Keynote, Canva, Prezi, Figma, the
  lot) without a parser per vendor. Lossy on structure (coordinates, not
  semantics), so it carries a "good-enough draft" label on the content side;
  on the theme side, colour extraction from a PDF is reliable. Needs
  `pdfjs-dist` (new dep).
- **PPTX — the richer path.** OOXML unzips via `jszip` (already a dep) to exact
  theme colours, fonts, text hierarchy, and image blobs — zero tokens to parse.
  Best fidelity for both tracks.
- **Logo / image — the brand-only fast lane** (theme track). Dominant-colour
  extraction; no deck needed. The lowest-friction start of all.
- **Website URL — the live-brand lane** (theme track). Pull palette/fonts
  from the site's CSS. *Caveat:* cross-origin fetch likely needs a proxy, so
  this is the one source that isn't strictly zero-server; flag it as such and
  treat it as optional.

Explicitly **not** built: Marp/Slidev/reveal/slides.com import paths. Marp is
already native Lattice markdown (no import). The rest funnel through PDF if
anyone ever needs them. Each parser normalises to one **intermediate
representation** — slides of `{ texts[] (role hints), images[] (blobs),
colours{}, fonts{} }` — so both tracks consume one shape.

## Where the (few) tokens get spent

Everything that can be deterministic is; the model is reserved for two narrow
judgment calls.

**Free, in-browser, zero tokens**

- Parse / unzip / extract → IR.
- **Palette extraction**: dominant-colour clustering (k-means in a worker) over
  the IR colours + slide rasters. Raw brand anchors, deterministically.
- **Render** the result client-side; **lint** + **contrast-audit** before it's
  shown.
- **Image vendoring** → IndexedDB → `data:` URIs.

**Theme track — palette → tokens (small, one-shot).** Hand the model the
extracted colours + the `design/theming.md` contract; get back the ~40–60
semantic token assignments (role mapping + 12-step categorical ramp +
dark-variant + chart palette) — the call `lib/theme/ai.js` already shapes.
Shrinkable further: map colour→role heuristically, use the model only to fill
and balance the ramp. Then run the deterministic contrast audit + scaffold.

**Content track — slide → component (catalog-constrained).** Made cheap by
**picking from a catalog, not authoring from scratch.** `dist/docs/components.json`
(53 components tagged by function/form/substance/idiom) is the constrained
vocabulary. Per slide: send the IR structure + a *locally pre-filtered*
candidate shortlist → get a `<!-- _class: X -->` choice + slot-filling. Batch
slides; cache the static catalog prefix (the chat path already does 1h-TTL
prompt caching). No free-form CSS ever leaves the model.

Zero-server end to end: **parse → extract → two narrow model calls → render +
lint + contrast-audit → (theme exports / content opens in the Drawing Board).**

## Phasing

1. **Theme track, PPTX + logo** — highest value, lowest risk, mostly wiring
   existing parts (`jszip` extract → `lib/theme/ai.js` → Theme Studio).
2. **Theme track, PDF + website URL** — adds `pdfjs-dist` and the (proxied)
   URL lane.
3. **Content track, PPTX** — IR → catalog-constrained mapping → deck opens in
   the Drawing Board. Establishes the component-mapping loop on the richest
   source.
4. **Content track, PDF** — ship with the explicit "good-enough draft" label.

## Open questions

- **Per-deck or global** for imported themes/assets — inherits from
  `2026-06-09-drawing-board-asset-import.md`; resolve together.
- **Type fidelity** vs. Lattice's fixed 12-token type scale
  (`engineering/typography.md`) and the sandbox's webfont limits — likely match
  *character* (serif/sans/weight), not exact face.
- **The URL lane's proxy** — is the one non-zero-server source worth it, or do
  we cut it to keep the "no backend" promise absolute?

## Why this is feasible today

The hard infrastructure exists: client-side render (`lib/playground`), the
model ladder + OpenRouter PKCE (`architect-model.js`), the theme-AI path
(`lib/theme/ai.js` + Theme Studio), in-browser lint + contrast audit, the
machine catalog (`dist/docs/components.json`), and the asset-vendoring design.
The new work is the **ingest parsers (deterministic)** and the
**catalog-constrained component mapper** — not new rendering, not new theming
primitives, and not a server.
