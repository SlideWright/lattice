# authority-chain

> Provenance chain — statute to regulation to guidance to case, walked in order.

**Function** progression · **Form** timeline · **Substance** structure

Use when the audience needs to see how a rule descends: what the statute says, how the agency implemented it, what guidance interpreted it, and what cases have applied it. Ordered list because the order is the argument.

## When to use

- **Provenance is the argument.** Use when the audience needs to see exactly where a rule comes from and how it has been interpreted. The chain itself is the evidence that the obligation is grounded, not invented.
- **Tier labels carry the read.** Statute, regulation, guidance, case — each tier has a different legal weight. The left-rail label tells the audience what kind of source they are looking at before they read the citation.
- **Three to five tiers, no more.** The chain reads top-to-bottom on a single canvas. Past five rows the connectors compress and the tier labels lose room. Group sub-cases into the parent row's gloss or split into two slides.

## When NOT to use

- **Flat list of citations.** If the rows have no tier hierarchy, use `list-criteria` or `regulatory-update`. authority-chain earns its chrome only when the descent from statute to case is the point.
- **Missing citation chip.** The inline-code citation is the row's anchor; without it the gloss reads as opinion. Always cite, even for guidance and case rows.
- **Out-of-order tiers.** The chain reads as a descent: statute first, case last. Reversing it or skipping a tier breaks the metaphor the audience is using to follow you.

## Authoring

```markdown
<!-- _class: authority-chain -->

## Rule name — the chain, tier by tier.

1. Statute
   - `Citation reference`
   - One-line gloss naming the body that issued it and what it does.
2. Regulation
   - `Citation reference`
   - One-line gloss naming the agency rule.
3. Guidance
   - `Citation reference`
   - One-line gloss naming the staff guidance.
4. Case
   - `Citation reference`
   - One-line gloss naming the precedent.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `heading` | `h2` | yes | Slide heading naming the rule whose chain is being walked. |
| `links` | `ol > li` | yes | Ordered list of authority tiers (Statute, Regulation, Guidance, Case). Each leads with the tier label; nested ul carries the citation (code) and the one-line gloss. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Statute → case heading.                │
│                                         │
│  § Statute        — top tier            │
│      ↓                                  │
│    Regulation     — middle tier         │
│      ↓                                  │
│    Case law       — bottom tier         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `branching` — Branching — statute root with child branches

Renders nested children as connected branches off the parent tier. Use when one statute spawns multiple regulations, guidance docs, or cases worth surfacing in the same view.

```markdown
<!-- _class: authority-chain branching -->

## COPPA — one statute, many branches.

1. Statute
   - `15 U.S.C. §6501` COPPA, 1998
   - `16 C.F.R. Part 312` FTC implementing rule
   - `FTC Six-Step Compliance Plan` staff guidance
   - `In re Epic Games · 2022` $245M consent order
   - `In re YouTube/Google · 2019` $170M consent order
```

### `trail` — Trail — horizontal numbered trail with arrows

Transposes the vertical chain into a left-to-right trail of numbered cards joined by arrows. Use when the slide canvas favours a wide read and the tiers fit in four short steps.

```markdown
<!-- _class: authority-chain trail -->

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
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`regulatory-update`](../regulatory-update/regulatory-update.docs.md) — period-bounded changelog rather than a single rule's lineage
- [`list-criteria`](../list-criteria/list-criteria.docs.md) — flat enumeration of requirements without tier hierarchy
- [`timeline`](../timeline/timeline.docs.md) — the sequence is chronological events, not legal tiers
- [`list-steps`](../list-steps/list-steps.docs.md) — the rows are procedural steps rather than authority tiers

## Demo deck

See [authority-chain.gallery.pdf](./authority-chain.gallery.pdf) for rendered examples of every variant.
