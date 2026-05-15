---
marp: true
theme: indaco
size: hd
paginate: true
header: "Lattice · KPI Gallery"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "Title slide · title" -->

# The KPI System

`Executive metrics · 2026`

One cohesive `kpi` base, five layout modifiers. Bare `kpi` defaults
to the briefing layout. All five share the same eyebrow, headline,
pill, and ✦ flagship treatment.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 01`

## The base · bare `kpi` resolves to briefing.

---

<!-- _class: kpi -->
<!-- _header: '' -->
<!-- _footer: "kpi (bare) — defaults to briefing · board / financial summary" -->

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

<!-- _class: kpi attention -->
<!-- _header: '' -->
<!-- _footer: "kpi attention — hero metric is the one slipping" -->

### Authentication · Q4 2026
## One metric below target; remediation under way.

1. **94%**
   - Token-issuance success
   - target 99% · -5pp `At risk` `Board`
2. **8 ms**
   - p99 detokenize
   - target 10 ms `On plan` `SRE`
3. **0**
   - Examiner findings
   - target 0 `On plan` `Audit`
4. **3.2×**
   - Detokenize headroom
   - target 2× `On plan` `Platform`

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 02`

## Operations · `kpi ops` for SLO / SLA review.

---

<!-- _class: kpi ops -->
<!-- _header: '' -->
<!-- _footer: "kpi ops — 2×2 SLO grid; slipping metrics in --warn" -->

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

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 03`

## Compliance · `kpi compliance` for legal / regulatory posture.

---

<!-- _class: kpi compliance -->
<!-- _header: '' -->
<!-- _footer: "kpi compliance — binary-state pills with source footer" -->

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

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 04`

## Investor · `kpi trajectory` for period-over-period growth.

---

<!-- _class: kpi trajectory -->
<!-- _header: '' -->
<!-- _footer: "kpi trajectory — 4-up cards with categorical stripes" -->

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

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 05`

## Headline · `kpi spotlight` for the single hero metric.

---

<!-- _class: kpi spotlight -->
<!-- _header: '' -->
<!-- _footer: "kpi spotlight — monumentalised hero metric with body copy" -->

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

<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _footer: "Closing · closing" -->

# Authoring at a glance

`One contract across all five modifiers`

Class: `kpi {briefing|ops|compliance|trajectory|spotlight}` — composable with `attention`.

```markdown
### Domain · Period
## Headline statement.

1. **figure**
   - Label
   - target / trend `Status` `Audience`
```
