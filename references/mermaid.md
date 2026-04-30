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
