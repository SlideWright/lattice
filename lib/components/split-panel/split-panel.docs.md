# split-panel

> Featured left panel + supporting list on the right.

**Function** statement · **Form** panel · **Substance** structure

Use when one prominent statement deserves a dark sidebar and the right side carries the substantiating points.

## When to use

- **Thesis plus proof.** One bold claim deserves dedicated visual weight on the left; supporting points sit to the right. Use when the audience needs to hear the claim before the evidence.
- **Section openers with substance.** More substantive than a divider, but still anchored by a single statement. Three to four supporting points keep the panel from feeling cluttered.
- **Mirror for image-heavy decks.** The `mirror` variant flips the panel to the right. Useful when the deck's visual rhythm wants accents on alternating sides.

## When NOT to use

- **Longer than four points.** If the right side runs past four points, the panel and list lose balance. Move to `cards-stack` for longer lists or split into two slides.
- **No panel headline.** The dark panel exists to carry a statement. An empty or generic heading wastes the strongest visual real estate on the slide.
- **Stacking many split-panel slides in a row.** The dark sidebar is a strong visual signal. Three split-panel slides back-to-back numbs the audience to it. Intersperse with content or stats.

## Authoring

```markdown
<!-- _class: split-panel -->

## Panel headline that frames the side points.

### Section rubric

- **First point.** Supporting sentence explaining the first point.
- **Second point.** Supporting sentence explaining the second point.
- **Third point.** Supporting sentence explaining the third point.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `panel-heading` | `h2` | yes | Heading shown in the dark left panel. |
| `panel-eyebrow` | `h3` | no | Optional rubric label below the panel heading. |
| `points` | `ul > li` | yes | Right-side supporting points. Lead each with **Label.** then body text. |

## Variants (layout-specific)

### `mirror` — Mirror — panel on the right

Flips the dark accent panel from the left to the right. Use when the deck's visual rhythm wants alternating accent sides, or when the right-to-left reading flow suits the claim.

```markdown
<!-- _class: split-panel mirror -->

## And the same claim, now with the panel on the right.

### Use when

- **Decks with image slides.** Image bleed sits left; the panel reads as a closing statement on the right.
- **Alternating visual rhythm.** Pair a default split-panel and a mirrored one across a section to keep the eye moving.
- **Right-to-left framing.** The argument reads more naturally when the claim follows the evidence rather than preceding it.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, decoration backgrounds). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`split-statement`](../split-statement/split-statement.docs.md) — thesis + one big-number — quantitative version of split-panel
- [`split-brief`](../split-brief/split-brief.docs.md) — title-style left + executive paragraph right
- [`big-number`](../big-number/big-number.docs.md) — single statement, no supporting list — the full-canvas version
- [`cards-stack`](../cards-stack/cards-stack.docs.md) — the right-side list grows past four points

## Demo deck

See [split-panel.gallery.pdf](./split-panel.gallery.pdf) for rendered examples of every variant.
