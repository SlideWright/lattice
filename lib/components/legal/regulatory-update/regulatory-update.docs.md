# regulatory-update

> Change log against a baseline — numbered list of statutes/cases/rules with citation, summary, and effective date.

**Function** progression · **Form** ledger · **Substance** structure

Use when a quarter's regulatory motion needs a single-slide digest. Each row carries the change name, the citation (inline code), the summary, and the effective-date marker (inline code).

## When to use

- **Period-bounded digest.** When a quarter or half of regulatory motion needs to land as a single scannable ledger. The audience sees what moved, when it took effect, and where to read it — without flipping through a multi-page memo.
- **Citation is the proof.** Each row anchors on its inline-code citation chip. Without the citation the row reads as opinion; with it, the row earns its place in a compliance brief.
- **Effective-date pill closes the row.** The trailing `Effective Mon YYYY` chip tells the audience whether the change is live, imminent, or final. The pill is the row's call-to-action signal.

## When NOT to use

- **Single rule's lineage.** If the slide walks one rule from statute through case, use `authority-chain`. regulatory-update is a period digest.
- **Past six rows.** More than six items compresses the row gap and the citation chips run out of room. Split by jurisdiction.
- **Missing summary or citation.** Each row needs all three sub-items — citation, summary, effective date. Otherwise the row reads as rumour.

## Authoring

```markdown
<!-- _class: regulatory-update -->

## Headline naming the period or theme.

`Scope label · jurisdiction tier`

1. Change name
   - `Citation reference`
   - Summary in one sentence.
   - `Effective Mon YYYY`
2. Change name
   - `Citation reference`
   - Summary in one sentence.
   - `Effective Mon YYYY`
3. Change name
   - `Citation reference`
   - Summary in one sentence.
   - `Effective Mon YYYY`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `heading` | `h2` | yes | Slide heading framing the period or theme of the changes. |
| `scope` | `p:first-of-type > code` | no | Optional inline-code scope label (e.g. 'Federal · State · International'). |
| `items` | `ol > li` | yes | Ordered list of changes. Each item leads with a plain text name; nested ul carries citation (code), summary, and effective date (code). |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Change log heading.                    │
│                                         │
│  2024-Q1  Added clause 4.2 — gloss      │
│  2024-Q2  Revised clause 5 — gloss      │
│  2024-Q3  Deleted clause 6 — gloss      │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `timeline` — Timeline — chronological spine instead of ranked ledger

Renders the rows as a chronological spine — effective-date chips align on the right and the chrome reads as a calendar rather than a ranking. Use when chronology is the read, not weight.

```markdown
<!-- _class: regulatory-update timeline -->

## Privacy and AI motion — Q1 2026 by effective date.

`Federal · State · International`

1. EU AI Act
   - `Title III`
   - Conformity-assessment pre-market obligation took effect.
   - `Effective Feb 2026`
2. Colorado AI Act
   - `SB 24-205`
   - Developer and deployer duties for consequential-decision systems.
   - `Effective Feb 2026`
3. FTC v. Avast
   - `§5 unfairness`
   - $16.5M consent order; clarifies the deception standard for privacy branding.
   - `Final Mar 2026`
4. Texas DPSA
   - `§541.151`
   - DSAR opt-out portal mandatory; small-business safe-harbor narrowed.
   - `Effective Mar 2026`
```

### `priority` — Priority — ranked by exposure rather than chronology

Stamps a priority rail on the left of each row and ranks by exposure rather than effective date. Use for board updates where the audience needs 'what to do' before 'when it landed'.

```markdown
<!-- _class: regulatory-update priority -->

## Q1 motion ranked by exposure.

`Top three · by ARR at risk`

1. EU AI Act
   - `Title III`
   - High-risk system inventory due before April.
   - `Effective Feb 2026`
2. Colorado AI Act
   - `SB 24-205`
   - Deployer disclosures required; copy in flight.
   - `Effective Feb 2026`
3. Texas DPSA
   - `§541.151`
   - DSAR opt-out portal mandatory.
   - `Effective Mar 2026`
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [reference/design-system.md §6.5](../../reference/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`authority-chain`](../authority-chain/authority-chain.docs.md) — single rule walked statute → regulation → guidance → case
- [`list-criteria`](../list-criteria/list-criteria.docs.md) — flat enumeration of requirements without dates or citations
- [`timeline`](../timeline/timeline.docs.md) — chronological sequence of events on a single axis
- [`list-tabular`](../list-tabular/list-tabular.docs.md) — structured metadata per row but no regulatory framing

## Demo deck

See [regulatory-update.gallery.pdf](./regulatory-update.gallery.pdf) for rendered examples of every variant.
