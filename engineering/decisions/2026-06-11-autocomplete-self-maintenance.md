# Self-maintaining autocomplete + an IDE-agnostic capability surface (2026-06-11)

> Status: **design + implementation.** This doc fixes the model; the three
> moves below land with it. Driven by two questions: how do we guarantee future
> layouts/variants/modifiers are assessed for autocomplete *at creation*, and
> should completion capabilities be documented in the manifest and be
> IDE-agnostic?

## The reality we start from

Most completion is already self-maintaining because **the manifest is the
co-located source** and the catalog is generated from it at build time. Create a
component and these flow into completion for free:

| Automatic (manifest-derived) | Source |
| --- | --- |
| Component names | manifest `name` → `buildVocab().names` / catalog |
| Variants | manifest `variants[]` → `effectiveVariants` / catalog |
| Slot skeleton, grammar-variant skeletons | manifest `skeleton` / `variantDocs` |
| Family-modifier scoping (per component) | `familyModifiersFor(m)` |
| Map regions | basemap JSON |

The drift risk is **not** in the per-component layer. It is in the central
lists where "create the thing" and "make it completable" are separate acts of
memory, with **no gate** asserting the two agree:

| Drifts if forgotten | Lives in | Failure mode |
| --- | --- | --- |
| Family-modifier **membership** (`checks-*` applies to *which* layouts) | central `FAMILY_MODIFIERS.components[]` | new state-bearing layout silently gets no `checks-*` completion |
| Data-source registration | hand-edited `data-sources.js` | new map-like component offers no body completion |
| Universals / base modifiers | central constants | lint accepts a token completion never offers |

## The other tier — static editor-grammar tokens (deliberately NOT manifest-driven)

The tables above are the *catalog* vocabulary (components, modifiers, themes,
finishes, regions). A second, smaller tier is **intrinsic to the deck grammar
itself**, not to any component, and lives as closed constants in
`docs/src/playground/grammar-vocab.js`:

| Static token set | What it completes |
| --- | --- |
| `DIRECTIVE_NAMES` | the slide directives `<!-- _class\|_paginate\|_header\|… -->` |
| `PAGINATE_VALUES`, `ISLANDS_VALUES`, `SPLIT_VALUES` | the enum values of those front-matter / directive keys |
| `FENCE_LANGS` | fence info-strings worth suggesting (a practical set, not a strict mirror of the highlighter's eager langs) |
| `MERMAID_KEYWORDS` | the in-`mermaid`-fence keyword grammar |

These can't come from manifests — they're Marp/Lattice grammar, not catalog
entries — so they're hand-maintained. Where an engine constant is the real
source, the file is kept in lockstep *by comment + a shared import*, not by a
gate: `ISLANDS_VALUES` mirrors `ISLANDS_MODES` in `plugins.js`, `SPLIT_VALUES`
mirrors `resolve-split.js`'s `SPLIT_NAMES`, and `MERMAID_KEYWORDS` is the single
source of truth shared with the editor's syntax highlighter (`editor.js` builds
its `KW_DECLARE`/`KW_FLOW` regexes from it). To add a new directive or enum
value, edit `grammar-vocab.js`; to add a component/variant/modifier, edit the
manifest (it flows through `buildVocab` for free).

## The trigger is separate from the vocabulary

Proactive "type-ahead" (open the popup on *entering* a context, 2026-06-16) adds
**no** vocabulary. `typeaheadContext` in `slide-context.js` is pure
classification — it decides *when* to open, reusing the same detectors; the
*what* is entirely the catalog + grammar-vocab sources above. The trigger layer
and the vocabulary layer are orthogonal: a new completable token is surfaced by
adding it to its source (manifest or `grammar-vocab.js`), and it becomes
proactive only if its context kind is in the editor's `TYPEAHEAD_KINDS` gate.

## The principle

A token is autocompletable iff it has a **closed vocabulary**, a **deterministic
source**, an **unambiguous trigger**, and — the systemic constraint —
**parity with the linter** (completion never offers what the engine rejects, and
vice versa where it can). The guarantee is not co-location alone; it is a
**gate** that fails CI when the engine and the completion surface disagree.
Co-locate what is component-specific, centralize what is universal, **gate the
boundary**.

## Move 1 — the parity gate (the guarantee)

`test/unit/components/autocomplete-parity.test.js` asserts, from the live
manifests:

1. **Completion-offered ⊆ lint-accepted.** Every token completion would suggest
   — each component's `effectiveVariants` ∪ `familyModifiersFor` ∪ the universal
   set — is in `buildVocab().modifiers`. Completion can never surface a token the
   linter then flags (the "what it offers is what the engine accepts" contract,
   now enforced).
2. **No orphan family tokens.** Every `FAMILY_MODIFIER_TOKENS` entry is offered
   on at least one component, so a family token can't exist accepted-everywhere
   but suggested-nowhere.
3. **Data-source parity.** The set of manifests declaring `dataCompletion`
   equals the set of components the editor registers a body completer for
   (`DATA_SOURCE_COMPONENTS`).

This is the answer to "automatically assessed": not memory, a failing test.

## Move 2 — co-locate the stragglers into the manifest

- **Family membership → manifest `families: ["state-markers", …]`.** A layout
  opts into a family from its own manifest; `familyModifiersFor` honours
  `m.families` (by-name) ∪ the central group `buckets` (genuinely bucket-wide,
  e.g. `canvas` for the whole chart bucket). The by-name `components[]` list is
  retired from `FAMILY_MODIFIERS` — membership now lives next to the component.
  The validator accepts `families` and rejects unknown group names.
- **Data capability → manifest `dataCompletion: true`.** Declares the component
  has a static body-data vocabulary (today: `map`). The editor's registered
  list is the pure, importable `DATA_SOURCE_COMPONENTS`; the parity gate ties the
  manifest flag, the constant, and the registry together so none drifts.

## Move 3 — scaffold at creation

`tools/new-component.js` (`npm run new:component`) templates a new component's
`manifest.json` + `styles.css` in the right bucket-nested folder, with the
autocomplete-relevant fields (`variants`, `families`, `dataCompletion`, `slots`)
present and annotated, so the author is prompted for them at creation rather
than discovering them later. It prints the remaining steps (fill tags +
descriptions; the build gate rejects placeholders). We deliberately do **not**
add a fragile "this looks state-bearing, did you forget `families`?" heuristic —
a false-positive nag is itself a broken window. The scaffold prompt plus the
parity gate are the robust mechanisms.

## IDE-agnostic: yes, with a sharp separation (and a held line)

The LSP insight: a *language's* completion knowledge is editor-agnostic; each
editor only adapts it. Two layers:

1. **Capability data — IDE-agnostic, manifest-documented.** It already is:
   manifests → `dist/docs/components.json`, the machine catalog. Keep the
   completion vocabulary there so any editor (or agent) consumes one shipped
   file. The pure context detectors in `slide-context.js` are already
   CodeMirror-free and portable.
2. **Completion engine — per-editor adapters.** `complete.js` (CodeMirror) is
   one consumer; a VS Code / LSP / Vim adapter would be another.

**Held:** we do **not** build a second editor adapter or an LSP server now —
there is exactly one editor, and the abstraction earns its keep at editor #2, not
before (the same YAGNI line as the document-derived completion frontier). This
doc *is* the contract; the pure core stays portable so editor #2 is cheap.

## Definition of done

- The three moves above, each behind the parity gate and the existing build /
  `check:ownership` / unit + integration gates.
- `families` and `dataCompletion` documented in the manifest field reference
  (`lib/components/index.js` header) and validated.
- CHANGELOG entry for the manifest fields (a shipped surface).
