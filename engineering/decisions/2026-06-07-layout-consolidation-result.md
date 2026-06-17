---
status: shipped
summary: Result deck for the layout consolidation that removed four redundant components (58 to 54), each rendered live through its survivor
marp: true
size: 4K
theme: atelier
paginate: true
header: "Lattice · Layout consolidation — what shipped"
---

<!-- _class: title silent -->

# Layout consolidation — what shipped

`Result gallery · 2026-06-07`

Four redundant components removed (58 → 54). Each former layout now renders through a variant of the survivor — shown live on the following slides.

---

<!-- _class: content -->

## What changed

- **`subtopic`** → `divider light`
- **`tldr`** → `list takeaway`
- **`principles`** → `list principles`
- **`cards-side`** → dropped; authors use `compare-prose`

Every slide below uses the **new** class syntax — the rendering is the proof the merge is live.

---

<!-- _class: content -->

## Cluster 5 — subtopic → `divider light`

Same slots (eyebrow + heading); the only difference was dark-vs-light canvas, now carried by the `light` variant. The dark divider is unchanged.

---

<!-- _class: divider -->

`Section 02`

## Divider — dark canvas (unchanged)

---

<!-- _class: divider light -->

`The Framework · Component 02`

## divider light — the former subtopic, now a variant.

---

<!-- _class: content -->

## Cluster 3 — tldr & principles → `list` variants

Both were flat one-line-item stacks differing from `list` only in finish. Now `list takeaway` (hairline rows) and `list principles` (display-weight statements).

---

<!-- _class: list takeaway -->

## list takeaway — the former tldr.

- Q2 revenue missed plan by 9%, and three structural factors explain it.
- The shortfall is in enterprise renewals, not new logos.
- Every one of the three causes is fixable before the Q4 close.
- We are not asking for more headcount — only to move what we have.

---

<!-- _class: list takeaway numbered -->

## list takeaway numbered — counter composes.

- Q2 revenue missed plan by 9%, and three structural factors explain it.
- The shortfall is in enterprise renewals, not new logos.
- Every one of the three causes is fixable before the Q4 close.

---

<!-- _class: list principles -->

## list principles — the former principles.

1. Default to the choice that is cheaper to reverse.
2. Name the actor, never the system.
3. Write the bet on the same slide as the choice.
4. Optimise for the reader who wasn't there.

---

<!-- _class: list principles lettered -->

## list principles lettered — format composes.

1. Default to the choice that is cheaper to reverse.
2. Name the actor, never the system.
3. Write the bet on the same slide as the choice.

---

<!-- _class: content -->

## Cluster 1a — cards-side dropped → `compare-prose`

`cards-side` was `compare-prose` minus the comparison chrome — same two-co-equal-card shape — so it is gone with no alias. The same content now reads as compare-prose.

---

<!-- _class: compare-prose -->

## compare-prose — covers the former cards-side.

- Build in-house
  - Full control of the roadmap; higher fixed cost and a slower start.
- Buy a vendor
  - Live in weeks; recurring fees and limited customisation.

---

<!-- _class: list takeaway -->

## Net result

- Four duplicate components retired: subtopic, tldr, principles, cards-side.
- Catalog 58 → 54; every behaviour preserved as a variant or survivor.
- before-after and timeline deferred — shared-CSS entanglements documented.
- Cluster 2 (the split-* family) left as analysis-only per the brief.

---

<!-- _class: closing silent -->

## Same expressive range, four fewer ways to say the same thing.

`Lattice · layout-redundancy consolidation`
