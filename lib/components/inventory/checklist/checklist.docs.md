# checklist

> Items with state markers — done, partial, todo.

**Function** inventory · **Form** stack · **Substance** structure

Use for completion reports, readiness audits, or pre-flight checks. State markers [x]/[-]/[ ] produce green/amber/red glyphs.

## When to use

- **Completion reports.** Use when the audience needs to see what's done, what's in progress, and what's outstanding. The state glyphs are the load-bearing signal.
- **Readiness audits.** Pre-launch, pre-release, pre-flight. A short list where the mix of green / amber / red tells the room whether to proceed.
- **Five to eight items.** Short enough that the audience can take in the state mix at a glance. Past eight, split into two checklists by phase or owner.

## When NOT to use

- **All-done lists.** If every item is `[x]` the state markers are decoration. Use `list` or `tldr` for celebratory recaps; checklist earns its weight when the mix matters.
- **Long per-item prose.** Each item is one short line. If a row needs a sentence of explanation, the right home is cards-stack or list-tabular.
- **Custom state markers.** Only `[x]`, `[-]`, and `[ ]` map to the glyph palette. Authoring `[?]` or `[!]` renders as literal text and breaks the visual contract.

## Authoring

```markdown
<!-- _class: checklist -->

## Pre-launch readiness.

- [x] First item that is fully done.
- [x] Second item that is fully done.
- [-] Third item that is partially complete with a caveat.
- [ ] Fourth item that is not yet started.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading. |
| `items` | `ul > li` | yes | Each item prefixed with [x] (done), [-] (partial), or [ ] (todo). Plain text follows the marker. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Checklist heading.                     │
│                                         │
│  [x] Completed item — green tint        │
│  [-] Partial item — amber tint          │
│  [ ] Open item — red tint               │
│  [x] Another completed item             │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`list`](../list/list.docs.md) — items have no state — just bullets
- [`tldr`](../tldr/tldr.docs.md) — summary lines without per-item completion tracking
- [`list-tabular`](../list-tabular/list-tabular.docs.md) — rows need a label-plus-description structure, not state
- [`cards-stack`](../cards-stack/cards-stack.docs.md) — each item needs two sentences of body

## Demo deck

See [checklist.gallery.pdf](./checklist.gallery.pdf) for rendered examples of every variant.
