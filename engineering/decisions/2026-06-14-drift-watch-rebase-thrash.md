---
status: design-decision
last-updated: 2026-06-14
companion:
  - ./README.md
  - ../workflow.md
  - ../../CLAUDE.md
---

# Drift-watch rebase thrash vs. a parallel merge train

**Symptom.** A small docs-only PR (#328) sat open and watched while a second
agent landed a large migration as **many sequential merges to `main`** (~7 moves
in ~15 min). Following the standing "rebase automatically on drift" rule
(CLAUDE.md HARD RULE #16, as written before this note), the watching session
**rebased and force-pushed on every `main` movement** — ~6 force-pushes, ~5
cancelled/restarted CI runs, and a **spurious red `ci` check**, before it gave up
chasing and let one run finish green. Nothing wrong shipped; the cost was wasted
CI minutes, false-alarm webhooks, and reviewer-confusion risk.

**Root cause — two independent defects, one behavioral and one in the gate.**

1. **The rule had no debounce, and conflated "behind" with "must rebase now."**
   HARD RULE #16 optimized for *never a commit behind `main`* and rebased on
   *every* movement. It had no notion of a merge train and no settle window.
   Under **squash-merge**, a branch that is merely *behind* (no file overlap,
   `mergeable_state: clean`) is harmless until merge — being behind is not being
   blocked. The real goal is **stay mergeable**, not **stay zero-commits-behind
   at every instant**.

2. **The `ci` aggregate gate mapped `cancelled` → failure.** A force-push
   supersedes the in-flight run; `concurrency: cancel-in-progress: true`
   (`.github/workflows/ci.yml`) cancels its tiers. But the `ci` gate runs
   `if: always()`, so under the supersession race it still evaluates and its loop
   did `if [ "$r" != "success" ] && [ "$r" != "skipped" ]; then exit 1` — a
   `cancelled` tier hit that branch and painted the PR red. Because `main` moved
   faster than CI finishes, every fresh run was cancelled by the next rebase
   before it could go green, so **green was unreachable** while the rule was
   followed literally.

A supersession-cancel is indistinguishable from a real failure in both the gate
output and the webhook, so each force-push manufactured a false alarm.

## Decision

**Fix both halves. Keep the watch as a detector; change the response.**

### 1. Rebase at the moments that matter, not every tick (CLAUDE.md #16, workflow.md §4)

The lock-free drift watch (arm `Monitor` on green; poll `git ls-remote`; never a
background `git fetch`; `TaskStop` first on merge) **stays** — it is still the
mechanism that notices `main` moved, which webhooks never deliver. What changes
is the **response to a drift event**:

- A bare "main moved" event is **not** an automatic force-push. On it, read
  `mergeable_state` (`pull_request_read`) and rebase **only if conflicted**
  (`dirty`). A `clean`-but-behind branch is left alone.
- Rebase only at the three moments that matter: **(a)** the PR is genuinely
  blocked (`mergeable_state: dirty`/conflicting); **(b)** immediately before
  asking for merge authorization; **(c)** immediately before an authorized merge
  executes. A merge train is then absorbed in **one** rebase at merge time, not N
  mid-flight.
- This distinguishes *stay mergeable* (the real invariant) from *stay
  zero-behind* (the failure mode). The at-merge checkpoints remain the floor:
  never merge while conflicted, stale-at-merge, or CI-red.

Why it's safe: squash-merge collapses the PR's history regardless of how far
behind the branch was, so being behind never pollutes `main`. Branch protection
keys checks to the head SHA, so an orphaned (superseded) run's verdict never
gates the merge — only the latest run on the latest SHA does.

### 2. A superseded (`cancelled`) tier must not paint the PR red (`.github/workflows/ci.yml`)

The `ci` gate now treats `cancelled` like `skipped` — non-failing. Only a real
`failure`/`timed_out` stops the gate. A cancellation here is almost always
supersession-driven (`cancel-in-progress`), and the superseding run on the new
head SHA carries the authoritative verdict, so a supersession-cancel on an
orphaned SHA is noise, not a regression. `failure` is still caught.

**Honest caveat — manual cancellation.** GitHub exposes no reason in
`needs.*.result`, so the gate can't distinguish a supersession-cancel from a
maintainer hitting "Cancel workflow" on the *current* head SHA. The latter now
reports the gate as passing on a tier that never completed. This is narrow
(requires a human to cancel the live run and then merge anyway), and the
**compensating control is the at-merge human checkpoint**: a human re-reads CI
before authorizing every merge (HARD RULE #16 / §Merging), so a deliberately
half-run pipeline isn't rubber-stamped. The trade is worth it — the alternative
(painting every superseded run red) manufactured the false alarms this fixes.

## Considered and deferred

- **P2 — `concurrency: cancel-in-progress` on the CI workflow.** Already present
  (`ci.yml` lines 11–13); the report predated it. The residual defect was purely
  the gate's `cancelled`-handling, fixed above.
- **P1 — merge queue.** A GitHub merge queue rebases+tests once at the front of
  the queue, structurally eliminating per-PR chasing for *all* sessions. This is
  the strongest structural fix but an **architectural adoption** (affects every
  contributor and the branch-protection model) — left as a recommendation for a
  human call, not landed here.
- **P1 — webhook asymmetry (failure delivered, success/“main moved” not).** A
  harness-level signal, outside this repo's control. The lock-free watch is the
  in-repo compensation; noted, not actionable here.
- **Large-migration guidance.** Land a large migration as **one squash** (or a
  tight curated series behind a single merge), not N separately-merged commits —
  each separate merge to `main` is a drift event broadcast to *every* open PR.
  Added to `workflow.md` §Merging. Note the division of labour: the behavioral
  fix (#16) is the **durable mitigation** — it makes every watcher tolerate a
  train regardless of how it was landed; the squash guidance is **best-effort
  prevention** — unenforced, and it doesn't remove the baseline cost of a train
  superseding other PRs' in-flight runs. The merge queue is the only fix that
  eliminates that baseline cost structurally.

## Appendix — trail

- PR head progression: `e838738 → fdda39e → b6d7263 → 777c4ac → 1c75ee4 →
  df8c24d → 4ac799e`.
- `main` during the window: `f35826f → 4ef69cf → 4f61ca3 → 72be706 → e47f84f →
  34c35cd → 55ee18d → 4f96062` (~7 moves in ~15 min).
- Failing gate (job 81301826685, on `b6d7263`): `lint=success unit=skipped
  integration=skipped docs-build=cancelled` → `a required tier failed
  (cancelled)`.
- Upstream trigger: large migration in PR #324 landing as adjacent merges in
  quick succession.
