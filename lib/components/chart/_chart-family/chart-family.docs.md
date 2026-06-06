# chart-family

Lattice's chart engine. A shared rendering subsystem used by twelve
chart-class components: `progress`, `timeline-list`, `piechart`,
`gantt`, `kanban`, `radar`, `quadrant`, `state-chart`, `funnel`, `map`,
`journey`, and `word-cloud`.

Membership is defined by the engine, not the disk bucket: a chart-family
member is any layout the dispatcher wraps in the `.chart-frame` skeleton.
That is a wider net than substance = `series` — `state-chart` is a `graph`
and `journey` is `structure`, yet both render through the frame, and
`word-cloud` (`series`) was folded in when its bespoke frame-mirroring CSS
was retired in favour of the real skeleton.

**Files in this folder:**

| File | What it implements |
|---|---|
| `chart-family.css` | The `.chart-frame` skeleton + `.chart-status` pill vocabulary that every chart component wraps its content in. |
| `chart-family.js` | The dispatcher + inline kernels for `progress` / `timeline-list` / `piechart` / `gantt` / `kanban`, plus shared parsing helpers. Imports the per-component `radar.transform` and `quadrant.transform` kernels which live in their own component folders. |

The dispatcher runs in both render paths:
- **Marp Core engine plugin** (`marp.config.js`) — wraps Marp's
  `render()` output and post-processes the HTML string.
- **Emulator build path** (`lattice-emulator.js`) — calls the same
  dispatch inline during per-slide HTML construction.

---

## The `.chart-frame` skeleton

Every chart component renders into the same outer DOM shape:

```html
<section class="<layout> chart-frame">
  <div class="chart-header">
    <p class="chart-eyebrow"><code>…</code></p>
    <h2>Title.</h2>
    <p class="chart-subtitle"><code>…</code></p>
  </div>
  <div class="chart-body">
    <!-- layout-specific markup goes here -->
  </div>
  <p class="chart-caption">…</p>
</section>
```

The dispatcher does three things:
1. Recognizes the layout class on a section.
2. Wraps the section's content in `.chart-frame` / `.chart-header` /
   `.chart-body` / `.chart-caption`.
3. Rewrites the inner list (`<ul>` or `<ol>`) into layout-specific
   markup by calling the kernel for that layout.

CSS in `chart-family.css` styles the skeleton (header padding, body
flex layout, status pill chrome). Per-component CSS in
`lib/components/<chart-layout>/<chart-layout>.styles.css` styles the
chart's interior.

---

## Membership

The closed set of layouts wrapped by chart-family is hard-coded in
`chart-family.js`:

```js
const CHART_LAYOUTS = ['progress', 'timeline-list', 'piechart',
                       'gantt', 'kanban', 'radar', 'quadrant',
                       'state-chart', 'funnel', 'map',
                       'journey', 'word-cloud'];
```

Adding a new chart member requires updating that array AND either:
- writing an inline builder in `chart-family.js` (current pattern for
  `progress` / `timeline-list` / `piechart` / `gantt` / `kanban`), OR
- writing a per-component `<name>.transform.js` kernel and importing
  it from `chart-family.js` (current pattern for `radar`, `quadrant`,
  `state-chart`, `funnel`, `map`, `journey`, and `word-cloud`).

For a delegated kernel the dispatch branch calls the kernel's section
transform to rewrite the list in place (e.g.
`journey.transformJourneySection(html, cls)` /
`wordCloud.transformWordCloudSection(html, cls)`), leaving the `<h2>` for
the chart-frame wrap to lift into the header. The body container the kernel
emits (`.journey-board`, `.word-cloud-canvas`, …) must be listed in the
`bodyRE` the wrap scans for.

---

## Kernel contract

Per-component chart kernels (`radar.transform.js`, `quadrant.transform.js`)
export `transformChartSection(html, classTokens)` — a pure function
that takes the raw section HTML and the section's class tokens, returns
the rewritten HTML.

The same function signature is used by inline builders in
`chart-family.js`. The dispatcher routes based on class token presence
and calls the appropriate kernel.

---

## Three-renderer parity

The dispatcher runs identically in three places:

| Render path | Where the dispatch is called |
|---|---|
| Marp CLI | `marp.config.js` → `applyChartFamilyToHtml(html)` |
| Lattice emulator | `lattice-emulator.js` → inline `transformChartSection()` calls per slide |
| VS Code preview | `lattice-runtime.js` → DOM mirror that recreates the same wrappers at runtime |

Editorial guarantee: every chart slide renders identically across the
three paths. Drift between them is a bug; the per-component
integration tests at `test/integration/components/component-galleries.test.js`
assert page counts to catch transforms that silently change topology.

---

## Why HTML-string transforms, not markdown-it rules

The transform is structural (extract eyebrow before h2, subtitle after
h2, caption italic at the tail, rewrite the list into chart-specific
markup) and easier to express on rendered HTML than on the token
stream. The engine plugin in `marp.config.js` wraps `render` and
post-processes the resulting `html` string.

Why not a runtime `<script>`? VS Code Marp preview filters HTML
elements through Marp's allowlist, which excludes `<script>` by
default. Even with `markdown.marp.html: "all"`, relative-path
resolution and webview CSP made the runtime path unreliable. The
engine wrapper bakes the transform into the rendered HTML so the
preview and the export pipelines see the same DOM.

---

## Future refactor

The current file structure has an asymmetry: `radar` and `quadrant`
follow the per-component-transform pattern (their kernels live in
`lib/components/<name>/<name>.transform.js`), while the other 5 chart
layouts have their kernels inlined in `chart-family.js`. This was
historical — the inline kernels were written before per-component
transforms were a pattern.

A planned cleanup distributes all kernels to their components, leaving
`chart-family.js` as pure dispatch + shared helpers. See
`engineering/decisions/2026-05-17-chart-family-refactor.md` for the design.

---

## See also

- `lib/components/chart/{progress,timeline-list,piechart,gantt,kanban,radar,quadrant,state-chart,funnel,map,journey,word-cloud}/<name>.docs.md` — per-component contracts and variant catalogs.
- `lib/shared/shared.docs.md` — the contrast: small composable
  modifiers (`compact`, `loose`, `accent`) that compose with all
  layouts, not just chart components.
