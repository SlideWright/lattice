# The narrative step model — "assemble the slide as you go"

**Status:** direction decided 2026-06-16 (the static-PDF policy is settled; the
field-level spec is staged). This is the **organizing idea** that sits *above* the
composition contract: it makes the **narrative step**, not the slide, the unit of
navigation. A slide is the accumulated state of the steps walked so far — it
**assembles** as the story advances. This note owns the **step/narrative layer**;
it subsumes the "motion" appendix planned for
`2026-06-16-form-manifest-medium-independent-contract.md` (#377) and sits on top of
it. `design/forms.md` owns the composition **model**; #377 owns the **contract**;
this owns the **narrative spine**.

---

## 1. The vision

Today a deck is a static, slide-by-slide document (markdown → PDF/HTML). The intent
is to let an audience **walk the story element by element** — the slide is *built*
in front of them, one beat at a time, rather than appearing whole. Two interaction
drivers, one underlying model:

- **presenter-advance** — click/arrow in Present mode (#373) steps the build forward.
- **scroll-driven** — on the web, the slide assembles as the reader scrolls
  ("scrollytelling").

## 2. The model

- **The step is the navigation atom.** The deck flattens into an ordered **step
  timeline**; slide boundaries are a *subset* of step boundaries. "Next" advances a
  step, which is usually an element reveal/transform, and only sometimes a slide change.
- **State is accumulative, not replace-on-advance.** The renderer holds a retained,
  growing scene; each step applies a *delta* (reveal / move / transform). This is the
  deep difference from a slide *transition* (which is A→B replacement): a build is
  Σ(steps 0..N). The static slide is the final accumulation.
- **Steppable units are DERIVED from structure, not hand-authored.** Components
  already emit structured DOM (a list → `.card`s, a chart → series, a diagram →
  nodes, a table → rows). The step engine treats those as revealable units, so
  progressive disclosure is a *generated behavior over the existing model*, not a
  per-element animation chore. This is the dividend of the component + Cell/Tile
  structure already in place.
- **Document order IS the default step order.** The author wrote the narrative in
  order in markdown; it reveals in that order. Lattice-native, "declare intent not
  mechanics." Authoring stays markdown-simple; explicit control is *opt-in only*
  (group "reveal together", hold/pause, reorder, or exclude an element from the
  build).
- **The composition contract choreographs it.** A Cell's `fill` decides how a newly
  revealed element seats; the `z`-planes decide what moves together — chrome (z3)
  **persists** through a build, content (z2) **builds**, atmosphere (z1) may
  **react**, annotation (z4) **overlays**. The reveal reads as *composed* because it
  is keyed to the contract, not free-floating.

## 3. The transformative ceiling — the slide can reconfigure as it assembles

Because Cells and Tiles carry **stable named identity**, "assemble as you go" is not
only additive — it can be **transformative**. A bullet list builds → collapses into
a chart (text morphs to viz) → the chart highlights one series → a callout drops in.
The slide *rearranges itself* mid-narrative. Named identity + the morph capability
(Keynote "Magic Move" / Reveal `auto-animate`) is what keeps that coherent instead
of a cross-fade mess; a flat DOM diff cannot reliably match elements across steps.
This is the high end of the model, and the composition contract is exactly what
makes it possible.

## 4. The layered architecture (where this fits)

The four design probes that produced this resolve into one clean stack:

| Layer | Question it answers | Owner |
|---|---|---|
| **Composition contract** (`lib/forms` manifest: cells · tiles · frames · `z`) | *where* things are | #377 (manifest = medium-independent contract) |
| **Narrative / step model** | *when, and in what order, it assembles* | **this ADR** |
| **Motion vocabulary** (`build` · `morph` · `transition` · `plane-parallax`) | *how* it moves between steps | staged (own ADR) |
| **Renderers** (CSS-2D · CSS-3D/WebXR · WebGL) | *what* paints it | 2D shipped; others = projections |

The step model is the **spine**: it drives the motion vocabulary, which the renderers
project, all over the named composition contract. It also retro-justifies the #377
decision (keep, don't trim) — **a step engine is impossible without load-bearing,
identity-bearing cells/tiles.**

## 5. The static-PDF policy — DECIDED: toggle (final default, overlay opt-in)

The PDF is canonical and cannot move, so a step model must declare what it flattens
to. **Decision:**

- **Default export = final-assembled-state** — one page per slide, fully built. The
  clean handout; the artifact most consumers want.
- **Opt-in narrative/overlay export** — one page **per step** (Beamer `\pause`-style),
  so the static artifact *also* tells the element-by-element story for handouts /
  async readers / accessibility.

Both are mechanical projections of the *same* declared step timeline — the engine
already knows every step, so "snapshot the last step" vs "snapshot each step" is a
flag, not a re-author. The overlay export doubles as the **reduced-motion /
accessible** rendering of the narrative (the build, without motion). Flag name TBD in
the impl ADR (e.g. `--narrative` / a deck `export: overlay` directive).

## 6. Authoring contract (sketch — field spec deferred)

Illustrative, to make the vocabulary concrete; the authoritative fields are the impl
ADR's:

- **Default:** every steppable unit (derived per §2) reveals in document order. Zero
  author effort — an existing deck gains a sane build for free.
- **Opt-in controls** (markdown-native, small, typed):
  - group: reveal several units in one step ("these three bullets together").
  - hold: a deliberate pause/beat with no reveal.
  - exclude: an element present from step 0 (context that shouldn't build in).
  - morph hint: mark two units as the *same identity* across a transform.
- **Non-negotiable:** stays markdown-simple; no per-element keyframe authoring.

## 7. Where it lives

- **Present mode (#373)** is the advance-driven host — the live runtime holds step
  state and applies deltas.
- **The docs site** can drive the same timeline by scroll.
- **The static path** snapshots per §5. The core static engine stays
  motion-free; the step model is a *runtime + export* concern, not a change to how a
  single slide's pixels are produced.

## 8. Discipline — the quality bar applies to time, too

"Walk the story" must not become "wizbang." The `design/design-principles.md`
restraint bar governs motion as much as layout:

- **Derived defaults + a small typed vocabulary** (`build`/`morph`/`hold`), never
  arbitrary per-element keyframe soup (the PowerPoint trap).
- **Always degrades to a coherent static state** (the final-state PDF is the source
  of truth; the build is an enhancement).
- **Accessibility first-class:** honor `prefers-reduced-motion`; the overlay PDF is
  the async/non-animated equivalent of the narrative.

## 9. Relationships

- **Builds on / requires** `2026-06-16-form-manifest-medium-independent-contract.md`
  (#377) — named, load-bearing cells/tiles are the prerequisite. Reinforces "keep,
  don't trim."
- **Subsumes** the motion appendix that ADR planned; motion becomes a layer *under*
  this spine.
- **Hosted by** `feat(drawing-board): Present mode` (#373).
- **Independent of** the gated section-as-grid migration (`2026-06-15` §4).

## 10. Non-goals

- Not building the step engine here — this fixes direction + the one canonical fork
  (PDF policy).
- Not the motion-vocabulary field spec (its own ADR).
- Not a new renderer (CSS-3D/WebGL are separate, per #377's taxonomy).

## 11. Staged plan (each its own increment, under a new tracking issue)

1. **Step-model spec + authoring vocabulary** (field-level; the §6 sketch made real).
2. **Derive steps from structure** in the runtime / Present mode (document-order
   default; reveal/build only).
3. **Overlay PDF export toggle** (§5) — including the reduced-motion equivalence.
4. **Motion vocabulary** (`build`/`morph`/`transition`) — the typed, restrained set.
5. **Scroll driver** on the docs site.
6. **Morph/identity transforms** (the §3 ceiling) — last, highest-craft.

## 12. Open questions (for the impl ADR)

- Per-component default step granularity (does a 6-cell card grid reveal as 6 steps,
  3, or 1? sensible per-component defaults).
- How holds compose with auto-advance / timed presromptal modes.
- The export flag/directive name and how it interacts with the existing pipeline.
- Speaker-notes / step-synced presenter view (a natural adjacency to Present mode).

## 13. Gates (for each increment when it lands)

Behaviour-preserving where claimed (the static **final-state** PDF must stay
pixel-identical to today's output until a deck opts into a build); `tools/pixel-check.js`
on the final-state projection; the overlay export validated page-count = step-count;
lint · `build:check` · unit · integration green; maker-checker (inspection +
assessment); reduced-motion verified.
