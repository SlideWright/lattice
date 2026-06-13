# The Architect as a coach — scorecard, notes, practice, refine (2026-06-08)

> Status: **spec / design model.** No code yet. Extends the Architect from a deck
> *builder* into a full **presentation coach** across the lifecycle. Companion to
> the modes spec (`2026-06-08-architect-modes.md`) and the Phase 2 plan
> (`2026-06-08-drawing-board-phase-2-plan.md`). Build after the modes land.

## The shape: a four-stage coach

The Architect already **builds** (Drafting / Freehand) and **reviews** (live lint
findings). These features extend it across the full presentation lifecycle:

```
  Build  →  Review  →  Annotate  →  Rehearse
  (modes)  (scorecard,  (reader +    (practice
            read-aloud)  presenter    mode +
                         notes)       timing)
```

The guiding constraint from the proposal holds: **the deterministic floor stays
useful with zero model.** Three of the five features below have a real Phase-1,
no-model core (read-aloud, scorecard, practice timing); notes + refine are the
Phase-2 model payoffs.

## 1. Read-aloud assessment — Phase 1 (no model)

The browser's built-in **Web Speech API** (`window.speechSynthesis`) does TTS
client-side, free, every major browser, no dependency. The Architect can read its
scorecard + findings aloud ("Your deck scores B+. Structure: strong. Clarity:
three slides use label titles instead of takeaways…"). Accessibility win.

- **Notes:** voice quality is OS-dependent (system voices); offer a voice picker
  + rate control. A nicer neural TTS is a later upgrade, not required.
- A small play/stop control on the scorecard + per-finding "read this".

## 2. Scorecard — Phase 1 (deterministic), richer in Phase 2

Tally the existing signals into category scores — no model needed for the core:

| Category | Built from |
|---|---|
| **Structure** | spine completeness vs. the archetype (Drafting) / presence of an opening, an ask/`decision`, a close |
| **Clarity** | label-vs-takeaway titles, wall-of-text, one-idea-per-slide (Appendix B `[det]`) |
| **Data hygiene** | chart-with-no-"so what", data-dump (Appendix B) |
| **Pacing / Length** | slide count vs. stated talk length (Kawasaki 10/20/30) |
| **Contract** | the deterministic `lint-core` authoring findings (footguns) |

- **Output:** an overall grade (letter or /100) + a per-category bar + each
  category's specific findings (each with Reveal / Apply-fix where applicable).
- **Schema** (the deterministic engine returns this; the model later annotates):
  ```
  { overall: 'B+'|87, categories: [
      { key:'structure', score:0..100, findings:[...] }, … ],
    summary: '…' }   // summary is templated [det] / model-written [Phase 2]
  ```
- **Phase 2:** the model adds qualitative judgement ("the ask is buried / weak,"
  "the narrative loses its through-line at slide 6") the deterministic checks
  can't see. Scores stay grounded; prose gets sharper.

## 3. Reader + presenter notes — Phase 2 (model)

Content generation, so model-powered — but the plumbing designs now:

- **Presenter (speaker) notes.** Marp treats per-slide HTML comments as speaker
  notes; the model generates them from the slide + the deck's stated
  audience/outcome. On **PPTX export** they go into the slide notes field
  (`PptxGenJS` `slide.addNotes`); a **presenter-view / handout PDF** can render
  them beside each slide.
- **Reader notes.** A prose "leave-behind" layer for someone reading the deck
  *without* a presenter (the deck alone is terse). Generated per slide, exported
  as a notes column / appendix.
- **UX:** a "Generate notes" action (per slide or whole deck), editable after;
  notes persist in the IndexedDB deck record (a `notes` field per slide).

## 4. Refine actions — Phase 2 (model)

A "Help me refine" menu on a selection or a slide's prose (per the Gmail-style
reference, minus "Write a reply"):

| Action | Backed by |
|---|---|
| **Polish** | Rewriter (tone: as-is, tightened) |
| **Formalize** | Rewriter (tone: more-formal) |
| **Elaborate** | Rewriter (length: longer) |
| **Shorten** | Rewriter (length: shorter) / Summarizer |

- Maps to the **Chrome/Edge built-in Rewriter + Summarizer APIs** first, with the
  WebLLM / Transformers.js tiers as fallback (same ladder as the chat — see the
  Phase 2 plan). All edits go back through the editor as CodeMirror transactions,
  so they're undoable and re-linted — the model proposes, the engine applies.
- Surfaced inline on a text selection and in the Architect panel.

## 5. Practice mode + timing — ✅ shipped (deterministic core + AI coaching)

> **Status: built.** `docs/src/playground/drawing-board-practice.js` (the
> full-screen stage) + `docs/src/playground/drawing-board-rehearsal.js` (the
> planner, pure + Node-tested in `test/unit/playground/drawing-board-rehearsal.test.js`).
> The deterministic floor and the model-on path both ship; the model path is
> wired through the same `ArchitectModel` ladder as the rest of the Architect.
>
> **The plan.** The planner turns the deck + a talk length into a per-slide plan:
> a `role` (open / section / data / visual / quote / table / decision / close /
> body), a density × role **dwell** target, a one-line **why**, and timed
> **coaching beats** (`pause` / `eye` — look up for eye contact / `breathe` /
> `transition` / `emphasis`), each with an `at` fraction of the slide and a
> `hold`. The floor is instant + offline; when a real generation backend is live
> the model **re-tunes** targets, sharpens the *why*, and places better beats —
> always over the deterministic plan as `fallback` (it never owns correctness),
> validated + re-normalised before display. Refined plans are **memoised by
> (deck content + minutes)**, so an unchanged deck never re-bills the cloud and
> an edit (or a length change) re-assesses.
>
> **The surface.** A full overlay (Esc to exit). Render parity with the live
> preview via the shared `frame-css` slide-box contract (one slide, flex-centred,
> uniform scale) — fixing the earlier bespoke renderer that rode slides high. The
> coaching is an **unassuming gradient scrim** over the lower stage (ambient *why*
> line + timed beats that fade in/out), not a top-bar cue — so the chrome no
> longer reflows. A no-zoom viewport + `touch-action` kill the iOS double-tap
> zoom. The start screen suggests a length from deck density.
>
> **Still Phase 2:** spoken-rehearsal critique (speech-to-text). The text below
> is the original design model, kept for provenance.

A rehearsal / presenter surface — mostly deterministic:

- **Per-slide target dwell** from content density (word count + component type).
- **Pacing timer.** Ask "how long is your talk?" → distribute the target across
  slides by density → a live **ahead/behind** indicator while you rehearse, plus a
  total elapsed/remaining clock.
- **"When to pause — let it land."** A heuristic pause cue keyed to the slide's
  component / magnitude:

  | Cue | Trigger (component / signal) |
  |---|---|
  | *Let the number land* | `big-number`; `kpi`/`stats` with a large value or delta |
  | *Hold for the visual* | `featured` hero, `image`, a full-bleed `diagram`/chart |
  | *Let the line breathe* | `quote`; a key-insight / single-statement `content` slide |
  | *Give them the table* | dense `list-tabular` / `compare-table` / `matrix-2x2` |
  | *Transition beat* | `divider` / section change |

- **Phase 2:** the model layers nuanced coaching on top of the timer ("you're
  rushing the ask," "expand the methodology," "this transition is abrupt") and can
  critique a spoken rehearsal if speech-to-text is added.
- **Surface:** a distinct full-deck practice view (like a presenter view), separate
  from the editor; reachable from the Drawing Board.

## Phase map (summary)

| Feature | Phase 1 (no model) | Phase 2 (model) |
|---|---|---|
| Read-aloud | ✅ full | better voices (optional) |
| Scorecard | ✅ scores + findings | qualitative summary |
| Reader/presenter notes | plumbing only | ✅ generation |
| Refine actions | — | ✅ Rewriter/Summarizer |
| Practice + timing | ✅ timer + pause cues | nuanced coaching |

## Build sequencing (after the modes ship)

1. **Scorecard** (deterministic) — reuses the lint findings + Appendix B `[det]`
   heuristics; highest value-to-effort, no model.
2. **Read-aloud** — small, layers onto the scorecard.
3. **Practice mode + timing** (deterministic core) — a new view; the pause-cue
   table is authored data.
4. **(Phase 2) Refine actions** — once the model ladder + Rewriter tier exist.
5. **(Phase 2) Notes generation** — once generation works; export plumbing
   (PPTX notes, handout PDF) can land earlier.

All `docs/`-only except any export-plumbing for notes (PPTX `addNotes`, handout
layout) which touches the export module. No engine changes.

## Open / decided

- **Read-aloud, scorecard, practice — decided as Phase-1 deterministic.**
- **Refine + notes — Phase 2 (model), per the ladder.**
- **Open:** does the scorecard grade letter or /100? (lean: /100 with a letter
  band, so the read-aloud has a crisp number.)
- **Open:** practice mode as a route, an overlay, or a panel tab? (lean: full
  overlay over the preview, Esc to exit.)

## References

- Modes spec: `2026-06-08-architect-modes.md` (Drafting/Freehand; Appendix B
  review heuristics feed the scorecard).
- Phase 2 plan: `2026-06-08-drawing-board-phase-2-plan.md` (the model ladder that
  powers refine + notes + qualitative scoring).
- Proposal: `2026-06-07-drawing-board-architect.md` (tooling-first; deterministic
  floor).
