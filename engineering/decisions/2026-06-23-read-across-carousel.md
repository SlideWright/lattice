---
status: in-progress
summary: The Fit Ladder's SPLIT move, extended to READ-ACROSS layouts that can't paginate between members (compare-prose, split-panel, compare-code). Instead of escalating to the overflow ring, the one overflowing slide is re-authored as a short, deliberate SEQUENCE — a carousel — that the layout OWNS: a lead, middle(s), and an optional last. Two families (narrative gets a bespoke carousel; tabular gets windowed row-pagination). compare-prose ships first with the `editorial` recipe (C4), picked from a 5-candidate render-off. Manifest-driven (`split` recipe) + a pure post-render transform (lib/core/carousel.js) wired into the auto-split measured loop.
---

# Read-across carousel — split what can't paginate

**Date:** 2026-06-23 · **Status:** Shipped — all five read-across layouts (compare-prose, split-panel, list-tabular, decision, compare-code) split on **one shared accent cover finish**. Jargon portrait overflow **27 → 2** (the last two are genuine floor cases — a single card taller than the page).

> **Fidelity correction (the through-line).** The first compare-prose cut shipped an
> *editorial* finish (drop-caps, pull-quote, magazine cover). The maintainer judged it
> a step off the deck — "a split shouldn't look like an entirely different finish than
> the non-split." split-panel's accent **cover→content** was named the bar. So the whole
> family was **unified on that one finish**: compare-prose's editorial was retired for
> `cover-sides`, and decision / compare-code were built to match. "It fits" is the floor;
> a split must also wear the deck's finish. The shared `coverWindow` builder is that spine.

## The problem

The Fit Ladder's SPLIT move (`2026-06-22-the-fit-spine.md` §3) had two outcomes:
**paginate** (item/row axes — divide between members) or **escalate to the ring**
(col/cell/line — read-across / atomic, can't divide without destroying meaning).
Slice A shipped pagination. But a read-across layout's meaning lives in the
*cross-reading* — two facing columns of prose, two panes, two code blocks — so
`partitionAxis` returns null and the slide clips. In a portrait/tall box that is the
**dominant** remaining overflow (the jargon audit's last offenders were all
read-across: compare-prose ×3, split-panel ×2, compare-code, list-tabular, decision).

## The reframe

A read-across slide *can* split — not by slicing its DOM, but by being **re-authored
as a short narrative sequence the layout owns**. The comparison isn't chopped; it's
*staged*: a **lead** that frames it and points forward, **middle(s)** that carry the
body one beat at a time, and an **optional last** that resolves it (the verdict). Each
frame stands alone, reads in order, and the boardroom never sees a setting.

## Two families (right tool per content shape)

1. **Narrative read-across** — `compare-prose`, `split-panel`, `decision`. They have
   an arc (framing → dimensions → verdict); the lead/middle/last carousel maps onto
   real beats. **Bespoke carousel.**
2. **Tabular read-across** — `list-tabular`, `compare-table`. No arc — just more rows;
   the honest move is **windowed row-pagination with the header (and any read-across
   legend) repeated**. A carousel by repetition, not re-authoring. (On deck.)

## The render-off — 5 candidates, C4 wins

compare-prose went first (most frequent offender, cleanest arc). Five carousel
treatments were rendered against the **real** jargon slide at portrait geometry and
judged by two independent reviewers against the 10/10 rubric:

| | Treatment | Verdict |
|---|---|---|
| C1 | Versus → facing pages | Strong lead/verdict bookend; abandons the comparison mid-sequence. |
| C2 | Persistent split, spotlight | Best juxtaposition, but the spotlit pane **vertically overflows** (ironic for an overflow fix). |
| C3 | Windowed prose | Honest but reads *clipped*; splits sentences mid-thought. |
| **C4** | **Editorial spread** | **Winner.** Running kicker, "Reading one/two" drop-cap article pages, pull-quote verdict. Native to prose. |
| C5 | Stepped reveal | Most *natural* to flip through; preserves A-vs-B on one slide. **Earmarked for the two-pane family** (split-panel / compare-code) where simultaneous read-across is the point. |

**Decision:** lock **C4 (editorial)** for compare-prose; **C5's ghost-reveal** is the
archetype to port to split-panel / compare-code.

## Architecture

Manifest-declared, curated per layout — not hand-wired (one feature = the layout owns
its split-forms).

- **`split` recipe** on the component manifest:
  `{ strategy: "editorial", family: "narrative", roles: ["lead","read","verdict"] }`.
- **`lib/core/carousel.js`** — pure, fs-free. `carouselize(openTag, inner, recipe)`
  parses the *rendered* compare-prose section (chrome + masthead h2 + two-subject
  `<ul>` + `.below-note` synthesis) and re-emits the role sections
  (`content compare-split compare-split-{lead,read,verdict} form`), carrying the
  stable `<header>`/`<footer>` chrome. Returns null on a shape it can't parse → the
  caller leaves it for the ring (never a broken sequence). Tested against a real
  rendered fixture so the parser can't drift from the engine.
- **Fit Ladder integration** — wired into auto-split's measured loop
  (`resplitDoc`): a read-across layout whose manifest declares a carousel recipe is
  carouselized instead of partitioned. The overflow measure marks carousel layouts
  splittable on vertical overflow (`CAROUSEL_NAMES` handed to the browser pass).
- **CSS** — the editorial forms live in `compare-prose.styles.css`, scoped to
  `section.compare-split*`, palette-blind (every colour a token).

Build-time only; opt-in via `autosplit: on`; existing decks unchanged.

### split-panel — the `feature-cover` strategy (the second layout)

split-panel is **asymmetric** — a featured left panel (watermark / eyebrow / heading +
lede) beside a right-side list of supporting *points*. So C5's symmetric ghost-reveal
doesn't apply; from a 3-candidate render-off (persistent feature / feature demotes /
**feature cover → points**) the maintainer picked **SP3, the cover**: in a tall box the
heavy feature panel can't sit beside its points, so the feature gets its own accent
cover (watermark and all), then the points flow onto clean pages under a running header,
`perPage` at a time. Same kernel (`carouselize`, strategy `feature-cover`;
`readFeature` parses `.panel-left`/`.panel-right`), same manifest-`split` wiring; CSS in
`split-panel.styles.css` scoped to `section.split-panel-{cover,points}`. Two render
lessons: the bleeding watermark must be contained in an `inset:0; overflow:hidden`
layer or it inflates the section's `scrollHeight` (read as a clip — `overflow:clip` on
the section does **not** stop a positioned descendant counting); and the cover heading
is `--fs-h1`, not `--fs-hero`, because a split-panel heading can be a full sentence.

## Result

On the jargon deck in portrait, overflow fell **27 → 2** — every read-across layout now
covers→windows instead of clipping (auto-split alone left 10; the five cover strategies
resolved the rest). The remaining **2** are genuine floor cases: a single `cards-stack` /
`cards-grid` card taller than the page — for the ring, not the splitter.

### Tabular family — continuity beat plain pagination

First cut shipped plain row-pagination (a `capacity.axis: item` contract — Slice A
repeats the title, renumbers the `<ol>`). It *worked*, but the maintainer judged the
PDF **utilitarian, not boardroom** — and, crucially, a different finish from the
covers. The fidelity lens (a split must read as the *same deck*, just more of it) sent
it back through the **5-iteration render-off**: cards / **cover→rows** / refined ledger /
two-up grid / numbered register. The pick was **cover→rows** — the *same* accent
cover→content finish as split-panel, for continuity.

- **list-tabular** → the **`cover-rows`** strategy: a title cover, then the rows windowed
  (`readRows` reads each row's leading-text label + nested body). It shares the
  `coverWindow` builder with split-panel's `feature-cover`, so the finish is identical by
  construction — that is the continuity. CSS in `list-tabular.styles.css`, scoped to
  `section.list-tabular-{cover,points}`.
- **compare-table** keeps `capacity.axis: row` — its columns *are* the comparison (A vs
  B), so it stays a real table that paginates with a repeated `<thead>` (verified a
  12-row table splits 3×4). Re-authoring it to rows would destroy the read-across; a
  matching cover is a possible later polish.

**Continuity lesson:** "it fits" is the floor; a split must also wear the deck's finish.
The `coverWindow` helper is now the shared spine for that finish across layouts.

### Completing the family — five strategies, one finish

All five read-across layouts now share `coverWindow`'s accent cover→content finish; the
strategies differ only in what they parse:

- **compare-prose → `cover-sides`** (fidelity fix, replaces `editorial`): cover (the
  question) → one subject per page → a verdict. The editorial CSS/strategy/tests were
  retired.
- **split-panel → `feature-cover`** · **list-tabular → `cover-rows`** (already shipped).
- **decision → `cover-decision`**: the verdict heading is the cover (hero size — the
  decision lands), its justifications (a post-masthead list) window beneath.
- **compare-code → `cover-code`**: title cover → ONE code block per page at full width
  under its label (two blocks side-by-side never fit a portrait box; one-per-page does).
  The measure now treats **horizontal** overflow as carousel-actionable too (wide code).
  A very wide line falls back to the compact code size + wrap, never below readable.

`compare-table` is the one tabular layout that stays a real table (its columns are the
comparison) — it paginates rows with a repeated `<thead>`.

### Connective chrome — the cover leads in, the rail keeps the count

A split should not just be *more slides*; it should read as a sequence. Two pieces of
chrome carry that, both palette-blind (`currentColor`, so they sit on the accent cover and
the body pages alike):

- **A per-layout cover lead-in** (`split.intro` in the manifest, rendered as
  `"{intro} →"` under the lede). Each read-across layout declares its own semantically
  accurate intro — what the *next* slide is — so the cover introduces rather than merely
  titles: compare-prose "Side by side", split-panel "The supporting detail", list-tabular
  "Entry by entry", decision "The reasoning", compare-code "Both implementations". The
  arrow gives the forward pull a good auto-split has. `{n}` substitutes the part count.
- **A k-of-N progress rail** stamped into *every* split set with ≥2 parts — carousel or
  plain `partitionAxis` pagination alike — that lights its segments through the current
  page. It rides the deck pagination's baseline in the bottom-right but stands clear of the
  page number (`right: 12cqi`): a segmented sub-sequence-progress indicator and a numeric
  deck-position count are two different "where am I" signals, so they get real air between
  them rather than reading as one widget. Because a slide can split across *several*
  measured passes, the rail can't be stamped per-call — only the converged deck knows a
  run's true length. So each split set is tagged with a stable `data-split-run` id (the
  original slide's engine id, propagated onto every continuation), and `applyRails`
  (`auto-split.js`) stamps the rails once at the end (`lattice-emulator.js`), grouping
  consecutive sections by that id. A run of one gets no rail.

### cover-paginate — the dense list / register family

The read-across strategies *re-author* the body (compare-prose's two sides become
one-subject-per-page rows). A dense **list** doesn't need re-authoring — it already
paginates between its members — it just shouldn't drop the reader in cold. `cover-paginate`
(`carousel.js`) gives five list/register layouts the same accent **cover** lead-in, then
flows the layout's **own native cards** on body pages, never flattened:

- **statute-stack · regulatory-update · authority-chain** (legal, `item`) ·
  **q-and-a** (inventory, `item`) · **glossary** (inventory, `row` — it renders as a
  table). `partitionAxis` does the body cut (the native heading and a table's `<thead>`
  repeat per page, an `<ol>` is renumbered); the cover is one **shared** accent field
  (`lat-split-cover` in `base.modifiers.css`, not a per-layout copy) carrying the heading
  hero, any leading `<code>` eyebrow, and the `split.intro`.
- Each body page carries a `lat-split-native` marker so a page that *still* overflows
  paginates **further** (the re-split guard in `resplitDoc`) rather than growing a second
  cover; its re-split uses the recipe's `split.axis` (glossary authors as a list but
  renders as a table, so its render-time axis differs from any authoring-time capacity).
- The body cut is sized from the **measured overflow ratio**, used only to cut *denser*
  than the manifest `perPage`, never looser — a reflowing multi-column layout (statute-stack
  in portrait) packs the original tighter than the single-column split, so the raw ratio
  under-counts the pages the split needs. The cover keeps the engine id; every body drops
  it (never a duplicate id).
- A layout with a `split` recipe is owned by the *measured* pass, so the static count pass
  (`autoSplitDeck`) skips it — otherwise it would pre-paginate the list and drop the cover.

**Not in this family:** **obligation-matrix** overflows *horizontally* in portrait (a
six-column matrix is too wide), which row-splitting can't fix — it needs a column-aware
move, not cover-paginate. glossary's per-page range pill still shows the *whole* glossary's
range on each split page (the pill is computed once, pre-split).

## Shipped since

- **compare-table cover-cards (card-per-row)** (#499) — a `compare-table` is read *across*
  its columns, which a portrait/narrow frame is too tight to hold. So on overflow it splits
  as an accent **cover → card-per-row**: each row becomes a card (first cell = heading; every
  other column = a `label: value` pair from the `<thead>`), reflowing the comparison *down*
  the tall frame. This is the responsive table→cards move — the same `asymmetric` answer
  obligation-matrix needs, settled here. New `cover-cards` carousel strategy; card pages
  re-split on the `item` axis (`split.bodyAxis`) since the body form (cards) differs from the
  source axis (table rows). The cover carries the table's design language via the new opt-in
  `split.coverClass` (the cover wears `section.compare-table.lat-split-cover`, branded by the
  component stylesheet — the hairline rule echoing the row rules, the mono column heads).
  **Wide-table balloon guard:** the measure gate marks a split splittable on *horizontal*
  overflow only when its strategy NARROWS the body (`widthFix`) — `cover-cards`/`cover-code`
  do (true); a native-form `cover-paginate` (glossary) does not (false), so a too-wide one of
  those goes to the ring instead of re-splitting forever.

## On deck

- **obligation-matrix** — apply the same `cover-cards` card-per-row move (settled in #499) so
  a wide six-column matrix reflows to fit instead of futile row-splitting. The `widthFix`
  guard and the `cover-cards` strategy both already exist; obligation-matrix needs the recipe
  wired + its own cover/card branding.
- glossary's split-aware **range pill** (recompute per page instead of once pre-split).
- A reading/point/code page that paginates its *own* over-long content (still falls to
  the ring — e.g. a single code block longer than a page).
- The agenda CSS-counter continuation fix (carries from Slice A).
