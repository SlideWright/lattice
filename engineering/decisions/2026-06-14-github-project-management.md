---
status: design-speculation
version: 1
last-updated: 2026-06-14
companion:
  - ./README.md
  - ../workflow.md
  - 2026-05-10-tauri-exploration.md
---

# Proposal: lightweight GitHub project management for distributed agent work

**Status: design-speculation.** Nothing here is implemented or decided. This is
the model to react to and converge, then flip to `design-decision` and build the
first slice. Decision direction so far (2026-06-14): adopt **L2** (issues + label
taxonomy + generated backlog mirror + a kanban Project board) as the first move;
design **L3** (autonomous agent dispatch) before enabling it.

## What this proposes (TL;DR)

Keep durable knowledge where it already lives — markdown ADRs in this folder,
canonical and vendor-neutral. Add GitHub for the **one** job markdown does badly:
a **claimable work queue with atomic claim**. Concretely:

- **Issues** become the kanban cards — small, claimable units that *link* their
  governing decision doc rather than restating it.
- A **GitHub Project** board gives the Backlog → Ready → In&nbsp;progress →
  In&nbsp;review → Done flow with WIP limits.
- A generated, committed **`BACKLOG.md`** mirrors open issues back into the repo,
  so leaving GitHub costs us zero permanent knowledge.
- A **claim-contract** (Definition of Ready + atomic self-assign + WIP limits)
  makes later autonomous pickup *distributed but safe*.

> **Principle: docs are the brain, issues are the hands.** Durable knowledge stays
> in markdown (canonical). GitHub owns only *transient coordination* — the queue
> and the lock — and that coordination is mirrored back to markdown.

## Why now — the gap

We already have a real ADR practice: every `engineering/decisions/*.md` carries a
`status:` lifecycle (`design-speculation → proposal → design-decision →
decisions-locked → resolved`). Knowledge capture is **not** the problem.

The problem is that **actionable work is buried inside prose**. Follow-ups, debt,
and "next steps" live in narrative sections of decision docs (e.g.
`2026-05-12-workflow-debt.md`, `2026-05-16-post-foundation-followups.md`), so no
item is a discrete unit you can *claim*, *prioritise*, or *hand to an agent*.
There is no queue and no concurrency primitive. That — not documentation — is what
blocks "agents pick up work and solve it in a distributed, safe fashion."

This session already built the **safe-execution** half of that goal — the
auto-rebase drift watch, maker-checker review, human-in-the-loop merge, the
capability index, and the post-merge standup (see `../workflow.md`). What's
missing is the **safe-intake/dispatch** half: how work is queued and claimed. This
proposal is that half.

## The model — mapped to Lattice

| Concept | Lives in | Notes |
|---|---|---|
| **Epic / initiative** | `engineering/decisions/*.md` | The durable *why*. Already has `status:`. Canonical. |
| **Card / story** | **GitHub Issue** | Small, claimable. Body links the decision-doc section; doesn't restate it. |
| **Labels** | Issue metadata | `area:*`, `type:*`, `priority:*`, `status:*` (below). |
| **Board** | **GitHub Project** | Kanban columns + WIP limits + PR-driven automation. |
| **Lock-in insurance** | committed `BACKLOG.md` | One-way mirror of open issues, regenerated in CI. |

Hierarchy is deliberately shallow (kanban-light): **epic = doc, card = issue**.
GitHub's native issue-types / sub-issues *can* express epic→story→task, but we
defer that until flat issues prove insufficient.

### Label taxonomy (starting point)

- `area:*` — the 12 component buckets (`anchor`, `statement`, `inventory`,
  `comparison`, `progression`, `evidence`, `imagery`, `chart`, `diagram`, `math`,
  `code`, `legal`) plus cross-cutting (`engine`, `theming`, `docs`, `infra`,
  `website`). Reuses vocabulary the repo already speaks.
- `type:` — `feat | fix | docs | infra | refactor | spike`.
- `priority:` — `p0 | p1 | p2 | p3` (open question: P-scale vs MoSCoW — see below).
- `status:` — the kanban state machine, mapped to board columns:

  | `status:` label | Board column | Meaning |
  |---|---|---|
  | `status:backlog` | Backlog | Captured, not yet ready. |
  | `status:ready` | Ready | Meets Definition of Ready — pickable. |
  | `status:in-progress` | In progress | Claimed (assignee set). The lock is held. |
  | `status:review` | In review | PR open, awaiting CI + human merge. |
  | (issue closed) | Done | PR merged, issue auto-closed. |

## Kanban board (L2)

A single GitHub Project board over the repo. Columns mirror the `status:` machine
above. Two lightweight controls:

- **WIP limits** per column (and, later, per agent) — kanban's core throughput and
  safety knob. Start generous, tighten with data.
- **Automation**: PR opened with `Closes #n` → card to *In review*; PR merged →
  *Done* + issue closed. GitHub Projects' built-in workflows cover most of this; a
  thin Action covers the rest.

## Lock-in insurance: generated `BACKLOG.md`

A new `tools/sync-backlog.js` reads open issues (title, number, labels, assignee,
status) and writes a committed `BACKLOG.md` grouped by board column. Properties:

- **One-way mirror.** Issues are the source of truth for *work status*; decision
  docs remain the source of truth for *design*. The mirror never feeds back.
- **Runs in CI / on a schedule**, not by hand — so it can't drift.
- **Resilience:** if we ever leave GitHub, the repo still carries a readable
  snapshot of the queue. We lock in *ticket churn*, never *knowledge*.
- Fits the `capabilities`-index discipline (HARD RULE #15): the script is
  described in `engineering/capabilities.md`.

## Distributed-but-safe execution (L3 — deferred, design first)

The end goal: a scheduled session pulls a ready issue and works it autonomously.
The safety primitives that make "distributed" also "safe":

1. **Definition of Ready** — an issue is `status:ready` *only* if it links an
   approved proposal/spec and states an acceptance check. Agents never pick up
   ambiguous work. **This is the single biggest safety lever.**
2. **Atomic claim = the lock.** To start work, an agent self-assigns **and** flips
   `status:ready → status:in-progress` as one step; if the issue is already
   assigned, it skips. No central coordinator, no double-pickup. (Open question:
   GitHub assignment is not transactional — we may need a comment-token or a small
   Action to make the claim race-free.)
3. **Small, independently-mergeable cards** → few cross-PR conflicts; the
   auto-rebase watch + merge gate absorb the rest.
4. **WIP limit per agent** — bounds blast radius and keeps `main` reviewable.
5. **Convention thread:** branch `claude/issue-<n>-<slug>` → PR `Closes #n` →
   human-authorised merge → auto-close → standup. Fully traceable and revertable.

L3 reuses everything already shipped this session; it adds only the claim loop.
Do **not** enable autonomous dispatch until the claim-contract is designed and
trust-tested on a few human-supervised cards.

## Ceremony: deliberately kanban-light

No sprints, no story points, no estimation theatre. **Pull-based, WIP-limited,
continuous flow.** The only two "ceremonies" are already lightweight and
automated: the **post-merge standup** (shipped) and the **Definition of Ready**
(a label gate, not a meeting).

## Adoption ladder (reversible)

- **L0** — today: everything in markdown.
- **L1** — Issues + label taxonomy + generated `BACKLOG.md`. Docs stay the epics.
- **L2** — add the Project board (kanban columns, WIP limits, PR automation). ← **first move**
- **L3** — autonomous agent dispatch (claim loop). Design the contract first.

**Recommendation:** ship **L1+L2** now — low-risk, reversible, immediately useful —
and treat **L3** as its own proposal once the claim-contract is specified.

## Open questions (to converge before flipping to `design-decision`)

1. **Priority scheme:** `p0–p3` vs MoSCoW vs a single `priority` Project field?
2. **One board or many:** a single repo board now; how does this scale if/when the
   Tauri/SlideWright desktop work (see `2026-05-10-tauri-exploration.md`, which
   already names a public `ROADMAP.md`) gets its own repo?
3. **Extraction:** how do existing buried backlog items (workflow-debt,
   post-foundation-followups, the marp-replacement P-series) become issues —
   one-time manual sweep, or lazily as picked up?
4. **Definition of Ready enforcement:** issue template checklist, a `status:ready`
   label gate, or a CI check that a ready issue links a proposal?
5. **Native issue-types/sub-issues** for epic→story, or epics-as-docs only?
6. **Claim atomicity:** is GitHub assignment enough, or do we need an Action/token
   to make the race-free claim in (L3) primitive #2?
7. **WIP numbers** — starting limits per column / per agent.
8. **`ROADMAP.md`:** the Tauri note promises a public roadmap. Is that the same
   artifact as the generated `BACKLOG.md`, or a separate curated narrative?

## Risks & non-goals

- **Risk — issue/doc drift.** Mitigated by the strict split (docs own design,
  issues own status) and the one-way mirror.
- **Risk — process creep.** The kanban-light guardrail and "two ceremonies only"
  rule exist to prevent re-inventing Scrum.
- **Risk — unsafe autonomy.** Mitigated by gating L3 behind the claim-contract and
  the existing human-in-the-loop merge rule.
- **Non-goals:** sprints, estimation, velocity tracking, or replacing ADRs. GitHub
  is the *hands*, not the *brain*.

## Next step

Converge the open questions (one `AskUserQuestion` round), flip status to
`design-decision`, then implement L1+L2 as a single slice: label taxonomy →
`tools/sync-backlog.js` + `BACKLOG.md` → the Project board + automation → a short
`engineering/workflow.md` section documenting the card lifecycle.
