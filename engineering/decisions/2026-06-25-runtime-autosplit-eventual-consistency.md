---
status: proposed
summary: Locks the future architecture for runtime (live) auto-split — the one move the Fit Spine flatly rejected. The rejection held only against UNBOUNDED live re-pagination; a BOUNDED form is sound and is adopted as the chosen direction (not yet built): split fires only in the portrait viewing family (never the landscape export artifact), references address LOGICAL slides (run-ids, never physical page numbers), and the count/anchor/rail values that depend on not-yet-computed splits render as RESERVED-SPACE placeholders filled by an eventual-consistency pass in main-thread idle time. The existing pure kernel (resplitDoc) is already measurement-fed and reused verbatim; the live DOM is just another measurer. Build-time auto-split (Option A) stays the shipping path for now; this doc is the spec the runtime work (Option B) is built against, tracked by a cut issue.
---

# Runtime auto-split via eventual consistency — Option B, locked

**Date:** 2026-06-25 · **Status:** Accepted in principle — **not yet built**;
Option A (build-time / emulator) remains the shipping path · **Decision owner:**
maintainer · **Supersedes-in-part:** the flat "live runtime re-pagination is
rejected" stance of `2026-06-22-the-fit-spine.md` §3/§4/§5/§9 — narrowed, see §6.

This doc decides *what the runtime auto-split system is* so that when it is built
it has one obvious shape and one reason to exist. It does **not** ship code. It
records the architecture we are committing to, and the bounded scope that makes
the spine's original objection no longer apply.

---

## 0. The decision in one paragraph

We keep **build-time auto-split (Option A)** — the emulator's measure→split→
re-measure loop over `lib/core/auto-split.js` — as the only shipping path **for
now**. We **lock Option B**, *runtime* auto-split, as the chosen future
architecture: the same pure kernel, driven by the **live DOM** as its measurer,
gated to the **portrait viewing family**, addressing slides by **logical run-id**
(never physical page number), with every value that depends on a not-yet-computed
split rendered as a **reserved-space placeholder** and reconciled by an
**eventual-consistency** pass in main-thread idle time. The user sees the visible
slide immediately; correctness lands a few frames later and the gap is
imperceptible.

---

## 1. Why the spine rejected this — and why the rejection was too broad

The Fit Spine (§3, §4 inversion, §5 "Stays rejected", §9.3) rejects **live
runtime re-pagination** outright. The stated reason (§3, §4): *"re-breaking and
re-numbering slides as a phone rotates is churn and a navigation/anchor
maintenance nightmare."*

That reason is correct **about the thing it describes** — *unbounded* live
re-pagination, where every resize re-breaks the whole deck and physical page
numbers (the thing links and "see slide N" point at) churn underneath the
reader. The Munger inversion in §4 nailed the real failure mode: **physical-page
instability**, not the splitting compute.

But the rejection was written as a property of *re-pagination itself*, when it is
actually a property of **two implementation choices** that re-pagination does not
require:

1. **Re-paginating on every box change** (including landscape, including resize
   churn), rather than only where a split can ever be needed.
2. **Addressing slides by physical page number**, so a split invalidates every
   reference downstream of it.

Remove those two choices and the nightmare the spine forbade cannot occur. That
is Option B.

---

## 2. The three moves that make it bounded

### 2.1 Gate to the portrait viewing family — the landscape artifact is untouched

Split fires **only** in the portrait family (`portrait` · `square` · `story` ·
`mobile` = `PORTRAIT_SIZES`), reusing the existing predicate
(`orientationFor(geom).name !== 'landscape'`) rather than a new list. In a
landscape / 4K box, moves 1–2 (collapse, shed) resolve overflow before split is
reached — exactly as the spine's §3 already states for the build-time pass.

The consequence that dissolves the spine's biggest worry: **the canonical
exported artifact is landscape and never enters this path.** There is no
export-vs-runtime divergence to manage, because the artifact of record does not
split, and a portrait *view* is already a different layout by design (it has
different type and reflow — `data-orientation`, spine §2.2). We are not breaking a
determinism contract; we are rendering a view that was always allowed to differ.

### 2.2 Logical addressing — a split can never invalidate a reference

References resolve to the **logical slide** — the **run-id** the kernel already
mints — never to a physical page number. This is not new machinery: `auto-split.js`
already drops the engine `id=` on continuation copies and groups a split set under
one stable run-id (the original slide's id; `runIdOf`, lines 62–69), and
`applyRails` stamps k-of-N only once the converged deck is known. That *is*
logical addressing; Option B extends it from the rail to all cross-references.

With logical addressing, splitting is a pure **display** concern. A link that
named a logical slide is still valid after that slide splits into three — it
points at the run, and the run still exists. The §4 "anchor maintenance
nightmare" was a nightmare of *physical* anchors; logical anchors have nothing to
maintain.

### 2.3 Placeholders + eventual consistency — the only genuinely hard part, dissolved

The one thing virtualized rendering (only the visible slide mounted) makes
*harder*: you cannot know how many sub-slides slide 12 produces until you have
measured it, so the **total count**, **"see slide N" display numbers**, and the
**k-of-N rail** are unknown for slides not yet visited.

Resolution: **render them as reserved-space placeholders now; compute the
logical→physical map progressively; fill the placeholders in place.** The reader
never waits on the math. A link briefly shows "slide —" before "slide 14"; the
rail shows its slot before its count. This is eventual consistency, and it is the
*correct* model precisely because the thing being deferred (a display number) is
cosmetic, while the thing that is immediate (the logical reference) is correct
from frame one.

---

## 3. The kernel is already runtime-shaped — reuse, don't rebuild (HARD #1)

`resplitDoc` (`lib/core/auto-split.js`) **does not measure anything**. It takes
overflow ratios in (`scrollHeight/clientHeight` per slide) and splits. The
emulator produces those ratios with a headless render; the runtime produces the
*same input shape* by reading `el.scrollHeight / el.clientHeight` on the mounted
slide. So Option B adds **no new splitting algorithm** — it points the existing
measurement-fed loop at a live element. One pure kernel, two measurers
(headless / live), per HARD #1. This is the whole reason the kernel was written
pure and measurement-fed in P4.

**Shared surface, consumed by every path:**

| Path | Measurer | Status |
|---|---|---|
| Emulator / export (Option A) | headless render in `lattice-emulator.js` | shipped |
| VS Code preview | live DOM, idle-time | Option B |
| Published HTML | live DOM, idle-time | Option B |
| Drawing board | live DOM (injected runtime) | Option B — free, no DB-specific code |
| Playground | live DOM | Option B |

The drawing board and playground inject the runtime into their preview iframe, so
runtime auto-split lands there with no surface-specific code.

---

## 4. The one footgun, and the two guards

The fill must **never reflow the slide currently being measured**, or you get a
feedback loop: *fill → reflow → re-overflow → re-split*.

- **Reserve final space.** Placeholders occupy their settled size up front — a
  fixed-width numeric slot (`tabular-nums` / a min-width box for the rail) — so a
  digit count arriving moves nothing around it.
- **Fill off the measure path.** The measure loop only *reads* geometry; the fill
  only *writes* into reserved slots. A write can never invalidate a measurement
  that is already committed.

With both, the fill is layout-neutral and the loop converges.

## 4.1 Why there is no Web Worker here (named so it stays rejected)

A tempting framing is "do the math in a background worker." **A Web Worker has no
DOM** — no `getBoundingClientRect`, no `scrollHeight`, no node mutation — so it
can neither measure layout nor rewrite references. Measurement is **main-thread by
physics**. The "background" in eventual consistency is `requestIdleCallback` /
chunked main-thread work, not a second thread. The reconciliation (renumber,
remap) is trivial pure data and does not need a worker anyway. **Worker-based
measurement is rejected** as physically impossible; recording it so it is not
re-proposed.

---

## 5. Scope — what Option B is and is not

**In scope (when built):**
- Live split of the visible slide in the portrait family, via `resplitDoc` on
  live-DOM ratios.
- Logical (run-id) addressing for all cross-references, total count, and rail.
- Reserved-space placeholders + an idle-time eventual-consistency fill.
- One shared kernel across emulator, VS Code preview, published HTML, drawing
  board, playground.

**Out of scope / unchanged:**
- The **landscape export artifact** — never splits; remains the single source of
  physical truth.
- The **build-time pass (Option A)** — stays the shipping path; Option B does not
  remove it (a no-JS static export still needs build-time split).
- **Shrink-to-fit** — still does not exist (spine §3 floor is untouched).
- **Collapse / shed** — still continuous Frame CSS; Option B only changes *split*.

**Non-goals:** re-paginating on every resize (we split once per logical slide on
first measure, not on fluid churn); physical-page anchors (retired by §2.2).

---

## 6. What this changes in the spine

The Fit Spine's "Live runtime re-pagination — **rejected**" (§3, §4, §5 "Stays
rejected", §9.3) is **narrowed, not reversed**:

- **Still rejected:** *unbounded* live re-pagination — re-breaking the whole deck
  on every box change, and any physical-page addressing.
- **Accepted in principle (this doc):** *bounded* live split — portrait family
  only, logical addressing, eventual-consistency placeholders, landscape artifact
  untouched, one shared kernel.

The spine's §5 entry is annotated with a pointer here. No spine *behavior* changes
today: Option A remains what ships, and `auto-split.js`'s "build-time only" comment
stays accurate until Option B is implemented.

---

## 7. Open questions (carried to the tracking issue, not blocking this decision)

1. **Reference inventory:** does anything in the runtime/nav today address a slide
   by *physical page number*? If yes, that retirement is Option B's first slice.
   (Grep of `lib/runtime`, nav, and any "see slide" / `#`-anchor emission.)
2. **Scroll-anchor preservation:** when the visible slide splits while it is on
   screen, the reader's position must stay put (anchor to the run-id top, not the
   physical index).
3. **Idle budget / debounce:** the cadence of the progressive measurement pass so
   it never competes with interaction.
4. **First-paint placeholder policy:** which values render as placeholders vs.
   are cheap enough to compute eagerly for the visible slide alone.
5. **Persona-2 emailed-link reader:** confirm it receives the per-device
   build-time export (Option A), so Option B is purely an *interactive-surface*
   enhancement, never the artifact path.

These are implementation questions; none reopen the architecture decided above.
