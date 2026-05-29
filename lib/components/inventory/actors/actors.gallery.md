---
marp: true
theme: indaco
paginate: true
header: "Lattice · actors"
---

<!-- _class: title silent -->

# actors

`Inventory · Ledger · Structure`

Roster of responsibilities owned by named actors.

---

<!-- _class: actors -->
<!-- _footer: "Default · actors" -->

## Who owns what when an incident is live.

- **Incident Commander.** Directs the response, owns the timeline, makes the call to escalate.
- **Operations Lead.** Drives mitigation hands-on — rollback, failover, load-shedding.
- **Communications.** Posts the 30-minute status updates and briefs the customer-facing teams.
- **Scribe.** Logs every action with a timestamp for the post-incident review.
- **Executive Sponsor.** Clears blockers and approves customer comms; stays out of the debugging.


---

<!-- _class: actors dark -->
<!-- _footer: "Composition: dark · actors dark" -->

## Who owns what when an incident is live.

- **Incident Commander.** Directs the response, owns the timeline, makes the call to escalate.
- **Operations Lead.** Drives mitigation hands-on — rollback, failover, load-shedding.
- **Communications.** Posts the 30-minute status updates and briefs the customer-facing teams.
- **Scribe.** Logs every action with a timestamp for the post-incident review.
- **Executive Sponsor.** Clears blockers and approves customer comms; stays out of the debugging.


---

<!-- _class: actors compact -->
<!-- _footer: "Composition: compact · actors compact" -->

## Who owns what when an incident is live.

- **Incident Commander.** Directs the response, owns the timeline, makes the call to escalate.
- **Operations Lead.** Drives mitigation hands-on — rollback, failover, load-shedding.
- **Communications.** Posts the 30-minute status updates and briefs the customer-facing teams.
- **Scribe.** Logs every action with a timestamp for the post-incident review.
- **Executive Sponsor.** Clears blockers and approves customer comms; stays out of the debugging.


---

<!-- _class: actors accent -->
<!-- _footer: "Composition: accent · actors accent" -->

## Who owns what when an incident is live.

- **Incident Commander.** Directs the response, owns the timeline, makes the call to escalate.
- **Operations Lead.** Drives mitigation hands-on — rollback, failover, load-shedding.
- **Communications.** Posts the 30-minute status updates and briefs the customer-facing teams.
- **Scribe.** Logs every action with a timestamp for the post-incident review.
- **Executive Sponsor.** Clears blockers and approves customer comms; stays out of the debugging.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · actors" -->

## When NOT to reach for actors.

- **Process sequence.** If the rows describe stages in order, use list-steps or process-flow. actors is for parallel ownership, not handoff sequence.
- **Long per-actor prose.** More than one sentence per row crowds the ledger. Move the detail to a dedicated slide and keep actors as the index.
- **Roles without names.** If the labels are job titles in the abstract ("the engineer"), reach for cards-stack or list. The actors layout earns its weight when the names are named.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `list-tabular` — rows are reference entries, not owners
- `cards-stack` — each item needs two sentences of body text
- `principles` — stating shared rules rather than per-actor responsibilities
- `glossary` — the left column is a term, not an actor
