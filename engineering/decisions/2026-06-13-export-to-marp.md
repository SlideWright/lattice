# Proposal: Export to Marp — the portable deck bundle

**Date:** 2026-06-13 · **Status:** **P1 + P2 + P3 shipped** (`tools/export-marp.js`,
`npm run export:marp`, + the Drawing Board "Marp bundle" export) — see §6 · **Owner:** TBD

> **Implemented (P1 + P2):** the split baker (`lib/core/bake-splits.js`, sharing
> `lib/core/heading-split-core.js` with the live divider so they can't drift),
> the exporter (`tools/export-marp.js` → bundle/zip), and the in-browser render
> (bundled `mermaid` + `lattice-runtime` loaded by two appended `<script>` tags)
> have landed. Decisions taken: **Q1** — ship the self-contained engine for
> zero-install rendering AND a `marp-cli` config (both); **Q2** — diagrams +
> components render client-side from the exported HTML via the injected runtime
> (chosen over server-side SVG pre-bake); **Q3** — the deck's palette + dark
> only. **P3** (Drawing-Board button) remains.
**Related:** `2026-06-13-split-frontmatter.md` (the heading divider + the
"Marp is an export target" reframe), `2026-06-10-marp-replacement-proposal.md`
(engine ownership / P4 retire-marp-cli).

---

## 1. Why

We reframed the architecture: **Lattice's own engine is the source of truth.**
The Drawing Board preview and the PDF export both run our engine, so everything
— the heading divider, eyebrow handling, components, islands — is always
correct there. **Marp is no longer a live render path we keep in lockstep; it is
an export *target*.**

That reframe leaves a promise to keep: a user must be able to take their deck
*out* of Lattice and use it elsewhere. The vision (from the split-headings
discussion):

> "Marp just becomes another format — a zip that has everything the user needs
> to use it with Marp, including all the themes and styles, with a README."

This proposal designs that bundle. It also resolves, properly, the one
documented limitation of the heading divider: stock Marp (incl. the marp-vscode
live preview) doesn't run our splitter, so a separator-free deck under-segments
there. The export fixes that at the source by **baking the computed splits into
literal `---`**.

## 2. The core challenge — "renders in Marp" is layered

A Lattice deck is a *superset* of Marp. Rendering one faithfully outside Lattice
needs several things, and they do **not** all survive in every Marp consumer:

| What the deck needs | How Lattice supplies it | Stock marp-core / **marp-vscode preview** | **marp-cli + our config** |
|---|---|---|---|
| Slide **splitting** (`split: headings`) | `headingSplit` markdown-it plugin | ✗ (only `---`) → **fix by baking `---`** | ✓ |
| **Theme** colours / type / layout CSS | `dist/lattice.css` + palette CSS (`@theme`) | ✓ (register as Marp themes) | ✓ |
| **Fonts** | Google-Fonts `@import` in theme + system fallback | ✓ (online) | ✓ |
| Local **images / assets** | author's paths | ✓ if paths resolve → **fix by localizing** | ✓ |
| **Diagrams** (Mermaid, charts) | runtime / build-time render to SVG | ✗ (raw fence) → **fix by pre-baking SVG** | ✓ |
| **Structural components** (`_class:` layouts — verdict-grid badges, slot-label-lift, split-panels, islands, …) | our markdown-it plugins + HTML-stage transforms | ✗ — vanilla Marp can't run them | ✓ |

The uncomfortable truth: **marp-vscode cannot load a custom engine** (it runs
stock marp-core + registered theme CSS, by design). So the structural component
transforms can *never* run in the marp-vscode preview. Splits, theme styling,
and pre-baked diagrams can be made to carry; rich `_class:` layouts cannot.
`marp-cli`, by contrast, accepts `--config-file`, so with our engine bundled it
reproduces the deck **exactly**.

So "export to Marp" is really **two fidelity tiers**, and the bundle should
serve both honestly.

## 3. Goals / Non-goals

**Goals**
- A one-action **"Export to Marp"** that produces a self-contained `.zip`.
- The bundle renders the deck at **full fidelity** through `marp-cli`.
- The bundle's `.md` is **decent in stock tools** (marp-vscode preview): correct
  slide boundaries (baked `---`), correct theme styling, pre-rendered diagrams —
  degrading gracefully only on structural `_class:` layouts.
- Self-contained: themes, assets, fonts-reference, a README, and a one-line
  render command. No hidden dependency on Lattice's repo or hosted tool.

**Non-goals**
- Making the stock marp-vscode preview reproduce structural component layouts
  (impossible without a custom engine — explicitly out of scope).
- Round-tripping back from the bundle into a Lattice project.
- Changing the live Lattice render paths (this is additive — an exporter).

## 4. Proposed bundle

```
my-deck.zip
├── my-deck.md            # splits baked to ---, asset paths localized, diagrams pre-baked
├── themes/
│   ├── lattice.css       # the palette-blind engine stylesheet (dist/lattice.css)
│   ├── <palette>.css      # the deck's theme + its -dark variant
├── assets/               # every local image/diagram the deck references (SVG for baked diagrams)
├── marp.config.cjs       # the Lattice engine config (full fidelity via marp-cli)
├── package.json          # deps: @marp-team/marp-cli (+ the lattice engine pieces the config needs)
└── README.md             # quick start, both tiers explained
```

**README quick start (two tiers):**
- **Full fidelity:** `npm install && npx marp my-deck.md --config-file marp.config.cjs -o my-deck.pdf`
- **Quick preview:** open `my-deck.md` in VS Code with the Marp extension after
  pointing `markdown.marp.themes` at `themes/lattice.css` + `themes/<palette>.css`
  — slides split correctly and are styled; rich component slides show simplified.

## 5. The export pipeline

A new `tools/export-marp.js` (and a Drawing-Board action) that, given a deck
source + resolved palette, emits the bundle. Steps:

1. **Bake splits → `---`.** Resolve `split:` (`lib/core/resolve-split.js`); if
   `headings` (the default), run a **source-level** sibling of `headingSplit`
   that inserts literal `\n\n---\n\n` at the exact eyebrow-aware/hybrid
   boundaries the token splitter computes, then drop the now-redundant `split:`
   key. Must be **parity-tested against `headingSplit`** (same slide boundaries,
   same eyebrow pull-back) — share the eyebrow definition (`code:only-child`).
2. **Localize assets.** Copy every referenced local image into `assets/` and
   rewrite paths; leave remote URLs as-is (note them in the README).
3. **Pre-bake diagrams.** Render Mermaid + chart-family fences to SVG (the
   emulator already does this for PDF) and embed/reference them, so even stock
   tools show the diagram rather than a raw fence.
4. **Package themes.** Copy `dist/lattice.css` + the deck's palette (and `-dark`)
   into `themes/`; write the `@theme`/`markdown.marp.themes` guidance.
5. **Emit config + manifest.** A portable `marp.config.cjs` (the Lattice engine
   — likely the existing bundled `dist/lattice-emulator.js` surface, or a slim
   config that `require`s the published `@slidewright/lattice` package) +
   `package.json` pinning versions.
6. **Write README** with the two-tier quick start + a note on what degrades in
   stock tools.
7. **Zip** and hand back.

**Verification:** rendering the bundle through `marp-cli` must reproduce the
Lattice PDF — gate with `tools/pixel-check.js` against the emulator's output on
a representative deck.

## 6. Phasing (recommended)

- **P1 — Source-faithful bundle (the meat). ✅ DONE.** Steps 1, 2, 4, 5, 6, 7 +
  the full-fidelity config + a bundled zero-install engine. Delivers portable
  files, baked splits (fixing the preview-splitting concern), themes, localized
  assets, and exact rendering via the bundled engine or `marp-cli`. Diagrams
  render there; raw fences in stock preview. (`tools/export-marp.js`.)
- **P2 — In-browser render via injected scripts. ✅ DONE.** Rather than
  pre-baking SVG, the exporter packages `mermaid-v11.min.js` +
  `lattice-runtime.min.js` and appends two `<script>` tags (under a
  `markdownlint-disable MD033`) at the end of the deck. When the deck is exported
  to HTML and opened in a browser, the runtime renders Mermaid/chart diagrams
  **and** the structural components client-side — closing most of the stock-tool
  fidelity gap without a server-side render step. (Verified: the exported HTML
  renders a Mermaid flowchart to SVG in a headless browser.)
- **P3 — Drawing-Board UI. ✅ DONE.** A "Marp bundle" item in the Export menu,
  wired to the SAME pipeline in the browser: the split baker + the bundle spec
  (templates + asset manifest) are exposed on the playground engine
  (`window.LatticePlayground.marp`, from `lib/core/marp-bundle.js` —
  the same module the CLI uses), the minified static assets are staged under
  `playground/v/<hash>/export/` (sync-playground-assets), fetched, and zipped via
  JSZip for download. The bundle ships **minified** JS/CSS under the canonical
  names (emulator 1.5 MB → 360 KB, lattice.css → 361 KB) and DEFLATE-compresses
  to ~1.2 MB. Verified: the in-browser export downloads a valid bundle that
  renders, menu checked at desktop/tablet/mobile.

## 7. Open questions (need a decision)

1. **Config delivery.** Ship the **prebuilt `dist/lattice-emulator.js`** as the
   bundle's renderer (one file, zero install, but it's "the Lattice CLI" not
   literally `marp`), **or** a thin `marp.config.cjs` + a `package.json` that
   installs `@slidewright/lattice` from npm (true `marp-cli`, needs `npm i` +
   the package being published)? *Recommendation: the published-package config*
   — it's genuinely "use it with Marp," but it depends on us publishing the
   engine to npm (status?).
2. **Diagrams in P1.** Ship P1 with diagrams rendering only under `marp-cli`
   (raw fences in stock tools), or pull the SVG pre-bake (P2) into P1 so the
   `.md` is good everywhere? *Recommendation: P1 without it; add in P2.*
3. **Scope of "themes" in the zip** — only the deck's palette (smallest), or the
   full palette set (so the user can re-theme)? *Recommendation: the deck's
   palette + dark variant only.*

## 8. Risks

- **Component fidelity gap is inherent** for stock tools — must be set as an
  honest expectation in the README and docs, not papered over.
- **Split-baking drift:** the source-level baker must stay identical to
  `headingSplit`. Mitigation: a shared eyebrow definition + a parity test that
  runs both over the corpus and asserts identical boundaries.
- **Asset/path edge cases** (remote images, data-URIs, fonts behind a CDN the
  user can't reach offline).
- **npm publish dependency** (Q1) — full `marp-cli` fidelity presumes the engine
  is installable.

## 9. Follow-ups / sequencing

This is downstream of the merged heading-divider work. Suggested order: settle
Q1 (config delivery) → build P1 → P2 → P3. None of it blocks current decks; it's
purely additive.
