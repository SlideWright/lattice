---
status: design-decision
last-updated: 2026-06-16
companion:
  - ./2026-06-16-colour-blindness-accessibility.md
  - ../../design/theming.md
  - ../../lib/theme/cvd.js
  - ../../tools/cvd-audit.js
---

# CVD accommodation needs redundant encoding — colour alone can't carry categories

**Symptom / finding.** The parent decision (`2026-06-16-colour-blindness-accessibility.md`)
planned curated CVD palettes as v1, with redundant encoding (patterns/markers)
as a phase-2 *enhancement*. Building the palettes against the new CVD audit
(`tools/cvd-audit.js`) proved that framing wrong. Measuring the **maximum number
of categories that stay distinct (OKLab ΔE ≥ 0.15) under dichromacy**, using
greedy farthest-point selection in the *simulated* colour space — i.e. the best
a palette can possibly do — within the lightness bands the contrast contract
allows (dark ink on fills, white ink on marks):

| Tier (where categories live) | Max distinct under dichromacy |
|---|---|
| **Pale fills** — the light-deck categorical surface (timeline, kanban, pie, journey, mindmap…) | **1–2** |
| **Deep marks** — strokes / dark-deck fills | **4–5** |
| Semantic signals (pass / warn / fail) | 3 — achievable |

**Root cause (physical, not tuning).** Each dichromacy collapses hue to ~one
dimension, leaving luminance as the only reliable axis. The contrast contract
pins each tier to a narrow luminance band (a fill must stay light enough for
dark ink; a mark dark enough for white ink). Pale low-chroma tints all map to
near-white under simulation, so the **dominant light-deck categorical surface
collapses to 1–2 distinguishable colours no matter how cleverly the palette is
chosen.** No palette can beat this; it's a property of the deficiency × the
contract, confirmed empirically across all three dichromacies.

## Decision

**Redundant non-colour encoding is mandatory for the categorical/chart case, not
a phase-2 nicety. Build it together with the palettes.** Colour becomes one
*redundant* channel (it still helps anomalous trichromats and carries the
semantic trio); shape/texture carries the categorical distinction that colour
cannot.

Three encoding channels, by surface:

1. **Categorical texture patterns** — a per-index texture (hatch / dot / grid /
   diagonal / cross…) layered *over* the token colour, so meaning survives when
   the colours collapse. Palette-blind (the texture is colour-agnostic; the
   colour still comes from `--cat-N-fill`), scoped to accessibility mode only.
2. **Semantic glyphs** — `✓ / ! / ✗` (or equivalent) on pass / warn / fail, so
   status never rides on red-vs-green alone. Highest-value, smallest surface.
3. **Line-style variation** — solid / dashed / dotted for line-based diagrams
   (xy-chart series, radar curves), where a texture fill doesn't apply.

**Achromatopsia re-enters v1.** It was deferred only because palette-only
couldn't serve it; once texture carries the distinction (colour-independent),
total colour-blindness is served by the same mechanism. v1 now targets **all
four** types — the three dichromacies (colour + texture) and achromatopsia
(luminance + texture).

## Mechanism

Activation rides the resolver already built (`lib/core/resolve-accessibility.js`):
when an accessibility palette is active, the engine stamps **`data-a11y="<type>"`
on the root**, and the patterns/glyphs are CSS scoped to `:root[data-a11y] …`
so they apply *only* in accessibility mode and never touch a normal deck.

- **CSS-rendered categorical** (decision lists, roadmap, kanban cards, actor
  pills, kpi, comparison cells): a palette-blind block in `lattice.css` —
  `:root[data-a11y] <cat-cycle>:nth-child(Nn) { background-image: <texture-N>, … }`
  layered over the existing `var(--cat-N-fill)`. 12 textures, defined once.
- **Semantic glyphs**: `:root[data-a11y] .status--pass::before { content: "✓" }`
  etc., reusing the existing status-pill vocabulary.

The open fork is **how the texture reaches inline Mermaid/chart SVGs**, where a
rect's fill is `var(--cat-N-fill)` and CSS cannot synthesise pattern geometry:

- **M1 — kernel-injected `<defs>`.** A shared transform in `lib/core` injects a
  colour-neutral `<pattern>` `<defs>` set into each inline diagram SVG when
  `data-a11y` is set, and the DIAGRAM OVERRIDES layer the texture via
  `fill: url(#a11y-pat-N)` over the colour. Lands in the shared kernel so BOTH
  render paths (owned engine + runtime) stay in step (HARD RULE #1). Robust,
  but new SVG-transform surface.
- **M2 — CSS-only overlay.** No SVG defs; approximate texture with CSS on the
  SVG host (e.g. a masked overlay element). Less code, but fragile across
  diagram types and the two Chromium/owned-engine renderers, and weaker on
  arbitrary shape paths.

**Decision: M1** — it's the only approach that reliably covers every diagram
type on both render paths, and it keeps colour in tokens (HARD RULE #3).

## Build sequence (supersedes parent doc steps 3–6)

1. Curated CVD palettes (4 × light/dark) — tuned for what colour *does* carry:
   the semantic trio + the deep-tier categorical set + best-effort fills.
2. Categorical texture patterns — CSS components first (tractable, high cover),
   then the M1 SVG-defs transform for diagrams/charts.
3. Semantic glyphs + line-style variation.
4. Resolver wiring (engine stamps `data-a11y`) + the `--strict` CVD gate over
   the palettes (now asserting the *colour* layer's semantic/deep distinctness,
   with patterns covering the categorical ceiling).
5. Demo deck (rendered in light + dark for every type) for owner sign-off —
   export-affecting, so it STOPS for inspection per CLAUDE.md.
6. Drawing Board workspace toggle (parent doc step 4).

**Status: design-decision** — finding verified empirically 2026-06-16. Direction
agreed: patterns + palettes together; achromatopsia back in v1 (all four types);
SVG textures via M1 (kernel-injected `<defs>`).
