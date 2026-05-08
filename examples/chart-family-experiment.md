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

<!-- _class: closing -->
<!-- _footer: "Experiment · end" -->

# End of chart-family experiment.

Three layouts, two treatments, one frame, all on-theme tokens. Not yet wired through marp-cli or runtime — emulator path only.
