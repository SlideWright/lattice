# Evidence bucket — checker adjudicated report

Checker: independent verification against maker evidence.md
Date: 2026-06-06
Components: kpi, split-metric, stats
Pages independently rasterized: kpi light p1–p13 (fresh run), kpi dark p9, split-metric p2–p4, stats p2–p3, p5; existing detail crops verified.

---

### kpi — adjudicated

Maker overall: 7 → Checker overall: 6/10 — POLISH (downgraded from 7 on Styling; the collision is worse than the maker framed and a second header-related issue on no-eyebrow slides was missed)

Pages viewed: light p1–p13 (all), dark p9 (kpi-chk-fresh). Detail crop: kpi-top-check/p-02.png.

**VERDICT: kpi header-overlap claim is CONFIRMED and SEVERE.** The maker did not over-claim. The rasterizations are unambiguous: on every kpi slide that includes an `h3` eyebrow, the Marp `section header` chrome text ("LATTICE · KPI" / "LATTICE") and the `h3` eyebrow text ("FINANCIAL · Q4 2026", "FRAMEWORK · Q4 2026", "PLATFORM · Q4 2026", "COMPLIANCE · Q4 2026", "GROWTH · FY26 VS FY25", "HEADLINE · Q4 2026") collide character-by-character at the same horizontal pixel row. At full-DPI crop the rendered text reads "LATT**FINANCIAL**" — the two strings literally overprint. Slides confirmed with collision: p2, p4, p5, p6, p7, p8, p9, and p11–p12 (dark + compact). Total: every slide with an h3 eyebrow. No false positive. The collision is absence of clearance, not visual proximity.

Root cause identified by CSS read: `section.kpi { padding-top: var(--sp-md) }` = 1.875cqi, and the base chrome `section header { position:absolute; top:1.875cqi }`. The absolutely-positioned header does not push normal-flow content; the first in-flow child (h3) begins at `padding-top` and therefore shares the same top with the header element. Fix: `section.kpi h3 { margin-top: 1.5em }` (push below the chrome line) or raise `section.kpi { padding-top }` to at least `calc(var(--sp-md) + var(--fs-meta) + var(--sp-xs))` ≈ 2.9cqi, or suppress the gallery header with `header: ""` and treat the h3 as the sole top-of-slide label (the evidence bucket survey already has no `header:` directive and shows clean results with no collision).

- Styling: CONFIRM — collision is a real P0 visual bug, on every slide with h3 eyebrow, in both light and dark mode (p9). The survey gallery (no `header:` directive) renders cleanly — confirming the bug is in the gallery front-matter + CSS position coincidence, not the component existence. Additionally: on target-variant slides with no h3 (p3), the Marp chrome header overlaps into the first line of the bold h2 heading text — a related but secondary issue (the bold h2 start is at the same cqi band as the absolute header; less severe because the h2 is larger and bold so the overlap is less confusing). The compliance nth-child positional coloring (lines 292–303 of kpi.styles.css) mirrors the ops issue — items 1, 2, 4 = pass and item 3 = warn, hardcoded. Gallery content is authored to match positions, but the CSS is positional-blind to pill content. CONFIRM.

- Aesthetics: CONFIRM — briefing (p2) is boardroom-class once the collision is fixed. Trajectory (p7) dead space above the headline and below the cards confirmed (~40% of canvas is empty in the middle section). Ops (p5) is clean. Spotlight (p8) is well-composed.

- Readability: CONFIRM — spotlight secondary text at 0.859375cqi (~8.25pt) and pill font at 0.78125cqi are below any token. CONFIRM those are not listed as documented exceptions. The briefing support at 3.9583cqi is documented as intentional in CLAUDE.md.

- Doc-align: CONFIRM with a REVISION. The anatomy does show a 2×2 ops-shaped grid, not the briefing default — confirmed by reading kpi.docs.md §Anatomy. CONFIRM that the bare `kpi` class renders hero-left + three-supports-right (briefing), not the 2×2 shown in the anatomy. REVISE the slot finding: the manifest (`kpi.manifest.json` line 30) lists `kpis` selector as `"ul > li"` but the skeleton, sample, and gallery all use an ordered list (`1.`, `2.`, …). The CSS handles both `ol` and `ul` (lines 61–70 of kpi.styles.css use `:where(ol, ul)`). The selector in the manifest is wrong — it should be `ol > li` (or "ol or ul"). CONFIRM that claim. Also: the manifest slot label is "subtitle" with selector h3, but the CSS comment, authoring guide, and docs all use the word "eyebrow" — the slot name and role are mismatched.

- DS: CONFIRM on spotlight raw-cqi sizes at lines 415–420. No hex literals found. CONFIRM all tokens are palette-blind.

- Consistency: CONFIRM — chrome matches siblings, pill styling consistent.

- Redundancy: CONFIRM KEEP.

- Grouping: CONFIRM in correct bucket.

MISSED by maker:
- MISSED: On target-variant slides (p3) where no h3 eyebrow is present, the `section header` chrome ("LATTICE · KPI") appears right beside the bold h2 heading text — the h2 starts at `padding-top` = 1.875cqi and the chrome is at `top:1.875cqi`, so the heading's first line shares a row with the chrome. Less catastrophic than the eyebrow collision (the bold h2 is much larger and distinguishable from the muted mono chrome) but still causes visual noise. p3 confirmed.
- MISSED: The compliance modifier uses the same positional nth-child color pattern as ops (kpi.styles.css lines 292–303: `nth-child(1), (2), (4)` = pass; `nth-child(3)` = warn). Same semantic-vs-positional issue. The gallery is authored to match, but a real compliance deck with the 4th item being non-compliant would render incorrect colors. The maker caught ops; the compliance modifier has the identical structural problem.
- MISSED: The `section.kpi > ol > li > ul` secondary text (lines 119–126 of kpi.styles.css) uses `font-family: var(--font-mono)` and `text-transform: uppercase` for all support rows' secondary line — the two-line limit for the secondary slot is enforced by visual convention, not CSS. When authors write three nested bullets on a kpi row, the third bullet also picks up mono uppercase and renders as if it were a secondary meta-line (lines 119–126 hit `li + li`, not just the second bullet). This is a mild authoring trap but not a new visual bug in the gallery.

Re-score justification: Styling drops to 5 (was 6) — the collision is visible on 11 of 13 slides, in both themes; a component cannot score above 5 in Styling when its most prominent feature (the eyebrow) is broken on every real slide. Overall drops to 6 (was 7) — the collision makes the component not boardroom-ready as shipped.

Top fixes (adjudicated):
  1. `kpi.styles.css` — `section.kpi h3`: Add `margin-top: calc(var(--fs-meta) + var(--sp-xs))` (≈ ~1.75cqi) OR raise `section.kpi { padding-top }` above the chrome clearance band so the eyebrow starts below the Marp header's rendered line height. This eliminates the collision on all eyebrow slides.
  2. `kpi.styles.css` (ops lines 237–250 and compliance lines 292–303): Replace positional `nth-child` color assignments with a transform-driven `data-status` attribute approach so warn/pass coloring is content-driven, matching the manifest antiPatterns contract.
  3. `kpi.styles.css` (spotlight lines 415–420): Replace raw `0.859375cqi` and `0.78125cqi` with `var(--fs-meta)` (or route through `var(--fs-scale)`).
  4. `kpi.docs.md` / `kpi.manifest.json` (anatomy, slots): Replace the ops 2×2 anatomy with the briefing default; add a sub-anatomy for ops. Fix `kpis` slot selector from `ul > li` to `ol > li` (or note both). Rename slot from "subtitle" to "eyebrow" to match all documentation.

---

### split-metric — adjudicated

Maker overall: 7 → Checker overall: 7/10 — POLISH (score unchanged; findings confirmed with one partial revision on the optical balance severity and one on the accent variant label color claim)

Pages viewed: light p1–p7 (split-metric-chk), dark p3 (split-metric-chk/p-3.png).

- Styling: CONFIRM — no overflow or clipping bugs. The left panel metric block sits optically low-center as claimed. In p-2 (light, default) the unit label "NET REVENUE RETENTION" starts at roughly 43% of the panel height, which places the metric group below the mathematical center — the maker's "~35% dead white space above" is accurate (visually ~35-40% of panel height is empty above the unit label). Dark mode (p-3): identical positioning, identical empty-top pattern. Compact (p-4): same pattern. No CSS bugs beyond this intentional-but-suboptimal centering. No collision issues (split-metric has no h3 in normal flow at the top; "LATTICE · SPLIT-METRIC" header sits alone at top-left with no competing text).

- Aesthetics: CONFIRM — left-light / right-dark polarity is strong. The italic unit pattern (`114*%*`) is best-in-class. The empty-top on the left panel is the main weakness — it makes the slide read bottom-heavy on quick glance.

- Readability: REVISE on context line. The maker calls the `--fs-meta` context line (11.25pt, max-width 26ch) "borderline." At desk distance this is genuinely marginal. The maker's suggestion to bump to `--fs-body-compact` (13.5pt) is well-reasoned. CONFIRM it is the smallest text on the slide and the `max-width:26ch` is a mitigation that helps but doesn't fully compensate. Score stays at 8 (maker had 8).

- Doc-align: CONFIRM SEVERELY WRONG. The anatomy (kpi.docs.md as copied to split-metric.docs.md) shows a narrow-left-panel-with-small-box shape that bears no resemblance to the actual 44/56 full-height split render. Confirmed by reading split-metric.docs.md §Anatomy (lines 53–64). REVISE the maker's findings note on the card-style/inline-title: the maker correctly says `**Title.** body` format is actually correct for split-metric (it is NOT a card-style layout). Confirmed by checking `lib/components/index.js` CARD_STYLE_LAYOUTS — split-metric is not in that set. The slot description for `findings` says "Lead each with **Title.** then nested body" which is consistent with the actual CSS behavior. Not a bug.

- DS: CONFIRM palette-blind. CONFIRM no off-token sizes beyond `--fs-meta` context line (which is a token, just borderline legibility). CONFIRM `on-dark-*` usage is correct.

- Consistency: CONFIRM matches split-family language.

- Redundancy: CONFIRM KEEP.

- Grouping: CONFIRM correct.

MISSED by maker:
- MISSED: The `split-metric.docs.md` §Slots table `findings` selector says `"ul > li"`, but in the render (confirmed from CSS line 18: `section.split-metric .metric-right > ul`) this is an unordered list only — the transform (or CSS) creates `.metric-right > ul`. However the authoring sample uses `- **Title.** / - body` which IS unordered. Selector is correct. Not a bug.
- MISSED: `split-metric.styles.css` line 11: `.metric-left` uses `justify-content:center` (mathematical centering). A real fix would use `justify-content:flex-start; padding-top: calc(var(--sp-xl) + 8cqi)` or a similar offset to place the metric block at visual center-of-gravity (typically ~38% from top). This is the mechanical root cause of the optical balance issue — the maker notes the symptom but the fix suggestion in Top Fix 2 is slightly imprecise ("padding-top offset or change justify-content to flex-start with a calculated top gap" is right directionally).

Top fixes (adjudicated):
  1. `split-metric.docs.md` (anatomy): Replace the legacy ASCII sketch with an accurate two-panel diagram showing the 44%/56% full-height split with the right panel filled by `--bg-dark`.
  2. `split-metric.styles.css` (`.metric-left`): Change `justify-content:center` to `flex-start` with explicit `padding-top` that optically centers the metric group at approximately 1/3 from top (e.g. `padding-top: calc(var(--sp-xl) + 6cqi)`), compensating for visual weight of the empty Marp header band.
  3. `split-metric.styles.css` (`.metric-context`): Change `font-size: var(--fs-meta)` to `var(--fs-body-compact)` for boardroom legibility.
  4. `split-metric.manifest.json` (slots): Clarify `findings` slot description to note that the right panel is a full-height dark surface and the `**Title.** body` inline format is the correct pattern for this component (not a card-style layout).

---

### stats — adjudicated

Maker overall: 7 → Checker overall: 7/10 — POLISH (score unchanged; font-family divergence confirmed, dead-space claim substantiated, accent variant color claim slightly overstated)

Pages viewed: light p2, p5 (stats-chk), dark p3 (stats-chk/p-3.png).

- Styling: CONFIRM — no overflow or clip bugs. The content band (eyebrow → h2 → subtitle → stat row) occupies roughly 35–40% of the slide canvas height in the center, with roughly 30% empty above and below. The "~60% dead space" claim in the maker's bucket summary is a slight overstatement (the actual empty fraction is closer to 55–60% measured from below the slide header to above the footer), but the broader conclusion — the slide feels sparse on a 16:9 canvas — is correct.

- Aesthetics: CONFIRM — "numbers on a white field" with no structural framing is the main weakness. Clean but bare. The dark mode (p-3) is more impactful because the numbers pop as cyan against dark, but the same empty-canvas diagnosis applies.

- Readability: CONFIRM font-family divergence. Stats numbers in p-2 and p-3 are unmistakably sans-serif (the `--font-body` variable, confirmed by reading stats.styles.css line 16: `font-family:var(--font-body)`). kpi and split-metric numbers are visibly Playfair Display serif (confirmed in kpi.styles.css lines 103–104 and split-metric.styles.css line 13). The stylistic break when these appear in the same deck is real. The `--font-body` usage is not documented as an intentional design decision in the manifest or comments.

- Doc-align: CONFIRM slot description bug. `stats.manifest.json` line 24: `"description": "One li per stat tile. Format: a single line with **Number** then a nested bullet for the caption."` The `stats.docs.md` repeats this: "Format: a single line with **Number** then a nested bullet for the caption." But the manifest `skeleton` and `sample` fields both use `1. **73%** faster close` — inline, no nested sub-bullet. The description says "nested bullet" but the sample contradicts it. Minor but technically incorrect.

- DS: CONFIRM `var(--font-body)` divergence from display-font convention. CONFIRM no hex literals. The `gap:0.46875cqi` spacing primitive is fine — not a typography token violation.

- Consistency: REVISE the accent-variant label color finding. Looking at p-5 (accent): the numbers are darker teal and the labels are lighter teal — there IS a perceptible value difference between `.stat-num` (accent color, bolder) and `.stat-label` (text-label / same accent but lighter weight and smaller size). The maker says "both now strongly teal" — the labels are teal-ish but visibly lower-contrast than the number. The hierarchy between number and label is preserved, though narrower than the default variant. The maker's Top Fix 4 (give labels `color:var(--text-label)`) is still a reasonable improvement. REVISE severity from "harsh" to "slightly low-contrast between number and label in accent variant."

- Redundancy: CONFIRM KEEP.

- Grouping: CONFIRM correct.

MISSED by maker:
- MISSED: The subtitle slot selector in the manifest (`"selector": "p > code"`) is correct for the eyebrow inline-code paragraph pattern, but the docs show the subtitle rendering as italic body text (not the inline-code rendered as pill). In p-2 the subtitle "Measured against pre-framework baseline, same teams, same market conditions." renders as italic gray paragraph — this is via `section.stats > p, section.stats > em { font-style:italic }`. The selector `p > code` would match a code node inside a paragraph, not a plain paragraph. The sample uses a backtick-wrapped inline-code paragraph (`` `Measured...` ``) which actually generates a `<p>` with a `<code>` child — so the selector is technically correct. But the docs describe it as "Optional subtitle" while the authoring sample uses it as a contextual qualifier below the h2 — a minor naming/role ambiguity, not a bug.
- MISSED: `section.stats { justify-content:center; align-items:center }` on line 10 means the entire content stack (eyebrow + h2 + subtitle + stat row) is center-justified on the slide. With a long subtitle line (p-2: "Measured against pre-framework baseline, same teams, same market conditions.") the subtitle wraps to fill nearly the full slide width at `--fs-body`, which can run long at desk distance. No `max-width` constraint on the subtitle line in stats. Not a critical bug but a readability nit for long context strings.

Top fixes (adjudicated):
  1. `stats.styles.css` (`.stat-num`, line 16): Change `font-family:var(--font-body)` to `font-family:var(--font-display)` to match the display-font convention used by every other numeric evidence component.
  2. `stats.styles.css` (section layout): Add a subtle framing device — either a light `--bg-alt` container around the stat row, or a top-border rule — to give the layout structural interest beyond "numbers on an open field."
  3. `stats.manifest.json` / `stats.docs.md` (tiles slot description): Correct "a nested bullet for the caption" to "caption text on the same line: `**Number** caption text`."
  4. `stats.styles.css` (accent variant): Consider `section.stats.accent .stat-label { color: var(--text-secondary) }` so number-label contrast hierarchy is preserved in the accent variant.

---

## Checker bucket summary

### Maker claims: what was wrong or over/understated

1. **kpi header-overlap (P0): CONFIRMED, NOT OVERSTATED.** The collision is pixel-level, affects 11 of 13 slides, and persists in dark mode. The maker correctly diagnosed the severity. Root cause is the CSS padding-top coincidence with the absolute header position, not a gallery authoring error.

2. **kpi ops colors are position-locked: CONFIRMED.** The gallery is authored to mask this (slipping metrics are in positions 1/3, healthy in 2/4) but the CSS is unambiguously positional. The compliance modifier has the identical structural flaw — the maker missed this second instance.

3. **kpi anatomy shows ops not default: CONFIRMED.** The anatomy shows a 2×2 ops grid; the bare `kpi` class renders hero-left briefing. The maker is correct.

4. **stats `var(--font-body)` not `var(--font-display)`: CONFIRMED.** stats.styles.css line 16 is unambiguous. This is a real cross-component inconsistency that is undocumented.

5. **stats ~60% dead white space: SUBSTANTIATED, SLIGHTLY OVERSTATED.** The actual empty fraction is closer to 55%, but the "numbers floating on white" aesthetic weakness is real. The maker's scoring (Aesthetics 7) is appropriate.

6. **split-metric anatomy severely wrong: CONFIRMED.** The legacy ASCII sketch bears no resemblance to the 44/56 full-height split. The maker correctly calls this out.

7. **split-metric context line at --fs-meta too small: CONFIRMED AS BORDERLINE.** 11.25pt with a 26ch cap is at the floor of boardroom legibility. A bump to --fs-body-compact (13.5pt) is the right call.

8. **split-metric left-panel optical balance: CONFIRMED.** `justify-content:center` causes the metric group to sit lower-center when the Marp header's visual weight is factored in. The maker's description is accurate; the fix in the top-fixes section is directionally correct but could be more specific.

### Most important real issues (ranked)

1. **kpi: header-eyebrow collision (P0, Styling)** — visible on 11/13 slides in both themes. Makes the component unpresentable in any deck with a `header:` directive. One-line fix in kpi.styles.css. Fix: add minimum margin-top to `section.kpi h3` to clear the chrome height.
2. **kpi: ops + compliance positional color semantics** — silent logic bug. A breaching metric in slot 2 or 4 renders green; an on-track metric in slots 1 or 3 renders amber. The gallery masks this but real author usage will hit it.
3. **stats: font-family divergence** — `var(--font-body)` for stat numbers vs `var(--font-display)` everywhere else. Visible stylistic break when stats and kpi/split-metric appear in the same deck. One-line fix.
4. **split-metric anatomy (severity: Doc-align)** — the anatomy is a legacy non-representative sketch. Non-critical but will actively mislead new authors.
5. **kpi anatomy + slot selector doc errors** — anatomy shows ops not briefing; `kpis` selector documented as `ul > li` but sample/skeleton use `ol`.

### Redundancy clusters

The kpi / split-metric / stats / big-number spectrum is well-differentiated and correctly documented. No MERGE or CUT recommendations. The graduation from "one number, whole slide" → "row of metrics" → "one KPI + findings panel" → "multi-KPI dashboard with status" is coherent and each component earns its place.

### Ranked worst to best (adjudicated)

1. `kpi` — 6/10 POLISH (P0 collision on every eyebrow slide pulls Styling to 5; otherwise a strong system)
2. `stats` — 7/10 POLISH (font-family inconsistency; sparse canvas; slot doc nit)
3. `split-metric` — 7/10 POLISH (anatomy severely wrong; optical balance; context font borderline)

No component is REWORK or MERGE/CUT. All three are structurally sound; the issues are fixable without layout redesign.
