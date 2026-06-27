# matrix-2x2

> Static 2×2 quadrant grid with author-placed items per cell.

**Function** comparison · **Form** matrix · **Substance** structure

**Tags** `two-by-two` · `prioritize` · `strategy` · `risk`

Use for categorical 2×2 reasoning when the items are fixed and you control which cell each lands in. For data-plotted scatter on continuous axes, use quadrant instead.

## When to use

- **Categorical 2×2 reasoning.** SWOT, Eisenhower, BCG growth-share, risk × impact, build-vs-buy. The two axes are discrete labels and you place each item by judgement.
- **Fixed, author-placed items.** You know which cell each item belongs in and the placement is the editorial argument. Data-plotted scatter on continuous axes belongs in `quadrant`.
- **Bottom-right accent matters.** The fourth cell carries the accent ring as the conventional outcome or high-priority quadrant. Place the items you want emphasised there.

## When NOT to use

- **Continuous-axis data.** If items have x/y coordinates rather than quadrant labels, use `quadrant`. matrix-2x2 is author-placed categorical, not plotted.
- **Empty quadrants left blank.** An empty cell still needs a label or an explicit (none) placeholder. A missing card breaks the 2×2 symmetry.
- **More than 4 items per cell.** Each quadrant holds 1–4 items. Past that the cells crowd. Promote inner items to their own slide if needed.

## Authoring

```markdown
<!-- _class: matrix-2x2 -->

## Where each option lives.

- **High value · Low cost.**
  - First item in this quadrant
  - Second item
- **High value · High cost.**
  - First item in this quadrant
- **Low value · Low cost.**
  - First item in this quadrant
- **Low value · High cost.**
  - First item in this quadrant
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the framework. |
| `axes` | `ul > li` | yes | Four outer list items (one per cell). Lead each with **Quadrant label.** then the items as inner bullets. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│           2×2 matrix heading            │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Q1: top L    │     │ Q2: top R    │  │
│  │ axis y+      │     │ axis y+      │  │
│  └──────────────┘     └──────────────┘  │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Q3: bot L    │     │ Q4: bot R    │  │
│  └──────────────┘     └──────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This component accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`quadrant`](../../chart/quadrant/quadrant.docs.md) — items have continuous x/y coordinates rather than discrete quadrant labels
- [`verdict-grid`](../../comparison/verdict-grid/verdict-grid.docs.md) — options scored across more than two dimensions
- [`obligation-matrix`](../../legal/obligation-matrix/obligation-matrix.docs.md) — many rows × many columns of state-marker cells
- [`cards-grid`](../../inventory/cards-grid/cards-grid.docs.md) — the items don't divide along two axes

## Demo deck

See [matrix-2x2.gallery.light.pdf](./matrix-2x2.gallery.light.pdf) for rendered examples of every variant.
