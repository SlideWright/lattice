# Inventory bucket, part B — adjudicated report
**Components:** glossary · list · list-tabular · principles · tldr
**Auditor:** CHECKER agent
**Date:** 2026-06-06
**Input:** maker/inventory-B.md + independent rasterization of all gallery pages

---

## Methodology

All five light galleries rasterized independently (overview + region crops).
Dark galleries spot-checked at pages most likely to reveal contrast/token issues.
Every page cited in the maker's headline claims viewed at full overview and at least
one `--region` crop. Source CSS and manifest files read for all disputed claims.

---

### glossary — adjudicated
Maker overall: 7 → Checker overall: 7/10 — POLISH (CONFIRM)

Pages viewed: light p1-p7 (+dark p3); region crops not required (issue clearly
visible at overview scale)

- Styling: CONFIRM. Dead lower half on sparse slides is real and significant.
  Measured visually: on p02 (5-entry default), p04 (compact), p05 (accent), the
  table occupies ~40% of the content area with ~50% blank canvas below. Root cause
  confirmed in `glossary.styles.css`: the `section.glossary table` has no flex
  container or `justify-content:center`; no `flex:1` anywhere in the section rules.
  Contrast with `list.styles.css` L10 which has `flex:1; justify-content:center`.
  Dark mode (p03) shows the same dead-lower-half on the same 5-entry content.
- Aesthetics: CONFIRM. Table chrome is restrained; the range pill + spectrum
  gradient rule header is attractive. Dead-lower-half is the primary drag.
- Readability: CONFIRM. `--fs-body-compact` at 13.5pt reads well for table cells.
- Doc-align: REVISE. Maker says "Anatomy block shows no column-header row."
  Independently verified: `glossary.docs.md` anatomy block (lines 46-56) does NOT
  show the TERM/DEFINITION header row that renders. However, the anatomy also
  erroneously shows bullets (`- Term / Definition` format) rather than the actual
  table structure — a deeper mismatch than just the missing header. The anatomy
  implies a simple list render when the actual render is a full HTML table with
  thead/tbody, zebra rows, and an auto-derived range pill. Severity: minor (authors
  read the gallery PDF anyway) but confirms the drift.
- DS: CONFIRM compliant. No hex literals; type tokens correct.
- Consistency: CONFIRM consistent with bucket siblings.
- Redundancy: CONFIRM KEEP.
- Grouping: CONFIRM correct.

MISSED: The `compact` variant (p04) is nearly visually identical to the default
(p02) at 5 entries. The row-height reduction is barely perceptible when entry count
is low, because row padding (`var(--sp-sm)` → effectively a small fraction of slide
height) contributes little to the total table height at this density. The gallery
does not demonstrate the compact modifier's value — a 10-entry vs 10-entry compact
comparison would show meaningful row-height savings. The maker mentioned this as a
gallery authoring suggestion; it should be elevated as a concrete fix because
shipping a variant gallery that doesn't show the variant's effect is a doc-quality
failure.

MISSED: The `accent` modifier (p05) applies `--bg-accent` (or similar) to alternating
rows instead of `--bg-alt` — visually the zebra pattern uses the accent-tinted
background. This is the right behavior but the CSS mechanism should be confirmed
against the token. Not a blocking finding; visual looks correct.

Top fixes:
  1. `glossary.styles.css`: Add flex centering to the section body. Either wrap
     the `table` in a container `div.glossary-body { flex:1; display:flex;
     align-items:center; }` or add `display:flex; flex-direction:column;
     justify-content:center; flex:1` to the `section.glossary` rule after the h2,
     so the table floats vertically centered when entry count is low.
  2. `glossary.docs.md` (anatomy block): Replace the `- Term / Definition` bullet
     structure with a table-shaped ASCII diagram that shows TERM/DEFINITION headers,
     the gradient rule, zebra rows, and the range pill in the h2.
  3. `glossary.gallery.md`: Replace the `compact` example with an 8–10 entry variant
     paired against the default to show the modifier's actual density benefit.

---

### list — adjudicated
Maker overall: 7 → Checker overall: 7/10 — POLISH (CONFIRM)

Pages viewed: light p1-p7; detail crop of p6 center

- Styling: REVISE. Maker described the p06 chip as showing "`<strong>Title.</strong>
  body`" but stated the source uses `\`<strong>Title.</strong> body\`` as an HTML
  entity-escaped code span. Source confirmed: `list.gallery.md` L79 uses
  `` `**Title.** body` `` (markdown bold inside backticks). Marp processes the `**`
  bold markers inside the code span and outputs `<code><strong>Title.</strong> body
  </code>` into the HTML, which renders as a mono chip displaying literal `<strong>
  Title.</strong> body` with angle brackets. This is the mechanism — not entity
  escaping. The visual outcome (ugly mono chip with raw angle brackets) is as
  described. Severity: gallery authoring issue, not a CSS bug. The maker's fix
  recommendation is correct. Verdict: REAL but mechanism overstated.
- Aesthetics: CONFIRM. Pill-card form looks clean. `justify-content:center` IS
  working (confirmed visually on p02, p05) — items are balanced in the canvas
  center. The maker's "35% of vertical real estate" is an overstatement; the 5
  items actually occupy about 50% of the content area with balanced margins. Still
  moderate dead space but less severe than glossary.
- Readability: CONFIRM clean.
- Doc-align: CONFIRM. Docs anatomy understates pill-card chrome. The anatomy shows
  bare `- bullets` while the render shows bordered pill cards with accent left-
  border and `bg-alt` fill. Minor but real for first-time authors.
- DS: REVISE. The maker flags `substance:prose` as "slightly misaligned" given the
  visual card treatment. This is not a DS violation — `prose` describes the content
  model (single inline sentences, not structured sub-items), not the CSS chrome.
  CSS chrome (borders, backgrounds) is Finish/DS layer. The classification is
  defensible as-is. Not a finding.
- Consistency: CONFIRM consistent.
- Redundancy: CONFIRM KEEP.
- Grouping: CONFIRM correct.

MISSED: There is no `ol` / numbered variant gallery slide. The numbered variant
(with the mono `counter()` column) is a meaningful authoring affordance (the only
way to get an explicitly ordered list in this component) but has no gallery
representation. A first-time author looking at the gallery would not know it
exists. The maker mentioned adding it as a fix recommendation — this is the right
priority.

Top fixes:
  1. `list.gallery.md` (p06 anti-pattern): Replace `` `**Title.** body` `` with a
     plain-text demonstration that doesn't trigger Marp's bold-in-code processing.
     Use `` `Title. body` `` (no bold markers) or escape the asterisks as literal
     characters: `\*\*Title.\*\* body` outside a code span, so the anti-pattern is
     legible without the raw-HTML artifact.
  2. `list.gallery.md`: Add a numbered (`ol`) variant slide (after the default)
     showing 5 items as `1. Item text`, so the counter column variant is visible
     in the gallery.
  3. `list.docs.md` (anatomy block): Update to show the pill-card chrome (left
     accent border, bg-alt fill) matching the actual render.

---

### list-tabular — adjudicated
Maker overall: 5 → Checker overall: 5/10 — REWORK (CONFIRM, with severity upgrade
on the overflow nature)

Pages viewed: light p01-p15 (+dark p11); right-edge region crops of p05 and p09

- Styling: CONFIRM and UPGRADE. Both overflow bugs are real and viewed at
  full-resolution crops:

  **BUG 1 (p05, spec variant) — CONFIRM, mechanism clarified:** The right column
  mono keys (`LATTICE_THEME`, `LATTICE_CACHE`, `LATTICE_TRACE`) overflow the slide
  right edge. At the region crop, the last characters render as garbled/corrupted
  glyphs (`LATTICESTRENE`, `LATTICE_OACHE`, `LATTICE_URACE`) — this is not simple
  clipping but character-level glyph corruption at the slide boundary (adjacent
  character bitmaps overprint at the pixel boundary). Root cause confirmed in CSS
  L218: `grid-template-columns:3.4375cqi 20.3125cqi 1fr auto` — the `auto` 4th
  column expands unconstrained.  The maker's root cause is correct; `minmax(0,
  <bound>)` is the fix.

  **BUG 2 (p09, spec+stacked variant) — CONFIRM, more severe than described:**
  API paths (`GET /decks/:id`, `POST /decks/:id/render`, `DELETE /decks/:id/cache`)
  in the right column also exhibit glyph corruption: rendered as `GET /BBOK$/4DD`,
  `POST /DECKS/:ZDZRENDER`, `DELETE /DECKS/2DD/CACHE` at the crop. The CSS places
  the `code` element at `grid-column:3; grid-row:2` (L247-249) in a 3-column grid
  (`3.4375cqi 1fr auto` at L232) — the `auto` 3rd column is again unconstrained.
  Both bugs share the same root cause: `auto` in a grid column that contains long
  mono strings without overflow containment.

  The non-buggy variants (p02 default, p03 def, p04 metric, p06 register, p07
  def+rule, p08 metric+solid, p10 register+outline) are confirmed clean.

- Aesthetics: CONFIRM. Clean variants are boardroom-excellent; def variant (p03)
  with large display counter and editorial name is the standout.
- Readability: CONFIRM. Clean variants readable; buggy variants have corrupted
  rightmost text rendering them unreadable at the key content column.
- Doc-align: REVISE. Maker notes `compact` is listed in the component-specific
  `variants` array and calls it a minor issue. This IS a DS violation per the rules
  (universal modifiers must not be re-listed in layout-specific variants). Confirmed
  in `list-tabular.manifest.json` — `compact` appears in `variants`. Not a visual
  rendering bug but a catalog/tooling correctness issue.
- DS: CONFIRM. The `#fff` hex literal at `list-tabular.styles.css` L213 (`color:
  var(--on-accent, #fff)` in `metric.solid`) is confirmed. This is the same
  inconsistency pattern flagged across the engine in `static-findings.md` — the
  fallback should be a token. Visual impact: none (the `--on-accent` token is set
  in all shipped themes), but the raw rule is non-compliant.
- Consistency: CONFIRM. Non-buggy variants consistent with bucket siblings.
- Redundancy: CONFIRM KEEP.
- Grouping: CONFIRM correct.

MISSED: All six clean variants (and both dark mode pages) show the same dead-lower-
half issue present in `glossary` and `list` — 4-5 item slides leave a large blank
lower canvas. The `list-tabular ol` has `display:flex; flex-direction:column` but
no `flex:1; justify-content:center`. This is a shared bucket-wide issue. The maker
called the clean-variant aesthetics "excellent" without noting the top-heavy content
placement — a genuine oversight.

MISSED: The `spec+stacked` grid has a deeper authoring contract problem: the CSS
places the description at `grid-column:2; grid-row:2` and the code at `grid-column:
3; grid-row:2` (L244-250), but for long API paths the name wraps in column 2 which
pushes the `auto` column 3 rightward. The fix requires constraining column 3 to
`minmax(0, <fraction>)` AND ensuring the code text is either truncated or wraps
within a bounded box.

Top fixes:
  1. `list-tabular.styles.css` L218 (spec variant): Change `grid-template-columns:
     3.4375cqi 20.3125cqi 1fr auto` → `3.4375cqi minmax(0, 20.3125cqi) 1fr
     minmax(0, 15.625cqi)`. Add `overflow:hidden; text-overflow:ellipsis;
     white-space:nowrap` to the `li > code` selector in the spec context to prevent
     text from exceeding its track.
  2. `list-tabular.styles.css` L232 (spec+stacked): Change `grid-template-columns:
     3.4375cqi 1fr auto` → `3.4375cqi 1fr minmax(0, 15.625cqi)`. The `code` at
     grid-column:3 must be bounded; add `white-space:nowrap; overflow:hidden;
     text-overflow:ellipsis` or allow wrap with `word-break:break-all` for long paths.
  3. `list-tabular.styles.css` L213: Replace `color:var(--on-accent, #fff)` with
     `color:var(--on-accent, var(--bg-canvas))` (or add `--on-accent` to the theme
     token requirement list). Matches the standardization recommended in
     `static-findings.md` for all card/accent components.
  4. `list-tabular.manifest.json` (variants array): Remove `"compact"` from the
     layout-specific `variants` list — universal modifiers must not be enumerated
     here per DS rules.

---

### principles — adjudicated
Maker overall: 8 → Checker overall: 7/10 — POLISH (REVISE downward by 1)

Pages viewed: light p01-p11 (+dark p07); detail crop of p06 bullet variant

- Styling: CONFIRM with clarification. The bullet variant (p06) tiny middle-dot
  `·` is visually confirmed as undersized relative to the row height. The
  `align-self:center` does work (the dot is vertically centered on the row), but
  the dot's visual weight is dramatically less than the decimal/letter/roman
  counters. The maker's diagnosis is correct. However there is an additional
  problem I observed: the bullet glyph renders at the same small visual size
  regardless of how tall the row content is — the other counter variants scale
  with row height via `clamp(var(--fs-emphasis), 28cqh, var(--fs-h1))` but the
  `content:'·'` pseudo-element inherits `font-size` from the `::before` rule which
  IS the clamp expression. The dot is physically large enough at that font-size
  but the middle-dot glyph `U+00B7` has very low visual density (narrow, short,
  centred vertically by its own metrics), making it appear tiny. A full-stop `·`
  replacement with an em-dash or `›` would match the visual mass of the numbers.
- Aesthetics: CONFIRM. Default (p02), lettered (p04), roman (p05) are polished.
  The roman variant's natural rhythm from varying numeral widths (I/II/III/IV/V)
  is elegant.
- Readability: CONFIRM. `clamp` expression gives appropriate display-weight text
  at desk distance for all non-bullet variants.
- Doc-align: CONFIRM. Two drifts verified:
  **Drift #1 (skeleton contradiction):** `principles.manifest.json` L28 skeleton
  field uses `- **Bias to action.** Default to...` (unordered list, bold inline
  title). The `slots.principles.description` at L25 says "authored as an ordered
  list (the counter renders as a large display numeral). No bold and no separate
  justification." Direct contradiction in the same file. Confirmed visually: the
  rendered slide shows no bold inline titles; the CSS would render `<strong>` text
  as bold inside the row cell, creating a two-part structure that doesn't match
  the intended single-sentence pattern.
  **Drift #2 (justification promise):** `manifest.json` L8 description says "each
  with a one-line justification." `purpose` field L9 says "Each principle reads as
  a complete sentence; the justification is below." The CSS (confirmed by reading
  `principles.styles.css`) provides only one grid column for item text — no sub-row
  for justification. The `def.rule` treatment in `list-tabular` shows how a two-row
  grid would look; `principles` CSS is single-row only. This description claims a
  feature the CSS doesn't support.
  These two drifts together affect agents/tools that read the manifest and any
  author who reads the description before looking at the gallery. Severity is higher
  than the maker rated (scored doc-align 6 → checker agrees 6 is accurate).
- DS: CONFIRM. `numbered` is listed as a component-specific `variant` but it is
  effectively the component's default counter behavior (decimal-leading-zero is the
  CSS default for the counter). Calling out `numbered` implies an alternative exists
  but there's no "unnumbered" base — all counter variants ARE numbered in some form.
  The `lettered`, `roman`, `bullet` variants are the genuine choices. Minor naming
  ambiguity.
- Consistency: CONFIRM.
- Redundancy: CONFIRM KEEP.
- Grouping: CONFIRM correct.

REASON FOR DOWNGRADE (8→7): Two doc-align drifts that directly misdirect both
agents and human authors (skeleton generates wrong authoring pattern; description
promises a justification slot that doesn't exist). These are authoring-contract
failures, not cosmetic issues. A component shipping with a skeleton that generates
broken slides deserves a 7, not an 8.

MISSED: The title slide (p01) shows "Declared statements — short stated principles,
each with a one-line justification." as the subtitle — this exact text is from
`manifest.description` (confirmed: `principles.manifest.json` L8). A first-time
author seeing the component title slide in the gallery will read "one-line
justification" and expect to author two-part items. The mismatch surfaces
immediately. This strengthens the doc-align finding.

Top fixes:
  1. `principles.manifest.json` L28 (skeleton field): Replace the ul+bold skeleton
     with `ol`-based format: `1. Default to the choice that is cheaper to reverse.\n
     2. Name the actor, never the system.\n` etc. matching the `sample` field. This
     immediately fixes `principles.docs.md` (auto-generated from manifest).
  2. `principles.manifest.json` L8–9 (description + purpose): Remove "each with a
     one-line justification" and "The justification is below." Update to: "Declared
     statements — guiding rules or tenets, each as one terse sentence." and purpose:
     "Use for design tenets, working agreements, or decision rules. Each principle
     is a single declarative statement; the layout renders it at display weight with
     a large counter as the visual anchor."
  3. `principles.styles.css` (bullet variant `content:'·'`): Replace `content:'·'`
     with `content:'–'` (en-dash) or `content:'›'` for a glyph with visual mass
     proportional to the counter column in other variants.

---

### tldr — adjudicated
Maker overall: 6 → Checker overall: 6/10 — REWORK (CONFIRM, with severity
additions)

Pages viewed: light p1-p8 (+dark p4); top-region crop of p3

- Styling: CONFIRM and extend. The numbered variant (p03) code-in-grid breakage is
  real and fully visible. At the top-region crop of p3: item "01" shows:
  - Line 1: "Components stay short —"
  - Line 2: `cards-grid` (block-level code chip, left-aligned in the 1fr column)
  - Line 3: `inventory.grid.cards` (second block-level code chip, below first)
  - Line 4: "not"
  - Line 5: "."
  The period "." dangling on its own line is particularly jarring for a boardroom
  slide. Root cause confirmed in CSS: `section.tldr.numbered > ul > li` is
  `display:grid; grid-template-columns:auto 1fr` (L47-51) with no `code {
  display:inline }` override. Marp renders `<code>` as `display:inline-block` or
  block in list context, breaking the 1fr text column flow.

  ADDITIONAL SEVERITY: The broken sample appears in BOTH the gallery PDF AND in
  `tldr.docs.md` lines 65-75 (the numbered variant's docs section embeds the
  identical sample with two inline code spans). Any author copy-pasting from the
  docs will reproduce the broken rendering. The maker only called out the gallery —
  the docs are also shipping a broken example.

- Aesthetics: CONFIRM. Default variant (p02, p04 dark, p05 compact) is clean and
  minimal — the hairline-separator treatment is appropriate for executive recaps.
  When the numbered variant works (items 02-05 on p03), the `--fs-h2` counter
  provides strong visual rhythm.
- Readability: CONFIRM. `--fs-body` at `font-weight:500` reads confidently at desk
  distance. Lines are kept short in all gallery samples.
- Doc-align: CONFIRM. `tldr.docs.md` anatomy block (lines 50-53) shows `— First
  takeaway, single line.` with an em-dash prefix for each item. The default render
  (p02) shows NO such prefix — bare text with only the separator rule. The em-dash
  in the anatomy implies a decorative character that does not exist. This is a minor
  mislead (authors will likely discover the actual appearance from the gallery) but
  the anatomy block's purpose is to describe the final render.
  CONFIRMED direct quote from `tldr.docs.md` L50: `│  — First takeaway, single line.`
- DS: CONFIRM. `--fs-h2` for the numbered counter is from the heading scale —
  consistent with `principles` which uses `--fs-h1` at max. No hex literals.
  `compact` is listed in the universal modifiers section correctly (not in the
  component-specific `variants` array). DS-compliant.
- Consistency: CONFIRM. Default is visually consistent with `principles` default —
  both use separator rules. `--fs-body` vs `clamp(--fs-body, 11cqh, --fs-h2)` is
  the right differentiation.
- Redundancy: CONFIRM KEEP.
- Grouping: CONFIRM correct.

MISSED: The `numbered` variant docs caption (manifest.json L76-78 `variantDocs.
numbered`) says "Authored as `ol` (`1.` source)." The gallery numbered variant
uses `<!-- _class: tldr numbered -->` with `1.` list items. The CSS rule fires on
`section.tldr.numbered > ol > li` — correct. However the CSS selector at L44 shows
BOTH `ul` and `ol` selectors for the numbered counter. If an author accidentally
writes a `ul` with the `numbered` modifier, the counter renders (the `ul > li`
gets the grid layout and `::before` counter) but the `<li>` elements are not
ordered-list items — the numbered caption says "authored as ol" which is correct
but authors may not know whether `ul` or `ol` is required. Minor authoring clarity
gap; not a rendering bug.

Top fixes:
  1. `tldr.styles.css` (numbered variant): Add `section.tldr.numbered > ul > li
     code, section.tldr.numbered > ol > li code { display:inline; }` to force
     inline rendering of code spans within the numbered grid cell. One-line fix,
     directly resolves the ship-blocker.
  2. `tldr.manifest.json` L78 (variantDocs.numbered sample) AND `tldr.docs.md`
     L70 (numbered variant example): Replace `1. Components stay short —
     \`cards-grid\` not \`inventory.grid.cards\`.` with a plain-text item that
     doesn't trigger the bug, e.g. `1. Components stay short — use cards-grid, not
     the full dot-path.` — until the CSS fix lands; after the fix, restore the
     inline code sample to demonstrate the fixed behavior.
  3. `tldr.docs.md` (anatomy block, lines 50-53): Remove the `—` em-dash prefix
     from each anatomy line. The anatomy should show bare text with separator rules
     below each item, matching the actual render.

---

## Checker bucket summary

### Maker claims verified / refuted / revised

| Claim | Status | Notes |
|---|---|---|
| list-tabular p05 spec keys clip at right edge | CONFIRM + UPGRADE | Text not just clipped but character-corrupted (glyph overprint at boundary) |
| list-tabular p09 spec+stacked paths clip | CONFIRM + UPGRADE | Same corruption pattern; garbled glyphs visible at region crop |
| `color:var(--on-accent,#fff)` hex literal in list-tabular | CONFIRM | L213, metric.solid variant |
| tldr p03 numbered inline-code breaks grid | CONFIRM + EXTEND | Period "." dangling on own line; same broken sample in docs.md, not just gallery |
| glossary dead lower 45% on 5-entry slides | CONFIRM (revise to ~50%) | All 5-entry pages confirmed; dark mode (p03) same |
| list p06 `&lt;strong&gt;` raw HTML chip | REVISE | Chip shows decoded `<strong>` angle brackets, not HTML entities. Mechanism: Marp processes bold inside backtick code span |
| principles skeleton `- **bold**` contradicts slot description | CONFIRM | Confirmed in manifest.json L28 vs L25. Both description AND purpose fields also promise a "justification" slot the CSS doesn't render |

### Most important real issues (ranked)

1. **list-tabular spec/spec+stacked column overflow with glyph corruption** (p05,
   p09) — ship-blocking for API/env-flag documentation use cases. One CSS fix per
   variant (`minmax(0,<bound>)` on the `auto` column). HIGH.

2. **tldr numbered inline-code grid break** (p03) — ship-blocking for numbered
   takeaways with technical content. One CSS `display:inline` override. Also broken
   in docs.md. HIGH.

3. **principles skeleton generates wrong authoring pattern** — agents and authors
   who read the skeleton will author `- **Bold.** text` format which (a) doesn't
   render the intended design, (b) creates bold-in-li that the card-style validator
   would flag. Fix: replace skeleton with ol-based format matching `sample`. MEDIUM.

4. **principles description/purpose promises "justification" slot** — a feature
   that doesn't exist in the CSS. Authors who read the description will expect
   two-part items. Fix: update description and purpose fields. MEDIUM.

5. **glossary dead lower half on sparse slides** — no flex centering on the table
   container. Visual imbalance on the most common use-case slide count (5-8 entries).
   One CSS flex rule. MEDIUM.

6. **tldr anatomy em-dash prefix** — anatomy implies a decorative character that
   doesn't render. Minor mislead. LOW.

7. **list p06 raw HTML angle brackets in anti-pattern chip** — gallery authoring
   artifact (Marp processes bold inside backticks). Fix the gallery source. LOW.

8. **list-tabular `compact` in component-specific variants** — DS catalog violation
   (universal modifiers must not be re-listed). Fix: remove from manifest variants
   array. LOW.

9. **Shared bucket aesthetic: all ledger/stack variants top-align sparse content**
   — `list` uses `justify-content:center` correctly; `glossary` and `list-tabular`
   do not. Suggests a bucket-wide centering convention that was applied
   inconsistently.

### Ship-blocker verdict

| Component | Ship-blocking bug? | Status |
|---|---|---|
| list-tabular | YES — spec and spec+stacked overflow/glyph-corruption | REWORK |
| tldr | YES — numbered variant inline-code grid break (and broken docs sample) | REWORK |
| glossary | No (POLISH — vertical centering is aesthetic, not functional breakage) | POLISH |
| list | No (POLISH — gallery authoring artifact, no CSS bug) | POLISH |
| principles | No (POLISH — doc/contract drift, no rendering failure in clean use) | POLISH |

### list / list-tabular / glossary redundancy verdict

All three KEEP. The maker's boundary analysis is confirmed:
- `list` (stack/prose): pill-card bullets, no column structure
- `list-tabular` (ledger/structure): multi-column numbered ledger, 4 variant flavors
- `glossary` (ledger/structure): two-column term/definition table, alphabetical range pill

The glossary↔list-tabular boundary is the thinnest (both show label+definition
column patterns) but is justified by: (a) glossary's runtime-derived range pill,
(b) alphabetical vs. numbered structure, (c) `white-space:nowrap` term column vs.
display-serif wrapping name. Documentation in each component's `related` field
handles the boundary. No merges recommended.

### Ranked worst→best (checker scores)

1. **list-tabular** — 5/10 REWORK: two ship-blocking glyph-corruption bugs + hex
   literal DS violation + compact in wrong variants tier
2. **tldr** — 6/10 REWORK: ship-blocking numbered variant code-in-grid break + docs
   also ship a broken example + anatomy drift
3. **glossary** — 7/10 POLISH: dead lower half + anatomy understates actual
   rendered structure
4. **list** — 7/10 POLISH: gallery HTML artifact + missing ol variant gallery +
   anatomy understates pill-card chrome
5. **principles** — 7/10 POLISH: skeleton contradicts slot contract; description
   promises non-existent justification slot; bullet glyph undersized (lowered from
   maker's 8 due to severity of authoring-contract drift)
