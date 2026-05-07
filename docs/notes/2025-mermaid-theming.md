# AgentNote — Mermaid Theming Fixes

> Written by GitHub Copilot after autonomous investigation and fixes across two sessions.

---

## Root Cause: Marp CSS Variable Scoping

**Problem**: Mermaid diagrams rendered with the default yellow palette instead of the active Lattice theme colors.

**Root Cause**: Marp transforms `:root { --var: val }` declarations into:
```css
div#\:\$p > svg > foreignObject > :where(section):not([root]) { --var: val }
```
CSS custom properties are therefore scoped to **`<section>` elements**, not `document.documentElement`. The original `buildMermaidThemeVars()` called `getComputedStyle(document.documentElement)`, which always returned empty strings for all Marp-defined theme tokens.

**Fix** (`lattice-runtime.js`):
```js
// Before (broken):
const s = getComputedStyle(document.documentElement);

// After (fixed):
const scopeEl = document.querySelector('section') ?? document.documentElement;
const s = getComputedStyle(scopeEl);
```

**Sentinel guard**: Before calling `mermaid.initialize()`, we verify that `buildMermaidThemeVars().primaryColor` is non-empty. If empty, the retry loop defers to the next tick. This prevents initializing Mermaid before the theme CSS is applied to the DOM.

---

## Theming Contract

Two mechanisms work together:

### 1. `themeVariables` (primary — `lattice-runtime.js`)
`buildMermaidThemeVars()` reads 45 CSS custom properties from the active `<section>` element and maps them to Mermaid's `themeVariables` object. This covers:
- Canvas background, primary/secondary/tertiary fills
- All text colors (`textColor`, `titleColor`, `labelTextColor`, etc.)
- Line and edge colors
- Sequence diagram actor/note/signal colors
- Pie chart colors (pie1–pie12)
- Gantt task/grid/critical colors
- Gitgraph branch colors (git0–git7)
- Categorical scale (cScale0–cScale11) — fallback for diagram types that read cScale directly
- Flowchart `mainBkg`, `clusterBkg`, `nodeBorder`
- Quadrant chart fills and text colors

### 2. `themeCSS` (gap-fills — `themes/*.css`)
The `/* ===== MERMAID THEME CSS ===== */` section in each theme file overrides specific diagram types whose renderers do **not** read `themeVariables` for all properties:

| Diagram | Why themeCSS needed |
|---------|-------------------|
| Journey | Hardcodes fill on `.journey-section` and `.task*` elements |
| Mindmap | `.mindmap-node[class*="section-N"]` ignores `cScale` for fill |
| Kanban / Timeline | `.cluster.section-N rect` / `.section-N` elements ignore `cScale`; Timeline uses `section-0` for its first period |
| Gitgraph | Arrow markers default to black fill regardless of `lineColor` |
| Treemap | `.treemapLeaf` colors set via hardcoded class rules |
| C4 | `.person`, `.system`, `.container`, `.component` use class-based fills |
| Radar | Graticule fill and axes need explicit overrides |
| Venn / Ishikawa / Gantt | Minor explicit color anchors |

**Contract**: `themeVariables` is the primary mechanism. `themeCSS` only exists to patch what `themeVariables` cannot reach. Never duplicate a color in `themeCSS` that `themeVariables` already handles.

---

## CDN → Local Mermaid Bundle

**Problem**: All slide decks loaded Mermaid from jsDelivr CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
```
This caused inconsistent rendering because:
1. The CDN may be unavailable in restricted environments (corporate networks, VS Code webview CSP)
2. Network latency means the script loads after `lattice-runtime.js` fires its first retry, wasting retry budget
3. VS Code's Markdown preview webview may block external scripts

**Fix**: Changed to the local UMD bundle in all markdown files:
```html
<script src="../node_modules/mermaid/dist/mermaid.min.js"></script>
```
The local bundle is `node_modules/mermaid/dist/mermaid.min.js` — a ~3 MB UMD bundle that sets `globalThis["mermaid"]`. This is the same version as the CDN (`mermaid@11`), loaded synchronously from the local filesystem.

**Files changed**:
- `examples/gallery.md` (+ regenerated `examples/gallery.html`)
- `examples/mermaid-gallery.md`
- `.scratch/tokenization-business.md`
- `.scratch/tokenization-design.md`

---

## `cuoio.css` Section-N Parity

**Problem**: `themes/cuoio.css` had Kanban/Timeline section-N CSS overrides frozen at an older format:
- Only covered `section-1` through `section-4`
- No `section-0` (Timeline uses `section-0` for its first period — it was unthemed)
- No `section-5`
- Only targeted `rect` shapes (missed `path` and `circle` nodes)
- No text/tspan/span color overrides within sections

**Fix**: Expanded the `/* ── KANBAN ── */` block in `cuoio.css` to match `indaco.css`:
- `section-0` through `section-5` (6 slots)
- Each slot covers `rect`, `path`, `circle` fills + stroke
- Each slot includes `text`, `tspan`, `span` color override
- Color mapping: `section-0 → primary`, `section-1 → secondary`, `section-2 → pie-purple`, `section-3 → pie-orange`, `section-4 → pie-teal`, `section-5 → pie-rose`

---

## Files Changed (This Session)

| File | Change |
|------|--------|
| `lattice-runtime.js` | `buildMermaidThemeVars()` reads from `section` element; sentinel guard added |
| `themes/indaco.css` | Section-N expanded to 0..5, path/circle shapes, text overrides |
| `themes/cuoio.css` | Section-N expanded to 0..5, path/circle shapes, text overrides (parity with indaco) |
| `examples/gallery.md` | CDN → local mermaid |
| `examples/gallery.html` | Regenerated from gallery.md |
| `examples/mermaid-gallery.md` | CDN → local mermaid |
| `.scratch/tokenization-business.md` | CDN → local mermaid |
| `.scratch/tokenization-design.md` | CDN → local mermaid |
| `AgentNote.md` | This file |

---

## VS Code Extension Behaviour

Marp VS Code extension v3.4.1 uses `@marp-team/marp-core` v4.3.0 which **does not bundle Mermaid**. The extension preview:
- Strips external `<link rel="stylesheet">` elements (via `removeStyles()` in `preview/preview.js`)
- Keeps and executes `<script>` tags from user HTML content
- The `marpCoreOptionForPreview` sets `script: false` — this only disables Marp's own polyfill injection, not user HTML scripts

The `.vscode/settings.json` correctly registers both themes:
```json
"markdown.marp.themes": ["themes/cuoio.css", "themes/indaco.css"]
```
`lattice.css` is not listed separately because both themes import it via `@import 'lattice'`.

---

## Retry Architecture (`lattice-runtime.js`)

| Mechanism | Purpose |
|-----------|---------|
| 40 × 100 ms polling loop | Waits for Mermaid UMD to load and CSS vars to be available |
| Extra pass at 700 ms | Catches slow CSS application after initial render |
| `MutationObserver` | Re-runs `upgradeFences()` when new mermaid blocks are added (live editing) |
| `__llMermaidConfigured` flag | Prevents double-initialisation across multiple script executions |
| Sentinel guard on `primaryColor` | Skips `mermaid.initialize()` if theme CSS vars are not yet in the cascade |
