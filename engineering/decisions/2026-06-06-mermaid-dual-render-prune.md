# Mermaid dark mode: dual-render + override prune (2026-06-06)

## Problem

Mermaid diagrams looked great in light mode but broke in dark: white edge-label
knockout boxes, dark-on-dark edges/text, invisible axes, "creepy" unfilled
journey faces. The repo had accumulated ~8 CSS override blocks in
`lib/integrations/mermaid/mermaid.css` that re-pointed baked-light values at
flipping `light-dark()` tokens to *fake* dark mode at display time — a
whack-a-mole layer that grew with every new diagram type.

## Root cause

Mermaid runs colour-math (khroma) on its `themeVariables`, so it rejects
`var(--token)` and demands literal hex. The **emulator** (`lattice-emulator.js`,
mmdc/build-time) resolved the palette **once, in the light scheme**, baked that
hex into a static SVG, and embedded it. On a `section.dark` slide the baked
light values can't flip — the SVG is frozen. CSS overrides were the patch.

The **runtime** (`lib/runtime/index.js`, client-side preview) never had this
problem: `buildMermaidThemeVars()` reads tokens live via `getComputedStyle` +
a probe `<span>` whose `color-scheme` is inherited from the diagram's
`<section>`, so `light-dark()` resolves to the correct branch **per section**.
The runtime was already correct; the emulator was the odd one out.

## Decision

**Bring the emulator up to the runtime's standard (dual-render), then delete the
override layer the bake now makes redundant.**

1. **Dual-render (emulator).** `parsePaletteVars(css, forceDark)` resolves the
   palette twice — light branch and dark branch of every `light-dark()`. Each
   Mermaid fence is baked with the scheme of *its* slide: `preprocessMermaid`
   detects dark per-fence (nearest `<!-- _class: … dark -->` wins; deck-wide
   `class: dark` / `color-scheme:dark` is the fallback; a dark *theme* is
   detected by `parsePaletteVars` reading `:root { color-scheme:dark }`).
   Per-slide, not dual-emit-both — single-scheme decks get no second SVG.
   `LATTICE_MERMAID_SINGLE=1` reverts to the old single-light bake + overrides.

   This is the **build-time sibling** of the runtime's `getComputedStyle`
   resolution: same themeVar→token map, same per-section dark logic, same
   no-hardcoded-hex contract. The emulator parses the palette CSS file because
   mmdc has no live DOM to query.

2. **Prune.** Removed the dark-flip override blocks: edge/transition/relationship
   labels, monochrome edge lines + arrowheads, sequence lifelines, sequence
   message text/lines, gantt section titles, ER entity-box leveling + ink. Each
   was proven redundant by a **0-pixel diff** on the dark gallery before/after
   removal (the bake now produces identical output). ER *improved* — entity
   headers show their brand category colour instead of the flat `--bg-alt` level
   the override forced (this also resolves the header-contrast issue the layout
   audit's `VERIFICATION.md` had deferred as unsolvable under single-bake).

## What still needs a CSS override (and why)

A CSS override earns its place **only** when no themeVariable controls the
surface. Four cases remain, all documented inline in `mermaid.css`:

| Override | Why it's not reachable by dual-render |
|---|---|
| journey axis + task connectors; timeline axis (`line:not(.mouth)`) | Mermaid emits these as inline `stroke="black"` — no themeVar feeds them. |
| `treeView-node-label` / `treeView-node-line` | `treeView-beta` bakes `fill:black` / `stroke:black` in its own injected `<style>`, ignoring the `labelColor`/`lineColor` themeVars it claims to honour. |
| `.marker` / `.arrowMarkerPath` fill | ER crow's-foot markers render *unfilled* by default; fill them with `--c-line` so terminals read as solidly as flowchart arrowheads (a style choice, both modes). |
| ER `.row-rect-even/odd` | Mermaid 11 derives one zebra band by lightening the primary → off-palette stray; pin both bands for determinism. |
| journey mood-face fill/eyes/mouth; actor pills; mindmap branch saturation | Design choices (faces on-brand, pills on category colour) and a legibility lift for the too-dark `cScale` branch tone. |

None use hex literals — every value is `var(--token)`.

## Parity note

The themeVar→token map lives in two hand-maintained copies — the emulator's
`MERMAID_VAR_MAP` and the runtime's `buildMermaidThemeVars()`. They agree today
(same themeVars → same tokens; `--c-ink-light` aliases `--text-heading` in the
shipped palettes). If you touch one, mirror the other. The shared `mermaid.css`
overrides serve **both** paths (the runtime renders the same hardcoded surfaces).

## Verification

- 0-pixel diff on flowchart/sequence/class/state/gantt dark after override
  removal; ER and treeView are the only intended deltas.
- Full diagram gallery (31pp) rebuilt light + dark; only ER (colour headers) and
  treeView (now legible) changed beyond anti-alias noise.
- 838 unit + 176 integration (cross-renderer parity) green.
- Visual spot-check of journey, ER, treeView, and the 7 common types in both
  schemes via `tools/rasterize-for-review.sh`.
