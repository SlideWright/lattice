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
spin out a `docs/notes/YYYY-MM-DD-topic.md` and link to it from here.

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
  reset at [lattice.css:114-120](../../lattice.css#L114-L120).
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
- **Mitigation:** Two parts in [lattice.css](../../lattice.css):
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
  [marp.config.js:1-50](../../marp.config.js#L1-L50) reads the
  front-matter `class:` line directly from source and *appends* its
  tokens to every section. The lattice-emulator front-matter parser
  mirrors this in [lattice-emulator.js](../../lattice-emulator.js).
  This intentionally diverges from Marpit's spec.
- **Triggered by:** Any `class: <value>` in deck front matter.
- **Removable when:** Never — Marpit's spec won't change. Could be
  retired if all decks moved to `theme: <name>-dark` or `style:` for
  whole-deck modifiers, but the directive is a real convenience.
- **Commits:** `f9068a7` (plugin), `b502bcc` (emulator parsing).

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
  `:where(:root) { … }` in [themes/cuoio.css:64](../../themes/cuoio.css#L64)
  and [themes/indaco.css:58](../../themes/indaco.css#L58). `:where()`
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
  [lattice-emulator.js:773-792](../../lattice-emulator.js#L773-L792)
  now parses both inline (`style: "..."`) and YAML block scalar
  (`style: |`) forms and injects the content into the `<style>` block
  after the theme CSS so author overrides win.
- **Triggered by:** Any `style:` directive in front matter when
  rendering through `lattice-emulator.js`.
- **Removable when:** The emulator switches to a real Marpit/Marp
  engine. Tracked separately.
- **Commits:** `6276665`.

---

## Mermaid

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
- **Mitigation:** The cat-* tokens in [themes/indaco.css:286-294](../../themes/indaco.css#L286-L294)
  are pinned at L≈60 specifically so kanban's lighten step lands at
  L≈70 (where dark text reads cleanly). Mindmap and other diagrams
  that read cScale directly get a CSS override in the per-diagram
  Mermaid CSS section to use the pale-band tints instead. See
  [docs/references/mermaid.md](./mermaid.md).
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
  `docs/notes/2026-05-12-diagram-elevation.md`.

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
- **See:** `docs/notes/2026-05-12-diagram-tokens.md`.

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
- **Mitigation:** [lattice-runtime.js](../../lattice-runtime.js) wraps
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
- **Mitigation:** [lattice-runtime.js](../../lattice-runtime.js) sets
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
  [lattice-runtime.js:31](../../lattice-runtime.js#L31) reads from
  `document.querySelector('section') ?? document.documentElement`. A
  sentinel-color guard before `mermaid.initialize()` retries until
  the stylesheet has applied (the first tick can fire before
  paint).
- **Triggered by:** Any deck through Marp preview where the JS reads
  theme tokens.
- **Removable when:** Marpit hoists theme variables to `:root`.
- **Commits:** `f7f6558c`, `7079e65c`.

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
- **Mitigation:** [lattice-emulator.js:683-707](../../lattice-emulator.js#L683-L707)
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
  [lattice-runtime.js](../../lattice-runtime.js) (loaded into the
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
  [docs/notes/2026-04-30-mermaid-theming.md](../notes/2026-04-30-mermaid-theming.md)
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
  are implemented as HTML-string rewrites in `lib/split-panels.js` and
  `lib/chart-family.js`, called from the `engine` render wrapper in
  [marp.config.js](../../marp.config.js). The wrapper runs at render time
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
  pre-merge and uses them ([lattice.css](../../lattice.css), the `RADAR`
  block). **The journey `--fg` references are still live and unaudited** —
  its low-opacity gridlines/plumb-lines likely render wrong.
- **Triggered by:** Any CSS — especially SVG `fill`/`stroke` — that
  references `var(--fg)`. Grep before copying colour code out of the
  journey block.
- **Removable when:** Either a theme defines `--fg`, or the journey CSS
  is migrated off it. Until then, treat `--fg` as a dead token.
- **Commits:** Radar feature commit; see
  [docs/notes/2026-05-15-radar-chart.md](../notes/2026-05-15-radar-chart.md).

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
  [lattice-runtime.js:46-58](../../lattice-runtime.js#L46-L58).
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
  [themes/cuoio.css:64](../../themes/cuoio.css#L64) and
  [themes/indaco.css:58](../../themes/indaco.css#L58).
- **Triggered by:** Any author-overridable default.
- **Removable when:** Never — this is the correct CSS pattern.

---

## Lattice internals

### Three render paths, three transform implementations

- **Symptom:** A new authoring transform (e.g., chart-family layouts,
  slot-label lift) appears to work in the build pipeline but is
  missing in marp-cli output, or vice versa.
- **Cause:** Lattice runs in three render contexts:
  1. **lattice-emulator** (build path) — own inline implementation
  2. **marp.config.js engine wrapper** → `lib/chart-family.js` (marp-cli export)
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
- **Cause:** [lattice-runtime.js:1005-1011](../../lattice-runtime.js#L1005-L1011)
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
- **Mitigation:** [lattice.css](../../lattice.css) defines
  `section.overflow` as a 4px inset red ring (via `box-shadow`, no
  layout shift). [lattice-runtime.js](../../lattice-runtime.js)
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
  [lattice.css](../../lattice.css)'s "DIAGRAM OVERRIDES" section (at
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
  promoted to `!important` ([lattice.css](../../lattice.css), image
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
- **Cause:** `section` sets `font-size: var(--fs-md); line-height: var(--lh-base)`
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
