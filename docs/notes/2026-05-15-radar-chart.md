# 2026-05-15 — Radar chart

Decision note. Lattice needed a radar / spider chart "like Mermaid's, but
better." This note records the design model that was settled before code:
the authoring contract, the six-variant lineup, the geometry kernel, and
one latent-bug finding (`--fg` is undefined repo-wide).

Canonical authoring docs live in
[`../references/templates.md`](../references/templates.md) (the `radar`
entry) — this note is the *why*, not the *how*.

## Why native, not Mermaid

Mermaid v11 ships a radar chart, but routing through it would mean a
second theming wall (see [2026-04-30-mermaid-theming.md](2026-04-30-mermaid-theming.md))
and a runtime dependency for something that is, geometrically, trivial:
polar → cartesian for the vertices, polygon rings for the grid. The same
build-time-SVG approach `buildPieChart` already uses in
`lib/chart-family.js` covers it with zero dependencies and full
palette-blindness. So radar is a native transform — `lib/radar.js` —
alongside journey, roadmap, and word-cloud.

## Authoring: series-major nested list

Three shapes were on the table:

- **A — series-major list** (top-level = series, nested = `axis value`).
  Matches gantt/kanban nesting; single-series variants read cleanest.
- **B — axis-major list** (top-level = axis, nested = `series value`).
  Axes as the skeleton, but series names repeat on every axis and it
  inverts the gantt/kanban convention.
- **C — Markdown table** (rows = axes, columns = series). Zero
  repetition, but drops the trailing-`code` value-pill convention used
  everywhere else and is awkward for the single-series variants.

**Picked A.** Convention-consistency with the other chart transforms,
and three of the six variants (`target`, `delta`, and effectively
`quadrant`'s hero) lean single-series, where A is least verbose. The
first series fixes the axis order; later series align by axis label
(case-insensitive), falling back to position — so one typo misaligns
one point, not the whole chart.

`quadrant` extends A by one level: series → group → `axis value`.

## Scale resolution

Auto-fit by default — `0` to the data max rounded up to a clean interval
(1 / 2 / 2.5 / 5 × 10ⁿ via `niceCeil`). The eyebrow `<code>` can pin an
explicit range (`0–100`, `0-100`, `0 to 100`) or a lone maximum (`100`);
non-numeric eyebrow text is ignored and the eyebrow still renders
normally. Same pattern as gantt reading its window from the eyebrow.

## The six-variant lineup

The framing that drove the cut: **each variant answers one distinct
boardroom question in a three-second read** — not a visual skin. Skins
(`minimal`, `dark`) are composable cross-cutting modifiers, so they
don't spend a variant slot.

| Variant | Board question | Why it earns a slot |
| --- | --- | --- |
| `radar` (default) | "Compare these profiles." | Multi-series overlay, ≤3 series. The workhorse. |
| `target` | "Are we hitting goal?" | A `Target`/`Goal`/`Plan` series becomes a dashed reference polygon; per-axis gap segments ride the spokes, rose under / green over. Mermaid makes you eyeball it. |
| `delta` | "What moved, which way?" | Exactly two series, before → after; the change rides each spoke green-up / rose-down. QBR staple. |
| `benchmark` | "Are we inside the pack?" | Series 1 is the hero line; the rest collapse into a single min–max envelope band instead of N tangled polygons. |
| `quadrant` | "Where are we strong, by theme?" | Axes grouped into tinted sectors with rim labels + a dashed per-group mean arc. Boards think in themes. |
| `small-multiples` | "Scan the portfolio." | One mini radar per series on a shared scale — the honest read when an overlay would be mush. |

**Deliberately cut:** `spotlight` (it's `target` minus the target — not
its own read) and `risk` (a heat-ramp fill mode — better as a future
composable modifier than a standalone variant).

## Geometry kernel

One small set of pure functions, shared by every variant:

- `axisAngle(i, n)` — axis `i` at `i · 360°/n`, clockwise from straight
  up. Same convention as `buildPieChart`, so the two charts read alike.
- `polar(radius, angle)` — polar → cartesian in the 300×300 viewBox.
- `valueRadius(value, scale)` — maps the scale onto `[0, R]`, clamped.
- `seriesPoints` / `gridSvg` / `axisLabelsSvg` — compose those into the
  polygon strings, ring polygons, and rim labels.

Each variant renderer is just a different composition of the kernel:
`target`/`delta` add per-axis spoke segments, `benchmark` adds an
even-odd envelope `<path>`, `quadrant` adds sector wedges + mean arcs,
`small-multiples` repeats the single-series render. Deterministic — same
value model, same SVG — which is what makes the three-renderer parity
(emulator / marp-cli hook / runtime mirror) hold.

## Latent bug found: `--fg` is undefined

While styling the chart, `var(--fg)` was used for grid/label colours —
copied from the journey CSS, which uses it heavily
(`--journey-timeline`, `--journey-plumb`, `--journey-axis`, …).
**`--fg` is not defined anywhere in the repo** — not in `lattice.css`,
not in any theme. The consequence: SVG `fill: var(--fg)` falls back to
the initial `fill` (solid black), and `stroke: var(--fg)`-derived tokens
fall back to inherited `stroke` (effectively `none`). The radar band
rendered as a solid black blob until the tokens were swapped to the real
ink ramp (`--text-heading` / `--text-body` / `--text-muted` / `--border`).

Radar is fixed. Journey's `--fg` references are still live and should be
audited — its low-opacity gridlines/plumb-lines likely render wrong (or
invisibly) too. See the gotchas entry
"[`var(--fg)` is undefined — SVG fill/stroke falls back to black/none](../references/gotchas.md)".

## Update — radar joins chart-family

The first cut shipped radar as a standalone module (`lib/radar.js` owned
its own section dispatch, mirrored in `lattice-runtime.js` and wired into
the emulator + `marp.config.js` engine hook). On review, the right home
was `chart-family`: radar wants the same eyebrow / h2 / subtitle / chart
body / caption skeleton the other native charts already have, and adding
a sixth member is a smaller-radius change than duplicating the wrap
logic in a standalone path.

Migration shape:

- `lib/radar.js` is now the parsing + geometry **kernel** only —
  `transformRadarSection` and `applyToRenderedHtml` are gone, dispatch is
  owned by `lib/chart-family.js`.
- `lib/chart-family.js` adds `'radar'` to `CHART_LAYOUTS`, delegates to
  the kernel from inside `transformChartSection`, and adds `radar-figure`
  to the chart-frame body regex.
- `lattice-emulator.js` inlines the same dispatch in its mirror
  chart-family block (the third copy of chart-family code that keeps the
  build-CLI standalone).
- `lattice-runtime.js` routes radar through the runtime chart-family
  mirror via a `buildRadarFigure` helper; the radar-specific runtime
  functions (`rParseRadar`, `rBuildRadar`, …) stay where they are.
- `marp.config.js` drops the standalone `applyRadarToHtml` line —
  `applyChartFamilyToHtml` covers radar now.
- The demo deck eyebrow / h2 / list / caption layout maps cleanly onto
  the chart-frame slots; the trailing descriptive paragraph becomes the
  `.chart-caption` (small mono with a hairline rule, matching how
  `chart-family-experiment.md` writes its captions).

Net code change: ~120 lines removed (the standalone dispatch + tests),
visual contract gained (chart-frame skeleton + dark/minimal compose with
chart-frame's existing tokens too). The three-renderer parity rule still
holds — radar's kernel is shared by all three paths, and the dispatch is
co-located with the other chart-family members in each path.
