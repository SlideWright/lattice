# list

> Plain bullet list under a heading.

**Function** inventory · **Form** stack · **Substance** prose

Use only when the items are genuinely a list (5–6 short points). For anything richer, prefer cards-grid, cards-stack, or list-tabular.

## When to use

- **Genuinely a list.** Five to six short points, each under twelve words. No internal structure per item — just a heading and the bullets.
- **Numbered when order matters.** Use `ol` (`1.` source) when sequence is load-bearing; `ul` when order is interchangeable. Numbers render as a tabular leading column.
- **Pills via inline code.** Inline code at the end of a row becomes a pill (status tag, metric, owner). Lets the list double as a lightweight ledger without changing layout.

## When NOT to use

- **Title plus body per item.** If each bullet is `**Title.** body`, the layout under-serves it. Move to cards-stack (2-3 items) or list-tabular (5+ rows) instead.
- **Wall of long bullets.** Past twelve words per line the slide becomes paragraph soup. Either trim or move to content for prose, cards-stack for structured items.
- **Two-item lists.** Two bullets read as a thin slide. For pairs, reach for cards-side or compare-prose — both give the pair the weight it deserves.

## Authoring

```markdown
<!-- _class: list -->

## Slide heading.

- First short bullet point.
- Second short bullet point.
- Third short bullet point.
- Fourth short bullet point.
- Fifth short bullet point.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading. |
| `items` | `ul > li, ol > li` | yes | List items. Keep each under ~12 words. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  List heading.                          │
│                                         │
│  - First bulleted item                  │
│  - Second bulleted item                 │
│  - Third bulleted item                  │
│  - Fourth bulleted item                 │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`tldr`](../../inventory/tldr/tldr.docs.md) — single-line takeaways at the end of a section
- [`cards-stack`](../../inventory/cards-stack/cards-stack.docs.md) — each item has a title plus body sentence
- [`list-tabular`](../../inventory/list-tabular/list-tabular.docs.md) — five or more rows with label-plus-description
- [`checklist`](../../inventory/checklist/checklist.docs.md) — items carry state markers (done / partial / todo)

## Demo deck

See [list.gallery.light.pdf](./list.gallery.light.pdf) for rendered examples of every variant.
