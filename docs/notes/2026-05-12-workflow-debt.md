# Workflow debt — analysis and proposals

> **Status (2026-05-17).** None of the three proposals in this note
> have shipped end-to-end; the closest landed work is the page-count
> half of the three-renderer parity check (see the "What this won't
> fix" section at the bottom). Open:
>
> - Proposal 1 — per-feature deck archive policy. **Open.** No
>   `examples/MANIFEST.md` and no `_meta: archived` convention yet.
> - Proposal 2 — graduation-commit automation. **Open.** No GitHub
>   Action; the trigger is still informal.
> - Proposal 3 — retire `gallery-jargon.md` in favour of
>   `gallery-guide.md`. **Open.** Both decks still live in `examples/`.

After the 2026-05-12 workflow reconciliation (commits `0f7d67b` and
`492bcaa`), the docs are *consistent* but the underlying workflow
still has real friction that no doc-rewrite can address. This note
captures the analysis and three concrete proposals for the next
round of work.

## What the workflow optimises for today

The workflow is **review-quality-first**:

- Every feature gets a focused demo deck → reviewer sees the work in
  one click, no local rebuild needed.
- Page-count fixtures catch unintended drift in long-running decks.
- Three-renderer rule prevents authoring transforms from drifting
  between the build paths.
- Isolation rule keeps the regression baseline stable during
  iteration.
- Atomic commits + design-before-code keep the audit trail readable.

These are all good values. What they cost is **speed and durability**.

## What slows A → B

**Content lives in 2–3 places per feature.** A layout change touches:

1. The engine (`lattice.css`, sometimes JS transforms).
2. The per-feature deck (`examples/<slug>.md` + `.pdf`).
3. *Later*, a graduation commit that folds the layout into one or
   more long-running decks, updating `expected-page-counts.json` if
   the count drifts.

Step 3 has no defined trigger. The workflow says "after review and
approval" but doesn't say who fires it or when. Risk: features get
stuck ungraduated indefinitely; the long-running decks fall out of
date relative to what the engine supports.

**Three-renderer rule is expensive when it triggers.** Every DOM
transform lives in three files connected only by header comments —
no automated parity check. Pure-CSS work (like the KPI redesign)
isn't affected; DOM work (kanban, gantt, roadmap modifiers) pays
3× the engineering cost.

**Page-count fixtures need manual sync.** Legitimate slide additions
require a fixture update in the same commit. No
`--update-snapshots`-style ergonomic. The graduation commit pattern
makes this worse: graduation often adds a slide, which means every
graduation involves a fixture bump.

**Raw-URL discipline is friction on every push.** The agent has to
remember to paste the URL. The user catches it when forgotten.
Tractable to automate (git push wrapper / hook) but not yet
automated.

## What makes maintenance harder

**`examples/` is becoming a graveyard.** Per-feature decks live in
`examples/` forever (workflow.md L161-167: "they are not deleted when
the branch merges"). Today: ~10 files. After 100 features: 100
files in one directory with no signal as to which are still
relevant. No archive policy.

**`CLAUDE.md` + `workflow.md` is still two homes for the same rules.**
The recent reconciliation made one canonical; CLAUDE.md is now a
thin pointer with a list of high-friction reminders. But the
reminder list will drift as new lessons get learned. Audit-and-fix
will need to happen again.

**`gallery-guide.md` + `gallery-jargon.md` are doing overlapping
work.** Both are editorial showcases of layouts with different copy
registers (one straightforward, one satirical). Two decks to keep
current as the engine evolves. Cost: 2×. Value vs one: marginal.

**Per-feature decks accumulate engine-change debt.** If
`lattice.css` renames a class or a transform signature changes,
every old `examples/*.md` from a previous quarter might need
touch-up — but they're not in the test suite, so the breakage isn't
caught until someone opens the file.

## Three proposals

### 1 · Per-feature deck archive policy

**Problem.** `examples/` accumulates one-off review chrome
indefinitely.

**Proposal A — move-on-merge.** When a branch merges, the
per-feature deck moves to `examples/archive/<slug>.md`. The PDF
moves with it. Stale-bookmark risk; clean directory.

**Proposal B — manifest tag.** Add `<!-- _meta: archived -->` to the
front matter after merge; no file move. Lower-risk; needs a manifest
to list "permanent" feature decks that opt out of archival.

**Proposal C — time-based GC.** Delete decks with no commits in 18
months. Fully automated; risks killing useful decks.

**Recommendation.** Proposal B as the primary mechanism, with a
short "permanent" list in `examples/MANIFEST.md` for decks like
`kpi-gallery.md`, `mermaid-gallery.md`, `gallery.md` that aren't
per-feature ephemera at all. Per-feature decks get `_meta: archived`
after merge; the build script skips them; tooling could grey them
out in `examples/` listings.

### 2 · Graduation commit automation

**Problem.** The graduation commit has no trigger; features get
stuck ungraduated.

**Proposal.** Add a CI check on PR merge that:

- Detects when `lattice.css` or `lib/*.js` changed since the last
  graduation commit on any of the six long-running decks.
- Files an issue ("graduate `<feature>` into the long-running decks")
  on the merging org's tracker, *or* posts a comment on the merged
  PR with a checklist.
- Author can dismiss with "no graduation needed" + reason; otherwise
  the issue stays open.

**Cost.** One GitHub Action workflow + state tracking. Low.

### 3 · Consolidate the editorial galleries

**Problem.** `gallery-guide.md` and `gallery-jargon.md` both
showcase the engine's layouts with different copy. Both need
maintenance when layouts change.

**Proposal.** Pick one editorial register and retire the other. The
guide register (`gallery-guide.md`) is the more general-purpose
showcase; the jargon register (`gallery-jargon.md`) is satirical and
narrower in audience.

**Recommendation.** Keep `gallery-guide.md`; mark
`gallery-jargon.md` for retirement at the next big engine release.
Until then, treat updates to it as best-effort, not blocking.

## What this won't fix

These proposals address the *process* friction. They don't address
the cost of the **three-renderer rule** itself (real engineering
overhead for DOM transforms) or the **raw-URL discipline**
(automatable but not free). Those are tractable separately:

- Three-renderer parity: a unit test that imports each transform
  module and asserts that the same set of layout names is registered
  in `lattice-emulator.js`, `lib/`, and `lattice-runtime.js`.
  **Partially shipped (2026-05-17):** `test/integration/parity/parity.test.js`
  catches drift at the page-count level (emulator vs marp-cli on
  `gallery.md`), and `tools/affected-tests.js` plus the
  `test:components` scope route per-component changes through their
  unit suites. A registration-set assertion across all three render
  paths is still missing.
- Raw-URL: a `git push --feature-deck` wrapper that prints the URL
  to stdout after push; agent / user copies into reply. **Still Open.**

Both are smaller wins and probably worth their own notes file if /
when prioritised.

## What to decide next

| Question | Why it matters | When to decide |
| --- | --- | --- |
| Adopt the archive policy for per-feature decks? | Directly controls long-term `examples/` cleanliness. | Before the next 5 feature decks land — easier to retrofit at 10 than at 100. |
| Adopt the graduation-commit automation? | Determines whether the long-running decks stay current. | Whenever a feature branch ships that *should* graduate but doesn't. |
| Retire `gallery-jargon.md`? | Halves editorial maintenance. | Anytime; it's a sunk cost the longer we wait. |

If you want, the archive-policy proposal is the smallest concrete
PR — a single `examples/MANIFEST.md` + a one-line front-matter
convention. The other two are larger.
