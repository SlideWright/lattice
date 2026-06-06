# Comparison bucket — checker adjudication

Checker independently rasterized all eight galleries (light + dark spot-checks)
and read component CSS, manifests, docs, and design-system.md §6.5 before
adjudicating each maker finding. All PNG paths are under
`.scratch/audit/png/`.

---

### before-after — adjudicated
Maker overall: 8 → Checker overall: 7/10 — POLISH

Pages viewed: light p1–p8 (+dark spot via comparison.gallery.dark.pdf overview)

- Styling: CONFIRM — dead lower half on short content, p2 and p3. On the
  banner-tag variant (p3) the content occupies the top ~45%, leaving ~55% of
  card height empty. This is worse than the maker described ("lower ~35%");
  the actual dead fraction is closer to half on medium-length copy.
  `→` connector is correctly centred vertically when cards are tall.
- Aesthetics: CONFIRM — banner-tag (p3) looks dramatically sparse. The
  accent blue `→` arrow is visually heavier than compare-prose's muted `❯`,
  creating an inconsistency across the two-card family that is more noticeable
  than the maker acknowledged.
- Readability: CONFIRM — type hierarchy clean, no contrast failures.
- Doc-align: CONFIRM — anatomy matches. No drift.
- DS: REVISE — Maker says "no hex literals." MISSED: `before-after.styles.css`
  lines 109, 122, 163, 188 contain `var(--on-accent, var(--on-dark-primary, #fff))`
  and `var(--on-cat, #fff)` fallbacks. These are flagged in `static-findings.md`
  as real hex violations. The maker missed them.
- Consistency: CONFIRM glyph inconsistency (`→` vs `❯`). REVISE severity
  upward — the visual weight difference (accent-coloured `→` in before-after vs
  muted `❯` in compare-prose) is more jarring than a mere glyph difference.
- Redundancy: CONFIRM — KEEP, temporal split is distinct from compare-prose's
  deliberation form.
- Grouping: CONFIRM correct bucket.

MISSED:
- `before-after.styles.css` lines ~80–195 contain `section.decision` and
  `section.compare-prose` selectors — rules for three separate components live
  in one file. This is intentional sharing documented in a header comment
  ("before-after, decision, and compare-prose lift the leading text") but it
  is undocumented coupling: anyone editing before-after CSS is silently
  authoring decision and compare-prose CSS. The header comment at line 81
  should be promoted to docs.md for discoverability.

Adjudicated scores: Styling 7 (hex fallbacks) | Aesthetics 7 | Readability 8 |
Doc-align 8 | DS 7 (confirmed hex) | Consistency 7 | **Overall 7/10** — POLISH

Final top fixes:
  1. `before-after.styles.css` lines ~68–73: add `align-content:start`
     (or `align-items:flex-start`) to card body so short content anchors top,
     eliminating the dead lower half.
  2. `before-after.styles.css` lines 109, 122, 163, 188: replace `#fff`
     fallbacks with `var(--on-dark-primary)` to achieve palette-blindness.
  3. `before-after.styles.css`/`compare-prose.styles.css`: normalise connector
     — either both use `→` or both use `❯`, and set the chosen glyph's colour
     to `var(--text-secondary)` (muted, not accent) consistently.

---

### compare-prose — adjudicated
Maker overall: 8 → Checker overall: 8/10 — POLISH (score maintained, key
finding REFUTED)

Pages viewed: light p1–p13 (+dark p4, p9)

- Styling: CONFIRM — `❯` connector drift on unequal-height cards is an
  edge-case risk. No hard clipping observed. Dead lower half on
  banner-tag (p7) mirrors the before-after issue.
- Aesthetics: CONFIRM — two-card default (p2) is well-balanced and polished.
- Readability: CONFIRM — hierarchy clean. Dark mode readable.
- Doc-align: REVISE — Anatomy labels say "Before / Option A → After / Option B"
  (with `→` glyph). Rendered connector is `❯`. Both the glyph (`→` vs `❯`)
  AND the label ("Before/After" echoing the before-after component's vocabulary)
  are wrong. The maker identified both issues but described the label problem
  only as "creating confusion" — it actually conflates two different components'
  semantics in the docs, which is misleading to new authors.
- **DS: REFUTE the mirror violation claim.** The maker states: "mirror
  re-listed in manifest variants — violates the rule that universal variants
  must not appear in component variants." This is **wrong**. Per
  `design/design-system.md §6.5`, `mirror` is explicitly called out as a
  Tier-3 layout-specific variant: "Things like `mirror`, `numbered`, `four`,
  `chosen`, `donut`, etc. Specific to one or a few layouts." The code confirms
  this: `lib/components/index.js` `UNIVERSAL_VARIANTS` does not include
  `mirror`; `SEMI_UNIVERSAL_VARIANTS` does not include `mirror`; the validator
  at line 419 would only flag a variant that IS in `UNIVERSAL_VARIANTS` or
  `SEMI_UNIVERSAL_VARIANTS`. The CSS comment in `lib/base/base.modifiers.css`
  line 778 explicitly titles `mirror` as a "Cross-cutting modifier" scoped to
  four specific layouts (`image`, `featured`, `split-list`, `compare-prose`).
  Re-listing it in `compare-prose.manifest.json` `variants` is **correct** —
  it is Tier-3, per-layout, and properly documented in `variantDocs`. The
  maker's top fix #1 ("remove mirror from variants") would be **wrong to apply**.
- Consistency: CONFIRM glyph gap between connector CSS and anatomy `→`.

MISSED:
- Same dead lower half on `banner-tag` variant (p7) as before-after — the
  maker mentioned this for before-after but did not note the identical issue
  here, even though p7 shows ~55% empty card area.
- `compare-prose.styles.css` line 30 has a comment spelling out the connector
  as `→` ("side-by-side cards with → connector") — this comment is stale (the
  CSS emits `❯`). Minor doc-in-code drift.

Adjudicated scores: Styling 7 | Aesthetics 8 | Readability 8 | Doc-align 6
(anatomy glyph AND misleading Before/After labels) | DS 8 (mirror is correctly
listed; other tokens correct) | Consistency 7 | **Overall 8/10** — POLISH

Final top fixes:
  1. `compare-prose.docs.md` Anatomy: Change connector glyph from `→` to `❯`
     AND rename card labels from "Before / Option A" to "Option A" (remove the
     before-after echo).
  2. `compare-prose.styles.css` line 30: update the comment to say `❯` not `→`.
  3. `compare-prose.styles.css` / `before-after.styles.css`: normalise the
     connector across the two-card family (same glyph, same colour weight).
  4. **DO NOT remove `mirror` from manifest variants** — the maker's fix #1 is
     incorrect. `mirror` is a valid Tier-3 layout-specific variant.

---

### compare-table — adjudicated
Maker overall: 7 → Checker overall: 6/10 — POLISH (downgraded)

Pages viewed: light p1–p7 (+dark p2, p5)

- Styling: CONFIRM AND AMPLIFY — row-height inflation on sparse tables is
  severe. On p2 (3-row table), each row occupies roughly one-third of the
  slide canvas, making the table look like three isolated labels floating on
  whitespace. This is a stronger visual failure than the maker's "significant"
  description conveyed. No overflow clipping.
- Aesthetics: CONFIRM — spectrum-gradient accent under thead is a premium
  touch. The row separation via thin border only (no zebra-stripe) disappears
  at desk distance on a 3-row sparse table. First-column bold reads correctly.
- Readability: CONFIRM — token usage correct, contrast adequate. Sparse rows
  create a bizarre floating-label effect where each row is ~200px tall with a
  single line of text.
- Doc-align: CONFIRM — anatomy matches structure.
- DS: CONFIRM — palette-blind, typography tokens correct. No violations.
- Consistency: CONFIRM — feels lighter than matrix-2x2 / verdict-grid as the
  maker noted. The white-background table style also departs from the subtle
  `--bg-alt` card backgrounds used throughout the rest of the bucket.

MISSED:
- The table background is `var(--bg)` (white in light theme) with no card
  container — it renders as floating text on the slide background, not as a
  contained card. All other comparison components wrap content in
  `--bg-alt`-backgrounded cards. This inconsistency means compare-table looks
  like a different design system from its siblings.
- The maker recommended zebra-striping but omitted the more fundamental fix:
  add a card container (`background:var(--bg-alt); border-radius:var(--radius-md);
  padding:var(--sp-md)`) around the table to match sibling component styling.

Adjudicated scores: Styling 5 (severe row inflation on sparse tables) |
Aesthetics 6 | Readability 7 | Doc-align 8 | DS 8 | Consistency 5 (no card
container; floating text style) | **Overall 6/10** — POLISH

Final top fixes:
  1. `compare-table.styles.css`: Add `vertical-align:top` to `td` and `th` to
     pin content to the top of inflated rows; add `align-content:start` to the
     table container.
  2. `compare-table.styles.css`: Wrap the table in a `var(--bg-alt)` card
     container (`border-radius:var(--radius-md); padding:var(--sp-md)`) to
     match sibling component card aesthetics.
  3. `compare-table.styles.css`: Add
     `tr:nth-child(even) td { background:var(--bg); }` zebra-striping for
     scannability on dense tables.

---

### decision — adjudicated
Maker overall: 7 → Checker overall: 7/10 — POLISH (score maintained, DS
finding corrected)

Pages viewed: light p1–p8 (+dark p4, p6)

- Styling: CONFIRM — horizontal strip renders cleanly at 2–3 cards (p2, p3,
  dark p4). At 5–6 cards cards compress. No overflow.
- Aesthetics: CONFIRM — categorical bottom-border colour rotation is polished.
- Readability: CONFIRM — body text readable at 2–4 cards.
- Doc-align: CONFIRM AND AMPLIFY — the `## Anatomy` block in `decision.docs.md`
  lines 46–57 shows a **single large DECISION box** ("│  │ DECISION │ │  │
  Single-sentence verdict line │"). The actual render (every page from p2
  onward) is a **horizontal strip of equal-height co-equal justification
  cards** with categorical colour borders. A new author reading the anatomy
  would design a completely different slide. This is the most severe
  doc↔render failure in the bucket, confirmed by direct inspection.
- DS: REVISE AND CORRECT — Maker claims "the hardcoded `#fff` fallback in
  `--on-cat` reference" is in `decision.styles.css`. This is **wrong**.
  `decision.styles.css` (82 lines) contains NO hex literals and no `--on-cat`
  references. The `var(--on-cat, #fff)` fallback is in
  `before-after.styles.css` lines 122 and 188, inside selectors targeting
  `section.decision` (which is defined in that file as a shared rules file
  for the three-component family). The palette-blind violation is real but
  lives in `before-after.styles.css`, not `decision.styles.css`. The fix
  target is wrong in the maker's report.
- Consistency: CONFIRM — "decision" naming clash with `compare-prose .decision`
  modifier is real but manageable via docs.

Adjudicated scores: Styling 7 | Aesthetics 8 | Readability 8 | Doc-align 4
(anatomy completely wrong model) | DS 8 (decision.styles.css is clean; shared
hex in before-after.styles.css) | Consistency 7 | **Overall 7/10** — POLISH

Final top fixes:
  1. `decision.docs.md` §Anatomy (lines 46–57): Rewrite to show the horizontal
     multi-card strip — e.g. three equal-width cards with coloured bottom
     borders, each with a LABEL header and a body line. The current single-box
     diagram is completely wrong.
  2. `before-after.styles.css` lines 122, 188: Fix `var(--on-cat, #fff)` →
     `var(--on-cat, var(--on-dark-primary))` — this is where the hex actually
     lives for the decision corner-tag rendering.
  3. `decision.docs.md`: Add disambiguation note vs `compare-prose.decision`
     modifier (N-card strip vs binary left-reject/right-choose).

---

### matrix-2x2 — adjudicated
Maker overall: 9 → Checker overall: 8/10 — KEEP (downgraded one point)

Pages viewed: light p1–p7 (+dark p2, p5)

- Styling: CONFIRM mostly clean. Dark mode (p2 dark): accent ring on 4th
  quadrant remains visible; tokens flip correctly. REVISE one point: the dead
  lower half on sparse one-to-two-bullet quadrants (p2 light and dark) is
  noticeable — each quadrant card is roughly 250px tall with 2 lines of content
  anchored to the card title/top, leaving a large empty region. The maker
  noted this in fixes but scored it as a 9 — the visual impact is a real
  aesthetics deduction.
- Aesthetics: REVISE to 8 — the sparse-content dead lower half is more
  visually prominent than a 9 implies. VP-of-Design standard: a card that
  is 70% empty is a presentation flaw.
- Readability: CONFIRM 9 — hierarchy clean.
- Doc-align: CONFIRM 9 — anatomy matches.
- DS: CONFIRM 9 — palette-blind, type tokens correct.
- Consistency: CONFIRM 9 — matches sibling card patterns.
- Redundancy: CONFIRM — unique 4-quadrant spatial metaphor. KEEP.

MISSED:
- The "4th card = recommended quadrant" convention is implicit in the CSS
  (`li:last-child` gets the accent ring) but the gallery sample uses a
  semantically wrong example: the 4th quadrant labelled "Low impact · High
  effort" gets the accent ring — this is the LEAST desirable quadrant in a
  standard effort/impact matrix. Authors may misread the ring as "this is the
  recommended quadrant" and place their anti-recommendation in the focal
  position. Docs should clarify that the 4th position gets the ring regardless
  of semantic valence, and authors should order their quadrants so the ring
  falls on their intended focal card.

Adjudicated scores: Styling 8 | Aesthetics 8 | Readability 9 | Doc-align 8
(implicit focal convention) | DS 9 | Consistency 9 | **Overall 8/10** — KEEP

Final top fixes:
  1. `matrix-2x2.styles.css`: Add `align-content:start` to the inner `ul` of
     each quadrant card so sparse content anchors to the top rather than
     centring vertically.
  2. `matrix-2x2.docs.md`: Add note clarifying that the 4th card (last in
     source order) receives the accent ring. Warn authors to order quadrants so
     the editorial focal point is placed last.

---

### redline — adjudicated
Maker overall: 7 → Checker overall: 7/10 — POLISH (confirmed; one finding
corrected)

Pages viewed: light p1–p11 (+dark p4, p8); detail crop of p4 right region

- Styling: CONFIRM overflow bug on three-col (p4 light AND dark). Detail crop
  confirms: the NEW blockquote text clips mid-character at the grid cell bottom
  boundary — the word "not" from "direct the business not" is cut off. The
  cause is `grid-template-rows:auto auto 1fr` at line 220 in
  `redline.styles.css` with no `overflow:hidden` on the blockquote and no
  `min-height:0` on the grid items. The maker's proposed fix (`minmax(0,1fr)`)
  is correct and sufficient.
- Aesthetics: CONFIRM — ins/del marking (green underline, red strikethrough)
  is distinctive and polished. Dark mode (p8 `compact` variant) shows excellent
  contrast for green insert underlines and red del strikethroughs.
- Readability: CONFIRM — type tokens correct. Dark mode contrast for
  `var(--pass)` and `var(--fail)` is strong (confirmed p8 dark).
- Doc-align: REVISE — Maker says the SPECIFICITY-BUMP HACK is "not in docs.md."
  This is PARTIALLY CORRECT but overstated: the hack IS documented in the CSS
  comment at lines 9–16 of `redline.styles.css`. What's missing from `docs.md`
  is a prose note that authors will see doubled selectors and why. The KEY
  INSIGHT interaction is also undocumented in `docs.md`. The fix remains valid
  but the severity is "authors don't know why the CSS looks weird," not
  "authors can't use the component."
- DS: CONFIRM — specificity-bump hack is documented transitional debt.
  Palette-blind otherwise.
- Consistency: CONFIRM — annotation counter pill design consistent with
  verdict-grid.

MISSED:
- The three-col overflow also affects dark mode (p4 dark): same clip at the
  same position. The maker only mentioned the light gallery — this is confirmed
  in dark too.
- The `redline.styles.css` line 220 has `grid-template-columns:1fr 1fr 1.1fr`
  — the 1.1fr for the WHY column is a deliberate (slightly wider) choice but
  is not documented. Nor is the specific 1.1 ratio documented as intentional
  vs accidental. Worth a comment.

Adjudicated scores: Styling 5 (three-col overflow is a real render bug, not a
polish nit) | Aesthetics 8 | Readability 8 | Doc-align 7 | DS 7 | Consistency
8 | **Overall 7/10** — POLISH

Final top fixes:
  1. `redline.styles.css` line 220: Change `grid-template-rows:auto auto 1fr`
     to `grid-template-rows:auto auto minmax(0,1fr)` to prevent blockquote
     overflow in three-col. Also add `overflow:hidden` to the blockquote rules
     at lines 223 and 238 as a belt-and-suspenders guard.
  2. `redline.docs.md`: Add a short note explaining the selector-doubling
     (`.split.split` etc.) is an intentional specificity bump; link to the CSS
     comment. Add a note about the KEY INSIGHT interaction.
  3. `redline.styles.css` line 220: Add a comment explaining why the WHY
     column is `1.1fr` (deliberate extra width to accommodate longer annotation
     prose).

---

### split-compare — adjudicated
Maker overall: 8 → Checker overall: 8/10 — POLISH (confirmed; minor correction)

Pages viewed: light p1–p7 (+dark p3, p6)

- Styling: CONFIRM — left/right split renders cleanly (p2). Verdict bar is
  well-anchored.
- Aesthetics: CONFIRM — 30/70 split with dark left panel is a strong layout.
  Verdict bar in accent colour is conclusive.
- Readability: CONFIRM — type tokens correct. REVISE the contrast concern:
  on the verdict bar (p2), "RECOMMENDATION" label is `var(--on-dark-secondary)`
  on an `var(--accent)` background. In the Indaco theme (blue accent, p2), this
  renders as light-grey-on-blue — contrast is adequate but marginal. In themes
  with lighter accent colours this will fail. The maker correctly flagged this.
- Doc-align: CONFIRM — anatomy and slots match render.
- DS: CONFIRM — `padding:12px var(--sp-md)` in `split-compare.styles.css`
  line 29. The `12px` is a hardcoded pixel value; no spacing token at 12px
  exists in the standard scale. This is a real DS violation. The fix is either
  to use `var(--sp-xs)` (if it resolves near 12px) or add `--sp-12` to the
  token scale.
- Consistency: CONFIRM — the disc-bullet option lists depart from no-bullet
  card-style format used by siblings, but the header comment explains this is
  intentional (sub-items within options, not card titles).

MISSED:
- `split-compare.styles.css` line 26: `margin-bottom:0.46875cqi` on option
  list items. This is a raw cqi value not routed through any spacing token.
  It's in the CLAUDE.md-sanctioned "explicit cqi sizes between tokens" category
  but unlike the documented sanctioned cases (split-statement 17.19cqi, kpi
  38pt) this one has no CSS comment explaining the source of 0.46875cqi. Minor
  documentation gap.
- The `✦` preferred-option indicator (line 22) uses `font-size:var(--fs-meta)`
  — this is token-correct, but the glyph is `✦` (four-pointed star), while
  verdict-grid's focal-card indicator uses `✧` (white four-pointed star). Same
  semantic role, different glyphs — minor but real cross-component inconsistency.

Adjudicated scores: Styling 7 | Aesthetics 8 | Readability 8 | Doc-align 8 |
DS 7 (12px hardcode confirmed) | Consistency 7 (✦ vs ✧, `on-dark-secondary`
on accent) | **Overall 8/10** — POLISH

Final top fixes:
  1. `split-compare.styles.css` line 29: Replace `12px` with `var(--sp-xs)` or
     introduce `--sp-12` token. Confirm the spacing token value matches the
     intended rhythm.
  2. `split-compare.styles.css` line 26: Add a CSS comment explaining the
     0.46875cqi value origin (or replace with `var(--sp-xs)`).
  3. `split-compare.styles.css` line 22: Change `✦` to `✧` to match
     verdict-grid's focal indicator glyph.

---

### verdict-grid — adjudicated
Maker overall: 9 → Checker overall: 9/10 — KEEP (confirmed)

Pages viewed: light p1–p7 (+dark p2, p5)

- Styling: CONFIRM — grid clean in both themes. Badge disc+mask system renders
  precisely. Focal card accent ring and `✧` glyph position correctly. Dark
  mode (p2 dark): badge colours (pass/warn/fail) maintain high contrast;
  focal card `--accent-soft` tint distinguishable.
- Aesthetics: CONFIRM — 2×N grid well-balanced. Badge pills are compact and
  informative. Focal card emphasis is subtle but clear.
- Readability: CONFIRM — hierarchy legible. `--fs-body-compact` for card body
  is appropriate.
- Doc-align: CONFIRM — anatomy matches. Focal card placement correct.
- DS: CONFIRM — palette-blind. `--pill-fs` token routes correctly.
  MINOR: The `✧` glyph is `font-size:2.75cqi` (noted by maker) — this is the
  one off-scale cqi value in the component. Acceptable as a display glyph
  but should be documented as an intentional exception.
- Consistency: CONFIRM — badge pill design consistent with checklist and
  obligation-matrix (same disc+mask recipe per CSS comment).

MISSED:
- `verdict-grid` has a dead lower half on sparse-body cards (p2: "Certified,
  in-region, and self-serve on every axis. Recommended." is a single line in a
  tall focal card). The maker missed this; it is the same sparse-content issue
  as matrix-2x2 and before-after. Less severe here because badge pills add
  visual density, but the principle applies.
- Focal card (`li:last-child`) always spans full width when the grid has an
  odd number of cards (p4, p5). This is correct CSS but creates a visual
  asymmetry on 3-card grids (two equal cards above, one wide card below) that
  could mislead authors about the expected layout with 4-card even grids.
  Docs should note the full-width span is automatic when card count is odd.

Adjudicated scores: Styling 9 | Aesthetics 9 | Readability 9 | Doc-align 8
(implicit focal placement; odd-grid span undocumented) | DS 9 | Consistency 9 |
**Overall 9/10** — KEEP

Final top fixes:
  1. `verdict-grid.docs.md`: Add note on the focal card (last in source order)
     and the full-width span behaviour on odd card counts.
  2. `verdict-grid.styles.css` line with `font-size:2.75cqi`: Add a comment
     explaining why `✧` uses a cqi value rather than a typography token (display
     glyph, relative to slide width, intentional departure).

---

## Checker bucket summary

### Maker claims that were wrong or need correction

1. **compare-prose `mirror` DS violation — REFUTED.** The maker claimed
   listing `mirror` in `compare-prose.manifest.json` `variants` violates the
   rule against re-listing universal variants. This is wrong. `mirror` is
   explicitly named in `design-system.md §6.5` as a Tier-3 layout-specific
   example. The code confirms: it is absent from `UNIVERSAL_VARIANTS` and
   `SEMI_UNIVERSAL_VARIANTS` in `lib/components/index.js`; the validator would
   not flag it. The CSS comment in `base.modifiers.css` calls it a
   "Cross-cutting modifier" scoped to four specific layouts. Listing it in
   `compare-prose.manifest.json` is correct. Maker top fix #1 for compare-prose
   should be withdrawn.

2. **decision `#fff` hex in `decision.styles.css` — WRONG FILE.** The maker
   attributed the hex fallback to `decision.styles.css`. In fact
   `decision.styles.css` (82 lines) contains no hex literals. The
   `var(--on-cat, #fff)` fallbacks are in `before-after.styles.css` lines 122
   and 188 inside shared selectors that target `section.decision`. The fix
   target is `before-after.styles.css`, not `decision.styles.css`.

3. **before-after hex "clean" — MISSED.** The maker scored before-after DS as
   8 and said "palette-blind (no hex literals)." Incorrect. Lines 109, 122, 163,
   188 of `before-after.styles.css` contain `#fff` fallbacks. This is a real
   DS violation shared across the three-component shared CSS file.

4. **before-after dead lower half "~35%" — UNDERSTATED.** The maker described
   the dead fraction as "lower ~35%." Rasterized inspection (p2 default,
   p3 banner-tag) shows the empty fraction is closer to 50–55% on banner-tag
   with medium-length copy. The severity supports a lower styling score.

5. **compare-table scored 7 — TOO GENEROUS.** The sparse-table row inflation
   on p2 is severe (3 rows fill the entire slide, each row ~200px tall with
   one line of text), and the floating-text styling (no `--bg-alt` card
   container) is a substantial consistency departure from every other component
   in the bucket. Checker scores it 6/10.

6. **matrix-2x2 scored 9 — SLIGHTLY GENEROUS.** The sparse-content dead lower
   half is visible on p2 (light and dark). A VP-of-Design would flag it. Score
   revised to 8/10.

### Most important real issues (ranked)

1. **Redline three-col overflow** (p4 light + dark) — text clipped mid-word.
   One-line fix in `redline.styles.css`. Confirmed render bug; highest urgency.

2. **Decision anatomy completely wrong model** — anatomy shows a single verdict
   box; render shows a multi-card categorical strip. Highest doc↔render failure
   in bucket. One-paragraph docs rewrite.

3. **Dead lower half across all four two-card components** (before-after,
   compare-prose, split-compare, matrix-2x2, verdict-grid) — a shared CSS
   pattern: `flex:1` cards with `align-content:center` (or default stretch)
   leave large empty regions when content is short. Fix: `align-content:start`
   on card inner containers. This is the bucket's most pervasive aesthetics
   issue.

4. **`#fff` hex literals in `before-after.styles.css`** (lines 109, 122, 163,
   188) — palette-blind violation affecting before-after, decision, and
   compare-prose renders (all three share this file).

5. **`12px` hardcode in `split-compare.styles.css`** line 29 — spacing token
   violation; confirmed.

6. **compare-table sparse-row inflation + no card container** — severe
   aesthetics departure from bucket siblings.

7. **Compare-prose anatomy labels echo before-after terminology** — "Before /
   Option A → After / Option B" anatomy misleads authors. `→` vs `❯` glyph
   mismatch in docs vs render.

8. **Cross-component glyph inconsistency** — before-after `→` (accent-coloured)
   vs compare-prose `❯` (muted). Should be normalised to one glyph, one colour
   weight.

### Independent take: two-column redundancy cluster

The four two-card components (before-after, compare-prose, split-compare,
decision) are all KEEP. They occupy distinct semantic roles:
- `before-after`: temporal (locked Before/After labels, `→` arrow)
- `compare-prose`: deliberation (open labels, verdict modifiers, `❯`)
- `split-compare`: closed decision with framing (left dark panel + verdict bar)
- `decision`: post-deliberation verdict with N justifications (categorical strip)

The risk is not redundancy — it is **author confusion at component selection
time**. The four components should cross-link `antiPatterns` to each other, and
the docs portal ordering should place them in deliberation sequence
(compare-prose → split-compare → decision) with before-after as a separate
temporal track.

The `before-after.styles.css` shared-rules file (which implements CSS for
`section.decision` and `section.compare-prose` selectors alongside
`section.before-after`) is a hidden coupling that will surprise maintainers.
This should either be promoted to an explicit shared partial
(`_card-banner-tag-shared.css`) or each component should own its own banner-tag
rules.

### Ranked worst→best by checker score

| Rank | Component | Overall | Verdict |
|------|-----------|---------|---------|
| 1 (worst) | compare-table | 6/10 | POLISH |
| 2 | before-after | 7/10 | POLISH |
| 3 | decision | 7/10 | POLISH |
| 4 | redline | 7/10 | POLISH |
| 5 | compare-prose | 8/10 | POLISH |
| 6 | split-compare | 8/10 | POLISH |
| 7 | matrix-2x2 | 8/10 | KEEP |
| 8 (best) | verdict-grid | 9/10 | KEEP |

### Cut / merge

No cuts or merges recommended. All eight serve distinct purposes. The
two-card cluster (before-after, compare-prose, split-compare, decision) should
add stronger `antiPatterns` cross-linking to reduce selection confusion.
