---
status: shipped
summary: Promote the one-member "contract" tier (the inventory contract + its four conforming layouts) to a real first-class component named `inventory` (default ledger + cards/timeline/editorial variants), and retire the contract machinery (lib/contracts, layoutClasses, CONTRACT_LAYOUT_SOURCES, the contracts test). The four byte-identical looks become component variants, so they finally appear in the count (52→53), the manifest, the catalog, and the playground — and the layout-* classes are retired (breaking).
supersedes: 2026-06-12-contracts-layout-swapping.md
---

# Promote the inventory contract to a component; retire the contract tier

**Supersedes:** `2026-06-12-contracts-layout-swapping.md` (the contract tier it introduced is retired)

## Context

The "contract" tier (`lib/contracts/`) modelled a Function's content **shape** as a
first-class artifact: one canonical DOM + slots + samples, with N "conforming
Layouts" (`satisfies: <contract>`) that styled that DOM via CSS only, so an author
swapped the look with one class. In practice it had exactly **one** member — the
`inventory` contract with four conforming layouts (`layout-ledger`, `layout-cards`,
`layout-timeline`, `layout-editorial`).

This left those four looks as a sibling tier that:

- **No count or doc surfaced** — absent from the 52-component count, from
  `dist/docs/components.json`, from the component reference, and from the playground
  autocomplete (only the lint vocab knew the class names).
- **Broke under Form** (the default). Form wraps a migrated layout's body in
  `.cell-stage`, but the contract layouts weren't in the masthead kernel's registry,
  so they were classified as generic prose and collapsed to a plain list (#558, fixed
  in #559 by registering them as a sibling tier — a stopgap).

The four looks consume **byte-identical authored markdown** (verified in the demo
deck): same eyebrow · title · bold-lead items · insight, differing only by class.
By the project's own definition (`design/design-system.md` §6 — variants are
component-scoped looks of one content), they are **variants**, not a separate tier —
but the architecture gave them no parent component to be variants *of* (`inventory` is
a bucket + a Function, not a component).

## Decision

Promote `inventory` to a **real component** (`lib/components/inventory/inventory/`,
the bucket-name == component-name pattern already used by `math/math`, `code/code`,
`diagram/diagram`). The default look is the numbered **ledger**; `cards`, `timeline`,
and `editorial` are manifest `variants`. Author `<!-- _class: inventory [variant] -->`.

The four looks are mutually-exclusive *structures* (not incremental tweaks), so the
default is CSS-scoped `section.inventory:not(.cards):not(.timeline):not(.editorial)`
and each variant `section.inventory.<variant>` — keeping them exclusive while letting
the component own a single class.

Retire the now-empty contract tier entirely: `lib/contracts/` (loader + the inventory
contract), `layoutClasses()` in the lint vocab, the masthead drift-test union, the
`CONTRACT_LAYOUT_SOURCES` CSS-bundle hook, and the contracts unit test. `inventory`
registers in the masthead kernel's `ALL_LAYOUTS` + `STAGE_MIGRATED` like any component.

## Consequences

- **Breaking:** `layout-*` classes stop working; decks author `inventory [variant]`.
  Usage was tiny (the demo deck + internals); the demo moves
  `examples/contract-inventory.md` → `examples/inventory.md`.
- The component now appears everywhere a component does — manifest, generated
  `.docs.md`, machine catalog, component reference, playground autocomplete, count
  (52 → 53), galleries, and the semantic-invariant layers 1–2.
- The "Function-as-first-class-artifact / one-content-many-layouts" idea from the
  2026-06-12 ADR is **not** lost — it's expressed as a component with variants, which
  is the model the rest of the system already uses. If a second Function ever needs
  multiple interchangeable looks, the same component-with-variants shape applies; the
  bespoke contract abstraction is not reinstated without a second real use case.
