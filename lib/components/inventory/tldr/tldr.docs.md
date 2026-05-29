# tldr

> Single-line takeaways — the deck or section's headline points.

**Function** inventory · **Form** stack · **Substance** structure

**Tags** `summary` · `takeaway` · `overview`

Use at the end of a section or deck to restate the takeaways in one line each. Each line should be a complete claim, not a category label.

## When to use

- **Section or deck recap.** Use at the close of a section or the end of the deck to restate what the room should walk out remembering. The audience reads it as 'if you forget everything else, remember this.'
- **Complete one-line claims.** Each line is a full claim the audience could quote back — not a category label or a bullet of jargon. If a line needs context, split it into two slides or pick a richer layout.
- **Four to six lines.** Sweet spot is five. Past six the recap stops feeling like a tldr and starts feeling like a list. Trim or split across two tldr slides.

## When NOT to use

- **Category labels, not claims.** "Pricing" or "Architecture" wastes the slot — the audience can't act on a label. Each line is the claim itself: "Pricing simplifies to three tiers," not "Pricing."
- **Wall of long lines.** Past about fifteen words the line stops scanning and the recap reads as paragraph soup. Trim ruthlessly or move the longer item to its own subtopic slide.
- **Mid-deck use.** tldr earns its weight at the end. In the middle of a deck it pre-empts the section it's recapping. Use subtopic to open a section and tldr to close it.

## Authoring

```markdown
<!-- _class: tldr -->

## What this section showed.

- The first takeaway as a complete one-line claim.
- The second takeaway as a complete one-line claim.
- The third takeaway as a complete one-line claim.
- The fourth takeaway as a complete one-line claim.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading — typically 'In summary' or 'What this means'. |
| `lines` | `ul > li` | yes | One line per takeaway. Keep each under ~15 words. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  TL;DR heading.                         │
│                                         │
│  — First takeaway, single line.         │
│  — Second takeaway, single line.        │
│  — Third takeaway, single line.         │
│  — Fourth takeaway, single line.        │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `numbered` — Numbered takeaways

Authored as `ol` (`1.` source). Adds a `01.`, `02.` counter prefix to each line — useful when the recap doubles as a numbered set the audience can reference back to.

```markdown
<!-- _class: tldr numbered -->

## Five takeaways from this section.

1. Components stay short — `cards-grid` not `inventory.grid.cards`.
2. The four layers organise the catalog; they do not name components.
3. Manifests are the single source of truth for every component.
4. Discovery happens via the scaffolder and IDE snippets, not the directive.
5. Forty-five components ship — one folder each.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`list`](../../inventory/list/list.docs.md) — lines are general bullets, not section takeaways
- [`principles`](../../inventory/principles/principles.docs.md) — each line is a stated rule with a justification body
- [`closing`](../../anchor/closing/closing.docs.md) — the slide is the deck's final word, not a section recap
- [`agenda`](../../inventory/agenda/agenda.docs.md) — previewing what's coming at the top of the deck

## Demo deck

See [tldr.gallery.light.pdf](./tldr.gallery.light.pdf) for rendered examples of every variant.
