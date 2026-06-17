---
status: shipped
summary: Register of layouts that landed without going through the May 4 / May 7 speculative-proposal catalogues
---

# Layouts shipped without a prior proposal note

A register of layouts and layout families that landed in `templates.md`
without going through the May 4 / May 7 speculative-proposal catalogues.
Each entry names what shipped, where it lives in `templates.md`, the
companion deck (if any), and whether a dated design note exists.

This is housekeeping, not history. When a layout ships outside the
catalogue, add an entry here so the next reviewer can find the
authoring contract and the design rationale (if any) in one place.

## Scope

This register tracks layouts that shipped without appearing in either
of the two speculative-proposals notes:

- [`2026-05-04-authoring-proposals.md`](2026-05-04-authoring-proposals.md)
- [`2026-05-07-chart-family-proposals.md`](2026-05-07-chart-family-proposals.md)

A layout that has a dated design note of its own (e.g. `kpi`,
`roadmap`, `radar`) is still listed here when the design note didn't
flow from the catalogues — the catalogues had no prior entry for it.

## Entries

### `word-cloud` — spiral-packed weighted word cloud

- **Canonical reference.** [templates.md — `word-cloud`](../references/templates.md).
- **Companion deck.** `examples/word-cloud.md` (+ `.pdf`).
- **Design note.** None. Implementation note in the originating PR.
- **Brief.** Flat list of words; trailing inline code carries weight
  ∈ [1, 5]. `lib/word-cloud.js` sorts, sizes, colours, and packs via
  an Archimedean spiral at build time. Five variants
  (`constellation` / `dense` / `spectrum` / `focal` plus default).

### Split family — `split-brief`, `split-metric`, `split-steps`, `split-compare`, `split-statement`

- **Canonical reference.** Templates 30–34 in [templates.md](../references/templates.md).
- **Companion deck.** `examples/gallery.md`.
- **Design note.** None. Shipped as a coherent five-layout family
  from the same design pass.
- **Brief.** Section dividers on steroids: left dark panel + right
  content half, each variant carrying a different right-side shape
  (brief lede, hero metric, numbered steps, two-card compare, single
  display statement).

### `quadrant` — native 2×2 chart-family member

- **Canonical reference.** The `quadrant` entry under "New Layouts"
  in [templates.md](../references/templates.md).
- **Companion deck.** `examples/quadrant.md` (+ `.pdf`).
- **Design note.** None — chart-family member, shipped under the same
  `chart-frame` shared skeleton as `radar`, `progress`, etc.
- **Brief.** Numeric-coordinate 2×2 chart. 1 default + 5 modifiers
  (`bubble` / `trail` / `cohort` / `threshold` / `magic`). Distinct
  from `matrix-2x2` (§3.1 of May 4 note), which is a content-quadrant
  layout — `quadrant` plots points on numeric axes.

### `radar` — native radar / spider chart

- **Canonical reference.** The `radar` entry under "New Layouts" in
  [templates.md](../references/templates.md).
- **Companion deck.** `examples/radar.md` (+ `.pdf`).
- **Design note.** [2026-05-15-radar-chart.md](2026-05-15-radar-chart.md)
  — series-major authoring contract, six-variant lineup, geometry
  kernel rationale.
- **Brief.** 1 default + 5 modifiers (`target` / `delta` / `benchmark`
  / `quadrant` / `small-multiples`). Build-time SVG via
  `lib/radar.js`; same chart-family skeleton as the May 7 chart
  layouts.

### Math family — 7 layouts

- **Canonical reference.** The `math` entries in
  [templates.md](../references/templates.md).
- **Companion deck.** `examples/math.md` (+ `.pdf`).
- **Design note.** None.
- **Brief.** Seven boardroom math layouts backed by KaTeX:
  - `math` (default — single expression hero)
  - `math derivation` (multi-step derivation)
  - `math theorem` (statement + proof)
  - `math compare` (two expressions side-by-side)
  - `math canvas` (function-plot graph inset)
  - `math matrix` (matrix display)
  - `math matrix decompose` (matrix factorisation variant)
  - `math stats` (statistical formulas)

### Legal family — 6 layouts × 5 variants each

- **Canonical reference.** The legal-family entries in
  [templates.md](../references/templates.md).
- **Companion decks.** `examples/legal-layouts.md` (full survey) +
  `examples/legal-layouts-finalists.md` (selected variants).
- **Design note.** None.
- **Brief.** Six legal & regulatory layouts:
  - `statute-stack` (citation hierarchy)
  - `obligation-matrix` (compliance grid; shares the universal
    state-token grammar with `checklist` / `roadmap` / `verdict-grid`)
  - `citation-card` (single authoritative reference)
  - `authority-chain` (provenance chain)
  - `regulatory-update` (change log against a baseline)
  - `redline` (clause-by-clause comparison)

### `map` — choropleth / highlight basemap (the `spatial` form)

- **Canonical reference.**
  [`lib/components/chart/map/map.docs.md`](../../lib/components/chart/map/map.docs.md)
  (component docs — `templates.md` is retired).
- **Companion deck.** `examples/map.md` (+ `.pdf`).
- **Design note.** [2026-06-09-map-spatial-form-spec.md](2026-06-09-map-spatial-form-spec.md)
  — the spatial-form rationale, basemap-asset gating question, and projection
  decisions. Spec/design-only at first; built 2026-06-09 (#119). Not from the
  May 7 catalogue.
- **Brief.** A flat `Region \`value\`` list fills a baked SVG basemap. The
  world map is the default (Equal Earth; `robinson` reprojects, `us` swaps in
  the 50-states + DC map). `choropleth` (default) shades a single-hue ramp by
  value; `highlight` colours named regions categorically; `grouped` clusters
  the legend by continent. Names resolve case-/punctuation-insensitively via
  ISO codes, exonyms, and curated aliases; unmatched names are surfaced, never
  dropped. The only component on the `spatial` form. Kernel:
  `map.transform.js`; unit test: `test/unit/components/map.test.js`.

### `logo-wall` — grid of customer / partner / funder logos

- **Canonical reference.**
  [`lib/components/inventory/logo-wall/logo-wall.docs.md`](../../lib/components/inventory/logo-wall/logo-wall.docs.md).
- **Companion deck.** `examples/logo-wall.md` (+ `.pdf`).
- **Design note.** None. Shipped 2026-06-09 (#111) in the industry-coverage
  pass alongside `pricing` and `funnel`.
- **Brief.** A social-proof wall of logos as a CSS-only grid (no kernel).
  Default greyscale for a uniform wall; `color` keeps brand colour, `dense`
  tightens the grid for more logos. Sample SVG logos ship in the component
  directory.

### `pricing` — side-by-side plan tiers

- **Canonical reference.**
  [`lib/components/comparison/pricing/pricing.docs.md`](../../lib/components/comparison/pricing/pricing.docs.md).
- **Companion deck.** `examples/pricing.md` (+ `.pdf`).
- **Design note.** None. Shipped 2026-06-09 (#111) in the industry-coverage
  pass alongside `logo-wall` and `funnel`.
- **Brief.** Plan tiers with prices, feature checklists, and one recommended
  column, as a CSS-only grid (no kernel). `two` / `four` set the column count
  (three is the default).

## What this register is not

- **Not the docs of record.** `templates.md` is the canonical
  authoring reference for every layout — this file is a finding aid.
- **Not a status board.** A layout being listed here just means it
  shipped without going through the May 4 / May 7 catalogues. Whether
  it has a dedicated design note is recorded per entry.
- **Not a regret log.** Several entries (`radar`, `kpi`, `roadmap`)
  have their own design notes that flowed before code. The catalogues
  were never meant to be the only path to a new layout — they are one
  path among several.

## When to add an entry

A new layout earns a register entry when:

1. It lands in `templates.md` with its own section, **and**
2. No prior entry for it exists in either speculative-proposals note.

Layouts that go through the catalogues continue to live there with a
**Shipped** tag pointing back to `templates.md` — no register entry
needed.
