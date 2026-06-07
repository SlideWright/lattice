# Browser authoring studio + the Architect assistant (2026-06-07)

> Status: **proposal / design model.** No code yet. This doc fixes direction
> before implementation, per the "design before code on rethink requests" rule
> in `CLAUDE.md`. Working product name **Lattice Studio** (placeholder, see §10).
> Assistant name **decided: Architect**, used in prose and its own voice as
> *the Architect* — see §4 "Name & voice." **Frame** is the reserved fallback.

## Problem / intent

We want a genuinely functional, browser-only slide editor on GitHub Pages — a
**first-class top-level capability**, a sibling to (not a replacement for) the
existing component playground. It should let someone author a full Lattice deck
in the browser with no install, persist their work locally, and get
conversational authoring help from an on-device AI assistant, **the Architect**.

Requested capabilities:

1. **CodeMirror-based editor**, browser-only, backed by IndexedDB.
2. **History** like Claude Code's — navigable, restorable revisions.
3. **The Architect**: an integral AI chat with its own conversational history,
   deck/slide recommendations, and **quick actions** to adopt those
   recommendations. Powered by a JavaScript small language model — explicitly
   *not* "yet another corny copilot."
4. **Three-panel UX** (Architect · editor · preview), desktop-primary but responsive.
5. **Conversation-first onboarding** — talk to the Architect before authoring.
6. **Focus edit modes** for Mermaid, math, etc.
7. **Editor↔preview sync** with auto-scroll keeping the edited section visible.
8. **Export** to Markdown, PDF, and PowerPoint.

## Why this is unusually feasible here

The hard infrastructure already exists in this repo — Studio is largely an
*assembly + persistence + assistant* layer over parts that already run:

- **The engine already renders client-side.** `tools/build-playground.js`
  bundles marp-core + the shared Marp plugins (`lib/integrations/marp/plugins.js`)
  + the transformer registry into one browser IIFE
  (`docs/public/playground/lattice-playground.js`) that runs **render path #2
  entirely in the browser**. Studio reuses this; it does **not** introduce a
  4th render path (the three-paths rule in `CLAUDE.md` stays intact).
- **CodeMirror 6 is already a dependency** (`docs/package.json`) with markdown
  support and a hand-ported Mermaid `StreamLanguage` grammar, themed through the
  palette CSS variables. `docs/src/playground/editor.js` is a 264-line
  proto-editor to grow from.
- **Deterministic deck intelligence already exists**: the author linter
  (`lib/authoring/lint.js` → `npm run lint:deck`), the machine catalog
  (`dist/docs/components.json` — when/anti-pattern/slots/skeletons per
  component), the parser, and the enriched manifests. This is what makes the
  Architect trustworthy (see §4).
- **GitHub Pages deploy already runs** (`.github/workflows/docs.yml`, Astro).

Positioning: the **playground** answers "let me try one component fast." **Studio**
answers "let me author and keep a whole deck, with help." Different jobs; Studio
is a new top-level Astro route (e.g. `/studio`), not an evolution of the
playground page.

## 1. Layout & responsiveness

Three resizable panels plus a left rail:

```
┌──────┬───────────────┬───────────────┬───────────────┐
│ rail │ Architect chat│  CodeMirror   │  live preview │
│ decks│  (own history)│   (focus modes)│  (filmstrip) │
│ +hist│               │               │  synced scroll│
└──────┴───────────────┴───────────────┴───────────────┘
```

- **Desktop-primary**, panels drag-resizable, widths persisted.
- **Responsive collapse** under ~1024px: panels become a segmented
  control / tabbed view (Architect · Edit · Preview); the rail becomes a drawer.
- **Empty state = conversation-first onboarding.** With no deck open, the
  center/right are a welcome and the Architect asks "What are you presenting, and
  to whom?" Onboarding retrieval (§4) turns the answer into a starter deck +
  component suggestions, then the editor populates.

## 2. Persistence & history (IndexedDB)

- **Store**: IndexedDB via a thin wrapper (`idb` or Dexie). Object stores:
  `decks`, `revisions`, `chats`, `messages`, `settings`, plus a `models`
  cache namespace (browser Cache API handles model weights for WebLLM/
  Transformers.js).
- **Two independent histories, as specified:**
  - **Deck revisions** — checkpoint snapshots + restore, Claude-Code-style:
    time-ordered, labeled, restorable; a restore forks rather than destroys.
    Append-only event log with periodic full snapshots keeps storage bounded.
  - **Chat thread** — the Architect's conversations persist with their own
    history and can be resumed/branched, separate from deck revisions.
- **Not** full git-in-the-browser (isomorphic-git). A checkpoint/restore model
  meets the "like Claude Code history" bar without the weight; revisit only if
  real branching/merging is needed later.

## 3. Editor, focus modes, sync

- **Editor**: grow `editor.js` — markdown + Mermaid highlighting already
  present; add slot/`<!-- _class: -->` awareness, the author-linter surfaced as
  inline diagnostics (reuse `lib/authoring/lint.js`), and component/skeleton
  completions from `components.json`.
- **Focus edit modes**: open the fenced block under the cursor (` ```mermaid `,
  `$$…$$` math, ` ```chart `) in an isolated sub-editor with specialized
  highlighting and a **live fragment preview** (Mermaid highlighting + KaTeX
  already in the tree). Distraction-free, validates the fragment in isolation.
- **Editor↔preview sync**: slides are `---`-separated, so map cursor line →
  slide index → scroll preview to that slide and highlight it; reverse on
  preview click. **One real change from today:** the playground preview is a
  single fixed 1280×720 specimen iframe; Studio needs a **scrollable filmstrip**
  of all slides with the active one tracked. Moderate work, still render path #2.

## 4. The Architect — *tooling-first, SLM as the conversational coat*

### Name & voice

The assistant is **Architect** as a brand mark (the chip, the menu item) and
*the Architect* in prose and its own voice — "Ask the Architect," "the Architect
suggests," "I'm the Architect." The definite article makes it read as a senior
colleague rather than a feature, while the bare mark stays crisp as a label. The
metaphor is self-explaining and needs no gloss: **Lattice is the structural
framework; the Architect designs what goes in it** — narrative structure,
load-bearing slides, flow. Recommendations surface as "the Architect suggests:"
/ "the Architect flags:". **Frame** is the reserved fallback (the tightest pun on
the lattice metaphor — *framing an argument* = *the structural frame*); the
formal *The Architect* (capitalised, *Economist*-style) is available if a heavier
register is ever wanted, at the cost of a faint *Matrix* echo.

### Tooling-first architecture

**Decision (confirmed): the model never owns knowledge or correctness.**
Recommendations and quick-actions are produced by the existing deterministic
Lattice tooling; the small language model only handles phrasing, intent
classification, and onboarding retrieval framing. This is what keeps a 1–3B
on-device model from inventing non-existent components or emitting malformed
markdown, and it reuses infrastructure we already ship.

Pipeline:

1. **Parse + lint the live deck** → structured facts + deterministic findings
   (`lib/authoring/lint.js`, the parser, manifests). e.g. "card-style slide uses
   `- **Title.** body` → adopt nested format" is a deterministic finding with a
   deterministic fix.
2. **Catalog retrieval** for onboarding / "which component fits": embed the
   user's description, retrieve candidates from `components.json` by semantic
   similarity. The when/anti-pattern prose is already authored per component.
3. **SLM frames** the findings/retrieval conversationally and classifies intent.
   It does *not* generate the advice content or the edits.
4. **Quick actions are engine-generated CodeMirror transactions** — insert this
   skeleton, rewrite this `li` to nested format, swap `cards-grid`→`verdict-grid`.
   "Adopt recommendation" applies a real, validated edit, never model-typed
   markdown.

Consequence: across *all* model backends, **what the Architect knows and can do
is identical**; only the phrasing/latency vary (see §5).

## 5. On-device model stack — tiered, with a hard consistency split

**Confirmed strategy**: built-in browser Prompt API as default where present,
Transformers.js as the portable fallback, WebLLM as the power-user opt-in.
Refined into a ladder behind one adapter:

- **Embeddings — *always* Transformers.js `bge-small-en-v1.5`** (~50MB, WASM,
  universal). This **pins the consistency-critical surface** (onboarding
  retrieval, "which component fits") to one model for 100% of users. *Which
  components the Architect surfaces is identical for everyone.* Generation tiers;
  retrieval does not.
- **Generation — feature-detected ladder:**
  1. **Built-in Prompt API** (Chrome → Gemini Nano, Edge → Phi). Zero site bytes
     (browser owns the weights), fast. **Must be runtime-detected
     (`await LanguageModel.availability()`), never assumed** — it is hardware/
     disk-gated, may be undownloaded, and can be enterprise-disabled even on
     Chrome/Edge.
  2. **Transformers.js generation** (small ONNX, WebGPU when available, WASM
     otherwise) — portable fallback; WASM generation is functional but slow.
  3. **WebLLM** (Qwen2.5-1.5B q4f16, ~1GB; Llama-3.2-3B quality tier) — explicit
     **power-user opt-in download**, WebGPU-only.
  4. **Deterministic templated floor** — if every model tier is unavailable or
     declined, the Architect still works as a linter/recommendation panel with
     templated phrasing. **Never a dead Architect.**

Design rules that keep the tiers coherent:

- **One internal `ArchitectModel` adapter** — `complete(messages, {json})` +
  `embed(text)`. App code never branches on backend; the ladder lives behind it.
- **Prompts target the weakest tier** — short, single-intent, structured JSON —
  so they run on Gemini Nano/Phi; stronger models just execute them better.
- **Optional progressive enhancement**: Chrome/Edge **Rewriter/Summarizer**
  built-in APIs can power quick-actions like "tighten this prose" for free where
  present. Not load-bearing.

**"Different experiences?" — honest answer:**

| Axis | Varies? | Handling |
|---|---|---|
| Phrasing / tone | Yes (Nano ≠ Phi ≠ Qwen) | Acceptable — wording only |
| Latency | Yes (Prompt API fast, WASM slow) | Tier-gated streaming UX |
| **What the Architect knows & can do** | **No — identical** | Guaranteed by §4 tooling-first |

## 6. Export — all three from phase 1 (confirmed), with honest fidelity

- **Markdown** — perfect; it is the source.
- **PDF** — high-fidelity **print-to-PDF** via a one-slide-per-`@page` print
  stylesheet over the rendered slides. **Not byte-identical** to the puppeteer/
  marp-cli pipeline (headless Chrome is impossible in-browser); it is a
  browser-render of the same HTML/CSS, which is high but not pixel-locked
  fidelity. State this in the UI.
- **PowerPoint** — **image-slides**: rasterize each rendered slide to PNG
  (foreignObject/canvas) and assemble with **PptxGenJS** as full-bleed slide
  backgrounds. Editable *container*, **non-editable image content**. True
  editable-text PPTX is not realistic from this engine; the UI must say so.

Export honesty is a UX requirement, not a footnote — surface the fidelity
tradeoff at the export action.

## 7. Where it lives / what ships

- A **`docs/`-site app**, new top-level Astro route, reusing the playground
  bundle + runtime. **It does not enter the npm tarball** (`@slidewright/lattice`
  `files` allowlist stays as-is; Studio is a documentation-site asset like the
  playground). No bloat to the published engine.
- Reuses, does not fork: `components.json`, `lib/authoring/lint.js`, the
  playground engine IIFE, the runtime bundle, the theme CSS files.

## 8. Risks & open hard parts

- **Built-in Prompt API availability is flaky** even on Chrome/Edge → mandatory
  runtime detection + graceful fall-through (handled by the ladder).
- **WebLLM first-load is ~1GB** → strictly opt-in, with a deliberate
  "summoning the Architect" download experience; never blocks core authoring.
- **Filmstrip preview** is the one genuinely new render-surface piece vs. the
  single-specimen playground; needs slide-index ↔ source-line mapping.
- **PDF/PPTX fidelity** is bounded by what a browser can do without headless
  Chrome; mitigated by honest UI framing, not by pretending parity.
- **IndexedDB durability** — browsers can evict; offer explicit "export deck"
  and consider `navigator.storage.persist()`.

## 9. Phased plan (proposed)

- **Phase 1 — Walking skeleton (no LLM):** Studio route, 3-panel shell + rail,
  CodeMirror editor wired to the playground engine, **filmstrip preview with
  synced scroll**, IndexedDB decks + checkpoint history, MD/PDF/PPTX export, and
  a **deterministic Architect panel** (linter findings + catalog retrieval +
  quick actions) with the templated floor — *fully useful with zero model*.
- **Phase 2 — the Architect gets a voice:** `ArchitectModel` adapter + embeddings
  (Transformers.js) + built-in Prompt API tier; conversation-first onboarding;
  chat history.
- **Phase 3 — Heavier tiers & polish:** WebLLM power-user tier, focus edit modes
  for Mermaid/math, Rewriter/Summarizer quick-actions, responsive/mobile pass.

Phase 1 is independently shippable and proves the architecture before any model
weight is downloaded.

## 10. Open questions

- **Naming**: assistant name **decided — Architect** (voiced *the Architect*;
  **Frame** reserved as fallback; formal *The Architect* available for a heavier
  register). The **Studio** product name is still a placeholder.
- **Route + nav**: `/studio`? How prominently surfaced vs. the playground/docs.
- **Onboarding depth**: how much does the Architect ask before generating a
  starter deck?
- **Storage-eviction stance**: prompt for `persist()`, or rely on explicit
  export as the durability guarantee?
