---
status: design-speculation
version: 1
supersedes: none
last-status-update: 2026-06-09
---

# Asset import — bringing third-party images, themes, and datasets into decks

> **Not canonical.** Design-speculation, written ahead of implementation.
> No shipped behaviour yet. When this note and a shipped surface disagree,
> the shipped surface wins. The purpose here is to fix the *shape* of the
> capability — especially the determinism contract and the scope model —
> before any code lands.

The prompt (2026-06-09): authors should be able to **import assets** —
images (a third-party picture to drop on a slide), styles (a third-party
theme), or small datasets (for data visualization) — from the local
machine *or* the web, use them in decks, and have them **persist**.
Open question raised alongside it: **per-deck or global?**

This note argues the answer is decided almost entirely by one existing
constraint, splits the three asset types because they are not the same
shape, and recommends a phased rollout.

## The governing constraint: the deck is the unit of reproducibility

Lattice's contract is that a `.md` deck plus the engine renders to a
byte-stable PDF through all three render paths, and those PDFs are
hash-gated regression baselines: 58 component galleries × 2 themes, 9
bucket surveys × 2 themes, and the CI baseline decks (see CLAUDE.md
"Tests and the regression baseline"). **Anything the PDF depends on must
be materialized within reach of the deck at build time.**

That single fact decides most of the design:

- A live `![](https://…)` or a remote `theme:` URL makes the build
  non-hermetic — network at render time, link rot, and non-deterministic
  baselines. The integration tier (`npm run test:integration`) would go
  flaky the first time a remote source changed or went down, and CI
  disables the cache (`CI=true`), so it would hit the network on every run.
- Therefore **"import" must mean fetch-once-and-vendor**, never
  live-reference. The web is a *source*, never a *binding*.

### What an import operation is

A single verb: **fetch → write a local copy → content-address (hash) →
record provenance**. Provenance = source URL (or "local"), license if
known, fetched-date, and the content hash. Persistence falls out for
free: the persisted thing is the vendored file plus a manifest/lockfile
entry. Nothing exotic is required to "persist" an import — the vendored
bytes *are* the persistence, and they ride along in git like every other
deck input.

## The three asset types are not the same shape

They split cleanly, and the split is what actually answers per-deck vs
global.

### Images — per-deck, low risk, half-built already

Images are almost always deck-specific *content*. They already work as
bare relative paths under `allowLocalFiles: true`
(`marp.config.js`) — e.g. `![bg fit](../lib/components/imagery/image/
sample-image.svg)` in `examples/gallery-jargon.md`. The missing pieces
are small:

1. A tidy deck-local sidecar to vendor into (`<deck>.assets/` or an
   `assets/` dir beside the deck).
2. A vendoring tool that fetches a local-path or URL image, copies it in,
   hashes it, and records provenance.

Resolution stays exactly what Marp already does (a relative path), so the
three-renderer parity cost is low — the new logic is the *import* tool,
not the *resolution*.

### Datasets — per-deck, but a genuinely new capability

This is the heaviest item and should be **scoped separately**. Lattice
charts are authored *inline* today: markdown bullets/tables → SVG via the
`chart-family` transform (`lib/components/chart/_chart-family/`). "Import
a dataset" implies a **data-binding layer that does not exist yet** —
something like `![chart](sales.csv)` or a fenced block that references an
external file, plus a data → chart transform that has to land in **all
three render paths** (emulator inline impl, marp-cli `lib/core` +
chart-family, runtime bundle) or the paths drift.

That is a new architectural bet, not an asset-resolution tweak. It is
probably the most *valuable* long-term feature (live-ish data viz is a
real differentiator) and the most likely to break determinism if done
carelessly. The same rule saves it: **vendor a data snapshot at import
time; never fetch at build.** A re-import is an explicit author action
that updates the snapshot and the hash — visible in the diff, gated by
the PDF baseline.

### Themes — project-level, the genuinely shareable artifact

A third-party theme is useful across many decks, so unlike images and
datasets it wants a **project-level** home, not a deck-local one. But the
existing gotcha governs: a theme only takes effect if it is registered in
`marp.config.js` `themeSet` (and the emulator anchors its own resolution)
— otherwise the deck renders palette-less (white bg, no tokens). See
`engineering/gotchas.md` "themeSet requirement" and `design/theming.md`
for the token contract every palette must satisfy.

So "import a theme" = drop the `.css` under `themes/`, register it in
`themeSet`, and validate it against the token contract. A tool can
automate all three. A *deck-local* theme override is possible as a
stretch, but it would require the same resolution rule in all three
renderers and is not worth it for v1.

## Per-deck or global? — three scopes, one rule

The honest model is **three scopes**, governed by a single rule:

> **Global is only ever a discovery/seeding layer. The actual binding is
> always materialized locally.**

1. **Deck-local** (`<deck>.assets/`) — where images and dataset
   snapshots live and what the PDF resolves against. Keeps the deck
   self-contained, so `git clone` + CI on another machine still render
   identically.
2. **Project-level** — themes registered for the repo (`themes/` +
   `themeSet`). Shared across the repo's decks by construction.
3. **User/machine library** — a desktop convenience, and a **SlideWright
   (Tauri) concern, not an engine concern.** The library is where an
   author browses images/themes they have collected; *using* one **copies
   it into the deck** (or registers the theme into the project). It never
   stays a live global reference — a global reference cannot survive
   `git clone` + CI elsewhere, which is the exact failure the governing
   constraint forbids.

So: *global for reuse and discovery, per-deck (or per-project) for the
binding.* Making images globally-referenced would break the baseline the
first time the repo is cloned or rebuilt on a clean machine.

## The things that will bite

- **Determinism / baselines** — covered above; the feature lives or dies
  on "vendor, don't reference."
- **Three-renderer parity** — any *new* resolution rule (a dataset file
  read, a deck-local theme lookup) must land in the emulator, the
  marp-cli config path, and the runtime bundle, or the paths drift. This
  is the recurring tax (CLAUDE.md "Three render paths must agree").
  Image import largely sidesteps it by reusing Marp's existing relative
  path resolution.
- **Provenance / licensing** — boardroom decks get distributed; a
  third-party image or theme carries a license. Record it at import
  (cheap); retrofitting is painful.
- **Tarball discipline** — the `files` allowlist is deliberately narrow
  (~2.3 MB; PDFs and `*.gallery.md` negated). Imported deck assets live
  with decks, which are *not* shipped in the tarball anyway, so this is
  mostly a "don't accidentally widen `files`" reminder.
- **CHANGELOG** — image/theme/dataset import each alter a shipped surface
  (CLI verb, theme registration, a new data-binding syntax), so each gets
  an `## Unreleased` entry when it lands.

## Recommendation — phased

1. **Image import first.** Deck-local `<deck>.assets/` sidecar + a
   `lattice import <path|url>` vendoring tool (fetch, hash, record
   provenance). Lowest risk; reuses existing path resolution; immediately
   useful. Lands with a per-feature demo deck per workflow.md.
2. **Theme import second.** A register tool that drops a `.css` into
   `themes/`, adds it to `themeSet`, and validates the token contract
   from `design/theming.md`. Project-level.
3. **Dataset import as its own design note.** It is a new data-binding
   capability, not asset resolution. Same determinism rule (snapshot at
   import), but it deserves its own proposal covering the
   `![chart](data.csv)`-style syntax, the data → chart transform, and the
   three-renderer parity plan.

## Open questions

- Sidecar shape: `<deck>.assets/` (per-deck dir, travels with one deck)
  vs a shared `assets/` at the deck's folder root (reused across sibling
  decks)? Leaning per-deck dir for isolation, matching the baseline-deck
  isolation rule in workflow.md.
- Manifest format: a sidecar lockfile (`<deck>.assets.lock`) vs a
  front-matter `imports:` block in the deck itself? Front-matter keeps
  provenance visible in the source the author reads; a lockfile keeps the
  `.md` clean. Undecided.
- Desktop library scope: is the user/machine library purely a SlideWright
  feature, or does the engine need a CLI to seed from it? Probably
  SlideWright-only for v1 — see `2026-05-10-tauri-exploration.md` for the
  workspace/settings model it would plug into.
- Dataset re-import policy: explicit author action only, or an opt-in
  "refresh on build" that is forbidden in CI? The constraint says CI must
  never fetch; a local-only refresh flag may be acceptable.
