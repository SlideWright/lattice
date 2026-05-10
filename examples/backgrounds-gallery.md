---
marp: true
theme: indaco
size: 16:9
header: "Lattice · Background Gallery"
style: |
  /* ── Boardroom Background Library (lattice-backgrounds.css) ── */

  /* Compositor: assembles gradient slots into background-image.
     Stack one radial-slot class + one linear-slot class to layer both. */
  section[class*="bg-"] {
    background-image: var(--_bg-radial, none), var(--_bg-linear, none);
  }

  /* Corner glows */
  section.bg-corner-tl {
    --_bg-radial: radial-gradient(
      ellipse 62% 55% at 0% 0%,
      color-mix(in srgb, var(--accent) 12%, transparent) 0%,
      transparent 100%
    );
  }
  section.bg-corner-tr {
    --_bg-radial: radial-gradient(
      ellipse 62% 55% at 100% 0%,
      color-mix(in srgb, var(--accent) 12%, transparent) 0%,
      transparent 100%
    );
  }
  section.bg-corner-bl {
    --_bg-radial: radial-gradient(
      ellipse 62% 55% at 0% 100%,
      color-mix(in srgb, var(--accent) 12%, transparent) 0%,
      transparent 100%
    );
  }
  section.bg-corner-br {
    --_bg-radial: radial-gradient(
      ellipse 62% 55% at 100% 100%,
      color-mix(in srgb, var(--accent) 12%, transparent) 0%,
      transparent 100%
    );
  }

  /* Edge washes */
  section.bg-edge-top {
    --_bg-linear: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--accent) 12%, transparent) 0%,
      color-mix(in srgb, var(--accent) 10%, transparent) 6%,
      transparent 35%
    );
  }
  section.bg-edge-bottom {
    --_bg-linear: linear-gradient(
      to top,
      color-mix(in srgb, var(--accent) 12%, transparent) 0%,
      color-mix(in srgb, var(--accent) 10%, transparent) 6%,
      transparent 35%
    );
  }
  section.bg-edge-left {
    --_bg-linear: linear-gradient(
      to right,
      color-mix(in srgb, var(--accent) 12%, transparent) 0%,
      color-mix(in srgb, var(--accent) 10%, transparent) 4%,
      transparent 30%
    );
  }
  section.bg-edge-right {
    --_bg-linear: linear-gradient(
      to left,
      color-mix(in srgb, var(--accent) 12%, transparent) 0%,
      color-mix(in srgb, var(--accent) 10%, transparent) 4%,
      transparent 30%
    );
  }

  /* Atmospheric */
  section.bg-vignette {
    --_bg-radial: radial-gradient(
      ellipse 88% 85% at center,
      transparent 0%,
      transparent 45%,
      color-mix(in srgb, var(--accent) 6%, transparent) 70%,
      color-mix(in srgb, var(--accent) 11%, transparent) 100%
    );
  }
  section.bg-spotlight {
    --_bg-radial: radial-gradient(
      ellipse 55% 50% at center,
      color-mix(in srgb, var(--accent) 7%, transparent) 0%,
      transparent 70%
    );
  }
  section.bg-horizon {
    --_bg-linear: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--accent) 11%, transparent) 0%,
      color-mix(in srgb, var(--accent) 6%, transparent) 15%,
      transparent 45%
    );
  }
  section.bg-ground {
    --_bg-linear: linear-gradient(
      to top,
      color-mix(in srgb, var(--accent) 11%, transparent) 0%,
      color-mix(in srgb, var(--accent) 6%, transparent) 15%,
      transparent 45%
    );
  }

  /* Multi-accent */
  section.bg-duotone {
    --_bg-radial:
      radial-gradient(ellipse 55% 50% at 0% 0%, color-mix(in srgb, var(--accent) 9%, transparent) 0%, transparent 100%),
      radial-gradient(ellipse 55% 50% at 100% 100%, color-mix(in srgb, var(--accent) 9%, transparent) 0%, transparent 100%);
  }
  section.bg-frame {
    --_bg-linear:
      linear-gradient(to bottom, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 22%),
      linear-gradient(to top,    color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 22%),
      linear-gradient(to right,  color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 22%),
      linear-gradient(to left,   color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 22%);
  }
  section.bg-sweep {
    --_bg-linear: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 10%, transparent) 0%,
      color-mix(in srgb, var(--accent)  4%, transparent) 30%,
      transparent 55%
    );
  }
  section.bg-ambient {
    --_bg-linear: linear-gradient(
      160deg,
      color-mix(in srgb, var(--accent) 7%, transparent) 0%,
      transparent 45%
    );
  }

  /* SVG accent marks — shapes rendered via ::before mask for palette-aware
     visibility in both light and dark modes. The mask SVG uses fill='white'
     (alpha channel) so color-mix(var(--accent) 28%) shows through at shape
     positions only. var(--accent) resolves via the theme's light-dark()
     token, keeping shapes on-brand in every presentation mode. */
  section.bg-micro-tr {
    --_bg-radial: radial-gradient(ellipse 50% 45% at 100% 0%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 100%);
  }
  section.bg-micro-tr::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><circle cx='1192' cy='80' r='4.5' fill='white' fill-opacity='1'/><circle cx='1215' cy='74' r='3.5' fill='white' fill-opacity='0.9'/><circle cx='1240' cy='82' r='3' fill='white' fill-opacity='0.85'/><circle cx='1262' cy='75' r='2.5' fill='white' fill-opacity='0.8'/><circle cx='1206' cy='97' r='3.5' fill='white' fill-opacity='0.9'/><circle cx='1232' cy='100' r='3' fill='white' fill-opacity='0.8'/><circle cx='1256' cy='93' r='2' fill='white' fill-opacity='0.7'/><circle cx='1221' cy='113' r='3' fill='white' fill-opacity='0.75'/><circle cx='1248' cy='110' r='2' fill='white' fill-opacity='0.65'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  section.bg-tick-right {
    --_bg-linear: linear-gradient(to left, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 18%);
  }
  section.bg-tick-right::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><line x1='1254' y1='197' x2='1272' y2='197' stroke='white' stroke-width='1.5' stroke-opacity='1'/><line x1='1258' y1='282' x2='1272' y2='282' stroke='white' stroke-width='1' stroke-opacity='0.85'/><line x1='1253' y1='367' x2='1270' y2='367' stroke='white' stroke-width='1.5' stroke-opacity='0.95'/><line x1='1257' y1='452' x2='1272' y2='452' stroke='white' stroke-width='1' stroke-opacity='0.8'/><line x1='1254' y1='537' x2='1271' y2='537' stroke='white' stroke-width='1.5' stroke-opacity='0.9'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  section.bg-orbit-br {
    --_bg-radial: radial-gradient(ellipse 50% 45% at 100% 100%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 100%);
  }
  section.bg-orbit-br::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><circle cx='1200' cy='617' r='22' fill='none' stroke='white' stroke-width='1.5' stroke-opacity='0.9'/><circle cx='1200' cy='617' r='13' fill='none' stroke='white' stroke-width='1' stroke-opacity='0.75'/><circle cx='1200' cy='617' r='2.5' fill='white' fill-opacity='1'/><circle cx='1226' cy='601' r='2' fill='white' fill-opacity='0.8'/><circle cx='1242' cy='624' r='1.5' fill='white' fill-opacity='0.7'/><circle cx='1184' cy='608' r='1.5' fill='white' fill-opacity='0.65'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  section.bg-slash-tr {
    --_bg-radial: radial-gradient(ellipse 48% 42% at 100% 0%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 100%);
  }
  section.bg-slash-tr::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><line x1='1188' y1='112' x2='1201' y2='99' stroke='white' stroke-width='1.5' stroke-opacity='1'/><line x1='1204' y1='105' x2='1217' y2='92' stroke='white' stroke-width='1.5' stroke-opacity='0.9'/><line x1='1220' y1='112' x2='1233' y2='99' stroke='white' stroke-width='1.5' stroke-opacity='0.8'/><line x1='1236' y1='105' x2='1249' y2='92' stroke='white' stroke-width='1.5' stroke-opacity='0.7'/><line x1='1252' y1='98' x2='1265' y2='85' stroke='white' stroke-width='1.5' stroke-opacity='0.6'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  section.bg-seeds {
    --_bg-radial: radial-gradient(ellipse 88% 85% at center, transparent 0%, transparent 48%, color-mix(in srgb, var(--accent) 5%, transparent) 75%, color-mix(in srgb, var(--accent) 9%, transparent) 100%);
  }
  section.bg-seeds::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><ellipse cx='1180' cy='88' rx='2.5' ry='5' fill='white' fill-opacity='0.9' transform='rotate(-20 1180 88)'/><ellipse cx='1222' cy='80' rx='2' ry='4' fill='white' fill-opacity='0.75' transform='rotate(10 1222 80)'/><ellipse cx='1258' cy='96' rx='2.5' ry='5' fill='white' fill-opacity='0.85' transform='rotate(-15 1258 96)'/><ellipse cx='55' cy='628' rx='2' ry='4' fill='white' fill-opacity='0.75' transform='rotate(25 55 628)'/><ellipse cx='95' cy='638' rx='2.5' ry='5' fill='white' fill-opacity='0.85' transform='rotate(-10 95 638)'/><ellipse cx='38' cy='646' rx='2' ry='4' fill='white' fill-opacity='0.7' transform='rotate(15 38 646)'/><ellipse cx='52' cy='92' rx='2' ry='4' fill='white' fill-opacity='0.7' transform='rotate(20 52 92)'/><ellipse cx='92' cy='82' rx='2.5' ry='5' fill='white' fill-opacity='0.7' transform='rotate(-5 92 82)'/><ellipse cx='135' cy='97' rx='2' ry='4' fill='white' fill-opacity='0.65' transform='rotate(15 135 97)'/><ellipse cx='1210' cy='634' rx='2' ry='4' fill='white' fill-opacity='0.7' transform='rotate(-20 1210 634)'/><ellipse cx='1250' cy='624' rx='2.5' ry='5' fill='white' fill-opacity='0.65' transform='rotate(10 1250 624)'/><ellipse cx='1168' cy='645' rx='2' ry='4' fill='white' fill-opacity='0.65' transform='rotate(25 1168 645)'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  section.bg-pills-right {
    --_bg-linear: linear-gradient(to left, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 15%);
  }
  section.bg-pills-right::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><rect x='1252' y='243' width='24' height='7' rx='3.5' fill='white' fill-opacity='1'/><rect x='1255' y='314' width='20' height='7' rx='3.5' fill='white' fill-opacity='0.85'/><rect x='1250' y='385' width='26' height='7' rx='3.5' fill='white' fill-opacity='0.95'/><rect x='1253' y='455' width='22' height='7' rx='3.5' fill='white' fill-opacity='0.8'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  section.bg-asterisk-scatter {
    --_bg-radial:
      radial-gradient(ellipse 45% 40% at 100% 0%, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 100%),
      radial-gradient(ellipse 35% 32% at 0% 100%, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 100%);
  }
  section.bg-asterisk-scatter::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><line x1='1206.5' y1='88' x2='1213.5' y2='88' stroke='white' stroke-width='1.5' stroke-opacity='1'/><line x1='1211.8' y1='85' x2='1208.2' y2='91' stroke='white' stroke-width='1.5' stroke-opacity='1'/><line x1='1208.2' y1='85' x2='1211.8' y2='91' stroke='white' stroke-width='1.5' stroke-opacity='1'/><line x1='1238' y1='100' x2='1244' y2='100' stroke='white' stroke-width='1.5' stroke-opacity='0.85'/><line x1='1242.5' y1='97.4' x2='1239.5' y2='102.6' stroke='white' stroke-width='1.5' stroke-opacity='0.85'/><line x1='1239.5' y1='97.4' x2='1242.5' y2='102.6' stroke='white' stroke-width='1.5' stroke-opacity='0.85'/><circle cx='1228' cy='78' r='1.5' fill='white' fill-opacity='0.7'/><circle cx='1258' cy='85' r='1.5' fill='white' fill-opacity='0.7'/><circle cx='1195' cy='105' r='1.5' fill='white' fill-opacity='0.65'/><line x1='62' y1='628' x2='68' y2='628' stroke='white' stroke-width='1.5' stroke-opacity='1'/><line x1='66.5' y1='625.4' x2='63.5' y2='630.6' stroke='white' stroke-width='1.5' stroke-opacity='1'/><line x1='63.5' y1='625.4' x2='66.5' y2='630.6' stroke='white' stroke-width='1.5' stroke-opacity='1'/><line x1='107.5' y1='640' x2='112.5' y2='640' stroke='white' stroke-width='1.5' stroke-opacity='0.8'/><line x1='111.25' y1='637.8' x2='108.75' y2='642.2' stroke='white' stroke-width='1.5' stroke-opacity='0.8'/><line x1='108.75' y1='637.8' x2='111.25' y2='642.2' stroke='white' stroke-width='1.5' stroke-opacity='0.8'/><circle cx='85' cy='618' r='1.5' fill='white' fill-opacity='0.65'/><circle cx='142' cy='632' r='1.5' fill='white' fill-opacity='0.65'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  section.bg-thread-diagonal {
    --_bg-radial: radial-gradient(ellipse 45% 40% at 100% 0%, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 100%);
  }
  section.bg-thread-diagonal::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><line x1='1257' y1='90' x2='1278' y2='69' stroke='white' stroke-width='1' stroke-opacity='1'/><line x1='1244' y1='90' x2='1265' y2='69' stroke='white' stroke-width='1' stroke-opacity='0.85'/><line x1='1231' y1='90' x2='1252' y2='69' stroke='white' stroke-width='1' stroke-opacity='0.7'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  section.bg-bracket-right {
    --_bg-linear: linear-gradient(to left, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 15%);
  }
  section.bg-bracket-right::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><path d='M1268,310 L1274,310 L1274,326 L1268,326' fill='none' stroke='white' stroke-width='1.5' stroke-opacity='1'/><path d='M1268,422 L1274,422 L1274,438 L1268,438' fill='none' stroke='white' stroke-width='1.5' stroke-opacity='0.8'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  section.bg-grid-micro {
    --_bg-radial: radial-gradient(ellipse 48% 42% at 100% 0%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 100%);
  }
  section.bg-grid-micro::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><circle cx='1244' cy='72' r='1.5' fill='white' fill-opacity='1'/><circle cx='1256' cy='72' r='1.5' fill='white' fill-opacity='0.9'/><circle cx='1268' cy='72' r='1.5' fill='white' fill-opacity='0.8'/><circle cx='1280' cy='72' r='1.5' fill='white' fill-opacity='0.7'/><circle cx='1244' cy='84' r='1.5' fill='white' fill-opacity='1'/><circle cx='1256' cy='84' r='1.5' fill='white' fill-opacity='0.9'/><circle cx='1268' cy='84' r='1.5' fill='white' fill-opacity='0.8'/><circle cx='1280' cy='84' r='1.5' fill='white' fill-opacity='0.7'/><circle cx='1244' cy='96' r='1.5' fill='white' fill-opacity='1'/><circle cx='1256' cy='96' r='1.5' fill='white' fill-opacity='0.9'/><circle cx='1268' cy='96' r='1.5' fill='white' fill-opacity='0.8'/><circle cx='1280' cy='96' r='1.5' fill='white' fill-opacity='0.7'/><circle cx='1244' cy='108' r='1.5' fill='white' fill-opacity='1'/><circle cx='1256' cy='108' r='1.5' fill='white' fill-opacity='0.9'/><circle cx='1268' cy='108' r='1.5' fill='white' fill-opacity='0.8'/><circle cx='1280' cy='108' r='1.5' fill='white' fill-opacity='0.7'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  section.bg-chevron-bl {
    --_bg-radial: radial-gradient(ellipse 40% 38% at 0% 100%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 100%);
  }
  section.bg-chevron-bl::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    --m: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><polyline points='34,625 42,631 34,637' fill='none' stroke='white' stroke-width='1.5' stroke-opacity='1'/><polyline points='52,625 60,631 52,637' fill='none' stroke='white' stroke-width='1.5' stroke-opacity='0.8'/><polyline points='70,625 78,631 70,637' fill='none' stroke='white' stroke-width='1.5' stroke-opacity='0.65'/></svg>");
    -webkit-mask-image: var(--m); mask-image: var(--m);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }

  /* Reset */
  section.bg-none { --_bg-radial: none; --_bg-linear: none; }
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

<!-- _class: stats bg-corner-tr dark -->
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

<!-- _class: content bg-corner-tl bg-edge-right -->
<!-- _footer: "30 · bg-corner-tl + bg-edge-right · radial slot + linear slot layered" -->

`Layered · Radial + Linear`

## Corner glow meets edge wash

Two separate classes. Two separate slots. Both render.

`bg-corner-tl` writes `--_bg-radial`; `bg-edge-right` writes `--_bg-linear`. The compositor assembles them into a single `background-image` with both layers active.

`<!-- _class: content bg-corner-tl bg-edge-right -->`

---

<!-- _class: content bg-vignette bg-tick-right dark -->
<!-- _footer: "31 · bg-vignette + bg-tick-right · atmospheric + SVG marks, dark" -->

`Layered · Atmospheric + SVG · Dark`

## Perimeter tint with right-margin ticks

`bg-vignette` sets the radial slot — accent at the edges, open center. `bg-tick-right` brings a linear haze on the right plus the five `::before` tick marks. Dark canvas.

`<!-- _class: content bg-vignette bg-tick-right dark -->`

---

<!-- _class: content bg-none -->
<!-- _footer: "Reset · bg-none · clears a deck-wide pattern on this slide" -->

`Override · Reset`

## One slide can step outside the pattern

Set `class: bg-corner-tl` in front-matter for a deck-wide accent, then add `<!-- _class: bg-none content -->` on any slide that needs a clean surface — a full-bleed image, a neutral chart page, or a table of contents that should feel like a pause.

`class: bg-none`
