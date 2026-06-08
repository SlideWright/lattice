# The Architect — Puter cloud default + desktop local opt-in (2026-06-08)

> Status: **spec / design model. No code yet.** Extends the on-device model
> stack (`2026-06-07-drawing-board-architect.md` §5) and the Phase 2 build plan
> (`2026-06-08-drawing-board-phase-2-plan.md`) with a **cloud generation tier
> (Puter.js)** as the **uniform default on every platform**, with the on-device
> ladder offered as a **desktop opt-in** for capable machines. Resolves the
> mobile question the existing corpus deferred to "Slice 10 — polish."
> Companion to the modes spec (`2026-06-08-architect-modes.md`).

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

### 2. Puter is the uniform default; local is a desktop opt-in

The existing ladder assumed one device class and led with on-device tiers. Invert
it: **Puter is the default generation backend on every platform.** This is the
deliberate call for a *uniform* experience — every user, mobile or desktop, gets
the same capable Architect out of the box, with no device-capability lottery and
no first-run model download. The on-device ladder becomes an **opt-in
enhancement**, not the default path.

| | Generation | Why |
|---|---|---|
| **Mobile** | **Puter → deterministic floor** | No local option exists — Prompt API is desktop-Chrome/Edge, WebLLM needs WebGPU + ~1GB. Puter is the only real generation path; the templated floor is the offline fallback. |
| **Desktop** | **Puter (default) → local (opt-in) → floor** | Same uniform default as mobile. Capable machines can **opt into the on-device ladder** (Prompt API → Transformers.js → WebLLM) for private, offline refinement; if a selected local tier fails at call time, it falls back to Puter. |

**Why default-cloud, not default-local:** uniformity and zero setup beat
maximal privacy-by-default *as the baseline*. The on-device tiers are real
value — privacy, offline, no per-call cloud round-trip — but they are
**hardware-gated** (Prompt API availability is flaky even on Chrome/Edge; WebLLM
is a ~1GB WebGPU download). Making them the default means the *baseline*
experience varies wildly by machine. Defaulting to Puter makes the floor
uniform; offering local makes the ceiling higher for those who can reach it.

**The local opt-in persists.** Default is Puter; a desktop user can switch to
local; that choice is a **sticky setting** (the existing `settings` store), not
per-session. Mobile shows no toggle — there is no real local option to choose
between, so offering one would be a false choice.

### 3. Disclose the active engine (capability + privacy, one badge)

Because the default is cloud, the user must know that deck content is leaving the
device — *and* desktop users should be made aware that a private, offline local
option is available to opt into. One **active-engine badge** in the Architect
panel does both jobs:

- *"Powered by Puter · cloud"* — the default; the cloud tier is live (mobile
  always; desktop unless local is opted into).
- *"Running locally · private · offline"* — a local tier is live (desktop, after
  opt-in).

Plus a **one-time desktop nudge** once the user has a working baseline: "Prefer
to keep decks on-device? A local AI model is available — private, offline."
Surface the opt-in without making it a setup gate. The badge sets expectations
(cloud default = needs network, capable, uniform; local = private/offline, maybe
smaller/slower) *and* is the honest privacy signal. Disclosure is a UX
requirement, like the export-fidelity framing in proposal §6 — not a footnote.

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
| **Desktop** | Same guided builder | Chat via **Puter (default)**; **local opt-in** (Prompt API → Transformers.js → WebLLM, persisted) → falls back to Puter → floor, with active-engine badge |

Same Drafting builder both platforms. Same chat *UI* and **same default
backend (Puter)** both platforms — the only divergence is the desktop local
opt-in, absorbed by the `ArchitectModel` adapter.

## Open questions

- **Embeddings & the consistency split.** Default-cloud *improves* uniformity —
  generation is now identical for everyone by default, so the only residual
  device-dependence is **retrieval**. §5 pins it by always running `bge-small`
  (Transformers.js, ~50MB WASM). Desktop runs it fine; can a phone? If not,
  mobile retrieval degrades to the Phase-1 **keyword floor** (always works).
  Decide: ship WASM embeddings on mobile where feasible, accept keyword
  degradation otherwise, or explore a Puter-side retrieval path. Lean:
  WASM-if-feasible, keyword floor otherwise, badge it.
- **Puter consent & privacy.** Because cloud is the *default* (not an opt-in),
  the consent moment matters more: confirm Puter's current auth/user-pays/consent
  flow and surface a clear "this sends your deck to the cloud" consent the first
  time the Architect generates — without turning it into a setup wall that
  undercuts the zero-setup win. The desktop **local opt-in** is the privacy
  escape for users who decline the cloud.
- **Puter as a third-party dependency.** Availability, rate limits, and model
  choice are outside our control, and it is now the *default* path — so the
  deterministic floor must remain a true fallback when Puter is unreachable or
  throttled (it already is, by design), and desktop's local opt-in is a second
  line of defense.
- **Default model behind Puter.** Puter exposes several hosted models; pin a
  sensible default (and confirm it satisfies the "prompts target the weakest
  tier" discipline so a later swap can't regress findings) — surface a model
  choice only as an advanced setting, not in the default path.
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
