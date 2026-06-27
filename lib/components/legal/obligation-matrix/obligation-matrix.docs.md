# obligation-matrix

> Regulation × obligation grid — state-marker cells encode applies / partial / exempt at a glance.

**Function** comparison · **Form** matrix · **Substance** structure

**Tags** `compliance` · `regulation` · `stoplight`

Use when many regimes need comparing across the same obligations. Cells carry the universal state-token grammar ([x] applies, [-] partial, [ ] exempt, [/] out of scope) shared with checklist / verdict-grid / roadmap.

## When to use

- **Many regimes, shared obligations.** Three or more regulations or jurisdictions compared across the same set of duties. The grid lets the reader scan a row to know a regime and a column to know an obligation.
- **State markers, not values.** Cells are pass/partial/fail/skip — the universal `[x]` / `[-]` / `[ ]` / `[/]` grammar. For textual cell values use `compare-table`.
- **Risk axis with heat.** The `heat` variant flips the palette so applies = alarm and exempt = relief. Use when the matrix is read for exposure, not for coverage.

## When NOT to use

- **Two regimes only.** Past one row vs another the grid loses its purpose. Use `compare-prose` or `compare-table` for two-regime comparisons.
- **Mixed cell content.** Don't mix state markers with prose values in the same matrix — the cell width has to grow to fit prose and the marker grid collapses. Pick one cell type.
- **Missing legend.** The trailing paragraph naming filled/half/empty is what onboards a first-time reader. Skipping it forces the audience to guess the mapping.

## Authoring

```markdown
<!-- _class: obligation-matrix -->

## Headline framing what the matrix compares.

| Regulation | Obligation A | Obligation B | Obligation C |
| ---------- | :----------: | :----------: | :----------: |
| Regime 1   | [x]          | [x]          | [-]          |
| Regime 2   | [x]          | [-]          | [x]          |
| Regime 3   | [x]          | [ ]          | [x]          |

Filled = applies, half = partial, empty = exempt.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `heading` | `h2` | yes | Slide heading framing what the matrix compares. |
| `matrix` | `table` | yes | Markdown table — rows are regulations, columns are obligations. Use state markers ([x] / [-] / [ ] / [/]) in cells. |
| `legend` | `p` | no | Optional trailing paragraph explaining the state-marker meanings or what to take from the matrix. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Regulation × duty heading.             │
│                                         │
│  ┌───────────┬───────────┬───────────┐  │
│  │           │ Duty A    │ Duty B    │  │
│  ├───────────┼───────────┼───────────┤  │
│  │ Reg 1     │ ✓         │ ✕         │  │
│  │ Reg 2     │ ✓         │ ✓         │  │
│  │ Reg 3     │ ⚠         │ ✓         │  │
│  └───────────┴───────────┴───────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (component-specific)

### `heat` — Heat — risk-axis palette

Flips the palette so applies reads as alarm and exempt reads as relief. Adds cell-background tints so the table reads as a heat map at a glance. Use when the matrix is being scanned for exposure, not coverage.

```markdown
<!-- _class: obligation-matrix heat -->

## Same regimes, read for exposure — heat map.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Red = applies (exposure), green = exempt (relief). Brackets frame the structure.
```

### `asymmetric` — Asymmetric — card-per-row layout

Promotes each regulation to its own card with the obligations rendered as inline state discs. Use when row labels need room for a body sentence and the comparison-density of the default grid would crowd them.

```markdown
<!-- _class: obligation-matrix asymmetric -->

## Privacy obligations — card-per-regime layout.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |

Each row promotes to a card with body-level breathing room.
```

### `pills` — Pills — neutral state chips

Renders each cell's state marker as a discrete inline pill on neutral chrome — the default grammar without the heat palette's risk colouring. Use when the matrix should read as plain data, less assertive than heat.

```markdown
<!-- _class: obligation-matrix pills -->

## Privacy obligations across regimes — same grammar, no heat.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Same data, neutral chrome — the state pills carry the meaning without the heat-map alarm.
```

### `lanes` — Lanes — categorical row stripes

Tints each regulation's row label with a categorical lane stripe so every regime reads as its own track. Use when the rows are independent regimes rather than a ranked or directly comparable set.

```markdown
<!-- _class: obligation-matrix lanes -->

## Privacy obligations — categorical row stripes.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Each lane stripe signals that the row is its own regime, not a rank.
```

## Universal modifiers

This component accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`compare-table`](../../comparison/compare-table/compare-table.docs.md) — cells are textual values, not state markers
- [`verdict-grid`](../../comparison/verdict-grid/verdict-grid.docs.md) — options scored against criteria with a per-card layout instead of a table
- [`matrix-2x2`](../../comparison/matrix-2x2/matrix-2x2.docs.md) — two axes, four cells, qualitative placement
- [`checklist`](../../inventory/checklist/checklist.docs.md) — one set of obligations against one regime, not many

## Demo deck

See [obligation-matrix.gallery.light.pdf](./obligation-matrix.gallery.light.pdf) for rendered examples of every variant.
