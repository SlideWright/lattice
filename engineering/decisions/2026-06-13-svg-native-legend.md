# SVG-native chart legend + spine — design model & spike plan

**Date:** 2026-06-13
**Status:** proposed (design + single-chart spike) — supersedes the fixed-size
HTML legend shipped in #233 *for the four keyed charts only*
**Predecessor:** `#233` (fix: chart family responsive) made the diagrams
box-fit and demoted the legend to an honest **fixed** `--fs-body-compact` after
proving that `cqh` in `font-size` does **not** track a container the way it does
in layout properties (the key stayed put while the diagram scaled).
**Files in scope (spike):** `lib/components/chart/_chart-family/chart-family.js`
(pie legend emit), `lib/components/chart/_chart-family/chart-family.css` (retire
the 70/30 grid + spine `::before` + legend flex *for piechart*), the two sibling
render paths (`lattice-emulator.js` inline chart-family block,
`dist/lattice-runtime.js` mirror) per HARD RULE 1.

---

## 1. Problem

The four keyed charts (`piechart`, `radar`, `map`, cohort `quadrant`) lay out as
a **CSS 70/30 grid**: diagram SVG in the left 70 % cell, an **HTML** `<ol>`
legend in the right 30 % cell, a gradient **spine** on the boundary (the
figure's `::before`). The diagram is SVG-in-a-viewBox and scales perfectly; the
legend is HTML and **cannot be made to scale proportionally with it** — `cqh` in
`font-size` resolves in a different phase than layout `cqh`, so the key either
sits full-size beside a shrunk diagram or (pre-#233) truncated. #233's fix was to
freeze the key and let the diagram shrink *into* the freed room. That is honest
and ships, but it is a floor: the key never grows on a `cover` / full-screen
chart, and the chart is **not a single self-contained unit** (the export-this-
diagram property we want).

## 2. Decision

Make the legend **and** the spine part of the **same `<svg>` viewBox** as the
diagram, so the whole chart is **one unit that scales uniformly** — thumbnail to
full-bleed — and exports as one self-describing file. The CSS 70/30 grid, the
spine `::before`, and the legend flex column all **retire**, replaced by
viewBox-internal geometry the kernel emits.

```
 before (CSS grid):  [ <svg> diagram 70% ][ ::before spine ][ <ol> HTML key 30% ]
 after  (one svg):   <svg viewBox="0 0 286 200"> diagram(0..200) │spine│ <text> key(200..286) </svg>
```

The figure element keeps only **sizing** CSS (fit the body, centre, max
dimensions); everything *inside* is viewBox units, so the key scales with the
diagram by construction — no `font-size` container-query juggling, ever.

### Why this is the right architecture (not just a workaround)
- **Proportional by construction** — one viewBox, one scale factor. Dissolves
  the `cqh`-in-`font-size` class of bug entirely.
- **Self-contained / exportable** — data + key + spine + labels in one SVG.
- **`cover` / full-screen "just works"** — the key scales up with the diagram.
- **Deterministic** — viewBox coordinates, no flex/grid height-resolution quirks
  (the `height:100%`-won't-resolve trap #233 fought).

## 3. The trade we are accepting (eyes open)

The current legend system's headline virtue is that it is **pure CSS keyed on
the figure/legend classes — "all three render paths inherit it with zero
transform edits"** (`chart-family.css:523`). Going SVG-native **moves that
geometry into the kernel**, which must therefore run **identically in all three
render paths** (HARD RULE 1). We trade *free CSS inheritance* for *kernel-emitted
geometry*. That is the cost; §4 pins how we pay it without regressions.

## 4. The three load-bearing decisions

### (a) Text-wrapping model — the crux
SVG `<text>` does not auto-wrap; HTML did it for free (the "labels WRAP, no clip
— if users go crazy" guarantee, `chart-family.css:519,645`). The kernels are
**pure JS, no DOM, no font-metrics engine**, so we cannot measure glyph advances
at build time. Decision:

> **Word-boundary wrap to a character budget**, derived from the rail width in
> viewBox units and a **conservative average advance** (≈ `0.58em` for the label
> sans), **capped at 2 lines**, with an **ellipsis** on overflow. Emitted as
> `<tspan x=… dy=…>` rows. Deterministic, pure-JS, identical in all three paths.

Rationale: the rail is narrow by design (`--chart-legend-max: 25cqi`) and
boardroom legend labels are short categorical names — 2 lines is generous. The
budget is **conservative** (break early) so an approximate metric never *clips*;
worst case is a slightly-early wrap, never an overrun. This **narrows** the
old "wrap forever" guarantee to "wrap to 2 lines, then ellipsis" — an
intentional, documented contract change for the keyed charts, justified by the
fixed-width rail.

### (b) Font-token routing + a sketch re-verify gate
Today the **sketch** finish reskins the HTML legend **for free**, because
`section.sketch` re-points `--font-body`/`--font-label` to the hand faces and the
HTML legend inherits them (`base.sketch.css:36-40` — "it reskins… the HTML
legend"; and it explicitly **"cannot reach inside a chart's SVG geometry"**).
Move the key into `<text>` and it leaves that free zone. It is **recoverable**:
SVG `<text>` honors `font-family`, and CSS custom-property inheritance crosses
the SVG boundary, so the legend text **must** pull the token, never a literal:

> Legend `<text>` carries `class="legend-label"` / `legend-pct` and the CSS sets
> `font-family: var(--font-label)` (label voice) — so `section.sketch`'s token
> re-point reaches it exactly as it reached the HTML. **Hardcoding a face here
> silently breaks sketch on charts.**

**Gate:** the spike is not done until a `class: sketch` render of the piechart
shows the **hand font on the legend** (Shantell), light + dark. This is a
named acceptance criterion, not an afterthought.

### (c) No SVG filter on the text — and the scaling proof
The scaling worry is real but lands on **filters, not text**: the sketch spike
found an SVG `filter` (`feTurbulence`/`feDisplacementMap`) **collapses Marp's
print-scale transform** — the slide shrinks into a PDF corner
(`2026-06-11-sketch-finish.md` §"load-bearing constraint"), because the PDF path
wraps each slide in a scaled `<svg>` (`inlineSVG:true`). Plain `<text>` is **not**
a filter — it is vector glyphs re-rasterized crisply at the print scale by the
same font pipeline HTML uses.

> **Proof already shipping:** the chart **axis/rim labels are SVG `<text>` in
> this same viewBox and scale fine through this exact PDF path.** The legend text
> is the same primitive. **Hard rule for this work: never put an SVG `filter` on
> legend/diagram text.**

And `<foreignObject>` (HTML-in-SVG) is **out** — the engine banned it: mobile
Safari "cannot lay out HTML inside a scaled `<foreignObject>`" (counters → "00",
**chart labels balloon and overlap**, masks drop — `lib/playground/index.js:64`).
Native `<text>` is the only viable SVG path; that is *why* §4(a) exists.

### (d) Export font fidelity — embed or outline, never naked
SVG `<text>` stores a **`font-family` name, not the glyphs**, so the
"self-contained export" pro (§2) has a sharp edge: a *detached* exported `.svg`
opened where the font isn't installed **falls back to serif** — the sketch hand
face would not travel. Two contexts, two answers:

- **In-deck** (SVG living in the rendered deck/page): the hand font shows — the
  SVG text uses the page's already-loaded engine fonts, exactly like the HTML
  legend today. **The spike needs nothing here.**
- **Standalone export** (future feature): embed or outline. Decision:

> **Default: embed a *subsetted* `@font-face` (base64 woff2) in the SVG
> `<defs><style>`** — text keeps referencing the family name, the font travels
> inside the file, the export is self-contained AND text stays selectable.
> **Reuse `docs/src/playground/font-embed.js`** — it already builds data-URI
> `@font-face` CSS for exactly these sketch faces (written for the Drawing Board
> export's identical "baked a fallback" bug, `2026-06-11-sketch-finish.md` →
> 2026-06-12 update). Offer **outline-to-`<path>`** as a "maximum-portability"
> toggle (zero font dependency, renders anywhere, trivial size for a legend's few
> labels; loses text selectability). **Never emit a naked export.**

Verification caveat (this sandbox): Chromium can't fetch the Google-Fonts CDN
(TLS proxy), so even in-deck sketch renders fall back to system fonts unless the
local-embed pipeline runs — which is why the committed `sketch.pdf` used the
Puppeteer local-embed path. Verify the spike's sketch font through that same
path; it is an environment quirk, not an architecture limit.

## 5. Colors stay on tokens (non-issue, confirmed)
The wedges already fill via `var(--chart-cat-N-hue)` (`chart-family.js:33`) and
the wedge gradients use `stop-color: color-mix(… var(--token) …)`
(`chart-family.js:319`). The legend port keeps the same plumbing:
- swatch → `<rect fill="color-mix(in oklab, var(--chart-cat-N-hue) 82%, var(--bg))">`
  (identical to the current HTML swatch background)
- label/value → `<text fill="var(--text-body)">`
- spine → `<rect fill="url(#chart-spine)">` where the `<linearGradient>` stops are
  the existing `--chart-spine` stops (`accent`→`transparent`), as `stop-color`.

HARD RULE 3 (no hex, always `var(--token)`) holds with **zero** new literals.

## 6. Spike plan — piechart first, then fan out

1. **Design gate (this doc).**
2. **Spike `piechart` only.** Widen the figure SVG viewBox to include a rail;
   emit swatch `<rect>` + label/value `<text>`/`<tspan>` (per §4a) + a spine
   `<rect>`+`<linearGradient>`. Retire the pie's 70/30 grid / `::before` / legend
   flex CSS; keep only the figure-sizing CSS. Land it in `chart-family.js` (the
   shared module) and mirror into the emulator inline block + runtime per HR 1.
3. **Verify the spike against named criteria (§7) and *look at it*** — boardroom
   + `islands` + `cover`, **light & dark**, **and `class: sketch`** (the 4(b)
   gate). Pixel-check, parity tier.
4. **Decision point.** If it is boardroom-10/10 and sketch skins it → fan out the
   identical model to `radar`, `map`, cohort `quadrant` (they already share the
   `.chart-frame` rail tokens, so the port is mechanical). If wrapping reads ugly
   or sketch can't be routed cleanly → stop, having spent **one** chart, and keep
   #233's fixed key as the floor.

The four charts share the rail today, so the spike must NOT half-migrate the
shared CSS: gate the new path on the piechart selector only, leave the other
three on the CSS grid until they graduate (HARD RULE 8 — isolate feature content
from the long-running galleries; charts graduate in a separate post-review step).

## 7. Acceptance criteria (the spike is "done" only when all hold)
- [ ] Pie + legend + spine render as **one SVG**; no CSS 70/30 grid / `::before`
      spine / legend flex remains on the piechart path.
- [ ] Legend **scales with the diagram** at thumbnail, boardroom, and `cover`
      sizes (the whole point) — verified by eye + pixel-check.
- [ ] Long labels **wrap to 2 lines then ellipsis**; no clip, no rail overrun.
- [ ] **`class: sketch` puts the hand font on the legend** (light + dark).
- [ ] All colors via `var(--token)`; lint/`build:check`/unit/parity green.
- [ ] Three render paths emit byte-identical legend geometry (parity tier).

## 8. Alternatives considered (and why not)
- **Keep #233's fixed HTML key (do nothing).** The floor; loses proportional +
  self-contained. Fine if the spike fails.
- **`<foreignObject>` legend.** Free HTML wrapping + viewBox scaling, but
  re-introduces the banned mobile-Safari failure class (§4c). Rejected.
- **Scale the whole figure (diagram + HTML key) via one outer scaled SVG.** That
  is exactly Marp's `inlineSVG:true` slide wrapper, which the playground had to
  drop on mobile Safari. Rejected for the same reason.
- **Big-bang all four kernels at once.** Pays the wrapping + sketch-routing cost
  ×4 before knowing it reads well. The spike-then-fan-out (§6) de-risks it.
