# AGENTS.md — authoring Lattice decks with an AI agent

Lattice renders boardroom-quality PDFs from Markdown. A deck is a Marp
Markdown file; each slide opts into a **component** via a
`<!-- _class: <name> -->` directive and fills its slots with ordinary
Markdown. This file orients any AI agent (Claude Code, Copilot, Cursor, an
SDK agent) toward authoring decks correctly. For engine/contributor work,
read `CLAUDE.md` and the `engineering/` docs instead.

## Read these first

- **`design/skill.md`** — the deck-authoring contract. Read before writing
  any slide.
- **`design/design-system.md`** — the Function · Form · Substance · Finish
  model (§2) and how to discover components (§7). One read explains the
  whole catalog's shape.

## The catalog — pick the right component

Every component is described in two generated, always-current files:

- **`dist/docs/components.json`** — machine-readable. One read gives you
  every component's axes, **search tags**, slots, authoring skeleton, and
  `whenToUse` / `antiPatterns` / `related` prose, plus the controlled
  vocabularies. Load this to select a component.
- **`dist/docs/components.md`** — the same, human-readable; the browsable
  `components.html` adds a live filter (by name, description, **or tag**).

**Selecting by intent.** Each component carries 3–5 search tags — the
*searcher's* vocabulary (e.g. `swimlane`, `board-deck`, `percentage`,
`prioritize`). Match the author's intent words to tags, then confirm with
the component's `whenToUse` / `antiPatterns`. Don't pick from memory; the
catalog is the source of truth.

## Author, then lint, then render

```text
edit deck.md  →  npm run lint:deck -- deck.md  →  fix  →  render
```

- **`npm run lint:deck -- <file.md>`** — fast, no-render check for the
  markdown footguns the docs warn about. Run it on every draft and fix all
  errors before rendering. Rules: card-style slides forbid the inline
  `- **Title.** body` shape (use the nested `- Title` / `  - body` shape);
  ordered-list "statement" layouts forbid `**bold**` inside items; class
  typos are flagged. `--json` gives machine-readable output; `--strict`
  fails on warnings too.
- **Render** (needs a Chromium; set `CHROME_PATH` in the cloud sandbox —
  see `engineering/gotchas.md`):

  ```bash
  CHROME_PATH=$(ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome | head -1) \
    npx marp deck.md --config-file marp.config.js --allow-local-files --pdf -o deck.pdf
  ```

## The rules agents most often break

- **Card-style layouts use nested bullets, not inline bold.**
  `- Title` then `  - body`, never `- **Title.** body`. The linter catches
  this; so does the commit gate.
- **Title slides:** `title silent` + a backtick-wrapped `` `eyebrow` `` +
  a plain subtitle paragraph. See `components.json` → `title`.
- **No hand-editing generated files** (`dist/**`, `<name>.docs.md`,
  `<name>.gallery.md`, the snippets file). Edit the manifest and regenerate.
- **Tags, slots, and skeletons come from the catalog**, not from training
  memory — they change as the engine evolves.
