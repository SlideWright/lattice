# Chart bucket — Part A — Adjudicated checker report
## Components: gantt · kanban · piechart · progress

---

### gantt — adjudicated
Maker overall: 7 → Checker overall: 7/10 — VERDICT: POLISH (score unchanged, one finding revised)
Pages viewed: light p1-p8, dark p4; detail crop p2

- **Styling — CONFIRM with revision.** Top-heavy composition confirmed: on p2 (3 workstreams) the chart area (axis row + 3 lane rows) spans roughly the lower 35% of the slide; the header+subtitle+gap occupies ~40%, leaving a large white band between divider and axis. The compact variant (p5) is noticeably better — bars start at ~35% down. Confirmed that unstyled bars ("Org-wide rollout", "Calibration cadence", "Board reporting" on p2) render in a muted steel-blue that is visually the `--state-info-hue` default (`gantt.styles.css:131`). The bars are distinguishable from done (green) and at-risk (tan) but do look like a faint "info" state rather than a neutral "not yet started" grey. No vertical hairlines between Q1/Q2/Q3/Q4 columns confirmed — only a bottom border on the axis row. **REVISE:** Maker's "~45% canvas" is slightly overstated; on p2 (3 workstreams) the chart rows span closer to ~35% of the canvas height, not 45%. The issue is real but slightly worse than claimed.

- **Aesthetics — CONFIRM.** Dark variant (p4) is visually rich: green/tan/blue gradient fills read well on navy. The at-risk warm tan on "Per-team weighting" is the standout color — appropriately alarming. The upper dead zone on p2 is a real VP-of-Design nit.

- **Readability — CONFIRM.** Axis ticks in blue mono at --fs-meta are legible. Lane labels right-aligned and bold are clear. In-bar text on narrow bars (p3 "Weight rollback tooling" blocked bar) readable at this DPI.

- **Doc-align — CONFIRM.** Anatomy in docs correctly shows header/tasks/footer but omits the axis-row, which is a central rendered feature. Minor drift confirmed.

- **DS — CONFIRM.** Palette-blind in gantt.styles.css — no hex literals. `--state-info-hue` default for unstyled bars is a semantic-color smell: the status vocabulary maps `pilot` and `decision` to info-blue (`gantt.styles.css:163-164`), so a bar with no status is visually indistinguishable from a pilot or decision task. `--state-mute-hue` (gray) is already used for `deferred` and would be the correct default.

- **Consistency — CONFIRM.** Eyebrow, header divider, status vocabulary match siblings exactly.

- **Redundancy — CONFIRM.** KEEP.

- **Grouping — CONFIRM.** Coherent in chart bucket.

- **MISSED finding 1:** No per-column background alternation. The gantt grid has no column-banding (e.g. alternating pale tints for Q1/Q3 vs Q2/Q4), making it hard to trace which quarter a bar's start or end aligns with. Both hairlines AND column banding are standard in boardroom Gantt charts. Maker caught the hairline issue but not the banding opportunity.

- **MISSED finding 2:** The `compact` variant (p5) has better vertical balance than the default — the chart fills more of the canvas — but it still shows an excessively wide gap (~20% canvas height) between the subtitle and the axis row. The chart-body top margin is unchanged in compact mode; it only saves space by tightening the header typography, not by reducing the chart-header-to-chart-body gap.

Final top fixes:
  1. `gantt.styles.css:131` — Change `--fill-hue: var(--state-info-hue)` default to `--fill-hue: var(--state-mute-hue)` so unstatus'd bars render gray (neutral) not blue (semantic info/pilot).
  2. `chart-family.css` or gantt transform — Add 1px vertical hairlines at column boundaries (`var(--chart-rule)`) to make quarter-start/end positions immediately readable.
  3. `gantt.styles.css` / `chart-family.css` — Reduce the gap between the chart header and the chart body (the large white band above the axis row on p2). Consider reducing top padding in `.chart-body` when a subtitle is present, or sizing the subtitle font down to `--fs-body-compact` to reclaim vertical space.

---

### kanban — adjudicated
Maker overall: 8 → Checker overall: 8/10 — VERDICT: POLISH (score unchanged, one finding revised)
Pages viewed: light p1-p8, dark p4; detail crop p2

- **Styling — REVISE.** Card height variance within a column confirmed on p2 ("Calibration playbook" wraps to 2 lines, "Adoption dashboard" also 2 lines, vs "Per-team weighting" 1 line). However the maker's description of this as "broken grid register" is overclaimed: kanban.styles.css uses `flex-direction: column` per column with no cross-column row alignment, so height variance is by design. The real issue is that variable-height cards in the BACKLOG column (p2) create an uneven visual rhythm within that column — the 2-line "Calibration playbook" card is noticeably taller, disrupting the column's internal cadence. Maker's suggested fix (normalize to tallest card) would require cross-column height sync that may be technically complex; a simpler fix is a uniform min-height per card regardless of wrap. Also confirmed: in p2 the "Weekly signal review" card in REVIEW also wraps, creating the same intra-column inconsistency. Dark variant (p4) renders correctly with same visual characteristics. Stress test (p3) at overview DPI is tight but no clipping detected.

- **Aesthetics — CONFIRM.** Lane-color gradient tints work well. Done-column dimming (opacity 0.52) is the right call. Board fills available width. Compact variant (p5) removes the header area, making the board fill much more of the canvas — this is substantially better balanced than the default.

- **Readability — CONFIRM.** At stress-test density (p3, 15 cards) the overview DPI makes card text sub-legible, but this is a known anti-pattern documented in the gallery. Dark mode (p4) — excellent color differentiation.

- **Doc-align — CONFIRM.** Anatomy matches render precisely. The footer abbreviation note is correct but extremely minor. One additional observation: the docs say "A column titled Done / Completed / Shipped / Closed dims its cards" — render confirms this works correctly (DONE header goes green, cards go 0.52 opacity).

- **DS — CONFIRM with addition.** Palette-blind in kanban.styles.css — confirmed no hex literals in component rules. The Mermaid `cluster.section-N` rules block (lines 214-259) does make the component CSS file 70+ lines longer than its actual component rules. Maker's suggestion to move it is valid.

- **Consistency — CONFIRM.** Eyebrow, column header monospace uppercase, status pills — all match gantt and progress exactly.

- **Redundancy — CONFIRM.** KEEP.

- **Grouping — CONFIRM.** Coherent.

- **MISSED finding:** The `form: "timeline"` in the manifest is used purely as an architectural grouping shortcut (to co-locate with gantt in the chart bucket). The `kanban.docs.md` itself says "Kanban is a snapshot, not a timeline" in the anti-patterns section — which directly contradicts the manifest's own form declaration. An author reading the manifest form value will be confused. The explanation note Maker recommended in `manifest.json` is the right fix, but should also appear in `kanban.docs.md` to be visible to authors.

Final top fixes:
  1. `kanban transform` — Add a `min-height` to `.kanban-card` so single-line and two-line cards have the same visual weight within a column, reducing the height-variance rhythm break.
  2. `kanban.manifest.json` and `kanban.docs.md` — Add an explanatory note on why `form: "timeline"` is used for a snapshot layout; the contradiction between manifest form and docs anti-pattern text will confuse authors.
  3. `kanban.styles.css` — Move the Mermaid `.cluster.section-N` rules block to `_chart-family.css` or a dedicated `kanban.mermaid.css` to keep component CSS focused.

---

### piechart — adjudicated
Maker overall: 6 → Checker overall: **5/10** — VERDICT: REWORK (DOWNGRADED; critical REFUTATION of the cover-rescue claim)
Pages viewed: light p1-p10, dark p2-p4; detail crops p2 (center), p4 (overview)

**Critical refutation of maker's key claim: the cover variant does NOT rescue the disc size.**

- **Styling — CONFIRM disc-size bug; REFUTE cover-rescue claim.** The 25cqi disc is confirmed at `piechart.styles.css:21-24`:
  ```css
  section.piechart .piechart-svg {
    flex: 0 0 auto;
    width: 25cqi;
    height: 25cqi;
  ```
  On p2 (default, 5 slices), the disc occupies roughly the left-center quadrant of the lower 55% of the slide — clearly too small, leaving dead zones above AND to the right of the disc below the legend area. **The maker claimed "the cover variant (p4) works well — full-bleed, disc fills upper 2/3, caption band at bottom." This is WRONG.** Viewing p4 both in light and dark: the disc is the same 25cqi size. The cover CSS in `chart-family.css:485-583` drops chrome (header/footer/eyebrow) and adds a caption band at the bottom, but contains NO override for `.piechart-svg` width/height. The `chart-body` gets `max-width:none` and `flex:1 1 auto` in cover mode, which gives the figure more vertical room, but the SVG itself stays clamped at 25cqi. In the dark cover (independently rasterized), the disc floats in the upper-center of a dark canvas with a full-height empty region above it and a second empty band between disc+legend and the caption. The cover variant is NOT rescuing anything — it makes the dead space problem more visible by removing the title that previously filled the upper portion. The manifest's `variantDocs.cover` description claims "the donut + legend fill the slide" — this is FALSE; the render shows the opposite.

- **Aesthetics — CONFIRM.** The composition is fragmented on every variant. The cover dark (rasterized) is actually worse than the default light because the dark canvas amplifies the emptiness around the disc.

- **Readability — CONFIRM.** Legend at --fs-meta (11.25pt) is marginal at desk distance. Swatch size 1.09375cqi is too small for quick color identification.

- **Doc-align — REVISE (more severe than maker reported).** The anatomy block does NOT match the render orientation: the anatomy shows the disc centered with legend to the right, but the render (p2, detail crop) shows the disc pushed LEFT of center with the legend to its right — the disc+legend pair is centered but the disc itself is left of center within the pair. This is CSS-confirmed: `.piechart-figure` is `justify-content: center` on the row, the `.piechart-svg` has fixed 25cqi width, and the legend has `min-width: 21.875cqi max-width: 29.6875cqi`. So the disc takes 25cqi and the legend takes 22-30cqi of the flex row, making the disc consistently ~40-45% of the total figure width — centered-within-pair but disc-left-in-pair. Beyond that: `variantDocs.cover.caption` says "the donut + legend fill the slide" — the render proves this is false. The donut/legend manifestly do not fill the slide in any measured dimension. This is the most significant doc drift in the four components.

- **DS — CONFIRM.** Palette-blind in component CSS. Chart-family hex fallback issue acknowledged.

- **Consistency — CONFIRM.** The disc-to-slide ratio is markedly smaller than how progress, gantt, and kanban fill their canvas. The piechart's chart body fills the canvas but the SVG within it does not scale.

- **Redundancy — CONFIRM.** KEEP.

- **Grouping — CONFIRM.**

- **MISSED finding 1 (HIGH):** The `cover` variant has a **doc-drift bug**: the `variantDocs` description promises the disc fills the slide. The CSS has no cover-specific `.piechart-svg` resize rule. The cover variant should either (a) add a CSS rule like `section.piechart.cover .piechart-svg { width: 36cqi; height: 36cqi; }` mirroring how radar handles it (chart-family.css comment references "cf. radar's 36cqi"), OR (b) the variantDocs caption must be corrected to not claim full-bleed behavior that doesn't exist.

- **MISSED finding 2:** The donut hole on p3 is pure white (light) or dark navy (dark) — visually correct as an empty hole. But the CSS comment at `piechart.styles.css:7` says "The donut hole (when modifier `donut` is present) shows a total readout." The comment implies this feature IS implemented, but the render shows no total readout. The docs say "can be left blank or used for a total label" — the CSS comment says it DOES show one. This is a CSS-comment-to-render mismatch on top of the docs ambiguity the maker noted.

Final top fixes:
  1. `piechart.styles.css` — Increase `.piechart-svg` from `25cqi × 25cqi` to at least `32cqi × 32cqi` for all variants; add a cover-specific override `section.piechart.cover .piechart-svg { width: 36cqi; height: 36cqi; }` to give the cover variant the bleed behavior the docs promise.
  2. `piechart.manifest.json` `variantDocs.cover.caption` — Correct "the donut + legend fill the slide" to accurately describe the current render, OR implement the disc resize so the claim becomes true.
  3. `piechart.styles.css:7` CSS comment — Reconcile "shows a total readout" with the actual render (no readout exists). Either implement the total readout in the donut center or correct the comment.
  4. `piechart.styles.css` — Increase `.legend-swatch` from `1.09375cqi` to `≥1.5cqi`; change legend `font-size` from `--fs-meta` to `--fs-body-compact` for desk-distance legibility.

---

### progress — adjudicated
Maker overall: 9 → Checker overall: **8/10** — VERDICT: POLISH (DOWNGRADED by 1; one finding confirmed at higher severity)
Pages viewed: light p1-p8, dark p4; detail crop p3 (stress, left side)

- **Styling — CONFIRM with upgrade in severity.** The layout is clean. The horizontal gradient "shoots forward" effect is well-executed. The three-column grid is precise — pill right edges align perfectly across all rows. HOWEVER, the stress test (p3, 8 rows) reveals the label column wrapping is more severe than the maker reported: "Decision-log audit trail" wraps to 2 lines (visible in overview AND confirmed in the left-side detail crop), and "Recalibration playbook" also wraps to 2 lines. That is 2 of 8 rows wrapping — 25% of the content. The label column at `18.75cqi` (fixed, `progress.styles.css:31`) is too narrow for typical multi-word workstream labels. This is a real design problem: when a label wraps, the bar row becomes 2x height, disrupting the even visual rhythm the layout depends on for scanability. The maker rated this as a minor nit; at 25% wrap rate in a realistic 8-row scenario it is a POLISH-blocking issue, not a nit.

- **Aesthetics — CONFIRM.** The no-rail design (transparent track, bar floats on canvas) is excellent. Dark mode (p4) is best-in-class for this set — green vivid, amber warm, red unambiguous. The label text in dark mode adapts cleanly.

- **Readability — CONFIRM.** In-bar `--fs-meta` percent is legible even on the short 12% Adoption bar. Status pills are clearly readable at desk distance. The 2-line wrapping rows (p3) are readable but create scanning difficulty.

- **Doc-align — CONFIRM.** The anatomy block in `progress.docs.md` shows:
  ```
  Goal A      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 70%
  ```
  The percent is shown OUTSIDE the bar fill (after the bar). The render (p2, p3 confirmed) shows the percent INSIDE the fill, right-aligned at the bar's leading edge. This is a confirmed doc↔render anatomy mismatch. The CSS is unambiguous: `progress.styles.css:84-92` shows `progress-fill` uses `display:flex; justify-content:flex-end; padding-right:0.625cqi` — the pct label is inside the fill. The docs anatomy has not been updated to reflect this.

- **DS — CONFIRM.** Palette-blind. Typography on scale. `--fill` author override documented.

- **Consistency — CONFIRM.** Best sibling consistency in the set.

- **Redundancy — CONFIRM.** KEEP.

- **Grouping — CONFIRM.**

- **MISSED finding:** The label column width (18.75cqi, fixed in `progress.styles.css:31`) is a known pain point that the maker reported only as a "minor nit with long hyphenated labels." At 8 rows (realistic upper-limit content) it affects 2 rows — 25% of content wraps. The fix is not just a clamp but also requires center-alignment correction: the two-line wrapped labels in p3 appear center-aligned (`text-align: right` in CSS, which works for single-line but creates off-center appearance when the second line is shorter). Consider `text-align: end` with `word-break: break-word` OR widening the label column to `22cqi` OR both.

Final top fixes:
  1. `progress.docs.md` anatomy block — Update the ASCII diagram to show percent INSIDE the bar fill (right-aligned): change `▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 70%` to `▓▓▓▓▓▓▓▓▓▓▓▓▓▓70%░░░` to match the actual render.
  2. `progress.styles.css:31` — Widen the label column from `18.75cqi` to `22cqi` to reduce multi-line wrap frequency, particularly for real-world workstream names (the 8-row stress test hits 25% wrap at current width).
  3. `progress.styles.css` — Add `-webkit-line-clamp: 2` with ellipsis on `.progress-label` as a safety floor for labels that still exceed the widened column.

---

## Checker bucket summary

### Maker claims that were wrong or materially overstated

1. **piechart cover "rescues itself" — REFUTED.** This is the most significant maker error. The cover variant does NOT expand the disc; the disc stays 25cqi. The cover CSS removes chrome and adds a caption band but contains no `.piechart-svg` resize rule. The dark cover render (independently rasterized) shows even more dead-space than the default because the dark canvas amplifies the emptiness. The variantDocs cover caption ("the donut + legend fill the slide") is an unfulfilled promise. Score accordingly: piechart is 5/10, not 6/10.

2. **gantt "~45% canvas" whitespace — MINOR OVERSTATEMENT.** On p2 (3 workstreams), the chart rows span ~35% of canvas height, not 45%. The issue is real and actionable; the percentage was overstated.

3. **progress "anatomy shows % outside the bar" — CONFIRM, but maker understated the severity.** The docs anatomy mismatch is confirmed. The maker rated progress 9/10 which is too generous given the label-wrap issue (25% of rows wrap in the 8-row stress test) combined with the doc-align drift. 8/10 is the right call.

4. **kanban "broken grid register" framing — OVERCLAIMED.** The layout intentionally uses per-column flex stacks, not a cross-column grid. The correct description is "variable card height within a column breaks intra-column visual rhythm," which is a valid POLISH nit but not a structural layout bug.

### Real issues the maker missed

1. **piechart cover CSS comment vs render mismatch** — `piechart.styles.css:7` says "The donut hole shows a total readout" but no readout is rendered. MEDIUM priority.
2. **piechart cover disc-size: zero implementation** — The cover variant has no per-chart disc resize. The comment in `chart-family.css:495` even flags that "an untuned chart still bleeds + captions but may need an explicit figure size (cf. radar's 36cqi)" — piechart is exactly that untuned chart. HIGH priority.
3. **gantt no column banding** — Alternating Q-column background tints would make bar alignment readable without hairlines. LOW/MEDIUM priority.
4. **kanban `form: timeline` contradiction** — The manifest form value directly contradicts the docs anti-patterns section text. A documentation consistency fix needed.
5. **progress label-wrap at 25% rate** — Maker flagged this as a "minor nit"; at 2/8 rows wrapping it is a POLISH-blocking issue.

### Ranked worst→best (adjudicated)

1. **piechart — 5/10 — REWORK:** disc undersized (25cqi confirmed); cover does NOT rescue it (critical refutation); donut has no total readout despite CSS comment claiming one; variantDocs cover description is factually wrong; legend legibility marginal.
2. **gantt — 7/10 — POLISH:** unstyled bars inherit info-blue making no-status tasks semantically colored; chart underoccupies canvas at 3 lanes; no column boundary hairlines.
3. **kanban — 8/10 — POLISH:** intra-column card height variance from wrapping titles; form:timeline declaration contradicts docs; Mermaid rules inflate component CSS.
4. **progress — 8/10 — POLISH:** docs anatomy percent-placement mismatch confirmed; label column too narrow at 18.75cqi (25% wrap rate at 8 rows); otherwise excellent.

### Redundancy and grouping

No changes to maker's calls. All four components occupy distinct slots. No merge or cut warranted. The gantt+kanban sibling relationship (both progression-function, chart-bucket, timeline-form, series-substance) is the closest overlap; their shared status vocabulary and chart-family chrome is a feature, not a redundancy.
