# The Architect — Drafting & Freehand modes (2026-06-08)

> Status: **spec / design model.** No code yet. Specs a redesign of the Drawing
> Board's onboarding (the deterministic Architect shipped in Phase 1) into two
> explicit modes. Scheduled to build **after** the Phase-1-fixes land. Companion
> to the proposal (`2026-06-07-drawing-board-architect.md`, §4 + Appendix A) and
> the Phase 2 plan (`2026-06-08-drawing-board-phase-2-plan.md`).

## Problem

The shipped onboarding is a single, pre-canned flow: three questions, four pills
(Board update / Investor pitch / Strategy / Product review) → a board-deck-shaped
scaffold. Two faults:

1. **Too narrow.** The pills cover a handful of corporate deck types. They don't
   help — and actively mislead — for a white paper, an architecture document, a
   scientific talk, or anything content-led and domain-specific. "Board update →
   KPI → roadmap → close" is wrong for those.
2. **Always-on guidance.** It assumes *every* author wants a template. Experts and
   long-form authors find imposed structure limiting.

The Architect needs to know when to **lead** and when to **get out of the way**.

## The model: two modes

The axis is *how much the Architect imposes structure.* At the empty state the
Architect offers two doors:

- **Drafting** — *I lay out the structure; you fill it in.* The Architect leads:
  pick a presentation archetype, it scaffolds the spine and coaches. For common,
  well-understood deck shapes — the everyday corporate / academic / governmental
  presentation.
- **Freehand** — *Your blank canvas; I review and help on request.* The Architect
  assists, never imposes: a blank deck (or paste your own), your structure, your
  domain. Live review still runs (the authoring-contract linting works on *any*
  deck); conversational help arrives with the model (Phase 2). For specialized,
  expert, or long-form work — white papers, architecture docs, scientific talks.

Same Architect, two postures. Live review + (Phase 2) chat work in **both**; the
only difference is whether it hands you a structure up front.

**Naming.** *Drafting / Freehand* — the two literal ways you work a drawing board:
ruled, guided **drafting** vs. **freehand**. Both are native drawing-board terms,
so the pair is on-metaphor and self-contrasting (scored 45/50 vs. the generic
"Guided"). The one-line subtexts above disambiguate "Drafting" from "a rough
draft" instantly.

## Drafting — the archetype picker

Replace the four pills with a **searchable, grouped dropdown** of archetypes —
comprehensive but curated, scoped to the everyday settings. **Reuse the
playground's fuse.js grouped-popover picker** (`docs/src/playground/
template-picker.js` + `docs/src/lib/families.mjs`) so search + group-by are
consistent with the component picker and there's no second taxonomy.

Taxonomy (grouped by setting):

- **Corporate** — board update, investor pitch, sales deck, quarterly business
  review, strategy proposal, product launch, project kickoff, project status,
  post-mortem / retro, all-hands, OKR / goals review, budget request, roadmap
  review, customer case study, training / onboarding.
- **Academic** — lecture, conference talk, thesis / dissertation defense,
  research findings, journal club, grant proposal, seminar, poster walkthrough,
  literature review, course overview.
- **Government / Public** — policy briefing, budget proposal, public hearing /
  testimony, agency / program update, inter-agency briefing, RFP / proposal
  response, town hall, compliance / audit report.

Each archetype carries a **recommended spine** (an ordered component sequence) and
the *who / one-outcome* questions for tailoring. The spine reuses the existing
catalog + the `createOnboarding` scaffolder; the archetype → spine map is **data**
(an authored table), not model output. Examples:

- *Board update* → title · kpi · roadmap · decision · matrix-2x2 (risks) · closing
- *Conference talk* → title · agenda · key-insight · evidence/chart · summary
- *Policy briefing* → title · context · options (compare) · recommendation · closing

Searchable = comprehensive without overwhelming; **if it's not in the list, that's
the signal to go Freehand.** We deliberately do **not** template specialized or
long-form work.

## Freehand

- **Phase 1 (now-buildable, no model):** opens a blank deck (or keeps pasted
  content); the **live review** (lint-core findings + Reveal / Apply-fix) runs;
  no imposed onboarding. This already exists implicitly as "just start writing" —
  Freehand makes it a first-class, named door.
- **Phase 2 (model):** the **conversational assist** — "suggest a layout for this
  data," "structure my methodology section," "tighten this prose" — powered by the
  model ladder (see the Phase 2 plan). **This is where the model earns its keep**;
  Drafting needs no model, so Freehand + the model is the general-purpose
  assistant for any content.

## Empty-state UX

Two clear doors with the one-line subtexts:

```
  ┌─────────────────────────┐   ┌─────────────────────────┐
  │  Drafting               │   │  Freehand               │
  │  I lay out the          │   │  Your blank canvas;     │
  │  structure; you fill    │   │  I review and help      │
  │  it in.                 │   │  on request.            │
  └─────────────────────────┘   └─────────────────────────┘
```

- **Drafting** → opens the archetype picker → who/outcome → scaffold on approval.
- **Freehand** → opens a blank deck immediately; live review on.
- **Switchable anytime.** Freehand authors can invoke Drafting later to scaffold a
  single section; Drafting authors can abandon the scaffold and continue Freehand.
  The mode is a posture, not a lock.

## Phase boundary

- **Phase 1** (deterministic, no model): the two-door empty state, the searchable
  grouped archetype picker → scaffold (Drafting), the blank + live-review path
  (Freehand). All buildable now.
- **Phase 2**: Freehand's conversational assist (the model ladder).

## Build plan (the Phase-1 part)

1. **Two-door empty state** (Drafting / Freehand) replacing the current "Plan a
   new deck with me" launcher in `drawing-board-architect.js` (`createOnboarding`).
2. **Searchable grouped archetype picker** — reuse the fuse.js picker; author the
   archetype → spine map (data shipped in the page island, like the catalog).
3. **Wire Drafting:** archetype + who/outcome → scaffold (extend the existing
   `assemble`/scaffolder to consume an archetype spine instead of the keyword
   retrieval).
4. **Freehand:** blank deck + confirm live review runs (it already does); dock a
   "switch to Drafting" affordance.
5. **Mode persistence** (remember last mode per the existing settings store).

No engine changes; lives entirely in `docs/`. The conversational half of Freehand
is Phase 2.

## Open / decided

- **Names — decided:** Drafting / Freehand (subtexts above).
- **Picker pattern — decided:** reuse the fuse.js grouped popover.
- **Archetype taxonomy — proposed above;** refine the per-archetype spines during
  the build (they're authored data, easy to iterate).
- **Open:** does Drafting also capture *who / outcome* (yes, lightly, post-pick),
  or just the archetype? Lean: archetype first, then one optional tailoring step.

## References

- Proposal: `2026-06-07-drawing-board-architect.md` (§4 the Architect, Appendix A
  onboarding — this supersedes Appendix A's single-flow onboarding).
- Phase 2 plan: `2026-06-08-drawing-board-phase-2-plan.md` (Freehand's model assist).
