---
status: in-progress
summary: A "rethink the layout organization" review that started from a wrong premise ("we over-built some buckets") and corrected it against the catalog. The real diagnosis is not insufficient coverage but UNEVEN coverage plus a DISCARDED arrival model — the 4-axis tag vocabulary (idiom/occasion/material/task) exists in the vocabulary but is flattened to a plain string[] per component and never surfaced as navigation (the docs-site groups only by family/function/A–Z). Five moves, in order: (1) re-axis per-component tags + surface them as facets in the docs site AND the agent catalog; (2) consolidate the 4-way verdict cluster (compare-prose/decision/split-compare/verdict-grid) into one layout + variants; (3) targeted renames where the name buries the layout; (4) fill the empty buckets (people/org, imagery) with a build plan; (5) a drift gate enforcing metadata completeness (Capacity is missing on 39/53). Pre-GA, so renames are free and atomic.
---

# Layout organization review — uneven & flattened, not over-built

**Date:** 2026-06-23 · **Status:** Design — pending review. No code yet.

> **Premise correction (the through-line).** This review opened on the claim that some
> buckets were *over-served* — "14 charts, 10 comparisons" — and that some layouts were
> *the same thing* or *would never be used*. Checked against the catalog, that framing
> was wrong on the numbers (it's **13 chart layouts**, one of those a shared partial, and
> **8 comparisons**, not 10) and wrong on the verb. Count asymmetry tells you where
> attention *went*, not where it was *wasted*; we have no usage telemetry, so "never
> used" is unsupported and is retracted. What survives scrutiny is narrower and more
> actionable: coverage is **uneven**, and a multi-axis arrival model that already exists
> in the data is **thrown away before it reaches the author.**

## The question

"Rethink how Lattice's layouts are organized." The implied worry was over-supply. The
honest finding is the opposite shape: we built *richly* where it was interesting to
engineers and *thinly* where the median presenter lives, and the machinery that would
let an author *find the right layout* discards most of what it knows.

## What we verified (and what it overturned)

Counts, per `lib/components/<bucket>/`:

| bucket | layouts | | bucket | layouts |
|---|---|---|---|---|
| anchor | 3 | | evidence | 2 |
| statement | 4 | | imagery | **1** |
| inventory | 10 | | chart | 13 (+1 partial) |
| comparison | 8 | | diagram | 1 |
| progression | 2 | | math | 1 |
| **people / org** | **0** | | code | 2 |
| | | | legal | 5 |

52 real layouts (53 `.docs.md`, one being the `_chart-family` partial). Three claims
from the opening premise, tested:

1. **"Over-served."** *Retracted as a conclusion.* High count ≠ wasted effort. Defensible
   restatement: **coverage is uneven** — `chart` has 13, `imagery` has 1, and there is no
   people/org bucket at all, despite `org-chart` being an acknowledged need.
2. **"Some layouts are the same thing."** *Partially true, and narrower than stated.* Of
   the 8 comparison layouts, **four cluster on "weigh options → land a verdict"**:
   `compare-prose`, `decision`, `split-compare`, `verdict-grid`. They are not byte-identical
   — prose vs. scored matrix vs. recommendation card are real format differences — but the
   author has **four plausible doors and no rule** for which. That is *selection ambiguity*,
   the symptom of near-duplication. The other four (`compare-table`, `matrix-2x2`, `pricing`,
   `redline`) are cleanly distinct by occasion.
3. **"Will never be used."** *Retracted — no evidence.* The only proxy available is our own
   gallery coverage (`pricing` and `redline` have **0** baseline-deck examples; `compare-prose`
   has 7 while five siblings have 1). That measures *our demo discipline*, not user demand. It
   is a documentation gap, not a verdict on a layout's worth.

## The real diagnosis: the arrival model is built, then discarded

The decisive finding is in the metadata plumbing. Lattice already has a **four-axis tag
vocabulary** in `dist/docs/components.json`:

- **idiom** — `dashboard`, `scorecard`, `two-by-two`, `swimlane`, `org-chart`, `donut`, …
- **occasion** — `board-deck`, `pitch`, `planning`, `compliance`, `contract`, `okr`, …
- **material** — `metric`, `ranking`, `proportion`, `ownership`, `status`, `risk`, …
- **task** — `summary`, `tradeoff`, `recommendation`, `assessment`, `sequence`, …

These axes are exactly the non-Function ways an author arrives: by **occasion** ("I'm
building a pitch"), by **material in hand** ("I have a ranking"), by **task** ("I need to
land a recommendation"), by **idiom** ("I want a scorecard"). The model is right. But:

- **Per-component tags are flattened.** A manifest stores `["scorecard","ranking",
  "prioritize","assessment"]` — a plain `string[]`. The axis each tag belongs to is
  *thrown away* at assignment time, so nothing downstream can say "this is verdict-grid's
  *occasion* vs. its *material*."
- **The docs site can't navigate by axis.** `ComponentIndexIsland` groups only by
  **family / function / A–Z** (`component-search.ts` `Lens` set) and free-text **searches**
  tags as one undifferentiated blob (Fuse key `tags`, weight 0.25). There is no facet for
  occasion / material / task / idiom.
- **The agent catalog has the same flat shape.** Agents author most decks off
  `components.json` + `AGENTS.md`; they get the flat tag list too.

So the front door is effectively **Function-only**, and the rich multi-axis structure is
inert. That — not over-supply — is why the catalog *feels* both crowded and hard to shop.

Separately, metadata completeness is uneven in exactly one field: **`Capacity` is missing
on 39/53 docs.** `When to use` / `When NOT to use` are essentially universal (52/53 — only
the partial lacks them), so disambiguation is a *sharpen the verdict cluster* job, not a
fill-the-blanks one.

## Axes of the decision

1. **Tag structure** — keep flat, or re-axis per-component tags onto the existing
   vocabulary. *(Re-axis: the data model already names the axes; the loss is at assignment.)*
2. **Navigation** — Function-only, or multi-axis facets (occasion/material/task/idiom) in
   the docs site *and* the agent catalog.
3. **Verdict cluster** — keep 4 siblings + sharper boundaries, or **consolidate into one
   layout + variants.** *(Decided: consolidate — see below.)*
4. **Names** — leave, alias, or rename. *(Pre-GA ⇒ rename freely; see below.)*
5. **Coverage gaps** — defer pending demand, or **build now.** *(Decided: build now.)*
6. **Drift** — one-time sweep, or an enforced gate. *(Gate — a sweep rots.)*

## The plan

Five moves. (3) and (5) reflect decisions taken in review; the rest follow from the
diagnosis.

### 1 — Re-axis tags, then surface them as facets (the highest-leverage move)
The model exists; connect it. Change per-component tags from a flat `string[]` to an
axis-keyed shape (`{ occasion: [...], material: [...], task: [...], idiom: [...] }`), carried
through the manifest → `components.json` → docs site → agent catalog. Then:
- **Docs site:** add facet navigation — "shop by occasion / material / task" alongside the
  existing family/function/A–Z lenses. Extend the existing shadcn primitives and the shared
  search store (Hard Rule #15 — no per-surface widget fork).
- **Agent catalog:** expose the axed tags in `components.json` and document the
  arrive-by-axis path in `AGENTS.md`, so agents shop the same way authors do.

### 2 — Consolidate the verdict cluster into one layout + variants
`compare-prose`, `decision`, `split-compare`, `verdict-grid` collapse into a single verdict
layout whose *shape* is a variant/modifier (two-up prose · scored matrix · recommendation
card · bare verdict), not four sibling component names. One door, named for the job
("compare options and land a verdict"); the format is a modifier. This removes the
selection ambiguity at its root rather than papering it with longer "when NOT to use"
prose. Migration is mechanical (galleries, examples, tests, `components.json` rebuild) and
falls out of move #4's sweep.

### 3 — Targeted renames where the name buries the layout
Pre-GA, names are internal-only, so rename freely — but *surgically*, not as a blanket
sweep. Rename where the name hides the layout's job from search and from the agent catalog
(the test: would an author searching by task/material find it?). Each rename is part of the
single atomic commit in #4; `check:ownership` + the deck-authoring tests catch any straggler
reference for free.

### 4 — Fill the empty buckets (build plan)
- **people / org (0 → N):** at minimum an `org-chart` layout (the acknowledged need, today
  answered only by raw Mermaid) and a team/roster layout. This is the single most
  conspicuous gap against what a median presenter needs.
- **imagery (1 → N):** the single `image` layout is thin for a Function that should carry
  full-bleed, caption, and multi-image arrangements.
- Each new layout ships the full contract (Hard Rule #9): `.docs.md` with all metadata
  *including Capacity*, axed tags, a per-feature demo deck under `examples/`, gallery
  entries (dark + light), and `When NOT to use`.

### 5 — A drift gate so this doesn't rot
Add a `check:ownership` assertion (or a sibling check) that every real layout has:
non-empty axed tags on every axis it qualifies for, a `Capacity` line, ≥1 gallery example,
and `When NOT to use`. This converts the one-time audit into an enforced invariant — and
immediately flags the 39 missing `Capacity` lines as work.

## Scope & sequencing

- **Independent, ship first:** #1 (re-axis + facets) and #5 (drift gate) touch metadata and
  surfaces, not layout semantics — lowest blast radius, highest leverage. One branch each
  or one combined, per Hard Rule #17.
- **Behavioral, needs care:** #2 (verdict consolidation) and #4 (new layouts) change the
  rendered catalog — each is its own feature branch + demo deck, and each goes through
  visual review (Quality Bar) and maker–checker (engine/multi-file blast radius).
- **#3 renames** ride inside whichever branch touches the layout, never as a standalone
  churn commit.

## Non-goals

- **No pruning / deletion.** The evidence does not support "dead layouts"; we have no usage
  data. Consolidation (#2) merges siblings into variants — it does not delete capability.
- **No export-pipeline change.** Nothing here alters exported bytes; if a consolidation
  incidentally does, it stops for sign-off (Quality Bar export rule).
- **No new Function buckets** beyond filling people/org — the 12-bucket Function taxonomy
  stands; the fix is *additional arrival axes*, not a re-cut of Function.

## Open questions for review

1. **Verdict consolidation — variant axis.** Should the four shapes be one `_class` with a
   format modifier (`verdict`, `verdict matrix`, `verdict prose`…), or a small family
   sharing a kernel? (Leaning: one `_class` + modifiers — fewest doors.)
2. **Facet UI placement.** Do occasion/material/task become first-class group-by lenses, a
   separate filter rail, or both? (Leaning: lenses for parity with family/function; a rail
   if testing shows lenses crowd.)
3. **people/org bucket name.** `people`? `org`? Folded into an existing bucket? (Leaning: a
   new `people` Function bucket — org-chart + roster have no honest home today.)
