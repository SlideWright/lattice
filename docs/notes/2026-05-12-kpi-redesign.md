# KPI redesign — power-play cards

The earlier table-based and minimal-hairline rounds were rejected:
cards are required, and one critical metric needs to command attention
through scale, elevation, or chrome — not just colour.

Five card directions, each with a different power-play mechanism. All
share the same fictional data (Authentication Q4 2026: 94% / 8 ms / 0 /
3.2×, with the first metric below target and starred as critical).

## A · Spotlight

Two-column grid. Hero card (60–65% of canvas) on the left, three
support cards stacked on the right separated by hairline rules.
Hero is filled in `--accent-soft`, raised slightly, gets a
`✦` four-point star, and runs the number at `--fs-watermark` (180px).
Supports run at `--fs-3xl` (48px) — clearly one tier down. Reads as
"this is the headline metric, here are the others for context."

## B · Bento

3-column × 3-row irregular tile grid:

```
+------+------+----+
|             |    |
|    hero     |    |
|     2×2     |side|
|             | 1×3|
+-----+-------+    |
|  3  |   4   |    |
+-----+-------+----+
```

Hero gets the dark `--brand-blue-deep` fill with white serif type and
white four-point star — a true "raised dark slab." Side column gets
`--accent-soft` tint with accent-coloured number; bottom-row tiles are
`--bg-alt`. Each tile has a different chrome to reinforce hierarchy
without relying on size alone.

## C · Editorial

50/50 magazine spread. Left: bg-alt hero filling the full slide height,
4px `--warn` left border, a "CRITICAL" mono-uppercase label top-left and
a `✦` star top-right, the number at `--fs-watermark` (180px) in serif,
and a one-sentence interpretation in serif italic. Right: three
hairline-separated support entries with the number at `--fs-3xl`.

This is the most magazine-y of the five — it puts editorial prose
next to the figure and treats the slide as a feature spread.

## D · Raised

Equal 2×2 grid. The critical card uses elevation as its power-play:
1px `--accent` border, 4px `--accent` top stroke, drop shadow,
`transform: translateY(-10px)` (literally raised off the surface),
`✦` star top-right, the number rendered in `--accent` blue at
`--fs-hero` (110px). The other three are unchromed, hairline-separated,
number at `--fs-stat` (52px). Power-play through z-axis, not size.

## E · Power triangle

Asymmetric cascade.

```
+--------+-----+-----+
|        |  2  |  3  |
|  hero  |     |     |
|  1×2   +-----+-----+
|        |      4    |
+--------+-----------+
```

Hero anchors the left two-thirds with a light gradient fill
(`accent-soft → bg-alt`) and `--fs-watermark` serif numerals. Card 2
and 3 stack to its right at equal weight; card 4 spans the bottom-right
as a "wide footnote." Sizes cascade downward, but no card hides.

## Inspection

```sh
node lattice-emulator.js \
  docs/notes/2026-05-12-kpi-candidates.md \
  out.pdf
```

Six slides: title, then A → E in order. Each direction's footer labels
which one it is.

## Authoring story (deferred)

All five layouts identify the critical card via `:nth-child(1)`,
i.e., it's whichever metric the author lists first. For production,
this should become a per-item modifier (likely a trailing italic word
on the metric line, e.g. `**94%** *critical*`, read by `:has()`). The
authoring mechanism is open until one of these layouts is approved.
