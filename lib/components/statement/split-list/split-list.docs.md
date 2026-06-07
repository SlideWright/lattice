# split-list

> Featured left panel + supporting list on the right.

**Function** statement · **Form** panel · **Substance** structure

**Tags** `overview` · `walkthrough` · `showcase`

Use when one prominent statement deserves a dark sidebar and the right side carries the substantiating points.

## When to use

- **Thesis plus proof.** One bold claim deserves dedicated visual weight on the left; supporting points sit to the right. Use when the audience needs to hear the claim before the evidence.
- **Section openers with substance.** More substantive than a divider, but still anchored by a single statement. Three to five supporting points keep the panel from feeling cluttered.
- **Mirror for image-heavy decks.** The `mirror` variant flips the panel to the right. Useful when the deck's visual rhythm wants accents on alternating sides.

## When NOT to use

- **Longer than five points — hard limit.** The layout holds exactly 3–5 points. This is a structural constraint, not a preference: beyond five the panel and list lose balance and the right column overflows. Move to `cards-stack` for longer lists or split into two slides. Do not stretch to six.
- **No panel headline.** The dark panel exists to carry a statement. An empty or generic heading wastes the strongest visual real estate on the slide. The `panel-heading` slot is required; there is no valid rendering without it.
- **Stacking many split-list slides in a row.** The dark sidebar is a strong visual signal. Three split-list slides back-to-back numbs the audience to it. Intersperse with content or stats.

## Authoring

```markdown
<!-- _class: split-list -->

## Panel headline that frames the side points.

### Section rubric

- First point
  - Supporting sentence explaining the first point.
- Second point
  - Supporting sentence explaining the second point.
- Third point
  - Supporting sentence explaining the third point.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `panel-heading` | `h2` | yes | Heading shown in the dark left panel. |
| `panel-eyebrow` | `h3` | no | Optional rubric — a section label that renders in the RIGHT content panel above the points list (despite the slot name, it is not a left-panel eyebrow). |
| `intro` | `p` | no | Optional framing sentence in the right panel, between the section rubric and the list. One sentence maximum, 1–2 lines. More than two lines crowds the list and should become a separate slide. |
| `points` | `ul > li` | yes | Right-side supporting points. Lead each with **Label.** then body text. Hard limit: 3–5 items. Fewer than three feels sparse; more than five breaks the panel-to-list balance — use `cards-stack` instead. |
| `meta` | `section :is(ul,ol) + ul` | no | Optional metadata footer. A SECOND bullet list placed after the points list (separate the two with an HTML comment so markdown does not merge them). Its first two items pin to the bottom of the right panel with injected 'Audience ·' and 'Intent ·' labels. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  ┌────────────┐                         │
│  │ EYEBROW    │  Section heading        │
│  │            │                         │
│  │ Panel      │  - Point one            │
│  │ title      │  - Point two            │
│  │            │  - Point three          │
│  └────────────┘                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `mirror` — Mirror — panel on the right

Flips the dark accent panel from the left to the right. Use when the deck's visual rhythm wants alternating accent sides, or when the right-to-left reading flow suits the claim.

```markdown
<!-- _class: split-list mirror -->

## And the same claim, now with the panel on the right.

### Use when

- Decks with image slides
  - Image bleed sits left; the panel reads as a closing statement on the right.
- Alternating visual rhythm
  - Pair a default split-list and a mirrored one across a section to keep the eye moving.
- Right-to-left framing
  - The argument reads more naturally when the claim follows the evidence rather than preceding it.
```

### `dense` — Dense — strip card chrome, hairline separators

Removes background, border, and border-radius from items; replaces card chrome with thin hairline separators. Shifts register from 'substantive points' to 'index / table of contents'. Fits 7–8 items comfortably.

```markdown
<!-- _class: split-list dense -->

## Seven items without chrome.

### Index register

1. First item
   - One-line description.
2. Second item
   - One-line description.
3. Third item
   - One-line description.
```

### `columns` — Columns — two-column right panel

Places list items in a two-column grid. Capacity doubles. Read order is top-to-bottom within each column, left column then right. Use for 6–8 parallel items of similar length.

```markdown
<!-- _class: split-list columns -->

## Eight items across two columns.

### Column layout

- First
  - One line.
- Second
  - One line.
- Third
  - One line.
- Fourth
  - One line.
- Fifth
  - One line.
- Sixth
  - One line.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`split-statement`](../../statement/split-statement/split-statement.docs.md) — thesis + one big-number — quantitative version of split-list
- [`split-brief`](../../statement/split-brief/split-brief.docs.md) — title-style left + executive paragraph right
- [`big-number`](../../statement/big-number/big-number.docs.md) — single statement, no supporting list — the full-canvas version
- [`cards-stack`](../../inventory/cards-stack/cards-stack.docs.md) — the right-side list grows past four points

## Demo deck

See [split-list.gallery.light.pdf](./split-list.gallery.light.pdf) for rendered examples of every variant.
