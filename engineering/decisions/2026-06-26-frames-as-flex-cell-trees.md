---
status: proposed
summary: Every Frame becomes a flex tree of cells; every content cell is a bounded clipping box (flex:1; min-height:0; overflow:clip). Makes the Form bounding-box guarantee true for ALL content (not just sized media), fixes the body→footer bleed, and reframes "sovereign" as "owns its own cell layout" rather than "suppresses chrome". Covers all ten frames.
---

# Frames as flex cell-trees — one clip contract for every frame

> Sibling docs: `design/forms.md` (the Form model), `2026-06-11-islands.md`
> (origin), `2026-06-13-islands-sketch-density-collisions.md` (the density
> defect this closes), `2026-06-16-retire-section-as-grid.md` (what this revisits —
> and why flex, not grid, is the answer). Prompted by Form becoming the **default**
> render model (`2026-06-26`, PR #522): a corner-case bleed is now everyone's default.

## 1. The problem

The Form anatomy diagram draws each **Cell** as a bounding box — masthead band,
stage, three footer cells — with Tiles reserved inside. The promise is: content
is contained in its cell and **never bleeds** across a wall.

That promise is **not enforced** today. In the canonical "B" implementation there
is no `stage` element: the masthead is an in-flow band, the footer is reserved as
`section.form { padding-bottom }`, and the component body flows as **direct
children of `<section>`**. The only clip is `section { overflow: hidden }`, which
clips at the **slide edge**, not the stage edge. Measured on a real Form slide
(18-bullet body): the stage ends at y≈608, the footer sits at y≈685, and the body
paints all the way to y=720 — straight through the reserved footer/rail/pagination
band. `bodyOverlapsFooter: true`.

So the frame **reserves** each cell's space but does not enforce its **walls**. The
"fully-bounded body clip" was Phase 4 of the islands plan; it required a body
wrapper, was deferred, and was then retired with section-as-grid
(`2026-06-16`) — leaving the guarantee permanently soft for flowing text. For
**sized media** (charts sized to `.chart-body`) the box *is* honored; the gap is
**flowing text** (prose / cards / lists), which is intrinsically content-height.

Two facts change the calculus now:
1. **Form is the default** (PR #522). The bleed is no longer an opt-in edge case —
   it is the default failure mode for every over-stuffed deck.
2. **Flex ≠ grid.** Section-as-*grid* was retired because a fixed track fights the
   content-height masthead (dead space under a short title; can't grow for two
   lines). A flex column with `flex: 0 0 auto` header rows has **no such
   problem** — the header is content-height, the body row absorbs the rest. The
   single biggest objection that retired Phase 4 does not apply to flex.

## 2. The principle

**Every Frame is a flex *tree* of Cells. Every content-bearing Cell is a bounded
clipping box.** What varies per Frame is the *topology* of the tree and *where the
chrome Tiles dock* — not the clip discipline.

A content Cell is:

```css
display: flex; flex-direction: column;   /* or row, per Cell */
flex: 1 1 0;                              /* fills its track */
min-height: 0;                           /* CRITICAL — see §4 */
overflow: clip;                          /* the wall */
```

- **standard / minimal** = a 3-row **column** (header / body / footer). Chrome docks
  as full-width bands.
- **split-panel / split-compare** = a 2-**column** row, each panel a column sub-tree
  (panel-header / panel-body / panel-footer). Chrome docks **into a panel**.
- **title / divider / closing** = a single centered cell.
- **image** = a full-bleed cell (± an overlay caption cell).
- **math / compare-code** = a column/grid with their own title cell + a body track +
  the footer.

The body-row clip from the standard frame becomes a **panel-body clip** in split, a
**caption-cell clip** in image, a **track clip** in compare-code — same contract,
different topology.

## 3. Reframing "sovereign"

Today a sovereign frame is defined as one that **suppresses** the chrome cells
(`exemptFromChrome: true`, the `FORM_TOGGLE_SKIP` set). That is a second mental
model bolted on.

New definition: **a sovereign frame owns its own cell layout — it RE-HOMES the
chrome Tiles into its own cells rather than docking them in full-width bands.** The
same Tiles (title, footer, pagination, watermark/section-numeral) still render; the
Frame's topology decides where. `exemptFromChrome` stops meaning "no chrome" and
starts meaning "I lay out my own chrome." One model for every frame.

## 4. The cross-cutting contracts

**(a) The universal body Cell.** To keep component selectors uniform, the body Cell
(`.cell-stage`) is **always present** — on `form: off` decks too. The Frame decides
its bounds and clip: full section on `form: off`, the middle row on standard/minimal,
a panel sub-cell on split. This makes the selector migration a single uniform
codemod (§6) instead of a two-world `with-wrapper / without-wrapper` problem.

**(b) `min-height: 0` is load-bearing.** Flex items default to `min-height: auto`
(= content height), which **refuses to shrink** — so a body cell without
`min-height: 0` overflows anyway and the clip silently no-ops. Every clipping cell
in every frame must set it. This is the single most common way this gets shipped
broken.

**(c) Content cells clip; decorative cells don't.** Some overflow is *intended*: the
giant ghost **section-numeral / letterform** in a split's coloured panel is meant to
be oversized and bleed off its cell as a watermark; `atmosphere` (tint/mark) is
full-bleed by design. So:
- **content Tiles** (body, panel-body, code-cols, equation, caption) → `overflow:
  clip` at the cell wall + the runtime overflow ring fires.
- **decorative Tiles** (z1 `atmosphere`, the `watermark`/numeral, the full-bleed
  `image`) → opt OUT of the cell clip; they paint behind/over and are clipped only
  at the slide edge.
`atmosphere` therefore stays on `section` (full bleed behind all cells), never on a
body cell.

**(d) Overflow detection is unchanged and still correct.** `scrollHeight >
clientHeight` is reported per cell-bearing section; bounding the body makes the
signal *more* honest (it fires when a cell genuinely can't hold its content), and
the export stays clean (no painted marker).

## 5. Per-frame mapping — all ten

Legend: **▭** = column flex, **▯▯** = row flex (panels), **◦** = single centered cell.

| Frame | `exempt` | Topology | Content cells (clip) | Chrome docking | Decorative (no clip) | Migration weight |
|---|---|---|---|---|---|---|
| **standard** | no | ▭ 3 rows: masthead / **stage** / footer | stage body | masthead band (lede+bay) · footer row (footer-left · progress · pagination) | atmosphere, watermark | **Heavy** — universal `.cell-stage` + selector codemod |
| **minimal** | no | ▭ 3 rows | stage body | same, footer row **without** progress Tile | atmosphere, watermark | Rides standard's migration |
| **title** | yes | ◦ centered cover cell | the cover cell | — (cover; no footer) | atmosphere (inverse canvas) | **Trivial** — already `justify/align:center`; add `min-height:0`+clip |
| **divider** | yes | ◦ centered cell (L-aligned dark / centered light) | the content cell | — | section-numeral (ghost), atmosphere | Trivial |
| **closing** | yes | ◦ centered cell | the content cell | — | atmosphere (inverse canvas) | Trivial |
| **image** | yes | full-bleed image cell ± caption cell | caption cell | optional caption Tile | the **image** itself (`cover`, clipped at slide edge by design) | Trivial — image already `cover`; bound the caption |
| **math** | yes | ▭ header / **body** / footer | equation body | own `> h2` title cell · keeps footer | atmosphere | Light — add `min-height:0`+clip to the body track |
| **compare-code** | yes | ▭ flex-col: title / **code-cols** / footer | the `code-cols` body | own `> h2` title cell · keeps footer | atmosphere | Light — the cell stack is 1-D → flex-column (per §10); clip the body; `.code-cols` itself stays its own 2-col layout (prove flex per §11) |
| **split-panel** | yes | ▯▯ 2 cols; each ▭ (panel header/body/footer) | **panel-left** body · **panel-right** body | title→left panel · footer/pagination→a panel corner · numeral→coloured panel | the ghost **letterform/numeral** in the coloured panel | Medium — `.panel-left` already clips; add `min-height:0`+clip to `.panel-right`; relocate footer/pagination Tiles; mark numeral decorative |
| **split-compare** | yes | ▯▯ 2 cols (comparison) | both panel bodies | title/footer/pagination docked into panels | atmosphere, numeral | Medium — same as split-panel |

Notes grounded in today's CSS:
- **split-panel is already** `section.split-panel { flex-direction: row }` with
  `.panel-left { display:flex; flex-direction:column; overflow:hidden }` and
  `.panel-right { flex:1; display:flex; flex-direction:column }`. The only gap:
  `.panel-right` has **no** `min-height:0`/`overflow` → it bleeds. This is a
  near-trivial completion of an already-correct shape, **not** a rewrite.
- **compare-code already** uses `grid-template-rows: auto auto 1fr auto` with the
  `1fr` row holding `.code-cols` — i.e. it already has a bounded body track; it just
  doesn't clip it.
- **bookends already** centre via `justify-content/align-items:center` on the
  section — they are single cells today; the change is one `overflow:clip` +
  `min-height:0`, and they rarely overflow (short, centred copy).

## 6. Migration

1. **Inject the body Cell.** The masthead-lift transform already wraps eyebrow+title
   into `.cell-masthead`; extend it (and the sovereign transforms) to wrap the
   component body into `.cell-stage` (and, for split, the panel bodies). All three
   render paths in lock-step (HARD RULE #1). Pagination stops being a `section::after`
   pseudo and becomes a real Tile element that can dock into a footer row or a panel.
2. **Selector codemod.** Component CSS moves `section.X > child` →
   `section.X > .cell-stage > child` (or the body Cell carries the layout class:
   `.cell-stage.X > child`). Mechanical and scriptable; the bulk (~the figure cited
   in `2026-06-16`) lives in standard/minimal components. Sovereign frames carry far
   fewer (`split-*` already scope to `.panel-*`).
3. **Per-frame CSS.** Add the `flex:1; min-height:0; overflow:clip` contract to each
   content cell per §5; mark decorative Tiles exempt.
4. **Gate every step.** The per-component galleries (light+dark page counts), the
   bucket surveys, `tools/pixel-check.js` before/after, and the cross-renderer parity
   check — an unintended visual change fails a gate, not a reviewer's eye. Land it as
   a sequence of small, gated commits (one frame family at a time), never a big-bang.

## 7. Why this is the right time

- **Default-Form raised the benefit.** The bleed now affects every deck, not opt-in
  ones; the cost of the fix is unchanged.
- **Flex retires the retirement's objection.** Section-as-grid was rejected because
  fixed tracks fight the content-height masthead. Flex auto-rows are content-height
  by construction, so the masthead band is preserved exactly. This is genuinely new
  information versus the `2026-06-16` decision — it should be recorded there as a
  follow-up ("flex, not grid, reopens Phase 4").
- **It collapses two mental models into one.** "Sovereign = owns its cells" replaces
  "sovereign = suppresses chrome", and one clip contract covers all ten frames.

## 8. Risks / open questions

- **The selector codemod is the real cost and the real risk.** It touches every
  standard/minimal component's CSS. Mitigations: scriptable transform, the universal
  `.cell-stage` (so there's one world, not two), per-frame staged rollout, full
  gallery + pixel gates. Open: codemod to `> .cell-stage > child` vs. moving the
  layout class onto `.cell-stage` — pick whichever minimises specificity churn.
- **`form: off` consistency.** Decision in §4(a): always inject `.cell-stage` so
  selectors are uniform; on `form: off` it fills the section and clips at the slide
  edge (today's behaviour) — confirm this is genuinely byte-neutral for `form: off`
  decks via pixel-check.
- **Pagination de-pseudo.** Making pagination a real element (so it can dock into a
  panel) changes a long-standing `::after`; verify it doesn't disturb the footer
  layout or print.
- **Decorative-vs-content classification** must be explicit per Tile in the manifest
  (`clip: content | decorative`) so a frame author can't accidentally clip a
  watermark or leak a body.
- **Charts.** A bounded body cell is strictly *better* for charts (deterministic
  parent), but confirm the chart-family in-form sizing still resolves against the new
  cell, not the old section content-box.
- **Responsiveness.** Re-run the desktop/tablet/mobile + `@size` matrix; the flex
  tree must hold at every width.

## 9. Decision

Adopt **Frames as flex cell-trees** as the canonical Form layout architecture,
superseding the soft "clip-at-slide + indicator" behaviour for content cells while
keeping the indicator as the authoring signal. Implement as a **gated, per-frame
sequence** (bookends + image first — trivial and low-risk; then math/compare-code;
then split-panel/split-compare; standard/minimal — the body-cell codemod — last and
most carefully). Record in `2026-06-16-retire-section-as-grid.md` that flex (not
grid) reopens the bounded-body-clip on merit.

Layout primitive: **flex by default; grid only when a committed pixel-diff proves
flex can't match it** — §10. The exact recipe + proof harness for converting a grid
to flex (so nobody re-derives it or settles on an unproven assertion) is the
**runbook in §11**; the cells-vs-internals scope boundary and the sized-media gotcha
are in §12.

**Not in scope here:** auto-fit/shrink-to-fit of overflowing text (the system's
answer stays "trim, or autosplit on portrait" — `2026-06-25-runtime-autosplit-*`);
this doc only guarantees that overflow is *contained to its cell*, not that it never
occurs.

## 10. Layout primitive policy — flex by default, grid only when *proven*

"Responsive" conflates two things; grid is fine at one, awkward at the other:

- **Scaling** (HD→4K / resolution): a grid sized in `fr`/`cqi` — which Lattice
  mandates (no fixed px) — scales identically to flex. **Not** a differentiator.
- **Reflow** (landscape→portrait/square; the 2-col→1-col change): grid needs an
  explicit `grid-template-*` re-declaration per orientation; flex reflows with a
  single `flex-direction` swap. This asymmetry is why section-as-grid was retired at
  the frame level (`2026-06-16`). So the honest knock on grid is **reflow, not
  scaling.**

**Policy:**

- **1-D structures → flex.** All cells; and the cell-level grids in `compare-code` /
  `math` (vertical stacks — `grid-template-rows: … 1fr …` with no 2-D need) become
  **flex-column**.
- **Genuine 2-D placement → flex too, UNLESS proven otherwise.** Do **not** assume a
  layout needs grid because it is 2-D. A component keeps `display: grid` only when a
  **committed pixel-diff proves flex cannot match it** (§11) AND the gap is a real
  capability. The sweep (§13) found that gap is essentially **one thing: a table's
  cross-row column alignment** (`max-content` column = the widest label across all
  rows). Variable card count and spanning are *not* boundaries — flex handles them
  (§13 Correction). Everything stays `cqi`/`fr` and is tested across the `@size` ×
  orientation matrix.

Worked counter-example: `matrix-2x2` — the hardest case (equal column widths **and**
equal row heights, `grid-template-columns:1fr 1fr` / `grid-template-rows:1fr 1fr`) —
converts to flex **pixel-identically** in-frame (§13: 359 / 1,000,500 px = 0.036 %,
pure edge AA). "Grid is better for 2-D" did not survive contact with a diff.

## 11. Conversion runbook — turn a grid into flex and PROVE it

Follow this exactly. It exists so no one re-derives the recipe, re-hits the same
gotcha, or settles on "flex can't do it" without a number. The matrix-2x2 proof
below *failed on the first attempt for a box-model reason* — read gotcha 1.

### A. The flex recipe (flat DOM — no extra wrapper elements)

Replace a uniform `N`-column × `M`-row grid with:

```css
/* container — was: display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; */
display: flex; flex-wrap: wrap; gap: var(--sp-md); align-content: stretch;

/* the cells */
> li {
  box-sizing: border-box;                                  /* ← REQUIRED — gotcha 1 */
  width:  calc(100% / N - var(--gap) * (N - 1) / N);       /* equal columns */
  height: calc(100% / M - var(--gap) * (M - 1) / M);       /* equal rows — needs a definite container height, gotcha 2 */
}
```

For the 2×2 (`N = M = 2`, `--gap = var(--sp-md)`) this collapses to
`width / height: calc(50% - var(--sp-md) / 2)`.

**Gotchas — encode, don't rediscover:**

1. **`box-sizing: border-box` is mandatory.** Cells carry padding + border. Under the
   default/inherited `content-box`, `width: calc(50% - gap/2)` + padding + border
   exceeds 100% → the 2nd item wraps → the grid collapses to one column and overflows.
   This is the #1 false negative — it *looks* like "flex can't do 2-D" when the box
   model is simply wrong. The first attempt here failed for exactly this (probed:
   `boxSizing: content-box`, item width 635 px in a 1200 px row → wrap).
2. **Equal `height` needs a definite container height.** `height: calc(50% …)` resolves
   only if the flex container's height is resolved. In a frame's flex tree the body
   cell is `flex: 1` of a fixed-height slide, so it is — but this is *also* why the
   `min-height: 0` contract (§4b) is load-bearing; without it the cell won't resolve.
3. **Gap math is `gap/2`, not `gap`.** `N` columns + `(N−1)` gaps = 100%, so each item
   is `calc(100%/N − gap·(N−1)/N)`. For 2 columns that is `50% − gap/2`. Don't eyeball
   `50% − gap`.
4. **Fixed shapes only, for this exact recipe.** It bakes `N`/`M` into the `calc()`,
   which is exact for FIXED counts (2×2; a fixed card count). For **variable counts**
   use `flex: 1 1 calc(100%/N − …); min-width: …` with no fixed height, and prove the
   *partial-last-row* behaviour against grid separately (§B) — variable-count
   auto-flow is the one place flex may genuinely diverge, so it gets its own proof,
   never a hand-wave.

### B. The proof harness — numbers, not eyeballs

**Quick exploratory A/B** (deck-level `<style>` override, no rebuild — for the spike):

**Test IN-FRAME, not in isolation.** Both decks MUST use `form: standard` with a real
`header:` / `footer:` / `meta:` — **never `form: off`.** The component renders in the
**body cell** (height = section − masthead − footer), and the very behaviours under
test — `grid-auto-rows:1fr`, `flex:1`, equal-fill — resolve against *that* bounded
height, not the full slide. A `form: off` A/B measures the wrong container and can
flatter a conversion that breaks in a real deck (the body cell is shorter, so a
hardcoded-height flex overflows there but not on a bare slide). This was a real
methodology bug caught in review.

```sh
export CHROME_PATH=$(ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome | head -1)
FM='---\nmarp: true\ntheme: cuoio\npaginate: true\nheader: "X"\nfooter: "Y"\nmeta: "Z"\nform: standard\n---'
# 1. Author ONE deck body with deliberately UNEVEN cell content (1-line vs 3-line) — see C.
# 2. grid.md = FM + body as-is.  3. flex.md = FM + body + a <style> applying the §A recipe,
#    with the layout class DOUBLED for specificity (e.g. section.matrix-2x2.matrix-2x2 > ul {…}).
node lattice-emulator.js grid.md grid.pdf
node lattice-emulator.js flex.md flex.pdf
pdftoppm -png -r 110 grid.pdf A ; pdftoppm -png -r 110 flex.pdf B
compare -metric AE A-1.png B-1.png diff.png      # prints the CHANGED-PIXEL COUNT
```

**Pass bar:** changed pixels are **edge-AA noise only** — empirically **< 0.05 %** of
total (the in-frame matrix-2x2 proof: **359 / 1,000,500 = 0.036 %**). A *structural*
mismatch is obvious by orders of magnitude (the failed first attempt: **~475 k /
40 %**). A large count means **fix the recipe (gotcha 1–4), not conclude "grid wins".**
The cautionary case: `cards-grid` @6 first showed **20.7 % + overflow** — but that was
gotcha 4 (a hard-coded `height:50%` ⇒ exactly two rows). Removing the fixed height,
flex fit six cards with no overflow. The large diff was the *recipe*, not flex.

**For the real conversion commit** (editing the component CSS + `npm run build`), use
the canonical gate — same rasterize+ImageMagick technique, wired to the build, so we
reuse rather than reinvent (HARD RULE #15):

```sh
node tools/pixel-check.js snapshot pre-flex --decks <deck>   # grid baseline
# … convert the component's CSS grid → flex per §A, npm run build …
node tools/pixel-check.js diff pre-flex --decks <deck>       # must report 0 changed pixels
```

A converted component lands **only** when `pixel-check diff` is clean (or `--accept`
with a human eyeball via `SendUserFile` for an intended sub-AA change).

### C. Always stress UNEVEN content

The discriminating test for *equal heights* is cells of **different content length**
(1 line vs 3 lines). Even-content decks hide the exact failure you're checking for.
The matrix-2x2 proof put a 3-line cell against three 1-line cells — that's what makes
`grid-template-rows:1fr 1fr` (and its flex equal-height equivalent) actually do work
the eye can see.

## 12. Scope boundary + sized media

- **Cells vs component internals.** This architecture flexes the FRAME's *cells*. It
  does not mandate touching a component's internal layout beyond the grid→flex policy
  (§10): a `cards-grid` is authored identically; only its layout primitive may change,
  and only with a §11 proof. We are not rewriting component DOM for its own sake.
- **Sized media (SVG / mermaid / charts) is the beneficiary, not an exception.** They
  need a concrete dimension *at measure time*: `getBoundingClientRect()` must return a
  real number, and `width: 100%` on a freshly-inserted flex child returns **0** — so
  the diagram CSS uses an explicit `cqi` width (today `height: auto`), never `%`, and
  relies on a resolved parent box + `min-height: 0` ancestors. The flex cell-tree is
  precisely what GIVES them that deterministic box (the original concrete-dimension
  contract). **Do not "simplify" a chart's explicit `cqi` sizing to `100%`** — that
  reintroduces the zero-at-measure bug.

## 13. Sweep results — the three archetypes, proven (2026-06-26)

Ran the §11 harness across the grid users (30 components use `display:grid`). The
goal was to *prove*, not assert, where flex matches grid and where it genuinely
can't — so neither a conversion nor a retention is a settle. **All A/Bs run IN-FRAME
(`form: standard`, real header/body/footer — §11.B)**; the body cell's bounded height
is the real context. (An earlier pass used `form: off` and was redone in-frame after
review flagged the wrong container — the verdicts held, the numbers shifted slightly.)
Three archetypes emerged, each anchored by a pixel-diff:

| Archetype | Proof (in-frame) | Diff | Flex verdict |
|---|---|---|---|
| **Uniform, fixed shape** — `1fr 1fr`/`1fr 1fr`, fixed cell count | `matrix-2x2` (equal widths AND heights) | **359 / 1.0 M = 0.036 %** (edge AA) | **Matches** — convert |
| **Spanning orphan** — `last-child:nth-child(odd){grid-column:1/-1}` | `cards-grid` @ 3 cards (2+1) | **192 / 1.0 M = 0.019 %** | **Matches** (`width:100%` on the orphan) |
| **Variable card count** — any N cards (`grid-auto-rows:1fr`) | `cards-grid` @ 6 cards, height NOT hard-coded | **fits, no overflow** | **Flex matches** — convert (see Correction) |
| **Cross-row column alignment** — container `max-content 1fr` (label col = max across rows; `display:contents` fields) | synthetic `max-content` vs flex | labels misalign | **Flex can't** — stays a table |

**Correction (2026-06-26, after review).** An earlier version of this table claimed
variable-count card grids (`grid-auto-rows:1fr`) were a flex-can't. **That was wrong** —
an artefact of a buggy override that **hard-coded the cell height** (50 % ⇒ exactly two
rows), so six cards overflowed. With the height *not* hard-coded, **flex fits any card
count cleanly** (`cards-grid` @6: no overflow, even rows). The *only* thing grid does
there that flat-DOM flex doesn't is **stretch the cards to fill the stage vertically** —
and that is explicitly **not wanted**: cards sit at their natural height, and a table
sits top/centre, never vertically stretched (owner's call). So the variable-count row
is a **convert**, not a keep. The lesson is the runbook's own (§11.B): a large diff
means *fix the recipe*, not "grid wins".

So exactly **one** genuine flex-can't survives: **a table's column alignment** — every
row's label snapping to one shared (widest) width. That is grid-only, and **a table
stays a table** (it fills width, columns line up; it does **not** stretch vertically —
it sits top or centred, a universal alignment modifier deferred to #527).

### Classification (each CONVERT still gated by its own in-frame §11 A/B)

- **Convert to flex** — per-item grids, fixed-uniform grids, AND variable card grids
  (natural height, no forced vertical stretch): `matrix-2x2`, `cards-grid`, `pricing`,
  `logo-wall`, `compare-code` (`code-cols` 1fr 1fr), `split-compare`, `verdict-grid`,
  `citation-card`, `redline`, `list-criteria`, `agenda`, `list`, `actors`, `q-and-a`,
  `statute-stack`, `authority-chain`, `kpi`, `compare-prose`, `math`, `split-panel`.
  Prove each with the in-frame harness before converting.
- **Stays a table** (grid/`<table>` — fills width, columns align, **does not stretch
  vertically**; sits top/centre): `compare-table`, `list-tabular`, `regulatory-update`.
  Their vertical placement is a universal alignment modifier, deferred to **#527**.
- **Out of cell-tree scope:** chart-geometry grids (`journey` task-spans, `roadmap`
  horizons, `radar`, `progress`, `timeline-list`, `chart-family`) — sized media,
  governed by §12, not the cell-tree.

### Consequence for the migration

The frame/cell flex-tree (§2–6) is unaffected — it's flex regardless. Component
internals are now almost entirely **flex**; only real **tables** keep grid, and only
for **horizontal column alignment** — never vertical fill (tables sit top/centre,
#527). So §10's policy holds with the boundary correctly located: **flex by default;
grid only for a table's column alignment.**
