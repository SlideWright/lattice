# agenda

> Auto-numbered table of contents for the deck.

**Function** inventory · **Form** stack · **Substance** structure

Use as the second slide of any multi-section deck. Numbers are generated; authors just write the section titles.

## When to use

- **Second slide of the deck.** Right after the title, before the first section. Orients the audience and sets the cadence of what's coming.
- **Three to six sections.** Sweet spot is four. Past six sections the list crowds and the audience stops counting. Roll up or split the deck.
- **Reuse with progress variants.** Drop the same agenda between sections with `progress-N` to show how far through the deck the room is. Lightweight wayfinding.

## When NOT to use

- **Sub-bullets per section.** The agenda is a wayfinder, not a treatment. If a section needs decomposition, that belongs on a subtopic divider when the section opens — not here.
- **Unnumbered list.** Authoring with `-` instead of `1.` loses the numbered chrome the layout depends on. Always use ordered list syntax.
- **Single-section decks.** If the deck has no sections to enumerate, skip the agenda. Empty wayfinding is more friction than no wayfinding.

## Authoring

```markdown
<!-- _class: agenda -->

## What this deck covers.

1. First section title
2. Second section title
3. Third section title
4. Fourth section title
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading — typically 'Agenda' or 'What we'll cover'. |
| `items` | `ol > li` | yes | Ordered list of section titles. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Agenda heading.                        │
│                                         │
│  01  First section topic                │
│  02  Second section topic               │
│  03  Third section topic                │
│  04  Fourth section topic               │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `progress-1` — Progress · section 1

Wayfinding for the start of the deck — the first item is current, the rest are dimmed ahead.

```markdown
<!-- _class: agenda progress-1 -->

## Where we are now.

1. The four-layer model — Function · Form · Substance · Finish
2. Component manifests — the single source of truth
3. The shipped components, grouped by function
4. Discovery — scaffolder, snippets, this gallery
5. What ships next — open questions and follow-ups
```

### `progress-2` — Progress · section 2

The same agenda dropped between sections one and two — the second item is marked as the current position.

```markdown
<!-- _class: agenda progress-2 -->

## Where we are now.

1. The four-layer model — Function · Form · Substance · Finish
2. Component manifests — the single source of truth
3. The forty-five shipped components, grouped by function
4. Discovery — scaffolder, snippets, this gallery
5. What ships next — open questions and follow-ups
```

### `progress-3` — Progress · section 3

Same wayfinding pattern, current position moved to the third item.

```markdown
<!-- _class: agenda progress-3 -->

## Where we are now.

1. The four-layer model — Function · Form · Substance · Finish
2. Component manifests — the single source of truth
3. The forty-five shipped components, grouped by function
4. Discovery — scaffolder, snippets, this gallery
5. What ships next — open questions and follow-ups
```

### `progress-4` — Progress · section 4

Current position on the fourth item — three sections done, two to go.

```markdown
<!-- _class: agenda progress-4 -->

## Where we are now.

1. The four-layer model — Function · Form · Substance · Finish
2. Component manifests — the single source of truth
3. The forty-five shipped components, grouped by function
4. Discovery — scaffolder, snippets, this gallery
5. What ships next — open questions and follow-ups
```

### `progress-5` — Progress · section 5

Current position on the fifth item — the last section opening, used as a final wayfinder before the closing.

```markdown
<!-- _class: agenda progress-5 -->

## Where we are now.

1. The four-layer model — Function · Form · Substance · Finish
2. Component manifests — the single source of truth
3. The forty-five shipped components, grouped by function
4. Discovery — scaffolder, snippets, this gallery
5. What ships next — open questions and follow-ups
```

### `progress-6` — Progress · section 6

Same wayfinding pattern on a six-section agenda — current position at the sixth and final item.

```markdown
<!-- _class: agenda progress-6 -->

## Where we are now.

1. Why we're here — the problem
2. Where we are today
3. The proposal
4. Migration plan
5. Risks and mitigations
6. Decision and next steps
```

### `progress-7` — Progress · section 7

Current position at the seventh of seven sections.

```markdown
<!-- _class: agenda progress-7 -->

## Where we are now.

1. Why we're here — the problem
2. Where we are today
3. The proposal
4. Migration plan
5. Risks and mitigations
6. Cost and timeline
7. Decision and next steps
```

### `progress-8` — Progress · section 8

Current position at the eighth of eight sections.

```markdown
<!-- _class: agenda progress-8 -->

## Where we are now.

1. Why we're here — the problem
2. Where we are today
3. The proposal
4. Migration plan
5. Risks and mitigations
6. Cost and timeline
7. Team and ownership
8. Decision and next steps
```

### `progress-9` — Progress · section 9

Current position at the ninth of nine sections — the maximum a single agenda comfortably holds.

```markdown
<!-- _class: agenda progress-9 -->

## Where we are now.

1. Why we're here — the problem
2. Where we are today
3. The proposal
4. Migration plan
5. Risks and mitigations
6. Cost and timeline
7. Team and ownership
8. Open questions
9. Decision and next steps
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [reference/design-system.md §6.5](../../reference/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`subtopic`](../subtopic/subtopic.docs.md) — opening a single section mid-deck
- [`divider`](../divider/divider.docs.md) — marking a section boundary without restating the menu
- [`tldr`](../tldr/tldr.docs.md) — closing the deck with the takeaways the agenda promised
- [`title`](../title/title.docs.md) — the slide immediately preceding the agenda

## Demo deck

See [agenda.gallery.pdf](./agenda.gallery.pdf) for rendered examples of every variant.
