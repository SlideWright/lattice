---
status: shipped
summary: Distilled principle-card pack injecting the presentation canon's qualitative judgement into the cloud-tier Coach prompt
---

# A presentation-canon knowledge pack for the Coach (2026-06-13)

> Status: **v1 shipped** (was: design / spec). Decides *how* to give the
> cloud-tier Coach the canon's qualitative judgement (Minto / Duarte / Knaflic
> / *Presentation Pitfalls* / Zen) without re-billing a book on every call and
> without copyright exposure. Companion to the coach-features spec
> (`2026-06-08-architect-coach-features.md`, the `[det]`/`[model]` split), the
> Phase-2 build (`2026-06-08-drawing-board-phase-2-build.md`, the model ladder),
> and the Coach-vs-Converse pivot (`2026-06-08-drawing-board-coach-vs-converse.md`).
>
> **Shipped (2026-06-13):** `docs/src/playground/presentation-canon.js` — the
> principle cards + `buildCanonContext()` (deck-level, findings-gated) and
> `canonForFinding()` (single-finding). Wired into Converse's rich prompt and the
> per-finding Fix prompt, both cloud-tier only, riding the per-turn dynamic tail
> (NOT the cached prefix — the retrieved set is findings-derived, so caching it
> would invalidate the primer every turn; it's a few hundred tokens by design).
> Retrieval is deterministic rule→card mapping for v1 (reliable + pure); the
> embeddings-ranked variant (`cosineRank`) and the standalone model-written
> scorecard-summary slot remain the named next consumers. Open questions below
> resolved: pack authored directly from the public frameworks (not a web-research
> pass); per-finding + a fixed core arc set for deck-level; tail placement over a
> combined cached prefix (correctness over the marginal cache win).

## The gap this closes

The Coach today enforces the canon's **checklist** — every shipped review
heuristic is `[det]` (mechanically detectable from Markdown): label titles,
walls of text, naked hero numbers, missing ask, pacing. What it does **not**
do is exercise the canon's **judgement** — the `[model]` items that are the
authors' actual reputations: Duarte's through-line / arc, Minto's buried lede,
Knaflic's "data dump with no highlighted signal," audience-fit. Those need a
model that *knows the principles*, and a generic chat model doesn't reliably —
it knows *of* Duarte, not *how* to apply the sparkline to slide 6 of this deck.

The fix is the same shape we already use to teach the model our layouts: a
**curated knowledge pack injected into the cloud prompt**. The missing artifact
is a *presentation-principles* pack distinct from the existing *Lattice-authoring*
dossier.

## Don't reinvent — what already exists (HARD RULE #15)

This is almost entirely a content + wiring problem on top of shipped infra:

| Capability | Where | Reuse |
|---|---|---|
| Cloud-only knowledge injection | `architect-knowledge.js` (`buildLatticePrimer`, ~30 KB, *cloud prompt only — the local model drowns in it*) | the **exact pattern**; the canon pack is its sibling |
| OpenRouter cloud tier + OAuth + model picker | `architect-model.js` (`openRouterBackend`) | the delivery channel |
| Authoritative per-call USD cost | `usage:{include:true}` → `usage.cost` rides back on every request | the spend ground-truth |
| Prompt-cache detection | `supportsPromptCaching` + `cache_control` breakpoints (OpenRouter applies caching automatically; ignores the breakpoint where unsupported) | the **main cost lever** |
| Embeddings + ranking | `architect-retrieval.js` (`rankByCosine`, `keywordRank`; bge-small via CDN, keyword fallback) | retrieval-gating |
| Deterministic floor | `review-core.js` / `coach-actions.js` / `coach-console.js` | the fallback the model degrades to |
| Model-off / offline guarantee | `getSettings().modelEnabled === false` forces the floor for the whole Architect | the invariant |

So "fallback is our internal model when AI is absent or poor" is **not a new
requirement** — it is the architecture's hard invariant: the model never owns
correctness, and the ladder degrades to the deterministic floor.

## Decision 1 — a distilled text pack, NOT OpenRouter file upload

OpenRouter's file/PDF feature is **not a persistent server-side knowledge store**
(it is not the OpenAI Assistants/Files API). An uploaded file is re-sent as
base64 **in the messages on every request**, re-billed in full each call, plus a
per-request parse cost on some PDF engines. For a stable knowledge base that is
the opposite of cost-conscious. Shipping copyrighted books (Polk & Hunsaker's
*Presentation Pitfalls*, Duarte's *Resonate*/*slide:ology*, Knaflic's
*Storytelling with Data*) wholesale through a model is also legally exposed.

**We author our own distilled pack instead.** Frameworks and methods — Minto's
SCQA, Duarte's sparkline, Knaflic's takeaway titles — are *ideas*, not
copyrightable expression; our own terse synthesis with attribution is clean,
concise, and impactful. This also keeps it small enough to be cache-friendly.

## Decision 2 — the cost model: retrieval-gated + cache-anchored

Three levers, all on existing plumbing, in priority order:

1. **Prompt caching is the big win.** A stable pack at a fixed position in the
   prompt, behind one `cache_control` breakpoint, bills at the provider's cached
   rate (commonly ~0.1–0.25× of input) on every call after the first — and the
   code already detects which providers honour it. This alone makes a few-KB
   pack effectively free per turn on caching-capable models.
2. **Retrieval-gating keeps the pack small in the first place.** Inject only the
   principle(s) matching the *detected* weakness — feed the deterministic
   findings (label-title → Knaflic; no-ask → Minto; monotone/flat arc → Duarte)
   into `rankByCosine`/`keywordRank` and pull the 1–3 relevant principle cards,
   not the whole pack. The det floor becomes the *query*, the canon the
   *retrieved context*.
3. **The budget gate + `usage.cost` tally already meter it.** No new accounting;
   the canon calls route through the same spend gate as the rest of Converse.

Target budget: the canon context per critique call stays in the **low hundreds
of tokens** (retrieved cards), with the full pack as the cached fallback when
retrieval is cold. Concretely: author the pack as ~12–20 **principle cards**,
each a terse rule + a one-line "smell" + a one-line fix + attribution — not prose.

## Architecture — where it plugs in

```
  deterministic findings (review-core)         ← the floor / the query
            │
            ▼
  retrieval-gate (architect-retrieval)          ← pick 1–3 canon cards
            │
            ▼
  presentation-canon.js  (NEW, sibling to architect-knowledge.js)
            │   buildCanonContext(findings|deck) → terse principle cards
            ▼
  Converse cloud prompt  (cache_control breakpoint on the stable pack head)
            │
            ▼
  qualitative critique  ─── degrades to ──▶  deterministic floor (always)
```

- **New file:** `docs/src/playground/presentation-canon.js` — pure, fs-free,
  bounded, the canon authored as principle-card data + a `buildCanonContext()`
  selector. Sibling to `architect-knowledge.js`; same "cloud-prompt-only" rule.
- **Wiring:** injected into the Converse cloud prompt only, behind the existing
  `isCapableTier` / OpenRouter gate. The small local / Transformers.js tiers do
  **not** receive it (they drown — the same reason the Lattice primer is
  cloud-only).
- **Surface:** feeds the two highest-leverage `[model]` items from the
  coach-features audit — the **model-written scorecard summary** (schema slot
  already exists) and the **through-line / arc critique**. The deterministic
  Coach console stays untouched as the floor.

## The honest ceiling — say it in the UI

This is a **cloud-tier-only** capability. Local/floor users keep the
deterministic checklist; only a connected OpenRouter (or comparably capable)
model gets canon-grade critique. "AI with knowledge files" therefore means *the
cloud tier gets Duarte-grade judgement*, **not** *every user does*. The UI must
state this honestly (as the model-tier chips already do), and — per the
Phase-2 build's verification stance — **advice quality on a real model is
live-only and unverified here**; mock tests prove the *flow*, not the *wisdom*.

## Open questions

- **Pack authorship source.** Distil from the public frameworks directly, or
  first run the "map the books" pass (web-sourced trap lists) to ground each
  card? *Lean: map first, then distil, so each card cites a real principle.*
- **Retrieval granularity.** Per-finding card lookup, or one whole-deck pass
  that retrieves an arc/structure card set? *Lean: both — per-finding for slide
  critiques, a small fixed arc-set for the deck-level through-line call.*
- **Cache breakpoint placement.** Pack at the system-prompt head (max cache hit,
  but always present) vs. after the Lattice primer (one combined cached prefix).
  *Lean: one combined cached prefix — primer + canon — single breakpoint.*
- **Does the pack ever help the floor?** No — it is model-only context. The
  floor's wisdom stays hand-coded in `review-core.js`. (Keeps the offline
  guarantee pure.)

## Verification stance (when built)

Mirrors `2026-06-08-drawing-board-phase-2-build.md`: the **selector + retrieval
+ prompt assembly + cache-breakpoint placement are pure and unit-tested**; the
**MockBackend** exercises the full critique flow end-to-end; the **degraded
path** (no cloud → deterministic floor) is the sandbox's native state and is
headless-verified. **Not claimed without real hardware:** that a given model
actually produces better critique *with* the pack than without — that needs a
desktop session with a real OpenRouter model and a human read, and the PR will
say so.

## Build sequencing (when authorised)

1. **Author `presentation-canon.js`** — the principle cards + `buildCanonContext`
   selector (after the optional "map the books" pass).
2. **Retrieval-gate it** — wire the det findings → `rankByCosine` → card pick.
3. **Inject + cache-anchor** into the Converse cloud prompt (one combined cached
   prefix with the Lattice primer).
4. **Land the model-written scorecard summary** (the existing schema slot) as the
   first consumer; the through-line critique second.
5. **Mock-test + degrade-verify;** flag live-quality as desktop-only in the PR.

## References

- `2026-06-08-architect-coach-features.md` — the `[det]`/`[model]` split; the
  scorecard schema slot this fills.
- `2026-06-08-drawing-board-phase-2-build.md` — the model ladder, the adapter
  contract, the "model never owns correctness" invariant, the verification stance.
- `2026-06-08-drawing-board-coach-vs-converse.md` — why the deterministic Coach
  and the model Converse are separate surfaces.
- `2026-06-08-architect-modes.md` — Appendix A (framework-grounded spines) and
  Appendix B (the canon-sourced review heuristics).
- `docs/src/playground/architect-knowledge.js` — the pattern this mirrors.
