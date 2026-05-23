# cards-side

> Two cards side-by-side, co-equal.

**Function** inventory · **Form** split · **Substance** structure

Use for an explicit pair — two options, two phases, two artifacts presented with equal weight.

## When to use

- **An explicit pair.** Exactly two items that deserve equal visual weight. Two options under consideration, two phases of a rollout, two halves of a contract.
- **Neutral comparison.** When the slide should not take sides. cards-side stays balanced; compare-prose declares a winner via connector chrome.
- **Short, parallel body.** Each card carries one to two sentences of similar length. Lopsided density breaks the layout's symmetry and the audience reads it as preference.

## When NOT to use

- **Three or more cards.** cards-side is built for exactly two slots. For three parallel items use cards-grid three; for four use cards-grid four.
- **One side is the answer.** If the deck has already chosen, use compare-prose with the winner highlighted. cards-side reads as undecided — that's the wrong signal when you've decided.
- **Long-form body per card.** More than two sentences per card crowds the split. For richer side-by-side bodies, move to split-list or two stacked rows of cards-wide.

## Authoring

```markdown
<!-- _class: cards-side -->

## Slide heading.

- **Left card title.** Body text for the left card, two short sentences.
- **Right card title.** Body text for the right card, two short sentences.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading. |
| `cards` | `ul > li` | yes | Exactly two list items, each one card. Authoring contract: a top-level bullet is the card title (renders bold by default); an indented bullet underneath carries the body text. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│            Two-card heading             │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Option A     │     │ Option B     │  │
│  │ body text    │     │ body text    │  │
│  └──────────────┘     └──────────────┘  │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `numbered` — Numbered cards

Authored as `ol` (`1.` source). Each card gets a flush top-left accent corner tag — useful when the pair carries an implicit order ("before" and "after", phase one and phase two).

```markdown
<!-- _class: cards-side -->

## Two phases, in order.

1. Discovery
   - Interviews with seven design partners, weekly cohort calls, and a structured artifact review. Lands a problem statement the team can defend.
2. Pilot
   - Two-week build cycles against the artifact, weekly demos to partners, exit interviews. Lands a go/no-go recommendation with cost and risk attached.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [reference/design-system.md §6.5](../../reference/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`cards-grid`](../cards-grid/cards-grid.docs.md) — three or four parallel items, not two
- [`cards-stack`](../cards-stack/cards-stack.docs.md) — two items that read top-to-bottom, not left-right
- [`compare-prose`](../compare-prose/compare-prose.docs.md) — the comparison has a winner you want to declare
- [`split-list`](../split-list/split-list.docs.md) — one side is framing, the other is supporting evidence

## Demo deck

See [cards-side.gallery.pdf](./cards-side.gallery.pdf) for rendered examples of every variant.
