---
status: shipped
summary: The shipped gantt was a categorical chart — bars snapped to discrete quarter/month columns, tokens sniffed loosely (a typo became silent garbage), no real dates, no milestones, no dependencies. Decision — keep the nested-list construct (least change for change-averse authors) but make the inline-code tokens typed + validated and move to a continuous time scale. A span is `START..END` (bar) or a single point (milestone); `..` is the only delimiter (retired `→ / – / ->`); tokens add `after:` (dependency, validated not drawn) and `milestone`; time points are ISO dates / quarters / months on one continuous axis (dates OR ordinals, not both); axis auto-derives, eyebrow overrides + opt-in `today` line. Chosen over a GFM-table contract (bigger departure for the target audience). Hard replace, no back-compat.
last-updated: 2026-06-21
companion:
  - ../../lib/components/chart/_chart-family/chart-family.js
  - ../../lib/components/chart/gantt/gantt.styles.css
  - ../../lib/authoring/lint-core.js
---

# Gantt component redesign — typed list, continuous time, validated tokens

**Date** 2026-06-21 · **Status** accepted · **Area** `lib/components/chart/gantt`,
`lib/components/chart/_chart-family/chart-family.js`, `lib/authoring/lint-core.js`

## Problem

The shipped `gantt` is a *categorical* chart: a nested list whose bars are
placed by **discrete column index** over a quarter (`Q1–Q4`) or month
(`Jan–Dec`) window declared in the eyebrow. Three things were diagnosed as
holding it back:

1. **Stringly-typed tokens, parsed loosely.** Each `` `Q1 → Q2` `` / `` `done` ``
   pill was sniffed heuristically (a token with an arrow is a range; one without
   is a status). A typo became silent garbage, never an error.
2. **Structure overloaded on indentation.** Lane vs task is 2-space nesting —
   the usual list footgun.
3. **No time model and no relationships.** No real dates (only ordinal columns),
   no milestones, no dependencies.

## Decision

Keep the **nested-list** authoring construct (least change for change-averse
authors; consistent with every other Lattice list component) but make the
inline-code tokens **typed and validated**, and upgrade the renderer from a
discrete column grid to a **continuous time scale**.

This was chosen over a GFM-table contract on purpose: the table fixes the
indentation footgun outright but is a bigger departure for the exact audience
(office workers, change-averse reviewers) we are protecting. The list keeps
muscle memory; the validator and `after:` token close the two *substantive*
complaints (loose tokens, no relationships). The indentation dependency stays,
but it is the same risk every Lattice card layout already carries.

### Authoring contract

```markdown
<!-- _class: gantt -->

`2026 Q1 .. 2026 Q4`   `today 2026-07-01`

## Rollout plan, by workstream

- Framework
  - Signal taxonomy `Q1..Q2` `done`
  - Scoring model v2 `Q2..Q3` `live` `after: Signal taxonomy`
  - Per-team weighting `Q3..Q4` `at-risk` `after: Scoring model v2`
- Adoption
  - Pilot onboarding `Q1..Q2` `done`
  - Org-wide rollout `Q3..Q4` `after: Per-team weighting`
  - GA `Q4` `milestone` `after: Org-wide rollout`
```

- **Lane** = top-level bullet. **Task** = nested bullet (unchanged).
- **Tokens** are trailing inline-code, parsed by *kind*, order-independent:
  - **span** — `START..END` (a bar) or a single point (a milestone).
    `..` is the one delimiter, in the eyebrow window AND task spans.
  - **status** — one of the closed vocabulary (`on-track` `done` `live`
    `at-risk` `warn` `blocked` `fail` `pilot` `decision` `deferred`).
  - **`after: Name`** — a dependency on another task *by its visible label*
    (comma-separate for several: `after: A, B`).
  - **`milestone`** — optional explicit diamond (a single-point span is already
    a milestone; this is the explicit alias).
- **Eyebrow** carries the optional axis window (`START .. END`) and an optional
  `today <point>`. Both override / annotate; neither is required.

### Time model — continuous, two vocabularies

A time *point* is one of: an **ISO date** (`2026-03-15`), a **quarter**
(`Q1`, or year-qualified `2026 Q1`), or a **month** (`Jan`, `2026 Jan`).

- **Ordinal mode** (no dates present) — unit is the period index; ticks are an
  equal-width grid (the existing, zero-regression path). `Q1..Q2` spans Q1 *and*
  Q2 (inclusive); a single `Q4` is a milestone at the start of Q4.
- **Date mode** (any point is a date) — unit is epoch-days; ticks land on nice
  month/quarter boundaries positioned by percent. Spans are literal day ranges.
- **Mixing dates and ordinals** in one chart is a lint error.
- **Axis window** auto-derives from min start / max end across the tasks; the
  eyebrow window overrides it.

### Dependencies — validate, don't draw

`after:` is captured and **validated**, but no arrows are drawn (cleaner look,
cheaper, and the planning-error safety net is the real value). Lint flags:

- an `after:` that names **no task on the slide** (dangling reference);
- an **impossible schedule** — a task that starts *before* a thing it depends on
  finishes (a real planning error, surfaced loudly).

Connector arrows are a deliberately-deferred follow-up, not part of this change.

### Milestones — single point → diamond

A task whose span is a single time point (no `..`) renders as a **diamond**
marker at that point; the explicit `` `milestone` `` token forces the same. A
ranged span renders as a bar. (Mirrors the "zero-duration = milestone" intent.)

### Today marker — opt-in

A thin vertical "now" line is drawn **only** when the eyebrow carries
`today <point>`. No auto-from-system-date (a static deck must not silently
shift when re-rendered months later).

### Migration — hard replace

No back-compat shim for the old `→ / – / ->` delimiters or the loose token
sniffing. The new parser is a superset of the old *semantics* (lane → task,
status pills) but the delimiter changes to `..`. The linter flags the retired
delimiters with a "use `..`" hint so a pasted old deck fails loudly with a fix.

## Consequences

- `buildGanttChart` and its helpers (`parseGanttWindow`, `parseBarRange`) are
  rewritten around a continuous scale + typed-token parser.
- `lint-core.js` gains a `gantt` validator (unknown token, retired delimiter,
  bad status, malformed/mixed time points, dangling/`impossible` `after:`).
- `gantt.styles.css` gains a milestone diamond and a `today` line; bar geometry
  moves from `--gantt-col-start/span` to percent props that serve both modes.
- Docs, manifest (skeleton/sample/stress), gallery, and a per-feature demo deck
  (`examples/`) are updated to the new contract; old galleries are migrated.
