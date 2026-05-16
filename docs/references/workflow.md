# Lattice — branching and feature workflow

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

1. `npm test` — full unit suite must be green (~4 s, 334 tests, no Chromium / no Marp pipeline). The umbrella script is the gate; scoped scripts below are only for inner-loop iteration. `npm run test:watch` re-runs on file change.
2. `npm run test:integration` — rebuilds both galleries through both renderers; asserts page-count parity. This is the merge gate in CI.
3. `npm run lint` — Biome runs over every JS file. CI runs this on Node 18/20/22/24. `npm run lint:fix` applies safe auto-fixes.
4. If you touched CSS or themes, confirm the visual result in a rebuilt PDF. If you cannot rebuild, say so explicitly — do not claim success.
5. Rebase onto current `main` if the branch has drifted:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

The lefthook pre-commit hook runs Biome on staged files plus the scoped test suites those files affect (via `tools/affected-tests.js` — `lib/palette.js` triggers `test:palette`, etc.; renderers and unknown files fall back to the full unit suite). Pre-push runs the full lint + full unit suite as a safety net. A commit-msg hook validates `area(scope): summary` formatting. `npm install` wires all three automatically via the `prepare` script. Bypass with `--no-verify` only as a genuine last resort.

For coverage visibility on a feature, run `npm run test:coverage` (unit only) or `npm run test:coverage:all` (unit + integration). c8 writes an HTML report to `.scratch/coverage/index.html` and a text summary to the console. Coverage is not a CI gate — it's a diagnostic for "what's untested in the area I'm changing?"

### Inner-loop scoping

When iterating on a single area, run only that area's suite. The umbrella `npm test` / `npm run test:integration` are still the pre-commit gate — scoped runs are for the tight edit-test cycle, not the gate.

| Working on              | Inner-loop command                  |
| ----------------------- | ----------------------------------- |
| A palette or contrast   | `npm run test:palette`              |
| Mermaid var resolution  | `npm run test:mermaid`              |
| Parsers / transforms    | `npm run test:parsing`              |
| A layout (radar, …)     | `npm run test:layouts`              |
| CLI behaviour           | `npm run test:cli`                  |
| Gallery page counts     | `npm run test:integration:galleries`|
| Cross-renderer parity   | `npm run test:integration:parity`   |
| Mermaid end-to-end      | `npm run test:integration:mermaid`  |
| screenshot-slides       | `npm run test:integration:screenshot`|

Files live in `test/unit/<scope>/` and `test/integration/<scope>/`. To add a test, drop it into the matching directory — the scoped script picks it up automatically.

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
