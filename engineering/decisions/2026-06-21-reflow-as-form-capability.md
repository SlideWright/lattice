---
status: proposed
summary: Design model for making reflow a *Form* capability rather than 25 per-component @container solutions. The Form model (design/forms.md) already gives a slide a coordinate system — a Frame slices the box into Cells; Cells are resolution-blind (relative units → px at any scale). But that scale-invariance is NOT aspect-awareness: a Frame's slicing is rigid across box shapes. Reflow is the missing axis — the same Form evaluated at a different box. The four-family taxonomy (lib/adaptive/families.js: wide/square/tall/strip, each with an intent) already encodes the aspect axis; the missing middle is the RESPONSIVE-FRAME CONTRACT: a Frame declares its slicing per aspect-family, so the masthead band stacks, the stage goes single-column, and the progress rail repositions/sheds — top-down — while the component (Tile) only fills whatever Cell it's handed. This subsumes the per-component reflow (demoted to the Tile-in-its-Cell leaf behaviour) and composes with the fluid-box viewer (#472 supplies the live box). "Infinite looks" = Frame × family-slicing × resolution × theme. Proposes the contract, how it layers on Mechanism B (flex + in-flow bands), and a staged path (one Frame proven in phone-view, then the catalog, then graduate the sovereign frames).
version: 1
supersedes: none
builds-on: 2026-06-21-fluid-box-viewer-design.md, 2026-06-20-native-to-reflow-feasibility.md
---

# Reflow as a Form capability — the responsive-Frame contract

**Date:** 2026-06-21
**Status:** Proposed (design model; no code changed)
**Decision owner:** maintainer

This lifts the responsive question one final level. The native→reflow study and
the fluid-box keystone (#472) made *components* reflow and gave the deck a live
box on a phone. This doc argues that reflow's real home is the **Form** model —
that "infinite looks" and "responsive" are the **same** mechanism — and specifies
the contract that makes it so.

---

## 1. The reframe — reflow is the box axis of the Form grammar

Form (`design/forms.md`) is not a layout; it is a **generative grammar**: a
**Frame** slices a box into **Cells**; each Cell holds a **Tile**. A "look" is a
point in a product space:

> **(which Frame) × (which box) × (resolution) × (theme) → a look.**

Authoring variety is one axis (pick a Frame, get a composition). **Reflow is
just the *box* axis of the same product** — hold content + Frame fixed, change
the box shape, and the Frame re-slices. A phone is not a special "responsive
mode"; it is the same Form evaluated at a 9:19.5 box instead of 16:9. That is why
the maintainer's framing — *"I invented [Form] to create infinite looks"* — and
"make a deck read on a phone" are the same idea: a composition that is a
**function of its box**, not a fixed picture.

## 2. What already holds, and the one thing that doesn't

**Holds — Cells are resolution-blind (`forms.md` §6).** A Cell is defined in
*relative* units (% of the slide) and resolves to a concrete px box at any
resolution. There is no "HD Cell" and "4K Cell" — one definition, resolved at a
render-time `size:`. This is the same discipline as palette-blind layouts.

**Doesn't — Frame slicing is aspect-rigid.** Resolution-blindness is
*scale*-invariance (16:9 at HD vs 16:9 at 4K — same proportions, different
pixels). It says nothing about *aspect*. A Frame's `subGrid` (its Cell
arrangement) is **fixed across box shapes**: the `standard` root Frame slices the
same masthead-band-over-stage whether the box is 16:9 or 9:19.5. Survey confirms
it: **no Frame or Cell manifest in `lib/forms/` carries an aspect/orientation
variant today.**

So the gap is exact and small to name: **make the Frame's slicing a function of
the box's aspect, the way the Cell's resolution is already a function of `size:`.**

## 3. The axis already exists — the four families

`lib/adaptive/families.js` already classifies a box by aspect-ratio into four
families, each with a stated **intent** — and the intents *are* the reflow
targets:

| Family | aspect-ratio | Intent (verbatim) |
|---|---|---|
| **wide** | > 1.05 | horizontal — side-by-side, multi-column |
| **square** | 0.9–1.05 | balanced — 2×2 grids, 2-up |
| **tall** | 0.5–0.9 | vertical-leaning — 1–2 columns, paired rows |
| **strip** | ≤ 0.5 | single-column stream, biggest type, shed tertiary |

The taxonomy and the per-box `@container (aspect-ratio …)` form already ship (the
Tier-A component reflows use them). What is missing is a consumer **one level
up**: the Frame.

## 4. The contract — a Frame is a function from family → slicing

**Responsive-Frame contract:** a Frame declares, per aspect-family, *how it
slices the box into Cells*. The Cell stays resolution-blind **within** a family;
the Frame chooses **which** Cell arrangement the family gets.

Concretely, the `standard` root Frame:

| Cell | wide / square | tall | strip |
|---|---|---|---|
| **masthead** (kicker · title · meta) | a band across the top; lede ∥ bay side-by-side | band; lede over bay | band; title only, meta sheds to footer |
| **stage** (the content Tile) | as authored (multi-column ok) | 1–2 columns | single column, biggest type |
| **footer / progress rail** | full-width rail | rail | rail collapses to a thin tick / sheds |

The **chrome Cells reflow as first-class Cells** — the band stacks, the rail
repositions or sheds in `strip` — which is exactly the behaviour the islands
chrome lacks today (a deck with `islands: on` viewed in portrait currently
reflows its *content* but leaves the band/rail unadapted).

**Where family selection comes from — DECIDED: runtime-stamped `data-family`.**
The runtime classifies the measured box via `families.js` and stamps
`data-family` (wide/square/tall/strip) on each section — the same path that
already stamps `data-orientation`. Frames key on `[data-family="…"]`. The
consequence is deliberate and correct: reflow fires **only where the runtime
runs** — the fluid viewer (#472 inlines it) and the live playground — never a
plain fixed export, which has a fixed authored box and needs no reflow. The
manifest's *default* (unstamped) slicing is the authored / `wide` look, so a
runtime-less render is byte-unchanged. (Pure-CSS `@container` was considered and
not chosen: it would couple every Frame to container-query plumbing and split the
family definition away from the `families.js` classifier the runtime and the
Tier-A component reflows already share.)

## 5. How this subsumes today's reflow (nothing is wasted)

Reflow stops being **25 components each answering "what do I do in a tall box?"**
and becomes **one contract: the Frame re-slices; the Tile fills.** The pieces
already built are not discarded — they are **re-leveled**:

- **Fluid-box viewer (#472)** = supplies the **live box** (viewport-sized)
  instead of the bolted authored aspect. The substrate this needs.
- **Family resolver (`families.js`)** = classifies that box → family.
- **Responsive Frame** *(new)* = re-slices the Cells for the family — **top-down**.
- **Per-component `@container` reflow** = the **Tile-in-its-Cell leaf behaviour**
  — how a component copes with whatever Cell shape it is handed. Still needed,
  demoted from "the responsive strategy" to "the local fill."
- **Phone-view toggle (#479)** = the **preview surface** to watch a Frame
  re-slice as you author.

## 6. It rides Mechanism B — no grid migration

Form's canonical mechanism is **B: flex + in-flow bands** (`forms.md` §10;
`2026-06-16-retire-section-as-grid.md`) — `section` stays a flex column, Cells
are in-flow content-height bands, component bodies stay direct children of
`section`. Section-as-grid (A) was **retired partly because a fixed-track grid
costs responsiveness**. That is a gift here: **flex re-slices naturally** — a band
that is `flex-direction:row` in `wide` becomes `column` in `strip` with one
`@container` rule, no per-component DOM migration. The responsive-Frame contract
is therefore *additive* to B: per-family rules keyed on the runtime-stamped
`[data-family]` — same-band changes as co-authored, manifest-gated CSS; cross-band
relocation as a generated table the runtime applies (§7) — authored once per
Frame, not across 373 component selectors.

## 7. Decisions (the forks for the build)

1. **Selection mechanism — DECIDED: runtime-stamped `data-family`** (§4). The
   runtime classifies the measured box via `families.js` and stamps `data-family`;
   Frames key on `[data-family]`. Reflow is therefore a *runtime* capability (the
   fluid viewer + the live playground), not a fixed-export one — by design. Pure
   CSS `@container` was considered and not chosen (it splits the family definition
   from the shared `families.js` classifier).
2. **Where per-family slicing is authored — DECIDED: manifest-declared, realized
   by *light coupling*.** Each Frame manifest carries a `slicing` block (per-family
   cell-placement — see (3)). Consistent with the forms manifest↔CSS *light
   coupling* (`2026-06-16-form-manifest-medium-independent-contract.md`, which
   chose independence over generation), it splits by genuine need: **same-band**
   changes (per-family token values, band direction) are **co-authored
   `[data-family]` CSS** in the Cell folder, **gated** against the manifest (the
   established forms pattern); **cross-band relocation** is **generated** from
   `slicing` into a relocation table the runtime reads — because the runtime
   cannot read manifests. Generation lands only where there is a real data need,
   not a second authoring path. The default (unstamped) slicing is the
   `wide`/authored look.
3. **Slicing is a per-family cell-PLACEMENT map — relocation, not suppression
   (supersedes the original §7.3).** `slicing.<family>` maps a Cell →
   `{ region, geometry-tokens }` (or `region: null` *only* when content is
   genuinely redundant at that box). The three apparent features — geometry tweak,
   reorder, relocate — are one mechanism: **a Cell's region + geometry are a
   function of family.** Suppression is the degenerate `region: null` escape hatch
   for redundant content, **not** the default — dropping authored content silently
   is the fade decision `forms.md` §6 already rejects (clip+ring over fade: a
   delivered slide must not lose content). So when `strip` "sheds tertiary," the
   masthead bay **relocates to the footer**; it does not vanish. Slicing lives on
   the **Frame** (the slicer), never the Cell — a Cell's region can differ between
   Frames.

   *Freedom of movement, bounded — but not by a whitelist.* Reflow needs cells to
   move freely; the bound is the **existing kind-contract** (`forms.md` §7 — a
   Cell `accepts` by KIND, a Tile `fits` by KIND, *never by name*). A chrome Tile
   relocates freely to any region that accepts chrome; it cannot land in a slot of
   the wrong kind (a content component in the rail is a category error, not a
   reflow). The only invariants held under all that movement are the **box
   guarantees** (`forms.md` §6 — every Cell still resolves to a real box, keeps its
   gap, clips not bleeds). The designer composes the movement (Form is a structural
   theme — judgement, not an enum); the engine enforces only kind-fit + the box
   guarantee. A per-cell placement *whitelist* was considered and **rejected**: it
   caps "infinite looks" and re-couples by name — the very thing §7 forbids.
4. **Scope vs the per-component Tier work** — does this *replace* the remaining
   per-component reflow backlog, or layer above the parts already done?
   Recommendation: layer above — the Tier-A component reflows become the leaf
   contract; no rework.

## 8. Staged path (prove one Frame, then the catalog)

1. **This PR:** this design model.
2. **Spike:** the `standard` root Frame, end-to-end, reflowing wide→tall→strip —
   masthead band stacks (same-band), the masthead bay **relocates to the footer**
   in strip (cross-band), one content component fills the narrowing stage. Verify
   on the **#472 fluid export at a phone viewport** (the parked #479 phone-view is
   a convenience surface, not a prerequisite).
3. **Catalog:** roll the per-family slicing across the Frame catalog (the 12 Form
   values), manifest-declared.
4. **Graduate the sovereigns:** `split-panel` already flips via `data-orientation`
   — fold it into the contract (it becomes a Frame with a `tall`/`strip` slicing),
   retiring the coarse stamp.
5. **Then** the islands→Form rename sweep (`forms.md` §10) lands on a model that is
   now also responsive.

## 9. Why this is the right altitude

The native→reflow study warned that "lots of layouts are native" was *partly a
misframing*. This is the rest of that thought: "native vs reflow" is a
**per-component** distinction that dissolves once reflow is a **Frame** property.
A component is `native` only relative to a Cell shape; give the Frame the job of
choosing the Cell shape per box, and "native" becomes "the Tile fills its Cell" —
true at every box. One contract, not a 25-row capability matrix. That is what
makes the looks *infinite* instead of *enumerated*.
