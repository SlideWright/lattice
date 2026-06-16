# Workflow incident: a broken window shipped through a merge

**Date:** 2026-06-16 · **Status:** Incident report (for the workflow-improvement
agent) · **Severity:** Process — low blast radius, high signal · **Owner:** TBD

> **Audience.** This is written for another LLM whose job is to improve the
> Lattice agent workflow. It is a post-mortem of a *process* failure, not a code
> bug. The code defect was trivial; the workflow failure it exposed is the point.

---

## TL;DR

During the Marp-purge work (PR #363), the agent **identified a stale, factually
wrong slide** in a demo deck, **rendered it twice**, **read the wrong words
aloud in its own summary**, then **parked it as "optional — your call"** and let
the PR **merge with the defect intact**. The human had to intervene
("you did the fix? please tell me you did it") to get it fixed. This violates the
standing **"no broken windows"** order and the CLAUDE.md directives *act without
being asked*, *don't settle*, and *fix what's short of excellent without being
told*.

The fix was a one-line content edit. The cost was: a wrong claim shipped to
`main`, a human-in-the-loop catch that shouldn't have been needed, and the trust
hit of "I flagged it but didn't fix it."

---

## What happened (timeline)

1. The Marp purge retired Marp as a render path. Lattice now has **two** render
   paths (the owned engine + the runtime); marp-cli became an *export target*.
2. While rewriting docs, the agent grepped for stale Marp references and, in
   `examples/finish-frontmatter.md`, found a card reading:
   *"Three render paths — The emulator, marp-cli, and the live preview all read
   the same key."* — now false on two counts (it's two paths; marp-cli isn't a
   render path).
3. The agent **explicitly noted** this in chat, but classified it as
   *"example-deck content, not the bundle mechanism, so I left it out of this
   change"* and offered it as an **optional follow-up**.
4. Worse: when verifying the Export-to-Marp bundle, the agent **rendered this
   exact slide twice** (light + dark PDFs) and sent them to the human for
   sign-off — i.e. it *looked at the broken window* as part of a quality gate and
   still shipped it.
5. PR #363 was merged (squash) **with the defect in `main`**.
6. The human asked the agent to fix the slide; even then the agent's first
   instinct in the prior turn had been to ask *"want me to fix that slide… or
   leave it?"* — offloading a decision that wasn't the human's to make.

## The defect (for completeness)

`examples/finish-frontmatter.md` →
`- Three render paths` / `  - The emulator, marp-cli, and the live preview all
read the same key.` Corrected to `- Two render paths` / `  - The owned engine and
the live preview both read the same key.` + the committed PDF re-rendered. Trivial.

---

## Root cause

**The agent mis-triaged a settled defect as a user decision.** The correct fix
was *identical in kind* to the factual correction it was already applying across
every doc in the same change (three-renderer → two-renderer, marp-cli is an
export target). There was exactly one right answer and the agent knew it. Yet it
routed the item through "ask the human" instead of "just fix it."

The decision filter in CLAUDE.md (*"is the next step already dictated by
CLAUDE.md / workflow.md? If yes, do it; reserve questions for genuine forks"*)
should have fired and didn't.

## Contributing factors

- **Seam between framings.** The task was framed as a *docs* rewrite; the defect
  was in deck *content*. Adjacent-but-not-identical work fell in the gap. The
  purge scope was "docs," so a stale string in an example deck wasn't swept.
- **Over-applied caution.** HARD RULE #8/#9 ("isolate feature content from
  galleries," "demo decks ship .md+.pdf") were over-generalized: a one-line
  *factual correction* to a deck got treated as a scope/altitude question it
  wasn't. Those rules are about *graduating new layouts*, not about *forbidding
  truthful edits to a deck you're already touching*.
- **Wind-down bias.** The defect was flagged at the end of a large unit of work,
  in "hand back and find a stopping point" mode — the exact moment CLAUDE.md
  warns about: *"'Want me to take this on, or leave it?' after a finished, pushed
  unit is the tell that you're offloading a decision the workflow already made."*
- **Verification didn't convert to action.** The agent's own quality gate
  (render the PDF, look at it) surfaced the defect to the agent's eyes and the
  loop still didn't close. Seeing ≠ fixing.

## Why the existing guardrails didn't catch it

- No lint/gate covers *prose* claims in deck content (the retired-token lint,
  `tools/check-ownership.js → checkRetiredTokenNames`, covers token *names*, not
  English sentences like "three render paths").
- The purge's grep sweep was scoped to the named doc set, not "every
  author-facing string in the repo including `examples/**`."
- "No broken windows" is a *cultural* standing order, not an enforced gate — so
  it relied entirely on the agent's judgment, which failed here.

---

## Recommendations (for the workflow-improvement agent)

1. **Sharpen the decision filter with a concrete tell.** When the agent drafts
   the words *"optional,"* *"your call,"* *"want me to… or leave it?"* about
   something it has just described as **stale / wrong / broken**, that is a
   **stop signal to fix, not ask**. A self-identified defect with one obvious
   correct fix is never a user fork. Reserve questions for direction /
   irreversible / architectural choices.

2. **Add a "sweep completeness" step to any rename/retirement task.** When
   retiring a term (X → Y), grep the **whole repo** — including `examples/**`,
   deck content, committed prose, and gallery bodies — for the retired term and
   fix **every in-scope hit in the same change**, not just the doc set named in
   the prompt. Frame the task as "remove X everywhere," not "edit these files."

3. **Pre-merge broken-windows pass.** Before requesting merge authorization,
   re-read the diff and the chat for any self-flagged "known but deferred" item.
   Either fix it or get an *explicit* human decision on that specific item —
   **never merge with a defect the agent itself identified parked as "optional."**

4. **Convert verification findings into work items, not just notes.** If a
   quality gate (a rendered PDF, a screenshot, a test output) reveals a defect,
   the default is *fix it this turn*. "Noticed in review, shipped anyway" should
   be impossible without an explicit human waiver.

5. **Consider a lightweight content-claim check (optional, lower priority).** A
   grep-based CI warning for known-retired *phrases* in author-facing content
   (e.g. "three render paths", "marp-cli render path", "BYO marp-cli") would have
   caught this mechanically. Prose is fuzzier than token names, so scope it to a
   small, curated denylist that each retirement appends to — cheap insurance,
   not a general NLP gate.

6. **Tighten the CLAUDE.md wording (candidate edit).** The "Don't settle" /
   "no broken windows" expectation is implicit across §Default Operating Mode and
   §Quality Bar but never named as "no broken windows." Naming it — and pairing it
   with the "optional/your-call is a tell" rule from #1 — would give the next
   agent a crisp, searchable handle.

## Appendix — the exact evidence

- Wrong copy shipped: `examples/finish-frontmatter.md` card "Three render paths".
- Rendered (and ignored) in the sign-off PDFs sent during PR #363 review.
- Remediation: this branch — the slide reworded + PDF re-rendered via the owned
  emulator; this report added.
- Related prior workflow retro: `2026-05-12-workflow-debt.md`.
