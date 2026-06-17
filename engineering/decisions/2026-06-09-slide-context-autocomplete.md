---
status: proposed
summary: Slide-context-sensitive autocompletion for the Drawing Board editor — class names, modifiers, slot scaffolds, data vocab
---

# Slide-context autocomplete for the Drawing Board editor (2026-06-09)

> Status: **proposal / design model.** No code yet. This doc fixes direction
> before implementation, per the "design before code on rethink requests" rule
> in `CLAUDE.md`. Scope is the CodeMirror editor inside the Drawing Board
> (`docs/src/playground/editor.js`); it does not touch the three render paths.

## Problem / intent

Authoring a Lattice deck is a vocabulary problem. The author has to know, at the
keystroke:

- which **component class** to put in `<!-- _class: … -->` (52 of them, 12
  buckets),
- which **modifiers** are legal there (`dark`, `tint-corner`, `scale-l`,
  `silent`, plus per-component variants like `map us` / `cards-grid four`),
- the **slot shape** the component expects in the body (an `h2` then a `ul`,
  nested `- Title` / `- body`, a trailing inline-code value, …),
- and, inside data-driven components, the **literal names** the kernel
  resolves (country/state names for `map`, etc.).

Today none of this is offered inline except a single, narrow region completer
for `map`. The machine catalog (`dist/docs/components.json`) and the lint
vocabulary (`buildVocab()`) already encode every fact above and are *already
shipped into the page* — but the editor doesn't surface them as completions.
The result is the exact footgun class `CLAUDE.md` keeps warning about: decks
ship with `tint-<em>` typos, inline `- **Title.** body` on card-style layouts,
or a `_class:` name that doesn't exist, all of which the *linter* catches *after*
the mistake instead of the editor preventing it at the keystroke.

**Goal:** generalize slide-context-sensitive autocompletion so the editor offers
the right class names, modifiers, slot scaffolds, and data vocabulary based on
*where the cursor is* — deterministically, offline, zero model calls — and fold
the existing `map` completer into that model (fixing its mis-gating along the
way).

## Current state — one completer, and it's mis-gated

The only completion source is `docs/src/playground/map-complete.js`, wired into
the editor extension array at `editor.js:~252` via `mapAutocomplete()`. It is a
good prototype of the *pattern* we want to generalize:

- it walks backward from the cursor to the nearest `<!-- _class: … -->` without
  crossing a `---` slide boundary (`mapBasemapAt`),
- it gates tightly to a list-item *name* position (after `- `, before the
  trailing inline-code value),
- it serves a static vocabulary baked from the basemaps — no model round-trip,
- it stays quiet until there's a keystroke or explicit `Ctrl-Space`.

**But it has a correctness bug that is the root cause of the reported "world
countries / Global South missing" complaint.** The `map` component defaults to
the **world** basemap (`map.docs.md`: *"The default basemap is the world …; add
`us` (or `usa`) for the US-states map"*). The completer inverts that default:

```js
// map-complete.js — current
return tokens.includes('world') ? 'world' : 'us';
```

So on a bare `<!-- _class: map -->` slide — which renders a **world** map — the
completer offers **US states**. The full world vocabulary (175 countries + every
group: continents, blocs like ASEAN/BRICS/G20/OECD, and the contested-term
categories `Global South`, `Global South — Brandt Line`, `Global North`, the
per-continent Global South cuts — 217 options in all) *is* built into
`OPTIONS.world`, but it's only reachable if the author explicitly writes the
**redundant** `world` token the docs tell them to omit. The vocabulary isn't
absent; the trigger gate makes it unreachable on the slide where it matters.

Correct gate (the fix the general model adopts):

```js
const isUs = tokens.includes('us') || tokens.includes('usa');
return isUs ? 'us' : 'world';   // world is the default basemap
```

This single example is the argument for the whole refactor: a per-feature
context walker, hand-coded against a half-remembered grammar, drifts from the
component's real contract. The general model centralizes context detection so
there is **one** place that knows what slide the cursor is in, tested against the
manifests.

## Why this is feasible here (the infra already exists)

Almost everything is already present and already crosses the build→browser
boundary:

- **`@codemirror/autocomplete` is a dependency** and supports exactly this:
  `autocompletion({ override: [sourceA, sourceB, …] })` multiplexes any number
  of context-gated sources, each a no-op unless its own context check passes.
- **The vocabulary is already injected into the page.** `drawing-board.astro`
  builds `lintVocab = { names, modifiers, mapRegions }` from `buildVocab()` and
  an `obCatalog` (per component: `name`, `bucket`, `tags`, `summary`,
  `skeleton`, `variants`, `slots[]`) and serializes both into `dbData`. The
  Architect panel already consumes them client-side. A completion source can
  read the same handoff — no new build wiring, no new disk reads in the browser.
- **Context detection is a solved pattern**, just duplicated: the `CLASS_RE` +
  backward-walk lives in *both* `editor.js` and `map-complete.js`. We extract it
  once.
- **The lint engine already models the grammar** (`lib/authoring/lint-core.js`):
  known names, modifier sets, card-style layouts, slot expectations. The
  completer and the linter should agree by construction — same vocabulary, same
  notion of "what component am I in."

## Design model

Four axes. For each: the candidate moves, then the recommendation.

### Axis 1 — what we complete (the completion *surfaces*)

| Surface | Trigger context | Vocabulary source | Value |
| --- | --- | --- | --- |
| **A. Component class name** | inside `<!-- _class: ␣ -->`, first token | `lintVocab.names` (+ `catalog` for `detail`/bucket) | the headline feature — discover the 52 components without leaving the editor |
| **B. Modifiers** | inside `_class:`, after the class name | universal modifiers + that component's `variants` from `catalog` | kills `tint-<em>` / `scale-x` typos; teaches `map us`, `cards-grid four` |
| **C. Slot skeleton** | empty body right after a chosen `_class:` line | `catalog[name].skeleton` | drop the correct body shape (the anti-footgun for card-style nesting) |
| **D. Data vocabulary** | component-specific body positions (e.g. `map` list items) | per-component static data (basemaps today) | the generalized, correctly-gated successor to `map-complete.js` |

### Axis 2 — where it triggers (context detection)

One shared kernel, `slideClassAt(state, lineNo) → { name, modifiers[], directiveLine, bodyStart } | null`:

- walk backward from `lineNo` to the nearest `<!-- _class: … -->`, stop at a
  `---` boundary (returns `null` if none — author is between slides / in front
  matter),
- parse tokens into `{ name, modifiers }`,
- expose where the directive is and where the body begins, so body-position
  sources (C, D) can locate themselves.

Replaces both existing duplicate walkers. Lives next to the editor (browser-safe,
no `fs`), e.g. `docs/src/playground/slide-context.js`. Tested against fixtures
derived from real manifests so it can't drift from the grammar the way
`map-complete.js` did.

### Axis 3 — where the vocabulary comes from

**Recommendation: consume the existing `dbData` handoff; add nothing to the
build that isn't already there.** Pass `lintVocab` + `catalog` into the editor
factory (`createEditor({ …, vocab, catalog })`) and hand them to the completion
sources. This guarantees the completer and the Architect's linter speak the same
vocabulary, and keeps the "vocabulary is data computed at build time" contract
that already governs the lint panel. No `components.json` fetch in the browser.

### Axis 4 — how sources compose

`autocompletion({ override: [classNameSource, modifierSource, skeletonSource, mapRegionSource, …] })`.
Each returns `null` unless its context matches, so they never fight. Order is by
specificity (most-specific position wins). The map source becomes one entry in
this array instead of the sole `override`.

## Recommendation — v1 scope

Ship **A + B + the map fix** first; stage **C and D-generalization** behind it.

1. **A. Class-name completion** inside `_class:`. Highest value, lowest risk —
   it's pure discovery and can't produce a wrong body.
2. **B. Modifier completion** after the class name, filtered to *that component's*
   legal set (universals + its `variants`). Directly retires a documented footgun
   class.
3. **Map fix**: correct the inverted default (`us`/`usa` → US, else world) and
   reroute the map source through the shared `slideClassAt`. This alone resolves
   the reported world-countries / Global South gap.

Deferred to a follow-up (noted so we don't lose them):

4. **C. Slot-skeleton drop-in** — powerful but needs UX care (snippet insertion,
   tab stops); easy to make annoying. Design separately.
5. **D. Generalized data vocab** — the map source is the only data completer
   today; generalizing the *registry* (a component opts in a body-position
   source) is worth doing once a second data component wants it, not before.

## Architecture

```
docs/src/playground/
  slide-context.js     // slideClassAt() — the one shared context walker (NEW)
  complete/
    index.js           // assembles autocompletion({ override: [...] }) (NEW)
    class-name.js       // surface A (NEW)
    modifiers.js        // surface B (NEW)
    map-regions.js      // surface D — map-complete.js, re-gated via slide-context (MOVED/FIXED)
  editor.js            // imports complete/index, passes vocab+catalog in
```

- `createEditor` gains `vocab` + `catalog` params (already available in
  `drawing-board.astro`). The component-specimen page that also uses
  `createEditor` passes neither → sources see empty vocab → inert, no regression.
- Completion options use CodeMirror's `{ label, type, detail, apply }`. `detail`
  carries the bucket (class names) or the variant kind (modifiers) for a useful
  chip. `type` drives the icon class.
- All sources are pure functions of `(context, vocab, catalog)` — unit-testable
  without a DOM by feeding a hand-built `CompletionContext`-shaped stub, mirroring
  how `lint-core.js` is tested.

## Trigger discipline (staying out of the way)

The map completer's restraint is the model: no auto-pop on a bare token without
a keystroke unless `context.explicit` (`Ctrl-Space`). Apply the same everywhere.

- Class/modifier sources fire **only inside the `_class:` comment**, never in
  prose or arbitrary HTML comments. The `_class:` token is a tight, unambiguous
  anchor.
- `validFor` regexes keep the menu alive as the author types without re-running
  the source on every keystroke.
- No source competes inside another's position — Axis-2 gating guarantees it.

## Open questions (resolve before/while building)

1. **Modifier completeness vs. noise.** The universal modifier set is large
   (treatments, tints, marks, scales, state markers). Offer all of them after
   every class, or rank component-relevant variants first and fold universals
   below? *Leaning:* component `variants` first (from `catalog`), universals
   after, so the most likely token is at the top.
2. **Skeleton insertion UX (surface C).** Plain text vs. CodeMirror snippet with
   tab stops? Auto-offer on an empty body, or only via `Ctrl-Space`? Defer to the
   C-specific design.
3. **Does the Architect's lint vocab need a `detail`/bucket map?** It ships
   `names` as a flat list; class-name completion wants the bucket per name for
   the chip. `catalog` already has `bucket` — join on `name` in the source, no
   build change.
4. **Should this also land in marp-vscode?** Out of scope — that preview uses
   `dist/lattice-runtime.js` for *render* transforms, not editor tooling. This is
   a Drawing-Board-editor feature only.

## Definition of done / what ships

- One shared `slideClassAt`; the two duplicate walkers removed.
- Class-name + modifier completion inside `_class:`, vocab from the existing
  page handoff.
- Map region completion correctly defaulting to **world** (US only on
  `map us`/`map usa`), so countries + Global South + blocs are reachable on a
  bare `map` slide — verified by a unit test asserting `slideClassAt`/basemap
  selection on `<!-- _class: map -->` vs `<!-- _class: map us -->`.
- Unit tests for each source as a pure function (no DOM).
- `CHANGELOG.md` `## Unreleased`: an `### Added` entry for editor autocomplete
  and a `### Fixed` entry for the map default-basemap gate (it's a user-visible
  behavior change in a shipped surface).
- A short note in the Drawing Board docs / `AGENTS.md` if the feature is
  author-facing enough to warrant it.

*No render-path changes, no new build steps, no new browser fetches — this is an
editor-tooling layer over vocabulary the page already carries.*
