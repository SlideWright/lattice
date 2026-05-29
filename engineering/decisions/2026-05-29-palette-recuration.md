# Palette re-curation — restore per-theme craft, re-anchor the contrast gate

**Date:** 2026-05-29
**Branch:** `claude/design-tokens-color-audit-wW4zf`
**Status:** design proposal — direction confirmed, implementation pending

> **Symptom (the report that started this).** Themes, charts, and Mermaid
> diagrams read as "everything for everyone": a single universal contract
> applied to thirteen very different canvases, with contrast doing odd
> things between background, border, and text. The curated feel of the
> original palette audit (`themes/palette-audit.md`) was lost. We want the
> balance back — re-curate thoughtfully, audit contrast properly, give
> charts and diagrams a cohesive but distinct voice, and stop forcing one
> universal `pass`/`warn`/`fail` onto canvases it doesn't fit.

This note is the design model and rollout plan. It is **non-canonical**;
once shipped, the contract lives in `design/theming.md` and `CHANGELOG.md`.

---

## 1. Root cause — what the consolidation traded away

The audit everyone liked curated **three independent colour tiers per
theme**, plus state, plus structural:

| Audit-era tier | Role | Curated per theme |
|---|---|---|
| `band-1..12` | pale diagram fills (L≈87) | ✓ |
| `cat-* (8)` | mid-tone categorical | ✓ |
| `chart-1..6` | **saturated data-ink series** | ✓ — charts had their own identity |
| `gantt state / note / error` | status fills | ✓ |
| `quadrant / stroke / line / accent-warm` | structural | ✓ |

A consolidation (2026-05-14, recorded in
`2026-05-12-diagram-tokens.md`'s historical-context banner) collapsed all
of that into:

- **one** `--c1..c12 {light,dark}` cycle, serving band fills *and*
  categorical groups *and* chart series simultaneously;
- **8 universal semantic tokens** `--c-warm/cool/alarm/mark/note`
  (deduped from 12), defaulted in `lib/base/base.tokens.css`;
- **universal** `--pass/--warn/--fail` light-dark() pairs, also defaulted
  in the engine.

The consolidation bought three real goods — a single source of truth, the
12→8 semantic dedup, and a WCAG-AA contract. It cost exactly what was
reported:

1. **Curation flattened.** Charts lost their dedicated saturated ramp.
   A pie chart is now `--c1-dark..--c8-dark` (`chart-family.js:27`,
   `:349`) — the same deep tier diagram strokes draw from. There is no
   "chart voice," only a borrowed one. `--cat-*` and `--chart-N` have
   **zero definitions** repo-wide today.

2. **The universal defaults assume a white-ish, indaco-like canvas** and
   break on themes that don't have one (measured — see §2).

3. **One rigid lightness contract crushes categorical distinctness.**
   Pinning all 12 slots to L≈32 (deep tier) varies them only in hue at
   low lightness, where perceptual hue separation is compressed. Measured
   chart-series (c1..c8) OKLab min ΔE is **0.00–0.07** in most themes —
   `mustard`'s `c1↔c7` is ΔE **0.00** (identical). An 8-slice pie is
   barely readable in several shipped themes.

### The safety nets had silently disconnected

Both contrast guards stopped covering the live palettes:

- **`test/unit/palette/contrast.test.js`** loops only `['indaco','cuoio']`
  (line 154), on a code comment asserting "siblings inherit by cascade."
  That was true *before* the consolidation; it is false now — all 13
  themes curate their own `--cN`/semantic values. **11 of 13 shipped
  palettes have zero contrast coverage.**
- **`tools/contrast-audit.js`** (pre-rewrite) audited **dead tokens**
  (`mermaid-primary-color`, `chart-1..6`). It "passed" because the tokens
  it checked no longer exist.

So the "weird contrast" was real, untested, and invisible to CI.

---

## 2. Baseline — measured failures (post-rewrite audit tool)

`npm run audit:contrast` (rewritten this branch — current taxonomy, all 13
themes × both modes, tiered bars: AA 4.5 text / UI 3.0 graphical /
decorative exempt). Findings that the re-curation must clear:

**AA text failures**
```
atelier  (light)  text-label on bg / bg-alt     4.24 / 3.76
mustard  (light)  text-label + accent on bg     4.35 / 3.89 / 4.35
concrete (dark)   c2/c4 band + quadrant text    4.18 / 4.50
```

**State-signal / stroke graphical failures (the pass/warn/fail evidence)**
```
carbone  (light)  fail on bg (near-black)       2.28
concrete (light)  warn on bg (mid-grey)         2.53
cuoio    (light)  c-stroke on its own bands     2.46–2.91   ← even a CI-blessed theme
```

**Chart distinctness** — c1..c8 min ΔE ≤ 0.07 in most themes; achromatic
themes (`ardesia`/`onyx`/`concrete`) collapse by design (grey can't carry
categorical meaning) and need an explicit non-categorical strategy.

---

## 3. Decisions (confirmed with the user, 2026-05-29)

| # | Decision | Choice |
|---|---|---|
| 1 | Balance point | **Full re-curate** — rebuild every theme's palette from a refreshed audit; loosen the rigid shared contract while keeping a shared *skeleton*. |
| 2 | `pass`/`warn`/`fail` freedom | **Curated hue, fixed meaning, enforced floor** — per-theme, canvas-aware values; semantics stay fixed (green = pass); graphical 3:1 floor enforced. |
| 3 | Chart identity & cohesion | **Dedicated chart ramp, shared anchors** — reintroduce a curated saturated series ramp; cohesion comes from charts + Mermaid deriving off the same per-theme brand-hue anchors. |
| 4 | Contrast governance | **AA text / 3:1 graphical, ALL themes** — extend `contrast.test.js` to 13 themes × both modes; commit the audit tool. |

---

## 4. Target model

### 4.1 The skeleton stays universal; the flesh becomes per-theme

Universal & fixed (the manageable part — what keeps the system coherent):
- Token **names** and **roles** (`--cN-*`, `--c-warm/cool/alarm/mark/note`,
  `--pass/warn/fail`, quadrant, stroke, line, surfaces, ink).
- Semantic **meaning** (green = pass, the warm/cool/alarm/mark/note slots
  and what they signal).
- The **contrast contract** (§4.4) and the light/deep **tier concept**.

Per-theme & free (the curated part — what restores craft):
- **Every value.** Re-derived from the refreshed audit (§4.2).
- A **dedicated chart series ramp** (§4.3).
- **State hues** tuned to the canvas (§4.5).

### 4.2 Curation method — refreshed audit, looser lightness contract

The original audit pinned the pale tier to L≈87 and the deep tier to L≈32
in lockstep across all 12 slots. Decision #1 ("looser shared contract")
relaxes the lockstep:

- Slots derive from each theme's **brand-hue anchors** (the
  `--brand-*` axis already in every theme) via OKLCH, not a fixed L.
- Each slot gets the lightness/chroma that makes it **maximally distinct
  from its neighbours** (target adjacent ΔE ≥ 0.12, global min ≥ 0.10),
  *subject to* the contrast floor against its paired ink. Distinctness and
  AA are co-optimised rather than distinctness sacrificed to a uniform L.
- Refresh `themes/palette-audit.md` as the audit-of-record (the artefact
  the user values), regenerated by a forge tool (proposed
  `tools/palette-forge.js`, or an extension of `new-theme.js`) so the
  swatches and rank-1 picks are reproducible, not hand-maintained.
- Achromatic themes (`ardesia`/`onyx`/`concrete`) declare an explicit
  **non-categorical** posture: they encode groups by pattern/position +
  a single accent, not by 8 greys. The audit/test treats their grey
  cycle as intentional, not a distinctness failure.

### 4.3 Chart ramp + charts↔Mermaid cohesion

- Reintroduce a curated, saturated **`--chart-1..N`** series ramp per
  theme (N ≈ 6–8), optimised for data-ink distinctness at chart scale.
- **Cohesion via shared anchors, not shared tokens:** both the chart ramp
  and the `--cN` diagram cycle derive from the *same* per-theme brand
  anchors, so a pie slice and a flowchart node of "category 1" are
  recognisably the same family — two tuned expressions of one anchor,
  rather than literally the same hex (status quo) or unrelated (pre-audit
  risk).
- `chart-family.js` `PIE_PALETTE` / `LANE_COLOR_VARS` repoint from
  `--cN-dark` to `--chart-N`. This is a three-render-path change
  (emulator inline, `lib/core`/marp path, runtime bundle) — see §5.

### 4.4 Contrast governance

| Tier | Bar | Tokens |
|---|---|---|
| AA text | 4.5:1 | ink on every fill (cN, semantic, quadrant), headings/body/label on surfaces, accent-as-text, on-accent, code |
| UI graphical | 3.0:1 | `pass`/`warn`/`fail` discs (shape-encoded via the slash mask, so colour isn't the sole channel), `c-stroke` on its bands |
| Decorative | exempt | hairline `--border`, `--text-muted` chrome, `--c-line` |

`contrast.test.js` extends its loop to all 13 themes × {light, dark};
`tools/contrast-audit.js` is the manual instrument and the test's mirror.
The test goes red until each theme is re-curated, so it is wired **last**
(or per-theme, gated behind an allow-list that shrinks to empty).

### 4.5 State-signal contract

- Meaning is fixed: `pass` = positive/done, `warn` = caution, `fail` =
  blocked/error. Authors never relearn semantics across themes.
- Values are per-theme and **canvas-aware** (`light-dark()` pairs), tuned
  so each clears the 3:1 graphical floor **on that theme's actual canvas**
  — fixes carbone (near-black) and concrete (mid-grey).
- This supersedes the missing `2026-05-15-state-token-palette.md` note
  referenced (danglingly) in `base.tokens.css`; fold its surviving
  rationale here and fix that reference.

---

## 5. Rollout sequence (every step reviewable)

The change touches every shipped PDF, so it ships in reviewable slices,
not one mega-commit. Per CLAUDE.md: isolate from the long-running
galleries; ship a per-feature demo deck; visually spot-check every rebuilt
PDF; keep `CHANGELOG.md` current as changes land.

0. **Foundation (this commit).** Rewrite `tools/contrast-audit.js` to the
   live taxonomy + tiered bars + all themes; add `npm run audit:contrast`;
   land this proposal. No theme values change. *(done)*
1. **Forge + refreshed audit.** Build the palette-forge tool; regenerate
   `themes/palette-audit.md` with the looser-contract derivation and the
   chart ramp; review the swatches before any theme adopts them.
2. **Token contract.** Add `--chart-N` to the contract in
   `design/theming.md` + `lib/base/base.tokens.css` defaults; repoint
   `chart-family.js` across all three render paths; assert cross-renderer
   parity.
3. **Re-curate `indaco` first** (the canonical template) end-to-end:
   values, chart ramp, state hues, contrast-clean both modes, render +
   rasterize-for-review spot-check. This is the worked exemplar the other
   twelve copy the method from.
4. **Re-curate the remaining 12**, one reviewable slice each, fixing the
   §2 failures as they go. Extend `contrast.test.js` per theme as it lands.
5. **Wire the full 13-theme gate** in `contrast.test.js`; rebuild all
   galleries/baseline decks; pixel-check against pre-change snapshots.
6. **Docs + changelog.** Update `design/theming.md`, `themes/README.md`;
   `CHANGELOG.md` `## Unreleased` — palette token values are a stable
   surface, so changed values are at least `### Changed` (minor); any that
   break an existing deck lead with `**Breaking:**`.

---

## 6. Blast radius & risks

- **Every theme + every gallery/baseline PDF rebuilds.** Visual
  regression is the dominant risk; mitigate with per-deck pixel-check and
  `rasterize-for-review.sh` spot-checks (CSS correctness ≠ visual
  correctness — CLAUDE.md).
- **Three render paths must agree** on the `--chart-N` repoint
  (emulator / marp-core / runtime bundle); the integration tier asserts
  slide-count parity but not colour — add a targeted check or visual gate.
- **`light-dark()` resolution in Mermaid** is collapsed by the emulator's
  palette parser; new tokens must round-trip through it (theming.md §dark).
- **Achromatic themes** need the explicit non-categorical posture or
  they'll perpetually "fail" distinctness — design decision, not a bug.
- **Stable-surface contract:** palette tokens are versioned; co-ordinate
  the bump and call out any deck-breaking value shifts.

## 7. Resolved (2026-05-29, round 2)

1. **Chart ramp size: 8 series** (`--chart-1..8`), matching today's pie cycle.
2. **Non-breaking cutover.** `--chart-N` defaults to `var(--cN-dark)` in
   `base.tokens.css`, so any theme that hasn't defined a curated ramp
   renders byte-identical to today. `chart-family.js` reads `--chart-N`;
   themes opt in by curating the ramp. Scores `### Changed` (minor), not
   `**Breaking:**`.
3. **Standalone `tools/palette-forge.js`**, designed to also be the
   new-theme generator: **give it one brand colour and it derives the
   whole palette** — surfaces, ink ramp, accent, the 12 categorical slots
   (both tiers), the 8 chart series, semantic state (canvas-aware), warm/
   cool/alarm/mark/note, quadrant, stroke/line, and the dark-variant
   tokens — all contrast-verified before it emits. Replaces the hand-edit
   path in `new-theme.js` (which keeps the file-scaffolding/registration
   role; the forge fills in the colour math).

The forge is the mechanism that makes "full re-curate" tractable: the 13
existing themes are re-derived from their brand anchors, then hand-tuned,
rather than hand-built slot by slot.
