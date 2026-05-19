# split-steps

> Sequential process — phase label + heading on the left, numbered step timeline on the right with a connecting line.

**Function** progression · **Form** split · **Substance** structure

Use when a multi-step process needs a phase anchor (week N, sprint, milestone) alongside the ordered steps that compose it. Ordered list renders with auto-numbered discs; unordered list uses plain discs.

## When to use

- **Phase anchor on the left, steps on the right.** When a phase number, name, and intro paragraph need to read alongside the ordered steps that compose it. The left panel is the orientation; the right panel is the work.
- **Three to five steps per phase.** Below three the right panel feels under-furnished; above five the timeline spine compresses and the body lines run together. Group adjacent steps or split into two phase slides.
- **Phase chip names the slot.** The inline-code phase chip (`01`, `02`, `Sprint 3`, `Week 4`) becomes the decorative left-panel watermark. Pick a chip the audience can recognise from a deck cover or roadmap.

## When NOT to use

- **Standalone process, no phase anchor.** If the slide is one ordered process with no phase context, use `list-steps` or `timeline`. split-steps earns its split only when the left panel adds orientation.
- **Steps longer than two sentences.** Each right-side step is a title plus a sentence or two. If a step needs a paragraph, lift to `list-steps` where the cards have body room.
- **More than one phase per slide.** split-steps is one phase per slide; the watermark and intro paragraph anchor that single phase. Use consecutive split-steps slides for sequential phases.

## Authoring

```markdown
<!-- _class: split-steps -->

`02`

## Phase name

One-sentence summary describing what this phase produces.

1. **First step.** What happens and what gets produced.
2. **Second step.** What follows and how it's validated.
3. **Third step.** What closes the phase out.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `phase` | `p:first-of-type > code` | no | Optional inline-code phase number or label (e.g. '02'). |
| `heading` | `h2` | yes | Phase heading shown over the watermark phase number. |
| `summary` | `p` | yes | One-sentence summary of what this phase covers. |
| `steps` | `ol > li` | yes | Right-side steps. Use ordered list for numbered discs; lead each with **Title.** then nested body. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  ┌────────────┐                         │
│  │ PHASE      │  01  First step here    │
│  │            │  02  Second step here   │
│  │ Title      │  03  Third step here    │
│  │            │  04  Fourth step here   │
│  └────────────┘                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`list-steps`](../list-steps/list-steps.docs.md) — standalone ordered process without a phase anchor
- [`timeline`](../timeline/timeline.docs.md) — horizontal sequence of short-labelled steps
- [`roadmap`](../roadmap/roadmap.docs.md) — phased grid across multiple workstreams
- [`split-list`](../split-list/split-list.docs.md) — left-anchor + right-list shape without a step sequence
- [`split-brief`](../split-brief/split-brief.docs.md) — executive framing with substantiating findings rather than steps

## Demo deck

See [split-steps.gallery.pdf](./split-steps.gallery.pdf) for rendered examples of every variant.
