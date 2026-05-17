# Proposal: post-migration improvements to the shared transformer registry

Date: 2026-05-17
Branch: `claude/shared-transformer-library-Qv38u` (proposed follow-up work)
Status: design — pre-implementation

## What this proposes

The 12-commit migration on this branch produced the plugin/extension
system originally requested: every layout transformer dispatches
through one registry on all three render paths (marp-cli, emulator,
runtime). Maintenance and extensibility are materially better. The
trade-offs are also honest:

- **Bundle size grew** from ~225 KB executable JS to ~628 KB (+~400 KB).
  Real recoverable savings: ~100–200 KB. The remainder is engine
  code the runtime genuinely needs (parsers, SVG builders,
  radar/quadrant kernels).
- **Per-section dispatch** through the registry adds one indirection
  per transformer per slide. Immeasurably small in practice.
- **`applyToDom` round-trips innerHTML** for three of five
  transformers (chart-family, journey, word-cloud). Real but small
  per-render cost; the maintenance saving was the trade.
- **`src/runtime/index.js` is a 1058-line monolith** of mermaid
  bootstrap + frontmatter parsers + utility transforms. Down from
  3713, but still one file doing many things.

This doc names each weakness, the candidate fixes, the recommended
move, and a suggested sequencing.

## Weakness 1 — runtime bundle size

### Problem

`lib/transformers/registry.js` is a CommonJS module. Its
`require('./chart-family')` (and roadmap, journey, etc.) drag in
each engine module's full export surface. The runtime uses
`applyToDom` (which calls `transformXSection` per section); it never
calls `applyToRenderedHtml` (the full-HTML walker that marp-cli's
render hook uses). But esbuild can't tree-shake CJS, so the walker
ships in the bundle anyway.

### Concrete measurement

- Source: every transformer's `applyToRenderedHtml` is dead code in
  the runtime context. Net "wasted" bytes: ~80–120 KB across all
  five (each walker is a few KB of regex-based section iteration).
- Less wasted than appears: most of the bundle weight is parsers and
  emitters that `transformXSection` actually uses (radar's SVG
  geometry, kanban's layout math, etc.). Those are not removable.
- Honest estimate of recoverable bytes: **100–200 KB**, depending on
  approach.

### Candidate moves

**A. ESM migration of `lib/transformers/` + the engine module slice.**
Convert these files to `.mjs` (or set `"type": "module"` in a
sub-package). Use named exports. esbuild's ESM tree-shaking removes
unused exports. marp.config.js (CJS, required by marp-cli v4) bridges
via Node 22's `--experimental-require-module` flag, or via dynamic
`import()` from a thin CJS shim.

- Pros: unlocks real tree-shaking, sets up the eventual full ESM
  migration when marp-cli v5 ships, the cleanest long-term shape.
- Cons: interop edge cases between CJS marp.config.js and ESM
  registry; possible Node-version constraint (requires Node 22 for
  the experimental flag, OR shim pattern).
- Estimated effort: 1–2 days (8–10 files converted, interop tested).
- Estimated bundle savings: 100–150 KB (the unused walkers + some
  intermediate helpers esbuild can now drop).

**B. Two parallel registries.** Keep `lib/transformers/registry.js`
as today (full surface). Add `lib/transformers/registry.runtime.js`
that imports each transformer's `*.dom.js` (a new minimal sibling
file per transformer that exports only `applyToDom`). The runtime
bundle imports the slim one.

- Pros: pure CJS, no Node-version pinning, smaller blast radius.
- Cons: every transformer now has two registration sites that must
  stay in sync; defeats some of the "single source of truth" win
  from the registry refactor.
- Estimated effort: half a day.
- Estimated bundle savings: 50–100 KB (only the unused full walkers
  are removed; everything in the section primitive still ships).

**C. Split each engine module.** Refactor each
`lib/components/<n>/<n>.transform.js` into
`<n>.section.js` (the per-section kernel, what `transformXSection`
needs) plus `<n>.html-walker.js` (the regex-based full-HTML
iterator). `lib/transformers/<n>.js`'s `applyToDom` imports only
section.js.

- Pros: structurally cleanest, all CJS, no interop concerns.
- Cons: touches every engine module, biggest source diff, the
  "section vs walker" split is artificial (you'd never write it
  that way from scratch).
- Estimated effort: 1 day (mechanical refactor, all 5 transformers).
- Estimated bundle savings: similar to (B), 50–100 KB.

### Recommendation: **A (ESM migration of the transformer slice)**

It's the only move that addresses the root cause (CJS prevents
tree-shaking) and the only one that compounds — when marp-cli v5
ships ESM-only, the rest of the codebase migrates without re-doing
this work. (B) and (C) are workarounds that we'd undo later.

The interop concern is manageable: marp.config.js's import of the
registry becomes a dynamic `import()` returning a Promise the render
hook awaits. Marp-cli's plugin loader supports async plugin
returns. The rest of the codebase (engine, runtime) doesn't touch
marp-cli's loader, so it migrates freely.

## Weakness 2 — `applyToDom` innerHTML round-trip

### Problem

`lib/transformers/{chart-family,journey,word-cloud}.js`'s
`applyToDom` delegates to the HTML kernel:

```js
applyToDom(root) {
  for (const section of root.querySelectorAll(this.selector)) {
    const r = engine.transformXSection(section.innerHTML, section.className);
    if (r !== section.innerHTML) section.innerHTML = r;
  }
}
```

For each matching section, this:
1. Serializes the section's children to an HTML string.
2. Parses + walks + rewrites the string in the kernel.
3. Parses the rewritten string back into DOM nodes via
   `section.innerHTML = …`.

Steps 1 and 3 are wasted work — the data was already DOM. Cost is
proportional to section size and slide count. For a 60-slide deck
with ~5 chart sections, it's probably <50 ms total in marp-vscode's
preview re-render path. For a 300-slide deck with many charts, it's
real.

`split-panels` and `roadmap` already use true DOM walks (~150 and
~100 lines respectively) and don't have this cost.

### Candidate moves

**A. Write true DOM walks for the three delegating transformers.**
chart-family is the hardest because it routes through radar/quadrant
SVG-building kernels that emit HTML strings; you'd still need an
innerHTML round-trip for those output strings (~5–10 lines vs full
section). journey and word-cloud are mechanical lifts from the HTML
kernels, ~150–250 lines each.

- Pros: removes the round-trip; smaller per-render cost; matches
  the pattern split-panels and roadmap already use.
- Cons: code duplication between the HTML kernel and the DOM walker
  returns. We DELETED this in the migration; this would re-add it.
  The cross-renderer parity test catches drift, but the
  reviewer-eyeballs cost goes up.
- Estimated effort: 1–2 days.
- Estimated perf improvement: ~5–50 ms per re-render depending on
  deck size; unmeasurable on the build pipeline.

**B. Make the innerHTML round-trip idempotent and cache it.** The
kernel could return a stable result hash; if the section's current
innerHTML matches the previous round's result, skip. Avoids
redundant work in marp-vscode's frequent re-renders.

- Pros: no code duplication; benefits all delegation paths uniformly.
- Cons: adds a stateful cache to a stateless transformer; cache key
  needs to include class names; doesn't help the first render.
- Estimated effort: half a day (one cache, all transformers).
- Estimated perf improvement: significant on re-render; none on
  first render.

**C. Accept the cost, document it.** Mark the perf characteristic in
the registry docs; revisit if a real performance complaint surfaces.

- Pros: zero work, no new code.
- Cons: leaves the weakness in place; no learning if it's actually
  bad.

### Recommendation: **C, with a perf benchmark fixture as a tripwire**

This weakness is theoretical until measured. The split-panels and
roadmap DOM walks already exist as templates if we need to lift more.
What's missing is a number: how slow IS the round-trip in practice?

Concrete proposal: add `test/integration/perf/dom-walk.test.js` that
renders a synthetic 200-section deck through both pipelines and
records the round-trip wall-clock cost. If it's >100 ms on any chart
layout, take (A) for that layout. Otherwise defer.

## Weakness 3 — runtime monolith

### Problem

`src/runtime/index.js` is 1058 lines doing seven distinct things:

1. Mermaid bootstrap + theme-variable resolution (~300 lines)
2. Frontmatter-driven deck-class / deck-logo injection (~150 lines)
3. Slot-label-lift + verdict-grid / obligation-matrix badge
   transforms (~150 lines)
4. Glossary list-table and range-pill transforms (~120 lines)
5. Bootstrap (DOMContentLoaded handling, MutationObserver) (~150 lines)
6. Strip / add heading periods (~80 lines)
7. The single `sharedTransformerRegistry.applyAllToDom(document)`
   call that does most of the work (1 line)

The migration moved every layout transformer OUT of this file. What
remains is a grab-bag of "browser-side stuff that isn't a layout
transformer." It works, but the organization no longer follows the
shape of the system.

### Candidate moves

**A. Split into co-purpose modules.** `src/runtime/mermaid.js`,
`src/runtime/frontmatter.js`, `src/runtime/transforms.js`,
`src/runtime/bootstrap.js`. esbuild already handles multi-module
bundling; the entry point becomes a thin `src/runtime/index.js`
that imports + calls each module's setup function.

- Pros: each file is ~150–300 lines, single concern, easier to read
  and modify; matches the `lib/transformers/` shape.
- Cons: pure organization, no behavior change; needs careful
  ordering of side-effecting bootstrap (Mermaid before observers,
  etc.); some shared state (mermaid theme cache) may need module
  globals or a context object.
- Estimated effort: 1 day.
- Functional payoff: zero. Maintenance payoff: real for anyone
  reading the runtime for the first time.

**B. Move the non-bootstrap utility transforms (verdict-grid,
checklist, glossary, slot-labels) into shared modules under
`lib/runtime-utils/` so they can be unit-tested separately.** The
runtime entry becomes Mermaid + frontmatter + a few setup hooks +
the registry call.

- Pros: more aggressive cleanup; utilities get jsdom tests; the
  runtime becomes "framework + one registry call" rather than
  "framework + ad-hoc transforms".
- Cons: bigger refactor; needs to pick which utilities are
  registry-worthy vs. just shared.
- Estimated effort: 2 days.

**C. Defer.** The file is large but well-organized internally; the
section comments serve as navigation; no one is currently being
slowed by it.

### Recommendation: **A (split into co-purpose modules), as a
groundwork move before any ESM migration**

If we ESM-migrate the transformer slice (Weakness 1, recommendation
A), `src/runtime/index.js` is a natural candidate for the same
treatment — and splitting first makes the per-file conversion
trivial. So the sequencing is: split → then migrate.

If we don't ESM-migrate, defer.

## Suggested sequencing

Three weaknesses, three recommendations. They have a natural order:

1. **Spike: perf benchmark fixture for Weakness 2** (half-day).
   Cheap; produces a real number that either kills Weakness 2 as a
   concern or escalates it. Do this first so the rest of the plan
   is grounded.

2. **Weakness 3, recommendation A: split `src/runtime/index.js`**
   (1 day). Sets up the ESM migration; no behavior change; can
   land independently of anything else.

3. **Weakness 1, recommendation A: ESM-migrate the transformer
   slice** (1–2 days). Real bundle savings. Bridges to full ESM
   when marp-cli v5 lands.

4. **Weakness 2, conditional on (1)**: if the perf benchmark says
   the round-trip is real, take the DOM-walk lift for the offending
   transformers (1–2 days).

Total: 3.5–5.5 days of work spread across four PRs. None of them
block the merge of the current branch.

## What this proposal explicitly does NOT do

- **No grand-rewrite of the registry.** The shape from the
  12-commit migration stands.
- **No PR-level mandate.** Each weakness is independent; pick any
  subset.
- **No new transformer abstractions.** The current
  `{ name, applyToHtml, applyToSection, applyToDom }` contract is
  the right shape; the proposals above are mechanical optimisations
  underneath it.
- **No marp-cli upgrade attempt.** ESM migration of marp.config.js
  itself waits for marp-cli v5 (signalled but not shipped).

## Decision points

When this proposal is reviewed, the questions to answer are:

1. Spike the perf benchmark first, yes/no?
2. Split `src/runtime/index.js` into modules, yes/no?
3. ESM-migrate `lib/transformers/` + engine slice, yes/no?
4. (Conditional on benchmark) Take the DOM-walk lift, yes/no?

The recommendations above are: yes, yes, yes, conditional. Each is
independent; the user can pick any subset.
