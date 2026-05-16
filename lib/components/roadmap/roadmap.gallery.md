---
marp: true
theme: indaco
paginate: true
header: "Lattice · roadmap"
---

<!-- _class: title silent -->

# roadmap

`Progression · Matrix · Structure`

Phased multi-workstream grid — phases across the top, workstreams down the side.

---

<!-- _class: roadmap -->
<!-- _footer: "Default · roadmap" -->

`Layout · roadmap`

## What ships in each phase, by workstream.

| Workstream | Foundation `Q2 2026`  | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | --------------------- | ---------------------- | ------------------------- |
| Platform   | [x] Codebook signing  | [-] Multi-tenant DEKs  | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation   | [-] Automated rotation | [ ] Crypto-shred          |
| Compliance | [x] Audit trail       | [x] Centralised log    | [ ] Examiner pack         |
| SDK        | [x] Java              | [/] .NET               | [ ] Polyglot parity       |

State markers `[x]/[-]/[ ]/[/]` are universal: ✓ shipped, ◐ in flight, ○ planned, ╱ out of scope.


---

<!-- _class: roadmap horizons -->
<!-- _footer: "Horizons — three-horizon planning framing · roadmap horizons" -->

`Three-horizon planning`

## Where the platform invests across horizons.

| Workstream | Horizon 1 `Now`          | Horizon 2 `Next`         | Horizon 3 `Later`         |
| ---------- | ------------------------ | ------------------------ | ------------------------- |
| Platform   | [x] Codebook signing     | [-] Multi-tenant DEKs    | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation      | [-] Automated rotation   | [ ] Crypto-shred          |
| Compliance | [x] Audit trail          | [x] Centralised log      | [ ] Examiner pack         |
| SDK        | [x] Java                 | [/] .NET                 | [ ] Polyglot parity       |

Horizons frame the read: H1 is core business, H2 is emerging, H3 is the option set.


---

<!-- _class: cards-grid -->
<!-- _footer: "Anti-patterns · roadmap" -->

## When NOT to reach for roadmap.

- **One workstream.** A single row of phases is a `timeline` or `list-steps`, not a roadmap. Roadmap earns its grid only when at least two workstreams move in parallel.
- **No state markers.** A grid of bare deliverables loses half its value. Add `[x]`/`[-]`/`[ ]`/`[/]` so the audience reads progress alongside scope.
- **Past five workstreams.** More than five rows compresses cell text and the lane stripes lose their categorical read. Group adjacent workstreams or split by phase.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `gantt` — continuous task bars across a date axis rather than discrete phase cells
- `kanban` — current state by stage rather than phased schedule
- `list-steps` — single workstream sequence without parallel lanes
- `verdict-grid` — options scored against shared criteria, not phased delivery
- `checklist` — single list with state markers, no workstream dimension
