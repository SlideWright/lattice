# Lattice — agent orientation

Lattice is a Marp-based slide-deck engine that renders boardroom-quality
PDFs from Markdown. It is the engine layer of the **SlideWright** org; a
Tauri desktop wrapper (also called SlideWright) embeds the same engine.

**The visual contract is `lattice.css`.** Layouts are palette-blind —
every colour goes through `var(--token)`. Themes (`themes/indaco.css`,
`themes/cuoio.css`, …) supply the tokens.

## Read these before non-trivial work

- **`docs/references/workflow.md`** — branching, feature decks, commit
  discipline, the share-the-PDF rule, three-renderer gate. Canonical
  for all workflow conventions; this file is a thin pointer.
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

- `npm test` — unit, <100ms, no child processes. Inner loop.
- `npm run test:integration` — ~30s, rebuilds the page-counted decks
  through both renderers. CI runs this before merge.
- `npm run test:all` — both tiers.

**Two gallery sets, distinct purposes:**

- **Regression baseline** (CI-asserted page counts in
  `test/fixtures/expected-page-counts.json`): `gallery.md` (89pp),
  `mermaid-gallery.md` (31pp), `kpi-gallery.md` (13pp). A page-count
  drift on any of these fails the integration tier.
- **Long-running editorial decks** (stable and shared, but not
  page-count-asserted): `backgrounds-gallery.md`, `gallery-guide.md`,
  `gallery-jargon.md`. Hand-curated showcases.

The isolation rule applies to **all six** — see workflow.md.

**When committing a gallery edit, rebuild the PDF and include it in
the same commit as the `.md` change.** A push without the rebuilt PDF
makes the reviewer's link 404 (or shows stale content).

## High-friction reminders (the rules you forget)

- **Isolate feature/fix content from the long-running galleries.** Do
  not add slides or modifier examples to any of the six long-running
  decks while a feature is in development. Layouts graduate into them
  in a separate commit after review. See workflow.md.
- **Ship a per-feature demo deck.** Every feature or fix branch creates
  `examples/<slug>.md` (+ committed `.pdf`) so the reviewer can see the
  work in one click. Six to ten slides, title → demo → closing. Full
  authoring + build + share contract in workflow.md.
- **Every reviewer link is `raw.githubusercontent.com`.** Last
  paragraph of every reply that updates a PDF, plain text on its own
  line, no markdown. Never `github.com/.../blob/...` (web preview, lower
  PDF fidelity) or `github.com/.../raw/...` (302-redirects anyway).
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
