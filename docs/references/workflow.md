# Lattice — branching and feature workflow

## Walkthrough — from idea to merged

End-to-end procedure for a new feature or fix. The detailed sections
below are the reference; this one is the recipe.

### 1 · Start the branch

```bash
git checkout main && git pull
git checkout -b feat/<noun>          # feat/ fix/ chore/ docs/, kebab-case
git push -u origin feat/<noun>       # remote backup from day one
```

Parallel work uses worktrees (`git worktree add ../Lattice-X feat/X`)
so you don't stash.

### 2 · Design (only for visual or rethink work)

If the task is a "rethink X" or any open-ended visual decision,
**respond with the design model first** before touching code: name
the axes, list candidate moves, recommend one. Bundle adjacent open
questions into one `AskUserQuestion`. Confirm direction in one
round trip. Skip this step for mechanical fixes.

### 3 · Build in the engine

Change goes in `lattice.css` (visual contract) and/or `lib/*.js`
(transforms). Pure-CSS work is single-file; transform work has to
land in all three render paths — see "Three-renderer rule" below.

### 4 · Build the per-feature demo deck

This is the reviewer's entry point. They read the PDF via the PR
link; they don't rebuild locally.

```bash
$EDITOR examples/<noun>.md           # e.g. examples/roadmap.md
                                     # 6-10 slides: title → demo → closing
node lattice-emulator.js examples/<noun>.md examples/<noun>.pdf
```

**Do not touch the six long-running decks** during iteration — see
"The two gallery sets" below for the list and rationale.

### 5 · Iterate, commit, push

Each design decision is **one commit** that bundles
`lattice.css` + `lib/*.js` + `examples/<noun>.md` +
`examples/<noun>.pdf` together. Don't split mechanically — the
design move is the atom.

Commit messages: `area(scope): short summary` (match `git log`).

For non-obvious fixes, add a `docs/references/gotchas.md` entry
**before** committing; link to it from the commit body.

### 6 · Share — after every push

Last paragraph of every reply that updates a PDF:

```
https://raw.githubusercontent.com/slidewright/lattice/<branch>/examples/<noun>.pdf
```

Plain text, on its own line, no markdown. Never `github.com/.../blob/...`
or `github.com/.../raw/...` — see "Share — every push, every time"
below for the full convention.

### 7 · Before opening the PR

```bash
npm test                             # unit, must pass (<100ms)
npm run test:integration             # rebuilds baselines, ~30s
git fetch origin && git rebase origin/main   # if drifted
```

If you touched visuals but can't rebuild and inspect, **say so
explicitly** rather than claim success.

### 8 · Open the PR, review, merge

- PRs merge via squash or clean rebase. No merge commits.
- After merge: delete the remote branch, remove the local worktree.

The per-feature deck stays in `examples/` as a permanent record of
what the feature looked like at ship time. (An archive policy is
proposed in `docs/notes/2026-05-12-workflow-debt.md` — not yet
adopted.)

### 9 · Graduate (separate commit, post-review)

If the new layout or fix belongs in the long-running decks
(usually yes), file a **separate commit** on a short-lived
`chore/<noun>-graduation` branch that:

- Adds a slide to `gallery.md` and / or `gallery-guide.md` showing
  the new layout in context.
- Updates `test/fixtures/expected-page-counts.json` if the page
  count drifts.
- Rebuilds the baseline PDF in the same commit.
- Updates `docs/references/templates.md` if a new modifier is being
  documented.

The graduation trigger is currently manual. Automation is proposed
in `docs/notes/2026-05-12-workflow-debt.md`.

---

## Branch naming

| Prefix | When to use | Example |
|--------|-------------|---------|
| `feat/` | New capability or layout | `feat/background-tokens` |
| `fix/` | Bug fix | `fix/mermaid-catdeep` |
| `chore/` | Maintenance, gallery rebuilds, deps | `chore/gallery-rebuild` |
| `docs/` | Documentation only | `docs/workflow` |

Branch names use kebab-case. No ticket numbers, no dates in the name.

## Starting a feature

Always branch from `main`:

```bash
git checkout main && git pull
git checkout -b feat/my-feature
git push -u origin feat/my-feature   # push early — remote backup from day one
```

## Working on multiple features in parallel

Use git worktrees so each feature lives in its own directory with no stashing or branch-switching:

```bash
# From the primary Lattice directory
git worktree add ../Lattice-contrast-audit feat/contrast-audit
git worktree add ../Lattice-pill-layout feat/pill-layout

# List active worktrees
git worktree list

# Remove when the branch is merged
git worktree remove ../Lattice-contrast-audit
```

Each worktree is fully independent — you can run `npm test` in both simultaneously. The `.git` metadata is shared; branches see each other.

## The two gallery sets

The repo distinguishes **two kinds of long-running decks**, and the
isolation rule below applies to both:

**Regression baseline** — page counts asserted in CI via
`test/fixtures/expected-page-counts.json`:

| Deck | npm script | Slides |
| --- | --- | --- |
| `examples/gallery.md` | `build:gallery` | 89 |
| `examples/mermaid-gallery.md` | `build:mermaid` | 31 |
| `examples/kpi-gallery.md` | `build:kpi` | 13 |

A page-count drift on any of these fails `npm run test:integration`.

**Editorial long-runners** — stable, hand-curated, not page-count
asserted (but still long-running and shared):

| Deck | npm script | Purpose |
| --- | --- | --- |
| `examples/backgrounds-gallery.md` | `build:backgrounds` | Background tokens |
| `examples/gallery-guide.md` | (manual) | Layout field guide |
| `examples/gallery-jargon.md` | (manual) | Decision-framework deck |

## Feature decks

**Every feature or visual-bug branch ships a per-feature demo deck.** This
is how reviewers see the work: a small, focused PDF on the branch, linked
directly from the PR body. It is independent of all six long-running
decks listed above.

**Feature/fix content is isolated to the feature deck until merge.** Do
not add new slides, new modifiers, or new copy into any of the six
long-running decks while the feature is in development — the
regression baseline would churn (page counts, parity tests) on every
iteration, and the editorial decks would lose their hand-curated
coherence. The long-running decks pick up the new layout in a separate
"graduation" commit after the feature has been reviewed and approved.

### Authoring

1. Create `examples/<feature-slug>.md`. The slug matches the branch noun
   (e.g. branch `feat/roadmap-redesign` → `examples/roadmap.md`,
   branch `fix/mermaid-catdeep` → `examples/mermaid-catdeep.md`).
2. Keep the deck small — title slide, one slide per surface the work
   changes, closing. Six to ten slides is the comfortable cap.
3. Use the same front matter as the galleries (`marp: true`, `theme:
   indaco`, `paginate: true`, a deck-scoped `header:`).
4. Author the slides as you would any boardroom deck — the eyebrow
   above the heading, the heading itself, the demo, and a one-line
   below-note explaining the change.

### Build

Run the emulator directly — no npm script is added per feature:

```bash
node lattice-emulator.js examples/<feature-slug>.md examples/<feature-slug>.pdf
```

Commit `examples/<feature-slug>.md` and `examples/<feature-slug>.pdf`
together. If you push without the rebuilt PDF the reviewer's link
404s — that is the bug the convention prevents.

### Iteration cycle

Feature decks are built to iterate fast. Three rules keep the cycle
from churning:

**Design before code.** When a design decision is open ("rethink the
pill," "what glyphs make sense?"), write the model first: name the
axes you're working on, list the candidate moves, recommend one.
Confirm direction in a single round trip before touching CSS. This
avoids the "ship → critique → re-ship" loop that ends up costing
three or more build cycles to land what could be done in one.

**Bundle adjacent decisions.** When one design move depends on two
or three downstream picks, surface all of them in one
`AskUserQuestion`, not sequentially as each becomes evident. A
bundled question costs one round trip; three sequential ones cost
three build cycles.

**Atomic commits per design decision.** One thematic change (e.g.
"swap pill placement to meta-on-the-right") ships in one commit that
covers CSS + transforms + examples + docs together. The commit is
the unit of "this design move." Smaller mechanical splits (a typo
in templates.md after the design ships) get their own commit.

### Share — every push, every time

After every push that updates a feature-deck PDF, paste the raw URL
**on its own line, plain text, last paragraph of the reply**. No
markdown bold, no backticks, no link text, nothing else on the line.

```
https://raw.githubusercontent.com/slidewright/lattice/<branch>/examples/<slug>.pdf
```

**Every link presented to the reviewer must use the
`raw.githubusercontent.com` host.** That's the canonical CDN for
downloadable file content — the file streams straight to the
reviewer's browser at full fidelity. Never present:

- `github.com/.../blob/<branch>/<path>` — this renders as the GitHub
  web preview UI (chrome, headers, blob viewer). The reviewer has to
  click "Raw" or "Download" to actually see the file. PDFs render in
  GitHub's viewer at lower fidelity than the raw stream.
- `github.com/.../raw/<branch>/<path>` — superficially works but
  302-redirects to `raw.githubusercontent.com`. Use the canonical
  host directly; one hop is fewer than two.

This is the reviewer's only entry point to see the work. Forgetting
it means the reviewer has to ask, which adds a round trip and erodes
trust in the workflow.

### When the deck retires

Feature decks live on the branch. They are not deleted when the branch
merges — they stay in `examples/` as a permanent record of what each
feature looked like at ship time, and as ready-made source for the
gallery editor to fold into the long-running decks if the layout
graduates from "new" to "documented". Treat them like
`chart-family-experiment.md` and `image-concepts.md`.

## Commit discipline

- Small, focused units. One logical change per commit.
- Message format: `area(scope): short summary` — follow `git log` for the established pattern.
- If a fix is non-obvious, add a `docs/references/gotchas.md` entry **before** committing. The commit message then links to it.
- Gallery edits: rebuild the PDF and include it in the same commit as the Markdown change.
- Feature decks: rebuild `examples/<slug>.pdf` and include it in the same commit as the `.md` change.

## Before opening a PR

1. `npm test` — unit suite must be green (<100 ms, no child processes).
2. `npm run test:integration` — rebuilds both galleries through both renderers; asserts page-count parity. This is the merge gate in CI.
3. If you touched CSS or themes, confirm the visual result in a rebuilt PDF. If you cannot rebuild, say so explicitly — do not claim success.
4. Rebase onto current `main` if the branch has drifted:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

## Three-renderer rule

Any authoring transform must land in all three render paths or they drift:

1. `lattice-emulator.js`
2. `marp.config.js` / `lib/*.js`
3. `lattice-runtime.js`

Do not close a feature branch until all three are updated and integration tests pass.

## Merging

- PRs merge into `main` via squash or a clean rebase — no merge commits.
- Delete the remote branch after merge.
- Remove the local worktree if one was used.
