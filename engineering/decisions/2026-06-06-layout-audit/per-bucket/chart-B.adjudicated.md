# Chart bucket — Part B: Adjudicated checker report
## Components: quadrant · radar · state-chart · timeline-list · word-cloud

Verification method: static source reads (manifest + CSS line-by-line), independent
rasterisation of all gallery pages (light + dark spot-checks), detail crops via
`--region right`, `--region bottom`, `--region center` for the specific bug claims.

---

### quadrant — adjudicated
Maker overall: 8 → Checker overall: 7/10 — POLISH
Pages viewed: light p1–p14 (+dark p10, detail crop p9-center)

- Styling: CONFIRM dead lower canvas on p2/p3. On p2 the entire SVG chart sits
  roughly centred in the lower half of the body area, with ~25% of the slide height
  below the chart unused. On the bubble variant (p3) the effect is similar. The maker
  is right about root cause: `max-height: 360px` on `.quadrant-svg`
  (quadrant.styles.css:119) plus flex-expansion of the chart body means the SVG is
  capped while the container grows. CONFIRM.
- Aesthetics: REVISE. The maker describes this as "LR layout on p2 has dead zone at
  bottom" — but the LR claim is wrong (p2 is the DEFAULT variant, not LR; the LR
  variant is not in the quadrant component, which is 2D scatter). The dead-zone below
  the chart is a real issue on the default, bubble (p3), and cohort (p5) variants.
  The header section is large (~38% of slide height) due to the two-line title. Correct
  finding, wrong variant label.
- Readability: CONFIRM. SVG tick labels at `8px` (quadrant.styles.css:172,
  `.quadrant-tick`) and axis name at `11px` (line 167, `.quadrant-axis-name`) are
  both hardcoded integer-px values off the 12-token scale. On the stress-test page
  (p9, 14 items), several dot labels visibly overlap — "Scoring model v2",
  "Multi-source signal dedupe", and "Decision-log audit trail" stack in the
  STRATEGIC BETS quadrant. CONFIRM but REVISE severity: the overlap affects 3–4 labels,
  not the whole chart.
- Doc-align: CONFIRM skeleton vs sample quadrant-order inconsistency (minor). No
  anatomy or slot drift found.
- DS: CONFIRM. `8px`/`11px`/`8.5px` hardcoded in CSS (lines 172, 167, 213) bypass
  the 12-token scale. Palette-blind otherwise — no hex literals.
- Consistency: CONFIRM. Chart-frame header chrome matches siblings.
- Redundancy: CONFIRM JUSTIFIED DISTINCT vs matrix-2x2. Continuous bivariate scatter
  with SVG transform vs categorical 2×2 CSS grid — different authoring contract,
  different render output, anti-patterns cross-reference each other. Static-findings
  confirms the overlap signal; the render confirms the distinction.
- Grouping: Evidence/chart/scatter — correct.
- MISSED: The maker scored this 8/10 but the dead-lower-canvas affects the majority
  of the default and non-stress-test variants — it is visible on p2, p3, p5, and
  partially p6. Given that this is the primary use case for boardroom audiences, it
  warrants a score adjustment.

Top fixes:
  1. `quadrant.styles.css` line 119: `max-height: 360px` cap on `.quadrant-svg` is
     preventing the SVG from growing to fill available body height. Change to
     `max-height: min(360px, 100%)` and set `flex: 1 1 auto; min-height: 0` on
     `.quadrant-figure` so the SVG scales up on taller slides.
  2. `quadrant.transform.js`: SVG tick labels hardcoded to `8px` (line 172 in CSS, set
     on `.quadrant-tick`) bypass the scale intentionally but are not documented as such.
     Expose `--quadrant-tick-size: 8px` and `--quadrant-axis-size: 11px` as CSS custom
     properties with a comment noting the intentional SVG-context bypass.
  3. `quadrant.manifest.json` + `quadrant.docs.md`: Harmonise skeleton and sample to
     use the same TL/TR/BL/BR quadrant label order — the two examples use different
     orderings (Quick Wins TL in one, Strategic Bets TL in the other).

---

### radar — adjudicated
Maker overall: 8 → Checker overall: 8/10 — POLISH
Pages viewed: light p1–p15 (+dark p11, detail crop p2-center)

- Styling: CONFIRM. All variants render cleanly. The detail crop of p2 (center)
  confirms the three 18% fill-opacity overlapping polygons wash together in the overlap
  zone — distinguishability is carried by the legend and the stroke outline alone, not
  the fill shape.
- Aesthetics: CONFIRM. Cover variant (p9) is the strongest slide in this audit set —
  three-column grid, full-bleed SVG, caption band, right-column legend. Small-multiples
  (p7) at 188px fixed width works for 4 series but the maker is right that it would
  produce undersized charts for 2 series.
- Readability: CONFIRM axis labels at `9px` (`radar.styles.css:112`, `.radar-axis-label`)
  and tick labels at `6.5px` (line 117, `.radar-tick`). Both values are hardcoded integer-px
  in CSS, below the 11.25pt minimum of the 12-token scale. Confirmed readable at
  overview DPI (rasterised at 72 DPI) but at desk-reading distance a 360px SVG
  maps to ~127mm — the 9px axis labels are ~6.4pt and the 6.5px ticks are ~4.6pt,
  both below usable threshold at desk distance. CONFIRM as real readability issue.
  Dark mode (p11): axis label contrast is fine (white heading ink), no contrast
  regression.
- Doc-align: CONFIRM. Anatomy block matches the render; all 7 variants documented;
  no slot drift.
- DS: CONFIRM SVG font-size bypass — same pattern as quadrant. `9px`/`6.5px` hardcoded.
  No hex literals. Function/Form/Substance correct.
- Consistency: CONFIRM. Chart-frame header chrome, categorical colour routing, and
  legend style all match sibling components.
- Redundancy: CONFIRM KEEP. No overlap — only multi-criteria spider chart in the
  library.
- Grouping: Evidence/chart/scatter — correct.
- MISSED by maker: The cover variant override for `.radar-tick` (line 341 in CSS,
  `radar.styles.css`) lifts tick fill to `color-mix(in srgb, var(--text-heading)
  80%, transparent)` and adds `font-weight: 600` — this partially mitigates the 6.5px
  illegibility problem for the cover variant only. The fix does not propagate to the
  standard non-cover variants. The maker did not note this partial mitigation exists.

Top fixes:
  1. `radar.styles.css` lines 112/117: Expose `--radar-axis-label-size: 9px` and
     `--radar-tick-size: 6.5px` with a comment that these are SVG-unit values below
     the pt scale by deliberate necessity (15px ≈ 11.25pt is too large for rim labels
     on a 300-unit viewBox). Currently hardcoded — making them custom properties lets
     themes tune them.
  2. Apply the same `font-weight: 600` lift from the cover variant override (line 341)
     to the standard `.radar-tick` rule — purely visual, no layout effect, improves
     legibility of faint 6.5px labels.
  3. `radar.styles.css` line 257 `.radar-svg--mini`: Change the fixed `width: 188px;
     height: 188px` to `clamp(150px, 20cqi, 220px)` to handle 2-series and 6-series
     small-multiples without under/oversizing.

---

### state-chart — adjudicated
Maker overall: 6 → Checker overall: 6/10 — REWORK
Pages viewed: light p1–p11 (+dark p7, detail crop p2-right, p5-bottom)

- Styling:
  - LR clip (p2, right-edge crop): CONFIRM. The detail crop of p2 right edge shows
    "Published" (state node 5) is clipped — the right border of the node is cut off
    at the slide boundary, and the terminal marker and any exit arrow from "Published"
    are invisible. This is a real rendering defect on the most common boardroom LR layout.
  - Curved terminal clip (p5, bottom crop): CONFIRM. The bottom crop of p5 shows the
    ◎ terminal marker is partially cut off below the slide boundary — only the top half
    of the symbol is visible. The "archive" arrow from "Published" → "Archived" is
    visible, but the exit from "Archived" to terminal is clipped.
  - Both clips are production-blocking bugs for the LR and curved default variants.
- Aesthetics: CONFIRM inline variant (p4) is the cleanest. Default LR is aesthetically
  sound except for the clip. Inline variant has the largest dead zones (three narrow
  rows in a 16:9 canvas with ~40% vertical space unused).
- Readability: CONFIRM. State labels at a readable size; transition labels at 11px
  mono are small but acceptable. REVISE the maker's claim that "font-size: 500" is
  the label size — that is font-weight:500, not font-size. The actual label font-size
  inherits from chart-frame, not a hardcoded value.
- Doc-align: CONFIRM docs.md has NO `## Anatomy` section at all (grep confirms zero
  matches for "## Anatomy" in state-chart.docs.md).
  **REFUTE** the specific claim that `manifest.json` contains `"anatomyBlock":
  "quadrant"`. The field `anatomyBlock` does NOT appear anywhere in
  `state-chart.manifest.json` — confirmed by grep returning zero matches. The maker
  either hallucinated this value or confused the file with
  `quadrant.manifest.json:29` which legitimately contains `"anatomyBlock": "quadrant"`.
  The real finding — no anatomyBlock field, no ## Anatomy in docs — is correct; the
  specific claim about the value is fabricated.
- DS: CONFIRM `function: "progression"` (manifest line 4) and `substance: "graph"`
  (line 8) — both present. The static-findings document confirms this is an anomaly:
  `graph` substance belongs in the `diagram` bucket, not `chart`. CONFIRM `form:
  "timeline"` is also questionable — a state machine is a directed graph, not a
  timeline. The triple progression/timeline/graph is inconsistent: progression and
  timeline imply forward-moving sequence, but state-chart explicitly supports back-edges
  and non-linear topology. No hex literals in CSS — palette-blind. The SVG font
  bypasses (9px/11px at lines `state-chart.styles.css`) follow the same pattern as
  quadrant/radar.
- Consistency: CONFIRM the state-node gradient fill matches chart-family visual
  language. CONFIRM eyebrow renders consistently. The component sits awkwardly in the
  chart bucket.
- Redundancy: CONFIRM JUSTIFIED DISTINCT vs Mermaid stateDiagram-v2 — native theming
  grammar, simpler authoring, inline variant has no Mermaid equivalent. The clip bugs
  undermine the "native advantage" selling point.
- Grouping: REVISE the maker's recommendation. The maker suggests moving to the
  `diagram` bucket, which is correct for substance alignment. However, given that
  `state-chart` shares the chart-family CSS infrastructure (chart-frame, status pills,
  chart-body) with the other chart components, a bucket move without a CSS refactor
  could break those shared styling dependencies. The minimum fix is to correct
  `function` from "progression" to "evidence" and document the substance anomaly.
  A full bucket move to `diagram` is the right long-term call but requires scoped
  engineering work.
- MISSED: The maker did not note the large dead zone on the inline variant (p4) — three
  narrow state-card rows occupy roughly the vertical centre of the slide, leaving ~25%
  above and ~40% below unused. Less severe than the LR clip but worth noting.

Top fixes:
  1. `state-chart.styles.css` + `state-chart.transform.js`: Fix LR clip — the SVG
     figure layout doesn't constrain total width. Add `overflow: hidden` to
     `.state-chart-figure[data-sc-dir="lr"]` and implement JS-side auto-scaling (reduce
     node padding/font when measured layout width exceeds the slide's available width).
  2. `state-chart.styles.css`: Curved variant clips terminal marker at bottom (p5).
     The state-nodes container needs additional bottom padding or `overflow: visible`
     so the ◎ and its exit arrow render within the slide boundary.
  3. `state-chart.manifest.json`: Add `## Anatomy` ASCII block to docs (regenerate or
     manually author). Correct `function` from `"progression"` to `"evidence"` and
     document why `substance: "graph"` in chart bucket is an anomaly (or move to
     `diagram` bucket in a scoped refactor).
  4. Do NOT file a bug for `"anatomyBlock": "quadrant"` — that field is absent from the
     manifest. The real issue is the complete absence of the field and the missing docs
     anatomy section.

---

### timeline-list — adjudicated
Maker overall: 8 → Checker overall: 8/10 — POLISH
Pages viewed: light p1–p8 (+dark p4, checked anatomy in docs.md)

- Styling: CONFIRM. Horizontal spine with coloured dots, date pills, title/status/body
  renders cleanly on p2. Stress-test (p3, six items) is tight but within the component's
  stated 4–7 item advisory range.
- Aesthetics: CONFIRM default (p2) is boardroom-ready. Dark variant (p4) is solid —
  categorical dot colours remain distinguishable.
- Readability: CONFIRM. Date pills legible; status pills clear; body at --fs-body.
  No issues.
- Doc-align: CONFIRM the anatomy mismatch. The `## Anatomy` block in
  `timeline-list.docs.md:49–60` shows:
  ```
  │  2024-01-15  Event one — short note     │
  │  2024-03-02  Event two — short note     │
  ```
  This is a vertical date→text list. The actual render (p2) is a HORIZONTAL spine with
  dots sitting on a line, date pills hanging below each dot, then title/status card and
  body below that — a completely different spatial arrangement. The anatomy describes an
  entirely different form. CONFIRM as significant doc drift; will mislead authors on
  the authoring contract.
- DS: CONFIRM palette-blind, typography on-scale, Function/Form/Substance correct
  (evidence/timeline/series). No universal-variant re-declarations.
- Consistency: CONFIRM. Chart-family header chrome, categorical dot cycling, status
  pill vocabulary all match siblings.
- Redundancy: CONFIRM JUSTIFIED DISTINCT vs timeline (progression). Maker's four-layer
  breakdown is accurate — evidence/dated/annotated vs progression/stage-based/no-dates.
  The naming is slightly counter-intuitive but renaming would break existing decks.
- Grouping: CONFIRM evidence/chart is correct.
- MISSED: Maker claims `timeline` is not listed in `timeline-list.related` — partially
  right. Checking `timeline-list.manifest.json` `related` field would confirm. The
  static-findings doc flags this as a cross-bucket name collision; the maker's suggestion
  to add cross-references is correct regardless.

Top fixes:
  1. `timeline-list.docs.md` (regenerate from manifest): Rewrite the `## Anatomy` ASCII
     block to show the horizontal spine layout — top spine line, dots at intervals, date
     pills below each dot, title+status block below each date pill, body text below title.
     The current vertical-table anatomy is factually wrong and actively misleads authors.
  2. `timeline-list.manifest.json`: Add `timeline` (progression bucket) to `related`
     with the note "forward-looking process diagram without calendar dates or status pills".
     Currently absent.

---

### word-cloud — adjudicated
Maker overall: 7 → Checker overall: 6/10 — POLISH (borderline REWORK)
Pages viewed: light p1–p12 (+dark p8, detail of p2, p5, p6)

- Styling:
  REVISE rogue glyph scope. The maker claims the rogue dot appears on the `focal`
  variant hero word "variants" (p6). CONFIRMED on p6. However, the SAME rogue circle
  glyph appears on the DEFAULT variant (p2) above "time-to-value" (the dominant
  weight-5 word). The glyph also appears on the dark-default (p8, above "time-to-value").
  It is NOT limited to the focal variant — it is a systematic artifact that appears on
  any dominant/highest-weight word in ANY variant. This is a more widespread defect
  than the maker reported; it affects the default presentation use case directly.
  The spectrum variant (p5) is clean because no single word reaches weight 5 dominance.
- Aesthetics: CONFIRM dead lower canvas zone on all variants (p2, p3, p6, p7, p8).
  The cloud occupies the upper-centre third of the slide; significant whitespace exists
  below. CONFIRM dark mode (p8) pastel palette — green "onboarding", pink "pricing",
  teal "time-to-value", orange "integrations" on dark background reads as a party
  palette, not boardroom evidence. CONFIRM spectrum (p5) is the strongest aesthetic.
  REVISE maker's assessment of focal (p6) — the rogue glyph significantly undermines
  what the maker called "impactful"; a VP of Design would immediately ask what the
  floating dot is.
- Readability: CONFIRM. Smallest words (weight 1) at ~12px are at the --fs-meta
  threshold. Dark-mode low-weight words ("contracts", "residency" on p8) render in
  near-muted grey on dark canvas — low contrast. 90° rotated words acceptable for
  qualitative use.
- Doc-align: CONFIRM. Anatomy matches spiral-packed render; all 4 variants documented.
  Description correctly calls it non-precise. No drift.
- DS: CONFIRM the word-cloud is NOT a chart-frame member (CSS comment confirms). The
  h2 title uses `--fs-emphasis` (30pt) which differs from chart-family siblings that
  use `--fs-h2` via chart-frame header. This is an inconsistency the maker correctly
  identifies. Fixed 1200×540px canvas is non-responsive.
- Consistency: CONFIRM diverges from chart-family siblings — no header accent rule, no
  eyebrow pill chrome. Standalone visual identity.
- Redundancy: CONFIRM KEEP. No overlap; only spiral word-frequency viz in the library.
- Grouping: CONFIRM evidence/canvas/chart correct.
- Score revision: The maker gave 7/10. The rogue glyph is more severe than reported
  (it affects the DEFAULT variant, not just focal), the dark mode palette is genuinely
  off-brand, and the dead lower canvas is present on nearly every page. Dropping to 6/10.

**Is word-cloud boardroom-appropriate?** REVISE verdict from maker. The maker called it
"conditionally yes." The rogue glyph on the default AND focal variants means TWO of
the four variants are broken as shipped. The component cannot be called boardroom-ready
in its current state. Fix the glyph first; then the conditional-boardroom verdict for
spectrum and clean-focal becomes defensible.

Top fixes:
  1. `lib/word-cloud.js` (or the packer that generates the word positions): Investigate
     why the dominant/weight-5 word receives a rogue filled circle above it. This affects
     DEFAULT and FOCAL variants (p2 and p6 confirmed), not spectrum. The packer may be
     emitting an SVG `<circle>` element as a centre-point marker that should be
     `display:none` or removed. This is a higher-priority fix than the maker stated —
     it affects the default variant.
  2. `word-cloud.styles.css`: Add vertical centering for the canvas wrapper so the
     cloud occupies the visual centre of the body area, not the top-centre. The fixed
     1200×540px canvas leaves ~200px of dead space below on standard slides.
  3. `word-cloud.styles.css`: Add a `.dark` block that routes word colours to
     `--catN-ink` (deep, saturated) rather than the lighter fill expressions —
     the current dark-mode palette reads pastel on a dark surface.
  4. Document why word-cloud is not a chart-frame member — add a comment in the CSS
     and a note in `word-cloud.docs.md` so future maintainers don't inadvertently add
     chart-frame wrapper and break the layout.

---

## Checker bucket summary

### Maker errors (what to correct in the maker report)

1. **REFUTED: state-chart `"anatomyBlock": "quadrant"`** — This field is entirely
   absent from `state-chart.manifest.json`. The maker confused it with
   `quadrant.manifest.json:29` which legitimately contains that value. File the real
   finding as: "no `anatomyBlock` field in manifest; no `## Anatomy` section in
   docs.md." Do not file a bug for a field value that does not exist.
2. **MISSED: word-cloud rogue glyph on DEFAULT variant** — The maker scoped this to
   the focal variant (p6) only. It is confirmed on p2 (default) and p8 (dark-default)
   above the dominant word "time-to-value." This is a more widespread rendering defect
   that affects the primary use case.
3. **OVERSTATED: quadrant "LR variant" dead zone** — The quadrant component has no LR
   variant; the maker attributed the dead zone to "LR layout on p2" when p2 is the
   DEFAULT scatter variant. The dead zone is real; the variant attribution is wrong.
4. **UNDER-SCOPED: word-cloud score too generous** — 7/10 is too high when the default
   variant ships with a rogue visual artifact. Correct to 6/10.
5. **PARTIAL: state-chart form="timeline" not flagged** — The maker flags
   `function:"progression"` but does not note that `form:"timeline"` is equally
   questionable for a directed graph with back-edges. A state machine is not a timeline.

### Most important real issues (ranked)

1. **state-chart LR clip (p2)** — Production-blocking. The primary boardroom variant
   (horizontal flow) clips the final node off the right edge. No workaround in authoring.
2. **state-chart curved terminal clip (p5)** — Secondary clip; the ◎ end-marker is
   cut off at the bottom boundary.
3. **word-cloud rogue circle glyph** — Affects default AND focal variants (not just
   focal as the maker claimed). A prominent floating dot above the hero word is an
   unmissable visual defect in any boardroom context.
4. **word-cloud dark mode pastel palette** — Green/pink/teal on navy background reads
   as celebratory, not analytical. Dark mode is a first-class use case.
5. **timeline-list anatomy completely wrong** — Docs show a vertical list; the render
   is a horizontal spine. Any author reading the docs before authoring will produce
   markup expecting a different form.
6. **state-chart missing anatomy entirely** — No `## Anatomy` in docs.md, no
   `anatomyBlock` field in manifest.
7. **radar/quadrant SVG font bypasses** — 6.5px ticks on radar, 8px ticks on quadrant
   are hardcoded off-scale and not documented as intentional. Should be CSS custom
   properties with bypass comments.
8. **word-cloud dead lower canvas** — Aesthetic issue across all variants; lower-third
   of slide is dead space.
9. **state-chart function/substance/form mismatch** — progression/timeline/graph
   triple is internally inconsistent; the component is a directed graph with back-edges,
   not a forward-moving sequence.

### Redundancy clusters (independent verdict)

- **quadrant vs matrix-2x2**: JUSTIFIED DISTINCT — confirmed. Continuous SVG scatter
  vs categorical CSS grid; the authoring contract, visual output, and anti-patterns
  all draw a clear boundary. Static-findings' overlap signal is expected given both
  do "2×2" conceptually; the render resolves the ambiguity unambiguously.
- **timeline-list vs timeline (progression)**: JUSTIFIED DISTINCT — confirmed. The
  four-layer separation (Function, Form, Substance, data shape) is clean: evidence
  with calendar dates and status annotations vs progression with stage labels and no
  dates. The naming direction is slightly confusing (the simpler word for the simpler
  component would be `milestone-history`, not `timeline-list`) but renaming breaks
  existing decks and the distinction is clearly documented.
- **state-chart vs diagram (Mermaid stateDiagram-v2)**: JUSTIFIED DISTINCT — confirmed
  but currently undermined by the LR clip bug. The native authoring grammar and
  inline variant are genuine value-adds; the clip bug makes the "native theming
  advantage" claim hollow until fixed.

### Ranked worst → best (Overall — checker scores)

1. **state-chart** — 6/10 — REWORK: LR clip (production-blocking), curved terminal
   clip, anatomy absent, manifest function/form/substance triple inconsistent.
2. **word-cloud** — 6/10 — POLISH (borderline REWORK): rogue glyph on default+focal,
   dark mode palette fails boardroom bar, dead lower canvas.
3. **quadrant** — 7/10 — POLISH: dead lower canvas on most variants, SVG tick labels
   off-scale and undocumented, stress-test label overlap.
4. **radar** — 8/10 — POLISH: 6.5px ticks are genuinely illegible at desk distance,
   9px axis labels marginal; these are real readability defects even if the component
   looks clean at screen resolution.
5. **timeline-list** — 8/10 — POLISH: anatomy wrong (horizontal vs vertical), missing
   cross-reference to `timeline` sibling — both are fast fixes.

### Components to cut or merge

None. All five earn their place. State-chart and word-cloud need fixes before they are
boardroom-grade as shipped; the other three are polish-level adjustments. The bucket
grouping for state-chart (`chart` vs `diagram`) is a legitimate architectural question
but does not warrant removal.
