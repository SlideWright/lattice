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

```text
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

**Where the suppression lives.** A single rule in `lattice.css`'s DIAGRAM OVERRIDES section (`section .titleText, section .pieTitleText, …, section [class$="TitleText"] { display: none; }`). Loaded by every render path; reaches the inline SVG via the host page cascade. No per-palette duplication.

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

1. Add a `title` directive to the diagram in `lib/components/diagram/diagram/diagram.gallery.md`.
2. Build to HTML via `node lattice-emulator.js lib/components/diagram/diagram/diagram.gallery.md ...`.
3. Open the HTML in a browser so Mermaid renders the SVG client-side.
4. Save the post-render DOM (DevTools → Elements → copy outerHTML on the `<svg>`).
5. Grep for the title text string. Inspect the surrounding `<text>` element's `class` attribute.
6. If the class follows the `*TitleText` pattern, the existing safety net catches it automatically.
7. If it uses a bespoke class (like `radarTitle` or `packetTitle`), add it to the suppression rule in `lattice.css`'s DIAGRAM OVERRIDES section.
8. If the title renders as a bare `<text>` with no class, document it under the known-gap list above; do not attempt a structural selector.

**Never guess class names.** They are inconsistent across diagram types — some use camelCase suffix `TitleText`, some use bespoke names like `radarTitle`, some have no class at all. Always verify from rendered output.

**Marp-vscode preview parser quirk.** One CSS pattern is silently broken in the marp-vscode Chromium build (the preview applies via JS but the rule never matches): `:not(:has(...))` and `:is(:has(...), :has(...))`. Plain `:has()` is fine; nested inside `:not()` / `:is()` it isn't. Use descendant combinators or compound selectors instead. See `engineering/gotchas.md`. (Historical note: when the build path injected CSS via Mermaid's `themeCSS` init parameter, two additional limits applied — no CSS comments, no `>` combinator. That path no longer exists; rules now live in `lattice.css` and reach the SVG via host-page cascade, so both restrictions are gone.)

---
