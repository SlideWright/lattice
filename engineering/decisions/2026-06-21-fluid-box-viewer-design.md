---
status: shipped
summary: Design for the fluid-box viewer mode — the keystone that makes Lattice's already-built responsive runtime fire for the emailed-link-on-a-phone reader. Today every deck is a fixed-size artifact pinned to its authored aspect, so a phone gets a tiny letterboxed 16:9 rectangle; meanwhile the runtime already measures the live section and re-derives orientation/type/reflow on every resize — it just always measures the bolted-down authored box. Fluid mode unbolts the box for a *viewing* mode: the section sizes to the viewport, the phone makes it portrait, and the existing machinery fires reflow + the portrait type scale for free. Locked decisions — (1) reading model is one-slide-per-screen vertical scroll-snap (swipe), (2) opt-in only (off by default; a toggle / URL flag turns it on — NOT auto-on for shared HTML), (3) first slice is the keystone only (fluid box + reflow; no auto-shrink, no re-pagination). Additive and export-safe: the PDF and the canonical export HTML are untouched; fluid is a separate viewer output that keeps the runtime instead of stripping it.
version: 1
supersedes: none
builds-on: 2026-06-20-native-to-reflow-feasibility.md
---

# Fluid-box viewer mode — design

**Date:** 2026-06-21
**Status:** Shipped — keystone implemented in the same PR (§9)
**Decision owner:** maintainer (three forks locked 2026-06-21 — see § Decisions)

This is the design that the Part II feasibility study
(`2026-06-20-native-to-reflow-feasibility.md`) named **P0 — the keystone**.
Part II proved the responsive runtime is ~80% already built; this doc specifies
the missing 20% that makes it fire for a real reader.

---

## 1. The problem, in one breath

You build a deck and set its shape once — say 16:9 landscape. That shape is
**baked in**: the `@size` directive emits a fixed `size: W H` page box, and the
slide is a fixed-size rectangle. Export it, email the link, open it on a phone —
and you get a tiny letterboxed 16:9 rectangle floating in grey. You pinch-zoom to
read. Nothing adapts, because the deck is a fixed-size artifact, like a sheet of
paper. The phone is portrait; the paper is landscape; tough luck.

This is **Persona 2b** from Part II — *"gets an emailed link, reads a landscape
deck on a phone."* It is the persona nothing in the engine serves today, and the
reason the whole native→reflow + portrait-type-recuration line of work this
session does not yet reach a real reader.

## 2. The insight — the machine is built and idle

We spent this session making components **reflow** (collapse to a single column
on a tall box) and recurating the **portrait type scale** to be phone-legible.
And the runtime already does the live half of the job:

- `stampOrientation()` (`lib/runtime/index.js`) sets `data-orientation` purely
  from the section's **measured** aspect on every `resize` and DOM mutation.
- `patchSectionGeometry()` re-runs that plus the portrait canvas-scale plus the
  cqi font stamp (`--_sec-1cqi`) on every resize.
- The Tier-A `@container (aspect-ratio …)` reflows fire off the box's **own
  measured aspect** directly — no stamp needed.

So why no reflow today? **The slide box is pinned to the authored `@size`
aspect**, so the measured width/height always reports the authored shape no
matter the device. *Unpin the box and the existing machinery does the rest.* We
are not building responsiveness here — we are **unlocking** what already ships.

## 3. The fix, at altitude

Add a **viewing mode** in which the slide's box is sized to the **viewport**
instead of the authored shape. On a phone the box becomes portrait → the runtime
notices → `data-orientation="portrait"` is stamped, the portrait canvas-scale and
the recurated portrait type apply, and every Tier-A `@container` component
restyles to its tall/strip family. All of that is *already written*; the box
change is the trigger.

It is **additive and export-safe**. The PDF and the canonical export HTML are a
fixed-paper deliverable and stay byte-for-byte unchanged (the export HTML even
deliberately *strips* the runtime to stay print-clean — `lattice-emulator.js`
§"Strip the live-preview runtime"). Fluid mode is therefore **a separate viewer
output that keeps the runtime** rather than a flag on the canonical export. No
exported bytes change → **not** an export-sign-off change under the Quality Bar.

## 4. Decisions (locked 2026-06-21)

Three forks were put to the maintainer; the answers below are binding for this
slice.

### 4a. Reading model — **one slide per screen, vertical scroll-snap (swipe)**

Each slide fills the phone screen (one slide = one screenful); the reader
swipes / scroll-snaps down to the next, like a vertical story or carousel. This:

- **preserves the slide-as-frame** composition — a boardroom deck stays a
  sequence of composed frames, not a soft-edged article;
- gives **each slide a full portrait screenful**, so reflow fires cleanly and
  predictably on a known box shape (the viewport), not a content-variable one;
- maps to a familiar phone gesture (vertical swipe), no learning curve.

*Rejected:* **continuous scroll** (all slides stacked into one long page, each as
tall as its content). It softens slide boundaries and lets height vary wildly
slide to slide — less boardroom, more webpage — and it couples each slide's box
height to its content, which muddies the "box = viewport" trigger. Kept as a
*possible later toggle*, not built now.

### 4b. Surface — **opt-in only (off by default)**

Fluid mode is **off unless turned on** — via an in-page toggle control and/or a
URL flag (e.g. `?view=fluid` / `#fluid`). The shared HTML does **not** silently
reshape an author's deck on a phone.

- **Why opt-in, not default:** reshaping a fixed deck is a real editorial change
  to how the author's work reads; the author (or reader) should *choose* it. It
  also keeps the default path identical to today — zero regression risk for every
  existing deck and viewer — while we prove the mode out.
- This is the conservative first step. Promoting fluid to the *default* on a
  phone (the "an emailed link is just readable" end state) is a **later, separate
  decision** once the mode has real-world miles.

### 4c. First slice — **keystone only (fluid box + reflow)**

This PR builds **only** the fluid box: unbolt the box, keep/embed the runtime,
let one slide reflow to the phone. Explicitly **out of this slice:**

- **Auto-shrink** (content scales down to fit, with a legibility floor) —
  Capability 2 in Part II. A dense slide may still overflow its screenful; that
  is a **known, documented limitation** for this slice, not a bug.
- **Re-pagination** (splitting a too-dense slide across screens) — Capability 3.
- **Tier-C migration.** `split-panel` and `citation-card` still ride the runtime's
  coarse three-bucket stamp; they *reflow*, just at coarser granularity than the
  Tier-A four-family resolution. Finishing that is the Part-I quality backlog,
  tracked separately.

## 5. How it plugs in (mechanism, at design altitude)

The precise selectors are an implementation detail; the shape is:

1. **A viewer output / entry point** that emits the deck HTML **with the runtime
   kept** (the canonical export strips it; fluid keeps it) and a mode marker on
   the root, e.g. `<html data-view="fluid">`. Toggle/URL-flag flips the marker.
2. **Fluid-box CSS**, gated on `[data-view="fluid"]`, that overrides the section
   from the fixed `size: W H` box to a viewport-filling box —
   `100dvw × 100svh`/`100dvh` per slide — inside a vertical **scroll-snap**
   container (`scroll-snap-type: y mandatory`; each `section` is a snap stop).
   Use the **small/dynamic viewport units** (`svh`/`dvh`) so the mobile browser
   chrome (the disappearing URL bar) doesn't cause jump or clip.
3. **Nothing else.** Once the section is viewport-sized, `stampOrientation` +
   `patchSectionGeometry` + the `@container` queries do their existing jobs. We
   add the box and the snap scroller; the runtime supplies the reflow.

Wide screens (desktop/tablet ≥ the authored aspect) keep the authored
fixed-shape presentation even in fluid mode — fluid is the phone-shaped read, not
a desktop reflow.

## 6. Known limitations (this slice, by design)

- **Over-dense slides overflow.** No auto-shrink/split yet → a slide carrying
  more than a portrait screenful runs past the bottom. Documented; addressed by
  Capabilities 2–3 later.
- **Coarse reflow on Tier-C holdouts** (`split-panel`, `citation-card`) until
  migrated.
- **Opt-in friction.** The emailed-link reader must tap the toggle / hit the flag;
  not yet "just readable." Intended — promoting to default is a later call.

## 7. Verification plan (when built)

Per the Quality Bar — *it renders* is the floor:

- Build a representative deck in fluid mode and **actually view it** at the three
  device widths (`tools/screenshot.js`: ~390 mobile, ~820 tablet, ~1440 desktop),
  confirming: phone → portrait reflow + recurated type fires; tablet/desktop →
  unchanged authored shape; swipe/snap advances one slide per gesture.
- Confirm the **canonical export HTML and PDF are byte-unchanged** (golden diff)
  — fluid is additive.
- Demo deck `examples/<slug>.md` (+ committed PDF) per HARD #9; `CHANGELOG.md`
  `## Unreleased` per HARD #10.

## 8. Prototype validation (2026-06-21)

Before committing to the build, a throwaway `.scratch/` prototype rendered a
landscape deck (`examples/kpi-stats-lift.md`), re-inlined the runtime, and
overrode the pinned `section{width/height:<px> !important}` box with a
viewport-filling scroll-snap box. Confirmed on real renders (phone 390×844,
desktop 1440×900):

- **The core claim holds.** Unbolting the box is the whole trigger — the KPI row
  collapsed 4-across → a vertical stack, the stats ledger stacked, the portrait
  type scale fired, all from the *existing* runtime + `@container` queries. No
  engine change was needed to get reflow.
- **Desktop is genuinely untouched** — the toggle defaults off in landscape and
  the deck renders in its normal fixed 16:9 box.

One design refinement surfaced, now **in the keystone's scope** (it is placement,
not autofit): a *light* slide (e.g. 4 KPIs) forced to a full portrait screenful
spreads its content across the height with large gaps — airy, if legible. The
keystone needs a rule for **how sparse content sits in a tall box** (tight-centre
vs. distribute), distinct from the Capability-2 autofit that handles *over*-dense
slides. Captured here so the build doesn't rediscover it.

## 9. Implementation (landed in this PR)

The keystone is built — the design and the build ship together. What landed:

- **`lib/base/base.fluid-view.css`** — the gated fluid-box CSS (viewport box +
  vertical scroll-snap + the sparse-slide centring + the toggle styling). Added
  to the `tools/build-css.js` bundle order; unlayered, so it wins on specificity
  per §5. Inert until `:root[data-lattice-view="fluid"]` is set.
- **`lib/runtime/index.js`** — `initFluidView()`, inert unless the page is flagged
  `data-lattice-fluid-capable`. On a fluid-capable page `boot()` takes a minimal
  path: it runs the controller + `patchSectionGeometry()` only, deliberately
  **skipping the live-preview content transforms** (the export DOM is already
  transformed; re-running them throws — the reason a normal export strips this
  runtime).
- **`lattice-emulator.js`** — `--fluid` (or a `fluid: true` front-matter key)
  emits the `.html` as the viewer. **Export-safety is structural:** the PDF/PPTX/
  PNG raster loads the *clean* HTML (runtime stripped, no marker); the viewer
  (marker + inlined runtime) is written over the `.html` **only after**
  rasterization (`toFluidViewer` + the post-raster rewrite), so the exported
  bytes never see it. Two inlining footguns fixed: the bundle's `</script>`/
  `<script`/`<!--` are escaped, and the `</body>` injection uses a *function*
  replacement so the bundle's `$&`/`$1` aren't mangled by `String.replace`.

A maker-checker pass (independent agent) hardened four issues before merge: the
raster/viewer share-a-file export-byte leak above (now byte-identical); the
sparse-slide `flex-grow:0` collapsing mermaid/chart bodies (now exempted, so
media still fills); the one-shot orientation style going stale across a
fluid↔fixed toggle (now cleared on toggle); and the `#fixed`/`#fluid` hint
loosened to exact-match.

**Verified** (sandbox, `tools/screenshot.js` + a Puppeteer probe): phone 390×844
→ box goes portrait, `data-orientation="portrait"` stamps, `stats`/`kpi` reflow
to a single column, portrait type fires, a `diagram` chart still fills (not
collapsed); desktop 1440×900 → toggle defaults off, the authored fixed 16:9 deck
is unchanged; the `--fluid` PDF is **byte-identical** to the plain PDF (only the
`/CreationDate` timestamp differs, exactly as plain-vs-plain does); the
non-`--fluid` export carries no capability marker and strips the runtime.

## 10. Out of scope / sequence after this

1. **This PR:** the design doc + the keystone build above.
2. **Then (separate PRs):** auto-shrink actuator (Cap. 2) → re-pagination
   (Cap. 3) → Tier-C four-family migration → the eventual "fluid-as-default on a
   phone" promotion.
