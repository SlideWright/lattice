# decision

> The verdict slide — one chosen path, named explicitly.

**Function** comparison · **Form** canvas · **Substance** structure

Use after a comparison slide to land the decision. The chosen option is the focal element; the rejected ones (if shown) are subordinated.

## When to use

- **Land the verdict.** Follows a comparison slide to make the chosen path unambiguous. The heading carries the verb of the decision; the cards substantiate it.
- **Two to four justifications.** Each card is one short rationale — the chosen path first, then a Why-not card for each rejected alternative. More than four crowds the horizontal strip.
- **After the comparison.** Pair with `compare-prose` or `split-compare` upstream — that slide does the weighing, this slide lands the answer. Reaching for decision without a prior comparison reads as edict.

## When NOT to use

- **No clear chosen path.** If the cards don't name one focal verdict, the slide is back to being a comparison. Use `compare-prose` or `split-compare`; reserve decision for the resolved call.
- **Long body per card.** Each card is one sentence of rationale. Paragraphs belong on the comparison slide upstream, not on the verdict slide.
- **Generic heading.** The h2 carries the decision verb — Build, not buy. Adopt the framework. Pause the rollout. A heading like Next steps wastes the focal real estate.

## Authoring

```markdown
<!-- _class: decision -->

## What we are doing.

- **Chosen path.** One-line rationale for the decision.
- **Rejected option.** One-line rationale for why this didn't fit.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading framing the decision. |
| `options` | `ul > li` | yes | List items. Authoring contract: a top-level bullet is the option name (renders bold by default); an indented bullet underneath carries the short rationale. The chosen option carries the focal styling. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│            Verdict heading.             │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ DECISION                          │  │
│  │ Single-sentence verdict line      │  │
│  │ with rationale beneath.           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `banner-tag` — Banner tag — slot label as full-width header strip

Flips each card from a flush-corner label tag into a full-width header strip. Use when the slot label is the architectural signal of the card (categorical case: BUILD / WHY NOT BUY / WHY NOT DELAY), not a quiet marker.

```markdown
<!-- _class: decision banner-tag -->

## Three reasons we are building.

- BUILD
  - The platform is the product. Owning it owns the roadmap.
- WHY NOT BUY
  - No vendor matches our compliance posture without surrender of control.
- WHY NOT DELAY
  - Cost of waiting compounds: each quarter spent on workarounds is one fewer quarter on the platform.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`compare-prose`](../compare-prose/compare-prose.docs.md) — the comparison slide that should precede decision
- [`split-compare`](../split-compare/split-compare.docs.md) — comparison and verdict on one slide instead of two
- [`closing`](../closing/closing.docs.md) — the deck ends without a single-call verdict
- [`big-number`](../big-number/big-number.docs.md) — the decision is a quantitative commitment

## Demo deck

See [decision.gallery.pdf](./decision.gallery.pdf) for rendered examples of every variant.
