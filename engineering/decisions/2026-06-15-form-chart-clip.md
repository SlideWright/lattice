# Form chart: collapse → clip → robust content-box sizing (2026-06-15)

## Symptom

A `piechart donut` (and `radar`/`map`/`cohort-quadrant`) under `section.form`,
on a *dense* slide — a 2-line subtitle PLUS a bottom caption — rendered in the
exported PDF as a **fragment**: the donut sliced to a horizontal band, the
legend missing its first and last rows. On a *roomy* slide (no caption, short
subtitle) the same chart looked fine. So the first round of review (a roomy
deck) passed and the real failure shipped.

## Two failures, opposite causes

**Failure 1 — collapse.** The default chart sizing chain is
`section` flex → `.chart-body` flex:1 → `figure` flex:1 `container-type:size`
→ svg `height:100cqh`. Under the Form this collapsed the donut to a ~40px
thumbnail.

**Failure 2 — clip.** The first "fix" sized the svg against the SECTION:
`height:46cqi; max-height:100cqh`. `cqi` is a **width** unit (~12.8px/unit at
HD, ~589px for 46cqi), far taller than the squeezed `.chart-body` (~121px in the
dense case). The oversized svg overflowed and `.chart-body{overflow:hidden}`
**clipped** it to a band. The `max-height:100cqh` guard read against the section
(== the stage, ~355px in print), so it never engaged.

## What the print-media probe actually showed

The decisive move was probing computed geometry **in print media**
(`page.emulateMediaType('print')`) — the context `page.pdf()` exports in — not on
screen. Screen and print disagree:

1. **`.chart-body` fills the stage correctly via flex, even in print.** In the
   dense case: stage 355px = header 160.7 + caption 72.9 + chart-body 121.6.
   The chart-body IS definite and correct.
2. **A `flex:1` *figure* whose sole child is a replaced `<svg>` does NOT grow
   to fill its flex parent in print.** It stays at the svg's intrinsic-ish
   height (57.6px) no matter what — `flex:1 1 0`, `align-items:stretch`,
   `position:absolute; inset:0`, `height:100%` all fail to expand it. The
   replaced-content intrinsic size wins. (This is the collapse.)
3. **`cqh`/`%`/abs-inset read against that collapsed figure are therefore all
   ~0.** Not usable.
4. **`cqh` against `.chart-body` (made `container-type:size`) is RELIABLE and
   equals the chart-body content box** — i.e. `100cqh == chart-body fill height
   − its own block padding (2·sp-lg ≈ 64px)`, constant across every chrome
   combo (0/1/2-line subtitle ± caption). This is *not* a bug; container queries
   resolve against the content box. (The earlier "cqh is halved in print" read
   was a coincidence of the dense case where the padding happened to be ~half.)

## The robust fix

Size the SVG off the **chart-body's content box**, the one box that fills the
stage reliably in print:

```css
section.form.piechart .chart-body { container-type: size; }
section.form.piechart .piechart-figure { display: contents; }
section.form.piechart .piechart-svg { height: 100cqh; width: auto; max-width: 100%; }
```

(`display:contents` collapses the figure's box out so the svg sizes straight off
the chart-body container — the `flex:1` figure can't mediate height in print. The
figure carries no decoration of its own, so removing its box is safe; chart-body
re-centres via its existing `justify-content/align-items:center`.) Identical
mechanism for radar/map/cohort-quadrant in
`lib/components/chart/_chart-family/chart-family.css`.

## Verified

In print media the svg height tracks the available chart-body content box across
every chrome combo (203 → 167 → 94 → 58px as chrome grows); full ring + full
legend, no clip, no overflow. Holds at HD and 4K (cqh is resolution-independent).
Non-form charts are byte-identical (every rule is `section.form`-scoped).

## Lesson

For Form/print chart sizing: **never trust on-screen geometry, and never size a
replaced `<svg>` off a `flex:1` wrapper or the section.** Size off the
`.chart-body` content box via its own container query — it is the only element in
the chain that fills the stage reliably in the print context the PDF exports in.
