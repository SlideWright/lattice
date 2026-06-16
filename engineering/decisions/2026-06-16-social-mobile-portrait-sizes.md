---
status: design-decision
version: 1
supersedes: none
extends: 2026-05-10-multi-resolution-strategy.md
---

# Social-media & mobile sizes — native portrait support

## Problem

Lattice ships five landscape `@size` presets (`hd`, `4K`, `standard`, plus
the `16:9` alias). Every one is wider-than-tall. Social and mobile surfaces are
the opposite — **portrait or square**: Stories/Reels/TikTok at 9:16, the
Instagram feed at 4:5, the universal 1:1 square, edge-to-edge phone mockups at
~9:19.5.

Two things break when you point the current engine at a portrait canvas:

1. **The size never reaches the PDF.** Geometry resolves from *two* registries
   that are supposed to agree but don't: the `@size` declarations in
   `lib/_theme.css` (consumed by the engine/playground/runtime) **and** a
   hard-coded `SLIDE_SIZES` map in `lattice-emulator.js` (consumed by the
   CLI/PDF `@page` + Puppeteer viewport). The emulator map is already missing
   `16:9`; an unknown name silently falls back to `hd`. So `size: story`
   renders a landscape PDF.

2. **Even at true portrait, the layouts fall apart.** Every token scales off
   `--_sec-1cqi` = 1% of slide **width** (`base.tokens.css`). A 1080-wide
   portrait canvas therefore yields *smaller* type than HD (1280 wide) on a
   canvas up to 2.7× taller, and `section` is a top-anchored flex column with
   width-proportional padding — so content clings to the top and ~85% of the
   frame is dead white space. (Verified empirically: a `kpi` slide at
   1080×1920 rendered a cramped top-left stack over an empty canvas.)

Registering presets is the cheap 20%. The quality bar (`§QUALITY BAR`) is
"10/10 boardroom, or it isn't done" — so native support means the portrait
formats must *fill the frame and read at phone distance*, not merely render.

## Decision

Add four portrait/square formats and make the engine **orientation-aware** so
the existing layouts adapt to a taller-than-wide canvas. Landscape output stays
byte-identical.

### Formats (new)

| Name       | Dimensions  | Aspect | Use case                                        |
|------------|-------------|--------|-------------------------------------------------|
| `square`   | 1080 × 1080 | 1:1    | IG / FB / LinkedIn feed square                  |
| `portrait` | 1080 × 1350 | 4:5    | IG / FB feed portrait — max feed real estate    |
| `story`    | 1080 × 1920 | 9:16   | Stories / Reels / TikTok / Shorts / Snap        |
| `mobile`   | 1080 × 2340 | 9:19.5 | Edge-to-edge modern-phone mockup                |

Aspect aliases (`9:16`, `4:5`, `1:1`) are registered alongside the semantic
names, mirroring the existing `16:9` alias. `reel` aliases `story`.

### Fix 1 — one size registry (HARD RULE #1)

Delete the emulator's hard-coded `SLIDE_SIZES`. The emulator already loads the
base + palette CSS as strings (`layoutCSS`, `paletteCSS`) and already requires
`lib/engine`; it resolves geometry through the engine's pure
`resolveSize(name, [paletteCSS, layoutCSS])` — the *same* lookup the scaffold
bakes into `@page`. "Add a size" becomes a one-line edit to the `@size` block,
and the latent `16:9`-in-the-PDF bug is fixed as a side effect.

### Fix 2 — orientation-aware scaling + fill

Geometry yields `aspect = width / height`, classified by `orientationFor()` into
`landscape` (aspect > 1.05) · `square` (0.95–1.05) · `portrait` (< 0.95). Each
render path (engine scaffold, emulator PDF template, runtime preview) emits the
same deck-wide CSS for non-landscape decks:

- `--canvas-scale`: a single magnitude multiplier folded into every `--fs-*`
  and `--sp-*` token. **Default `1` → landscape is unchanged (byte-identical).**
  Square is a flat 1.35; portrait *ramps* with how tall the canvas is —
  `1.5 + (1 − aspect) × 1.0`, capped 2.0 — so 4:5 (≈1.70) reads large while 9:16
  (≈1.94) and 9:19.5 (2.0) push type bigger still to fill the taller frame rather
  than float in a thin band. These are deliberately punchy: social/mobile is
  viewed on a phone at arm's length with little text per slide (tuned up from the
  first-pass 1.2/0.75/1.6 ramp after review — it read too small). Composes
  multiplicatively with the author's `--fs-scale` — a text-dense portrait slide
  can dial back with `scale-s`.

  `--canvas-scale` scales `--fs-h1`/`--fs-h2` too (which `--fs-scale`
  deliberately exempts), because portrait titles *should* grow with the canvas.

- **Vertical fill.** Portrait/square `section` centres its flex column
  (`justify-content: center`), so the default flex-column layouts (title,
  statement, prose, lists, quote, big-number, stats, closing) fill the frame.
  The bare-`section` rule (0,0,1) only reaches layouts that didn't set their own
  `justify-content`; multi-region grid layouts (kpi, comparison, split, charts)
  keep their landscape composition for now (phase 3 — a per-layout vertical
  reflow).

### Why `--canvas-scale`, not separate portrait CSS / a new container basis

- A per-orientation multiplier with default `1` is a *surgical* change: the
  landscape render is provably untouched (multiply by 1), verified by the
  committed-baseline pixel diff.
- Re-basing the cqi unit on height or the diagonal would silently move every
  landscape token and force a full re-audit of all 12 buckets. Rejected.
- Separate `lattice-portrait.css` repeats the 25-theme-shadow problem the
  multi-resolution ADR already rejected.

## Scope & phasing

"Full portrait quality" is delivered in tiers; this is honest about altitude:

1. **Plumbing** — 4 formats + aliases; registry unification. Every path renders
   true portrait. *(low risk, fully testable)*
2. **Mechanism** — orientation stamp + `--canvas-scale` + default flex-column
   vertical fill. Covers the layouts that are *already* a centred flex column:
   title, statement, section/divider, quote, lead, prose, lists, agenda, cover.
   These are the bulk of social-card use.
3. **Grid-layout reflow** — ✅ **landed** for the data-dense grids. Each render
   path now stamps a deck-wide `data-orientation` (portrait|square) on the
   `<section>` (engine `lib/engine/slides.js`, fed by `index.js` via
   `orientationFor`; runtime per-section from live aspect), and component CSS
   keys reflow rules off it:
   - `kpi` — every variant (briefing/ops/spotlight/trajectory) switches its
     metric grid to a centred flex column, linearising all variants in one rule.
   - `matrix-2x2`, `pricing`, `verdict-grid` — N-column grids collapse to one.
   - `split-panel`, `split-compare` — the rail stacks above the content panel.
   - **Charts need no reflow** — SVG charts keep their aspect ratio and centre,
     which is correct (you don't vertically stretch a funnel).
   - **Deferred:** `redline` (the side-by-side before/after diff is semantically
     load-bearing — stacking would obscure it) stays landscape-composed.

   **Why per-component CSS, not the Form manifest.** The Form engine is at the
   *light* coupling rung (`2026-06-16-form-manifest-medium-independent-contract.md`):
   it owns chrome/`stage`/`z`-plane composition, and `section-as-grid` is retired
   (`2026-06-16-retire-section-as-grid.md`) — content bodies are direct children
   of `section`, laid out by component CSS. The Frame governs the arrangement of
   *cells*, not a component's *internal* content grid, so even at full manifest
   coupling the kpi metric grid would still be component CSS. Manifest-driven
   reflow remains the deferred north star for a spatial renderer, not this work.

Each format ships a demo deck (`examples/social-<name>.md` + committed PDF) and
is screenshot-verified at its native size before it's called done. The grid
reflow ships `examples/social-grid.md`.

## Impact surface

| Area | Change |
| --- | --- |
| `lib/_theme.css` / `lib/theme/serialize.js` | Add the 4 `@size` + aliases to the `@theme` block |
| `lattice-emulator.js` | Delete `SLIDE_SIZES`; resolve via `engine` `resolveSize` |
| `lib/engine/css.js` | `orientationFor` / `orientationCss`; `composeCss` appends the orientation block |
| `lib/runtime/index.js` | Same stamp per section (preview parity) |
| `lib/base/base.tokens.css` | Route `--fs-*` / `--sp-*` through `var(--canvas-scale,1)` |
| `lib/base/base.elements.css` | Portrait/square vertical-fill `section` rules |
| Component CSS (kpi, comparison, split, charts) | Per-layout portrait reflow (phase 3) |
| Tests | `@size` parse + geometry for new names; portrait page-count fixture |
| `examples/` | `social-square|portrait|story|mobile.md` (+ PDFs) |
| Docs | `engineering/pipeline.md`, `lib/base/base.docs.md`, `CHANGELOG` |

## Author experience

```yaml
---
theme: indaco
size: story        # or square | portrait | mobile | 9:16 | 4:5 | 1:1
---
```

No other change. Orientation scaling + fill are automatic from the resolved
geometry; the author still tunes with `scale-l` / `scale-xl` on top.

## Caveats

- **PPTX export is 16:9-only** (`lib/export/pptx-export.js` is hard-wired to
  `LAYOUT_WIDE`). Portrait decks export correct PDFs; PPTX of a portrait deck is
  out of scope here and tracked separately.
- Story/Reel **platform safe-zones** (the caption/UI band TikTok & IG overlay on
  the bottom ~15%) are a future authoring affordance, not part of this change.
