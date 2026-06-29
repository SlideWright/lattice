---
status: proposed
summary: The declarative transform DSL the threat-model gate (2026-06-29-component-transformer-threat-model.md) requires — the safe way to give designers/AI the "magic" first-party transformers do, without user JS. A component manifest gains a `transform` field: an ordered list of `match → do` RULES the engine interprets identically across all three render paths. REVISED after an adversarial red-team + an independent assessment, which agreed the core is sound but the first draft oversold two claims. Honest scope: the declarative surface covers ONLY the safe STRUCTURAL-TAGGING / RE-PARENTING subset (add-class, set-attr, extract, wrap, partition, tag-by-index, insert, rewrite-tag) — it has NO loops, conditionals, expressions, raw markup, raw URLs, or raw attributes. Everything imperative, codegen, URL-bearing, fit/repagination, or DECK-SCOPED (chart-family's 13 layouts, logo URL resolution, auto-split/overflow-probe, the cross-slide progress rail) stays FIRST-PARTY and is reached by name through a CLOSED capability registry — the headroom hinge. Safety is SPECIFIED, not asserted: a closed element allowlist, an attribute allowlist + URL-scheme validator (the draft left a CSS-url() beacon open — gate #616), a strict JSON schema with prototype-pollution defense (the interpreter is now an untrusted-JSON attack surface), single-forward-pass evaluation against a pre-rule snapshot with a render-guard budget, and section-scoped matching as an interpreter invariant. Path: PROTOTYPE-FIRST — build the dual string+DOM interpreter for 2 primitives + a capability stub on one real component (split-panel) with the cross-path parity test, before freezing the schema. Also outlines the AI component-generation knowledge file (must be as CONCRETE as THEME_CANON, with a coerce/repair layer).
---

# Component transform DSL — a declarative structural core + a first-party capability registry

> **Status: proposed, revised.** First draft was red-teamed (adversarial) and
> independently assessed. Both said: right idea, but the draft (a) asserted safety
> it didn't specify and (b) claimed the 8 primitives covered the whole corpus when
> they don't. This revision narrows the declarative surface to what is *provably*
> safe and inert, moves everything else behind a closed capability registry, and
> specifies the safety envelope. The build is gated on a prototype (§11).

## 1. Why this exists

The threat model (`2026-06-29-component-transformer-threat-model.md`) decided **no
designer-authored JS transformers** — user JS would run as RCE on export and XSS on
preview, and components are shareable + AI-generable. The "magic" must instead be
**declarative and first-party-interpreted**. This doc designs that DSL. It is
build-prep, not a build.

**Design steer (the user's):** *don't be beholden to the past — let it clarify the
art of the possible, and design for the future so things we don't do today are
possible tomorrow.* So the corpus is the **validation set, not the ceiling** — but
(per the red-team) the declarative grammar is deliberately **small and inert**;
headroom lives in the capability registry, not in an ever-richer grammar.

## 2. The two-layer model

- **Declarative layer (the DSL):** `match → do` rules in the manifest. Pure,
  bounded, inert structural rewrites. No loops, no conditionals beyond `match`, no
  expressions beyond the pure token resolver, no raw markup, no raw URLs/attributes.
  Safe to share, safe to generate — *because* it can express so little.
- **Capability layer (first-party):** a **closed allowlist** of registered imperative
  ops (`image-aspect`, `state-chart`, `chart-family/*`, `auto-split`, `section-rail`,
  …) invoked **by name** from a rule (`{ "capability": "image-aspect" }`). This is
  where measurement, codegen, URL resolution, repagination, and deck-scoped
  derivations live. The manifest *wires* them; it never *contains* them.

This split is the honest version of the draft: the declarative surface is the safe
minimum; the capability registry is the headroom. It also matches the engine's own
architecture — `engineering/architecture.md` states JS touches a slide for exactly
four reasons (re-parent, generate, tag-from-state, measure-and-react); the DSL owns
the first and third declaratively, and the capability layer owns generate + measure.

## 3. Principles

1. **Match → operate**, idempotent, ordered — what every transformer already is.
2. **Small inert grammar; headroom in capabilities.** New *structural* primitive →
   register it (no grammar change). New *imperative/codegen/data-bound/deck-scoped*
   power → a first-party **capability**, never new grammar. The DSL has **no loops,
   conditionals, expressions, or data-binding** — that absence *is* the safety
   property, and it has a real expressiveness cost we accept openly (§9).
3. **Composable & orthogonal** — `lift = extract + insert`; `panel = partition + wrap`.
4. **Idempotent + terminating by construction** — single forward pass over rules in
   declared order; each rule's `match` runs against the **pre-rule snapshot** (no
   rule sees a later rule's output as a fresh match), so an adversarial/oscillating
   rule list cannot loop; a global node-visit/op budget under `render-guard` is the
   backstop (§7).
5. **Inert by specification, not assertion** (§6) — element allowlist, attribute
   allowlist, URL validator, schema + prototype-pollution defense, section scoping.
6. **One semantics, three paths** — a string interpreter (`applyToHtml` → PDF/PPTX)
   and a DOM interpreter (`applyToDom` → runtime) that MUST agree. This parity is the
   real build risk (§11), so it is prototyped before the schema is frozen.

## 4. Shape — the manifest `transform` field

```jsonc
"transform": [
  { "name": "scrim",
    "match": { "section": ["image", "statement"] },
    "do": [ { "insert": { "element": "div", "class": "image-scrim", "at": "start",
                          "attrs": { "aria-hidden": "true" } } } ] }
]
```

A **rule** = `{ name, match, do }`; order significant. Inline deck directives
(`data-focus`, `data-build`) remain **thin sugar** desugaring to the same primitives.
The interpreter binds each rule to **its component's own `<section>` subtree** before
matching (§6.5), so a shared component can't fire on the importing deck's other slides.

## 5. The declarative vocabulary (the safe subset only)

**`match` predicates** (over the section's own structure; `all`/`any`/`not`): `section`
(class), `attr` (present), `has` (a *declared-slot* selector — closed sub-grammar, §6.4),
`count` (children of a collection, comparison), `trailing` (structural position).

**`do` operations** — the structural-tagging / re-parenting set the corpus's *safe*
members reduce to:

| op | covers (honestly) |
|---|---|
| `addClass` / `setAttr` | image-scrim, focus/build stamps, marker classes |
| `extract` (by role/declared-slot) | split-panels, masthead, compare-code |
| `wrap` (target/run → container) | below-note, panels, code-cols, masthead band |
| `partition` (children → groups by marker) | compare-code columns |
| `tagByIndex` (ordinal stamp over a collection) | focus, build |
| `insert` (allowlisted element + text template) | image-scrim, below-note, labels |
| `rewriteTag` (to an allowlisted tag) | logo-marks *structure* (its URL handling is a capability — §6) |
| `bind` (attr ← token expr, engine tokens only) | token-driven values via the **pure** `resolve-token-expr.js` |

`collection` reuses the depth-aware walkers in `lib/core/collections.js` (`primary`,
`rows`, `cells`, `code-lines`). **What is NOT here** (corrected from the draft): the
chart-family codegen, logo URL resolution, auto-split/overflow-probe, and any
deck-scoped derivation — those are capabilities (§6) or first-party (§8), not the 8.

## 6. The safety envelope (specified, enforced by the interpreter)

The `transform` block is untrusted input to the interpreter, so the **interpreter** is
the attack surface. The draft asserted safety; here it is specified:

1. **Element allowlist (closed).** `insert`/`rewriteTag` may only emit structural/text
   elements: `div, span, p, h2–h6, ul, ol, li, nav, cite, blockquote, figure,
   figcaption, code, b, i, em, strong, small`. **Barred:** `script, style, link, base,
   meta, iframe, object, embed, form, input, svg/use, img` (images come only via
   capabilities that validate URLs). Unknown element → reject the manifest.
2. **Attribute allowlist + URL validator.** `setAttr`/`insert.attrs`/`bind` may write
   only `class`, `id`, `data-*`, `role`, `aria-*`, `colspan`/`rowspan`. **Barred:**
   `style`, every `on*`, `srcdoc`, `formaction`, `href`, `src`, `srcset`, `poster`,
   `xlink:href`. (This closes the CSS-`url()` beacon the draft left open — gate #616 /
   T-CSS. The corpus's `resolveAssetUrl` passes `data:`/`//`/`javascript:` through, so
   any URL a capability emits flows through a same-origin-relative-only validator.)
3. **`insert`/`template` is text-only.** Interpolation is **escaped text**, never raw
   markup; the template names an allowlisted element + an escaped text body + tokenized
   `bind`s. No HTML strings.
4. **Closed selector sub-grammar.** `has`/`extract` selectors = an allowlisted tag +
   a *declared-slot* class only — **no** attribute selectors, `:has()`, or combinators
   that cross the section boundary.
5. **Section scoping is an interpreter invariant**, not a convention — each rule is
   evaluated against its component's own `<section>` subtree.
6. **Schema + prototype-pollution defense.** A strict `manifest.schema.json` rejects
   unknown keys; rule objects are parsed into **null-prototype** objects (or with a
   `__proto__`/`constructor`/`prototype` denylist); `attrs`/`class` values are opaque
   strings, never spread/merged by attacker-controlled key.
7. **`bind` resolves engine-declared theme tokens only** — never manifest-supplied
   values — so it can't be turned into a nesting-DoS or an injection vector.

## 7. Termination & budget

Single forward pass over the rule list; `match` against the pre-rule snapshot; a global
node-visit + operation budget inherited from `render-guard`. `partition` + `walk-collection`
over a large deck is exactly where quadratic blowup hides (the threat model flagged this) —
the budget is the hard backstop, and an adversarial-rule-list termination test is a build
requirement.

## 8. The capability registry — everything the declarative core can't safely do

`{ "capability": "<name>" }` resolves to a **registered first-party op** from a **closed
allowlist** (unknown → reject). Rules pass **no free-form input** beyond the matched
section; any URL a capability emits flows through §6.2's validator; each capability
inherits the render-guard budget. The registry holds:

- **Measurement:** `image-aspect` (async `Image()` → `data-img-bucket`).
- **Codegen:** `chart-family/*` — the 13 chart layouts each parse a list into a schema
  and emit bespoke markup/geometry (progress bars, pie, gantt, radar, quadrant, funnel,
  …). This is *not* `wrap`+`insert`; it is parameterized generation → a capability per
  family. (Corrected from the draft, which wrongly mapped chart-family to `wrap/insert`.)
- **Geometry:** `state-chart` layout (browser measure + constraint solving).
- **Fit / repagination:** `auto-split` / `overflow-probe` — these change the deck's
  **slide count** and renumber pages; no `match→do` rule can express that, so they stay
  first-party and are invoked as a deck-level capability.
- **URL resolution:** the security-sensitive `resolveAssetUrl` path (logo-marks) — a
  capability that *validates* before emitting, never a raw `rewriteTag`.
- **Deck-scoped derivations (§9.1).**

This is the headroom: a power we can only do in JS becomes declaratively *wireable* the
moment it's registered, with no grammar change and no boundary change.

## 9. Honest expressiveness cost & deck scope

### 9.1 Deck-level transforms are capabilities, not primitives
`match → do` is **single-section by definition**. But the corpus includes
irreducibly **deck-scoped** transforms — the progress-tile rail
(`progress.transform.js`) walks *every* section, counts `divider` slides across the
deck, computes each slide's ordinal in that global sequence, and injects into *other*
slides; watermark/section-numbering are the same shape. These are **permanently
first-party capabilities** (`capability: "section-rail"`), reached declaratively but
computed across the deck by reviewed code. The DSL grammar deliberately has **no
cross-section predicate** — that keeps it safe and simple.

### 9.2 No loops/conditionals/data-binding in the grammar
"Emit one card per data row" or "if N≥7 then dense with a computed bound" need
iteration/branching/data-binding — **grammar/evaluation-model** features the DSL
deliberately omits (that omission is the safety property). Such needs land as a
**first-party capability**, not as DSL grammar. So the headline is honest: the
*declarative* surface extends only for structural tagging; expressive growth is
first-party capabilities. We own that cost rather than imply it away.

## 10. The AI component-generation knowledge file (must be a canon, not an outline)

The canon that grounds the model to emit an **exceptional** manifest + CSS + skeleton +
DSL. The independent assessor's key point: the theme AI worked because `THEME_CANON`
(`lib/theme/ai.js`) is *concrete* (exact token counts, L≈0.9/0.45 numbers, a literal
worked `indaco`), plus `coerceEssentials` to forgive a sloppy model. So the **worked
examples are the make-or-break deliverable**, and a **`coerce`/repair layer** (reject
unknown ops, drop unsafe attrs, snap to schema) is required, not optional. Sections:

1. The component model (12 buckets; form/substance/function; manifest field intents).
2. The authoring contract (`_class`, slots-as-selectors, card-nesting #5, base
   modifiers, palette-blind `var(--token)` #3, the `--fs-*` scale #4, gate-clean CSS).
3. The DSL vocabulary (§5–§8) with **each safe transform shown as a literal before→after
   DSL example**, and the capability allowlist it may invoke.
4. The 10/10 boardroom rubric + `design/design-principles.md`.
5. Anti-patterns (wall-of-text, forced shape, inline `- **Title.** body`, hex, margins).
6. The safety envelope (declarative only; never emit JS, raw HTML, raw URLs, or `style`).
7. **2–3 fully worked, literal examples** — prompt → manifest + CSS + skeleton + DSL —
   including one using a `capability`. (Concrete like `THEME_CANON`, not a TOC.)

## 11. Path to build — PROTOTYPE-FIRST (both reviewers)

The real risk is not the grammar (data) but the **dual string+DOM interpreter parity**
across the 3 render paths — a tar pit if approached as "freeze the full schema, then
build both interpreters." So, before the §12 spec:

- **Thin vertical prototype:** implement exactly **`extract` + `wrap`** (the hardest
  re-parenting case) and a **`capability` stub**, on **one real component
  (`split-panel`)**, with the cross-path parity test wired like the integration tier's
  engine-vs-runtime assertion. Prove (a) string/DOM interpreters agree on the hard op,
  (b) the manifest surface round-trips, (c) the capability bridge composes. This
  converts the buildability uncertainty into evidence in a few days, and is the
  maker-checker-worthy slice.
- Then ship the grammar; **let the registry grow on demand** — do not implement all 8
  primitives + the full predicate algebra up front (the doc's own §3.2 philosophy).

## 12. Open spec items (after the prototype)

- The strict JSON schema for `match`/`do` + `manifest.schema.json` additions (now a
  **safety** requirement, §6.6, not just structure).
- The two interpreters + cross-path parity + adversarial-termination tests (§7).
- The text-only `template` mini-syntax (§6.3).
- The capability allowlist + per-capability input/budget contracts (§8).
- Wiring the knowledge file (§10) into the Studio "design a component" AI path.

## 13. Links

- Gate: `2026-06-29-component-transformer-threat-model.md` (#616 CSS/HTML exfil, #617 zip-slip).
- Corpus evidence: `lib/transformers/registry.js`, `lib/core/collections.js`,
  `lib/core/resolve-token-expr.js` (confirmed pure), `lib/core/bg-image.js`
  (`resolveAssetUrl` URL passthrough — the §6.2 reason), `lib/transformers/logo-marks.js`
  (`style=url()` — barred), `lib/forms/tile/progress/progress.transform.js` (deck-scoped),
  `lib/core/auto-split.js` (slide-count mutation), `lib/components/chart/_chart-family/`
  (codegen).
- Architecture boundary: `engineering/architecture.md` ("JS does exactly four things").
- Theme-canon precedent: `lib/theme/ai.js` (`THEME_CANON`), `2026-06-29-studio-theme-ai.md`.
