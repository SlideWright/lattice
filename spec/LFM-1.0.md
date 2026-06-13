# LFM 1.0 — Lattice-Flavored Markdown

**Status:** Draft · **Version:** 1.0 · **Date:** 2026-06-13

LFM (Lattice-Flavored Markdown) is the authoring dialect of the
[Lattice](../README.md) slide engine. Its name follows *GitHub-Flavored
Markdown* deliberately: LFM is **a profile of Markdown, not a new language.**

> **LFM = CommonMark + GFM task lists + the Lattice extension set.**

A document written in LFM is a valid Markdown document. Every LFM extension is
designed so that a renderer with **no knowledge of Lattice** — GitHub, GitLab,
Bitbucket, Confluence, or a plain CommonMark viewer — still renders something
readable. That property, **graceful degradation**, is the constitution of the
standard and the criterion for adopting any future extension (§5).

This document specifies what LFM adds to Markdown, how each addition degrades,
and what makes a document *conformant*. It does not specify a parser: LFM rides
CommonMark, and any conformant CommonMark/GFM parser plus the extension handlers
below is a conformant LFM implementation.

---

## 1. Conformance levels

LFM defines three levels so a tool can advertise precisely what it supports.

| Level | Name | What it means |
|---|---|---|
| **L0** | *Markdown-faithful* | The document is valid CommonMark + GFM. An LFM-unaware renderer produces a readable result. **Every conformant LFM document is L0.** |
| **L1** | *Lattice-structured* | The renderer understands the **slide** and **block** extensions (§2–§3): `_class` directives, front-matter directives, the card grammar, and state markers. It produces Lattice layouts. |
| **L2** | *Lattice-diagnostic* | The tool additionally implements the [Diagnostic Protocol](./diagnostics.md): it validates a document, reports findings with stable rule IDs, and offers machine-applicable fixes. |

A **conformant LFM document** is one that is valid at L0 and, for every Lattice
construct it uses, follows the grammar in §2–§4. A **conformant LFM renderer**
declares the highest level it implements.

## 2. Slide-level extensions

### 2.1 The `_class` directive

A slide selects a Lattice component with a Marpit class directive — an **HTML
comment**, so it is invisible in every Markdown renderer:

```markdown
<!-- _class: split-compare -->
```

The value is a space-separated list of one **component name** plus zero or more
**modifier tokens** (§4). The complete, machine-readable vocabulary of names,
modifiers, slots, and skeletons is published in
[`dist/docs/grammar.json`](../dist/docs/grammar.json), generated from the
component manifests.

- **Degrades to:** nothing visible (HTML comment). **L0-clean.**

### 2.2 Slide separators

Slides are separated by a thematic break on its own line (`---`). This is
CommonMark `<hr>`; an unaware renderer shows horizontal rules between sections.

- **Degrades to:** horizontal rules. **L0-clean.**

### 2.3 Front-matter directives

A leading YAML front-matter block carries deck-wide directives. LFM recognises,
in addition to Marpit's own (`theme`, `paginate`, `_class`, …):

| Key | Value | Effect |
|---|---|---|
| `finish:` | `boardroom` \| `sketch` \| `sketch-clean` | Deck-wide visual register. Unknown values are a diagnostic (§ `unknown-finish`). |
| `logo:` | path | Deck logo injected into the masthead. |

- **Degrades to:** front matter is hidden or shown as a metadata table,
  depending on the host. **L0-clean** (it is YAML front matter, which every
  GFM host already special-cases).

## 3. Block-level extensions

### 3.1 The card grammar (nested-list slots)

Card-style and ledger layouts read a **title + body** from a nested list. The
canonical shape is:

```markdown
- Title
  - body text
```

The inline form `- **Title.** body` is **not** valid LFM on a card-style
layout: the body inherits the title's weight. This is enforced as a diagnostic
(`card-style-inline-title`, with an autofix). Ledger/numbered layouts use the
ordered form:

```markdown
1. Name
   - body text
```

- **Degrades to:** a nested bullet list — exactly what it reads as. **L0-clean.**

### 3.2 State markers

A single-character marker at the start of a list item encodes a status. The
grammar is **shared** across `checklist`, `verdict-grid`, `obligation-matrix`,
`roadmap`, and `pricing`:

| Marker | Semantic | Notes |
|---|---|---|
| `[x]` | pass / done / met | GFM task-list syntax. |
| `[ ]` | neutral *or* not-met | Context-dependent: *todo/planned/exempt* in checklist/roadmap/obligation-matrix; *not-met* in verdict-grid. GFM task-list syntax. |
| `[-]` | partial / warn | **Not GFM syntax** (see §5.1). |
| `[/]` | skip / out-of-scope | **Not GFM syntax** (see §5.1). |

- **`[x]` / `[ ]` degrade to:** real checkboxes in any GFM host. **L0-clean.**
- **`[-]` / `[/]` degrade to:** literal text (`[-] …`). Readable but not a
  checkbox — the one documented non-GFM-clean construct in LFM 1.0 (§5.1).

### 3.3 Fenced sub-languages (charts & diagrams)

A fenced code block with a recognised info string is a **sub-language**. Each
is its own mini-spec; LFM only requires that it degrades to a code block.

| Info string | Sub-language | Degrades to |
|---|---|---|
| `latticeplot` | Lattice chart config (JSON/YAML body) | A code block showing the config. **L0-clean.** |
| `mermaid` | Mermaid (passthrough) | A code block. **L0-clean** (and Mermaid-aware hosts render the diagram). |

The chart-config grammar is owned by the Lattice chart family and referenced
from [`dist/docs/grammar.json`](../dist/docs/grammar.json), not inlined here —
keeping the prose spec stable as chart options evolve.

### 3.4 Other inline conventions

- **Eyebrow / subtitle / hero number** and similar slot conventions are
  ordinary Markdown (a leading inline-code span, an `<em>`-wrapped unit, an
  `<h2>` lifted into a panel). They are structural reads over standard Markdown,
  documented per component in `grammar.json`, and are **L0-clean** by
  construction.

## 4. The component & modifier vocabulary

`_class` tokens are one **component name** plus modifier tokens. The full list
is generated, not enumerated here, so it cannot drift:

- **Component names** — `dist/docs/components.json` (`vocabularies.buckets` and
  the per-component entries) and the human catalog `dist/docs/components.md`.
- **Per-component grammar** — `dist/docs/grammar.json`: for each component, its
  `_class` token, its required and optional **slots** (CSS selector +
  description), its **skeleton**, and the **fences/state-markers** it reads.
- **Modifiers** — recognised by set membership or by these prefix families:
  `tint-`, `mark-`, `with-`, `at-`, `no-`, `tone-`, `treatment-`, `checks-`,
  plus the universal/semi-universal variant sets. See
  [`design/design-system.md`](../design/design-system.md) §6.5.

An unrecognised token is a diagnostic (`unknown-class`) with a did-you-mean
suggestion, never a hard parse error — an LFM document with a typo is still a
valid Markdown document.

## 5. Graceful degradation — the constitution

**Every LFM extension MUST render as readable Markdown in an LFM-unaware
renderer.** This is not a nicety; it is the property that makes LFM safe for a
host like GitHub to render and safe for an author to write without lock-in.

**Rule for future extensions:** no construct may be added to LFM without a row
in the degradation table (§2–§3) stating exactly what an unaware renderer
shows. If a construct cannot degrade readably, it is rejected or redesigned.

### 5.1 Known non-GFM-clean constructs

LFM 1.0 has exactly one: the **`[-]` and `[/]` state markers** (§3.2). GFM
task-list syntax covers only `[x]` and `[ ]`, so `[-]`/`[/]` render as literal
text in a vanilla GFM host. They are retained because the four-state grammar is
load-bearing across five components and the literal-text fallback is readable.
A future LFM version MAY introduce GFM-clean aliases; until then this is
documented, intended behaviour, not a bug.

## 6. Relationship to other standards

- **CommonMark** — LFM is a strict superset. Every CommonMark document is a
  valid (if Lattice-inert) LFM document.
- **GFM** — LFM adopts GFM task lists and tables. The only divergence is §5.1.
- **Marpit / Marp** — LFM's slide model (`_class`, `---` separators, front
  matter) is Marpit-compatible; Lattice is a Marp-based engine. LFM names and
  constrains the subset that produces boardroom layouts.
- **Mermaid** — embedded as a fenced sub-language (§3.3), unchanged.

## 7. Versioning

LFM follows SemVer at the *standard* level, tracking the engine's stability
contract (layouts and tokens are stable surfaces — see `CHANGELOG.md`):

- **Major** — removing or breaking an extension, or breaking degradation.
- **Minor** — adding an extension (with its degradation row) or a component.
- **Patch** — clarifications and editorial fixes.

The machine-readable surface (`grammar.json`, `components.json`) is regenerated
from the manifests on every build, so it always matches the engine that ships
alongside this document.

---

*This spec is generated-adjacent: the vocabulary and per-component grammar it
points to (`dist/docs/grammar.json`, `dist/docs/components.json`) are built
from the component manifests by `tools/build-docs-portal.js`. The prose here is
the stable contract; the machine artifacts are the always-current detail.*
