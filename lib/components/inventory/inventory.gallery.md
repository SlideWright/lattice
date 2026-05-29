<!-- _class: title silent -->

# inventory

`12 components`

Inventory — parallel sets of related items.


---

<!-- _class: actors -->

## Who owns what when an incident is live.

- **Incident Commander.** Directs the response, owns the timeline, makes the call to escalate.
- **Operations Lead.** Drives mitigation hands-on — rollback, failover, load-shedding.
- **Communications.** Posts the 30-minute status updates and briefs the customer-facing teams.
- **Scribe.** Logs every action with a timestamp for the post-incident review.
- **Executive Sponsor.** Clears blockers and approves customer comms; stays out of the debugging.

---

<!-- _class: agenda -->

## What this review covers.

1. Where Q2 landed against plan — slide 3
2. The enterprise renewal shortfall — slide 8
3. What we are changing in Q3 — slide 14
4. The resourcing ask — slide 21
5. Risks we are watching — slide 27

---

<!-- _class: cards-grid -->

## The framework has four components.

- Signal Intake.
  - Weekly structured collection across customer conversations, market data, and competitive moves. Normalized into a common schema before scoring.
- Scoring Model.
  - Each signal scored on three dimensions — confidence, recency, and strategic relevance. Weights are team-configurable and reviewed quarterly.
- Decision Log.
  - Every decision recorded with the signals that informed it, the options considered, and the criteria applied. Feeds the calibration loop.
- Calibration Loop.
  - Monthly retrospective that compares predicted outcomes to actual outcomes and adjusts scoring weights accordingly.

---

<!-- _class: cards-side -->

## Two ways into the European market.

- Direct sales motion.
  - Stand up a Dublin team and sell into enterprise accounts ourselves. Higher margin and full control of the relationship, against a 9-to-12-month ramp before the first rep carries quota.
- Channel partnership.
  - Resell through an established regional integrator. Revenue inside two quarters and local compliance handled for us, at the cost of a 30% margin share and a thinner line to the customer.

---

<!-- _class: cards-stack -->

## Three forces are compressing the differentiation window.

- Infrastructure has commoditized.
  - The platform work that took us two years is now a managed service a competitor can switch on in an afternoon. The moat is no longer the stack.
- Release cycles have collapsed.
  - What used to ship annually now ships monthly. A visible advantage is matched before the next board meeting.
- Switching costs are rising.
  - Customers consolidate vendors and sign longer contracts. The window to win an account is shorter, and losing one lasts longer.

---

<!-- _class: cards-wide -->

## Three findings from the Q2 win/loss review.

1. Price is rarely the reason we lose
   - In 31 of 38 closed-lost interviews the buyer named time-to-value, not cost. We are losing in the evaluation, not the negotiation.
2. The security review is our slowest gate
   - Enterprise contracts spent 18 extra days in legal this quarter, almost all of it traced to a security addendum introduced in March.
3. One competitor takes most of the displacement
   - Seven of nine competitive losses in the $80–200K tier went to the same rival. The exposure is concentrated, which means it is fixable.

---

<!-- _class: checklist -->

## Go-live readiness for the codebook rollout.

- [x] Load test passed at 3× projected peak throughput
- [x] Key-rotation runbook signed off by security
- [x] Tenant migration rehearsed end to end in staging
- [-] Examiner audit pack drafted, pending compliance review
- [-] On-call rotation staffed, one gap in the EU window
- [ ] Customer comms scheduled with named owners
- [ ] Rollback plan rehearsed against production data

---

<!-- _class: glossary -->

## Glossary

- Consent
  - A freely given, specific, informed agreement to processing — pre-ticked boxes don't count.
- Controller
  - The party that decides why and how personal data is processed, and carries the legal accountability for it.
- DSAR
  - Data Subject Access Request — a person's demand to see, correct, or delete the data held on them, on a 45-day clock under CCPA.
- PII
  - Personal information that identifies a person, now read broadly enough to cover device IDs, cookies, and IP addresses.
- Processor
  - A party that processes data on the controller's instructions — a vendor, not the decision-maker.

---

<!-- _class: list -->

## What the first six months of pilots taught us.

- Teams log roughly one decision for every twenty they actually make.
- The scoring weights get re-tuned after almost every retrospective.
- Predicted outcomes are the field most often left blank.
- Alignment scores rose fastest on the teams that reviewed the log weekly.
- No pilot team has asked to go back to the old process.

---

<!-- _class: list-tabular -->

## The five workstreams carrying the H2 platform plan.

1. Platform
   - Multi-tenant codebooks and per-purpose keys — the latency and isolation work.
   - _Two engineers · ships Q3_
2. Operations
   - Automated rotation and crypto-shred, retiring the manual maintenance window.
   - _One engineer · ships Q3_
3. Compliance
   - Centralised audit log and the examiner-ready export pack.
   - _One engineer · ships Q4_
4. Security
   - Threat-model refresh and a third-party penetration test ahead of GA.
   - _One engineer · ships Q4_
5. SDK
   - Polyglot parity so every client team adopts the same path.
   - _Contractor · ships Q4_

---

<!-- _class: principles -->

## How we make calls when the spec is silent.

- **Default to the cheaper-to-reverse choice.** Reversible decisions don't need a meeting; only the irreversible ones do.
- **Name the actor, never the system.** "The PM decides" lands; "the process decides" hides who is accountable.
- **Write the bet down next to the choice.** A decision recorded without its predicted outcome can't be learned from later.
- **Disagree in the room, commit outside it.** Dissent is cheap before the call and expensive after.
- **Optimise for the reader who wasn't there.** If the log needs a translator, it isn't a log.

---

<!-- _class: tldr -->

## What this review showed, in five lines.

- Q2 revenue missed plan by 9%, and three structural factors explain almost all of it.
- The shortfall is in enterprise renewals, not new logos.
- Every one of the three causes is fixable before the Q4 close.
- The Q3 plan moves two engineers and one rep onto the gaps.
- We are not asking for more headcount — only to move what we have.
