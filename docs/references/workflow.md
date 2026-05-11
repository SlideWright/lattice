# Lattice — branching and feature workflow

## Branch naming

| Prefix | When to use | Example |
|--------|-------------|---------|
| `feat/` | New capability or layout | `feat/background-tokens` |
| `fix/` | Bug fix | `fix/mermaid-catdeep` |
| `chore/` | Maintenance, gallery rebuilds, deps | `chore/gallery-rebuild` |
| `docs/` | Documentation only | `docs/workflow` |

Branch names use kebab-case. No ticket numbers, no dates in the name.

### Agent-created branches

Branches created by an agent harness carry a `claude/` namespace prefix.
The fix/feat/chore/docs token still goes inside it, so the work type is
visible at a glance: `claude/fix/<slug>`, `claude/feat/<slug>`,
`claude/docs/<slug>`. A bare `claude/<slug>` is non-conforming — rename
it before opening a PR, or pick the right token when starting the
branch.

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
- Message format: `type(scope): short summary` — follow `git log` for
  the established pattern.
- **The `type` tracks the user-visible effect of the change, not the
  file type.** A doc-only edit that corrects a defective rule is
  `fix(workflow):`, not `docs(workflow):`. A doc-only edit that adds
  new authoring guidance is `feat(docs):` or `docs(...)`. If the
  change fixes a bug — in code or in a rule — use `fix`. If it adds
  a capability — even a documented one — use `feat`. `docs(...)` is
  for additions and clarifications, not corrections.
- The `type` on the commit should match the branch's `type` token
  (see Branch naming). A `fix/...` branch produces `fix(...)` commits.
- If a fix is non-obvious, add a `docs/references/gotchas.md` entry
  **before** committing. The commit message then links to it.
- Gallery edits: rebuild the PDF and include it in the same commit as
  the Markdown change.

## Before opening a PR

1. `npm test` — unit suite must be green (<100 ms, no child processes).
2. `npm run test:integration` — rebuilds both galleries through both renderers; asserts page-count parity. This is the merge gate in CI.
3. If you touched CSS or themes, **render and inspect** the affected
   slides — source review will not catch grid auto-placement
   collisions, baseline drift, or overflow. The sandbox can almost
   always render: `npm install` + `apt-get install -y poppler-utils`,
   then `node lattice-emulator.js <deck>.md /tmp/out.pdf indaco`,
   `pdftoppm -r 110 -png /tmp/out.pdf /tmp/slides/s`, and Read each
   PNG. Only if the render genuinely fails do you hand off the visual
   check — and say what you tried. Don't pre-emptively claim a
   limitation you haven't tested. Recipe + failure modes:
   `docs/notes/2026-05-11-rendering-in-the-sandbox.md`.
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
