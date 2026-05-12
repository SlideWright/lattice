# KPI redesign — iteration notes

The shipped KPI is a grid of 4 cards: 3px categorical top-stripe, 1px border,
rounded corners, bg-alt fill, centered numerals. Why it reads as ugly:

- Rainbow of categorical stripes makes every card shout a different colour;
  there's no visual hierarchy.
- Card chrome (border + bg-alt + radius + top stripe) competes with the
  numbers, the only thing that matters.
- Centre-aligned everything is generic dashboard, not editorial.
- Target/trend sub-line is buried as muted afterthought — yet it carries
  the *meaning* of the headline number.

The fix splits into five directions. For each, five iterations explored,
winner annotated with rationale. Authoring contract is unchanged
(`<!-- _class: kpi-X -->` over a list of `**number**` + label + optional
target/trend sub-line) — so existing decks migrate by class rename only.

---

## Direction 1 — ANCHOR (hero + supporting)

Introduce hierarchy: one metric is the headline, others are context.

| # | Sketch                                                         | Verdict   |
| - | -------------------------------------------------------------- | --------- |
| 1 | Hero left (5fr), supporting stacked right (7fr), hairline rows | **winner** |
| 2 | Hero top full-width, supporting row of three below             | wastes hero space; band feels footer-y |
| 3 | Hero left, supporting 2×2 right                                | hero shrinks too much next to 4 cells |
| 4 | Hero centred with massive numeral, supporting strip at bottom  | strip reads as caption, not peer metrics |
| 5 | Hero left, supporting as inline comma-separated single line    | sub-metrics become unreadable below ~--fs-md |

**Why iteration 1.** Stacking supporting items vertically with a hairline
between each lets each one breathe and keep its target line. The 5/7
split puts the hero clearly first, but the right column still carries
enough width for a sub-line. Hero gets `--fs-hero` (110px), supporting
gets `--fs-3xl` (48px) — same ratio as h1:h3, which is a tested
typographic interval.

## Direction 2 — LEDGER (datasheet density)

Strip every box. Lay metrics out as a spec-sheet: label · value · target.
No tables (per directive), CSS Grid only.

| # | Sketch                                                       | Verdict   |
| - | ------------------------------------------------------------ | --------- |
| 1 | 3 columns: label · value · sub-line, baseline-aligned, hairline rows | **winner** |
| 2 | 2 columns: `label : value` pairs, sub-line below             | sub-line orphaned; not enough columns to repay the density |
| 3 | 4 columns: label · value · target · delta — requires parsing sub-line | breaks the authoring contract |
| 4 | 2×2 grid of (label/value) pairs                              | turns into miniature cards, defeats the point |
| 5 | Rows with metric label · large mono number · target chip pill | chips reintroduce chrome the direction is trying to lose |

**Why iteration 1.** `display: contents` on the inner `<ul>` lets the
`<strong>`, label, and target line participate in a single 3-column grid
per row. Right-align the value column with tabular-nums so 94%, 8 ms,
0, 3.2× all sit on the same digit axis. Result: a clean ledger that
reads as type, not chrome.

## Direction 3 — SLAT (full-width rows)

Each metric is a full-bleed horizontal row. Big numeral left, label
stack right.

| # | Sketch                                                       | Verdict   |
| - | ------------------------------------------------------------ | --------- |
| 1 | Right-aligned hero numeral left, label stack left-aligned right | **winner** |
| 2 | Numeral right, label left (mirror)                           | breaks the left-to-right reading order; numeral hidden until end |
| 3 | Numeral centred, label above and below                       | label-above-number is the dashboard cliché we're trying to escape |
| 4 | Numeral on a coloured slab on the left                       | slabs reintroduce card chrome with extra weight |
| 5 | Numeral fills the row height (no padding)                    | overwhelms the label; loses readability of `8 ms` vs `94%` |

**Why iteration 1.** Right-aligning the numeral column gives a strong
vertical axis the eye tracks down. Label gets two lines (name + target)
left-aligned beside it. Hairlines top and bottom of each row, nothing
else. Reads like a financial report row, not a tile.

## Direction 4 — MARQUEE (ticker band)

Single horizontal band, panels separated by vertical hairlines. Reads
like a Bloomberg index header or a newspaper dateline strip.

| # | Sketch                                                       | Verdict   |
| - | ------------------------------------------------------------ | --------- |
| 1 | Even-width panels, mono uppercase label above big numeral, hairline dividers | **winner** |
| 2 | Each panel with a coloured top accent stripe                 | reproduces the current ugly rainbow stripe problem |
| 3 | Label above number rather than below                         | inverts the "headline first" reading; numerical scan suffers |
| 4 | Asymmetric: first panel double width, others compact         | mixes anchor and marquee patterns; loses marquee's clarity |
| 5 | bg-alt fill behind the whole strip                           | fights the slide background; band stops feeling integrated |

**Why iteration 1.** Mono small-caps label below the numeral gives the
ticker / index feel. Numeral at `--fs-display` (60px) sits comfortably
for 3–5 panels across. Hairlines between, nothing around. Drops the
chrome that makes the current KPI loud.

## Direction 5 — GRID REFINED (typography-first cards)

Keep the grid shape but strip the chrome down to a single accent rule.
The most conservative path — closest to the current authoring shape.

| # | Sketch                                                       | Verdict   |
| - | ------------------------------------------------------------ | --------- |
| 1 | Left accent rule (2px) per cell, no border/bg/radius, left-aligned | **winner** |
| 2 | Hairline border, no accent stripe                            | timid; reads as a wireframe |
| 3 | Coloured accent *dot* before the number                      | dot competes with numeric character; orphaned in space |
| 4 | No accent at all, just whitespace + typography               | loses the categorical signal entirely; rows look identical |
| 5 | Outlined card with integrated trend arrow                    | arrow is meaningful but glyph-rendering is fragile in the marp Chromium build |

**Why iteration 1.** A single 2px left rule per cell carries the
categorical signal without the rainbow being the loudest thing on the
slide. Left-aligned numbers + labels read editorially; the cells stay
a grid but no longer look like Bootstrap stat-cards.

---

## Cross-direction summary

| Direction | Best for                                              | Items | Density |
| --------- | ----------------------------------------------------- | ----- | ------- |
| anchor    | one headline metric with context                      | 3–5   | medium  |
| ledger    | dense diligence read (5+ metrics, target columns)     | 4–8   | high    |
| slat      | 3–4 important metrics that each deserve a full row    | 3–4   | medium  |
| marquee   | a strip of equal-weight indicators                    | 3–6   | low     |
| grid      | the general case — drop-in replacement for the shipped `kpi` | 3–6 | medium  |

These five cover the practical space of metric-dashboard slides without
overlapping. `grid` is the safest drop-in for existing decks; `anchor`
and `ledger` are the more editorial picks; `slat` and `marquee` are
specialised but distinct.
