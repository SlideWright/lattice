# quadrant

> Native 2×2 scatter chart — items plotted on two continuous axes.

**Function** evidence · **Form** scatter · **Substance** series

Use to position items by two numeric attributes (cost × value, effort × impact). Data-driven; for static categorical 2×2 grids, use matrix-2x2.

## When to use

- **Two numeric axes carry the analysis.** Effort × impact, cost × value, probability × severity, reach × confidence. Both axes are continuous and the position on each genuinely matters — that's the argument quadrant is built to make.
- **Categorical grouping clusters the dots.** Items grouped under list headings (`Strategic Bets`, `Quick Wins`, `Defer`, `Time Sinks`) share a colour, so the eye can read the cluster before the individual point. The grouping is editorial, not derived from coordinates.
- **Six to twelve items.** Below six the chart wastes the canvas — write it as prose. Past twelve the labels overlap and the quadrant becomes a constellation. Trim the long tail or break it across two slides.

## When NOT to use

- **Static categorical 2×2.** If the quadrants are fixed labels (Important × Urgent, Build × Buy × Partner × Defer) and items are placed by category not coordinate, use `matrix-2x2`. `quadrant` is data-driven; `matrix-2x2` is conceptual.
- **Single axis matters.** If one axis is decorative and only the other carries meaning, you have a ranking, not a scatter. Use `progress` for percent-complete or `kpi` for ranked metrics with status.
- **Coordinates without an audience-shared scale.** If `8, 80` requires a footnote to interpret, the slide doesn't pay off. Either label the axis units in the eyebrow (`Effort 0–10 → Reach 0–100`) or normalise to a familiar scale before authoring.

## Authoring

```markdown
<!-- _class: quadrant -->

`Effort 0–10 → Reach 0–100`

## Where to put the next dollar.

Effort estimated in story-points; reach as percent of addressable users.

- Strategic Bets
  - Codebook caching `3, 70`
  - Multi-tenant DEKs `5, 85`
- Quick Wins
  - Per-purpose codebooks `8, 80`
  - Snapshot exports `9, 55`
- Defer
  - Vendor scoping `2, 30`
  - Manual rotation `1, 22`
- Time Sinks
  - Custom audit log UI `7, 18`
  - Bespoke SCIM `9, 28`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading framing the analysis. |
| `axes` | `p > code` | no | Optional axis-label eyebrow (inline-code paragraph). |
| `items` | `ul > li` | yes | One li per item. Format: `Label — x, y[, size]`. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│         Quadrant chart heading          │
│                                         │
│    high ▲    ◆       ◆                  │
│         │ ◆    ●                        │
│         │       ●  ◆                    │
│         │  ●         ●                  │
│     low └──────────────►                │
│           low        high               │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `bubble` — Bubble — third value sizes the dot

A third number in each pill (`x, y, size`) scales the dot by honest √-area. Use when a magnitude — revenue, headcount, spend — rides alongside the two positioning axes.

```markdown
<!-- _class: quadrant bubble -->

`Effort 0–10 → Reach 0–100`

## Where to put the next dollar — sized by revenue at stake.

- Strategic Bets
  - Codebook caching `3, 70, 2.4`
  - Multi-tenant DEKs `5, 85, 4.1`
- Quick Wins
  - Per-purpose codebooks `8, 80, 0.9`
  - Snapshot exports `9, 55, 0.6`
- Defer
  - Vendor scoping `2, 30, 0.4`
- Time Sinks
  - Custom audit log UI `7, 18, 1.3`
```

### `trail` — Trail — before → after

Two coordinate pills per item (`x, y` then `x2, y2`) draw a trail from the old position to the new one. Use to show how initiatives moved across a period.

```markdown
<!-- _class: quadrant trail -->

`Effort 0–10 → Reach 0–100`

## How each bet moved after one quarter.

- Strategic Bets
  - Codebook caching `5, 60` `3, 78`
  - Multi-tenant DEKs `7, 70` `5, 88`
- Quick Wins
  - Snapshot exports `9, 45` `8, 62`
- Time Sinks
  - Custom audit log UI `6, 25` `7, 16`
```

### `cohort` — Cohort — convex-hull tint per group

Tints a convex hull behind each top-level group so the clusters read as cohorts, not just loose dots. Use when group membership is part of the argument.

```markdown
<!-- _class: quadrant cohort -->

`Effort 0–10 → Reach 0–100`

## Where to put the next dollar — clustered by theme.

- Strategic Bets
  - Codebook caching `3, 70`
  - Multi-tenant DEKs `5, 85`
- Quick Wins
  - Per-purpose codebooks `8, 80`
  - Snapshot exports `9, 55`
- Defer
  - Vendor scoping `2, 30`
  - Manual rotation `1, 22`
- Time Sinks
  - Custom audit log UI `7, 18`
  - Bespoke SCIM `9, 28`
```

### `threshold` — Threshold — target lines + zones

Replaces the centre midlines with target lines declared in the eyebrow (`· targets tx, ty`) and labels the resulting zones. Use for go/no-go reads against an explicit bar.

```markdown
<!-- _class: quadrant threshold -->

`Effort 0–10 → Reach 0–100 · targets 5, 50`

## Against the go/no-go thresholds.

- Strategic Bets
  - Codebook caching `3, 70`
  - Multi-tenant DEKs `5, 85`
- Quick Wins
  - Per-purpose codebooks `8, 80`
- Defer
  - Vendor scoping `2, 30`
- Time Sinks
  - Custom audit log UI `7, 18`
```

### `magic` — Magic — MQ tribute

A Gartner-style Magic Quadrant tribute: vendor labels and the iconic Leaders / Challengers / Visionaries / Niche Players quadrant names. Order the groups TL → TR → BL → BR.

```markdown
<!-- _class: quadrant magic -->

`Completeness of vision 0–100 → Ability to execute 0–100`

## The codebook-tooling Magic Quadrant.

- Challengers
  - Legacy Inc `30, 82`
- Leaders
  - Lattice `85, 88`
  - Vault Corp `72, 76`
- Niche Players
  - Boutique KMS `25, 28`
- Visionaries
  - Cipher Labs `82, 34`
```

### `minimal` — Minimal — no fill, faint grid

Composable modifier: drops the quadrant fills for a faint grid and bare dots. Layers on the default or any quadrant variant when the tinting would compete with the dots.

```markdown
<!-- _class: quadrant minimal -->

`Effort 0–10 → Reach 0–100`

## Where to put the next dollar — unadorned.

- Strategic Bets
  - Codebook caching `3, 70`
  - Multi-tenant DEKs `5, 85`
- Quick Wins
  - Per-purpose codebooks `8, 80`
  - Snapshot exports `9, 55`
- Defer
  - Vendor scoping `2, 30`
- Time Sinks
  - Custom audit log UI `7, 18`
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [reference/design-system.md §6.5](../../reference/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`matrix-2x2`](../matrix-2x2/matrix-2x2.docs.md) — the 2×2 is categorical, not coordinate-based
- [`radar`](../radar/radar.docs.md) — items rated across more than two criteria
- [`progress`](../progress/progress.docs.md) — percent-complete on a single axis
- [`piechart`](../piechart/piechart.docs.md) — part-to-whole, not bivariate position
- [`verdict-grid`](../verdict-grid/verdict-grid.docs.md) — comparing options against shared categorical criteria

## Demo deck

See [quadrant.gallery.pdf](./quadrant.gallery.pdf) for rendered examples of every variant.
