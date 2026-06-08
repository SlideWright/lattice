# The Architect — Puter cloud tier + mobile/desktop engine split (2026-06-08)

> Status: **spec / design model. No code yet.** Extends the on-device model
> stack (`2026-06-07-drawing-board-architect.md` §5) and the Phase 2 build plan
> (`2026-06-08-drawing-board-phase-2-plan.md`) with a **cloud generation tier
> (Puter.js)** and a **platform-conditioned engine ladder** (mobile vs.
> desktop). Resolves the mobile question the existing corpus deferred to "Slice
> 10 — polish." Companion to the modes spec (`2026-06-08-architect-modes.md`).

## What's already decided (this doc does NOT relitigate)

The Drawing Board + the Architect are specced and Phase 1 is shipped. Holding
fast from the corpus:

- **Two modes** — *Drafting* (deterministic scaffold via the archetype picker)
  and *Freehand* (blank canvas + conversational assist). `architect-modes.md`.
- **Tooling-first** — the model **never owns knowledge or correctness**;
  deterministic Lattice tooling (lint-core, the catalog, the scaffolder)
  produces every finding, recommendation, and edit. The model only phrases,
  classifies intent, and frames retrieval. Proposal §4.
- **One adapter, `ArchitectModel`** — `complete(messages,{json})` + `embed(text)`;
  app code never branches on backend; the tier ladder lives behind it. §5.
- **Embeddings are ALWAYS Transformers.js `bge-small`** — pins the
  consistency-critical retrieval surface to one model for every user. §5.
- **Generation is a feature-detected ladder**, degrading to a **deterministic
  templated floor** — never a dead Architect. §5.

This doc adds **one new generation backend** and the **rules for which backend
runs where.** It changes nothing about tooling-first, the adapter, or the floor.

## The new decisions

### 1. Puter.js is a cloud generation tier behind `ArchitectModel`

Puter.js gives a static, keyless, browser-only app (exactly our GitHub Pages
deploy) client-side access to hosted LLMs with **no app-managed API keys and no
per-user cost to us** (Puter's "user-pays" model). That is the missing piece the
on-device ladder can't cover on hardware that can't run a local model.

It slots in as **one more `complete()` backend** — no re-architecture. The
adapter was designed for this ("app code never branches on backend"). The
tooling-first guarantee means a cloud model is exactly as safe as a local one:
it phrases findings and frames retrieval, it never emits the edit (the edit is
engine-made and validated).

**The one thing Puter changes is the on-device/private assumption.** Every
existing tier runs locally and offline; Puter is **network-required and sends
deck content to a third party.** That is not a reason to reject it — it is the
reason for decision #3 (disclosure). Retrieval/`embed()` stays local
(Transformers.js) wherever the device allows, so the **consistency-critical
surface is unaffected**; only *generation* phrasing moves to the cloud.

### 2. The ladder is platform-conditioned

The existing ladder assumed one device class. Split it:

| | Generation order | Why |
|---|---|---|
| **Mobile** | **Puter → deterministic floor** | Local generation doesn't work on phones — Prompt API is desktop-Chrome/Edge, WebLLM needs WebGPU + ~1GB. Puter is the *only* real generation path; the templated floor is the offline fallback. |
| **Desktop** | **Local-first → Puter (toggle) → floor** | The on-device ladder (Prompt API → Transformers.js → WebLLM) leads. Puter is an **explicit user toggle**, not auto. |

**Desktop toggle persists.** Default to local; the user can switch to Puter; the
choice is a **sticky setting** (the existing `settings` store), not per-session.
Auto-fall back to Puter only if the selected local tier fails at call time.

Mobile shows no toggle — there is no real local option to choose between, so
offering one would be a false choice.

### 3. Disclose the active engine (capability + privacy, one badge)

The user "should be made aware a local model is available on desktop," and —
because Puter is cloud — must also know when deck content is leaving the device.
One **active-engine badge** in the Architect panel does both jobs:

- *"Running locally · private · offline"* — a local tier is live (desktop).
- *"Powered by Puter · cloud"* — the cloud tier is live (mobile always; desktop
  when toggled or fallen back).

Plus a **one-time desktop first-run nudge**: "A local AI model is available —
refine decks privately, offline." The badge sets expectations (local = private/
offline, maybe smaller/slower; cloud = needs network, more capable) *and* is the
honest privacy signal. Disclosure is a UX requirement, like the export-fidelity
framing in proposal §6 — not a footnote.

### 4. Deterministic ≠ chat — the affordance-honesty rule

**Principle: the input UI must telegraph the system's actual degrees of
freedom.** A chat box promises "type anything, I'll understand" — only an LLM
can keep that promise. Drafting's decisions are all *bounded* (enumerable answer
sets), so its UI must *show the choices*, never invite free text. A chat
affordance over a deterministic engine is a broken contract → the user types
off-script → confusion. This is precisely why `architect-modes.md` already
replaced the chat-styled onboarding with the **searchable archetype picker**;
this doc names the underlying rule and extends it to mobile.

Drafting on mobile = a **guided builder**, not a simulated chat:

- archetype picker → the *who / one-outcome* tailoring as **bounded controls**
  (chips, toggles, steppers, reorderable section chips); a **labeled field** only
  where a real value is needed (company name, a metric) — labeled and
  single-purpose is honest; an open "ask me anything" textarea is not.
- the feedback loop is the **filmstrip preview**, which updates as you tap — the
  *visual* deck carries the dialogue, not a fake transcript. On-brand: Lattice is
  a visual system; let the preview do the talking.

Full-width chips, bottom-sheet pickers, big tap targets, sticky "Build" CTA,
progress dots — one bounded decision per screen.

### 5. Transition: linear handoff, structure locks on chat (v1)

The two modes are **two stages of one pipeline**, not competing front doors:
Drafting builds the *scaffold* (bounded, cheap, reliable, no model); Freehand
*polishes* it (unbounded, conversational). So the conversation never starts cold
— it opens **with the finished deck already in context**, which is also a far
safer LLM task than generate-from-scratch (it grounds the model on a valid deck).

- **Forward (Drafting → Freehand): seamless.** One "Refine in chat" action; the
  deck carries as context. Encouraged.
- **Backward (changing a Drafting choice *after* chatting): locked in v1.** Once
  freehand editing begins, the structural choices freeze; the escape hatch is
  "Start over." Re-deriving the whole scaffold from changed archetype/who/outcome
  inputs would clobber hand edits, and reconciling arbitrary freehand deltas onto
  a new scaffold is the hard problem we are explicitly deferring.

**Reconciliation with `architect-modes.md`** ("Switchable anytime … the mode is
a posture, not a lock"): those stay compatible — you can still *switch posture*
(invoke Drafting to scaffold a new section, drop to Freehand). What v1 locks is
narrower: **re-running the deterministic scaffold from changed inputs** after
hand edits exist. The richer future is the layered model (Drafting choices = a
*recipe*; freehand edits = *overrides* re-applied where they still anchor, with
conflicts surfaced to keep/discard) — that lands with, and motivates, the
unified-canvas evolution, not v1.

## The matrix (one place)

| | Drafting (deterministic) | Freehand (conversational) |
|---|---|---|
| **Mobile** | Guided builder: archetype picker → bounded controls → filmstrip preview | Chat via **Puter** → deterministic floor |
| **Desktop** | Same guided builder | Chat via **local-first** (Prompt API → Transformers.js → WebLLM) → **Puter (persisted toggle)** → floor, with active-engine badge |

Same Drafting builder both platforms. Same chat *UI* both platforms — only the
generation backend differs, absorbed by the `ArchitectModel` adapter.

## Open questions

- **Mobile embeddings & the consistency split.** §5 guarantees *retrieval is
  identical for every user* by always running `bge-small` (Transformers.js, ~50MB
  WASM). Can a phone run it? If not, mobile retrieval degrades to the Phase-1
  **keyword floor** (always works) — which *breaks* the "identical retrieval"
  guarantee for mobile. Decide: ship WASM embeddings on mobile where feasible,
  accept keyword-retrieval degradation otherwise, or explore a Puter-side
  retrieval path. Lean: WASM-if-feasible, keyword floor otherwise, badge it.
- **Puter consent & privacy.** Confirm Puter's current auth/user-pays/consent
  flow and surface a clear "this sends your deck to the cloud" consent the first
  time the cloud tier engages (mandatory on mobile, on toggle for desktop).
- **Puter as a third-party dependency.** Availability, rate limits, and model
  choice are outside our control — the deterministic floor must remain a true
  fallback when Puter is unreachable or throttled (it already is, by design).
- **Where Puter sits in the desktop ladder when local is present but weak** — is
  it strictly user-toggled, or may it auto-engage for a task the local tier
  declines? Lean: user-toggled only; no silent cloud egress on desktop.
- **Naming in UI** — keep "deterministic/freehand" internal; surface
  *Drafting / Freehand* (already decided) and *Local / Cloud (Puter)* for the
  engine.

## References

- Proposal (the Architect, on-device stack): `2026-06-07-drawing-board-architect.md`
  (§4 tooling-first, §5 the tier ladder + the consistency split, §6 export honesty).
- Phase 2 build plan (the `ArchitectModel` adapter, slices 6–10):
  `2026-06-08-drawing-board-phase-2-plan.md` — Puter is a new backend alongside
  Slice 7's Prompt API; mobile resolves Slice 10's deferred mobile pass.
- Modes spec (Drafting/Freehand, the archetype picker, "posture not a lock"):
  `2026-06-08-architect-modes.md`.
- Coach features (scorecard/notes/practice/refine, the deterministic floor):
  `2026-06-08-architect-coach-features.md`.
