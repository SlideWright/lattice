---
status: proposed
summary: Design spec for contracts and layout-swapping as the third Workbench leg — same content, swap layout via one class
---

# Contracts and Layout-swapping — the third Workbench leg

**Status:** design spec, pre-code. Ratified directions (2026-06-12):
contracts reuse the **Function** families; the new bench sits **alongside** the
Layout Studio with gradual absorption; **spec before code.** Uses the bilingual
vocabulary from `design/design-system.md §2.5` — **system** words
(Function/Form/Substance/Finish) in the architecture, **human** words
(Purpose/Layout/Content/Style) in the author/AI sections. Supersedes the
`dynamic-islands` framing, which packed two concepts into one bench.

---

## 1. The idea (human register)

> Write the **Content** once, swap the **Layout**, and get a totally different
> result — **same exact Content, instant, pure CSS, no re-author.** "Show it as
> a timeline instead of cards" → one token.

Proven in `.scratch/islands/dynamic/`: one byte-identical Content block
(`<h2>` + a 4-item `<ul>` + a `<blockquote>`) rendered four ways
(ledger · cards · timeline · editorial) by changing **one class on the
section**, zero JavaScript.

What makes that swap *safe and free* is a **contract**. That contract is the
new first-class artifact, and designing contracts is the third Workbench leg.

---

## 2. The discipline: one bench, one concept

No bench owns two concepts. The three Workbenches map **one-to-one** onto the
four-layer model; **Substance is the engine, not a canvas.**

| System (spine) | Human (surface) | Workbench | Its single deliverable |
|---|---|---|---|
| **Finish** | Style | **Palette Workbench** | a theme (tokens) |
| **Form** | Layout | **Layout Studio** | one Layout (a shape) |
| **Function** | Purpose | **Contract Workbench** (new 3rd leg) | one **contract** |
| **Substance** | Content | *the engine* | a plugin (prose/structure/series/graph) |

Two consequences, stated plainly:

- **The Layout Studio is unchanged.** It is the **Form** bench: it designs **one
  shape**. It does not own contracts, families, or swapping.
- **The third leg is Function, not "looks."** It designs **contracts** — *what a
  slide is for and what Content it requires._ It produces **zero** shapes.

**"Islands" is not a concept.** The slide-composition *berths* (masthead, bay,
progress — shipped) keep that name. The *swappable-look* idea has no concept of
its own: it is just **Form being slideable** while Function/Substance/Finish
hold. The convenience term is retired here.

---

## 3. What a contract is — **Function** made first-class

A contract is the **role-schema a Purpose requires**: the named slots, their
cardinalities, the one canonical DOM every conforming Layout styles, and the
samples used to validate against. The 7 Functions are the contracts.

```jsonc
// contracts/inventory.contract.json   (Function = inventory)
{
  "name": "inventory",
  "function": "inventory",
  "purpose": "A parallel set of related items, similar weight.",
  "slots": {
    "eyebrow": { "role": "kicker",  "required": false, "card": "0..1" },
    "title":   { "role": "heading", "required": true,  "card": "1"    },
    "items":   { "role": "item",    "required": true,  "card": "2..n",
                 "shape": { "lead": "required", "detail": "optional", "pill": "optional" } },
    "insight": { "role": "note",    "required": false, "card": "0..1" }
  },
  "canonicalDom": "<p><code>…</code></p><h2>…</h2><ul><li><strong>…</strong> …</li>…</ul><blockquote>…</blockquote>",
  "authoring":    "`eyebrow`\n\n## title\n\n- **Lead.** detail `pill`\n…\n\n> insight",
  "samples": { "minimal": "…", "typical": "…", "stress": "…", "empty": "…" }
}
```

The three fields that don't exist in today's manifest `slots`:
- **`card`** (cardinality) — `2..n`, `0..1` — lets a Layout rely on structure
  and lets the bench test the bounds.
- **`canonicalDom`** — the *single* DOM shape every css-only Layout styles. This
  is what makes the swap instant: same DOM in, different CSS out.
- **`samples`** — `{minimal, typical, stress, empty}` drive the conformance
  matrix and the author's live previews.

Contracts are few and stable (one per Function); new vocabulary is added
deliberately, like `TAG_GROUPS`.

---

## 4. Conformance lives in the Layout Studio (a dependency, not a merge)

A Layout **declares which contracts it satisfies** and is validated against
that contract's `samples` — **in the Layout Studio**, because conformance is a
property of the *shape*. Function defines the requirement; Form meets it.
Nothing crosses ownership.

```jsonc
// the Layout's manifest gains:
{ "satisfies": "inventory",
  "kind": "css-only",        // css-only = instant swap | transform = re-render
  "intent": ["scan", "reference", "dense"] }
```

- **`kind: css-only`** — styles the contract's `canonicalDom` directly →
  swapping is a class change, **live and free.** The magic tier.
- **`kind: transform`** — needs new structure (wrap items, split a panel) →
  carries a build-time transform and **re-renders** on swap. Still valid, just
  not instant. *This is exactly the component-bridge rule* (CSS-only is
  bridgeable; transform-bearing is graduation-only).
- **`intent`** — the searcher/AI vocabulary the author picks by.

The **set** of Layouts for a Purpose is just `group-by(satisfies)` — no new
registry, like `groupByBucket()`.

---

## 5. Swapping the Layout is an authoring act, not a bench

The author writes Content to a contract and sets **one token = the Layout**.

```markdown
<!-- _class: layout-ledger -->     ← swap this to re-skin (layout-cards, layout-timeline, …)

`Framework · Four Components`
## The system has four moving parts.
- **Signal Intake.** Weekly structured collection…
…
> Signals without decisions are just noise.
```

This happens in the **Drawing Board** (composition), not in a studio. The UI
offers the conforming siblings (live thumbnails); for `css-only` Layouts the
preview re-skins instantly, and the authored Content never changes.

**The "look" trap (per §2.5):** "make it look different" is ambiguous between
**Layout** and **Style**. The author surface never uses "look" as a term; the
AI resolves the request into *a different Layout* or *a different Style* —
explicitly.

---

## 6. The four perspectives

**Contract designer (Contract Workbench)** — defines a **Purpose** and the
**Content** it requires: slots, cardinalities, canonical DOM, samples. Designs
*no* shapes. Output: a contract.

**Layout designer (Layout Studio)** — designs **one shape**, and declares which
contract it satisfies (validated against the contract's samples via a
**conformance matrix** — a shape that breaks at 2 items or 8 can't ship; same
spirit as the S4 responsiveness lint). Output: a Layout.

**Author (Drawing Board)** — writes **Content** once to a **Purpose**; swaps the
**Layout** by intent ("show it as steps"); restyles via **Style**. Instant,
reversible, no re-author.

**AI** — reasons in the system register, speaks in the human register:
- Authors **Content** to the contract (loads slot schemas from
  `dist/docs/components.json`).
- **"Show it differently" = swap the Layout token. Zero Content regeneration** —
  one class. Cheap, deterministic, safe.
- **Picks the Layout** by matching Content semantics → `intent`.
- **Offers variations** — renders the same Content across the conforming set.
- The **contract is the safety rail**: a conforming Layout guarantees the shape
  renders, so the AI can't emit a broken slide.

---

## 7. Alongside components — gradual absorption

Ratified. Existing components keep their `_class:` invocation. **Absorb a
family by writing its contract** (canonical DOM + slots + samples), then tag
each existing Layout `satisfies: <function>` + `intent`, and classify it
`css-only` (already styles the canonical DOM) or `transform` (adapts it). The
real work is **settling each Function's one canonical DOM** — it decides how
many existing Layouts become instant-swap vs transform. Nothing is forced; a
Layout graduates into a set when it conforms.

---

## 8. The pure-CSS boundary

Instant-swap (`css-only`) covers: **layout** (grid/flex re-placement),
**reordering** (`order`, grid placement — the timeline/editorial moved the
source-last blockquote), **role assignment** (`:has()`, `:nth-child`),
**generated chrome** (`counter()`, `::before/::after`), **Style** (token
bundles), **size-response** (`@container`), and **quantity-conditional**
styling (`:has(> :nth-child(4))`). CSS **cannot** reparent / wrap / split /
merge DOM, or compute cross-element content beyond `counter()`/`attr()` — those
Layouts are `kind: transform`. A **semantic, layout-neutral** canonical DOM
maximizes the instant-swap surface.

---

## 9. Open questions

1. **Canonical-DOM normalization** per Function — the hard, load-bearing part.
   Start with `inventory` (richest set).
2. **Cross-Function Content** — a list that's also a sequence. Lean: one
   contract per Layout; the author re-points.
3. **Deck-wide Layout bias** — a "house style" that biases every slide's Layout
   choice (like the shipped `finish:` / `islands:` deck flags) is a follow-on.
4. **Author surface word for the swap** — "Layout" is the canonical human word;
   confirm it reads right in the UI.

---

## 10. Recommended first slice

One Function — **`inventory`**: write `inventory.contract.json` (canonical DOM +
samples), port the four proof Layouts (ledger/cards/timeline/editorial) into
manifests (`satisfies: inventory`) + scoped CSS, and wire a live **Layout
switcher** in the Drawing Board against that set. Makes the model tangible
before the Contract Workbench leg is built.
