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
<!-- _footer: "Quadrant · default" -->

`Effort 0–10 → Reach 0–100`

## Where to put the next dollar.

Effort estimated in story-points; reach as percent of addressable users.

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

_Illustrative · 8 candidate initiatives._

---

<!-- _class: quadrant bubble -->
<!-- _footer: "Quadrant · bubble" -->

`Effort 0–10 → Reach 0–100`

## Where the value sits, sized by deal size.

Bubble area scales with annual contract value, in millions.

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

_Illustrative · 7 prospects · ACV in USD millions._

---

<!-- _class: quadrant trail -->
<!-- _footer: "Quadrant · trail" -->

`Effort 0–10 → Reach 0–100`

## What moved this quarter.

Faded ring is last quarter's position; solid dot is now.

- Strategic Bets
  - Acme `3, 60` `4, 78`
  - Northwind `4, 70` `6, 86`
- Quick Wins
  - Initech `7, 50` `8, 78`
- Defer
  - Soylent `3, 22` `2, 30`
- Time Sinks
  - Hooli `5, 30` `7, 18`

_Illustrative · 5 movers · Q3 2025 → Q4 2025._

---

<!-- _class: quadrant cohort -->
<!-- _footer: "Quadrant · cohort" -->

`Pricing power → Brand strength`

## Where each segment of the market lives.

Convex hulls per cohort — deterministic geometry, same data → same shape.

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

_Illustrative · 15 firms · 4 cohorts._

---

<!-- _class: quadrant threshold -->
<!-- _footer: "Quadrant · threshold" -->

`Velocity 0–10 → Quality 0–100 · targets 6, 75`

## Who clears both bars.

Both targets pulled from last quarter's OKR review; lines redrawn each cycle.

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

_Illustrative · 7 services · 2026 H1 OKR bar._

---

<!-- _class: quadrant magic -->
<!-- _footer: "Quadrant · magic" -->

`Completeness of Vision 0–10 → Ability to Execute 0–10`

## The market read at a glance.

Canonical Gartner labels by default; author-supplied group names take over.

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

_Illustrative · 8 vendors · 2026 market assessment._

---

<!-- _class: closing -->
<!-- _paginate: false -->

`Lattice · Feature deck`

# Inspect, then merge.

One default and five modifiers. One Markdown source contract. Palette-blind, deterministic, zero dependencies.
