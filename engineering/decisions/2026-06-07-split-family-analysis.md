# Split-* family consolidation — analysis & plan

**Date:** 2026-06-07 · **Branch:** `claude/split-panel-consolidation`
**Status:** analysis complete; direction ratified (**Option B**); execution pending.
**Follows:** `2026-06-07-layout-redundancy-analysis.md` (this was its deferred
"cluster 2").

## The family

Six components share one transform (`lib/core/split-panels.js`, `SPLIT_LAYOUTS`)
and one spine — **a featured left panel + a supporting right zone**:
`split-list`, `split-brief`, `split-metric`, `split-steps`, `split-compare`,
`split-statement`. (`compare-prose` / `compare-code` are *co-equal* splits — a
different family — and `featured` is panel/mixed; all out of scope.)

## The structural truth (from the transform, not the surface)

`lib/core/split-panels.js` is the evidence. Its six functions decompose into
three tiers:

- **`applyBrief`, `applyMetric`, `applySteps` are code-identical.** Same extract
  sequence (`header → code-p → h2 → first-p`), same output (`left{eyebrow + h2 +
  lede}` / `right{lifted list}`). The only differences are the wrapper class
  names and one span class (`eyebrow` / `unit-label` / `phase-num`). Literal
  copy-paste — three components doing the same thing.
- **`applyStatement`** is the same spine with the left feature swapped to a
  `blockquote`.
- **`applyList`** adds a watermark glyph + an `h5`; **`applyCompare`** is the one
  real outlier — its right zone is a 2-option grid + a verdict card, not a list.

Visually (see the rendered family strip from the analysis session):
brief/metric/steps/statement are the same layout with a different *left feature*
(heading / hero-number / phase / quote); `metric` additionally flips the panel
**polarity** (light-left). Only `split-compare` has a different right-hand shape.

## Axes of variation

| Axis | Values |
|---|---|
| **Left feature** | heading (`brief`,`steps`) · hero number (`metric`) · pull-quote (`statement`) · heading+watermark (`list`) · decision frame (`compare`) |
| **Polarity** | dark-left (most) · light-left (`metric`) |
| **Right zone** | findings/points list (`brief`,`metric`,`statement`,`list`) · numbered steps (`steps`) · options+verdict (`compare`) |

Four of six differ only on left-feature + polarity — the right zone is the same
list. That's finish + content, not structure.

**Taxonomy bug:** five are `form: split` but are actually `panel` (featured +
supporting, not co-equal). Only `split-list` is correctly `panel`.

## Same-or-distinct verdict

| Component | Verdict |
|---|---|
| `split-brief` | base — featured heading + findings |
| `split-metric` | same structure → `metric` variant (light polarity + hero number) |
| `split-steps` | same structure → `steps` variant (numbered-timeline right) |
| `split-statement` | same spine → `quote` variant (blockquote left) |
| `split-list` | same spine + watermark + `meta` footer → `watermark` variant |
| `split-compare` | **distinct** right zone (options + verdict) — keep |

## Options considered

- **A — Full merge (6 → 1).** Everything a variant of `split-panel`, incl.
  compare. Most aggressive; one manifest carries all conditional slots + the
  verdict/options complexity. Rejected: the variant set just relocates the
  complexity, and per-variant slots become hard to document.
- **B — Targeted merge (6 → 2).** Fold brief/metric/steps/statement/list into
  one `split-panel`; keep `split-compare`. **Chosen.**
- **C — Engine dedupe only (6 → 6).** Collapse the 3 identical transform
  functions; no author-facing change. Rejected: doesn't shrink the catalog,
  so it misses the goal.

## Decision — Option B

Fold **brief / metric / steps / statement / list** into one **`split-panel`**
component; keep **`split-compare`** as the one structurally-distinct member.
Net **6 → 2**. Correct the `form: split` → `panel` classification in the same
pass.

`split-panel` shape:
- **default** — dark-left featured panel: optional inline-code eyebrow + `h2`
  heading + optional lede paragraph; right = findings/points list (autobold-li).
- **`metric`** — light-left polarity; the `h2` renders as a hero number.
- **`quote`** — the left feature is a `blockquote` (+ optional cite); right =
  implications list.
- **`steps`** — right list is a numbered step-timeline (or auto from `ol`).
- **`watermark`** — adds the first-letter watermark glyph + supports the `meta`
  footer slot (the former `split-list`).
- **`mirror`** — existing left/right flip, carried over.

`split-compare` stays as-is (frame + heading + context left; options + verdict
right), re-classed to `form: panel`, and documented as the split-panel family's
verdict sibling.

## Execution plan (when greenlit)

1. **Engine — one kernel, two render paths in lock-step.** Rewrite
   `lib/core/split-panels.js` so a single parameterized `applyPanel(inner, opts)`
   replaces applyBrief/Metric/Steps/Statement/List; dispatch by variant token
   rather than by component name. Mirror the change in the inline copy in
   `lattice-emulator.js` (~L1478). Runtime bundle picks it up via the registry.
   The integration tier already asserts cross-renderer slide-count parity.
2. **CSS** — one `split-panel.styles.css` with the variant branches (polarity
   flip for `metric`, hero-number sizing, quote treatment, numbered-step right,
   watermark). Retire the five component stylesheets.
3. **Manifest/slots** — one `split-panel.manifest.json` with `variantDocs` for
   metric/quote/steps/watermark/mirror. Confirm the schema/validator supports
   **per-variant slots** (metric's `unit`/`metric`/`context`, quote's
   `quotation`/`cite`, etc.); extend `lib/components/index.js` validation if not.
   This is the one open unknown to resolve first.
4. **Migrate decks (hard break).** `split-brief → split-panel`,
   `split-metric → split-panel metric`, `split-steps → split-panel steps`,
   `split-statement → split-panel quote`, `split-list → split-panel watermark`.
   Heaviest blast radius in the project: `split-metric` and `split-statement`
   are ~14 in-repo decks each (~32 deck-slides) plus galleries.
5. **`CARD_STYLE_LAYOUTS` / `SPLIT_SLOT_LAYOUTS`** in `lib/components/index.js`,
   the slot-lift selector lists in all three render paths, `check-ownership`
   allow-lists, and the `noBeloNote` list — update for the renamed component.
6. **Regenerate** css/docs/snippets/galleries; **purge** dead references (same
   discipline as the cluster-1–5 cleanup); record in `CHANGELOG.md`.
7. **Verify** each variant renders faithfully to the component it replaces
   (esp. metric polarity + hero number, compare untouched), `check:ownership`
   + `npm test` green, visual spot-check.

## Risk register

- **Highest blast radius of any cluster** (~32 deck-slides; two 14-deck
  components).
- **Two transform implementations** must stay in lock-step (`lib/core` +
  emulator inline).
- **Per-variant slots** may need a small manifest-schema/validator extension —
  resolve before starting (step 3).
- Hard break per the established convention; decks migrated in the same change.
