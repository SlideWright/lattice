---
marp: true
theme: indaco
paginate: true
header: "Lattice · pricing"
---

<!-- _class: title silent -->

# pricing

`Comparison · Grid · Structure`

Side-by-side plan tiers with prices, feature checklists, and one recommended column.

---

<!-- _class: pricing -->
<!-- _footer: "Default · pricing" -->

## Pick the plan that fits the team.

- Starter `$0`
  - [x] Up to 3 seats
  - [/] SSO
  - [/] Dedicated support
  - For evaluating, one team.
- Growth `$49 / mo` *Most popular*
  - [x] Up to 25 seats
  - [x] SSO
  - [/] Dedicated support
  - For scaling teams.
- Enterprise `Custom`
  - [x] Unlimited seats
  - [x] SSO + SCIM
  - [x] Dedicated support
  - For procurement and compliance.


---

<!-- _class: pricing two -->
<!-- _footer: "Two — a pair of tiers · pricing two" -->

## Two ways to buy.

- Self-serve `$49 / mo`
  - [x] Up to 25 seats
  - [x] SSO
  - [/] Dedicated CSM
  - [/] Custom contract
  - For teams that onboard themselves.
- Enterprise `Custom` *Recommended*
  - [x] Unlimited seats
  - [x] SSO + SCIM
  - [x] Dedicated CSM
  - [x] Custom contract
  - For procurement, security review, and scale.


---

<!-- _class: pricing four compact -->
<!-- _footer: "Four — a full ladder · pricing four" -->

## The full ladder, free to enterprise.

- Free `$0`
  - [x] 1 seat
  - [/] SSO
  - For trying it out.
- Team `$29`
  - [x] 10 seats
  - [/] SSO
  - For small teams.
- Growth `$49` *Most popular*
  - [x] 25 seats
  - [x] SSO
  - For scaling teams.
- Enterprise `Custom`
  - [x] Unlimited
  - [x] SSO + SCIM
  - For procurement.


---

<!-- _class: pricing -->
<!-- _footer: "Stress test · pricing" -->

## Six lines of features per tier still hold.

- Starter `$0`
  - [x] Up to 3 seats
  - [x] Community support
  - [/] SSO
  - [/] Audit log
  - [/] Dedicated CSM
  - [/] 99.9% uptime SLA
  - For evaluating, one team.
- Growth `$49 / mo` *Most popular*
  - [x] Up to 25 seats
  - [x] Priority support
  - [x] SSO
  - [-] Audit log
  - [/] Dedicated CSM
  - [/] 99.9% uptime SLA
  - For scaling teams.
- Enterprise `Custom`
  - [x] Unlimited seats
  - [x] Dedicated support
  - [x] SSO + SCIM
  - [x] Audit log
  - [x] Dedicated CSM
  - [x] 99.9% uptime SLA
  - For procurement and compliance.


---

<!-- _class: pricing dark -->
<!-- _footer: "Composition: dark · pricing dark" -->

## Pick the plan that fits the team.

- Starter `$0`
  - [x] Up to 3 seats
  - [/] SSO
  - [/] Dedicated support
  - For evaluating, one team.
- Growth `$49 / mo` *Most popular*
  - [x] Up to 25 seats
  - [x] SSO
  - [/] Dedicated support
  - For scaling teams.
- Enterprise `Custom`
  - [x] Unlimited seats
  - [x] SSO + SCIM
  - [x] Dedicated support
  - For procurement and compliance.


---

<!-- _class: pricing compact -->
<!-- _footer: "Composition: compact · pricing compact" -->

## Pick the plan that fits the team.

- Starter `$0`
  - [x] Up to 3 seats
  - [/] SSO
  - [/] Dedicated support
  - For evaluating, one team.
- Growth `$49 / mo` *Most popular*
  - [x] Up to 25 seats
  - [x] SSO
  - [/] Dedicated support
  - For scaling teams.
- Enterprise `Custom`
  - [x] Unlimited seats
  - [x] SSO + SCIM
  - [x] Dedicated support
  - For procurement and compliance.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · pricing" -->

## When NOT to reach for pricing.

- **More than four tiers.** Five-plus columns shrink below readability and the price comparison collapses. Curate to the tiers that matter, or use `compare-table` for a dense feature-by-plan matrix.
- **Every tier marked popular.** Elevate exactly one tier. Two ribbons cancel out and the eye has nowhere to land — the whole point of the marker is a single recommendation.
- **Features that drift between tiers.** If each tier lists a different set of features, the columns can't be compared row-for-row. Keep the feature list and order identical; toggle inclusion with `[x]` / `[/]`.
- **A wall of red 'not included'.** Use `[/]` (muted, struck through) for an absent feature, not `[ ]` (alarming empty/fail). A pricing table sells what's included; it shouldn't read as a list of denials.

---

<!-- _class: closing silent -->

## See also.

`Related components`

- `compare-table` — a dense feature-by-plan matrix with many rows, not a few highlighted features
- `verdict-grid` — options scored on shared criteria, not priced tiers
- `cards-grid` — parallel items with no price and no shared feature checklist
- `decision` — the slide recommends one option outright rather than presenting a price ladder
- `big-number` — a single headline price, not a tiered comparison
