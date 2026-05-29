# before-after

> Explicit state-change comparison — what was, what is.

**Function** comparison · **Form** split · **Substance** structure

**Tags** `transformation` · `contrast` · `retrospective`

Use to show the transformation produced by a change. Left = the prior state; right = the new state. Reads as a story, not a debate.

## When to use

- **Story of a change.** Two states, one transformation — the audience reads left-to-right as a narrative, not a debate. Use after a decision has been made and shipped.
- **Concrete prior and new state.** Both sides are factual descriptions of the system. The arrow between them is the change itself; the cards substantiate it.
- **Equal-density prose.** Each card carries roughly the same length of body text. Lopsided density makes the After look heavier than the Before and the comparison breaks.

## When NOT to use

- **Two competing options.** Use `compare-prose` or `split-compare` when both sides are alternatives under consideration. before-after is for a change that already happened.
- **More than two states.** If there is a middle state or a sequence of changes, use `list-steps` to show the progression. before-after is binary by construction.
- **Editorial labels on the cards.** The card label is always Before or After. Renaming them to Old way / New way defeats the universal grammar and breaks reader expectations.

## Authoring

```markdown
<!-- _class: before-after -->

## What the change did.

- Before
  - How the system or process worked before the change, in one or two sentences.
- After
  - How the system or process works now, in one or two sentences.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the change. |
| `states` | `ul > li` | yes | Exactly two list items. Authoring contract: a top-level bullet is the state label (Before / After); an indented bullet underneath carries the 1-2 sentence description. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│          State change heading           │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Before /     │  →  │ After /      │  │
│  │ the prior    │     │ the new      │  │
│  │ state        │     │ state        │  │
│  └──────────────┘     └──────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `banner-tag` — Banner tag — slot label as full-width header strip

Flips each card from a flush-corner label tag into a full-width header strip. Use when the slot label is the architectural signal of the card (categorical case: BUILD / WHY NOT BUY / WHY NOT DELAY), not a quiet marker.

```markdown
<!-- _class: before-after banner-tag -->

## What the operating review changed.

- BEFORE
  - Status arrived as a 40-slide deck nobody finished; the real decision happened in the hallway afterward.
- AFTER
  - One scorecard, one page; the call is logged in the room before anyone leaves.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`compare-prose`](../../comparison/compare-prose/compare-prose.docs.md) — two alternatives being weighed, not a transformation
- [`split-compare`](../../comparison/split-compare/split-compare.docs.md) — binary decision with a verdict bar
- [`redline`](../../comparison/redline/redline.docs.md) — the change is in verbatim text, not structural state
- [`list-steps`](../../progression/list-steps/list-steps.docs.md) — the change has more than two phases

## Demo deck

See [before-after.gallery.light.pdf](./before-after.gallery.light.pdf) for rendered examples of every variant.
