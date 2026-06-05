# Gotchas

Things in this codebase that look wrong but aren't, plus workarounds
whose rationale lives in commit messages and would otherwise be lost.

This is a **living index**. When you hit something surprising — a hack
in the code, a quirk in a dependency, a behavior that took a bisect to
understand — add an entry. Future-you and future-collaborators (human
or LLM) will thank you.

## How to use this file

Read top-to-bottom when something breaks in an unfamiliar way; the
symptoms in the headings are searchable. When fixing or working around
something subtle, add an entry **before** committing the fix so the
commit message can link to it.

Each entry has the same shape:

- **Symptom** — what you'd see if you didn't know about this
- **Cause** — root cause, in one paragraph
- **Mitigation** — what the code does about it (with file:line links)
- **Triggered by** — what flow exercises this path
- **Removable when** — what upstream change would let us delete the
  workaround (often "never", which is fine to say)
- **Commits** — the SHAs that introduced or fixed this

Keep entries terse — one screen each. If something needs a deep dive,
spin out a `engineering/decisions/YYYY-MM-DD-topic.md` and link to it from here.

---

## Charts

### Pie wedge borders off-by-one (`nth-child` vs `<defs>`)

- **Symptom:** A pie wedge's border doesn't match its fill — most
  visibly, the small teal slice rendered a rose/red border, drawing a
  stray red line at the 12-o'clock seam. Every wedge border was actually
  one slot ahead of its fill (blue wedge → orange border, etc.).
- **Cause:** The piechart SVG is `<svg><defs>…gradients…</defs><path
  class="wedge"/>…</svg>`. The `<defs>` block is the SVG's **first
  child**, so the wedge paths are children 2…N+1. Wedge fills are set
  inline per slice (correct), but wedge *borders* were assigned by
  `.wedge:nth-child(6n+k)` — and `nth-child` counts `<defs>` as #1, so
  every wedge picked up the *next* slot's `--catN-ink`. The 5th wedge
  landed on `nth-child(6)` → `--cat6` (rose).
- **Mitigation:** Wedge borders count by `nth-of-type` instead, which
  considers only `<path>` siblings and ignores `<defs>`
  (`lib/components/chart/piechart/piechart.styles.css`). Legend swatches
  keep `nth-child` — their flex container has no leading non-swatch
  sibling.
- **Triggered by:** Any piechart render (the `<defs>` is always emitted
  for the per-wedge radial gradients).
- **Removable when:** Never, while the gradients live in an in-SVG
  `<defs>`. (Moving wedges into a `<g>` wrapper would also fix it.)
- **Commits:** the per-color-mode audit fix.

---

## Marp / Marpit

### Marp Preview emits `<marp-pre>`, marp-cli emits `<pre is="marp-pre">`

- **Symptom:** A CSS rule scoped to `pre` works in marp-cli HTML output
  but not in VS Code Marp preview.
- **Cause:** The marp-vscode extension's preview path uses a custom
  element `<marp-pre>` for fenced code blocks, while marp-cli renders
  them as `<pre is="marp-pre">` (a plain `<pre>` with an `is` attribute).
  Element-name selectors (`pre`) match the latter but not the former.
- **Mitigation:** Use `:is(pre, marp-pre)` for any rule that needs to
  hit both render paths. Currently applied to the inline-code chip
  reset at [lattice.css:114-120](../dist/lattice.css#L114-L120).
- **Triggered by:** Any fenced code block — including mermaid sources
  before they're upgraded to SVG.
- **Removable when:** marp-vscode unifies on `<pre is="marp-pre">`.
  Unlikely; they use the custom element for their own DOM hooks.
- **Commits:** `17784c2`.

### Marp Core wraps emoji in `<img class="emoji">` (twemoji)

- **Symptom:** A line like `Hello 👋 there!` renders with the wave on
  its own line — heading wraps, card body breaks, footer chrome shifts
  vertically. Affects every text element (header, footer, title, card
  heading, card content, eyebrow, key insight, below-note, etc.).
- **Cause:** Marp Core's built-in emoji plugin rewrites every unicode
  emoji in source markdown to `<img class="emoji" data-marp-twemoji
  src="https://cdn.jsdelivr.net/gh/jdecked/twemoji@…/<cp>.svg">`. That
  img then gets picked up by the catch-all rule
  `section img { …; display:block; max-width:100% }`, which is intended
  for author-inserted figures. Block + 100% width = own line, full slide
  width. The marp-cli build and the marp-vscode preview both hit this;
  lattice-emulator leaves emoji as raw text (no rewrite) but inherits
  the inline alignment issue when no emoji font is in the stack.
- **Mitigation:** Two parts in [lattice.css](../dist/lattice.css):
  1. Exempt the emoji class from the block image rule — the catch-all
     is now `section img:not(.emoji)`, and `section img.emoji` is set
     to `display:inline-block; height:1em; vertical-align:-0.1em`.
  2. Append `'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji'`
     to every `--font-*` stack in `:root` so the lattice-emulator path
     (raw unicode) also has a defined emoji font and doesn't fall back
     to a glyph with wildly different metrics.
- **Triggered by:** Any unicode emoji anywhere in a deck.
- **Removable when:** Never — Marp Core's emoji rewrite is built in
  and on by default. The `:not(.emoji)` carve-out is the correct shape.
- **Commits:** `claude/fix-emoji-rendering-WO4vI`.

### Marpit "spot replaces global" for the `class:` directive

- **Symptom:** Adding `class: dark` to front matter does nothing on a
  deck where every slide carries `<!-- _class: foo -->`.
- **Cause:** Marpit's directive spec is documented as "spot replaces
  global." A per-slide `_class:` directive *replaces* the deck-wide
  `class:` value entirely on that slide rather than composing with it.
  In a layout-heavy deck (every slide has a `_class:` for layout
  selection), the deck-wide directive lands on zero sections.
- **Mitigation:** The `deckClassPropagate` Marpit plugin in
  [marp.config.js:1-50](../marp.config.js#L1-L50) reads the
  front-matter `class:` line directly from source and *appends* its
  tokens to every section. The lattice-emulator front-matter parser
  mirrors this in [lattice-emulator.js](../lattice-emulator.js).
  This intentionally diverges from Marpit's spec.
- **Triggered by:** Any `class: <value>` in deck front matter.
- **Removable when:** Never — Marpit's spec won't change. Could be
  retired if all decks moved to `theme: <name>-dark` or `style:` for
  whole-deck modifiers, but the directive is a real convenience.
- **Commits:** `f9068a7` (plugin), `b502bcc` (emulator parsing).

### Chromium blocks `file://` URLs as `mask-image` sources

- **Symptom:** A CSS rule like `.foo { background: white; mask: url("./asset.svg") center / contain no-repeat; }` works in HTTP-served pages and in dev tools, but the masked element renders completely invisible in headless Chromium loading from `file://` (which is how every lattice-emulator PDF build works).
- **Cause:** Chromium treats each `file://` URL as its own origin and refuses to load mask sources cross-origin, even within `file://`. The same URL works fine as `<img src>` or as `background-image` — only `mask-image` is restricted. No console error; the mask just resolves to fully-transparent.
- **Mitigation:** Don't use `file://` URLs as `mask-image`. Inline the source as a `data:` URL (works), use an inline SVG `<mask>` element reference (works), or do the visual treatment via a different mechanism (`filter`, `mix-blend-mode`, etc.). The custom-logo feature went through three iterations on this: `::before` pseudo with `var(--deck-logo)` mask → real `<img>` with mask → final filter-only approach with no mask, because filter has none of the origin restrictions and works equally well in marp-cli, lattice-emulator, marp-vscode, and exported HTML.
- **Triggered by:** Any author writing `mask-image: url("./local.svg")` and building locally.
- **Removable when:** Chromium relaxes the file-origin policy for mask sources. Unlikely.
- **Commits:** This branch (the custom-logo redesign).

### Chromium PDF output of CSS `mask-image` renders inconsistently across viewers

- **Symptom:** A `::before` with `mask: url("data:image/svg+xml,…") center / contain no-repeat` renders correctly in the browser AND in the marp-cli PDF builder's headless Chromium, but the resulting PDF, when opened in Apple PDFKit (macOS Preview, iOS), Skia (Chrome's built-in PDF viewer), or PDFium (Edge / VS Code), sometimes drops the mask entirely — the `::before` rectangle appears as a solid tinted block the size of its bounding box, filled with the paint colour, with no shape clipping. Failure is viewer-specific and shape-specific: identical CSS, one mask drops on one viewer and renders fine on another, or the same mask drops only on certain `::before` sizes.
- **Cause:** Chromium emits masks in the vector PDF stream using a combination of soft-mask groups and clip paths that the spec permits but that not every PDF reader implements identically. Apple PDFKit is the strictest — it ignores constructs that Skia/PDFium accept, falling back to the unmasked source rectangle. Has held across multiple Chromium versions; not a regression.
- **Mitigation:**
  - **Cropped `::before` bbox.** Size the `::before` to the shapes' bounding box, not the full slide. When the mask drops, the failure surfaces as a small tinted patch (degradation) rather than a slide-spanning panel of paint (slide-breaking artifact). This is what the orbit-pattern refactor in the treatments library does for the 8 mask-based marks.
  - **Box-shadow stack.** For marks whose geometry is "one shape repeated at evenly-spaced offsets" (e.g. `mark-ticks` — 5 ticks down the right margin), drop the mask entirely and paint via one `::before` plus N `box-shadow` copies. `border-radius` on the `::before` propagates to the shadows, so rounded shapes work (`mark-pills`).
  - **Stacked radial gradients in a slot.** For marks whose geometry is "many small shapes scattered across multiple corners" (e.g. `mark-seeds` — 12 ellipses across all four corners), drop the mask and write to `--_bg-radial` as N stacked `radial-gradient(...)` values. Gradients are native rendering primitives with no mask to drop.
- **Triggered by:** Any `::before` (or `::after`) carrying `mask` / `mask-image` that the author opens in a PDF viewer. The browser preview never reveals this failure mode; only the rendered PDF does. The catalog rebuild on the treatments-rename branch was the forcing function.
- **Removable when:** Apple PDFKit gains parity with Skia/PDFium for the soft-mask constructs Chromium emits. No timeline.
- **Commits:** This branch (treatments rename; the cropped-bbox + box-shadow + gradient-slot escape hatches). See `engineering/treatments.md` → "Mark rendering" for the rendering-mechanism breakdown.

### Custom `logo:` front-matter directive shows nothing in marp-vscode preview

- **Symptom:** A deck with `logo: ./acme-logo.svg` in front matter
  builds a correct PDF (logo visible top-right of every slide) and
  appears correctly in exported HTML viewed in a browser, but the
  marp-vscode preview pane shows no logo at all.
- **Cause:** The convenience `logo:` directive is handled by
  `applyDeckLogoToHtml` in
  [marp.config.js](../marp.config.js) plus the post-render hook in
  [lattice-emulator.js](../lattice-emulator.js) and the runtime
  mirror `applyDeckLogoFromFrontMatter` in
  [lattice-runtime.js](../dist/lattice-runtime.js). The marp-cli and
  emulator paths run at build time; the runtime path fetches the
  source `.md` from the same origin as the rendered HTML. The
  marp-vscode extension does **not** load workspace `marp.config.js`
  plugins, AND the runtime's `fetch()` can't reach workspace files in
  the `vscode-webview://` sandbox — same limitation
  `applyDeckClassFromFrontMatter` documents at
  [lattice-runtime.js:3463-3465](../dist/lattice-runtime.js#L3463-L3465).
  Net result: no path works in the marp-vscode preview.
- **Mitigation:** None inside marp-vscode preview today. The author
  sees the logo only when they build the PDF or view the exported
  HTML in a browser. Authors who need live-preview validation can
  manually add `<img class="deck-logo" src="…" style="--deck-logo-src:url('…')">`
  as the first child of a single slide for spot-checking.
- **Triggered by:** Any `logo: <path>` in deck front matter when
  authoring inside marp-vscode.
- **Removable when:** marp-vscode adds workspace-config plugin
  loading. Unlikely in the near term.
- **Commits:** This branch.

### Marpit theme prefixer mangles `:is(...)` and `:where(...)` as a leading selector

- **Symptom:** A CSS rule like `:is(section.A, section.B) > p { … }`
  or `:where(.chart-frame) > .chart-status { … }` silently fails when
  applied via Marpit's themeSet, even though the same rule works in
  plain CSS. No build error; the rule just never fires.
- **Cause:** Marpit's prefixer rewrites every theme rule to scope it
  to the slide root, prepending `div#:$p > svg > foreignobject >
  section`. Its pattern only recognises a single leading `section` or
  known type — when the selector starts with `:is(...)` or `:where(...)`,
  the prefixer treats the function as a *descendant* of the slide
  root (`section :is(...)`), producing a selector that matches a
  section nested inside another section (which never exists).
- **Mitigation:** Expand to a comma-separated union with the leading
  `section.X` repeated for each branch:
  `section.A > p, section.B > p { … }`. Note `section:where(:not(.A)…)`
  is OK — the leading combinator is `section`, not `:where()`. Marp-cli
  build path doesn't go through the prefixer, so this is preview-only;
  PDF export looks correct, preview silently breaks.
- **Triggered by:** Any theme CSS rule whose first selector is
  `:is(...)` or `:where(...)`.
- **Removable when:** Marpit's prefixer changes its leading-selector
  detection.
- **Commits:** `434c2f5c` (annotation/below-note expansion), `225cea0`
  (commit body §"Marpit theme-scoper").

### Front-matter `style:` directive specificity vs. theme :root

- **Symptom:** Author writes `style: ":root{color-scheme:dark}"` to
  flip the deck dark, but the theme's own `:root { color-scheme: light }`
  wins and the deck stays light.
- **Cause:** Both rules have selector specificity (0,0,1) and are
  scoped identically by Marpit. Source order then decides — and the
  theme CSS often appears AFTER the user's `style:` block in the
  rendered output, so the theme wins.
- **Mitigation:** Theme defaults that are meant to be overridable use
  `:where(:root) { … }` in [themes/cuoio.css:64](../themes/cuoio.css#L64)
  and [themes/indaco.css:58](../themes/indaco.css#L58). `:where()`
  has zero specificity, so any plain `:root` declaration the author
  injects wins regardless of source order.
- **Triggered by:** `style:` directive in deck front matter.
- **Removable when:** Marp guarantees user `style:` content always
  appears after theme CSS (it doesn't, intentionally).
- **Commits:** `6276665`.

### lattice-emulator doesn't auto-load `style:` from front matter

- **Symptom:** Same `style: ":root{…}"` works through marp-cli and
  marp-vscode but is silently ignored by `lattice-emulator.js`.
- **Cause:** The emulator hand-rolls its front-matter reader (it
  doesn't use markdown-it / Marpit for parse). Until recently it only
  looked for `paginate:`, `header:`, `footer:`, `class:`, and
  `headingDivider:`.
- **Mitigation:** Front-matter reader in
  [lattice-emulator.js:773-792](../lattice-emulator.js#L773-L792)
  now parses both inline (`style: "..."`) and YAML block scalar
  (`style: |`) forms and injects the content into the `<style>` block
  after the theme CSS so author overrides win.
- **Triggered by:** Any `style:` directive in front matter when
  rendering through `lattice-emulator.js`.
- **Removable when:** The emulator switches to a real Marpit/Marp
  engine. Tracked separately.
- **Commits:** `6276665`.

### marp-cli works in the cloud sandbox — set `CHROME_PATH`

- **Symptom:** Running `npx marp` in a Claude Code on Web session
  fails with "No suitable browser found. Please ensure one of the
  following browsers is installed: chrome, edge, firefox." A new
  session might conclude marp-cli isn't available and skip the
  marp-cli render path entirely.
- **Cause (install side):** `@marp-team/marp-cli` is a regular
  `dependencies` entry in `package.json` (see the `^4.3.1` line). A
  normal `npm install` puts the `marp` binary in `node_modules/.bin/`
  — no extra install step. `npx marp` resolves to that binary. If
  `npx` is reaching for the network instead, `npm install` hasn't
  been run yet.
- **Cause (browser side):** Once marp-cli launches, its own browser
  auto-detection looks in the standard system locations
  (`/usr/bin/google-chrome`, etc.) and doesn't know about the
  puppeteer-cached chromium binary that the sandbox ships with. The
  binary IS present at
  `/root/.cache/puppeteer/chrome/linux-<version>/chrome-linux64/chrome`
  — marp-cli just can't find it on its own.
- **Mitigation:** Set `CHROME_PATH` in the env before invoking
  `npx marp`. The integration test helper at
  [test/helpers/render.js](../test/helpers/render.js) inherits
  `process.env`, so the same env var works for tests too.

  ```bash
  CHROME_PATH=$(ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome | head -1) \
    npx marp <deck>.md --config-file marp.config.js \
      --allow-local-files --pdf -o <deck>.pdf
  ```

- **Triggered by:** Any ad-hoc marp-cli invocation in a fresh
  cloud-sandbox session.
- **Removable when:** marp-cli adds puppeteer-cache discovery, or the
  sandbox ships chromium at one of the canonical system paths.
- **Commits:** documentation-only — captured here so future sessions
  don't conclude the tool is missing.

### marp-cli ignores `theme:` front matter unless the theme is in `themeSet`

- **Symptom:** A deck specifies `theme: mustard` (or any other named
  theme), but the marp-cli PDF render comes out with white background,
  black text, and no palette tokens — looks like dark mode is broken,
  or like the theme silently failed. Same deck rendered through
  `lattice-emulator.js` looks fine.
- **Cause:** marp-cli only resolves theme names to files listed in
  `themeSet` (in `marp.config.js`) or passed via `--theme-set`. If the
  theme file isn't registered, marp-cli falls back to no theme — every
  color token (`--bg`, `--text-body`, etc.) is undefined and the
  defaults render as browser defaults. The emulator path doesn't have
  this problem because it loads `lattice.css` (which `@import`s the
  theme via the palette positional argument) directly.
- **Mitigation:** Every theme under `themes/` is now listed in
  `marp.config.js` `themeSet` (see commit `6aad1e6`).  Any new theme
  added to the directory must also be added there or marp-cli renders
  won't find it.
- **Triggered by:** Any deck whose front-matter `theme:` directive
  names a theme not in `themeSet`.
- **Removable when:** marp-cli supports `themeSet` auto-discovery
  from a directory glob.
- **Commits:** `3fa0462`, `6aad1e6`.

---

## Mermaid

### Playground: Mermaid (and all DOM transforms) stop rendering after the first edit

- **Symptom:** In the docs playground, add a ```mermaid fence and nothing
  renders — the source stays a code block. `window.mermaid` is loaded and there
  are no console errors. Charts/badges added after the first render also fail.
- **Cause (two compounding bugs):**
  1. `writeFrame` rebuilt the preview with `document.open()/write()/close()`,
     which clears the *document* but reuses the iframe *window*.
     `lattice-runtime.js` is one IIFE guarded by
     `globalScope.__llMermaidBootstrapLoaded` (set once per window); the starter
     render set it, so every later render short-circuited the whole runtime.
  2. `runAllContentTransforms()` called `transformStripHeadingPeriods` /
     `transformAddHeadingPeriods` / `applyGlossaryListTable` /
     `applyGlossaryRangePills`, and bootstrap called `startObserver` — undefined
     leftovers from the registry migration (`690835d`). The first threw a
     ReferenceError that aborted the pass *before* `wrapFences()`. (Masked until
     bug #1 was fixed, since the guard meant bootstrap rarely re-ran.)
- **Mitigation:** Playground `writeFrame` uses `iframe.srcdoc` (fresh browsing
  context per render → guard resets). Dead calls removed (heading periods are a
  render-time markdown-it concern; glossary likewise); `startObserver()`
  replaced with the Mermaid-fence `MutationObserver` it was meant to be (wired
  to `scheduleRun`). Rebuild `dist/lattice-runtime.js`.
- **Applies to:** any embedder reusing one iframe via `document.write`. The
  landing's live showcase (`index.astro`) already uses `srcdoc` for this reason.

### Mermaid's color parser rejects `light-dark()`

- **Symptom:** `[pageerror] Unsupported color format:
  "light-dark(#FAF7F2, #15110D)"`. Mermaid bootstrap halts; mermaid
  blocks stay in `data-mermaid-state="pending"` showing source code.
- **Cause:** When `lattice-runtime.js` reads palette tokens via
  `getComputedStyle().getPropertyValue('--bg')`, it gets the *raw
  token stream*, not the resolved color. After the light-dark() refactor,
  surface tokens are stored as `light-dark(<light>, <dark>)`. Mermaid's
  color parser only accepts hex / rgb / hsl / named colors and throws
  on the function form.
- **Mitigation:** `buildMermaidThemeVars` in `lattice-runtime.js`
  attaches a hidden probe element to the scope section, sets its `color`
  to `var(--token)`, and reads back `getComputedStyle(probe).color`.
  Browsers DO resolve `light-dark()` (and `color-mix()`) on real color
  properties — only the custom-property accessor returns unresolved tokens.
  If the probe still returns `rgba(0,0,0,0)` (older Chromium that doesn't
  support `light-dark()`), `vc()` now manually parses the raw token and
  picks the correct arm based on the section's `colorScheme`.
- **Triggered by:** Any palette using `light-dark()` for surface
  tokens — currently cuoio and indaco.
- **Removable when:** Mermaid's color parser supports `light-dark()`.
  Unlikely soon.
- **Commits:** `5e47ff3` (probe approach), theme-cleanup commit (fallback parser).

### Mermaid kanban applies a lighten step to cScale

- **Symptom:** Categorical colors in kanban swimlane headers come out
  too pale; configured cScale values look nothing like the rendered
  result.
- **Cause:** Mermaid's kanban renderer internally lightens the cScale
  inputs by ~10-15 lightness points before painting swimlane headers.
- **Mitigation:** The cat-* tokens in [themes/indaco.css:286-294](../themes/indaco.css#L286-L294)
  are pinned at L≈60 specifically so kanban's lighten step lands at
  L≈70 (where dark text reads cleanly). Mindmap and other diagrams
  that read cScale directly get a CSS override in the per-diagram
  Mermaid CSS section to use the pale-band tints instead. See
  [engineering/mermaid.md](./mermaid.md).
- **Triggered by:** Kanban diagrams.
- **Removable when:** Mermaid exposes a per-diagram cScale that
  bypasses the lighten step.
- **Commits:** Original palette commit; mindmap override now lives in
  `lattice.css`'s DIAGRAM OVERRIDES section.

### Mermaid timeline + journey are tile-stack, not card-on-band

- **Symptom (the trap):** Side-by-side with kanban (which has `--bg-alt`
  tickets visibly lifted off band-tinted lanes), a timeline or journey
  looks "flat" or "uncoloured." Tempting to apply the same `--bg-alt`
  inner-card rule to fix the inconsistency. **It does not work** — the
  inner cards become indistinguishable from the white slide canvas
  because there is no band underneath them.
- **Cause:** Kanban tickets physically sit *inside* a `<g class="cluster
  section-N">` whose `<rect>` is painted with `--cN-light`. The
  `--bg-alt` card-on-tinted-lane reading is real. Timeline and journey
  do NOT have this structure: the period/section header is a single
  small `--cN-light` rect at the *top* of a column, and the tasks/events
  stack *below* it on the slide canvas (`--bg` white). `--bg-alt` on
  `--bg` is virtually invisible (#F2F5FA on #FFFFFF in indaco), so the
  cards disappear.
- **Mitigation:** Timeline events and journey tasks keep the
  `.section-N rect/path { fill: --cN-light }` rule and inherit their
  period/section's pale tint. `--c-stroke` provides the card outline
  against the canvas. If a pale tint reads too pale against the canvas
  in a given palette, the right fix is to deepen the slot itself, not
  to introduce a structural override that doesn't apply.
- **Triggered by:** Mistaking syntactic nesting (event-in-period in
  Mermaid source) for visual nesting (card-on-tinted-surface in the
  rendered SVG).
- **Removable when:** Mermaid restructures timeline/journey to render
  a band-tinted column behind each period's task/event stack. Not on
  the roadmap.
- **Commits:** Initial misapplication + audit + revert; see
  `engineering/decisions/2026-05-12-diagram-elevation.md`.

### ~~Mermaid's `%%{init}%%` directive is intolerant of CSS comments~~ (RESOLVED)

- **Status:** No longer applicable as of 2026-05-12. Lattice no longer
  uses Mermaid's `themeCSS` init parameter; per-diagram CSS lives in
  `lattice.css`'s DIAGRAM OVERRIDES section and reaches the inline SVG
  via the host page cascade. CSS comments and the `>` child combinator
  are both safe to use again.
- **Historical context:** Mermaid's `%%{init}%%` JSON parser silently
  dropped `themeCSS` payloads containing `/* … */` comments, and
  similarly rejected the `>` combinator. Both restrictions are gone
  with the new architecture.
- **See:** `engineering/decisions/2026-05-12-diagram-tokens.md`.

### Mermaid frontmatter must be FIRST; `%%{init}%%` injection comes after

- **Symptom:** Mermaid renders without our themeVariables even though we
  appear to be passing them.
- **Cause:** Mermaid requires the frontmatter (`---\n…\n---\n`) to be
  the very first thing in the diagram source. Naive prepending of a
  `%%{init}%%` directive breaks frontmatter detection.
- **Mitigation:** `lattice-emulator.js:renderMermaid` detects an opening
  frontmatter block and injects the `%%{init}%%` AFTER the closing
  `---\n` rather than at the top.
- **Triggered by:** Mermaid sources that include a `title:` or
  `displayMode:` frontmatter block.
- **Removable when:** Never — this is correct per Mermaid's spec.
- **Commits:** Original mermaid renderer commit.

### Mermaid `mermaid.run()` is async; restoration logic must wait

- **Symptom:** A loop that runs synchronously after `mermaid.run()`
  sees diagrams with `data-processed="true"` but no SVG yet. If that
  loop "restores" the source text on empty containers, it overwrites
  in-flight renders, so SVGs disappear and source text reappears.
- **Cause:** `mermaid.run()` sets `data-processed` synchronously then
  starts SVG generation asynchronously (~500ms for complex diagrams).
  Mermaid clears the container's `innerHTML` *before* injecting SVG
  to avoid stale content collisions. So during the render window:
  data-processed=true + innerHTML empty + no svg yet — looks like a
  failure to a synchronous observer.
- **Mitigation:** [lattice-runtime.js](../dist/lattice-runtime.js) wraps
  any post-render restoration in `Promise.resolve(_runPromise).then()`
  so the loop only fires after the render promise resolves. Per-fence
  `mermaid.render` with try/catch is the structurally cleaner pattern
  (see commit `c57366bf`).
- **Triggered by:** Anything that walks `[data-processed]` immediately
  after calling `mermaid.run()`.
- **Removable when:** Never — Mermaid's render is async by design.
- **Commits:** `8677868d`, `c57366bf`, `7079e65c`.

### Mermaid's built-in error renderer breaks slide layout

- **Symptom:** A diagram with a parser error renders an SVG with the
  error icon/text appearing in the upper-right corner of the slide,
  far from the diagram's actual position.
- **Cause:** Mermaid's built-in error renderer emits an SVG with a
  hardcoded `viewBox="0 0 2412 512"` — designed for a full-page web
  context, not a fixed-height slide. The icon sits at `x=1440`. Inside
  Marp's `foreignObject` slot, the SVG height resolves to `0/auto`
  and content overflows visually.
- **Mitigation:** [lattice-runtime.js](../dist/lattice-runtime.js) sets
  `suppressErrorRendering: true` in `mermaid.initialize()`, then saves
  raw source as `data-ll-source` before `mermaid.run()` clears
  innerHTML. A post-run loop restores `textContent` on any
  `[data-processed]` element that ended up with no SVG, so the
  `:not(:has(svg))` CSS fallback shows the broken diagram source as a
  styled code block instead of the chrome-breaking error SVG.
- **Triggered by:** Any mermaid diagram with a parser error.
- **Removable when:** Mermaid's error renderer respects container
  geometry.
- **Commits:** `12fd6804`.

### Mermaid `themeVariables` must come from a `<section>`, not `:root`

- **Symptom:** `buildMermaidThemeVars()` reads CSS custom properties
  from `document.documentElement` and gets empty strings for every
  theme token. Mermaid falls back to its yellow/orange built-in
  defaults; preview shows wrong cluster colors and broken cScale.
- **Cause:** Marp scopes theme custom properties to `<section>`
  elements, not `:root` / `<html>`. The themeSet rules become
  `div#:$p > svg > foreignobject > section { --bg: …; }`, never
  `:root { --bg: …; }`. Reading from `documentElement` returns the
  unset value (empty string).
- **Mitigation:** `buildMermaidThemeVars` in
  [lattice-runtime.js:31](../dist/lattice-runtime.js#L31) reads from
  `document.querySelector('section') ?? document.documentElement`. A
  sentinel-color guard before `mermaid.initialize()` retries until
  the stylesheet has applied (the first tick can fire before
  paint).
- **Triggered by:** Any deck through Marp preview where the JS reads
  theme tokens.
- **Removable when:** Marpit hoists theme variables to `:root`.
- **Commits:** `f7f6558c`, `7079e65c`.

### `:where(:root)` token blocks are dropped from every rendered slide

- **Symptom:** Tokens declared in a `:where(:root) { … }` block are
  `getComputedStyle(section).getPropertyValue(...)` → `""` (undefined)
  in marp-cli **and** the preview, even though a sibling plain
  `:root { … }` block works. A no-fallback consumer like `color:
  var(--on-dark-secondary)` then inherits whatever the cascade gives
  (dark body ink), so title/closing/divider eyebrows + subtitles and
  every split-* dark panel go invisible — on every theme except the
  one that locally redefines the token (cuoio masked this for the
  whole `--on-dark-*` ramp). The emulator path is immune: it injects
  the bundle into a global `<style>` with no scoping, so `:where(:root)`
  matches the real `<html>` — which is why the committed (emulator-built)
  gallery PDFs looked fine and the bug only showed in PDF export /
  desktop.
- **Cause:** Same Marpit scoping engine as the entry above, but the
  `:where()` wrapper defeats the root-replacement. Marpit rewrites a
  **bare** `:root` (or `section`) to target the slide `<section>`
  directly. Wrapped in `:where()`, it is treated as an ordinary
  selector and the slide path is PREFIXED as a descendant:
  `:where(:root)` → `… > section :where(:where(section):not([root]))`
  and `:where(section)` → `… > section :where(section)`. Both mean "a
  section nested inside a section", which never exists in Marp, so the
  block matches nothing.
- **Mitigation:** Declare universal token defaults in a **plain
  `:root`** block (see `lib/base/base.tokens.css` `--on-dark-*` / hljs
  ramp). A palette's own `:root` override is the identical selector at
  equal specificity and loads after the base bundle (themes
  `@import 'lattice'` first), so source order — not zero-specificity
  `:where()` — resolves "any palette override wins". Do NOT reach for
  `:where(:root)`/`:where(section)` to get low specificity; neither
  scopes.
- **Triggered by:** Any token-defining block authored as
  `:where(:root)` (or `:where(section)`) in the bundle.
- **Removable when:** Marpit applies root-replacement inside `:where()`.
- **Commits:** _(this fix)_.

### Mermaid had `layout: 'tidy-tree'` — silent diagram loss

- **Symptom:** Specific diagram types (state, ER, class) showed as
  `data-processed="true"` but had no SVG content. Other diagrams
  (flowchart, sequence) rendered fine.
- **Cause:** Earlier code passed `layout: 'tidy-tree'` to
  `mermaid.initialize()`. Mermaid 11.x recognizes only `'dagre'`
  (built-in) and `'elk'` (separate package) — any other value throws
  `Unknown layout algorithm` mid-render. With `suppressErrorRendering:
  true`, the throw is swallowed; the diagram stays "processed" but
  empty.
- **Mitigation:** Removed the bogus option. Each diagram now picks its
  native layout. **Lesson:** when adding Mermaid options, every value
  must be from the official list; "looks plausible" silently kills
  diagrams.
- **Triggered by:** Mermaid options outside the documented enum.
- **Removable when:** N/A (anti-pattern, don't reintroduce).
- **Commits:** `c57366bf`.

### `mmdc` / Puppeteer flakes intermittently on cold starts

- **Symptom:** First mermaid diagram in a build run fails with
  "browser startup race" or empty SVG output; subsequent diagrams
  succeed.
- **Cause:** Mermaid CLI uses Puppeteer to rasterize diagrams.
  Puppeteer has known startup races, especially under contention
  (parallel CI, tight resource limits) and when fetching CDN-hosted
  icon sets for architecture/c4 diagrams.
- **Mitigation:** [lattice-emulator.js:683-707](../lattice-emulator.js#L683-L707)
  retries up to 3 times with a 1s backoff between attempts. Each
  attempt is fully isolated (stale outputs deleted between tries).
- **Triggered by:** Cold builds, slow networks, contended hosts.
- **Removable when:** Puppeteer / mmdc release without the race.
  Realistically: never; retries are cheap.
- **Commits:** Original renderer commit.

---

## VS Code / marp-vscode

### marp-vscode does NOT load `marp.config.js`

- **Symptom:** Marpit plugins (e.g., `splitPanelCounter`, `verdictGridBadges`,
  `deckClassPropagate`) work in marp-cli builds and the lattice-emulator
  pipeline but never fire in VS Code preview.
- **Cause:** marp-vscode 3.5.1 has no `markdown.marp.engine` setting.
  It loads themes via `markdown.marp.themes` but uses the bare Marp
  Core engine for rendering. There is no extension point for engine
  plugins from the workspace.
- **Mitigation:** Behaviors that need to fire in VS Code preview must
  be mirrored as DOM transforms in
  [lattice-runtime.js](../dist/lattice-runtime.js) (loaded into the
  preview via `<script src="../lattice-runtime.js">` at the end of
  every deck). Maintained as a separate code path; see the
  comments above each `transform*()` function.
- **Triggered by:** Any deck opened in VS Code Marp preview.
- **Removable when:** marp-vscode adds engine config support.
- **Commits:** Original `lattice-runtime.js` design.

### `git worktree` doesn't share `node_modules`

- **Symptom:** Inspecting a historical commit via
  `git worktree add ../inspect <sha>` and opening the deck in
  preview, mermaid never renders. The same commit checked out in
  the main directory works fine.
- **Cause:** Worktrees share `.git` but not working files. `node_modules/`
  isn't tracked, so the worktree has no installed deps. The script
  tag `<script src="../node_modules/mermaid/...">` 404s.
- **Mitigation:** Mermaid is now vendored at the repo root as
  `mermaid-v11.min.js` and committed. Worktrees and fresh clones see
  it at the right relative path without `npm install`. See
  [engineering/decisions/2026-04-30-mermaid-theming.md](decisions/2026-04-30-mermaid-theming.md)
  for the full rationale.
- **Triggered by:** Any worktree or clone where `npm install` hasn't
  been run; any deck not under `examples/`.
- **Removable when:** Never — worktrees are designed not to share
  build deps.
- **Commits:** `8607e65`.

### marp-vscode webview CSP blocks `<script>` — structural transforms must use the engine render hook

- **Symptom:** A DOM transform authored in `lattice-runtime.js` (or any
  `<script src="...">` tag in the markdown) works in PDF export and the
  browser but never fires in VS Code Marp preview. The slide HTML looks
  correct in the build output but wrong in preview.
- **Cause:** marp-vscode loads preview content in a sandboxed webview with
  a strict Content Security Policy that disallows script execution. Even
  with `enableHtml: true`, relative `<script src="...">` paths do not
  resolve reliably inside the webview context.
- **Mitigation:** Structural DOM transforms (split panels, chart-family)
  are implemented as HTML-string rewrites in `lib/core/split-panels.js` and
  `lib/components/chart/_chart-family/chart-family.js`, called from the `engine` render wrapper in
  [marp.config.js](../marp.config.js). The wrapper runs at render time
  — before the webview CSP applies — so the HTML is baked correctly before
  the preview displays it. `lattice-runtime.js` DOM transforms remain as a
  fallback for the web-export path only.
- **Triggered by:** Any new structural transform that needs to work in the
  VS Code Marp preview.
- **Removable when:** marp-vscode lifts its CSP for trusted workspace
  scripts. No indication this is planned.
- **Commits:** Split-panel feature commit.

### marp-cli timeouts under load (60-90s on small fixtures)

- **Symptom:** `npx --no-install marp ...` runs for >60s on a fixture
  with two slides and times out.
- **Cause:** marp-cli fetches Google Fonts on cold starts (the
  Playfair / Outfit / JetBrains-Mono imports we use). Slow network or
  DNS resolution makes this multiply. The lattice-emulator pre-emits
  the font links the same way but doesn't block on them at render time.
- **Mitigation:** Run with longer timeouts during testing
  (`timeout 90`). For deterministic CI, vendor the fonts and inline
  them.
- **Triggered by:** Cold marp-cli runs, slow networks.
- **Removable when:** We vendor the fonts.
- **Commits:** Observed in dev; not yet addressed.

### VS Code's built-in PDF preview hue-shifts our gradients (pink/magenta)

- **Symptom:** A chart-frame's accent-tinted gradient header (or any
  CSS gradient using `color-mix(in oklab, …)` and `transparent` stops)
  reads pink/magenta in VS Code's built-in PDF preview, in both light
  and dark mode. Same PDF in Chrome / Firefox / macOS Preview /
  Acrobat looks correct (blue-tinted).
- **Cause:** VS Code's built-in preview is PDF.js. PDFs don't carry
  CSS — Chromium resolves gradients at print time to PDF shading
  objects (Type 2/3 axial-radial, plus soft-mask groups when stops
  are transparent). PDF.js implements those operators in pure
  JavaScript with no native color management. Wide-gamut color spaces
  (oklab, p3) and alpha across shading boundaries hit known gaps —
  the bytes get sRGB-misread and produce hue shifts. We're not doing
  anything wrong; we're using standards-compliant CSS that produces
  a standards-compliant PDF a behind-the-spec viewer can't render.
- **Mitigation:** Don't review in VS Code's built-in preview. Open
  the PDF in Chrome, install the "vscode-pdf" extension (different
  renderer), or use the marp-vscode preview pane for visual checks
  (CLAUDE.md's documented inner loop). The chart-frame's lucent-strip
  gradient was retired for design reasons (treatments are opt-in via
  the universal `tint-*` / `mark-*` modifiers); that incidentally
  removed one source of the symptom, but other gradients in the
  codebase (`--spectrum`, `.below-note::before`, the `tint-*`
  treatments themselves) keep exercising the same PDF.js gap.
- **Triggered by:** Any CSS gradient that uses `color-mix(in oklab,
  …)` or `transparent` stops. Affects only PDF.js-based viewers.
- **Removable when:** PDF.js gains real color-management and improves
  shading + transparency rendering. Don't hold your breath.
- **Commits:** `39e3351` (chart-header refactor that incidentally
  removed one source).

---

## Browser engine (Chromium quirks observed in Marp Preview / Puppeteer)

### `:not(:has(...))` is unreliable inside Marp's webview Chromium

- **Symptom:** A selector like `p:not(:has(+ h2))` is silently ignored
  in Marp preview — the rule fires on cases the `:not()` was supposed
  to exclude. Marp-cli HTML in a current Chrome works fine.
- **Cause:** The Chromium build embedded in some Marp preview /
  Electron versions handles `:has()` inside `:not()` inconsistently —
  the function pair gets evaluated to `false` (or `true`) regardless
  of input. Same Chromium handles each function alone correctly.
- **Mitigation:** Drop `:not(:has(...))` guards. Restructure as an
  ordering / specificity decision: declare overrides AFTER bases so
  source order resolves the conflict, or use explicit comma-separated
  enumeration of the cases that should match.
- **Triggered by:** Any rule using `:not(:has(...))` in a theme that
  loads in Marp preview.
- **Removable when:** Verified across all Marp / Electron versions
  Lattice supports.
- **Commits:** `e0fe9b1d` (subtitle bleed fix).

### `:has()` nested inside `:is()` — silently dropped properties

- **Symptom:** A multi-property rule with selector
  `p:is(:has(+ h1), :has(+ h2)) > code` fires (the selector matches),
  but specific property declarations inside it are silently ignored
  — `background:none; padding:0; border-radius:0;` gets stripped.
  The element renders as if those declarations weren't authored.
- **Cause:** Same Chromium engine quirk. `:has()` nested inside
  `:is()` parses but partially fails during property application.
  Each `:has()` standalone works; only the nesting breaks things.
- **Mitigation:** Expand to an explicit comma-separated selector list
  with each `:has()` at the top level: `p:has(+ h1) > code, p:has(+ h2)
  > code, …`. Verbose but reliable.
- **Triggered by:** `:is(:has(...), :has(...))` in any theme rule
  that ships through Marp preview.
- **Removable when:** Same as above.
- **Commits:** `5a98bc66`.

### Marp / Chromium `foreignObject` creates anonymous grid items

- **Symptom:** A grid container inside a section places its children
  in unexpected rows. Inline `<code>` or text adjacent to a block
  child (like `<ul>`) wraps to the next row instead of staying on
  the title line.
- **Cause:** Marp wraps each slide in `<svg><foreignObject>`. Inside
  that foreignObject, Chromium creates separate **anonymous** grid
  items for each inline element when a block child is present in the
  same parent. Anonymous items are auto-placed and don't share rows
  with their siblings the way they would in a normal HTML context.
- **Mitigation:** Use **explicit** grid placement: pin the inline
  element with `grid-column: N; grid-row: N`. The block child then
  spans `grid-column: 1 / -1` for full width on the next row.
- **Triggered by:** Any layout that mixes inline + block children
  inside a grid container.
- **Removable when:** Chromium changes its anonymous-grid-item
  behavior in foreignObject (don't bet on it).
- **Commits:** `b8fecac2`.

### Sub-pixel rounding diverges across Chromium platforms

- **Symptom:** A layout with `calc()` expressions mixing units
  (`calc(50% - 4px)`, `calc(50vw - 1em)`) renders slightly differently
  on Chromium-on-Windows vs. Chromium-on-Linux/macOS. Sometimes a
  pseudo-element gets clipped; sometimes a hairline shifts by a pixel.
- **Cause:** Mixed-unit `calc()` values can resolve to fractional
  pixel coordinates. Different Chromium build targets round
  differently at the rasterization stage.
- **Mitigation:** Avoid mixed units in geometry-critical `calc()`.
  When pattern fills are involved, use a tile size that's a power of
  2 (or at least an integer that divides evenly into the slide
  dimensions) so the tile origin always lands on integer pixels. See
  the rhombic-cell pattern at `--lattice-pattern` (`80×80` SVG).
- **Triggered by:** Layouts with sub-pixel `calc()` results, especially
  those with background patterns or hairline rules.
- **Removable when:** Never reliably — keep sizes integer-friendly.
- **Commits:** `263269dc` (image layout simplification).

### MutationObserver fires on its own writes (self-triggering loop)

- **Symptom:** A debounced render runs twice per change instead of
  once. The second run's restoration loop overwrites the first run's
  in-flight render. SVGs flicker and sometimes vanish.
- **Cause:** `MutationObserver(callback).observe(body, { subtree: true,
  childList: true, characterData: true, attributes: true })` fires on
  ANY DOM change inside `body` — including the writes the callback
  itself makes. If the callback adds or replaces nodes, the observer
  re-fires.
- **Mitigation:** **Narrow the observer** to just the mutations you
  actually need. For mermaid bootstrap that means matching only code
  fence additions (`pre > code.language-mermaid`,
  `marp-pre > code.language-mermaid`) — childList only, not attributes
  or characterData. **Drop `characterData: true`** unless you genuinely
  need text-content updates; SVG text creation during Mermaid render
  fires it constantly.
- **Triggered by:** Any broadly-scoped MutationObserver.
- **Removable when:** Never — observer scope is always a tradeoff.
- **Commits:** `f347baf8`, `997a5726`.

---

## CSS

### `var(--fg)` is undefined — SVG `fill`/`stroke` silently falls back to black/none

- **Symptom:** An SVG element styled with `fill: var(--fg)` renders solid
  **black**; a `stroke` derived from a `--fg`-based token (e.g.
  `color-mix(in srgb, var(--fg) 15%, transparent)`) renders as if
  `stroke: none` — the shape, ring, or gridline disappears.
- **Cause:** `--fg` is **not defined anywhere in the repo** — not in
  `lattice.css`, not in any theme. It looks like a base ink token (and
  the journey CSS uses it heavily: `--journey-timeline`, `--journey-plumb`,
  `--journey-axis`, `--journey-task-fg`, `.journey-actor-name` colour),
  but nothing declares it. A `var(--fg)` with no fallback is a
  guaranteed-invalid substitution: `fill` then takes its *initial* value
  (`black`), and `stroke`, being inherited, takes the inherited value
  (effectively `none`). On an HTML element with dark body text the black
  fallback is often invisible-by-luck; on SVG it is not.
- **Mitigation:** Use the real ink-ramp tokens that themes actually
  define — `--text-heading`, `--text-body`, `--text-label`,
  `--text-muted`, `--border`, `--bg`. The radar chart was caught on this
  pre-merge and uses them ([lattice.css](../dist/lattice.css), the `RADAR`
  block). **The journey `--fg` references are still live and unaudited** —
  its low-opacity gridlines/plumb-lines likely render wrong.
- **Triggered by:** Any CSS — especially SVG `fill`/`stroke` — that
  references `var(--fg)`. Grep before copying colour code out of the
  journey block.
- **Removable when:** Either a theme defines `--fg`, or the journey CSS
  is migrated off it. Until then, treat `--fg` as a dead token.
- **Commits:** Radar feature commit; see
  [engineering/decisions/2026-05-15-radar-chart.md](decisions/2026-05-15-radar-chart.md).

### CSS custom properties return raw token stream via `getPropertyValue`

- **Symptom:** Reading `--bg` via `getComputedStyle(el).getPropertyValue('--bg')`
  returns `"light-dark(#FAF7F2, #15110D)"` instead of the resolved color.
- **Cause:** Per CSS spec, custom properties are inherited as their
  *tokenized text*, not their computed value. Resolution of any
  embedded function (`light-dark()`, `color-mix()`, `var()` chains)
  happens at the use site of the substitution, not at declaration time.
  `getPropertyValue('--name')` returns the declared value.
- **Mitigation:** When you need a resolved color out of JS, set a
  real color property (`element.style.color = 'var(--name)'`) and
  read `getComputedStyle(element).color`. The browser resolves
  everything for actual color properties. See `vc()` helper in
  [lattice-runtime.js:46-58](../dist/lattice-runtime.js#L46-L58).
- **Triggered by:** Any JS read of a custom property whose value
  contains a CSS function.
- **Removable when:** Never — this is by design.

### G-generation `--c-ink-dark: var(--text-heading)` breaks contrast in both canvas modes

- **Symptom:** Contrast test suite reports `--cN-dark / --c-ink-dark` AA
  failures in both light and dark mode for any theme whose G-generation
  block sets `--c-ink-dark: var(--text-heading)`.
- **Cause:** The contract is: `--c-ink-dark` must be *white-ish* on
  light canvas (for text on the dark `--cN-dark` fills) and *dark-ish*
  on dark canvas (for text on the pale `--cN-dark` flipped fills).
  `var(--text-heading)` resolves to dark ink on light canvas (dark-on-dark
  → fail) and, because the `parsePaletteVars` chain breaks at
  `--dark-text-heading` if that token isn't resolved yet, it falls back to
  the previously-set `#FFFFFF` — white-on-pale → also fail.
- **Fix:** Use an explicit `light-dark()` pair:
  `--c-ink-dark: light-dark(#FFFFFF, #0A1628)` (indaco),
  `--c-ink-dark: light-dark(#FFFFFF, #1E1A15)` (cuoio).
  The rule: light-canvas arm is WHITE; dark-canvas arm is the theme's
  primary dark ink.
- **Companion trap:** `--c-alarm` in the G-generation block must also
  be dark enough for white ink on light canvas (L ≤ 0.18) and bright
  enough for dark ink on dark canvas (L ≥ 0.25). The original indaco-G
  alarm `#D15A62` is too light (L≈0.22); use `#A91C2A` (L≈0.10).
- **Triggered by:** Merging a G-generation block into a base theme
  file when `--c-ink-dark` was left as `var(--text-heading)`.
- **Commits:** theme-cleanup commit.

### CSS `ul > li` matches nested sublists — chain `> ul > li` for top-level-only styling

- **Symptom:** A `border-left` (or any decoration) intended for top-level
  list items in a layout also appears on sub-items nested inside those
  items.
- **Cause:** `section.foo .container ul > li` uses a descendant combinator
  before `ul`. It matches any `ul > li` at any depth within `.container` —
  including `.container > ul > li > ul > li` (the nested items). The `> li`
  only constrains the item being a direct child of its own list; it says
  nothing about where that list sits in the tree.
- **Mitigation:** Chain the direct-child combinator from the container:
  `section.foo .container > ul > li`. This requires the `ul` to be a direct
  child of `.container` AND the `li` to be a direct child of that `ul`.
  Nested sublists live at `> ul > li > ul > li` and do not match.
- **Triggered by:** Any layout where top-level `li` items have nested
  `ul`/`ol` sublists and the container receives descendant-scoped styling.
  Hit on the `split-brief` right-panel border-left accent.
- **Removable when:** Never — this is correct CSS scoping; note it here to
  avoid the same mistake in future layouts.
- **Commits:** Split-panel feature commit.

### `:where(:root)` zero-specificity defaults

- **Symptom:** Theme defaults that should be overridable lose to
  user `style:` overrides only sometimes; appears specificity-related.
- **Cause:** Both `:root { color-scheme: … }` rules have specificity
  (0,0,1). Cascade order then decides — fragile.
- **Mitigation:** Wrap defaults in `:where(:root) { … }` to give them
  specificity (0,0,0), so any plain `:root` author override wins
  regardless of source order. Used in
  [themes/cuoio.css:64](../themes/cuoio.css#L64) and
  [themes/indaco.css:58](../themes/indaco.css#L58).
- **Triggered by:** Any author-overridable default.
- **Removable when:** Never — this is the correct CSS pattern.

### `font-size: 0` collapses `em` width/height on the same element

- **Symptom:** A state-token disc (or any size-from-em element) renders
  with zero dimensions and disappears entirely. Most visible in
  `obligation-matrix` cells where the `<span class="state …">` should
  be a 1.4em coloured circle but is invisible.
- **Cause:** `em` resolves against the element's own computed
  `font-size`. Setting `font-size: 0` (a common trick to hide a
  trailing inline label like `[x] Applies fully`) drops the computed
  font-size to `0`, so `1.4em` becomes `0px` — the disc is sized to
  nothing and renders empty.
- **Mitigation:** Hide the label via `overflow: hidden; text-indent:
  200%; white-space: nowrap` and keep `font-size` inherited. The disc
  stays sized from the cell's font-size; any trailing label is pushed
  out of the box and clipped. Used in
  [lattice.css](../dist/lattice.css) (`section.obligation-matrix td
  .state`). See the UNIVERSAL STATE TOKEN block.
- **Triggered by:** Combining `font-size: 0` (label-hiding) with `em`
  width/height on the same element.
- **Removable when:** Never — `em` is the right unit for state tokens
  (scales with the layout's body font); `font-size: 0` is the wrong
  tool to hide inline text.

### KaTeX math extractor splices error spans into inlined Mermaid SVG CSS

- **Symptom:** Mermaid diagrams in the produced PDF render as raw
  stylesheet text — `.actorPopupMenu{position:absolute;}` etc. printed
  inline in the slide body instead of the rendered diagram. Most
  visible on sequence / class / state diagrams; flowcharts may
  partially render. The `<svg>` and `<style>` tags are present in the
  HTML but contain `<span class="katex-error" title="…">` injected
  inside CSS selectors, which makes the `<style>` block invalid and
  Chromium's PDF renderer treats the content as text. Unit tests pass;
  page counts unchanged.
- **Cause:** The build pipeline runs `preprocessMermaid(md)` BEFORE
  `extractMath(raw)` — Mermaid SVG is inlined into the markdown as
  `<div class="mermaid-svg"><svg>…<style>…</style></svg></div>`. Then
  `extractMath` walks the source looking for `$…$` math delimiters
  and skips fenced code blocks — but does NOT skip the inlined SVG.
  Mermaid stylesheets contain CSS attribute selectors like
  `[id$="-sequencenumber"]{…}` whose `$` characters match as math
  delimiters; KaTeX is asked to render the captured content (which is
  CSS, not LaTeX), throws errors, and emits
  `<span class="katex-error">…</span>` back into the SVG's `<style>`
  block.
- **Mitigation:** Add `<div class="mermaid-svg">…</div>` to the skip
  pattern in `extractMath` so math extraction does not reach inside
  inlined SVG. See
  [lattice-emulator.js extractMath](../lattice-emulator.js).
- **Triggered by:** Any deck containing both a `$…$` candidate AND a
  Mermaid diagram with a CSS attribute selector using `$`. Latent
  since main's KaTeX-for-math feature landed; only surfaces visually
  (page-count regression test does not catch it).
- **Removable when:** Never — `$` is a meaningful CSS operator (ends-
  with attribute match) and a meaningful KaTeX delimiter; extractor
  must treat HTML blocks injected before math extraction as opaque.

---

## Lattice internals

### Editing a manifest `sample` staled the bucket survey gallery

- **Symptom:** `npm run test:integration` fails in `bucket-galleries`
  with `<bucket> gallery .md drifted from manifests — re-run npm run
  build:bucket-galleries`, even though the component's OWN gallery is
  fresh and `npm run build` / `build:check` reported nothing stale.
- **Cause:** A component's `manifest.sample` feeds two generated decks:
  its per-component `<name>.gallery.md` (regenerated by `npm run build`
  via `docs:components`) AND the per-bucket survey `<bucket>.gallery.md`,
  which embeds one `sample` per member. The survey is regenerated only
  by `tools/build-bucket-galleries.js` and is deliberately NOT part of
  `npm run build` — re-rendering the 18 bucket PDFs is slow, so it lives
  in CI. Editing a `sample` refreshes the per-component gallery but
  leaves the survey stale until CI notices.
- **Mitigation:** `npm run build:bucket-galleries --only <bucket>`
  regenerates the survey `.md` + its light/dark PDFs; commit the result.
  See development.md → Cross-cutting rules → "Editing a component
  manifest." (`galleryAuthored` buckets/components — `legal`, `diagram` —
  are skipped by both generators and gated only by light/dark page-count
  parity, so they don't hit this.)
- **Triggered by:** Changing any manifest field the survey reads (today
  just `sample`) without rebuilding the bucket galleries.
- **Commits:** `29c3022` (regen chart survey after the word-cloud
  `sample` 1–5 normalization).

### Legacy `--fs-*` token names retired

- **Symptom:** Component CSS or theme using `var(--fs-md)`,
  `var(--fs-2xl)`, `var(--fs-3xl)`, `var(--fs-display)`,
  `var(--fs-stat)`, `var(--fs-watermark)`, `var(--fs-quote)`,
  `var(--fs-label)`, `var(--fs-xs)`, `var(--fs-sm)`,
  `var(--fs-lg)`, `var(--fs-xl)`, or `var(--fs-content)` resolves
  to `0` (or inherited size) because the variable is undeclared.
- **Cause:** The typography token system was rewritten on
  `claude/typography-redact-proposal-V4Ocx` (May 2026). The
  legacy 16-token t-shirt-named scale was retired in favour of
  11 role-named tokens: `--fs-meta`, `--fs-body-compact`,
  `--fs-body`, `--fs-emphasis`, `--fs-h1` … `--fs-h6`, `--fs-hero`.
- **Mitigation:** Replace per the migration map in
  `engineering/decisions/2026-05-19-typography-token-refactor.md` §6 and the
  one-line summary in `CLAUDE.md`. Slide-level prose →
  `--fs-body`; card-style / table / dense-list inner prose →
  `--fs-body-compact`; chrome and labels → `--fs-meta`. HTML
  headings auto-resolve via `base.elements.css` so authors don't
  pick the heading size.
- **Triggered by:** Reading any code older than the refactor that
  still uses the legacy names, or grabbing a snippet from
  archived notes / old PRs.
- **Commits:** Phase 1–4 of the refactor land in the branch
  above; the final cleanup commit removed the alias declarations.

### Three render paths, three transform implementations

- **Symptom:** A new authoring transform (e.g., chart-family layouts,
  slot-label lift) appears to work in the build pipeline but is
  missing in marp-cli output, or vice versa.
- **Cause:** Lattice runs in three render contexts:
  1. **lattice-emulator** (build path) — own inline implementation
  2. **marp.config.js engine wrapper** → `lib/components/chart/_chart-family/chart-family.js` (marp-cli export)
  3. **lattice-runtime.js** (marp-vscode preview, web export)
  Adding a transform requires touching all three for full coverage.
- **Mitigation:** Each transform documents its sibling implementations
  in a header comment (see `liftSlotLabel`, `chartFamily`,
  `splitPanelCounter` for the pattern). The integration test tier
  asserts cross-renderer parity on slide count.
- **Triggered by:** Adding any new authoring-time transform.
- **Removable when:** The three paths converge on a single engine.
  Tracked separately.
- **Commits:** Pattern established by original `splitPanelCounter`.

### Chart-family observer's broad `MutationObserver` scope

- **Symptom:** None observed yet, but worth knowing.
- **Cause:** [lattice-runtime.js:1005-1011](../dist/lattice-runtime.js#L1005-L1011)
  observes `document.body` with `subtree: true, childList: true,
  attributes: true, characterData: true`. Every attribute mutation
  in the DOM fires it. Idempotent (re-applies are no-ops on already-
  transformed sections), but causes a `querySelectorAll` per
  mutation. Layout reads can interleave with mermaid's render writes
  in pathological cases.
- **Mitigation:** Apply is idempotent. Cost is a single querySelectorAll
  per mutation, which is fast.
- **Triggered by:** Any DOM mutation while the runtime is loaded.
- **Removable when:** We narrow the observer to chart-family-relevant
  mutations (e.g., `attributeFilter: ['class']`).
- **Commits:** `225cea0`.

### Marp silently truncates content past the 1280×720 frame

- **Symptom:** Authors lose hours debugging clipped content because
  Marp prints / exports cleanly but visually missing the bottom of a
  slide. Nothing in the build output flags it.
- **Cause:** Marp renders each slide into a fixed-size SVG viewport.
  Anything past the bottom of the viewport gets clipped at the
  rasterization step with no warning.
- **Mitigation:** [lattice.css](../dist/lattice.css) defines
  `section.overflow` as a 4px inset red ring (via `box-shadow`, no
  layout shift). [lattice-runtime.js](../dist/lattice-runtime.js)
  `startOverflowWatcher()` tags the class on every section whose
  scrollHeight/Width exceeds clientHeight/Width by more than 12px
  (the tolerance filters sub-pixel rounding noise from nested flex/
  grid). The lattice-emulator does the same check in the rendered
  HTML AND via `page.evaluate()` before `page.pdf()`, so the ring
  is burned into the printed deck.
- **Triggered by:** Any slide with content past the 720px height (or
  whatever your `@size` is set to).
- **Removable when:** Marp adds native overflow detection.
- **Commits:** `0da73e59`.

### Stray colors escape the palette via Mermaid's hardcoded defaults

- **Symptom:** Periodic visual audit finds X11 named colors, Tableau-10
  palette values, or Mermaid built-in defaults appearing in rendered
  diagrams despite the palette setting `themeVariables` correctly.
- **Cause:** Different Mermaid diagram types ignore different theme
  variables. Some hardcode X11 names directly (journey actor faces:
  `cornsilk`, `darkseagreen`, `lawngreen`, `cyan`); some emit
  Tableau-10 categorical fills (sankey nodes, link gradients); some
  apply internal lightening or darkening to themeVariable inputs
  (kanban cScale lighten step). The themeVariables API is partial.
- **Mitigation:** Per-diagram-type CSS overrides in
  [lattice.css](../dist/lattice.css)'s "DIAGRAM OVERRIDES" section (at
  the bottom of the file). Palette-blind — every rule consumes
  `var(--diagram-*)`, so new palettes inherit coverage by defining the
  token contract. Coverage is audited periodically — the most recent
  audit (commit `c57366bf`) identified 35 stray colors across 5 decks
  / 37 diagrams and added overrides for journey, c4, mindmap, timeline,
  sankey, packet, architecture, and ER alternation. The 2026-05-12
  refactor moved these rules out of each palette's post-sentinel
  section into the layout engine to make new-palette authoring purely
  token-declaration.
- **Triggered by:** Any new Mermaid diagram type, any Mermaid version
  bump that adds new internal styling.
- **Removable when:** Mermaid's themeVariables surface becomes
  comprehensive (every visible color is configurable).
- **Commits:** `c57366bf` (audit + 8-diagram override sweep);
  ongoing.

### `liftSlotLabel` idempotency contract

- **Symptom:** Re-running the slot-label transform on already-lifted
  list items would produce nested `<strong>` tags.
- **Cause:** The transform wraps the leading inline content of each
  top-level `<li>` in `<strong>`. Without idempotency, every
  MutationObserver fire would re-wrap.
- **Mitigation:** Each implementation (`liftSlotLabel` in
  `lib/slot-label-lift.js`, the Marpit plugin in `marp.config.js`,
  the runtime function in `lattice-runtime.js`) checks whether the
  first element child is already `<strong>` and bails. Idempotency
  is *required* — runtime fires on every preview re-render.
- **Triggered by:** Every Marp preview re-render (one per keystroke).
- **Removable when:** Never — idempotency is a permanent invariant.
- **Commits:** Original slot-label-lift commit.

### `image museum` slides inherit the anchor `border-left` via cascade

- **Symptom:** A slide with `<!-- _class: image museum -->` shows a
  6px left border and a squished text panel — as if the museum modifier
  is not applied. Mirror variant affected in the same way.
- **Cause:** The base rule `section.image:not(.full)` carried
  `border-left: 6px solid var(--accent)` and `padding-left:
  calc(var(--sp-2xl) + 6px)`. The museum override at higher specificity
  cleared the border with `border-left: none`, but the `padding-left`
  adjustment (the extra 6px) still leaked through in practice, and any
  future reordering of rules could let the border re-emerge. The emulator
  path also had a missing `!important` on the museum frame box-shadow,
  so the base hairline shadow (`!important` at lower specificity) won.
- **Mitigation:** Anchor decoration moved into a guarded rule
  `section.image:not(.full):not(.museum)` — museum slides structurally
  never receive the border or its padding offset. Museum rules no longer
  need explicit `border: none` resets. Museum emulator box-shadow
  promoted to `!important` ([lattice.css](../dist/lattice.css), image
  half-canvas block).
- **Triggered by:** Any `image museum` or `image museum mirror` slide.
- **Removable when:** Never — the guard is cheap and the alternative
  (cascade-order dependence) is fragile.
- **Commits:** `d3ffaca`

### Section geometry (padding, border) looks wrong in VS Code preview at any size

- **Symptom:** In VS Code preview, slide padding on all four sides and
  the top accent border are narrower than expected — content appears to
  bleed toward the edges. Divider slides have a noticeably tight
  left-indent. The effect is more visible on 4K slides (where the
  absolute delta is larger) but applies to HD slides too whenever the
  editor viewport width differs from 1280 px.
- **Cause:** `section { container-type:size }` makes the section element
  its own cqi container. CSS spec forbids an element from using cqi to
  query its own size (circular dependency), so any `Xcqi` value *on
  section itself* (padding, border-width) falls back to the **ICB**
  (Initial Containing Block) instead. In VS Code screen mode the ICB is
  the editor viewport (arbitrary width), not the slide. Elements *inside*
  section query section correctly — the self-reference issue only affects
  properties on the container element itself. In PDF/print mode the ICB
  is set by `@page { size: WIDTHpx HEIGHTpx }` so the fallback resolves
  correctly; the emulator sets `page.setViewport({ width: slideW, height:
  slideH })` for the same reason.
- **Fix:** `lattice.css` expresses every direct-cqi property on `section`
  as `calc(var(--_sec-1cqi, 1cqi) * X)` where `X` is the original cqi
  coefficient (e.g. `padding: calc(var(--_sec-1cqi,1cqi)*6.875)
  calc(var(--_sec-1cqi,1cqi)*5)`). The `1cqi` fallback fires only in the
  emulator/print path where the ICB is already correct. In VS Code,
  `patchSectionGeometry()` in `lattice-runtime.js` sets
  `--_sec-1cqi = section.offsetWidth / 100` as a concrete `px` value
  (e.g. `38.400px` for a 3840 px 4K slide) so every `calc()` resolves
  against the real slide width. Any new direct-cqi property added to
  `section` or `section.*` in the future must follow the same pattern —
  write `calc(var(--_sec-1cqi,1cqi)*X)`, not a bare `Xcqi`.
- **Triggered by:** Any slide opened in marp-vscode preview. The PDF and
  emulator paths are unaffected because their ICB matches the slide size.
- **Commits:** `334434f` (initial fix, top/bottom only); `fe6f894`
  (extend to padding-left/right); `41ef9e1` (extend to divider
  padding-left); `1bf458c` (unify all under `--_sec-1cqi`).

### Layout components inherit line-height silently from the section body default

- **Symptom:** Text in a layout (cards, stats, timeline, quote, code subtitle,
  etc.) looks optically tight or loose even though no explicit line-height is
  set. The issue is proportionally the same at every resolution because `cqi`
  scaling preserves the relative value.
- **Cause:** `section` sets `font-size: var(--fs-body); line-height: var(--lh-base)`
  as a body default. Any component that sets a custom `font-size` but omits
  `line-height` silently inherits `--lh-base (1.6)`, which is the right value
  for paragraph body text but wrong for heading-weight card titles (`--lh-snug`),
  small captions (`--lh-snug`), or wrapping descriptive text (`--lh-relaxed`).
  Because `cqi` scales everything proportionally, the wrong ratio looks equally
  wrong at HD, 4K, and standard — it's a semantic mismatch, not a size mismatch.
- **Mitigation:** Every element that sets an explicit `font-size` must also set
  an explicit `line-height`. The pairing rule: heading-weight text → `--lh-snug`;
  small labels/captions → `--lh-snug`; wrapping prose/cards → `--lh-relaxed`.
  `--lh-base` is only for unstyled paragraph inheritance. Eight sites were fixed
  in one pass (diagram > p, stats > p/em, cards-grid/side li and .card, quote > p,
  timeline li, list-steps li, code > em).
- **Triggered by:** Adding a new layout component with a custom `font-size`
  and no `line-height`.
- **Removable when:** Never — this is an authoring discipline rule.
- **Commits:** `828f6fb` (bulk fix); `9327c78` (cards-stack, the original
  discovery).

### Emulator line-by-line builder only supports 2-deep list nesting by default

- **Symptom:** In `kanban` slides (or any layout that parses 3-level nested lists),
  sub-sub-bullets (4-space indent, `- item`) appear as siblings of their parent
  bullet rather than nested children. In kanban this means label text like `compliance`
  becomes a separate card box instead of the meta row inside its parent card.
- **Cause:** `lattice-emulator.js` builds HTML from raw markdown line-by-line
  (`raw.split('\n')`). The original loop tracked only `inList` (level 1) and
  `inSubList` (level 2). The 4-space sub-sub-item matched the same `/^ {2,}- /`
  regex as 2-space items, so it was treated as another level-2 sibling.
- **Fix:** Added `inSubSubList` (level 3) and a `/^ {4,}- /` check that runs
  **before** the `/^ {2,}- /` check in the `else if` chain. The level-2 handler
  was also changed to defer its `</li>` close (checking whether the next line is
  a level-3 item), mirroring the same lookahead the level-1 handler already used.
  All blank-line, paragraph-break, and end-of-content close-out paths updated.
- **Affects:** `lattice-emulator.js` only. Marp-rendered HTML (marp-cli and
  marp-vscode) nests correctly from CommonMark; `lattice-runtime.js` uses the
  DOM so nesting is also correct there.
- **Triggered by:** Any layout that requires 3-level list nesting in the emulator.
  Currently only `kanban` (column → card → meta/body).
- **Commits:** `277a2c3` (feat(kanban): structured authoring convention and card layout redesign)

### Mermaid diagrams render at HD size inside 4K slides in VS Code preview

- **Symptom:** Mermaid diagrams on 4K slides look small in VS Code
  preview — they appear to be sized for 1280px rather than 3840px.
- **Cause:** The non-slide-host fallback rule
  `:is(pre, marp-pre)[data-mermaid-state="rendered"] + .mermaid { width:1152px; height:480px }`
  and the slide-context rule `section.diagram > .mermaid { width:calc(100cqi - 2*sp-2xl) }`
  had **identical specificity** (0,2,1). Because the non-slide rule
  appeared later in the file, it won the cascade and clamped the
  container to 1152px regardless of slide size. At HD (where
  calc(100cqi - …) = 1152px) this was invisible; at 4K the container
  was stuck at 1152px instead of 3456px, making diagrams occupy ~30%
  of the slide width and appear small.
- **Fix:** Wrapped the non-slide fallback in `:where()` to collapse its
  specificity to 0. Added `height:auto` to the slide-context rule so
  the flex-1 distribution, not the fixed 480px, governs the container
  height. The slide-context rule at (0,2,1) now always wins.
- **Triggered by:** Any `size: 4K` (or 4:3) slide with a Mermaid
  diagram in marp-vscode preview. HD unaffected because both values
  agreed at 1152px.
- **Commits:** `d91decc` (px→cqi refactor); fixed in the commit that
  wraps the non-slide fallback in :where().

## G-gen merge must use non-G file's G-gen block, not the G-file's block

- **Symptom:** After promoting G-files to canonical (merging cuoio-G.css
  into cuoio.css etc.), contrast tests for cuoio fail with `--cN-dark`
  resolving to pale fills against `--c-ink-dark` white (1.38:1 instead
  of ≥4.5:1). Alarm colours also shift from deep crimson to medium red.
- **Cause:** cuoio.css and indaco.css already contained a correct,
  tested G-gen `:root` block (the `/* ── G-generation: categorical … */`
  section). The G-files (cuoio-G.css, indaco-G.css) had a *different*
  version of the same block — `--cN-dark` identical to `--cN-light`
  (both `light-dark(pale, deep)`) instead of the inverse
  `light-dark(deep, pale)`. A merge script that takes the G-file's
  block as authoritative overwrites the correct values.
- **Mitigation:** When merging G-files into their base counterparts, for
  themes that already have a G-gen block (cuoio, indaco), preserve the
  non-G file's G-gen block verbatim. Only import the G-file's block for
  themes that had no G-gen content in their non-G base (ardesia,
  atelier, brina, …).
- **Removable when:** The G-files are permanently deleted and no
  automated merge is needed again.
- **Commits:** Fixed alongside the G-gen promotion commit in the
  `refactor(themes)` session on 2026-05-15.
