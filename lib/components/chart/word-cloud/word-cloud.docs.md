# word-cloud

> Spiral-packed word cloud — items sized by weight.

**Function** evidence · **Form** canvas · **Substance** series

Use for qualitative summaries — retrospective themes, survey verbatims. Word size encodes frequency or weight; not a precise data viz.

## When to use

- **Qualitative themes at a glance.** Retrospective summaries, survey verbatims, theme extraction, sentiment scans. The cloud lands what the corpus is about; the silhouette and the biggest words are the read.
- **Weight is approximate, not exact.** Word size encodes relative frequency or weight, but the eye reads 'biggest' and 'second biggest' before any precise ratio. Reach for word-cloud when the rank matters more than the count.
- **Eight to twenty items.** Below eight the spiral looks bare and the layout wastes the canvas. Past about twenty the smallest words become unreadable. Trim the long tail or cap the cloud at a 'top 15' before authoring.

## When NOT to use

- **Precise comparisons.** If the audience needs to know that 'manifest' is 1.6× 'function', the spiral packing actively misleads. Use `progress` or a bar chart where the eye can compare lengths directly.
- **Two or three words.** A three-word cloud is a list with extra steps. Use `stats` for a metric row or `big-number` for a single weighted headline.
- **Multi-word phrases.** Each li should be a single token. Multi-word phrases blow out the layout and crowd the spiral; if your data is phrases, normalise to keywords first or use `quote` for verbatim text.

## Authoring

```markdown
<!-- _class: word-cloud -->

## What the team called out this quarter.

- velocity — 12
- ownership — 9
- handoffs — 7
- review — 6
- testing — 5
- onboarding — 4
- spec — 3
- triage — 3
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading framing the cloud. |
| `words` | `ul > li` | yes | One li per word. Format: `word — weight` (weight is a number). |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│         Weighted words heading          │
│                                         │
│         alpha   BIG_TERM   beta         │
│          emergent   HUGE                │
│            minor   medium               │
│         tiny      LARGE   keyword       │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [reference/design-system.md §6.5](../../reference/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`progress`](../progress/progress.docs.md) — the weights need precise visual comparison
- [`stats`](../stats/stats.docs.md) — the headline metrics are independent numbers, not a corpus
- [`piechart`](../piechart/piechart.docs.md) — the items are parts of a whole, not free-form themes
- [`quote`](../quote/quote.docs.md) — the verbatim language matters more than the frequency
- [`tldr`](../tldr/tldr.docs.md) — the qualitative summary is prose, not a packed cloud

## Demo deck

See [word-cloud.gallery.pdf](./word-cloud.gallery.pdf) for rendered examples of every variant.
