# LFM — naming and owning Lattice's Markdown dialect

**Date:** 2026-06-13
**Status:** Accepted (posture + first slice). Spec is versioned `LFM 1.0`
(draft) under `spec/`.
**Decision owner:** Sharmarke
**Supersedes nothing.** Formalises what the engine already does.

---

## The question

Should we name Lattice's authoring dialect — call it **LFM**
("Lattice-Flavored Markdown", read straight off *GitHub-Flavored Markdown*) —
and treat it as an owned standard? And underneath the name: do we roll our own
parser and linter, does every component manifest carry a grammar section, what
about chart semantics, how does this power error identification and correction,
and do we build on something or roll our own?

The ambition is reach: name and own the standard, and eventually get LFM
rendered *inside* GitHub, GitLab, Bitbucket, and Confluence the way Mermaid is.

## What we already have (the raw material)

Auditing the engine shows that **most of this already exists in pieces.** The
decision is whether to *name and formalise* it, not whether to build it.

- **Extensions over CommonMark, not a new language.** Every Lattice construct
  rides `markdown-it` / Marpit. There is **no custom parser**:
  - `<!-- _class: X -->` — an HTML comment; valid everywhere, invisible in a
    vanilla viewer (Marpit directive).
  - YAML front-matter keys (`finish:`, `logo:`, `paginate:`, …).
  - The nested-list **card grammar** (`- Title` / `  - body`).
  - The **state-marker** grammar `[x] / [-] / [ ] / [/]` shared across
    `checklist`, `verdict-grid`, `obligation-matrix`, `roadmap`, `pricing`.
  - ` ```functionplot ` fenced blocks (then named ` ```latticeplot `; see the
    rename below) carrying a base64-JSON function-plot config.
- **A real linter already** — `lib/authoring/lint-core.js`: pure, fs-free,
  shared three ways (CLI, `validate()`, the Drawing Board browser panel), with
  **did-you-mean** (`nearestRegion`, bounded Levenshtein) and **autofix**
  (`autofixNestedTitle`). That is most of an LSP diagnostic engine already.
- **Per-component grammar, informally** — every manifest carries `slots`
  (CSS selector + `required` + description), `skeleton`, and `sample`. That
  *is* a grammar; it was simply never labelled or exported as one.
- **The Mermaid pattern, already** — the `functionplot` fence (then
  `latticeplot`) is a fenced DSL that degrades to a code block, the same
  structure that earned Mermaid its embedding in GitHub.

So we are not starting a standard. We are **promoting an undocumented one to a
named, versioned, conformant spec.**

## The decision that governs all the others: profile, not language

**Owning a parser is the opposite of getting embedded.** GitHub, GitLab,
Bitbucket, and Confluence will not adopt a bespoke parser or a language that
breaks in their existing CommonMark/GFM renderer. What those platforms embed are
graceful supersets and fenced DSLs that degrade cleanly: GFM extends CommonMark;
Mermaid is a code block that upgrades to a diagram. Both succeeded because
adopting them carries no risk to an existing renderer.

**Decision:** LFM is a **profile of Markdown**, defined as

> `LFM = CommonMark + GFM task lists + {the Lattice extension set}`

versioned (`LFM 1.0`). **The spec is what we own; parsers are interchangeable
implementations.** We should publish it under a permissive license (CC-BY-4.0)
and actively encourage a second conformant implementation (a `remark` plugin),
so LFM is provably a spec and not a single product. (Posture confirmed with the
owner on 2026-06-13: "Markdown profile", rejecting "Proprietary superset".)

### Consequences

1. **Graceful degradation is the governing rule.** Every extension must render
   as *readable* Markdown in a vanilla viewer. This is the exact criterion a
   GitHub/GitLab/Confluence PM will judge adoption on. `spec/LFM-1.0.md` carries
   a degradation table; every future extension must add a row before it ships.
2. **No custom parser — ever, for the standard.** The owned `lattice-engine`
   stays an *implementation*. New authoring transforms still land in all three
   render paths (HARD RULE #1); LFM just gives that contract a public name.
3. **The one degradation gap today is `[-]` / `[/]`.** `[x]` and `[ ]` are GFM
   task-list syntax (real checkboxes in a vanilla viewer); `[-]` and `[/]`
   render as literal text. They are too useful to drop, so LFM 1.0 **documents
   the degradation** rather than changing the glyphs — but it is called out
   explicitly in the conformance section as the known non-GFM-clean construct.

## Sub-decisions

### Parser & linter — build on, don't roll

Build on `markdown-it` / Marpit (and keep the door open for a `remark`
implementation). The linter already exists and already shares one core three
ways; we keep that and **publish its contract** (see the diagnostic protocol)
rather than rewrite it. Lint rules stay single-source in
`lib/authoring/lint-core.js` (HARD RULE #7).

### Grammar per manifest — yes, but generated, single-source

Do **not** hand-write EBNF 60 times and do not fork the lint vocabulary. The
manifests already encode each component's grammar in `slots` + `skeleton`. We
**generate** `grammar.json` from those manifests rather than maintaining a
separate hand-written field:

- `tools/build-docs-portal.js` (which already loads every manifest and emits
  `dist/docs/components.json`) gains a third output, `dist/docs/grammar.json`.
- One source (the manifests) → three projections: the **catalog**
  (`components.json`), the **grammar** (`grammar.json`), and the **linter
  vocab** (`lib/authoring/lint.js`, built from the same manifests).
- The freshness gate, ownership guard, and `dist/README.md` index extend
  automatically — no new build step, no new hand-maintained file.

This keeps the grammar honest by construction: it stays in lockstep with what
the engine actually accepts, because it is generated from the same fields the
engine reads.

### Chart / diagram semantics — the Mermaid model we already built

Each fenced DSL is its own sub-spec: own grammar, own diagnostics, degrades to
a code block. The fence is **named after the library that renders it**, not
Lattice-branded: `functionplot` ([function-plot](https://mauriciopoppe.github.io/function-plot/),
used today by the `math canvas` layout to draw a curve beside an equation) and
`mermaid` (the `diagram` component) — the same way the equation half of `math`
uses standard `$$…$$` for KaTeX. This is **distinct** from the `chart` bucket
(bar/line/donut/radar/map), which renders through the owned chart-family
registry, not a fence. We do **not** fold a fence's config into the prose
grammar — it stays a fenced sub-language whose body is the renderer library's
own config language. `grammar.json` records each fence's info string, the
library and component that own it, deprecated aliases, and its degraded form;
the detailed config schema stays owned by that library and is referenced, not
inlined.

### The `latticeplot` → `functionplot` rename (honesty audit)

The fence shipped originally as `latticeplot`. Reviewing it for this spec
surfaced the name as a **vanity rebrand**. Lattice does nothing to function-plot
that it does not also do to Mermaid: it renders via the library and themes the
SVG through `var(--token)`. The body authors write is function-plot's config
schema *verbatim*. So the Lattice-branded name implied an engine-agnostic
abstraction that does not exist, and the implied engine-swappability was
illusory — swap the engine and every deck breaks. The consistent move, matching
how we already treat both Mermaid and `$$`/KaTeX, is to name the fence after its
engine. So `latticeplot` → `functionplot`, with `latticeplot` retained as a
**deprecated alias for one release**. A genuinely Lattice-owned, engine-agnostic
plot vocabulary — function-plot as one swappable backend behind a translator —
remains a possible future bet. That would earn back a Lattice-owned name; this
rename does not foreclose it, it just stops claiming it before it exists.

### Error identification & correction — the tooling leverage

Most of this already exists in the linter. We formalise its findings into a
stable **diagnostic protocol** (`spec/diagnostics.md`): frozen rule IDs,
severity, location, message, and machine-applicable `fix`. That is what makes
embedding *valuable* to a tooling vendor — inline findings and quick-fixes in
any editor, not merely prettier slides. The defensibility is
not the rule list itself, which a competitor can read and reimplement; it is
that the rules and the published grammar are generated from the same manifests,
so the two cannot drift. The existing rule IDs (`unknown-class`,
`card-style-inline-title`, …) are frozen as the v1 registry; `lfm/<rule>` is the
published qualified form. A Language Server is the natural next step and is
sketched as non-goal-for-now in the protocol doc.

## The embedding endgame (how we actually "own" it)

The steps that carried GFM, Mermaid, and MDX into the platforms, in dependency
order:

1. A crisp, public, **versioned spec** (`LFM 1.0`).
2. A **conformance test suite** (the degradation table + linter fixtures are
   the seed).
3. A **liberally-licensed reference implementation**, plus a *second* (remark)
   implementation to prove LFM is portable, not a single vendor's feature.
4. **Graceful degradation as a near-absolute rule** — one documented v1
   exception (`[-]`/`[/]`, §5.1) — so adoption stays low-risk.
5. The **diagnostic protocol**, so tooling vendors get leverage.

Steps 1 and 4–5 are largely done; steps 2 and 3 are the unbuilt majority. Host
adoption is a further bet we have not started; it depends on the zero-risk
adoption and demonstrated tooling value that steps 2–5 build, neither of which
is complete yet. None of steps 1–5 require a parser of our own.

## What this change ships

- `spec/LFM-1.0.md` — the LFM 1.0 specification: extension set, conformance
  levels, degradation table, conformance-test shapes, security considerations,
  governance + CC-BY-4.0 license, and a worked end-to-end example.
- `spec/diagnostics.md` — the LFM Diagnostic Protocol (finding shape + frozen
  rule registry).
- `dist/docs/grammar.json` — the generated, machine-readable per-component
  grammar, projected from the manifests by `build-docs-portal.js`.
- This decision note.

## Non-goals (explicitly deferred)

- A `remark` reference implementation (step 3) — sketched, not built here.
- A standalone Language Server — the diagnostic protocol is its foundation;
  the server is future work.
- Changing the `[-]` / `[/]` glyphs — documented, not re-encoded.
- A formal grammar (ABNF/EBNF) for the prose layer beyond the
  selector/skeleton projection — `grammar.json` is structural, not a parser
  grammar, by design (the parser is CommonMark's).
