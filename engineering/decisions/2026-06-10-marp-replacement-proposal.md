# Replacing Marp — full proposal

**Status:** proposal / open. Supersedes and expands the "Own the engine —
bootstrap with Marp" section of
[`2026-05-10-tauri-exploration.md`](2026-05-10-tauri-exploration.md), which
first committed to owning the engine but framed it around the Tauri desktop
WebView. This note is repo-scoped: it audits exactly what Marp does for
Lattice *today*, what an owned engine has to absorb, and a sequenced plan to
get there without regressing the gallery baselines, the VS Code loop, or the
docs site.

> **P1 status (2026-06-10): landed (experimental).** `lib/engine/` ships the
> markdown-it-based core behind the `@slidewright/lattice/engine` export. It
> reproduces Marpit's slide/directive token contract, runs the existing plugins
> + transformer registry unchanged, and matches marp-core's per-section HTML
> across **55/55** gallery decks (twemoji intentionally dropped). Decisions
> locked: **Scope 1** (keep marp-vscode as the external VS Code preview host);
> engine home **`lib/engine/` + `/engine` export**; **drop twemoji +
> auto-scaling** (both unused). Verified by `test/unit/engine/engine.test.js`
> (contract + in-process differential parity vs marp-core). Not yet done: the
> emitted scaffold/theme `css` (P1.1), Marpit advanced-background split
> containers for the PDF path, and the P2–P5 path migrations. The sections
> below are the original proposal, kept as the rationale of record.

**Recommendation in one line:** build `lattice-engine` on `markdown-it`
directly — keep the markdown-it/GFM core Marp already wraps, drop the
Marpit/marp-core *slide layer* (splitting, directives, theme registration,
section emission) and reimplement that thin layer ourselves. The emulator
already proves the layer is small; it's currently built on a hand-rolled
regex parser that is the real source of fragility, so the engine work is as
much *consolidation* as it is *replacement*.

---

## 1. TL;DR

- Marp is **one runtime dependency**: `@marp-team/marp-cli@^4.3.1`
  (`package.json`), which bundles `@marp-team/marp-core` → `@marp-team/marpit`
  → `markdown-it`. The docs playground additionally imports
  `@marp-team/marp-core` directly (`lib/playground/index.js:25`).
- Of the **four** places Lattice turns markdown into slides, **two are
  already Marp-free** (the `lattice-emulator.js` CLI — our shipped `bin`/`main`
  — and `dist/lattice-runtime.js`), and **two still ride Marp** (the
  `marp-cli` build/test/CI path via `marp.config.js`, and the browser
  playground that powers the entire docs site).
- Everything that gives Lattice its *identity* — the markdown-it plugins
  (`lib/integrations/marp/plugins.js`), the shared transformer registry
  (`lib/transformers/`), `lattice.css`, the 25 palettes — is **already ours**.
  Marp/Marpit contributes a comparatively thin layer: GFM markdown parsing,
  `---` slide splitting, front-matter/comment directive parsing, `@theme` /
  `@size` registration, `<section>` emission with pagination/header/footer
  chrome, the `![bg]` background-image grammar, KaTeX wiring, and a handful of
  marp-core extras (twemoji, auto-scaling, the `<marp-pre>` custom element).
- The emulator already reimplements **all of that thin layer** well enough to
  pass the 89-page baseline at page-count parity with marp-cli — but on a
  **bespoke regex markdown parser** (`parseInline` / `parseSlide` in
  `lattice-emulator.js`), not markdown-it. That parser is the gap the owner of
  this branch correctly flagged: it covers what the galleries use, not GFM.
- **Hardest surface is not the CLI — it's VS Code.** The marp-vscode extension
  *is* Marp Core; our live-preview inner loop depends on it. Replacing Marp on
  the engine side does **not** remove that dependency, and nothing in-repo can
  re-host the VS Code preview pane. This needs an explicit decision (§6).
- The website is tractable: it has exactly one coupling point —
  `window.LatticePlayground.render()` — which today wraps `marp.render()`. Swap
  the bundle's core and every docs surface follows (§7).

---

## 2. What Marp does for us today — the surface to replace

### 2.1 The dependency surface

| Where | Marp dependency | Kind |
|---|---|---|
| `package.json` | `@marp-team/marp-cli@^4.3.1` | only declared Marp runtime dep; bundles marp-core + marpit + markdown-it |
| `marp.config.js` | configures marp-cli; `import('@marp-team/marp-cli')` is a **JSDoc type only** (no runtime import) | build/test/CI render path (#2) |
| `lib/playground/index.js:25` | `import { Marp } from '@marp-team/marp-core'` | browser playground / docs site |
| `lattice-emulator.js` | **none** (requires `marp.config` only for the HTML-stage `applyDeckLogoToHtml` plugin) | shipped CLI (#1) |
| `lib/runtime/index.js` | **none** (post-processes the DOM marp-vscode/marp-core already produced) | VS Code + web runtime (#3) |
| marp-vscode extension | *is* Marp Core; not a package dep, an editor extension | live preview pane |

### 2.2 What Marp / Marpit actually provides

Decomposed into what we'd have to own:

1. **Markdown → HTML (GFM).** Marpit composes `markdown-it`
   (CommonMark + GFM tables, the full inline/block grammar, escapes, entities,
   reference links, loose/tight lists, HTML blocks). This is the part the
   emulator's regex parser only partially covers.
2. **Slide splitting.** `---` (and front-matter fencing) → one `<section
   data-marpit-slide="N">` per slide. Our plugins hook
   `markdown.core.ruler.after('marpit_slide_containers', …)` — i.e. they
   depend on Marpit's token-stream slide boundaries.
3. **Directive parsing.** Global vs spot directives: `theme:`, `paginate:`,
   `header:`, `footer:`, `size:`, `class:` / `_class:`, `style:`, plus the
   comment form `<!-- _class: … -->` / `<!-- _backgroundColor: … -->`.
   Survey of the decks shows a *small, fixed* directive set actually in use:
   `theme` / `paginate` / `marp` / `header` / `size` / `footer`, plus our
   custom `logo:`.
4. **Theme registration.** Marpit reads `@theme <name>` and `@size <name> W H`
   from the CSS (`lib/_theme.css` declares `@theme lattice` + the hd/HD/4K/
   standard sizes; each palette re-declares its own). `themeSet` in
   `marp.config.js` registers all 25 palettes.
5. **Section chrome.** Pagination (`section::after`), header/footer paragraph
   emission, `data-marpit-*` attributes. `marp.scaffold.css` is the *only*
   `!important` file in the engine, written specifically to win the cascade
   fight against marp-core's scaffold defaults (see `marp.docs.md`).
6. **Background-image grammar.** `![bg]`, `![bg right]`, `![bg left]`,
   `![bg fit]` — Marpit's image directives, used across `gallery.md` and
   `gallery-jargon.md` for the `image` component. (The emulator already
   reimplements this — `lattice-emulator.js` "Marp background image syntax".)
7. **Math.** `math: 'katex'` — KaTeX, chosen over MathJax for synchronous
   render under headless-Chromium PDF. The emulator already calls
   `katex.renderToString()` itself for parity.
8. **marp-core extras we currently inherit (and would have to decide on):**
   - **twemoji** — marp-core rewrites unicode emoji to `<img class="emoji">`;
     `lattice.css` carries `:not(.emoji)` carve-outs because of it
     (`gotchas.md` "Marp Core wraps emoji").
   - **auto-scaling** custom elements (`<marp-auto-scaling>` fit headers).
   - **`<marp-pre>` vs `<pre is="marp-pre">`** — marp-vscode and marp-cli
     disagree on the fence wrapper element; lattice.css uses
     `:is(pre, marp-pre)` to cover both (`gotchas.md`).
   - **HTML allowlist** (`html: true`) — Lattice uses raw HTML sparingly for
     slot-label lifts.

### 2.3 What is already ours (carries over unchanged)

- **`lib/integrations/marp/plugins.js`** — every Lattice-specific transform
  (deck-class propagation, `logo:`, verdict-grid / obligation-matrix /
  checklist state badges, slot-label lift, glossary table + range,
  heading-period adjustment, latticeplot fences, Mermaid hljs registration).
  These are markdown-it token manipulators with no Node-only deps — they bind
  to markdown-it's token model, **not** to marp-core specifically, so they
  survive a swap to a markdown-it-based engine almost verbatim.
- **`lib/transformers/registry.js`** — the HTML/DOM-stage registry (chart-
  family, split-panels, roadmap, journey, word-cloud) already abstracted
  across all three paths via `applyAllToHtml` / `applyAllToSection` /
  `applyAllToDom`.
- **`lattice.css` + `themes/*.css`** — the entire visual contract. Unchanged
  by definition: the engine's job is to emit the same `<section>` HTML the
  CSS already targets.

**Implication:** the replacement is narrower than "rebuild Marp." It is
"own the ~thin slide layer (§2.2 items 1–6) and keep everything in §2.3."

---

## 3. The render paths and their Marp coupling

| # | Path | Entry | Markdown engine | Marp-coupled? |
|---|---|---|---|---|
| 1 | Shipped CLI (`bin`/`main`) | `lattice-emulator.js` → `dist/lattice-emulator.js` | **hand-rolled regex** (`parseInline`/`parseSlide`) | **No** — independent reimplementation |
| 2 | Build / test / CI | `marp.config.js` via `npx marp` (`test/helpers/render.js`) | marp-core (markdown-it) | **Yes** — load-bearing |
| 3 | Web + VS Code runtime | `lib/runtime/index.js` → `dist/lattice-runtime.js` | none — **DOM post-processor** | **No** itself, but in VS Code it post-processes marp-vscode's output |
| 4 | Docs playground | `lib/playground/index.js` → `docs/public/playground/lattice-playground.js` | marp-core (markdown-it), bundled client-side | **Yes** — powers every live preview on the site |

The **cross-renderer parity gate** (`test/integration/parity/parity.test.js`)
asserts paths #1 and #2 agree on `gallery.md` page count (±1 for Chromium's
trailing blank). **It does not invoke marp-vscode** — no test does
(`grep marp-vscode test/` → none). Path #3/#4 parity is *by construction*:
they share `lib/transformers/` and (for #4) `lib/integrations/marp/plugins.js`.

So today's reality: **path #2 is the authoritative reference** the emulator is
checked *against*. The replacement's core structural move is to **invert that**
— make an owned engine the reference, and either retire path #2 or keep
marp-cli around only as a temporary differential oracle.

---

## 4. The emulator: how far it already gets us, and the gaps

The emulator is the strongest evidence the slide layer is small — it renders
the full 89-page baseline at page-count parity with marp-cli, handles `![bg]`
backgrounds, the directive set in use, KaTeX, Mermaid (via `mmdc`), and runs
the *same* `lib/transformers/` registry and an inlined mirror of the plugins.

**But its markdown core is a regex chain, not a parser.** `parseInline`
(`lattice-emulator.js:1017`) is literally:

```
![alt](url) → <img>      // inline images only
**x** → <strong>         // naive, non-nesting
*x* / _x_ → <em>
`x` → <code>             // with HTML-escape
```

and `parseSlide` is line-by-line block handling (tables via one regex,
fenced code, blockquotes, nested `<ul>`/ordered lists, task checkboxes).

Concrete GFM gaps versus markdown-it (what "needs a lot more polish" means):

- **No inline links.** `[text](url)` is not handled at all (only `![]()`
  images). Any prose link renders literally.
- **Non-nesting emphasis.** `**a _b_ c**`, `***bold italic***`, intraword
  rules, and `**`-inside-`` ` `` interactions are fragile.
- **No strikethrough** (`~~x~~`), **no autolinks**, **no reference links**,
  **no footnotes**, **no hard line breaks** (two-space / backslash).
- **No HTML entity / numeric-entity handling**, partial **escape** support
  (`\*` etc.).
- **Tables** are a single permissive regex (`/((?:\|.+\|\n?)+)/`) — no
  alignment rows beyond a basic check, no escaped pipes, no inline block
  content in cells beyond `parseInline`.
- **Loose vs tight lists**, multi-paragraph list items, and blockquote
  nesting are approximations.
- **CommonMark edge cases** (setext headings, indented code, lazy
  continuation, HTML blocks) are unsupported.

None of these bite the curated galleries because the galleries are authored to
the emulator's subset. They *would* bite real authored decks — which is
exactly why we should not promote the regex parser to "the engine." The
decision in §5 is about which core replaces it.

---

## 5. Design decision — which markdown core wins?

Two honest options for the engine's parser:

**Option A — `lattice-engine` on `markdown-it` (recommended).**
This is the Tauri note's plan. Use `markdown-it` directly (the same library
Marpit wraps), add our own thin slide layer (splitting, directives, `<section>`
emission, `![bg]`, `@theme`/`@size` reads, KaTeX, pagination chrome) as
markdown-it plugins, and keep `lib/integrations/marp/plugins.js` essentially
**as-is** — they already speak markdown-it tokens.

- **+** GFM correctness for free; we stop chasing CommonMark edge cases.
- **+** Our plugins (the hard, Lattice-specific part) port with minimal change;
  they currently hook `marpit_slide_containers`, so we provide an
  equivalently-named ruler boundary.
- **+** One engine can back **all four paths** — Node (emulator), browser
  (playground), and the runtime's needs — killing the
  three-reimplementation drift problem the registry only partially solves.
- **−** Adds `markdown-it` (+ plugins) to the bundle. It's ~?? KB but it's the
  same code marp-core already ships, so the *net* dependency footprint after
  dropping marp-cli/marp-core goes **down**, not up.

**Option B — polish the emulator's regex parser to GFM.**
- **−** Reimplementing CommonMark by regex is a known tar pit; we'd be
  rebuilding markdown-it badly. Rejected except as a stopgap.

**Recommendation: Option A.** Treat the emulator's parser as the *proof the
layer is small*, not the foundation. Build `lattice-engine` as a markdown-it
host, then point the emulator at it (replacing `parseInline`/`parseSlide`),
point the playground at it (replacing marp-core), and retire marp-cli.

---

## 6. The VS Code question (the hardest, decide first)

**marp-vscode *is* Marp Core.** Our documented fastest inner loop
(`CLAUDE.md`: "the marp-vscode preview pane is the fastest inner loop") depends
on a third-party extension we don't control and can't re-host from this repo.
`lib/runtime/index.js` is a **passenger**: it assumes marp-vscode already
produced `<section>` slides, `<marp-pre><code class="language-mermaid">`
fences, theme-scoped CSS vars, and pagination chrome, then upgrades/transforms
that DOM. Remove marp-vscode and there is **no in-repo preview pane** to fall
back to.

This means **"replace Marp" has two very different scopes**:

- **Scope 1 (engine ownership):** retire `@marp-team/marp-cli` and
  `@marp-team/marp-core` from *our* dependency tree (paths #1, #2, #4). VS Code
  authors keep using marp-vscode; we keep `marp.scaffold.css`, the
  `:is(pre, marp-pre)` carve-outs, and the twemoji `:not(.emoji)` rules as
  "marp-vscode compatibility shims." **Fully achievable in-repo.**
- **Scope 2 (preview ownership):** stop depending on marp-vscode for the live
  loop. This is only really answered by the **SlideWright desktop app** (the
  Tauri note's `PreviewPane` + incremental `SlideSegmenter`/`RenderCache`),
  or by a `lattice-engine`-powered VS Code preview/extension we'd have to
  build and ship separately. **Not a Lattice-repo change.**

**Recommendation:** this proposal targets **Scope 1**. Keep the marp-vscode
loop working unchanged (it's free, external, and good), and treat the
compatibility shims as a small, documented tax. Sunsetting marp-vscode is a
SlideWright-app decision, tracked there, not a blocker here. The CLAUDE.md
framing ("Marp is the foundation") should be softened once Scope 1 lands:
Marp becomes "the VS Code preview host + a retired build dependency," not the
engine.

---

## 7. The website question

The docs site has a **single render seam**: `window.LatticePlayground.render(
markdown, theme)`, built from `lib/playground/index.js` by
`tools/build-playground.js` (esbuild IIFE → `docs/public/playground/
lattice-playground.js`). Every live surface — landing-page hero + field cards,
component `Specimen` previews, the Playground page, and the Drawing Board
(editor filmstrip, practice mode, focus editor) — calls that one function. The
runtime bundle runs alongside it for Mermaid + registry transforms but does not
render markdown.

So the website migration is mechanical: **reimplement `LatticePlayground.render`
on `lattice-engine` instead of `marp.render`.** Because the playground already
composes "marp-core + `lib/integrations/marp/plugins.js` + `lib/transformers/`"
specifically for render parity with path #2, and Option A keeps the plugins and
registry, the swap is core-for-core. Nothing in the Astro/CodeMirror/Drawing-
Board layer changes — they only know `render()`.

Risk to watch: marp-core extras the site renders that the engine must match —
**twemoji** (or we drop emoji-as-image and let the font render), **KaTeX**
(bundle it client-side), and **auto-scaling** headers (decide keep/drop). These
are the same §2.2-item-8 decisions, surfaced in the browser.

---

## 8. What it would take — scope & risk

**Build:** `lattice-engine` (markdown-it host) implementing the §2.2 layer:

1. markdown-it instance (GFM preset) + KaTeX plugin.
2. Slide-splitting plugin emitting `<section data-marpit-slide>` with the
   `marpit_slide_containers`-equivalent ruler boundary our plugins hook.
3. Directive layer: front-matter + `<!-- _class: -->` comment directives, the
   in-use set (§2.2.3) first; global-vs-spot semantics matching
   `deckClassPropagate`.
4. `@theme` / `@size` reader + theme registry (port `themeSet` from
   `marp.config.js`).
5. `![bg …]` background-image grammar.
6. Pagination / header / footer chrome emitter to match what
   `marp.scaffold.css` currently corrects — ideally emit it *correctly* so we
   can **delete** the `!important` scaffold file (a real cleanup win).
7. Decisions on twemoji / auto-scaling / `<marp-pre>` element name.

**Reuse unchanged:** `lib/integrations/marp/plugins.js`,
`lib/transformers/registry.js`, `lattice.css`, all palettes, the KaTeX
extraction, the Mermaid pipeline.

**Risk register:**

- **Render parity regressions.** Mitigated by the existing baselines: keep
  marp-cli installed as a *differential oracle* and run engine-vs-marp-cli page
  count + HTML-structure diffs across `gallery.md`, the 53 component galleries,
  and the 12 bucket galleries until clean, *then* drop marp-cli.
- **markdown-it version skew** with whatever marp-core pins (so the oracle is
  apples-to-apples). Pin deliberately.
- **The §2.2.8 extras.** Each needs an explicit keep/replace/drop call;
  twemoji and auto-scaling have CSS carve-outs that must move in lockstep.
- **VS Code drift (Scope 2).** Out of scope here but must be named so the
  compatibility shims aren't deleted prematurely.

---

## 9. Phased plan

1. **P0 — invert the oracle (no new engine).** Decide §5 (Option A) and §6
   (Scope 1). Document the §2.2.8 extras decisions. *No code beyond docs.*
2. **P1 — `lattice-engine` core.** Stand up the markdown-it host + slide
   splitting + directives + `![bg]` + KaTeX behind a `render(markdown, {theme})`
   façade matching today's playground signature. Port the plugins onto it.
   Gate: passes `gallery.md` structure diff vs marp-cli.
3. **P2 — emulator onto the engine.** Replace `parseInline`/`parseSlide` in
   `lattice-emulator.js` with `lattice-engine`. The emulator stops being a
   second markdown implementation. Gate: parity test stays green; full
   component + bucket gallery page counts unchanged.
4. **P3 — playground onto the engine.** Reimplement `LatticePlayground.render`
   on `lattice-engine`; drop `@marp-team/marp-core` from
   `lib/playground/index.js`. Gate: docs-site visual spot-check across hero,
   specimens, Drawing Board.
5. **P4 — retire marp-cli.** Replace the `runMarp` build/test path with the
   engine; keep marp-cli installed but quarantined as the differential oracle
   for one release; then remove `@marp-team/marp-cli` from `package.json`,
   collapse `marp.config.js` into the engine config, and rewrite
   `parity.test.js` to assert engine-internal invariants (or engine-vs-emulator
   if they remain separate processes).
6. **P5 — cleanup + docs.** Try to delete `marp.scaffold.css` (if P1's chrome
   emitter is correct), keep the marp-vscode compat shims with a comment
   pointing here, and update `CLAUDE.md` / `marp.docs.md` / the "three render
   paths" framing. Update `CHANGELOG.md` (`### Removed` for the dep →
   **breaking** if any consumer imported `./config`).

Each phase is independently shippable and leaves the baselines green.

---

## 10. What we lose / risks we accept

- **marp-vscode stays** (Scope 1). We keep external compatibility shims. That's
  the honest cost of not building our own preview host in this repo.
- **Marp's discovered edge cases.** We rediscover or re-import fixes as the
  galleries surface them — same posture the Tauri note already accepted.
- **Native PPTX** (marp-cli's experimental path) is forfeited; deferred
  indefinitely per the Tauri note (standard PPTX goes PNG-per-slide +
  `pptxgenjs`).

## 11. Open questions

1. **Scope confirmation:** is this branch Scope 1 (engine ownership, keep
   marp-vscode) or are we also committing to a Lattice-owned VS Code preview
   (Scope 2)? Recommend Scope 1.
2. **twemoji:** keep emoji-as-`<img>` (port the plugin) or drop to font
   rendering and delete the `:not(.emoji)` carve-outs?
3. **auto-scaling headers:** does any shipped layout rely on marp-core's
   fit-scaling, or is it dead weight we can drop?
4. **`lattice-engine` home:** new top-level `lib/engine/`, or fold into
   `lib/core/`? (It's coupled to nothing component-specific — `lib/core/`
   precedent fits, but its size may warrant its own bucket.)
5. **Separate package?** The Tauri app wants `lattice-engine` in a WebView;
   should it ship as its own `exports` subpath from day one?
