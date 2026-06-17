---
status: in-progress
created: 2026-06-17
updated: 2026-06-17
supersedes:
superseded-by:
---

# Workflow efficiency review — red-team of the agent operating model

> **Status: In progress** — red-team complete; B, C, D, E shipped on the branch.
> **Roll-up:** ☑ 4 done (B, C, D, E) · ◐ 2 in progress (A: convention done,
> generator + backfill = next slice · F: in-repo done, owner flips branch protection)
> **Decisions (2026-06-17):** E3 → gate the pre-push integration tier behind
> `LATTICE_FULL_PUSH=1`; F → adopt the merge queue with auto-merge-after-approval
> (in-repo changes here; branch-protection settings handed to the owner).
> **Owner:** Sharmarke · **Trigger:** "I feel a bit yucky about our workflow —
> red-team it for leanness, the right hard rules, efficient CI, exceptional docs,
> and minimal GitHub + Claude cost; I don't want to keep looking behind my back."

**Symptom → root cause → fix** (the convention of this folder):

- **Symptom.** The workflow *feels* janky and expensive, and the operator feels
  they must babysit it.
- **Root cause.** It is **not** doing janky things behind anyone's back — the
  one genuinely dangerous failure mode (a background drift-watch poller that
  thrashed CI and flooded chat) was already hunted down and removed (see
  `2026-06-14-drift-watch-rebase-thrash.md`, `2026-06-15-retire-drift-watch.md`).
  The "yucky" feeling traces to three real, fixable things: (1) **instruction
  bloat** — rules duplicated 2–3× in a `CLAUDE.md` that loads every turn; (2)
  **defaults that always resolve toward the most expensive path** (sub-agents,
  full-matrix pushes) with no cost tie-breaker; (3) **concrete redundancies** in
  CI (3 Astro builds per docs PR) and hooks (a 4.5-min integration tier on every
  push that CI re-runs identically).
- **Fix.** Six workstreams below, each independently shippable, each with its own
  status. Two carry open decisions for the owner (pre-push tier, merge queue) and
  are explained in full so the call can be made from this doc.

This doc doubles as the **structure proposal** for the status system the owner
asked for: a closed-vocabulary `status:` front-matter field + a per-section
status line + a generated roll-up index (workstream **A**).

---

## How to read the workstream status lines

Every workstream below carries one line:

> **Status:** ☐ Ready · **Serves:** <goals> · **Risk:** <low|med|high>

Status vocabulary (closed — the same set proposed for all decision docs in
workstream A):

| Glyph | `status:` value | Meaning |
|---|---|---|
| ☐ | `proposed` | Written/agreed in principle, not yet built |
| ◐ | `in-progress` | Being built now |
| ⏸ | `blocked` | Needs an owner decision or an upstream dependency |
| ☑ | `shipped` | Built, verified, merged — absorbed into canonical docs |
| ⊘ | `superseded` | Replaced by a later doc (see `superseded-by`) |

"Ready" = `proposed` + owner-approved-to-build (these four are approved per the
2026-06-17 question round).

---

## Workstream A — Documentation status structure (the convention itself)

> **Status:** ◐ In progress — convention + index spec **shipped**; generator tool
> (`tools/build-decisions-index.js`) + `decisions:index(:check)` gate + 104-doc
> front-matter backfill = the immediate next slice · **Serves:** doc maintenance,
> agent comprehension, GitHub/Claude cost · **Risk:** low

**Why first.** The owner's ask — "docs need a banner, overall stats, and
partitioned work with its own status, structured so parts can be implemented
independently" — is a *structural* fix, and the other workstreams (and this doc)
use it. Build the structure, then everything else slots into it.

**The problem it solves.** `engineering/decisions/` has **104 docs (~26K lines),
~71 of them orphaned** — discoverable only by `ls`. 87/104 carry an inline
`**Status:**` marker, but in **free text** (`design-decision`, `shipped`,
`open`, `spec`, `exploration`, `superseded-in-part`, …) that no tool can read.
The `README.md` "Current notes" list is **hand-maintained** and already drifts.
The folder's own rule ("when absorbed, delete it; this is not an archive") is not
followed because nothing tells a reader which docs are live canon vs history.

**What changes.**

1. **Closed `status:` front-matter** on every decision/initiative doc:
   `proposed | in-progress | blocked | shipped | superseded`, plus `created`,
   `updated`, `supersedes`, `superseded-by`. (This doc models it.)
2. **A roll-up banner** under the title for any multi-part initiative — overall
   status + a one-line stats roll-up derived from the section statuses.
3. **Per-section `**Status:**` lines** for partitioned work (as below).
4. **A generated index** — `tools/build-decisions-index.js` reads the
   front-matter and emits `engineering/decisions/README.md`'s "Current notes"
   list grouped by status (Active / Shipped-pending-deletion / Superseded), with
   a `decisions:index:check` freshness gate (same pattern as the existing
   `docs:portal:check`). The hand-maintained list stops drifting because it is no
   longer hand-maintained.
5. **A one-time backfill**: stamp the closed `status:` field onto existing docs
   (mechanical map from the free-text markers), and move `shipped`/`superseded`
   docs whose content is fully absorbed into an `archive/` subdir so a grepping
   agent skips ~70% of the bytes.

**Evidence.** `engineering/decisions/README.md:21` (the unfollowed rule);
104 files / ~26K lines; free-text statuses throughout the index above.

**Acceptance.** `npm run decisions:index:check` gates the generated index; an
agent can answer "what's the current decision on X" from one grouped list.

---

## Workstream B — Trim CLAUDE.md & re-tier the hard rules

> **Status:** ☑ Done (shipped on branch) · **Serves:** Claude cost (every turn), agent comprehension, doc maintenance · **Risk:** low

**The problem.** `CLAUDE.md` is **~23KB / ~6,000 tokens, loaded every session and
every turn.** It declares "This file is short on purpose" (line 11) — it is not;
that line is stale. Rules are duplicated 2–3× against `workflow.md` and
`AGENTS.md`, so every behavior change must be hand-edited in multiple places or
it drifts.

**Worst offenders.**
- **HARD RULE #3 and #16 are the same rule** (rebase-before-push / no
  drift-watch) stated twice; #16 alone is **17 lines re-litigating the
  drift-watch saga** that already has two dedicated decision docs.
- Several "hard rules" are **not invariants**: #4 (typography), #5 (card bullets,
  *already* enforced by `deck-authoring.test.js`), #11 (a *completed*,
  lint-blocked token migration — that's history), #12 (a `:has()` gotcha
  cross-referenced to `gotchas.md`).

**What changes.**
1. **Re-tier the 17 rules into two lists.** Keep ~8 genuine merge-gating
   *invariants* in `CLAUDE.md` (shared kernel · don't-hand-edit-dist · changelog ·
   commit/PR format · no `--no-verify` · rebase-not-watch · no-stacked-PRs ·
   gallery isolation). Move the *conventions* (typography, card bullets, `:has()`
   gotcha, token roles) to the canonical docs `CLAUDE.md` already points to —
   they're test/lint-enforced or read on demand anyway.
2. **Collapse #3 into #16** (one rule); strip #16 from 17 lines to one line + the
   two decision-doc links.
3. **De-duplicate**: each remaining rule is one line + a doc pointer; the
   rationale lives in the pointed-to doc. Move the full standup template and the
   "Cloud sandbox" operational block out of the per-turn memory file (the
   SessionStart hook already exports `CHROME_PATH`).
4. **Fix the "short on purpose" line.**
5. **Target ~150 lines / ~2.5k tokens** (from ~376 / ~6k).

**Evidence.** `CLAUDE.md` rule duplication table (built during the red-team);
`CLAUDE.md:11` (stale self-description); `CLAUDE.md:233-249` (Rule #16, 17 lines).

**Acceptance.** No behavior fact stated in more than one canonical home; every
moved rule has a live pointer; nothing that was machine-enforced is lost.

---

## Workstream C — Operating-model defaults (resolve toward cheap, not expensive)

> **Status:** ☑ Done (shipped on branch) · **Serves:** Claude cost (per task), GitHub cost, less babysitting · **Risk:** med (behavior change — maker-checker before committing)

**The problem.** Every ambiguity in `CLAUDE.md` currently resolves toward *more*
autonomous spend, never less. There is no cost tie-breaker.
- **Maker-checker** fires on "non-trivial or hard to reverse" — a low, fuzzy bar
  that catches most real work — spawning **2 sub-agents per change**. Sub-agents
  are the single most expensive thing an agent does (each re-loads context,
  including the giant `CLAUDE.md`).
- **Visual fan-out** can spawn 6–12 agents.
- The **export-inspection gate** ("anything that affects exported content … STOP
  and show me") triggers on "deck rendering" — which is most CSS work — pulling
  the owner back into the loop exactly where they wanted to step away.
- No guidance to **batch pushes**: every push during iteration fires a full CI
  matrix.

**What changes.**
1. **Add a cost tie-breaker** to DEFAULT OPERATING MODE, peer to the existing
   one: *"Prefer the cheapest path that meets the bar. Spawn sub-agents only when
   a second independent pass changes the merge decision — not by default. One
   checker, not two, unless the change touches `lib/core` / `lib/engine` / hooks /
   CI / a shared kernel."*
2. **Raise the maker-checker trigger** from "non-trivial" to that concrete
   file/risk list. Default to *serial self-review*; parallel agents are the
   justified exception.
3. **Narrow the export-inspection gate** from "deck rendering" to "changes the
   *bytes* of an exported artifact's format/embedding" (PDF/PPTX export pipeline,
   font embedding) — so ordinary CSS work no longer stops-and-asks.
4. **Add batch-push guidance**: iterate locally, run gates locally, push a
   coherent green unit — not every commit (every push is a full CI matrix). Safe
   because the local hooks already gate it.

**Evidence.** `CLAUDE.md:149-163` (maker-checker trigger), `:113-118` (visual
fan-out), `:141-145` (export gate), `:35-42` (the only tie-break, resolves toward
*doing more*).

**Acceptance.** A reader can point to the line that says "prefer the cheap path";
maker-checker has a concrete trigger; the export gate no longer catches plain CSS.

---

## Workstream D — CI efficiency

> **Status:** ☑ Done (shipped on branch) · **Serves:** GitHub Actions cost, PR latency · **Risk:** med (CI config — verify on a real PR run)

The CI is already mature (concurrency-cancel, path filters, npm + Chrome caching,
`cancelled`→pass). These are the *remaining* wins.

**What changes (priority order).**
1. **Collapse the 3 Astro builds.** The docs site is built from scratch in
   `ci.yml` (`docs-build`), `docs-overflow.yml`, and `docs.yml` (deploy) — for a
   docs PR you pay two cold builds + one Chrome install, then a third on merge.
   Fold `docs-overflow` into `docs-build` (share one build / reuse `dist`), or
   pass the build via `upload-artifact`/`download-artifact`. *(High)*
2. **Cache or drop the `docs-overflow` Chrome download** — it pulls a full Chrome
   uncached on every docs/lib PR (integration caches it; this doesn't). *(High)*
3. **Trim the unit matrix** — all tests run on Node 22 *and* 24 (`fail-fast:
   false`). Run the full suite on 22; on 24 a smoke subset (or move 24 to
   nightly). Halves unit compute per code PR. *(Med)*
4. **Add `concurrency` to `release.yml`** — it's the only stateful workflow with
   no guard; two dispatches could double-cut a release. *(Med, cheap)*
5. **Narrow `sync-backlog` triggers** — it fires on 9 issue events incl.
   `labeled`/`unlabeled`, and *other bots add labels*, so one new issue triggers
   several no-op runner starts contending to push `main`. Drop the label/assignee
   events; the daily cron + state changes suffice. *(Med, cheap)*

**Evidence.** `ci.yml` (`docs-build` :336-338), `docs-overflow.yml:40-54`,
`docs.yml:30-34`, `ci.yml:98-101` (matrix), `release.yml` (no concurrency),
`sync-backlog.yml:14`.

**Acceptance.** A docs-only PR triggers one Astro build, no uncached Chrome pull;
`release.yml` has a concurrency group; a new issue no longer fans backlog syncs.

---

## Workstream E — Hooks leanness  ⏸ contains an open decision

> **Status:** ☑ Done (shipped on branch — E1/E2/E3) · **decided: gate behind `LATTICE_FULL_PUSH=1`** · **Serves:** local loop speed, removes the `--no-verify` temptation · **Risk:** med

The pre-commit/pre-push *split* is sensible (cheap-on-commit, deterministic-on-push).
Three problems make it feel heavy:

**E1 — Collapse the 11 per-bundle freshness checks** (pre-commit) into the single
`build:check` they're a strict subset of. Each artifact is currently verified up
to 3× (pre-commit, pre-push, CI). Same coverage, one process. *(Ready, low risk)*

**E2 — Move `pdf-rebuild` off the per-commit path** (to pre-push) or parallelize
its render loop. Today it renders PDFs serially at **~12s each** on pre-commit and
*silently auto-stages* them into your commit — a literal "the hook did something
to my commit" surprise. *(Ready, low risk)*

**E3 — The pre-push integration tier — OPEN DECISION.** `lefthook.yml` runs the
full `test:integration` (**measured 269s / 4.5 min warm**, the "warm cache makes
it instant" comment is false) on every meaningful push. **CI re-runs the
byte-identical job and is the required merge gate.** So the local copy is
redundant insurance that taxes every push 4.5 min — the #1 driver toward
`git push --no-verify`.

| Option | What you get | What you give up |
|---|---|---|
| **Gate behind `LATTICE_FULL_PUSH=1`** *(recommended)* | Default push trusts CI (fast); opt in to the local tier when you want belt-and-suspenders. Removes the 4.5-min tax from every push, keeps the net available. | A push could go up red and be caught by CI 4.5 min later instead of locally before push. |
| **Drop entirely (CI-only)** | Leanest local loop. | No local integration catch at all; first signal is CI. |
| **Keep as-is** | Safest locally — nothing reaches the remote without the integration tier passing. | The 4.5-min duplicate stays on every push; `--no-verify` temptation remains. |

**Recommendation: gate behind `LATTICE_FULL_PUSH=1`.** CI is already the
authoritative boundary (required check), so the local tier's job is *early
warning*, not *gatekeeping* — and early warning you can opt into costs nothing
when you don't. Lint, `build:check`, and the full **unit** suite (16s) stay on
pre-push unconditionally; only the 4.5-min *integration render* tier becomes
opt-in. This is strictly safer than `--no-verify` (which an agent reaches for
when the gate is too slow) because the cheap gates still always run.

**Evidence.** `lefthook.yml:207-233` (integration on pre-push), `:49-174` (11
freshness checks), `:34-48` + `build-staged-pdfs.js:135-155` (serial render +
auto-stage); CI's required gate `ci.yml:348-371`.

---

## Workstream F — GitHub merge queue  ⏸ explain-first

> **Status:** ◐ In progress — **decided: adopt**; in-repo half shipped (ci.yml `merge_group`, CLAUDE.md #16, workflow.md §Merging), **owner flips branch protection** (steps below) · **Serves:** GitHub cost, less babysitting, closes the parked-conflict gap · **Risk:** med (changes how merges execute)

Both retired-drift-watch decision docs name a merge queue as *the* structural fix,
but it was never wired. The owner asked to understand it before adopting.

**What a merge queue is.** When you approve a PR, GitHub doesn't merge it
immediately — it puts it in a queue. The queue takes the PR, tentatively rebases
it on the *current* `main` (plus any PRs ahead of it in the queue), runs CI on
*that* combined state, and merges only if green. One PR at a time, automatically,
in order.

**The three frictions it removes — all things you flagged:**

1. **"Looking behind my back" (the parked-conflict gap).** Today a green PR that
   sits while `main` moves can silently go conflicted; nobody notices until the
   next push or the pre-merge re-check (`workflow.md:360-369` documents this as
   an accepted gap). A merge queue tests the *post-rebase* state at merge time, so
   a stale/conflicted PR can never merge — the gap closes structurally, not by
   vigilance.
2. **The pre-merge re-rebase dance.** HARD RULE #16's "re-fetch and rebase right
   before an authorized merge" exists *because* there's no queue. With a queue,
   the queue does the rebase-and-retest. The manual dance goes away.
3. **Per-merge babysitting + GitHub re-runs.** Combined with **auto-merge**, you
   approve once and the queue merges when green — you're not pinged to push the
   button after CI passes, and you stop paying the redundant full-matrix run on
   `main` after each squash (the queue's run *is* the `main` run).

**The cost/behavior trade.**
- The queue runs CI on the combined state, so it spends *some* Actions minutes —
  but it **replaces** the post-merge `main` run rather than adding to it, and
  under low merge volume (one repo, human-gated) it's near-parity. The big
  savings come at *high* merge volume / merge trains, which is also exactly when
  the manual rebase dance thrashes today.
- **You still approve every merge.** A queue does *not* remove the human gate —
  it removes the *button-press after approval*. With `enable_pr_auto_merge`, the
  sequence becomes: you review → approve → (queue rebases, tests, merges). HARD
  RULE #7's "human authorizes every merge" is preserved; only the post-approval
  mechanics are automated.
- **What changes operationally.** Branch protection gains a "require merge queue"
  setting; the required check runs in the `merge_group` context (a one-line
  trigger add to `ci.yml`); squash stays the merge method. HARD RULE #16's
  pre-merge re-rebase clause can be deleted (the queue owns it).

**Recommendation: adopt it, paired with auto-merge-after-approval.** It is the
one structural move that lowers GitHub cost *and* the parked-conflict risk *and*
your per-merge interrupt load simultaneously — i.e. it's the single biggest lever
on "I don't want to keep looking behind my back."

**In-repo half (done on this branch):** `ci.yml` carries the `merge_group`
trigger; the `changes` classifier runs the full pipeline on `merge_group`; the
required `ci` aggregate gates the queue; `CLAUDE.md` #16 and `workflow.md`
§Merging describe the queue owning the pre-merge rebase.

**Owner half — one-time GitHub settings (the part only you can do):**

1. **Repo → Settings → General → Pull Requests:** ensure **Allow squash merging**
   is on; turn **Allow merge commits** off; enable **Allow auto-merge**.
2. **Repo → Settings → Branches → branch protection rule for `main`:**
   - Tick **Require merge queue**. Set *Merge method* = **Squash**; *Build
     concurrency* = a small number (e.g. 2–3) — the queue's parallelism, not a
     worry at this repo's volume.
   - Under **Require status checks to pass**, keep **`ci`** as the (only) required
     check — it now also runs in the `merge_group` context.
3. **Per PR thereafter:** review → approve → click **Merge when ready** (auto-
   merge). The queue rebases, re-runs `ci`, and squash-merges on green. You're no
   longer the button-press after CI; you're just the approval.

(If you'd rather I script steps 1–2 via the GitHub API, say so and I'll do it —
it's gated repo-admin access, hence offered, not assumed.)

**Evidence.** `2026-06-14-drift-watch-rebase-thrash.md`,
`2026-06-15-retire-drift-watch.md` (both name the merge queue as the fix);
`workflow.md:360-369` (the accepted parked-conflict gap); `CLAUDE.md:233-249`
(HARD RULE #16's pre-merge re-rebase clause this would retire).

---

## Sequencing

```
A (status structure)  ──►  used by every other workstream's tracking
B (trim CLAUDE.md)    ──┐
C (operating defaults)──┤   independent, low-risk, ship together as the "docs/cost" PR slice
D (CI efficiency)     ──┘
E (hooks: E1+E2 now; E3 on the pre-push decision)
F (merge queue, on the owner's go-ahead)  ──► retires part of HARD RULE #16 (coordinate with B)
```

**One feature = one branch → one PR** (HARD RULE #17). These are slices of one
"workflow efficiency" initiative; they go on `claude/workflow-efficiency-review-ee1vlm`
as a sequence of commits in **one** PR, reviewed commit-by-commit — not a stacked
chain. F's repo-settings half is owner-driven and lands separately from the file
changes.

## Decisions — resolved 2026-06-17

1. **Workstream E3 — pre-push integration tier:** ✓ **gate behind
   `LATTICE_FULL_PUSH=1`.**
2. **Workstream F — merge queue:** ✓ **adopt** (with auto-merge after approval);
   in-repo changes land here, the owner flips branch protection (settings handed
   over in §F).

All six workstreams proceed.
