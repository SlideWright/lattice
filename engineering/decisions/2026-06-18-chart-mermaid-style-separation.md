---
status: shipped
summary: Owned chart-family CSS and third-party Mermaid CSS share tokens but zero selectors/names — all Mermaid CSS in mermaid.css, the journey-section name split, radar !important confirmed load-bearing
---

# Owned chart-family vs Mermaid — style separation

## Principle

Owned chart-family CSS (the Lattice-rendered SVG/HTML charts) and third-party
**Mermaid** CSS must not share **selectors/rules**. They may share **tokens**
(`--cat-*`, `--chart-cat-*`, `--diagram-stroke`, `--cat-on-fill`) — that is the
design-system palette contract, not contamination. All Mermaid CSS lives in
`lib/integrations/mermaid/mermaid.css`; component stylesheets carry zero Mermaid
selectors.

## What the audit found (render-verified, all 13 chart components)

**Every shipped chart component is OWNED** — funnel, gantt, journey, kanban,
map, piechart, progress, quadrant, radar, roadmap, state-chart, timeline-list,
word-cloud all render Lattice's own SVG/HTML via the chart-family kernel (e.g.
`.chart-body`, `.kanban-board`, `.radar-figure`). None render via Mermaid.
Naming-collision traps resolved: owned `radar`/`quadrant` are `.radar-figure`/
`.quadrant-figure`, NOT Mermaid `radar-beta`/`quadrant`; owned `gantt` is HTML
bars, not a Mermaid gantt SVG. So owned charts and Mermaid shared **zero rules**
— `chart-family.css` and `mermaid.css` reference none of each other's classes.

The only contamination was **Mermaid CSS mis-filed into owned/integration
stylesheets** — leftovers from a pre-owned-DOM era (when kanban/gantt *were*
Mermaid) that never moved when those components were rewritten as owned SVG:

| Was in | Rule | Disposition |
|---|---|---|
| `kanban.styles.css` | `.cluster.section-N` band block (24 rules) | **Deleted** — inert: `mermaid.css`'s identical, later (bundle-last) band cycle already overrode it |
| `kanban.styles.css` | `.cluster .items .node …label-container` ticket fill | **Relocated** → `mermaid.css` (live; wins on specificity) |
| `gantt.styles.css` | `.taskTextOutsideLeft/Right` | **Relocated** → `mermaid.css` (live) |
| `highlight-js.css` | Mermaid title suppression | **Deleted** — `mermaid.css` L120–124 is a broader superset |

## Verification

Pixel-parity AE=0 across the owned kanban + gantt galleries (light + dark) and
the Mermaid `diagram` gallery (all 31 pages) — the relocated rules fire from
`mermaid.css`, the deleted rules were inert/duplicate. lint + build:check green.

## Mermaid `!important` is load-bearing — NOT a removal target

A prior audit flagged the radar block's ~30 `!important` as "redundant /
removable." **Render-verified false (2026-06-18).** Stripping them regresses the
override badly:

| Stripped | AE vs baseline (8-curve radar) |
|---|---|
| All radar `!important` | 289,922 |
| Curve + legend-box fills only | 229,714 |
| Axis + graticule + legend-text only | 270,496 |

`!important` in `mermaid.css` is **correct by design**: Mermaid auto-emits inline
`style=` on its SVG elements, which only `!important` can beat — specificity
cannot. So the `!important` density in `mermaid.css` is the *expected* pattern
for third-party overrides, not a smell. Do not re-chase it. (This is the
opposite of owned chart-family CSS, where `!important` usually *is* removable —
those files style only our own DOM with no competing inline styles.)

## journey-section name collision — RESOLVED (split the name)

Owned `journey` used a `.journey-section` `<li>` class whose string collided
with Mermaid's `.journey-section` (`<rect>`/`<text>`). No rule double-styled
both (distinct elements), but the shared *name* was a latent hazard.

**Rule applied (the operator's directive):** Mermaid CSS lives in `mermaid.css`;
component CSS lives with the component; **when both use the same name, split it.**
Mermaid's name is fixed (third-party), so the owned class was renamed:
`journey-section` → `journey-stage` (a clean substring swap preserving every
suffix: `journey-sections`→`journey-stages`, `journey-section-name`→
`journey-stage-name`, `--journey-section-bg/fg`→`--journey-stage-bg/fg`). The
`data-section` attribute and `--section-accent` var stay — Mermaid uses neither,
so they aren't shared. `mermaid.css` is untouched; it keeps `journey-section`.

Render-verified pixel-identical (AE=0 across all 11 gallery pages × light/dark,
all five variants); 39/39 journey unit tests pass. journey-section was the only
literal class-name both sides used — the owned charts otherwise key off
`[data-section]` + `.cat-N`, never Mermaid's `.section-N`/`.node`/`.cluster`.
