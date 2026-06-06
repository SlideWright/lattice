# Progression bucket — adjudicated checker report

All six component galleries (light + dark) independently rasterized and read.
Source CSS and docs.md files verified against render.

---

### journey — adjudicated
Maker overall: 7 → Checker overall: 7/10 — POLISH
Pages viewed: light p-01–p-11 all (+dark p-02 via journey.gallery.dark.pdf p-02; p-07 dark variant from light gallery)

- Styling: CONFIRM — default variant empty lower ~35% (mood-face track ends at roughly 60% canvas height, nothing below). Weighted variant (p-06) even worse: task chips occupy top 50%, lower 50% completely empty. Both are genuine wasted-canvas bugs. Arrow at bottom-right anchors nothing.
- Aesthetics: CONFIRM — heatmap (p-03) and curve (p-04) both fill the canvas adequately; weighted and default variants do not.
- Readability: CONFIRM — mood legend swatch numbers ("1 2 3 4 5") are at `0.78125cqi` with `opacity:0.65` (journey.styles.css:179-181). At slide rendering size these are well below `--fs-meta` (11.25pt) and are barely legible even at full DPI. This double hit (sub-token size + opacity fade) is a confirmed readability violation, not just "borderline small."
- Readability (section labels dark): CONFIRM — section bar contrast is a confirmed bug. CSS: `--journey-section-bg: color-mix(in oklab, var(--bg-alt) 70%, var(--bg-dark))` (both dark tokens in dark mode → very dark blue bar) against `--journey-section-fg: var(--on-accent)`. Measured visually: the "Evaluate", "Trial", "Activate" labels are barely distinguishable on the dark section bar. The maker's ~2.5:1 estimate is credible. journey.styles.css:55-56.
- Doc-align: REVISE (partially right, wrong variant). The anatomy block shows `[Awar] → [Sign] → [Use ]` with `(satisfaction track)` below — this matches the DEFAULT (classic) variant (p-02), NOT the heatmap variant as the maker claims. The heatmap (p-03) has no satisfaction track / plumb lines; it uses mood-tinted chips. The anatomy is correct for the DEFAULT but incorrectly omits curve, swimlane, and weighted variants — that part of the maker's finding stands. The maker mis-identified which variant the anatomy represents.
- DS: CONFIRM — no hex literals in component rules (the `#fff` fallback at journey.styles.css:129 is in the `--on-accent, #fff` pattern flagged system-wide as a consistent violation). `color-mix(in oklab, ...)` for mood ramp vs `srgb` for stroke contexts is an inconsistency, but the CSS comment at line 62-65 documents the Chromium 1194 bug justifying srgb — this is a DOCUMENTED exception, not a compliance bug.
- Consistency: CONFIRM — actor-chip legend row is unique in this bucket; noted correctly.
- Redundancy: CONFIRM — KEEP. Three distinct actor/mood dimensions.
- Grouping: CONFIRM — correct.
- MISSED #1: `journey.styles.css:179` — `journey-mood-key-label` at `0.78125cqi` with `opacity:0.65` is a compounded token violation. The maker noted "9-10pt" for legend numbers but attributed it to a different mechanism. The actual cause is this sub-token CQI size multiplied by opacity fade — both should be fixed together (bump to `--fs-meta`, remove opacity fade or increase to ≥0.85).
- MISSED #2: Weighted variant (p-06) canvas usage — the maker noted "oversized lower half" but the fix suggested (min-height on `.journey-board`) addresses only the default variant. The weighted variant's content is entirely in the chip row with no mood-face track below, so the empty space is structural — a separate fix is needed to anchor/fill the lower portion for weighted (e.g. a baseline rule or legend expansion).
- MISSED #3: `variantDocs.vertical.label` in list-steps (cross-component note actually belongs to list-steps, logged there).

Final top fixes:
1. `journey.styles.css`: Fix `--journey-mood-key-label` size + opacity — replace `0.78125cqi` / `opacity:0.65` with `font-size: var(--fs-meta)` / no fade, so the mood legend numbers meet minimum legibility at desk distance.
2. `journey.styles.css`: For the DEFAULT variant, constrain the journey-board height so the mood-face track fills to a baseline (e.g., `align-items: stretch` or a `min-height` on the mood band) — empty lower canvas is the worst aesthetic issue in the bucket.
3. `journey.styles.css`: Add an explicit dark-mode override for `--journey-section-fg` ensuring ≥4.5:1 contrast against the computed dark section-bar background.
4. `journey.docs.md` Anatomy: Correct which variant the anatomy depicts (it's DEFAULT, not heatmap); add a second anatomy block for the weighted variant showing proportional chip widths.

---

### list-criteria — adjudicated
Maker overall: 8 → Checker overall: 8/10 — POLISH
Pages viewed: light p-1–p-7 all (+dark p-3, p-4 confirmed from gallery)

- Styling: CONFIRM clean. No overflow, misalignment, or clip observed across all 7 pages.
- Aesthetics: CONFIRM — large counter + compact criterion body is one of the cleaner layouts in the bucket.
- Readability: CONFIRM — body text at `--fs-body` is clear. Counter at `55cqh` is confirmed from CSS line 25 and line 50. Visually the rendered size (~38-55pt depending on row count) reads as a strong display counter, not as body text, which is appropriate. No legibility issue at desk distance.
- Doc-align: CONFIRM minor gap on `.compact` modifier. The compact variant (p-04 is labeled "Composition: compact · list-criteria compact" from gallery) renders with tighter row spacing — not documented. CONFIRM.
- DS compliance: CONFIRM deviation. `list-criteria.styles.css:25` and `:50`: `font-size:55cqh` is confirmed off the 12-token scale. The static-findings note correctly calls this "borderline." My judgment: this is an intentional display counter (same category as `--fs-hero` display use cases), not accidental. The deviation needs a named custom property + comment explaining the cqh sizing rationale. Score stays 7 on DS — it is a real deviation that should be documented.
- Consistency: CONFIRM — sibling header/footer/eyebrow match. The large counter is unique but coherent.
- Redundancy: CONFIRM KEEP.
- Grouping: CONFIRM — ledger form is correct.
- MISSED: The docs do not explain that `ul` vs `ol` authoring choice makes no visual difference (both use CSS counter regardless). This is a minor authoring confusion — the manifest says "ol or ul" but the CSS counter applies to both; the distinction is semantic only, which should be stated.

Final top fixes:
1. `list-criteria.styles.css:25`: Extract `55cqh` into `--criteria-counter-size: 55cqh` with comment: "Container-height relative sizing for the display counter; the row is `container-type:size` so 55cqh scales the number to ~55% of its row height — intentional display-only deviation from the 12-token scale."
2. `list-criteria.docs.md`: Add `.compact` modifier description; clarify `ul` vs `ol` semantic equivalence.

---

### list-steps — adjudicated
Maker overall: 7 → Checker overall: 7/10 — POLISH (doc-align finding CONFIRMED, PLUS additional error found)
Pages viewed: light p-01–p-15 all (+dark p-02, p-07 area from gallery p-07)

- Styling: CONFIRM — arrow connectors between cards (CSS: `border-left:10px solid var(--border)`, list-steps.styles.css:19) are very faint. In the p-02 render the arrows are barely visible gray triangles against the `--bg-alt` card background. Also CONFIRM p-07 (stage variant, 3 cards, short text): cards have substantial empty lower halves — approximately the bottom 55-60% of each card is empty.
- Aesthetics: CONFIRM — horizontal default is clean for long body text (p-02); stage variant (p-07) reads as wasted canvas due to short body text in tall cards.
- Readability: CONFIRM clean.
- Doc-align: CONFIRM critical mismatch. The opening description in both `list-steps.docs.md` (line 3: "Vertical sequence of steps, each with full description body.") and `list-steps.manifest.json` (line 8: `"description": "Vertical sequence of steps, each with full description body."`) states vertical, while the CSS default (`display:flex; gap:var(--sp-xl)` with no `flex-direction: column`, list-steps.styles.css:9) and the gallery p-02 render a **horizontal** card row. The gallery title slide (p-01) also shows "Vertical sequence of steps" which is wrong for the default render.
- MISSED by maker: `list-steps.manifest.json` (and docs.md) `variantDocs.vertical.label` = **"Vertical — strip flips column to row"** is factually backwards. The CSS comment (line 48) correctly states "vertical: stack steps as rows instead of columns" and the variant CSS sets `flex-direction: column` (lines 72-90). The label should read "strip flips row to column" or "horizontal row becomes vertical stack." The rendered gallery footer on p-03 shows this wrong label. This is a second doc error beyond the primary orientation mismatch.
- DS: CONFIRM compliant. No hex literals (the `on-accent, var(--on-dark-primary, #fff)` fallback is a system-wide issue, not specific to this component — see roadmap.styles.css:78 and timeline.styles.css:34 for the same pattern).
- Consistency: CONFIRM — muted border connector is weaker than the timeline spectrum rail.
- Redundancy: CONFIRM KEEP.
- Grouping: CONFIRM.

Final top fixes:
1. `list-steps.manifest.json` + `list-steps.docs.md`: Fix description from "Vertical sequence…" to "Horizontal card row of ordered steps, each with full description body." everywhere it appears (manifest `description`, docs.md tagline).
2. `list-steps.manifest.json` `variantDocs.vertical.label`: Change "Vertical — strip flips column to row" to "Vertical — strip flips row to column." (The CSS correctly makes a column; the label has the direction backwards.)
3. `list-steps.styles.css:19`: Strengthen arrow connector: change `border-left:10px solid var(--border)` to `border-left:10px solid var(--text-subtle)` (or `color-mix(in srgb, var(--accent) 50%, var(--border))`) so the direction signal is visible at desk distance.
4. `list-steps.docs.md` §Anatomy: Rewrite the anatomy block to show the horizontal card row; move the vertical-stack anatomy under the `### vertical` variant documentation.

---

### roadmap — adjudicated
Maker overall: 8 → Checker overall: 7/10 — POLISH (contrast downgrade from maker)
Pages viewed: light p-01–p-11 all (+dark p-02 from roadmap.gallery.dark.pdf)

- Styling: CONFIRM date pill contrast failure. Verified at full-DPI crop of dark p-02: the "Q2 2026", "Q3 2026", "Q4 2026" pills on the spectrum rail line are nearly unreadable. Pill color: `--phase-accent` (one of `--c1-dark` through `--c8-dark`) with text `var(--on-cat, #fff)`. In dark mode, the spectrum rail and phase accent tokens are both in the teal/blue family — the pill background merges visually with the rail. Estimated contrast ≤2:1. This is a real WCAG AA failure (requires ≥4.5:1 for small text) and should score lower than the maker indicated.
- CONFIRM heading two-line wrap on p-02 (observed in both light and dark galleries). Long heading compresses grid space.
- Aesthetics: CONFIRM — status variant density is at the limit. Light default and horizons are polished.
- Readability: CONFIRM the pill contrast failure makes dark-mode roadmap unsuitable for boardroom use. Downgrading Readability from 7 to 6. The heading wrapping on a moderately long heading is a real boardroom problem (sample heading is editorial, real use cases will hit this).
- Doc-align: CONFIRM anatomy uses `▓▓▓░░░` progress-bar notation (roadmap.docs.md lines 56-60) while render uses state-disc icons (checkmark, half-disc, circle, slash). The anatomy does not match the rendered output. This is a moderate doc-render mismatch confirmed by direct reading of both the docs and the CSS (SVG inline backgrounds at roadmap.styles.css:208-228). CONFIRM.
- DS: CONFIRM compliant with noted hex fallback (`var(--on-cat, #fff)` at roadmap.styles.css:78 and :356). Palette-blind for colors; state icon geometry is in SVG `<path>` data, not color. Compliant.
- Consistency: CONFIRM — `--fs-emphasis` (30pt) for h2 is unique in the bucket. CONFIRM.
- Redundancy: CONFIRM KEEP.
- Grouping: CONFIRM.
- MISSED: The pill contrast issue affects not just the default variant but ALL roadmap variants that show phase-column pills in dark mode (horizons variant also uses `.horizon-meta` with the same `color: var(--on-cat, #fff)` on `background: var(--phase-accent)` at roadmap.styles.css:356). The fix must be applied to BOTH the `thead th > code` pill (line 78) and the `.horizon-meta` pill (line 356).

Rescored axes: Styling 6 | Readability 6 (pill contrast is a boardroom-grade failure in dark mode).

Final top fixes:
1. `roadmap.styles.css:78` and `:356`: Fix dark-mode pill contrast — the `code`/`.horizon-meta` pill needs a high-contrast background in dark mode. Options: (a) use `var(--bg)` as pill background with dark text; (b) increase the pill background to a high-contrast accent that guarantees ≥4.5:1 against `--on-cat` white. A `color-scheme: dark` or `[data-theme=dark]` scoped override is the minimal fix.
2. `roadmap.docs.md` §Anatomy: Replace `▓▓▓░░░` with state-disc notation — e.g. `[x] Shipped` / `[-] WIP` / `[ ] Planned` / `[/] Skipped` — to match the actual render.
3. `roadmap.styles.css:36`: Consider constraining `h2` to `--fs-h2` or adding a `max-font-size` clamp that falls to `--fs-h3` when the heading would otherwise wrap — the 30pt `--fs-emphasis` wrap on a two-line heading is visible on the sample slide and is worse with real content.
4. `roadmap.docs.md` §When NOT to use: Add note capping column count (3 phases approaches density limit; 4+ phases documented as anti-pattern).

---

### split-steps — adjudicated
Maker overall: 9 → Checker overall: 9/10 — KEEP
Pages viewed: light p-1–p-7 all (+dark p-03 verified clean)

- Styling: CONFIRM clean. No overflow, clip, misalignment across any page. Dark mode (p-03) maintains contrast: the left panel `--bg-alt` with `border-right:1px solid var(--border)` separates panels clearly; numbered discs on right are legible.
- Aesthetics: CONFIRM — watermark number and numbered disc system is the strongest visual design in the bucket. Well-balanced across all 7 pages.
- Readability: CONFIRM — step titles and bodies at `--fs-body` are clear at desk distance.
- Doc-align: CONFIRM minor gap — watermark number (the large ghost number in the left panel, rendered as `--fs-hero` in `--border` color) is absent from the anatomy block in `split-steps.docs.md`. It is the most visually dominant element. CONFIRM.
- REVISE on slot wording: The maker flagged "lead each with **Title.** then nested body" as possibly conflict with CARD_STYLE_LAYOUTS. I confirmed split-steps is NOT in the CARD_STYLE_LAYOUTS set (`lib/components/index.js`). The wording is ambiguous but not a DS violation. However, the gallery render uses NESTED list format (title bold on first line, body as plain text below) — the authoring sample in the docs does correctly use nested bullets, so the wording ambiguity is in the prose description only, not in the sample. Lower severity than the maker implies.
- DS: CONFIRM compliant. `3.125cqi` for disc diameter (layout geometry, not typography) — appropriate documented exception.
- Consistency: CONFIRM — panel separator matches other split-form components.
- Redundancy: CONFIRM KEEP.
- Grouping: CONFIRM.
- MISSED: None significant. The component is genuinely clean.

Final top fixes:
1. `split-steps.docs.md` §Anatomy: Add the watermark ghost number to the left-panel ASCII block — e.g., `│  ██   │` or `│  [01] │` notation to indicate it's the large display number in `--border` color.
2. `split-steps.docs.md` slot `steps` description: Clarify from "lead each with **Title.** then nested body" to "title on the first list line (plain text, no bold markup — CSS provides the weight); description as a nested `- body` bullet."

---

### timeline — adjudicated
Maker overall: 9 → Checker overall: 8/10 — KEEP (Mermaid block finding CONFIRMED, score revised)
Pages viewed: light p-1–p-7 all (+dark p-03, p-04 confirmed)

- Styling: CONFIRM clean. Spectrum rail crisp at 3px. Numbered circles align correctly to rail. Content fits column widths. Dark mode (p-03, p-04) maintains contrast and readability.
- Aesthetics: CONFIRM — spectrum rail is the visual standout; vertically centered composition reads as polished and restrained.
- Readability: CONFIRM — `--fs-meta` body text at 11.25pt is at the floor; with 4 nodes and short descriptions (p-04) it reads at desk distance. With 6 nodes and multi-line descriptions (p-06 or p-07) it would be crowded. Acceptable but noted.
- Doc-align: CONFIRM Mermaid block misplacement. Verified: `timeline.styles.css` total 113 lines; native layout CSS = lines 1-56 (46 lines plus blank lines), Mermaid band-cycle block = lines 58-113 (56 lines). This is confirmed ~56 lines of Mermaid-diagram-specific CSS living in the native layout file with no file-level comment warning. The only comment is at line 58 which explains the technical issue but does NOT explain why it lives here rather than in the diagram component or a shared integration file. A maintainer editing the native timeline layout rules will encounter this unexplained block. CONFIRM this is an organizational problem, not a rendering bug.
- DS: CONFIRM compliant. All `--fs-meta` for content; `14.0625cqi` for node width is layout geometry not type. `var(--spectrum)` for rail. No hex literals (on-accent fallback pattern is system-wide).
- Consistency: CONFIRM — header/footer/eyebrow match siblings.
- Redundancy: CONFIRM KEEP.
- Grouping: CONFIRM.
- Score revision: Maker gave 9/10. The Mermaid block is a real maintainability/organizational problem that will cause confusion. The DS score should be 7 (the block uses `!important` throughout lines 77-113 and lives in the wrong file). Revising overall from 9 → 8.
- MISSED: The `eventWrapper { filter: none !important; }` rule at line 113 is also in this file and is equally unexplained in file context. Same fix applies.

Final top fixes:
1. `timeline.styles.css`: Add a block-level comment at the TOP of the file (before line 1) stating: "Note: This file contains two independent CSS sections: (1) the native `section.timeline` layout rules (lines 1–56) and (2) Mermaid timeline band-cycle overrides for `section .timeline-node` (lines 58–113) that fix Mermaid's section indexing off-by-one. The Mermaid block lives here because the `timeline` component and Mermaid timeline diagrams share a name and are commonly used together." (Or move the Mermaid block to the diagram integration layer if that is architecturally cleaner.)
2. `timeline.docs.md` / `timeline.manifest.json`: Explicitly document the `ol` = numbered circles / `ul` = plain dots behavior in the anatomy block. Currently it is in the manifest `purpose` field only; authors scanning the anatomy won't see it.

---

## Checker bucket summary

### Maker claims that were wrong or needed revision

1. **journey anatomy claim (REVISE)**: Maker said anatomy "matches the heatmap default" — it actually matches the DEFAULT (classic) variant. The anatomy is correct for the default but wrong in this characterization. The core finding (anatomy only covers one variant) stands.
2. **roadmap score too generous (REVISE)**: Maker gave Overall 8/10. The dark-mode pill contrast is a WCAG AA failure (≤2:1 for small text that must convey meaning), not just an aesthetic nit. Downgraded to 7/10.
3. **timeline score slightly high (REVISE)**: 9/10 → 8/10. The Mermaid block misplacement is more than a "doc gap" — it is ~56 lines of `!important`-heavy foreign CSS embedded without file-scope disclosure. DS compliance is genuinely lower.
4. **list-steps variant label error (MISSED)**: Maker did not flag that `variantDocs.vertical.label = "Vertical — strip flips column to row"` is backwards — the modifier takes a horizontal row and makes a vertical column, not vice versa. This is a second doc error in the same component.

### Real issues ranked by severity

1. **roadmap dark-mode pill contrast** (roadmap.styles.css:78, :356) — ≤2:1 for date pills in dark mode. Boardroom-grade failure. Affects ALL roadmap dark variants. **Fix: one-line dark-mode override or token replacement.**
2. **list-steps description/anatomy describe wrong default orientation** (list-steps.manifest.json:8, list-steps.docs.md:3, anatomy block) — the most common user trap in this bucket: following docs will produce vertical layout while the actual CSS default is horizontal. **Fix: two file edits.**
3. **list-steps variant label is backwards** (list-steps.manifest.json variantDocs.vertical.label) — compounds the above. The gallery footer reinforces the wrong orientation model.
4. **journey section-bar dark contrast** (journey.styles.css:55-56, 200) — ~2.5:1 estimated; section labels are barely visible in dark mode.
5. **journey mood-legend numbers sub-token + opacity fade** (journey.styles.css:179-181) — `0.78125cqi` + `opacity:0.65` puts the mood scale numbers below minimum legibility.
6. **journey empty canvas on default/weighted variants** — bottom 35-50% of canvas empty; weighted is worst.
7. **timeline Mermaid block misplaced** (timeline.styles.css:58-113) — organizational/maintainability issue; 56 lines of foreign CSS with no file-scope disclosure.
8. **roadmap anatomy progress-bar notation** (roadmap.docs.md lines 56-60) — `▓▓▓░░░` vs actual state-disc icons.
9. **list-criteria 55cqh undocumented** (list-criteria.styles.css:25) — visual intent is correct but deviation from 12-token scale needs a named property + comment.

### Redundancy clusters
All six components earn their place. The ordered-list family (list-steps, list-criteria, split-steps) and the time-axis family (timeline, roadmap, journey) each have distinct data shapes and authoring contracts. No MERGE/CUT recommended.

### Ranked worst → best (adjudicated)

1. **list-steps** 7/10 — POLISH (primary doc-render mismatch + backwards variant label)
2. **journey** 7/10 — POLISH (dark contrast, empty canvas, sub-token legend numbers)
3. **roadmap** 7/10 — POLISH (dark pill contrast is an AA failure; anatomy mismatch)
4. **list-criteria** 8/10 — POLISH (off-scale font undocumented; compact variant undocumented)
5. **timeline** 8/10 — KEEP (Mermaid block disorganization is real; layout itself is clean)
6. **split-steps** 9/10 — KEEP (minor anatomy gap; cleanest component in the bucket)
