# principles

> Declared statements — short stated principles, each with a one-line justification.

**Function** inventory · **Form** stack · **Substance** structure

Use for design tenets, working agreements, or guiding rules. Each principle reads as a complete sentence; the justification is below.

## When to use

- **Working agreements.** Team tenets, design principles, decision rules. Use when the slide's job is to declare how the room makes calls, not to show data.
- **Stated as commands.** Each principle is a short imperative sentence — "Default to X", "Name the actor". Statements with hedging language lose the principle's bite.
- **Three to six items.** More than six principles and the audience stops remembering them. If you have more, prioritize: the principles slide carries the load-bearing few.

## When NOT to use

- **Aspirations, not principles.** "Be empathetic" is a value, not a principle. Principles are decision rules — they say what to do when two options conflict. Reach for content if it's a values statement.
- **Long per-principle prose.** Each justification is one sentence. If a principle needs a paragraph of context, give it its own slide and let principles act as the index.
- **Hedged statements.** "We try to default to X" reads as a wish. Drop the hedge — principles are declared, not negotiated. "Default to X" lands harder.

## Authoring

```markdown
<!-- _class: principles -->

## How we make calls when the spec is silent.

- **Bias to action.** Default to shipping a defensible answer over chasing a perfect one.
- **Decisions over options.** Document the choice, not the menu we evaluated.
- **Cheaper to reverse than to debate.** Reversible calls don't need a meeting.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading. |
| `principles` | `ul > li` | yes | One li per principle. Lead each with **The principle.** then a justification sentence. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Principles heading.                    │
│                                         │
│  01  First principle, stated.           │
│  02  Second principle, stated.          │
│  03  Third principle, stated.           │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `numbered` — Numbered principles

Authored as `ol` (`1.` source). Useful when the principles are ordered by priority — the first principle wins when two conflict.

```markdown
<!-- _class: principles -->

## How we resolve conflicts — top wins.

1. **Default to the choice that is cheaper to reverse.** Reversibility beats every other tie-breaker.
2. **Name the actor, never the system.** Anonymous accountability is no accountability.
3. **Write down the bet on the same slide as the choice.** Calibration depends on it.
4. **Form follows function.** Let audience need shape the layout.
5. **One main idea per slide.** If you can't summarise it, split it.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [reference/design-system.md §6.5](../../reference/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`actors`](../actors/actors.docs.md) — rules attach to named owners, not shared tenets
- [`tldr`](../tldr/tldr.docs.md) — single-line takeaways without justification body
- [`list`](../list/list.docs.md) — items are short bullets without title + body shape
- [`cards-stack`](../cards-stack/cards-stack.docs.md) — each principle needs two sentences of body

## Demo deck

See [principles.gallery.pdf](./principles.gallery.pdf) for rendered examples of every variant.
