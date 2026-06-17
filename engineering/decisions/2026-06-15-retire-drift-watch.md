---
status: shipped
summary: Retires the continuous background drift watch in favour of rebase-before-push plus one pre-merge re-check
last-updated: 2026-06-15
companion:
  - ./2026-06-14-drift-watch-rebase-thrash.md
  - ./README.md
  - ../workflow.md
  - ../../CLAUDE.md
---

# Retire the continuous drift watch — rebase before push instead

**Symptom.** Keeping an open PR mergeable was implemented as a *continuous
background drift watch*: the instant a PR went green, arm a `Monitor` loop that
polls `origin/main` (lock-free, via `git ls-remote`) and wakes the agent on every
`main` advance to triage a rebase. Two prior incidents already filed against this
design:

- **2026-06-14 (`drift-watch-rebase-thrash.md`)** — against a parallel merge train
  the watch produced ~6 force-pushes and ~5 cancelled CI runs and a spurious red
  gate. The fix there *debounced the response* (rebase only on conflict or at
  merge time) but kept the watch as a detector.
- The debounce relied on reading `mergeable_state`, which GitHub computes
  asynchronously — so the watch had to special-case `unknown`/stale-`clean`, and
  the logic for "when does a fire actually mean rebase" grew brittle.

The deeper problem the debounce didn't touch: **the watch itself degrades the
chat.** A persistent poller plus the self-check-in timers it needs (because
webhooks never deliver CI-success or "`main` moved") emit a steady stream of
events — poll fires, timer pings, force-push churn — into the conversation. Even
when each rebase was individually correct, the session became noisy and hard to
follow.

**Root cause.** The watch was solving the wrong problem. "Never a commit behind
`main`" is not the goal — **"mergeable at merge time" is.** Under squash-merge a
`clean`-but-behind PR is harmless until it merges, so continuously detecting and
reacting to drift buys nothing it can't get more cheaply at the moments it
actually acts on the branch.

## Decision

**Retire the continuous background drift watch. Keep an open PR mergeable by
rebasing right before every push, plus one re-check before an authorized merge.**

- **No background watch, no polling loop, no self-check-in timer for drift.** Do
  not arm `Monitor`/`send_later` to chase `main`.
- **Before every push:** `git fetch origin main`, rebase if behind or conflicted,
  then push. The check is free — you were already touching the remote — and it
  guarantees you never push from a stale branch. The local Stop hook
  (`.claude/hooks/stop-rebase-check.sh`) is the non-blocking backstop.
- **Before an authorized merge executes:** re-fetch, rebase if behind/conflicted,
  let CI re-confirm, then merge.
- A green PR may sit behind `main` while it waits — that is fine and expected, not
  a thing to fix.

**Accepted trade.** If `main` moves while a PR sits idle and a conflict lands, the
agent won't notice until its next push or the pre-merge check. That's acceptable:
under squash-merge a clean-behind PR is harmless, and a real conflict is caught at
the pre-merge checkpoint before anything merges. The only cost is that a *parked*
PR's conflict is discovered later — never that a bad merge happens.

**Still the structural fix if cross-session races recur:** a GitHub **merge
queue** (rebases + tests once at the front of the queue) or a `push`-to-`main`
Action running `update_pull_request_branch` on open PRs. Both are deliberate
architectural adoptions, not standing agent behaviour.

## What changed

- `CLAUDE.md` — HARD RULE #16 rewritten ("rebase right before you push — NOT with
  a background watch"); rule 3 ("Stay mergeable") aligned.
- `engineering/workflow.md` §"Keeping an open PR mergeable" — the `Monitor`
  snippet, the arm-on-green/`MAIN-ADVANCED` triage, the `send_later` backup, and
  the four-checkpoint model are removed; replaced with the two-moment
  rebase-before-push model. §Merging post-merge teardown no longer stops a watch
  first (there is none), so it's a plain sync sequence.
- The Stop hook is unchanged — it already nudged "rebase before pushing", which is
  now the whole rule rather than a backstop to a watch.
