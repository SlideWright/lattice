---
status: shipped
summary: In an interactive chart where only SOME marks authored detail, hovering a mark with no detail still reveals (the markCount gate from #465). Question — is "every mark revealable" right, and how should a no-detail reveal look? Decision — KEEP every-mark-revealable (it is the data-viz standard: Shneiderman details-on-demand + the universal tooltip convention), but split the reveal into two depths: a mark with no authored body/meta shows a COMPACT value-on-hover tooltip chip (label + value), while a mark with detail shows the full card. Family-wide via the shared reveal layer. Rejected: "highlight but no card" (content-free feedback) and "only authored marks interactive" (hidden affordance, re-opens the non-contiguous-index bug, breaks keyboard/touch uniformity).
last-updated: 2026-06-21
companion:
  - 2026-06-20-chart-detail-reveal-family.md
  - ../../docs/src/playground/drawing-board-chart-interact.js
  - ../../docs/src/styles/chart-interact.css
---

# Chart reveal — two depths, lean tooltip vs detail card

**Date:** 2026-06-21 · **Status:** decided + shipped.

## Question

After the per-mark detail reveal was generalized across the SVG chart family
([#465](2026-06-20-chart-detail-reveal-family.md)) and the pie was migrated onto
the shared substrate (#469), a question surfaced about the *interaction model*,
not the markup:

> Once a chart has **at least one** mark with authored detail, **every** mark
> becomes revealable — not just the ones with content. Hovering a no-detail slice
> still lifts/dims it, tilts the chart, and pops a card with its label + value
> (and an empty body). Is that what we want?

Two gates exist, at different levels (unchanged by this decision):

1. **Chart-level** — a chart is interactive *only if* `≥1` mark authored detail
   (the `.chart-details` wrapper gate in `setChart`). A plain chart with zero
   detail anywhere is fully inert.
2. **Mark-level** — once interactive, `sliceN = markCount()` (introduced in #465),
   so *all* marks are revealable. This was a deliberate fix: template-count
   gating capped reveal short on **non-contiguous** detail (marks 0 and 2
   authored, 1 not) and misaligned indices.

This is on-screen only (Drawing Board present / practice / preview). The exported
PDF is untouched either way.

## Options

- **A — reveal all marks** (status quo): every mark pops a card; no-detail marks
  show label + value only.
- **B — highlight all, card only if authored**: every mark lifts/dims, but the
  popover appears only for marks with detail.
- **C — only authored marks interactive**: no-detail marks don't respond at all.

## What the UX literature says

- **Shneiderman's Visual Information-Seeking Mantra (1996)** — "overview first,
  zoom and filter, then **details-on-demand**." A two-tier idea: every item
  yields its identity/value on demand; items with more yield more. **A** is the
  textbook implementation. Strongest signal.
- **Industry tooltip convention** (Tableau, Power BI, Highcharts, ECharts, D3,
  amCharts; Knaflic, *Storytelling with Data*) — hovering *any* mark shows its
  identity + value, universally, never a hand-picked subset. Users arrive with
  this expectation. Removing it for some marks (B/C) breaks a near-universal
  convention.
- **Nielsen #4 (consistency) + Norman (signified affordances)** — two
  identical-looking slices must behave identically. If only some respond with
  nothing distinguishing them, that is a **hidden affordance**. Norman's remedy:
  either everything responds (A), or add a *visible signifier* to the special
  marks. B/C create hidden/inconsistent affordances **unless** paired with a
  signifier.
- **Nielsen #1 (visibility of system status / feedback)** — every action needs
  feedback. **C** (hover → nothing) is indistinguishable from "didn't register."
  **B** gives a highlight but no information — feedback *without content*. **A**
  gives the most complete feedback.
- **NN/g — progressive disclosure & empty states** — A's two tiers are textbook
  progressive disclosure. The legitimate complaint about A — the "empty card" —
  is an **empty-state design problem**, not an interaction-model problem: the
  rich card chrome sets a header→body expectation a label-only reveal doesn't
  meet. The fix is to *design the lean state* as a deliberate compact tooltip.
- **Accessibility & touch** — the reveal layer binds number keys (1–9 → mark n)
  and tap-to-reveal. Under **A** every key/tap maps predictably; under **B/C**
  pressing "2" or tapping mark 2 may silently no-op — inconsistent for keyboard
  and touch users, who have no hover preview to learn which marks are live.
- **Minimalist counter-view (Tufte / Few)** — don't add interactivity that adds
  no information. But the objection lands on the *animation*, not the tooltip:
  label + value *is* information (the data readout). The restrained
  interaction-coupled tilt (≤7°) already honours this.

### Scorecard

| Principle | A (reveal all) | B (highlight, card if authored) | C (only authored) |
|---|---|---|---|
| Details-on-demand (Shneiderman) | ✅ | ⚠️ partial | ❌ |
| Industry tooltip convention | ✅ | ❌ | ❌ |
| Consistency / no hidden affordance | ✅ | ❌ needs signifier | ❌ needs signifier |
| Feedback (status visibility) | ✅ | ⚠️ content-free | ❌ silent |
| Keyboard/touch uniformity | ✅ | ❌ | ❌ |
| Avoids "empty card" feel | ⚠️ styling fix | ✅ | ✅ |
| Index-safety (the #465 fix) | ✅ | ✅ | ❌ re-opens it |

## Decision

**Keep A (every mark revealable) — it is the data-viz standard — and fix its one
real weakness (the "empty card") with presentation, not by removing the
feature.** The reveal now has **two depths**:

- a mark with **no** authored body/meta → a **compact value-on-hover tooltip
  chip** (dot · label · value): tighter padding, smaller radius, lighter shadow;
- a mark **with** detail → the full **detail card** (header + body + meta).

Applied **family-wide** (the reveal layer + its CSS are shared across
pie/funnel/map/quadrant/radar), so the family stays consistent — the same reason
#469 unified the markup.

**Rejected:** **B** deletes the value-on-hover users expect and leaves
content-free highlights; **C** re-opens the non-contiguous-index bug #465 fixed
and is weakest on feedback, consistency, and a11y.

## Built (this branch)

- `docs/src/playground/drawing-board-chart-interact.js` — `reveal()` toggles a
  `db-pp-chartpop--lean` class when `!body && !meta`.
- `docs/src/styles/chart-interact.css` — the `--lean` modifier (compact chip
  chrome; value hugs the label).
- No change to the interaction model, the kernel, or any exported artifact.

## Open / future

- **Per-mark signifier (deferred, optional).** A subtle indicator on marks that
  *do* carry authored detail (e.g. an affordance dot on the legend row), so the
  richer tier is discoverable on first sight — the direct answer to Norman's
  hidden-affordance point. Not required for this change; recorded as the natural
  next step if discoverability proves a problem.
