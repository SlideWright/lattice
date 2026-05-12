# KPI redesign — round one (rejected) and round two

The shipped `kpi` layout is a grid of four cards: 3px categorical
top-stripe, 1px border, rounded corners, bg-alt fill, centred numerals.
It reads as loud and chunky — the rainbow stripes shout for no
semantic reason, and the chrome competes with the numbers.

## Round one — five directions, all rejected

Five layouts shipped as `kpi-anchor`, `kpi-ledger`, `kpi-slat`,
`kpi-marquee`, `kpi-grid` (no longer in the deck after the round-two
replacement). Each had five iterations behind it; the winners still
failed on review.

| Direction | Specific failure |
| --- | --- |
| anchor   | Invents fake hierarchy by promoting li#1 to hero. Supporting numerals (48px) ended up *smaller than their labels*. |
| ledger   | Stripped KPI of its assertive purpose — numbers read as balance-sheet line items, not headlines. |
| slat     | Labels rendered bigger and bolder than the numbers. "Examiner findings" louder than "0", when "0" *is* the entire point. |
| marquee  | Closest to right, but forces aggressive label truncation and floats on an isolated strip. |
| grid     | Safest, dullest. Categorical left rules reproduced the rainbow-noise problem in miniature. |

**Common failure modes across all five:**

1. Numbers topped out at `--fs-display` (60px) when they should
   command the canvas (`--fs-hero` 110px minimum).
2. Content floated as a thin band in the vertical centre, leaving
   large dead zones top and bottom.
3. Categorical colours rotated decoratively (blue / green / purple /
   orange) when colour should signal status, not identity.
4. Target / trend was treated as a 13px muted footnote, but the
   gap between current and target is usually the actual story.

The wrong axis. The right axis is: **make the numbers do the work,
and let status carry the colour.**

## Round two — two directions

Two layouts that fill the canvas, promote the gap to peer status,
and use semantic colour tokens (`--pass` / `--warn` / `--fail`)
already in the palette.

### A. `kpi-status` — fill the canvas

`repeat(auto-fit, minmax(380px, 1fr))` grid with `grid-auto-rows: 1fr`.
Numerals at `--fs-hero` (110px) anchored to the top of each cell.
Each cell carries a 2px top rule whose colour signals status — `--warn`
for behind, `--pass` for on-track, `--fail` for off-track. The target
line drops the `muted` treatment and adopts the cell's status colour
at `--fs-emphasis` (17px) — so the *gap* is what the reader sees
after the number.

A `demo` modifier hardcodes the status colours per `nth-child` for
the candidates inspection. Production needs a per-cell modifier
mechanism — likely a trailing italic word on the metric line
(`*behind*` / `*on-track*`) read by CSS `:has()`. That's a v2
decision after the layout itself is approved.

### B. `kpi-gap` — the gap is the slide

Each metric is a horizontal row with a literal progress bar showing
current vs target. Bar colour is the status (`--pass` / `--warn` /
`--fail`); fill is `calc(var(--pct) * 1%)`. Label sits above the bar
on the left, current number and target on the right at `--fs-stat`
(52px). The bar *is* the message — when row 1's bar visibly stops
short and goes amber, "94% vs 99% target" is read instantly without
having to compute the delta.

Demo per-row `--pct` and `--status` are set via `nth-child`. Production
needs the author to set those via the existing `progress-track`
mechanism (see `lattice-emulator.js`) or inline custom-property
authoring — leaving the authoring choice open until the layout
itself is approved.

## Inspection

```sh
node lattice-emulator.js \
  docs/notes/2026-05-12-kpi-candidates.md \
  out.pdf
```

Seven slides: title → before (shipped) → divider → A (status with demo
colours) → B (gap-bar with demo statuses) → C (status, neutral, no
demo modifier — for cases where status isn't applicable).
