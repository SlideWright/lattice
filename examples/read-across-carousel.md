---
size: portrait
theme: indaco
paginate: true
form: standard
autosplit: on
header: "Lattice · Read-across carousel"
footer: "Carousel — split what can't paginate"
---

<!-- _class: title -->

# The read-across carousel

`Fit Ladder · split what can't paginate`

A comparison can't be cut down the middle — so when it won't fit, it becomes a sequence.

---

<!-- _class: content -->

## What the carousel solves

- A list overflows? Split it between items — that is **auto-split**
- A **comparison** reads *across* its two sides — slice it and the meaning is gone
- So the engine **re-authors** it as a sequence: a cover, one page per side, a verdict
- Each frame stands alone, reads in order — no setting, no shrinking

---

<!-- _class: compare-prose -->

## Scoring model: before and after the calibration loop

- Before Calibration
  - Equal weights — confidence, recency, and relevance each contribute 33%. At least it is honest that we are guessing. No team has changed them in eighteen months.
- After Calibration
  - Weights reflect each team's historical accuracy — but the team keeps changing, and the history is one atypical quarter. So most teams keep the 33s and call them calibrated.

The shift takes two retrospective cycles — 60 days from adoption, or 14 months, depending on who you ask.

---

<!-- _class: compare-prose -->

## The evaluation came down to a question the vendors could not answer

- Buy a vendor framework
  - Three vendors evaluated. None expose calibration weights to the customer — the criterion that eliminated all three. It was added to the rubric after the team chose to build.
- Build the framework in-house
  - Owns the scoring policy, the calibration loop, and the timeline. The window closes in eighteen months; a vendor cutover would eat nine of them.

The conclusion came first; the evaluation was built to hold it. Everyone in the room knew it.

---

<!-- _class: compare-prose transition -->

## Decisions used to require a quarterly re-litigation

- Before
  - Decisions lived in the room they were made in. Six months on, nobody could say why a project was killed — only that someone senior had felt strongly.
- After
  - Every decision is logged with its signals, its options, and the bet it made. Teams still relitigate, but now there is a record — so the argument is shorter.

---

<!-- _class: split-panel watermark -->

`Section 01 · Deep dive`

## Scoring Model Deep Dive

The most configurable component — a feature or a warning sign, depending on your team. Six dimensions:

- Confidence
  - Independent corroborating sources, 1–5. Enterprise customers count as 1, regardless of volume.
- Recency
  - Time-decay, configurable half-life. Set to two weeks, then surprised only recent news scores.
- Strategic Relevance
  - Owner-scored, 1–5. A 5 correlates with whoever is presenting the roadmap this quarter.
- Source Diversity
  - Rewards breadth. In practice rewards whoever subscribes to the most newsletters.
- Volatility
  - Penalizes signals that swing. Also penalizes the only signal that caught the last surprise.
- Owner Bias
  - The correction nobody applies, scored by the owner it is meant to correct.

---

<!-- _class: list-tabular -->

## The six signal dimensions, what they measure, and how they score

- Confidence
  - Independent corroborating sources
  - 1–5, enterprise counts as one
- Recency
  - Time-decay on a configurable half-life
  - Two-week default surprises everyone
- Strategic Relevance
  - Owner-scored against the roadmap
  - 1–5, and a 5 is whoever presents
- Source Diversity
  - Rewards breadth of corroboration
  - Counts newsletters as sources
- Volatility
  - Penalizes signals that swing
  - Also penalizes the early-warning ones
- Owner Bias
  - The correction nobody applies
  - Scored by the owner it corrects

---

<!-- _class: content -->

## Two families, one ladder

- A **comparison** (compare-prose) → a cover, a page per side, a verdict
- A **feature panel** (split-panel) → the feature gets a cover, its points flow on
- A **table** (list-tabular, compare-table) → rows paginate, the header repeats
- Read-across *stages*; tabular *windows* — both opt in with `autosplit: on`, both owned by the layout

---

<!-- _class: closing -->

# More slides, never a clipped comparison

`Read-across stages, tabular windows — neither shrinks`
