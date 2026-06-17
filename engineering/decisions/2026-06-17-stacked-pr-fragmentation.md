---
status: incident
last-updated: 2026-06-17
companion:
  - ../workflow.md
  - 2026-06-15-retire-drift-watch.md
  - 2026-06-14-drift-watch-rebase-thrash.md
---

# Incident — one feature shipped as a 7-PR stacked chain

**Status: incident (process).** Low blast radius, high signal — like the
drift-watch retros. The code was fine; the *delivery shape* was the failure.

## What happened

The social/mobile **portrait** feature (session `01HCkX35…`) was opened not as
one reviewable change but as **seven** open PRs, several **based on each other's
branches** rather than on `main`:

```
main
 ├─ #407  portrait grid reflow          (claude/portrait-grid-reflow ← main)
 │   ├─ #408  portrait support matrix    (← claude/portrait-grid-reflow)
 │   ├─ #409  PPTX portrait export       (← claude/portrait-grid-reflow)
 │   └─ #410  safe-area modifier         (← claude/portrait-grid-reflow)
 │       └─ #412  portrait "great" pass   (← claude/portrait-safe-zones)
 ├─ #411  drawing-board size picker      (← main, independent)
 └─ #415  scrub brand names from ADR     (← main, independent)
```

Each PR even said the quiet part out loud — *"Base is the #407 branch; retarget
to `main` + rebase once the stack merges."* That instruction lives only in the
author's head, and it is the tell.

## Why this is an anti-pattern

1. **Only the author can hold it.** No single diff shows "the feature." A
   reviewer must reconstruct a dependency graph across seven surfaces and merge
   them mentally — exactly what you must never hand a human.
2. **Never CI-tested as a unit.** A stacked PR runs CI against its *parent
   branch*, not `main`; "full CI runs on retarget" defers the only test that
   matters (the whole feature, green, against current `main`) to a moment that
   may never arrive cleanly.
3. **Built-in merge-order fragility.** #412 can't land before #410, which can't
   before #407. One change near the root forces every descendant to
   retarget + rebase — the **same thrash HARD RULE #16 forbids**, now at PR
   granularity and multiplied by the fan-out.
4. **Review cost scales with the fan-out, not the change.** Seven PR
   descriptions, seven CI runs, seven sets of comments — for one idea.

## Root cause

Treating **each increment of one feature as its own PR**, and **basing a PR on
another unmerged branch**. The fix is not "rebase better" — it's "don't fragment
in the first place."

## The rule (now codified)

**One feature = one branch, incremented in place → one PR.** Many commits on
that branch is good (review commit-by-commit if large); *many PRs* for one
feature is the defect. Never base a PR on another unmerged feature branch.

- **The right shape for a big feature already exists in this repo:** PR #272 (the
  shadcn migration) — *"phased on one branch, review commit-by-commit,"* one PR,
  six phases. That is the model, not the #407 stack.
- **Genuinely independent** slices each base on `main` and merge on their own —
  that's *parallel off `main`*, not *stacked*, and it's fine (worktrees help; see
  `workflow.md` § Working on multiple features in parallel). The test: if slice B
  can't compile/test without slice A's unmerged branch, it is **not**
  independent — keep it on A's branch.

Codified in `CLAUDE.md` HARD RULE #17 and `workflow.md`
§ "One feature, one branch". Sibling to HARD RULE #16 (rebase-not-watch) and the
§ Merging rule *"land a large migration as one squash, not N separately-merged
commits"* — this is that principle moved upstream, to PR *creation*.

## Remediation for the existing stack — owned by the work, not by this record

The durable output of *this* incident is the **rule**, not a git operation. The
stack itself is fixed by **whoever owns that feature** (session `01HCkX35…`),
because (a) collapsing live PRs from another session unilaterally would collide
with active work, and (b) "improve the workflow" and "do the feature work" are
different jobs — this record is the former.

The shape that remediation should take, for the owner: **one branch off `main`** =
the union of the portrait feature (#407 · #408 · #409 · #410 · #412, plus the
#411 size-picker), green as a single unit, one PR; then close the seven with
pointers. #415 (pure ADR brand-name copy) is genuinely independent off `main` and
can stand alone. Until the owner does that, the stack stays as-is — the rule
below is what stops the *next* feature from fragmenting the same way.
