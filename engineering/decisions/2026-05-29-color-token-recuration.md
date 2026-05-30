---
status: design + reference-implementation (indaco proof)
date: 2026-05-29
branch: claude/design-tokens-color-audit-Mcjz5
supersedes-context: 2026-05-12-diagram-tokens.md (the "two independent cycles" decision)
---

# Re-curating the colour tokens — one hue per slot, generated tiers, freedom within a contract

## The reservation that started this

> "We are trying to be everything for everyone and universal. Not a bad
> idea, but themes, diagrams and charts lose artistic/creative freedom.
> The token model leads to weird things between background, border and
> text colour. I don't want to lose the curated nature we had with the
> colour-palette audit. Charts and Mermaid should be cohesive."

This note diagnoses how the token system drifted from the curated audit
into mechanical universalism, names the design axes, records the
direction we locked, and specifies the generator + contract that restores
curation **without** losing the palette-blind engine that makes Lattice
work. The indaco palette is re-curated end-to-end as the reference proof;
the other twelve themes follow in a second pass.

---

## Diagnosis — four concrete drifts

### 1. The categorical system is two unrelated 12-hue palettes sharing an index

`themes/indaco.css` calls it out in its own comment: *"two independent
cycles."* `--cN-light` was tuned as pale diagram fills; `--cN-dark` was
tuned as deep chart marks. They share a **slot index** but not a **hue**.
On a light deck:

| slot | Mermaid node `--cN-light` | Chart wedge `--cN-dark` | same hue? |
|---|---|---|---|
| 1 | `#BCD5EC` pale blue | `#2E608A` deep blue | ✓ |
| 2 | `#EBE2B8` cream | `#863236` garnet | ✗ |
| 3 | `#E7BEBE` rose | `#7B772D` olive | ✗ |
| 4 | `#C1E4D5` mint | `#323686` indigo | ✗ |

A flowchart's "category 2" is cream; a pie chart's "category 2" is
garnet — **on the same deck**. Charts and Mermaid cannot read as one
family because category N is not one colour. This is the cohesion break,
and it is the direct cost of optimising each surface in isolation.

Root cause, found while writing this note: indaco's **deep tier already
matches** the audit's rank-1 Brand-triad proposal (`themes/palette-audit.md`),
but the shipped **pale tier was sourced from a different ordering** and
never re-synced. The audit *had* coherent same-hue pairs (Brand-triad
`L1 #D4DFE8 / D1 #2E608A`, both blue; `L2 #E7D5D6 / D2 #863236`, both
rose). The curation the user loved was real — it just isn't what shipped
in the `--cN-light` tier.

### 2. Status colour is universal-by-inheritance

`--pass / --warn / --fail` are fixed green/amber/red in
`lib/base/base.tokens.css:173`. Only **3 of 13 themes** override any of
them (indaco→pass, cuoio→all three, magnolia→fail). The other ten —
every monochrome theme in the gallery — inherit literal primary red, so a
leather or slate deck sprouts a `#991B1B` badge that belongs to no
palette. Universal by default; curated only by exception.

### 3. The contrast audit went blind

`tools/contrast-audit.js` still audits `--chart-1..6` and
`--mermaid-primary-color` — **tokens deleted in the 2026-05-12 migration**.
Every check silently skips (token undefined → continue). The unit test
`test/unit/palette/contrast.test.js` runs on **2 of 13 themes** (siblings
"inherit by cascade"), checks only text-on-fill, and explicitly exempts
borders, strokes, `--c-line`, accent-on-bg, and body/label ink — i.e. the
exact bg↔border↔text relationships the user flagged are the ones nothing
measures.

### 4. The surface is heavy

~92 colour tokens per theme, 48 in the categorical system alone (12 slots
× {light, dark} = 24, ×13 themes, all hand-maintained). "Everything for
everyone" is literally true: every theme hand-tunes every slot of two
independent ramps.

---

## The design model — three axes

**Axis A · Curation vs derivation.** The audit curated *one hue per slot*
and scored 65 candidates on hue-spread, brand-affinity, and coverage. The
shipped system curates *two unrelated ramps per slot* by hand. The balance
we want: **curate the hue once per slot; derive the two lightnesses.**
Curation where it carries identity; derivation where it is mechanical —
the same move `--scale-*` already makes (one `--scale-500` anchor → nine
derived stops).

**Axis B · Universal vs branded signal.** Status carries meaning, but not
all of it is a safety signal. The balance: status hue is **per-theme
curated** (the freedom), with the engine enforcing a **contract** —
pass/warn/fail must stay mutually distinguishable (OKLab ΔE) and each must
clear AA on the surfaces it appears on. We additionally *recommend* (not
lock) that the error/alarm role read as red, because "red = danger" is the
one status convention an audience reads pre-attentively; a theme that
recolours it owns that trade-off.

**Axis C · Per-surface optimum vs cross-surface cohesion.** Today each
surface is locally optimal, globally incoherent. We rebalance toward **one
categorical identity** shared by charts and Mermaid, accepting slightly
less per-surface hand-polish in exchange for the cohesion the user asked
for.

---

## The Mermaid constraint that pins the model

Mermaid applies **one text colour to every band fill in a diagram** (our
`--c-ink-light` in light mode, flipping to white-on-deep in dark mode).
So all twelve pale fills must clear AA against a *single* dark ink, and
all twelve deep marks against a *single* light ink. Hand-curation honours
this by eyeballing twelve hexes; it drifts the moment one slot is nudged.

A generator honours it **by construction**: clamp the pale tier into a
fixed lightness band (L≈0.90 OKLCH) so every slot clears AA against the
one dark ink, and the deep tier into L≈0.45 so every slot clears AA
against white. Same hue, two lightnesses, single-ink-safe — guaranteed,
not eyeballed. This is why the constraint *favours* derivation rather than
arguing against it.

---

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| A | Categorical model | **One curated hue per slot; generator derives pale (L≈0.90) + deep (L≈0.45) at the same hue.** Token names `--cN-light` / `--cN-dark` are retained so no layout, chart, or Mermaid selector changes — only their *values* are regenerated and now provably same-hue. |
| B | Status colour | **Full per-theme freedom, contract-checked.** Each theme curates pass/warn/fail in-brand; the engine asserts mutual ΔE distinctness + AA. Red-alarm is *recommended*, not locked. |
| C | Contrast audit | **All 13 themes**, extended beyond text to accent/body/label, **plus a non-text visibility floor** (≈3:1 graphical per WCAG 1.4.11) for borders / `--c-stroke` / `--c-line`, plus a generated bg↔fg↔border report artifact. |
| D | This pass | **Decision record + indaco re-curated end-to-end as proof**, rendered (chart + Mermaid on adjacent slides, light + dark). Rollout to the other twelve themes is a separate commit. |

---

## What changes mechanically

### The categorical tier becomes anchor-driven

A theme now curates **12 hue anchors** (`--c1-anchor … --c12-anchor`) —
the artistic input. `tools/build-categorical.js` reads them and emits the
`--cN-light` / `--cN-dark` pairs into a generated block, with:

- **pale** = anchor hue, OKLCH L clamped to ≈0.90, chroma capped (≈0.045)
  → AA ≥ 4.5:1 vs the theme's `--c-ink-light`.
- **deep** = anchor hue, OKLCH L normalised to ≈0.45, chroma preserved
  → AA ≥ 4.5:1 vs `--c-ink-dark` (white).
- the `light-dark()` pairing inverts the tiers for dark canvas exactly as
  today, so the dark-mode contract is unchanged.

The generator runs in the build (`npm run build`) behind the ownership
gate, the same way `dist/lattice-default.css` is generated. Hand-editing
the generated block is a lint error; you edit the 12 anchors.

Anchor maintenance drops from 24 hand-tuned hexes per theme to 12, and
cohesion + single-ink-safety stop being review burdens because they are
structural.

### Status gains a contract

`--pass / --warn / --fail` stay per-theme (freedom). New assertions in
`test/unit/palette/contrast.test.js`, for **every** theme:

- pairwise OKLab ΔE(pass, warn), ΔE(warn, fail), ΔE(pass, fail) ≥ threshold
  (so the three never collapse into each other),
- each clears AA on its disc/badge surface in both canvas modes.

The universal defaults in `base.tokens.css` remain as a *fallback* for an
unstyled theme, but they are no longer the silent default for shipped
palettes — every shipped theme curates its trio (indaco does so in this
pass; the rollout does the rest).

### The contrast audit is rebuilt for the live token set

`tools/contrast-audit.js` is rewritten against `--cN-light/-dark`,
`--c-ink-*`, `--c-stroke`, `--c-line`, `--accent`, `--text-*`, and the
status trio — all 13 themes, both modes. Two bars:

- **AA 4.5:1** for text-bearing pairs.
- **Visibility floor 3:1** for graphical/structural pairs (border-on-bg,
  stroke-on-fill, line-on-canvas) — the bg↔border↔text relationship the
  user called out. Below the floor is reported, not exempted.

Output is a human-readable report (`--report` writes
`engineering/audits/contrast-<date>.md`) plus a non-zero exit on AA fails
for CI.

---

## What deliberately does NOT change

- **Token names consumed by layouts / charts / Mermaid.** `--cN-light`,
  `--cN-dark`, `--c-stroke`, `--c-ink-*` keep their names and roles. The
  three render paths and every `.styles.css` are untouched. This is a
  *value* re-curation behind the same contract, not an API change.
- **The palette-blind architecture.** One channel still leaves a theme
  file: CSS variables. No `themeCSS`, no per-theme diagram CSS.
- **The light-dark() dark-mode mechanism.**
- **The 12-slot count.** Twelve remains the categorical width (Mermaid
  cScale, pie wrap, decision-list rotation all assume it).

---

## Open question deferred to rollout

The gallery ships several near-achromatic themes (ardesia, atelier,
concrete, onyx, carbone). Under the anchor model these collapse to 12
near-grey anchors and a generated tier — fine, but it raises whether the
roster should be *consolidated* (the "everything for everyone" lever at
the theme level, not the token level). Out of scope for this pass; noted
for a roster review once the anchor model is proven.

---

## Acceptance for the indaco proof — measured

Run `npm run audit:contrast` and `npm run test:palette`.

1. **Cohesion.** indaco now reports **0 slot hue-splits** (every
   `--cN-light` / `--cN-dark` shares a hue within 12°); cuoio, not yet
   re-curated, reports **10** — the audit quantifies the gap and the fix.
2. **Render.** Pie wedges (deep tier) and flowchart nodes (pale tier) at
   category N render the same hue family. Proof image:
   `.scratch/cohesion-2026-05-29/cohesion.png` (built from
   `cohesion.html`; the full marp/emulator PDF path can't run in the
   stripped-`node_modules` cloud sandbox, so this is a direct-chromium
   render of the actual generated values, not a deck PDF — flagged here
   rather than claimed as a full render).
3. **Contrast.** indaco clears AA on every text pair in both modes (0
   failures). Structural pairs are reported against the 3:1 floor.
4. **Status contract.** `pass/warn/fail` clear the OKLab ΔE ≥ 0.10
   distinctness assertion (0 collisions across all 13 themes today).
5. **Green + no churn.** `test:palette` 51/51; no layout, chart, or
   Mermaid selector changed — only regenerated token values.

## What the rebuilt audit surfaced (rollout backlog)

The blind audit hid these; the live one exposes them across all 13
themes (`engineering/audits/contrast-2026-05-29.md`):

- **8 AA failures** in non-indaco themes: `atelier` label 4.24:1 + its
  achromatic `c2/c4` deep marks 4.18–4.50:1, `mustard` label 4.35:1,
  `ardesia` quadrant text. Pre-existing; fix in the rollout.
- **Dark-mode strokes vanish on their own band fills** (`indaco` 1.37:1,
  `ardesia` 1.14:1, `cuoio` 1.67:1): `--c-stroke` is a deep brand hue, but
  on dark canvas the band fill is *also* deep, so the outline disappears.
  The stroke strategy needs a light-dark() flip on dark canvas — a real
  finding, deferred to the rollout (it touches every theme's stroke
  token, not just indaco's values).
- **Hairlines (`--border`) sit ~1.2–1.5:1 by design** (intentionally
  near-invisible rules); reported for completeness, not a defect.

## Rollout sequence (separate commits)

1. Fix the 8 AA failures + the dark-mode stroke strategy.
2. Add `--cN-anchor` blocks to the other 12 themes; regenerate via
   `npm run categorical:build` (extend it to loop all themes).
3. Fold `categorical:build` into `npm run build` behind a stale-check
   (`--check`) and the ownership gate, like the other generators.
4. Widen `contrast.test.js` to loop all 13 themes once the failures are
   fixed; promote the slot-hue assertion from indaco-only to all.
5. Move the universal `--pass/--warn/--fail` defaults in
   `base.tokens.css` to an explicit per-theme curated trio.

---

## Addendum — the boardroom bake-off + system-wide rollout (same day)

The reference proof was approved, then escalated: make it a *full* cohesive
system, boardroom-grade in **both** modes, settled via competing agents.

### Generator, now mode-aware

`build-categorical.js` derives **four** tones per anchor — pale/deep ×
light/dark — tuned independently (dark is not a literal inversion: deep-dark
sits lighter for near-black-canvas legibility, pale-dark richer than the
paper-pale light fill). All four clear AA against their ink by construction,
which is how Mermaid's one-ink-per-diagram quirk is satisfied for twelve
slots at once. Tunable via `/* CATEGORICAL-CFG … */` or CLI flags.

### Three strategies, judged on real renders

Three agents each built a complete candidate (12 anchors + CFG + status trio
+ dark-stroke fix), self-audited to 0 AA/0 hue-splits, and rendered the
31-slide Mermaid gallery + chart gallery in light **and** dark:

- **harmonic** — brand-led harmonic spread; most brand-faithful, two warm
  near-adjacencies.
- **spread** — perceptually-even, CB-safe ordering; most legible, white
  strokes; blue-family crowding (c1/c10/c11).
- **editorial** — muted jewel/earth, low chroma; most boardroom-refined;
  a c6/c11 hue collision and a darker canvas departure.

### The settled synthesis (now `indaco`)

Editorial's chroma discipline + spread's CB-aware even spacing on the
high-traffic first six + indaco's own canvas + a refined pale-tint dark
stroke. Twelve muted anchors, `CATEGORICAL-CFG paleChroma=0.045
deepChroma=0.11`, a muted brick/ochre/forest status trio. Verified on
full-resolution dark renders (kanban, chart pie): jewel-toned, distinct,
strokes read, chart↔Mermaid cohesive per category.

### Rollout to the other twelve themes

- **Chromatic** (cuoio, laguna, burgundy, magnolia, brina, crepuscolo,
  mustard): anchor = the max-chroma value per slot (the slot's true hue);
  regenerated same-hue mode-tuned tiers in place. Plus the ink contract —
  band ink `--c-ink-light: light-dark(#14110E,#FFFFFF)`, mark ink
  `--c-ink-dark: light-dark(#FFFFFF,#14110E)`, quadrant text → `var(--c-ink-light)`
  — and `--c-alarm` pinned to a true flipping danger red (the one universal
  signal).
- **Achromatic** (ardesia, atelier, concrete, onyx): categories by
  lightness, not hue — `cN` left as grey ladders, only the dark-stroke fix
  + targeted AA nudges (concrete greys, atelier/mustard labels whose stale
  comments claimed AA while measuring 4.2–4.4:1).
- **carbone**: shipped with **no `cN` tokens at all** (latent bug the old
  2-theme test never caught) — given a 12-step monochrome grey ladder.

### Result

`tools/contrast-audit.js`: **0 AA failures · 0 slot hue-splits · 0 status
collisions across all 13 themes** (1008 pairs); the only below-floor pairs
are the intentional hairlines. `test/unit/palette/contrast.test.js` widened
from 2 → 13 themes, 183/183 green. The dark-stroke vanish defect is gone
everywhere.

### Still owed (mechanical)

- The chromatic rollout rewrote `cN` *values* in place (no `--cN-anchor`
  source), so `npm run build` can't yet regenerate them — add anchor blocks
  to the twelve themes and fold `categorical:build` (looped) into the build
  behind a stale-check.
- **Rebuild the committed gallery/example PDFs** — every theme changed, so
  every committed regression-baseline PDF is visually stale. Large render
  job; do it batched/CI before the PR is review-ready.

## Addendum — 2026-05-30: curate the light-mode fill + fix two audit gaps

A review (design / architecture / accessibility) flagged that the pale FILL
tier, while cohesive and a clear dark-mode win, was too restrained in light
mode: `paleChroma=0.045` desaturated all twelve slots toward near-grey, so
adjacent categories were barely separable (adjacent OKLab ΔE ≈ 0.04–0.08, vs
≈ 0.19–0.29 for the deep palette the chart pies used before the convergence).

**Curation.** The binding constraints are (a) the quadrant cohort uses the
deep mark (`cN-dark`) as ink *on* the `cN-light` fill, so the fill must stay
light enough to keep that AA; (b) Mermaid feeds one dark ink onto all twelve
fills. Within that envelope the lever is *chroma*, not lightness. New CFG for
the eight chromatic themes: `paleLLight 0.91 → 0.87`, `paleChroma 0.045 → 0.10`
(gamut-clamped per hue). Adjacent ΔE recovers to ≈ 0.06 min / 0.12 mean
(matching the old deep palette's separation) while quadrant deep-on-fill stays
≥ 4.5:1 and the one dark ink keeps ~12:1. Dark mode is untouched (the dark
fill is `deepDark`, a separate knob). 183/183 contrast tests stay green.

**cuoio stroke.** The darker fills made cuoio's light taupe stroke (`#8B7E6D`)
fail the 3:1 separator floor on the pale wedges (2.6:1) — a relationship that
was already marginal at the old L (≈ 2.98:1) but went unaudited. Deepened to a
cognac `#5C4A33` (5.5:1 worst case), in keeping with the leather palette.

**Two audit/parity fixes.**
- `contrast-audit.js` `floorPairs` checked `c-stroke` on slot 1 only; widened
  to all twelve slots (this is what surfaced the cuoio stroke). 1066 → 1352
  audited pairs.
- The runtime bundle (`lib/runtime/index.js`) mapped `pieSectionTextColor`
  (text *on* the wedge fill) to `text-heading` while the emulator used
  `c-ink-light` — a cross-renderer drift that rendered pie-slice text below AA
  (4.30:1 burgundy-dark) in the VS Code preview path only. Fixed to `c-ink-light`
  in both; guarded by a new emulator↔runtime parity test in
  `test/unit/mermaid/mermaid-var-map.test.js`.
