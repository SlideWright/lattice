# The Drawing Board — Phase 2 build notes: the Architect's voice (2026-06-08)

> Status: **in progress** on `claude/architect-phase-2`. Companion to the Phase 2
> *plan* (`2026-06-08-drawing-board-phase-2-plan.md`) and the coach-features spec
> (`2026-06-08-architect-coach-features.md`). This file records the **decisions
> and the verification stance** for the actual build — what was built, how it was
> proven, and what can only be proven on real hardware.

## The hard constraint that shapes everything

The generative tiers cannot be exercised in CI or in this build sandbox:

- **Built-in Prompt / Rewriter / Summarizer APIs** (`window.LanguageModel`, …) do
  not exist in headless Chromium — only in a capable Chrome/Edge with the model
  downloaded. Detection returns "unavailable" here.
- **WebLLM** needs **WebGPU** (absent headless) + a ~1 GB weight download.
- **Transformers.js** embeddings need the HuggingFace CDN, which the sandbox
  cert-intercepts (same class of failure as jsdelivr in the preview iframe).

So "test / verify" is defined concretely for this work:

1. **Every deterministic feature is verified for real** — focus edit modes, the
   chat surface + persistence, retrieval ranking math, scorecard model-slot,
   every UI state, mobile/tablet layouts.
2. **Every graceful-degradation path is verified for real** — because the sandbox
   *is* the degraded environment (no Prompt API, no WebGPU, no CDN). The "running
   deterministically / enable on-device AI" states are screenshotted headless.
3. **The model-on path is unit-tested through a `MockBackend`** — a fake backend
   that streams canned tokens / returns canned JSON, so the full flow (compose →
   stream-render → parse → apply as an undoable editor transaction → re-lint) is
   exercised end-to-end without a real model.
4. **What is NOT claimed:** live phrasing quality on real Gemini Nano / Phi,
   real WebLLM inference, real HF embeddings. Those are wired, mock-tested, and
   degrade-verified, but the live model path needs a desktop session with the
   hardware. Each such surface says so in the UI and the PR.

This is the tooling-first contract paying off: **the model never owns
correctness**, so a missing model degrades to the proven Phase-1 floor rather
than breaking. The deterministic floor stays the product; the model is a coat.

## Decision: no new npm deps — heavy backends load from CDN on demand

The plan (§ "Dependencies to add") suggested adding `@huggingface/transformers`
and `@mlc-ai/web-llm` to `docs/package.json` as lazy chunks. **We deviate:** the
heavy runtimes load via lazy **CDN dynamic import** (`import(/* @vite-ignore */
url)`) behind feature detection / opt-in, and the built-in APIs are
browser-native (no dep at all). Rationale:

- These are precisely the parts that cannot run in CI/sandbox, so bundling them
  buys no verifiable value tonight while adding heavy `node_modules` + build-time
  risk (WASM, workers, pre-bundling quirks).
- They are designed to be CDN-delivered on demand; the bundle stays tiny (the
  whole point of an opt-in tier).
- The "embeddings are always Transformers.js" consistency property still holds —
  same model for every user, just delivered from the CDN rather than the bundle.
- Net: `docs/package.json` is unchanged; the Drawing Board's initial payload does
  not grow; the model code paths are isolated in `architect-model.js`.

If a future maintainer wants the weights self-hosted or bundled (air-gapped
deployments), swap the CDN URL constants in `architect-model.js` for a bundled
`import()` and add the deps then — the adapter interface does not change.

## The adapter contract (`docs/src/playground/architect-model.js`)

```
createArchitectModel({ getSettings }) → {
  // Generation — ladder: PromptAPI → Transformers.js(CDN) → WebLLM(opt-in) → floor
  complete({ messages, json?, signal?, onToken? }) → Promise<string|object>,
  // Embeddings — Transformers.js(CDN) bge-small, else null (caller keyword-falls-back)
  embed(texts) → Promise<Float32Array[]|null>,
  availability() → { generation: tier, embeddings: bool },   // for UI
  setTier(name), summon(onProgress, signal),                 // WebLLM opt-in
}
```

- `complete()` **always resolves** — never throws on a missing model; it falls
  through the ladder to the floor backend (templated text), so callers never
  branch on backend.
- `json:true` asks the backend for structured output and **validates** before
  returning; on any parse failure it falls to the floor's templated object.
- A single **model-off switch** (`getSettings().modelEnabled === false`) forces
  the floor for the whole Architect — the offline guarantee + the test hook.

## Retrieval (pure, unit-tested)

`docs/src/playground/architect-retrieval.js` — `rankByCosine(queryVec,
itemVecs)` and `keywordRank(query, items)`. Pure, fs-free, dependency-free,
unit-tested with synthetic vectors so the ranking math is proven without a real
embedder. `createOnboarding` uses cosine when `embed()` is ready, keyword
otherwise — identical UI either way.

## Verification log (as built)

- **Slice 6 — adapter + floor + retrieval (done).** 13 unit tests: ladder floors,
  json validate-or-floor, throwing-backend safety, mock streaming, cosine
  ranking + mock-embedding pipeline. Headless: adapter reports generation=floor /
  promptApi=unavailable; onboarding fuse fallback returns results.
- **Slice 7 — chat + Prompt API tier (done).** 5 unit tests (buildChatMessages /
  floorReply). Headless with a MockBackend: streamed reply renders, both turns
  persist, the thread RESUMES after reload; the floor reply reports the
  deterministic score honestly; mobile (390) composer + thread verified.
- **Slice 9 — focus edit modes (done).** 8 unit tests for findFocusBlock
  (boundaries, unterminated fences, non-focusable fences, multi-block, math).
  Headless: button enables in a mermaid block, overlay opens, Apply writes the
  fragment back with fences intact, Esc/Cancel discards; mobile stacks.
- **Slice 9b — refine actions (done).** 6 unit tests (buildRefinePrompt /
  cleanRewrite). Headless: disabled at the floor (gated — no deterministic floor
  for prose rewrite), enabled with a MockBackend, all four actions apply via an
  undoable selection replace.
- **Slice 8 — model settings + WebLLM opt-in (done).** probeWebGPU unit test
  (Node-safe). Headless: chip reads the live tier, popover shows tiers with
  correct degraded states ("not here" / "needs WebGPU"), no summon without a real
  WebGPU adapter, the AI toggle flips + persists; mobile popover fits.
- **Slice 10 — polish (done).** Empty/floor states for chat + settings; the store
  already requests `navigator.storage.persist()`; mobile/tablet pass on chat,
  settings, focus, refine at 390/768/1440; dead onboarding CSS removed.

**Live-only (needs real hardware, not claimed verified here):** built-in Prompt
API phrasing on Gemini Nano/Phi, WebLLM inference + the ~1GB download, real
Transformers.js embeddings from the HF CDN. All are wired, mock-tested, and
degrade-verified.
