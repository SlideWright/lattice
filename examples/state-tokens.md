---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · State tokens"
footer: "Universal grammar · four shapes · `.heat` overlay"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# State tokens — universal grammar.

`[x] [-] [ ] [/] · four shapes · four layouts · one .heat overlay`

The same authoring grammar paints every state-bearing layout in Lattice.
Shape is the primary channel — readable in greyscale, unambiguous for
colour-blind viewers. Colour resolves from the layout context; the
`.heat` modifier flips the palette globally.

---

<!-- _class: subtopic -->
<!-- _footer: "Contract · grammar" -->

`The four states the engine knows`

## Shape is the universal channel. Colour is layout-contextual.

`[x]` filled disc · `[-]` half-filled disc · `[ ]` outline disc · `[/]` filled disc with diagonal slash. Two tiny SVG masks paint the half and the slash — no font dependency, no Unicode glyphs, no OS rendering quirks. Each layout binds the four shapes to its own semantic colour palette (performance, lifecycle, or coverage). `.heat` reframes the palette as a load/risk axis without changing the shape grammar.

---

<!-- _class: checklist -->
<!-- _footer: "checklist · default (performance axis)" -->

## Phase 1 acceptance, by item.

- [x] Codebook signing in production
- [x] HSM-anchored audit trail
- [-] TTL refresh under cold-start load — _open, see slide 27_
- [ ] Multi-tenant operation — _Phase 2_
- [/] Cross-region replication — _deferred to Phase 3_

Done · in progress · not done · out of scope. `[ ]` reads as a clear todo; `[/]` reads as explicitly outside this phase.

---

<!-- _class: verdict-grid -->
<!-- _footer: "verdict-grid · default (evaluation axis)" -->

## Vendor evaluation — codebook signing.

- Vendor A
  - [x] FedRAMP High
  - [x] HSM-backed
  - [-] SLA 99.9 (99.95 needed)
  - [ ] Multi-region today
  - Mature platform; SLA gap is the blocker.
- Vendor B
  - [x] FedRAMP High
  - [-] HSM optional add-on
  - [x] SLA 99.95
  - [/] Multi-region (roadmap Q4)
  - SLA strong; HSM add-on cost pending.
- Vendor C
  - [ ] FedRAMP Moderate only
  - [x] HSM-backed
  - [x] SLA 99.95
  - [x] Multi-region today
  - Strong tech; FedRAMP gap rules them out.
- Pick — Vendor B
  - One signed contract by Q3 close.

Pass · partial · fail · N/A. The verdict pill carries the universal shape.

---

<!-- _class: obligation-matrix -->
<!-- _footer: "obligation-matrix · default (coverage axis)" -->

## Privacy obligations across regimes — neutral grid.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [/]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Applies · partial · exempt · waived. `[/]` covers obligations that no longer apply (repealed, waived, or out of jurisdiction).

---

<!-- _class: roadmap status -->
<!-- _footer: "roadmap · status (lifecycle axis)" -->

## Codebook programme — workstream × phase.

| Workstream    | Q1 2026          | Q2 2026          | Q3 2026          | Q4 2026          |
| ------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| Signing       | [x] Pilot       | [x] Production   | [-] Hardening    | [ ] Audit        |
| HSM           | [x] Procurement | [x] Integration  | [x] Failover     | [ ] DR drill     |
| Multi-tenant  | [ ] Design      | [ ] Build        | [-] Pilot        | [ ] GA           |
| Cross-region  | [/] Deferred    | [/] Deferred     | [ ] Design       | [-] Pilot        |

Shipped · in flight · planned · out of scope. The lifecycle axis is layout-native; the same shape vocabulary applies.

---

<!-- _class: obligation-matrix heat -->
<!-- _footer: "obligation-matrix · heat (.heat palette overlay)" -->

## Same matrix — heat overlay reads as regulatory burden.

| Regulation | Notice | Consent | Retention | Breach | DSAR |
| ---------- | :----: | :-----: | :-------: | :----: | :--: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]  |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]  |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]  |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]  |
| HIPAA      | [x]    | [x]     | [x]       | [/]    | [-]  |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]  |

Same markdown, palette flipped. Red cells = action items; green = relief. The shape grammar is unchanged — `.heat` is purely a colour overlay.

---

<!-- _class: roadmap status heat -->
<!-- _footer: "roadmap · status + heat (workload concentration)" -->

## Same roadmap — heat overlay reads as workload pressure.

| Workstream    | Q1 2026          | Q2 2026          | Q3 2026          | Q4 2026          |
| ------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| Signing       | [x] Pilot       | [x] Production   | [-] Hardening    | [ ] Audit        |
| HSM           | [x] Procurement | [x] Integration  | [x] Failover     | [ ] DR drill     |
| Multi-tenant  | [ ] Design      | [ ] Build        | [-] Pilot        | [ ] GA           |
| Cross-region  | [/] Deferred    | [/] Deferred     | [ ] Design       | [-] Pilot        |

Shipped now reads as alarm — finished workstreams that are still under load; planned reads as relief — not started, no pressure yet. The same `heat` modifier works on any state-bearing layout.

---

<!-- _class: obligation-matrix dark -->
<!-- _footer: "obligation-matrix · default + dark canvas" -->

## Same matrix on a dark canvas — colour AND shape both lift.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [/]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

`--pass / --warn / --fail` are `light-dark()` pairs in the universal palette. Dark canvases pick up brighter green / orange / red so the discs hold AA contrast against the dark bg. Hue separation between warn and fail is preserved at ~25° in both modes.

---

<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _footer: '' -->

# One grammar, four shapes, every layout.

`[x] [-] [ ] [/]` — universal. SHAPE carries the meaning; COLOUR carries
reinforcement. Two SVG masks total, no font dependency. `.heat` flips the
palette globally without touching the markdown. Light and dark canvases
share one grammar; the universal trio is a `light-dark()` pair so
both modes hold AA contrast.
