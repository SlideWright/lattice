---
status: shipped
summary: P2 of the Marp replacement — put the emulator on lattice-engine, deleting the bespoke regex parser for one markdown impl
---

# P2 — put the emulator on `lattice-engine`

**Status:** DONE — the emulator renders through `lib/engine`; `parseSlide` is
deleted and the `LATTICE_EMULATOR_ENGINE` flag is gone (see the final **Progress
log** entry). Corpus flip A/B gated the swap to zero regressions. Implements **P2** of
[`2026-06-10-marp-replacement-proposal.md`](2026-06-10-marp-replacement-proposal.md)
§9, sequenced after the owned CSS emitter (merged). Written before code because
the target is the shipped `bin`/`main`, and the migration is not a drop-in.

## Goal

Replace the emulator's bespoke regex markdown parser (`parseSlide` /
`parseInline` in `lattice-emulator.js`, ~230 lines) with `lattice-engine`, so
Lattice has **one** markdown implementation instead of two. The emulator keeps
owning everything else it does (CLI, palette resolution, Mermaid pre-render,
Puppeteer → PDF, the HTML sidecar).

## Why — and the honest scope caveat

- The emulator's regex parser "covers what the galleries use, not GFM" — the
  proposal calls it **the real source of fragility**. The engine is the GFM
  markdown-it host, HTML-parity-tested against marp-core across 55 galleries.
- **This does NOT reduce the marp dependency.** The emulator is already
  marp-free; P2 is *consolidation / maintainability*, and it sets up **P4**
  (an engine-based emulator is the renderer that can replace `marp-cli` on the
  build/test path). The marp-*reducing* phases remain P3 (playground) and P4.

## Current shape — the seam

```
preprocessMermaid(md)            # Puppeteer renders ```mermaid → inline SVG
  → front-matter parse           # paginate/header/footer/class/size globals
  → splitSlides(content)         # lib/core — ALREADY shared with the engine ✓
  → rawSlides.map(parseSlide)    # ← THE SEAM: bespoke md → per-section HTML
  → page assembly + marpSystemCss + header/footer chrome
  → Puppeteer → out.pdf (+ out.html sidecar)
```

`parseSlide` reads module-level state: `paginateGlobal`, `globalHeader`,
`globalFooter`, `globalClass`, `mathRegistry`, `headingDivider`, `DEFAULT_SIZE`.
That coupling is why it can't be `require`d in isolation today.

## What `parseSlide` does that the engine must reproduce

Per-slide directives (`_class`/`_header`/`_footer`/`_paginate`/
`_backgroundColor`) + deck-`class:` propagation, `![bg …]` backgrounds, fenced
code (highlight.js), `latticeplot` interception, `$$`/`$` math, heading-period
add/strip, list/table parsing, then the registry HTML transforms. **The engine
already does all of these** — it runs the *same* `lib/integrations/marp/
plugins.js` + `lib/transformers/registry` that `marp.config.js` does, which is
why it sits at HTML parity with marp-core. So the swap is "stop hand-rolling
what the shared plugins already produce," not "re-implement features."

## The hard parts (integration risks, ranked)

1. **Mermaid.** The emulator pre-renders ```mermaid to inline SVG via Puppeteer
   *before* parsing, with palette-resolved theme vars and dual light/dark. This
   stays emulator-side; the engine must accept the already-preprocessed source
   and pass the SVG through untouched. Risk: the engine's code-fence handling
   mangling the injected `<div class="mermaid-svg">`.
2. **Math.** Two implementations — the emulator's `extractMath`/`restoreMath`
   token swap vs the engine's `installMath` (KaTeX). Collapse to the engine's;
   delete the emulator's. Risk: the `$`-delimiter guards must match (currency
   prose like `$400M`), which the engine already handles per the parity sweep.
3. **Page chrome / pagination.** `parseSlide` emits per-slide header/footer +
   `data-lattice-pagination` + `bgColor`; the engine emits the same via its
   plugins. Verify the engine's section attributes match what the emulator's
   page-assembly + `marpSystemCss` + `dist/lattice.css` expect.
4. **Non-modular binary.** `parseSlide` is mid-script, not exported. The swap
   carves one call site (`rawSlides.map(parseSlide)`), but the surrounding globals
   and assembly must keep working.

## Approach — sequenced, each step independently green

1. **Parity harness first (additive, zero behavior change).** The emulator
   already writes an `out.html` sidecar. Build a harness that, per gallery deck,
   renders the per-section HTML via `engine.render()` and via the emulator
   pipeline, normalizes away the known-different layers (Mermaid SVG payload,
   page wrapper/chrome), and diffs the section *content*. This enumerates the
   exact gaps before any swap and becomes the permanent engine↔emulator gate the
   proposal's P4 wants.
2. **Reconcile Mermaid + math** so the engine consumes the emulator's
   Mermaid-preprocessed source and owns KaTeX; delete `extractMath`/`restoreMath`.
3. **Swap the seam:** `rawSlides.map(parseSlide)` → `engine.render(preprocessed,
   theme).html`, feeding the existing page assembly. Thread the front-matter
   globals through the engine's directive layer rather than the emulator's.
4. **Delete** `parseSlide`/`parseInline` (and now-dead helpers).
5. **Gate:** the integration tier (component + bucket gallery page counts +
   cross-renderer parity) stays green; visually spot-check a sample of rebuilt
   PDFs (`tools/rasterize-for-review.sh`), since page counts don't catch layout.

## Progress log

### 2026-06-11 — flagged engine path + gap inventory

The seam now branches on **`LATTICE_EMULATOR_ENGINE=1`** (default OFF, so the
shipped `bin`/`main` stays on `parseSlide`). The engine path:
`engine.render(rawMd, paletteName)` (rawMd = the mermaid-preprocessed source
*with* front matter, so the engine's directive layer resolves the globals) →
`splitTopLevelSections` (depth-counted, nested split-panels stay nested) →
re-tag each `<section>` with `data-lattice-slide="N"` (the **one** attribute the
engine omits that the page template's sizing / overflow watcher / PDF pagination
key off) → downstream `applyDeckLogoToHtml` is **skipped** (the engine already
injected the logo). `parseSlide` is untouched and still default.

**Verification method** — per-page md5 of `pdftoppm` rasters, engine vs
`parseSlide`, same deck/palette. Sharper than the struct-level harness (which
over-reports CSS-equivalent markup differences): it compares the *rendered
pixels*, which is what actually has to match.

**Results (indaco):**

| Deck | Pages | Differ | Nature of the diff |
|---|---|---|---|
| inventory/cards-grid | 13 | **0** | byte-identical — engine keeps the card title in the `<li>`, emulator lifts it, but the CSS renders both the same |
| statement/split-panel | 12 | 1 | TBD |
| diagram/diagram (mermaid) | 31 | 1 | TBD — mermaid passthrough is the #1 risk |
| chart/roadmap | 11 | 2 | TBD |
| math/math (KaTeX) | 15 | 2 | **overflow ring** — identical children, but the engine section renders >12px taller (likely a KaTeX-metrics edge), tripping the overflow watcher |
| legal/legal | 40 | 11 | mixed — slide 4 is a **missing takeaway divider** (real structural drop), not an overflow ring |

**Gap classes so far:** (a) the overflow watcher tripping on engine sections
where `parseSlide`'s sat just under the 12px tolerance (math) — chase the KaTeX
option parity + any section-attribute height effect; (b) a dropped/changed
element vs the bespoke parser (legal takeaway divider) — real parser-output
difference to reconcile. cards-grid proves the *approach* is sound (different
HTML, identical pixels); the gaps are a finite, per-deck triage list, not a
rewrite.

### 2026-06-12 — triage + first regression fix; the gate is "no regressions"

Drilled into the two gap classes, and the right **gate reframes**: byte-identical
to `parseSlide` is the wrong bar — it would freeze the bespoke parser's *bugs*
(the engine is GFM-correct and fixes e.g. bold-inside-inline-code). The bar is
**no visible regressions**; each diff is triaged regression / improvement / noise.

- **Math overflow (slide 6) — REGRESSION, FIXED.** Not a height edge: the engine
  used KaTeX `output:'htmlAndMathml'` (marp-core's default), and the hidden MathML
  annotation's *unclipped* layout inflated `scrollWidth` by ~1220px → the slide
  overflow watcher baked a stale red ring into the PDF. Fix: `installMath` takes an
  `output` option (default `htmlAndMathml`, so the playground/marp A/B stays at
  parity); the **emulator** path passes `mathOutput:'html'` — matching the
  emulator's own existing `output:'html'` KaTeX call, and a PDF has no
  screen-reader to consume the MathML. Math A/B 2→1; the residual (slide 9) is a
  sub-pixel difference, visually identical → **noise, accept.**
- **Legal takeaway divider (slide 4) — NOT a regression; a pipeline gap.** The
  `.below-note` hairline wrap (trailing `<p>` after a structural block) is
  **bespoke to `parseSlide`** (`lattice-emulator.js`, the "Universal below-note"
  block), *not* in the shared plugins/registry — so marp-cli and the engine never
  produced it. The emulator has silently diverged from marp here all along (the
  cross-renderer gate only checks page counts). Dropping it makes the emulator
  *match* marp; the **correct** convergence is to move the wrap into the shared
  plugins so all three renderers agree (changes marp-cli output + baselines → its
  own reviewed change, not a P2 quick-fix). Likely the bulk of legal's 11 diffs.

### 2026-06-12 — full triage complete; only one true engine gap

Every diff across the six probe decks is now categorized. **Three of the four
remaining diffs are not engine bugs — the engine is marp-correct and `parseSlide`
was the lenient/quirky outlier**, which is the whole reason P2 exists.

| Deck / slide | Diff | Category | Action |
|---|---|---|---|
| cards-grid | — | byte-identical | none |
| math s6 | overflow ring (MathML `scrollWidth`) | **regression** | **FIXED** (`mathOutput:'html'`) |
| math s9 | sub-pixel | noise | accept |
| roadmap s3/s4 | sub-pixel (status icons) | noise | accept |
| split-panel s3 | `## 114*%*` → literal `*` | **source authoring bug** | engine is CommonMark-correct (confirmed: marp-cli also emits literal `*`); `parseSlide`'s regex was lenient. Fix the deck (`114<em>%</em>` or CSS). |
| diagram s18 | eyebrow/title styling lost, overflows | **source authoring bug** | duplicate `<!-- _class: diagram -->` + `<!-- _class: content -->`; engine takes the last (`content`) **exactly like marp-cli** (confirmed), `parseSlide` took the first. Fix the deck (one `_class`). |
| legal (×11) | `.below-note` hairline absent | **pipeline gap** | the one real gap — below. |

**The lesson:** `parseSlide` has been *masking* deck authoring bugs (non-CommonMark
emphasis, duplicate directives) by being more lenient than marp — and silently
diverging from marp-cli on those slides all along. The swap surfaces them. They're
fixed in the **decks**, not the engine.

### The one true gap: migrate `.below-note` to the shared pipeline

`.below-note` (wrap a trailing `<p>` after a structural block in the hairline
treatment) lives **only** in `parseSlide` (the "Universal below-note" block) — so
marp-cli, the engine, and the runtime never produced it. To converge ("three paths
must agree") it moves into the shared registry as a transformer with
`applyToHtml` / `applyToSection` / `applyToDom`. Two complications found while
scoping it (why it's a careful change, not a one-liner):

1. **Footer anchoring.** The regex anchors the trailing `<p>` at the section end
   (`…</p>\s*$`). In `parseSlide` it runs on the **body** (pre-chrome) so that
   holds; in the engine's `applyToHtml` the section ends in `<footer>`, so the
   kernel must match `<p>…</p>` before an optional trailing `<footer>`.
2. **Ordering / per-section class.** below-note runs **last**, after several
   transforms that settle the trailing-`<p>` shape — but in the emulator some of
   those (code-cols, crit, table, h2-pill) are *still* `parseSlide`-bespoke and run
   *after* the single `applyAllToSection` call. And it needs the section **class**
   for its exclusion list (`title/closing/quote/big-number/content/diagram/…`).
   So `applyToHtml` must iterate top-level sections (depth-aware, for nested
   split-panels) and read each class. It is entangled with the broader
   bespoke-transform migration; do it deliberately and gate on the
   **emulator default-path galleries staying byte-identical** (they're emulator-
   built baselines — the safety net).

**Status of the flip:** the engine path is correct on every deck except where a
deck has its own authoring bug. Order of operations to finish P2: (a) fix the two
deck authoring bugs; (b) migrate `.below-note`; (c) re-run the corpus A/B → all
diffs improvement/noise; (d) flip the default, delete `parseSlide`.

### 2026-06-12 — (a) deck bugs fixed; (b) `.below-note` migrated

- **(a) DONE.** split-panel `114*%*` → `114<em>%</em>` (manifest sample + variant
  caption, regenerated); diagram duplicate `_class` stripped. Both render-neutral
  on the emulator; engine path now zero-diff on those decks.
- **(b) DONE.** `.below-note` is now a shared kernel, `lib/core/below-note.js`
  (`wrapSectionBody` for the emulator body, `applyToHtml` for the full
  Marpit HTML, `applyToDom` for the runtime), wired into the registry via
  `lib/transformers/below-note.js` (registered last; **no `applyToSection`** so
  it does not re-order ahead of `parseSlide`'s bespoke crit/glossary
  transforms — the emulator calls the kernel directly as its last step). The
  footer-anchoring (complication #1) is solved by an optional trailing-`<footer>`
  group in the regex that is byte-equivalent to the old `…</p>\s*$` for the
  footer-less emulator body. The ordering question (complication #2) is sidestepped
  by keeping the emulator's explicit last-call rather than folding into
  `applyAllToSection`.
  - **Safety net held:** emulator default-path rasters byte-identical across
    legal (40pp) + baseline (89pp) + glossary — 169 pages, 0 diffs.
  - **Goal met:** marp-cli now emits `<div class="below-note">…</div><footer>`;
    engine↔marp **FULL PARITY across 65 decks**; runtime bundle carries it
    (`applyToDom`). Unit suite +11 (`test/unit/transformers/below-note.test.js`).
  - **Legal A/B:** engine-vs-`parseSlide` diffs 11 → 4; the resolved 7 were
    below-note. The residual 4 (slides 2/8/19/20) are **engine-correctness
    improvements** — e.g. slide 2 is the bold-inside-inline-code case
    (`parseSlide` wrongly bolds `**Federal**` inside `<code>`; the engine keeps
    it literal, matching marp). Those belong to step (c), not below-note.

Remaining to finish P2: (c) finish triaging the corpus A/B (the residual diffs
are improvements/noise so far); (d) flip the default + delete `parseSlide`.

### 2026-06-12 — (c) full-corpus flip A/B triaged; one blocker: `![bg]` split backgrounds (P1.1)

Built `tools/emulator-flip-ab.mjs` — renders every deck through the emulator's two
internal paths (default `parseSlide` vs `LATTICE_EMULATOR_ENGINE=1`), rasterizes at
72 dpi, and per-page md5-diffs them. This is the permanent flip-safety gate. Full
light corpus (indaco): **67 decks, 19 with diffs, 91 differing pages, and zero
page-count / structural slide drops** — which is exactly why the page-count
integration tier never caught any of this.

Every differing page falls into three categories:

| Category | Verdict | Where |
|---|---|---|
| `![bg left\|right]` split image layouts collapse | **REGRESSION — the one blocker** | imagery/image (8), featured (5), imagery bucket (2); + image slides in jargon/baseline |
| bold-inside-inline-code stays literal | improvement (engine is GFM-correct; `parseSlide` wrongly bolds inside `<code>`) | legal s2, list-steps s15, code, compare-code, q-and-a |
| sub-pixel (status icons, anti-aliasing) | noise — visually identical | compare-prose (×11), split-compare, obligation-matrix, roadmap s3, math s9 |

**The one blocker — `![bg]` advanced backgrounds.** `parseSlide` has bespoke
`![bg right]` → `lattice-bg` / `image-asset` / `image-text` handling; marp-cli gets
the equivalent from Marpit's inline-SVG advanced background (the PDF path,
`inlineSVG:true`). But **lib/engine implements only basic-mode `![bg]`**
(`inlineSVG:false`, the web-runtime path): `lib/engine/background-image.js` collapses
`bg left/right` to a single full-bleed CSS background and emits **0 `<img>`** — *by
design*, its header naming the directional split "the **P1.1 milestone (the PDF
path)**", not yet built. So the emulator's engine path, which renders PDFs through
lib/engine, drops the image panel and the layout collapses to full-width text. The
engine↔marp parity gate passed because BOTH run web/basic mode there; only the
emulator's PDF path exposes the gap.

**Consequence for the flip:** step (d) is blocked on **P1.1 — inline-SVG advanced
backgrounds in lib/engine** (reproduce Marpit's split-container DOM +
`image-text`/`image-asset` wrappers on the PDF path). That is a real engine
milestone, not a triage fix. The earlier note that "the engine already does all of
these [incl. `![bg]`]" was over-optimistic — it does basic mode, not the PDF split.
Everything else in the corpus is improvement or noise, so once P1.1 lands the corpus
should go all-green and the flip is safe; until then the engine path stays the
default-OFF flag it is.

Remaining to finish P2: **(c) done** (above); (c.5 / P1.1) implement inline-SVG
advanced backgrounds in lib/engine — the gate to (d); (d) flip the default + delete
`parseSlide` once the corpus is all improvement/noise.

### 2026-06-12 — `![bg]` fixed via a lifted kernel (NOT inline-SVG); re-triage finds 2 more parseSlide-only transforms

Two corrections to the entry above, from actually building the fix + re-triaging
without lumping:

1. **The `![bg]` fix is NOT P1.1 / Marpit inline-SVG.** The emulator's PDF path
   renders the image layout as lattice's OWN `lattice-bg` / `image-asset` /
   `image-text` structure, not Marpit's inline-SVG split containers — so the fix is
   to lift parseSlide's `![bg]` handling into a shared kernel
   (`lib/core/bg-image.js`: `liftBgImages` markdown pre-pass + `wrapImageText` HTML
   post-pass) and apply it in the engine path, leaving lib/engine's web↔marp
   contract untouched. The full/contain contrast **scrim** is injected by class in
   the engine path (image-scrim now exports `needsScrim` / `SCRIM_HTML`; parseSlide
   gets it from `applyAllToSection`, which the engine path doesn't run).
   parseSlide now shares the kernel's `bgDiv` — default path byte-identical (image
   + 89pp baseline, 0 diffs). **Result: the image gallery is now A/B-identical
   (11pp, 0 diffs); corpus 91 → 69 differing pages.**

2. **The "one blocker" was an undercount — lumping `featured` with the image
   layouts hid it.** A careful re-triage (no lumping) of the 69 finds the only
   *structure-needing* regressions are **`featured` (feat-layout) and `compare-code`
   (code-cols)** — both parseSlide-only transforms that marp-cli ALSO lacks for
   their list-based slides (confirmed: marp-cli renders them as plain `<ul>` too),
   exactly like `.below-note` was. Every other differing deck is either:
   - **CSS-tolerant** — cards-grid, cards-stack, list-criteria (crit), glossary,
     verdict-grid, pricing, checklist, the slot-label-lift family: the engine emits
     a plain list but the layout CSS renders it identically (A/B `✓`); only
     featured/compare-code have CSS that *requires* the bespoke wrapper DOM.
   - **noise** — compare-prose (×11), split-compare, obligation-matrix, roadmap,
     math s9: sub-pixel (status icons / anti-aliasing), visually identical.
   - **improvement** — bold-inside-inline-code stays literal (legal, list-steps,
     code, q-and-a): the engine is GFM-correct.

**So the gate to (d) is: migrate `featured` + `compare-code` into the shared
registry** (the same below-note pattern — `applyToHtml`/`applyToSection`/`applyToDom`
kernels), which also fixes marp-cli + the runtime, then re-run the corpus A/B to
green. That is the remaining structure work; nothing else in the corpus blocks the
flip. `![bg]` is landed; the rest of P1.1 (true Marpit inline-SVG) is NOT needed for
the emulator path and is unrelated to this gate.

### 2026-06-12 — (d) DONE: featured + compare-code migrated, default flipped, `parseSlide` deleted

The gate work and the flip both landed:

1. **`featured` + `compare-code` migrated** to the shared registry — kernels in
   each component folder (`lib/components/imagery/featured/featured.transform.js`,
   `lib/components/code/compare-code/compare-code.transform.js`) + adapters
   (`lib/transformers/{featured,compare-code}.js`) with
   `applyToHtml`/`applyToSection`/`applyToDom`, the `.below-note` pattern. Fixes
   the engine path **and** marp-cli + the runtime (both rendered a plain `<ul>` /
   flat code sequence before). parseSlide default byte-identical; +11 unit tests.
   Corpus: **69 → 54** differing pages, every one improvement/noise — **no
   structure-needing regressions remain.**
2. **The flip:** `engineSlides()` is now the emulator's only parse path. The
   `LATTICE_EMULATOR_ENGINE` flag and the `USE_ENGINE` ternaries are gone.
3. **`parseSlide` deleted** (~620 lines) plus the now-dead helpers it alone fed:
   `parseInline`, the KaTeX `extractMath`/`restoreMath` pipeline (the engine
   renders math itself; the emulator only links KaTeX's CSS), the `hljs` require
   (the engine highlights), and the deck-directive parsing block
   (`paginateGlobal`/`globalHeader`/`globalFooter`/`deckWideClass`/islands/
   `headingDivider`/`splitSlides`/`liftSlotLabel`/`belowNote`/registry/radar/
   quadrant requires) — all resolved inside `engine.render` now. biome's
   unused-code lint drove the dead-code sweep; `lib/engine` keeps only `rawMd`,
   the slide-size vars, `globalStyle`, and `bgImage`.

Verified on the bare default (no env): baseline 89pp, math 15pp (KaTeX renders),
featured 8pp, compare-code 8pp — all correct; unit suite 1639, build + build:check
green. The `tools/emulator-flip-ab.mjs` harness (which compared the two parsers)
was removed at the flip — with parseSlide gone it compares the engine to itself;
resurrect it from git history if a second parser ever returns. The registry's
per-section interface (`applyAllToSection` + every transformer's `applyToSection`)
went with it — `parseSlide` was its only caller; marp-cli uses `applyToHtml`, the
runtime uses `applyToDom`, and the per-section transform logic still lives in the
kernels (`transformSplitSection`, `transformChartSection`, …).

## Rollback

Every step is reversible; the seam is a single call site behind a default-OFF
flag. `parseSlide` stays in the tree until the rendered-pixel A/B is fully
triaged (every diff an improvement / noise / logged follow-up, no open
regressions), so a swap that regresses any deck is caught before the parser is
deleted.

## Not in scope

P3 (drop marp-core from the playground — gated on the owned emitter's on-device
sign-off) and P4 (retire marp-cli). marp-vscode stays (Scope 1).

**Constraint — marp is NOT being deleted, and cannot be until the VS Code preview
has a viable replacement.** Two things are easy to conflate:

- **Deleting `parseSlide` (this note, step d)** removes the *emulator's own*
  bespoke regex parser and converges the emulator on `lib/engine`. The emulator is
  already marp-free, so this touches **no marp dependency** — it is pure
  consolidation.
- **Removing marp** is a different, later axis. **marp-vscode *is* Marp Core**, and
  it is the live-preview pane — our documented fastest inner loop
  (CLAUDE.md). `lib/runtime/index.js` is a *passenger* that post-processes the DOM
  marp-vscode already produced; remove marp-vscode and there is **no in-repo preview
  pane left**. So marp stays a hard dependency of the dev loop until a viable
  `lattice-engine`-powered VS Code preview/extension exists to replace it
  (**Scope 2** in `2026-06-10-marp-replacement-proposal.md` §6 — a separate, larger
  effort not yet started). P2–P4 deliberately keep marp-vscode and its
  compatibility shims (`scaffold.css`, the `data-marpit-*` attributes). **Do
  not plan or imply a full marp removal until that replacement lands.**

