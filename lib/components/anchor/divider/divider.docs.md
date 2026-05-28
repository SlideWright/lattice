# divider

> Section boundary slide. Dark canvas with a single heading.

**Function** anchor · **Form** divider · **Substance** prose

Marks the start of a major section. Use sparingly — every divider is a context switch for the audience. A 30-slide deck typically has 3-5 dividers; more becomes navigation noise.

## When to use

- **Major section starts.** Marks the boundary between two themed sections of the deck. The dark canvas is a strong context-switch signal — use it when the audience needs to re-orient.
- **Sparingly.** A 30-slide deck typically has 3-5 dividers. More becomes navigation noise; the signal weakens if every third slide is a divider.
- **With an eyebrow.** An inline-code paragraph above the h1 stamps a section number or category label. Useful for serialized decks where the audience needs to remember which section they're in.

## When NOT to use

- **More than five per deck.** Each divider is a hard context switch. Too many dilutes the signal and slows the audience. Group related content under fewer sections instead.
- **Section title that doesn't earn a section.** If the next 3-4 slides aren't a coherent unit, a subtopic (lighter, on the bright canvas) is the right tool. Reserve dividers for genuine section starts.
- **Header or footer overrides.** Don't reinstate `_header:` or `_footer:` on a divider. The dark canvas is meant to be uninterrupted; chrome belongs on body slides.

## Authoring

```markdown
<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

`Section 01`

# Section name
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `heading` | `h1` | yes | Section name. |
| `eyebrow` | `p > code` | no | Optional section number or category label above h1. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│            [dark background]            │
│                                         │
│               SECTION 02                │
│                                         │
│            Section headline             │
│              ── accent ──               │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `numbered` — Numbered — auto-incrementing section index

Stamps an auto-incrementing section number in the corner. Each divider in the deck increments the counter; closing slides carry an independent counter.

```markdown
<!-- _class: divider silent numbered -->

`Section 03`

# Inventory
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`title`](../../anchor/title/title.docs.md) — opens the deck — same dark-bookend chrome
- [`subtopic`](../../anchor/subtopic/subtopic.docs.md) — lighter mid-section orientation on the bright canvas
- [`closing`](../../anchor/closing/closing.docs.md) — closes the deck — completes the bookend trio

## Demo deck

See [divider.gallery.light.pdf](./divider.gallery.light.pdf) for rendered examples of every variant.
