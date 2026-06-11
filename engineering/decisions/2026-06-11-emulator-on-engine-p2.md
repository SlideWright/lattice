# P2 — put the emulator on `lattice-engine`

**Status:** in progress — steps 1–3 landed behind a default-OFF flag; gaps
enumerated, not yet closed (see **Progress log** below). Implements **P2** of
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
   `data-marpit-pagination` + `bgColor`; the engine emits the same via its
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
re-tag each `<section>` with `data-marpit-slide="N"` (the **one** attribute the
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
rewrite. **Do not flip the default until this table is all-zero.**

## Rollback

Every step is reversible; the seam is a single call site behind a default-OFF
flag. `parseSlide` stays in the tree until the rendered-pixel A/B is all-zero
across the corpus, so a swap that regresses any deck is caught before the parser
is deleted.

## Not in scope

P3 (drop marp-core from the playground — gated on the owned emitter's on-device
sign-off) and P4 (retire marp-cli). marp-vscode stays (Scope 1).
