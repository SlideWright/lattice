# Legal bucket — adjudicated checker report

Checker: CHECKER agent
Date: 2026-06-06
Maker report: `.scratch/audit/maker/legal.md`
Pages viewed (light + dark independently rasterized for each component)

---

### authority-chain — adjudicated
Maker overall: 8 → Checker overall: 8/10 — POLISH

Pages viewed: light p1–p11 (all), dark p2 (default spot-check)

- Styling: CONFIRM — default (p2) two-column grid renders cleanly; connector line between rows visible; tier hue rotation fires. Branching (p3): CONFIRM sparse upper-half; the content occupies ~lower-50% of slide — large dead whitespace above the single STATUTE parent card. Trail (p4): CONFIRM — arrow glyphs (`→`) render inline in each card, not as the pseudo-element between cards; `::after { content:'→' }` is positioned absolute `right:-0.5*sp-md top:50%` on each li, functioning as an inter-card spacer, not a collision issue at 16:9 as maker notes. Bracket (p6): clean.
- Aesthetics: CONFIRM branching sparseness. MISSED on trail (p4): the counter number at `--fs-h2` (the `::before` pseudo-element) plus the `::after` arrow are both positioned absolutely but the `::after` arrow on each non-last card overlaps the right edge of the card and partially overlaps the adjacent card's left column — visible as a glyph partially clipped by the next card's border. This is a minor overlap not noted by the maker.
- Readability: CONFIRM clean.
- Doc-align: CONFIRM `links` slot name is semantically wrong. Manifest (`authority-chain.manifest.json:23`) has `"links": { "selector": "ol > li", ... "description": "Ordered list of authority tiers..."` — "links" implies hyperlinks; `tiers` or `items` would be accurate. CONFIRM anatomy block shows a simple indented hierarchy sketch not matching the actual two-column tile geometry. REVISE branching claim: maker says "CSS only styles the first top-level li's nested ul as branches" — inspection of CSS shows `.branching > :is(ol,ul) > li > :is(ul,ol)` targets ALL top-level li children's nested lists, not just the first. Each top-level li gets its children styled as branches. The gallery sample (p3) only has one parent because the sample markdown has one top-level li; the CSS is not limited to first-child.
- DS: CONFIRM palette-blind, correct type tokens throughout.
- Consistency: CONFIRM tier hue rotation matches statute-stack.
- Redundancy: CONFIRM. KEEP — two-column tier-label|citation-gloss grid with ordered descent is genuinely distinct from `timeline` (chronological) and `list-steps` (procedural).
- Grouping: Correct in legal/progression.

MISSED:
- `authority-chain.styles.css` trail variant: The `::before` counter (`--fs-h2` = 42pt) is very large relative to the `--fs-meta` tier label below it. In the trail with 4 columns, each column is ~25% width; the `--fs-h2` counter causes a significant size jump that reads as noisy rather than structured. Consider `--fs-h1` (48pt) for a cleaner match with the scale token, or accept `--fs-h2` as a documented exception. Not a violation but aesthetically rough.
- Trail (p4) dead lower half: the four columns fill ~60% of slide height, leaving a substantial empty canvas below. For 4-item trail samples this is typical, but the gallery slide shows no `flex:1` / `align-content:stretch` on the trail list that would vertically distribute cards. Cards hug the top.

Final top fixes:
1. `authority-chain.manifest.json`: Rename `links` → `tiers` in slot key, selector description, and generated docs to remove hyperlink connotation.
2. `authority-chain.docs.md` anatomy block: Update to show the actual two-column grid geometry (tier-label | citation + gloss) not the indented sketch.
3. `authority-chain.styles.css` trail variant branching-sparseness note: Add `justify-content:stretch; align-items:stretch` to trail li so cards expand to fill the canvas height, reducing the dead lower half.
4. `authority-chain.manifest.json` branching variantDocs: Correct the claim that "multiple parent tiers can each have children" by clarifying the CSS supports it but the sample only shows one.

---

### citation-card — adjudicated
Maker overall: 6 → Checker overall: 5/10 — REWORK

Pages viewed: light p1–p11 (all); dark p2–p6 (all independently rasterized)

**HEADLINE CLAIM 1 — KEY INSIGHT cascade bug: CONFIRM and EXTEND**
- Light p2 (default): "KEY INSIGHT" eyebrow label visible above blockquote. CONFIRMED.
- Light p4 (split): "KEY INSIGHT" label visible on left blockquote column. CONFIRMED.
- Light p5 (margin): "KEY INSIGHT" label visible on centred blockquote. CONFIRMED.
- Light p6 (triptych): "KEY INSIGHT" label visible on column-1 blockquote panel. CONFIRMED.
- Dark p2 (default): "KEY INSIGHT" label visible. **MAKER CLAIM REFUTED** — maker wrote "Dark (p7) is fully clean for the default variant." Dark p2 of the DARK gallery clearly shows KEY INSIGHT chrome on the blockquote. The dark gallery's page 2 IS the default variant. The bug is present in both light and dark.
- Pull-quote (light p3, dark p3): KEY INSIGHT NOT present — the `.pull-quote.pull-quote` doubled-class specificity hack correctly suppresses it. These pages are clean from the KEY INSIGHT bug.
- Summary: 4 of 5 non-pull-quote variants show KEY INSIGHT contamination. This is the highest-priority fix in the bucket.

**HEADLINE CLAIM 2 — triptych produces 2 panels not 3: CONFIRM**
- Light p6 and detail crop both show: full-width heading, full-width citation, then two side-by-side panels (quote left | gloss right). The footer reads "Triptych — three panels · citation-card triptych" but only two content panels render.
- CSS confirmed: `section.citation-card.triptych > blockquote { grid-column:1; grid-row:3 }` and `> :is(ul,ol) { grid-column:2 / span 2; grid-row:3; display:grid; grid-template-columns:1fr 1fr }`. The blockquote takes col 1, and the list becomes a 2-column sub-grid spanning cols 2–3. Total: 2 visible content panels. The CSS comment header says "the blockquote becomes col 1, the first non-do li becomes col 2, the do li becomes col 3" — this is the intent, but the CSS puts ALL list items in a sub-grid (cols 2–3), not each li in its own grid column. The intent and implementation diverge.

**CARD_STYLE contract: CONFIRM compliance**
- citation-card is in CARD_STYLE_LAYOUTS (`lib/components/index.js:297`). Gallery samples use nested list format (`- Title\n  - body`), not inline `**Title.** body`. No violation.

- Styling: REVISE — maker scored 6, checker agrees but for corrected reasons. The KEY INSIGHT bug affects default, split, margin, AND triptych (not just default as maker implies). The pull-quote is clean from that bug but has its own problems (dead lower half, no opening quotation mark rendered). Pull-quote CSS defines `::before { content:'\201C' }` (an opening curly quote) at `font-size:var(--fs-hero)` — this IS in the CSS. Visual inspection of light p3 and dark p3 shows no visible large quotation mark. The glyph is positioned `top:-0.78cqi left:0` with `z-index:-1`, placing it behind the blockquote background — the bg-alt fill completely obscures it. For pull-quote, the component sets `background:none` on the blockquote, so the `::before` should be visible — but it is not. Likely clipped or positioned outside the visible card area. This is an additional rendering bug not called out by the maker.
- Aesthetics: CONFIRM dead lower half on pull-quote (p3, ~60% empty canvas below the quote box).
- Readability: CONFIRM no type token violations.
- Doc-align: CONFIRM triptych docs say "three panels" but render shows two. Anatomy block too abstract. MISSED: the CSS comment at lines 167–170 describes the intended three-column split ("blockquote becomes col 1, first non-do li becomes col 2, do li becomes col 3") but this does not match the actual CSS implementation — a doc/code inconsistency inside the source file itself.
- DS: CONFIRM CARD_STYLE compliance. Specificity-bump hack is tracked technical debt.
- Consistency: REVISE — maker says dark is "clean for the default variant" at p7 — this is wrong; dark p2 shows the KEY INSIGHT bug.
- Redundancy: CONFIRM. KEEP with fixes.
- Grouping: Correct in evidence/legal.

MISSED:
1. Pull-quote `::before` quotation mark glyph is invisible despite being coded. It should render as a hero-scale decorative open-quote behind the text, but the positioning (`top:-0.78cqi left:0` with `z-index:-1`) causes it to either sit outside the visible blockquote bounds or be obscured. Requires visual positioning fix.
2. Maker wrote "dark p7 is fully clean" — WRONG. Dark gallery p2 is the default variant and shows KEY INSIGHT contamination.
3. Triptych: the third panel described in the CSS header comment (first non-do li in its own column) is never rendered as such — the sub-grid collapses both gloss items into a shared 2-column sub-panel. A 2-item gallery example produces one gloss item per sub-column, which looks like 2 panels total.

Final top fixes:
1. `citation-card.styles.css`: Add explicit `section.citation-card > blockquote::before { content:'' !important }` to strip the KEY INSIGHT eyebrow from all non-pull-quote variants. Alternatively, apply the `.pull-quote.pull-quote` doubling pattern to the base `section.citation-card.citation-card > blockquote` rule.
2. `citation-card.styles.css` `.triptych`: Fix the list sub-grid: replace `> :is(ul,ol) { grid-column:2/span 2; display:grid; grid-template-columns:1fr 1fr }` with `> :is(ul,ol) > li:not(:has(> strong:first-child)) { grid-column:2; grid-row:3 }` and `> :is(ul,ol) > li:has(> strong:first-child) { grid-column:3; grid-row:3 }` on the section, so each li occupies its own top-level grid column.
3. `citation-card.styles.css` `.pull-quote blockquote::before`: Fix positioning so the decorative open-quote is visible — change `top:-0.78cqi` to something that lands within the blockquote's visual area (e.g., `top:0.3cqi; left:0.5cqi`) or remove `z-index:-1` and place it as a purely decorative accent that doesn't obscure the quote text.
4. `citation-card.gallery.md` pull-quote sample: Update gloss item to lead with `**What we must do.**` so the gallery demonstrates the non-empty active state.

---

### obligation-matrix — adjudicated
Maker overall: 8 → Checker overall: 7/10 — POLISH

Pages viewed: light p1–p11 (all); dark p7 (spot-check)

**HEADLINE CLAIM — pills variant is a phantom (no CSS): REFUTE (partially)**
- REFUTE the "no CSS" claim. `lib/base/base.modifiers.css:702–726` contains `.pills` rules. The CSS exists; it targets `td:not(:first-child) > *` for `display:inline-flex` and `td:not(:first-child) code, strong` for pill chrome (border-radius, background, border).
- However, the visual outcome (identical to default) is CONFIRMED correct — the CSS does not fire effectively for state disc cells because the state markers are rendered as `<span class="state ...">` elements, not `code` or `strong`. The `code`/`strong` pill chrome rules (`lines 711–724`) target the wrong element type. The `.pills` variant is a functional phantom: CSS exists but doesn't target the right DOM nodes to produce differentiation.
- Score revision: maker scored styling 8, checker revises to 7 because: (a) the pills phantom is a real defect, (b) asymmetric (p4) missing column headers is confirmed, (c) lanes thin stripes are confirmed barely-visible.

- Styling: CONFIRM asymmetric (p4) column headers absent — no obligation labels visible; audience cannot decode which column is which. CONFIRM lanes (p6) left-border stripe is thin (~1px at overview scale despite CSS specifying `4px solid var(--lane-hue)` at `lib/base/base.modifiers.css:738`) — the stripe is visible but narrow. Confirmed lanes CSS is at `base.modifiers.css:737–741`, not missing. REVISE pills claim: CSS exists at `base.modifiers.css:702`, but targets wrong element type. Default (p2) and dark (spot) are clean.
- Aesthetics: CONFIRM heat and default are the strongest boardroom variants. Asymmetric (p4) wastes ~50% of slide canvas below the 3-row grid.
- Readability: CONFIRM `--fs-body-compact` throughout; clean.
- Doc-align: CONFIRM pills docs say "neutral chip" but renders identically to default. MISSED by maker: the asymmetric variant's docs say "promotes each regulation to its own card with the obligations rendered as inline state pills" — but p4 shows plain discs on a flat grid background, not card-promoted rows with pill chrome. The `asymmetric` CSS at `base.modifiers.css:746–763` promotes rows to cards (`border-radius`, `border`, background) and hides the thead (`thead { display:none }`). The rendering correctly promotes rows to cards but the header hide is what creates the missing-labels problem.
- DS: CONFIRM palette-blind. MISSED: the pills/lanes/asymmetric CSS living in `lib/base/base.modifiers.css` rather than in the component's own `obligation-matrix.styles.css` is an architecture note — the component's CSS comment header (`lines 14–17`) lists `.pills`, `.lanes`, `.asymmetric` as variants but they have no rules in the component file. This split is opaque to a component maintainer and should be documented.
- Consistency: CONFIRM state-disc system shared with checklist/verdict-grid.
- Redundancy: CONFIRM genuine distinction from compare-table/verdict-grid. KEEP.
- Grouping: Correct.

MISSED:
1. Asymmetric variant hides the thead entirely (`thead { display:none }`), so column labels are irrecoverably gone at render time. Fix requires showing column headers above each asymmetric row card — currently not possible without either keeping thead visible (requires CSS positioning) or duplicating header content in each `<tr>` via data attributes.
2. The pills/lanes/asymmetric CSS lives in `lib/base/base.modifiers.css`, not the component file. This is not documented in `obligation-matrix.styles.css` — a future developer editing only the component file would not know these rules exist and may add conflicting or duplicate rules.

Final top fixes:
1. `lib/base/base.modifiers.css` pills CSS (lines 711–724): Change `code, strong` selector to also target `.state` spans: `td:not(:first-child) .state { ... }` wrapping in a pill shell (background: color-mix(...), border-radius: var(--pill-radius), padding: ...). This would make pills actually differentiate from default.
2. `lib/base/base.modifiers.css` asymmetric CSS: Rather than `thead { display:none }`, make the thead sticky or render column headers as data-attribute labels on each td so the audience retains column context.
3. `obligation-matrix.styles.css` header comment: Document that additional variant CSS lives in `lib/base/base.modifiers.css` and cite the line range.
4. `obligation-matrix.docs.md` pills description: Correct to reflect that pills variant currently renders identically to default (state spans not pill-wrapped) until the CSS fix is applied.

---

### regulatory-update — adjudicated
Maker overall: 8 → Checker overall: 8/10 — POLISH (score upheld)

Pages viewed: light p1–p11 (all); dark p2, p3 (default + timeline spot-check)

- Styling: CONFIRM default (p2) 5-column grid fires cleanly — counter | bold-name | mono-citation | prose | pill layout is tight and readable. CONFIRM timeline (p3) pill chrome: the effective-date pill renders as a wide oval `~180px × ~40px` at card-bottom — visually a full-width CTA button shape, not a metadata chip. Both light (p3) and dark (dark-p3) confirmed. Dark timeline (dark p3) is clean in terms of color inversion; the CTA-button shape problem persists in dark too.
- CONFIRM diff-bands (p6) is clean — ADDED/AMENDED/REPEALED/ENFORCED h3 headers in four distinct accent colors, items grouped correctly. The diff-bands variant is the most visually sophisticated slide in the bucket.
- Anatomy claim: CONFIRM — anatomy block shows a two-column changelog style (`2024-Q1 Added clause 4.2 — gloss`) that does not match the actual 5-column horizontal grid. The anatomy underdescribes the layout.
- REVISE timeline-pill-as-CTA: maker says "pill grows to a large rounded rect, which is a different pill chrome than the default inline pill." This is correct visually, but the root cause is that the timeline variant renders the pill in a card-bottom `align-self:flex-end` flex position, which inherits `width:100%` from the flex container. The fix (maker's suggestion of `align-self:flex-start; width:auto`) is correct.
- DS: CONFIRM doubled-class specificity hack (`section.regulatory-update.regulatory-update`) is documented in the CSS header as a transitional measure to beat the `.timeline` source-order win. No palette violations.
- Consistency: CONFIRM shares effective-date pill chrome with statute-stack, counter decimal-leading-zero with authority-chain. Strong cross-component vocabulary.
- Redundancy: CONFIRM genuine distinction from `timeline` (no citation chip, no effective-date pill) and `list-steps` (no citation chip or date pill). KEEP.
- Grouping: Correct in legal/progression/ledger.

MISSED:
1. Timeline variant (p3): "Colorado AI Act" title text wraps as "Colorado AI / Act" — maker noted this as "authoring content issue, not a layout bug." However, the column width at 4 equal cards × `--fs-body` bold title is insufficient for a 3-word title without wrap. The component CSS for `.timeline` should probably set `hyphens:auto` or `overflow-wrap:break-word` on the title to control wrap points, or the gallery sample should demonstrate this is unavoidable so authors know to write short titles.
2. Priority variant (p4): clean, but not spotchecked by maker in detail — confirmed clean by checker. Three-item TIER 1/2/3 example with correctly colored pills.
3. Cards variant (p5): clean 2×2 grid — orphan word-wrap noted by maker is confirmed visible but is a content issue.

Final top fixes:
1. `regulatory-update.docs.md` anatomy block: Rewrite to show the actual 5-column grid rhythm `[01] | Bold Name | mono-citation | prose | [Effective Pill]`.
2. `regulatory-update.styles.css` timeline variant effective-date pill: Add `align-self:flex-start; width:auto` so pill reads as a metadata chip, not a CTA.
3. `regulatory-update.manifest.json` diff-bands variantDocs: Document the h3-interspersed authoring shape — this is a genuinely different authoring contract from other variants and needs a warning in the slots section.
4. Technical debt: Track doubled-class specificity hack removal for the next `@layer` activation window.

---

### statute-stack — adjudicated
Maker overall: 7 → Checker overall: 7/10 — POLISH (score upheld)

Pages viewed: light p1–p11 (all); light p5 bottom-region crop; dark p2 (default spot-check)

**HEADLINE CLAIM — preemption overflow: CONFIRM**
- Light p5 overview: LOCAL card's "Independent of preemption" pill AND the text "Bias-audit obligation..." clip into/overlap the footer. The footer text "Preemption cascade · statute-stack preemption" and page number "5" are overwritten by the last card's lower content.
- Bottom-region crop: confirms the LOCAL card's `border-left:4px solid` left rail and card border extend to the very bottom of the slide, with "Independent of preemption" pill and footer text co-existing at the slide's lower edge — the pill reads over the footer zone.
- CSS analysis: `.preemption > :is(ul,ol) > li:last-child { margin-bottom:0 }` removes bottom margin from the last card. With 3 cards + 2 `var(--sp-lg)` arrow gaps + h2 heading + no `overflow:hidden` guard, the combined height overflows the canvas. `align-content:center` is set on the grid but does not cap height. Confirmed real defect.
- Dark p2: clean — jurisdiction hue rotation (cobalt/sienna/slate) works correctly on dark bg.

- Styling: CONFIRM preemption overflow (p5). CONFIRM lane variant (p6) thin left-border stripes (3px as coded in `statute-stack.styles.css:253`), visible but narrow for boardroom viewing. Default (p2), hierarchy (p3), bands (p4), lane (p6): clean.
- Aesthetics: CONFIRM lane variant (p6) has ~50% canvas empty below 3-row table — sparse for a 3-jurisdiction example.
- Readability: CONFIRM `--fs-body` for lane table td (3rd column, obligation) is larger than `--fs-meta` for citation and status columns — creates optical imbalance as noted by maker. The lane table would read more consistently at `--fs-body-compact` throughout.
- Doc-align: CONFIRM anatomy block (`§ Title — Authority / §§ Subsection — gloss`) resembles a wiki citation, not the three-part card (eyebrow | citation chip | obligation prose | status pill).
- DS: CONFIRM palette-blind. Jurisdiction hue rotation `--c4-dark / --c6-dark / --c1-dark` are all palette tokens.
- Consistency: CONFIRM hue rotation and status pill DNA align with authority-chain and regulatory-update.
- Redundancy: CONFIRM genuine distinction from compare-table (no jurisdiction colouring or obligation+status triple) and list-tabular (no jurisdiction chrome). KEEP.
- Grouping: Correct in inventory/ledger/structure/legal.

MISSED:
1. The `.preemption` variant sets `grid-auto-rows:auto` and `align-content:center`. With `margin-bottom:var(--sp-lg)` on each card (including the last, despite `last-child { margin-bottom:0 }`), the content overflows. The correct fix is `overflow:hidden` on the section OR replacing `margin-bottom` between-card spacing with CSS grid `gap` (which respects the container bounds).
2. The hierarchy variant (p3) CSS uses `grid-auto-rows:1.5fr 1fr 0.7fr` — only 3 row definitions. A 4-jurisdiction hierarchy would fall into the default row height (auto) for the 4th card, breaking the descending height metaphor. The manifest anti-patterns don't warn about this 3-jurisdiction hard limit.

Final top fixes:
1. `statute-stack.styles.css` `.preemption` variant: Replace `margin-bottom:var(--sp-lg)` between-card spacing with `gap:var(--sp-lg)` at the grid level, and add `overflow:hidden` + `max-height:calc(100% - var(--footer-height, 2.5cqi))` to the list container, preventing the LOCAL card from bleeding into the footer.
2. `statute-stack.styles.css` `.lane` variant table: Change `font-size:var(--fs-body)` on `td` to `var(--fs-body-compact)` for all td to produce consistent dense-register sizing (matches obligation-matrix table pattern).
3. `statute-stack.docs.md` anatomy: Update to show card structure (eyebrow label | citation chip | prose obligation | status pill).
4. `statute-stack.manifest.json` hierarchy variantDocs: Add anti-pattern note that hierarchy is hard-coded for 3 tiers (`grid-auto-rows:1.5fr 1fr 0.7fr`); a 4th jurisdiction breaks the descending-height metaphor.

---

## Checker bucket summary

### Maker claims REFUTED or revised

1. **citation-card dark variant "fully clean"** — REFUTED. Dark gallery p2 (default variant) shows KEY INSIGHT chrome on the blockquote, identical to the light gallery defect. The maker wrote "Dark (p7) is fully clean for the default variant" — this is wrong. The dark gallery's page 2 IS the default variant in dark mode; the KEY INSIGHT bug affects both light and dark on all non-pull-quote variants.

2. **obligation-matrix pills "no CSS defined"** — REFUTED. CSS for `.pills` exists at `lib/base/base.modifiers.css:702–726`. The variant is a phantom because the CSS targets `code` and `strong` child elements, but state markers are rendered as `<span class="state ...">` elements — the pill chrome rules never fire. The net visual outcome (identical to default) is correctly diagnosed as a phantom variant, but the root cause is wrong element targeting, not absent CSS. The asymmetric and lanes CSS are also in `base.modifiers.css` (lines 729–763), which the maker missed.

3. **authority-chain branching "CSS only styles first li's nested ul"** — REFUTED. The CSS selector `.branching > :is(ol,ul) > li > :is(ul,ol)` targets ALL top-level li children's nested lists. The gallery sample (p3) has a single parent tier because the sample markdown has one top-level li, not because of a CSS limitation.

4. **citation-card triptych "third panel does not materialise"** — CONFIRM the outcome (2 panels render, not 3), but the explanation is more precise: the CSS puts the list (`> :is(ul,ol)`) as a sub-grid spanning cols 2–3, so each li lands in its own sub-column of a 2-sub-column grid — producing 2 visible gloss columns but NOT 3 distinct layout-level panels. With a 2-item gloss list, this accidentally looks like 2 top-level panels. The intent documented in the CSS header comment ("first non-do li becomes col 2, do li becomes col 3") was never implemented.

### Ranked real issues (worst first)

1. **citation-card KEY INSIGHT cascade bug** — affects default, split, margin, triptych variants in BOTH light and dark; the component's primary gallery demo (p2) shows wrong chrome on every page. Priority fix.
2. **citation-card triptych structural mismatch** — 2 panels not 3 as documented; CSS comment and docs.md both claim 3.
3. **statute-stack preemption overflow** — last card clips into footer at standard 3-jurisdiction sample; visible rendering defect.
4. **obligation-matrix pills phantom** — CSS exists but targets wrong element type; variant produces zero differentiation.
5. **obligation-matrix asymmetric missing column headers** — thead hidden, audience cannot identify obligation columns.
6. **citation-card pull-quote opening quotation mark invisible** — `::before` glyph coded but not visible; dead lower half.
7. **regulatory-update timeline pill renders as CTA button** — wide oval chrome reads as interactive element.
8. **obligation-matrix/statute-stack thin lane stripes** — 3–4px; adequate but borderline at boardroom distance.

### Architecture note (MISSED by maker, entire bucket)

The obligation-matrix variant CSS (`.pills`, `.lanes`, `.asymmetric`) lives in `lib/base/base.modifiers.css` rather than in `obligation-matrix.styles.css`. The component file's CSS header lists these as variants but has no rules for them. This split is undocumented and is a maintainability risk — a developer editing only the component file would not find or update the variant rules.

### Redundancy / bucket justification (checker's independent verdict)

The maker's "all 5 KEEP" verdict is **UPHELD but with qualifications**.

The bucket earns its place. Each component encodes legal-specific vocabulary that general-purpose components cannot replicate without heavy modifier stacking:

- **authority-chain** overlaps with `timeline` (static-findings.md flags them sharing `progression·timeline·structure`) but the two-column tier-label|citation-gloss card is genuinely distinct from a chronological axis. KEEP. The overlap is manageable with clear `whenToUse` disambiguation.
- **obligation-matrix** overlaps with `verdict-grid` (comparison·matrix·structure) and `compare-table`. The state-marker grammar ([x]/[-]/[ ]/[/]) is genuinely different from prose cells or per-card scoring. KEEP.
- **statute-stack** most closely resembles `list-tabular` (inventory·ledger·structure) — both are ledger tables. The jurisdiction hue-rotation + citation-chip + obligation-prose + status-pill quadruple is specific enough to justify a separate component. However, the `lane` variant IS essentially list-tabular with jurisdiction colouring — it should be noted as "use instead of list-tabular when rows are jurisdictions."
- **regulatory-update** overlaps with `timeline` as flagged in static-findings.md (same triple `progression·timeline·structure`). The ledger/grid form (not a time axis) and the citation-chip + effective-date grammar distinguish it. KEEP.
- **citation-card** overlaps loosely with `quote` (speaker attribution) and `split-statement` (quote + implications). The verbatim-statute + plain-English gloss + obligation action triple is legal-specific. KEEP.

**The real risk is not redundancy between legal components but between legal components and general-purpose siblings** — specifically authority-chain≈timeline and regulatory-update≈timeline (same F/F/S triple) and statute-stack.lane≈list-tabular. These need sharper disambiguation in `whenToUse` and `related` fields, not MERGE/CUT.

**The execution problem is citation-card**: it has 3 distinct rendering bugs (KEY INSIGHT contamination, broken triptych, invisible pull-quote quotation mark) that make it unacceptable for client decks in its current state. Score is 5/10 REWORK, not 6/10 as the maker assessed.

### Summary scores

| Component          | Maker | Checker | Change | Verdict |
|--------------------|-------|---------|--------|---------|
| authority-chain    | 8     | 8       | =      | POLISH  |
| citation-card      | 6     | 5       | -1     | REWORK  |
| obligation-matrix  | 8     | 7       | -1     | POLISH  |
| regulatory-update  | 8     | 8       | =      | POLISH  |
| statute-stack      | 7     | 7       | =      | POLISH  |
