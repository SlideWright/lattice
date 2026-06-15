# Worked exemplar decks — "show what good looks like" (2026-06-14)

> Status: **design — approved direction (one `AskUserQuestion` round), build in
> progress.** Companion to `2026-06-08-architect-modes.md` (the Drafting /
> Freehand model + Appendix A's framework-grounded spines) and
> `2026-06-08-drawing-board-coach-vs-converse.md` (Coach). This doc adds a
> *content* layer on top of the *structure* layer those two specced.

## Symptom

In the Drawing Board's **Drafting** mode you pick a presentation type (e.g.
*Investor pitch*) and the Architect "builds the structure." What you actually
get (`drawing-board-architect.js` → `assemble()`) is the archetype **spine** — an
ordered list of slide *types* — with each slide filled by that component's
catalog **`skeleton`**, which `lib/components/index.js:64` defines verbatim as
*"a placeholder template."* The slides therefore each carry a *different
imaginary topic*: a `kpi` about "$2.4B revenue," a `roadmap` about "H2 2026
workstreams," a `big-number` about "92% of the audience." The result is a
structurally-sound but substantively-empty Frankenstein deck that teaches you
the **slots**, not the **standard**. Authors stare at a blank-with-labels and
have no mental model of what a *finished* deck of this kind looks like.

A second, related complaint: the spines are 5–9 slides, so the output reads
like a 5-minute lightning talk. Most real presentations have heft — build-up,
multiple evidence slides, transitions, backup. The skeleton models none of it.

## Root cause

Drafting only ever had a **structure** layer (the framework-grounded spines —
genuinely good IP) and no **content** layer. `skeleton` is by-design a
per-component stub with no notion of a shared subject, narrative, or the 10/10
boardroom bar. There is nothing in the product that shows an author *what good
looks like* end-to-end.

## Decision (confirmed with the user)

1. **Add worked exemplar decks alongside the scaffold** — do not replace it.
   Drafting offers two paths per archetype: **Open a worked example** (a
   complete, believable, boardroom-grade deck you read/edit) and **Scaffold
   mine** (today's spine of stubs, for a fast blank-ish start).
2. **Cover all 45 archetypes** — every entry in `ARCHETYPES`. Phased, not a
   single unreviewed dump (see *Sequencing*).
3. **Offer length variants** — short / standard / full — so an exemplar can
   model a real 20–30-minute talk, not only a lightning summary.

## The model

### One authored source per archetype, three tiers by filter (DRY)

Authoring 45 × 3 = 135 full decks by hand is untenable to write *and* keep
gate-clean. Instead: **author the FULL deck once; mark each slide with the
minimum tier at which it appears.** A pure filter derives the shorter tiers. One
source of truth per archetype → **45 authored decks, not 135.**

Per-slide marker (a plain HTML comment — Lattice parses only `_`-prefixed
directives, so this is inert to the renderer):

```markdown
<!-- _class: kpi -->
<!-- tier: short -->        ← appears in short, standard, full
...

<!-- _class: stats -->
<!-- tier: standard -->     ← appears in standard, full (dropped from short)
...

<!-- _class: matrix-2x2 -->
<!-- tier: full -->         ← full only
```

Tier ladder (`short ⊂ standard ⊂ full`):

| Tier | Slides | Models |
|---|---|---|
| **short** | ~5–7 | the lightning version — the spine essentials. ≈ today's framework spine, so the spines stay meaningful: they *define the short tier's slot order*. |
| **standard** | ~10–14 | a real working meeting deck — adds evidence and build-up. The default a Drafting author opens. |
| **full** | ~18–25 | the complete talk with multiple evidence slides, transitions, and backup. |

The filter is a pure function in a shared lib (`lib/exemplars/tier-filter.js`,
fs-free, unit-tested) so the CLI, a build step, and the browser all use one
implementation. An untagged slide defaults to `standard` (safe middle).

### Where exemplars live, how they reach Drafting

- **Source:** `exemplars/<group-slug>/<archetype-slug>.md` — one complete Lattice
  deck per archetype (full frontmatter + slides + tier markers), authored to the
  boardroom rubric (`engineering/decisions/2026-06-06-layout-audit/`).
- **Island metadata (build-time):** *(as built — leaner than first sketched.)*
  `drawing-board.astro` passes the island **just one new field, `exemplarBase`** (the
  hashed `exemplars/` asset URL) — **no** per-archetype metadata is inlined at all.
  The archetype→deck mapping lives with the picker (`ARCHETYPES[*].exemplar`), and
  the per-tier slide counts are computed **client-side** from the fetched deck
  (`tierCounts(full)`), so there's no metadata-vs-file drift surface and zero island
  bloat. (The original sketch inlined `{ archetype, group, slug, tierCounts }`;
  computing counts post-fetch made that unnecessary.)
- **Deck body (on demand):** when the author taps **Open a worked example**, the
  full `.md` is **fetched** from the deployed (content-hashed) `exemplars/` path
  (the same load-on-demand pattern as the engine bundle), then the tier filter
  trims it to the chosen tier and loads it into the editor. Lean island, real
  deck only when asked.
- **Render to PDF:** each exemplar renders to a committed `.pdf` (external
  reviewers + a future gallery need raw-URL access — HARD RULE #9's contract).

### The authoring standard (what makes an exemplar *good*)

A checker rejects an exemplar that misses these — this is the bar the fan-out
holds to:

- **One concrete, plausible, fictional subject** threaded through every slide
  (a believable company / program / study — *not* a real org, *not* lorem).
- **Declarative takeaway titles** — the message, not the label ("Revenue grew
  18%, led by APAC," not "Q3 Results"). *Knaflic.* (Also what Appendix B flags.)
- **Grounded in the archetype's framework** (Minto / Duarte / Knaflic / Sequoia /
  IMRaD / NIH / BLUF — see `2026-06-08-architect-modes.md` Appendix A).
- **Real-looking specifics** — numbers that add up, names, dates — so it reads
  as a finished deck, not a template.
- **10/10 boardroom bar, verified by eye** in both light and dark — gate-clean,
  lint-clean, renders without overflow.

### Drafting UX (the `proposeArchetype` surface)

After picking an archetype, the structure preview (today's outline) gains a
second affordance:

```
<archetype> — here's the structure I'd build.   [outline of the spine]

  [ Open a worked example ▸ ]   ← tier chooser: Short · Standard · Full
  [ Build a blank scaffold  ]   ← today's assemble()
  [ Pick another ]
```

Choosing a tier fetches the exemplar, filters it, loads it, and Coach reviews it
live like any deck (so the author *also* sees a top-grade scorecard — what good
looks like, scored). "Build a blank scaffold" is the unchanged `assemble()` path.

## Sequencing (phased — each phase a reviewable unit, HARD RULE #8)

**Phase 1 — the engine + the full content library (this PR).** The tier-filter
lib + tests, and **all 45 archetype exemplars authored to the boardroom bar**
(md + committed pdf, every tier lint-clean and rendered). The flagship —
*Investor pitch* (Saffron) — set the standard; the other 44 were authored by
parallel maker-checker author agents (one group per setting), each held to *the
authoring standard* above and given the flagship as the gold reference, then
render-verified slide-by-slide (incl. the fragile layouts: radar, Mermaid
`diagram`, `gantt`, `obligation-matrix`, `journey`, `verdict-grid`).

**Phase 1b — wired into Drafting (shipped).** The `exemplars/` decks are staged
as content-hashed playground assets (`sync-playground-assets.mjs`); the Drawing
Board island (`drawing-board.astro`) passes an `exemplarBase` URL to onboarding;
`filterToTier` / `tierCounts` are exposed to the browser via a new
`exemplar-core` bundle (`tools/build-exemplar-core.js` →
`exemplar-core.generated.js`, freshness-gated by `build:check`); and
`proposeArchetype` (`drawing-board-architect.js`) now fetches the worked deck on
demand, computes live per-tier slide counts, and offers the **Open a worked
example** path with a **Short · Standard · Full** chooser above the (secondary)
empty-structure scaffold. Each `ARCHETYPES` entry carries its `exemplar:
'<bucket>/<slug>'` join key; `docs/src/playground/exemplar-archetypes.test.ts`
gates that all 45 resolve to real files, so the mapping can't silently drift.
Verified end-to-end (the picker loads the trimmed deck into the editor and the
preview renders it) and screenshot-checked at desktop / tablet / mobile.

This ships "all 45" as the content destination AND the reachable surface, while
honoring the quality bar (every exemplar visually verified) and the isolation
rule.

## Maintenance / honest caveats

- **45 decks is a standing surface to keep green.** Each must re-render and stay
  gate-clean as components evolve. Mitigations: the decks use only shipped
  components (no bespoke CSS), a freshness gate renders them in CI like the
  galleries, and a single tier-filter means one code path, not three.
- **Island stays lean** because bodies are fetched on demand; only metadata
  inlines.
- **The spines are not discarded** — they become the *short tier's* backbone and
  the blank-scaffold path, so the framework IP keeps paying off.
- **Fictional, not real.** Exemplars must not impersonate a real company's
  numbers; believable-but-invented only.

## References

- Drafting / Freehand + the spines: `2026-06-08-architect-modes.md` (Appendix A
  the framework-grounded spine table; Appendix B the review heuristics).
- Coach (the live scorecard that reviews the loaded exemplar):
  `2026-06-08-drawing-board-coach-vs-converse.md`.
- The 10/10 bar: `engineering/decisions/2026-06-06-layout-audit/`.
- Per-feature demo-deck contract (the `.md` + committed `.pdf` shape exemplars
  reuse): HARD RULE #9, `engineering/workflow.md`.
