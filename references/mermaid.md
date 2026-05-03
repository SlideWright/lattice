# Part 5: Mermaid Diagram Integration

## 5.1 Diagrams in Markdown

Always use `<div class="mermaid">`, NOT fenced code blocks. Fenced blocks rely on Marp's built-in Mermaid which is unreliable in PDF export.

```html
<div class="mermaid-box">
  <div class="mermaid">mindmap root{{Root}} [Category] (Item)</div>
</div>
```

For the PDF pipeline, these divs are for browser preview only. The actual PDF uses pre-rendered SVGs.

## 5.2 Node Shapes Reference

| Syntax     | Shape             | Use For             |
| ---------- | ----------------- | ------------------- |
| `root`     | Default           | Auto                |
| `((Text))` | Circle            | Emphasis nodes      |
| `(Text)`   | Rounded rectangle | Leaf nodes / items  |
| `[Text]`   | Square            | Category nodes      |
| `{{Text}}` | Hexagon           | Root / group nodes  |
| `)Text(`   | Cloud             | Ideas / concepts    |
| `))Text((` | Bang              | Alerts / highlights |

Use different shapes for different hierarchy levels to aid visual scanning.

## 5.3 Mermaid Theme Matching

Match the Mermaid theme variables to the slide CSS palette:

```
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '<--bg-alt value>',
  'primaryTextColor': '<--text-heading value>',
  'primaryBorderColor': '<--border value>',
  'lineColor': '<--text-muted value>',
  'secondaryColor': '<--bg value>',
  'tertiaryColor': '<--bg value>',
  'fontFamily': '<--font-body value>',
  'fontSize': '14px'
}}}%%
```

---

## 5.4 Diagram Titles

**Convention.** The slide's `## heading` is the canonical title. Mermaid's own title (whether set via YAML frontmatter `title:` or in-body `title` directive) is suppressed by CSS so the audience sees one source of truth, not two. Authors keep the `title` directive in source for portability — the diagram still makes sense if extracted — but it does not render on the slide.

**Where the suppression lives.** Three CSS injection points, all targeting the same class list:

1. `lattice.css` — scoped to `section.diagram .mermaid svg` and `section.diagram .mermaid-svg svg`. Handles the runtime path (Marp VS Code preview, standalone HTML).
2. `themes/indaco.css` — inside the Mermaid themeCSS block (after the sentinel comment). Handles the build path: the rule is injected into the SVG's own `<style>` tag via `%%{init: { themeCSS: ... } }%%`.
3. `themes/cuoio.css` — same as indaco. Both palette files need the rule because either can be the active theme.

**Class list (verified from rendered output, Mermaid 11.14).**

| Class | Diagram type | Title syntax |
| --- | --- | --- |
| `.titleText` | gantt | in-body `title` |
| `.pieTitleText` | pie | in-body `title` |
| `.radarTitle` | radar-beta | in-body `title` |
| `.packetTitle` | packet-beta | in-body `title` |
| `.flowchartTitleText` | flowchart | frontmatter |
| `.classDiagramTitleText` | class diagram | frontmatter |
| `.erDiagramTitleText` | ER diagram | frontmatter |
| `.requirementDiagramTitleText` | requirement diagram | frontmatter |
| `.gitTitleText` | gitgraph | frontmatter |
| `[class$="TitleText"]` | safety net | catches future `*TitleText` variants |

**Known gap — bare `<text>` titles.** Six diagram types render their title as a `<text>` element with no CSS class: sequence, journey, C4, quadrant, timeline, xy-chart. These cannot be class-targeted from CSS and remain visible. The slide heading still provides the canonical title; the in-SVG title shows alongside it. This is a documented gap, not a bug. Trying to target these by structural position (e.g. "first text element") would be fragile across Mermaid versions.

**Two title syntaxes in Mermaid.**

1. **YAML frontmatter** (`---\ntitle: My Title\n---\nflowchart LR\n...`) — flowchart, sequence, class, state, ER, requirement, gitgraph, mindmap, and most types support this.
2. **In-body directive** (`gantt\n  title My Title\n...`) — gantt, pie, journey, quadrant, C4, timeline, xychart, radar, packet.

Some types accept both. The rendered CSS class is determined by diagram type, not by which syntax was used to set the title.

**Diagnostic recipe (when Mermaid adds a new diagram type).**

1. Add a `title` directive to the diagram in `examples/mermaid-gallery.md`.
2. Build to HTML via `node lattice.js examples/mermaid-gallery.md ...`.
3. Open the HTML in a browser so Mermaid renders the SVG client-side.
4. Save the post-render DOM (DevTools → Elements → copy outerHTML on the `<svg>`).
5. Grep for the title text string. Inspect the surrounding `<text>` element's `class` attribute.
6. If the class follows the `*TitleText` pattern, the existing safety net catches it automatically.
7. If it uses a bespoke class (like `radarTitle` or `packetTitle`), add it explicitly to all three CSS locations.
8. If the title renders as a bare `<text>` with no class, document it under the known-gap list above; do not attempt a structural selector.

**Never guess class names.** They are inconsistent across diagram types — some use camelCase suffix `TitleText`, some use bespoke names like `radarTitle`, some have no class at all. Always verify from rendered output.

**Mermaid parser limits inside themeCSS.** Two structural restrictions on what `%%{init: { themeCSS: ... } }%%` accepts without silently dropping the entire field:

1. **No CSS comments** (`/* ... */`) — `lattice.js` strips them from the themeCSS block before injection (see `resolveVarsInThemeCSS` and the comment-stripping pass on line ~491). Comments are fine in the source palette file; they are removed pre-injection.
2. **No `>` child combinator** — breaks the parser the same way. The current title-suppression rule uses descendant combinators only.

Attribute selectors with brackets (`[class$="TitleText"]`) are safe — they are already used by the mindmap section overrides (`[class*="section-0"]`) and parse without issue.

---
