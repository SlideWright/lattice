# Lattice — agent orientation

Lattice is a Marp-based slide-deck engine that renders boardroom-quality
PDFs from Markdown. It is the engine layer of the **SlideWright** org; a
Tauri desktop wrapper (also called SlideWright) embeds the same engine.

**The visual contract is `lattice.css`.** Layouts are palette-blind —
every colour goes through `var(--token)`. Themes (`themes/indaco.css`,
`themes/cuoio.css`, …) supply the tokens.

## Read these before non-trivial work

- **`docs/references/gotchas.md`** — when something behaves strangely,
  check here FIRST. Symptoms in headings are searchable. Add an entry
  BEFORE committing any non-obvious fix; the commit can then link to it.
- **`docs/architecture.md`** — engine internals.
- **`docs/theming.md`** — palette tokens, Mermaid contract.
- **`docs/editorial.md`** — prose rules for the gallery and shipped decks.
- **`docs/skill.md`** — deck-authoring contract.
- **`docs/references/`** — canonical references (design, templates,
  pipeline, mermaid, audit, gotchas, backgrounds).
- **`docs/references/workflow.md`** — branching, worktrees, PR rules, and
  the three-renderer gate. Read before starting any feature branch.
- **`docs/notes/YYYY-MM-DD-topic.md`** — durable investigation notes.

## Three render paths must agree

Any authoring transform needs to land in all three, or the paths drift:

1. **`lattice-emulator.js`** — build-time CLI; emulates marp-cli for the
   lattice pipeline. Inline implementations live here.
2. **`marp.config.js`** engine wrapper → **`lib/*.js`** — the marp-cli
   path used for direct exports.
3. **`lattice-runtime.js`** — DOM transforms for marp-vscode preview and
   web export.

Each transform documents its sibling implementations in a header comment
(see `liftSlotLabel`, `chartFamily`, `splitPanelCounter` for the pattern).
The integration tier asserts cross-renderer parity on slide count.

## Tests and the regression baseline

- `npm test` — unit, <100ms, no child processes. Inner loop.
- `npm run test:integration` — ~30s, rebuilds both galleries through
  both renderers. CI runs this before merge.
- `npm run test:all` — both tiers.
- `examples/gallery.md` (~71pp) and `examples/mermaid-gallery.md` (~31pp)
  plus their committed PDFs are the regression baseline. Page counts
  live in `test/fixtures/expected-page-counts.json`. **When committing
  gallery edits, keep the deck and its rebuilt PDF in the same commit.**

## House style

- Commits are **small, focused units** with `area: short summary`
  messages (see `git log` for the established pattern). Don't roll many
  unrelated changes into one mega-commit.
- No hex literals in layout rules. Always `var(--token)`.
- Don't introduce `:not(:has(...))` or `:is(:has(...), :has(...))` in
  theme CSS — silently broken in the Marp preview Chromium build. See
  `docs/references/gotchas.md`.
- `.scratch/` has a 14-day lifecycle (`npm run clean:scratch`). Use it
  for throwaway experiments.

## Per-feature demo decks

Every feature or visual-bug branch ships a focused demo deck so the
reviewer can see the work without rebuilding locally:

1. Create `examples/<feature-slug>.md` (slug matches the branch noun
   — e.g. `examples/roadmap.md` for `feat/roadmap-redesign`).
2. Keep it small — title, one slide per surface the work changes,
   closing. Six to ten slides.
3. Build with the emulator one-liner and commit the PDF alongside:
   `node lattice-emulator.js examples/<slug>.md examples/<slug>.pdf`.
4. Link the PDF in the PR body (and in chat replies) using the **raw**
   URL — `/raw/`, not `/blob/`, so the file downloads directly:
   `https://github.com/slidewright/lattice/raw/<branch>/examples/<slug>.pdf`.

**Always present the raw URL after every push.** Last paragraph of the
reply, plain text, on its own line, no markdown bold, no backticks, no
link-text wrapping. Forgetting it means the user has to ask — adds a
round trip and erodes the workflow.

**Isolate feature/fix content from the long-running galleries.** Do
not add slides or modifier examples to `examples/gallery.md` or
`examples/gallery-guide.md` while the feature is in development —
those decks are the regression baseline. The new layout graduates
into them in a separate commit after review.

**Design before code on rethink requests.** When the user asks to
"rethink X," respond with the design model first — name the axes,
list candidate moves, recommend one. Confirm direction in a single
round trip before editing CSS or transforms. Bundle adjacent open
decisions in one `AskUserQuestion`. This kills the ship → critique →
re-ship churn that costs three build cycles to land one decision.

Full convention in `docs/references/workflow.md`.

## When you can't see the result

For visual changes (CSS, layouts, themes, gallery), tests verify code
correctness, not visual correctness. If you cannot rebuild and inspect
the gallery PDFs, **say so explicitly** rather than claim success. Hand
off to the desktop session for the visual check.
