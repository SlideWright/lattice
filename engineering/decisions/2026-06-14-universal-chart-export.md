---
status: shipped
summary: Universal chart export with a tiered SVG plus in-browser PNG path, correcting the earlier wrong call that PNG was not viable
---

# Proposal: Universal chart export — tiered SVG + PNG

**Date:** 2026-06-14 · **Status:** implemented · **Owner:** TBD

> **CORRECTION (2026-06-14).** An earlier revision of this note claimed the
> **in-browser** PNG tier was "not viable" — that `html-to-image` renders the
> HTML/CSS chart-frame charts blank and a PNG needs a server/engine screenshot.
> **That was wrong.** The "blank" was a **test artifact**: the headless probe used
> an undersized viewport, which collapsed the Drawing Board's preview pane to
> `0×0`, so *every* slide (charts and plain text alike) captured blank. With a
> real viewport the preview renders slides at `1280×720` and **`html-to-image`
> rasterizes the charts faithfully** — verified by exporting a gantt slide
> in-browser (full bars, axis, legend; not blank).
>
> **Resolution.** The web "Export chart" button rasterizes the HTML/CSS charts to
> PNG **in-browser**, via the SAME `html-to-image` path the one-click PDF/PPTX
> uses — no server, no engine screenshot. SVG tier (single-`<svg>` charts:
> piechart/radar/map/quadrant/funnel) is unchanged. `tools/export-chart-svg.js`
> additionally offers a headless (puppeteer) PNG for CLI/automation use.
**Related:** the current "Chart SVG" export (`docs/src/playground/drawing-board-export.js`
`exportChartsSvg` / `activeChartSvg`; CLI sibling `tools/export-chart-svg.js`;
shared core `lib/components/chart/_chart-family/standalone-svg.js`).

---

## 1. Why

Today the Drawing Board's **Chart SVG** export supports only **4** chart types —
the "keyed" single-`<svg>` layouts `piechart`, `radar`, `map`, `quadrant`
(`KEYED_LAYOUTS` in drawing-board-export.js). For every other chart the menu item
stays hidden, so from an author's view "chart export doesn't work." We want to
**export any chart** — the home-grown markdown chart family *and* the rest.

Three real constraints the author named:
- many charts **were never wired for SVG export** (the gate is narrow);
- some charts are a **mixture of SVG and HTML** (an `<svg>` plot inside an HTML
  `chart-frame` with an eyebrow/title/key);
- some charts **don't scale to fit** their slide (fixed dimensions).

## 2. The landscape (grounded in how each renders)

| Camp | Types | Renders as | Exportable to |
|---|---|---|---|
| **Single-SVG** | ` ```chart ` family (bar/line/area), `piechart`, `radar`, `map`, `quadrant`, `funnel`, `journey`, `state-chart`, `word-cloud`, ` ```mermaid ` | a real `<svg>` (the diagram, often the legend too) | **standalone SVG** (vector) |
| **HTML/CSS** | `gantt`, `kanban`, `progress`, `roadmap`, `timeline-list` | div/grid/flex layout — **no `<svg>`** | **PNG** (raster) |
| **Mixed** | the `chart-frame` slides | `<svg>` plot + HTML chrome (eyebrow/title/key) | SVG (chart only) **or** PNG (chart + chrome) |

So ~9 chart types are already SVG (only 4 are exposed); ~5 are HTML/CSS with no
SVG to lift. **"Everything → SVG" is not possible** (the HTML camp has no SVG);
**"everything → a portable image" is** — which is the chosen tiered strategy.

## 3. Decision (chosen)

**A tiered "Export chart" that picks the best format per chart:**

- **Tier 1 — standalone SVG** for any chart that is a self-contained `<svg>`
  (widen the gate from 4 to all ~9 SVG types + ` ```mermaid `). Reuses the
  existing `standalone-svg.js` core (flatten computed styles → literals, subset +
  embed the fonts the chart uses). Crisp, theme-free, scalable vector.
- **Tier 2 — high-res PNG** for the HTML/CSS charts and (optionally) the mixed
  chart-frame slides. Reuses the **same `html-to-image` rasterizer the PDF/PPTX
  export already uses** (2× device scale, fonts embedded). Universal: every chart
  exports *something* good.

The menu shows one **"Export chart"** entry whenever the cursor's slide carries a
chart; the downloaded file's extension (`.svg` / `.png`) reflects the tier, so
the format is honest and automatic.

**The "doesn't scale to fit" problem** is sidestepped on export: render at a
fixed high resolution (SVG is intrinsically scalable via `viewBox`; PNG renders
the chart region at 2×), independent of the on-slide size. (The on-slide scaling
bug itself is adjacent and may want a separate fix — out of scope here.)

## 4. What changes

- **Detection** — generalize `activeChartSvg` → `activeChart(frame)`: detect any
  chart-bearing section (the `chart-frame` class / the ~14 chart layouts), and
  classify it **SVG-tier** (the section's chart is one `<svg>`) vs **PNG-tier**.
- **Tier 1** — drop the 4-item `KEYED_LAYOUTS` allow-list; export any single-`<svg>`
  chart through the existing standalone-svg core. (Validate each type's legend +
  labels are captured; `svg-legend.js` already lifts the legend into the SVG for
  the keyed set.)
- **Tier 2** — a PNG path: rasterize the chart region via `html-to-image` (the
  PDF/PPTX code already does the clone + font-embed; factor it so the chart export
  can call it on one region at a chosen scale).
- **Menu/UX** — rename "Chart SVG" → "Export chart"; show it for any chart slide;
  status reflects the format produced.
- **CLI parity** — `tools/export-chart-svg.js` extends to the wider SVG set; the
  PNG tier needs a headless browser (the emulator already drives puppeteer), so a
  CLI PNG path is feasible but is its own slice.

## 5. Open questions (need a decision)

1. **Mixed `chart-frame` slides — chart-only SVG, or chart+chrome PNG?** Export
   just the `<svg>` (vector, but loses the eyebrow/title/key), or rasterize the
   whole chart region to PNG (keeps the chrome, raster)? *Recommendation: SVG of
   the chart `<svg>` when one exists (the chart is the artifact); offer the
   slide-region PNG as the universal fallback.*
2. **PNG background** — transparent, or the deck canvas colour (dark bookends)?
   *Recommendation: match the slide's own background, like the PDF/PPTX path.*
3. **CLI scope** — ship Tier 2 (PNG) in the browser first and treat the CLI PNG
   path as a follow-up? *Recommendation: yes.*
4. **Naming** — "Export chart" vs "Chart image" vs keep "Chart SVG" + add "Chart
   PNG". *Recommendation: one "Export chart", format automatic.*

## 6. Phasing (as built)

- **P1 — widen SVG (done).** `funnel` joins the keyed set as a single
  self-contained `<svg>` (legend in-svg); `journey` has 4 svgs,
  `state-chart`/`word-cloud` mix in HTML, so they're PNG-tier, not SVG. So the SVG
  tier = `piechart/radar/map/quadrant/funnel` (4 → 5), browser + CLI.
- **P2 — PNG, in-browser (done).** The web "Export chart" button rasterizes every
  non-SVG chart-frame slide to PNG via the shared `html-to-image` path (2× scale,
  fonts embedded) — the same one the one-click PDF/PPTX uses. No server. Verified
  on gantt (faithful, not blank) with a real-size preview. `tools/export-chart-svg.js`
  also offers a headless puppeteer PNG for CLI/automation (container screenshot,
  cropped to content).
- **P3 (optional)** — native-`<svg>` re-engineering of the HTML chart components,
  the only path to *vector* for them.

## 7. Risks

- **Per-type SVG quirks** — widening the gate may surface charts whose legend or
  labels live outside the `<svg>` (in HTML), needing a small per-type fix or a
  PNG downgrade. P1 should audit all ~9 types, not assume.
- **`foreignObject` fragility** (only if P3 takes that route) — not all SVG
  consumers render embedded HTML; fonts/CSS must be inlined.
- **Adjacent scaling bug** — "doesn't scale to fit" is a rendering issue the
  export sidesteps but doesn't fix; flag separately.
