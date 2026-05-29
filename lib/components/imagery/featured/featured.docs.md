# featured

> Featured card + sub-grid — one prominent item with supporting cards.

**Function** imagery · **Form** panel · **Substance** mixed

Use after a comparison or evaluation to land the recommendation: the featured card is the winner; the sub-grid shows the alternatives or context.

## When to use

- **Land the recommendation.** Use featured as the closing slide of a comparison or evaluation arc — the featured card is the verdict; the sub-grid holds the runners-up the audience needs to see weren't overlooked.
- **One hero, three context cards.** The layout reads cleanest with one featured card and three supporting ones. Two supporting cards leave the sub-grid lopsided; four crowd the right side and the hierarchy flattens.
- **Mixed substance is the point.** The featured card earns a longer body paragraph; the sub-grid cards stay one-sentence. Lopsided density between hero and grid is the visual signal — it's what tells the audience which card is the answer.

## When NOT to use

- **Equal-weight options.** If all four items deserve the same weight, use `cards-grid`. featured demands a winner; without one the layout overstates the lead and the audience feels manipulated.
- **Hero card with one-line body.** A one-sentence featured card defeats the asymmetry — the sub-grid bullets out-mass it. Either give the hero the paragraph it needs or move to `cards-grid` where every card holds equal weight.
- **Sub-grid that argues against the hero.** If the supporting cards undermine the recommendation, the slide is a debate, not a verdict. Use `verdict-grid` for criteria-based scoring or `cards-side` for explicit two-option comparison.

## Authoring

```markdown
<!-- _class: featured -->

## Slide heading framing the recommendation.

- Featured recommendation
  - One to two sentences making the case.
- Supporting card
  - Short context on a related option.
- Supporting card
  - Short context on another option.
- Supporting card
  - Short context on another option.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading framing the recommendation. |
| `items` | `ul > li` | yes | First li becomes the featured card; remaining lis form the sub-grid. Authoring contract: a top-level bullet is the card title (renders bold by default); an indented bullet underneath carries the body text. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Featured hero heading.                 │
│  ┌───────────────────────────────────┐  │
│  │ HERO — featured item              │  │
│  │ body text and detail              │  │
│  └───────────────────────────────────┘  │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Support 1    │     │ Support 2    │  │
│  └──────────────┘     └──────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `mirror` — Mirror — featured on the right

Flips the layout: the supporting sub-grid sits on the left, the featured card on the right. Use when the surrounding deck reads left-to-right and the hero needs to fall on the page-turn edge.

```markdown
<!-- _class: featured mirror -->

## After the audit, the recommendation lands on the right.

- Self-contained component folders.
  - One folder per component holding manifest, styles, transform (if needed), example, and README. Matches the pattern every mature design system uses, and lets the scaffolder, bundler, and docs generator read a single source of truth.
- Bundler concatenates CSS at build time.
  - Per-component sources combine into the shipped lattice stylesheet via the build-css tool.
- Manifests are the single source of truth.
  - Scaffolder, snippets, this gallery, and docs all read from the same JSON.
- Tests stay scoped.
  - One test file per component under the components test path.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`cards-grid`](../../inventory/cards-grid/cards-grid.docs.md) — all options carry equal weight; no winner declared
- [`verdict-grid`](../../comparison/verdict-grid/verdict-grid.docs.md) — options scored against shared criteria, not picked
- [`cards-side`](../../inventory/cards-side/cards-side.docs.md) — two options side by side, no hierarchy between them
- [`decision`](../../comparison/decision/decision.docs.md) — the recommendation needs an explicit pro/con frame
- [`split-brief`](../../statement/split-brief/split-brief.docs.md) — the recommendation is a thesis sentence + supporting findings

## Demo deck

See [featured.gallery.light.pdf](./featured.gallery.light.pdf) for rendered examples of every variant.
