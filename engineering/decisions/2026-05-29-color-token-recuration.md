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
</content>
</invoke>
