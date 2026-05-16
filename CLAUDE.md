# Lattice — agent orientation

Lattice is a Marp-based slide-deck engine that renders boardroom-quality
PDFs from Markdown. It is the engine layer of the **SlideWright** org; a
Tauri desktop wrapper (also called SlideWright) embeds the same engine.

**The visual contract is `lattice.css`.** Layouts are palette-blind —
every colour goes through `var(--token)`. Themes (`themes/indaco.css`,
`themes/cuoio.css`, …) supply the tokens.

## Read these before non-trivial work

- **`docs/design-system.md`** — Function · Form · Substance · Finish.
  The canonical four-layer model. Tells you what kind of thing each
  layout, modifier, chart engine, or palette token *is*, and how they
  compose. Authors keep using short names like `cards-grid`; the model
  organizes the catalog, docs, and engine. If you read exactly one
  Lattice document, read this one.
- **`docs/references/workflow.md`** — branching, feature decks, commit
  discipline, the share-the-PDF rule, three-renderer gate. Canonical
  for all workflow conventions; this file is a thin pointer.
- **`docs/references/development.md`** — Node versions, npm scripts,
  test layout, lint, hooks, coverage, CI, integration cache, editor
  setup. Read before changing any tooling, lint config, hook, CI
  workflow, or test infrastructure. Includes the "when you do X, also
  do Y" rules for adding lib files, themes, and scripts.
- **`docs/references/gotchas.md`** — when something behaves strangely,
  check here FIRST. Symptoms in headings are searchable. Add an entry
  BEFORE committing any non-obvious fix; the commit can then link to it.
- **`docs/architecture.md`** — engine internals.
- **`docs/theming.md`** — palette tokens, Mermaid contract.
- **`docs/editorial.md`** — prose rules for the gallery and shipped decks.
- **`docs/skill.md`** — deck-authoring contract.
- **`docs/references/`** — canonical references (design, templates,
  pipeline, mermaid, audit, gotchas, backgrounds).
- **`docs/notes/YYYY-MM-DD-topic.md`** — durable investigation notes.

## Three render paths must agree

Any authoring transform needs to land in all three or the paths drift:

1. **`lattice-emulator.js`** — build-time CLI; inline implementations.
2. **`marp.config.js`** → **`lib/*.js`** — the marp-cli path.
3. **`lattice-runtime.js`** — DOM transforms for marp-vscode preview.

Each transform documents its sibling implementations in a header comment
(see `liftSlotLabel`, `chartFamily`, `splitPanelCounter`). The integration
tier asserts cross-renderer parity on slide count.

## Tests and the regression baseline

- `npm test` — full unit suite (~4s, 334 tests). Inner loop.
- `npm run test:<scope>` — one slice (palette/mermaid/parsing/layouts/cli).
- `npm run test:watch` — re-run on file change.
- `npm run test:integration` — ~30s cold, ~0.2s warm (hash-keyed cache).
  Rebuilds the page-counted decks through both renderers. CI runs this
  before merge; cache is disabled when `CI=true`.
- `npm run test:all` — both tiers.

Full tooling details (scopes, hooks, CI structure, cache behaviour)
live in `docs/references/development.md`.

**Two gallery sets, distinct purposes:**

- **Regression baseline** (CI-asserted page counts in
  `test/fixtures/expected-page-counts.json`): `gallery.md` (89pp),
  `mermaid-gallery.md` (31pp), `kpi-gallery.md` (13pp). A page-count
  drift on any of these fails the integration tier.
- **Long-running editorial decks** (stable and shared, but not
  page-count-asserted): `backgrounds-gallery.md`, `gallery-guide.md`,
  `gallery-jargon.md`. Hand-curated showcases.

The isolation rule applies to **all six** — see workflow.md.

## The visual-iteration loop

**During development: `npm run preview` + `SendUserFile`.** Don't
commit per iteration. The preview tool auto-detects scope from
`git diff` (L0 nothing, L1 single deck, L2 component-scoped, L3
full), rebuilds only what's affected, pixel-diffs against the
last commit, and outputs the file paths to stream via
`SendUserFile`. Per-iteration cost drops from ~30s (build + commit
+ push + reviewer-fetch) to ~10s (build + send).

```text
edit source  →  npm run preview [-- <deck>]  →  SendUserFile <files>
```

Scope detection — what `npm run preview` does for each kind of change:

- L0 (no visual impact) — tests, docs, manifest, README. No build.
- L1 (single deck or example.md) — rebuild + diff that deck only.
- L2 (component CSS / transform) — rebuild every deck using the
  component class; diff per-page across them.
- L3 (shared CSS / engine / theme) — full rebuild of all 23 decks;
  send the top 5 diffs by pixel count.

`--full` overrides to L3 explicitly. `npm run preview:watch <deck>`
runs a file watcher and auto-rebuilds on the desktop (opens the PDF
in your default viewer; viewer reloads when the file changes).

**For desktop authors using VS Code**: the marp-vscode preview pane
is the fastest inner loop — no preview tool needed; the preview
updates live as you edit. `lattice-runtime.js` handles all the
runtime transforms (chart-family, structure post-processing).

**Final commit per PR includes all rebuilt PDFs** — external
reviewers still need raw-URL access to flip through the deliverable.
A pre-commit hook (lefthook) catches the "staged .md without .pdf"
case and the "stale .pdf relative to source" case. Bypassable via
`--no-verify` only as last resort.

The old per-iteration "build + commit + push + share raw URL" loop
is removed. PDFs being out-of-sync with source within a PR is now
caught by the hook instead of by reviewer eyeballs.

## High-friction reminders (the rules you forget)

- **Isolate feature/fix content from the long-running galleries.** Do
  not add slides or modifier examples to any of the six long-running
  decks while a feature is in development. Layouts graduate into them
  in a separate commit after review. See workflow.md.
- **Ship a per-feature demo deck.** Every feature or fix branch creates
  `examples/<slug>.md` (+ committed `.pdf`) so the reviewer can see the
  work in one click. Six to ten slides, title → demo → closing. Full
  authoring + build + share contract in workflow.md.
- **Use `npm run preview` for visual iteration.** Edit → preview →
  `SendUserFile`. No commits per iteration. The preview tool
  auto-detects scope (L0-L3) and surfaces only the affected files.
  See "The visual-iteration loop" above.
- **`SendUserFile` is the primary delivery during dev.** Raw
  `raw.githubusercontent.com` URLs go only in the FINAL PR-summary
  reply (so external reviewers have a permanent link). During
  iteration the user reads the PDF from `SendUserFile` directly.
- **Design before code on rethink requests.** When the user asks to
  "rethink X," write the design model first — name the axes, list
  candidate moves, recommend one. Confirm direction in one round trip
  before editing CSS or transforms. Bundle adjacent decisions in one
  `AskUserQuestion`. Kills the ship → critique → re-ship churn.
- **Commit messages are `area(scope): short summary`.** Match `git log`.
- **No hex literals in layout rules.** Always `var(--token)`.
- **Avoid `:not(:has(...))` / `:is(:has(...), :has(...))` in theme CSS.**
  Silently broken in the Marp preview Chromium build. See
  `docs/references/gotchas.md`.
- **`.scratch/` has a 14-day lifecycle** (`npm run clean:scratch`). Use
  it for throwaway experiments.

## When you can't see the result

For visual changes (CSS, layouts, themes, gallery), tests verify code
correctness, not visual correctness. If you cannot rebuild and inspect
the PDF, **say so explicitly** rather than claim success. Hand off to
the desktop session for the visual check.
