---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · Radar"
---

<!-- _class: title -->
<!-- _paginate: false -->

`Lattice · Feature deck`

# Six radar charts, one source contract.

Native SVG radar. Series-major Markdown. Auto-fitting scale. No Mermaid, no charting library.

---

<!-- _class: subtopic -->

## What this deck shows.

A radar chart authored as a plain nested list — each top-level item is a series, each nested item is an `axis` with a trailing `value`. `lib/radar.js` parses the list, resolves the value scale (auto-fit to the data, or pinned by the eyebrow), and emits a positioned SVG at build time. One default plus five modifiers — `target`, `delta`, `benchmark`, `quadrant`, `small-multiples` — each answering a distinct boardroom question. `minimal` and `dark` compose on top of any of them. Palette-blind, deterministic, zero client-side JavaScript.

---

<!-- _class: radar -->
<!-- _footer: "Default — radar" -->

`Scale · 0–10`

## How we stack up across the buying criteria.

- Lattice
  - Performance `9`
  - Pricing `7`
  - Support `8`
  - Ecosystem `6`
  - Security `9`
- Rival North
  - Performance `7`
  - Pricing `8`
  - Support `6`
  - Ecosystem `9`
  - Security `7`
- Rival West
  - Performance `6`
  - Pricing `5`
  - Support `7`
  - Ecosystem `7`
  - Security `8`

The default variant overlays every series as a translucent filled polygon, colour-cycled through the categorical palette. The first series fixes the axis order; the rest align by axis label. Use it to compare two or three profiles at a glance — beyond three, reach for `small-multiples`.

---

<!-- _class: radar target -->
<!-- _footer: "Modifier — radar target" -->

`Scale · 0–100`

## Where we are against the quarter plan.

- Actual
  - Hiring `72`
  - Runway `88`
  - Pipeline `54`
  - Retention `91`
  - Compliance `66`
  - Velocity `78`
- Target
  - Hiring `90`
  - Runway `85`
  - Pipeline `80`
  - Retention `90`
  - Compliance `95`
  - Velocity `75`

The `target` variant reads the series named `Target` (or `Goal`/`Plan`) as a dashed reference polygon. Every axis where the actual falls short gets a rose gap segment along the spoke; where it clears the bar, a quiet green one. The shortfall is the read — no eyeballing required.

---

<!-- _class: radar delta -->
<!-- _footer: "Modifier — radar delta" -->

`Scale · 0–10`

## What moved over the half, and which way.

- H1
  - Velocity `5`
  - Quality `6`
  - Morale `4`
  - Coverage `5`
  - Onboarding `3`
- H2
  - Velocity `8`
  - Quality `7`
  - Morale `4`
  - Coverage `6`
  - Onboarding `7`

The `delta` variant takes exactly two series — before, then after. The before polygon is drawn muted; a change segment rides each spoke, green where the metric rose, rose where it fell, faint where it held. Built for the period-over-period story in a QBR.

---

<!-- _class: radar benchmark -->
<!-- _footer: "Modifier — radar benchmark" -->

`Scale · 0–10`

## Are we inside the pack, or outside it.

- Us
  - Performance `9`
  - Price `6`
  - Support `8`
  - Ecosystem `7`
  - Docs `9`
  - Security `8`
- Competitor A
  - Performance `7`
  - Price `8`
  - Support `6`
  - Ecosystem `9`
  - Docs `5`
  - Security `7`
- Competitor B
  - Performance `6`
  - Price `9`
  - Support `7`
  - Ecosystem `6`
  - Docs `6`
  - Security `6`
- Competitor C
  - Performance `8`
  - Price `5`
  - Support `5`
  - Ecosystem `8`
  - Docs `7`
  - Security `9`

The `benchmark` variant draws the first series as the hero line and collapses every other series into a single min–max envelope band. Instead of five tangled polygons, you get one shape and your line — strong where you clear the band, exposed where you sit inside it.

---

<!-- _class: radar quadrant -->
<!-- _footer: "Modifier — radar quadrant" -->

`Scale · 0–5`

## Our capability profile, read by theme.

- Our capability
  - People
    - Hiring `4`
    - Retention `3`
    - Bench depth `2`
  - Process
    - Cadence `5`
    - Rigor `4`
  - Technology
    - Platform `4`
    - Tooling `3`
    - Automation `2`
  - Risk
    - Compliance `3`
    - Resilience `4`

The `quadrant` variant takes a three-level list — series, then group, then axis. Each group becomes a tinted sector with its name on the rim and a dashed mean arc marking the theme's average. Boards think in themes, not in twelve loose axes.

---

<!-- _class: radar small-multiples -->
<!-- _footer: "Modifier — radar small-multiples" -->

`Scale · 0–10`

## Four product lines, the same five criteria.

- Atlas
  - Adoption `8`
  - Margin `6`
  - NPS `7`
  - Velocity `9`
  - Risk `4`
- Beacon
  - Adoption `5`
  - Margin `9`
  - NPS `6`
  - Velocity `5`
  - Risk `7`
- Cinder
  - Adoption `7`
  - Margin `4`
  - NPS `8`
  - Velocity `6`
  - Risk `5`
- Drift
  - Adoption `6`
  - Margin `7`
  - NPS `5`
  - Velocity `7`
  - Risk `8`

The `small-multiples` variant gives each series its own mini radar on a shared scale, laid out in a row. When an overlay would be mush — four or more series — this is the honest read: scan the shapes, spot the outlier.

---

<!-- _class: closing -->
<!-- _paginate: false -->

`Lattice · Feature deck`

# Inspect, then merge.

One default and five modifiers. One Markdown source contract. Palette-blind, deterministic, zero dependencies.
