---
marp: true
theme: indaco
paginate: true
header: "Lattice · cards-grid"
---

<!-- _class: title silent -->

# cards-grid

`Inventory · Grid · Structure`

2–4 parallel items, similar weight, scannable in a grid.

---

<!-- _class: cards-grid -->
<!-- _footer: "Default · cards-grid" -->

## The framework has four components.

- Signal Intake.
  - Weekly structured collection across customer conversations, market data, and competitive moves. Normalized into a common schema before scoring.
- Scoring Model.
  - Each signal scored on three dimensions — confidence, recency, and strategic relevance. Weights are team-configurable and reviewed quarterly.
- Decision Log.
  - Every decision recorded with the signals that informed it, the options considered, and the criteria applied. Feeds the calibration loop.
- Calibration Loop.
  - Monthly retrospective that compares predicted outcomes to actual outcomes and adjusts scoring weights accordingly.


---

<!-- _class: cards-grid four compact -->
<!-- _footer: "Four columns · cards-grid four" -->

## Four phases, four owners.

- Intake.
  - PM. Collect raw signals.
- Score.
  - Analyst. Apply weights.
- Decide.
  - Lead. Pick the call.
- Calibrate.
  - Team. Compare to actuals.


---

<!-- _class: cards-grid three -->
<!-- _footer: "Three columns · cards-grid three" -->

## The framework has three components.

- Signal Intake.
  - Weekly structured collection across customer conversations, market data, and competitive moves. Normalized into a common schema.
- Scoring Model.
  - Each signal scored on three dimensions — confidence, recency, strategic relevance. Weights are reviewed quarterly.
- Decision Log.
  - Every decision recorded with the signals that informed it, the options considered, and the criteria applied.


---

<!-- _class: cards-grid -->
<!-- _footer: "Numbered cards · cards-grid numbered" -->

## Signal Intake produces three outputs.

1. Weekly Signal Brief
   - A ranked list of the top 10 signals from the prior week, with confidence scores and source attribution. Distributed to product leads every Monday.
2. Anomaly Alerts
   - Real-time flags when a signal exceeds the 2σ threshold on any dimension. Routed to the accountable PM with a 4-hour response SLA.
3. Monthly Signal Index
   - The source of truth for the calibration loop. Required reading before each retrospective.


---

<!-- _class: cards-grid mirror -->
<!-- _footer: "Mirror (no-op on symmetric grids) · cards-grid mirror" -->

## Mirror is a no-op here.

- First card.
  - Same position with or without `mirror`.
- Second card.
  - Same position with or without `mirror`.
- Third card.
  - Symmetric grids have nothing to flip.
- Fourth card.
  - This slide renders identically to the default.


---

<!-- _class: cards-grid dark -->
<!-- _footer: "Composition: dark · cards-grid dark" -->

## The framework has four components.

- Signal Intake.
  - Weekly structured collection across customer conversations, market data, and competitive moves. Normalized into a common schema before scoring.
- Scoring Model.
  - Each signal scored on three dimensions — confidence, recency, and strategic relevance. Weights are team-configurable and reviewed quarterly.
- Decision Log.
  - Every decision recorded with the signals that informed it, the options considered, and the criteria applied. Feeds the calibration loop.
- Calibration Loop.
  - Monthly retrospective that compares predicted outcomes to actual outcomes and adjusts scoring weights accordingly.


---

<!-- _class: cards-grid compact -->
<!-- _footer: "Composition: compact · cards-grid compact" -->

## The framework has four components.

- Signal Intake.
  - Weekly structured collection across customer conversations, market data, and competitive moves. Normalized into a common schema before scoring.
- Scoring Model.
  - Each signal scored on three dimensions — confidence, recency, and strategic relevance. Weights are team-configurable and reviewed quarterly.
- Decision Log.
  - Every decision recorded with the signals that informed it, the options considered, and the criteria applied. Feeds the calibration loop.
- Calibration Loop.
  - Monthly retrospective that compares predicted outcomes to actual outcomes and adjusts scoring weights accordingly.


---

<!-- _class: cards-grid accent -->
<!-- _footer: "Composition: accent · cards-grid accent" -->

## The framework has four components.

- Signal Intake.
  - Weekly structured collection across customer conversations, market data, and competitive moves. Normalized into a common schema before scoring.
- Scoring Model.
  - Each signal scored on three dimensions — confidence, recency, and strategic relevance. Weights are team-configurable and reviewed quarterly.
- Decision Log.
  - Every decision recorded with the signals that informed it, the options considered, and the criteria applied. Feeds the calibration loop.
- Calibration Loop.
  - Monthly retrospective that compares predicted outcomes to actual outcomes and adjusts scoring weights accordingly.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · cards-grid" -->

## When NOT to reach for cards-grid.

- **More than 4 items.** Split into multiple slides instead. The grid loses scannability past 4 cards.
- **Order carries meaning.** Use list-steps or list-criteria. cards-grid is for parallel options, not sequences.
- **Lopsided density.** Equalize the prose when one card has three sentences and the rest have one. Otherwise change layout.
- **Inline-code-only body.** A body bullet containing only `code` gets promoted to an eyebrow label. Mix it with surrounding prose.

---

<!-- _class: closing silent -->

## See also.

`Related components`

- `list-steps` — items carry an explicit sequence
- `cards-stack` — items stack vertically as full-width rows
- `compare-prose` — two-option comparison, side by side
- `verdict-grid` — comparing options against shared criteria
