---
status: proposed
summary: The declarative transform DSL the threat-model gate (2026-06-29-component-transformer-threat-model.md) requires — the safe way to give designers the "magic" first-party transformers do, without user JS. A component manifest gains a `transform` field: an ordered list of `match → do` RULES the engine interprets identically across all three render paths. Designed as a FOUNDATION WITH HEADROOM, not an enumeration of today's transforms: a versioned grammar whose vocabulary is a REGISTRY of named operation-primitives and match-predicates, so a capability we don't have today is added by registering one new first-party primitive (reviewed once) — never by changing the grammar or widening the trust boundary. The catalogued first-party corpus reduces to 8 pure/bounded primitives (add-class, extract, wrap, partition, tag-by-index, walk-collection, insert, rewrite-tag) — the SEED set, proving the DSL expresses real work — plus 2 genuinely imperative cases (image-aspect measurement, state-chart geometry; also overflow-probe/auto-split) that STAY first-party and are reached declaratively through a CAPABILITY BRIDGE (`capability: <name>`). Rules are idempotent by construction (engine-stamped markers), bounded (single-pass, depth-limited, no user regex, no I/O, render-guard budget), and contain no executable code, so they are safe to share and safe for the AI to generate. The doc also outlines the AI COMPONENT-GENERATION KNOWLEDGE FILE (the canon that grounds the model to emit an exceptional manifest + CSS + skeleton + DSL).
---

# Component transform DSL — a declarative foundation with headroom

## 1. Why this exists

The threat model (`2026-06-29-component-transformer-threat-model.md`) decided
**no designer-authored JS transformers** — user JS would run as RCE on export and
XSS on preview, and components are shareable + AI-generable. The "magic" designers
want must instead be **declarative, first-party-interpreted**. This doc designs that
DSL. It is build-prep, not a build; the gate's §6.1 sketch is the seed.

**Design steer (the user's, verbatim intent):** *don't be beholden to what we've
done — let the past clarify the art of the possible, and design with an eye to the
future so things we don't do today are possible tomorrow.* So the corpus is the
**validation set, not the ceiling.**

## 2. Principles

1. **Match → operate.** Every first-party transformer already is: a *trigger* over
   the slide's structure, then a *structural rewrite*, guarded for idempotence. The
   DSL makes that explicit and data.
2. **Foundation with headroom.** A **versioned grammar** (`dsl: 1`) whose *shape* is
   stable; the **vocabulary is a registry** of named operation-primitives and
   match-predicates. New capability = **register one new first-party primitive**
   (reviewed once), not a grammar change and never a trust-boundary change.
3. **Composable & orthogonal.** A few primitives that compose, over a long list of
   special-case keywords. `lift` = `extract` + `insert`; a panel split = `partition`
   + `wrap`.
4. **Idempotent by construction.** The engine stamps a per-rule marker and skips
   re-application — designers never hand-write the guards every transform needs today.
5. **Bounded & inert.** Single-pass, depth-limited walks; no designer-supplied regex
   (predicates are over *structure*; any pattern is a fixed, safe matcher); no I/O; no
   executable code; evaluation inherits the engine `render-guard` budget. This is what
   makes a `transform` block **safe to share and safe to generate** — the gate's whole
   point.
6. **One semantics, three paths.** The DSL has a string interpreter (`applyToHtml`,
   the engine/emulator → PDF/PPTX) and a DOM interpreter (`applyToDom`, the runtime)
   that MUST agree — the same invariant the hand-written transformers carry today.

## 3. Shape — the manifest `transform` field

A component manifest (today: `name`, `function`, `form`, `slots`, `skeleton`, …)
gains an optional `transform`: an **ordered list of rules**.

```jsonc
"transform": [
  {
    "name": "scrim",                 // stable id → the idempotence marker + logs
    "match": { "section": ["image", "statement"] },
    "do": [ { "insert": { "class": "image-scrim", "at": "start", "ariaHidden": true } } ]
  }
]
```

A **rule** = `{ name, match, do }`. Order is significant (a rule may depend on an
earlier rule's output, exactly like `TRANSFORMERS` ordering today). Inline deck
directives (`data-focus`, `data-build`) remain as **thin sugar** that desugars to
the same primitives — one registry under both surfaces.

## 4. `match` — the predicate registry (seed)

Predicates over the slide's **own** structure; composable with `all` / `any` / `not`.

| predicate | matches when | covers |
|---|---|---|
| `section: "x"` / `["x","y"]` | the section carries class x (all of, if array) | every class-triggered transform |
| `attr: "data-foo"` | the section has the attribute | `focus`, `build` |
| `has: "<selector>"` | a descendant matches a slot/selector | content-shape gates |
| `count: { of, op, n }` | N children/items satisfies a comparison | "n-items ≥ k" branches |
| `trailing: "p-after-block"` | structural-position predicate | `below-note` |
| `all` / `any` / `not` | boolean composition | combinations |

Selectors are restricted to the component's **declared slots** + a safe element
allowlist — not arbitrary CSS — so a predicate can't reach outside the slide or
encode a beacon.

## 5. `do` — the operation-primitive registry (seed = the 8)

Each maps to catalogued first-party behavior; each is pure & bounded.

| op | signature (sketch) | covers |
|---|---|---|
| `addClass` / `setAttr` | `{ target?, class \| attr,value }` | image-scrim, chart-frame marker, focus/build stamps |
| `extract` | `{ role/selector → handle }` | split-panels, masthead, compare-code |
| `wrap` | `{ target \| run, class }` | below-note, panels, code-cols, masthead band |
| `partition` | `{ by: marker, into: class }` | compare-code columns, panel split |
| `tagByIndex` | `{ collection, spec, hit, miss? }` | focus (`lat-focus`/`lat-recede`), build (`data-build-step`) |
| `insert` | `{ class/template, at: start\|end\|after(target) }` | image-scrim, below-note, generated labels |
| `rewriteTag` | `{ target, to, attrs }` | logo-marks (`<img>`→`<span>`) |
| `bind` | `{ target, attr, expr }` | token-driven values via the **pure** `resolve-token-expr.js` |

`collection` names the depth-aware walkers the corpus already shares (`primary`
list, `rows`, `cells`, `code-lines`) — `lib/core/collections.js`, reused not
reinvented. `lift` is sugar for `extract`+`insert` into a slot.

## 6. The capability bridge — reaching the imperative cases declaratively

Two corpus members need real computation and **stay first-party**:
`image-aspect` (async `Image()` measurement → `data-img-bucket`) and `state-chart`
(browser geometry + constraint solving); likewise `overflow-probe` / `auto-split`'s
fit math. A rule **invokes** them by name without containing them:

```jsonc
{ "match": { "section": "image" }, "do": [ { "capability": "image-aspect" } ] }
```

`capability: <name>` resolves to a **registered first-party op**. This is the
headroom hinge: a power we can only do in JS becomes declaratively *wireable* the
moment it's registered — the DSL grows to reach new first-party capabilities
without absorbing their code or opening the boundary.

## 7. Extensibility — how tomorrow's work lands

- **New structural primitive** (e.g. a `grid-balance` that redistributes cards): add
  it to the op registry, reviewed once; every component can use it. No grammar change.
- **New predicate** (e.g. `aspect: portrait`): add to the predicate registry.
- **New imperative power** (e.g. a future auto-layout solver, a data-bound chart from
  a declared dataset, motion/build choreography): implement first-party, expose as a
  `capability`. The manifest references it declaratively.
- **Grammar version** bumps only for a *shape* change (rare); the registry grows
  continuously. A manifest declares `dsl: 1`; the interpreter rejects unknown ops with
  a clear error rather than executing anything.

Worked "future" sketch — a responsive variant we don't ship today, expressed without
any new grammar:

```jsonc
{ "match": { "section": "cards-grid", "count": { "of": "primary", "op": ">=", "n": 7 } },
  "do": [ { "addClass": { "class": "cards-dense" } },
          { "capability": "grid-balance" } ] }
```

## 8. Worked examples (today's corpus as DSL)

```jsonc
// below-note: wrap a trailing hairline <p> (excluded layouts skip)
{ "name": "below-note",
  "match": { "all": [ { "not": { "section": ["title","quote","image","code"] } },
                      { "trailing": "p-after-block" } ] },
  "do": [ { "wrap": { "target": "trailing-p", "class": "below-note" } } ] }

// focus: ordinal emphasis over the primary collection, driven by the deck directive
{ "name": "focus",
  "match": { "attr": "data-focus" },
  "do": [ { "tagByIndex": { "collection": "primary", "spec": "@data-focus",
                            "hit": "lat-focus", "miss": "lat-recede" } } ] }

// masthead-lift: band the eyebrow + h2 into a slot, stage the rest
{ "name": "masthead",
  "match": { "section": "form" },
  "do": [ { "extract": { "role": "eyebrow", "as": "eb" } },
          { "extract": { "role": "heading", "as": "h" } },
          { "insert": { "template": "masthead-band(eb,h)", "at": "start" } },
          { "wrap": { "run": "rest", "class": "cell-stage" } } ] }
```

These are illustrative surface, not a frozen schema — §10 is the spec backlog.

## 9. The AI component-generation knowledge file (outline)

The second deliverable: the canon that grounds the model to generate an **exceptional**
component — manifest + CSS + skeleton + **DSL** — the analogue of the theme canon. It
is fed as system context (and is a candidate for the prompt-cache / file-upload slices
#16/#17). Outline:

1. **The component model** — the 12 buckets; the form / substance / function
   vocabularies; the manifest shape with each field's intent (from
   `lib/components/**/**.manifest.json` + `design/design-system.md`).
2. **The authoring contract** — `<!-- _class: name -->`, slots-as-selectors, the
   card-style nesting rule (#5), base modifiers (eyebrow/subtitle), palette-blind
   `var(--token)` (#3) and the `--fs-*` type scale (#4). What makes CSS *gate-clean*.
3. **The DSL vocabulary** — §4–§7 here, with **each existing transform shown as a
   before→after DSL example** (the model learns by worked cases), and the capability
   list it may invoke but not implement.
4. **Design principles / the 10/10 boardroom bar** — hierarchy, restraint, the rubric
   (`engineering/decisions/2026-06-06-layout-audit/`), `design/design-principles.md`.
5. **Anti-patterns** — wall-of-text, forcing shape, inline `- **Title.** body`, hex
   literals, margins (#20) — the things lint/review reject, so the model avoids them.
6. **The safety envelope** — declarative only; never emit JS; the interpreter rejects
   unknown ops. (Keeps a prompt-injected model from even trying.)
7. **2–3 fully worked examples** — prompt → manifest + CSS + skeleton + DSL, end to
   end, including one that uses a `capability`.

## 10. Open spec items (the build backlog, not this doc)

- The precise JSON schema for `match` / `do` and `manifest.schema.json` additions.
- The two interpreters (string + DOM) and their cross-path parity test (the existing
  two-renderer gate pattern).
- The `template` mini-syntax for `insert` (bounded, no expressions beyond `bind`).
- Which first-party transforms migrate to the DSL vs stay (the imperative two stay;
  pure ones may migrate opportunistically — not required).
- Wiring the knowledge file into the Studio "design a component" AI path.

## 11. Links

- Gate: `engineering/decisions/2026-06-29-component-transformer-threat-model.md` (and #616/#617).
- Corpus: `lib/transformers/registry.js`, `lib/core/collections.js`,
  `lib/core/resolve-token-expr.js` (the pure evaluator `bind` reuses).
- Manifest + catalog: `lib/components/**/**.manifest.json`, `dist/docs/components.json`, `AGENTS.md`.
- Theme-canon precedent: `lib/theme/ai.js` (`THEME_CANON`),
  `engineering/decisions/2026-06-29-studio-theme-ai.md`.
