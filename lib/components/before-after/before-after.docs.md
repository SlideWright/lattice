# before-after

> Explicit state-change comparison — what was, what is.

**Function** comparison · **Form** split · **Substance** structure

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

- **Before.** How the system or process worked before the change, in one or two sentences.
- **After.** How the system or process works now, in one or two sentences.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the change. |
| `states` | `ul > li` | yes | Exactly two list items. Lead each with **Before** or **After** then a 1–2 sentence description. |

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

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, decoration backgrounds). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`compare-prose`](../compare-prose/compare-prose.docs.md) — two alternatives being weighed, not a transformation
- [`split-compare`](../split-compare/split-compare.docs.md) — binary decision with a verdict bar
- [`redline`](../redline/redline.docs.md) — the change is in verbatim text, not structural state
- [`list-steps`](../list-steps/list-steps.docs.md) — the change has more than two phases

## Demo deck

See [before-after.gallery.pdf](./before-after.gallery.pdf) for rendered examples of every variant.
