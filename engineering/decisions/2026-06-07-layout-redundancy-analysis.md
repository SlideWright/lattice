# Layout Redundancy Analysis — prune & consolidate

**Date:** 2026-06-07 · **Branch:** `claude/layout-redundancy-analysis-CUOBY`
**Goal:** Find layouts that *do the same thing* and collapse them into one
component + variants. Variants are fine; duplicate components are not — they
are confusing to authors and expensive to maintain across three render paths.

## Relationship to the 2026-06-06 layout audit

The prior audit (`2026-06-06-layout-audit/`) reached **"NO cuts, NO merges
(all 58)."** Its reasoning: every overlap cluster is "distinguished by **data
shape**, which is exactly the design system's own test (§13) for separate
component vs variant."

**This analysis re-opens that verdict, because the audit overstated
"data-shape-distinct."** Several clusters it waved through are *not*
data-shape-distinct — they are the **same** data shape (same DOM, same
transform, same slot grammar) differing only in (a) a semantic label the
author types or (b) pure Finish (type weight, dark vs light canvas, counter
style). The §13 test says those are **variants, not components**.

The audit's own tell: it recommends writing a *"split family decision guide"*
and *"tighter whenToUse lines"* so authors can choose among **nine** `split-*`
components. **If the catalog needs a decision guide to disambiguate components
that share a form and chrome, the catalog is too granular.** That is precisely
the "confusing and hard to maintain" cost the consolidation request names.

## The sharpened test

§13 ("when a variant changes the *shape* of the data, it's a separate
component") is necessary but, applied alone, too permissive — a preset label
("Before"/"After") nominally changes "the data" without changing the layout
engine at all. The test this analysis applies, which §13 implies but the prior
audit dropped:

> Two layouts are the **same component** when they share `form` + `substance`
> **and** drive the **same DOM transform** with the **same slot grammar**
> (same selectors, same nesting depth, same cardinality). If they differ only
> in a preset label, a visual weight, a counter style, or a universal modifier
> (`dark`), they are **one component + variants** — regardless of how the
> manifest *describes* the data.

Applying it surfaces five genuine redundancy clusters. (Counts: deck = `.md`
files under `examples/` and `test/` excluding generated galleries; these are
the real blast radius for a rename/merge.)

---

## Cluster 1 — Co-equal two-item split (the `cards-side` case)

| Component | Bucket | Slot grammar | Decks |
|---|---|---|---|
| `compare-prose` | comparison | exactly 2 `ul>li`, autobold lead + nested body | 0 |
| `before-after` | comparison | exactly 2 `ul>li`, autobold lead + nested body | 0 |
| `cards-side` | inventory | exactly 2 `ul>li`, autobold lead + nested body | 0 |

**Identical slot grammar.** `before-after` *is* `compare-prose` with the two
labels preset to "Before"/"After". `cards-side` *is* `compare-prose` without
the corner-tag/verdict modifiers. The audit called these "data-shape-distinct";
they are not — the data shape is "exactly two parallel items, title + body."
The difference is **the words the author types** and **which modifiers are on**.

`compare-prose` is the superset (it already carries `mirror`, `chosen`,
`decision`, `vertical`, `banner-tag`, `rejected`).

**Verdict: 3 → 1.** Keep `compare-prose`. `before-after` → preset-label
variant. `cards-side` → `compare-prose` (the generic, no-verdict case). The one
real question is whether "two co-equal cards" (inventory framing) is a distinct
enough *function* from "two weighed options" (comparison) to keep `cards-side`
as a thin alias — see Open Questions.

## Cluster 2 — Featured-panel split (the `split-*` explosion)

All six render the **same chrome**: a featured left panel + a right-side
supporting list using the autobold-`li` nested contract. They differ only in
**what the left panel features**:

| Component | Left feature | Right side | Decks |
|---|---|---|---|
| `split-list` | `h2` heading | points list | 1 |
| `split-brief` | eyebrow + `h2` + lede `p` | findings list | 0 |
| `split-statement` | `blockquote` + cite | implications list | 13 |
| `split-metric` | unit + big number + context | findings list | 13 |
| `split-compare` | frame + `h2` + context | **2 options + verdict** | 1 |
| `split-steps` | phase + `h2` + summary | **numbered steps** | 0 |

The first four have an **identical right side** (autobold-`li` list); the left
varies only by hero type (heading / heading+lede / quote / number). That is a
content difference, not a layout difference — the engine treats them the same.

**Also a classification bug:** `split-list` is `form: panel`; the other five
are `form: split`. All six are "featured left + supporting right" =
**panel**. Only Cluster 1 is a true co-equal split. The `split-` *name* glues
two different forms together and is the source of the "which split?" confusion.

**Verdict: 6 → 2 (+ keep 2 as distinct right-side shapes).**
- Merge `split-list` + `split-brief` + `split-statement` + `split-metric` →
  one panel component (working name `split-panel`, or keep `split-list`),
  left feature chosen by content or a 3-value variant (`brief`/`quote`/`metric`).
- `split-compare` (2 options + verdict) and `split-steps` (ordered steps) have
  genuinely different right-side grammars — keep as components, but re-class to
  `form: panel` and document them as the same family.
- Fix the `form` field on all six.

> ⚠ Highest blast radius: `split-statement` and `split-metric` are each in 13
> decks. Merge here needs a deprecation alias (old class keeps working), not a
> hard rename.

## Cluster 3 — Inventory one-line stacks

| Component | Slot grammar | Differs only by | Decks |
|---|---|---|---|
| `list` | flat `ul/ol > li`, no body | — (baseline) | 4 |
| `tldr` | flat `ul > li`, no body | type weight + "takeaway" framing | 0 |
| `principles` | flat `ol > li`, no body | display weight + large counter | 0 |

Identical data shape: a flat list of one-line items, **no nested body**. The
differences are pure **Finish** (type scale, counter glyph). Textbook variant
case.

**Verdict: 3 → 1.** Keep `list` (or promote `principles`' richer rendering as a
variant set). `tldr` and `principles` → variants (`takeaway`, `principle`).
Keep `cards-stack` (has nested body — different shape), `checklist` (state
markers — different shape), `agenda` (auto-numbered TOC — different behavior).

## Cluster 4 — Progression ordered steps (the `timeline` case)

| Component | Slot grammar | Differs only by | Decks |
|---|---|---|---|
| `list-steps` | `ol > li`, lead + nested body | — (baseline; has `vertical`,`phase`,`milestone`,…) | 0 |
| `timeline` | `ol/ul > li`, lead + nested body | density (dots+short label vs cards+paragraph) | 3 |

`list-steps`' own docs: *"More verbose than timeline; more structured than a
plain ordered list."* Same data shape (ordered steps with a body), differing
only in **visual density**. This is the variant the user named.

**Verdict: 2 → 1.** Keep `list-steps`. `timeline` → a density variant
(`dots`/`compact`). Keep `journey` (`@actor`/`:mood` data — different shape) and
`authority-chain` (legal domain bucket).

## Cluster 5 — Anchor divider

| Component | Slot grammar | Differs only by | Decks |
|---|---|---|---|
| `divider` | eyebrow `code` + `h2` | dark canvas | 15 |
| `subtopic` | eyebrow `code` + `h2` | **light canvas** | 1 |

Identical slot grammar. The *only* difference, per `subtopic`'s own purpose
line, is "same light canvas as content slides … a lighter cousin to the dark
divider." Dark-vs-light is the **`dark` universal variant**. `subtopic` is
`divider` minus dark.

**Verdict: 2 → 1.** Keep `divider`. `subtopic` → the light variant of
`divider`. (`divider` is in 15 decks, `subtopic` in 1 — alias `subtopic` to
preserve the 1 deck.)

---

## Not redundant (the audit was right here)

- **`title` vs `closing`** — same bookend form, but a deliberate matched
  open/close pair, semantically load-bearing, in 24 / 18 decks. Cheap, clear,
  keep. (Could note `closing` ≈ `title` mirror, no action.)
- **`stats` / `kpi` / `big-number` / `split-metric`** — genuinely different
  number shapes (row of tiles / ledger system / one focal number / hero +
  findings). Keep (split-metric merges *within* Cluster 2, not here).
- **The legal re-skins** (`authority-chain`, `regulatory-update`,
  `statute-stack`) — domain bucket, distinct vocabulary. Keep.
- **`list-criteria`** — `ol` with rationale, distinct from list-steps by
  semantic (criteria a decision must meet). Borderline; keep for now.

## Net effect

| Cluster | Today | After | Δ |
|---|---|---|---|
| 1 Co-equal split | 3 | 1 | −2 |
| 2 Featured-panel split | 6 | 4 | −2 |
| 3 One-line stacks | 3 | 1 | −2 |
| 4 Ordered steps | 2 | 1 | −1 |
| 5 Anchor divider | 2 | 1 | −1 |

**58 → ~50 components (~8 fewer)**, with the confusing `split-` selection space
cut roughly in half and three "looks-the-same" pairs collapsed to a modifier.

## Execution contract (per merge)

Each merge is a **breaking change** and must:

1. Keep the retired class working as a **deprecation alias** (decks in the wild
   — `split-statement`/`split-metric` are in 13 each; `divider`/`title` in 15+).
2. Land the variant CSS + transform in **all three render paths**
   (`lattice-emulator.js`, `lib/` marp path, `dist/lattice-runtime.js`).
3. Update the merged manifest's `variants`, retire the absorbed manifests,
   re-run `npm run check:ownership` (duplicate-name / co-ownership gate).
4. Regenerate galleries, docs, snippets; pixel-diff every affected deck via
   `tools/pixel-check.js` (zero-drift gate — a merge must be visually neutral
   for surviving usages).
5. Record each in `CHANGELOG.md` `## Unreleased` — lead absorbed classes with
   `**Breaking:**` (or "Deprecated" if the alias is kept).

Recommended order (low blast radius → high): **5 → 3 → 4 → 1 → 2.**

---

## Execution status (2026-06-07)

Approved scope: clusters **1, 3, 4, 5** (hard break + migrate in-repo decks);
`cards-side` dropped outright; cluster 2 analysis-only.

**Shipped (committed + pushed on this branch):**

| Cluster | Change | Components removed |
|---|---|---|
| 5 | `subtopic` → `divider light` variant | `subtopic` |
| 3 | `tldr` → `list takeaway`, `principles` → `list principles` | `tldr`, `principles` |
| 1a | `cards-side` dropped; authors use `compare-prose` | `cards-side` |

Catalog: **58 → 54 components.** Each merge: source CSS variant + manifest +
deck migration + regenerated artifacts, gated by `check:ownership` + `npm test`
(green) and visually spot-checked.

**Shipped in the follow-up pass (2026-06-07):**

| Cluster | Change | Components removed |
|---|---|---|
| 4 | `timeline` → `list-steps timeline` variant | `timeline` |
| 1b | `before-after` → `compare-prose transition` variant | `before-after` |

Catalog: **58 → 52 components.** Both required untangling shared/leaked CSS,
done and verified:
- Cluster 4: the Mermaid timeline-*diagram* overrides (`.timeline-node`,
  `.eventWrapper`) that had been mis-filed in the layout's stylesheet moved to
  `lib/integrations/mermaid/mermaid.css` — their correct home, alongside the
  general `.section-N` Mermaid band rules that already lived there. The
  `regulatory-update timeline` legal variant is pixel-unchanged (its pills come
  from its own counter). A Mermaid timeline diagram still cycles its bands.
- Cluster 1b: the corner-tag / banner-tag CSS shared by `compare-prose` +
  `decision` moved out of `before-after.styles.css` into
  `compare-prose.styles.css`; both verified intact.

**(Originally deferred — now resolved above.) The entanglements were:**

- **Cluster 1b — `before-after` → `compare-prose` variant.** `before-after.styles.css`
  is the *home* of the corner-tag + banner-tag CSS shared by `compare-prose`
  and `decision`; it must be **relocated** (not deleted) before `before-after`
  can be removed. `before-after`'s own look (→ arrow + accent-ring "new state")
  is distinct enough to preserve as a `transition` variant, and `compare-prose`
  is post-processed in two render paths (emulator `.compare-prose-inner` vs the
  CSS `:not(:has(...))` fallback) — the variant (esp. the connector glyph swap)
  must be verified in both × light/dark. Tractable, but a full cluster's worth of
  careful work; not safe to ship half-verified.

- **Cluster 4 — `timeline` → `list-steps timeline` variant.** Three couplings
  discovered in `timeline.styles.css`:
  1. It also holds the **Mermaid timeline-diagram overrides**
     (`.timeline-node.section-N` ×12, `.eventWrapper`) — these must move to
     `lib/integrations/mermaid/mermaid.css`, not be lost.
  2. The legal **`regulatory-update timeline`** variant *deliberately* reuses the
     `section.timeline` component rules by class-leak (its slides carry both
     `.regulatory-update` and `.timeline`), so removing `section.timeline` would
     break it unless those base rules are preserved or grafted into
     `regulatory-update`.
  3. The structure layout itself (dots-on-a-spine) is a large override graft on
     top of `list-steps`' card+arrow base.

  The engine lift selectors (`hasClass('timeline')` in the emulator,
  `section.timeline` in the runtime) already match a `.list-steps.timeline`
  class, so no 3-path lift edits are needed — but couplings (1) and (2) must be
  untangled first. Recommend a dedicated follow-up.

A minor follow-up from 1a: the cards-grid post-processor in `lattice-emulator.js`
and `lib/runtime/index.js` still name-checks `cards-side` as a harmless no-op
(left to avoid a bundle rebuild).
