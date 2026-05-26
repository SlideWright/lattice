---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · State chart — stress test"
---

<!-- _class: title -->
<!-- _paginate: false -->

`Lattice · Stress test`

# State chart vs. content we've never seen.

Browser-measured layout: nodes are sized by the real text engine, edges are drawn from measured rects. These slides try to break it.

---

<!-- _class: state-chart -->
<!-- _footer: "1 — very short labels" -->

## Single-letter states.

1. A `start`
   - `=> 2`
2. B
   - `=> 3`
   - `=> 1`
3. C `end`

---

<!-- _class: state-chart -->
<!-- _footer: "2 — long labels that would overflow a fixed box" -->

## Long state names.

1. Awaiting Initial Submission `start`
   - `submit => 2`
2. Pending Manual Compliance Re-Review
   - `escalate => 3`
   - `return for changes => 1`
3. Approved by Regional Authority `done`
   - `archive => 4`
4. Archived in Cold Storage `end`

---

<!-- _class: state-chart -->
<!-- _footer: "3 — non-Latin (CJK) labels" -->

`状態遷移`

## CJK state labels.

1. 待機 `start`
   - `開始 => 2`
2. 実行中 `on-track`
   - `完了 => 3`
   - `失敗 => 1`
3. 完了 `end`

---

<!-- _class: state-chart -->
<!-- _footer: "4 — many states, mostly linear" -->

## Ten-step pipeline.

1. Intake `start`
   - `=> 2`
2. Triage
   - `=> 3`
3. Assigned
   - `=> 4`
4. In Progress `on-track`
   - `=> 5`
   - `block => 9`
5. Code Review
   - `=> 6`
   - `reject => 4`
6. QA
   - `=> 7`
   - `fail => 4`
7. Staging
   - `=> 8`
8. Released `live`
   - `=> 10`
9. Blocked `blocked`
   - `unblock => 4`
10. Closed `end`

---

<!-- _class: state-chart -->
<!-- _footer: "5 — dense branching from one state" -->

## Router with many exits.

1. Dispatch `start`
   - `a => 2`
   - `b => 3`
   - `c => 4`
   - `d => 5`
   - `retry => self`
2. Handler A `done`
3. Handler B `done`
4. Handler C `at-risk`
5. Dead Letter `fail`

---

<!-- _class: state-chart -->
<!-- _footer: "6 — heavy back-edges (everything returns to start)" -->

## Wizard with escape hatches.

1. Welcome `start`
   - `next => 2`
2. Account
   - `next => 3`
   - `cancel => 1`
3. Profile
   - `next => 4`
   - `cancel => 1`
4. Payment
   - `next => 5`
   - `cancel => 1`
5. Confirm `done`
   - `restart => 1`

---

<!-- _class: state-chart -->
<!-- _footer: "7 — single state, no transitions" -->

## Degenerate: one state.

1. Singleton `start`

---

<!-- _class: state-chart -->
<!-- _footer: "8 — mixed widths + every status colour" -->

## Status palette across widths.

1. Q `start`
   - `=> 2`
2. Processing Now `on-track`
   - `=> 3`
3. Hold `at-risk`
   - `=> 4`
4. Stop `blocked`
   - `=> 5`
5. Choose `decision`
   - `=> 6`
6. Later `deferred`
   - `=> 7`
7. Done `done` `end`

---

<!-- _class: state-chart lr -->
<!-- _footer: "9 — lr direction with branching + back-edge" -->

## Left-to-right pipeline.

1. Source `start`
   - `compile => 2`
2. Compiled `on-track`
   - `test => 3`
3. Tested
   - `deploy => 4`
   - `fail => 1`
4. Deployed `live` `end`

---

<!-- _class: state-chart lr -->
<!-- _footer: "10 — lr with long labels + self-loop" -->

## Connection (left-to-right).

1. Disconnected `start`
   - `connect => 2`
2. Establishing Session
   - `retry => self`
   - `ok => 3`
   - `timeout => 1`
3. Connected `live` `end`

---

<!-- _class: state-chart -->
<!-- _footer: "11 — complex TB: skips, converging back-edges, self-loop" -->

## Incident response.

1. Detected `start`
   - `triage => 2`
2. Triaged `on-track`
   - `assign => 3`
   - `false alarm => 7`
3. Investigating
   - `mitigate => 4`
   - `escalate => 5`
   - `need more info => 2`
4. Mitigated
   - `verify => 6`
5. Escalated `at-risk`
   - `hand off => 4`
   - `re-page => self`
6. Monitoring `live`
   - `resolve => 7`
   - `regression => 3`
7. Resolved `done`
   - `postmortem => 8`
8. Closed `end`

---

<!-- _class: state-chart lr -->
<!-- _footer: "12 — complex LR: forward skip, back-edges, self-loop" -->

## Build & release graph.

1. Commit `start`
   - `ci => 2`
   - `hotfix => 4`
2. Build `on-track`
   - `test => 3`
   - `retry => self`
3. Tested
   - `stage => 4`
   - `fail => 2`
4. Staging `at-risk`
   - `promote => 5`
   - `rollback => 2`
5. Production `live` `end`

---

<!-- _class: state-chart curved -->
<!-- _footer: "13 — curved variant (Bézier edges)" -->

## Document approval (curved).

1. Draft `start`
   - `submit => 2`
   - `discard => 5`
2. In Review `on-track`
   - `approve => 3`
   - `revise => self`
   - `reject => 1`
3. Approved
   - `publish => 4`
4. Published `live`
   - `archive => 5`
5. Archived `end`

---

<!-- _class: state-chart lr curved -->
<!-- _footer: "14 — curved variant, left-to-right" -->

## Job runner (curved, lr).

1. Idle `start`
   - `run => 2`
   - `skip => 4`
2. Running `on-track`
   - `pause => 3`
   - `finish => 4`
3. Paused
   - `resume => 2`
4. Done `end`
