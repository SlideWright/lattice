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

## The gallery decks

Three top-level decks survive in `examples/` after the docs refactor.
Per-component prose lives in `lib/components/<name>/<name>.manifest.json`
and is rendered into `<name>.gallery.pdf` per component. The isolation
rule below applies to the three top-level decks.

**Regression baseline** — page counts asserted in CI (each test file
inlines its expected count; the 58 per-component galleries derive
theirs from `expectedGallerySlideCount(manifest)`):

| Deck | npm script | Slides |
| --- | --- | --- |
| `examples/gallery.md` | `build:gallery` | 89 |
| `examples/gallery-mermaid.md` | `build:gallery-mermaid` | 31 |

A page-count drift on either fails `npm run test:integration`.

**Editorial long-runner** — stable, hand-curated, not page-count
asserted (but still long-running and shared):

| Deck | npm script | Purpose |
| --- | --- | --- |
| `examples/gallery-jargon.md` | `build:gallery-jargon` | Decision-framework deck |

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
   (e.g. branch `feat/legal-layouts` → `examples/legal-layouts.md`,
   branch `fix/mermaid-catdeep` → `examples/mermaid-catdeep.md`).
   Features whose primary purpose is "demonstrate a code-level feature"
   (rather than "showcase a real-world deck") should instead live with
   the feature implementation — see `lib/base/_logo/` for an example
   of a feature demo colocated with its docs and sample asset.
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
the unit of "this design move." Smaller mechanical splits (a typo in
a `<name>.docs.md` after the design ships) get their own commit.

### Share — during dev, `SendUserFile`; at PR end, the raw URL

The visual-iteration loop is **`npm run preview` + `SendUserFile`**
for every change. The preview tool auto-detects scope from
`git diff`:

| Level | What changed | What's built + diffed |
|---|---|---|
| **L0** | tests, docs, manifest, README | nothing |
| **L1** | one deck source, one `example.md` | that deck only |
| **L2** | per-component CSS or transform | every deck using the component |
| **L3** | shared CSS, engine, theme | all decks; top 5 diffs surfaced |

Output is a list of file paths (PDFs + per-page diff PNGs). The
agent reads the list and `SendUserFile`s each one. The user reviews
the bytes directly in chat — no commit, no push, no remote round-trip.

```
edit source  →  npm run preview [-- <deck>]  →  SendUserFile <files>
```

For desktop: `npm run preview:watch -- <deck>` runs a file watcher
that rebuilds on save and opens the PDF in the default viewer (which
auto-reloads). For VS Code users, the marp-vscode preview pane is the
fastest inner loop — no preview tool needed.

**Pre-commit auto-rebuild.** Lefthook's `pdf-rebuild` job
(`tools/build-staged-pdfs.js`) regenerates and re-stages the PDF for
every staged deck markdown — incrementally, only the decks whose source
changed (examples decks, the baseline deck, per-component and bucket
gallery markdown). It supersedes the old `check-pdf-freshness.sh` gate:
rather than failing when a PDF is stale and making you rebuild by hand,
it rebuilds for you. Scope is markdown-only — component CSS, shared CSS,
themes, and the engine affect many decks at once (a full rebuild is
~30 min), so those stay in CI via the integration page-count tests and
`build:galleries:check`. Bypassable via `git commit --no-verify` only
as last resort.

**At PR end, paste the raw URL** on its own line, plain text, last
paragraph of the reply — for external reviewers who don't have the
`SendUserFile` deliverable in their feed:

```
https://raw.githubusercontent.com/slidewright/lattice/<branch>/examples/<slug>.pdf
```

Use `raw.githubusercontent.com`, never `github.com/.../blob/...`
(lower-fidelity web preview) or `github.com/.../raw/...`
(302-redirects).

### Link the Cloudflare preview in the PR body

When a PR changes what the docs site renders, **end the PR body** with the
Cloudflare Pages preview link (last content line, before any footer) so
reviewers can open the live build:

```
🔍 Live preview: https://<alias>.lattice-docs-5ji.pages.dev/
```

**Only include it when the diff actually changes the site.** Cloudflare
rebuilds a preview for every PR, but it only differs from production when
the PR touches a path the docs deploy rebuilds from — `docs/`, `dist/`,
`themes/`, `lib/`, or `marp.config.js` (the same trigger set as
`.github/workflows/docs.yml`). A PR that touches none of those (tests,
`engineering/` docs, CI config) doesn't change the rendered site, so the
link is noise — omit it.

`<alias>` is the **deterministic branch alias**: the head branch name
lowercased, with every non-alphanumeric character replaced by `-` (e.g.
`claude/live-preview-l2eb0c` → `claude-live-preview-l2eb0c`). It always
points at the branch's latest preview and refreshes on every push.
`lattice-docs-5ji` is the project's fixed preview host.

- The URL **404s until the first preview build finishes** (~1–2 min).
  That is expected timing, not a broken link — it resolves once
  Cloudflare deploys.
- Only construct the link when the sanitized alias is **≤ 63 characters**
  (the DNS-label limit). Cloudflare truncates longer names unpredictably,
  so for those, link the PR's **Cloudflare Pages** check instead.
- The per-deployment URL (`<random-hash>.lattice-docs-5ji.pages.dev`) is
  **not** predictable — always use the branch alias, never the hash.

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
- If a fix is non-obvious, add a `engineering/gotchas.md` entry **before** committing. The commit message then links to it.
- Gallery edits: rebuild the PDF (`npm run preview -- <deck>` during dev; include the rebuilt PDF in the PR's final commit).
- Feature decks: rebuild `examples/<slug>.pdf` and include it in the same commit as the `.md` change.

## Before opening a PR

1. `npm test` — full unit suite must be green.
2. `npm run test:integration` — rebuilds both galleries through both renderers; asserts page-count parity. This is the merge gate in CI.
3. `npm run lint` — Biome over every JS file. CI runs this on Node 22/24.
4. If you touched CSS or themes, confirm the visual result in a rebuilt PDF. If you cannot rebuild, say so explicitly — do not claim success.
5. Rebase onto current `main` if the branch has drifted:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

   Two conflicts recur on nearly every rebase here — resolve them
   mechanically, never hand-merge:

   - **Generated artifacts** (`dist/**`, `docs/public/playground/*.js`)
     conflict constantly. Don't merge them by hand — take *either* side just
     to continue (you're about to overwrite it), finish the rebase, then
     **regenerate** with `npm run build` and fold the result into its owning
     commit (`git commit --fixup=<sha>` then `git rebase -i --autosquash`).
     The build is deterministic, so `npm run build:check` on a **clean** tree
     is the real proof HEAD is fresh (uncommitted-but-rebuilt files mask a
     stale HEAD).
   - **`CHANGELOG.md` `## Unreleased`** conflicts every time (everyone
     appends) — resolve by **keeping both** entries, never picking a side.
   - Binary `examples/*.pdf` conflicts: resolve the `.md` first, re-render
     (`npx marp … --pdf`, with `CHROME_PATH` set), `git add` both, continue.

   Force-push the rebased branch with `git push --force-with-lease` — never
   plain `--force`.

For inner-loop iteration, scoped test scripts (`test:palette`, `test:components`, …), `test:watch`, the pre-commit / pre-push / commit-msg hooks, coverage, and the integration-test cache all live in `engineering/development.md`. That file is the tooling reference; this one is the process reference.

## Three-renderer rule

Any authoring transform must land in all three render paths or they drift:

1. `lattice-emulator.js`
2. `marp.config.js` / `lib/*.js`
3. `lattice-runtime.js`

Do not close a feature branch until all three are updated and integration tests pass.

## Merging

- **Merging requires explicit human authorization.** An agent drives the PR to
  green and *asks* to merge — it never merges on its own, and prior approval of
  one PR is not license to merge the next. A human reviews and authorizes every
  merge.
- PRs merge into `main` via **squash-and-merge by default** — across many
  parallel AI sessions a single PR can carry 20+ noisy commits, and squashing
  keeps `main` one reviewable, revertable commit per PR. Use rebase-and-merge
  only for a deliberately curated, atomic commit series (each commit
  independently meaningful). Never a merge commit. (This is the *merge* method;
  it's independent of keeping the branch rebased on `main` before merge — see
  the rebase step above.)
- Delete the remote branch after merge.
- Remove the local worktree if one was used.
- After a squash-merge, your **local `main` has diverged** from the squashed
  `origin/main` (it still carries the pre-squash commits). Don't rebase onto it
  or branch from it — `git fetch origin && git reset --hard origin/main`, or cut
  the next branch straight from `origin/main`. The Stop hook's "N unverified
  commits / rewrite history" nag is exactly this divergence surfacing
  (`origin/main..HEAD` enumerating the stale local commits); the fix is to
  **sync local `main`**, never to force-push or rewrite shared history. GitHub
  is the verification source of truth — squash merges are committed by GitHub
  (`noreply@github.com`) and show **Verified** there regardless of the local
  `%G?` check.
