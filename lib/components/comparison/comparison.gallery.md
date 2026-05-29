<!-- _class: title silent -->

# comparison

`8 components`

Comparison — how two or more options differ.


---

<!-- _class: before-after -->

## What moving off the central vault changed.

- Before.
  - Every tokenization call round-tripped to a central vault. p99 latency 60 ms, a single regional outage took every tenant down, and key rotation meant a four-hour maintenance window.
- After.
  - Codebooks run in-process beside the service. p99 under 5 ms, an outage is scoped to one tenant, and rotation happens online with no window at all.

---

<!-- _class: compare-prose -->

## Renew at list price, or hold the discount.

- Hold the published rate
  - Protect the list price and signal pricing discipline to the rest of the base. Risks four at-risk accounts worth $2.1M ARR walking at renewal.
- Extend the legacy discount
  - Keep the four accounts by carrying their 2023 pricing one more year. Buys retention now, but the discount has already leaked to two prospects in the same segment.

---

<!-- _class: compare-table -->

## How the three encryption models trade off.

| Model | Latency p99 | Blast radius | Key rotation |
| --- | --- | --- | --- |
| Central vault | 60 ms | Every tenant | Offline window |
| In-process codebook | < 5 ms | One tenant | Online |
| Client-side envelope | < 2 ms | One record | Manual, per client |

---

<!-- _class: decision -->

## Buy the platform; build the differentiation.

- Buy and configure.
  - Adopt the vendor's data infrastructure — live in six weeks, freeing three engineer-quarters for the product layer where the differentiation actually lives.
- Build in-house.
  - Full control of schema and roadmap, but two to three engineer-quarters to reach parity with a platform we could adopt now and replace later.

---

<!-- _class: matrix-2x2 -->

## Where the H2 bets land on effort and impact.

- **High impact · Low effort.**
  - Automated key rotation
  - Examiner audit pack
- **High impact · High effort.**
  - Multi-tenant codebooks
  - Polyglot SDK parity
- **Low impact · Low effort.**
  - Status-page polish
  - Dependency dashboard
- **Low impact · High effort.**
  - Bespoke per-tenant audit UI
  - Custom SCIM connector

---

<!-- _class: redline -->

## SB-362 rewrote the opt-out link rule.

`Cal. Civ. Code §1798.135 · amendment SB-362 (2024)`

> A business that <del>collects</del> <ins>collects, sells, or shares</ins> consumers' personal information shall provide <del>two or more</del> <ins>at least one</ins> designated method for submitting requests to opt-out, <ins>including, at minimum, a clear and conspicuous link on the homepage titled "Your Privacy Choices,"</ins> for use by consumers to <del>opt out of the sale of</del> <ins>direct the business not to sell or share</ins> their personal information.

- **Why this matters.** SB-362 collapses sale and sharing into one duty and pins a uniform link title — homepage chrome and DSAR workflows both need a uniform UX.

---

<!-- _class: split-compare -->

`Decision Required`

## Build the data layer or buy it?

Both paths are viable. The difference is where we spend the next 18 months.

- Build in-house
  - Full control over schema and roadmap
  - 2–3 engineer-quarters to reach feature parity
  - Ongoing maintenance burden stays internal
- Buy + configure
  - Ship in 6 weeks, not 9 months
  - Engineering capacity redirects to product-layer features
  - Exit risk manageable — data export contractually guaranteed

> Buy the infrastructure. Build the differentiation. Revisit in 24 months.

---

<!-- _class: verdict-grid -->

## Which data platform clears the bar.

- **Vendor North.**
  - [x] SOC 2 Type II
  - [x] In-region residency
  - [-] Self-serve export
- **Vendor West.**
  - [x] SOC 2 Type II
  - [ ] In-region residency
  - [x] Self-serve export
- **Build in-house.**
  - [ ] SOC 2 Type II
  - [-] In-region residency
  - [ ] Self-serve export
