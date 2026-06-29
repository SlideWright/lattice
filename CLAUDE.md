# Lattice — agent orientation

Lattice is a Marp-based slide-deck engine that renders boardroom-quality
PDFs from Markdown. It is the engine layer of the **SlideWright** org; a
Tauri desktop wrapper (also SlideWright) embeds the same engine.

**The visual contract is `lattice.css`.** Layouts are palette-blind: every
colour goes through `var(--token)`. Themes (`themes/indaco.css`,
`themes/cuoio.css`, …) supply the tokens.

This file is an **index, not a manual**: it orients you and points to the
canonical doc for each topic. Each rule is one line + a pointer; the rationale
lives in the pointed-to doc. **Read that doc before non-trivial work in its
area — don't work from memory of it.**

---

## DEFAULT OPERATING MODE — act without being asked

The standing expectation is an agent that drives routine work to completion on
its own. Don't stop to ask permission for the steps below; stop only when a
decision is genuinely mine (irreversible, ambiguous *direction*, an
architectural fork) — and **bundle those into one `AskUserQuestion` round.**

Standing triggers — act on the precondition; don't surface a settled step as a
choice:

| When… | Do, automatically |
|---|---|
| a branch's meaty work is complete, verified, pushed (a design/decision doc counts — the doc *is* the deliverable) | **open the PR** via the template (rule 6) |
| a PR is open | **subscribe + drive CI green**; rebase before each push (rule 7) |
| the PR is green and rebased | **ask to merge** — the *one* user gate in this flow |
| merge confirmed + local `main` synced | **post the standup** (`workflow.md` §Post-merge standup) |

**Decision filter** — before any `AskUserQuestion` or "want me to…?", ask *"is
the next step already dictated by CLAUDE.md / workflow.md?"* If yes, **do it.**
Reserve questions for genuine forks.

1. **Finish the loop.** Done = implemented, verified, documented, shipped — not
   "it compiles." Don't hand back at first green waiting for "now lint / test / push."
2. **Don't settle.** "Builds + tests pass" is the floor. Self-critique and raise
   the result before returning it. Visual work meets the Quality Bar below.
3. **Prefer the cheapest path that meets the bar.** Reach for a reversible
   default over a question; **batch decisions into one round and never re-ask a
   settled point.** Spawn sub-agents only when a second independent pass changes
   the outcome (see Maker–checker) — not by reflex. My GitHub + Claude spend is a
   real constraint: where two routes meet the bar, take the cheaper one.
4. **Stay *mergeable* — rebase right before you push.** Before every push (and
   before calling anything done), `git fetch origin main` and rebase if behind or
   conflicted. This is HARD RULE #16: fold it into the push, do **not** run a
   background drift watch. (A Stop hook nudges you if you forget.)
5. **Run the gates yourself, proactively** — `npm run lint`, the unit suite,
   `npm run build:check`, the integration tier — *before* declaring done. Hooks
   enforce these at commit/push as a backstop, not a substitute.
6. **Keep docs + changelog in sync in the SAME change.** Any behavior change
   updates the matching `engineering/`/`design/` doc AND `CHANGELOG.md`
   `## Unreleased`. Never return a behavior change with stale docs.
7. **Open the PR when review-ready, then drive it green — then ASK to merge.**
   Use `.github/pull_request_template.md`. Never a draft PR up front (it spams
   CI). Once open, subscribe and drive CI green / address review — never ask
   "should I watch?". When green + review-ready, **stop and ask me for merge
   authorization** — a human approves every merge, and prior authorization does
   **not** carry forward. On my go-ahead, **squash-merge** by default. Full
   procedure: `workflow.md` §Merging.

Rules 6–7 deliberately override the harness defaults (which hold off on PR
creation and ask before watching). `doneMeansMerged` in `.claude/settings.json`
reinforces this: keep working to a merge-ready state (it does **not** mean
merge-it-yourself).

### OPERATING ETHOS — the dispositions behind the rules

These are not gated and not numbered; they *shape judgment* where no rule
dictates. They never override the HARD RULES or the human gates — when a
disposition and a gate collide, the gate wins.

- **Investigate to root; don't settle, don't give up.** "Blocked" and "done" are
  both claims that need evidence. Before declaring either, exhaust the cheap
  diagnostics — read the source, reproduce, bisect, check the canonical doc.
  Surface a blocker only with the investigation that earned it. (Sharpens
  DEFAULT OP MODE #1–2.)
- **Power through; momentum is the default.** On reversible, in-scope work, keep
  going — through lint, tests, the rebase, the next slice — without stopping to
  ask "now what?". *Working through the night does NOT mean skipping the gates:*
  merge authorization (#7), export sign-off (Quality Bar), and any irreversible
  or ambiguous-*direction* call remain **hard stops** — prior authorization never
  carries forward. Drive everything *up to* the gate, then stop cleanly.
- **Stack wins — bank completed work.** Sequence so each finished slice compounds
  and stands on its own (commit it, push it, leave nothing half-applied). Don't
  open a second front while the first is a broken window (see #18); land, then
  advance.
- **Prioritize by downstream impact.** Order work by what it unblocks next, not by
  what's nearest. When choosing what to do first, pick the slice that most de-risks
  or feeds the work to come; say in one line why, then proceed.
- **Use best judgment, and own it.** Where no rule or gate applies, decide and
  move — a reversible default beats a question (DEFAULT OP MODE #3). Judgment is
  the expectation, not an escape hatch from the rules; it operates in the space
  the rules leave open.
- **Write so I understand the first time.** Default to plain words; spend a term
  of art only when it earns its place, and define it on first use. The moment I
  say I'm lost, *stop* — don't restate the same explanation louder. Re-explain
  from the start in plain language, lead with a concrete example, and name the
  thing in the codebase it maps to. Jargon I have to decode is a defect in the
  writing, not in me.

---

## QUALITY BAR — 10/10 boardroom, or it isn't done

For anything a human sees — themes, `lattice.css`, layouts, the docs site,
UI/UX — **"it renders" is the floor.** The target is the boardroom 10/10 rubric
(`engineering/decisions/2026-06-06-layout-audit/`). Before handing visual work
back: rebuild and **actually look at it** (`SendUserFile` /
`tools/rasterize-for-review.sh` for PDFs; build the docs site +
`tools/screenshot.js` for web), run `tools/pixel-check.js`, and fix what's short
of excellent without being told. For a *large* sweep (whole gallery, a theme
across all components, a responsive pass over many pages), **fan out parallel
reviewer agents**, each viewing *whole* slides — see `engineering/visual-review.md`.
If a tool genuinely can't run here, **say so**; never claim quality you didn't verify.

**Website / responsive UI** ships to desktop (~1440px), tablet (~820px), and
mobile (~390px) — all first-class. Keep one visual language across them; favour
icon-only controls where space is tight; no layout jank. **No website change is
done without `tools/screenshot.js` evidence at all three widths.** Details:
`engineering/development.md`.

**Export changes are the one exception to "act without being asked" — STOP and
show me.** A change that alters the *bytes of an exported artifact* (the PDF /
PPTX / HTML export pipeline, font embedding) requires my inspection: render a
representative demo deck in **both dark and light mode** and send the artifacts
for sign-off. (Ordinary CSS/layout work that merely *looks* different is **not**
in scope — that goes through the normal visual-review path above.)

---

## MAKER-CHECKER — verify high-blast-radius work with parallel agents

Separate *making* from *checking* for changes with real blast radius —
infra/hooks/CI, engine transforms (`lib/core`, `lib/engine`, a shared kernel),
or a multi-file refactor. After you (the maker) finish, spawn an independent
checker agent that bug-hunts the diff (correctness, edge cases, footguns) and
judges fit/risk; fold findings back, *then* commit. **One checker by default;
two (split inspection vs. assessment) only for the riskiest changes.** Skip it
for trivial or low-risk edits — this earns its latency *and cost* only when a
second set of eyes changes the merge decision. See `engineering/visual-review.md`.

---

## HARD RULES (these override convenience; a violation is a defect)

**The rule NUMBERS are stable identifiers** — referenced across code, tests, and
decision docs. Never renumber them; a rule is retired in place, never reused.
The list splits into **invariants** (architectural / merge-gating) and
**conventions** (style rules enforced by lint or tests, kept here as numbered
anchors). Both are binding; the split tells you *where the enforcement lives*.

**Invariants** (numbers are literal IDs — `-` bullets, so renderers can't renumber):

- **#1 — Render paths share one source of truth.** Land transforms in the shared
  kernel (`lib/integrations/markdown-it/plugins.js`, `lib/transformers/*`,
  `lib/core/*`), not one path. The owned `lib/engine` is canonical; Marp is
  retired as a render path (the one Marp surface left is export-to-Marp,
  `lib/core/marp-bundle.js`). See `engineering/architecture.md`.
- **#2 — Never hand-edit `dist/`** — it's generated; regenerate with `npm run build`.
- **#3 — No hex literals in layout CSS — always `var(--token)`.** *(gated —
  `checkHexLiterals` in `tools/check-ownership.js`, via `build:check`; budget 0 + a small
  `SANCTIONED_HEX` allowlist for fixed non-themeable colours. `*.tokens.css` + `var(--t,#fallback)`
  defaults exempt.)*
- **#6 — Before authoring any `<!-- _class: X -->` slide**, in the SAME turn open
  `lib/components/<bucket>/X/X.docs.md` AND grep
  `test/integration/baseline-decks/gallery.md` for a live example (base
  modifiers → `lib/base/base.docs.md`).
- **#7 — Edit lint rules in `lib/authoring/lint-core.js` only** — pure, fs-free,
  shared by CLI / `validate()` / browser. Never duplicate.
- **#8 — Isolate feature/fix content from the six long-running galleries** —
  layouts graduate in a separate post-review commit. See `engineering/workflow.md`.
- **#9 — Ship a per-feature demo deck** `examples/<slug>.md` (+ committed `.pdf`),
  6–10 slides. Contract in `engineering/workflow.md`.
- **#10 — Record every user-visible change in `CHANGELOG.md` `## Unreleased`** as
  it lands; lead with `**Breaking:**` for anything that breaks a deck/consumer.
- **#13 — Commit messages are `area(scope): short summary`**; PRs follow
  `.github/pull_request_template.md`, and the issue(s) they close must read true
  before merge. See `engineering/workflow.md` § Merging.
- **#14 — A hook failure is a root cause to fix, never a `--no-verify` to skip.**
- **#15 — Don't reinvent — reuse, for tooling AND UI.** Tooling: consult
  `engineering/capabilities.md` before building any script/harness (the
  `capabilities:check` gate enforces it). Docs-site UI: extend the shadcn
  primitives in `docs/src/components/ui/` and the shared chrome
  (`PaletteControls`, `site-chrome.ts`) — don't fork a widget per surface.
- **#16 — Keep an open PR mergeable by rebasing right before you push — NOT with a
  background watch.** GitHub never delivers "`main` moved / now conflicted / CI
  passed", and a polling auto-rebase thrashes the merge train and floods chat
  (`engineering/decisions/2026-06-14-drift-watch-rebase-thrash.md`,
  `2026-06-15-retire-drift-watch.md`). Fold the check into the push:
  `git fetch origin main`, rebase if behind/conflicted, push. *Once the merge
  queue is enabled (`workflow.md` §Merging), the queue performs the final
  pre-merge rebase + retest — until then, re-check manually before an authorized
  merge.* Resolve recurring `CHANGELOG`/`dist` conflicts mechanically and
  `--force-with-lease` silently. Never let an open PR **merge** conflicted,
  stale, or CI-red.
- **#17 — One feature = one branch → one PR; never a stacked PR chain.** Increment
  in place (many commits, one PR). A slice that builds/tests with only `main` is
  independent → its own branch; one that needs another open PR's branch is not.
  See `engineering/decisions/2026-06-17-stacked-pr-fragmentation.md`.

**Conventions** (binding; the tag says where enforcement lives — *gated* = a
lint/test catches a violation, *discipline* = no automated gate, so it's on you):

- **#4 — Typography is the 12-token `--fs-*` system**; tokens are named for their
  ROLE, never a colour scheme. *(gated — `checkTypographyTokens` in
  `tools/check-ownership.js`, via `build:check`; `engineering/typography.md`.)*
- **#5 — Card-style layouts use nested `- Title` / `  - body`**, never inline
  `- **Title.** body`. *(gated — `deck-authoring.test.js`; see `AGENTS.md`.)*
- **#11 — Universal role-based token names are canonical**; legacy per-theme names
  are retired. *(gated — `checkRetiredTokenNames` in `tools/check-ownership.js`,
  via `build:check`; `lib/tokens/crosswalk.js`, `lib/base/base.docs.md`.)*
- **#12 — Avoid `:not(:has(…))` / `:is(:has(…))` in theme CSS** — silently broken
  in the Marp-preview Chromium. *(gated for `themes/` — `checkThemeHasSelectors` in
  `tools/check-ownership.js`, via `build:check`; `engineering/gotchas.md`.)*
- **#18 — No broken windows: leave the tree no worse than you found it.** A defect
  you *create or touch* gets fixed before the work is done — never committed
  knowingly broken, never "TODO later". For a pre-existing defect you find: if
  it's **on the path** of the current change, fix it in place; if it's **off the
  path**, log it (a tracked issue / decision-doc note) rather than either ignoring
  it OR pulling it into the diff — that boundary keeps #8 (gallery isolation) and
  #17 (one feature, one PR) intact. *(discipline — no automated gate; the test is
  whether you can point at a known defect you walked past and left unrecorded.)*
- **#19 — A performance change ships with evidence, not a claim.** Any change that
  sets out to make the engine faster/lighter carries: (a) **before/after numbers**
  in the PR's `## Performance` section, captured same-machine via `npm run bench`;
  (b) the **committed baseline ratcheted** — `npm run bench:bless` so
  `test/benchmark/baseline.json`'s diff *is* the durable before→after record, and
  `npm run bench:check` stays within the variance band (re-bless only with the PR
  justifying it); (c) a **bench scenario covering the optimized path** (extend
  `test/benchmark/engine-bench.mjs` if no dataset exercises it). A perf win without
  a reproducible measurement is unproven. *(discipline — `bench:check` is on-demand,
  not a blocking CI gate; the wall-clock band would be flaky in the merge train. See
  `engineering/workflow.md` §Performance.)*
- **#20 — No `margin` in engine layout CSS — space with `padding` / `gap`.**
  `margin` sits *outside* the box, so it's invisible to `getBoundingClientRect()`
  / `offsetHeight` and it margin-collapses — both corrupt the height math a
  measuring layout (virtual lists, the Fit Spine) depends on. Use `padding` (space
  inside a box) and `gap` (space between flex/grid children), which measure
  cleanly. A bare `margin: 0` reset is fine (it adds no space); everything else —
  lengths, `auto`, negatives — is barred. **Target zero is achieved**: the layout
  budget is **0**, and the only margins allowed are the explicitly enumerated
  `SANCTIONED_MARGINS` allowlist (today: one irreducible flex `margin-left:auto`
  push). A margin is admitted **only where it is provably the only answer**, by
  adding an entry to that allowlist with its justification in the PR — never a
  silent edit; the gate also fails on a *stale* sanction, so the list can't rot.
  *(gated — `checkMarginDiscipline` in `tools/check-ownership.js`, via `build:check`;
  layout budget 0 + allowlist; `engineering/gotchas.md`,
  `engineering/decisions/2026-06-27-stage-flow-no-margins.md`.)*
- **#21 — US English is the house dialect — American spellings only.** Everywhere a
  human reads words — docs, comments, manifest text, UI copy, hyphenated
  identifiers/classes/tokens — use the US form: `-or` not `-our`, `-ize` not `-ise`,
  `-er` not `-re`; `gray`, `license`, `defense`, `catalog`, `while`. The curated word
  list lives in the gate; existing British spellings are a tracked migration backlog
  (don't add new ones — as the backlog drops, lower `US_ENGLISH_BUDGET`). The gate
  catches whole + hyphenated words; a British spelling buried in a `camelCase`/
  `snake_case` identifier rides on review, so name those US too. *(gated —
  `checkUsEnglish` ratchet in `tools/check-ownership.js`, via `build:check`;
  exceed-only, target zero; dated `engineering/decisions/` records, the `CHANGELOG`
  ledger, and generated bundles are exempt.)*
- **#22 — Untrusted slide HTML reaches a preview frame ONLY through
  `sanitizeSlideHtml`.** The docs-site Studio renders untrusted markdown (shared /
  AI-generated decks + component skeletons) into a SAME-ORIGIN, un-sandboxed `srcdoc`
  iframe; un-sanitized engine HTML there is XSS → OpenRouter-key theft
  (`engineering/decisions/2026-06-29-component-transformer-threat-model.md` §5.1, #616).
  Every preview-frame BUILDER — any `docs/src` module that assembles a live preview
  document, marked by the split runtime-`<script>` injection idiom — must run its slide
  HTML through `sanitizeSlideHtml` (`docs/src/lib/sanitize-slide-html.js`, DOMPurify)
  before it enters the frame. Add a new builder to the allowlist with its justification;
  the gate fails on an un-listed builder, a builder that drops the call, AND a stale
  entry. *(gated — `checkPreviewHtmlSinks` + `SANCTIONED_PREVIEW_BUILDERS` in
  `tools/check-ownership.js`, via `build:check`; `engineering/gotchas.md`.)*

---

## Read the canonical doc before working in its area

| Working on… | Read first |
|---|---|
| The whole concept map — how all the concepts relate (one level up) | `design/concepts.md` |
| What a component/modifier/token *is*, catalog shape | `design/design-system.md` |
| Branching, feature decks, share-the-PDF, rebase, merge, 2-renderer gate | `engineering/workflow.md` |
| Node, npm scripts, tests, lint, hooks, CI, the cloud sandbox setup | `engineering/development.md` |
| Something behaving strangely (symptom index) | `engineering/gotchas.md` |
| Engine internals, where transform kernels live | `engineering/architecture.md` |
| Where we stand vs Marp (independence scorecard) | `engineering/marp-independence.md` |
| The CSS cascade / `@layer` (declared-but-inert; the trap) | `engineering/cascade.md` |
| Typography scales | `engineering/typography.md` |
| Running the render pipeline (PDF/HTML/PPTX) | `engineering/pipeline.md` |
| Authoring/rendering Mermaid diagrams | `engineering/mermaid.md` |
| Adding a `tint-*` / `mark-*` treatment | `engineering/treatments.md` |
| Palette tokens, Mermaid contract | `design/theming.md` |
| Core visual design principles (hierarchy, restraint) | `design/design-principles.md` |
| How a slide is composed — the Form vocabulary | `design/forms.md` |
| Prose rules for galleries/decks | `design/editorial.md` |
| The deck-authoring contract | `design/skill.md` |
| Cross-cutting authoring (eyebrow, subtitle, base modifiers) | `lib/base/base.docs.md` |
| A specific component's slots/variants/anti-patterns | `lib/components/<bucket>/<name>/<name>.docs.md` |
| Picking a component as an agent (machine catalog) | `dist/docs/components.json`, `AGENTS.md` |
| What scripts/tools already exist (don't reinvent) | `engineering/capabilities.md` |
| The 10/10 visual rubric | `engineering/decisions/2026-06-06-layout-audit/` |
| A large visual sweep / parallel reviewer fan-out | `engineering/visual-review.md` |
| Release / publish | `RELEASE.md` |
| Durable investigation notes | `engineering/decisions/YYYY-MM-DD-topic.md` |

The 12 component buckets: anchor, statement, inventory, comparison, progression,
evidence, imagery, chart, diagram, math, code, legal.

---

## The build, tests, and gates (the machine polices these — don't re-police)

- `npm run build` regenerates every `dist/` artifact behind
  `npm run check:ownership`; `build:check` is the CI/stale gate.
- `npm test` is the inner loop; `npm run test:integration` is the cross-renderer
  + PDF-page-count tier; `test:<scope>` runs one slice. Counts/scopes live in
  `engineering/development.md`.
- **Hooks make the checklist blocking** (pre-commit, pre-push, commit-msg). Run
  the gates yourself *before* the hook — the hook is the backstop.

## Cloud sandbox + visual iteration

The SessionStart hook provisions everything and **exports `CHROME_PATH`**. The
recurring frictions (re-export `CHROME_PATH` if a render says "no browser";
`npm run lint` not `npx biome`; `node --test <file>` for one file; serve the
docs site with `cd docs && npm run dev`, stop it by port; sync local `main`
after a squash-merge) and the browser-free PNG preview are documented in
`engineering/development.md` (tooling) and `engineering/gotchas.md` (symptoms).
**Don't re-discover them — read those.**

Iterate visually with `npm run preview` + `SendUserFile` (no per-iteration
commits; auto-detects scope + pixel-diffs). Lint drafts with
`npm run lint:deck -- <file>`. The final PR commit includes all rebuilt PDFs.
`.scratch/` is for throwaway experiments (`npm run clean:scratch`).

## Design-before-code on "rethink X" requests

When asked to rethink something, write the design model first — name the axes,
list candidate moves, recommend one, confirm in one `AskUserQuestion` round —
before editing CSS or transforms. Bundle adjacent decisions.
