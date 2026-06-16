# highlight-js

Lattice's integration with [highlight.js](https://highlightjs.org/) —
the syntax highlighting library used for code blocks (`\`\`\`<lang>`
fences).

**External dep:** `highlight.js` (transitively via
`@mermaid-js/mermaid-cli` in `package.json`).

**Files in this folder:**

| File | What it implements |
|---|---|
| `highlight-js.css` | Token theme. Wires hljs's `.hljs-keyword`, `.hljs-string`, `.hljs-comment`, etc. classes to Lattice's `--hljs-*` tokens defined in `lib/base/base.tokens.css`. Palette-blind — themes provide the token values. |

---

## Render pipeline

A `\`\`\`<lang>` code fence is processed in this order:

1. **Owned engine path** (`lib/engine`): the engine's built-in
   highlight.js integration runs at render time. Each fence becomes a
   `<pre class="hljs language-<lang>"><code>…</code></pre>` block with
   token spans inside.
2. **Emulator path** (`lattice-emulator.js`): the emulator imports
   `highlight.js` directly and calls `hljs.highlight(code, {language})`
   on each fence during HTML construction.

Both paths produce the same token markup. Token CSS in
`highlight-js.css` then colors the spans.

---

## Custom language definitions Lattice ships

Lattice extends highlight.js with one custom language:

- **Mermaid** — `lib/integrations/mermaid/mermaid.hljs.js`. The
  language definition lives next to the rest of the Mermaid
  integration (subject over means — see that doc for the rationale).

Registration happens in the engine plugin (`registerMermaidHljs`):

```js
const mermaidLanguage = require("./lib/integrations/mermaid/mermaid.hljs");
hljs.registerLanguage("mermaid", mermaidLanguage);
```

The emulator path performs the same registration during its hljs
init block.

**Adding a new custom language.** Create
`lib/integrations/<subject>/<subject>.hljs.js` next to the rest of
that subject's integration files. Add a one-line entry to this doc's
"Custom language definitions" list. Register it in
`lib/engine` and `lattice-emulator.js`.

---

## Token contract

`highlight-js.css` references these CSS custom properties (defined in
`lib/base/base.tokens.css`):

| Token | Hljs tokens consuming it |
|---|---|
| `--hljs-keyword` | `.hljs-keyword`, `.hljs-built_in`, `.hljs-type` |
| `--hljs-string` | `.hljs-string`, `.hljs-attr` |
| `--hljs-comment` | `.hljs-comment`, `.hljs-quote` |
| `--hljs-number` | `.hljs-number`, `.hljs-literal` |
| `--hljs-name` | `.hljs-name`, `.hljs-tag`, `.hljs-section` |
| `--hljs-meta` | `.hljs-meta`, `.hljs-symbol`, `.hljs-bullet` |

Palette themes set the token values to fit their voice (cool indigo
for indaco's keywords, warm sienna for cuoio's, etc.). Code blocks
recolor automatically when the active palette changes.

---

## See also

- `lib/components/code/code.docs.md` — the `code` layout that hosts a
  single highlighted block.
- `lib/components/compare-code/compare-code.docs.md` — the
  side-by-side code comparison layout.
- `lib/integrations/mermaid/mermaid.docs.md` — describes the custom
  Mermaid hljs language definition.
