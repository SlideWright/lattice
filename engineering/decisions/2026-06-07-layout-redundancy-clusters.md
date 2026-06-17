---
status: shipped
summary: Decision-aid deck rendering each redundancy cluster's members with parallel content to show keep / merge / drop calls
marp: true
size: 4K
theme: atelier
paginate: true
header: "Lattice · Layout redundancy clusters — keep / merge / drop"
---

<!-- _class: title silent -->

# Layout redundancy — the five clusters

`Decision aid · 2026-06-07`

Each section renders every member of a cluster with parallel content. Near-identical renders = the redundancy argument.

---

<!-- _class: content -->

## How to read this deck

- **[KEEP]** — survives as the base component.
- **[MERGE → x]** — folds into the survivor as a variant.
- **[DROP → x]** — retired entirely; authors use the survivor.

Per your call: **hard break + migrate decks**, and **cards-side is fully dropped** (no alias).

---

<!-- _class: content -->

## Cluster 1 — Co-equal two-item split (3 → 1)

Keep **compare-prose**. Merge **before-after** (preset Before/After labels). Drop **cards-side** entirely. All three share one slot grammar: exactly two parallel items, bold title + nested body, side by side.

---

<!-- _class: compare-prose -->

## [KEEP] compare-prose

- Build in-house
  - Full control of the roadmap; higher fixed cost and a slower start.
- Buy a vendor
  - Live in weeks; recurring fees and limited customisation.

---

<!-- _class: before-after -->

## [MERGE → compare-prose] before-after

- Before
  - Manual reconciliation took three analysts a full week each month.
- After
  - The automated pipeline closes the books in under a day.

---

<!-- _class: cards-side -->

## [DROP → compare-prose] cards-side

- Left card title
  - Body text for the left card, two short sentences.
- Right card title
  - Body text for the right card, two short sentences.

---

<!-- _class: content -->

## Cluster 2 — Featured-panel split (6 → 4)

Same chrome on all six: a featured left panel + a right-side supporting list. **split-list / split-brief / split-statement / split-metric** differ only by what the left features (heading / lede / quote / number) → merge to one **split-panel**. **split-compare** and **split-statement** keep distinct right-side shapes — keep, but re-class `split` → `panel`.

---

<!-- _class: split-list -->

## [KEEP base] split-list

### Section rubric

- First point
  - Supporting sentence explaining the first point.
- Second point
  - Supporting sentence explaining the second point.
- Third point
  - Supporting sentence explaining the third point.

---

<!-- _class: split-brief -->

`[MERGE → split-panel] split-brief`

## Executive context anchors the brief.

One-sentence framing paragraph explaining what the findings cover.

- First finding
  - Supporting detail explaining the first finding.
- Second finding
  - Supporting detail explaining the second finding.
- Third finding
  - Supporting detail explaining the third finding.

---

<!-- _class: split-statement -->

> The quotation, one or two sentences worth committing half the slide to.

`[MERGE → split-panel] split-statement`

- First implication
  - What this quote means for the work in front of us.
- Second implication
  - A second-order consequence worth naming.
- Third implication
  - The action this quote argues for.

---

<!-- _class: split-metric -->

`[MERGE → split-panel] split-metric`

## 114*%*

Measurement window and qualifying detail in one short sentence.

- First supporting point.
  - Why this metric matters and what's driving it.
- Second supporting point.
  - What concentration or trend explains it.
- Third supporting point.
  - What this number unlocks or threatens.

---

<!-- _class: split-compare -->

`[KEEP · re-class to panel] split-compare`

## Headline that frames the choice.

One-sentence context paragraph explaining the stakes.

- Alternative option
  - First fact about the alternative
  - Second fact about the alternative
- Preferred option
  - First fact about the preferred path
  - Second fact about the preferred path

> The recommendation in one decisive sentence.

---

<!-- _class: split-steps -->

`[KEEP · re-class to panel] split-steps`

## Phase name

One-sentence summary describing what this phase produces.

1. First step
   - What happens and what gets produced.
2. Second step
   - What follows and how it's validated.
3. Third step
   - What closes the phase out.

---

<!-- _class: content -->

## Cluster 3 — Inventory one-line stacks (3 → 1)

Keep **list**. Merge **tldr** and **principles** — identical flat-list shape (no nested body), differing only in type weight and counter style. The first two slides use the *same content* to make the point.

---

<!-- _class: list -->

## [KEEP base] list

- The first takeaway as a complete one-line claim.
- The second takeaway as a complete one-line claim.
- The third takeaway as a complete one-line claim.
- The fourth takeaway as a complete one-line claim.

---

<!-- _class: tldr -->

## [MERGE → list] tldr

- The first takeaway as a complete one-line claim.
- The second takeaway as a complete one-line claim.
- The third takeaway as a complete one-line claim.
- The fourth takeaway as a complete one-line claim.

---

<!-- _class: principles -->

## [MERGE → list] principles

1. Default to the choice that is cheaper to reverse.
2. Document the decision, not the menu of options.
3. Reversible calls don't need a meeting.

---

<!-- _class: content -->

## Cluster 4 — Progression ordered steps (2 → 1)

Keep **list-steps**. Merge **timeline** as a density variant — same ordered-steps shape; list-steps' own docs say it is "more verbose than timeline." Same content on both slides.

---

<!-- _class: list-steps -->

## [KEEP base] list-steps

1. First stage — a sentence describing what you do here.
2. Second stage — a sentence describing what you do here.
3. Third stage — a sentence describing what you do here.
4. Fourth stage — a sentence describing what you do here.

---

<!-- _class: timeline -->

## [MERGE → list-steps] timeline

1. First stage
   - *A sentence describing what you do here.*
2. Second stage
   - *A sentence describing what you do here.*
3. Third stage
   - *A sentence describing what you do here.*
4. Fourth stage
   - *A sentence describing what you do here.*

---

<!-- _class: content -->

## Cluster 5 — Anchor divider (2 → 1)

Keep **divider**. Merge **subtopic** as the light variant — identical slots (eyebrow + heading); the only difference is dark vs light canvas, which is the `dark` universal modifier.

---

<!-- _class: divider -->

`[KEEP base] Section 01`

## Divider — dark canvas boundary

---

<!-- _class: subtopic -->

`[MERGE → divider light] Topic family`

## Subtopic — light canvas, same slots.

---

<!-- _class: content -->

## Net effect

- Cluster 1: 3 → 1 (−2)
- Cluster 2: 6 → 4 (−2)
- Cluster 3: 3 → 1 (−2)
- Cluster 4: 2 → 1 (−1)
- Cluster 5: 2 → 1 (−1)

**58 → ~50 components.** The confusing `split-` selection space is cut roughly in half.
