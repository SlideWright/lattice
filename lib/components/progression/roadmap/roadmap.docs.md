# roadmap

> Phased multi-workstream grid — phases across the top, workstreams down the side.

**Function** progression · **Form** matrix · **Substance** structure

Use to show what ships in each phase across multiple parallel workstreams. Cells render as state-token discs (pass/warn/fail/skip).

## When to use

- **Phased delivery across workstreams.** When the question is what each team ships in each phase. Workstreams down the side, phases across the top, deliverables in the cells — the whole plan reads in one glance.
- **State markers are the second channel.** Every cell can lead with `[x]` shipped, `[-]` in flight, `[ ]` planned, or `[/]` out of scope. The audience sees both 'what' and 'how it's going' without a separate status slide.
- **Phase headers carry meta pills.** Append `` `Q2 2026` `` to a phase header and the renderer anchors a meta pill on the right of the column. Use it for date, owner, or status tags that frame the phase.

## When NOT to use

- **One workstream.** A single row of phases is a `timeline` or `list-steps`, not a roadmap. Roadmap earns its grid only when at least two workstreams move in parallel.
- **No state markers.** A grid of bare deliverables loses half its value. Add `[x]`/`[-]`/`[ ]`/`[/]` so the audience reads progress alongside scope.
- **Past five workstreams.** More than five rows compresses cell text and the lane stripes lose their categorical read. Group adjacent workstreams or split by phase.

## Authoring

```markdown
<!-- _class: roadmap -->

`Layout · roadmap`

## What ships in each phase, by workstream.

| Workstream | Foundation `Q2 2026`  | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | --------------------- | ---------------------- | ------------------------- |
| Platform   | [x] Codebook signing  | [-] Multi-tenant DEKs  | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation   | [-] Automated rotation | [ ] Crypto-shred          |
| Compliance | [x] Audit trail       | [x] Centralised log    | [ ] Examiner pack         |
| SDK        | [x] Java              | [/] .NET               | [ ] Polyglot parity       |

State markers `[x]/[-]/[ ]/[/]` are universal: ✓ shipped, ◐ in flight, ○ planned, ╱ out of scope.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the plan. |
| `rows` | `ul > li` | yes | Outer li per workstream, lead with **Workstream.**. Inner bullets per phase, marked [x]/[-]/[ ]/[/] then the deliverable. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Phased roadmap heading.                │
│                                         │
│  ┌───────────┬───────────┬───────────┐  │
│  │           │ Q1        │ Q2        │  │
│  ├───────────┼───────────┼───────────┤  │
│  │ Track A   │ ▓▓▓░░░    │ ▓▓▓▓▓░    │  │
│  │ Track B   │ ░▓▓▓▓░    │ ▓▓▓░░░    │  │
│  └───────────┴───────────┴───────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `horizons` — Horizons — three-horizon planning framing

Tints the phase columns as Horizon 1 / 2 / 3 (now / next / later) per the McKinsey three-horizons framing. Use when the planning frame is strategic-horizon-aware rather than fiscal-quarter-aware.

```markdown
<!-- _class: roadmap horizons -->

`Three-horizon planning`

## Where the platform invests across horizons.

| Workstream | Horizon 1 `Now`          | Horizon 2 `Next`         | Horizon 3 `Later`         |
| ---------- | ------------------------ | ------------------------ | ------------------------- |
| Platform   | [x] Codebook signing     | [-] Multi-tenant DEKs    | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation      | [-] Automated rotation   | [ ] Crypto-shred          |
| Compliance | [x] Audit trail          | [x] Centralised log      | [ ] Examiner pack         |
| SDK        | [x] Java                 | [/] .NET                 | [ ] Polyglot parity       |

Horizons frame the read: H1 is core business, H2 is emerging, H3 is the option set.
```

### `status` — Status — heavy state treatment

Promotes the state markers ([x]/[-]/[ ]/[/]) to the dominant read: tinted cell grounds, an uppercase state eyebrow, and a corner state disc. Use for the standing delivery-status review.

```markdown
<!-- _class: roadmap status -->

`Layout · roadmap status`

## Delivery status by workstream.

| Workstream | Foundation `Q2 2026` | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | -------------------- | ---------------------- | ------------------------- |
| Platform   | [x] Codebook signing | [-] Multi-tenant DEKs  | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation  | [-] Automated rotation | [ ] Crypto-shred          |
| Compliance | [x] Audit trail      | [x] Centralised log    | [ ] Examiner pack         |
| SDK        | [x] Java             | [/] .NET               | [ ] Polyglot parity       |

State markers `[x]/[-]/[ ]/[/]` are universal: ✓ shipped, ◐ in flight, ○ planned, ╱ out of scope.
```

### `swimlane` — Swimlane — horizontal tracks

Renders each workstream as a horizontal track across the phase columns, so a reader scans one team's whole journey left-to-right before moving to the next.

```markdown
<!-- _class: roadmap swimlane -->

`Layout · roadmap swimlane`

## Each team's track across the year.

| Workstream | Foundation `Q2 2026` | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | -------------------- | ---------------------- | ------------------------- |
| Platform   | Codebook signing     | Multi-tenant DEKs      | Per-purpose codebooks     |
| Operations | Manual rotation      | Automated rotation     | Crypto-shred              |
| Compliance | Audit trail          | Centralised log        | Examiner pack             |
| SDK        | Java                 | .NET                   | Polyglot parity           |
```

### `milestones` — Milestones — calendar-aware

Treats the phase headers as dated milestones, carrying their date pill as a subtitle. Use when the cadence of the dates is part of the story, not just the sequence.

```markdown
<!-- _class: roadmap milestones -->

`Layout · roadmap milestones`

## The dated path to GA.

| Workstream | Beta `Q2 2026`       | RC `Q3 2026`           | GA `Q4 2026`              |
| ---------- | -------------------- | ---------------------- | ------------------------- |
| Platform   | Codebook signing     | Multi-tenant DEKs      | Per-purpose codebooks     |
| Operations | Manual rotation      | Automated rotation     | Crypto-shred              |
| Compliance | Audit trail          | Centralised log        | Examiner pack             |
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [reference/design-system.md §6.5](../../reference/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`gantt`](../gantt/gantt.docs.md) — continuous task bars across a date axis rather than discrete phase cells
- [`kanban`](../kanban/kanban.docs.md) — current state by stage rather than phased schedule
- [`list-steps`](../list-steps/list-steps.docs.md) — single workstream sequence without parallel lanes
- [`verdict-grid`](../verdict-grid/verdict-grid.docs.md) — options scored against shared criteria, not phased delivery
- [`checklist`](../checklist/checklist.docs.md) — single list with state markers, no workstream dimension

## Demo deck

See [roadmap.gallery.pdf](./roadmap.gallery.pdf) for rendered examples of every variant.
