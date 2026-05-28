# split-brief

> Executive brief — dark left anchor, findings list on the right with left-rule chrome.

**Function** statement · **Form** split · **Substance** structure

Use when one paragraph of executive context needs to read alongside three or four substantiating findings. The dark left panel is the anchor; the right panel is the evidence.

## When to use

- **Executive context + findings.** When the slide needs both a paragraph of framing AND a list of substantiating points. The dark left panel carries the framing; the right list carries the evidence. Pure list (no framing) belongs in `list` or `cards-stack`.
- **Three to four findings.** Sweet spot is 3-4 findings. Fewer wastes the layout's grid; more crowds the right panel and the audience loses scannability.
- **Executive audiences.** The brief shape mirrors how analysts and execs structure memos: thesis on the left, evidence on the right. Reach for split-brief when the deck reads like a memo, not a presentation.

## When NOT to use

- **More than 5 findings.** Past 5 findings, the right panel becomes a wall of bullets and the layout's balance breaks. Split into two slides or use `cards-stack` for a fuller list.
- **Lede that's not a sentence.** The lede is the framing. A fragment or eyebrow-style phrase wastes the role. Write one declarative sentence that sets up why the findings matter.
- **Findings without titles.** The **Title.** at the start of each li is what makes the right panel scannable. A naked sentence per bullet reads as paragraph soup; the bold lead is the structure.

## Authoring

```markdown
<!-- _class: split-brief -->

`Eyebrow context`

## Headline that anchors the brief.

One-sentence framing paragraph explaining what the findings cover.

- **First finding.** Supporting detail explaining the first finding.
- **Second finding.** Supporting detail explaining the second finding.
- **Third finding.** Supporting detail explaining the third finding.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `eyebrow` | `p:first-of-type > code` | no | Optional inline-code eyebrow above the heading. |
| `heading` | `h2` | yes | Heading shown in the dark left anchor. |
| `lede` | `p` | yes | One-sentence framing paragraph under the heading. |
| `findings` | `ul > li` | yes | Right-side findings. Lead each with **Title.** then nested body lines. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  ┌────────────┐                         │
│  │ BRIEF      │  Executive paragraph    │
│  │            │  on the right carries   │
│  │ Brief      │  the body content,      │
│  │ title      │  two or three lines.    │
│  └────────────┘                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`split-list`](../split-list/split-list.docs.md) — the right side is a list of supporting points, not findings
- [`split-statement`](../split-statement/split-statement.docs.md) — the left side carries a quote, not a thesis
- [`cards-stack`](../cards-stack/cards-stack.docs.md) — the slide is mostly the list of findings; no executive framing needed
- [`tldr`](../tldr/tldr.docs.md) — 5+ one-line takeaways without supporting detail

## Demo deck

See [split-brief.gallery.pdf](./split-brief.gallery.pdf) for rendered examples of every variant.
