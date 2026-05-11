# Developer & agent notes

Durable investigation notes that captured root-cause analysis or
non-obvious decisions worth keeping around — not session scratch, not
in-progress thinking. If a note still teaches something six months
later, it lives here.

## Convention

- Filename: `YYYY-MM-DD-topic.md` (e.g. `2026-04-30-mermaid-theming.md`).
  Date is when the investigation/note was first authored, not when
  it was last edited. ISO order keeps `ls` chronological.
- One root cause or one decision per file. Don't merge unrelated
  investigations.
- Lead with the symptom, then the root cause, then the fix. Future
  readers (human or agent) skim the first paragraph and need to know
  whether the note is relevant before they read on.
- Reference canonical docs (`../architecture.md`, `../theming.md`,
  `../references/*`) when you need to point at how-it-works content.
  Don't restate the canonical doc — link to it.
- When a note is fully absorbed into the canonical docs and adds
  nothing further, delete it. This folder is not an archive.

## What does **not** belong here

- Session-scoped TODOs, scratch experiments, half-finished thoughts.
  Use `.scratch/` (gitignored) for those.
- Step-by-step debugging logs without a conclusion.
- Anything that should be in `CHANGELOG.md` (user-facing changes) or
  `docs/architecture.md` (how the system works).

## Scratch housekeeping

`.scratch/` is the gitignored sandbox for probes, throwaway scripts,
and temp artifacts (used by humans, agents, and tests). Nothing under
it is load-bearing.

- Treat anything older than ~2 weeks as fair game to delete.
- If a file is worth keeping, promote it: docs go under `docs/notes/`,
  source documents go to a sibling folder outside the repo (e.g. the
  gitignored `tokenization/` folder).
- Run `npm run clean:scratch` to delete `.scratch/` entries older than
  14 days. The script is opt-in — it never runs automatically.

## Current notes

- [2026-04-30-mermaid-theming.md](2026-04-30-mermaid-theming.md) — Marp's `:root`
  CSS variable scoping, Mermaid theming contract, CDN-to-local bundle
  migration. Was previously the repo-root `AgentNote.md`.
- [2026-05-04-authoring-proposals.md](2026-05-04-authoring-proposals.md) —
  forward-looking design RFC for the authoring system: component
  model, modifier catalogue, new layout proposals (§3.1–§3.14),
  authoring DX & rollout plan. Explicitly non-canonical; ground
  truth lives in `../references/templates.md` and
  `examples/gallery.md`.
- [2026-05-07-chart-family-proposals.md](2026-05-07-chart-family-proposals.md) —
  companion to the May 4 RFC: chart-family layouts that turn
  list/sublist + inline-code pills into timelines, Gantts, pie /
  progress / kanban, plus adjacent candidates. Same component-model
  frame; same non-canonical status.
- [2026-05-07-ascii-preview-geometry.md](2026-05-07-ascii-preview-geometry.md) —
  canonical 43-wide / pad-2 / gap-5 geometry for every `` ```text ``
  ASCII layout preview in `templates.md`, plus the
  [`tools/ascii-preview.py`](../../tools/ascii-preview.py) auditor
  and builder library.
- [2026-05-10-multi-resolution-strategy.md](2026-05-10-multi-resolution-strategy.md) —
  decision note for multi-resolution support (HD + 4K, candidate 4:3):
  native Marp `@size` + px→rem refactor + CSS container query on section.
  No theme changes; authors opt in via front-matter `size:` key.
- [2026-05-11-rendering-in-the-sandbox.md](2026-05-11-rendering-in-the-sandbox.md) —
  the sandbox can render and rasterise slides — agents should try
  before claiming a visual check needs hand-off. Two-line install
  recipe (`npm install` + `apt-get install poppler-utils`), then build
  with `lattice-emulator.js` and Read the PNGs. Captures the
  `list-editorial .lede` bug that source review missed.
