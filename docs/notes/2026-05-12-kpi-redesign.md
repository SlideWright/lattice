# KPI redesign — rounds one, two, and three

## Round one (rejected) — five "less chrome, more typography" layouts

Sent five candidates: `kpi-anchor`, `kpi-ledger`, `kpi-slat`,
`kpi-marquee`, `kpi-grid`. All five failed. The common cause:

1. Numbers capped at `--fs-display` (60px) when they should command.
2. Content floated as a thin band, leaving dead zones.
3. Categorical colour rotated as decoration (blue/green/purple/orange).
4. Target / trend buried as a 13px muted footnote.

Wrong axis. Polishing chrome on a layout that wasn't earning the canvas.

## Round two (rejected) — `kpi-status` + `kpi-gap`

`kpi-status`: 2×2 grid with fs-hero numerals and a status-coloured top
rule. `kpi-gap`: literal progress bars showing current-vs-target.

Both rejected as "competent dashboard layouts" — not boardroom. Honest
self-critique:

- `kpi-status` was a tidier card grid. Bigger numbers but still "four
  cells in a grid." Memorable in no particular way.
- `kpi-gap` was decoration disguised as data viz. Three bars at 100%,
  one at 95% — the bars carried no information the numbers didn't.
  Progress-bar pattern reads as a 2010 admin dashboard.

The look was the issue, not the structure.

## Round three (shipped here) — `kpi-board`

Earnings-report typography. The reference is an annual report or a
McKinsey performance summary, not a SaaS dashboard.

**Structural recipe:**

1. **Eyebrow** — h3 in mono, small caps, 0.22em tracked, muted. Sets
   section / period: `AUTHENTICATION · Q4 2026`.
2. **Headline** — h2 in Playfair Display, bold, no padding-bottom rule
   weight game. One sentence: `Where we are against quarter targets.`
3. **1.5px hairline rule** spanning the headline's bottom. Earnings-
   report convention.
4. **Four metric rows**, each a 3-column grid:
   - col 1: metric name in sans, weight 500, fs-content
   - col 2: number in Playfair, fs-stat (52px), tabular nums,
     right-aligned in its own column
   - col 3: target + gap in mono, fs-emphasis (17px), tabular nums,
     muted by default
5. **Hairline 1px rule** between rows; **1.5px closing rule** on the
   last row.
6. **Single warn-colour leader bar** on the underperforming row
   (4px left-edge), and that row's gap text in `--warn`. The reader's
   eye lands on that one row first — no other status decoration.

**Variants exercised in the deck:**

- `demo` modifier — one warn callout (typical case)
- no modifier — all on track (neutral case)
- `mixed` modifier — one warn + one fail (stress test)

**Authoring story for production.** The demo hardcodes the callout
row via `nth-child` for inspection. The intended authoring is a
per-row class hint — likely a trailing italic on the metric line
(`*behind*` / `*off-track*`) that CSS `:has()` reads, mirroring how
the audit layouts already work. Final mechanism is left open until
this look is approved.

## Inspection

```sh
node lattice-emulator.js \
  docs/notes/2026-05-12-kpi-candidates.md \
  out.pdf
```

Five slides: title → before (shipped) → kpi-board with single warn
callout → kpi-board neutral (all on track) → kpi-board mixed
(warn + fail stress test).
