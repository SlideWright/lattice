---
marp: true
theme: indaco
size: hd
paginate: true
header: "Lattice · Legal & regulatory layouts"
footer: "Finalists · six anchors · 17 variants"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Legal layouts — finalists.

`Boardroom-ready · privacy, regulatory, compliance · 2026`

Six anchors. Two to three variants each. Lean authoring throughout — slot labels auto-lift via CSS, state markers use the universal `[x] [-] [ ]` grammar.

---

<!-- _class: subtopic -->
<!-- _footer: "Orientation · subtopic" -->

`What survived the cut`

## Each anchor ships the strongest variant plus the complements that cover a different content rhythm — never duplicates.

Seventeen variants total instead of thirty. Every kept layout earns its place by serving a content job no sibling can do. Slot labels are auto-bolded by the `slotLabelLift` transform — author writes `- Federal`, not `- **Federal**`. The obligation matrix uses `[x] [-] [ ]` cells like every other state-marked layout in Lattice.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Anchor 01 · statute-stack" -->

`Anchor 01 · Federal / State / Local`

## Three jurisdictions, three content jobs, three layouts.

---

<!-- _class: statute-stack -->
<!-- _footer: "statute-stack · default (rails)" -->

## Children's data — three jurisdictions, three obligations.

- Federal
  - `15 U.S.C. §6501 · COPPA`
  - Verifiable parental consent for under-13 personal data.
  - Operators must post a clear notice and a deletion route.
  - `In effect since 2000`
- State
  - `Cal. Civ. Code §1798.120 · CCPA/CPRA`
  - Opt-in for selling or sharing under-16 data; opt-out for over-16.
  - DSAR handling within 45 days; deletion verified.
  - `Enforced 2023`
- Local
  - `NYC Admin Code §22-1201`
  - Bias-audit obligation for AEDTs used in employment decisions.
  - Annual audit + candidate notice + public summary.
  - `Effective 2023`

When the room wants three parallel facts at a glance.

---

<!-- _class: statute-stack preemption -->
<!-- _footer: "statute-stack · preemption" -->

## Federal floor → State adds opt-in → Local adds audit duty.

- Federal
  - `15 U.S.C. §6501 · COPPA`
  - Verifiable parental consent for under-13 PI; this is the floor.
- State
  - `Cal. Civ. Code §1798.120 · CCPA/CPRA`
  - California adds opt-in for sale or sharing of under-16 data.
- Local
  - `NYC §22-1201`
  - New York City adds an annual AEDT bias-audit duty on top.

When the relationship between tiers is the point — not parallel facts.

---

<!-- _class: statute-stack lane -->
<!-- _footer: "statute-stack · lane" -->

## Jurisdiction, citation, obligation, status.

| Jurisdiction | Citation                 | Headline obligation                    | Status         |
| ------------ | ------------------------ | -------------------------------------- | -------------- |
| Federal      | 15 U.S.C. §6501          | Parental consent for under-13 data     | In effect 2000 |
| State        | Cal. Civ. Code §1798.120 | Opt-in for selling under-16 data       | Enforced 2023  |
| Local        | NYC §22-1201             | Annual bias audit for employment AEDTs | Effective 2023 |

When the audience wants to scan many obligations at once.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Anchor 02 · citation-card" -->

`Anchor 02 · quote → translate → act`

## The verbatim regulation, in plain English, with the obligation.

---

<!-- _class: citation-card -->
<!-- _footer: "citation-card · default (stack)" -->

## What counts as "personal information" under CCPA.

`Cal. Civ. Code §1798.140(o) · CCPA/CPRA`

> "Personal information" means information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or household.

- In plain English: any data tied to a household or device, not just a named person — IP addresses, cookie IDs, and device fingerprints are all in scope.
- **What we must do** Treat household-level identifiers as PI in our notice, retention, and DSAR workflows. Audit pixel and tag inventory next quarter.

---

<!-- _class: citation-card pull-quote -->
<!-- _footer: "citation-card · pull-quote" -->

## "Personal information" includes the household, not just the person.

`Cal. Civ. Code §1798.140(o) · CCPA/CPRA`

> Information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or household.

- **What we must do** Audit pixel inventory; treat household IDs as PI in DSAR workflows.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Anchor 03 · obligation-matrix" -->

`Anchor 03 · regimes × obligations`

## Where every privacy regulator stands on every duty.

---

<!-- _class: obligation-matrix -->
<!-- _footer: "obligation-matrix · default (grid)" -->

## Privacy obligations across regimes — neutral grid.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Filled = applies, half = partial, empty = exempt. Neutral ink — data first.

---

<!-- _class: obligation-matrix heat -->
<!-- _footer: "obligation-matrix · heat" -->

## Privacy obligations — heat map (red = applies = action).

| Regulation | Notice | Consent | Retention | Breach | DSAR |
| ---------- | :----: | :-----: | :-------: | :----: | :--: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]  |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]  |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]  |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]  |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]  |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]  |

Same grammar, semantic palette — red cells = action items.

---

<!-- _class: obligation-matrix asymmetric -->
<!-- _footer: "obligation-matrix · asymmetric" -->

## Three regimes, three obligations, room to breathe.

| Regulation | Notice                                                   | Consent                                                        | DSAR                                                       |
| ---------- | -------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| GDPR       | Pre-collection; layered with purposes and legal basis    | Opt-in; explicit for special-category data                     | 30-day response; identity verification required            |
| CCPA/CPRA  | At or before collection; "Notice at Collection" required | Opt-out default for sale/sharing; opt-in for under-16 minors   | 45-day response; two free requests per consumer per year   |
| LGPD       | Pre-collection; controller identity disclosed            | Opt-in for most processing; multiple legal bases recognised    | 15-day response; appeal route to the ANPD                  |

When each cell carries a sentence, not a glyph.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Anchor 04 · regulatory-update" -->

`Anchor 04 · what's new`

## The regulatory motion that closed this quarter.

---

<!-- _class: regulatory-update -->
<!-- _footer: "regulatory-update · default (changelog)" -->

## Privacy & AI motion — Q1 2026.

`Federal · State · International`

1. EU AI Act
   - `Title III`
   - Conformity-assessment pre-market obligation took effect.
   - `Effective Feb 2026`
2. Colorado AI Act
   - `SB 24-205`
   - Developer + deployer duties for consequential-decision systems.
   - `Effective Feb 2026`
3. FTC v. Avast
   - `§5 unfairness`
   - $16.5M consent order; clarifies the deception standard for privacy branding.
   - `Final Mar 2026`
4. Texas DPSA
   - `§541.151`
   - DSAR opt-out portal mandatory; small-business safe-harbor narrowed.
   - `Effective Mar 2026`

---

<!-- _class: regulatory-update timeline -->
<!-- _footer: "regulatory-update · timeline" -->

## Privacy & AI motion — Q1 2026 timeline.

`January → February → March 2026`

1. PIPEDA Reform
   - `C-27`
   - Senate reading in January; commissioner powers expanded.
2. EU AI Act
   - `Title III`
   - High-risk conformity-assessment obligation took effect 2 Feb.
3. Colorado AI Act
   - `SB 24-205`
   - Developer + deployer duties effective 1 Feb.
4. FTC v. Avast
   - `§5`
   - Consent order final 14 Mar; $16.5M plus 20-year compliance program.

---

<!-- _class: regulatory-update priority -->
<!-- _footer: "regulatory-update · priority" -->

## Privacy & AI motion — Q1 2026 priorities.

`What to act on, what to track, what to log`

1. Act this quarter — EU AI Act
   - `Title III`
   - High-risk conformity-assessment paperwork pre-market; engineering deadline before any EU launch.
2. Track — Colorado AI Act
   - `SB 24-205`
   - Developer + deployer duties; published deployer-notice template due in Q2.
3. Log — FTC v. Avast
   - `§5`
   - Consent order final; informs how the FTC frames the deception standard.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Anchor 05 · redline" -->

`Anchor 05 · textual diff`

## What changed in the text we live by?

---

<!-- _class: redline -->
<!-- _footer: "redline · default (inline)" -->

## SB-362 rewrote the opt-out link rule.

`Cal. Civ. Code §1798.135 · amendment SB-362 (2024)`

> A business that <del>collects</del> <ins>collects, sells, or shares</ins> consumers' personal information shall provide <del>two or more</del> <ins>at least one</ins> designated method for submitting requests to opt-out, <ins>including, at minimum, a clear and conspicuous link on the homepage titled "Your Privacy Choices,"</ins> for use by consumers to <del>opt out of the sale of</del> <ins>direct the business not to sell or share</ins> their personal information.

- **Why this matters** SB-362 collapses "sale" and "sharing" into one duty and pins a uniform link title — homepage chrome and DSAR workflows both need a uniform UX.

---

<!-- _class: redline annotated -->
<!-- _footer: "redline · annotated" -->

## SB-362 — annotated.

`Cal. Civ. Code §1798.135 · amendment SB-362`

> A business that <del>collects</del> <ins>collects, sells, or shares</ins><sup>1</sup> consumers' personal information shall provide <del>two or more</del> <ins>at least one</ins><sup>2</sup> designated method for submitting requests to opt-out, <ins>including a homepage link titled "Your Privacy Choices,"</ins><sup>3</sup> for use by consumers to opt out.

1. **Scope** Sale and sharing now both trigger the opt-out duty — even free programs are in.
2. **Floor** Two-channel minimum drops to one; a homepage link plus a portal is now sufficient.
3. **Chrome** The literal link title is now mandated — uniform branding across the web.

---

<!-- _class: redline three-col -->
<!-- _footer: "redline · three-col" -->

## SB-362 — old, new, and why it changed.

`Cal. Civ. Code §1798.135 · amendment SB-362`

> A business that collects consumers' personal information shall provide two or more designated methods for opt-out — to opt out of the sale of personal information.

> A business that collects, sells, or shares consumers' personal information shall provide at least one method, including a homepage link titled "Your Privacy Choices," to direct the business not to sell or share personal information.

- **Scope** Sale and sharing collapse into one duty — even free programs trigger the obligation.
- **Floor** Two-channel minimum drops to one — a homepage link plus a portal now suffices.
- **Chrome** The literal link title is now mandated — uniform branding.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Anchor 06 · authority-chain" -->

`Anchor 06 · statute → regulation → guidance → case`

## What actually binds us — and how far down the chain we are.

---

<!-- _class: authority-chain -->
<!-- _footer: "authority-chain · default (chain)" -->

## COPPA — the chain, tier by tier.

1. Statute
   - `15 U.S.C. §6501`
   - Congress, 1998 — verifiable parental consent for under-13 data.
2. Regulation
   - `16 C.F.R. Part 312`
   - FTC implementing rule; 2013 rewrite expanded covered identifiers.
3. Guidance
   - `FTC Six-Step Compliance Plan`
   - Staff guidance — non-binding, but cited in every consent order.
4. Case
   - `In re Epic Games · 2022`
   - $245M consent order — operationalised "actual knowledge" standard.

---

<!-- _class: authority-chain branching -->
<!-- _footer: "authority-chain · branching" -->

## COPPA — one statute, many branches.

1. Statute
   - `15 U.S.C. §6501` COPPA, 1998
   - `16 C.F.R. Part 312` — FTC implementing rule
   - `FTC Six-Step Compliance Plan` — staff guidance
   - `In re Epic Games (2022)` — $245M consent order
   - `In re YouTube/Google (2019)` — $170M consent order

---

<!-- _class: authority-chain trail -->
<!-- _footer: "authority-chain · trail" -->

## COPPA — four steps to the operative test.

1. Statute
   - `15 U.S.C. §6501`
2. Regulation
   - `16 C.F.R. Part 312`
3. Guidance
   - `FTC Six-Step Plan`
4. Case
   - `In re Epic Games · 2022`

---

<!-- _class: tldr numbered -->
<!-- _footer: "Closing · tldr numbered" -->

## What this finalist set delivers.

- Six anchors, 17 variants. The 13 that were dropped served no rhythm a sibling didn't already cover.
- Slot labels lift automatically via the existing `slotLabelLift` transform — extended to cover statute-stack, regulatory-update, authority-chain, redline.
- Obligation matrix uses the universal `[x] [-] [ ]` state grammar like verdict-grid and checklist — one author convention across the engine.
- Pin-cite typography everywhere; plain-English body keeps boardroom altitude.
- Confirm and the next commit prunes the four-deep candidate set down to this shape.

---

<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _footer: '' -->

## This is what graduates. Confirm and the cut happens.

`Lattice · Legal & regulatory · finalist deck`
