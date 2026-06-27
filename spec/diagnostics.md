# LFM Diagnostic Protocol 1.0

**Status:** Draft · **Version:** 1.0 · **Date:** 2026-06-13
**Companion to:** [`LFM-1.0.md`](./LFM-1.0.md) (conformance level **L2**)

A conformant LFM document is always valid Markdown (§ LFM L0), so LFM
diagnostics are never *parse errors*. They are **authoring findings**:
constructs that are valid Markdown but, on *this Lattice layout*, will not
render the way the author intends. This document specifies the stable shape of a
finding, the frozen rule registry, severities, and the contract for
machine-applicable fixes.

This is the surface a tooling vendor implements to give LFM authors inline
findings and quick-fixes — in an editor, a CI check, a PR bot, or a host like
GitHub. This protocol is the foundation of a future LFM Language Server (§6).

The reference implementation is `lib/authoring/lint-core.js` (pure, fs-free,
shared by the CLI `tools/lint-deck.js`, the engine's `validate()`, and the
Drawing Board browser panel). This document *publishes* that implementation's
contract; the contract, not the implementation, is the standard.

---

## 1. The finding shape

A diagnostic is a JSON object:

```jsonc
{
  "slide": 3,                       // 1-based slide number; 0 = deck-wide (front matter)
  "rule": "card-style-inline-title",// stable rule ID from the registry (§3)
  "severity": "error",              // "error" | "warning" (§2)
  "classToken": "cards-grid",       // the component/modifier token the finding is about
  "line": "- **Title.** body",      // the offending source line (trimmed), or the directive
  "message": "inline \"- **Title.** body\" on a card-style slide — the body inherits the parent li bold",
  "fix": "Use the nested-list shape:\n    - Title\n      - body text",
  "autofixable": true               // optional; present and true when an automatic fix exists (§4)
}
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `slide` | integer | yes | 1-based slide number, matching the preview's "Slide N" and edit markers. `0` for a deck-wide finding sourced from front matter. |
| `rule` | string | yes | A stable ID from the registry (§3). Tools key suppression and docs links off this. |
| `severity` | string | yes | `error` or `warning` (§2). |
| `classToken` | string | yes | The `_class` component or modifier token, or front-matter value, the finding concerns. |
| `line` | string | yes | The offending source line (trimmed) or the `_class`/front-matter directive line, for locating and display. |
| `message` | string | yes | Human-readable explanation of *what* and *why it matters*. |
| `fix` | string | yes | Author-facing guidance — the canonical correct shape. |
| `autofixable` | boolean | no | `true` when a deterministic automatic fix exists (§4). Absent means no automatic fix; apply `fix` by hand. |

> **Location note (v1):** v1 locates a finding by `slide` + `line` (the text of
> the offending line, scoped to the slide). A future minor version MAY add a
> precise `range` (`{ start, end }` line/column) for editors that want
> character-level squiggles; tools MUST treat an absent `range` as "highlight
> the matching `line` within `slide`."

## 2. Severities

- **`error`** — the slide will render visibly wrong (a slot inherits the wrong
  weight, a grid row splits, a required slot renders empty). Authors SHOULD
  resolve every error before publishing.
- **`warning`** — the slide will render, but likely not as intended; for
  example, a typo silently selected a fallback (unknown class, unknown finish,
  unresolved map region). Warnings are surfaced but do not block rendering.

There is no `info`/`hint` tier in v1; a future minor version MAY add one.

## 3. The frozen rule registry (v1)

These rule IDs are **frozen** for LFM 1.x: a tool may rely on them, and they
will not be renamed or repurposed within the major version. New rules are added
in minor versions; a rule is never silently removed (it may be deprecated).

The published namespace convention going forward is `lfm/<rule>`; the bare IDs
below are the canonical v1 identifiers the reference implementation emits, and
`lfm/<rule>` is the equivalent qualified form a host MAY present.

| Rule ID | Severity | Autofix | What it catches |
|---|---|---|---|
| `unknown-class` | warning | — | A `_class` token that is not a known component or modifier. |
| `card-style-inline-title` | error | ✓ | `- **Title.** body` on a card-style layout — the body inherits the parent `li` bold. Fix: nested `- Title` / `  - body`. |
| `ledger-inline-title` | error | ✓ | The unordered inline-bold shape on a ledger/numbered layout — autofixes to the ordered `1. Name` / `   - body` shape the layout wants. |
| `statement-ol-bold` | error | — | A `**bold**` span inside an ordered-list statement, which splits the counter-grid row (e.g. `principles`). |
| `split-bodyless-item` | error | ✓ | A right-panel item with no nested body on a split layout — the title won't lift to bold. |
| `split-missing-headline` | warning | — | An h2-anchored split slide (`split-panel`/`split-compare`) with no `## ` headline — the left panel renders empty. |
| `split-statement-missing-quote` | warning | — | A `split-panel pullquote` with no `> ` blockquote — the pull-quote (the variant's point) renders empty. |
| `split-compare-option-count` | warning | — | `split-compare` without exactly two top-level options — the layout assumes a two-up and highlights the 2nd as preferred. |
| `number-slot-bodyless-item` | warning | — | A `kpi`/`stats` number item with no nested label — the number won't render in display type. |
| `unknown-map-region` | warning | — | A `map` list item whose lead name the basemap can't resolve. Carries a did-you-mean against the basemap vocabulary. |
| `unknown-finish` | warning | — | A front-matter `finish:` value that isn't a known register — the deck would silently render the boardroom baseline. |

> **Autofix is per-finding, not per-rule.** The ✓ marks rules that *can* offer a
> deterministic autofix; whether a given finding carries one depends on its
> source line. `card-style-inline-title`, `ledger-inline-title`, and
> `split-bodyless-item` autofix the bold inline shape (`- **Title.** body`); the
> gantt span rule `gantt-retired-delimiter` autofixes the retired delimiter to
> `..`. A bare-title or otherwise ambiguous finding emits `autofixable: false`
> and relies on the `fix` guidance (§4).

The machine-readable companion to this table is the per-component grammar in
[`dist/docs/grammar.json`](../dist/docs/grammar.json), which records, per
component, the slot/shape contract these rules enforce.

## 4. Machine-applicable fixes

When `autofixable` is `true`, exactly one correct rewrite exists, so a tool MAY
apply it without prompting the author. The reference implementation exposes:

- `autofixNestedTitle(line)` — converts the **unordered** inline shape
  `- **Title.** body` → `- Title` / `  - body` (card-style and split rules). It
  returns `null` for shapes that are not uniquely fixable (a bare title, an
  ambiguous non-bold split), which emit `autofixable: false`.
- `autofixOrderedNestedTitle(line)` — the ledger variant: `- **Title.** body` →
  `1. Title` / `   - body` (Markdown auto-numbers, so the literal `1.` is fine).
- `autofixGanttDelimiter(line)` — swaps a retired gantt span delimiter
  (`→` / `–` / `—` / `->`) for `..`, only inside the line's inline-code spans.
- `applyFix(source, finding)` — applies an autofixable finding to the document,
  scoped to the finding's slide so an identical line elsewhere is untouched. The
  rewrite is computed from the located source line, so its indentation is kept.
- `applyAllFixes(source, vocab)` — applies every autofixable finding in one pass
  loop (re-linting between fixes, since each shifts line numbers), returning the
  fully-fixed source. Backs the Drawing Board's "Fix all" and an editor command.

A conformant L2 tool MAY implement its own fixer; it MUST NOT mark a finding
`autofixable` unless the rewrite is deterministic and unique.

## 5. Producing diagnostics

The reference engine is `lintTextWith(source, vocab)` in `lint-core.js`:

- **Pure** — no `fs`, no network, no model call. Every finding (including
  did-you-mean) is computed deterministically. This is deliberate: diagnostics
  must be reproducible and runnable in a browser, a CI gate, and an editor
  alike.
- **Vocabulary-injected** — the set of valid names/modifiers/map-regions/finish
  names is passed in, built from the component manifests
  (`lib/authoring/lint.js` on Node; a build-time precomputed vocab in the
  browser). The same manifests generate `grammar.json`, so diagnostics and the
  published grammar can never disagree.

## 6. Non-goals / future work

- **A Language Server.** This protocol is its foundation — a server wraps
  `lintTextWith` + `applyFix` behind LSP `textDocument/publishDiagnostics` and
  `textDocument/codeAction`. Not built here.
- **Character-precise `range`s.** v1 locates by slide + line; ranges are a
  forward-compatible addition (§1).
- **Cross-document / deck-level findings** beyond front matter (e.g. duplicate
  slide IDs, asset existence). Out of scope for 1.0.
