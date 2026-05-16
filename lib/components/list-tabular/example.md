<!-- _class: list-tabular -->

## The four substance contracts a component plugs into.

1. Prose
   - Headings, paragraphs, inline emphasis — Marp markdown into semantic HTML.
   - _CSS-only; no post-processor required_
2. Structure
   - Headings plus nested lists with conventions; a post-processor rewrites the list into purpose-built DOM.
   - _Per-component transform.js in lib/components_
3. Series
   - Tabular DSL — axes and datapoints as bullets, parsed into geometry.
   - _Chart-family kernel (radar, quadrant, piechart, gantt, kanban)_
4. Graph
   - External graph language (Mermaid today; D2 or PlantUML in the future).
   - _External CLI; palette injected at build time_
