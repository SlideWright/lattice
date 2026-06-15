# Anchor bucket — adjudicated checker report

Checker: CHECKER agent
Date: 2026-06-06
Source galleries independently rasterized: closing light (7pp) + dark (7pp), title light (6pp) + dark (6pp), divider light (7pp), subtopic light (8pp).
Detail crops taken: closing-d p1 top, closing-l p2 center.
Source files read: all four *.styles.css, *.manifest.json, *.docs.md, *.gallery.md; lib/base/base.elements.css:13-29, base.modifiers.css:32-158, lib/integrations/markdown-it/scaffold.css; dist/lattice.css (border-top lines).

---

### closing — adjudicated
Maker overall: 4 → Checker overall: 4/10 — REWORK — CONFIRM at this score

Pages viewed: light p1-p7 (+dark p1-p5 in detail)

- **Styling — CONFIRM.** The h2 selector (`closing.styles.css:13`) is dead against the h1 gallery content. What the dead rule misses: `text-align:center`, `max-width:54.6875cqi`, `margin:0 auto var(--sp-sm)`, and `font-size:var(--fs-h2)`. The base rule `base.elements.css:29` (`section h1 { color:var(--text-display); font-size:var(--fs-h1); }`) still applies, so the h1 IS white (color is not lost) — but the maker's "color never applies" claim is **PARTIALLY WRONG**: color comes through via the base rule, not the dead component rule. The functional losses are: alignment (left instead of centered), max-width cap (none, so long headings fill the full slide width and wrap), and font-size is `--fs-h1` (48pt) rather than the intended `--fs-h2` (28pt). Light p2 and p4 clearly show the heading left-aligned and wrapping to two lines. The "Take this away." case on p3 reads as approximately centered visually because the text block is narrow enough to float near center within the left-aligned flow — but it IS left-aligned, not centered. CONFIRM on spectrum top-border bleed: closing light p5 (accent variant) and all dark gallery pages show the spectrum bar, but the light silent slides (p1, p2, p3, p4) do NOT show the bar. This contradicts the maker's statement that "p5 light" shows the bleed — that page uses `closing silent accent`, and it still bleeds, which is odd since `section.closing { border-top:none; }` should hold. Light p5 is indeed `closing silent accent` and shows the bar.

  **MISSED (critical):** The dark gallery shows the spectrum bar on ALL 7 pages — including slides with `section.title.silent` and `section.closing.silent` (confirmed via top-region detail crop of dark p1). The light gallery suppresses the bar correctly on closing/title/silent slides. This is a theme-specific dark-cascade bug: the `border-top:none` component rule fires in `indaco` but is defeated in `indaco-dark`. Root cause is not yet known (could be Marp re-injecting the `border-image` post-theme in the dark theme pipeline, or a specificity collision with dark-palette section rules). This is a WIDER issue than the maker identified — it affects ALL dark gallery renders for title, closing, and divider, not just "non-silent slides."

- **Aesthetics — CONFIRM (REVISE upward slightly).** The left-aligned large heading is visually incoherent as a closing bookend. However, the maker overlooked that the subtitle/eyebrow paragraph IS styled correctly by `section.closing p { text-align:center; }` — so it renders centered below the left-aligned h1, creating an intentionally broken composition. The numbered variant (p3) is tolerable visually since short text looks roughly centered. The design intent (centered dark bookend mirroring title) is completely unrendered.

- **Readability — CONFIRM.** Left-aligned h1 at `--fs-h1` (48pt) wrapping over two lines contradicts the docs' own "anti-pattern: Multi-line h1" warning. The docs say "the layout is centered and large" but it's left-aligned. The `--fs-h1` size is arguably correct for a bookend pair (matches title), but without `max-width:54.6875cqi` the text blooms full-width and wraps.

- **Doc-align — CONFIRM with REVISION.** Three confirmed doc drifts:
  1. `closing.manifest.json` slots `heading.selector = "h1"` vs `closing.styles.css:13` targeting `h2` — direct contradiction.
  2. Anatomy diagram shows "CLOSING" (eyebrow) above "Take this away" (heading). Gallery shows h1 first (left), then eyebrow below as italic subtitle. The eyebrow appears below the heading, not above, because closing has no `order:-1` trick (unlike title). Maker correctly identified this.
  3. Anatomy shows `── accent ──` hr rule; no `<hr>` appears in any gallery slide; CSS rule `section.closing hr` targets a never-authored element.
  4. **MISSED:** The anatomy also positions the eyebrow in ALL CAPS uppercase tracked — the actual render shows it as italic body font (because the base "subtitle" rule fires for `h1 + p:has(> code:only-child)`, not the eyebrow style). If the `order:-1` trick and h2→h1 fix were both applied, the eyebrow would need to be BEFORE the h1 in source (like the sample says) or the `order:-1` approach used.

  Note on the sample: `closing.manifest.json` sample shows `# heading` then `` `eyebrow` `` (h1 before code paragraph). Title does the same and uses `order:-1` to reorder visually. Closing has no equivalent reorder rule — the sample authoring pattern relies on a CSS trick that only exists in `title.styles.css`, not `closing.styles.css`. This is an additional latent bug even after the h2→h1 fix.

- **DS — CONFIRM (REVISE).** The h2 selector is a dead rule, confirming the DS-compliance finding. `font-style:italic` on `section.closing p` is a stylistic choice outside the typography token system — not prohibited but undocumented. No hex literals, otherwise token-compliant. Maker's DS score of 5 is fair.

- **Consistency — CONFIRM.** Closing's left-aligned render is inconsistent with title's centered render. This is the single most important UX break: the bookend pair does not match.

- **Redundancy: KEEP** — closing earns its place as the final-slide mirror of title. Confirmed.

**Re-score:** Maker 4/10 REWORK confirmed. The h2→h1 CSS fix is a one-line change that restores centering and max-width. But the FULL fix requires two additional changes: adding the eyebrow `order:-1` reorder (matching title's pattern) and updating `base.modifiers.css` h2→h1 consistency. The dark-cascade bleed is a cross-cutting issue, not closingspecific.

Final top fixes:
  1. `lib/components/anchor/closing/closing.styles.css:13`: change `section.closing h2` → `section.closing h1` (restores text-align:center, max-width, margin:0 auto). Verify intent on font-size: the h2 rule used `--fs-h2` (28pt) while base h1 uses `--fs-h1` (48pt) — decide which is correct for the bookend; if parity with title is intended, drop the font-size override entirely and let base h1 rule stand at 48pt.
  2. `lib/components/anchor/closing/closing.styles.css`: add `section.closing h1 + p:has(> code:only-child) { order:-1; margin:0 0 0.3125cqi 0; }` with matching `> code` eyebrow style (tracked uppercase, `--fs-meta`, `font-style:normal`) — matching the title pattern exactly.
  3. `lib/components/anchor/closing/closing.docs.md` (Anatomy): correct the anatomy to show eyebrow above h1 (it will be visually above after fix 2), and remove or clarify the `── accent ──` line.
  4. `lib/base/base.modifiers.css:77-78` + `145-146`: audit all `section.closing h2 + p` / `section.closing p:has(> code:only-child):has(+ h2)` rules to ensure they're covered for h1 consistently (most already are, but confirm after CSS fix).

---

### title — adjudicated
Maker overall: 8 → Checker overall: 7/10 — POLISH — REVISE DOWN

Pages viewed: light p1-p6 (+dark p1-p4 in detail)

- **Styling — CONFIRM on non-silent bleed; REVISE on dark bleed severity.** Light gallery: slides using `silent` (all gallery slides use `title silent`) correctly suppress the spectrum bar — confirmed by top-region crop of light p1 showing clean top edge. The spectrum bar appears on a non-closing slide p5 (list / anti-patterns slide — `section.list` not `section.title`). The dark gallery is a different story: the spectrum bar appears on ALL dark gallery slides including those using `title silent` (confirmed by top-region crop of dark p1). This is worse than the maker described. The maker said "the base modifier for `silent` suppresses it but the component-level rule should too" — but the light gallery shows the component `border-top:none` IS working for light. The dark gallery shows it does NOT work in the dark theme regardless of `silent`. This is a dark-theme cascade bug distinct from the non-silent question.

- **Aesthetics — CONFIRM.** Clean centered composition. Slightly below true vertical center is confirmed on light p2, p3, p4. The cluster occupies ~55-65% vertical range. This is a common optical compensation but could be 3-5% higher.

- **Readability — CONFIRM.** Hierarchy clear. Dark gallery eyebrow contrast (on-dark-secondary) is reduced compared to text-display heading but acceptable.

- **Doc-align — CONFIRM.** Anatomy shows `── accent ──` between h1 and subtitle. The gallery source has no `<hr>` and no slide renders with an accent rule. The CSS rule `section.title hr { background:var(--accent); ... }` exists (`title.styles.css:12`) but is dead relative to gallery examples. Maker correctly identified this. Skeleton using three explicit directives vs `silent` is a minor inconsistency — confirmed.

- **DS — CONFIRM compliant.** Palette-blind, type tokens correct, eyebrow flex reorder is elegant.

- **Consistency — CONFIRM.** Title and closing share dark-canvas dark background. The spectrum bleed affects both identically in dark gallery.

- **MISSED:** The dark gallery spectrum bleed is NOT just "non-silent slides" — it affects ALL slides in any dark-theme gallery render, including `title silent`. This is a separate and more severe issue than described. It means every boardroom deck that ships using `indaco-dark` or `cuoio-dark` will show the spectrum bar on title and closing slides even when `silent` is used. This is a medium-high severity visual defect in the dark theme pipeline.

**Re-score rationale (7 vs maker's 8):** The dark-theme spectrum bleed on `silent` slides specifically is a shipping defect not just a "minor styling" — it degrades the dark canvas bookend which is a key design element. Dropping 1 point is appropriate.

Final top fixes:
  1. Investigate why `section.title { border-top:none; }` fails to suppress the spectrum border in `indaco-dark` / `cuoio-dark` rendered galleries (cascade race between Marp's own scaffold injecting a `border-image` post-theme in dark mode, or `color-scheme:dark` at `:root` triggering a re-evaluation path). File in `engineering/gotchas.md` once root cause is confirmed.
  2. `lib/components/anchor/title/title.docs.md` (Anatomy): remove `── accent ──` line or add an `<hr>` example slide to the gallery that demonstrates the feature.
  3. `lib/components/anchor/title/title.manifest.json` (skeleton): replace the three explicit suppression directives with `<!-- _class: title silent -->` to align with the sample and the recommended authoring pattern.

---

### divider — adjudicated
Maker overall: 8 → Checker overall: 8/10 — POLISH — CONFIRM

Pages viewed: light p1-p7 (+ dark p2, p5 from earlier rasterize)

- **Styling — CONFIRM.** Spectrum left rail (`::before`, visible on left edge of all dark-canvas slides) renders correctly and cleanly. Dark gallery spectrum top-border bleed affects divider dark gallery identically to title/closing (same dark-theme cascade bug). Light gallery: non-silent slides show the spectrum top bar (confirmed light p5 anti-patterns slide). Silent divider slides in light suppress correctly.

- **Aesthetics — CONFIRM.** Left-aligned heading in lower-left quadrant reads as intentional editorial negative space. The heading sits at approximately 40-45% from the top — slightly above true center — which is correct for the editorial left-aligned design intent. Maker's description is accurate.

- **Readability — CONFIRM.** `--fs-h1` heading, `--fs-meta` tracked eyebrow. Clear hierarchy. Divider CSS also covers `section.divider h2 { font-size:var(--fs-h2); }` for h2 subheadings — this is a useful extension not mentioned in the maker report.

- **Doc-align — CONFIRM.** Anatomy shows `── accent ──`. The divider CSS has NO specific `section.divider hr` rule (unlike title which has one). The base `section hr { background:var(--spectrum); ... }` would apply, but no `<hr>` appears in any gallery slide. Anatomy drift confirmed. Note: the anatomy diagram heading position (vertically centered) vs actual render (~40% from top in left quadrant) is a minor drift but the left-column placement is visually appropriate and the anatomy's diagrammatic representation is approximate.

- **DS — CONFIRM compliant.** No hex literals. `--fs-h1` and `--fs-h2` both styled (supporting h1 and h2 headings). The `numbered` variant's `::after` counter is handled in `base.modifiers.css`. Spectrum vertical rail via `::before` is a clean CSS approach.

- **Consistency — CONFIRM.** Divider is correctly distinct from title/closing (left vs center, left rail vs no rail).

- **MISSED:** The divider CSS styles BOTH `h1` and `h2` (lines 12-13), which means an author using `## Section heading` on a divider slide gets styled output. This is undocumented — neither the slots table nor the anatomy mentions h2 support. This is either an accidental extension or a documented-but-unlisted feature. Low severity.

Final top fixes:
  1. (Shared) Investigate dark-theme spectrum top-border bleed — same fix needed as title.
  2. `lib/components/anchor/divider/divider.docs.md` (Anatomy): remove the `── accent ──` line — no `<hr>` is ever authored on divider slides, and the CSS provides no accent-rule override (would render as spectrum-colored via base rule, not accent-colored as the `──` implies).
  3. `lib/components/anchor/divider/divider.docs.md` (Slots): optionally document that `h2` is also styled at `--fs-h2` scale (or remove the h2 rule if it was unintentional).

---

### subtopic — adjudicated
Maker overall: 8 → Checker overall: 8/10 — POLISH — CONFIRM

Pages viewed: light p1-p8 (+dark p4 spot-check)

- **Styling — CONFIRM.** Clean centered layout. Spectrum top bar visible on light gallery slides (subtopic has no `border-top:none` rule — the spectrum bar is expected Marp chrome, consistent with content slides). Light p2 shows the bar as a full rainbow stripe at top, which is more visually present on the white canvas than on dark slides — this is correctly noted by the maker.

- **Aesthetics — CONFIRM (REFINE).** The content cluster (eyebrow + h2) sits at approximately 45-55% vertical range — confirmed on light p2. The large empty lower half is visible. The maker's "slightly below center" is accurate. This is the most significant aesthetic issue for subtopic: the anchor light divider should feel light and airy but balanced, not bottom-weighted.

- **Readability — CONFIRM.** h2 at `--fs-h2` (28pt) is appropriately subordinate. Tracked uppercase eyebrow at `--fs-meta` is legible. Light canvas text contrast is excellent.

- **Doc-align — CONFIRM with PRECISION.** The anatomy shows three elements:
  1. `MODULE 03` (eyebrow) — maps to `p > code` slot, confirmed in gallery
  2. `Sub-topic heading` (h2) — confirmed in gallery
  3. `One-line orientation` — maps to NO documented slot

  The manifest slots only document `heading` (h2) and `eyebrow` (p > code). Yet `subtopic.styles.css:11` explicitly styles `section.subtopic p { font-size:var(--fs-message); ... }` — a plain paragraph IS styled. This means the "One-line orientation" element exists functionally but is undocumented in the slots table. The gallery never shows a slide with a plain paragraph below the heading, so authors relying on the anatomy would not know it's there. Confirmed as maker described.

- **DS — CONFIRM compliant.** No hex literals. `--fs-h2` and `--fs-message` on scale. `numbered` correctly listed. `align-items:center; justify-content:center` for centered layout — fine.

- **Consistency — CONFIRM.** The white-canvas centered layout is clearly distinct from the three dark-canvas siblings. Eyebrow treatment (mono, tracked uppercase, `--fs-meta`) is consistent with divider. The spectrum top bar is shared base chrome — deliberate for non-silent content slides.

- **Redundancy: KEEP** — fills the lightweight mid-deck orientation role. CONFIRM.

- **MISSED:** The `section.subtopic p` CSS rule (line 11) also creates an issue with the "See also" last gallery slide (p7/p8): that slide uses a list element under a closing slide, so subtopic p rule would not affect it. But any plain paragraph authored on a subtopic slide (e.g. a link, a note) would render at `--fs-message` (21pt) which may be unexpectedly large. Minor.

Final top fixes:
  1. `lib/components/anchor/subtopic/subtopic.docs.md` (Anatomy) and `subtopic.manifest.json` (slots): either add a `subtitle` slot entry for `p` (selector, description "one-line orientation"), or remove the "One-line orientation" line from the anatomy diagram. If adding the slot, add a gallery slide demonstrating it.
  2. `lib/components/anchor/subtopic/subtopic.styles.css`: investigate whether a small `padding-top` reduction or `margin-top: auto` on the content group can pull the cluster ~5% toward true optical center (currently occupies 45-55% vertical range, ideally 40-50%).

---

## Checker bucket summary

### Maker claims: confirmed / refuted / revised

1. **Closing dead CSS selector (h2 vs h1)** — CONFIRM. Visually verified on light p2, p4, dark p2, p4: left-aligned large h1, no centering or max-width. The makeup of what's lost is REVISED: color token still applies via base rule (`section h1 { color:var(--text-display) }`), but text-align, max-width, and margin:0 auto are all dead. Font-size is `--fs-h1` (48pt) not intended `--fs-h2` (28pt) — whether 48pt or 28pt is the design intent requires deliberate decision.

2. **Closing eyebrow renders below h1 (no order trick)** — CONFIRM. Gallery source puts h1 first, eyebrow code paragraph second. Without `order:-1` the eyebrow renders below the heading as an italic subtitle. Anatomy shows it above.

3. **Spectrum top-border bleed on non-silent slides (title, closing, divider)** — CONFIRM for light gallery non-silent slides. REFUTE for "non-silent is the trigger": the dark gallery shows the bleed on ALL slides regardless of silent state, including slides where `border-top:none` should fire. The maker's framing as a "base-cascade interaction when silent is absent" is INCORRECT for the dark gallery behavior.

4. **Dead `── accent ──` hr anatomy entries (title and divider)** — CONFIRM. No gallery slide authors `<hr>`. Title has a live `section.title hr` CSS rule that would style one. Divider has no specific hr rule (base rule would apply spectrum color, not accent). Both anatomies are misleading.

5. **Subtopic undocumented subtitle slot** — CONFIRM. `section.subtopic p` CSS exists; manifest slots table omits it; anatomy shows "One-line orientation" element; no gallery demo slide.

6. **Subtopic below-center vertical balance** — CONFIRM. Content cluster at 45-55% vertical range, confirmed on light p2.

7. **Maker claim: "closing short text `numbered` variant appears centered"** — CORRECT OBSERVATION, WRONG MECHANISM. The text "Take this away." is left-aligned in a flex-centered container, so a short line naturally sits near center visually. It is not centered — the anti-pattern would surface if someone uses slightly longer text.

### Important issues not in the maker report (MISSED findings)

A. **Dark-theme cascade: spectrum bleed on ALL anchor slides in dark gallery** — the `border-top:none` rules for title, closing, and divider are defeated in the dark theme render (`indaco-dark` / `cuoio-dark`). Every slide in every dark gallery for these three components shows the spectrum bar — even `silent` slides. Severity: MEDIUM-HIGH (ships broken dark-canvas bookends). Root cause requires cascade investigation.

B. **Divider h2 support is real but undocumented** — `section.divider h2 { ... }` exists in the CSS, styled at `--fs-h2`. Not in slots, not in anatomy. Low severity.

C. **Closing eyebrow authoring contract conflict** — the sample authoring pattern places h1 BEFORE the eyebrow code paragraph (`# heading\n\n\`eyebrow\``). Title uses the same pattern but has `order:-1` to visually reorder. Closing has no such reorder, so even with the h2→h1 fix, the eyebrow will still render BELOW the h1. The fix requires BOTH the CSS h2→h1 change AND adding the eyebrow reorder (matching `title.styles.css:16-29`). The maker listed the eyebrow fix as a top fix, so this was implicitly captured, but the interaction — that fixing h2→h1 alone is insufficient to match the anatomy — was not emphasized clearly enough.

### Ranked worst to best (checker)

1. **closing** 4/10 — REWORK: h2 selector mismatch breaks centering, max-width, and font intent; missing eyebrow reorder; dead hr anatomy; eyebrow renders as italic subtitle not tracked uppercase label.
2. **title** 7/10 — POLISH: dark-theme spectrum bleed on silent slides (cross-cutting bug); dead hr anatomy entry; skeleton/sample inconsistency.
3. **divider** 8/10 — POLISH: dark-theme spectrum bleed (cross-cutting); dead hr anatomy entry; h2 slot silently supported but undocumented.
4. **subtopic** 8/10 — POLISH: below-center balance (5-7% shift needed); undocumented subtitle paragraph slot/anatomy drift.

### Cut or merge recommendations

None. All four components earn their place. The anchor bucket is correctly scoped and the four layouts form a coherent hierarchy: title (deck open), divider (section open), subtopic (sub-section open), closing (deck close). The critical fix is closing's h2→h1 CSS selector — a one-line change that with the eyebrow reorder addition fully restores the intended centered bookend.

### Bucket-wide cross-cutting priority

The dark-theme spectrum bleed on anchor slides (title, closing, divider) is the most important infra-level finding. It is not a per-component fix — it requires a cascade investigation that likely affects other dark-gallery renders beyond the anchor bucket. This should be root-caused before other polish work proceeds.
