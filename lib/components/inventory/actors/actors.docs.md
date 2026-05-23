# actors

> Roster of responsibilities owned by named actors.

**Function** inventory · **Form** ledger · **Substance** structure

Use to show 'who owns what' across a process, codebook, or org chart. Two-column layout: actor on left, responsibilities on right.

## When to use

- **Who owns what.** Each row pairs a named actor with the slice of work they own. Use when the audience needs to know accountability, not process flow.
- **Three to six actors.** The ledger reads cleanly up to about six rows. Past that, split the roster across two slides or roll up adjacent roles.
- **One-line responsibilities.** Each actor's body is a short responsibility summary, not a job description. Detail belongs on a follow-up slide or in an appendix.

## When NOT to use

- **Process sequence.** If the rows describe stages in order, use list-steps or process-flow. actors is for parallel ownership, not handoff sequence.
- **Long per-actor prose.** More than one sentence per row crowds the ledger. Move the detail to a dedicated slide and keep actors as the index.
- **Roles without names.** If the labels are job titles in the abstract ("the engineer"), reach for cards-stack or list. The actors layout earns its weight when the names are named.

## Authoring

```markdown
<!-- _class: actors -->

## Who owns each part of the process.

- **First actor.** Owns the first part of the lifecycle.
- **Second actor.** Owns the second part.
- **Third actor.** Owns the third part.
- **Fourth actor.** Owns the fourth part.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading. |
| `rows` | `ul > li` | yes | One row per actor. Lead each li with **Actor Name.** then a short responsibility summary. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Actors heading.                        │
│                                         │
│  Role A    Owner name                   │
│            - responsibility one         │
│  Role B    Owner name                   │
│            - responsibility two         │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [reference/design-system.md §6.5](../../reference/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`list-tabular`](../list-tabular/list-tabular.docs.md) — rows are reference entries, not owners
- [`cards-stack`](../cards-stack/cards-stack.docs.md) — each item needs two sentences of body text
- [`principles`](../principles/principles.docs.md) — stating shared rules rather than per-actor responsibilities
- [`glossary`](../glossary/glossary.docs.md) — the left column is a term, not an actor

## Demo deck

See [actors.gallery.pdf](./actors.gallery.pdf) for rendered examples of every variant.
