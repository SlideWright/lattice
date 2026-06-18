---
status: proposed
summary: Phase 2 build plan for the Drawing Board Architect's voice — the ArchitectModel tier ladder behind the deterministic floor
---

# The Drawing Board — Phase 2 build plan: the Architect's voice (2026-06-08)

> Status: **build plan, not started.** Companion to the proposal
> (`2026-06-07-drawing-board-architect.md` — read §4 "The Architect" and §5
> "On-device model stack" first) and the Phase 1 plan
> (`2026-06-07-drawing-board-phase-1-plan.md`, ✅ complete). This turns Phase 2 +
> the model-shaped bits of Phase 3 into concrete slices. **Resume here.**

## Where Phase 1 left it (the ground you build on)

Phase 1 is shipped and gate-green on `claude/github-pages-slide-editor-6zJe3`
(PR #79). The Architect already works **deterministically, zero-model** — that is
the floor every Phase 2 tier degrades back to. Concretely, these exist:

- **Route + workspace** — `docs/src/pages/drawing-board.astro` (`/drawing-board`):
  three-panel shell (Architect · editor · filmstrip) + rail, resizers, responsive
  tabs. An inline controller owns render + palette/mode + the editor↔slide sync.
- **Editor** — `docs/src/playground/editor.js` (`createEditor`, with `onChange`,
  `onCursor`, `goToLine`). Bridged on `window.__dbEditor`.
- **Persistence** — `docs/src/playground/drawing-board-store.js` (raw IndexedDB).
  Stores: `decks`, `revisions`, `settings`, **and `chats` + `messages` already
  declared** (keyPath/indexes in place) precisely so Phase 2 chat needs **no
  schema migration**. Exposed on `window.__dbStore` (`saveActive`, `checkpoint`,
  `create`).
- **The Architect panel** — `docs/src/playground/drawing-board-architect.js`:
  - `createArchitect({ vocab, mount, reveal, applyFix })` — live deterministic
    review via the shared `lib/authoring/lint-core.js` (`lintTextWith`), with
    Reveal / How-to-fix / **Apply fix** (`lint-core.applyFix`).
  - `createOnboarding({ catalog, mount, onBuild })` — the 3-question flow with
    **keyword** retrieval over the catalog → outline → scaffold.
- **Data shipped in the page** (`#db-data` JSON island): `lintVocab`
  (`{names,modifiers}`) and `catalog` (`{name,bucket,tags,skeleton}` per
  component), both computed at docs-build time from the manifests.
- **Engine import works in the browser** — `astro.config.mjs` already applies
  Vite's CJS transform to `lib/authoring/lint-core.js`; the same mechanism covers
  any new CJS engine import.

Phase 2's job: add an **`ArchitectModel`** behind these, so the *phrasing* and
*retrieval quality* improve while the deterministic findings/actions stay
identical (proposal §4: tooling-first; §5: the tier ladder).

## Architecture recap (the rules Phase 2 must hold)

From proposal §5 — do not relitigate, just implement:

- **One adapter, `ArchitectModel`** — `complete(messages, {json})` + `embed(text)`.
  App code never branches on backend.
- **Embeddings are ALWAYS Transformers.js** (`bge-small-en-v1.5`, ~50MB, WASM,
  universal) — pins the consistency-critical retrieval surface for 100% of users.
- **Generation is a feature-detected ladder:** built-in Prompt API → Transformers.js
  → WebLLM (opt-in) → **deterministic templated floor** (the Phase 1 behavior).
- **Prompts target the weakest tier** (short, single-intent, structured JSON).
- **The model never owns correctness** — findings + quick-actions stay from
  lint-core; the model phrases, classifies intent, and frames retrieval.

## The slices

### Slice 6 — the `ArchitectModel` adapter + embeddings (universal)
- **Build:** `docs/src/playground/architect-model.js` — the adapter interface +
  the embeddings backend first (Transformers.js `bge-small`, lazy-loaded on first
  use, cached via the browser Cache API). `embed(text)` returns a vector;
  `complete()` initially routes straight to the **deterministic floor** (returns
  templated text) so nothing regresses.
- **Use it:** upgrade `createOnboarding` retrieval from keyword-overlap to
  **embedding cosine similarity** over the catalog (embed each component's
  name+tags+when once, cache; embed the user's answers; rank). Gate behind "if
  embeddings ready, else keyword" so the floor still works.
- **Acceptance:** onboarding suggests visibly better-fitting components for
  free-text input; works (keyword fallback) before the model loads; no WebGPU
  required.

### Slice 7 — built-in Prompt API tier (Chrome/Edge) + the chat surface
- **Build:** a `PromptAPI` backend for `complete()` — runtime-detected
  (`await LanguageModel.availability()`), never assumed. Re-introduce the panel
  **composer** (removed in Phase 1) as a real chat input, persisted to the
  `chats`/`messages` stores; render a thread. The Architect's **findings + the
  onboarding questions get phrased by the model** (falling back to templated text
  when unavailable).
- **Acceptance:** on a capable Chrome/Edge, the Architect converses + phrases
  findings; on everything else it silently uses the templated floor; chat history
  persists and resumes per deck.

### Slice 8 — WebLLM power-user tier
- **Build:** a `WebLLM` backend (Qwen2.5-1.5B q4f16 default, Llama-3.2-3B quality
  tier), **explicit opt-in** with a deliberate "summoning the Architect" ~1GB
  download UX; WebGPU-detected. Never blocks authoring.
- **Acceptance:** a user can opt into WebLLM, see download progress, and get the
  higher-quality tier; declining leaves the Prompt-API/floor path intact.

### Slice 9 — model-fed quick-actions + focus edit modes (Phase 3 pull-ins)
- **Build:** (a) Rewriter/Summarizer built-in APIs for prose quick-actions
  ("tighten this", "make it an exec summary") where present; (b) **focus edit
  modes** — open the fenced ```mermaid / `$$…$$` block under the cursor in an
  isolated sub-editor with a live fragment preview.
- **Acceptance:** prose actions appear where the APIs exist; focus mode edits a
  Mermaid/math fragment in isolation with live preview.

### Slice 10 — polish
- Mobile/responsive pass on the chat + onboarding; storage-eviction stance
  (`navigator.storage.persist()` prompt vs. export-only); empty/error states for
  every model tier.

## Dependencies to add (docs/package.json)

- `@huggingface/transformers` (Transformers.js) — embeddings (+ optional WASM
  generation fallback). Lazy-import; own chunk (like `pptxgenjs`).
- `@mlc-ai/web-llm` — the WebLLM tier. Lazy-import, opt-in only.
- Built-in Prompt/Rewriter/Summarizer APIs need **no dep** (browser-native).

Keep all three out of the initial bundle (dynamic `import()`), and out of the npm
engine tarball (they live under `docs/`).

## Risks / open decisions

- **Built-in Prompt API availability** is flaky even on Chrome/Edge (hardware/
  disk/enterprise-gated) → mandatory runtime detection + fall-through. Gemini Nano
  (Chrome) ≠ Phi (Edge) → phrasing varies; acceptable per §5 (only wording varies,
  not findings).
- **WebGPU + ~1GB download** for WebLLM → strictly opt-in, progress UX, cancelable.
- **Model output discipline** — force structured JSON for any action; validate
  before applying; never let the model emit the *edit* (the edit is engine-made).
- **Default model tier order** (proposal asked): Prompt API → Transformers.js
  (WASM) → WebLLM, vs. surfacing WebLLM earlier for WebGPU users. Decide in Slice 7.
- **Where the model "frames" vs. "floors"** — keep a single switch so the whole
  Architect can run model-off for testing + the offline guarantee.

## How to resume in a fresh session

1. Read proposal §4–§5 + this file.
2. `npm install` (root) + `cd docs && npm install`; `cd docs && npm run dev` →
   `/lattice/drawing-board` to see the Phase 1 state live.
3. Start Slice 6 (`architect-model.js` + embeddings). The deterministic floor in
   `drawing-board-architect.js` is the contract to preserve.
4. Gate every push: `npm run lint`, `npm run build:check`, `npm test`, and
   `cd docs && npm run build` (docs CI parity). Commit as `area(scope): summary`.
