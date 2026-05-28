# verdict-grid

> Options scored against criteria as a verdict matrix.

**Function** comparison · **Form** grid · **Substance** structure

Use to evaluate 2–4 options against the same set of criteria, with pass/partial/fail badges. Each card represents one option; badges per criterion.

## When to use

- **Two to four options.** Each card is one option; the grid keeps two cards per row. Past four options the cards crowd and the criteria badges lose legibility.
- **Shared criteria across cards.** Every option is scored on the same set of criteria, in the same order. Drifting criteria between cards defeats the at-a-glance scan the layout exists for.
- **Pass / partial / fail grammar.** Criteria use the universal `[x]` / `[-]` / `[ ]` / `[/]` state markers — shared with `checklist` and `obligation-matrix`. The badge chrome handles the rest.

## When NOT to use

- **Exactly two options.** Two options with shared criteria belong in `compare-prose` or `split-compare`. verdict-grid earns its layout at 3+ options.
- **Free-form text on the badge line.** Each inner bullet starts with a state marker, not a sentence. Naked prose breaks the badge chrome and the criteria stop scanning as a row.
- **Cards with different criteria.** When each option needs its own criteria list, the comparison fails — use `cards-stack` so each card has full prose breathing room instead.

## Authoring

```markdown
<!-- _class: verdict-grid -->

## Which option meets the criteria.

- **First option.**
  - [x] First criterion
  - [-] Second criterion
  - [ ] Third criterion
- **Second option.**
  - [x] First criterion
  - [x] Second criterion
  - [-] Third criterion
- **Third option.**
  - [ ] First criterion
  - [-] Second criterion
  - [x] Third criterion
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the choice. |
| `options` | `ul > li` | yes | Outer li per option, lead with **Option name.**. Inner li per criterion, prefixed with [x]/[-]/[ ] then the criterion text. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Verdict grid heading.                  │
│                                         │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Option A [x] │     │ Option B [-] │  │
│  │ rationale    │     │ rationale    │  │
│  └──────────────┘     └──────────────┘  │
│  ┌──────────────┐     ┌──────────────┐  │
│  │ Option C [ ] │     │ Option D [x] │  │
│  └──────────────┘     └──────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`compare-prose`](../../comparison/compare-prose/compare-prose.docs.md) — exactly two options with prose bodies
- [`split-compare`](../../comparison/split-compare/split-compare.docs.md) — two options with a bottom verdict bar
- [`obligation-matrix`](../../legal/obligation-matrix/obligation-matrix.docs.md) — many regimes scored on shared obligations in a table
- [`compare-table`](../../comparison/compare-table/compare-table.docs.md) — cells are textual values, not state markers
- [`checklist`](../../inventory/checklist/checklist.docs.md) — one set of criteria, not many options against them

## Demo deck

See [verdict-grid.gallery.light.pdf](./verdict-grid.gallery.light.pdf) for rendered examples of every variant.
