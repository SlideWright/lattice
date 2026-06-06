# Static analysis findings (mechanical, complements visual audit)

## Classification matrix → redundancy signals (identical Function·Form·Substance triples)

The design system's own guardrail (§13): when two components share
Function·Form·Substance, they are redundant UNLESS the **data shape** differs.
Triples shared by ≥2 components:

- **comparison · split · structure (4):** before-after, compare-prose,
  split-compare, + compare-code (code bucket). → biggest redundancy cluster.
- **inventory · stack · structure (4):** agenda, cards-stack, checklist, principles, tldr (5 incl. tldr).
  (list is stack·prose.)
- **progression · timeline · structure (3):** list-steps, timeline, journey (+ authority-chain in legal).
- **inventory · ledger · structure (3):** actors, glossary, list-tabular (+ statute-stack, regulatory-update, kpi, list-criteria are ledger too).
- **statement · split · structure (2):** split-brief, split-statement.

Form distribution (concentration = naming/UX confusion risk):
- canvas 13 (catch-all), split 9, timeline 8, ledger 8, stack 7, matrix 3, grid 2, scatter 2, panel 2, bookend 2, divider 2.

## Cross-bucket name / concept collisions
- `timeline` (progression) vs `timeline-list` (chart) — confusable names.
- `quadrant` (chart·scatter) vs `matrix-2x2` (comparison·matrix) — both "two-by-two"/two-axis; tags overlap (`two-by-two`,`prioritize`,`risk`).
- `gantt` (chart) vs Mermaid `gantt` (diagram) — two gantts.
- `piechart` (chart) vs Mermaid `pie` (diagram) — two pies.
- `state-chart` (chart bucket) has **substance: graph** — but `diagram` is THE graph bucket. Anomaly: a graph-substance component lives in chart, not diagram. Either move it or document why.
- `compare-code` (code bucket, comparison function) vs `compare-prose` (comparison) — parallel.

## DS-compliance: palette-blindness
- Hex-in-rule = `var(--on-accent, #fff)` fallback pattern. Used in: timeline, roadmap(×2), journey, before-after(×4), cards-side(×3), cards-stack(×2), cards-grid(×3), list-tabular, split-list, verdict-grid? Inconsistent depth: some `var(--on-accent, var(--on-dark-primary, #fff))`, some `var(--on-cat, #fff)`. → The `#fff` literal floor violates the "no hex literals" rule; should bottom out in a token. **Inconsistency** is the real issue — standardize the on-accent fallback chain across all card/accent components.
- (timeline.css:108, kanban.css:189 hex are inside COMMENTS — fine.)

## DS-compliance: typography off the 12-token scale
- **quadrant.styles.css:166,173 — `font-size: 11px` and `8px` HARDCODED in SVG.** 8px is below any token and likely illegible at desk distance. Real readability + token violation. (cross-check chart-B agent.)
- math.styles.css — many `em` sizes (KaTeX relative). Defensible for typeset math but off-scale; document as sanctioned exception.
- cqi/cqh display sizes (list-criteria 55cqh number, split-statement 17.19cqi quote mark, card kickers 1.25cqi, kpi, journey, roadmap corner tags) — these are the CLAUDE.md-sanctioned "explicit cqi sizes between tokens." OK but verify visually they land on-scale.

## Freshness
- css.css, component docs: up to date.
- build:galleries:check flagged cards-side/cards-stack/list-tabular "source newer than PDF" — determined to be a **checkout-mtime artifact** (working tree clean, identical mtimes). Committed PDFs = ship state = correct audit target. NOTE for report: gallery freshness is mtime-gated, not content-hashed, so a clean checkout can show false "stale" — minor tooling nit.

## CONFIRMED bugs (verified by me, not just agent claim)
- **closing**: `closing.styles.css:13` selector is `section.closing h2` (center, --text-display color, max-width, --fs-h2) but the component's heading slot is `h1` (manifest selector:"h1", sample uses `#`). Rule is DEAD; h1 gets no closing-specific centering/color. Render shows left-aligned oversized wrapping heading. HIGH priority one-line fix (h2→h1), but verify h1 isn't already handled elsewhere + that fs-h2 token is intended.
