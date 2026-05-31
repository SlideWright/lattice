# kpi

> Executive KPI system — one base, five layout modifiers.

**Function** evidence · **Form** ledger · **Substance** structure

**Tags** `dashboard` · `scorecard` · `metric` · `okr`

Use for KPI dashboards with status framing — current value, target, trend, attention-needed. Bare `kpi` resolves to the briefing layout; the five modifiers tune the visual emphasis for different audiences (ops, compliance, investor, headline).

## When to use

- **Status framing matters as much as the number.** Reach for kpi when the audience needs value, target, trend, AND status indicator together. For ungoverned metric rows use stats; for a single hero number use big-number.
- **Pick the modifier from the audience.** Board / investor reviews use the bare briefing default. SRE / SLO reviews use `ops`. Auditor / regulator packs use `compliance`. Year-over-year growth stories use `trajectory`. A single hero metric with body copy uses `spotlight`.
- **One contract across all five.** Every modifier reads the same `### eyebrow / ## headline / 1. **value** / nested bullets / status pills` authoring contract. Switching modifiers should never require rewriting the prose.

## When NOT to use

- **Decorative pills without status semantics.** The pills tint the layout (warn, breach, on-track). Don't use them as freeform tags — `On plan`, `At risk`, `Breaching`, `Compliant`, `Remediating` are the vocabulary the engine recognises.
- **More than four KPIs in attention or spotlight.** `attention` highlights the metric that needs the room; `spotlight` monumentalises one number. Past four KPIs the visual hierarchy collapses — split into two slides.
- **No targets, no trends.** If the KPIs carry only current values, the slide is a stats row, not a kpi dashboard. Use stats and reclaim the room.

## Authoring

```markdown
<!-- _class: kpi -->

### Financial · Q4 2026
## Revenue ahead of plan; margin and cash both expanded.

1. **$2.4B**
   - Total revenue
   - target $2.2B · +9% `On plan` `Board`
2. **42%**
   - Gross margin
   - +2pp QoQ `On plan` `Audit`
3. **$1.1B**
   - Cash & equivalents
   - +$180M QoQ `On plan` `Investor`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the KPI group. |
| `subtitle` | `h3` | no | Optional subtitle below the heading. |
| `kpis` | `ul > li` | yes | One li per KPI. Lead with **Metric name** then nested bullets for value, target, trend, status. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  KPI grid heading.                      │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │  42×    ✓    │     │  87%    ✓    │  │
│  │  growth      │     │  uptake      │  │
│  └──────────────┘     └──────────────┘  │
│  ┌──────────────┐     ┌──────────────┐  │
│  │  3.2k   ⚠    │     │  91%    ✓    │  │
│  └──────────────┘     └──────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `target` — Variance-against-target

Bare-bones variance dashboard — each KPI shows current value against target with the gap framed plainly. Best for working sessions where the gap, not the status, is the conversation.

```markdown
<!-- _class: kpi target -->

## Where we are against quarter targets.

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
```

### `attention` — Attention — the slipping metric leads

Promotes the one KPI in trouble to hero scale, with the supporting three holding their normal rank. Use when one number needs the room and the others provide reassurance.

```markdown
<!-- _class: kpi attention -->

### Orchestration · Q4 2026
## One metric below target; remediation under way, as it has been for two quarters.

1. **94%**
   - Orchestration success
   - target 99% · -5pp `At risk` `Board`
2. **8 ms**
   - p99 resolve
   - target 10 ms `On plan` `SRE`
3. **0**
   - Examiner findings
   - target 0 — nobody has opened the log to check `On plan` `Audit`
4. **3.2×**
   - Resolve headroom
   - target 2× `On plan` `Platform`
```

### `ops` — Ops — SLO / SLA grid

2×2 grid optimised for SRE-style SLO review. Breaching metrics tint to `--warn`; the layout is designed to be scanned quickly during an incident review or on-call hand-off.

```markdown
<!-- _class: kpi ops -->

### Platform · Q4 2026
## One latency target slipping; everything else inside SLO, for now.

1. **99.92%**
   - API availability
   - SLO 99.95% · -0.03pp `At risk` `SRE`
2. **42 ms**
   - p99 read latency
   - SLO 50 ms · -16% headroom `On track` `SRE`
3. **18 ms**
   - p99 write latency
   - SLO 15 ms · +20% `Breaching` `Platform`
4. **0.04%**
   - Error budget burn (28d)
   - SLO 1% · 4% consumed `On track` `Reliability`
```

### `compliance` — Compliance — binary state

Binary-state pills (`Compliant`, `Remediating`, `Open`) with a source footer for the regulatory register. Best for audit committee packs, examiner reviews, and quarterly compliance walk-throughs.

```markdown
<!-- _class: kpi compliance -->

### Compliance · Q4 2026
## Three frameworks clean; one open finding under remediation since the last walk-through.

1. **0**
   - SOC 2 Type II open findings
   - 2026 audit complete `Compliant` `Auditor`
2. **0**
   - PCI-DSS open findings
   - QSA review Oct 2026 `Compliant` `QSA`
3. **1**
   - GDPR open findings
   - remediation due Q1 2027 `Remediating` `DPO`
4. **0**
   - Internal audit material findings
   - quarterly review complete `Compliant` `Audit Committee`

Source · regulatory register · weekly export
```

### `trajectory` — Trajectory — year-over-year cards

Four-up cards with categorical stripes that read as period-over-period movement. Best for investor letters, year-end reviews, and any deck where the YoY delta is the headline.

```markdown
<!-- _class: kpi trajectory -->

### Growth · FY26 vs FY25
## Every growth lever moved forward this year, in the cut of the data we are showing.

1. **$420M**
   - ARR
   - +28% YoY `YoY +28%` `Investor`
2. **94%**
   - Net dollar retention
   - +3pp YoY `YoY +3pp` `Investor`
3. **2,840**
   - Enterprise logos
   - +540 net new `YoY +23%` `Board`
4. **$148K**
   - Average contract value
   - +$22K vs FY25 `YoY +18%` `Board`
```

### `spotlight` — Spotlight — monumentalised hero metric

Hero KPI gets a paragraph of body copy and a row of context pills; the supporting three render at normal weight underneath. Best for the headline slide of an investor update or earnings narrative.

```markdown
<!-- _class: kpi spotlight -->

### Headline · Q4 2026
## The number behind the quarter, and the one in every headline slide.

1. **$420M**
   - Annual recurring revenue
   - First quarter past the $400M threshold; up 28% year-over-year and ahead of the FY26 plan by $18M, which is the figure we will quote until it stops flattering us.
   - `Headline` `Board` `Investor`
2. **94%**
   - Net dollar retention
   - +3pp YoY `On plan`
3. **2,840**
   - Enterprise logos
   - +540 net new `On plan`
4. **$148K**
   - Average contract value
   - +$22K vs prior year `On plan`
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`stats`](../../evidence/stats/stats.docs.md) — metric row without targets or status pills
- [`big-number`](../../statement/big-number/big-number.docs.md) — a single number is the whole argument
- [`split-metric`](../../evidence/split-metric/split-metric.docs.md) — one KPI with a paragraph of supporting prose
- [`progress`](../../chart/progress/progress.docs.md) — completion percentages across parallel workstreams
- [`timeline-list`](../../chart/timeline-list/timeline-list.docs.md) — milestones in time, not metrics at a moment

## Demo deck

See [kpi.gallery.light.pdf](./kpi.gallery.light.pdf) for rendered examples of every variant.
