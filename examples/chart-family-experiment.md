---
marp: true
theme: indaco
paginate: true
---

<!-- _class: title -->

`Chart Family · Experiment`

# List-and-pill chart layouts.

A first cut at progress, timeline-list, and piechart over a shared chart-frame.

---

<!-- _class: subtopic -->

## What this experiment shows.

Three chart layouts (`progress`, `timeline-list`, `piechart`) sharing one frame: lucent header strip, centred eyebrow + h2 + subtitle, dominant chart area, optional caption. All on-theme via tokens. Light + dark variants for each.

---

<!-- _class: progress -->
<!-- _footer: "Experiment · progress" -->

`H1 2026 · Phase 1 readiness`

## Phase 1 readiness, by workstream.

Snapshot taken at 14:00 UTC. Status pills tint the bar fill.

- Codebook platform `92%` `on-track`
- Operations runbook `68%` `at-risk`
- Compliance audit pack `81%` `on-track`
- SDK polyglot parity `34%` `deferred`
- Dependency dashboard `12%` `blocked`

_Source: Linear · refreshed 2026-05-07_

---

<!-- _class: progress dark -->
<!-- _footer: "Experiment · progress dark" -->

`H1 2026 · Phase 1 readiness`

## The same data, dark canvas.

Status colours hold their contrast against the dark canvas; the lucent strip darkens proportionally.

- Codebook platform `92%` `on-track`
- Operations runbook `68%` `at-risk`
- Compliance audit pack `81%` `on-track`
- SDK polyglot parity `34%` `deferred`
- Dependency dashboard `12%` `blocked`

_Source: Linear · refreshed 2026-05-07_

---

<!-- _class: progress -->
<!-- _footer: "Experiment · progress (no subtitle, no caption)" -->

`Capacity · Q2`

## Engineering capacity claimed, by stream.

- Platform `78%` `on-track`
- Operations `54%` `at-risk`
- Compliance `91%` `done`
- SDK `42%` `deferred`

---

<!-- _class: timeline-list -->
<!-- _footer: "Experiment · timeline-list horizontal" -->

`Codebook architecture`

## How the codebook architecture arrived in production.

Four stages over eighteen months. Date pill leads each item; status pill trails. The spine and dots come for free from CSS.

1. `2024 Q3` Vault round-trip
   - First production tokenization shipped on a centralised vault. p99 60 ms.
2. `2025 Q1` Codebook proposal `decision`
   - Architecture review accepts the in-process model. Build approved.
3. `2025 Q3` Pilot `pilot`
   - One internal team, one workload, one quarter. Detokenize p99 lands at 8 ms.
4. `2026 Q1` Production `live`
   - Codebook signing live across all production tenants.

_Cross-functional sign-off · 2026-04-29_

---

<!-- _class: timeline-list dark -->
<!-- _footer: "Experiment · timeline-list dark" -->

`Codebook architecture`

## Same chronology, dark canvas.

1. `2024 Q3` Vault round-trip
   - First production tokenization shipped on a centralised vault.
2. `2025 Q1` Codebook proposal `decision`
   - Architecture review accepts the in-process model.
3. `2025 Q3` Pilot `pilot`
   - One team, one workload, one quarter.
4. `2026 Q1` Production `live`
   - Live across all production tenants.

---

<!-- _class: timeline-list -->
<!-- _footer: "Experiment · timeline-list (3 items, no statuses)" -->

`Phase 2 cadence`

## Three milestones across the second half.

1. `Q3 kickoff` Scope freeze
   - All workstream owners commit to a final milestone tree.
2. `Q3 mid` Mid-phase review
   - Cross-team status check; budget and risk re-baselined.
3. `Q4 close` Phase 2 retrospective
   - Roadmap rolls forward to Phase 3.

---

<!-- _class: piechart donut -->
<!-- _footer: "Experiment · piechart donut" -->

`H1 2026 · 1,840 person-hours`

## Where the engineering quarter went.

Wedges drawn proportionally; legend reads in author order with raw values.

- Codebook platform `46%`
- Operations runbook `22%`
- Compliance work `18%`
- Pilot support `9%`
- Toil and on-call `5%`

_Refreshed weekly · last updated 2026-05-07_

---

<!-- _class: piechart donut dark -->
<!-- _footer: "Experiment · piechart donut dark" -->

`H1 2026 · 1,840 hours`

## Same allocation, dark canvas.

- Codebook platform `46%`
- Operations runbook `22%`
- Compliance work `18%`
- Pilot support `9%`
- Toil and on-call `5%`

---

<!-- _class: piechart -->
<!-- _footer: "Experiment · piechart (solid)" -->

`Phase 1 hires`

## Where the new headcount landed.

- Platform engineering `8`
- Operations `5`
- Compliance and audit `3`
- SDK and integrations `4`
- Programme management `2`

_Total: 22 hires · final tally 2026-04-30_

---

<!-- _class: subtopic -->

## Treatment B: `.minimal` modifier.

Same chart-frame structure, but the lucent gradient strip is replaced by a centred header with a short accent hairline. Same eyebrow + h2 + subtitle; less chrome. Worth comparing against the lucent default.

---

<!-- _class: progress minimal -->
<!-- _footer: "Experiment · progress minimal" -->

`H1 2026 · Phase 1 readiness`

## Same data, minimal treatment.

The strip is gone; the header reads as quiet typography with an accent hairline, and the chart dominates more.

- Codebook platform `92%` `on-track`
- Operations runbook `68%` `at-risk`
- Compliance audit pack `81%` `on-track`
- SDK polyglot parity `34%` `deferred`
- Dependency dashboard `12%` `blocked`

_Source: Linear · refreshed 2026-05-07_

---

<!-- _class: timeline-list minimal -->
<!-- _footer: "Experiment · timeline-list minimal" -->

`Codebook architecture`

## Codebook chronology, minimal treatment.

1. `2024 Q3` Vault round-trip
   - First production tokenization shipped on a centralised vault.
2. `2025 Q1` Codebook proposal `decision`
   - Architecture review accepts the in-process model.
3. `2025 Q3` Pilot `pilot`
   - One team, one workload, one quarter.
4. `2026 Q1` Production `live`
   - Live across all production tenants.

---

<!-- _class: piechart donut minimal -->
<!-- _footer: "Experiment · piechart donut minimal" -->

`H1 2026 · 1,840 person-hours`

## Quarter allocation, minimal treatment.

- Codebook platform `46%`
- Operations runbook `22%`
- Compliance work `18%`
- Pilot support `9%`
- Toil and on-call `5%`

_Refreshed weekly · last updated 2026-05-07_

---

<!-- _class: subtopic -->

## `gantt` — categorical bar chart.

Time axis across the top; swimlanes down the left; bars absolutely positioned within each lane. Status pill colours the bar fill. Five versions: light full-chrome, dark, minimal, monthly axis, four-lane stress test.

---

<!-- _class: gantt -->
<!-- _footer: "Experiment · gantt (light, 3 lanes)" -->

`2026 Q1 → 2026 Q4`

## What ships in each phase, by workstream.

Three workstreams across four quarters. Status pills tint each bar — matching the vocabulary used by `progress` and `timeline-list`.

- Platform
  - Codebook signing `Q1 → Q2` `done`
  - Multi-tenant DEKs `Q2 → Q3` `live`
  - Per-purpose codebooks `Q3 → Q4` `at-risk`
- Operations
  - Manual rotation `Q1 → Q2` `done`
  - Automated rotation `Q2 → Q3` `live`
  - Crypto-shred `Q3 → Q4`
- Compliance
  - Audit trail `Q1 → Q2` `done`
  - Centralised log `Q2 → Q3`
  - Examiner pack `Q3 → Q4`

_Product roadmap · committed baseline · 2026-05-07_

---

<!-- _class: gantt dark -->
<!-- _footer: "Experiment · gantt (dark canvas)" -->

`2026 Q1 → 2026 Q4`

## Same roadmap, dark canvas.

Bar fills lift with a white mix on the dark canvas — the same treatment used for `progress.dark`. Bar labels switch to dark navy for contrast.

- Platform
  - Codebook signing `Q1 → Q2` `done`
  - Multi-tenant DEKs `Q2 → Q3` `live`
  - Per-purpose codebooks `Q3 → Q4` `at-risk`
- Operations
  - Manual rotation `Q1 → Q2` `done`
  - Automated rotation `Q2 → Q3` `live`
  - Crypto-shred `Q3 → Q4`
- Compliance
  - Audit trail `Q1 → Q2` `done`
  - Centralised log `Q2 → Q3`
  - Examiner pack `Q3 → Q4`

---

<!-- _class: gantt minimal -->
<!-- _footer: "Experiment · gantt (minimal treatment)" -->

`2026 Q1 → 2026 Q4`

## Same roadmap, minimal header.

The lucent strip is gone; the chart dominates. Same axis, same bars, same status vocabulary — less chrome.

- Platform
  - Codebook signing `Q1 → Q2` `done`
  - Multi-tenant DEKs `Q2 → Q3` `live`
  - Per-purpose codebooks `Q3 → Q4` `at-risk`
- Operations
  - Manual rotation `Q1 → Q2` `done`
  - Automated rotation `Q2 → Q3` `live`
  - Crypto-shred `Q3 → Q4`
- Compliance
  - Audit trail `Q1 → Q2` `done`
  - Centralised log `Q2 → Q3`
  - Examiner pack `Q3 → Q4`

---

<!-- _class: gantt -->
<!-- _footer: "Experiment · gantt (monthly axis, 2 lanes)" -->

`Jan → Jun`

## Feature delivery by workstream, H1 2026.

Monthly axis with two swimlanes. The tick parser recognises short month names as well as `Q1–Q4`.

- Engineering
  - Architecture review `Jan → Feb` `done`
  - Development sprint `Mar → May` `at-risk`
  - Hardening and QA `Jun → Jun`
- Compliance
  - Audit preparation `Jan → Mar` `done`
  - External review window `Apr → Jun` `pilot`

_Build calendar · Q1 baseline · refreshed 2026-05-07_

---

<!-- _class: gantt -->
<!-- _footer: "Experiment · gantt (4 lanes, full status spectrum)" -->

`2026 Q1 → 2026 Q4`

## Phase 2 delivery plan — risk review.

Four workstreams. Every status colour is represented: done, live, at-risk, blocked, deferred. Two items need escalation before Q3 mid.

- Platform
  - Codebook signing `Q1 → Q2` `done`
  - Multi-tenant DEKs `Q2 → Q3` `live`
  - Per-purpose codebooks `Q3 → Q4` `at-risk`
- Operations
  - Manual rotation `Q1 → Q2` `done`
  - Automated rotation `Q2 → Q3` `live`
  - Crypto-shred `Q3 → Q4` `blocked`
- Compliance
  - Audit trail `Q1 → Q2` `done`
  - Centralised log `Q2 → Q3`
  - Examiner pack `Q3 → Q4` `deferred`
- SDK
  - Polyglot parity `Q2 → Q4` `at-risk`

_Risk review · 2026-05-09 · 2 items require escalation_

---

<!-- _class: subtopic -->

## `kanban` — board from a two-level list.

Column = top-level bullet; card = second-level bullet with an optional trailing size code (`S`/`M`/`L`/`XL`). The first sub-bullet of a card is the meta line: prose = label (receives a categorical left stripe), optional trailing code = status (shared vocabulary). A second sub-bullet becomes the card body. The `Done` column dims automatically.

---

<!-- _class: kanban -->
<!-- _footer: "Experiment · kanban (light, 4 columns)" -->

`Phase 2 · Sprint 14`

## Where Phase 2 work stands today.

Four columns, mixed card density. Size badge sits right in the title row; label left, status right in the meta row. The Done column dims.

- Backlog
  - Per-purpose codebooks `S`
    - compliance
  - Crypto-shred runbook `M`
    - platform
  - Dependency dashboard `S`
- In progress
  - Multi-tenant DEKs `M`
    - platform `at-risk`
  - Examiner pack v2 `L`
    - compliance
- Review
  - Automated rotation `M`
    - platform
  - Centralised log `S`
    - compliance
- Done
  - Codebook signing `L`
    - platform `done`
  - HSM audit trail `M`
    - compliance `done`

_Refreshed at stand-up · 2026-05-09_

---

<!-- _class: kanban dark -->
<!-- _footer: "Experiment · kanban (dark canvas)" -->

`Phase 2 · Sprint 14`

## Same board, dark canvas.

Card backgrounds track `--bg-alt` via `light-dark()` — no explicit dark overrides needed for the card chrome. Only the column headers are lifted.

- Backlog
  - Per-purpose codebooks `S`
    - compliance
  - Crypto-shred runbook `M`
    - platform
  - Dependency dashboard `S`
- In progress
  - Multi-tenant DEKs `M`
    - platform `at-risk`
  - Examiner pack v2 `L`
    - compliance
- Review
  - Automated rotation `M`
    - platform
  - Centralised log `S`
    - compliance
- Done
  - Codebook signing `L`
    - platform `done`
  - HSM audit trail `M`
    - compliance `done`

---

<!-- _class: kanban minimal -->
<!-- _footer: "Experiment · kanban (minimal treatment)" -->

`Phase 2 · Sprint 14`

## Same board, minimal header.

The lucent strip removed. The board is the entire content surface — suited to a check-in slide where the data needs to dominate.

- Backlog
  - Per-purpose codebooks `S`
    - compliance
  - Crypto-shred runbook `M`
    - platform
  - Dependency dashboard `S`
- In progress
  - Multi-tenant DEKs `M`
    - platform `at-risk`
  - Examiner pack v2 `L`
    - compliance
- Review
  - Automated rotation `M`
    - platform
  - Centralised log `S`
    - compliance
- Done
  - Codebook signing `L`
    - platform `done`
  - HSM audit trail `M`
    - compliance `done`

---

<!-- _class: kanban -->
<!-- _footer: "Experiment · kanban (3 columns, Todo / Doing / Done)" -->

`Sprint 14 · Engineering`

## Sprint board — who is doing what.

Three-column variant. The Done column dims; the Doing column carries the at-risk signal. Lane stripes distinguish platform from operations and sdk.

- To do
  - Architecture ADR `M`
    - platform
  - Runbook template `S`
    - operations
  - Linter rule for pill positions `S`
    - sdk
- In progress
  - Polyglot SDK `L`
    - sdk `at-risk`
  - On-call playbook `M`
    - operations
- Done
  - API gateway rate-limit `M`
    - platform `done`
  - SDK Go client `M`
    - sdk `done`
  - Vault round-trip deprecation `L`
    - platform `done`

_Jira sync · 2026-05-09_

---

<!-- _class: kanban -->
<!-- _footer: "Experiment · kanban (cards with body text)" -->

`Compliance workstream`

## Compliance tasks — detail view.

Cards optionally carry a one-line body (from a third-level sub-bullet) rendered as an italic caption inside the card. Blocked column renders as a standard column; Done dims as usual.

- Blocked
  - External audit firm `M`
    - compliance `blocked`
    - Firm selection paused pending legal sign-off. Resuming W20.
- In progress
  - Audit pack v2 `L`
    - compliance `at-risk`
    - Second draft complete; awaiting exec sign-off on scope.
  - Examiner role spec `S`
    - compliance
- Review
  - Log retention policy `M`
    - compliance
    - Reviewed by legal on 2026-05-06. Minor edits pending.
- Done
  - Audit trail implementation `L`
    - compliance `done`
  - HSM key escrow review `M`
    - compliance `done`

_Compliance checkpoint · 2026-05-09_

---

<!-- _class: subtopic -->
<!-- _footer: "Experiment · radar" -->

## `radar` — categorical spider chart.

Build-time SVG, no charting library. Series-major list parsed into a positioned polygon; legend on the right. Light + dark variants of the default overlay treatment.

---

<!-- _class: radar -->
<!-- _footer: "Experiment · radar (light)" -->

`Scale · 0–10`

## How we stack up across the buying criteria.

- Lattice
  - Performance `9`
  - Pricing `7`
  - Support `8`
  - Ecosystem `6`
  - Security `9`
- Rival North
  - Performance `7`
  - Pricing `8`
  - Support `6`
  - Ecosystem `9`
  - Security `7`
- Rival West
  - Performance `6`
  - Pricing `5`
  - Support `7`
  - Ecosystem `7`
  - Security `8`

_Three competitive profiles across five buying criteria._

---

<!-- _class: radar dark -->
<!-- _footer: "Experiment · radar (dark)" -->

`Scale · 0–10`

## Same data, dark canvas.

- Lattice
  - Performance `9`
  - Pricing `7`
  - Support `8`
  - Ecosystem `6`
  - Security `9`
- Rival North
  - Performance `7`
  - Pricing `8`
  - Support `6`
  - Ecosystem `9`
  - Security `7`
- Rival West
  - Performance `6`
  - Pricing `5`
  - Support `7`
  - Ecosystem `7`
  - Security `8`

---

<!-- _class: subtopic -->
<!-- _footer: "Experiment · quadrant" -->

## `quadrant` — 2×2 scatter / matrix.

Effort × impact (or any two scales). Items group into four named quadrants in source order; build-time SVG positions each dot. Light + dark variants of the default treatment.

---

<!-- _class: quadrant -->
<!-- _footer: "Experiment · quadrant (light)" -->

`Effort 0–10 → Reach 0–100`

## Where to put the next dollar.

Effort estimated in story-points; reach as percent of addressable users.

- Strategic Bets
  - Codebook caching `3, 70`
  - Multi-tenant DEKs `5, 85`
- Quick Wins
  - Per-purpose codebooks `8, 80`
  - Snapshot exports `9, 55`
- Defer
  - Vendor scoping `2, 30`
  - Manual rotation `1, 22`
- Time Sinks
  - Custom audit log UI `7, 18`
  - Bespoke SCIM `9, 28`

_Illustrative · 8 candidate initiatives._

---

<!-- _class: quadrant dark -->
<!-- _footer: "Experiment · quadrant (dark)" -->

`Effort 0–10 → Reach 0–100`

## Same matrix, dark canvas.

- Strategic Bets
  - Codebook caching `3, 70`
  - Multi-tenant DEKs `5, 85`
- Quick Wins
  - Per-purpose codebooks `8, 80`
  - Snapshot exports `9, 55`
- Defer
  - Vendor scoping `2, 30`
  - Manual rotation `1, 22`
- Time Sinks
  - Custom audit log UI `7, 18`
  - Bespoke SCIM `9, 28`

---

<!-- _class: closing -->
<!-- _footer: "Experiment · end" -->

# End of chart-family experiment.

Seven layouts, two treatments, one frame, all on-theme tokens. Emulator path only — not yet wired through marp-cli or lattice-runtime.js.

<!-- markdownlint-disable MD033 -->
<script src="../mermaid-v11.min.js"></script>
<script src="../lattice-runtime.js"></script>