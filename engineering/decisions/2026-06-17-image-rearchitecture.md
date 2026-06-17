# Image re-architecture — engine CSS-background split + kernel asset resolution

Date: 2026-06-17
Status: Accepted — implemented (best-judgment de-risk: kept lib/core/bg-image.js as the shared kernel and swapped <img>→CSS background + resolved URL, rather than deleting it)
Branch: `claude/important-usage-audit-67ggrm`

## ⚠️ Implemented vs. planned (scope correction)

Shipped in two passes:

- **Pass 1 (emulator / CLI):** `lib/core/bg-image.js` emits the image as a CSS
  `background-image` on `.lattice-bg` (no `<img>`, no `!important`), resolving
  deck-relative URLs to absolute `file://` against the deck dir. Fixed the PDF
  path where "totally broken" was reported.
- **Pass 2 (web layout — this update):** the half-canvas split now lives in the
  **shared engine**, not just the emulator. `lib/engine/index.js` runs a
  class-aware `liftImageBgImages` + `wrapImageText` + scrim in `renderHtml`, so
  the docs playground / runtime produce the SAME split DOM (`.lattice-bg` +
  `.image-text`) as the PDF path. It is idempotent (the emulator pre-lifts, so
  the engine pass no-ops there — emulator PDFs stay pixel-identical) and
  class-aware (a non-image `![bg]` keeps the marp-web section background). The
  URL resolver is now WHATWG-`URL`-based (no `node:path`/`node:url`) so it
  bundles into the **browser** playground engine; `render()` gained an optional
  `{ baseUrl }`.

**Remaining (the one web gap):** **asset serving.** The web layout is now
correct, but a component sample's `![bg](sample-image-landscape.svg)` still
resolves against the playground origin, where the sample SVGs aren't served —
so the image panel is correctly laid out but empty until the sample assets are
staged (`docs/scripts/sync-playground-assets.mjs`) and the playground passes
their base as `{ baseUrl }` to `render()`. Tracked as the next step.

## Context — what "image is totally broken" actually was

The `image` component renders broken-image placeholders in any deck rendered
to a PDF whose output directory is not the deck's own directory. Reproduced
with the component gallery: the text panel, scrim, chrome, and type all render
perfectly — only the asset fails.

**Root cause (not a component defect):** the deck authors images as
deck-relative refs — `![bg right](sample-image-landscape.svg)`. The emulator's
pre-pass (`lib/core/bg-image.js`) passes the path through verbatim into
`<img class="image-asset" src="sample-image-landscape.svg">`, then navigates
Chromium to `file://<output-dir>/deck.html`. The browser resolves the relative
`src` against the **output** directory, not the deck's. There is no usable
`<base href>`. So every render to a foreign directory 404s the image.

Proof: co-locating the SVGs with the output HTML makes every variant
(half-canvas, full, contain, museum, mirror, dark) render flawlessly. The bug
is one layer up from the component — in how the deck is wrapped and how assets
resolve.

## Why a re-architecture, not just a base-href patch

A one-line `<base href>` in the emulator would fix the CLI symptom, but it
leaves the deeper split intact:

- The **owned engine** (`lib/engine/background-image.js`) reproduces marp-core's
  `inlineSVG:false` basic mode: it consumes `![bg]` into a **CSS background on
  the section, zero `<img>` elements** — but it **explicitly punts on the
  directional `bg left` / `bg right` split** ("requires Marpit's inline-SVG
  container DOM — the P1.1 milestone").
- The **half-canvas text+image split** — image's signature — therefore lives
  *only* in the emulator's `lib/core/bg-image.js` as `<img>` elements. That is
  the asset bug's home, and it means the two render paths diverge for the one
  component where the visual is the substance.

So image rendering is forked between paths, and the fork is exactly where the
bug lives. The proportionate fix is to finish the deferred engine milestone and
unify both paths on it.

## Decision

Rebuild image rendering on the **owned engine's CSS-background kernel**, lean on
the **sovereign `image` Form Frame** for chrome suppression, and **solve asset
resolution in the shared kernel**. Retire the emulator-only `<img>` pre-pass.

### Three moves

1. **Split-background in the engine.** Extend `lib/engine/background-image.js`
   to handle `bg left` / `bg right`: emit a half-width `.lattice-bg` element
   carrying the image as a CSS `background-image` (no `<img>`), and consume the
   sibling prose into `.image-text`. Identical DOM/CSS on every render path.
   This finishes the deferred P1.1 milestone.

2. **Retire the emulator pre-pass.** Delete `lib/core/bg-image.js` and
   `lib/transformers/image-scrim.js`; the emulator consumes the engine's output
   directly. The scrim becomes an engine-emitted CSS `::after` gradient, not a
   JS-injected node.

3. **Asset resolution in the kernel.** Thread a `baseUrl` (deck directory) into
   the engine's `render()`; resolve deck-relative `![bg](x)` to an absolute URL
   — `file://<deckDir>/x` for the CLI, a host-supplied base for the
   runtime/playground. Lean output, one fix serving every path. The
   export-to-marp path keeps its existing asset-localization.

### Locked axes

- **Element mechanism:** CSS background (not `<img>`). `cover` / `contain` /
  `museum` replicate via `background-size` / `background-position` + matte; the
  scrim is a gradient overlay. **A11y note:** a CSS background is not in the
  accessibility tree, so for `contain` (screenshots/plots/dashboards) the
  engine adds an `aria-label` on the section derived from the image alt, so the
  meaning is not lost.
- **Asset resolution:** resolve to absolute URL (chosen over data-URI inlining).
  Keeps output lean; the engine gains a `baseUrl` render parameter. Data-URI
  inlining stays the export/portable path's job.

## The `!important` payoff (ties back to the originating thread)

This session began as an internal-`!important` audit. `image.styles.css`
carries **22 `!important` overrides** — the single largest internal cluster —
written to beat Marpit's `section img` / `<img class="emoji">` catch-all. Moving
off `<img>` to engine-emitted `.lattice-bg` backgrounds removes the contract
those overrides were fighting, so the re-architecture **retires that entire
cluster** as a side effect, not a separate cleanup.

## Implementation plan

1. `lib/engine/background-image.js` — add directional split handling + the
   `.lattice-bg` / `.image-text` DOM + scrim `::after`; accept the resolved
   absolute URL.
2. `lib/engine/index.js` / `slides.js` — thread `baseUrl` through `render()`;
   resolve `![bg](relative)` against it.
3. `lattice-emulator.js` — pass the deck directory as `baseUrl`; drop the
   `bg-image` + `image-scrim` requires and post-passes.
4. `lib/components/imagery/image/image.styles.css` — rewrite for the
   CSS-background DOM; delete the now-unnecessary `!important` overrides.
5. Retire `lib/core/bg-image.js`, `lib/transformers/image-scrim.js`, their
   registry entry, and `test/unit/core/bg-image.test.js`; add engine-level
   coverage for the split-background behavior.

## Verification

- Render the image gallery to a **foreign output directory** (the original
  failure mode) and confirm every variant resolves.
- `tools/pixel-check.js` against the committed gallery PDFs — the re-architected
  output must match the (working) committed baseline, not just "render".
- Cross-renderer: confirm the runtime/playground path emits the same DOM.
- Maker-checker: independent inspection (diff correctness) + assessment (does it
  meet the goal, any guarantee weakened) before commit.

## Relationship to the `featured` purge (separate, parallel work)

`featured` is being purged (superseded by the `focus` directive) on the same
branch — deletions staged, reference cleanup pending. It is independent of this
re-architecture (no CSS or DOM coupling to `image`). The two are sequenced, not
entangled.

## Risks

- `background-image.js` is a shared markdown-it ruler gated by the
  semantic-invariant suite — a regression silently affects all three render
  paths. Pixel-check every batch.
- Threading `baseUrl` changes the engine `render()` signature — every caller
  (emulator, runtime, playground, tests) must pass or default it. Default to
  `null` (current behavior) so unthreaded callers are unaffected.
- `contain`/`museum` matte + scrim fidelity must match the committed baseline
  pixel-for-pixel; the CSS-background `background-size:contain` path is the
  fidelity-sensitive one.
