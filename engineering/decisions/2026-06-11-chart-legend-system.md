# Chart legend system — the rail, the spine, the catalog

**Status:** implemented 2026-06-11.
**Scope:** the four colour-categorical chart-family members
(`piechart`, `radar`, `map`, `quadrant·cohort`), the `roadmap` status key,
and the shared `.chart-frame` skeleton.

## The complaint

> "Some charts have legends. Other charts that should have a legend don't.
> Charts with legends on the right don't have balance or a vertical
> separator. Make them balanced (left or right) with a separator — Feng
> shui — not forced to centre, because a right-side legend can't be. Legends
> get consistent, appropriate space, can wrap if authors go long, must not
> overpower but mustn't make you squint or be squished. Consistent legend
> placement per chart category. The checkbox icons (roadmap) need a legend
> too. Be mindful of header/footer/pagination overflow. Make sure we have
> legends — the decks are emailed."

## What was actually wrong (baseline audit)

Rasterizing the chart bucket gallery surfaced one root cause behind every
symptom: **the legend was a per-component afterthought.** Each chart that
needs a key shipped its own ad-hoc `[figure][gap][legend]` flex row:

| Chart | Gap | Separator | Legend width | Long-name behaviour |
|---|---|---|---|---|
| piechart | `sp-2xl` | none | `21–29cqi` | wrap |
| radar | `sp-xl` | none | `auto` (floats) | wrap |
| map | `3cqi` | none | `34cqi` | **clipped (ellipsis)** |
| quadrant·cohort | `sp-lg` | none | `auto` (floats) | wrap |

Because each was a *pair centred as a group with no anchor*, the legend hung
in right-edge dead space. Four gaps, four swatch sizes, three font sizes,
one chart silently clipping names, and `roadmap`'s symbol cells had no key
at all.

## Systems read — what kind of thing a legend is, and where it goes

A legend is a **key**: it earns its place only when colour or symbol carries
meaning the marks don't spell out. That test sorts the bucket *and* dictates
placement.

**Colour-categorical → right rail (chart + spine + key):**
- `piechart` (wedge ↔ category), `radar` (polygon ↔ series),
  `map` (region ↔ value), `quadrant·cohort` (hull ↔ cohort).

**Wide symbol grid → bottom-centre key:**
- `roadmap` — cells encode by symbol (✓ shipped · – in flight · ○ planned ·
  ╱ out of scope). A right rail would crowd a full-width grid, so the key
  sits bottom-centre (accessibility best practice for wide visuals).

**Self-labelling → the marks ARE the key (no legend, by design):**
- `funnel`, `progress`, `gantt`, `kanban`, `timeline-list`, `state-chart` —
  every band/bar/card/node is captioned in place; the status-pill
  vocabulary is its own labelled key.
- `word-cloud` — size encodes weight; the word is its own label.
- `quadrant` (default/threshold/trail) — the four quadrant titles are the
  key, printed in-grid.

**Already-keyed, different geometry (left as-is):**
- `journey` — actor + mood legends key the board from top-left. Its
  imbalance is *vertical*, a separate concern (see follow-ups).

So "make sure we have legends" is satisfied by guaranteeing every chart that
encodes meaning by colour or symbol carries a world-class key, while the
self-labelling charts stay clean. An emailed deck is readable because
nothing relies on an un-keyed encoding.

## The design: a balanced group, a gradient spine

A right-side legend *cannot* sit at the slide centre (the chart would have
to slide off-axis to make room), so chasing a centred spine fights the
content. The answer is **balance, not centring — Feng shui.** The figure is
a content-sized flex row centred as one group: the chart keeps its own
footprint and leans left, the key its capped width on the right, and the
gradient spine between them anchors the pair.

```
┌───────────────── chart-body ─────────────────┐
│                                                │
│        chart canvas    |    legend rail        │
│      (own footprint)  >|<   (wraps, capped)    │
│                       >|<                       │
│                    gradient spine               │
└───────────────────────────────────────────────┘
        the GROUP centres — chart leans left, key right
```

Five moves, each answering one line of the brief:

1. **Balanced group, not a slide-centred chart.** `justify-content: center`
   on a content-sized row: a wide chart with a short key and a narrow chart
   with a long key both read as balanced. Variable-width legends never knock
   the composition off; the right-edge dead space is gone.

2. **A gradient spine between chart and key.** The separator is the legend's
   `::before`, drawn in the gap to the chart's right — a pure-accent rule
   that melts into the canvas top and bottom, a fixed generous height
   centred on the key. It anchors the legend so it stops floating, and only
   renders when a legend exists (no orphan rule). Quiet on light, luminous
   on dark — verified on both canvases.

3. **Vertical centring that doesn't sit low.** `align-items: center` inside
   a `.chart-body` that already centres its content puts the group on the
   body's optical centre; the spine is the fixed anchor so balance reads
   even when the key is short.

4. **Consistent, readable space that wraps.** One `--chart-legend-gap`, one
   `--chart-legend-max` cap, one `--chart-legend-row-gap`, one swatch size.
   Labels are body-compact (13.5pt) so nothing squints, the row rhythm so
   nothing squishes, and labels **wrap** past the cap (map's clip-to-
   ellipsis is gone). Capped width keeps the key from overpowering the data.

5. **Maximised space, preserved gaps.** The chart keeps its full footprint
   beside the key instead of being pinned small next to a floating legend.

### Roadmap's bottom-centre status key

The transform emits a key under the grid **only for the states actually
present**, reusing the exact disc+masked-glyph recipe the cells use (one
source of truth: a theme tuning `--mark-*` / `--state-color` updates both).
It lives inside `.roadmap-figure`, so the chart-frame body wrap keeps it
within the body — never spilling to the footer. Two variants opt out:
`status` already prints the labels on every cell, and `horizons` is too
vertically dense (its cards carry their own Now/Next/Later framing). Marker-
less variants (swimlane, milestones) get no key automatically.

## Tokens (the contract)

Set on `section.chart-frame`, overridable per chart:

| Token | Default | Role |
|---|---|---|
| `--chart-legend-gap` | `var(--sp-2xl)` | gutter between canvas and rail |
| `--chart-legend-max` | `30cqi` | rail width cap — labels wrap past it |
| `--chart-legend-row-gap` | `1cqi` | vertical rhythm between rows |
| `--chart-legend-pad` | `var(--sp-lg)` | legend text inset off the spine |
| `--chart-spine-h` | `27cqi` | spine height (consistent, centred) |
| `--chart-spine-w` | `2px` | spine thickness |
| `--chart-spine` | accent→transparent fade | the gradient rule |

`map` widens its own basemap (`width: 56cqi` — a world map wants more than a
pie); the spine stays anchored to the canvas|rail boundary, a deliberate
divider regardless.

## Iteration log

Rounds on the shared system, judged against pie · radar · map ·
cohort-quadrant + a long-label stress slide + roadmap, light and dark:

1. **v1 — full-width 1fr/1fr grid, spine pinned to the slide centre.**
   Technically centred, but a right-side legend *can't* be centred, so the
   symmetric grid fought the content (the brief pushed back on this).
2. **v2 — balanced content-sized group (`justify-content: center`).** Chart
   leans left, key right, group centred — the Feng-shui read. Spine moved to
   the canvas|key boundary.
3. **v3 — spine strengthened on light (pure-accent fade, 60% core), swatches
   unified to 1.35cqi, labels lifted to body-compact** so nothing squints.
4. **v4 — map basemap bounded to 56cqi so the pair balances; long-label
   stress slide reflows cleanly.**
5. **v5 — roadmap bottom-centre status key (the "checkbox icons"), gated off
   `horizons`/`status` and absent when no markers exist.** Shipped.

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

- **journey vertical balance** — the board is top-heavy; centring it is a
  change to journey's own grid, not the rail.
- **roadmap·horizons key** — would need a density redesign to make room.
