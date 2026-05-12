---
marp: true
theme: cuoio
size: 16:9
header: "Lattice · Background Gallery"
class: bg-seeds
paginate: true
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: '' -->

# Twenty-Seven Boardroom Backgrounds

`Lattice · Background Library`

*Sixteen gradient accents and eleven SVG accent marks, all palette-aware. The canvas center is always clean.*

---

<!-- _class: content bg-corner-tl -->
<!-- _footer: "01 · bg-corner-tl · radial glow, top-left corner" -->

`Corner Glow · Top Left`

## The accent lives at the edge, not in the way

A radial ellipse anchored at the top-left corner bleeds the theme's accent color inward, fading to transparent before it reaches the content zone. At 12% accent opacity the tint is visible but never competes. Works on any layout — the center is always clean.

`class: bg-corner-tl`

---

<!-- _class: stats bg-corner-bl bg-seeds  -->
<!-- _footer: "02 · bg-corner-tr · radial glow, top-right corner" -->

`Corner Glow · Top Right`

## One ellipse. Top-right anchor. Twelve percent

`Works on any layout — the center is always clean.`

1. **12%** accent opacity at the corner
2. **62%** ellipse width
3. **55%** ellipse height
4. **0** content zones overlapped

---

<!-- _class: divider bg-corner-bl -->
<!-- _footer: "03 · bg-corner-bl · radial glow, bottom-left corner" -->

`Corner Glow · Bottom Left`

## A foundation, not a ceiling

---

<!-- _class: content bg-corner-br -->
<!-- _footer: "04 · bg-corner-br · radial glow, bottom-right corner" -->

`Corner Glow · Bottom Right`

## The accent follows the reading line

In left-to-right scripts, the eye exits a slide at the bottom-right. A glow anchored there creates a natural endpoint for the visual journey — the accent reinforces where the reader has arrived, not where they started.

`class: bg-corner-br`

---

<!-- _class: content bg-edge-top -->
<!-- _footer: "05 · bg-edge-top · linear wash from top edge" -->

`Edge Wash · Top`

## Color at the header, white at the data

The accent bleeds down from the top edge and reaches zero by 35% of the slide height. Every chart, table, and body-text paragraph lives on a clean surface. The wash marks the top of the frame as intentional without crossing into working space.

`class: bg-edge-top`

---

<!-- _class: quote bg-edge-bottom -->
<!-- _footer: "06 · bg-edge-bottom · linear wash from bottom edge" -->

> The canvas has a floor. The accent pools at the base without competing with any headline above.

— Lattice Background Library

---

<!-- _class: content bg-edge-left -->
<!-- _footer: "07 · bg-edge-left · linear wash from left edge" -->

`Edge Wash · Left`

## The reading margin, tinted

Left-edge washes echo the colored spine of a bound document. The gradient is gone by 30% — narrower than the top/bottom variants because horizontal space is more precious in 16:9. The heading and body text start on clean white.

`class: bg-edge-left`

---

<!-- _class: stats bg-edge-right -->
<!-- _footer: "08 · bg-edge-right · linear wash from right edge" -->

`Edge Wash · Right`

## A closing bracket for the canvas, by the numbers

`Linear gradient from right. Three stops. Gone by 30%.`

1. **12%** peak accent at the right edge
2. **10%** mid-stop at 4% inset
3. **30%** complete fade distance
4. **0** content zone crossings

---

<!-- _class: content bg-vignette -->
<!-- _footer: "09 · bg-vignette · accent-tinted perimeter, open center" -->

`Atmospheric · Vignette`

## Everything important is in the middle

The accent builds from 0% at 45% radius to 11% at the hard edges, leaving the inner ~700×400 px of the slide completely transparent. The effect reads as a soft frame — cinematic, unhurried. The gradient begins beyond where any heading or body text sits.

`class: bg-vignette`

---

<!-- _class: divider bg-spotlight -->
<!-- _footer: "10 · bg-spotlight · gentle accent wash at center" -->

`Atmospheric · Spotlight`

## Warmth exactly where the argument lives

---

<!-- _class: content bg-horizon -->
<!-- _footer: "11 · bg-horizon · heavier at top, clear from 45%" -->

`Atmospheric · Horizon`

## The slide has a sky

The accent is heaviest at the very top edge and fades to nothing before the midpoint. The lower half of the canvas — where charts, lists, and evidence typically live — is always clean. Use it on section openers, statements of position, or any slide whose argument moves from premise at top to evidence below.

`class: bg-horizon`

---

<!-- _class: quote bg-ground -->
<!-- _footer: "12 · bg-ground · heavier at bottom, clear from 45%" -->

> The mirror of the horizon — the accent underlines the conclusion without adding noise to anything above the midpoint.

— Lattice Background Library

---

<!-- _class: content bg-duotone -->
<!-- _footer: "13 · bg-duotone · opposing corner pair, top-left + bottom-right" -->

`Multi-accent · Duotone`

## Diagonal tension without diagonal lines

Two radial glows at opposing corners create a natural diagonal axis across the slide — the eye travels from the top-left glow to the bottom-right without any explicit line drawing it there. The two gradients never overlap at the center. Each runs at 9% so the combined perceived weight matches a single 12% corner glow.

`class: bg-duotone`

---

<!-- _class: stats bg-frame -->
<!-- _footer: "14 · bg-frame · all four edges at half-weight" -->

`Multi-accent · Frame`

## Four gradients. One perimeter. Everything formal

`Eight percent per edge. Each fades to zero at twenty-two percent inset.`

1. **4** gradient layers (one per edge)
2. **8%** accent opacity per edge
3. **22%** fade distance (inset from edge)
4. **56%** clean inner zone

---

<!-- _class: content bg-sweep -->
<!-- _footer: "15 · bg-sweep · diagonal wash, top-right to bottom-left" -->

`Multi-accent · Sweep`

## The deck is moving forward

A diagonal gradient from the top-right corner fades to transparent by 55% across. The directionality reads as motion — the color is where the slide came from, the clean canvas is where it is going. The most assertive of the 16; use it for momentum slides, not summaries.

`class: bg-sweep`

---

<!-- _class: content bg-ambient -->
<!-- _footer: "16 · bg-ambient · broad off-axis tint at 7%" -->

`Multi-accent · Ambient`

## The most honest background is also the most invisible

At 7% accent opacity on a broad 160° diagonal, `bg-ambient` is the quietest option in the library. From a 2-metre viewing distance it reads as slight warmth, not color. Use it on content-dense slides where any stronger accent would draw the eye away from the argument. The safest default.

`class: bg-ambient`

---

<!-- _class: content bg-micro-tr -->
<!-- _footer: "17 · bg-micro-tr · micro dot cluster, top-right header band" -->

`SVG Art · Micro Dots`

## Nine dots. One cluster. Accent color, both modes

The nine circles sit entirely in the empty right side of the header band. Shapes render via a CSS mask and paint with `var(--accent)` at 28% — accent hue in light mode, dark-accent hue in dark mode, automatically. At viewing distance the cluster reads as texture; up close it resolves into a precise mark.

`class: bg-micro-tr`

---

<!-- _class: stats bg-tick-right -->
<!-- _footer: "18 · bg-tick-right · scale ticks, far-right margin" -->

`SVG Art · Scale Ticks`

## Five marks. One column. Everything in the gutter

`Right margin only — x 1253–1272. Alternating stroke weights.`

1. **5** horizontal strokes
2. **85px** vertical pitch
3. **19px** max tick length
4. **x 1272** rightmost point

---

<!-- _class: section bg-orbit-br dark -->
<!-- _footer: "19 · bg-orbit-br · concentric rings, bottom-right corner" -->

`SVG Art · Orbital Rings`

## A precision instrument in the corner nobody looks at

---

<!-- _class: content bg-slash-tr -->
<!-- _footer: "20 · bg-slash-tr · parallel slashes, top-right corner" -->

`SVG Art · Diagonal Slashes`

## Motion lines from the edge of the frame

Five parallel slashes at 45° sweep through the upper-right corner, each ~19px and spaced so they form a clean family without crowding. Rendered via accent mask — the slashes appear in the theme's accent hue at graded opacity, automatically correct in light and dark modes.

`class: bg-slash-tr`

---

<!-- _class: content bg-seeds -->
<!-- _footer: "21 · bg-seeds · elongated ellipses, four corners" -->

`SVG Art · Seeds`

## Twelve elongated ellipses, four corners, one quiet system

Three small seeds — rx 2–2.5, ry 4–5 — inhabit each corner, rotated ±5–25° to mimic natural scatter. No two corners are identical. The four-corner distribution creates a contained, balanced field — the most symmetric of the accent-mark patterns.

`class: bg-seeds`

---

<!-- _class: stats bg-pills-right -->
<!-- _footer: "22 · bg-pills-right · data pills, far-right margin" -->

`SVG Art · Data Pills`

## Four pills. One margin. Staggered widths

`Right-edge gutter only — x 1250–1276. Height 7 px, rx 3.5.`

1. **26px** widest pill
2. **20px** narrowest pill
3. **70px** vertical spacing
4. **7px** pill height

---

<!-- _class: content bg-asterisk-scatter -->
<!-- _footer: "23 · bg-asterisk-scatter · asterisks + dots, opposing corners" -->

`SVG Art · Asterisks`

## Two asterisks, five micro dots, one diagonal axis

A six-pointed asterisk marks the top-right corner; a smaller one echoes at the bottom-left. Five micro circles add supporting texture. Both asterisks render in the active accent hue — the diagonal negative space between them carries the composition.

`class: bg-asterisk-scatter`

---

<!-- _class: section bg-thread-diagonal -->
<!-- _footer: "24 · bg-thread-diagonal · hairline diagonals, top-right corner" -->

`SVG Art · Thread Lines`

## Three hairlines at 45°. Thinner than 0.5 pt at print

---

<!-- _class: content bg-bracket-right -->
<!-- _footer: "25 · bg-bracket-right · bracket marks, far-right margin" -->

`SVG Art · Brackets`

## Two right brackets. The page knows it is not finished

A closing bracket shape — three strokes, height 16px, depth 6px — appears twice in the far-right margin at y 318 and y 430. Rendered in the active accent color at 28% opacity. At full viewing distance the shapes feel typeset, not drawn.

`class: bg-bracket-right`

---

<!-- _class: stats bg-grid-micro -->
<!-- _footer: "26 · bg-grid-micro · dot grid, top-right edge bleed" -->

`SVG Art · Dot Grid`

## Sixteen dots at the canvas edge. Four half-clipped

`4 × 4 grid. 12 px spacing. x 1244–1280. r 1.5 circles.`

1. **16** total circles
2. **12** fully visible
3. **4** at x 1280 (edge-clipped)
4. **1.5px** dot radius

---

<!-- _class: content bg-chevron-bl -->
<!-- _footer: "27 · bg-chevron-bl · chevrons, bottom-left corner" -->

`SVG Art · Chevrons`

## Three chevrons, one direction, the quietest kind of momentum

Three right-pointing chevron marks — each 8×12px, open stroke — sit at the bottom-left corner with 18px horizontal spacing. Opacity steps 100% → 80% → 65% from left to right so they read as a gradient of certainty: loudest at entry, whispered at the last.

`class: bg-chevron-bl`

---

<!-- _class: content bg-vignette bg-micro-tr -->
<!-- _footer: "30 · bg-vignette + bg-micro-tr · gradient + mark, slot-free" -->

`Layered · Any Gradient + Any Mark`

## Marks carry no slot — combine freely

`bg-vignette` fills `--_bg-radial`. `bg-micro-tr` renders its dot cluster via `::before` without touching any gradient slot. Previously this would have been a slot conflict — both were radial. Now marks are slot-free: any gradient pairs with any mark.

`<!-- _class: content bg-vignette bg-micro-tr -->`

---

<!-- _class: content bg-corner-tl bg-edge-bottom bg-slash-tr -->
<!-- _footer: "31 · bg-corner-tl + bg-edge-bottom + bg-slash-tr · two gradients + one mark" -->

`Layered · Two Gradients + One Mark`

## Three classes. Three layers

`bg-corner-tl` fills the radial slot. `bg-edge-bottom` fills the linear slot. `bg-slash-tr` contributes its slash marks via `::before` — no slot, no conflict. The compositor assembles both gradients; the mark rides alongside.

`<!-- _class: content bg-corner-tl bg-edge-bottom bg-slash-tr -->`

---

<!-- _class: content bg-none -->
<!-- _footer: "Reset · bg-none · clears a deck-wide pattern on this slide" -->

`Override · Reset`

## One slide can step outside the pattern

Set `class: bg-corner-tl` in front-matter for a deck-wide accent, then add `<!-- _class: bg-none content -->` on any slide that needs a clean surface — a full-bleed image, a neutral chart page, or a table of contents that should feel like a pause.

`class: bg-none`
