# Owned chart-family vs Mermaid — style separation

Date: 2026-06-18
Status: Done

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

## Residual (not addressed — name collision, not a rule leak)

Owned `journey` uses a `.journey-section` `<li>` class whose string collides
with Mermaid's `.journey-section` `<g>`. Distinct elements + distinct rules
(`section.journey .journey-section` vs `mermaid.css`'s bare `.journey-section`),
so no rule double-styles both — but the shared name is a latent hazard. A
stricter pass could rename the owned class or scope every Mermaid rule under
`section.diagram`.
