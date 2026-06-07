---
marp: true
size: 4k
theme: mustard
paginate: true
header: "Lattice · Layout Gallery"
---

<!-- _class: title -->
<!-- _header: '' -->
<!-- _paginate: false -->
<!-- _footer: "Title slide · title" -->

# From Signal to Strategy

`Product Strategy · Q3 2025`

A decision framework for product leaders navigating market uncertainty

---

<!-- _class: divider -->
<!-- _header: '' -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Section 01 · Foundations`

## The landscape has shifted. Here is what that means for us.

---

<!-- _class: divider light -->
<!-- _header: '' -->
<!-- _footer: "Centered orientation · divider light" -->

`Module 02`

## Before we score signals, we need to agree on what a signal is.

The word is overloaded. We use it to mean anything from a customer complaint to a macro trend. This framework requires a tighter definition.

---

<!-- _class: content -->
<!-- _footer: "Single-idea prose · content" -->

`Context · Competitive Dynamics`

## The window for differentiation is narrowing.

Three converging forces — commoditized infrastructure, compressed release cycles, and rising customer switching costs — have reduced the average durable advantage window from 36 months to under 14. Teams that cannot identify signal from noise in that window will consistently miss timing.

---

<!-- _class: diagram -->
<!-- _footer: "Component diagram · diagram" -->

`Architecture · Signal Pipeline`

## How signals move from input to decision.

`Four-stage processing pipeline — weekly cadence`

```mermaid
---
title: processing pipeline — weekly cadence
---
flowchart LR
  A["Raw Signals"] --> B["Classify"]
  B --> C["Score & Weight"]
  C --> D["Decision Log"]
  D -.->|"weekly retrospective"| B
```

---

<!-- _class: stats -->
<!-- _footer: "KPI numbers · stats" -->

`Impact · Pilot Results`

## Six months of results across four product teams.

`Measured against pre-framework baseline, same teams, same market conditions.`

1. 73%
   - faster close
2. 4.2×
   - signal recall
3. 18
   - decisions logged
4. 91%
   - team alignment

---

<!-- _class: cards-grid -->
<!-- _footer: "2×2 card grid · cards-grid" -->

## The framework has four components.

- Signal Intake
  - Weekly structured collection across customer conversations, market data, and competitive moves. Normalized into a common schema before scoring.
- Scoring Model
  - Each signal scored on three dimensions: confidence, recency, and strategic relevance. Weights are team-configurable and reviewed quarterly.
- Decision Log
  - Every decision recorded with the signals that informed it, the options considered, and the criteria applied. Feeds the calibration loop.
- Calibration Loop
  - Monthly retrospective that compares predicted outcomes to actual outcomes and adjusts scoring weights accordingly.

---

<!-- _class: cards-grid -->
<!-- _footer: "Inline code in cards · cards-grid" -->

## Code in card headers and body text.

- Signal Intake `v2.4`
  - Handles 94% of structured signals without manual intervention. Average latency: `4 min` from ingestion to scored entry.
- Scoring Model `configurable`
  - Three dimensions: confidence, recency, relevance. Default weights are `33 / 33 / 33` — adjust after your first retrospective.
- Decision Log `required`
  - Every prioritization change above `P2` must carry a logged rationale. No log, no change.
- Calibration Loop `monthly`
  - Compares predicted outcomes to actuals. First meaningful weight update happens after `2 cycles`.

---

<!-- _class: cards-grid -->
<!-- _footer: "2 top + 1 bottom · cards-grid" -->

## Signal Intake produces three outputs.

1. Weekly Signal Brief
   - A ranked list of the top 10 signals from the prior week, with confidence scores and source attribution. Distributed to product leads every Monday morning.
2. Anomaly Alerts
   - Real-time flags when a signal exceeds the 2σ threshold on any dimension. Routed directly to the accountable PM with a 4-hour response SLA.
3. Monthly Signal Index
   - The source of truth for the calibration loop. A complete record of all signals logged, scored, and resolved in the prior month. Required reading before each retrospective.

---

<!-- _class: cards-stack -->
<!-- _footer: "Vertical card stack · cards-stack" -->

## Two failure modes the framework is designed to prevent.

- False signal amplification
  - A single loud voice — one enterprise customer, one analyst report, one competitive announcement — dominates the decision without being weighed against the full signal set. The scoring model prevents any single source from exceeding 30% of the total signal weight in a given decision.
- Signal hoarding
  - Teams collect signals but do not log decisions, so the calibration loop has nothing to learn from. The Decision Log is a required artifact for any prioritization change above P2 severity. No log, no change.

---

<!-- _class: cards-grid -->
<!-- _footer: "Side-by-side cards · cards-grid" -->

## Two intake modes for different signal types.

- Structured Intake
  - Signals with clear schema: NPS verbatims, support ticket categories, feature request volumes, win/loss notes. Ingested automatically via API connectors. Scored on arrival. Zero manual handling.
- Unstructured Intake
  - Signals without schema: field observations, conference conversations, analyst briefings, competitive demos. Require human classification before scoring. Routed to the signal owner for a 48-hour classification window.

---

<!-- _class: compare-prose -->
<!-- _footer: "Two options + connector · compare-prose" -->

## Scoring model: before and after the calibration loop.

- Before Calibration
  - Equal weights across all three dimensions. Confidence, recency, and relevance each contribute 33% to the final score. Simple, consistent, but blind to what your market actually rewards.
- After Calibration
  - Weights reflect your team's historical signal accuracy. If recency has consistently been the weakest predictor for your product, it gets downweighted. The model becomes a record of what you have learned.

The shift from equal weights to calibrated weights takes two retrospective cycles — roughly 60 days from adoption.

---

<!-- _class: quote -->
<!-- _footer: "Pull quote · quote" -->

> The signal was always there. We just didn't have a system that forced us to look at it before we'd already decided.

— Head of Product, Pilot Team 3

---

<!-- _class: list-steps timeline -->
<!-- _footer: "Horizontal timeline · timeline" -->

## How a decision moves through the framework.

1. Signal Logged
   - _Owner classifies and submits to intake queue_
2. Scored
   - _Model applies current weights, generates score_
3. Brief Published
   - _Signal appears in weekly brief with rank_
4. Decision Logged
   - _PM records rationale, signals, predicted outcome_
5. Retrospective
   - _Outcome scored, weights updated accordingly_

---

<!-- _class: list -->
<!-- _footer: "Card list stack · list" -->

## What the framework does not do.

- It does not make decisions — it structures the information that humans use to decide.
- It does not replace customer discovery — it scores and routes what discovery surfaces.
- It does not work without the Decision Log — calibration requires outcome data to learn from.
- It does not guarantee alignment — it surfaces disagreement earlier, which still requires resolution.
- It does not scale down to individual feature decisions — it is designed for prioritization above P2.

---

<!-- _class: list -->
<!-- _footer: "Numbered list · list" -->

## Four things that must be true before you begin.

1. You have a regular prioritization cadence — at minimum monthly.
2. At least one person owns signal collection full-time or as a primary responsibility.
3. Leadership has agreed to log decisions with rationale, not just outcomes.
4. You have 90 minutes per week to run the intake and scoring process.

---

<!-- _class: big-number -->
<!-- _footer: "Hero stat · big-number" -->

`Calibration Result · 6-Month Pilot`

- 14x
  - Return on signal investment — measured as decisions that reached the right outcome on the first attempt, versus the baseline rate before the framework was adopted.

---

<!-- _class: split-list -->
<!-- _footer: "Dark panel + content · split-list" -->

## Scoring Model Deep Dive

`Section 02`

### What this section covers

The scoring model is the most configurable component. This section covers the three dimensions, how weights are set initially, and how calibration updates them over time.

1. Confidence
   - How many independent sources corroborate the signal. Ranges 1–5.
1. Recency
   - Time-decay applied from signal date to scoring date. Half-life is team-configurable.
1. Strategic Relevance
   - Manual score from the signal owner. Ranges 1–5. Requires justification above 4.

---

<!-- _class: closing -->
<!-- _header: '' -->
<!-- _footer: "Dark closing bookend · closing" -->
<!-- _paginate: false -->

`What Would Help Us Move Forward`

## Next step is a working session, not a debate.

`Walk these questions with me in 60–90 minutes. The output is either a design we can execute, or a shared list of what needs more work before we commit.`

---

<!-- _class: cards-grid -->
<!-- _footer: "Finding + key insight · cards-grid" -->

`Finding 01 · Structured Intake`

## Structured intake performed above expectations — volume and latency were not concerns.

- What worked
  - API connectors handled 94% of structured signals without manual intervention. Average scoring latency was 4 minutes from ingestion. Schema normalization held across all five connected sources.
- What required tuning
  - NPS verbatim classification had an 18% error rate in the first two weeks. Required a training pass on the classification model before accuracy reached the 92% target.

> Viable as designed — NLP classification requires a 2-week warm-up period on new deployments.

---

<!-- _class: cards-grid -->
<!-- _footer: "Key insight + below-note · cards-grid" -->

## Key insight works on any card-bearing layout.

- Signal Intake
  - Weekly structured collection across customer conversations, market data, and competitive moves.
- Scoring Model
  - Each signal scored on three dimensions: confidence, recency, and strategic relevance.
- Decision Log
  - Every decision recorded with the signals that informed it and the criteria applied.
- Calibration Loop
  - Monthly retrospective that compares predicted outcomes to actual outcomes.

> The calibration loop is what separates teams that learn from teams that repeat the same mistakes.

Trailing blockquote becomes a key insight; trailing paragraph becomes a below-note with a hairline rule above it.

---

<!-- _class: cards-grid -->
<!-- _footer: "Key insight + annotation · cards-grid" -->

## A trailing italic-only paragraph becomes an annotation.

- Signal Intake
  - Weekly structured collection across customer conversations, market data, and competitive moves.
- Scoring Model
  - Each signal scored on three dimensions: confidence, recency, and strategic relevance.
- Decision Log
  - Every decision recorded with the signals that informed it and the criteria applied.
- Calibration Loop
  - Monthly retrospective that compares predicted outcomes to actual outcomes.

> The calibration loop is what separates teams that learn from teams that repeat the same mistakes.

_Source: pilot retrospective, six months across four product teams._

---

<!-- _class: cards-stack -->
<!-- _footer: "3 full-width cards · cards-stack" -->

## Three scoring failure modes found in the pilot.

1. Recency dominance
   - High-recency noise crowding out durable signal. Teams set recency weight above 50% in the first calibration pass. Corrected by capping recency weight at 40% until two calibration cycles complete.
2. Source concentration
   - Single-customer signals inflating confidence scores. One enterprise customer's verbatims represented 34% of all structured intake in month one. Corrected by adding a source-diversity floor to the scoring model.
3. Outcome misclassification
   - PMs logging predicted outcomes that were too vague to score at retrospective. "Improve retention" is not scoreable. "Reduce 30-day churn from 8.2% to below 7%" is.

---

<!-- _class: list-criteria -->
<!-- _footer: "Numbered criteria · list-criteria" -->

## Four requirements every decision system must meet.

- **Speed**
  - Decisions must close within the window they are relevant to. Systems that add latency consume the value they exist to protect.
- **Auditability**
  - Every prioritization decision above a threshold must carry a traceable rationale. Required for alignment and compliance.
- **Adoption**
  - If the team won't use it weekly, calibration never runs and the model never improves. Ninety minutes per PM is the ceiling.
- **Calibration**
  - The system must improve over time. A static scoring model is a spreadsheet with extra steps.

---

<!-- _class: verdict-grid -->
<!-- _footer: "2×2 verdict grid · verdict-grid" -->

## We evaluated four intake tools against the criteria.

- Tool A · Chorus
  - [x] Speed
  - [-] Auditability
  - [x] Adoption
  - [ ] Calibration
  - Strong call recording and summarization. No decision logging or calibration loop. Requires separate tooling for everything downstream of intake.
- Tool B · Productboard
  - [ ] Speed
  - [x] Auditability
  - [x] Adoption
  - [ ] Calibration
  - Solid intake and prioritization. Decision logging exists but is manual and rarely used. No calibration mechanism. Setup takes 3–4 weeks.
- Tool C · Notion
  - [x] Speed
  - [x] Auditability
  - [-] Adoption
  - [ ] Calibration
  - Flexible enough to build the full system. But building it takes 40+ hours and the result is fragile. Teams abandon maintenance after the first quarter.
- Tool D · Sprig + Decision Log
  - [x] Speed
  - [x] Auditability
  - [x] Adoption
  - [x] Calibration
  - Meets all four criteria within the 90-minute weekly budget. Reaches production in the same week it is adopted. Recommended.

---

<!-- _class: compare-table -->
<!-- _footer: "Comparison table · compare-table" -->

## The four tools side by side.

| Criterion    | Chorus | Productboard | Notion    | Sprig + Log |
| ------------ | ------ | ------------ | --------- | ----------- |
| Speed        | ✓      | ✗            | ✓         | ✓           |
| Auditability | ✗      | ✓            | ✓         | ✓           |
| Adoption     | ✓      | ✓            | ✗         | ✓           |
| Calibration  | ✗      | ✗            | ✗         | ✓           |
| Setup time   | 1 day  | 3–4 weeks    | 40+ hours | Same day    |

_Evaluated against the same four teams and the same 90-minute weekly budget constraint._

---

<!-- _class: glossary -->
<!-- _footer: "Glossary · glossary (auto-table, auto-pill)" -->

## Glossary

- Adoption
  - Percentage of eligible PMs filing a Decision Log entry within 24 hours of a decision close.
- Auditability
  - The property that any decision can be reconstructed from its inputs three months later without the original author present.
- Calibration
  - The retrospective comparison of predicted to observed outcomes, used to score the framework's accuracy.
- Connector
  - The integration layer between Sprig and your NPS / support platforms. Owns ingestion and tagging.
- Decision Log
  - The append-only record of every prioritization decision, its predicted outcome, and the actual outcome at retrospective time.
- Eligible PM
  - A PM whose team has adopted the framework and is past the 30-day onboarding period.
- Framework
  - The four-criterion process: Speed, Auditability, Adoption, Calibration. The deck's central artifact.

---

<!-- _class: glossary -->
<!-- _footer: "Glossary continued · glossary (auto-table, auto-pill)" -->

## Glossary

- Predicted outcome
  - The author's stated expectation, recorded at decision time, used as the input to calibration.
- Prioritization rhythm
  - The team's regular cadence (weekly, biweekly) for revisiting and re-ordering work.
- Retrospective
  - The 30-day review meeting where logged decisions are scored against observed outcomes.
- Signal
  - Any qualitative or quantitative input to a decision — survey response, NPS comment, support ticket, sales call note.
- Sprig
  - The micro-survey product used by Tool D to capture qualitative signal in-product.
- Tool D
  - The recommended option in the four-tool comparison: Sprig combined with a lightweight Decision Log.

---

<!-- _class: featured -->
<!-- _footer: "Featured + 2 sub-cards · featured" -->

## Applying the criteria to the tools — here is where the evidence points.

- The evidence favors Tool D
  - Sprig combined with a lightweight Decision Log meets all four criteria within the 90-minute weekly budget, reaches production in the same week it is adopted, and leaves a clean exit ramp if a better native solution emerges.
- The path is not self-executing
  - Sprig requires a connector built to your NPS and support platforms. Budget 4–6 hours of engineering time in week one. After that, zero maintenance overhead.
- The Decision Log is the hardest part
  - Not technically. Culturally. PMs need to log decisions with predicted outcomes before they close, not after. This is a habit change, not a tool change.

---

<!-- _class: compare-prose -->
<!-- _footer: "Two options + connector · compare-prose" -->

## Two options with a connector and an explanatory note below.

- Option A · Label
  - Body text describing the first option. Enough detail to fill the card naturally and show how the layout handles a few lines of prose.
- Option B · Label
  - Body text describing the second option. The connector arrow between them implies direction or causality — before/after, input/output, cause/effect.

The below-note sits under the cards after a hairline rule. Use it for a single contextual sentence.

---

<!-- _class: list-steps -->
<!-- _footer: "Horizontal steps · list-steps" -->

## How to roll this out across your organization.

1. Pick one team and one decision type
   - Start with a team that already has a regular prioritization rhythm. Apply the framework only to a single decision category for the first 30 days.
2. Log everything, decide nothing differently
   - In the first month, do not change how you make decisions. Just log signals and decisions as you would have made them anyway.
3. Run your first retrospective
   - At day 30, score the logged decisions against outcomes. This is where the model gets its first calibration pass.
4. Expand to a second team
   - With one retrospective complete, you have evidence. Use it to onboard the second team with real data, not promises.

---

<!-- _class: list-tabular -->
<!-- _footer: "Tabular list · list-tabular" -->

## The six signal dimensions, what they measure, and how they are scored.

1. Confidence
   - Number of independent sources corroborating the signal
   - _1–5 · Auto-scored_
2. Recency
   - Time-decay from signal date, configurable half-life
   - _0.0–1.0 · Auto-scored_
3. Relevance
   - Alignment to current strategic bets, owner-scored
   - _1–5 · Manual_
4. Reach
   - Number of customers or segments affected
   - _1–5 · Auto-scored_
5. Effort
   - Engineering and design cost to act on the signal
   - _1–5 · Manual_
6. Confidence delta
   - Change in confidence score since last scoring cycle
   - _−5 to +5 · Auto_

---

<!-- _class: content -->
<!-- _footer: "Header and footer demo · content" -->
<!-- _header: "Lattice · Layout Gallery" -->
<!-- _footer: "Header stays uppercase · footer renders as written" -->

`Header And Footer`

## Header stays uppercase — footer renders as written.

Set `header:` and `footer:` in frontmatter for deck-level labels, or use per-slide comment directives. The header uses uppercase text-transform automatically, so you write it in any case. The footer renders exactly as written.

---

<!-- _class: code -->
<!-- _footer: "Single code block · code" -->

`Implementation · Decision Pipeline`

## Wiring a signal into the framework is three lines of code; the onboarding is three months.

`JavaScript · DecisionFramework SDK v2 interface`

```javascript
import { DecisionFramework } from "@company/signal-sdk";

const framework = new DecisionFramework({ configFile: "./framework.config.json" });

// Score a signal at intake
const score = await framework.score(signal, { dimensions: ["confidence", "recency", "relevance"] });

// Log every decision — calibration depends on it (nobody calls this in prod)
const entry = await framework.decisions.log(decision, { signals: [signal.id], rationale });
```

---

<!-- _class: compare-code -->
<!-- _footer: "Two code blocks · compare-code" -->

`Before & After · Scoring Mechanics`

## Spreadsheet-driven scoring versus framework-driven scoring.

`Before · The Honest Spreadsheet`

```python
# Manual scoring. Auditable in the
# sense that you can see who edited it
import pandas as pd

signals = pd.read_csv('./signals.csv')
signals['score'] = signals.apply(
    lambda r: 0.33*r.confidence + 0.33*r.recency + 0.33*r.relevance,
    axis=1,
)
```

`After · The Framework`

```python
# Calibrated weights, signed policy,
# every score is audit-logged
from decision_framework import Calibrator

calibrator = Calibrator.load('./policy.json')
for signal in calibrator.intake.unscored():
    calibrator.score(signal)
    calibrator.decisions.log_if_relevant(signal)
```

---

<!-- _class: image -->
<!-- _footer: "Image · default cover · image" -->

`Layout · Image`

## Image right is the default — text leads, evidence follows.

The image fills its half-canvas slot edge-to-edge. A 1px hairline marks the join between text and image — boardroom polish, no placeholder pattern visible behind a real photo.

![bg right](../../../lib/components/imagery/image/sample-image-landscape.svg)

---

<!-- _class: image mirror -->
<!-- _footer: "Image · cover, mirrored · image mirror" -->

`Layout · Image Mirror`

## Mirror flips the slot — image left, text right.

`mirror` is the cross-cutting orientation modifier; `image left` is preserved as a deprecated alias for one release.

![bg left](../../../lib/components/imagery/image/sample-image-landscape.svg)

---

<!-- _class: image contain -->
<!-- _footer: "Image · contain (no crop) · image contain" -->

`Layout · Image Contain`

## When a chart or screenshot must show in full, opt into `contain`.

The image is centred at native aspect on a clean `--bg-alt` matte — an editorial plate, not a placeholder. Use this for diagrams, schematics, and any asset where cropping would destroy meaning.

![bg](../../../lib/components/imagery/image/sample-image-portrait.svg)

---

<!-- _class: image full -->
<!-- _footer: "Image full · cover · image full" -->
<!-- _paginate: false -->

## Signal Pipeline · Reference Visualization

Weekly Signal Brief — the primary output of the intake pipeline, distributed every Monday

![bg](../../../lib/components/imagery/image/sample-image-landscape.svg)

---

<!-- _class: image museum -->
<!-- _footer: "Image museum · editorial plate · image museum" -->

`Image Layout · Museum Modifier`

## Museum modifier — editorial plate

Add `museum` alongside `image`. The image gets a `--bg-alt` matte border with a 1px hairline frame; a 100px matte plate at the bottom carries the editorial label + caption. Framed like a mounted print.

![bg](../../../lib/components/imagery/image/sample-image-landscape.svg)

---

<!-- _class: image museum full -->
<!-- _footer: "Image museum full · full bleed · image museum full" -->
<!-- _paginate: false -->

## Architecture dependencies — every node visible

Full-bleed museum centres the asset on a generous `--bg-alt` matte with uniform 40px inset on all four sides. The border frames it as an object, not a wallpaper. No text overlaid on the image.

![bg](../../../lib/components/imagery/image/sample-image-landscape.svg)

---

<!-- _class: divider dark -->
<!-- _header: '' -->
<!-- _paginate: false -->
<!-- _footer: "Dark variant — section break · divider dark" -->

`Dark Variant · Any Layout Class`

## The dark modifier works on any layout.

Add `dark` alongside any class — palette remaps automatically

---

<!-- _class: content dark -->
<!-- _footer: "Dark variant — prose · content dark" -->

`Dark Variant · Content`

## The token system handles dark without per-element overrides.

All colours reference CSS variables — `--bg`, `--text-heading`, `--text-body`, `--border` — that remap when `dark` is added. Cards, headings, body text, and borders all shift automatically. The spectrum bar is suppressed on dark slides.

---

<!-- _class: image full contain dark -->
<!-- _footer: "Image full contain dark · image full contain dark" -->
<!-- _paginate: false -->

## Signal Pipeline · Portrait Asset

A tall asset on a wide canvas — `contain` replaces the lattice pattern with a quiet `--bg-alt` matte, so the image reads as a museum plate rather than a placeholder.

![bg](../../../lib/components/imagery/image/sample-image-portrait.svg)

---

<!-- _class: list dark -->
<!-- _footer: "Dark variant — list · list dark" -->

`Dark Variant · List`

## The card stack renders cleanly on dark backgrounds.

- Every card uses `--bg-alt` for fill and `--border` for the border — both remap in dark mode.
- The accent left border uses `--accent` which is unchanged — the gold reads well against dark.
- Body text shifts to `--text-body` which in dark mode is a warm light tone, not pure white.

---

<!-- _class: cards-stack dark -->
<!-- _footer: "Dark variant — stacked cards · cards-stack dark" -->

`Dark Variant · Cards Stacked`

## Two-card layouts work equally well inverted to dark.

- The framework introduces exactly one hard question — who owns the scoring weights, and what happens to every past decision the morning someone changes them. The next forty slides are a confident, well-resourced exercise in deferring the answer.
- The pattern here is the same as any page of written argument — claim, then support. The dark palette does not change the information density or the reading rhythm.

---

<!-- _class: list-steps phase -->
<!-- _footer: "Modifier — list-steps phase · list-steps phase" -->

`Modifier · list-steps phase`

## The phase modifier renames the prefix word from STEP to PHASE.

1. Architecture
   - The first phase scopes the technical surface — what we build, what we buy, what we defer. Output is an architecture decision record signed by the platform owner.
2. Pilot
   - One internal team, one workload, one quarter. The phase ends when the integration is in production and the on-call rota covers it.
3. Rollout
   - Five teams in two months. The phase ends when no team needs handholding and incident volume is at or below pre-rollout baseline.

---

<!-- _class: list-steps milestone lettered -->
<!-- _footer: "Modifier — list-steps milestone lettered · list-steps milestone lettered" -->

`Modifier · list-steps milestone lettered`

## Modifiers compose: milestone renames the word, lettered swaps the format.

1. Scoring policy in production
   - The signed scoring policy runs end-to-end. The first calibrated brief lands in leadership's inbox, which we are calling general availability.
2. Per-team weights
   - One framework carries distinct scoring weights per team with no per-team fork. Recalibration is a single policy update. Each team will still want its own anyway.
3. Per-decision-class profiles
   - A scoring profile scoped to a single decision class takes minutes to author and a workshop series to agree on. Audit trails distinguish the classes nobody disputes.

---

<!-- _class: list-steps vertical compact -->
<!-- _footer: "Modifier — list-steps vertical · list-steps vertical compact" -->

`Modifier · list-steps vertical`

## Vertical stacks the steps as rows; the connector becomes a down-arrow.

1. Sense
   - Inputs are signals. Signals are observed, never invented. The first step is to write down what you see, not what you conclude.
2. Score
   - A signal becomes data once it carries a number. The score is calibrated against outcomes, not against intuition.
3. Decide
   - A decision is a signal plus a deadline. Without the deadline it is an opinion, not a decision. The retrospective closes the loop on the score that earned it.

---

<!-- _class: compare-prose chosen -->
<!-- _footer: "Modifier — compare-prose chosen · compare-prose chosen" -->

`Modifier · compare-prose chosen`

## Chosen flags the right-hand card as the winner.

- Quarterly re-litigation
  - Every decision reopened from first principles each review. Close time is a function of seniority in the room, not evidence — average 4 hours, and the debate runs long precisely when the board joins.
- Calibrated weights
  - The decision resolves against logged weights and prior outcomes. Average 18 minutes, and the argument stops cascading into the next quarter — a property we discovered after building the loop, not before.

The right card carries an accent left-edge and accent-tinted background — the same visual contract used by featured cards.

---

<!-- _class: compare-prose decision -->
<!-- _footer: "Modifier — compare-prose decision · compare-prose decision" -->

`Modifier · compare-prose decision`

## Decision composes chosen + rejected with a labelled connector.

- Buy a vendor
  - Three vendors evaluated; none expose the calibration weights to the customer. Six months to integrate, then per-seat licensing in perpetuity, renegotiated each year by whoever has not yet left.
- Build in-house
  - Owns the architecture, the operating model, and the timeline. Also owns the on-call rota, which is the line item nobody put in the business case.

The left card is struck through to read as the option considered then dropped; the right card carries the chosen visual; the connector is amplified and labelled DECISION.

---

<!-- _class: compare-prose vertical -->
<!-- _footer: "Modifier — compare-prose vertical · compare-prose vertical" -->

`Modifier · compare-prose vertical`

## Vertical stacks the two cards; the arrow connector rotates 90°.

- Before — manual recalibration
  - Operators book a recalibration window, freeze new decisions, swap weights, run a verification pass, lift the freeze. Average review pause 18 working hours; average post-mortem, ninety.
- After — version-floor recalibration
  - The calibration loop emits a new scoring policy with an incremented version. Teams pick it up on next refresh. No freeze, no cutover, no heroics worth a slide at all-hands.

---

<!-- _class: cards-grid three -->
<!-- _footer: "Modifier — cards-grid three · cards-grid three" -->

`Modifier · cards-grid three`

## Three switches the grid from 2 columns to 3 columns.

- Signal
  - The observed input — a verbatim, a metric move, a competitor announcement. The unit of intake, and frequently confused with "things the VP heard at a conference," which score a 5 on relevance every time.
- Decision
  - A signal plus a deadline, logged with rationale and predicted outcome. In theory traceable to its signals; in practice the signal is often "we discussed it at the offsite," logged after the fact, if at all.
- Outcome
  - The observed result, compared at retrospective to what we predicted. The unit of calibration. Eighteen logged so far, against roughly three hundred forty that occurred.

---

<!-- _class: cards-grid four compact -->
<!-- _footer: "Modifier — cards-grid four · cards-grid four compact" -->

`Modifier · cards-grid four`

## Four switches to 4 columns; pair with compact for visual balance.

- Sense
  - Signals are observed, never invented. Inputs are written down before they are interpreted.
- Score
  - A signal becomes data once it carries a number. Calibration is against outcomes, not intuition.
- Decide
  - A decision is a signal plus a deadline. Without a deadline it is an opinion.
- Review
  - The retrospective closes the loop on the score that earned the decision. The model improves only here.

---

<!-- _class: cards-stack horizontal -->
<!-- _footer: "Modifier — cards-stack horizontal · cards-stack horizontal" -->

`Modifier · cards-stack horizontal`

## Horizontal flips cards-stack from a vertical stack to a row.

- Claim
  - The framework buys calibrated prioritization with audit-grade decision custody — a sentence we will be repeating verbatim for two years.
- Evidence
  - Six-month pilot, four product teams, decision close-time down to 18 min, calibration run once — measured by the team that predicted exactly this.
- Implication
  - No vendor cutover. We keep funding the in-house build and ship org-wide enablement "next phase," as is tradition.

---

<!-- _class: image mirror -->
<!-- _footer: "Modifier — image mirror · image mirror" -->

`Modifier · image mirror`

## Mirror flips the image slot — same vocabulary as featured, split-list, compare-prose.

The half-canvas image moves from the right slot to the left, and the text padding swaps to match. `mirror` is the cross-cutting orientation flag in the Lattice grammar; `image left` is preserved as a backwards-compatible alias for one release.

![bg left](../../../lib/components/imagery/image/sample-image-landscape.svg)

---

<!-- _class: featured mirror -->
<!-- _footer: "Modifier — featured mirror · featured mirror" -->

## Mirror puts the hero card on the right; sub-cards stack on the left.

- The hero card now reads from the right
  - The featured layout normally leads with the accented hero card on the left and stacks supporting cards on the right. Mirror swaps the columns without touching the markdown contract.
- First supporting card on the left
  - Useful when the rest of the deck reads left-to-right and the editorial weight needs to land on the right edge as the next slide opens.
- Second supporting card below
  - Identical structure, identical authoring; only the visual side changes.

---

<!-- _class: split-list mirror -->
<!-- _footer: "Modifier — split-list mirror · split-list mirror" -->

## Section opener with the accent panel on the right.

`Section 02 · Mirror`

### What this section covers

Mirror moves the dark accent panel to the right. The watermark, eyebrow, and section number all stay anchored to the panel's own box — only the column position flips.

1. Confidence
   - How many independent sources corroborate the signal. Ranges 1–5.
1. Recency
   - Time-decay applied from signal date to scoring date. Half-life is team-configurable.
1. Strategic Relevance
   - Manual score from the signal owner. Ranges 1–5. Requires justification above 4.

---

<!-- _class: compare-prose mirror chosen -->
<!-- _footer: "Modifier — compare-prose mirror chosen · compare-prose mirror chosen" -->

## Mirror composes with chosen — the accented card reads from the left.

- Considered alternative
  - Source order keeps this card first, so `chosen` rules continue to target the second card in the markdown. Mirror only flips the rendering; the editorial intent (left = considered, right = chosen) is preserved by reading order.
- The choice
  - With `mirror`, the chosen card now appears on the left visually. Use this when the surrounding deck reads right-to-left or when the chosen path needs to land first in the audience's scan path.

The below-note still appears under both cards after the hairline rule.

---

<!-- _class: divider numbered -->
<!-- _header: '' -->
<!-- _footer: "Modifier — divider numbered · divider numbered" -->

`Modifier · divider numbered`

## Numbered stamps an auto-counter in the top-right corner.

The CSS counter walks the whole deck once and increments on every `divider.numbered` slide. Authors do not number sections by hand — the layout does it.

---

<!-- _class: divider light numbered -->
<!-- _header: '' -->
<!-- _footer: "Modifier — divider light numbered · divider light numbered" -->

`Modifier · divider light numbered`

## Each bookend layout owns its own counter.

The divider light counter is independent of the dark-divider counter, so a mid-deck light divider stamps `01` even when the dark dividers are already at `04`.

---

<!-- _class: closing numbered -->
<!-- _header: '' -->
<!-- _footer: "Modifier — closing numbered · closing numbered" -->
<!-- _paginate: false -->

`Closing · numbered`

## The closing series gets its own auto-stamp too.

`Use it for multi-part decks where the closing slide of each part should carry the part number.`

---

<!-- _class: matrix-2x2 -->
<!-- _footer: "New layout — matrix-2x2 · matrix-2x2" -->

## How we sort vendors against our two axes.

`Coverage · Cost`

- High coverage / Low cost
  - Sprig + Log — strongest coverage, lowest TCO, and a roadmap slide that is mostly our logo. Built by the evaluation team.
  - Productboard — narrower coverage but the cheapest tier, which is the only number procurement read.
- High coverage / High cost
  - Notion build-out — full coverage in theory, premium maintenance, and seven slightly different versions of the framework.
- Low coverage / Low cost
  - Chorus — cheap, but leaves three criteria uncovered, popular anyway.
- Low coverage / High cost
  - _none — and that is the signal._

---

<!-- _class: decision -->
<!-- _footer: "New layout — decision · decision" -->

## We are building, not buying.

`Decision · 2026 Q1`

- **Build**
  - Owns the scoring policy, the calibration loop, the timeline. And the pager.
- **Why not buy**
  - Three vendors evaluated; none expose the calibration weights to the customer, and all three decks were the same deck.
- **Why not delay**
  - The competitive window closes in 18 months — two reorgs from now.

---

<!-- _class: compare-prose transition -->
<!-- _footer: "Comparison variant — compare-prose transition · compare-prose transition" -->

## Decisions used to require a quarterly re-litigation.

`Decision close-time · before vs after`

- **Before**
  - Every prioritization debate from first principles. Average close 4 hours, p99 an entire offsite, and the outcome was whatever the most senior person wanted, expressed as consensus.
- **After**
  - Decisions resolve against logged weights and prior outcomes. Average close 18 minutes. The argument reaches the retrospective, not the next quarter.

The architecture change is the calibration loop — logged, weighted, time-bound scoring — not a meeting we ran until everyone stopped arguing.

---

<!-- _class: list principles -->
<!-- _footer: "New layout — principles · principles" -->

## How we make calls when the spec is silent.

1. We default to the choice that is cheaper to reverse.
2. We name the actor, never the system.
3. We write down the bet on the same slide as the choice.

---

<!-- _class: roadmap -->
<!-- _footer: "New layout — roadmap · roadmap" -->

## What ships in each phase, by workstream.

| Workstream    | Phase 01            | Phase 02             | Phase 03              |
| ------------- | ------------------- | -------------------- | --------------------- |
| Signal Intake | Connector v1        | Multi-source dedupe  | Anomaly auto-routing  |
| Scoring       | Equal-weights model | Per-team calibration | Per-decision profiles |
| Decision Log  | Append-only schema  | Outcome auto-pairing | Examiner export       |
| Adoption      | One pilot team      |                      | Org-wide enablement   |

The first column is sticky workstream label; phase columns carry numbered chrome; empty cells render as a thin dash.

---

<!-- _class: kpi target -->
<!-- _footer: "New layout — kpi · kpi target" -->

## Where we are against the targets we set ourselves.

1. **94%**
   - Signal-classification success
   - target 99%, gap is "known issue"
2. **18 min**
   - p99 decision close
   - target 20 min, beating target
3. **18**
   - Decisions logged
   - target 340, gap is "cultural"
4. **1**
   - Calibration cycles run
   - target 6, gap is "structural"

---

<!-- _class: agenda progress-2 -->
<!-- _footer: "New layout — agenda · agenda progress-2" -->

## What this deck covers, in order.

1. The Design — page 7
2. The Phasing — page 18
3. The Choices — page 26
4. Appendices — page 35
5. Closing — page 64

---

<!-- _class: actors -->
<!-- _footer: "New layout — actors · actors" -->

## Who owns each part of the framework lifecycle.

- **Signal custody** `Signal owner`
  - Runs intake quality. Never tunes the weights — only picks which signals surface.
- **Policy** `Framework operator`
  - Owns scoring policy, calibration cadence, and the rollback playbook nobody has run. One person.
- **Consumption** `Product team`
  - Holds scoring profiles; runs intake and decision-logging; finds the bugs first.
- **Oversight** `Auditor`
  - Reads the audit trail, cannot edit weights, and is the only role anyone fears — having read it once.

---

<!-- _class: list takeaway numbered -->
<!-- _footer: "List variant — list takeaway · list takeaway numbered" -->

`Section 03 · Recap`

## What this section will tell you, in five lines.

- The framework buys calibrated prioritization with audit-grade decision custody. → slide 8
- Recalibration is a version-floor increment, not a coordinated freeze, not a war room. → slide 12
- Per-team weights make recalibration a single policy update. → slide 18
- Phase 1 ships the architecture, Phase 2 ships the operations, Phase 3 ships the apology. → slide 22
- Five questions stay open until Phase 1 is forced to close them on the record. → slide 27

---

<!-- _class: cards-grid compact -->
<!-- _footer: "Modifier — compact · cards-grid compact" -->

`Modifier · compact`

## Compact tightens the spacing scale ~25 %, end-to-end.

- What changes
  - `--sp-xs` through `--sp-2xl` shrink. Card gaps, list gutters, and section padding follow because every layout reads them via `var()`.
- What does not change
  - Type ramp, palette, and chrome reservation (header / footer / pagination) are untouched. Compact is a density flag, not a different layout.
- When to reach for it
  - You have one more card than fits, or your prose runs the section by 1-2 lines, or you want a denser visual rhythm without rewriting copy.
- Composition
  - `compact` composes with `dark`, `accent`, and any layout where density makes sense. It is silently incompatible with `title`, `divider`, and `image-full`.

---

<!-- _class: content loose -->
<!-- _footer: "Modifier — loose · content loose" -->

`Modifier · loose`

## Loose is the inverse — more breathing room, same layout machinery.

The spacing scale grows ~25 % rather than shrinks. Sections that already look generous become luxurious; sections that look cramped become balanced. Reach for `loose` when the slide carries a single editorial point and you want the page to feel deliberately quiet — values pages, declarative principles, the closing line of an argument.

The discipline is the same as `compact` from the other side: do not change the type ramp, do not change the chrome, do not change the layout. Only the variables that govern between-element rhythm move.

> Density is not the same as importance. `loose` says: this page deserves room — not because it carries more, but because it carries one thing well.

---

<!-- _class: content with-period -->
<!-- _footer: "Modifier — with-period · content with-period" -->

`Modifier · with-period`

## Headings gain a closing period automatically

Authors who prefer sentence-style heading punctuation can set `class: with-period` in front matter once and stop thinking about it. The transform appends a period to any heading that does not already end with terminal punctuation — `.` `!` `?` `:` `…` — so mixed slides are safe.

The mirror modifier is `no-period`, which strips trailing periods instead. Both are deck-wide opt-ins via the global `class:` front-matter key; per-slide override with `<!-- _class: with-period -->` works too.

---

<!-- _class: content no-period -->
<!-- _footer: "Modifier — no-period · content no-period" -->

`Modifier · no-period`

<!-- markdownlint-disable-next-line MD026 -->
## Authors typed this heading with a period. It is gone.

Some teams author headings with periods out of habit, then strip them in review. `class: no-period` automates the strip so the source can stay as written and the output stays clean.

Only a literal trailing `.` is removed — `!`, `?`, `:`, and `…` pass through untouched. Combine with any layout class; the modifier composes cleanly because it operates on the heading text alone and touches no structural chrome.

---

<!-- _class: divider -->
<!-- _header: '' -->
<!-- _paginate: false -->
<!-- _footer: "Treatment Library — section break · divider" -->

`Treatment Library · Any Layout Class`

## `tint-*` and `mark-*` classes add peripheral accents from the active palette

Add a tint or mark class alongside any layout class — gradient wash or SVG mark, light canvas or dark, single pattern or layered pair.

---

<!-- _class: content tint-corner at-tl -->
<!-- _footer: "Background — corner glow · content tint-corner at-tl" -->

`Background · Corner Glow`

## A radial glow anchored at the corner fades before reaching the content zone

`tint-corner at-tl` places an elliptical accent at the top-left — 12% opacity at the corner, transparent before mid-slide. The four `at-*` placements share the same weight and fade profile; only the anchor differs.

All gradients use `color-mix(in srgb, var(--accent) 12%, transparent)`. Switching palette or adding the `dark` modifier remaps the accent automatically — no per-pattern overrides.

---

<!-- _class: content mark-orbit dark -->
<!-- _footer: "Background — SVG marks · content mark-orbit dark" -->

`Background · SVG Marks · Dark`

## SVG accent marks are painted through a mask in the active accent colour

`mark-orbit` places concentric rings and satellite dots in the bottom-right corner. The shapes render via `::before` + `mask-image`: the SVG defines the alpha channel (white = opaque, transparent = hidden) and the paint colour is `color-mix(in srgb, var(--accent) 28%, transparent)` — resolved from the theme at render time. Same class, light canvas or dark, the shapes are always visible and always on-brand.

---

<!-- _class: content tint-vignette tint-edge at-right -->
<!-- _footer: "Background — layered radial + linear · content tint-vignette tint-edge at-right" -->

`Background · Layered`

## One class from each slot layers without conflict

Every tint class (and `mark-seeds`) writes to either `--_bg-radial` or `--_bg-linear`. A compositor rule assembles both slots into a single `background-image` with two live layers. Stack one class from each column and both render:

- `tint-vignette` — radial slot — accent-tinted perimeter, open center
- `tint-edge at-right` — linear slot — wash bleeding in from the right edge

The SVG mark patterns follow the same rule: their atmospheric haze writes to its slot, and the `::before` shapes compose on top independently.

---

<!-- _class: divider -->
<!-- _header: '' -->
<!-- _paginate: false -->
<!-- _footer: "Chart — gantt + kanban · divider" -->

`Chart Layouts · gantt + kanban`

## Timeline bars and board columns from a two-level list

---

<!-- _class: gantt -->
<!-- _footer: "Chart — gantt · gantt" -->

`2026 Q1 → 2026 Q4`

## Feature delivery by workstream

- Design
  - Foundations `Q1` `done`
  - Component audit `Q2` `done`
  - Token refresh `Q3`
- Engineering
  - API v2 `Q1` `done`
  - SDK release `Q2 → Q3` `in-progress`
  - Migration guide `Q4`
- Growth
  - Onboarding v2 `Q2` `done`
  - Referral flow `Q3 → Q4`

---

<!-- _class: kanban -->
<!-- _footer: "Chart — kanban · kanban" -->

`Board · Phase 2 delivery`

## Where Phase 2 work stands today

- Backlog
  - API contract review
  - Load-test harness
- In progress
  - SDK v2 alpha `in-progress`
  - Onboarding redesign `in-progress`
- Review
  - Token migration spec `review`
- Done
  - Scope sign-off `done`
  - Design freeze `done`

---

<!-- _class: divider -->
<!-- _header: '' -->
<!-- _paginate: false -->
<!-- _footer: "Split Layouts · split-brief + split-metric + split-steps + split-compare + split-statement" -->

`Split Layouts · five variants`

## A structured left panel drives five two-column layouts

---

<!-- _class: split-brief -->
<!-- _footer: "Split — brief · split-brief" -->

`Q2 Performance Review`

## Enterprise revenue stalled in Q2

Three structural factors explain 90% of the shortfall — all addressable before Q4 close.

- Renewal pricing complexity is driving churn at the segment ceiling
  - Four accounts totaling $2.1M ARR declined renewal. Win/loss interviews point to a quote-to-contract gap, not value perception.
- Pipeline conversion dropped 11 pp below Q1 — legal review is the chokepoint
  - Contract length increased 18 days on average. Root cause is a security addendum introduced in March.
- Competitive displacement accelerated in the $80–200K ACV tier
  - Seven losses to a single competitor. Time-to-value gap is the exposure.

---

<!-- _class: split-metric -->
<!-- _footer: "Split — metric · split-metric" -->

`Net Revenue Retention`

## 114*%*

Measured across all customers active for 12+ months, March 31 cohort.

- Existing customers are growing faster than we lose them
  - At 114%, every churned dollar is offset by $1.14 in expansion. The base compounds without new-logo dependency.
- Expansion is concentrated — three segments drive 80% of the gain
  - Enterprise accounts in the 201–500 seat range upgrade at twice the SMB rate.
- Sustained above 110%, this unlocks a capital-efficient growth path
  - NRR above 110% meets the investor threshold for venture-category efficiency.

---

<!-- _class: split-steps -->
<!-- _footer: "Split — steps · split-steps" -->

`02`

## Discovery & Scoping

Four weeks. Shared definition of the problem before any solution work begins.

1. Stakeholder Interviews
   - Eight cross-functional conversations. Open questions only — listening for friction, not confirming assumptions.
2. Current-State Audit
   - System inventory, workflow documentation, and data quality review.
3. Problem Framing Workshop
   - Half-day session to align on root cause. Output is a ranked problem statement the team signs off on.
4. Scope Confirmation
   - Written sign-off on what is in, what is out, what requires a separate decision.

---

<!-- _class: split-compare -->
<!-- _footer: "Split — compare · split-compare" -->

`Decision Required`

## Build the data layer or buy it?

Both paths are viable. The difference is where we spend the next 18 months.

- Build in-house
  - Full control over schema and roadmap
  - 2–3 engineer-quarters to reach feature parity
  - Ongoing maintenance burden stays internal
- Buy + configure
  - Ship in 6 weeks, not 9 months
  - Engineering capacity redirects to product-layer features
  - Exit risk manageable — data export contractually guaranteed

> Buy the infrastructure. Build the differentiation. Revisit in 24 months.

---

<!-- _class: split-statement -->
<!-- _footer: "Split — statement · split-statement" -->

> The best product does not win. The most understood product does.

`Morgan Chase · Head of Product, Vercel, 2024`

- Clarity is a product decision, not a marketing one
  - If a prospect cannot articulate our value in one sentence, the product has a communication architecture problem.
- Onboarding is the product's first argument for itself
  - The moment a user first succeeds defines their frame for everything that follows.
- Understanding, not delight, is the retention driver at scale
  - Users who understand the system's logic stay through friction. Build for comprehension.

---

<!-- _class: closing accent -->
<!-- _header: '' -->
<!-- _paginate: false -->
<!-- _footer: "Modifier — accent · closing accent" -->

`Modifier · accent`

## Accent replaces the rainbow stripe with a single editorial colour.

The default top border is a spectrum gradient — a system signal that the page is part of a wider deck. The `accent` modifier swaps that stripe for one solid colour and tints the slide heading. Use it when one slide carries the editorial weight of a section and you want the visual chrome to say so.

It composes with `dark`: on the dark canvas the spectrum top-stripe is suppressed entirely, so `accent.dark` restores a solid accent stripe in its place — preserving the visual signal across both canvases.

<!-- Import Mermaid and the Lattice runtime theme for VS Code / web preview.
     The build script (lattice-emulator.js) pre-renders Mermaid to SVG at build time
     so these scripts are a no-op in the PDF/HTML output. -->
<!-- markdownlint-disable MD033 -->
<script src="../node_modules/mermaid/dist/mermaid.min.js"></script>
<script src="../dist/lattice-runtime.js"></script>
