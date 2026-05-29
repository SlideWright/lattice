---
marp: true
theme: indaco
paginate: true
header: "Lattice · citation-card"
---

<!-- _class: title silent -->

# citation-card

`Evidence · Canvas · Prose`

Single authoritative reference — heading + citation + verbatim quote + plain-English gloss.

---

<!-- _class: citation-card -->
<!-- _footer: "Default · citation-card" -->

## What counts as "personal information" under CCPA.

`Cal. Civ. Code §1798.140(o) · CCPA/CPRA`

> "Personal information" means information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or household.

- In plain English: any data tied to a household or device, not just a named person — IP addresses, cookie IDs, and device fingerprints are all in scope.
- What we must do.
  - Treat household-level identifiers as PI in our notice, retention, and DSAR workflows. Audit pixel and tag inventory next quarter.


---

<!-- _class: citation-card pull-quote -->
<!-- _footer: "Pull-quote treatment · citation-card pull-quote" -->

## "Personal information" includes the household, not just the person.

`Cal. Civ. Code §1798.140(o) · CCPA/CPRA`

> Information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or household.

- What we must do.
  - Audit pixel inventory; treat household IDs as PI in DSAR workflows.


---

<!-- _class: citation-card split -->
<!-- _footer: "Split — quote | gloss columns · citation-card split" -->

## CCPA defines "sale" broadly.

`Cal. Civ. Code §1798.140(ad) · CCPA/CPRA`

> "Sale" means selling, renting, releasing, disclosing, disseminating, making available, transferring, or otherwise communicating a consumer's personal information to a third party for monetary or other valuable consideration.

- The catch is "other valuable consideration."
  - Data-for-service swaps and ad-tech cookie syncs can qualify as sales even when no money changes hands.


---

<!-- _class: citation-card margin -->
<!-- _footer: "Margin — annotated quotation · citation-card margin" -->

## The GDPR lawful-basis test.

`GDPR Art. 6(1)(f) · legitimate interests`

> Processing is lawful only if and to the extent that processing is necessary for the purposes of the legitimate interests pursued by the controller, except where such interests are overridden by the interests or fundamental rights of the data subject.

- Two-part test.
  - Necessity first, then a balancing exercise against the data subject's rights. Document both halves or the basis fails on audit.


---

<!-- _class: citation-card triptych -->
<!-- _footer: "Triptych — three panels · citation-card triptych" -->

## What "personal data" covers under GDPR.

`GDPR Art. 4(1) · definitions`

> 'Personal data' means any information relating to an identified or identifiable natural person.

- Online identifiers count.
  - IP addresses, cookie IDs, and device fingerprints are personal data — scope your notice and retention accordingly.


---

<!-- _class: citation-card dark -->
<!-- _footer: "Composition: dark · citation-card dark" -->

## What counts as "personal information" under CCPA.

`Cal. Civ. Code §1798.140(o) · CCPA/CPRA`

> "Personal information" means information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or household.

- In plain English: any data tied to a household or device, not just a named person — IP addresses, cookie IDs, and device fingerprints are all in scope.
- What we must do.
  - Treat household-level identifiers as PI in our notice, retention, and DSAR workflows. Audit pixel and tag inventory next quarter.


---

<!-- _class: citation-card compact -->
<!-- _footer: "Composition: compact · citation-card compact" -->

## What counts as "personal information" under CCPA.

`Cal. Civ. Code §1798.140(o) · CCPA/CPRA`

> "Personal information" means information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or household.

- In plain English: any data tied to a household or device, not just a named person — IP addresses, cookie IDs, and device fingerprints are all in scope.
- What we must do.
  - Treat household-level identifiers as PI in our notice, retention, and DSAR workflows. Audit pixel and tag inventory next quarter.


---

<!-- _class: citation-card accent -->
<!-- _footer: "Composition: accent · citation-card accent" -->

## What counts as "personal information" under CCPA.

`Cal. Civ. Code §1798.140(o) · CCPA/CPRA`

> "Personal information" means information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or household.

- In plain English: any data tied to a household or device, not just a named person — IP addresses, cookie IDs, and device fingerprints are all in scope.
- What we must do.
  - Treat household-level identifiers as PI in our notice, retention, and DSAR workflows. Audit pixel and tag inventory next quarter.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · citation-card" -->

## When NOT to reach for citation-card.

- **Multiple citations on one slide.** If you are stacking two or three statutes, use statute-stack instead — citation-card is built for the canvas-weight treatment of a single authority.
- **Paraphrased 'quote'.** If you are rewriting the source language, drop the citation framing and use content or split-statement. The whole point of citation-card is verbatim language with attribution.
- **Gloss longer than the quote.** When the plain-English explanation runs three paragraphs, the citation is no longer the focus. Trim the gloss to one sentence plus a `What we must do` action, or move to content.
- **Plain gloss under the pull-quote variant.** The `pull-quote` variant hides any gloss line that does not lead with **bold** — it shows only the `**What we must do**` action. A plain 'In plain English …' interpretation line silently vanishes there. Lead gloss lines with a bold label under pull-quote, or keep them on the default variant.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `statute-stack` — two or three citations need to land on one slide
- `quote` — the source is a person, not a document
- `split-statement` — a quote with three or four implications
- `content` — the citation is one input among several in a prose argument
