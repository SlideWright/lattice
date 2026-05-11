# Tauri exploration — desktop authoring app for Lattice

**Status:** in progress. Strategy discussion 2026-05-11 narrowed the
architecture from "should we use Tauri?" to "what's the v1 shape, and
what runway do we leave for the long-term vision?" This note captures
both the decisions taken and the open questions still to probe.

The repo README names Tauri as the chosen stack for SlideWright. This
note revisits that choice deliberately — and ends up keeping it, but
with a much sharper picture of what the v1 app actually is.

## Product vision

Direct from authoring intent (May 2026):

- **Core.** Intuitive, seamless desktop authoring of PDF-quality slide
  decks using *native markdown*. The source the user writes is the
  source Lattice already renders.
- **Editor experience.** Three layout modes — *focused* (markdown
  only), *split* (markdown + preview, resizable divider, orientation
  and side both user-controlled), and *picture-in-picture* (markdown
  full-pane + floating, resizable preview). Preview tracks the caret —
  the current slide always stays in view. Edits reflect immediately,
  with **incremental rendering**: only the actually-changed slide
  re-renders.
- **Exports.** PDF (primary), HTML, PNG sets, Markdown, PPTX (including
  Marp's experimental *native PPTX* path), Confluence, slides.com,
  Google Slides (scope TBD).
- **Mermaid is first-class.** Authored, validated, rendered, themed,
  and rasterized to image for platforms that don't render Mermaid
  natively.
- **Cloud storage.** Google Drive, Google Workspace, Microsoft 365,
  OneDrive, SharePoint.
- **Collaboration.** Real-time multi-user editing (eventually).
- **AI assistance.** Claude integration for authoring assistance
  (eventually).
- **App theming.** App chrome adopts the active deck palette —
  subtle accent on by default, full immersive opt-in. App
  color-scheme stays independent of the deck palette.
- **Brand theming.** Users author their own palettes from brand
  colors with live iterative preview, producing portable
  `themes/<brand>.css` files.

The vision is deliberately ambitious. The v1 architecture is shaped
to make each later item *additive* rather than a rewrite.

## What Lattice brings to the table

Constraints the desktop shell must absorb:

- **Renderer is JavaScript.** `lattice-emulator.js` (build-time) and
  `lattice-runtime.js` (browser) — both pure JS. The runtime path is
  what the desktop app actually uses.
- **Marp.** `@marp-team/marp-core` ships a *browser bundle* — pure JS,
  runs in any WebView. Marp CLI is a Node wrapper around it; we don't
  need the wrapper.
- **Puppeteer + bundled Chromium.** Required only by the CLI's PDF
  path. **Not needed in the desktop app** — Tauri's WebView is itself
  Chromium/WebKit, with native print-to-PDF.
- **Themes are CSS files.** Live preview is "change a CSS custom
  property" — already supported by `lattice-runtime.js`.
- **Output formats.** PDF / HTML / PPTX / PNG sets from the same
  source. PPTX is the one format that genuinely needs a Node sidecar
  (Marp's PPTX pipeline). All others are achievable from inside the
  WebView.
- **11+ palettes** already in `themes/`. Any palette-contract
  extension we add has to apply to all of them.
- **Slides are 1280×720.** PNG export at `--image-scale 3` (3840×2160).
- **Two galleries** (`examples/gallery.md`, `examples/mermaid-gallery.md`)
  are the authoritative test fixtures. Reused as preview surfaces in
  ThemeStudio.

## V1 architectural shape

### Stack at a glance

| Layer | Choice | Why load-bearing now |
|---|---|---|
| Shell | **Tauri** | Rust core pays off for OAuth + system keychain; WebView is Chromium |
| UI framework | **Svelte 5** | Smallest WebView footprint; not load-bearing (Solid/React also viable) |
| UI components | **Headless or hand-rolled**, token-driven CSS | Required for the app-theming feature to work |
| Editor | **CodeMirror 6 behind `EditorHost` facade** | Swappable to Monaco trivially; ProseMirror/Tiptap is a UX shift |
| Document model | **Yjs (`Y.Doc`) from day one** | Unblocks AI editing + collaboration without retrofit |
| Markdown → slides | `@marp-team/marp-core` (browser bundle) | Pure JS in WebView; no Node needed |
| Diagrams | **`DiagramService`** (named subsystem) | One owner for Mermaid lifecycle across editor, preview, exports |
| Preview pipeline | **`SlideSegmenter` + `RenderCache` + `PreviewPane`** | Incremental rendering (only changed slides re-render) keyed by slide content hash |
| Workspace layout | **`LayoutShell`** | Focused / split / PiP modes with persisted user prefs |
| Theme contract | **Palette contract library** (lifted from test suite) | One source of truth: app, CLI, CI, ThemeStudio |
| Theme authoring | **`ThemeStudio`** (named subsystem) | Brand-driven palette authoring with live preview |
| Export | **Adapter interface** | Lets PPTX / Confluence / slides.com land additively |
| Storage | **Adapter interface** | Lets Drive / OneDrive / 365 land additively |
| AI | Anthropic SDK in WebView | Plugs into Yjs as another client when ready |

### No Node in v1

Tauri's WebView *is* Chromium/WebKit. Everything Puppeteer does
(render HTML, print to PDF, screenshot) is native to the shell. v1
ships with **no Node runtime, no Puppeteer, no `marp-cli`, no
LibreOffice**.

Implications:

- Small installer.
- One language for the app proper (JS/TS in the WebView; Rust only
  for shell-native concerns).
- The export-adapter interface is shaped so a Node sidecar adapter
  is a *one-file addition* the day PPTX ships. We pay the design
  cost now, not the bundle cost.

### What we add into the WebView

| Lib | Purpose | Already in repo? |
|---|---|---|
| `@marp-team/marp-core` (browser) | Markdown → slide HTML | No — add |
| `mermaid` | Diagram rendering | Yes (`mermaid-v11.min.js`) |
| `highlight.js` | Render-side code highlighting | Yes (dep) |
| `@codemirror/state` + `view` + `lang-markdown` + nested language packages | Editor + markdown highlighting | No — add |
| `yjs` + `y-codemirror.next` | CRDT document model | No — add |
| Anthropic SDK | AI integration | No — add later |
| `lattice.css` + theme CSS | Layouts + palettes | Yes |
| `lattice-runtime.js` | Theme variable plumbing, Mermaid theming | Yes |

Curated nested-language set for v1: JS/TS, Python, Rust, Bash, YAML,
JSON, HTML/CSS, SQL, Markdown.

### What we use Tauri for

- File I/O (open/save `.md`, asset path resolution)
- `webview.print_to_pdf()`
- Save-as / open dialogs
- File watcher (external edits to the open deck)
- Window / session state
- System keychain (OAuth tokens, later)
- Bundler (DMG / MSI / AppImage / deb)

## Named subsystems

### Document model — `Y.Doc`

A `Doc` is **not** "the open .md file." It's a Yjs CRDT containing:

- Source markdown (`Y.Text`)
- Theme reference, metadata, asset refs (`Y.Map`)
- Sync state

The .md file is *one* representation — what the local-FS storage
adapter persists. The same `Doc` can:

- Sync to Drive / OneDrive via a sync provider
- Get AI-edited as another Yjs client (with human accept/reject via
  `Y.UndoManager`)
- Host live multi-user collaboration when a websocket provider is
  attached

Picking up Yjs *now*, with zero sync providers attached, costs ~50 KB
of bundle and adds undo/redo + dirty tracking for free. Retrofitting
it later would mean replacing the editor's entire state layer.

### Editor — `EditorHost` facade

A thin interface in our own code:

```
EditorHost
  ├─ mount(node, ydoc) / unmount
  ├─ focus / scroll-to / get & set selection
  ├─ addDecorations(ranges, kind)   // syntax, AI suggestions, lint
  └─ events: caret, selection, viewport-change
```

CodeMirror 6 is the v1 implementation. The app never imports
CodeMirror directly. Monaco swaps cleanly behind the facade;
ProseMirror / Tiptap is a UX shift, not just a code shift.

Most editor work goes through Yjs anyway, so the facade stays small
(~200 lines of glue).

### Diagrams — `DiagramService`

Mermaid handling is consolidated into one named module:

```
DiagramService
  ├─ parse(source)         → { ast, errors }
  ├─ render(source, theme) → SVGElement
  ├─ themeVars(palette)    → Mermaid themeVariables (per lattice-runtime.js)
  ├─ rasterize(svg, scale) → PNG blob
  └─ skeleton(type)        → starter source for flowchart / sequence / gantt / …
```

Consumers:

- **Editor** — syntax highlighting in mermaid fenced blocks; focused-
  block preview; parse errors in the editor gutter.
- **Live preview** — already works via `lattice-runtime.js`.
- **Export adapters** — pass-through for platforms that render
  Mermaid; rasterize for those that don't (deck-wide "flatten
  Mermaid" flag).
- **Command palette** — "Insert diagram → flowchart / sequence /
  class / state / gantt …" drops a working skeleton.

**Render cache (sub-cache).** Internal cache keyed by `(source,
paletteSig) → SVG`. Mermaid is the slowest renderer (hundreds of ms
per diagram); the cache makes editing prose around a diagram-heavy
slide cheap — the diagram's SVG is reused while the surrounding
slide re-renders. Independent of the slide-level `RenderCache`:
survives slide invalidations as long as the Mermaid source itself
is unchanged. Same pattern (smaller win) for highlight.js code
renders.

### Preview pipeline — `SlideSegmenter` + `RenderCache`

Naive "re-render the whole deck on every keystroke" hits a wall
fast — a 70-slide deck with Mermaid is hundreds of ms per
keystroke. The v1 architecture uses **slide-level diffing with
content-hashed caching**, two coupled subsystems.

#### `SlideSegmenter`

```
segment(markdown) → [{ index, lineRange, source, hash }]
slideAtLine(line) → index           // caret → slide mapping
diff(prev, next)  → { added, removed, changed, moved }
```

Runs on every `Y.Text` change observer event. Hashing is by
*content*, not index — inserting a slide doesn't cache-miss every
slide after it.

#### `RenderCache`

```
get(hash, paletteSig)        → renderedSlide | null
set(hash, paletteSig, slide) → void
```

LRU eviction with ~200 entries (covers a 70-slide deck × 3 recent
palettes). Cache key includes the palette signature so a palette
change invalidates exactly what the palette controls.

#### Render loop on each edit

1. `Y.Text` change → `SlideSegmenter` recomputes the slide list
2. Diff against previous → typically 0–1 changed slides
3. For each changed slide: render via marp-core's single-slide path
   (see **H3a** below); store in `RenderCache`
4. For *moved* or *unchanged* slides: reuse cached DOM nodes
5. `PreviewPane` patches only the affected slide nodes

Cost per keystroke: sub-millisecond segment + a few ms render of
one slide + instant DOM swap. Hits "edits reflected immediately"
easily.

The fallback (if H3a fails): full-deck render but slide-level DOM
patching only — slower but still incremental at the DOM layer.

### Preview — `PreviewPane`

Owns the rendered-slide DOM and its scroll state.

- Consumes the slide list and `RenderCache` entries; performs
  keyed DOM diffing (reorder, replace, insert, remove)
- Scrolls the active slide into view (driven by
  `SlideSegmenter.slideAtLine` on caret moves); smooth scroll,
  configurable
- Optional active-slide highlight ring in the deck's accent color
  (toggle in View menu)
- **Preview click → editor caret** (preview-to-source navigation) —
  deferred to v1.x

Same component in all three layout modes; only its container
changes.

### Workspace layout — `LayoutShell`

Three editor/preview layouts, expressed as the same two children
(editor + preview) under a different container.

| Mode | Layout |
|---|---|
| **Focused** | Editor full-pane; preview hidden. **Tap-to-peek** shortcut shows preview transiently — preserves focus without forcing a mode change. |
| **Split** | Editor + preview as flex children. Direction (`row` / `column`) and order (which side each pane appears) user-controlled. Resizable divider. |
| **Picture-in-picture** | Editor full-pane; preview as absolute-positioned overlay; resizable + draggable. **Freeform position in v1; corner-snap in v1.x.** |

User preferences (mode, split ratio, orientation, side assignment,
PiP position + size) persist via Tauri session state, per-window.

### Export — adapter interface

Signature: `(doc, options) → artifact`. Implementations land
independently.

| Adapter | Backend | Phase |
|---|---|---|
| PDF | WebView `print_to_pdf` | v1 |
| HTML | serialize rendered output | v1 |
| PNG set | WebView screenshot per slide | v1 |
| Markdown | passthrough + dialect transforms (e.g. Confluence-flavored) | v1 |
| Mermaid → PNG (deck-wide flatten) | canvas rasterize SVG | v1 |
| PPTX | Node sidecar + `marp-cli` | v1.x |
| Native PPTX | Node sidecar + Marp experimental flag | v1.x |
| Confluence | HTTP adapter | later |
| slides.com / Google Slides | HTTP adapter | later |

### Storage — adapter interface

Signature: `(docId) ↔ Doc`. Implementations:

- **Local FS** — Tauri FS API (v1)
- **Google Drive / Workspace** — OAuth via Tauri deep-link plugin +
  Drive API (later)
- **OneDrive / Microsoft 365 / SharePoint** — same pattern (later)

OAuth flows and secure token storage are where Tauri's Rust core
pays off (system keychain integration).

Themes ride the same adapter — a user-authored theme is just another
`Doc`.

### Theme system

Two pieces.

#### Palette contract library

Lifted out of `test/unit/` (the var-map check) into a first-class
runtime module. One source of truth for "what a valid Lattice
palette is," consumed by:

- The app (live validation in ThemeStudio)
- The CLI (`lattice-emulator.js` pre-render check)
- CI (existing test gate)
- ThemeStudio (its core dependency)

Mostly a refactor of existing logic.

#### `ThemeStudio` — user-authored themes with iterative preview

**Brand-driven scaffold (default).** User enters 1–3 brand colors
plus a light/dark choice. ThemeStudio generates a complete valid
palette:

- Tints / shades for surfaces
- Complementary neutrals
- Ink colors that hit WCAG AA on every surface
- App-chrome tokens via the same color logic
- Mermaid `themeVariables` derivation

**Per-token editor (drill-down).** Override any individual token.
Power-user surface; most users never open it.

**Live preview tabs.** Same render path as the rest of the app —
change a token → all surfaces update instantly via CSS custom
properties.

| Tab | Shows | Source |
|---|---|---|
| Slide gallery | All 26+ layouts under the in-progress palette | `examples/gallery.md` |
| Mermaid gallery | All 25 diagram types | `examples/mermaid-gallery.md` |
| App chrome | Toolbar, panels, dialogs, focus states | Synthetic mock screen |
| Contrast matrix | WCAG AA result for every text-on-surface pair | Token-pair derivation |

**Output.** A real `themes/<brand>.css` file — same shape as built-in
palettes. Themes authored in the app are **portable**: drop the file
into a CLI Lattice install and it works. No proprietary lock-in.

**Draft state.** Themes-in-progress save without passing validation
but can't apply to a deck until they do.

**v1 scope:** colors only. Typography deferred.

### Palette contract extension — app-chrome tokens

Every palette declares its own app-chrome tokens (option 1 from the
mapping discussion — explicit per-palette control rather than a
derivation recipe):

```
--app-window-bg     --app-panel-bg      --app-toolbar-bg
--app-divider       --app-text          --app-text-muted
--app-accent        --app-accent-fg
--app-focus-ring    --app-hover         --app-selected
```

Token list above is a sketch — final list takes a design pass.

**Rollout for the 11+ existing palettes:**

1. Finalize the app-chrome token contract on `indaco` + `cuoio`.
2. Port the rest mechanically.
3. Extend the var-map test to require app-chrome tokens.
4. Extend the WCAG AA check to cover app-chrome text-on-bg pairs.

### Code highlighting — two surfaces

- **Editor (live as the user types):** `@codemirror/lang-markdown`
  with nested languages. Each language is its own small package.
- **Render (in actual slides):** highlight.js, already wired through
  Marp. `lib/mermaid-hljs.js` already extends it for Mermaid source.

Two libraries, intentionally separate (incremental + error-tolerant
vs. fast one-shot). Colors won't exactly match across editor and
preview; this is normal in code-aware apps and not worth unifying.

### App theming — three orthogonal knobs

1. **App color-scheme** — system / light / dark (user preference, OS-aware)
2. **App palette tint** — none / **subtle accent (default)** / full immersive (opt-in)
3. **Deck palette** — whatever the deck declares (always reflected in preview pane)

The preview pane always reflects #3. The rest of the app respects
#1 and #2. Collapsing them into one knob is the trap.

### UI component layer

Headless component libraries (Bits UI / melt-ui for Svelte; Radix
for React) or hand-rolled components. **No heavily-themed UI
libraries** (Material, Chakra, etc.) — they bring their own theme
system that fights the palette tokens.

Token-driven CSS throughout. Components consume the active palette's
CSS custom properties; tint #2 above just changes which tokens are
in scope.

### AI / Claude integration

- Anthropic SDK runs in the WebView — no IPC overhead.
- AI-suggested edits translate to Yjs ops and apply to `Y.Doc`.
- Human accept/reject of suggestions via `Y.UndoManager`.
- Tauri's HTTP client is a fallback if CORS issues arise on any
  endpoint.

Yjs is what makes this clean — AI is just another client of the
same document, same as a remote collaborator.

## Open questions

The original integration questions are largely resolved by the
architecture above:

- **~~Q1 (Tauri ↔ Node)~~** — no Node in v1. Sidecar lands in v1.x
  for PPTX only.
- **~~Q2 (Chromium location)~~** — Tauri's WebView is Chromium; no
  separate bundle.
- **~~Q3 (Live preview model)~~** — runtime-in-WebView via
  `@marp-team/marp-core` + `lattice-runtime.js`.
- **~~Q4 (PPTX)~~** — deferred to v1.x via Node sidecar; native PPTX
  uses Marp's experimental flag through the same sidecar.

Still open:

### 1. Multi-window / multi-deck

Out of scope for v1, or shape the architecture now? Tauri supports
it cleanly; one `Y.Doc` per window is fine. Affects state-management
organization in the UI layer.

### 2. Inline Mermaid in the editor pane

| Option | What it looks like | Cost | Editor implication |
|---|---|---|---|
| 1. None | Editor = source only; preview pane shows rendered | Lowest | CodeMirror fine |
| 2. Focused side-pane | Caret in mermaid block → small pane renders just that diagram | Moderate | CodeMirror fine |
| 3. Inline overlay | Source visually replaced by rendered diagram, click to edit (Notion-style) | High | Pushes toward ProseMirror / Tiptap |

Option 3 is the editor-choice-pivoting decision. Lean: 1 or 2 for
v1, revisit 3 later.

### 3. Google Workspace scope

- **File sync** — `.md` / `.pdf` / `.pptx` lives in Drive (just a
  storage adapter)
- **Bidirectional with Google Slides** — round-trip markdown ↔
  Slides API (a new export+import adapter pair)

Very different scopes. v1 lean: file sync only.

### 4. Brand-scaffold algorithm

v1: deterministic recipe (tint/shade math + WCAG constraint check).
v2: AI-assisted via the Claude hook. Tracking item.

### 5. Typography in the palette contract

Deferred to v1.x as an additive extension. Implications when it
lands:

- New tokens (`--font-display`, `--font-body`, `--font-mono`,
  weights)
- Font embedding in PDFs (browser print path already handles)
- Font name mapping for PPTX (PPTX doesn't embed fonts)
- Bundled set vs. user-provided fonts in the app

### 6. Collaboration backend

Yjs document model is ready; the sync transport is open. Options:
self-hosted `y-websocket`, hosted (Liveblocks, Hocuspocus), or
WebRTC for peer-to-peer. Decision can wait until collaboration ships.

## Hypotheses to test

Earlier hypotheses re-scoped to the no-Node v1 architecture:

- **H1.** *(v1.x — PPTX only)* A Tauri Node sidecar invocation of
  `lattice-emulator.js` produces byte-identical output to the CLI
  for `examples/gallery.md`.
- **H2.** *(v1.x — PPTX only)* Sidecar cold render latency for a
  10-slide deck is under 3 s.
- **H3.** *(v1 — load-bearing)* `@marp-team/marp-core` browser
  bundle + `lattice-runtime.js` reaches feature parity with the
  emulator for live preview, with theme switching in real time.
- **H3a.** *(v1 — load-bearing for incremental rendering)*
  `@marp-team/marp-core` supports rendering individual slides (or
  can be wrapped cleanly to do so) such that a single-slide render
  is identical to the same slide rendered inside a full-deck pass.
  If false, fallback is full-deck render + slide-level DOM patching
  only — slower but still workable.
- **H4.** ~~Bundled Chromium adds < 200 MB to the installer.~~ N/A —
  no Chromium bundle (Tauri WebView).

New v1-load-bearing hypotheses:

- **H5.** WebView `print_to_pdf` produces output visually
  indistinguishable from `marp-cli --pdf` for `examples/gallery.md`
  (vector text, embedded Mermaid SVG, syntax-highlighted code).
- **H6.** WebView screenshot-per-slide produces a PNG set matching
  `marp-cli --images png --image-scale 3` (3840×2160) within a
  diff tolerance.
- **H7.** Yjs + `y-codemirror.next` adds < 100 KB minified+gz to the
  bundle.
- **H8.** Per-palette app-chrome tokens pass WCAG AA on `indaco` and
  `cuoio` without manual tuning beyond the brand-scaffold recipe.

## Decision criteria

Tauri stays as the chosen shell if **H3, H5, H6** all pass — each
is load-bearing for the no-Node v1 architecture:

- **H3** — live preview parity (the editor inner loop)
- **H5** — PDF export fidelity (the primary delivery format)
- **H6** — PNG export fidelity (image-set exports)

Tauri gets replaced (likely by Electron) only if one of these can't
be made to work — i.e., the WebView genuinely can't host the
renderer faithfully. Bundle size, contributor friction, and Rust
toolchain costs are *not*, by themselves, replacement triggers.

## Trials

*(Empty — fill in as probes run.)*

| Date | Probe | Outcome | Notes |
|------|-------|---------|-------|

## Findings

*(Empty — fill in once trials accumulate enough to draw a conclusion.)*

## Next step

Three v1-load-bearing probes, in dependency order:

1. **H3 + H3a — Live preview parity & single-slide render.**
   Minimal HTML page in a Tauri WebView that loads
   `@marp-team/marp-core` + `lattice-runtime.js`, renders
   `examples/gallery.md` from a string, switches palette in real
   time, **and renders a single slide independently and compares it
   to the same slide inside a full-deck render** (H3a). If both
   pass, the v1 architecture is live and incremental rendering is
   unlocked.
2. **H5 — PDF export.** Trigger `webview.print_to_pdf()` on the
   rendered output. Compare visually to `marp-cli --pdf` reference.
3. **H6 — PNG export.** Screenshot each rendered slide via the
   WebView API. Compare to `marp-cli --images png` reference at 3×
   scale.

H7 (Yjs bundle size) and H8 (per-palette app-chrome WCAG) are
cheaper and can run in parallel.

Everything else — editor work, ThemeStudio, AI hook, export adapters
beyond PDF/PNG/HTML — waits on these three.
