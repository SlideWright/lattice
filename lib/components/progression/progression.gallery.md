<!-- _class: title silent -->

# progression

`4 components`

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

1. SOC 2 Type II
   - A current report with no exceptions in the security or availability criteria.
2. Data residency
   - Customer data stays in-region; every sub-processor is disclosed and contractually bound.
3. Exit guarantee
   - Full data export in a documented format, available without opening a support ticket.
4. Breach notification
   - A 72-hour notice obligation written into the contract, not the marketing page.
5. Uptime history
   - Twelve months of published status at 99.9% or better, verifiable independently.

---

<!-- _class: list-steps -->

## What happens in the first hour of an incident, in theory.

1. Declare and page
   - Whoever notices opens the incident channel and pages on-call. Declaring is cheap; a missed page is the line item in the post-mortem.
2. Assign a commander
   - One person owns coordination and communication. They direct the response — they do not debug it, though they will be asked why they aren't.
3. Stop the bleeding
   - Mitigate before diagnosing. Roll back, fail over, or shed load first; find the root cause once customers are safe and the board has logged off.
4. Communicate on a clock
   - A status update every 30 minutes, even when it is "still investigating." Silence is what the retrospective remembers.

---

<!-- _class: roadmap -->

`H2 2026 · Rollout plan`

## What ships in each phase, assuming the phases survive the next planning offsite.

| Workstream | Foundation `Q2 2026`   | Hardening `Q3 2026`      | Scale `Q4 2026`         |
| ---------- | ---------------------- | ------------------------ | ----------------------- |
| Framework  | [x] Signal taxonomy    | [-] Scoring model v2     | [ ] Per-team weighting  |
| Adoption   | [x] Pilot onboarding   | [-] Weekly signal review | [ ] Org-wide rollout    |
| Governance | [x] Decision log       | [x] Calibration cadence  | [ ] Board reporting     |
| Tooling    | [x] Intake form        | [/] Dashboards           | [ ] Self-serve exports  |
