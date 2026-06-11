---
status: design-speculation
version: 1
supersedes: none
extends: 2026-06-09-drawing-board-asset-import.md
last-status-update: 2026-06-10
---

# The Workbench — crafting themes (live) and AI-authored layouts, as local assets

> **Not canonical.** Design-speculation, written ahead of implementation,
> per the "design before code on rethink requests" rule in `CLAUDE.md`. No
> shipped behaviour yet. When this note and a shipped surface disagree, the
> shipped surface wins. Purpose: fix the *shape* of the capability before
> any code lands.

The prompt (2026-06-10): a single top-level studio — **the Workbench** —
where an author can (1) **craft a theme** — a *style* — and see it in action
with a real, live preview, and (2) **create a new layout from scratch with
AI assistance**, using the model connection we already established for the
Architect. Both outputs become **local assets for that user**, flowing into
the asset system already specced in
`2026-06-09-drawing-board-asset-import.md`.

**Name & voice (decided 2026-06-10).** The mark is **Workbench** (route,
nav, labels); prose uses *the Workbench* with the article — the same pattern
as *the Architect* and *the Drawing Board*. It pairs with the Drawing Board
as a sibling work surface (**board + bench**) and gives the studio a one-line
division of labour: **you compose the deck on the Drawing Board; you
fabricate the parts at the Workbench** (forge a theme, build a layout). This
extends the brand cast — **Lattice** (the structure) · **the Architect**
(who designs it) · **the Drawing Board** (where you author) · **the
Workbench** (where you make the parts) — without a tonal seam. (Names
weighed and discarded: *Design Studio* — describes, doesn't evoke;
*Foundry*/*Forge* — a design→manufacture pipeline sibling but a heavier,
industrial register; *Compass* — the Architect's instrument and the prettiest
story, but Atlassian/Microsoft already ship a "Compass" and it leans toward
*direction* over *make themes & layouts*.)

This note does not invent a new subsystem. It is the **authoring
front-end** for two asset kinds: the existing `theme` kind, and a new
`component` kind. The asset note answered *how an imported style or asset
persists and renders*; this note answers *how an author originates one in
the browser, with the model's help, and what "a layout you made yourself"
is allowed to be.*

## Two faculties, two difficulty profiles — be honest about the gap

"Theme" and "layout" sound parallel. In Lattice they are not, and the whole
design turns on the difference (`design/design-system.md` four-layer model):

- **A theme is the Finish layer: pure tokens.** ~101 `var(--token)`
  declarations, *zero* layout rules (`design/theming.md`). Crafting a style
  is editing a token set — nothing structural. The runtime hook to apply
  one **already exists** (`PG.addThemes([cssText])` / `PG.hasTheme`,
  `live-render.js`), and the asset note already specs `theme` as an
  importable kind. The studio is a small, well-supported step.
- **A layout is a Form-layer component**: a `_class` name + palette-blind
  `styles.css` + (sometimes) a JS `transform.js` + manifest + docs +
  gallery, and it is **build-time and committed**. There is **no
  runtime layout-loading mechanism today** — no `addLayout()`. The
  transform tier is JS that rewrites rendered HTML, and running
  AI-generated JS as a per-user asset means sandboxing untrusted code
  *and* breaking the three-render-paths rule (a transform-bearing layout
  would work only in the browser, never in marp-cli/emulator PDF export).

So the studio ships the easy faculty first and reaches the hard one in a
**deliberately constrained subset**, with a clear road to the full thing.

## Decisions taken (2026-06-10 round-trip)

Confirmed with the user before this note was written:

1. **Layout scope — CSS-only local components now**; architected so
   **transform-bearing full components graduate in later**. Not "CSS-only
   forever": CSS-only is the runtime-safe, export-clean, parity-preserving
   *first* reach, and the design must leave the door open to transforms.
   (You *design a layout*; the unit it yields is a *component* — see Faculty
   2's term check.)
2. **Theme studio surface — curated essentials + AI seed + AI
   conversational.** A small essential token set drives a derivation of the
   full ~101-token contract; the model can *seed* a starting palette from a
   description and *refine* it conversationally; the form stays the precise
   control.
3. **Sequencing — theme studio first.** Prove the originate → asset →
   render → export loop end-to-end on the tractable faculty, then put the
   layout studio on the same rails.
4. **Name & placement — *the Workbench*, a single top-level entry**, sibling
   to the Drawing Board (not a tab inside it). See "Name & voice" above.

## Faculty 1 — the Theme Studio (Finish layer)

### What "a style" is, mechanically

A theme is the token contract in `design/theming.md`: surfaces & ink,
accent containers (bold + soft), semantic signals (pass/warn/fail), the
dark-variant tokens fed into `light-dark()` pairs, the 12-slot categorical
cycle (pale + deep tiers + paired ink), the chart-family palette, hljs
syntax tokens, and the Marp chrome tokens. ~101 declarations. The studio's
job is to let an author produce a **valid, complete, contrast-clean** set
without hand-typing 101 variables.

### Editing surface — curated essentials, derived rest

The author (or the model) sets a **small essential set**, and the studio
**derives the full contract** from it:

- **Essentials (author-facing):** `--bg`, `--bg-alt`, the ink trio
  (`--text-heading` / `--text-body` / `--text-muted`), `--accent` (+ the
  studio computes `--on-accent` for contrast), `--accent-soft`, and the
  three semantic signals. A mood toggle seeds the dark-variant band.
- **Derived (computed, revealable):** the categorical cycle's pale (L≈87)
  and deep (L≈32) tiers generated around the accent's hue family per the
  lightness contract (`design/theming.md`); the chart-family palette; hljs
  tokens; on-dark opacity tiers; Marp chrome. Power users can **reveal and
  override** any derived token — the form is the precise control; derivation
  is the head start, not a cage.
- **Live preview = the existing live-render path.** The studio renders a
  representative deck (a few specimen slides spanning surfaces, accent,
  semantic badges, a chart, a code block, a Mermaid diagram) through
  `PG.render` + `addThemes` so the author sees the *style in action*, not a
  swatch grid. Edit a token → re-register → re-render. This is the
  Drawing Board's filmstrip, scoped to a fixed specimen set.
- **Inline contrast meter.** The WCAG AA contract is already a gated
  invariant (`test/unit/contrast.test.js`). Run **that same predicate**
  client-side as a live meter beside each text/surface pair, so a failing
  combination is caught while editing, not at export. (Same "share the
  check, never duplicate it" discipline the Architect uses with
  `lint-core.js`.)

### AI seed + conversational refinement

The model is the Architect's, reused verbatim (`architect-model.js` ladder:
Prompt API → Transformers.js → WebLLM → Puter/OpenRouter → deterministic
floor). Two model touchpoints, both **constrained to emit the essential set
only** — the studio derives the rest, so the model can never produce an
inconsistent 101-token soup:

- **Seed:** "a warm forest palette, formal register" → the model returns the
  ~10 essential tokens as JSON; the studio derives + validates + previews.
- **Refine (conversational):** "deeper accent, lighten the surfaces, calmer
  semantics" → the model returns a *diff* over the essential set; the studio
  re-derives and re-previews. The author still sees and can pin every value.

**Tooling-first, exactly as the Architect (§4 of the architect note):** the
model proposes essential tokens; **derivation, validation, and contrast
gating are deterministic.** What the model "knows" never decides
correctness — a seeded palette that fails contrast is auto-nudged or
flagged by the deterministic meter, identically across every tier and on
the zero-model floor (where seed becomes a small library of starting
palettes and refine becomes direct token edits).

### Persist + render — the asset rails, already specced

A crafted theme is a `kind:'theme'` asset record (asset note §"The asset
model"): `text` = the generated CSS, library-scoped (`deckId:null`,
discoverable across decks), `provenance:'studio'`. Applying it is the asset
note's existing theme path: `addThemes` + token-contract validation, the
deck's `theme:` front-matter names it. **No new persistence or render
mechanism** — the studio is the producer; the asset system is the pipe.

## Faculty 2 — the Layout Studio (Form layer, CSS-only first)

> **Term check (matches today's semantic, `design/design-system.md`).** The
> codebase is *"organized as **components**"* — a component is the unit (the
> manifest-bearing folder in `lib/components/<bucket>/<name>/`, the entry in
> `components.json`). **"Layout" is the Form layer and the author-facing
> verb** — *"each layout is a component," "the component name (the layout)"*
> (`§6`). So in this note: **you design a *layout*; the asset you get is a
> *component*** (`kind:'component'`). The CSS-only first reach is exactly
> what `design-system.md:163,440` calls *"a pure-CSS layout" / "a new prose
> layout"* — a component whose composition is pure CSS over prose/structure.

### What a "local component" is allowed to be — the constraint that makes it safe

A local component is a **new `_class` name + palette-blind CSS** that arranges
`prose` and `structure` substance (markdown + lists) — the two substance
sources that need **no transform** (`design/design-system.md` §5). That
single constraint is what makes a user-authored component behave like a theme:

- **Runtime-injectable** by the same mechanism as a theme — CSS text
  registered into the render, no `addLayout()` JS API, no new render path.
- **Export-clean** — it's CSS; the export bridge (asset note §"export
  bridge") bakes or vendors it like any other CSS, so the exported deck
  renders the component through all three engine paths.
- **Parity-preserving** — no Drawing-Board-only JS transform to drift from
  the engine (`CLAUDE.md` "three render paths must agree").

This covers most **Form-layer innovation**: new grid arrangements, bookend
compositions, split geometries, panel framings — anything that is *spatial
arrangement of prose/lists*, which is the bulk of what authors mean by "a
new layout." What it explicitly **excludes for now**: components whose meaning
requires a transform — charts (`series` substance), diagrams (`graph`), and
the few structure post-processors (roadmap milestone extraction, slot-label
lift, split-panel counters). Those reach the author only via **graduation**
(below) until the transform story is designed.

### The new asset kind — `component`

Extends the asset model (asset note §"The asset model — one record") with a
fourth render-into-decks kind (image · theme · dataset were the first three;
`doc` augments the Architect rather than rendering into decks):

```
kind: 'image' | 'theme' | 'dataset' | 'doc' | 'component'
```

A `component` record carries enough to be a *real* component, not just a CSS
blob — so it can later graduate to the repo without re-authoring:

```
{ id, deckId|null, kind:'component',
  name,                       // the _class token, e.g. 'split-ledger'
  bucket,                     // one of the 12, e.g. 'inventory'
  text,                       // palette-blind styles.css, scoped to .name
  manifest,                   // function/form/substance/tags/slots/skeleton —
                              //   the same shape lib/components/*/*.manifest.json uses
  provenance:'studio',
  addedAt }
```

The `manifest` is what lets the local component participate in the catalog the
Architect and the editor already consume (`components.json`): completions,
the skeleton inserter, when/anti-pattern prose. A studio-made component shows
up in the author's own component picker beside the 58 shipped ones, marked
**local**.

### AI-assisted authoring — model proposes, deterministic gates dispose

The model (same ladder) assists in two bounded ways; **correctness is never
the model's**:

- **Propose CSS + manifest** from a description ("a two-thirds prose panel
  with a narrow accented ledger rail on the right, items as a list"). The
  model emits a draft `styles.css` + manifest JSON.
- **Refine** conversationally ("tighten the gutter," "make the rail tint
  with the soft accent").

Every draft passes **deterministic gates before it can render**, reusing
existing engine invariants client-side:

- **No hex literals** — the `var(--token)`-only rule (`CLAUDE.md`,
  `check:ownership` spirit). A hex literal is auto-flagged; the studio
  offers the nearest token.
- **Selector scoping** — all rules must be under `.<name>` (the `_class`),
  so a local component can never leak into other slides. This is the runtime
  analogue of the per-component selector wrapping `build-css.js` does.
- **Slot/skeleton coherence** — the manifest's declared slots must resolve
  in the skeleton (the `lint-core.js` family of checks; share, never
  duplicate).
- **Live preview** of the skeleton rendered with the new CSS, in the
  author's chosen palette — the component is palette-blind, so the same draft
  previews across every theme, which is itself the proof it obeyed the
  token rule.

### The architectural seam for transforms (the "future" the user asked for)

CSS-only is the *first* reach, not the ceiling. To keep the door open for
transform-bearing local components without repainting later:

- The `component` asset's `manifest` already records `substance`. A CSS-only
  component is `substance:'prose'|'structure'`; a future transform-bearing one
  would be `'series'|'graph'`. The kind doesn't change; the capability
  gate does.
- The **graduation path is the bridge to transforms today.** A local
  component, because it already carries a manifest, can be **exported as a
  component scaffold** — `lib/components/<bucket>/<name>/` with
  `manifest.json` + `styles.css` — for a PR. A component that *needs* a
  transform is authored there, where `transform.js` can be written, tested,
  and wired into all three render paths (`lib/transformers/` registry) under
  human review. So "I designed a layout" → local CSS-only component (instant,
  browser-scoped) → optionally "graduate it" → first-class shipped
  component (reviewed, transform-capable, in every render path).
- When the transform story *is* designed (its own note, like the dataset
  binding the asset note deferred), the in-browser execution-safety and
  parity questions get answered there — this note deliberately does not
  hand-wave them.

## Render-path parity & the export bridge — the load-bearing caveat

Local assets are **browser-scoped**. A deck using a studio theme or a local
component renders and exports correctly *from* the Drawing Board (it inlines
the CSS), but it does **not** exist in the marp-cli / emulator / VS Code
paths unless the asset travels with the deck (`CLAUDE.md` "three render
paths must agree"). The asset note already owns this seam:

- **Export bridge** (asset note §"The export bridge"): on PDF/`.md` export,
  a theme asset writes its CSS to `themes/` + registers in `marp.config.js`
  `themeSet` (the unregistered-theme-renders-palette-less gotcha applies); a
  `component` asset vendors its `styles.css` into the deck's self-contained
  form so all three engine paths resolve it.
- **Graduation = the permanent path.** For anything destined for git/CI, a
  studio theme becomes `themes/<name>.css` + `themeSet`; a local component
  becomes a `lib/components/<bucket>/<name>/` component — both via PR,
  through the existing gates (`check:ownership`, contrast, the integration
  tier, the visual spot-check). The studio lowers the cost of *originating*;
  graduation is how an origination becomes a shipped, every-path asset.

State the browser-scoped reality in the UI, the same honesty requirement
the Drawing Board export already carries (architect note §6).

## Asset interchange — the Lattice Pack (the standalone-portable leg)

A Workbench asset can leave the browser **three** ways, and the first two are
already specced above; this section adds the third:

1. **Deck-bound** — materializes *into a deck* on export (the export bridge
   above; asset note §"export bridge"). Travels with a deck.
2. **Repo-bound** — *graduates* to `themes/` or `lib/components/<bucket>/
   <name>/` via PR (above). Becomes first-class, every render path.
3. **Standalone-portable** — leaves *on its own* as a shareable / backup-able
   artifact, to re-enter another user's Workbench library (or yours on
   another machine). **This is the leg this section defines.**

(*Importing* a raw third-party theme/image is already in the asset note;
what is new here is **exporting what the Workbench made as a portable
package**, the **`component`** kind's bundle, and the **trust boundary on
importing a peer's asset**.)

### The standard: `.latticepack` — a zip, README-first, repo-shaped

Decided (2026-06-10): the interchange unit is a **standard Lattice Pack** —
a `.zip` (friendly extension `.latticepack`) that **always** carries a
human-readable `README.md` and a machine-readable `pack.json`, with assets
in kind-folders that **mirror the repo's own paths**. Figma's library model
is the north star: Figma publishes **styles** (= our themes) and
**components** (= our components — a clean 1:1), each with a description and
previews — a resource you *read*, then install.

```
dusk-and-friends.latticepack        # a .zip
├── README.md          # ALWAYS present — what's inside, author, license,
│                       #   latticeVersion, previews, usage
├── pack.json          # machine index: schema, latticeVersion,
│                       #   assets[] { kind, name, path, hash, provenance }
├── themes/
│   └── dusk.css       # bare palette CSS — also drops into any Marp/Lattice
├── components/
│   └── inventory/                  # bucket — mirrors lib/components/<bucket>/
│       └── split-ledger/           #   …/<name>/ exactly as the engine lays it out
│           ├── split-ledger.manifest.json
│           ├── split-ledger.styles.css
│           └── split-ledger.skeleton.md
└── previews/          # optional, cheap: rendered PNGs of each asset
    ├── dusk.png        #   in action (the Workbench already renders live)
    └── split-ledger.png
```

Why this exact shape:

- **README-first** — opening the zip explains itself to a human before any
  tool touches it. The Figma-community feel: a readable resource, not just an
  installable blob.
- **Repo-mirrored folders** — `themes/<name>.css` and
  `components/<bucket>/<name>/…` are the *same* paths the engine uses (minus
  the `lib/` prefix), so the **standalone-portable and repo-bound legs share
  one structure**: graduating a pack asset into a PR is a *copy*, not a
  re-author. One on-disk structure serves both export destinations.
- **Bare CSS survives inside the pack** — a theme stays a plain `.css`, so the
  "drops into any setup" interop win isn't lost to the container.
- **One format, any granularity** — a one-asset pack is "share this layout";
  a whole-library pack is "back up / move my Workbench." Same envelope, same
  import path.
- **Previews are cheap here** — the Workbench renders live anyway, so a
  thumbnail makes a pack browsable *before* import (Figma shows you the thing
  first).

### Export / import flow

- **Export** (Workbench → disk): pick assets (or "everything") → zip
  README + `pack.json` + kind-folders + previews. Provenance/license
  prompt-filled, author-editable.
- **Import** (disk/URL → Workbench): unzip → read `pack.json` →
  **re-validate every asset through the *authoring* gates** (theme
  token-contract; component `.<name>`-scoping, no-hex, slot coherence —
  `lint-core.js`, shared not duplicated) → **content-hash dedup** (re-import
  updates, never duplicates) → land in the library marked *imported* with
  provenance. URL import uses the asset note's CORS fallback (try fetch, else
  file-pick). Warn on `latticeVersion` skew (the half-styled-theme gotcha,
  browser-side).

### Trust & safety — the same boundary, restated for peer packs

A peer's pack is **untrusted**; the gates, not the README, are the authority:

- **CSS-only assets import directly** (themes, CSS-only components) —
  declarative and `.<name>`-scoped, re-validated on the way in. A failed
  asset renders nothing until fixed.
- **Transform-bearing components are NOT peer-importable** — untrusted JS is
  the deferred sandboxing problem. A pack *may carry* such a component's CSS +
  manifest **for graduation** (the PR path, human-reviewed), but the
  Workbench will not execute its transform on import. No new hole opened.

### Not in scope (its own future note)

A hosted **registry/marketplace** (browse-and-install others' assets). The
Pack is exactly the unit a marketplace would distribute, so **defining it now
is the foundation that keeps that door open** — while sharing stays **file +
URL** for today, consistent with the Drawing Board's no-backend design.

## Verification stance (matches the asset note / Phase-2 MockBackend culture)

- **Pure + unit-tested:** essential-set → full-contract derivation; the
  contrast predicate (reuse `contrast.test` logic); the hex-literal and
  selector-scoping gates; manifest/slot coherence (reuse `lint-core.js`);
  the model-output → essential-set parser (theme) and → CSS+manifest parser
  (component); graduation scaffold emission; **Lattice Pack write/read
  (zip + `pack.json` round-trip), the import re-validation gate, and the
  hash-dedup/version-skew predicates.**
- **Mock-tested:** seed → derive → validate → render with a `MockBackend`
  and a fake store; the conversational-diff refine loop; the local-component
  → component-scaffold export.
- **Live-only (not claimed):** real model seed/refine across tiers, real
  `addThemes` render in a browser, real PDF/PPTX export of a deck using a
  studio asset. Wired, mock-tested, degrade-verified — the live paths need
  a desktop session, as with every other model surface.

## Phasing

1. **Theme Studio — essentials + derivation + live preview + contrast
   meter.** ✅ **Shipped** (2026-06-11) as the docs-site `/workbench` page:
   the pure core `lib/theme/` (color · derive · contrast · serialize ·
   starters), the essentials editor, the live specimen render via
   `window.LatticePlayground`, the per-pair contrast meter, and copy/download
   of a droppable `themes/<name>.css`. Deterministic, no model (seed = the
   starter library). Browser-scoped for now; the `kind:'theme'` asset write +
   the export/graduation bridge are the next slices (see "next" below).
   *This first ship proves the originate → derive → render loop on the
   tractable faculty.*
2. **Theme Studio — AI seed + conversational refine.** The Architect model
   touchpoints, constrained to the essential set; deterministic derivation
   and gating unchanged across tiers.
3. **Layout Studio — CSS-only, deterministic.** The `component` asset kind;
   the `.<name>`-scoped CSS + manifest; the hex/selector/slot gates; live
   skeleton preview; local components in the author's component picker.
4. **Layout Studio — AI propose + refine.** Model drafts CSS + manifest;
   the gates of Phase 3 dispose. Same tooling-first split.
5. **Graduation bridge.** "Export this studio asset as a repo PR" — theme →
   `themes/` + `themeSet`; component → `lib/components/<bucket>/<name>/`
   scaffold. This is also the **only** path to transform-bearing components
   until their own design note lands.
6. **Lattice Pack interchange (standalone-portable).** The `.latticepack`
   zip (README + `pack.json` + repo-shaped kind-folders + previews); export
   one-asset or whole-library; import = unzip → re-validate through the
   authoring gates → hash-dedup → library, marked *imported*. File + URL,
   no backend. Foundation a future marketplace would distribute. (Can land
   alongside/after the theme studio, since a theme pack is the simplest
   first round-trip.)

(Faculty 1 = phases 1–2, ships first per the decision above. Faculty 2 =
phases 3–4. Phase 5 connects both back to the engine and is the seam to the
deferred transform story.)

## Open questions

- **Derivation algorithm** — how opinionated is "derive the categorical
  cycle from the accent's hue family"? A single-hue analog ramp is safe but
  monochrome for charts that need *distinguishable* categories. Likely needs
  a hue-spread strategy (complementary/triadic spokes around the accent) +
  an author "regenerate categoricals" affordance. Its own small spike.
- **Contrast auto-repair vs. flag-only** — when a seeded/edited pair fails
  AA, does the studio silently nudge lightness to pass, or only flag and let
  the author fix? Leaning flag-with-one-click-fix (preserves author intent;
  matches the Architect's quick-action model).
- **Local-component bucket assignment** — a studio component needs a `bucket`
  (one of the 12) for the picker and for graduation. Infer from the
  manifest's `function`, or ask the author? Probably infer + let them
  override.
- **Picker provenance UX** — how are *local* themes/components marked vs.
  shipped ones in the author's pickers, and what happens to a deck that
  references a local asset the author later deletes? (Mirror the asset
  note's per-deck-binding rule: a missing local asset degrades visibly, not
  silently.)
- **Naming the studio** — *resolved (see "Name & voice"):* the mark is
  **Workbench**, voiced *the Workbench*, a **single top-level entry** sibling
  to the Drawing Board (board + bench; compose vs. fabricate). Still open is
  only *how prominently* it sits in the nav relative to the Drawing Board,
  not the name or the placement. It shares the engine, the model, the store,
  and the export bridge with the Drawing Board, so "sibling route" is a
  surfacing choice, not a duplicated stack.
- **Lattice Pack details** — (a) the precise `pack.json` schema + a
  `schema` version line for forward-compat; (b) are previews **required** or
  optional (lean optional, auto-generated when the Workbench can render);
  (c) license field — free-text or an SPDX picker; (d) zip library choice in
  the browser (a small dependency-free zip writer/reader vs. a CDN import,
  mirroring the pdf.js-on-demand pattern); (e) does a `.latticepack` ever
  carry a *deck* too, or strictly assets (lean assets-only — decks already
  have their own export). A short spike, not a blocker.
- **Marketplace (deferred, own note)** — a hosted browse-and-install registry.
  The Pack is its distribution unit, so this note's job is only to not
  foreclose it; the backend, moderation, and trust/signing model are out of
  scope here.
- **Transform-bearing local components** — deferred to its own note, as the
  dataset binding was. The in-browser JS-execution safety model and the
  parity story are non-trivial and must not be hand-waved into this one.
