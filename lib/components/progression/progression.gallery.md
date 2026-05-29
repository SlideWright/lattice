<!-- _class: title silent -->

# progression

`6 components`

Progression — ordered movement through stages or time.


---

<!-- _class: journey -->

## Customer onboarding · trial to activation.

- Evaluate
  - Read case study `@prospect` `:5`
  - Book demo `@prospect` `:4`
  - Live demo `@prospect` `@sales` `:4`
- Trial
  - Trial signup `@prospect` `:3`
  - Workspace setup `@user` `@onboarding` `:1`
- Activate
  - First report `@user` `:3`
  - Daily use `@user` `:5`

---

<!-- _class: list-criteria -->

## What a vendor must clear before procurement signs.

1. **SOC 2 Type II**
   - A current report with no exceptions in the security or availability criteria.
2. **Data residency**
   - Customer data stays in-region; every sub-processor is disclosed and contractually bound.
3. **Exit guarantee**
   - Full data export in a documented format, available without opening a support ticket.
4. **Breach notification**
   - A 72-hour notice obligation written into the contract, not the marketing page.
5. **Uptime history**
   - Twelve months of published status at 99.9% or better, verifiable independently.

---

<!-- _class: list-steps -->

## What happens in the first hour of an incident.

1. Declare and page
   - Whoever notices opens the incident channel and pages on-call. Declaring is cheap; a missed page is not.
2. Assign a commander
   - One person owns coordination and communication. They direct the response — they do not debug it.
3. Stop the bleeding
   - Mitigate before diagnosing. Roll back, fail over, or shed load first; find the root cause once customers are safe.
4. Communicate on a clock
   - A status update every 30 minutes, even when it is "still investigating." Silence is what erodes trust.

---

<!-- _class: roadmap -->

`H2 2026 · Platform plan`

## What ships in each phase, by workstream.

| Workstream | Foundation `Q2 2026`  | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | --------------------- | ---------------------- | ------------------------- |
| Platform   | [x] Codebook signing  | [-] Multi-tenant DEKs  | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation   | [-] Automated rotation | [ ] Crypto-shred          |
| Compliance | [x] Audit trail       | [x] Centralised log    | [ ] Examiner pack         |
| SDK        | [x] Java              | [/] .NET               | [ ] Polyglot parity       |

---

<!-- _class: split-steps -->

`02`

## Discovery and Scoping

Four weeks. Shared definition of the problem before any solution work begins.

1. Stakeholder Interviews
   - Eight cross-functional conversations. Open questions only — listening for friction, not confirming assumptions.
2. Current-State Audit
   - System inventory, workflow documentation, and data-quality review feed a single source-of-truth artefact.
3. Problem Framing Workshop
   - Half-day session to align on root cause. Output is a ranked problem statement the team signs off on.
4. Scope Confirmation
   - Written sign-off on what is in, what is out, and what requires a separate decision.

---

<!-- _class: timeline -->

## From first pilot to general availability.

1. **Pilot**
   - *Four product teams run the framework for a quarter against a shared baseline.*
2. **Calibrate**
   - *Scoring weights are tuned against real outcomes; the decision log becomes mandatory.*
3. **Roll out**
   - *Every product team onboards and the weekly signal review joins the operating rhythm.*
4. **GA**
   - *The framework leaves pilot status and ships as the default for new initiatives.*
