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
| **compare-code** | yes | ▭/grid: title / **code-cols** / footer | the `1fr` `.code-cols` track | own `> h2` title cell · keeps footer | atmosphere | Light — clip the existing `1fr` body track |
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

**Not in scope here:** auto-fit/shrink-to-fit of overflowing text (the system's
answer stays "trim, or autosplit on portrait" — `2026-06-25-runtime-autosplit-*`);
this doc only guarantees that overflow is *contained to its cell*, not that it never
occurs.
