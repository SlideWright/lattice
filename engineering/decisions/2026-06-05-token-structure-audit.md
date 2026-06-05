# Token-structure audit — independent structural-text tokens

**Date:** 2026-06-05
**Status:** implemented (phase 1)
**Scope:** `lib/base/`, `themes/*.css`, `tools/contrast-audit.js`,
`tools/check-ownership.js`, `lib/base/base.docs.md`, `design/theming.md`

## Symptom

Subtitle contrast looked broken across themes, most visibly on dark
canvases. Investigation showed it was not a one-off subtitle bug but a
structural gap in the token system.

## Findings

1. **The secondary-text tier was a decorative token.** `--text-muted` —
   labelled *"DECORATIVE / WCAG-exempt"* in every theme and defined as a
   **static** hex (never a `light-dark()` pair) — was the single
   most-consumed color token in the engine (149 uses, ahead of
   `--text-heading` at 104 and `--text-body` at 98). It was doing the job
   of at least seven distinct content roles: subtitle, eyebrow, caption,
   table header, column subhead, unit/KPI label, attribution — plus its
   one legitimate role, chrome (pagination/header/footer).

2. **Measured contrast.** With `--text-secondary`/`--text-label` resolved
   the old way (via `--text-muted`), secondary text sat at 3.3–4.4:1 in
   most themes and **hard-failed** in cuoio (2.64), magnolia (2.47) and on
   the dark canvas in concrete (2.12). Title/closing/divider subtitles use
   a *different* token (`--on-dark-secondary`, white-alpha) and compute
   6–9:1 — fine; the dark-bookend symptom was a token-*resolution* failure
   (the Marp `:where(:root)` bug fixed in #55), not a contrast failure.

3. **The dark-side "fix" was wired to nothing.** Themes defined
   `--dark-text-muted` but it was consumed **zero** times. The comment at
   `base.modifiers.css:79` claiming `section.dark` "already remapped"
   `--text-muted` was false — `--text-muted` was static. The correct
   pattern already existed for `--text-label`
   (`light-dark(accent, var(--dark-text-label))`); `--text-muted` never
   adopted it.

4. **The audit was blind to it.** `tools/contrast-audit.js` checked
   heading/body/label/mermaid/chart pairs but had **no** secondary/subtitle
   pair, and could not grade `color-mix(... transparent)` (so the whole
   `--on-dark-*` ramp was invisible to it). "All checks pass" never looked
   at the failing token.

## Decision

Give secondary content text its **own** token, curated per theme, as a
`light-dark()` pair hitting **AA (4.5:1) on both canvases**:

- **Add `--text-secondary`** (+ `--dark-text-secondary`) to all 13 base
  themes. Values derived from each theme's own body ink faded toward its
  canvas, placed at the geometric midpoint between body and muted contrast
  (clamped ≥4.6) so the hierarchy reads **body > secondary > muted**.
- **Repoint readable secondary content** (subtitle, eyebrow, footnote,
  caption, table header, subheads, unit/KPI labels, attribution,
  connector — 24 sites across 15 files) from `--text-muted` to
  `--text-secondary`.
- **Keep `--text-muted` chrome-only** (pagination/header/footer) and make
  it a `light-dark()` pair too (wiring in `--dark-text-muted`).
  Decorative/state/border/code/glyph/stamp marks stay on it (correctly
  exempt).
- **Retune `--text-label`** light side in atelier/mustard to clear AA.
- **Extend the audit** to check the secondary/label tiers and composite the
  translucent `--on-dark-*` ramp; fix its comment-polluted `[dark]` tag.
- **Lock it in**: `--text-secondary` is now a required core theme token
  (`check-ownership`), seeded by the `new:theme` scaffold, and guarded by
  `test/unit/palette/structural-text-contrast.test.js` (AA on both sides,
  all 13 themes).

## Deferred (phase 2)

- **Model A — mechanism unification.** `section.dark` flips
  `color-scheme:dark` and reuses the canvas ramp; title/closing/divider and
  split dark-panels instead paint `--bg-dark` *without* flipping
  color-scheme, forcing them to hardcode the parallel `--on-dark-*`
  white-alpha ramp. Giving those surfaces a scoped `color-scheme:dark` would
  let them reuse the one ramp and retire most of `--on-dark-*`. Deferred
  because it needs a render-confirmation of `color-scheme` on a `<section>`
  in Marp's Chromium and touches the bookend/split components.
- **Component-internal labels** (chart axis/label text, math annotations,
  roadmap internals) still ride `--text-muted`. They are specialized and
  dense; migrating them is a follow-up to avoid unvetted visual churn.

## Verification

`npm test` (incl. the new contrast gate) and `node tools/contrast-audit.js`
pass. Per-theme showcase decks under `examples/token-contrast/` were
rendered and spot-checked in light and dark.
