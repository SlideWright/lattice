# closing

> Final slide. Dark canvas mirror of title.

**Function** anchor · **Form** bookend · **Substance** prose

**Tags** `summary` · `takeaway` · `board-deck`

Last slide of every deck. Restates the takeaway or call-to-action. Like title, suppresses header/footer/pagination — the dark canvas signals "we're done."

## When to use

- **Last slide of every deck.** Closes the bookend pair with title. Restates the takeaway, the call to action, or the next-steps line. The dark canvas tells the audience visually that the presentation is over.
- **Single takeaway line.** The h1 is the slide. Keep it to one editorial line that summarizes the whole deck or names the action the audience should take. The eyebrow can carry a sub-line or link.
- **Accent modifier for emphasis.** Pair with the universal `accent` modifier to recolor the focal heading. Useful when the closing line is a quote or a key decision the deck has been building toward.

## When NOT to use

- **Multi-line h1.** Keep the closing line to one editorial sentence. The layout is centered and large — two-line closings get cramped and lose impact.
- **Header or footer overrides.** Don't reinstate `_header:` or `_footer:` on the closing. The dark canvas is the "we're done" signal; chrome breaks it. Use the `silent` modifier to suppress all three in one token.
- **Mid-deck closing.** If the audience needs a strong statement mid-deck, use `big-number` or `content` with the `dark` modifier. Reserving closing for the final slide preserves its bookend role.

## Authoring

```markdown
<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Closing takeaway or call to action

`Optional eyebrow`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `heading` | `h1` | yes | Closing line — takeaway, thank-you, or call to action. |
| `eyebrow` | `p > code` | no | Optional category label. |
| `subtitle` | `p` | no | Optional supporting line. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│            [dark background]            │
│                                         │
│                 CLOSING                 │
│                                         │
│             Take this away              │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `numbered` — Numbered — independent closing counter

Stamps an auto-incrementing closing number, independent of the divider section counter. Useful for serialized deck families where each deck closes on numbered note `Closing 04`.

```markdown
<!-- _class: closing silent numbered -->

# Take this away.

`Closing 04`
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`title`](../../anchor/title/title.docs.md) — opens the deck — same dark-bookend chrome
- [`divider`](../../anchor/divider/divider.docs.md) — mid-deck section breaks — same dark canvas
- [`big-number`](../../statement/big-number/big-number.docs.md) — single emphatic statement mid-deck without the bookend signal

## Demo deck

See [closing.gallery.light.pdf](./closing.gallery.light.pdf) for rendered examples of every variant.
