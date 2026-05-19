# subtopic

> Sub-section boundary — lighter than divider, no canvas reskin.

**Function** anchor · **Form** divider · **Substance** prose

Introduces a specific topic within a section. Use between divider and content slides for finer orientation. Same light canvas as content slides, centered heading, no special background — a lighter cousin to the dark divider.

## When to use

- **Between divider and content.** After the dark divider opens a section, a subtopic narrows the focus to one specific topic before the audience hits the first content slide. Finer-grained orientation.
- **Lighter than divider.** Same bright canvas as body slides — keeps the visual rhythm intact while still signaling a topic shift. Lighter context-switch cost than a divider.
- **Eyebrow names the topic family.** The inline-code paragraph above the heading is the breadcrumb. "Section 02 · Module 03" tells the audience exactly where they are in the deck's hierarchy.

## When NOT to use

- **Used as a divider replacement.** If the next slides are an entirely new section, reach for divider (dark canvas, h1). Subtopic is for sub-section orientation, not section starts.
- **Stacked subtopics.** Two subtopic slides back-to-back means the first didn't introduce anything. Merge them or move directly to content.
- **h1 instead of h2.** The layout expects h2 (subtopic name is one level below the section title). Promoting to h1 makes the slide compete visually with the divider.

## Authoring

```markdown
<!-- _class: subtopic -->

`Topic family`

## Sub-topic name.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `heading` | `h2` | yes | Sub-topic name. |
| `eyebrow` | `p > code` | no | Optional eyebrow label above h2. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                MODULE 03                │
│                                         │
│            Sub-topic heading            │
│          One-line orientation           │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `numbered` — Numbered — auto-incrementing module index

Stamps an auto-incrementing module number. Each subtopic carries an independent counter from divider's section counter, so "Section 02 · Module 04" makes sense.

```markdown
<!-- _class: subtopic numbered -->

`Module 04`

## Then the next sub-topic, numbered automatically.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`divider`](../divider/divider.docs.md) — major section starts — darker, h1, dedicated canvas
- [`title`](../title/title.docs.md) — opens the deck — same dark-bookend chrome as divider
- [`content`](../content/content.docs.md) — the body slides that follow a subtopic

## Demo deck

See [subtopic.gallery.pdf](./subtopic.gallery.pdf) for rendered examples of every variant.
