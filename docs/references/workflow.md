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

## Commit discipline

- Small, focused units. One logical change per commit.
- Message format: `area(scope): short summary` — follow `git log` for the established pattern.
- If a fix is non-obvious, add a `docs/references/gotchas.md` entry **before** committing. The commit message then links to it.
- Gallery edits: rebuild the PDF and include it in the same commit as the Markdown change.

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
