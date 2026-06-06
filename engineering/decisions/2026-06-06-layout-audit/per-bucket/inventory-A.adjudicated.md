# Inventory bucket — Part A — Adjudicated checker report
## Components: actors, agenda, cards-grid, cards-side, cards-stack, checklist

Checker method: independent rasterize of all light galleries + targeted dark spot-checks,
followed by source reads of CSS and docs files for each contested claim.
Pages viewed: actors p1–p7 detail (bottom crops p2, p5); checklist p2–p5 detail;
agenda dark p4–p5; cards-side p1–p8; cards-stack p2–p7; cards-grid p7,p9.

---

### actors — adjudicated
Maker overall: 7 → Checker overall: 6/10 — POLISH (downgrade)
Pages viewed: light p1–p7 (all), detail bottom crops p2 and p5, dark p3 (via overview)

- Styling: CONFIRM overflow bug, and REVISE scope. The maker identified the overflow on p-2 (default 5-row). Independent bottom-crop confirms: "Clears blockers / Executive Sponsor" row is cut — the body text is visibly truncated at slide bottom on p-2. The same overflow reappears on p-5 (accent variant, same 5-row content) — the maker missed this second occurrence. The overflow affects every 5-row variant that does not use `compact`. p-4 (compact) resolves it cleanly. Styling score lowered to 5 because the overflow is present in 2 of 5 non-title content pages in the default gallery.
- Aesthetics: CONFIRM. 3-item slides (p-6, anti-patterns) show `justify-content:center` leaving ~40% dead space below — the content block floats mid-slide rather than anchoring top. Acceptable for a 3-item ledger but notable.
- Readability: CONFIRM at 8, but note: when the overflow fires, the clipped row body is unreachable — effective readability drops to 0 for that row. The score should reflect "clean slides are fine, broken slides are broken," not average.
- Doc-align: CONFIRM at 8. The manifest `whenToUse` says "three to six actors" yet the gallery's only multi-row examples are 5-row (and overflow). No 3- or 4-row example exists as a clean default. The anatomy block does not warn about the 5-row limit.
- DS: CONFIRM fully palette-blind, tokens correct.
- Consistency: CONFIRM.
- MISSED: **p-5 (accent variant) also overflows** — same 5-row sample, same clip at slide bottom. Maker cited only p-2. The overflow is structural (all `justify-content:center` + 5 rows = overflow) and fires on every 5-row slide regardless of modifier.
- MISSED: **actors.styles.css has no `compact` modifier CSS** — `compact` is provided by the universal base modifier, which reduces `--sp-sm` etc. The component works but the gallery shows only one compact example (p-4) as the "fix". Authors won't know to apply compact by default.
- Redundancy: KEEP — CONFIRM.
- Grouping: CONFIRM.

Revised scores: Styling 5 | Aesthetics 7 | Readability 7 | Doc-align 7 | DS 9 | Consistency 8 | **Overall 6/10** — POLISH

Top fixes:
  1. `lib/components/inventory/actors/actors.styles.css` line 27: Change `justify-content:center` to `justify-content:flex-start`. This is a correctness failure, not a style preference. The vertical centering on short lists can be re-introduced with `@media` or a min-height guard if desired.
  2. `lib/components/inventory/actors/actors.gallery.md`: Replace the 5-row default page with a 3-row or 4-row example as the hero slide. Move 5-row to a "stress test" slide with the `compact` modifier applied.
  3. `lib/components/inventory/actors/actors.docs.md` anatomy: Add explicit note "maximum 4 actors at standard size; use `compact` for 5–6".

---

### agenda — adjudicated
Maker overall: 9 → Checker overall: 8/10 — KEEP (downgrade by 1)
Pages viewed: light p1–p13 (all), dark p4, p5

- Styling: CONFIRM clean. No overflow, no clip across all 13 pages.
- Aesthetics: CONFIRM dead zone issue on 5-item slides. REVISE severity: the dead lower half on p-2/p-3 (5 items) is 35%+ of the slide area empty. At boardroom projection this will read as an unfinished layout. Not a blocker but costs the point that separates 9 from 8.
- Readability: CONFIRM at 9.
- Doc-align: CONFIRM at 9. All progress variants rendered and documented correctly.
- DS: CONFIRM fully compliant. `opacity:0.4` for past rows and `opacity:0.55` for future rows confirmed in CSS (agenda.styles.css lines 51, 71).
- Consistency: CONFIRM at 9.
- MISSED (dark mode contrast — checker-identified): On dark mode progress slides (dark p4, p5), past rows at `opacity:0.4` against a dark bg produce text that is visually very faint. The maker called this "borderline acceptable" for 5 items, but in the progress variants with 2 past rows (dark p5), rows 01 and 02 are so faint they near-disappear — the audience loses the "we covered this" signal. This is confirmed by visual inspection, not a theoretical concern. Suggest reducing past-row opacity on dark from 0.4 to 0.45–0.5, or switching to a lighter text color token rather than blanket opacity dimming on dark.
- MISSED: No eyebrow example in the gallery. The `progress-*` variants do not show any use of the eyebrow (backtick inline-code) slot. Minor coverage gap.
- Redundancy: KEEP — CONFIRM.

Revised scores: Styling 9 | Aesthetics 7 | Readability 8 | Doc-align 9 | DS 9 | Consistency 9 | **Overall 8/10** — KEEP

Top fixes:
  1. `lib/components/inventory/agenda/agenda.styles.css` line 71: Consider raising past-row opacity from `0.4` to `0.45` in dark contexts — the three-state (past/active/future) distinction flattens significantly in dark mode at 0.4 (confirmed on dark p5).
  2. `lib/components/inventory/agenda/agenda.gallery.md`: Add an eyebrow slot example to at least one progress variant page.

---

### cards-grid — adjudicated
Maker overall: 9 → Checker overall: 9/10 — KEEP (CONFIRM)
Pages viewed: light p1–p11 (all via overview), dark p7; independent re-check of p3, p7, p9

- Styling: CONFIRM clean. Dark mode (p-7) — card bg/border/text contrast all verified correct.
- Aesthetics: CONFIRM at 8. The four-column short-body case (p-3) is visually lopsided as noted. The `compact` pairing recommendation is missing from the gallery as the maker identified.
- Readability: CONFIRM at 8.
- Doc-align: CONFIRM at 9. The `insight` slot gap is real — no gallery page demonstrates it.
- DS: CONFIRM. Static findings note confirms `#fff` fallback in `var(--on-accent, var(--on-dark-primary, #fff))` in the numbered badge rule — this is a palette-blindness minor violation consistent with the static findings report (affects cards-grid, cards-side, cards-stack identically — family-wide issue).
- Consistency: CONFIRM at 9. Identical badge recipe, radius, gutter across all three cards-* components.
- MISSED: **`#fff` hex literal in numbered badge** (`lib/components/inventory/cards-grid/cards-grid.styles.css`, in the `::before` counter rule). Confirmed by static-findings.md: "cards-grid(×3)" listed under hex-in-rule pattern. The maker did not flag this as a DS violation. It's in the static findings and should be in the component report.
- Redundancy: KEEP — CONFIRM.

Revised scores: Styling 8 | Aesthetics 8 | Readability 8 | Doc-align 8 | DS 8 | Consistency 9 | **Overall 8/10** — KEEP (downgrade by 1 for DS hex violation)

Top fixes:
  1. `lib/components/inventory/cards-grid/cards-grid.styles.css`: Replace `var(--on-accent, var(--on-dark-primary, #fff))` with a token-only fallback chain (standardize with sibling components per static-findings recommendation).
  2. `lib/components/inventory/cards-grid/cards-grid.gallery.md`: Add a slide demonstrating the `insight` (blockquote) slot.
  3. `lib/components/inventory/cards-grid/cards-grid.gallery.md`: Add a `four compact` example.

---

### cards-side — adjudicated
Maker overall: 9 → Checker overall: 8/10 — KEEP (downgrade by 1)
Pages viewed: light p1–p8 (all), dark p4

- Styling: REVISE — the maker's cross-render parity claim is partially wrong. The CSS comment at lines 6–14 of `cards-side.styles.css` explicitly documents: "cards-side does NOT set grid-auto-rows:1fr on the wrapper ul/ol, so card heights follow content (cards-grid forces uniform rows)." This is a documented design decision, not a parity gap. The native path intentionally allows content-height cards.  HOWEVER, there is a third path — the `:not(:has(.cards-grid-inner))` fallback (lines 98–125) — which DOES set `grid-auto-rows:1fr` (line 100). So the three paths are: native (no grid-auto-rows), post-processed (grid-auto-rows:1fr), VS Code fallback (grid-auto-rows:1fr). The VS Code fallback and post-processed paths agree on equal-height; the native Marp CLI path gives content-height. This is a real inconsistency even if the native path is intentional — the fallback path contradicts it.
- Aesthetics: CONFIRM at 8. Cards with very short body leave large dead space in the lower half (p-2, p-5 compact). Inherent to the layout, but a 2-card slide with 3-line bodies leaves ~60% empty below. Noted but acceptable.
- MISSED: **`#fff` hex literal** in the numbered badge `::before` (lines 79, 91, 137) — `var(--on-accent, var(--on-dark-primary, #fff))`. Same DS violation as cards-grid, family-wide. Maker did not flag it.
- Doc-align: REVISE — maker says "docs correctly say 'exactly two list items' — matches." Verified: docs.md correctly describes 2-card constraint. No drift.
- DS: REVISE — marker says "palette-blind" but the `#fff` literal in the numbered badge IS a hex violation per the static findings. DS score should be 8, not 9.
- Consistency: CONFIRM at 9.
- Redundancy: KEEP — CONFIRM. The native path deliberate distinction from cards-grid is confirmed by the CSS comment.

Revised scores: Styling 8 | Aesthetics 8 | Readability 8 | Doc-align 9 | DS 8 | Consistency 9 | **Overall 8/10** — KEEP

Top fixes:
  1. `lib/components/inventory/cards-side/cards-side.styles.css` lines 98–100: Align the `:not(:has(.cards-grid-inner))` fallback path with the intentional native-path behavior (remove `grid-auto-rows:1fr`) OR change the native path to match the fallback (add `grid-auto-rows:1fr` to lines 19–23). Currently the two non-post-processed paths contradict each other. If equal-height is the intent, set it on the native path too and update the CSS comment.
  2. `lib/components/inventory/cards-side/cards-side.styles.css` lines 79, 91, 137: Replace `#fff` in `var(--on-accent, var(--on-dark-primary, #fff))` with a design-token floor (consistent with family-wide standardization).

---

### cards-stack — adjudicated
Maker overall: 9 → Checker overall: 9/10 — KEEP (CONFIRM with doc-drift correction)
Pages viewed: light p1–p10 (all), dark p6

- Styling: CONFIRM clean. No overflow across all pages. p-5 (4 cards with pills) is not compact+pills as the maker described — it is 4 cards at standard size with right-anchored pills. The maker mislabeled this page but the visual observation ("fits cleanly") is correct.
- Aesthetics: CONFIRM at 9. The 3-card default (p-2) is well-proportioned. The horizontal variant (p-3) shows equal-width columns — visually identical to cards-grid `three`. Confirmed.
- Readability: CONFIRM at 8. The compact modifier (p-7) shows same 3-card content at reduced size — the title/body weight contrast is the only hierarchy signal in compact mode, confirmed as "borderline but acceptable."
- Doc-align: CONFIRM drift. The `horizontal` variant docs say "left-aligned title column with the body to its right" (`cards-stack.docs.md` line 67). The render (p-3) clearly shows three equal-width cards, not a narrow-title/wide-body split. Drift confirmed by direct quote. Score: 8, not 9.
- DS: REVISE — maker says palette-blind but `#fff` literal exists in the numbered badge CSS. Same family-wide issue as cards-grid and cards-side. DS score: 8.
- Consistency: CONFIRM at 9.
- MISSED: **`#fff` hex literal** in numbered badge `::before` (same pattern as siblings). Maker did not flag.
- Redundancy: KEEP — CONFIRM. The `horizontal ≈ cards-grid three` overlap noted.

Revised scores: Styling 9 | Aesthetics 9 | Readability 8 | Doc-align 8 | DS 8 | Consistency 9 | **Overall 9/10** — KEEP

Top fixes:
  1. `lib/components/inventory/cards-stack/cards-stack.docs.md` §horizontal variant line 67: Correct from "left-aligned title column with the body to its right" to "equal-width columns laid out in a single row — each card occupies the same horizontal space." Exact quote of the broken doc confirmed.
  2. `lib/components/inventory/cards-stack/cards-stack.styles.css`: Replace `#fff` literal in numbered badge rule (same fix as siblings — family-wide standardization).

---

### checklist — adjudicated
Maker overall: 9 → Checker overall: 9/10 — KEEP (CONFIRM, overflow claim revised down)
Pages viewed: light p1–p7 (all), detail bottom crop p2, accent p5, dark p3

- Styling: REVISE maker's overflow claim. The maker called the 7-item list "very close to (or touching) the footer zone." Independent bottom-crop of p-2 and full-slide view of p-5 (accent, same 7-item content) both show the last row (struck-through skip item) is comfortably contained with whitespace before the footer. There is NO actual overflow visible in the gallery. The `justify-content:center` at 7 items is a theoretical risk (one more tall item could overflow) but is NOT realized in the committed gallery PDF. This is a latent bug, not a shipped bug. The maker over-stated severity. Styling score: 9 (not 8).
- Aesthetics: CONFIRM at 9. Dark mode (p-3) is confirmed among the most polished dark slides in the bucket.
- Readability: CONFIRM at 9.
- Doc-align: CONFIRM anatomy gap — `[/]` (skip/strikethrough) state is missing from the ASCII anatomy diagram in the docs. The state is in the slots table and sample but absent from the diagram. Minor but real.
- DS: CONFIRM palette-blind via state tokens, color-mix usage correct.
- Consistency: CONFIRM. Left-rail pattern consistent with actors.
- MISSED: The `justify-content:center` latent overflow risk is real even though it's not visible at 7 items. At 8 items (the manifest states "5–8 items") the list will overflow. Authors authoring at the upper bound will hit a silent bug. The fix (flex-start) is still warranted as preventive hardening, but this is a LATENT issue not a SHIPPED bug.

Revised scores: Styling 9 | Aesthetics 9 | Readability 9 | Doc-align 8 | DS 9 | Consistency 8 | **Overall 9/10** — KEEP

Top fixes:
  1. `lib/components/inventory/checklist/checklist.styles.css` line 39: Change `justify-content:center` to `justify-content:flex-start` as preventive hardening — the risk is real at 8 items even if 7 fits.
  2. `lib/components/inventory/checklist/checklist.docs.md` anatomy block: Add the `[/]` (skip) row to the ASCII anatomy diagram.

---

## Checker bucket summary

### Maker claims that were wrong or imprecise

1. **actors overflow scope understated.** Maker cited only p-2 (default). Overflow also fires on p-5 (accent variant). Every non-compact 5-row slide overflows. The Styling score of 6 was too generous (5 is correct).

2. **cards-side parity gap misdescribed.** Maker called it a "cross-render parity gap" and proposed adding `grid-auto-rows:1fr` to the native path. The CSS comment at lines 6–14 explicitly says content-height is the *design intent* for the native path. The real issue is that the VS Code fallback path (`not(:has(.cards-grid-inner))`) adds `grid-auto-rows:1fr` at line 100, contradicting the documented native-path behavior. The fix is to align these two non-post-processed paths, not blindly add `1fr` to the native path.

3. **checklist overflow overstated.** Maker scored Styling 8 and described the 7-item list as near-overflowing. Visual inspection of the bottom crop shows the last row is fully contained with clear whitespace before the footer on both the default (p-2) and accent (p-5) pages. The risk exists at 8 items but is not visible at 7. Styling score: 9.

4. **cards-stack p-5 mislabeled.** Maker described p-5 as "4-card stress test with compact+pills." It is 4 cards at standard size with status pills — no compact modifier. This doesn't affect the visual finding (cards fit cleanly) but is an inaccurate page description.

5. **`#fff` hex literals missed across all three cards-* components.** The static-findings.md explicitly lists "cards-side(×3), cards-stack(×2), cards-grid(×3)" under the hex-in-rule pattern. The maker flagged none of them as DS violations. This is a real (if minor) DS compliance issue that should be fixed consistently across the family.

6. **agenda scored too generously at 9.** The dark-mode past-row contrast (opacity:0.4 on dark bg) is confirmed visually as near-invisible on dark p4–p5. This is a shipped readability issue that prevents the three-state hierarchy from reading in dark mode. A 9 implies "zero nits a VP of Design would raise" — this would be raised. Score: 8.

### Real issues ranked worst to best

| Priority | Component | Issue | Severity |
|----------|-----------|-------|----------|
| 1 (worst) | actors | `justify-content:center` overflow at 5 rows — shipped, visible in p-2 and p-5 | BUG |
| 2 | actors | No clean 3–4 actor example as the default/hero gallery page | UX gap |
| 3 | cards-stack | docs.md `horizontal` variant description is wrong (says "title column" renders equal-width) | DOC DRIFT |
| 4 | agenda | Dark mode past-row opacity 0.4 nearly invisible in dark progress slides | CONTRAST |
| 5 | cards-side | VS Code fallback path (`not:has`) contradicts native path on `grid-auto-rows` — inconsistent between two non-post-processed render contexts | PARITY |
| 6 | cards-grid/side/stack | `#fff` hex literal in numbered badge `::before` — family-wide DS violation | DS |
| 7 | cards-grid | `insight` slot undocumented-by-example in gallery | GAP |
| 8 | checklist | `justify-content:center` latent overflow risk at 8 items (not yet visible in gallery) | LATENT |
| 9 | checklist | `[/]` state missing from anatomy diagram | DOC |
| 10 | agenda | No eyebrow slot example in any progress variant page | COVERAGE |

### Redundancy cluster verdict

CONFIRM all six KEEP verdicts. The cards-* family (grid/side/stack) is genuinely differentiated by form (2D grid / horizontal pair / vertical stack) and item-count sweet spots. No merge candidates within this bucket.

### Ranked worst → best (adjudicated)

| Rank | Component | Checker Overall | Verdict |
|------|-----------|-----------------|---------|
| 1 (worst) | actors | 6/10 | POLISH |
| 2 | agenda | 8/10 | KEEP |
| 2 | cards-grid | 8/10 | KEEP |
| 2 | cards-side | 8/10 | KEEP |
| 5 | checklist | 9/10 | KEEP |
| 5 | cards-stack | 9/10 | KEEP |

### Key disagreements with maker

- actors: 7 → **6** (overflow wider than reported; no clean default example)
- agenda: 9 → **8** (dark contrast confirmed as real shipped issue)
- cards-grid: 9 → **8** (hex literal DS violation missed)
- cards-side: 9 → **8** (parity claim misdescribed; hex literal missed; two non-post-processed paths contradict each other)
- cards-stack: 9 → **9** (CONFIRM but doc-drift confirmed + hex literal noted; stays at 9 because fix is trivial)
- checklist: 9 → **9** (CONFIRM; overflow overstated in severity but latent risk acknowledged)
