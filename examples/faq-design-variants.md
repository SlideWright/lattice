---
marp: true
theme: indaco
size: HD
---

<!-- _class: title silent -->

`FAQ Component Design`

# Five Layouts · Five Iterations Each

A design exploration — which form best serves your Q&A content?

---

<!-- _class: divider -->

# Variant 1 · Panel (default)

`faq`

---

<!-- _class: faq -->

## Due Diligence Q&A

- What is the current ARR?
  - $12.4M ARR growing 85% year-over-year for four consecutive quarters.
- What is the net revenue retention?
  - 118% NRR; logo churn is below 3% annually across all cohorts.
- Who are the top five customers?
  - Combined, the top five represent 28% of ARR and are all on multi-year contracts.
- What are the key risks?
  - Single cloud-provider dependency. Mitigation roadmap is detailed in the appendix.

---

<!-- _class: faq mirror -->

## Partnership Questions

- What SLA applies to partner integrations?
  - P1 issues escalated to our on-call team within 4 hours. 99.5% uptime SLA in the partner tier.
- What is the revenue share model?
  - 20% referral, 30% resell, 35% white-label. Accelerators above $500K annual partner-sourced ARR.
- Can partners customise the product UI?
  - Full white-label on the Enterprise API tier. Logo, colour scheme, and typography are configurable.
- How long does technical onboarding take?
  - Integration completes in 5–10 business days. Commercial onboarding runs in parallel.

---

<!-- _class: faq compact -->

## Board Q&A

- What is the single biggest risk this quarter?
  - Customer concentration: top three accounts represent 41% of ARR. Two enterprise contracts are late-stage to diversify.
- Why did NRR dip from 118% to 112%?
  - Two mid-market non-renewals. Root cause: insufficient onboarding coverage. Two CS managers being hired.
- How does the new pricing tier affect LTV?
  - Modelled LTV increases 22% on equivalent cohorts. Three months of data now confirm the projection.
- Is the IP clearly owned by the company?
  - Full IP assignment with all employees and contractors. No outstanding third-party claims.
- What is the H2 hiring plan?
  - Six engineers, two enterprise sales, one CFO. All senior searches actively interviewing.

---

<!-- _class: faq -->

## Financial Q&A

- What is the burn rate?
  - $820K per month net burn at current headcount, with 18 months of runway at the existing cash position.
- What drives the CAC increase this year?
  - Deliberate move upmarket to enterprise. CAC is up 40% but LTV is up 140%; the payback period improved.
- When does the model turn cash-flow positive?
  - Q3 at current growth, assuming two net-new enterprise logos per month as modelled.
- How is the $8M Series A being deployed?
  - 60% headcount, 25% go-to-market, 15% infrastructure. Six-month milestone checkpoint with the board.

---

<!-- _class: faq dark -->

## Compliance Questions

- Are you SOC 2 Type II certified?
  - Yes. Type II report covers the full prior fiscal year and is available under NDA on request.
- How do you handle a data breach?
  - Incident response playbook triggers within 15 minutes. Customers notified within 24 hours per GDPR Article 33.
- Is the platform fully GDPR-compliant?
  - Yes. DPA available on request. EU data stays in Frankfurt; US data stays in Virginia. No cross-border transfers without consent.
- Do you support custom data retention policies?
  - Configurable retention from 30 days to unlimited. Automated deletion and audit-log export on Enterprise.

---

<!-- _class: divider -->

# Variant 2 · Cards

`faq cards`

---

<!-- _class: faq cards -->

## Frequently Asked Questions

- Does it integrate with our existing stack?
  - Native integrations with Jira, GitHub, Notion, Figma, Slack, and Salesforce. Custom webhooks available on all plans.
- Is there a free trial?
  - All plans include a 14-day free trial with full feature access. No credit card required to start.
- What is the uptime SLA?
  - 99.9% uptime guaranteed on Growth and above, with 24-hour incident response on Enterprise.
- Can we export our data at any time?
  - Full export in JSON and CSV within 48 hours of any request. Your data is always yours.

---

<!-- _class: faq cards dark -->

## Security Questions

- Where is data stored?
  - SOC 2 Type II certified AWS data centres in your chosen region. No cross-region replication without explicit consent.
- Do you support multi-factor authentication?
  - TOTP and hardware security keys supported on all plans. Enforced MFA is available on Enterprise.
- What is the vulnerability disclosure policy?
  - Responsible disclosure programme. Critical vulnerabilities patched within 24 hours of confirmation.
- Is the codebase security-audited?
  - Annual pen test by a third-party firm plus continuous SAST in CI. Reports available under NDA on request.

---

<!-- _class: faq cards -->

## Investor Due Diligence

- What is the ARR and growth rate?
  - $12.4M ARR, 85% YoY growth for four consecutive quarters on a compounding base.
- What is the net revenue retention?
  - 118% NRR; logo churn is below 3% annually. Expansion motion is the primary growth lever.
- Who is the target customer?
  - Mid-market and enterprise software companies, 200–5000 employees, primarily North America and Western Europe.
- What is the average contract value?
  - $48K ACV on new logos; $72K on expansion. Multi-year contracts carry a 15% uplift over annual.
- What is the customer acquisition cost?
  - $18K CAC blended across all channels. Payback period is 4.5 months at current ACV.
- What is the competitive moat?
  - 18-month rendering pipeline lead, 400 reference customers, and 3 pending patents on layout algorithms.

---

<!-- _class: faq cards -->

## M&A Committee Questions

- Is the revenue recurring?
  - 92% of revenue is under annual or multi-year contracts. 8% is professional services booked at delivery.
- Are there change-of-control provisions?
  - Three enterprise customers have CoC notification clauses. None carry termination rights on acquisition.
- What IP is owned versus licensed?
  - The core rendering engine is 100% proprietary and assigned to the company. Open-source dependencies are MIT or Apache 2 licensed.
- What litigation risk exists?
  - No pending or threatened litigation. Two minor employment claims settled in the prior fiscal year; both fully resolved.

---

<!-- _class: faq cards accent -->

## Partnership FAQ

- What integration models are available?
  - Embedded SDK, white-label API, and co-sell agreements. Each has its own commercial structure and SLA.
- What revenue share applies?
  - 20% for referral, 30% for resell, 35% for white-label. Accelerators kick in above $500K annual partner ARR.
- Who manages the partner relationship?
  - A dedicated partner success manager is assigned within 30 days of signing. Quarterly business reviews are standard.
- How is support handled for our end customers?
  - Partners share a dedicated Slack channel with our support team. P1 issues are escalated within 4 hours.

---

<!-- _class: divider -->

# Variant 3 · Indexed

`faq indexed`

---

<!-- _class: faq indexed -->

## Top Three Questions

- What is the path to $50M ARR?
  - Land three new enterprise logos per month at current ACV. NRR above 110% compounds without new logo growth. At this trajectory we reach $50M in 28 months.
- Who is the buyer and what does the sales cycle look like?
  - VP Engineering and CPO, typically co-sponsoring. Average 67-day sales cycle from first demo; 22 days from procurement to close.
- What happens if a key executive departs?
  - The platform, IP, and customer relationships are institutionalised across a 24-person team. No founder owns a customer relationship.

---

<!-- _class: faq indexed compact -->

## Product Strategy Q&A

- Why build on Marp rather than a proprietary renderer?
  - Marp has 25K stars, active maintenance, and a proven Chromium renderer. Our differentiation is the layout system and palette engine — not the PDF renderer itself.
- What is the mobile strategy?
  - PDFs are the deliverable format — mobile rendering is a browser concern. We produce fidelity-perfect vector PDFs, not pixel-adapted responsive views.
- How does the AI authoring layer fit into the roadmap?
  - The AI assist layer sits above the layout system, not below it. Layout primitives and token contract remain human-authorable; AI helps you pick the right ones.
- What is the pricing model evolution?
  - Moving from per-seat to usage-based in 18 months. Conversion modelling shows a 35% revenue uplift on current cohorts.

---

<!-- _class: faq indexed dark -->

## Audit Committee Questions

- What controls govern access to production data?
  - Role-based access with least-privilege enforcement. All production access requires MFA, is fully logged, and reviewed quarterly by the CISO.
- How are vendor dependencies managed?
  - Quarterly risk assessment for all tier-one dependencies. Critical dependencies have contractual SLAs and evaluated alternatives on standby.
- What is the incident response process?
  - Defined P1–P4 severity tiers, 15-minute paging SLA for P1, and post-mortems published internally within 5 business days.

---

<!-- _class: faq indexed compact -->

## Engineering Onboarding FAQ

- When do I get access to all systems?
  - Day one. IT provisions Notion, Linear, GitHub, Figma, Slack, and 1Password before you arrive.
- Where is the engineering handbook?
  - Notion → Engineering Hub → Handbook. Your manager shares the direct link in your welcome message.
- How are on-call rotations structured?
  - PagerDuty. You join the rotation at 60 days after shadow shifts in weeks 5–8.
- Who approves code reviews?
  - Any two senior engineers. PRs stay open 24 hours minimum to allow async review across time zones.
- What is the production release cadence?
  - Continuous deployment to staging; weekly production releases every Tuesday at 10am UTC.

---

<!-- _class: faq indexed compact -->

## Legal Due Diligence

- Is all intellectual property owned by the company?
  - Yes. IP assignment agreements signed by all employees, contractors, and advisors. No third-party claims outstanding or threatened.
- Are there any pending litigation matters?
  - No pending or threatened litigation. Two minor employment claims settled in the prior fiscal year; both fully resolved.
- What does the data processing agreement cover?
  - Standard GDPR and CCPA terms including sub-processor list, audit rights, and 72-hour breach notification. Available under NDA on request.
- Are employment contracts assignment-friendly on acquisition?
  - Yes. All contracts include change-of-control provisions. Three senior engineers have four-year vesting; none are past their cliff date.

---

<!-- _class: divider -->

# Variant 4 · Focused

`faq focused`

---

<!-- _class: faq focused -->

## Is this genuinely enterprise-grade?

Every one of our 400 enterprise customers runs mission-critical workloads on the platform — with a 99.97% uptime SLA backed by contractual guarantees, not marketing language.

---

<!-- _class: faq focused dark -->

## What is the path to profitability?

We turn contribution-margin positive in Q3 at current growth rates. No structural cost step-changes are needed — the model self-funds at $18M ARR on the existing cost basis.

---

<!-- _class: faq focused -->

## Why haven't the incumbents built this?

They have tried and failed. Microsoft 365 and Google Slides optimise for mass-market editing loops, not for the PDF-first, code-adjacent workflow our buyers need. Their rendering is screen-adaptive; ours is print-exact.

---

<!-- _class: faq focused dark -->

## What happens if the founders leave?

The platform, customer relationships, and institutional knowledge are distributed across a 24-person team. No customer contract is personally owned by any founder. The product runs without founder involvement today.

---

<!-- _class: faq focused -->

## Is the platform secure enough for regulated-industry data?

Our security posture is SOC 2 Type II certified, pen-tested annually by a third-party firm, and reviewed quarterly by the board's audit committee. The full security report is available under NDA on the first call.

---

<!-- _class: divider -->

# Variant 5 · Ledger

`faq ledger`

---

<!-- _class: faq ledger -->

## Common Questions

- What is the onboarding timeline?
  - New hires complete all paperwork and training within their first 30 days.
- How does the expense policy work?
  - Up to $150 without pre-approval; over $150 requires a receipt and manager sign-off in Expensify.
- Where is the engineering handbook?
  - Notion → Engineering Hub → Handbook. Your manager shares the link on day one.
- Who handles benefits questions?
  - People Ops owns benefits. DM @hr-team in Slack or book a 15-minute slot via Calendly.

---

<!-- _class: faq ledger dark -->

## Investor Questions

- What is the current ARR?
  - $12.4M ARR growing 85% year-over-year for four consecutive quarters.
- What is the net revenue retention?
  - 118% NRR; logo churn is below 3% annually across all cohorts.
- When is profitability expected?
  - Contribution-margin positive in Q3 at current growth; cash-flow positive in 18 months.
- What is the use of funds?
  - 60% GTM expansion, 30% R&D on new render targets, 10% infrastructure hardening.

---

<!-- _class: faq ledger compact -->

## First-Week Essentials

- What tools do I set up on day one?
  - Notion, Linear, Figma, Slack, and 1Password. Your manager shares onboarding links before you arrive.
- How do I request access to production systems?
  - Submit a Data Access Request in Linear with the access-request label; approved within 24 hours.
- Where is the meeting schedule?
  - In the shared Notion calendar. Standups are Monday, Wednesday, and Friday at 9am.
- Who do I ask about my equity grant?
  - Finance owns this. Book a 30-minute slot with the CFO via Calendly in your first week.
- What is the expense policy?
  - Up to $150 without pre-approval. Over $150, submit in Expensify with receipt and manager approval.
- When is the first performance review?
  - At your 90-day mark. Quarterly reviews run in March, June, September, and December thereafter.

---

<!-- _class: faq ledger accent -->

## Platform Questions

- Does the platform support SSO?
  - Yes. SAML 2.0 and OIDC are supported out of the box; SCIM provisioning is available on Enterprise.
- What happens to our data if we cancel?
  - You retain all your data. A full export in JSON and CSV is provided within 48 hours of cancellation.
- Is there a public API?
  - REST and GraphQL APIs are available on all plans, with SDK libraries for Python, Go, and TypeScript.
- What are the uptime guarantees?
  - 99.9% uptime SLA on Growth and above, with 24-hour incident response SLA on Enterprise.

---

<!-- _class: faq ledger -->

## Board Frequently Asked Questions

- What is the single biggest risk this quarter?
  - Customer concentration: the top three accounts represent 41% of ARR. Two new enterprise contracts are late-stage to diversify.
- Why did NRR dip from 118% to 112%?
  - Two mid-market non-renewals. Root cause: insufficient onboarding coverage. Two CS managers are being hired to close the gap.
- How does the new pricing tier affect LTV?
  - Modelled LTV increases 22% on equivalent cohorts. First three months of data confirm the projection.
- Is all IP clearly owned by the company?
  - Yes. Full assignment agreements with all employees and contractors. No third-party IP claims outstanding.
- What is the H2 hiring plan?
  - Six engineers, two enterprise sales, one CFO. All senior searches are actively interviewing.
