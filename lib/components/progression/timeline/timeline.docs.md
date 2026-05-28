# timeline

> Horizontal ordered steps along a single axis, each a labeled dot.

**Function** progression · **Form** timeline · **Substance** structure

Use for sequential processes with 3–6 stages. Ordered list (ol) renders numbered circles; unordered (ul) renders plain dots.

## When to use

- **Short labels on a horizontal axis.** When each stage is a short label plus a sentence — the audience reads the whole sequence as a single arc. Richer per-step bodies belong in `list-steps`.
- **Three to six stages.** Below three the axis feels under-furnished; above six the dots crowd and the labels collide. Group adjacent stages or split into two slides.
- **Ordered or unordered.** Use `ol` for numbered circles (sequence is the point); use `ul` for plain dots (the stages are a journey rather than a ranked sequence).

## When NOT to use

- **Long body per step.** If each stage needs a paragraph, lift to `list-steps` where the cards have body room. Prose crammed into a timeline label crowds the axis.
- **Parallel options, not sequence.** If the items are alternatives rather than ordered stages, use `cards-grid`. The horizontal axis here reads as time.
- **Past six stages.** More than six dots compresses the axis and the labels collide. Split into two slides or roll up adjacent stages.

## Authoring

```markdown
<!-- _class: timeline -->

## How the process flows.

1. **First stage**
   - *Short description of what happens here.*
2. **Second stage**
   - *Short description.*
3. **Third stage**
   - *Short description.*
4. **Fourth stage**
   - *Short description.*
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the process. |
| `steps` | `ol > li, ul > li` | yes | One li per step. Lead each with **Step label** then a nested bullet for the description. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│            Timeline heading             │
│                                         │
│       [Q1   ] → [Q2   ] → [Q3   ]       │
│                                         │
│    signal  →  decision  →  outcome      │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`list-steps`](../list-steps/list-steps.docs.md) — each step needs body-paragraph room, not just a label
- [`split-steps`](../split-steps/split-steps.docs.md) — a phase anchor + heading reads on the left, steps on the right
- [`journey`](../journey/journey.docs.md) — each step carries actors and mood, not just a label
- [`gantt`](../gantt/gantt.docs.md) — tasks have duration and overlap across multiple workstreams
- [`roadmap`](../roadmap/roadmap.docs.md) — phased grid across multiple workstreams rather than a single axis

## Demo deck

See [timeline.gallery.pdf](./timeline.gallery.pdf) for rendered examples of every variant.
