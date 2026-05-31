---
status: design + full rollout (13 themes)
date: 2026-05-31
branch: claude/design-tokens-color-audit-Mcjz5
extends: 2026-05-29-color-token-recuration.md (the cN decouple + --chart-N introduction)
---

# Bespoke per-theme chart palette — vividness scaled to temperament

## Where this picks up

The 05-29 pass decoupled the chart marks from the Mermaid-constrained `cN`
tokens by introducing `--chart-1 … --chart-8`, and proved it on indaco with
**literal Apple system colours** (`#007AFF`, `#FF9500`, …). That was slice 1:
a decouple proof, not a finished palette. Two problems remained:

1. Indaco wore *borrowed* hues. systemBlue is not indaco's slate-blue. The
   palette read clean but generic — it would have looked transplanted next
   to the other twelve themes' own colours.
2. The other twelve themes had **no** `--chart-N` and fell back to
   `--cN-light` (pale Mermaid fills) — grey-on-grey for the achromatics,
   washed pastels for the chromatics. At 8 wedges this fails distinctness.

## The decision

Every theme gets its **own** eight chart marks. Apple's *discipline* is kept
(two hand-tuned variants per slot — light deepened for white canvas, dark
brightened to pop on near-black; perceptually distinct; self-sufficient), but
**no theme uses Apple's hues**. Indaco is rebuilt from its slate-blue lead.

Crucially, **vividness is scaled to each theme's temperament** — a single
uniform chroma across all themes was rejected as the thing that made the old
`cN` fallback feel characterless.

### The bespoke input (the design), the disciplined output (the tool)

`tools/build-chart-palette.js` holds a per-theme `SPEC`. The artistic decision
lives there as data:

- **lead** — the theme's signature hue → `--chart-1` (primary series).
- **hues[8]** — hand-picked angles, **ordered for adjacency**: consecutive pie
  wedges, and the slot-8↔slot-1 wrap, stay far apart in hue.
- **chroma** — the temperament ceiling (see ladder below).
- **lLight / lDark** — OKLCH lightness per canvas (light deepened so white
  wedge labels stay legible; dark lifted so marks pop on black).

The tool runs each (L, C, H) through the same gamut-clamped OKLCH→sRGB used by
`build-categorical.js`, so every emitted value is real, in-gamut, and in the
legible L band by construction. Output lands between `/* CHART-PALETTE:START */`
sentinels; `npm run build` regenerates, `--check` gates stale, exactly like the
categorical tier. Never hand-edit the block — edit `SPEC.<theme>`.

### Temperament ladder

| Tier | Themes | Mode | Chroma |
|---|---|---|---|
| Bold / modern | indaco, laguna, mustard | chromatic | 0.145–0.150 |
| Heritage / restrained | brina, crepuscolo, cuoio, burgundy, magnolia | chromatic | 0.110–0.125 |
| Accent-carrier achromatic | carbone, ardesia, atelier | muted | 0.050–0.055 |
| Purist achromatic | onyx, concrete | mono + 1 pop | 0 (grey) + 1 accent |

Each theme leads with its own hue: indaco slate-blue (250°), laguna aqua (195°),
mustard gold (88°), brina frost (232°), crepuscolo violet (295°), cuoio ochre
(78°), burgundy oxblood (18°), magnolia rose (350°).

### The achromatic fork — three options, decided by eye

A standalone bake-off rendered an 8-wedge pie under onyx three ways (see
the session proof). Findings:

- **Pure grey ramp (today's fallback)** — *ruled out.* The pale odd-slot greys
  vanish into white; 8 wedges are not separable.
- **Mono + one pop** — austere, unmistakably onyx, readable. Best identity fit
  for a pure black/white theme.
- **Muted multi-hue** — best raw distinctness, but on a pure b/w theme it reads
  *borrowed* (onyx stops looking like onyx). On a theme that already carries an
  accent (carbone's electric-green stroke), the same muted hues look **native**.

Decision: **split.** Purists (onyx, concrete) get **mono + one signature pop**
(onyx steel-blue, concrete warm clay). Accent-carriers (carbone, ardesia,
atelier) get **muted multi-hue**, harmonised by the accent they already own.

carbone is dark-only (`color-scheme: dark`), so its marks emit as single values,
not `light-dark()` pairs — matching how its `cN` tokens are written.

## Green + no churn

- `npm test` 826/826; `npm run build` clean behind the ownership gate.
- `npm run audit:contrast`: **0 AA failures across 1,352 pairs**, 0 slot hue
  splits, 0 status collisions. (Below-floor warnings are the decorative
  hairline-on-canvas pairs, intentional per the palette contract.)
- No layout / chart / Mermaid **selector** changes — values only. The pie reads
  `var(--chart-N, var(--cN-light))`; the fallback path is untouched for any
  consumer not yet drawing from `--chart-N`.

## Files

- `tools/build-chart-palette.js` — generator + the per-theme SPEC (the design).
- `tools/build.js`, `package.json` — wired as a build step + `chart:build` /
  `chart:check` scripts, mirroring the categorical tier.
- `themes/*.css` — generated `CHART-PALETTE` block in all 13.
- `dist/lattice-default.css` — regenerated (default bundle flattens cuoio).
