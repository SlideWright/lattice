# The Architect, reframed: Coach vs Converse (2026-06-08)

> Status: **design — approved direction, not yet built.** Supersedes the "the
> Architect is a chat" framing of the Phase-2 work. Companion to
> `2026-06-08-drawing-board-phase-2-build.md` (what shipped) and the
> coach-features spec. Build after sign-off, Coach console first.

## Why this doc exists

Phase 2 chased an on-device LLM chat coach. Real-device testing proved two things:

1. **A phone-runnable model is not a useful coach.** Even Qwen2.5-0.5B embellishes,
   invents facts, ignores the grounding findings, and rambles. The deterministic
   engine, by contrast, scored a real deck **A− 87** and named three specific,
   correct, fixable problems with the offending line and a how-to-fix. The
   deterministic review is the genuinely good product; the model was the weak link.
2. **There is no clean path to a real-LLM chat that is free-to-us, no-middleman,
   AND low-friction** — it's pick-3-of-4, because frontier inference costs money:
   - on-device → free / private / no middleman, but **weak**;
   - BYO key → real quality, free to us, but **friction** (a *separate*
     console.anthropic.com account — Pro/Max subscriptions are NOT API access);
   - Puter / OpenRouter → real quality, free to us, low friction, but **middleman
     + the deck routes through them** (and Puter's "free" is a subsidy that may
     not last);
   - we host a proxy → great UX, but **we pay**.
   There is no door #5. Direct "OAuth your Claude account into our app" is **not
   offered** by Anthropic/OpenAI (subscriptions are walled from third-party API
   billing).

The reframe that resolves the UX confusion: **deterministic is not a chat — so
stop dressing it as one.** A free-text composer implies a conversation the
deterministic engine can only fake. Gate the composer behind a *real* model.

## The model: two ways the Architect helps

A toggle on any deck — **Coach ⇄ Converse**:

- **Coach (deterministic).** No composer. Structured: the scorecard + findings +
  fixes, plus a row of **action chips** for what it can actually answer well.
  Each tap returns a **result card**, not a chat bubble. Free, instant, private,
  works on every device. This is the star.
- **Converse (generative).** The real chat composer — and it **only appears
  here**, when a real model is behind it. A chat box is therefore never a lie.

The Drafting / Freehand onboarding doors choose a *starting point* (scaffold vs
blank); **Coach ⇄ Converse** is the ongoing help mode, switchable any time on the
same deck. That single toggle is also the answer to "how do we transition between
the deterministic and freehand routes" — it's one tap.

## Platform × mode matrix

| | Coach (deterministic) | Converse (generative) |
|---|---|---|
| **Mobile** | always | **Puter only** |
| **Desktop** | always | **Puter (default) · local lightweight model (private/offline toggle)** |

- Coach is the floor everywhere — no model, no cost, no network.
- Converse default is **Puter** (decided: genuinely good answers beat the weak
  local model for first impressions). The **local model is the opt-in "Private /
  offline (lightweight)" choice** on desktop, clearly labeled as weaker. Mobile
  has no local tier at all (too marginal; the worker/WASM saga showed why).
- Built-in Prompt API (Chrome/Edge) and WebLLM, if present, still slot in as
  local options — but they are not the headline path.

## Coach console (deterministic) — the detail

Replaces the chat composer in deterministic mode with a structured surface:

1. **Scorecard** — overall grade + the five category bars (existing).
2. **Findings** — each with Reveal / How-to-fix / Apply (existing).
3. **Action chips** — deterministic queries with structured *result cards*:
   - **Top fixes** — findings ranked by severity.
   - **Weakest slide** — the lowest-scoring / most-flagged slide, jump to it.
   - **Structure check** — spine completeness vs the chosen archetype (Drafting
     knows the archetype) / presence of opening · ask · close.
   - **Pacing** — slide count vs a stated talk length (ask once; ahead/behind).
   - **The ask** — is there a clear decision/recommendation slide?
   Each maps to a scorecard category, so the chips *are* the score, explained.
   Honest: it only offers what it can deliver, so it never disappoints.

No free-text input in Coach. The "ask me anything" feeling comes from the chips,
not a composer.

> **Update (2026-06-13) — a model *Fix* on findings.** A finding's actions are
> now Reveal / How-to-fix / **Fix**, where Fix appears only when a capable tier
> (cloud / WebLLM) is connected and the finding is a judgement call (not a
> mechanically-autofixable footgun, which keeps its exact `Apply fix`). Fix asks
> the model to rewrite *that one slide* and renders a reviewable ± diff inline,
> reusing Converse's EDIT-BLOCK protocol + diff card; nothing changes until the
> author clicks **Apply**, and then the deterministic engine re-scores. This does
> **not** soften the Coach/Converse split: Coach still owns *detection and
> scoring* deterministically and offers no free-text input — a model may only
> *propose a fix* for an already-deterministically-found issue, gated, behind
> Apply + re-score, with the floor (How-to-fix) intact when no model is present.
> Pure core: `architect-fix.js`. Spend respects the session budget cap; the
> prompt is cached where the provider supports it. The button tracks the live
> tier: `architect-model.js` dispatches a `db-model-changed` window event on
> every connect / disconnect / model-swap / summon, and the Architect re-renders
> on it, so Fix appears/hides the moment availability changes (no deck edit
> needed). The rewrite is grounded in the canon principle behind the finding —
> see `2026-06-13-coach-canon-knowledge-pack.md`.

## Converse (generative) — the detail

- Entering Converse reveals the **composer** + the thread (the existing chat
  surface), grounded in the deck + the deterministic findings (the existing
  `buildChatMessages`, now talking to a capable model so it's actually useful).
- **Puter consent (one-time):** before the first Puter call, a clear dialog —
  *"To chat, your deck's text is sent to Puter's AI service to generate replies.
  It's free to you; powered by Puter."* — with Continue / Cancel. A small
  "powered by Puter" mark stays visible in Converse.
- **Fallback / selection:** desktop offers a tier switch (Puter ⇄ local
  lightweight). Mobile is Puter-only; if Puter is unavailable the composer shows
  a clear "couldn't reach the AI service" state and points back to Coach.
- The model still never owns correctness: Converse is for advice + rewrites; the
  deterministic findings remain the source of truth, surfaced in Coach.

## Puter integration shape

- Lazy-load `https://js.puter.com/v2/` on first Converse use (like the other CDN
  backends — never in the initial bundle).
- A `puterBackend` in the `ArchitectModel` ladder: `puter.ai.chat(messages, {
  model, stream: true })`, streamed into the thread.
- **"User pays"** model → zero inference cost + zero keys + no backend for us;
  works on static GitHub Pages.
- Behind the model-off switch + the consent gate; degrades to Coach when absent.

## Honest caveats (carry into the build)

- **Puter is a dependency** on a smaller platform whose free-AI economics are a
  subsidy that may change. We're betting on it; isolate it behind the adapter so
  swapping it (or adding BYO-key later) is a one-file change.
- **Privacy:** deck text routes through Puter → the model. The consent + mark are
  non-negotiable. Coach (the default) sends nothing anywhere.
- **Local quality is low** — hence opt-in + "lightweight" labeling, never the
  default.
- **Verification:** Coach is fully verifiable headless (it's deterministic). The
  Puter live path can't run in CI/sandbox (CDN + a live Puter session) — we wire
  it, mock-test the plumbing, and confirm live on-device, same honest stance as
  the rest of Phase 2.

## Build sequencing

1. **Coach console** — remove the composer from deterministic; add the action
   chips + result cards. Zero vendor risk, ships the genuinely-good part first,
   fully testable. *(Start here.)*
2. **Coach ⇄ Converse toggle** — the mode switch; composer only in Converse;
   gate Converse on an available generative tier.
3. **Puter backend + consent** — the real conversational tier.
4. **Polish** — the desktop local toggle, transitions, mobile pass.

## Open / decided

- **Decided:** Coach (no composer) vs Converse (composer, real model only);
  Converse desktop default = **Puter**, local = private/offline toggle; mobile =
  Coach + Puter only.
- **Open:** exact action-chip set + result-card layout (refine during the Coach
  build); the Puter model id(s) to offer; whether to add a BYO-key escape hatch
  later (deferred — Puter covers the "real chat" need without the key friction).
