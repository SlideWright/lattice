---
marp: true
theme: indaco
paginate: true
header: "Lattice · kpi"
---

<!-- _class: title silent -->

# kpi

`Evidence · Ledger · Structure`

Executive KPI system — one base, five layout modifiers.

---

<!-- _class: kpi -->
<!-- _footer: "Default · kpi" -->

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
4. **+18%**
   - YoY revenue growth
   - vs 14% prior year `Ahead` `Board`


---

<!-- _class: kpi target -->
<!-- _footer: "Variance-against-target · kpi target" -->

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


---

<!-- _class: kpi attention -->
<!-- _footer: "Attention — the slipping metric leads · kpi attention" -->

### Orchestration · Q4 2026
## One metric below target; remediation under way.

1. **94%**
   - Orchestration success
   - target 99% · -5pp `At risk` `Board`
2. **8 ms**
   - p99 resolve
   - target 10 ms `On plan` `SRE`
3. **0**
   - Examiner findings
   - target 0 `On plan` `Audit`
4. **3.2×**
   - Resolve headroom
   - target 2× `On plan` `Platform`


---

<!-- _class: kpi ops -->
<!-- _footer: "Ops — SLO / SLA grid · kpi ops" -->

### Platform · Q4 2026
## One latency target slipping; everything else inside SLO.

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


---

<!-- _class: kpi compliance -->
<!-- _footer: "Compliance — binary state · kpi compliance" -->

### Compliance · Q4 2026
## Three frameworks clean; one open finding under remediation.

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


---

<!-- _class: kpi trajectory -->
<!-- _footer: "Trajectory — year-over-year cards · kpi trajectory" -->

### Growth · FY26 vs FY25
## Every growth lever moved forward this year.

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


---

<!-- _class: kpi spotlight -->
<!-- _footer: "Spotlight — monumentalised hero metric · kpi spotlight" -->

### Headline · Q4 2026
## The number behind the quarter.

1. **$420M**
   - Annual recurring revenue
   - First quarter past the $400M threshold; up 28% year-over-year and ahead of the FY26 plan by $18M.
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


---

<!-- _class: kpi dark -->
<!-- _footer: "Composition: dark · kpi dark" -->

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
4. **+18%**
   - YoY revenue growth
   - vs 14% prior year `Ahead` `Board`


---

<!-- _class: kpi compact -->
<!-- _footer: "Composition: compact · kpi compact" -->

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
4. **+18%**
   - YoY revenue growth
   - vs 14% prior year `Ahead` `Board`


---

<!-- _class: kpi accent -->
<!-- _footer: "Composition: accent · kpi accent" -->

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
4. **+18%**
   - YoY revenue growth
   - vs 14% prior year `Ahead` `Board`


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · kpi" -->

## When NOT to reach for kpi.

- **Decorative pills without status semantics.** The pills tint the layout (warn, breach, on-track). Don't use them as freeform tags — `On plan`, `At risk`, `Breaching`, `Compliant`, `Remediating` are the vocabulary the engine recognises.
- **More than four KPIs in attention or spotlight.** `attention` highlights the metric that needs the room; `spotlight` monumentalises one number. Past four KPIs the visual hierarchy collapses — split into two slides.
- **No targets, no trends.** If the KPIs carry only current values, the slide is a stats row, not a kpi dashboard. Use stats and reclaim the room.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `stats` — metric row without targets or status pills
- `big-number` — a single number is the whole argument
- `split-metric` — one KPI with a paragraph of supporting prose
- `progress` — completion percentages across parallel workstreams
- `timeline-list` — milestones in time, not metrics at a moment
