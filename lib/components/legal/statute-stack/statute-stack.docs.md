# statute-stack

> Citation hierarchy — federal / state / local rows with citation, headline obligation, and status.

**Function** inventory · **Form** ledger · **Substance** structure

**Tags** `citation` · `reference` · `compliance`

**Capacity** ~3 items (crowds past 4, overflows past 5) — past that, split across slides (auto with autosplit: on) / list-tabular.

Use when three or four parallel jurisdictions need to read at a glance: each row carries the jurisdiction label, the citation, the obligation summary, and an effective-date marker.

## When to use

- **Three parallel jurisdictions.** Federal / state / local — or any three peer regimes — that the room must hold side-by-side. The hue rotation cues which row is which without a legend.
- **Citation plus obligation plus status.** Each card is a three-part record: the citation pill (top-right of the header), the headline obligation in prose, and the status pill (bottom-left). Use when all three matter; for citation-only, reach for list-tabular.
- **Compliance briefings.** Reach for statute-stack when the deck reads as a regulatory memo — counsel and operations need the same view of the same record at the same time.

## When NOT to use

- **More than four rows.** The three-column rail collapses past four jurisdictions. For longer registers move to `lane` (table form) or split across two statute-stack slides by topic.
- **Citation without obligation.** Without the headline obligation sentence, the layout reads as a citation list. Use list-tabular spec when only the citation matters.
- **Mixed entry shapes.** Every row needs the same three parts — citation, obligation, status. A row missing the status pill or with prose instead of a citation breaks the visual contract.

## Authoring

```markdown
<!-- _class: statute-stack -->

## Jurisdiction comparison framing the three obligations.

- Federal `Citation`
  - Headline obligation in one sentence.
  - `Status or effective date`
- State `Citation`
  - Headline obligation in one sentence.
  - `Status or effective date`
- Local `Citation`
  - Headline obligation in one sentence.
  - `Status or effective date`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `heading` | `h2` | yes | Slide heading framing what the three rows compare. |
| `rows` | `ul > li` | yes | One li per jurisdiction. Lead with the jurisdiction label as a plain text first line; nested ul items carry the citation (inline code), obligation summary, and status (inline code). |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Statute stack heading.                 │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ FEDERAL · cite        [in effect] │  │
│  │ Obligation prose for tier.        │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ STATE · cite          [pending]   │  │
│  └───────────────────────────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `hierarchy` — Authority pyramid

Stacks the rows vertically with descending row heights — Federal tallest, State mid, Local shortest. Use when the jurisdictions are nested in authority, not peers.

```markdown
<!-- _class: statute-stack hierarchy -->

## Children's data — authority cascades downward.

- Federal `15 U.S.C. §6501`
  - Verifiable parental consent for under-13 personal data.
  - `In effect since 2000`
- State `Cal. Civ. §1798.120`
  - Opt-in for selling or sharing under-16 data; opt-out for over-16.
  - `Enforced 2023`
- Local `NYC §22-1201`
  - Bias-audit obligation for AEDTs used in employment decisions.
  - `Effective 2023`
```

### `bands` — Horizontal bands

Each jurisdiction is a full-width card stacked at equal height — an at-a-glance scorecard. Same card anatomy as the default (citation top-right, status bottom-left); only the arrangement differs.

```markdown
<!-- _class: statute-stack bands -->

## Children's data — at-a-glance scorecard.

- Federal `15 U.S.C. §6501`
  - Verifiable parental consent for under-13 personal data.
  - `In effect since 2000`
- State `Cal. Civ. §1798.120`
  - Opt-in for selling or sharing under-16 data; opt-out for over-16.
  - `Enforced 2023`
- Local `NYC §22-1201`
  - Bias-audit obligation for AEDTs used in employment decisions.
  - `Effective 2023`
```

### `preemption` — Preemption cascade

Vertical stack with a downward arrow between each card. Use when the slide must show that the upper jurisdiction preempts or supersedes the one below.

```markdown
<!-- _class: statute-stack preemption -->

## Federal preemption — how the cascade flows.

- Federal `15 U.S.C. §6501`
  - Sets the floor for under-13 personal data collection.
  - `Preempts state rules`
- State `Cal. Civ. §1798.120`
  - Stricter opt-in regime on top of COPPA's baseline.
  - `Survives preemption`
- Local `NYC §22-1201`
  - Bias-audit obligation distinct from privacy preemption scope.
  - `Independent of preemption`
```

### `lane` — Markdown table

Pivots to a markdown table — columns for jurisdiction, citation, obligation, status. Use for register-style briefings where the audience scans down each column.

```markdown
<!-- _class: statute-stack lane -->

## Children's data — register view.

| Jurisdiction | Citation              | Headline obligation       | Status      |
| ------------ | --------------------- | ------------------------- | ----------- |
| Federal      | 15 U.S.C. §6501       | Parental consent <13 data | In effect   |
| State        | Cal. Civ. Code §1798  | Notice + opt-out + DSAR   | Enforced    |
| Local        | NYC §22-1201          | Annual AEDT bias audit    | Effective   |
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`list-tabular`](../../inventory/list-tabular/list-tabular.docs.md) — the rows are citation-only references, no obligation prose
- [`obligation-matrix`](../../legal/obligation-matrix/obligation-matrix.docs.md) — obligations cross-tab against actors or controls
- [`authority-chain`](../../legal/authority-chain/authority-chain.docs.md) — the rows are a delegation lineage, not parallel jurisdictions
- [`compare-table`](../../comparison/compare-table/compare-table.docs.md) — the comparison is across criteria, not jurisdictions

## Demo deck

See [statute-stack.gallery.light.pdf](./statute-stack.gallery.light.pdf) for rendered examples of every variant.
