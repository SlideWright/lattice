---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · Quadrant"
---

<!-- _class: title -->
<!-- _paginate: false -->

`Lattice · Feature deck`

# Six quadrant charts, one source contract.

Native SVG 2×2 chart. Group-by-quadrant Markdown. Eyebrow-declared scale.
No Mermaid, no charting library.

---

<!-- _class: subtopic -->

## What this deck shows.

A 2×2 quadrant chart authored as a plain nested list — each top-level item is a quadrant label (reading order TL → TR → BL → BR), each nested item is a plotted record `name <code>x, y</code>`. `lib/quadrant.js` parses the list, resolves per-axis scale from the eyebrow (auto-fits when omitted), and emits a positioned SVG at build time. One default plus five modifiers — `bubble`, `trail`, `cohort`, `threshold`, `magic` — each answering a distinct boardroom question. `minimal` and `dark` compose on top of any of them. Palette-blind, deterministic, zero client-side JavaScript.

---

<!-- _class: quadrant -->
<!-- _footer: "Default — quadrant" -->

`Effort 0–10 → Reach 0–100`

## Where to put the next dollar.

- Strategic Bets
  - Codebook caching `3, 70`
  - Multi-tenant DEKs `5, 85`
- Quick Wins
  - Per-purpose codebooks `8, 80`
  - Snapshot exports `9, 55`
- Defer
  - Vendor scoping `2, 30`
  - Manual rotation `1, 22`
- Time Sinks
  - Custom audit log UI `7, 18`
  - Bespoke SCIM `9, 28`

The default variant lays four palette-tinted regions over a centerlined plot box, places dots by `x, y`, and labels each dot when the population is small enough to read. Top-level group names label the four corners — reading order Z-pattern, top to bottom, left to right. The eyebrow names both axes and pins their scale; omit either side and the engine nice-ceils the data instead. One chart, four named stories — the audience reads "where things sit" before you say a word.

---

<!-- _class: quadrant bubble -->
<!-- _footer: "Modifier — quadrant bubble" -->

`Effort 0–10 → Reach 0–100`

## Where the value sits, sized by deal size.

- Strategic Bets
  - Acme `3, 70, 8.2`
  - Northwind `5, 85, 5.4`
- Quick Wins
  - Initech `8, 80, 1.1`
  - Globex `9, 55, 0.8`
- Defer
  - Soylent `2, 30, 2.5`
  - Aperture `1, 22, 0.6`
- Time Sinks
  - Hooli `7, 18, 4.1`

The `bubble` variant takes a third comma-separated value per item and √-scales it into the dot radius — so AREA, not radius, is proportional to magnitude. That's the only honest size encoding; linear-r doubles the apparent value at half the data. Magnitudes ≥ ~11px render the pill inside the bubble; smaller bubbles get a chip above. The corner labels stay; the value pill can be anything that parses as a number — `8.2M`, `1.1%`, `4.1` all work and render verbatim.

---

<!-- _class: quadrant trail -->
<!-- _footer: "Modifier — quadrant trail" -->

`Effort 0–10 → Reach 0–100`

## What moved this quarter.

- Strategic Bets
  - Acme `3, 60` `4, 78`
  - Northwind `4, 70` `6, 86`
- Quick Wins
  - Initech `7, 50` `8, 78`
- Defer
  - Soylent `3, 22` `2, 30`
- Time Sinks
  - Hooli `5, 30` `7, 18`

The `trail` variant takes two coord pills per item — before, then after. The before-position renders as a faded ring, the after as a solid filled dot, and a dashed segment connects them. The eye reads the direction of the arrow before it reads the label, so the story is "what moved, and which way" without a single annotation. Items that didn't move (one pill only) render as a normal dot — mixing trail and stay items on the same slide reads cleanly.

---

<!-- _class: quadrant cohort -->
<!-- _footer: "Modifier — quadrant cohort" -->

`Pricing power → Brand strength`

## Where each segment of the market lives.

- Enterprise
  - Acme `8, 9`
  - Northwind `7, 8`
  - Initech `9, 8`
  - Globex `8, 7`
- Mid-market
  - Soylent `5, 6`
  - Aperture `6, 5`
  - Hooli `4, 6`
  - Pied Piper `5, 7`
- SMB
  - Stark `3, 4`
  - Wayne `2, 3`
  - Wonka `3, 3`
  - Tyrell `2, 5`
- Long tail
  - Cyberdyne `2, 1`
  - Umbrella `1, 2`
  - Weyland `3, 2`

The `cohort` variant treats top-level groups as cohorts rather than quadrant labels — items color by group, and a convex-hull region tints each cohort's footprint. Hulls are deterministic (Andrew's monotone-chain): the same data plots the same shape every time. Cohort labels live AT each hull's centroid, sized to read across the chart. A right-side legend carries per-cohort item counts. The chart says "Enterprise lives top-right, SMB hugs the bottom-left" in one glance, no annotation needed.

---

<!-- _class: quadrant threshold -->
<!-- _footer: "Modifier — quadrant threshold · targets 6, 75" -->

`Velocity 0–10 → Quality 0–100 · targets 6, 75`

## Who clears both bars.

- On Pace
  - Platform `7, 82`
  - Identity `8, 90`
- Star
  - Payments `9, 95`
- At Risk
  - Search `3, 60`
  - Notifications `4, 55`
- Lagging
  - Reporting `7, 40`
  - Analytics `8, 35`

The `threshold` variant replaces the chart's midlines with explicit target lines, drawn dashed. The eyebrow's trailing `· targets <tx>, <ty>` pins the crossing point; both targets render as numeric badges at the axes. The four zones get action-oriented names — Star (above both), On Pace (above one, near the other), Lagging (below one), At Risk (below both). Where author-supplied group names exist they override the defaults — useful when the OKR vocabulary belongs to the team, not the framework.

---

<!-- _class: quadrant magic -->
<!-- _footer: "Modifier — quadrant magic" -->

`Completeness of Vision 0–10 → Ability to Execute 0–10`

## The market read at a glance.

- Challengers
  - Megacorp `3, 8`
  - BlueGiant `4, 7`
- Leaders
  - Acme `8, 9`
  - Northwind `7, 8`
- Niche Players
  - Soylent `2, 3`
  - Aperture `3, 2`
- Visionaries
  - Initech `8, 4`
  - Hooli `9, 3`

The `magic` variant is a Gartner-Magic-Quadrant tribute — same scatter, dressed for the boardroom. The four corner labels default to **CHALLENGERS / LEADERS / NICHE PLAYERS / VISIONARIES** unless the author supplies their own. The axes default to **Completeness of Vision** and **Ability to Execute**, again overridable. Every dot is labelled inline; the typography sits a step heavier than the default variant, with extra letterspacing on the corner labels — the iconic vocabulary, no charting library required.

---

<!-- _class: closing -->
<!-- _paginate: false -->

`Lattice · Feature deck`

# Inspect, then merge.

One default and five modifiers. One Markdown source contract. Palette-blind, deterministic, zero dependencies.
