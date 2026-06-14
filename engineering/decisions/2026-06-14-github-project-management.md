---
status: design-decision
version: 2
last-updated: 2026-06-14
companion:
  - ./README.md
  - ../workflow.md
  - 2026-05-10-tauri-exploration.md
---

# Lightweight GitHub project management for distributed agent work

**Status: design-decision.** The model below is converged (open questions
resolved 2026-06-14 — see §Resolved decisions). Next is to build the first
slice: **L1+L2** — issues + label taxonomy + a generated `BACKLOG.md` mirror +
a per-repo kanban Project board. **L3** (autonomous agent dispatch) stays
deferred behind its own claim-contract design.

## What this proposes (TL;DR)

Keep durable knowledge where it already lives — markdown ADRs in this folder,
canonical and vendor-neutral. Add GitHub for the **one** job markdown does badly:
a **claimable work queue with atomic claim**. Concretely:

- **Issues** become the kanban cards — small, claimable units that *link* their
  governing decision doc rather than restating it.
- A **GitHub Project** board (one per repo) gives the Backlog → Ready →
  In&nbsp;progress → In&nbsp;review → Done flow.
- A generated, committed **`BACKLOG.md`** mirrors open issues back into the repo,
  so leaving GitHub costs us zero permanent knowledge.
- A **claim-contract** (Definition of Ready + atomic self-assign) makes later
  autonomous pickup *distributed but safe*.

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

This is **kanban-light**, in kanban's own vocabulary — *flow*, not Scrum
work-breakdown. There is no epic/story/task hierarchy: the board is flat **cards**,
and an initiative is just the decision doc a card points back to.

| Kanban concept | Lives in | Notes |
|---|---|---|
| **Card** (work item) | **GitHub Issue** | Small, claimable. Body links the decision-doc section; doesn't restate it. |
| **Initiative** (grouping) | `engineering/decisions/*.md` | The durable *why*. A card names its initiative via an `area:`/initiative **label** (or board **swimlane**) — not a parent issue. Canonical, already has `status:`. |
| **Labels** | Issue metadata | `area:*`, `type:*`, `priority:*`, `status:*` (below). |
| **Board** | **GitHub Project** | One per repo. Columns + PR-driven automation. |
| **Lock-in insurance** | committed `BACKLOG.md` | One-way mirror of open issues, regenerated in CI. |

We deliberately **do not** use native issue-types / sub-issue trees. Kanban groups
with **swimlanes and labels**, not parent/child hierarchies; a hierarchy would put
the initiative in two places (doc + tracking issue) and invite the exact drift this
design exists to avoid. If flat cards ever prove insufficient we can revisit — but
the board filter *is* the rollup, so we expect not to.

### Label taxonomy

- `area:*` — the 12 component buckets (`anchor`, `statement`, `inventory`,
  `comparison`, `progression`, `evidence`, `imagery`, `chart`, `diagram`, `math`,
  `code`, `legal`) plus cross-cutting (`engine`, `theming`, `docs`, `infra`,
  `website`). Reuses vocabulary the repo already speaks; doubles as the
  initiative/swimlane grouping.
- `type:` — `feat | fix | docs | infra | refactor | spike`.
- `priority:` — `p0 | p1 | p2 | p3`. Numeric and visible; mirrors cleanly into
  `BACKLOG.md`. Not MoSCoW — that's Scrum-flavoured.
- `status:` — the kanban state machine, mapped to board columns:

  | `status:` label | Board column | Meaning |
  |---|---|---|
  | `status:backlog` | Backlog | Captured, not yet ready. |
  | `status:ready` | Ready | Meets Definition of Ready — pickable. |
  | `status:in-progress` | In progress | Claimed (assignee set). The lock is held. |
  | `status:review` | In review | PR open, awaiting CI + human merge. |
  | (issue closed) | Done | PR merged, issue auto-closed. |

## Kanban board (L2)

One GitHub Project board per repo. Columns mirror the `status:` machine above.

- **No WIP limits at first.** Ship the board without caps and add them only once
  throughput data shows a real bottleneck — kanban's "start where you are." (When
  L3 lands, a per-agent cap is the first limit worth adding, to bound blast radius.)
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

`BACKLOG.md` is **not** the roadmap. It is the generated, churny mirror of open
issues. A separate, curated `ROADMAP.md` (the public narrative the Tauri note
promises) is hand-written and points at the decision docs — strategic intent, kept
apart from ticket noise. See §Resolved decisions Q8.

## Seeding the queue: a one-time reconciliation sweep

The backlog buried in prose (workflow-debt, post-foundation-followups, the
marp-replacement P-series, plus `TODO`/`FIXME` markers in code) becomes issues via
a **single up-front sweep, run as a maker-checker agent pass** — not lazily as
items happen to be picked up, and not a hand transcription.

The sweep treats the **codebase as the source of truth** and audits the docs
*against* it, on the (likely correct) suspicion that prose has drifted, over-claims,
or describes superseded/abandoned plans:

- **Maker** — a `docs-auditor` pass (read-only, report-only by design) cross-
  references what ships against what every doc *claims*, and a companion pass
  harvests code `TODO`/`FIXME`/`XXX` markers. Output: a categorised findings
  backlog, each finding tagged with the `area:/type:/priority:` taxonomy above.
- **Checker** — a second agent validates each finding against the code before it
  becomes an issue, so we don't mint phantom work.
- **Reconcile in the same pass** — stale claims get corrected and
  superseded/abandoned plans get marked as such *in the docs*, so the sweep leaves
  the prose honest, not just the queue seeded.

This is a one-off to reach parity; steady-state intake is just "file an issue."

## Definition of Ready — enforced, not just suggested

An issue is `status:ready` *only* if it links an approved proposal/spec and states
an acceptance check. For autonomous pickup, `status:ready` has to be **machine-
trustworthy**, so we enforce it two ways:

- **Issue template** captures the DoR fields (links-to-proposal, acceptance check)
  — makes the right thing easy.
- **A lightweight Action gates the `status:ready` label**: when it's applied, the
  Action validates the fields are present and strips the label + comments if not —
  makes the right thing *true*.

A template alone only guides; a label gate alone relies on discipline. Together,
`status:ready` becomes a guarantee an agent can pull against.

## Distributed-but-safe execution (L3 — deferred, design first)

The end goal: a scheduled session pulls a ready issue and works it autonomously.
The safety primitives that make "distributed" also "safe":

1. **Definition of Ready** (above) — agents never pick up ambiguous work. **The
   single biggest safety lever.**
2. **Atomic claim = the lock.** To start work, an agent self-assigns **and** flips
   `status:ready → status:in-progress`; if already assigned, it skips. **Decision:**
   for L1+L2, plain assignment is sufficient — there is no concurrent dispatch yet,
   so no race to lose. The **race-free** lock is designed *at L3*, when the dispatch
   loop is concrete; the leading candidate is **branch creation as the lock**
   (`git push` of `claude/issue-<n>` is an atomic server-side ref create — it wins
   or fails, no Action required), with a single mutex-label Action as the fallback.
   Building this now would gold-plate a primitive nothing uses yet. It is, however,
   a **blocking** prerequisite for turning autonomy on.
3. **Small, independently-mergeable cards** → few cross-PR conflicts; the
   auto-rebase watch + merge gate absorb the rest.
4. **WIP limit per agent** — the first cap we add when L3 lands; bounds blast
   radius and keeps `main` reviewable.
5. **Convention thread:** branch `claude/issue-<n>-<slug>` → PR `Closes #n` →
   human-authorised merge → auto-close → standup. Fully traceable and revertable.

L3 reuses everything already shipped this session; it adds only the claim loop.
Do **not** enable autonomous dispatch until the claim-contract is designed and
trust-tested on a few human-supervised cards.

## Ceremony: deliberately kanban-light

No sprints, no story points, no estimation theatre, no PI planning. **Pull-based,
continuous flow.** The only two "ceremonies" are already lightweight and automated:
the **post-merge standup** (shipped) and the **Definition of Ready** (a label gate,
not a meeting).

## Adoption ladder (reversible)

- **L0** — today: everything in markdown.
- **L1** — Issues + label taxonomy + generated `BACKLOG.md`. Docs stay the initiatives.
- **L2** — add the per-repo Project board (kanban columns, PR automation). ← **first move** (with L1)
- **L3** — autonomous agent dispatch (claim loop). Design the contract first.

**Plan:** ship **L1+L2** now — low-risk, reversible, immediately useful — and treat
**L3** as its own slice once the claim-contract is specified.

## Resolved decisions (2026-06-14)

1. **Priority scheme** → `p0–p3` **labels**. Numeric, visible in-repo, mirrors
   cleanly to `BACKLOG.md`. Explicitly not MoSCoW.
2. **One board or many** → **one Project board per repo.** When the
   Tauri/SlideWright desktop work splits into its own repo, it gets its own board
   (and its own `ROADMAP.md`).
3. **Extraction** → a **one-time maker-checker reconciliation sweep**, code as the
   source of truth (see §Seeding the queue) — not lazy, not hand-transcribed.
4. **Definition of Ready enforcement** → **issue template + an Action gate** on the
   `status:ready` label (see §Definition of Ready).
5. **Hierarchy** → **flat cards, grouped by initiative label/swimlane**; the
   decision doc is the initiative. No native issue-types / sub-issue trees.
6. **Claim atomicity** → **plain assignment for L1+L2; race-free lock designed at
   L3** (branch-creation-as-lock the leading candidate). Don't pre-build it.
7. **WIP limits** → **none at first**; add when throughput data shows a bottleneck.
   Per-agent cap is the first one, arriving with L3.
8. **`ROADMAP.md`** → **separate** from `BACKLOG.md`: curated human narrative
   (strategic, points at the docs) vs generated issue mirror (tactical, churny).

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

Implement **L1+L2** as a single slice: label taxonomy → `tools/sync-backlog.js` +
`BACKLOG.md` → the per-repo Project board + PR automation → the DoR template +
label-gate Action → a short `engineering/workflow.md` section documenting the card
lifecycle. Run the reconciliation sweep (§Seeding the queue) to seed the queue.
