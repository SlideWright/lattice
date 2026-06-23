---
status: in-progress
summary: The Fit Ladder's SPLIT move, extended to READ-ACROSS layouts that can't paginate between members (compare-prose, split-panel, compare-code). Instead of escalating to the overflow ring, the one overflowing slide is re-authored as a short, deliberate SEQUENCE — a carousel — that the layout OWNS: a lead, middle(s), and an optional last. Two families (narrative gets a bespoke carousel; tabular gets windowed row-pagination). compare-prose ships first with the `editorial` recipe (C4), picked from a 5-candidate render-off. Manifest-driven (`split` recipe) + a pure post-render transform (lib/core/carousel.js) wired into the auto-split measured loop.
---

# Read-across carousel — split what can't paginate

**Date:** 2026-06-23 · **Status:** In progress — compare-prose `editorial` and split-panel `feature-cover` shipped; compare-code / decision / the tabular family on deck.

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

On the jargon deck in portrait, overflow fell **27 → 6** (auto-split alone left 10; the
compare-prose carousels and split-panel covers resolved the narrative read-across). The
remaining 6 are compare-code / decision / list-tabular — the layouts still on deck.

## On deck

- **compare-code** — two code blocks; a baseline → variant sequence (code can't drop-cap,
  so a code-native treatment, not the editorial one).
- **Tabular family** (list-tabular, compare-table) — windowed row-pagination with a
  repeated `<thead>` (Slice A's `row` axis already repeats the header — likely a capacity
  contract, not a bespoke transform).
- **decision** — verdict-native; likely an editorial variant.
- A reading/point page that paginates its *own* over-long prose (still falls to the ring).
- The agenda CSS-counter continuation fix (carries from Slice A).
