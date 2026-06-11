# Chart legend system — the 70/30 rail, the spine, the catalog

**Status:** implemented 2026-06-11.
**Scope:** the four colour-categorical chart-family members
(`piechart`, `radar`, `map`, `quadrant·cohort`), the `roadmap` status key,
and the shared `.chart-frame` skeleton. The chart family has **13** members;
this note covers the ones that encode meaning by colour or symbol (the rest
self-label — see the catalog).

## The complaint

> "Some charts have legends. Others that should don't. Right-side legends
> have no balance and no separator. Use the same principle as a 70-30 flex
> split and centre the content in its parent zone. Consistent legend
> placement per chart category. Legends get appropriate space, can wrap if
> authors go long, must not overpower but mustn't make you squint or be
> squished. The checkbox icons (roadmap) need a legend too. Mind the
> header/footer/pagination space. The decks are emailed."

## What was wrong (baseline audit)

One root cause behind every symptom: **the legend was a per-component
afterthought.** Each chart that needs a key shipped its own ad-hoc
`[figure][gap][legend]` flex row — four different gaps, no separator, the key
floating in right-edge dead space, the chart shoved off-centre (radar's rim
labels even collided with where a separator would go), and `map` clipping
long names. `roadmap`'s symbol cells had no key at all.

## Systems read — what kind of thing a legend is, and where it goes

A legend is a **key**: it earns its place only when colour or symbol carries
meaning the marks don't spell out. That test sorts all 13 members *and*
dictates placement.

**Colour-categorical → right rail (70/30):**
- `piechart` (wedge ↔ category), `radar` (polygon ↔ series),
  `map` (region ↔ value), `quadrant·cohort` (hull ↔ cohort).

**Wide diagram → bottom-centre key:**
- `roadmap` — cells encode by symbol (✓ shipped · – in flight · ○ planned ·
  ╱ out of scope). A right rail would crowd a full-width grid, so the key
  sits bottom-centre (accessibility best practice for wide visuals).
- `journey` — a wide board (sections + tasks + timeline + mood band across
  the full width). Its actor + mood keys previously crowded the top-left and
  left the board top-heavy; they now sit **bottom-centre**, and the board
  centres the diagram+key group vertically. CSS-only (the keys are reordered
  to the foot of the flex column), safe across all five variants.

**Self-labelling → the marks ARE the key (no legend, by design):**
- `funnel`, `progress`, `gantt`, `kanban`, `timeline-list`, `state-chart` —
  every band/bar/card/node is captioned in place; the status-pill vocabulary
  is its own labelled key.
- `word-cloud` — size encodes weight; the word is its own label.
- `quadrant` (default/threshold/trail) — the four quadrant titles are the
  key, printed in-grid.

So "make sure we have legends" is satisfied by guaranteeing every chart that
encodes by colour or symbol carries a world-class key, while the
self-labelling charts stay clean.

## The design: a 70 / 30 split, content centred in each zone

A right-side legend cannot sit at the slide centre (the chart would slide
off-axis to make room), and a content-sized "balanced group" drifts with the
legend's width — a long key shoves the chart left, a short key leaves it
floating. The deterministic answer is a **70 / 30 split**: the chart is the
hero in a wide left zone, the key a consistent right rail, and **each is
centred in its own zone**. The composition is then stable regardless of the
chart's footprint or the key's length, and the spine marks the boundary.

```
+------------------ chart-body ------------------+
|                              |                  |
|       chart canvas (70%)     |    key (30%)     |
|     (centred in its zone)   >|<   (centred)     |
|                             >|<                  |
|                       gradient spine             |
+--------------------------------------------------+
   each zone centres its own content; spine on the 70/30 line
```

Five moves, each answering one line of the brief:

1. **A 70/30 split, content centred per zone.** `grid-template-columns: 70%
   30%`; the chart `justify-self: center` in the wide zone, the key
   `justify-self: center` in its rail. A wide chart with a short key and a
   narrow chart with a long key render identically stable — variable legend
   width never knocks the composition off. The chart is the hero at 70%; the
   key is a calm, consistent rail.

2. **A gradient spine on the boundary.** The separator is the figure's
   `::before` pinned to the 70/30 line — a pure-accent rule that melts into
   the canvas top and bottom, with an **adaptive height (% of the body)** so
   it never spills into header or footer. Deterministic: it does not move
   with the key's width. Quiet on light, luminous on dark — verified on both.

3. **Vertical centring that doesn't sit low.** `align-items: center` inside a
   `.chart-body` that already centres its content puts the assembly on the
   body's optical centre; the spine is the fixed anchor.

4. **Consistent, readable space that wraps.** One `--chart-legend-max` cap,
   one `--chart-legend-row-gap`, one swatch size. Labels are body-compact
   (13.5pt) so nothing squints, the row rhythm so nothing squishes, and
   labels **wrap** past the cap (map's clip-to-ellipsis is gone). The cap
   (< the 30% rail) keeps the key from overpowering the data.

5. **The 70% zone clears the awkward cases.** A radar's rim axis labels paint
   outside its square box; centred in a wide 70% zone they sit well clear of
   the spine (the earlier centred-group put them on top of it). The cohort
   quadrant, which floated left before, now centres cleanly in its zone too.

### Roadmap's bottom-centre status key

The transform emits a key under the grid **only for the states actually
present**, reusing the cells' exact disc+masked-glyph recipe (one source of
truth: a theme tuning `--mark-*` / `--state-color` updates both). It lives
inside `.roadmap-figure`, so the chart-frame body wrap keeps it within the
body — never spilling to the footer. Two variants opt out: `status` already
prints the labels on every cell, and `horizons` is too vertically dense (its
cards carry their own Now/Next/Later framing). Marker-less variants get no
key automatically.

## Tokens (the contract)

Set on `section.chart-frame`, overridable per chart:

| Token | Default | Role |
|---|---|---|
| `--chart-canvas-share` | `70%` | the 70 of the 70/30 split |
| `--chart-rail-share` | `30%` | the 30 — the key's rail |
| `--chart-legend-max` | `25cqi` | key cap (< rail) — labels wrap past it |
| `--chart-legend-row-gap` | `1cqi` | vertical rhythm between rows |
| `--chart-spine-h` | `78%` | spine height (% of body, never spills) |
| `--chart-spine-w` | `2px` | spine thickness |
| `--chart-spine` | accent→transparent fade | the gradient rule |

`map` widens its own basemap (`width: 56cqi` — a world map wants more than a
pie); the 70% zone holds it. Any chart can retune its split via the share
tokens.

## Iteration log

Rounds on the shared system, judged against pie · radar · map ·
cohort-quadrant + a long-label stress slide + roadmap, light and dark:

1. **v1 — full-width 1fr/1fr grid, spine pinned to slide-centre.** A
   right-side legend can't be slide-centred; the symmetric grid fought it.
2. **v2 — content-sized balanced group (`justify-content: center`).** Better,
   but the composition drifted with legend width and radar's rim labels
   collided with the spine.
3. **v3 — spine strengthened (pure-accent fade), swatches unified to
   1.35cqi, labels lifted to body-compact** so nothing squints.
4. **v4 — roadmap bottom-centre status key** (the "checkbox icons"), gated
   off `horizons`/`status`, absent when no markers exist.
5. **v5 — the 70/30 split** (this revision): chart hero left, key rail right,
   each centred in its own zone, spine on the boundary at adaptive height.
   Stable across all footprints; radar labels and the cohort quadrant both
   land cleanly. Shipped.

## What this does NOT change

- The categorical/semantic colour model and the SVG kernels. The rail is
  **pure CSS** keyed on existing figure/legend classes, so all three render
  paths inherit it from `dist/lattice.css` with zero transform edits.
- Cross-renderer parity. The roadmap key rides the shared engine
  (`transformChartSection` → `wrapRoadmapFigure`), which all three paths use;
  it adds no slides, so the page-count parity gate is unaffected.
- `cover` variants (own their full-bleed layout, scoped `:not(.cover)`) and
  `radar·small-multiples` (no single legend, excluded by variant).

## Follow-ups (deliberately deferred)

- **word-cloud size key** — size encodes weight with no scale key; a "size =
  frequency" note would close it.
- **gantt status key** — an optional key for the done/at-risk/blocked pills on
  cold-open emailed decks.
- **roadmap·horizons key** — would need a density redesign to make room.
