---
marp: true
theme: indaco
paginate: true
header: "Lattice · authority-chain"
---

<!-- _class: title silent -->

# authority-chain

`Progression · Timeline · Structure`

Provenance chain — statute to regulation to guidance to case, walked in order.

---

<!-- _class: authority-chain -->
<!-- _footer: "Default · authority-chain" -->

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
<!-- _footer: "Branching — statute root with child branches · authority-chain branching" -->

## COPPA — one statute, many branches.

1. Statute
   - `15 U.S.C. §6501` COPPA, 1998
   - `16 C.F.R. Part 312` FTC implementing rule
   - `FTC Six-Step Compliance Plan` staff guidance
   - `In re Epic Games · 2022` $245M consent order
   - `In re YouTube/Google · 2019` $170M consent order


---

<!-- _class: authority-chain trail -->
<!-- _footer: "Trail — horizontal numbered trail with arrows · authority-chain trail" -->

## COPPA — statute through case, left to right.

1. Statute
   - `15 U.S.C. §6501`
   - Verifiable parental consent for under-13 data.
2. Regulation
   - `16 C.F.R. Part 312`
   - FTC implementing rule.
3. Guidance
   - `FTC Six-Step Plan`
   - Cited in every consent order.
4. Case
   - `Epic Games · 2022`
   - $245M consent order.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · authority-chain" -->

## When NOT to reach for authority-chain.

- **Flat list of citations.** If the rows have no tier hierarchy, use `list-criteria` or `regulatory-update`. authority-chain earns its chrome only when the descent from statute to case is the point.
- **Missing citation chip.** The inline-code citation is the row's anchor; without it the gloss reads as opinion. Always cite, even for guidance and case rows.
- **Out-of-order tiers.** The chain reads as a descent: statute first, case last. Reversing it or skipping a tier breaks the metaphor the audience is using to follow you.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `regulatory-update` — period-bounded changelog rather than a single rule's lineage
- `list-criteria` — flat enumeration of requirements without tier hierarchy
- `timeline` — the sequence is chronological events, not legal tiers
- `list-steps` — the rows are procedural steps rather than authority tiers
