---
marp: true
theme: indaco
paginate: true
header: "Lattice · state-chart"
---

<!-- _class: title silent -->

# state-chart

`Progression · Timeline · Graph`

Native state machine diagram — states as a numbered list, transitions as nested inline-code refs.

---

<!-- _class: state-chart -->
<!-- _footer: "Default · state-chart" -->

`Submission lifecycle`

## Document approval flow.

How a draft moves from author to archive.

1. Draft `start`
   - `submit => 2`
   - `discard => 6`
2. Submitted `on-track`
   - `review => 3`
3. In Review
   - `approve => 4`
   - `reject => 1`
   - `revise => self`
4. Approved `done`
   - `publish => 5`
5. Published `live`
   - `archive => 6`
6. Archived `end`

*Rejected drafts return to the author; revisions stay in review.*


---

<!-- _class: state-chart lr -->
<!-- _footer: "Left-to-right · state-chart lr" -->

## Build pipeline.

1. Source `start`
   - `compile => 2`
2. Compiled
   - `test => 3`
3. Tested
   - `deploy => 4`
   - `fail => 1`
4. Deployed `end`


---

<!-- _class: state-chart inline -->
<!-- _footer: "Inline · state-chart inline" -->

## Connection retry.

1. Connecting `start`
   - `retry => self`
   - `ok => 2`
   - `fail => 3`
2. Connected `live`
   - `disconnect => 1`
3. Failed `end`


---

<!-- _class: state-chart dark -->
<!-- _footer: "Composition: dark · state-chart dark" -->

`Submission lifecycle`

## Document approval flow.

How a draft moves from author to archive.

1. Draft `start`
   - `submit => 2`
   - `discard => 6`
2. Submitted `on-track`
   - `review => 3`
3. In Review
   - `approve => 4`
   - `reject => 1`
   - `revise => self`
4. Approved `done`
   - `publish => 5`
5. Published `live`
   - `archive => 6`
6. Archived `end`

*Rejected drafts return to the author; revisions stay in review.*


---

<!-- _class: state-chart compact -->
<!-- _footer: "Composition: compact · state-chart compact" -->

`Submission lifecycle`

## Document approval flow.

How a draft moves from author to archive.

1. Draft `start`
   - `submit => 2`
   - `discard => 6`
2. Submitted `on-track`
   - `review => 3`
3. In Review
   - `approve => 4`
   - `reject => 1`
   - `revise => self`
4. Approved `done`
   - `publish => 5`
5. Published `live`
   - `archive => 6`
6. Archived `end`

*Rejected drafts return to the author; revisions stay in review.*


---

<!-- _class: state-chart accent -->
<!-- _footer: "Composition: accent · state-chart accent" -->

`Submission lifecycle`

## Document approval flow.

How a draft moves from author to archive.

1. Draft `start`
   - `submit => 2`
   - `discard => 6`
2. Submitted `on-track`
   - `review => 3`
3. In Review
   - `approve => 4`
   - `reject => 1`
   - `revise => self`
4. Approved `done`
   - `publish => 5`
5. Published `live`
   - `archive => 6`
6. Archived `end`

*Rejected drafts return to the author; revisions stay in review.*


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · state-chart" -->

## When NOT to reach for state-chart.

- **More than ~8 states.** Vertical stacks of ten or more states stop reading as a machine and start reading as a list. If the system has many states, group them into phases and show one phase at a time, or step back to a higher-level abstraction. The chart's job is to make the topology obvious in one glance.
- **Hierarchical or parallel states.** v1 grammar is one flat list of states with one outgoing arrow per nested bullet. Composite states, orthogonal regions, history nodes — anything Mermaid's `stateDiagram-v2` does and this layout doesn't — belong in a Mermaid fence via the `diagram` component.
- **Continuous processes.** If the diagram is really a workflow with stages that overlap or block (queue depth, throughput, capacity), a `gantt` or `kanban` chart reads better. State charts are for discrete, mutually-exclusive states the system flips between.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `diagram` — the machine has hierarchical states, parallel regions, or guards that need Mermaid's full state-diagram grammar
- `journey` — the sequence is a user's path through tasks with mood / affect, not a system's discrete states
- `timeline-list` — events are points in time rather than transitions between named states
- `list-steps` — a linear procedure with no branching — state-chart is overkill if there are no choices to make
- `roadmap` — parallel workstreams across phases, not a single machine's transitions
