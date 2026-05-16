<!-- _class: compare-table -->

## Where the four substance contracts come from.

| Substance | Author writes | Renderer | Output |
| --- | --- | --- | --- |
| prose | headings, paragraphs, lists | Marp markdown → semantic HTML | DOM |
| structure | nested lists with conventions | lib/*.js post-processor | DOM |
| series | tabular DSL (axes + datapoints) | chart-family kernel | SVG |
| graph | external graph language | external CLI (mmdc, future d2) | SVG |
