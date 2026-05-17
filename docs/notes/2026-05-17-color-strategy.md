# Color strategy — role-named tokens, no opacity on marks, contrast solver

**Date:** 2026-05-17
**Branch:** `claude/fix-chart-color-harmony-cTImT`
**Status:** design — no CSS edits yet, locking direction before token + tool work

## Why

A multi-turn iteration on chart-family color harmony (this branch) cycled
through six different treatments for the progress / gantt status bars
and ended with the user asking to revert and start over. The churn
exposed a deeper problem: the existing token system can't answer "which
color does my chart element want?" with a single right answer. Designer
intuition and per-component opacity tricks fill the gap, and the
resulting decks read as five different palettes instead of one.

This note captures the diagnosis and the agreed strategic direction.
No code lands until the design is locked in writing.

## Diagnosis — what the audit found

A read across `lib/components/{piechart,radar,gantt,kanban,progress,timeline-list,quadrant}/*.styles.css`,
`lib/chart-family/*`, and `lib/integrations/mermaid/mermaid.css`
surfaced five failure modes:

### 1. Opacity does undocumented work in marks

| Site | Manipulation | Resolved as |
|---|---|---|
| `lib/components/radar/radar.styles.css:90` | `fill-opacity: 0.30` on `.radarCurve` | series color at 30% alpha |
| `lib/components/radar/radar.styles.css:145` | `color-mix(var(--series-color) var(--radar-fill), transparent)` where `--radar-fill: 18%` | series at 18% alpha |
| `lib/components/quadrant/quadrant.styles.css:240,246,260,266` | `opacity: 0.6 – 0.7` on bubble layers | mark dimmed without changing hue |
| `lib/components/gantt/gantt.styles.css:136` | `color-mix(var(--pass) 70%, var(--bg-alt))` | status hue tinted toward canvas |
| `lib/components/progress/progress.styles.css:49` | `color-mix(var(--accent) 70%, var(--bg-alt))` | accent tinted, no `data-s` |
| `lib/components/timeline-list/timeline-list.styles.css:38–41` | `color-mix(var(--accent) 12%–55%, transparent)` | accent fade per gradient stop |

What the token *says* (`var(--pass)`) and what the pixel *shows*
(70% of pass over bg-alt) are different colors. The same `--pass`
renders at full saturation in progress, mid-saturation in gantt, and as
a translucent stroke in radar's delta indicator. Authors and reviewers
can't trust the token name.

### 2. No two charts pick the same token register

| Chart | Reads | Pattern |
|---|---|---|
| piechart | `--c1-dark..--c6-dark` only | direct, no mix |
| radar | `--c1-light` (graticule) + `--accent` (curve-0) + `--c-accent-warm` (curve-1) + `--pass`/`--fail` (delta) + RADAR_PALETTE `--cN-dark` (series) | hybrid, five sources |
| gantt | `--accent` (default) + `--pass`/`--warn`/`--fail` at 70% mix | status-dominated |
| progress | `--accent` (default) + raw `--pass`/`--warn`/`--fail` | raw status |
| kanban | `--accent` (chrome) + `--pass` (done header) + `--cN-light` (mermaid bands) | three families |
| timeline-list | `--accent` only, at 12–55% opacity | single token + alpha |
| quadrant | `--c-quadrant-N-fill/-text` (positional) + `--cN-light`/`--cN-dark` (cohort) + `--text-muted` (grid) | paired + positional |

Seven charts, seven token recipes. Adding a chart means inventing an
eighth. Re-theming means auditing each component's individual decision
tree.

### 3. `--accent` is overloaded across five roles

The same `--accent` is read as:
- primary data mark (gantt default bar, `gantt.styles.css:118`)
- chart chrome edge (kanban column border, `kanban.styles.css:48`)
- decorative gradient (timeline spine 12–55% fade, `timeline-list.styles.css:38–41`)
- header underline (quadrant frame, `quadrant.styles.css:98`)
- chart-frame lucent strip (`chart-family.css:85–86`)

A theme swap of `--accent` (sky-blue → brand-red) silently shifts
semantic meaning in gantt (the bar is no longer "the default series"
but "the red series") while also restyling every chart's chrome.
Decoration and data ride the same token; they shouldn't.

### 4. Status hue and category hue live on parallel axes

Charts that mix them (kanban: `--pass` for done column + `--cN-light`
for mermaid bands; gantt: `--pass`/`--warn`/`--fail` bars next to a
`--accent` default) end up with arbitrary inter-chart harmony. There
is no contract that "slot 3 is green" or "slot 2 is amber." Status
semantics float free of the categorical palette.

### 5. Authoring contract is brightness-named, not role-named

`--c1-light` describes APPEARANCE (pale). When a designer authors a
new chart, they ask "is my element pale or saturated?" — a question
about pixels. They should be asking "is my element primary data,
supporting data, or chrome?" — a question about meaning.

Apple HIG names tokens by role (`systemFill`, `secondarySystemFill`,
`tertiarySystemFill`) precisely to take that decision off the
designer. Material 3 does the same with tonal palette roles
(`primary`, `secondary-container`, `surface-variant`). IBM Carbon
publishes a "data viz" subset of tokens that are named by ROLE in the
chart (`--cat-1`, `--quant-fill`, `--quant-stroke`) and explicitly
ban opacity manipulation on marks.

Mermaid is the reference because it uses ONE recipe everywhere:
- Fill: `var(--cN-light)` at 100% opacity, paired ink contrast
- Stroke: `var(--c-stroke)` (theme-defined brand structural edge)
- Text: `var(--c-ink-light)` (chameleon dark/white paired to fill)
- No opacity, no per-diagram override

That's the north star. The chart-family is what's drifted.

## The chosen strategies

The user picked **strategies 1 + 3 + 5** from a five-option memo
(role tokens / single cycle / no-opacity marks / status as slot /
contrast solver). Strategies 2 and 4 are deferred — they are deeper
refactors that would touch every component file. The chosen combo
changes token files + adds one tool, leaves most component CSS
untouched.

### Strategy 1 — Role-named tokens *(Apple HIG move)*

Replace appearance-named categorical tokens with role-named ones.
Each slot N owns three named tiers, authored explicitly per palette as
chameleon `light-dark()` pairs:

```css
/* TIER 1: primary data — the focal mark */
--mark-primary-N:    light-dark(#…, #…);   /* AA 7:1 vs --c-ink-light */

/* TIER 2: supporting data — dimmer marks, secondary categories */
--mark-secondary-N:  light-dark(#…, #…);   /* AA 4.5:1 vs --c-ink-light */

/* TIER 3: chrome — grid lines, frames, decorative bg tints */
--mark-chrome-N:     light-dark(#…, #…);   /* decorative, no AA gate */
```

Twelve slots × three tiers × per-palette = 36 explicit `light-dark()`
declarations per theme. Generated by the solver (Strategy 5), not
hand-typed.

The status palette gets the same three-tier treatment but on its own
namespace:

```css
--status-pass-primary:   light-dark(#…, #…);
--status-pass-secondary: light-dark(#…, #…);
--status-pass-chrome:    light-dark(#…, #…);
/* same for warn, fail, info */
```

Charts read ROLE tokens, never raw `--cN-*`:

```css
/* Pie wedge — the data, primary tier */
section.piechart .wedge:nth-child(6n+1) { fill: var(--mark-primary-1); }

/* Progress bar — status mark, primary tier */
section.progress .progress-fill[data-s="on-track"] { background: var(--status-pass-primary); }

/* Radar grid — supporting structure, chrome tier */
section.radar .radar-ring { stroke: var(--mark-chrome-7); }
```

The designer's question becomes "is this primary or supporting or
chrome?" That decision is repeatable across components without
reaching for color theory.

**Component impact:** every `--cN-light` / `--cN-dark` / `--pass` /
`--warn` / `--fail` reference inside `lib/components/` and
`lib/chart-family/` re-points to the appropriate `--mark-*` /
`--status-*` token. Mermaid's `lib/integrations/mermaid/mermaid.css`
re-points too (its `--cN-light` becomes `--mark-secondary-N` since
mermaid bands are containers, not the data inside them).

### Strategy 3 — Forbid opacity on marks *(IBM Carbon data-viz rule)*

Marks (any pixel encoding data) NEVER carry:
- `opacity`
- `fill-opacity`
- `stroke-opacity`
- `color-mix(... transparent)`
- `color-mix(... var(--bg))` or `color-mix(... var(--bg-alt))`

Opacity is reserved for CHROME (grid lines, axis labels, dividers,
gradient frames). If a chart needs a paler mark, that's a different
*tier* (secondary or chrome from Strategy 1), not the same token with
alpha.

**Enforcement:** add a lint rule. Either a `biome` custom rule (if
biome supports CSS), or a project-local script
(`tools/check-mark-opacity.js`) wired into the `pre-commit` lefthook
that grep-fails on `opacity:` / `*-opacity:` / `color-mix(* transparent`
in any `lib/components/*/styles.css` selector that's not explicitly
tagged `/* chrome */` or under a `.chart-grid` / `.axis-label` selector.

Existing offenders to refactor away:
- `radar.styles.css:90` (curve fill-opacity) → use `--mark-secondary-N`
- `radar.styles.css:145` (series at 18% alpha) → use `--mark-secondary-N` at solid
- `quadrant.styles.css:240,246,260,266` (bubble opacity) → use `--mark-secondary-N`
- `gantt.styles.css:136` (status 70% mix) → use `--status-pass-primary` directly
- `progress.styles.css:49` (accent 70% mix) → use a new `--mark-primary-default` token
- `timeline-list.styles.css:38–41` (accent fade) → keep (gradient frame is chrome, allowed)

### Strategy 5 — Contrast solver

Author specifies HUE per slot + AA target per tier. A build-time
solver computes OKLCH luminosity to hit the target against the paired
ink token. Inspired by Adobe Leonardo and contrast-grid.

**Author input** (per palette, e.g. `themes/indaco.palette.yaml`):

```yaml
palette: indaco
inks:
  primary:   { light: '#0A1628', dark: '#FFFFFF' }   # --c-ink-light
  prominent: { light: '#FFFFFF', dark: '#0A1628' }   # --c-ink-dark
slots:
  - hue: 212  # blue (brand)
  - hue:  55  # yellow
  - hue:   0  # red
  # ... 12 total OKLCH hues
tiers:
  primary:   { aa: 4.5, paired: primary,   register: prominent }
  secondary: { aa: 4.5, paired: primary,   register: recessive }
  chrome:    { aa: 1.5, paired: bg,        register: chrome    }
status:
  pass: { hue: 142, ... }
  warn: { hue:  35, ... }
  fail: { hue:   0, ... }
  info: { hue: 212, ... }
```

**Tool output** (`themes/indaco.tokens.generated.css`):

```css
:root {
  /* generated 2026-05-17 by tools/solve-palette.js
   * source: themes/indaco.palette.yaml
   * DO NOT EDIT — re-run `npm run palette:solve indaco` */
  --mark-primary-1:    light-dark(#1F5283, #B0D2EE);
  --mark-secondary-1:  light-dark(#C6DCED, #2A6190);
  --mark-chrome-1:     light-dark(#EAF1F8, #1B3853);
  /* ... 11 more slots × 3 tiers ... */
  --status-pass-primary:   light-dark(#1F6B33, #6FD589);
  /* ... etc ... */
}
```

**Tool mechanics:**
1. For each `slot × tier × canvas mode` (12 × 3 × 2 = 72 derivations),
   take the slot hue and target AA, binary-search OKLCH lightness
   until the contrast against the paired ink hits target ± 0.05.
2. For "register" guidance (prominent / recessive / chrome), bias the
   starting luminosity (prominent ≈ L 30–40 on light / L 70–85 on
   dark; recessive ≈ L 80–88 on light / L 25–35 on dark; chrome ≈
   L 92–96 on light / L 14–22 on dark).
3. Emit the `light-dark()` pair as hex.
4. Self-verify by running the existing `test/unit/palette/contrast.test.js`
   WCAG formula against every emitted token before writing the file.
   Fail loudly if any pair misses target.

**Contrast report** (`themes/indaco.contrast.md`), also generated:

```markdown
# indaco — contrast report

| Token | Mode | Hex | Paired ink | Hex | Ratio | WCAG |
|-------|------|-----|------------|-----|-------|------|
| --mark-primary-1   | light | #1F5283 | --c-ink-dark  | #FFFFFF | 8.42:1 | AAA |
| --mark-primary-1   | dark  | #B0D2EE | --c-ink-dark  | #0A1628 | 11.91:1 | AAA |
| --mark-secondary-1 | light | #C6DCED | --c-ink-light | #0A1628 | 13.04:1 | AAA |
...
```

Tool size: ~150 lines of Node, using `culori` (already a transitive dep
or easily added) for OKLCH ↔ sRGB conversion. Wired into `package.json`
as `npm run palette:solve <name>` and `npm run palette:solve:all`.
Re-run on palette file change; checked into git.

## Migration plan

Once the design is locked:

### Phase 1 — Solver + indaco regeneration *(low risk)*
1. Write `tools/solve-palette.js` + author `themes/indaco.palette.yaml`
   reverse-engineered from current hexes.
2. Generate `themes/indaco.tokens.generated.css`.
3. Visually diff old vs. new indaco rendering (build gallery + chart
   experiment, pixel diff). Land tweaks to the input YAML until visual
   parity is acceptable (intent: improvement, not pixel-perfect).
4. Land the solver, the YAML, and the generated tokens; existing
   components still read old `--cN-*` names (kept as aliases for now).

### Phase 2 — Cuoio + remaining palettes *(low risk)*
Reverse-engineer the other 11 light themes into YAML, regenerate.
Aliases keep existing components working.

### Phase 3 — Component refactor to role tokens *(medium risk)*
Walk every `lib/components/*/styles.css` and `lib/chart-family/*` and
re-point each `--cN-light`/`--cN-dark`/`--pass`/etc. reference to the
appropriate `--mark-*` / `--status-*` token. Delete the alias layer
once nothing reads it.

Mermaid's overrides re-point to `--mark-secondary-N` since mermaid
bands are containers, not data. Pie wedges, radar polygons, kanban
lane stripes, progress bars all go to `--mark-primary-N` /
`--status-*-primary`.

### Phase 4 — Opacity ban enforcement *(low risk, high signal)*
Refactor the six identified offenders (radar 0.30 fill, radar 18%
series, quadrant bubble opacity, gantt status 70% mix, progress
accent 70% mix, kanban opacity sites). Each becomes a direct token
read of a `--mark-secondary-*` or `--status-*-secondary` (the
authored pale tier), not an alpha derivation.

Add the pre-commit lint script (`tools/check-mark-opacity.js`) to
catch regressions.

### Phase 5 — Documentation *(small)*
Update `docs/theming.md` with the role-naming contract + the "no
opacity on marks" rule. Add `docs/references/palette-authoring.md`
explaining the YAML format and how to add a new palette. Cross-link
from this note.

## Chart-status namespace (added 2026-05-17 after Phase 1 review)

Phase 1's solver output revealed a deeper inconsistency: charts have
been reading `--pass`, `--warn`, `--fail` — but those are UI-semantic
tokens (form validation, alerts), not chart-data-semantic. The two
namespaces have different visual needs (alert pill vs project status
bar), and the same token forced to serve both ends up compromised in
either context.

**Decision:** charts get their own status namespace, curated for the
chart palette and named for chart-data semantics (not "did this form
field pass").

### Vocabulary

Five statuses, sentiment-style (chosen over engineering-style and
consulting-style for boardroom universality in BI / finance contexts):

| Status | Maps from existing `data-s` vocabulary |
|---|---|
| `positive`    | on-track / done / live / shipped / complete / healthy |
| `neutral`     | at-risk / warn / pending / in-progress / monitoring |
| `negative`    | blocked / fail / critical / overdue / declining |
| `inactive`    | deferred / paused / parked / N/A |
| `exploratory` | pilot / decision / hypothesis / branch |

### Two-register universal model

Each status has TWO register variants, both universal (same hex
everywhere each is read; the chart picks based on geometry):

```
--chart-positive-fill    /* pale recessive — large surfaces (mermaid bands, pie wedges, progress bar fills) */
--chart-positive-mark    /* saturated prominent — narrow accents (kanban lane stripes, axis ticks, pie wedge outlines) */
```

5 statuses × 2 registers = **10 tokens total** in the chart-status
namespace. Same naming everywhere, value picked by register.

Per-chart scope override is allowed in the cascade but should be rare
and documented (e.g., if gantt's "done" column intentionally wants a
deeper shade than universal positive-mark). Most components just read
the appropriate register.

### Solver integration

Chart-status tokens are emitted by the same solver pass as the
categorical cycle. Status entries in the input JSON look like:

```json
"status": {
  "positive":    { "hue": 142, "label": "green" },
  "neutral":     { "hue":  60, "label": "amber" },
  "negative":    { "hue":   8, "label": "red" },
  "inactive":    { "neutral": true, "label": "gray (achromatic)" },
  "exploratory": { "hue": 220, "label": "blue (brand accent)" }
}
```

Each status reuses the recessive + prominent tier specs (AA targets,
lightness ranges). Solver emits `--chart-{name}-fill` and
`--chart-{name}-mark` per status. Verified through the same WCAG
self-check.

### Component refactor

Components stop reading `--pass`, `--warn`, `--fail` and read the
chart-status tokens. For backward-compat during the migration, each
reference uses a fallback:

```css
section.progress .progress-fill[data-s="on-track"] {
  background: var(--chart-positive-fill, var(--pass));
}
```

Themes that haven't generated the chart-status namespace yet render
unchanged (fall back to `--pass`). Themes that have generated them
pick up the curated chart-context palette.

Charts to refactor in Phase 3 of the migration:
- `lib/components/progress/progress.styles.css` (✓ done in this branch)
- `lib/components/gantt/gantt.styles.css`
- `lib/components/timeline-list/timeline-list.styles.css`
- `lib/components/kanban/kanban.styles.css` (status pill colour)
- `lib/chart-family/chart-family.css` (the shared `.chart-status` pill)
- `lib/components/radar/radar.styles.css` (the `--pass` / `--fail` delta indicators)

`--pass` / `--warn` / `--fail` stay in `lib/base/base.tokens.css` for
the UI use cases that genuinely need them (form validation, alerts,
inline status badges that ARE about success/failure semantics, not
about chart-data direction).

## Open decisions deferred

1. **Tier count: 3 vs. 4.** Apple ships four (`systemFill`,
   `secondarySystemFill`, `tertiarySystemFill`, `quaternarySystemFill`).
   Carbon ships three. We picked 3 (primary / secondary / chrome).
   Revisit if real charts need a fourth tier.

2. **Slot count: 8 vs. 12.** Currently 12. Likely keep 12, but the
   solver makes it cheap to drop to 8 if perceptual collisions appear
   at the high end of the cycle.

3. **Solver tooling:** Node script (~250 LOC currently) vs. integrate
   a real library like `culori`. Start with raw Node (`color` package
   or inline OKLCH math) for footprint; switch if needed.

4. **The `--accent` overload.** Strategy 1 doesn't fully resolve it
   yet — `--accent` will still be read by chart-frame chrome and by
   gantt's default-bar fallback. The clean fix is to introduce
   `--chart-accent` (primary mark default) separate from `--accent`
   (brand chrome). Plan this in Phase 3.

5. **Per-chart scope overrides of chart-status tokens.** Allowed but
   discouraged. If a real per-chart aesthetic emerges that needs a
   different register (e.g., gantt's "done" deeper than universal
   positive-mark), document the override in this note and the relevant
   component's docs comment.

## References

- **Apple HIG — Color**: <https://developer.apple.com/design/human-interface-guidelines/color>
- **Apple HIG — System colors / fills**: <https://developer.apple.com/design/human-interface-guidelines/color#System-colors>
- **Material 3 — Tonal palette + color roles**: <https://m3.material.io/styles/color/roles>
- **IBM Carbon — Data visualization color**: <https://carbondesignsystem.com/data-visualization/color-palettes/>
- **IBM Carbon — Color reads "no transparency on data"**: <https://carbondesignsystem.com/data-visualization/getting-started/#accessibility-considerations>
- **Adobe Leonardo (solver-based contrast)**: <https://leonardocolor.io/> and <https://github.com/adobe/leonardo>
- **WCAG 2.1 — Contrast (AA = 4.5:1, AAA = 7:1)**: <https://www.w3.org/TR/WCAG21/#contrast-minimum>

In-repo:
- `docs/references/design-system.md` — current four-layer model (Function · Form · Substance · Finish)
- `docs/theming.md` — palette tokens (will be updated in Phase 5)
- `docs/references/mermaid.md` — mermaid contract (the north star)
- `lib/integrations/mermaid/mermaid.css` — the reference recipe
- `test/unit/palette/contrast.test.js` — WCAG formula reused by the solver
