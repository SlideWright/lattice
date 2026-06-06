# Lattice Layout Audit — all 58 components (maker · checker)

**Date:** 2026-06-06 · **Branch:** `claude/layout-audit-maker-checker-h4Do9`
**Goal:** find every reason each layout is *not yet a 10/10 boardroom-ready
component*, and say concretely how to fix it.

## How this was done

Every one of the 58 components was audited twice, against the rendered
committed gallery PDFs (light **and** dark), the manifest, the docs.md, and
the component CSS:

1. **Maker pass** — 11 agents (one per bucket, the two largest split) rendered
   each `*.gallery.{light,dark}.pdf` to PNG with `tools/rasterize-for-review.sh`,
   viewed every page, read the source, and scored each component on six axes.
2. **Checker pass** — 11 independent agents re-rendered the same galleries and
   **adversarially verified** every maker claim (CONFIRM / REFUTE / REVISE),
   caught missed issues, and re-scored. The checkers overturned several maker
   claims — e.g. a hallucinated `anatomyBlock:"quadrant"` value, a wrong
   "`mirror` is a DS violation" call, a "piechart cover rescues itself" claim
   (false), and an "obligation-matrix pills have no CSS" claim (CSS exists but
   targets the wrong element). **The scores and fixes in this report are the
   checker-adjudicated values.**
3. **Lead verification** — the highest-severity claims (kpi header collision,
   diagram dark-mode failure, piechart sizing) were re-rendered and confirmed
   first-hand. Static analysis (hex literals, off-token sizes, manifest
   classification matrix) backs the DS-compliance column.

Per-bucket adjudicated reports (full evidence, page-by-page, file:line) are in
[`per-bucket/`](./per-bucket/). The mechanical static scan is in
[`per-bucket/_static-findings.md`](./per-bucket/_static-findings.md).

Artifacts audited are the **committed** PDFs (what ships). Galleries were
confirmed content-fresh; the `build:galleries:check` "stale" signal is a
clean-checkout mtime artifact, not real drift.

---

## Executive summary

**The catalog is well-composed but uniformly under-finished.** The
Function·Form·Substance taxonomy holds, every component earns its place
(**zero cuts, zero merges** recommended — see Redundancy), and the visual
language is genuinely strong. But **no component scored 10/10, only four
scored 9, and the median is 7.** The gap to "boardroom 10/10" is almost
entirely **execution and documentation quality**, concentrated in a small
number of *systemic* defects that recur across many components — so the
leverage is high.

### Score distribution (checker-adjudicated, /10)

| Score | Count | Components |
|---|---|---|
| **9** | 4 | cards-stack · checklist · verdict-grid · split-steps |
| **8** | 20 | divider · subtopic · big-number · agenda · cards-grid · cards-side · compare-prose · matrix-2x2 · split-compare · list-criteria · timeline · kanban · progress · radar · timeline-list · authority-chain · regulatory-update · featured · code · compare-code |
| **7** | 22 | title · split-statement · split-brief · quote · split-list · glossary · list · principles · before-after · decision · redline · journey · list-steps · roadmap · split-metric · stats · gantt · quadrant · obligation-matrix · statute-stack · image · math |
| **6** | 6 | actors · tldr · compare-table · kpi · state-chart · word-cloud |
| **5** | 5 | content · list-tabular · piechart · citation-card · diagram |
| **4** | 1 | closing |

**8 components are REWORK / ship-blocking** (closing, content, list-tabular,
tldr, piechart, state-chart, citation-card, diagram) plus kpi (P0 collision,
scored 6 only because the rest of the component is excellent).

### The 10 systemic themes (fix these first — each lifts many components)

| # | Theme | Components affected | Why it matters |
|---|---|---|---|
| **T1** | **Dead vertical canvas / no balance strategy** | ~25 | The single most pervasive aesthetic flaw. Sparse content leaves 35–60% of the slide empty (top-aligned *or* symmetric). Reads as "unfinished." |
| **T2** | **`justify-content:center` overflow clip** | actors (ships broken), checklist (latent) | A correctness bug: center-justified lists clip content off the slide bottom past a row threshold. |
| **T3** | **Anatomy doc-drift is rampant** | ~22 | The `## Anatomy` ASCII blocks frequently show a *different layout than what renders*. The #1 "docs vs image" failure the audit was asked to find. |
| **T4** | **SVG chart text below the type scale** | quadrant (8px) · radar (6.5px ≈ 4.6pt) · state-chart · piechart legend | Hardcoded px labels bypass the 12-token scale and are genuinely illegible at desk distance. |
| **T5** | **Dark-mode contrast failures** | diagram (5+ types) · roadmap · journey · agenda · word-cloud · code/compare-code · anchor | Dark mode is a first-class shipped surface and is systematically under-tested. diagram dark is the worst. |
| **T6** | **`var(--on-accent, #fff)` hex-fallback** | cards-grid/side/stack · before-after(+decision+compare-prose) · list-tabular · split-list · timeline · roadmap · journey | Violates "no hex literals"; applied at inconsistent chain depth across the family. |
| **T7** | **Glyph / connector inconsistency** | before-after `→` vs compare-prose `❯`; split-compare `✦` vs verdict-grid `✧`; featured/kpi ✦ sparkle; list-steps faint arrows | No iconography contract — same semantic role, different glyph/weight/colour. |
| **T8** | **Off-token spacing/size literals** | split-compare `12px` · quote `border-radius` · list-criteria `55cqh` · timeline 56-line Mermaid block · various undocumented cqi | Token discipline gaps + undocumented "sanctioned exceptions." |
| **T9** | **Manifest/slot contract bugs (mislead authors & agents)** | principles · kpi · stats · split-list · authority-chain · image · math · list-tabular | The machine catalog agents read is wrong (wrong selectors, skeletons that generate broken slides, false `related` text). |
| **T10** | **Hidden cross-component CSS coupling** | before-after.css hosts decision+compare-prose · obligation-matrix variants live in base.modifiers.css · kanban/timeline Mermaid blocks | Maintainability landmine; caused two maker fixes to target the wrong file. |

---

## Master table (all 58, checker-adjudicated)

Legend per axis: **✓** clean · **⚠** minor nit · **✗** real problem.
Axes: **Sty**=styling · **Aes**=aesthetics · **Rea**=readability ·
**Doc**=docs↔render alignment · **DS**=design-system compliance ·
**Con**=consistency · **Red**=redundancy (✓ = earns its place).
**V** = verdict: K=keep(≥9) · P=polish(7–8) · R=rework(≤6).

| Component | Bucket | F/Form/Subst | Sty | Aes | Rea | Doc | DS | Con | Red | **/10** | V | Headline issue → top fix |
|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| **closing** | anchor | anchor/bookend/prose | ✗ | ✗ | ⚠ | ✗ | ⚠ | ✗ | ✓ | **4** | R | Dead CSS selector: styles `h2`, content is `h1` → heading left-aligned, uncapped. Fix `h2`→`h1` + add eyebrow `order:-1` (match title). |
| title | anchor | anchor/bookend/prose | ⚠ | ✓ | ✓ | ⚠ | ✓ | ⚠ | ✓ | **7** | P | Dark-theme spectrum bar bleeds on ALL anchor slides incl `silent`; dead `── accent ──` in anatomy. |
| divider | anchor | anchor/divider/prose | ⚠ | ✓ | ✓ | ⚠ | ✓ | ✓ | ✓ | **8** | P | Same dark spectrum bleed; dead hr in anatomy; undocumented h2 support. |
| subtopic | anchor | anchor/divider/prose | ✓ | ⚠ | ✓ | ⚠ | ✓ | ✓ | ✓ | **8** | P | Content cluster sits below optical centre; undocumented subtitle-paragraph slot. |
| **content** | statement | statement/canvas/prose | ✗ | ✗ | ⚠ | ✓ | ✓ | ✗ | ✓ | **5** | R | `justify-content:flex-start` → dead lower ~55%; ~90-char lines. Fix → `center` + `max-width`. |
| split-statement | statement | statement/split/structure | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | **7** | P | Anatomy shows a big-number card; render is plain prose. `cite` wraps with no constraint. |
| split-brief | statement | statement/split/structure | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | **7** | P | Anatomy shows a paragraph; render is a left-rule findings list. |
| quote | statement | statement/canvas/prose | ⚠ | ✓ | ✓ | ✓ | ⚠ | ✓ | ✓ | **8** | P | `rgba(0,0,0,0.07)` shadow + `border-radius` literal; `accent` modifier no-ops on the card. |
| split-list | statement | statement/panel/structure | ✓ | ✓ | ✓ | ⚠ | ⚠ | ✓ | ✓ | **8** | P | `related` field describes split-statement as a "big-number" (false); `panel-eyebrow` slot misnamed; `#fff`. |
| big-number | statement | statement/canvas/prose | ✓ | ⚠ | ✓ | ✓ | ✓ | ✓ | ✓ | **8** | K | No compound-metric (unit/delta) authoring pattern. |
| actors | inventory | inventory/ledger/structure | ✗ | ⚠ | ⚠ | ⚠ | ✓ | ✓ | ✓ | **6** | P | 5th row clips off slide bottom (default + accent). Fix `center`→`flex-start`. |
| agenda | inventory | inventory/stack/structure | ✓ | ⚠ | ⚠ | ✓ | ✓ | ✓ | ✓ | **8** | K | Dark past-row `opacity:0.4` near-invisible; sparse 5-item slides. |
| cards-grid | inventory | inventory/grid/structure | ✓ | ⚠ | ✓ | ⚠ | ⚠ | ✓ | ✓ | **8** | K | `#fff` badge fallback; `insight` slot never shown in gallery. |
| cards-side | inventory | inventory/split/structure | ⚠ | ⚠ | ✓ | ✓ | ⚠ | ✓ | ✓ | **8** | K | VS Code fallback path contradicts native path on `grid-auto-rows`; `#fff`. |
| cards-stack | inventory | inventory/stack/structure | ✓ | ✓ | ✓ | ⚠ | ⚠ | ✓ | ✓ | **9** | K | `horizontal` variant docs say "title column" but renders equal-width; `#fff`. |
| checklist | inventory | inventory/stack/structure | ✓ | ✓ | ✓ | ⚠ | ✓ | ✓ | ✓ | **9** | K | Best-in-bucket. Latent center-justify overflow at 8 items; `[/]` state missing from anatomy. |
| glossary | inventory | inventory/ledger/structure | ⚠ | ⚠ | ✓ | ⚠ | ✓ | ✓ | ✓ | **7** | P | No flex centering → dead lower ~50%; anatomy shows bullets, render is a table. |
| list | inventory | inventory/stack/prose | ⚠ | ⚠ | ✓ | ⚠ | ✓ | ✓ | ✓ | **7** | P | Anti-pattern slide shows raw `<strong>` chip; no `ol` variant in gallery; anatomy understates pill chrome. |
| **list-tabular** | inventory | inventory/ledger/structure | ✗ | ⚠ | ✗ | ⚠ | ⚠ | ✓ | ✓ | **5** | R | `spec`/`spec+stacked` overflow → **glyph corruption** at right edge. Fix `auto`→`minmax(0,…)`. `compact` wrongly in variants. |
| principles | inventory | inventory/stack/structure | ⚠ | ✓ | ✓ | ✗ | ⚠ | ✓ | ✓ | **7** | P | Skeleton uses `- **bold**` contradicting its slot contract; description promises a "justification" slot that doesn't exist. |
| **tldr** | inventory | inventory/stack/structure | ✗ | ✓ | ✓ | ⚠ | ✓ | ✓ | ✓ | **6** | R | `numbered`+inline-code breaks grid (period dangles); same broken sample shipped in docs. Fix `code{display:inline}`. |
| before-after | comparison | comparison/split/structure | ⚠ | ⚠ | ✓ | ✓ | ✗ | ⚠ | ✓ | **7** | P | Dead lower ~50%; `→` accent glyph clashes with compare-prose `❯`; `#fff` (×4, shared file). |
| compare-prose | comparison | comparison/split/structure | ⚠ | ✓ | ✓ | ✗ | ✓ | ⚠ | ✓ | **8** | P | Anatomy uses `→` + "Before/After" labels (wrong glyph + echoes a different component). **`mirror` is NOT a DS violation** (maker error). |
| compare-table | comparison | comparison/ledger/prose | ✗ | ⚠ | ⚠ | ✓ | ✓ | ✗ | ✓ | **6** | P | Sparse rows balloon to ~⅓-slide each; floating text with no card container (unlike all siblings). |
| decision | comparison | comparison/canvas/structure | ✓ | ✓ | ✓ | ✗ | ✓ | ⚠ | ✓ | **7** | P | Anatomy shows one verdict box; render is a multi-card categorical strip. |
| matrix-2x2 | comparison | comparison/matrix/structure | ⚠ | ⚠ | ✓ | ⚠ | ✓ | ✓ | ✓ | **8** | K | Sparse quadrant cards leave dead lower half; focal-ring (last child) convention undocumented. |
| redline | comparison | comparison/canvas/prose | ✗ | ✓ | ✓ | ⚠ | ⚠ | ✓ | ✓ | **7** | P | Three-col variant clips blockquote text mid-word (light+dark). Fix rows→`minmax(0,1fr)`. |
| split-compare | comparison | comparison/split/structure | ⚠ | ✓ | ⚠ | ✓ | ⚠ | ⚠ | ✓ | **8** | P | `12px` hardcoded padding; verdict-bar label contrast marginal; `✦` vs verdict-grid `✧`. |
| verdict-grid | comparison | comparison/grid/structure | ✓ | ✓ | ✓ | ⚠ | ✓ | ✓ | ✓ | **9** | K | Most polished in bucket. Odd-grid full-width span + focal convention undocumented. |
| journey | progression | progression/timeline/structure | ⚠ | ⚠ | ✗ | ⚠ | ⚠ | ✓ | ✓ | **7** | P | Dark section-bar ~2.5:1; mood-legend numbers `0.78cqi`+opacity (illegible); default/weighted dead canvas. |
| list-criteria | progression | progression/ledger/structure | ✓ | ✓ | ✓ | ⚠ | ⚠ | ✓ | ✓ | **8** | P | `55cqh` counter off-scale (intentional but undocumented); `compact` undocumented. |
| list-steps | progression | progression/timeline/structure | ⚠ | ⚠ | ✓ | ✗ | ✓ | ⚠ | ✓ | **7** | P | Docs/anatomy say "vertical"; default renders **horizontal**. Variant label "flips column to row" is backwards. Faint arrows. |
| roadmap | progression | progression/matrix/structure | ✗ | ⚠ | ✗ | ⚠ | ⚠ | ✓ | ✓ | **7** | P | Dark date-pill contrast ≤2:1 (AA fail, all variants); anatomy uses `▓▓░░` not state-discs; heading wraps. |
| split-steps | progression | progression/split/structure | ✓ | ✓ | ✓ | ⚠ | ✓ | ✓ | ✓ | **9** | K | Cleanest in bucket. Watermark number missing from anatomy. |
| timeline | progression | progression/timeline/structure | ✓ | ✓ | ⚠ | ⚠ | ⚠ | ✓ | ✓ | **8** | K | 56 lines of `!important` Mermaid override CSS in the layout file with no disclosure. |
| **kpi** | evidence | evidence/ledger/structure | ✗ | ✓ | ⚠ | ✗ | ⚠ | ✓ | ✓ | **6** | P | **P0:** running header overprints the h3 eyebrow on 11/13 slides ("LATTEFINANCPAL"). ops/compliance colours are position-locked not content-driven. |
| split-metric | evidence | evidence/split/structure | ⚠ | ⚠ | ⚠ | ✗ | ✓ | ✓ | ✓ | **7** | P | Anatomy is a legacy sketch (not the 44/56 split); metric sits optically low; context line 11.25pt. |
| stats | evidence | evidence/stack/structure | ✓ | ⚠ | ⚠ | ⚠ | ⚠ | ⚠ | ✓ | **7** | P | `.stat-num` uses `--font-body` (sans) not the display serif every other number component uses; bare canvas. |
| gantt | chart | progression/timeline/series | ⚠ | ✓ | ✓ | ⚠ | ⚠ | ✓ | ✓ | **7** | P | Unstatused bars inherit info-blue (look like pilot/decision); top-heavy at 3 lanes; no quarter hairlines. |
| kanban | chart | progression/timeline/series | ⚠ | ✓ | ✓ | ⚠ | ⚠ | ✓ | ✓ | **8** | P | Wrapping titles break intra-column rhythm; `form:timeline` contradicts own docs ("a snapshot, not a timeline"). |
| **piechart** | chart | evidence/canvas/series | ✗ | ✗ | ⚠ | ✗ | ✓ | ✗ | ✓ | **5** | R | Disc locked at `25cqi` in ALL variants (cover does NOT rescue it — maker error); `variantDocs` claim is false. |
| progress | chart | evidence/canvas/series | ⚠ | ✓ | ✓ | ⚠ | ✓ | ✓ | ✓ | **8** | P | Best in chart-A. Label column 18.75cqi too narrow (25% wrap at 8 rows); anatomy shows % outside bar. |
| quadrant | chart | evidence/scatter/series | ⚠ | ⚠ | ✗ | ⚠ | ⚠ | ✓ | ✓ | **7** | P | 8px/11px SVG ticks off-scale; dead lower canvas; label overlap at 14 items. **vs matrix-2x2: distinct.** |
| radar | chart | evidence/scatter/series | ✓ | ✓ | ✗ | ✓ | ⚠ | ✓ | ✓ | **8** | P | 9px axis / 6.5px tick labels (~4.6pt) illegible at desk distance; 18% triple-fill washes together. |
| **state-chart** | chart | progression/timeline/**graph** | ✗ | ⚠ | ⚠ | ✗ | ✗ | ⚠ | ✓ | **6** | R | LR variant clips final node off right edge; no anatomy at all; **misclassified** — graph substance belongs in `diagram`, and progression/timeline is wrong for a back-edged state machine. |
| timeline-list | chart | evidence/timeline/series | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | **8** | P | Anatomy shows a vertical date table; render is a horizontal spine. **vs timeline: distinct.** |
| word-cloud | chart | evidence/canvas/series | ✗ | ✗ | ⚠ | ✓ | ⚠ | ⚠ | ✓ | **6** | P | Rogue circle glyph above the dominant word (default AND focal); dark "party-palette" pastels; dead canvas. |
| authority-chain | legal | progression/timeline/structure | ⚠ | ⚠ | ✓ | ⚠ | ✓ | ✓ | ✓ | **8** | P | `links` slot name implies hyperlinks; branching/trail leave dead lower half; anatomy is a flat sketch vs 2-col grid. |
| **citation-card** | legal | evidence/canvas/prose | ✗ | ⚠ | ✓ | ✗ | ✓ | ⚠ | ✓ | **5** | R | KEY-INSIGHT chrome contaminates the blockquote on 4/5 variants (light+dark); triptych renders 2 panels not 3; pull-quote `"` glyph invisible. |
| obligation-matrix | legal | comparison/matrix/structure | ⚠ | ⚠ | ✓ | ✗ | ⚠ | ✓ | ✓ | **7** | P | `pills` variant is a phantom (CSS targets `code`/`strong`, markers are `.state` spans); `asymmetric` hides column headers; variant CSS lives in base.modifiers.css. |
| regulatory-update | legal | progression/ledger/structure | ⚠ | ✓ | ✓ | ⚠ | ⚠ | ✓ | ✓ | **8** | P | Strongest legal component. Timeline effective-date pill renders as a full-width CTA button; anatomy understates the 5-col grid. |
| statute-stack | legal | inventory/ledger/structure | ✗ | ⚠ | ⚠ | ⚠ | ✓ | ✓ | ✓ | **7** | P | `preemption` variant's last card overflows into the footer; lane table mixes `--fs-body`/`--fs-meta`; hierarchy hard-coded to 3 tiers. |
| featured | imagery | imagery/panel/mixed | ✓ | ✓ | ✓ | ⚠ | ⚠ | ✓ | ⚠ | **8** | P | Anatomy shows 2 support cards, canonical is 3; ✧ sparkle reads informal; "imagery" bucket has no image (discovery friction). |
| image | imagery | imagery/canvas/prose | ✗ | ✓ | ✓ | ✗ | ⚠ | ✓ | ✓ | **7** | P | `image full`/`contain` caption clipped at `max-height:4.6875cqi` (2-line captions truncated); anatomy shows wrong default orientation; `.left` alias undocumented. |
| **diagram** | diagram | evidence/canvas/graph | ✗ | ✓ | ✗ | ✓ | ⚠ | ✓ | ✓ | **5** | R | **Dark mode broken on ≥5 Mermaid types** — white edge-label boxes (flowchart/state/ER), invisible sequence text, pastel journey fills. Fix the dark themeVariables injection. |
| math | math | evidence/canvas/prose | ⚠ | ✓ | ⚠ | ✗ | ⚠ | ✓ | ✓ | **7** | P | `feature` legend column squeezed to ~130px; Marp header falls *inside* the content grid (~35% down); anatomy shows 1-col, render is 2-col. |
| code | code | evidence/canvas/prose | ⚠ | ✓ | ⚠ | ⚠ | ✓ | ⚠ | ✓ | **8** | K | Column-label accent colour lost in dark mode; spectrum stripe undocumented; sparse on short snippets. |
| compare-code | code | comparison/split/structure | ⚠ | ✓ | ⚠ | ✓ | ✓ | ⚠ | ⚠ | **8** | K | Same dark label-colour loss as code; lives in `code` bucket while function is comparison (discovery friction). |

---

## Grouping & structure analysis

The audit set out to ask, per component, *"is it in the right group?"* The
**Function·Form·Substance·bucket model is sound and almost every component is
correctly classified.** The exceptions and recommendations:

### Misclassifications / regroup recommendations

1. **`state-chart` is misfiled (act on this).** Manifest is
   `function:progression · form:timeline · substance:graph`, sitting in the
   `chart` bucket. But (a) `substance:graph` is *the* defining trait of the
   `diagram` bucket, not chart; (b) a state machine with back-edges is neither
   "progression" (forward) nor a "timeline" (forward axis) — it's a directed
   graph. **Minimum fix:** change `function`→`evidence`, document the substance
   anomaly. **Long-term:** move to the `diagram` bucket (blocked only by the
   shared chart-family CSS it depends on — needs a scoped refactor).

2. **`kanban` `form:timeline` contradicts its own docs** ("Kanban is a
   snapshot, not a timeline"). The form was chosen to co-locate it with gantt.
   Either introduce a `board`/`matrix` form, or document the exception loudly
   in both manifest and docs so authors aren't misled.

3. **`featured` in `imagery`** has no image (it's a recommendation/cards panel,
   `substance:mixed`). Defensible by the panel-form rule, but a real discovery
   friction. Add a cross-pointer from the comparison/recommendation docs.

4. **`compare-code` in `code`** (function is comparison) and **`statute-stack`
   in `legal`** (function is inventory) are correct per the documented
   substance/domain bucket divergence — but both need a cross-reference from
   their *function* bucket's docs so authors searching by purpose find them.

### Cross-bucket name collisions (discovery hazard, not redundancy)

All verified **distinct** by the checkers, but they confuse authors at
selection time and need explicit `related`/`antiPatterns` cross-links:

- `timeline` (progression) vs `timeline-list` (chart) — naming is almost
  backwards (the simpler component has the longer name).
- `quadrant` (chart, continuous scatter) vs `matrix-2x2` (comparison,
  categorical cells) — both "two-by-two."
- `gantt`/`piechart` (chart) vs Mermaid `gantt`/`pie` (diagram) — two of each.
- `compare-code` vs `compare-prose` — parallel names, different buckets.

### The `split-*` family is the biggest selection space

Nine components use `form:split` across six buckets (before-after,
compare-prose, split-compare, compare-code, split-metric, cards-side,
split-brief, split-statement, split-steps). Each is data-shape-distinct (so
the §13 guardrail says keep them as components, not variants — confirmed), but
the shared `split-` naming + shared form makes "which split do I want?" hard.
**Recommendation:** a short "split family" decision guide in the docs portal,
and tighter `whenToUse` lines. Likewise the **two-card comparison cluster**
(before-after / compare-prose / split-compare / decision) should cross-link in
deliberation order.

### Redundancy verdict: NO cuts, NO merges (all 58)

Every bucket's checker independently upheld **KEEP** for all members. The
closest-overlap clusters — cards-* (grid/side/stack), the split-* family, the
two-card comparisons, the number components (big-number/stats/split-metric/kpi),
the ordered-list family (list-steps/list-criteria/split-steps), the time-axis
family (timeline/roadmap/journey), and the legal re-skins (authority-chain≈
timeline, regulatory-update≈timeline, statute-stack.lane≈list-tabular) — are
all distinguished by **data shape**, which is exactly the design system's own
test (§13) for "separate component vs variant." **The risk everywhere is author
selection confusion, addressed by cross-linking, not by deletion.** This is a
strong validation of the catalog's composition: the problem is finish and
discovery, not bloat.

---

## Consistency (look & feel) assessment

Lattice has a strong, recognizable visual language — mono tracked-uppercase
eyebrows, the spectrum gradient accent, the state-disc/pill system, serif
display numerals, the chart-frame header chrome. The breaks in that consistency:

- **`stats` numbers are sans (`--font-body`)** while big-number/kpi/split-metric
  use the display serif — a visible stylistic break when they share a deck. (T9)
- **Connector & focal glyphs vary** (`→`/`❯`, `✦`/`✧`). (T7)
- **`compare-table` floats text with no card container** while every sibling
  wraps content in a `--bg-alt` card. (consistency ✗)
- **`word-cloud` opts out of the chart-frame chrome** (no eyebrow pill, no
  header accent rule) — standalone identity inconsistent with chart siblings.
- **`#fff` fallback chain depth varies** across the card/accent family. (T6)
- **`✦` sparkle on featured/kpi** reads informal against an otherwise austere
  boardroom register.

---

## DS-compliance summary

- **Palette-blindness:** broadly good. The only systematic violation is the
  `var(--…, #fff)` hex floor (T6) — minor (the token is always set in shipped
  themes) but real and inconsistent. No raw hex *colours* in rules elsewhere.
- **Typography tokens:** the 12-token scale is respected for prose/cards.
  Violations are (a) SVG chart labels hardcoded in px below the scale (T4),
  and (b) a handful of undocumented cqi/cqh "exceptions" (list-criteria 55cqh,
  split-compare 0.46875cqi, quote radius) that should either tokenize or carry
  the sanctioned-exception comment the proven cases (split-statement, kpi) use.
- **Card-style nested-list contract:** all CARD_STYLE layouts comply (verified
  citation-card, matrix-2x2, verdict-grid, cards-*). The one risk is the
  `principles` *skeleton* generating `- **bold**` (T9) — would trip the
  validator if authored as shown.
- **Universal-variant tiers:** one violation — `list-tabular` re-lists
  `compact` (a semi-universal) in its component `variants`. (The maker's
  `compare-prose` "mirror" violation was **refuted** — mirror is a sanctioned
  Tier-3 layout-specific variant.)
- **Function/Form/Substance correctness:** one genuine mismatch — `state-chart`
  (see Grouping); one naming stretch — `kanban` form:timeline.

---

## Prioritized fix backlog

### P0 — ship-blockers (a client would see these)

1. **kpi header/eyebrow collision** — `kpi.styles.css`: add `section.kpi h3 {
   margin-top: calc(var(--fs-meta) + var(--sp-xs)) }` (or raise `padding-top`
   above the absolute-header band). Affects 11/13 slides, both themes.
2. **diagram dark-mode** — `lib/integrations/mermaid/` dark themeVariables: set
   `edgeLabelBackground`, `signalColor`, `messageFontColor`,
   `activationBorderColor`, and `fillType0..7` to dark-palette values. Re-verify
   flowchart/sequence/state/ER/journey in dark.
3. **list-tabular overflow/glyph-corruption** — `list-tabular.styles.css:218,232`:
   `auto`→`minmax(0,…)` on the trailing grid column + `overflow:hidden;
   text-overflow:ellipsis` on `li>code`.
4. **closing dead selector** — `closing.styles.css:13`: `h2`→`h1`; add the
   eyebrow `order:-1` reorder rule (mirror title); fix anatomy.
5. **piechart undersized disc** — `piechart.styles.css`: bump `.piechart-svg` to
   ≥`32cqi`, add `section.piechart.cover .piechart-svg{width:36cqi;height:36cqi}`;
   correct the false `variantDocs.cover` text.
6. **state-chart node clipping** — constrain the SVG figure width / auto-scale so
   the LR final node and curved terminal render inside the slide.
7. **citation-card KEY-INSIGHT contamination + broken triptych** —
   `citation-card.styles.css`: strip the eyebrow `::before` from non-pull-quote
   variants; fix the triptych grid to 3 real columns; fix the invisible `"`.
8. **content / actors dead-canvas & overflow** — `content.styles.css:11`
   `flex-start`→`center` + `max-width`; `actors.styles.css` `center`→`flex-start`.
9. **tldr numbered inline-code break** — `tldr.styles.css`: `code{display:inline}`
   in the numbered grid; fix the broken sample shipped in docs.

### P1 — systemic (each fix lifts many components)

- **T3 Anatomy drift:** regenerate/correct the `## Anatomy` blocks for the ~22
  drifted components (priority: split-statement, split-brief, decision,
  timeline-list, list-steps, kpi, split-metric, math, image, featured,
  glossary, roadmap, progress, statute-stack, regulatory-update,
  authority-chain; add one to state-chart). Consider an automated
  anatomy-vs-render check.
- **T1 Vertical balance:** adopt a shared convention — `align-content:start` on
  card inner-lists (kills the two-card/quadrant dead-half) and a centre-or-fill
  rule for sparse canvas/ledger components (content, glossary, list-tabular,
  stats, agenda, quadrant, word-cloud, etc.).
- **T5 Dark-mode contrast:** fix roadmap pills, journey section-bars + legend,
  agenda past-rows, word-cloud palette, code/compare-code labels, anchor
  spectrum bleed. Add a dark-mode contrast gate.
- **T4 SVG type scale:** expose radar/quadrant/state-chart label sizes as CSS
  custom props with documented bypass comments; bump radar/quadrant minimums.
- **T6 Hex fallback:** standardize a token-only `--on-accent` fallback chain
  across the card/accent family; add a lint rule.

### P2 — manifest/contract & consistency (T7–T10)

- Fix the misleading manifest fields (T9): principles skeleton; kpi `kpis`
  selector + slot name; stats slot description; split-list `related`;
  authority-chain `links`; image `.left`; math `decompose`; list-tabular
  `compact`.
- Iconography contract (T7): one connector glyph, one focal-marker glyph,
  consistent weight/colour.
- Tokenize/document off-scale literals (T8).
- Disclose hidden CSS coupling (T10): file-header notes + cross-links.
- `stats` numbers → `--font-display`; `compare-table` → card container.

### P3 — polish & coverage

- Reclassify state-chart (function), reconsider kanban form.
- Cross-link the split-family, two-card cluster, and cross-bucket name twins.
- Add missing gallery variants (cards-grid `insight`, list `ol`, big-number
  compound metric, agenda eyebrow).
- gantt neutral default colour + column hairlines; progress label column width.

---

## What "10/10 for every layout" actually requires

1. Clear the **9 P0 ship-blockers** (above) — turns the five 5s, the 4, and the
   worst 6s into 7–8s.
2. Resolve the **T1 + T3 + T5 systemic themes** — these alone move most of the
   22 sevens to nines, because for many components the *only* remaining issue is
   a dead lower half, a wrong anatomy block, or a dark-mode contrast miss.
3. Apply the **T6–T10 consistency/contract pass** — removes the last
   "a VP of Design would raise this" nits that separate a 9 from a 10.
4. Add the **dark-mode contrast gate** and an **anatomy↔render check** so the
   two highest-recurrence defect classes can't silently return.

No layout needs to be cut, merged, or rebuilt from scratch. The catalog is
right; the finish isn't there yet. The work is bounded, mostly mechanical, and
front-loaded into a handful of shared fixes.

---

*Detailed page-by-page evidence with file:line citations for every finding is
in [`per-bucket/`](./per-bucket/) (11 adjudicated reports). Maker→checker score
changes and the specific maker claims the checkers refuted are recorded in each
file's "Maker claims that were wrong" section.*
