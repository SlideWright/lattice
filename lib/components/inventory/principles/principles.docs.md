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

### `lettered` — Lettered

Swaps the decimal counter for an A. / B. / C. letter sequence. Use when the principles are referenced by letter elsewhere in the deck or discussion.

```markdown
<!-- _class: principles lettered -->

## How we make calls when the spec is silent.

- **Default to the cheaper-to-reverse choice.** Reversible calls don't need a meeting; only the irreversible ones do.
- **Name the actor, never the system.** "The PM decides" lands; "the process decides" hides accountability.
- **Write the bet on the same slide as the choice.** The decision and its predicted outcome live together — the calibration loop depends on it.
- **Form follows function.** Let the audience's need shape the layout, not the other way around.
- **One main idea per slide.** If you can't summarise it in one sentence, split it across two.
```

### `roman` — Roman

Numbers the principles with lower-case Roman numerals (i, ii, iii). Reads as a more formal canon — house rules, doctrine, a charter.

```markdown
<!-- _class: principles roman -->

## The editorial canon.

- **Plain words beat clever ones.** If a board member needs a glossary, the slide failed.
- **One claim per sentence.** Compound claims hide the one a reader would dispute.
- **Show the number, then the verdict.** Evidence first earns the conclusion that follows.
- **Cut the adverb, keep the verb.** "Grew sharply" is weaker than "doubled."
- **End on the decision, not the summary.** The last slide should ask for something.
```

### `bullet` — Bullet

Drops the numeric counter for a plain bullet. Use when the principles are a set with no rank or sequence — order carries no meaning.

```markdown
<!-- _class: principles bullet -->

## What we optimise for, in no particular order.

- **Reversibility over consensus.** Make the cheap-to-undo call now; reserve the meeting for the one-way doors.
- **Clarity over completeness.** A slide that says one true thing beats one that says five hedged ones.
- **Ownership over process.** Name the person; processes don't get paged.
- **Evidence over instinct.** Write the prediction down so the instinct can be scored later.
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
