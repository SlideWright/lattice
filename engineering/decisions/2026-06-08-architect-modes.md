---
status: proposed
summary: Spec redesigning Architect onboarding into Drafting and Freehand modes — when it leads with structure versus gets out of the way
---

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
  well-understood deck shapes — the everyday team, corporate, academic,
  governmental, or nonprofit presentation.
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

Taxonomy (grouped by setting). The cross-cutting everyday archetypes live in
**General / Team** so they aren't duplicated across every sector:

- **General / Team** — status update, project kickoff, project status,
  retrospective / post-mortem, all-hands, team meeting, training / onboarding,
  workshop, decision memo, proposal, roadmap review.
- **Corporate** — board update, investor pitch, sales deck, quarterly business
  review, strategy proposal, product launch, customer case study, budget request,
  OKR / goals review.
- **Academic** — lecture, conference talk, thesis / dissertation defense,
  research findings, journal club, grant proposal, seminar, poster walkthrough,
  literature review, course overview.
- **Government / Public** — policy briefing, budget proposal, public hearing /
  testimony, agency / program update, inter-agency briefing, RFP / proposal
  response, town hall, compliance / audit report.
- **Nonprofit / Mission-driven** — donor pitch, fundraising / capital campaign,
  impact / annual report, grant report (to funders), nonprofit board meeting,
  program overview, volunteer onboarding.

(Specialized/convention-rich sectors — Healthcare/Clinical, Legal, Consulting —
were considered but held back: their common decks overlap the groups above and
the rest lean specialized → Freehand. Add later if there's demand.)

Each archetype carries a **recommended spine** (an ordered sequence of *real*
Lattice components) and the *who / one-outcome* questions for tailoring. The spine
reuses the existing catalog + the `createOnboarding` scaffolder; the archetype →
spine map is **data** (an authored table), not model output.

**Each spine is grounded in an established, public presentation framework** — not
invented — so the templates are credible and we have a rationale to point to. The
full table is **Appendix A**; the frameworks it draws on:

- **Minto — *Pyramid Principle*** (answer-first; SCQA: Situation·Complication·
  Question·Answer) → executive / consulting / recommendation decks.
- **Duarte — *Resonate* / *slide:ology*** (the "sparkline": *what is* ↔ *what
  could be* → call to action) → persuasive, fundraising, all-hands, talks.
- **Knaflic — *Storytelling with Data*** (declarative takeaway titles, one
  message per chart) → every metrics / KPI / findings slide.
- **Sequoia pitch template + Kawasaki 10/20/30** → investor pitch / fundraising.
- **Andy Raskin — strategic narrative** (name the shift → stakes → promised
  land → proof) → sales, product launch.
- **BLUF** (Bottom Line Up Front) → government / public briefings.
- **IMRaD** + **CARS** → academic findings / defense / lecture.
- **NIH "Specific Aims"** → grant proposals.

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
- Coach features: `2026-06-08-architect-coach-features.md` (scorecard, read-aloud,
  reader/presenter notes, refine actions, practice mode + timing — the Architect
  beyond build/review). Appendix B's review heuristics feed the scorecard.

## Appendix A — Archetype spines (framework-grounded)

Each spine is `title → … → closing` using **real Lattice components** (the 48 in
the current catalog), with the framework it follows. These are the *authored data*
the Drafting scaffolder consumes; iterate the per-archetype sequences during the
build. (`key-insight` etc. are base modifiers, applied to a `content` slide, not
components.)

### General / Team
- **Status update** — title · kpi · roadmap · decision · closing — *BLUF / answer-first (Minto)*
- **Project kickoff** — title · content · roadmap · actors · decision · closing — *charter / answer-first*
- **Project status** — title · kpi · roadmap · matrix-2x2 · closing — *Knaflic + risk grid*
- **Retrospective / post-mortem** — title · timeline-list · matrix-2x2 · list-steps · closing — *blameless retro (what happened → went well/poorly → actions)*
- **All-hands** — title · big-number · kpi · roadmap · quote · closing — *Duarte sparkline*
- **Team meeting** — title · agenda · content · decision · closing — *decisions + owners*
- **Training / onboarding** — title · agenda · list-steps · checklist · closing — *tell-show-do*
- **Workshop** — title · agenda · content · cards-grid · list-steps · closing — *frame → activities → next steps*
- **Decision memo** — title · content · compare-table · matrix-2x2 · decision · closing — *Minto answer-first*
- **Proposal** — title · content · list-criteria · kpi · decision · closing — *ask up front, justify, ask again*
- **Roadmap review** — title · roadmap · kpi · matrix-2x2 · closing — *progress vs plan*

### Corporate
- **Board update** — title · kpi · roadmap · decision · matrix-2x2 · closing — *Minto SCQA + BLUF*
- **Investor pitch** — title · content · content · big-number · kpi · roadmap · actors · decision · closing — *Sequoia / Kawasaki*
- **Sales deck** — title · content · content · verdict-grid · kpi · decision · closing — *Raskin strategic narrative*
- **Quarterly business review** — title · kpi · roadmap · matrix-2x2 · decision · closing — *Knaflic*
- **Strategy proposal** — title · content · verdict-grid · matrix-2x2 · decision · roadmap · closing — *Minto (situation → options → recommendation)*
- **Product launch** — title · content · featured · cards-grid · kpi · roadmap · closing — *Raskin*
- **Customer case study** — title · content · split-compare · kpi · quote · closing — *challenge → before/after → results → testimonial*
- **Budget request** — title · big-number · content · list-tabular · kpi · decision · closing — *the ask, justified by ROI*
- **OKR / goals review** — title · kpi · progress · roadmap · closing — *objectives → key results → next*

### Academic
- **Lecture** — title · agenda · content · diagram · list-criteria · closing — *CARS framing*
- **Conference talk** — title · content · content · radar · content · closing — *IMRaD-lite + Duarte*
- **Thesis / dissertation defense** — title · content · content · stats · content · roadmap · closing — *IMRaD (question → methods → results → discussion → future work)*
- **Research findings** — title · content · content · stats · content · closing — *IMRaD*
- **Journal club** — title · citation-card · content · stats · matrix-2x2 · closing — *paper → methods → findings → strengths/limits*
- **Grant proposal** — title · content · list-criteria · roadmap · kpi · closing — *NIH Specific Aims (significance → aims → approach → outcomes)*
- **Seminar** — title · agenda · content · diagram · list-steps · closing
- **Poster walkthrough** — title · content · diagram · stats · content · closing
- **Literature review** — title · content · timeline-list · compare-table · content · closing — *field evolution → key studies → synthesis/gaps*
- **Course overview** — title · agenda · roadmap · list-criteria · checklist · closing — *syllabus → schedule → objectives → logistics*

### Government / Public
- **Policy briefing** — title · content · content · verdict-grid · matrix-2x2 · decision · closing — *BLUF + Minto*
- **Budget proposal** — title · big-number · list-tabular · kpi · matrix-2x2 · decision · closing
- **Public hearing / testimony** — title · content · list-criteria · stats · quote · closing — *BLUF, position-first*
- **Agency / program update** — title · kpi · roadmap · matrix-2x2 · closing
- **Inter-agency briefing** — title · content · actors · roadmap · decision · closing — *BLUF + stakeholders*
- **RFP / proposal response** — title · content · list-criteria · gantt · actors · kpi · closing — *understanding → approach → timeline → team → value*
- **Town hall** — title · big-number · content · kpi · content · closing
- **Compliance / audit report** — title · content · obligation-matrix · matrix-2x2 · list-steps · closing — *scope → findings vs requirements → risk → remediation*

### Nonprofit / Mission-driven
- **Donor pitch** — title · content · quote · big-number · roadmap · decision · closing — *Duarte sparkline, story-led*
- **Fundraising / capital campaign** — title · content · big-number · progress · cards-grid · decision · closing — *vision → goal → progress → levels → ask*
- **Impact / annual report** — title · kpi · journey · quote · stats · roadmap · closing — *impact → year in review → story → financials → next*
- **Grant report (to funders)** — title · content · kpi · list-criteria · stats · closing — *goals vs delivered → outcomes → milestones → financials*
- **Nonprofit board meeting** — title · kpi · stats · roadmap · decision · closing
- **Program overview** — title · content · diagram · kpi · actors · closing — *theory of change → outcomes → who we serve*
- **Volunteer onboarding** — title · agenda · content · list-steps · checklist · closing

## Appendix B — Review heuristics (the trap-catcher)

The Architect's **review** side, beyond the deterministic authoring-footgun lint
(`lint-core`), can flag higher-level *presentation* traps drawn from the canon
(*Presentation Pitfalls*, *Presentation Zen*, Minto, Knaflic). Marked **[det]** =
deterministically checkable now; **[model]** = needs the Phase-2 model.

- **Label titles, not takeaways** — a slide titled "Results" / "Q3 Numbers"
  instead of the *message* ("Revenue grew 18%, led by APAC"). *Knaflic.* **[det]**
  (heading is a noun phrase with no verb / no claim) → suggest a declarative title.
- **Buried lede / no answer up front** — the recommendation or ask appears only at
  the end. *Minto / BLUF.* **[model]** (or **[det]** for archetypes whose spine
  expects an early `decision`/`content` answer).
- **No clear ask** — a decision/pitch/proposal deck with no `decision` slide and no
  imperative "we recommend / we ask". **[det]**
- **Wall of text / more than one idea per slide** — body over ~N words, or many
  top-level bullets. *Reynolds (Zen) / Pitfalls.* **[det]**
- **Agenda-as-content** — an agenda/section list used as the substance, no
  through-line. *Duarte.* **[model]**
- **Chart with no "so what"** — a chart slide whose title/caption states no
  takeaway. *Knaflic.* **[det]** (chart component + non-declarative heading)
- **Data dump** — a table/`list-tabular` with no highlighted signal. *Knaflic.* **[model]**
- **Length vs. time** — far more slides than the stated duration. *Kawasaki
  10/20/30.* **[det]** (slide count vs. an optional "how long" answer)

The **[det]** heuristics can ship in Phase 1 as additional Architect findings
(same surface as the lint findings); the **[model]** ones land with Freehand's
Phase-2 assistant. These are *advisory* (warnings/suggestions), never blocking.
