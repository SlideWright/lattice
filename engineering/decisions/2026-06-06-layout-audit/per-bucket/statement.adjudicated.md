# Statement bucket — adjudicated checker report

Checker: CHECKER agent · Date: 2026-06-06
Source: maker report at `.scratch/audit/maker/statement.md`
Pages viewed: All light gallery pages for all 6 components; dark spot-checks p3 (big-number, content, quote, split-statement). Bucket survey p1-p7. Center-region detail on big-number p2.

---

### big-number — adjudicated
Maker overall: 9 → **Checker overall: 8/10** — KEEP (score revised down 1 point)
Pages viewed: light p1-p7 (+dark p3) + center-region detail p2

- Styling: CONFIRM clean on all variants. No overflow, no clipping. Centering correct. Dark variant (p3) well-composed.
- Aesthetics: REVISE. Maker said 9/10 "exemplary." At the full slide level, the number group lands slightly above true-center on p2 and p4 — optically this is deliberate and acceptable. However, the caption's `--fs-message` (21pt) at 2 lines creates a significant visual mass gap between the number and caption that reads as slightly disconnected at desk distance. The group cohesion (eyebrow → number → caption) depends on the caption being short; the gap at 2 lines (p2) is a real but minor nit. Not 9/10-exemplary.
- Readability: CONFIRM. Number at `--fs-hero` is unmistakable. Eyebrow tracked uppercase at `--fs-meta`. Caption at `--fs-message` reads well.
- Doc-align: CONFIRM the noted cosmetic-only mismatch (sample uses `$48M`, anatomy shows `42×`) is trivial. No functional drift. Slots correct.
- DS: CONFIRM clean. `justify-content:center; align-items:center` (big-number.styles.css:13). No hex literals. All tokens correct.
- Consistency: CONFIRM eyebrow pattern consistent with siblings. MISSED nit: On p6 (the "anti-patterns" doc slide, which uses the `content` layout inside the gallery), the big-number gallery renders a `content`-layout slide — this exposes the content top-hug bug inside the big-number gallery, not a big-number issue, but it's visible there. Not counted against big-number.
- Redundancy: CONFIRM unique. KEEP.
- Grouping: Correct.

MISSED by maker:
- **MISSED: No delta/unit sub-token support.** The number slot in `big-number.styles.css` applies a single `--fs-hero / color:var(--accent)` rule to the entire first `li`. If an author wants a smaller unit prefix ("$") or a smaller delta suffix ("↑12%"), there is no CSS support — both would render at `--fs-hero` in accent color. The manifest's sample only shows `$48M` (the `$` and `48M` as one token), which happens to look right, but the anti-pattern guidance mentions "single metric" without addressing how to style compound metrics. This is a real authoring footgun and a gap in the component model. Low priority but worth a nit in the CSS with a comment: "use nested `<span>` + a future `big-number-unit` variant for mixed-size currency/unit prefixes."
- **MISSED: No dark-mode accent contrast check in the `accent` variant.** P5 (accent modifier) on the light gallery appears to use the same `--accent` number color on a white background — fine. But the dark+accent combo is not in the gallery and could produce low contrast if `--accent` maps to a light color in dark mode (accent-on-dark). Not a confirmed bug, but not covered by the gallery.

Top fixes:
  1. `lib/components/statement/big-number/big-number.styles.css`: Add a comment documenting the "compound metric" authoring pattern (unit prefix or delta suffix via nested span), or add a CSS rule for `.unit` / `.delta` sub-classes at a lower token size. This prevents authors from inventing their own inline formatting for `$48M ↑12%`-style metrics.
  2. `lib/components/statement/big-number/big-number.gallery.md`: Add one slide showing a compound metric (e.g., `$48M` with a `+14%` delta) to demonstrate the expected authoring approach and expose any rendering gap.

---

### content — adjudicated
Maker overall: 5 → **Checker overall: 5/10** — REWORK (CONFIRM)
Pages viewed: light p1-p7 (+dark p3)

- Styling: CONFIRM critical. `section.content { justify-content:flex-start; }` (content.styles.css:11) causes content to hug the top across every variant (p2-p5, confirmed in dark p3 and accent p5). Bottom ~55% of the slide is empty white floor on a 3-line paragraph. This is systemic and unconditional — ALL gallery variants show it identically.
- Aesthetics: CONFIRM 4/10. The bucket survey (survey p3) makes the contrast with big-number (p2) and quote (p4) immediately visible: both siblings center their content; content top-hugs. Side-by-side it looks like a layout that wasn't finished.
- Readability: CONFIRM 7/10. Text is fine at the sizes used. The paragraph running full-canvas width is a real line-length concern — at the standard 16:9 canvas a 3-line paragraph runs to approximately 90 characters per line at `--fs-message`, which is above the comfortable maximum (~75 chars). The maker's note about a `max-width` constraint is correct. Not just cosmetic: this is a readability issue.
- Doc-align: CONFIRM accurate. Anatomy matches render (both show heading + paragraph at top of content area). Ironically the anatomy IS accurate — it just shows a layout that's badly balanced.
- DS: CONFIRM. `justify-content:flex-start` is not itself a DS violation; it is a design judgment that produces a substandard result. The real violations are aesthetic/readability, not token-level.
- Consistency: CONFIRM sole top-aligner among canvas components. `big-number` uses `justify-content:center; align-items:center`. `quote` uses `justify-content:center; align-items:center`. `content` is the only outlier.
- Redundancy: CONFIRM KEEP (with fix).
- Grouping: Correct.

REVISE on verdict framing: Maker called this REWORK but gave only two top fixes and rated Styling 5. I agree with REWORK. The fix is a ONE-LINE CSS change (`flex-start` → `center`), but it must be confirmed visually once applied — longer paragraphs would then need a `max-width` to avoid miscentered text that reads wide. The vertical centering fix and the line-length fix are coupled. Score stays 5/10 until both are addressed.

MISSED by maker:
- **MISSED: No `max-width` on the content text block causes over-wide lines.** Maker mentioned this but classified it as "Not critical." At 16:9 canvas size and `--fs-message` (21pt), a standard paragraph runs ~90 chars/line — past the comfortable threshold. This is a readability bug, not just a polish item. Should be priority fix #2.
- **MISSED: h3 nested-heading rendering.** content.styles.css has a rule `section.content h3 { margin-bottom:0.3125cqi; }` suggesting h3 sub-heading is a supported pattern, but the gallery has no example of h3 usage and the docs.md Anatomy/Slots table does not mention it. Minor undocumented behavior.

Top fixes:
  1. `lib/components/statement/content/content.styles.css:11`: Change `justify-content:flex-start` to `justify-content:center`. This eliminates the dead lower half. Pair with visual spot-check after applying.
  2. `lib/components/statement/content/content.styles.css`: Add `max-width: 72cqi` (or similar) to the `section.content p` and `section.content :is(ul, ol)` rules to prevent over-wide line lengths. This is a readability fix, not cosmetic.
  3. `lib/components/statement/content/content.docs.md` (Anatomy and Slots): Document the `h3` sub-heading pattern currently handled in CSS but absent from docs.

---

### quote — adjudicated
Maker overall: 8 → **Checker overall: 8/10** — POLISH (CONFIRM)
Pages viewed: light p1-p7 (+dark p3)

- Styling: CONFIRM `rgba(0,0,0,0.07)` box-shadow on quote.styles.css:17. Verified. This is the only hardcoded colour value in the component. Everything else is token-clean.
- Aesthetics: CONFIRM 8/10. The card approach is polished. Attribution gap (`padding-top:var(--sp-xl)` before the `> p`) is generous — the space between card bottom and attribution text reads as slightly disconnected on p2 at overview zoom. Confirmed in detail at survey p4.
- Readability: CONFIRM clean. `max-width:64.0625cqi` on the blockquote prevents over-wide lines. Attribution at `--fs-meta` is small but legible.
- Doc-align: CONFIRM matches. No eyebrow slot (intentional). Slots table is accurate.
- DS: CONFIRM the `rgba(0,0,0,0.07)` shadow violation. REVISE the maker's claim about `border-radius:1.40625cqi` — the maker flagged this as possibly not using a token. Verified in CSS: `border-radius:1.40625cqi` (quote.styles.css:16). This is a layout-specific explicit size, not a `var(--radius-*)` token. The maker correctly flagged it but should have been more definitive: this IS a DS token miss. The `--radius-md` or `--radius-lg` tokens exist and should be checked for equivalence. Minor severity.
- Consistency: CONFIRM eyebrow absence is intentional and correct.

MISSED by maker:
- **MISSED: Attribution `padding-top:var(--sp-xl)` creates a visual gap that disconnects attribution from card.** (survey p4) This is a design nit — the attribution should read as a caption directly below the card, but the xl spacing makes it feel detached. `--sp-md` or `--sp-lg` would tighten this without crowding. Nit, not a bug.
- **MISSED: The `accent` modifier (p5) produces no visual differentiation.** The card retains `var(--bg-alt)` background and `var(--border)` border regardless of the `accent` modifier. In the accent variant, the accent color appears only in the header bar and footer — the card itself is visually identical to the default. Authors expecting the accent modifier to color the card or its border will be confused. Worth documenting as a deliberate limitation in the docs, or adding a CSS rule for `.quote.accent blockquote` to use `border-color:var(--accent)` or similar.
- **MISSED: No `--fs-hero` or large display-size quote mark.** The opening/closing `"` glyphs use `var(--fs-h1)` (48pt). On the full canvas they appear relatively small as decorative marks. `--fs-emphasis` (30pt) would be too small; `--fs-h1` (48pt) is correct. However, the closing `"` glyph (::after) has `text-align:right` but it creates a visual awkwardness on long 2-line quotes where the `"` appears far below the quote text. Minor layout nit.

Top fixes:
  1. `lib/components/statement/quote/quote.styles.css:17`: Replace `rgba(0,0,0,0.07)` with `color-mix(in srgb, var(--text-body) 7%, transparent)` (maker's recommendation confirmed).
  2. `lib/components/statement/quote/quote.styles.css:16`: Replace `border-radius:1.40625cqi` with `var(--radius-lg)` (verify token value first; if not matching, document as layout-specific size with a comment matching the split-statement watermark pattern).
  3. `lib/components/statement/quote/quote.styles.css`: Reduce `padding-top:var(--sp-xl)` on the attribution `> p` to `var(--sp-md)` to close the visual gap between card and attribution.
  4. `lib/components/statement/quote/quote.docs.md`: Document the `accent` modifier behavior (no card color change; only header/footer are accent-colored).

---

### split-brief — adjudicated
Maker overall: 7 → **Checker overall: 7/10** — POLISH (CONFIRM)
Pages viewed: light p1-p7 (+dark p3)

- Styling: CONFIRM. Right-panel findings with left-rule chrome (`border-left:3px solid var(--accent)`) renders correctly across all variants. `justify-content:space-evenly` on the findings list (split-brief.styles.css:18) confirmed. The fragility at 2 findings is real but not demonstrated by the gallery.
- Aesthetics: CONFIRM 8/10. Dark left panel (38% width, `--bg-dark`) anchors well. Confirmed in compact (p4) and accent (p5) variants.
- Readability: CONFIRM. Finding title at `--fs-body` (16pt) bold is at the lower acceptable limit. Body text at `--fs-body` normal is fine. Left panel heading at `--fs-h1` (48pt) weight 800 is strong.
- Doc-align: **CONFIRM DRIFT.** The anatomy block in `split-brief.docs.md` (lines 51-61) reads:
  ```
  │ BRIEF      │  Executive paragraph
  │            │  on the right carries
  │ Brief      │  the body content,
  │ title      │  two or three lines.
  ```
  The right side is described as "Executive paragraph … two or three lines." The actual render (p2-p5 of gallery) shows a LEFT-RULE FINDINGS LIST with bold titles and nested body text — not a paragraph. This anatomy completely misrepresents the right panel structure. Any author reading only the anatomy would model the wrong authoring pattern.
- DS: CONFIRM palette-blind. No hex literals. Tokens used correctly.
- Consistency: CONFIRM right-panel h3 rubric at `--fs-meta` mono uppercase matches split-statement's h3 pattern exactly.
- Redundancy: See Bucket summary.
- Grouping: Correct.

MISSED by maker:
- **MISSED: Related component description for `split-list` is misleading.** The `split-brief.docs.md` Related section says: `split-list — the right side is a list of supporting points, not findings`. This implies findings and supporting points are categorically different, but both are bulleted lists. The actual differentiator is RIGHT PANEL CHROME (left-rule bars in split-brief vs rounded cards in split-list). The description should reflect the chrome/visual distinction, not an ambiguous content-type distinction.

Top fixes:
  1. `lib/components/statement/split-brief/split-brief.docs.md` anatomy block: Rewrite to show left dark panel (38%, heading + lede) AND right panel with left-rule findings list. Current anatomy is actively misleading.
  2. `lib/components/statement/split-brief/split-brief.styles.css:18`: Consider replacing `justify-content:space-evenly` with `flex-start` + `gap:var(--sp-lg)` for more predictable spacing with variable finding counts.
  3. `lib/components/statement/split-brief/split-brief.docs.md` Related: Clarify `split-list` vs `split-brief` distinction around right-panel chrome (cards vs left-rule bars), not ambiguous "findings vs points" language.

---

### split-list — adjudicated
Maker overall: 8 → **Checker overall: 8/10** — POLISH (CONFIRM)
Pages viewed: light p1-p8 (+dark p4)

- Styling: CONFIRM clean. Cards well-spaced. Watermark decorative letterform (T on p2-p3, A on p3) renders correctly. Mirror variant (p3) correct. Audience/Intent footer pins to bottom cleanly.
- Aesthetics: CONFIRM 9/10. The accent-coloured left panel (34%, `--accent`) is the visually boldest layout in the bucket. Card-style right items create clear hierarchy. Footer adds context without competing.
- Readability: CONFIRM 8/10. Cards at `--fs-body` bold titles are good scan points. Left panel heading at `--fs-emphasis` (30pt) in accent color reads strongly.
- Doc-align: CONFIRM the `panel-eyebrow` slot naming confusion. The slot is documented as "despite the slot name, it is not a left-panel eyebrow" — this parenthetical disambiguation is itself a sign of a naming problem. Verified: the h3 renders at the top of the right panel (p2: "Why understanding wins"), not the left panel. Slot name `panel-eyebrow` is a genuine footgun.
  - **ADDITIONAL DRIFT FOUND: split-list "See also" slide (p8) describes `split-statement` as "thesis + one big-number — quantitative version of split-list."** This is completely wrong. split-statement is a PULL QUOTE layout, not a quantitative/big-number layout. This description appears to be a copy-paste error from an earlier iteration. It needs correction in the split-list manifest's `related` field (and the gallery will regenerate the docs slide).
- DS: CONFIRM `#fff` fallback at split-list.styles.css:32: `var(--on-accent, var(--on-dark-primary, #fff))`. The `#fff` literal is technically a palette-blind violation. Confirmed.
- Consistency: CONFIRM header/footer color override (`--marp-slide-header-color: var(--on-dark-secondary)`) is correct because the dark header overlaps the accent panel.
- Redundancy: See Bucket summary.
- Grouping: CONFIRM `form:panel` is correct and intentionally distinct from `form:split` in split-brief and split-statement.

MISSED by maker:
- **MISSED: `related.split-statement` description in split-list manifest is completely wrong** ("thesis + one big-number — quantitative version of split-list"). The manifest's `related` array (line visible in the rendered p8 "See also" slide) reads: `split-statement — thesis + one big-number — quantitative version of split-list`. This is wrong on two counts: (1) split-statement is a pull-quote layout, not a big-number layout; (2) "quantitative version of split-list" mischaracterizes the relationship. This needs correction in `split-list.manifest.json` `related` field.
- **MISSED: No gallery variant with an ordered list (numbered cards).** The CSS has extensive rules for `ol` and `ol > li::before` numbered counter styling (split-list.styles.css:29-38). The gallery only shows unordered lists. Authors need a numbered variant example to understand the numbered card pattern.

Top fixes:
  1. `lib/components/statement/split-list/split-list.manifest.json`: Fix the `related` description for `split-statement` — change "thesis + one big-number — quantitative version of split-list" to "the left carries a pull quote, not a thesis statement."
  2. `lib/components/statement/split-list/split-list.manifest.json` + `split-list.docs.md`: Rename the `panel-eyebrow` slot to `right-rubric` or `section-rubric`. Update docs slot table to remove the parenthetical disambiguation.
  3. `lib/components/statement/split-list/split-list.styles.css:32`: Remove the `#fff` hardcoded fallback: `var(--on-accent, var(--on-dark-primary, #fff))` → `var(--on-accent, var(--on-dark-primary))`.
  4. `lib/components/statement/split-list/split-list.gallery.md`: Add a numbered-list variant slide to exercise the `ol` counter CSS.

---

### split-statement — adjudicated
Maker overall: 7 → **Checker overall: 7/10** — POLISH (CONFIRM)
Pages viewed: light p1-p7 (+dark p3)

- Styling: CONFIRM clean. 50/50 split with dark-panel quote + decorative `"` watermark at `17.1875cqi` renders correctly. Attribution (`cite` element) wraps on all variants. Right-panel `justify-content:space-evenly` (split-statement.styles.css:25) confirmed — same fragility as split-brief with 2 items.
- Aesthetics: CONFIRM 8/10. The layout is visually the strongest statement of the three split-* forms. Attribution wrapping to 2 lines ("Morgan Chase · Head of Product, Vercel, / 2024") is a real nit — it reads as accidental line-break.
- Readability: CONFIRM. Quote at ~38pt (`calc(3.9583cqi * var(--fs-scale))`, confirmed in CSS:19) is powerful. Attribution at `--fs-message` (21pt) on dark is borderline readable but not failing. Right-side implication titles at `--fs-body` bold are correct.
- Doc-align: **CONFIRM CRITICAL DRIFT.** The anatomy block in `split-statement.docs.md` (lines 51-58) shows:
  ```
  │ Claim on   │  ┌─────────┐
  │ the left   │  │   42×   │
  │            │  └─────────┘
  │            │  Caption beside it
  ```
  This anatomy shows a BIG NUMBER (42×) card in the right panel. The actual render (p2-p7) shows plain prose implications (bold title + body paragraph) — no number, no card chrome whatsoever. The anatomy appears to have been cloned from big-number or split-metric and never updated. This is the highest-severity doc drift in the bucket.
  Slots table IS correct (quotation, cite, implications), but the anatomy completely contradicts it.
- DS: CONFIRM palette-blind. The layout-specific 38pt pull-quote size is correctly documented with a comment in CSS.
- Consistency: CONFIRM cite element pattern (inline-code attribution) matches split-brief's eyebrow approach. The h3 rubric at the top of the right panel (--fs-meta mono uppercase, border-bottom) is identical in CSS to split-brief's right h3.
- Redundancy: See Bucket summary.
- Grouping: Correct.

MISSED by maker:
- **MISSED: `cite` element has no `max-width` or wrapping strategy.** `split-statement.styles.css:22` styles `cite` as `display:block` with no max-width or word-break hint. The sample attribution "Morgan Chase · Head of Product, Vercel, 2024" wraps at the half-panel boundary producing the accidental line break visible across all non-compact variants (p2, p3, p5). This is not just "a nit" — it's a bug that affects every attribution string over ~40 chars in the 50% panel width. An `overflow-wrap:break-word` or a `max-width` constraint would at least make the break deliberate.
- **MISSED: No 2-implication or 1-implication gallery variant to show `space-evenly` failure mode.** Both split-brief and split-statement use `space-evenly` on their list. The gallery consistently uses 3 implications. A 2-implication example would expose the large-gap spacing issue the maker identified theoretically.

Top fixes:
  1. `lib/components/statement/split-statement/split-statement.docs.md` anatomy block: Complete rewrite. Replace the big-number-style anatomy with the correct layout: dark left panel (50%) with pull quote (italic, ~38pt) + attribution (`cite`), right panel with plain implications list (bold title + body, no card chrome). This is the highest-priority fix in the bucket.
  2. `lib/components/statement/split-statement/split-statement.styles.css:22`: Add `overflow-wrap:break-word` and/or `max-width:100%` to the `cite` element rule so long attribution strings break cleanly rather than awkwardly wrapping mid-word.
  3. `lib/components/statement/split-statement/split-statement.styles.css:25`: Consider `justify-content:flex-start; gap:var(--sp-lg)` for the right-side implications list (same robustness concern as split-brief). This is consistent with split-list's gap-based card spacing approach.
  4. `lib/components/statement/split-statement/split-statement.gallery.md`: Add a 2-implication variant to test `space-evenly` edge case.

---

## Checker bucket summary

### Maker claims that were WRONG or overstated

1. **big-number 9/10 is generous.** The maker's top-fix section concluded "No fix needed" for big-number. The component is not flawless: there is a real missing authoring pattern (compound metric / unit prefix) and an undocumented `accent+dark` interaction. 8/10 is more accurate. Still KEEP.

2. **split-brief anatomy drift severity understated.** The maker called it "moderate mismatch." It is more accurately a complete misrepresentation of the right panel — the anatomy shows a paragraph where a left-rule findings list renders. This is high-priority, not moderate.

3. **Maker missed the `split-list` related-component description corruption** (split-statement described as "thesis + one big-number — quantitative version of split-list" in the p8 "See also" slide). This is a distinct doc-drift bug not caught by the maker.

4. **Maker's `cite` assessment for split-statement was too mild.** "A minor nit — could look accidental" understates it. Every attribution over ~40 chars wraps awkwardly in the 50% panel; the bug is triggered by the sample itself. It is a rendering defect in the sample, not just an edge case.

5. **Maker missed the `content` line-length issue.** Noting it parenthetically as "not critical" is too generous — 90-char line length at 21pt is genuinely a readability violation at desk distance.

### Most important real issues (ranked)

| Priority | Component | Issue | Fix |
|---|---|---|---|
| 1 | split-statement | Anatomy shows big-number card; render is plain prose implications | Rewrite anatomy block |
| 2 | content | `justify-content:flex-start` causes dead lower ~55% of slide | Change to `justify-content:center` |
| 3 | split-brief | Anatomy shows right-side paragraph; render is left-rule findings list | Rewrite anatomy block |
| 4 | split-list | `related` field describes split-statement as "big-number quantitative variant" (completely wrong) | Fix manifest related description |
| 5 | content | No `max-width` on paragraph — ~90 char line length at --fs-message | Add `max-width: 72cqi` to content p/ul rules |
| 6 | quote | `rgba(0,0,0,0.07)` hardcoded box-shadow | Replace with `color-mix()` token expression |
| 7 | split-list | `panel-eyebrow` slot name misleads authors (renders right panel, not left) | Rename slot |
| 8 | split-list | `#fff` hex fallback in numbered counter | Remove literal |
| 9 | split-statement | `cite` wraps awkwardly with no constraint | Add `overflow-wrap` |
| 10 | big-number | No compound-metric authoring guidance | Add CSS comment + gallery example |

### Independent split-redundancy verdict

**CONFIRM the maker's KEEP all three. The three split-* components are genuinely distinct and earn their separate existence.**

The static-findings.md classification correctly identifies both split-brief and split-statement as sharing the triple `statement · split · structure`. However, the DS rulebook (§13) says shared triple does NOT imply redundancy if data shape differs — and here data shape is fundamentally different:

- **split-brief** left slot = `heading` (h2) + `lede` (p): authored as two prose elements. Data shape = _executive thesis_.
- **split-statement** left slot = `quotation` (blockquote) + `cite` (code paragraph): authored as a verbatim quoted source. Data shape = _attributed quotation_.

These are different content types at the authoring level. The blockquote vs h2 distinction is not a visual-only difference — it is a semantic difference that determines when each component is appropriate (when you have a thesis to argue vs when you have a source to cite). An author conflating the two would produce structurally wrong output: writing a thesis statement in a blockquote, or putting a verbatim quote in an h2.

The `cite` slot (attribution) vs no-attribution in split-brief is a further data-shape differentiator. The right-panel chrome difference (left-rule bars vs plain text) is visual confirmation of the semantic divergence.

The only genuine overlap risk is: an author might reach for split-brief when they mean split-statement if the docs description is ambiguous. The current docs clearly distinguish them ("the left side carries a quote, not a thesis" appears in both components' Related sections). The anatomy bugs (split-statement anatomy shows a big-number card) increase confusion but are fixable without merging the components.

**Verdict: KEEP all three. No merge candidates in the statement bucket.**

### Ranked worst to best (adjudicated)

| Rank | Component | Score | Verdict |
|---|---|---|---|
| 1 (worst) | content | 5/10 | REWORK |
| 2 | split-statement | 7/10 | POLISH |
| 2 | split-brief | 7/10 | POLISH |
| 4 | quote | 8/10 | POLISH |
| 4 | split-list | 8/10 | POLISH |
| 6 (best) | big-number | 8/10 | KEEP |

*Note: big-number revised down from maker's 9/10 due to missing compound-metric authoring gap. Still the cleanest component in the bucket but not flawless.*
