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
- `examples/gallery.md` (89pp), `examples/mermaid-gallery.md` (31pp),
  and `examples/kpi-gallery.md` (13pp) plus their committed PDFs are
  the regression baseline. Page counts live in
  `test/fixtures/expected-page-counts.json`. **When committing gallery
  edits, keep the deck and its rebuilt PDF in the same commit.**

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

## When you can't see the result

For visual changes (CSS, layouts, themes, gallery), tests verify code
correctness, not visual correctness. If you cannot rebuild and inspect
the gallery PDFs, **say so explicitly** rather than claim success. Hand
off to the desktop session for the visual check.
