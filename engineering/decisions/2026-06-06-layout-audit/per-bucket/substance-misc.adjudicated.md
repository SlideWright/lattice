# Substance-misc audit — adjudicated checker report
# featured · image · diagram · math · code · compare-code

Checker: independent rasterize + read, 2026-06-06
Light + dark galleries independently rasterized for all six components.

---

### diagram — adjudicated
Maker overall: 6 → Checker overall: 5/10 — REWORK (downgrade justified)
Pages viewed: dark p1-p10 (overview + detail crops p4, p5, p8); light p1-p12

- **Styling (CONFIRM + EXTEND):** Dark-mode edge-label white-box failure is CONFIRMED and is MORE PERVASIVE than the maker reported. Detail crops show:
  - **d-p4 (flowchart):** "scored signal", "recalibration", "decide / close" — all three edge labels render as white-filled rectangles on the dark navy background. Text is readable inside the box but the boxes themselves are visually jarring. CONFIRMED.
  - **d-p5 (sequence):** Actor boxes (App/SDK/Store) have acceptable light-blue fills. Signal arrows are barely visible (very dark hairline). The ONE visible message label ("ision logged on cl..." — truncated, clearly "decision logged on close") renders with a YELLOW background box — not the dark palette background. The majority of inter-actor message text is INVISIBLE (dark text on dark background, no visible lines). CONFIRMED. The maker correctly identified both failure modes but understated the severity on the sequence diagram — it's essentially unreadable, not merely "near-invisible."
  - **MISSED by maker:** d-p7 (state diagram) shows the SAME edge-label white-box failure: "submit", "revise", "approve", "reject", "withdraw" transition labels all have white/light-gray fills on dark background. d-p8 (ER diagram) likewise: "issues", "carries", "emits" relationship labels have light-gray boxes on dark background. The failure is not isolated to flowchart + sequence — it affects at minimum flowchart, state, ER diagrams. Likely affects any Mermaid type that uses edge/transition labels (gitgraph, journey, possibly more).
  - d-p9 (user journey) shows a different but related issue: the three section fills (Discovery/Integration/Production) retain their pastel yellow/pink/blue fills on the dark background — these are `fillType0..7` Mermaid variables that also haven't been mapped to dark-palette equivalents.
  - The maker's fix prescription is correct but incomplete: `edgeLabelBackground` alone won't fix all types; state-diagram transition labels may use a different variable.
- **Readability (CONFIRM):** Sequence diagram dark mode is effectively unreadable — signals invisible, one label truncated with wrong background. CONFIRMED critical failure.
- **Doc-align (CONFIRM):** Solid, `galleryAuthored: true` flag respected.
- **DS (CONFIRM + NOTE):** The maker is right that `%%{init}%%` themeVariables don't cover all surfaces. The maker's fix target (`lib/integrations/mermaid/`) is correct — that's where the dark-mode variable injection happens.
- **Redundancy (CONFIRM):** Mermaid pie vs. piechart component, Mermaid gantt vs. chart-bucket gantt — real overlap noted. KEEP with docs guidance.
- **Grouping (CONFIRM):** Correct bucket.

**MISSED by maker:**
1. Edge-label white-box failure extends to state diagrams (d-p7) and ER diagrams (d-p8) — the maker checked only flowchart and sequence dark pages.
2. User journey (d-p9) section fills retain pastel light-mode colors in dark — `fillType0..7` variables not mapped to dark-palette equivalents.
3. Sequence signal arrows themselves (not just labels) are near-zero-contrast on dark — the arrow lines and activation bars are dark brown/rust on dark navy, suggesting `signalColor` AND `activationBorderColor` need fixing, not just `messageFontColor`.

Score revision: Maker gave 6/10 (Styling 5). Checker revises to **5/10** — the scope of dark-mode failures is wider than reported (at least 4 diagram types broken, plus journey fills), and the sequence diagram is not just "near-invisible" but operationally unreadable. Styling drops to 4.

Final top fixes:
  1. `lib/integrations/mermaid/` dark-mode themeVariables: set `edgeLabelBackground` to a dark token (e.g. `var(--bg-surface)` resolved value, or `transparent`) — fixes flowchart, state, ER label boxes.
  2. Same injection: set `signalColor`, `messageFontColor`, `activationBorderColor` to light token values for sequence readability in dark.
  3. Same injection: map `fillType0..7` to dark-palette equivalents so journey/gitgraph section fills don't bleed light pastels onto dark backgrounds.
  4. After fixing, verify at minimum: flowchart (p4), sequence (p5), state (p7), ER (p8), user journey (p9) in dark gallery.

---

### image — adjudicated
Maker overall: 7 → Checker overall: 7/10 — POLISH (score confirmed)
Pages viewed: light p1-p11; dark p2-p6; detail crops p3 (bottom) + dark p3

- **Styling (CONFIRM with precision):** Caption overflow/clipping on `image full` (p3) is CONFIRMED. CSS source confirms: `max-height: 4.6875cqi` on `section.image.full p:last-of-type` with `overflow: hidden`. The gallery sample caption "Text overlays the lower portion on a contrast scrim. Use for openers, closers, or any moment when the image deserves the whole canvas" is cut after "closers, or" — the third line is fully hidden. Same `4.6875cqi` applies to `image contain` (p4) — detail crop confirms identical clipping there. Functionally broken for any two-line caption. The CSS comment at line 240 actually ACKNOWLEDGES the max-height ("Body is clipped to ~2 lines") but at `--fs-message` (21pt) the cqi value doesn't accommodate two full lines.
- **Doc-align (CONFIRM):** Anatomy block shows `[image area]` centered with ambiguous text placement. The actual default is text LEFT, image RIGHT. The anatomy is misleading — it shows the image in the center of the slide area, not split right, and doesn't distinguish default vs. mirror. The maker's "anatomy doesn't distinguish default vs. mirror" is correct. Exact anatomy quote from `image.docs.md` lines 46-57 shows `[image area]` center-framed; render (p2) shows text LEFT, image RIGHT (hair border between).
- **DS (CONFIRM + PRECISION):** `.left` alias for `.mirror` confirmed at `image.styles.css:56,90,103,131,132`. Not listed in `image.manifest.json` variants array. The gallery (p6 light, p8) shows `mirror` variant; no `.left` variant slide exists. Undocumented alias is a real authoring-confusion risk.
- **Styling additional (MISSED by maker):** Dark gallery p3 (image full dark) — same caption clipping persists on dark background, confirming it's not theme-specific. The full-bleed caption is equally cut on dark (expected, since it's the same CSS). Not a new bug but worth noting.
- **Aesthetics (CONFIRM):** Full-bleed variants are cinematic. Museum (p5) placard proportions are well-calibrated. Half-canvas 6px left accent border (p2) is indeed heavier than the 1px hairlines used in the component elsewhere.
- **Consistency (CONFIRM):** Matches siblings. Header/footer suppression on full-bleed modes correct.
- **Redundancy (CONFIRM):** No direct overlap. KEEP.

Score confirmed at 7/10. Styling drops from the maker's implicit clean read to 6 due to the confirmed caption clipping on BOTH full AND contain (maker only cited full).

Final top fixes:
  1. `image.styles.css:264`: increase `max-height` on `.full p:last-of-type` and `.contain p:last-of-type` from `4.6875cqi` to `7.8125cqi` (equivalent to ~3 lines at --fs-message), or change `--fs-message` to `--fs-body` (16pt) for captions to make two lines fit in the current constraint.
  2. `image.manifest.json`: add `.left` to the variants list with a note that it is an alias for `mirror`.
  3. `image.docs.md` anatomy block: redraw to show text panel on LEFT side, image panel on RIGHT side (the actual default), with a second version for mirror. Remove the ambiguous centered `[image area]`.

---

### math — adjudicated
Maker overall: 7 → Checker overall: 7/10 — POLISH (score confirmed)
Pages viewed: light p1-p12; dark p3, p5; detail crop p3 right

- **Styling (CONFIRM + EXTEND):**
  - Legend column squeeze (p3, `math feature`): CONFIRMED. Detail crop of p3 right half shows each legend item fragmented to 2-3 words per line: "ℓ — log-\nlikelihood,\nconcave in β", "σ — logistic\nlink, σ(z) =\n1/(1+e^{-z})", etc. The right column is pinned to approximately 130px effective width by the flex grid when the equation spans the full left 3fr. Real readability failure for the component's primary use case (complex equations need the legend most).
  - Theorem variant (p5) header/h2 overlap: CONFIRMED in light. "LATTICE · MATH" header and "Intermediate Value Theorem." h2 share the top-left zone with zero separation. In light mode the header appears at 11px in muted color and the h2 is large bold — they are visually adjacent but the h2 overwhelms the header rather than colliding catastrophically. In dark mode (d-p5) the header fades into the background more but still occupies the same spatial zone. The maker's "crashes" is slightly strong — it's tight crowding, not pixel overlap, but the vertical gap is ~0px and a VP of Design would call it out.
  - MISSED by maker: On p2 (default/feature), "LATTICE · MATH" header appears mid-left at line 3 of the slide, well below the top chrome zone — the header is inside the content grid rather than fixed top-left. This is the same CSS grid confinement issue the maker's bucket summary mentions. It appears in both light and dark. It's not a catastrophic layout break (the header text is small and unobtrusive), but it violates the chrome placement contract: every other component shows "LATTICE · X" at the very top left. On the math feature variant, it appears approximately 35% down the slide, between the eyebrow and the equation area.
- **Aesthetics (CONFIRM):** stats variant (p9) is standout. Default (p2) is clean when equation fits the 3fr column.
- **Doc-align (CONFIRM):** Anatomy at `math.docs.md` lines 51-63 shows a single centered equation with flat legend BELOW ("E = energy (joules)" / "m = mass (kilograms)" / "c = speed of light") as a full-width list. The actual default layout is a 3fr/2fr two-column grid with equation LEFT and legend RIGHT with a vertical divider bar. This is a significant anatomy mismatch — the anatomy shows a completely different layout shape than what renders. CONFIRMED.
- **DS (CONFIRM):** Palette-blind. `decompose` modifier not in manifest `variants` array — confirmed in docs.md variant list (not present as a first-class entry). The `math stats` variant shows a 2.6em accent-colored estimate number — the CSS comment should document this as a sanctioned off-token size (per `engineering/typography.md` allowance for stats layouts).
- **Consistency (CONFIRM):** Math internal visual language (mono eyebrows, divider bars, WHERE label) is self-consistent.
- **Redundancy:** None. KEEP.

Score confirmed at 7/10.

Final top fixes:
  1. `math.styles.css` feature variant: set `min-width: 26cqi` on the legend column, or change the grid template from `3fr 2fr` to `2fr 2fr` to give the legend adequate width for multi-term equations.
  2. `math.styles.css`: fix `<header>` placement — the Marp-injected header is falling inside the content grid on the feature/base variants. Add `header { position: absolute; top: var(--sp-md); left: var(--sp-lg); }` or equivalent to pin it to the slide chrome zone regardless of the body grid.
  3. `math.docs.md` anatomy block: replace the centered single-column layout with the actual two-column layout (equation left 60%, legend right 40%, divider bar between).
  4. `math.manifest.json`: add `"decompose"` to the variants array.

---

### featured — adjudicated
Maker overall: 8 → Checker overall: 8/10 — POLISH (score confirmed)
Pages viewed: light p1-p8; dark p2-p5

- **Styling (CONFIRM):** Clean across all variants. Default (p2) renders 3 sub-cards + hero. Mirror (p3) renders 3 sub-cards on left + hero on right. Dark (d-p2 and d-p4) both render cleanly — card fills and text contrast are adequate. Hero card lower dead space in default (p2) is a density nit, not a bug. Confirmed no overflow or clipping.
- **Doc-align (CONFIRM):** Anatomy block at `featured.docs.md` lines 49-61 shows exactly 2 support cards ("Support 1 | Support 2" row). The gallery p2 renders 3 sub-cards. The docs text explicitly states "reads cleanest with one featured card and three supporting ones" — the anatomy contradicts the written guidance in the same file. Confirmed doc drift.
- **DS (CONFIRM):** Palette-blind confirmed. ✧ sparkle (`content: '✧'`) is a minor formality concern for strict boardroom contexts. Featured is in CARD_STYLE_LAYOUTS. Substance `mixed` is appropriate.
- **Aesthetics (CONFIRM):** Strong asymmetry. The ✧ sparkle glyph is visible in both light (p2) and dark (p2 dark) at top-right of hero card. In a formal boardroom deck it would likely draw a comment from a design-conscious reviewer — the maker's assessment is accurate.
- **Grouping (CONFIRM):** imagery bucket is debatable — no actual image in this layout. The maker's "closer to comparison/recommendation" observation is valid. The `IMAGERY · PANEL · MIXED` metadata visible on the gallery title slide confirms the current classification. For discoverability this is a genuine friction point. However, this is a taxonomy question, not a render bug.
- **Redundancy (CONFIRM):** Earns its place via winner/asymmetry. KEEP.

**MISSED by maker:** Dark gallery (d-p2) shows the `featured dark` variant has an orange-red accent border on the outer slide frame (the Cuoio theme's `--accent` is a warm orange). This is not a bug — it's the theme contract — but it's worth noting that the hero card border is also accent-colored in dark, which may read too heavy against the dark background in some palette contexts. Low priority.

Score confirmed at 8/10.

Final top fixes:
  1. `featured.docs.md` anatomy block: add a third support card row to match the canonical 3-card authoring contract.
  2. `featured.styles.css`: review ✧ sparkle — consider replacing `content: '✧'` with a small accent dot or short rule for formal deck contexts.
  3. Consider adding a cross-reference pointer in comparison bucket docs toward `featured` for recommendation-pattern discoverability.

---

### code — adjudicated
Maker overall: 9 → Checker overall: 8/10 — KEEP (minor downgrade)
Pages viewed: light p1-p7; dark p2-p4

- **Styling (CONFIRM + NOTE):** Clean across all variants. Light default (p2): code block fills the slide with flex:1, large empty lower half for the 12-line sample — not a bug but a density concern. Spectrum gradient stripe at the bottom of the code block is confirmed present. Dark (p3) is the default variant in dark composition (not a separate dark gallery slide) — code tokens adapt well.
- **MISSED by maker — REAL BUG:** Compare code dark gallery (d-p2) and the code dark gallery (dark p2): the column LABEL text in dark mode loses its accent color — `BEFORE · ONE QUERY PER ROW` and `AFTER · ONE BATCHED JOIN` in compare-code render as near-white/light-gray rather than the bright accent-blue seen in light mode. This affects `code` header text too. The eyebrow/component-name area renders correctly but the column-label accent color is washed out in dark. This is not a critical failure but it flattens the visual hierarchy in dark mode.
- **Aesthetics (CONFIRM):** Dark code block floating on light background creates good separation. Spectrum bar is on-brand.
- **Readability (CONFIRM):** `--fs-meta` (11.25pt) is at lower bound for desk distance. The 20-line guideline is correct.
- **Doc-align (CONFIRM):** Anatomy matches render. Spectrum stripe undocumented — confirmed not mentioned in `code.docs.md`.
- **DS (CONFIRM):** Palette-blind. Substance `prose` is slightly approximate but defensible.
- **Redundancy:** No overlap. KEEP.

Score revision: Maker gave 9/10. Checker revises to **8/10** — the undocumented spectrum stripe (minor) plus the dark-mode label color loss (moderate, affects visual hierarchy) together keep it just below KEEP quality, though it remains a strong component. The density concern on short snippets is a real authoring UX issue.

Final top fixes:
  1. `code.docs.md` and `compare-code.docs.md`: document the spectrum gradient bar as an intentional design feature.
  2. `code.styles.css` / `compare-code.styles.css`: verify dark-mode column label color token resolves to sufficient contrast in dark composition — if `--accent` is being overridden to a dark value in dark mode, the column labels need an explicit `color: var(--on-dark-accent)` or equivalent.

---

### compare-code — adjudicated
Maker overall: 9 → Checker overall: 8/10 — KEEP (minor downgrade, same reasoning as code)
Pages viewed: light p1-p8; dark p2-p5

- **Styling (CONFIRM + NOTE):** Both renders clean. Default (p2): two equal-height columns, label + code block per side. Mirror (p3): column positions correctly swapped. Dark (d-p2): adapts — see MISSED below.
- **MISSED — same as code:** Column label text ("BEFORE · ONE QUERY PER ROW", "AFTER · ONE BATCHED JOIN") loses its accent blue in dark (d-p2) — renders as light/near-white. The visual difference between label and heading is reduced. Not a contrast failure (text is still readable) but the editorial accent color that signals "column identity" is lost.
- **Aesthetics (CONFIRM):** Two-column layout is well-balanced. Column label / code block rhythm is clean.
- **Readability (CONFIRM):** Two side-by-side blocks at `--fs-meta` — workable at 6-8 lines per side; would strain at 14.
- **Doc-align (CONFIRM):** Anatomy matches render.
- **DS (CONFIRM):** Palette-blind. `structure` substance is a reasonable approximation.
- **Grouping (CONFIRM):** Discovery friction from living in `code` bucket vs. `comparison` function is a real author-UX issue. Cross-reference pointer in comparison docs would mitigate.
- **Redundancy:** No overlap within bucket. KEEP.

Score revision: Maker gave 9/10. Checker revises to **8/10** — same reasoning as `code`: dark-mode label color loss. The two components share this issue (likely same CSS class) and should be fixed together.

Final top fixes:
  1. `compare-code.styles.css`: ensure column label color token resolves with sufficient contrast in dark composition.
  2. `comparison` bucket docs: add a pointer to `compare-code` for authors looking for code-comparison patterns.
  3. (Low) `compare-code.styles.css`: add `min-height: 0` on `.code-col` for flex blowout safety as maker recommended.

---

## Checker bucket summary

### Maker claim accuracy

| Claim | Verdict |
|---|---|
| diagram dark flowchart white edge-label boxes | CONFIRM — exactly as described |
| diagram dark sequence near-invisible message text | CONFIRM — actually worse: messages are fully invisible, only one note label visible (with wrong yellow background) |
| diagram dark failures isolated to flowchart + sequence | REFUTE — state diagram (d-p7) and ER diagram (d-p8) also show white edge-label boxes; user journey (d-p9) shows pastel fills surviving in dark mode |
| image full caption clipped by max-height 4.6875cqi | CONFIRM — CSS source confirms at line 264; detail crop confirms visual truncation |
| image contain caption also clipped | CONFIRM (EXTEND) — same rule applies; maker only cited full |
| image anatomy shows wrong default orientation | CONFIRM — anatomy ambiguous/centered, default is text-left image-right |
| math legend column ~130px squeeze on p3 | CONFIRM — detail crop confirms 2-3 word line fragments |
| math anatomy shows centered single-column, render is 2-col grid | CONFIRM — anatomy at docs.md lines 51-63 is completely different layout shape |
| math theorem title/header crowding | CONFIRM (REVISE severity: tight, not pixel-colliding) |
| featured anatomy shows 2 sub-cards, canonical is 3 | CONFIRM — docs.md anatomy block has exactly 2 support rows; gallery renders 3 |
| code/compare-code scored 9 | REVISE to 8 — dark-mode column-label color loss is a real hierarchy issue the maker missed |

### Most important real issues (ranked)

1. **diagram dark-mode failures (5 diagram types affected, not 2)** — flowchart edge-labels, sequence signals+messages, state transition labels, ER relationship labels, journey section fills all broken in dark. The `%%{init}%%` themeVariables injection is missing `edgeLabelBackground`, `signalColor`, `messageFontColor`, `activationBorderColor`, and `fillType0..7` dark-palette equivalents. Single fix location but must cover all variable classes.
2. **math header misplacement (MISSED by maker)** — on the feature/base variant, the Marp-injected `<header>` falls inside the content grid, appearing ~35% down the slide rather than pinned top-left. Every other component pins header to the chrome zone; math is the exception. Grid layout swallows the header.
3. **image caption clipping** — `max-height: 4.6875cqi` + `overflow: hidden` on full and contain variants truncates any two-line caption. Confirmed in CSS source at line 264. One-line fix.
4. **math legend column narrowing** — 3fr/2fr grid with wide equations collapses the legend to ~130px, breaking the `WHERE` readability contract.
5. **code/compare-code dark label color loss** — column label accent color is lost in dark composition, flattening visual hierarchy.
6. **featured/image anatomy docs drift** — featured anatomy shows 2 sub-cards, render is 3; image anatomy shows ambiguous centered layout, default is text-left/image-right.

### Redundancy clusters

- Mermaid pie (diagram gallery) vs. `piechart` (chart bucket) — explainable but needs authoring guidance.
- Mermaid gantt (diagram gallery) vs. chart-bucket gantt — same.
- `compare-code` (code bucket, comparison function) — discovery gap vs. comparison bucket.

### Ranked worst → best (checker's adjudicated scores)

| Rank | Component | Checker Overall | Verdict |
|------|-----------|-----------------|---------|
| 1 (worst) | diagram | 5/10 | REWORK |
| 2 | image | 7/10 | POLISH |
| 3 | math | 7/10 | POLISH |
| 4 | featured | 8/10 | POLISH |
| 5 | code | 8/10 | KEEP |
| 6 | compare-code | 8/10 | KEEP |

### Components to cut or merge

None. All six serve distinct authoring purposes. No cuts or merges recommended.

### Key maker errors to flag

- The maker understated the scope of diagram dark-mode failures by checking only flowchart and sequence. The edge-label white-box bug affects at minimum four diagram types (flowchart, state, ER + likely any type with labeled edges). This matters for the fix: it cannot be a targeted flowchart-only patch; the fix must address the complete themeVariables injection matrix.
- The maker missed the math header-in-grid placement bug (header floating mid-slide on feature variant), which is arguably the second-most visible styling issue in the math component after the legend squeeze.
- The maker over-scored code and compare-code at 9/10 without checking dark gallery for both. Dark label color loss is a real quality gap — confirmed visually.
