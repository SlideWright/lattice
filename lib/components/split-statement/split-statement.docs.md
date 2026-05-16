# split-statement

> Pull quote — half the slide committed to one quoted idea on a dark left panel, supporting list on the right.

**Function** statement · **Form** split · **Substance** structure

Use when one quotation deserves the full attention of a slide and the implications need spelling out. Distinct from `quote` (which is the whole slide); split-statement gives equal room to quote and consequences.

## When to use

- **Quote + implications.** When a quotation matters AND you need to spell out the consequences alongside it. Pure quote (no implications) → `quote` slide. Pure list (no quote) → `cards-stack`. split-statement is the hybrid.
- **Expert claims that argue for action.** Customer voice, analyst quote, founder principle — the kind of phrase that ought to drive a decision. The right panel makes the decision explicit so the audience doesn't have to infer it.
- **Two-line quotation max.** The left panel is large but not infinite. Past two sentences the italic display font crowds. Trim the quote or split into a `quote` slide followed by an `cards-stack` of implications.

## When NOT to use

- **Implications that just paraphrase the quote.** If the right-panel bullets are restating what the quote said, the slide is doing two jobs that should be one. Either trust the quote (use `quote`) or make implications that genuinely extend it.
- **Quote shorter than the implications.** When the quote is one phrase and the right panel has three paragraphs of body, the visual balance breaks. Either lengthen the quote (within reason) or move to `split-brief` (lede + findings).
- **No attribution.** The inline-code cite line is what makes a pull quote credible. An unattributed quote in a deck reads as the author's invention; attribution earns the visual weight.

## Authoring

```markdown
<!-- _class: split-statement -->

> The quotation, one or two sentences worth committing half the slide to.

`Speaker · Role, Organisation, Year`

- **First implication.** What this quote means for the work in front of us.
- **Second implication.** A second-order consequence worth naming.
- **Third implication.** The action this quote argues for.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `quotation` | `blockquote` | yes | The pull quote — one or two sentences, italic display font in the dark left panel. |
| `cite` | `p:first-of-type > code` | no | Optional attribution in an inline-code paragraph after the blockquote. |
| `implications` | `ul > li` | yes | Right-side supporting points. Lead each with **Title.** then nested body. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  ┌────────────┐                         │
│  │            │  ┌─────────┐            │
│  │ Claim on   │  │   42×   │            │
│  │ the left   │  └─────────┘            │
│  │            │  Caption beside it      │
│  └────────────┘                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, decoration backgrounds). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`quote`](../quote/quote.docs.md) — the quote IS the slide — no implications needed
- [`split-brief`](../split-brief/split-brief.docs.md) — the left carries a thesis statement, not a quote
- [`split-panel`](../split-panel/split-panel.docs.md) — the right side is supporting points, no quoted claim on the left

## Demo deck

See [split-statement.gallery.pdf](./split-statement.gallery.pdf) for rendered examples of every variant.
