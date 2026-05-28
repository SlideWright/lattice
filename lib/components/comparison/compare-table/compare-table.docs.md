# compare-table

> Multi-row comparison table with consistent columns.

**Function** comparison · **Form** ledger · **Substance** prose

Use when you have 3+ options or 4+ rows of criteria. Wider data than compare-prose can hold legibly.

## When to use

- **Wider than compare-prose.** Three or more options, or four or more rows of criteria. compare-prose maxes out at two columns and short bodies; compare-table scales further.
- **Cells are short phrases.** Each cell is a value, a phrase, or a state marker — not a paragraph. If the cells need sentences, use `verdict-grid` or `cards-stack`.
- **Stable column meaning.** Every row reads the same way across columns. Mixing column meanings row-to-row breaks the table's scannability.

## When NOT to use

- **Cells full of prose.** Long sentences in a table cell wrap awkwardly and force the column wider. Move to `verdict-grid` for criteria with body text, or `cards-stack` for full prose rows.
- **More than 6 rows.** Past 6 rows the table density crowds the slide. Split into two slides or summarise the rows that don't differentiate.
- **State-marker rows.** When most cells are pass/fail/partial badges, the right layout is `obligation-matrix` or `verdict-grid`. compare-table is for textual values.

## Authoring

```markdown
<!-- _class: compare-table -->

## Heading framing the comparison.

| Criterion | Option A | Option B | Option C |
| --- | --- | --- | --- |
| First criterion | Value | Value | Value |
| Second criterion | Value | Value | Value |
| Third criterion | Value | Value | Value |
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading framing the comparison. |
| `table` | `table` | yes | Markdown table with header row and 2+ data rows. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  LABEL                                  │
│  Here are the numbers side by side.     │
│                                         │
│  ┌───────────┬───────────┬───────────┐  │
│  │           │ Option A  │ Option B  │  │
│  ├───────────┼───────────┼───────────┤  │
│  │ Row 1     │ ✓         │ ✕         │  │
│  │ Row 2     │ ✕         │ ✓         │  │
│  │ Row 3     │ ✓         │ ✓         │  │
│  │ Row 4     │ ⚠         │ ✓         │  │
│  └───────────┴───────────┴───────────┘  │
│  Footnote text for scope caveats.       │
│  footer                          11/19  │
└─────────────────────────────────────────┘
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`compare-prose`](../compare-prose/compare-prose.docs.md) — exactly two options with prose bodies
- [`verdict-grid`](../verdict-grid/verdict-grid.docs.md) — options scored against criteria with pass/partial/fail badges
- [`obligation-matrix`](../obligation-matrix/obligation-matrix.docs.md) — many regimes compared against shared obligations
- [`cards-stack`](../cards-stack/cards-stack.docs.md) — each row needs full-prose breathing room rather than a tabular cell

## Demo deck

See [compare-table.gallery.pdf](./compare-table.gallery.pdf) for rendered examples of every variant.
