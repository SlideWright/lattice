# Fix verification round (2026-06-06)

After the audit fixes landed, three independent **checker agents** re-rendered the
freshly-rebuilt committed galleries (light + dark) and verified each fix against
its original finding, watching for regressions. Lead spot-checks (Opus) covered
the highest-risk items (Mermaid dark mode, AA contrast) first-hand.

## Result

| Group | Verified | Outcome |
|---|---|---|
| P0 render bugs (11) | closing, content, kpi, list-tabular, tldr, piechart, redline, citation-card | **8 CONFIRMED FIXED, 0 regressions** |
| Systemic T4/T5/T6 + consistency (9) | roadmap, journey, agenda, word-cloud, code/compare-code, radar, quadrant, stats, split-compare | **9 CONFIRMED FIXED, 0 regressions** |
| Docs T3 + contracts T9 (25) | all anatomy + manifest corrections | **25 CONFIRMED FIXED, 0 regressions** |

Plus two issues the checkers caught and that were then fixed:
- **list-tabular** residual `#fff` hex floor (missed by the first T6 pass) → fixed
  (`bc1def2`); a full re-grep confirms **zero hex floors remain in any component CSS rule**.
- **actors** 5–6 row stack still collided with the footer after the flex-start fix
  → row density tightened (`55313f7`), verified on the dark 5-row slide.

### Mermaid dark mode — verified correct direction
First-hand render confirmed flowchart edge labels, sequence message text, and state
transition labels all render **light on the dark canvas** (no white knockout boxes,
no dark-on-dark). The fix flips with `color-scheme` (the `.dark.pdf` galleries use
the `section.dark` *modifier*, so the verified render *is* the modifier-on-light-theme
case). Light mode unchanged.

### AA contrast — system-wide
`tools/contrast-audit.js`: **304/305 token pairs pass AA across 25 themes**; the AA
unit gate passes **65/65**. The single advisory miss (`#1A1A1C on #A02323`, carbone
error-chip) is pre-existing (no theme files were touched this session) and is a pair
the auditor intentionally does not enforce.

## Known residuals (deferred — careful follow-up, not shipped blind)

Two items the P0 checker flagged that were **not** force-fixed, to avoid trading one
defect for another:

1. **state-chart `lr` / `curved` terminal-marker clip.** The 4-state case is fixed;
   the 5-state `lr` default still clips the small terminal `⊙` marker at the right
   edge, and `curved` clips the terminal at the bottom. Root cause: the figure is
   `width:fit-content; max-width:100%`, so when nodes + marker gutters exceed the
   slide width the gutter (and its marker) is clipped rather than scaled. Proper fix:
   the native transform should measure total extent and `transform: scale()` to fit,
   or shrink node spacing at ≥5 states. (state-chart is already a flagged-REWORK
   component pending a bucket reclassification — bundle this with that work.)

2. **diagram ER dark — entity-attribute contrast.** Attribute rows are dark-on-dark
   (faint) in dark mode. A scoped `svg.erDiagram` override (box → `--bg-alt`, ink →
   `--c-ink-light`) makes the attribute *data* readable, but Mermaid's entity **header
   bar** keeps its baked light fill, so lightening its title text drops the header to
   low contrast — trading one AA miss for another. A correct fix must also darken the
   header bar; that needs the injected-SVG header element selector (the raw-mmdc
   structure differs from the palette-injected render). Deferred rather than ship a
   new header low-contrast. ER is 1 of 26 diagram types; flowchart/sequence/state/
   class (the common types) are fixed.

Pre-existing Mermaid quirks (not regressions, not introduced here): the sequence-
diagram **note box clips its label** ("…ision logged on cl…") and the sequence
**title text is faint**.
