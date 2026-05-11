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
- **Workspace.** Collapsible file/folder sidebar (`WorkspaceView`).
  App launches with a file, a folder, or last session: opening a
  file sets the parent folder as workspace root; opening a folder
  sets it as root with no file open. Click `.md` to edit, image to
  preview, theme `.css` to open in ThemeStudio. Drag an image into
  the editor inserts a markdown reference. Right-click for
  new/rename/delete. External changes watched. The sidebar is
  **orthogonal** to focused/split/PiP modes.
- **Settings.** Layered configuration — defaults → user → workspace
  — with **workspace-scoped overrides that travel with the project**
  (`.slidewright/settings.json`, parallel to VS Code's `.vscode/`).
  Settings editable via UI or JSON. Extensions contribute to the
  schema (autocomplete + validation in the JSON editor). Secrets
  never live in settings — credentials are referenced by ID and
  resolved from the system keychain, so workspace settings can be
  safely committed to git.
- **Onboarding.** First-run welcome screen, a **welcome deck**
  authored as a real Lattice deck (every important layout, palette,
  Mermaid diagram, code highlight — dogfooded), and a small
  spotlight tour for things only the live UI can show (drag
  dividers, command palette, mode shortcuts). Re-entrant from Help
  menu; skippable from anywhere; never modal-blocking. Extensions
  can contribute their own tours.
- **UI surfaces.** Minimalist by default, powerful for experts.
  Application menu + right-click context menus for discovery;
  **command palette (⌘K)** as the power-user equalizer with every
  action reachable; status bar for state indication; **toolbar off
  by default**. All surfaces consume from one central command
  registry — extensions contribute commands, menus, status-bar
  items, and keybindings via the manifest. `when` clauses hide
  irrelevant items rather than greying them out, so menus stay
  focused.
- **Exports.** PDF (primary), HTML, PNG sets, Markdown, PPTX (including
  Marp's experimental *native PPTX* path), Confluence, slides.com,
  Google Slides (scope TBD).
- **Mermaid is first-class.** Authored, validated, rendered, themed,
  and rasterized to image for platforms that don't render Mermaid
  natively.
- **Cloud storage.** Google Drive, Google Workspace, Microsoft 365,
  OneDrive, SharePoint.
- **Collaboration.** Real-time multi-user editing (eventually).
- **AI assistance.** Chat panel for conversation + ambient
  suggestions (inline completion, layout / quality / structural
  hints). **Any LLM** plugs in through a provider-agnostic
  capability hub — Anthropic, OpenAI, Ollama, self-hosted, and a
  bundled small local model (v1.x, opt-in download, **suggested
  default** once available) all work the same way. AI is
  **grounded** in our docs via RAG (`DocsIndex`), so the assistant
  knows the 26+ layouts, palettes, editorial rules, and Mermaid
  patterns. **Privacy mode** forces local-only. AI edits land as
  Yjs ops the user accepts/rejects — same path as collaborator
  edits.
- **App theming.** App chrome adopts the active deck palette —
  subtle accent on by default, full immersive opt-in. App
  color-scheme stays independent of the deck palette.
- **Brand theming.** Users author their own palettes from brand
  colors with live iterative preview, producing portable
  `themes/<brand>.css` files.
- **Extensions & connectors.** Public plugin API. First-party
  features (PDF export, Mermaid, Anthropic, etc.) ship as extensions
  through the same API third parties will use. Connectors share
  auth / lifecycle / capability machinery — **Google Workspace** is
  one connector that provides `storage` (Drive), `export` (Slides),
  and `asset-source` (Drive image search) at once.

The vision is deliberately ambitious. The v1 architecture is shaped
to make each later item *additive* rather than a rewrite.

## Personas

Every architectural decision so far assumes someone wants
markdown-native deck authoring at boardroom quality. This section
names who.

### Primary — Maya, the Engineering Leader

- Staff engineer or eng manager at a mid-size tech company
- **1–3 decks/week** — design reviews, project updates,
  postmortems, planning
- Audience: peers and execs internally
- Lives in markdown (PRs, docs, Notion). Uses Mermaid weekly.
- **Pain today:** Google Slides is slow for the volume; PPT is
  heavy; existing markdown deck tools (Marp, Slidev) look "techie"
  and have weak layout vocabulary.
- **What pulls her in:** speed of markdown + decks that look like
  the design team made them; mermaid first-class; decks live
  alongside design docs in git.

**Why Maya is primary:** zero learning curve, daily volume justifies
the tool, decision-maker for her own tooling, influences team
adoption. Lowest switching cost, highest word-of-mouth leverage.

### Secondary personas

#### Naveen — the Strategy Consultant
- Senior consultant at a firm with strict house style
- **5–10 client decks/week**
- Audience: client executives
- Brand discipline non-negotiable; editorial conventions strict
- **Pain today:** PPT is the lowest common denominator but slow;
  junior consultants reinvent layouts; brand templates rot.
- **What pulls him in:** enforced layout vocabulary, locked brand
  palette, **native PPTX export** for client handoff, **local AI
  for client-data safety**.

Privacy is selling point #1 for Naveen. Cloud-AI tools are
non-starters in client work; on-machine AI grounded in the firm's
playbook is genuinely differentiating.

#### Jessamine — the Solo Founder / CEO
- Founder, Series A startup
- Board decks, fundraise decks, all-hands
- Markdown-comfortable (Notion + GitHub daily)
- Cares deeply about visual quality — investor-facing
- Has a brand identity but no design team
- **Pain today:** hours fighting Slides instead of editing copy;
  designer-built templates are inflexible; "boardroom-quality"
  usually means hiring a designer.
- **What pulls her in:** `ThemeStudio` gives designer-quality
  output without a designer; AI helps shape narrative; fast
  iteration.

#### Theo — the Developer Advocate / OSS Maintainer
- DevRel at a tech company or OSS maintainer
- Conference talks, release announcements, demo decks
- Audience: developers
- Lives in markdown; uses Slidev / Marp / Reveal today
- **Pain today:** existing markdown deck tools are visually
  mediocre; theming is fiddly; exports inconsistent.
- **What pulls him in:** Lattice's layout polish, Reveal.js export
  (via extension) for web embedding, project-branded theming,
  mermaid first-class.

#### Camila — the Brand-Conscious PM / Marketer
- Senior PM or product marketing at a brand-disciplined company
- Positioning decks, customer presentations, internal storytelling
- Markdown comfort variable — willing to learn if payoff is real
- Cares about brand consistency more than personal expression
- **Pain today:** brand templates in PPT/Slides degrade; nobody
  follows them.
- **What pulls her in:** brand palette enforced architecturally
  (literally can't break it); layout vocabulary as a discoverable
  menu; AI helps maintain voice.

#### Khoa — the Open Source Maintainer
- Maintainer of a popular OSS project
- Release announcements, RFC presentations, meetup talks
- Audience: developer community
- Cares about clean, consistent look for the project
- **Pain today:** presentation infrastructure eats time away from
  content.
- **What pulls him in:** project-branded theme committed in the
  repo; plain markdown source; web export for blog/site embedding.

### Anti-persona — explicit non-target

#### Diana — the Visual Designer / Marketing Creative
- Wants pixel-precise control: drag-to-position, freeform shapes,
  custom typography per text block
- Markdown is a non-starter
- Uses Figma, Keynote, or Canva

**We don't compete here.** Naming Diana is what lets us *say no* to
feature requests that would drag us toward visual-tool territory.
When someone asks "why can't I just drag a text box?", the honest
answer is **"you're a Diana; our tool is for Mayas."**

### What designing for Maya first sharpens

| Decision | Maya signal |
|---|---|
| Markdown-native | Zero learning curve |
| Mermaid first-class | Already in her workflow |
| `WorkspaceView` opens folders | Git-versioned decks alongside docs |
| Command palette ⌘K | Power-user pattern she expects |
| `lattice.css` opinionated layouts | Quality without design effort |
| `ThemeStudio` | One-time team setup; then never touched |
| AI chat + suggestions | Speed accelerator, not novelty |
| `.slidewright/` workspace settings | Commits next to deck source |
| Local AI as default (v1.x) | No friction; not load-bearing for Maya |
| Tauri vs Electron | She doesn't care; only feel matters |

### What designing for Naveen second changes

Naveen's needs sharpen things currently soft:

- **Native PPTX export** becomes non-negotiable, not optional
  (consultants live and die by PPTX)
- **Local AI / privacy mode** becomes a *marketing headline*, not
  a Settings toggle (firms can't use cloud AI on client data)
- **Brand palette enforcement** must be strictly mandatory —
  can't be overridden by slide-level styles
- **`ThemeStudio` brand-scaffold** matters more than initially
  credited — consulting firms have brand bibles; capturing one in
  a palette is high-value
- **Extension marketplace** matters more — firms want to publish
  their playbook as an extension

### The strategic ordering

**Maya primary, Naveen secondary.** The architecture already speaks
Maya's language fluently. Building for Naveen first would
front-load PPTX, enterprise auth, and strict brand-lockdown work
that's currently v1.x.

Maya-first means:

- v1 ships and gets adopted quickly via developer word-of-mouth
- Real usage data shapes Naveen-targeted features in v1.x
- We have a working product before tackling enterprise sales motion

Naveen-first is bigger market + willingness-to-pay, but longer
time-to-shipping-anything and higher feature bar before initial
sale. Probably wrong order for a v1.

## What Lattice brings to the table

Constraints the desktop shell must absorb:

- **Renderer is JavaScript.** `lattice-emulator.js` (build-time) and
  `lattice-runtime.js` (browser) — both pure JS. The runtime path is
  what the desktop app actually uses.
- **Marp (bootstrap only).** `@marp-team/marp-core` ships a *browser
  bundle* — pure JS, runs in any WebView. Used to validate the
  no-Node WebView architecture in the H3 probe; retired once
  `lattice-engine` reaches gallery parity (see "Own the engine"
  below). Marp CLI is a Node wrapper we never adopt.
- **Puppeteer + bundled Chromium.** Required only by the CLI's PDF
  path. **Not needed in the desktop app** — Tauri's WebView is itself
  Chromium/WebKit, with native print-to-PDF.
- **Themes are CSS files.** Live preview is "change a CSS custom
  property" — already supported by `lattice-runtime.js`.
- **Output formats.** PDF / HTML / PPTX / PNG sets from the same
  source. PPTX is the one format that genuinely needs a Node sidecar
  in v1.x — but via PNG-per-slide + `pptxgenjs` assembly, not Marp.
  All other formats are achievable from inside the WebView.
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
| Markdown → slides | **`lattice-engine`** (ours; bootstrapped with `@marp-team/marp-core`) | Owned engine; finishes Lattice's positioning as "the engine layer"; source-compat with Marp dialect |
| Diagrams | **`DiagramService`** (named subsystem) | One owner for Mermaid lifecycle across editor, preview, exports |
| Preview pipeline | **`SlideSegmenter` + `RenderCache` + `PreviewPane`** | Incremental rendering (only changed slides re-render) keyed by slide content hash |
| Workspace layout | **`LayoutShell`** | Focused / split / PiP modes with persisted user prefs |
| Workspace view | **`WorkspaceView`** (sidebar) | File tree consumed from storage adapter; orthogonal to editor/preview modes |
| Settings | **`Settings`** subsystem (defaults → user → workspace) | Layered config; workspace tier travels with the project; extensions extend the schema |
| Onboarding | **`Onboarding`** subsystem | Welcome screen + welcome deck (Lattice deck) + spotlight tour engine; extensions can contribute tours |
| UI surfaces | **Command registry + palette (⌘K) + quick switcher (⌘P) + status bar + optional toolbar** | One registry, many surfaces; extension-contributable; `when` clauses hide irrelevant items |
| Theme contract | **Palette contract library** (lifted from test suite) | One source of truth: app, CLI, CI, ThemeStudio |
| Theme authoring | **`ThemeStudio`** (named subsystem) | Brand-driven palette authoring with live preview |
| Export | **Adapter interface** | Lets PPTX / Confluence / slides.com land additively |
| Storage | **Adapter interface** | Lets Drive / OneDrive / 365 land additively |
| AI | **Capability hub (any provider) + `DocsIndex` (RAG over Lattice docs) + `ChatPanel` + `Suggestions`** | Provider-agnostic — local default in v1.x, cloud optional; grounded in our docs; chat with tool use + ambient hints; privacy mode forces local-only |
| Extensions & connectors | **Capability hubs + worker runtime + manifest** | Adapter interfaces above become the public API; first-party features dogfood the same API third parties will use |

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

### Own the engine — bootstrap with Marp

The v1 commitment: **`lattice-engine` is ours.** Markdown → slides,
directive parsing, and slide HTML output absorbed into the existing
Lattice codebase. The README already positions Lattice as "the
engine layer of SlideWright" — this finishes that positioning,
replacing the runtime dependency on `@marp-team/marp-core` and
`@marp-team/marp-cli`.

#### Why

Marp's contribution to Lattice is small — a few hundred lines of
slide splitting + directive parsing on top of community markdown
libraries we'd use directly anyway. Everything else Lattice
delivers (26+ layouts, 11+ palettes, Mermaid integration, runtime,
emulator, docs) is already ours. The cost of staying coupled is
bigger than the cost of owning the parser:

- Bug fixes happen on Marp's release clock
- Single-maintainer project — dormancy risk on a multi-year horizon
- Design tension: Marp guards scope; needs that are central to us
  (palette switching mid-deck, layout variants, asset directives)
  end up worked *around* the engine rather than expressed *with* it
- We can't extend the directive surface without negotiating upstream

#### Source compatibility, not runtime dependency

`lattice-engine` reads **Marp-flavored markdown** at the source
level — same `---` separators, front matter directives,
`<!-- _class: -->` syntax. Existing Lattice and Marp decks continue
to work. Output HTML matches Marp's, so `lattice.css` is unchanged.
We're free to extend the dialect upward; decks stay portable
downward.

#### Bootstrap strategy

Marp earns its keep validating the architecture, then retires:

1. **H3 bootstrap.** `@marp-team/marp-core` in the WebView proves
   the no-Node architecture. Quick to stand up.
2. **Build `lattice-engine` in parallel.** ~500 lines of focused
   parser on top of `markdown-it` (or `remark`). Self-contained
   chunk; doesn't block other v1 work.
3. **Swap.** When `lattice-engine` passes `examples/gallery.md` and
   `examples/mermaid-gallery.md` (the same regression bar Lattice
   already uses), drop `marp-core` from the bundle and the dep
   list.

We don't gate on Marp, and we don't ship with it.

#### What stays Marp's risk we accept

- **Native PPTX** — Marp's experimental text-to-PPTX-XML path is a
  real reimplementation cost. Defer indefinitely. Standard PPTX
  (PNG-per-slide + `pptxgenjs` assembly in v1.x) doesn't need Marp.
- **Edge cases Marp has discovered** — we rediscover or import fixes
  as the galleries surface them.

### What we add into the WebView

| Lib | Purpose | Already in repo? |
|---|---|---|
| **`lattice-engine`** (ours; bootstrapped with `@marp-team/marp-core`) | Markdown → slide HTML | New module to build; marp-core retired once `lattice-engine` reaches gallery parity |
| `markdown-it` (or `remark`) | Underlying markdown parser used by `lattice-engine` | No — add |
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
3. For each changed slide: render via `lattice-engine`'s
   single-slide path (designed in from the start since we own the
   engine; during the H3 bootstrap phase, marp-core's equivalent —
   see **H3a** below); store in `RenderCache`
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

Three editor/preview layouts plus an **orthogonal sidebar** for the
`WorkspaceView` file tree.

```
LayoutShell
  ├─ WorkspaceView (sidebar — collapsible, resizable, left or right)
  └─ EditorPreviewArea
       ├─ Focused        (editor only, tap-to-peek preview)
       ├─ Split          (editor + preview, horizontal/vertical, user-arranged)
       └─ Picture-in-pic (editor + floating preview)
```

| Mode | Layout |
|---|---|
| **Focused** | Editor full-pane; preview hidden. **Tap-to-peek** shortcut shows preview transiently — preserves focus without forcing a mode change. |
| **Split** | Editor + preview as flex children. Direction (`row` / `column`) and order (which side each pane appears) user-controlled. Resizable divider. |
| **Picture-in-picture** | Editor full-pane; preview as absolute-positioned overlay; resizable + draggable. **Freeform position in v1; corner-snap in v1.x.** |

The sidebar is orthogonal — open it in any mode, or collapse it.
User preferences (mode, split ratio, orientation, side assignment,
PiP position + size, sidebar visible + width + side) persist via
Tauri session state, per window.

### Workspace view — `WorkspaceView`

Collapsible sidebar pane showing a tree of files and folders rooted
at the current workspace. Storage-adapter-blind: consumes the
adapter's `list` + `watch` + `capabilities`, so the same component
renders local FS today and Drive / OneDrive later.

#### Launch modes

| Invocation | Behavior |
|---|---|
| `slidewright` | Last workspace + last open file from session state; welcome screen on first run |
| `slidewright deck.md` | Opens file in editor; workspace root = **parent folder**; tree expanded to reveal the file |
| `slidewright myfolder/` | Opens folder as workspace root; no file open |

Handled by Tauri's CLI plugin on startup. Same path also covers OS
"Open With" (file association on `.md`) and drag-drop a file or
folder onto the app icon.

#### v1 capabilities

- Tree render, expand/collapse, file-type icons (deck / theme /
  image / mermaid)
- Click `.md` → editor; click `.css` in `themes/` → ThemeStudio if
  it passes the palette-contract check, else plain text (v1 can
  simplify to plain text only — ThemeStudio integration is v1.x
  polish)
- Click image → small in-app preview overlay
- Right-click menu: new file / folder / rename / delete / reveal in
  OS — degrades per the adapter's `capabilities`
- Drag an image into the editor → inserts `![](path)`
- File watcher refreshes the tree on external changes
- Hidden files toggled off by default; "Show hidden" available

#### Small UX decisions

- **Out-of-workspace file open.** If the user opens a file via "Open
  File…" outside the current workspace, **reset workspace** to its
  parent. Simpler and less surprising. Loose-file model deferred.
- **Workspace persistence.** Both the workspace *and* the last open
  file are remembered separately — workspace is the working
  context; the file is the most recent edit.

#### Deferred to v1.x

- Multi-root workspaces
- Open multiple decks in tabs
- Loose-file model (file opened outside workspace without resetting
  the workspace)

### UI surfaces & the command registry

The tension between "minimalist for newcomers" and "powerful for
power users" resolves with one pattern: **a central command
registry that every visible surface consumes from.** Power users
hit ⌘K and reach any action in a keystroke. Newcomers find features
through menus and right-click. Same commands, different surfaces.

#### Command registry — the single source of truth

```
app.commands.register({
  id: "slide.insertAfter",
  title: "Insert Slide After",
  description: "Insert a new slide after the current one",
  category: "Slide",
  keybinding: "Cmd+Enter",
  icon: "plus",
  when: "editorFocused && hasOpenDeck",
  run: (context) => { … }
})
```

Application menu, command palette, toolbar, right-click context
menus, and keybindings all reference command IDs. The architectural
commitment that makes this work: **make it the single source of
truth for every UI surface**, not just editor commands.
First-party features ship as commands through the same API
extensions use.

#### Surface priorities

| Surface | Purpose | Default | Density |
|---|---|---|---|
| Application menu | Discoverability; complete reference | Always present (native OS) | Full |
| Command palette (⌘K) | Power-user execution | Always one keystroke away | Full |
| Right-click context menus | In-context discovery + speed | Always present | Contextual subset |
| Status bar | State indication | Always (toggle-able) | Minimal |
| Toolbar | Optional state + quick actions | **Off by default** | Minimal if shown |

#### Command palette — the power-user equalizer

⌘K opens a fuzzy-searched list of every command. ⌘P opens a quick
switcher (file + slide + recent) sharing the same fuzzy
infrastructure. Design specifics:

- Recent commands at top when query is empty
- Fuzzy match on title, description, category
- Category prefixes shown — `Slide: Insert verdict-grid`,
  `View: Toggle Chat`
- Keyboard shortcut shown next to each entry (palette *teaches*
  the shortcut)
- Argument support — `Insert Slide ▸` sub-pick for layout choice
- Mode prefixes: `>` for commands, `:42` to jump to slide 42, empty
  for recent files

Because every command is reachable here, **the visible UI doesn't
have to carry power users** — it can be designed for casual users
without slowing the experts.

#### Application menu — complete, organized for newcomers

Where every command exists. Power users rarely use it after
onboarding; newcomers find features here.

Top-level structure: **File, Edit, View, Slide, Insert, Theme, AI,
Tools, Help.** Submenus use the existing layout vocabulary directly
(`Slide ▸ Insert ▸ verdict-grid`) — discoverability value *and*
teaches the layout names.

#### Right-click — context-aware, self-documenting

Casual users discover features by right-clicking on things. Each
menu is **deeply contextual** — what you clicked determines what's
offered:

| Context | Sample menu items |
|---|---|
| Slide in preview | Insert Above / Below, Duplicate, Delete, Apply Layout ▸, Move Up / Down, Open in Focused View, Copy as Image, Export This Slide |
| Selected text in editor | Cut / Copy / Paste, **AI ▸** (Rewrite, Summarize, Tone), Wrap in Block, Apply Layout |
| Mermaid block | Edit in Diagram Studio, Render Inline, Rasterize, Show Source, Insert Skeleton ▸ |
| Code block | Change Language ▸, Format, Copy with Highlighting |
| Image in editor | Replace, Edit, Reveal in Workspace, Copy Path |
| File in `WorkspaceView` | Open, Open in ThemeStudio (if `.css`), Rename, Delete, Reveal in OS, Copy Path |
| Folder in `WorkspaceView` | New File, New Folder, Refresh, Reveal in OS, Set as Workspace Root |
| Theme `.css` file | Open in ThemeStudio, Set as Default, Duplicate, Edit Source |
| Editor gutter | Toggle Comment, Add Slide Break, Bookmark |

Conventions: most-used at top; verbs on the *thing* first; separators
group related items; keyboard shortcut shown next to each item
(palette + right-click + menu all reinforce the shortcut).

#### Status bar — minimal but useful

Always-on (toggle-able), thin row at the bottom. Right-aligned items;
each click runs a registered command:

```
slide 3 / 47    indaco    split    AI: local    sync: ✓
```

Clicking "split" cycles modes. Clicking "indaco" opens palette picker.
Clicking "AI: local" opens provider switcher. Extensions contribute
items (e.g., Jira: "JIRA: 3 open issues").

#### Toolbar — off by default; opinionated when on

Two reasons to default off: takes vertical space (minimalist); palette
+ menus already cover discoverability + speed. Users who turn it on
(`View → Toolbar`) get a minimal default — six items:

1. Workspace sidebar toggle
2. Editor mode switcher (visual indicator + cycle Focused / Split / PiP)
3. Active palette indicator (color chip; click to pick)
4. Chat toggle
5. Export button (drops to format menu)
6. Quick search (opens command palette)

Configurable density (comfortable / compact); extensions can
contribute toolbar items.

#### Declarative surface contributions

Extensions (and first-party features) contribute via the manifest:

```jsonc
{
  "contributes": {
    "menus": {
      "main.file":     [{ "command": "deck.new", "group": "1_new" }],
      "context.slide": [{ "command": "slide.insertAfter" }],
      "context.text":  [{ "command": "ai.rewrite", "when": "hasSelection" }]
    },
    "keybindings": [
      { "command": "ai.openChat", "key": "Cmd+L" }
    ],
    "statusBar": [
      { "id": "jira-status", "alignment": "right", "command": "jira.show" }
    ]
  }
}
```

First-party menus declared the same way as third-party — dogfooding
the API.

#### `when` clauses

Context-sensitive visibility evaluated against editor + workspace +
AI state. Small DSL:

| Clause | Meaning |
|---|---|
| `editorFocused` | Editor pane has focus |
| `previewFocused` | Preview pane has focus |
| `hasSelection` | Editor has a non-empty selection |
| `hasOpenDeck` | A deck is open |
| `inMermaidBlock` | Cursor inside a mermaid fenced block |
| `inCodeBlock` | Cursor inside a code fenced block |
| `aiAvailable` | At least one AI provider is configured |
| `extensionInstalled('id')` | Specific extension present |

Items that fail their `when` are **hidden** (not greyed out —
invisible). Keeps menus focused for power users.

#### Design principles worth nailing

1. **Progressive disclosure** — clean UI by default; power users
   add toolbar / shortcuts / workspace pins
2. **Command palette as the great equalizer** — every action
   reachable from there
3. **Right-click teaches the UI** — self-documenting via contextual
   menus
4. **Keyboard parity** — every action has a (customizable) shortcut
5. **Status bar over toolbar** — state indication uses minimal space
6. **One command registry** — single source of truth for first-party
   and extensions alike
7. **`when` clauses hide, don't grey out** — focused menus, not
   noisy ones

#### v1 / v1.x / v2

- **v1** — application menu (complete), command palette + quick
  switcher (⌘K / ⌘P), right-click context menus (slide, text, file,
  folder, mermaid block, code block, gutter), status bar, default
  keybindings + user-overridable `keybindings.json`. **No toolbar
  by default.**
- **v1.x** — optional toolbar (off by default), Vim/Emacs preset
  packs, workspace-pinned commands (per-project shortcuts),
  extension-contributed menus / status-bar items / commands.
- **v2** — macros / recorded actions, customizable status bar
  layout, theme-aware command palette iconography.

### Settings — `Settings`

Layered configuration. VS Code-style: settings travel with the
project so a workspace can pin its theme, linter rules, export
defaults, and recommended extensions.

#### Workspace config — `.slidewright/` folder

Hidden folder at workspace root, parallel to `.vscode/`. Folder
beats single file because we'll want more than just settings:

```
.slidewright/
├── settings.json        # main settings
├── extensions.json      # recommended extensions for this workspace
├── snippets/            # workspace-scoped slide snippets
└── themes/              # workspace-scoped palettes
```

#### User config — the other half

User-tier settings + per-user state live in the platform's
conventional app-config directory:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/SlideWright/` |
| Linux | `~/.config/slidewright/` (XDG) |
| Windows | `%APPDATA%\SlideWright\` |

Resolved at runtime via Tauri's `path::app_config_dir()` — never
hardcoded. Folder layout mirrors `.slidewright/`, with two
additions:

```
<app-config>/SlideWright/
├── settings.json          # user-tier settings
├── keybindings.json       # custom keyboard shortcuts
├── snippets/              # user-level snippets
├── themes/                # user-authored themes (not tied to a workspace)
├── extensions/            # installed extensions (actual code)
└── state/
    ├── recent-workspaces.json
    ├── window-state.json
    ├── welcome-shown.json
    └── …
```

`extensions/` holds installed extension code (extensions install at
user scope — see caveat below). `state/` holds the things that
only make sense per-user: window position, recent workspaces,
onboarding flags.

#### User-only — what can never be workspace-scoped

- Window/session state — your monitor, not your project's
- OS color-scheme preference — your eyes
- Recent workspaces list — meaningless to share
- Welcome / onboarding state — per-user, one-time
- Telemetry / auto-update preferences
- Installed extensions — global; workspaces *recommend*, users
  *install*
- Keybindings — user-controlled

#### Layered resolution

| Tier | Where | Notes |
|---|---|---|
| Defaults | shipped in app | sensible baseline |
| User | `<app-config>/SlideWright/settings.json` (platform-specific path above) | global preferences |
| Workspace | `.slidewright/settings.json` | project overrides; commits to git |
| Folder | per-folder in multi-root | v1.x |

Each tier overrides the previous. Settings UI surfaces effective
value plus provenance ("from workspace", "from user").

#### API

```
Settings
  ├─ resolve(key)               → effective value + provenance
  ├─ get<T>(key)                → typed value
  ├─ set(key, value, scope)     → write at user or workspace tier
  ├─ observe(key, handler)      → subscribe to changes
  ├─ registerSchema(extension)  → extensions contribute settings keys
  └─ migrate(file, fromVersion) → schema migrations
```

Most subsystems become Settings consumers — `LayoutShell`,
`WorkspaceView`, `ThemeStudio`, `DiagramService`, every export
adapter, every storage adapter, the linter. Subscribing to changes
means edits apply live.

#### Schema is extensible

Extensions declare their settings keys via the manifest's `settings`
field (already in the extension manifest sketch). Their keys join
the schema, get autocomplete + validation in the JSON editor, and
appear in the Settings UI under the extension's section. Dual-mode
UI: settings panel for browsing, JSON editor for power users —
same pattern VS Code uses.

#### Two important caveats

**Secrets never live in `settings.json`.** API keys, OAuth tokens
→ system keychain only (the reason Tauri's Rust core was
load-bearing). Settings reference credentials by ID:

```jsonc
"storage": {
  "defaultAdapter": "google-drive",
  "driveFolderId": "0AbcDefGhIjK",
  "credentialId": "drive-personal"   // resolves to keychain
}
```

This is what makes workspace settings safely committable to git.

**Extensions install at user scope, not workspace scope.**
Workspaces *recommend* via `.slidewright/extensions.json`; users
*install* via an explicit prompt. Installed code lives in
`<app-config>/SlideWright/extensions/`. **No auto-install in v1**,
even from workspace recommendations — that's what preserves the
trust property until v1.x adds an explicit "trust this workspace"
prompt. If extensions could be installed *by* workspace files,
opening a hostile workspace could execute arbitrary code on the
machine; VS Code learned this lesson explicitly and we adopt it
without paying the tuition.

**User config can be cloud-synced; secrets still can't go there.**
A user might sync `<app-config>/SlideWright/` through Dropbox /
iCloud / OneDrive. That makes the keychain-only rule for secrets
*more* important, not less. User config holds the *index* of
credentials (which IDs exist, which connector each belongs to);
the tokens themselves live in the OS keychain via Tauri.

#### Scope per setting

| Setting | User | Workspace |
|---|---|---|
| Default editor mode, split orientation, font | yes | yes (override) |
| Color scheme preference (system/light/dark) | yes | no |
| Window/session state | yes | no |
| Default deck theme when not declared in front matter | yes | yes (override) |
| Linter rules + per-rule config | yes | yes (override) |
| Export defaults | yes | yes (override) |
| Storage adapter + non-secret config | yes | yes (override) |
| Recommended/required extensions | no | yes |
| Workspace name + asset dirs + project metadata | no | yes |

Settings declare their scope in the schema.

#### Concrete example — `.slidewright/settings.json`

```jsonc
{
  "$schema": "slidewright://schemas/settings/v1",
  "version": 1,
  "workspace": {
    "name": "Q3 Investor Updates",
    "defaultTheme": "acme-brand",
    "assetDirs": ["./assets", "./brand"]
  },
  "editor": {
    "defaultMode": "split",
    "splitOrientation": "horizontal",
    "splitOrder": "editor-left"
  },
  "linter": {
    "enabled": ["terminology", "wcag-aa", "no-empty-slides"],
    "terminology.dictionary": "./brand/terms.json"
  },
  "export": {
    "pdf": {
      "outputDir": "./out",
      "metadata": {
        "author": "Acme Corp",
        "subjectTemplate": "{{deckTitle}} – Q3 2026"
      }
    },
    "mermaid": { "flattenForExport": true }
  },
  "storage": {
    "defaultAdapter": "google-drive",
    "driveFolderId": "0AbcDefGhIjK",
    "credentialId": "drive-acme"
  },
  "extensions": {
    "settings": {
      "com.acme.d2-diagrams": { "layoutEngine": "elk" }
    }
  }
}
```

Sibling `.slidewright/extensions.json`:

```jsonc
{
  "recommendations": [
    { "id": "com.acme.d2-diagrams",   "version": "^0.3" },
    { "id": "com.confluence.export",  "version": "^1.0" }
  ]
}
```

When a workspace opens, the Extensions panel surfaces
recommended-but-missing extensions with one-click install (gated
on user action — see trust caveat above).

### Onboarding — `Onboarding`

Lattice is what we make. The most credible introduction is **a deck
that uses every important layout, palette, diagram, and code
highlight**. So the centerpiece of onboarding is a real Lattice
deck, opened on first launch, that dogfoods the product.

Four pieces, in order of value.

#### 1. Welcome screen — first-run landing

Shows on first launch (and on demand from `Help → Welcome`):

- Hero (project name + tagline)
- Three primary actions: **Open the welcome deck**, **New deck**,
  **Open folder…**
- Recent workspaces (empty on first run)
- Help links: Take the tour, View shortcuts, Open docs
- "Don't show on startup" checkbox (persists to user state)

After dismissal, never re-shows unless the user opts back in.

#### 2. The welcome deck — onboarding *as a deck*

A focused ~12-slide deck shipped with the app, authored as Lattice
markdown. Opened on first launch (and from the welcome screen).

The user reads beautifully-rendered slides while the same source
sits in their editor. They learn by example — far stickier than
tooltips.

| Slide | Demonstrates |
|---|---|
| 1 | Title slide; "Welcome to SlideWright" |
| 2 | Editor / preview side-by-side (app screenshot) |
| 3 | Layout vocabulary (highlight reel from `examples/gallery.md`) |
| 4 | Mermaid integration — a flowchart inline |
| 5 | Code block with syntax highlighting |
| 6 | Palette switching — same slide in `indaco` vs `cuoio` |
| 7 | The `<!-- _class: -->` directive — source + result |
| 8 | Editor modes — focused / split / PiP (screenshots) |
| 9 | Workspace sidebar — drag image to insert, right-click for ops |
| 10 | ThemeStudio — author your brand |
| 11 | Export — PDF / HTML / PNG (PPTX coming) |
| 12 | "Where to next" — links to docs, sample deck, settings |

Existing assets (`examples/gallery.md`, `examples/mermaid-gallery.md`)
are the *ingredients*; the welcome deck is the curated highlight
reel.

#### 3. Spotlight tours — for what a deck can't show

Some things only make sense in the live UI: dragging a divider,
invoking the command palette, switching themes. Coachmark overlays
for these.

Declarative format (so tours are *content*, not code):

```jsonc
{
  "id": "first-run-tour",
  "title": "Quick tour",
  "trigger": "first-run",
  "steps": [
    {
      "target": "data-tour-id=workspace-sidebar",
      "title": "Files live here",
      "body": "Click .md to edit. Drag images into the editor.",
      "placement": "right"
    },
    {
      "target": "data-tour-id=editor-mode-toggle",
      "title": "Three layout modes",
      "body": "Focused, split, picture-in-picture. ⌘1 / ⌘2 / ⌘3.",
      "placement": "bottom"
    }
  ]
}
```

UI components target via `data-tour-id` attributes — decoupled from
CSS class names so refactors don't silently break tours.

#### 4. "What's New" on version update

After an upgrade, if `state/onboarding.json` records a previous
version, show a non-modal "What's new" notice with optional
spotlight tour for new features. Dismissable; never blocking.

#### Design principles — load-bearing, not nice-to-have

- **Skippable from anywhere** — every step has Skip
- **One-time by default** — tours don't re-show unless the user
  asks (Help menu) or a new version arrives
- **No modal interruption** — no dialogs that block the editor;
  spotlights overlay and dismiss
- **No video links, no out-of-app docs trips** — if it needs >2
  sentences, it doesn't belong in a spotlight
- **Keyboard-first** — show the shortcut next to the action;
  dismissal and advance both keyboard-reachable
- **Opt-outable** — `onboarding.enabled: false` kills it entirely

#### Extension-contributed tours

Extensions register tours via the manifest:

```jsonc
"contributes": {
  "tours": [
    {
      "id": "d2-diagrams-intro",
      "title": "Authoring D2 diagrams",
      "trigger": "first-d2-block-created",
      "steps": [...]
    }
  ]
}
```

Triggers:

- `first-run` — only the built-in welcome tour uses this
- `first-X-action` — contextual (first time the user creates a
  mermaid block, opens a theme file, etc.)
- `manual` — Help menu only
- `version-update` — after install or upgrade

#### State

User-scope (`<app-config>/SlideWright/state/onboarding.json`) —
onboarding is per-person, not per-project:

```jsonc
{
  "welcomeShownAt": "2026-05-11T…",
  "toursCompleted": ["first-run-tour"],
  "toursDismissed": ["pptx-export-walkthrough"],
  "lastSeenVersion": "1.0.0",
  "showWelcomeOnStartup": true
}
```

#### v1 / v1.x / v2

- **v1** — welcome screen, welcome deck (real Lattice deck in the
  app bundle), one built-in first-run tour, Help-menu re-entry,
  user-state persistence.
- **v1.x** — extension-contributed tours; "What's New" on version
  update.
- **v2** — full localization (tour content + welcome deck source
  are already data, so this is straightforward).

The v1 commitment worth nailing: **the welcome deck as a deck**,
authored with the same care as the gallery fixtures and themed in
`indaco` so the default palette shows at its best.

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

Tree-shaped namespace, not just doc-by-id:

```
StorageAdapter
  ├─ list(path)              → [{ name, kind, path, modified, size }]
  ├─ read(path)              → Doc | bytes
  ├─ write(path, doc|bytes)
  ├─ delete(path)
  ├─ rename(from, to)
  ├─ watch(path, callback)   // optional; broker polls if missing
  └─ capabilities            // { canWatch, canRename, canCreateFolder, … }
```

Implementations:

- **Local FS** — Tauri FS API (v1)
- **Google Drive / Workspace** — OAuth via Tauri deep-link plugin +
  Drive API (later)
- **OneDrive / Microsoft 365 / SharePoint** — same pattern (later)

OAuth flows and secure token storage are where Tauri's Rust core
pays off (system keychain integration).

`capabilities` lets UIs (especially `WorkspaceView`) degrade
gracefully — if an adapter can't `rename`, the right-click menu
hides Rename. Cloud adapters expose tree-shaped namespaces too, so
the same file view renders local and cloud transparently.

Themes ride the same adapter — a user-authored theme is just
another `Doc`.

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

### AI — providers, grounding, chat, suggestions

AI is woven through the app via four pieces:

1. **Provider-agnostic capability hub** — any LLM plugs in
2. **`DocsIndex`** — RAG grounding over Lattice's own documentation
3. **`ChatPanel`** — user-initiated conversation with tool-using assistant
4. **`Suggestions`** — ambient, AI-initiated hints in the editor

All four ride on the existing Yjs document model — AI edits land
as ops the user accepts/rejects exactly like collaborator edits.

#### 1. Provider-agnostic capability hub

The architectural property: **the editor doesn't know which model
wrote a suggestion.** Every provider routes through one interface:

```
app.ai.registerProvider({
  id, name,
  capabilities: ["completion", "embedding", "tool-use"],
  auth: { kind: "oauth2" | "apiKey" | "none", config },
  stream(prompt, context, options) → AsyncIterable<token>,
  embed(text)                       → vector,
  status: "ready" | "error" | …
})
```

**First-party connectors:**

| Connector | Phase | Notes |
|---|---|---|
| **Anthropic / Claude** | v1 | Built-in; user provides API key |
| **Local** (Candle on-device) | v1.x | Built-in; opt-in download; **suggested default** once available |
| **Ollama** | v1.x | Auto-detects local Ollama server; works with any pulled model |
| **OpenAI** | v1.x | Built-in; user provides API key |

**Third-party (via extensions):** Mistral, Cohere, Google Gemini,
Together, Groq, Fireworks, OpenRouter, LiteLLM, vLLM / LMStudio /
llama.cpp-server (via a generic OpenAI-compatible connector), Azure
OpenAI, AWS Bedrock. Most LLM APIs follow an OpenAI-compatible HTTP
shape, so a single **generic OpenAI-compatible connector** covers
dozens of providers.

**Privacy mode** (`ai.privacyMode: true` in Settings) forces *all*
AI traffic to local-only providers. Cloud connectors return
"unavailable." For sensitive content this is the on-machine
guarantee — and it's free architecturally because providers are
routed through a capability, not hardcoded.

**Hybrid routing.** Different tasks route to different providers
based on user preference and provider availability:

| Task | Default route |
|---|---|
| Inline completion | Local (latency) |
| Slide-level rewrite | User choice (local for privacy, Claude for quality) |
| Multi-slide generation / restructure | Claude (quality) |
| Embeddings (`DocsIndex`) | Local (privacy + cost) |

All configurable in Settings; provider-agnostic.

#### 2. `DocsIndex` — RAG grounding over Lattice docs

Without grounding, a 3B model writing Lattice markdown will invent
directive names and layout classes. With **RAG over our docs**, the
same model becomes a real Lattice authoring assistant.

```
DocsIndex
  ├─ build()                       // run at build time; serialize index
  ├─ retrieve(query, k=6)          → [{ chunk, source, score }]
  ├─ retrieveByContext(slide)      → context-aware retrieval
  ├─ addSource(path|extension)     // workspace + extensions extend
  └─ rebuild(reason)               // when docs change or sources added
```

**Built-in index sources:**

- `docs/skill.md`, `docs/references/templates.md`,
  `docs/references/design.md`, `docs/references/mermaid.md`,
  `docs/editorial.md`, `docs/theming.md`
- `examples/gallery.md` (the canonical working examples)
- `examples/mermaid-gallery.md`

Chunked by section + template entry, ~150–500 tokens per chunk,
with metadata (source file, section heading, layout class).

**Extensible — workspace + extensions add to the corpus.**

Workspace:

```jsonc
"knowledge": {
  "sources": [
    "./brand/voice-guide.md",
    "./brand/example-decks/"
  ]
}
```

Extension manifest:

```jsonc
"contributes": {
  "knowledgeSources": [
    { "type": "docs", "path": "./d2-syntax-reference.md" }
  ]
}
```

A workspace teaches the assistant its brand voice. An extension
teaches it new syntax. The assistant grows capability as the user
installs extensions.

**Embedding model — cheap.** ~80–150 MB for a small model
(`all-MiniLM-L6-v2`, `bge-small-en-v1.5`). Bundled with the
opt-in local-AI download, not separately.

**Vector store.** In-memory (Vec<Vector> + cosine similarity) is
fine for the built-in corpus. SQLite + sqlite-vec when the
user-extensible corpus grows.

**Cloud providers benefit too.** Same retrieval pipeline; same
context injection. Claude with our docs in context is *better*
Claude; the local model with our docs in context becomes *capable*
where it otherwise wouldn't be.

#### 3. `ChatPanel` — conversational with tool use

Sidebar pane, sibling to `WorkspaceView`. Orthogonal to
focused/split/PiP modes. Default right side; resizable, collapsible.
Optional pop-out window for users who want the editor full-width.

**Context the chat always has:**

- Current deck (or summary if long)
- Current slide
- Current selection
- `DocsIndex` retrievals for Lattice docs

User-scoped via `@`-mentions: `@slide:3`, `@theme:indaco`,
`@docs:layouts`, `@selection`, `@workspace`.

**Tool use — chat that *does*, not just talks:**

```
tools = [
  insertSlideAfter(slideIndex, markdown),
  replaceSelection(text),
  proposeRewrite(range, newText),     // inline accept/reject diff
  applyLayout(slideIndex, layoutClass),
  insertDiagram(slideIndex, mermaidSource),
  addThemeToken(tokenName, value),    // hooks into ThemeStudio
  searchDocs(query),                  // explicit DocsIndex retrieval
]
```

Tool calls surface in chat as **proposed actions**:

> *Claude wants to **insert a new slide** after slide 5 with a
> `verdict-grid` layout summarizing your Q3 results.*
> [Preview] [Approve] [Edit] [Reject]

All actions land as Yjs ops — same path as human edits, same undo
behavior. Extensions can register additional tools.

**Provider considerations for tool use.** Most modern LLMs support
it (Claude, GPT-4+, Gemini, Llama 3.1+, Mistral). Smaller local
models vary. **Graceful degradation**: when the provider doesn't
support tool use, the assistant suggests text the user copies.
Lesser UX, still functional.

**Persistence.** Chat history stored **per-deck** in the deck's
`Y.Map` metadata. Open the deck → its conversation history is
there.

**Privacy indicator** in the chat header — small badge: "via
Claude" / "via Local" / "Privacy mode: Local only." Users always
know where their text is going.

#### 4. `Suggestions` — ambient hints

Five categories, each with its own surface:

| Type | Surface | Default provider |
|---|---|---|
| **Inline completion** | Ghost text at caret; Tab to accept | Local |
| **Layout** | Non-modal banner above current slide ("5 bullets — try `cards-grid`?"); one-click apply | Local (grounded via `DocsIndex`) |
| **Content** | Gentle nudges ("Draft a closing slide?") | Local |
| **Quality / lint** | Gutter markers + tooltips (WCAG, length, brand-voice) | Local |
| **Structural** | Deck-level ("Add a TOC?"); less frequent | Local; cloud opt-in for richer analysis |

**Discipline — these run continuously:**

- Debounce aggressively (fire on idle pauses, not every keystroke)
- Cheap providers first (local for inline; cloud only on explicit
  request)
- **Intensity setting** — `suggestions.intensity: off | sparse |
  active`. Default sparse.
- No surprise commitments — every suggestion is a single-click
  apply that lands as one undoable Yjs op
- Never block the editor

#### Tool registry — the extensibility surface

Tools that chat (and agentic AI flows generally) can call are
registered through a hub, same pattern as everything else:

```
app.tools.register({
  id, name, description,
  parameters: jsonSchema,
  execute(args) → result,
})
```

First-party tools cover the deck/slide/theme/diagram operations
above. Extensions register more — Jira's `fetchIssue(key)`,
Confluence's `findPage(query)`, Frontify's `fetchAsset(id)`, etc.
The chat-using model decides which tool to invoke based on the
schema.

**v1 commitment worth nailing now:** shape the tool-registry
contract even before tools land. So when v1.x adds them, the chat
surface is already designed for action-taking — we're not
retrofitting tool support onto a text-only chat.

#### Extensions plug in across all four pieces

- **New providers** — an entire LLM service via extension
- **New knowledge sources** — extension contributes to `DocsIndex`
- **New tools** — extension exposes capabilities to the chat-using
  model
- **New suggestion rules** — extension contributes lint markers
  grounded in its own docs

Same capability-hub pattern; same dogfood-the-API discipline —
first-party features ship as extensions through the same surface.

#### v1 / v1.x / v2

- **v1** — Anthropic connector (built-in); `ChatPanel` UI with
  text-only chat (suggests text the user pastes — tool-registry
  contract shaped but actions not yet wired); `Suggestions` named
  with inline completion + a couple of basic lint rules; `DocsIndex`
  placeholder in the architecture, not built yet.
- **v1.x** — Local LLM connector (Candle, opt-in download,
  suggested default); Ollama connector; OpenAI connector;
  `DocsIndex` shipped with built-in corpus + workspace extension;
  tool use in chat wired (insert / replace / apply layout / propose
  rewrite); all five `Suggestions` categories live.
- **v2** — Multi-turn branching, image input (paste a sketch → get
  a deck draft), extension-contributed slash commands + lint rules
  at maturity, RAG over the user's deck library.

### Extension runtime — capability hubs + connector pattern

The export, storage, AI, diagram, layout, linter, and theme
interfaces named above aren't just internal abstractions — they
are the **public API of an extension runtime**. Third parties (and
the app's own first-party features) plug into the host through the
same registries.

This is what makes the long-term vision tractable. Drive, OneDrive,
Confluence, slides.com, multiple LLM providers, brand asset
systems, datasource integrations — each becomes an *extension*
rather than another hardcoded subsystem.

#### Two categories under one model

- **Extension.** Code that changes what the *app* does — new
  diagram types, slide layouts, editor commands, linter rules,
  export formats, AI capabilities.
- **Connector.** Code that links the app to an *external service*.
  Implements one or more existing adapter interfaces. Shares an
  auth / lifecycle pattern worth standardizing.

Connectors are a subset of extensions, separated by category for
the shared machinery.

#### Runtime model

- Extensions run in a **Web Worker**, not the main thread
- No direct DOM, network, or file access
- All capability requests go through a **broker** on the main
  thread that enforces manifest-declared permissions
- Communication is structured message passing — no synchronous
  calls

Isolates extension bugs, contains misbehavior, keeps the editor
responsive even when an extension is busy.

#### Manifest

```jsonc
{
  "id": "com.acme.d2-diagrams",
  "name": "D2 Diagrams",
  "version": "0.3.1",
  "engine": "slidewright >= 1.0",
  "contributes": {
    "diagramTypes": [{ "name": "d2", "fence": "d2" }]
  },
  "permissions": {
    "network": [],
    "storage": "none"
  },
  "settings": [
    { "id": "layout-engine", "type": "enum", "values": ["dagre", "elk"] }
  ]
}
```

Declares **contributions** (what it provides), **permissions**
(what it needs), **settings** (auto-rendered in the app's
settings UI), and **engine** (semver against host API).

#### Capability hubs — the public API

```
app.diagrams.registerType({ name, parse, render, rasterize })
app.exports.registerAdapter(adapter)
app.storage.registerAdapter(adapter)
app.ai.registerProvider(provider)
app.layouts.registerClass({ className, css, manifest })
app.editor.registerCommand({ id, run })
app.linter.registerRule(rule)
app.connectors.registerService({ name, auth, capabilities })
```

**The architectural commitment that makes this real:** first-party
features ship as extensions through this same API. The built-in
PDF export *is* a registered export adapter. The built-in local-FS
storage *is* a registered storage adapter. This forces the API to
be honest — if we can build PDF export against it, third parties
can build Beamer/LaTeX against it.

Same pattern as VS Code, and the reason its ecosystem works.

#### Connector pattern

```
Connector
  ├─ id, name, icon
  ├─ auth: { kind: "oauth2" | "apiKey" | "none", config }
  ├─ capabilities: [ "storage", "export", "ai", "datasource",
                      "asset-source", "palette-source" ]
  ├─ status: "disconnected" | "connecting" | "connected" | "error"
  └─ connect() / disconnect() / refresh()
```

One connector can implement multiple capabilities at once —
**Google Workspace** is a single connector that provides `storage`
(Drive), `export` (Slides), and `asset-source` (Drive image
search). OAuth tokens live in the system keychain via Tauri's Rust
core (the reason that decision was load-bearing earlier).

#### Examples

**Extensions:**

1. **D2 diagrams** — registers a new diagram type; runs D2 engine
   in the worker; returns SVG. Flows through `DiagramService`
   exactly like Mermaid — render cache, rasterization fallback,
   theming all reused.
2. **`comparison-3col` layout** — declares a CSS class + body via
   `layouts.registerClass`. Author uses `<!-- _class: comparison-3col -->`.
3. **Terminology linter** — registers a linter rule; flags
   off-brand wording in titles/body; quick-fix applies the
   canonical term. Useful for orgs with voice guidelines.
4. **Reveal.js export** — implements the export adapter interface;
   walks slides; emits Reveal.js HTML.
5. **Generate TOC** — registers an editor command; walks the deck;
   builds an outline slide; inserts via Yjs ops (undoable as one
   action).

**Connectors:**

1. **Google Drive** — `storage` capability. Same interface as
   local-FS — every storage consumer works against it transparently.
2. **Confluence** — `export` capability (publish flavor — pushes
   artifact to a remote page rather than disk). Picker for space +
   parent page; renders deck to Confluence-flavored markdown.
3. **Anthropic / OpenAI / Ollama** — each is a connector providing
   `ai`. App offers a default + per-task override. The Yjs-based AI
   flow doesn't care which provider it is.
4. **Frontify / BrandKit** — `palette-source` capability into
   ThemeStudio; often also `asset-source` for logos.
5. **Jira / Linear** — `datasource` capability. Author writes a
   directive (e.g., `<!-- jira: PROJ-123 -->`); the connector
   fetches issue metadata; renders into a status-card layout.
   Refreshable.

#### Scope progression

- **v1** — runtime + capability hubs + manifest format, with
  **first-party extensions only**. PDF export, local-FS storage,
  Mermaid, Anthropic ship as built-in extensions through the
  public API. No third-party install; no marketplace.
- **v1.x** — local install (drop a folder), manifest verification,
  permission prompts. Side-loaded extensions for early adopters and
  enterprises.
- **v2** — marketplace, publishing, signing, ratings, auto-update.

The v1 cost is mostly **architectural discipline**: every internal
adapter is registered through the public API even though no third
party can install one yet. That's what guarantees the API is real
on day one rather than a stub we promise to make real later.

## Open questions

The original integration questions are largely resolved by the
architecture above:

- **~~Q1 (Tauri ↔ Node)~~** — no Node in v1. Sidecar lands in v1.x
  for PPTX only.
- **~~Q2 (Chromium location)~~** — Tauri's WebView is Chromium; no
  separate bundle.
- **~~Q3 (Live preview model)~~** — runtime-in-WebView via
  `lattice-engine` + `lattice-runtime.js` (bootstrapped on
  `@marp-team/marp-core` until parity).
- **~~Q4 (PPTX)~~** — deferred to v1.x via Node sidecar; standard
  PPTX is PNG-per-slide + `pptxgenjs` assembly (no Marp needed).
  Native PPTX (Marp experimental) deferred indefinitely.

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
- **H3 (bootstrap).** *(v1 — load-bearing)* `@marp-team/marp-core`
  browser bundle + `lattice-runtime.js` reaches feature parity with
  the emulator for live preview, with theme switching in real time.
  Validates the no-Node WebView architecture before `lattice-engine`
  lands.
- **H3-engine.** *(v1 — load-bearing for engine retirement)*
  `lattice-engine` reaches output parity with `marp-core` on
  `examples/gallery.md` and `examples/mermaid-gallery.md`. When this
  passes, `marp-core` is dropped from the bundle and the dep list.
- **H3a.** *(v1 — load-bearing for incremental rendering during
  bootstrap; obviated post-swap)* `@marp-team/marp-core` supports
  rendering individual slides (or can be wrapped to do so) such that
  a single-slide render is identical to the same slide inside a
  full-deck pass. `lattice-engine` is *designed* for single-slide
  render from the start, so the property is built in post-swap. If
  H3a fails during bootstrap, fallback is full-deck render + slide-
  level DOM patching — slower but workable until `lattice-engine`
  ships.
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

Three v1-load-bearing probes (gating), plus engine retirement
(parallel):

1. **H3 + H3a — Live preview parity & single-slide render
   (bootstrap).** Minimal HTML page in a Tauri WebView that loads
   `@marp-team/marp-core` + `lattice-runtime.js`, renders
   `examples/gallery.md` from a string, switches palette in real
   time, **and renders a single slide independently and compares it
   to the same slide inside a full-deck render** (H3a). If both
   pass, the v1 architecture is live and incremental rendering is
   unlocked. Marp here is the *bootstrap*; H3-engine retires it
   later.
2. **H5 — PDF export.** Trigger `webview.print_to_pdf()` on the
   rendered output. Compare visually to `marp-cli --pdf` reference.
3. **H6 — PNG export.** Screenshot each rendered slide via the
   WebView API. Compare to `marp-cli --images png` reference at 3×
   scale.
4. **H3-engine — Engine retirement (parallel, non-gating).** Build
   `lattice-engine` against `examples/gallery.md` and
   `examples/mermaid-gallery.md`. When output matches `marp-core`
   on both fixtures, drop `marp-core` from the bundle and the dep
   list. Self-contained — runs alongside editor / ThemeStudio /
   etc., doesn't gate them.

H7 (Yjs bundle size) and H8 (per-palette app-chrome WCAG) are
cheaper and can run in parallel with everything above.

Everything else — editor work, ThemeStudio, AI hook, export adapters
beyond PDF/PNG/HTML — waits on H3, H5, H6.

## Gaps to close before v1

The architecture above is coherent; the items below are genuine
design decisions or operational realities still to address before
v1 ships. Most are small individually; together they're the
difference between "complete spec" and "shippable product."

### Critical — design or decide now

#### Speaker notes + presentation mode

Two features most slide apps have; neither named in the note yet.

- **Speaker notes.** Markdown convention worth deciding now —
  HTML comments are already used for directives, so notes need
  their own syntax. Proposal: fenced block with a custom
  infostring (` ```notes `) — reuses existing parser, lives in
  the slide's source, carried as metadata in `Y.Doc`, exported
  as PDF notes pages, PPTX speaker view, HTML reveal-style.
- **Presentation mode.** Full-screen runtime: current slide,
  upcoming slide, timer, speaker notes, remote-friendly keyboard
  shortcuts. Reuses the WebView render — it's a different window
  mode. v1 minimum: forward / back / go-to-slide / fullscreen /
  exit.

**Decide both now even if presentation mode lands in v1.x.** The
speaker-notes syntax affects the document format; backfilling
later is awkward.

#### Save semantics + conflict resolution + crash recovery

The Storage adapter is designed but the *when* and *how* of
persistence isn't:

- **Auto-save** on idle (debounced ~1 s after last edit), with
  explicit "Save" still available. Status bar shows "Saving…" /
  "Saved" / "Modified externally."
- **External file changes during a session.** File watcher
  detects; if Yjs has unsaved ops, surface a modal — merge / keep
  yours / reload.
- **Crash recovery.** `y-indexeddb` persistence in the WebView
  captures every op locally. Relaunch finds the persisted CRDT
  and offers to recover unsaved state.
- **Backup retention.** Last N saved snapshots in
  `.slidewright/.backups/<slug>/`. N = 10 default; workspace
  setting.

#### Operational infrastructure

Desktop-app realities not yet planned:

- **Auto-update.** Tauri's updater. Signed manifests on a release
  CDN. Two channels — stable + beta. Default opt-in; manual check
  available. Rollback by shipping a reverting release.
- **Crash reporting.** Sentry or self-hosted compatible service.
  Opt-in by default on stable, opt-out on beta. Anonymized stack
  traces only — **no document content ever**.
- **Telemetry.** Anonymous, aggregate, opt-out. Helpful: feature
  usage frequency, version/OS distribution, crash correlation.
  **Never collected:** deck contents, file paths, AI prompts,
  user IDs.

#### Code signing / notarization — lead time matters

- **Apple Developer ID** ($99/yr) + notarization. Sign + notarize
  every release. 1–2 weeks for first-time enrollment.
- **Microsoft code signing** — EV cert recommended for instant
  SmartScreen reputation. $300–700/yr; 1–3 weeks vetting.
- **Linux** — Snap/Flatpak/AppImage each have signing conventions.
  AppImage + GPG sig + Snap via snapcraft are the common paths.

**Enroll in Apple's program now**; the cert paperwork shouldn't
gate a launch later.

#### Import strategy — adoption blocker

Maya has 50+ decks in Google Slides today. Without migration she
chooses between her history and our tool. Priority:

| Source | Difficulty | Priority |
|---|---|---|
| Marp / Slidev (markdown) | Trivial — same dialect family | v1.x |
| Reveal.js / RemarkJS | Easy — similar markdown structure | v1.x |
| PowerPoint (`.pptx`) | Hard but high-value (Naveen + Maya) | v1.x — best-effort with cleanup |
| Google Slides | Easy via Drive API → PPTX → our PPTX importer | v1.x (after PPTX) |
| Keynote | Hard, smaller audience | v2 |

**PPTX import is the big lever.** Even ugly best-effort ("we got
most of it; clean up the rest") is the difference between viral
adoption and inert tool.

#### Math rendering — decide now

- KaTeX (preferred — faster, smaller than MathJax, MIT) renders
  inline + block math in markdown
- ~70 KB additional bundle
- Real audiences: academic / research, technical engineering,
  finance / quant, data science

**Lean: yes, in v1.x.** Never adding excludes a serious chunk of
the technical audience.

#### App accessibility — load-bearing, not optional

WCAG AA in palettes is for *output*. The app itself needs:

- **Screen reader support** — ARIA labels, proper roles on every
  interactive element, sensible focus order, live regions for
  status changes
- **Keyboard navigation end-to-end** — every action reachable
  without a mouse; focus management in modals; visible focus
  indicators
- **Reduced motion** preference respected (PiP, transitions,
  spotlight overlays must respect it)
- **Font scaling** that doesn't break layouts
- **High-contrast mode** for app chrome

Government / enterprise procurement often **requires** this.
Built in from day one, or retrofit forever.

#### Basic editor features — table stakes

Easy to forget because they're expected:

- **Find / Replace** in the open deck
- **Find in Files** across the workspace
- **Outline view** — collapsible deck structure; click-to-jump
- **Slide list panel** — drag to reorder
- **Go to slide N** (`:42` in palette already; navigator panel
  also)
- **Multi-cursor** — CodeMirror supports it; confirm enabled

Maya will silently check whether these exist before adopting.

#### Performance budgets — name the numbers

Without targets, "fast" is unmeasurable:

| Metric | v1 target |
|---|---|
| Cold startup → editable | < 2 s |
| Warm startup → editable | < 800 ms |
| Edit → preview update | < 100 ms (incremental); < 500 ms (cold) |
| 100-slide deck stays interactive | yes (degraded preview OK) |
| Memory ceiling for 100-slide deck | < 500 MB |
| PDF export of 50-slide deck | < 5 s |

These become gates in CI. Regression past them blocks the merge.

#### Document format versioning

What format do decks save in:

- **The `.md` file is the source.** Version via front matter:
  ```yaml
  schema: lattice/1
  ```
- **Companion `.slidewright/decks/<slug>.json`** for things that
  don't fit in markdown — chat history, AI tool-call history,
  comments, ambient state. Also versioned.

When the format evolves, `lattice-engine` runs migration functions
keyed on `schema:`. Old decks open cleanly in new versions;
new-version decks may open with warnings in older versions.

### Worth naming — decide direction, defer implementation

- **Slide transitions / animations.** Lattice's ink-on-paper
  positioning argues *no transitions*, but bullet-by-bullet reveal
  is *common* and orthogonal to print quality. **Lean: yes for
  reveal, no for fade / zoom / spin transitions.**
- **Audio / video embedding.** Pulls toward presentation-runner
  territory; conflicts with print quality. **Lean: no in v1.**
  Re-evaluate if presentation mode demands it.
- **Diff view + git integration.** Workspace under git could
  surface slide-level diffs. Power-user feature. **v1.x or v2.**
  Architecturally trivial (Yjs + markdown = easy to diff).
- **Multi-window.** Already an open question. **Lean: yes in v1**,
  one `Y.Doc` per window. Tauri supports it cleanly.
- **Internationalization architecture.** v1 ships English only,
  but **externalize strings from day one** — retrofitting is
  painful. Welcome deck + tour content are already data; i18n is
  mostly mechanical when we want it.
- **CLI integration.** A script invokes the desktop app to render
  a deck headlessly. `lattice-emulator.js` already does this; the
  desktop CLI surface stays minimal — open file, render, version.
  **v1 minimum.**
- **Snippets format + trigger UX.** The `.slidewright/snippets/`
  layout is named; format and trigger aren't. Lean: VS Code-style
  JSON with prefix triggers. **v1.x.**
- **RTL languages.** Arabic / Hebrew need RTL CSS — significant
  but mechanical. **v2** unless a strategic customer demands it.
- **Distribution channels.** Direct download is the v1 path
  (control over signing + update channel). App Store / MS Store /
  Snap / Flatpak come later — each has policies that constrain
  features (e.g., MAS forbids self-update).

### Architectural impact

Most of these are decisions, not subsystems. The ones that *do*
add to the architecture:

| Addition | Where it lands |
|---|---|
| Speaker-notes syntax | Document model + export adapters |
| Auto-save policy + crash recovery | Storage adapter (extends `Y.Doc` persistence) |
| Math rendering | New module (`MathRenderer`) — small; KaTeX wrapper |
| Telemetry + crash reporting | Cross-cutting; opt-out toggle in Settings |
| Auto-update channel | Tauri updater config + release CDN endpoint |
| Import adapters | Reverse of export adapters; same interface, opposite direction |
| Format version field | `lattice-engine` migration table |

Nothing forces a redesign. They're additions to known seams.

## Development leverage with Claude

The architecture above implies ~18–24 person-months of v1 work for
a small team. With disciplined use of **Claude Code** (the CLI for
software-engineering work), realistic compression is **50–60%** —
v1 in **9–12 months** rather than 18–24.

### Where Claude cuts time materially

**High compression (3-4×):**

- Scaffolding — project structure, configs, build pipelines
- Pattern-matched code — every capability hub is the same shape;
  build one carefully, generate the rest
- Adapter implementations against well-defined contracts (local-FS,
  PDF export, file watcher)
- Schema-driven work — settings schema → validators → types → docs
  all generated from one schema
- Glue code wiring subsystems (Yjs ↔ CodeMirror, commands ↔ menus,
  Settings observers ↔ subsystems)
- Tests for well-specified behaviors
- Documentation — README, JSDoc, in-app help, error messages,
  welcome-deck content, CHANGELOG

**Moderate compression (1.5–2×):**

- UX prototyping (Claude generates options; you pick taste)
- Library integration (Tauri, Candle, Yjs)
- Cross-platform hypothesis generation (real debugging still needs
  real machines)
- Mechanical refactoring

**Low compression (1× or less):**

- Product decisions (scope cuts, positioning, what to ship)
- Hard performance optimization
- Real-user testing
- Visual design taste
- Brand / marketing
- Security audit of own work

### This document IS the prompt

The underrated leverage: **this architecture doc is itself a
high-fidelity prompt.** ~15 named subsystems with explicit API
surfaces, 8 capability hubs with contracts, personas with
jobs-to-be-done, v1/v1.x/v2 staging, concrete file-format examples,
8 hypotheses with pass criteria.

Every implementation session starts: *"Here's the architecture
doc. Build `SlideSegmenter` per the spec. Run tests against
`examples/gallery.md`."* Claude inherits months of design work in
one prompt and writes the right code first try.

Without this doc, every session would relearn context. With it,
Claude operates at near-full architectural fluency from minute one.

### Disciplined usage — recommendations for this project

1. **Treat this doc as source of truth.** Every PR references the
   section it implements; drift gets called out.
2. **One subsystem per session.** `EditorHost` is a session;
   `SlideSegmenter` is a session; `WorkspaceView` is a session.
   Don't try to build everything at once.
3. **Tests first when contracts are clear.** Capability hubs
   especially. Catches Claude-hallucinated API misuse early.
4. **Code review every commit.** Velocity illusion is real —
   high-volume AI code accrues debt if not reviewed.
5. **Build v0.5 first.** Ship a tight minimum (editor + preview +
   workspace + Claude chat + PDF) before the full v1. Real usage
   reshapes v1 priorities.
6. **Use Claude Code, not chat-only Claude.** Purpose-built for
   software engineering — file editing, tests, git, MCP.
7. **Claude for the boring docs.** Welcome-deck content, help
   text, error messages, CHANGELOG — writable in your voice.
8. **Don't have Claude decide UX taste.** Prototype 3 options;
   you pick.

### Honest risks of leaning on Claude

1. **Velocity illusion** — code volume goes up; quality varies;
   review takes real attention
2. **Context drift across sessions** — each session needs the doc
   + relevant code in context
3. **Over-engineering** — Claude tends toward "clean" abstractions
   that may not match real usage. This doc's opinionated structure
   constrains that.
4. **API hallucination** — especially for newer libraries (Tauri 2,
   Candle, Yjs newer features); always verify against actual docs
5. **Cross-platform subtleties** — WebView quirks, paths, timing
   need real machines, not just Claude review
6. **Bottleneck shifts from typing to judgment** — code review
   becomes the constraint; plan for that

### Strategic implication

The time Claude saves should be **reinvested in what Claude can't
do** — getting Maya in front of v0.5, iterating on positioning,
polishing the welcome deck, debugging cross-platform issues,
making product decisions. Those are where the product is won or
lost.

**Plan as if Claude cuts v1 from 18 months to 10.** Then use the
eight saved months on the product work that doesn't compress.
