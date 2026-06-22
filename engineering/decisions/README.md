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

### Status lifecycle — a closed vocabulary the index reads

Every note carries a YAML front-matter block so its lifecycle is
machine-readable (and so the "Current notes" list below can be
**generated**, not hand-maintained — hand-maintained indexes drift):

```yaml
---
# status is one of: proposed | in-progress | blocked | shipped | superseded
status: proposed
summary: one line describing what this note covers
# optional, only for status: superseded — the filename that replaced this note:
superseded-by: 2026-06-18-foo.md
---
```

`status` and `summary` are required; `created` is derived from the filename
date (don't duplicate it). Keep each value on one line — the index parser reads
flat `key: value`, so put any note on its OWN `#` line, never trailing a value.

| `status` | Glyph | Meaning | Index group |
|---|---|---|---|
| `proposed` | ☐ | A design/decision written, not yet built | **Active** |
| `in-progress` | ◐ | Being built now | **Active** |
| `blocked` | ⏸ | Needs an owner decision or a dependency | **Active** |
| `shipped` | ☑ | Built + verified; *absorb into canon, then delete* | **Shipped — pending teardown** |
| `superseded` | ⊘ | Replaced by `superseded-by` | **Historical** |

A **multi-part** initiative (several independently-shippable workstreams in one
note — e.g. `2026-06-17-workflow-efficiency-review.md`) adds a **roll-up banner**
under the title (overall status + a stats line) and a per-section
`**Status:**` line, so each partition tracks itself. The banner's stats are a
human roll-up of the section statuses.

**The index is generated.** `npm run decisions:index` reads every note's
front-matter and regenerates the "Current notes" list below (grouped Active /
Shipped-pending-teardown / Historical); `npm run decisions:index:check` is the
freshness gate (same pattern as `docs:portal:check`). Don't hand-edit the
generated list — edit a note's front-matter and regenerate. `shipped` and
`superseded` notes are candidates for the "absorb-then-delete" rule above; the
grouping makes the ~70% that are historical skippable at a glance. See
`2026-06-17-workflow-efficiency-review.md` §A.

## What does **not** belong here

- Session-scoped TODOs, scratch experiments, half-finished thoughts.
  Use `.scratch/` (gitignored) for those.
- Step-by-step debugging logs without a conclusion.
- Anything that should be in `CHANGELOG.md` (user-facing changes) or
  `engineering/architecture.md` (how the system works).

## Scratch housekeeping

`.scratch/` is the gitignored sandbox for probes, throwaway scripts,
and temp artifacts (used by humans, agents, and tests). Nothing under
it is load-bearing.

- Treat anything older than ~2 weeks as fair game to delete.
- If a file is worth keeping, promote it: docs go under `engineering/decisions/`,
  source documents go to a sibling folder outside the repo (e.g. the
  gitignored `framework/` folder).
- Run `npm run clean:scratch` to delete `.scratch/` entries older than
  14 days. The script is opt-in — it never runs automatically.

## Current notes

<!-- decisions-index:begin -->

### Active — proposed · in-progress · blocked

- ☐ [2026-06-22-the-fit-spine.md](2026-06-22-the-fit-spine.md) — The foundational spine for responsive/dense-slide work — Frames are the single owner of box-response; a solver fits content by COLLAPSE → SHED → SPLIT and stops at a readability FLOOR, never shrinking. Defines the earn-its-keep ledger (keep/refactor/purge for every existing adaptive mechanism), the Munger inversion that produces the design rules, the red-team that attacks them, and a phased clean-canvas teardown that keeps the tree green at every step. Supersedes the de-boost and reframes per-component reflow as a Frame property.
- ☐ [2026-06-21-app-redesign.md](2026-06-21-app-redesign.md) — Unify Playground + Drawing Board + Workbench into one Studio — one app shell, a context command bar, a deck Inspector vs workspace Settings split, deck-scoped Share, and a first-class reader (read-aloud + AI reshape) — built as an incremental stack of independently-shippable wins.
- ◐ [2026-06-21-reflow-as-form-capability.md](2026-06-21-reflow-as-form-capability.md) — Design model for making reflow a *Form* capability rather than 25 per-component @container solutions. The Form model (design/forms.md) already gives a slide a coordinate system — a Frame slices the box into Cells; Cells are resolution-blind (relative units → px at any scale). But that scale-invariance is NOT aspect-awareness: a Frame's slicing is rigid across box shapes. Reflow is the missing axis — the same Form evaluated at a different box. The four-family taxonomy (lib/adaptive/families.js: wide/square/tall/strip, each with an intent) already encodes the aspect axis; the missing middle is the RESPONSIVE-FRAME CONTRACT: a Frame declares its slicing per aspect-family, so the masthead band stacks, the stage goes single-column, and the progress rail repositions/sheds — top-down — while the component (Tile) only fills whatever Cell it's handed. This subsumes the per-component reflow (demoted to the Tile-in-its-Cell leaf behaviour) and composes with the fluid-box viewer (#472 supplies the live box). "Infinite looks" = Frame × family-slicing × resolution × theme. Proposes the contract, how it layers on Mechanism B (flex + in-flow bands), and a staged path (one Frame proven in phone-view, then the catalog, then graduate the sovereign frames).
- ◐ [2026-06-20-chart-detail-reveal-family.md](2026-06-20-chart-detail-reveal-family.md) — Which charts beyond the pie can take the per-mark interactive detail-reveal + present-mode CSS-3D tilt, and how to generalize the kernel + reveal layer so they're cheap to add. Decision — the treatment is TWO separable capabilities (A reveal, substrate-agnostic; B tilt, SVG-only); Tier 1 = funnel, quadrant, radar, map (clean SVG transfers, get A+B); generalize the pie's bespoke kernel + createChartInteract into a chart-family substrate, then opt each in. Radar reveals per-axis.
- ◐ [2026-06-20-export-dedicated-capture-host.md](2026-06-20-export-dedicated-capture-host.md) — Drawing Board PDF/PPTX/chart export rasterized the live preview iframe, which goes blank (or collapsed) when exported from the phone Edit tab — the preview pane is display:none, so the iframe is hidden (visibility gate) and unlaid-out (container-query typography collapses to 0). Export now renders into its own dedicated, fully-laid-out, ungated offscreen capture host (reusing the engine render via __dbExportRender), so it is correct regardless of preview state.
- ☐ [2026-06-20-native-to-reflow-feasibility.md](2026-06-20-native-to-reflow-feasibility.md) — Feasibility study for converting the 25 `native` components to box-local `reflow` for portrait/tall boxes. Verdict — highly feasible and mostly cheap, BUT "lots of layouts are native" is partly a misframing: 8 of 25 are correctly native (centred single-column — reflow is a literal no-op), ~13 are cheap descendant-collapse reflows that copy the proven §12 sweep recipe (no export sign-off needed), 2 are wide tables needing a markup restructure, 1 (split-panel) already flips via `data-orientation` but the `@container` migration is the known §11 section-element blocker, and 1 (compare-table) flagged as a possible landscape-only reclassification. Two contract findings flagged for the maintainer; resolved 2026-06-20 — split-panel reclassified `reflow`, compare-table render-verified and reclassified landscape-only. **Part II (v2)** lifts the question one layer — from "are the components reflow-capable?" to "what does an end-to-end responsive *viewing* experience for the reader (the emailed-link-on-a-phone persona) require?" — and finds the responsive runtime is ~80% already built (the runtime already re-derives orientation from *measured* aspect on every resize); the missing pieces are a fluid-box viewer mode, a content-autofit actuator on the existing overflow watcher (with a legibility floor), and — now in scope — engine-owned re-pagination, which the capacity model already anticipates (`escalateTo: "split across slides"`).
- ◐ [2026-06-19-adaptive-image.md](2026-06-19-adaptive-image.md) — The `image` layout is the one whose content shape we don't control — an author hands us an arbitrary rectangle. It now RESOLVES one of five compositions (clean / split / spotlight / gallery / statement) from two axes — the asset's intrinsic aspect bucket (read from the file header at build, measured in the browser at preview) and the deck orientation — instead of making the author pick a modifier. Risk-gated: only content-safe treatments (clean / split / spotlight) auto-fire; gallery + statement are opt-in; an explicit author class always wins.
- ◐ [2026-06-19-chart-adaptive-sizing.md](2026-06-19-chart-adaptive-sizing.md) — Charts restructure to the box they occupy, not just scale — all 13 are own renderers (HTML/CSS or native SVG; none are Mermaid — §10 corrects an earlier mislabel) that re-lay-out per box family (sequential charts go vertical, radial stack-over-legend, square fill, gantt label-over-bars, state-chart fills + lr→tb, journey vertical reflow). Phase 1 landed timeline-list as the proven vertical-rail pattern; phases 2–4 sequenced.
- ◐ [2026-06-18-component-adaptive-sizing.md](2026-06-18-component-adaptive-sizing.md) — Make components adaptive to the box they occupy (not the deck's named size) via box-local @container queries over four structural families — Wide · Square · Tall · Strip. Pilot (5) + batch 1 (5) + batch 2 (12) landed; obligation-matrix deferred.
- ⏸ [2026-06-18-layer-activation-scope.md](2026-06-18-layer-activation-scope.md) — Stage 1 SHIPPED (#435) — the 12 cascade-workaround !important in base.variants.css removed via a path-agnostic doubled-class (0,2,2). Stage 1.5 spike DONE: resolved the content-mask unknown (it runs only on the engine path, never the emulator) but found Stage 2 VETOED by R-PATH — the export-to-Marp / marp-vscode consumer styles decks with marp-core's own unlayered scaffold that Lattice cannot wrap, so full @layer activation is not achievable. Recommendation: stop at Stage 1.
- ☐ [2026-06-17-content-capacity-contract.md](2026-06-17-content-capacity-contract.md) — Decision to make each layout's content capacity a structured manifest fact and lint-enforced contract rather than buried prose
- ◐ [2026-06-17-workflow-efficiency-review.md](2026-06-17-workflow-efficiency-review.md) — Red-team of the agent operating model — leaner CI/hooks, trimmed CLAUDE.md, a merge queue, and machine-readable doc status structure
- ☐ [2026-06-16-deck-fact-checking.md](2026-06-16-deck-fact-checking.md) — Design model for an LLM deck fact-check that returns an honest trust map with quick parametric and deep-research tiers
- ☐ [2026-06-16-focus-highlighting.md](2026-06-16-focus-highlighting.md) — Design model for a universal, CSS-driven, cross-format per-element focus/highlight capability splitting targeting from treatment
- ☐ [2026-06-16-form-manifest-medium-independent-contract.md](2026-06-16-form-manifest-medium-independent-contract.md) — Decision to keep and grow the lib/forms manifest as a medium-independent composition contract with 2D CSS as its first renderer
- ☐ [2026-06-16-lattice-export-format.md](2026-06-16-lattice-export-format.md) — The Lattice export format — a portable self-contained .html player plus a lossless .lattice project zip sharing one manifest envelope
- ☐ [2026-06-16-narrative-step-model.md](2026-06-16-narrative-step-model.md) — Organizing idea making the narrative step, not the slide, the unit of navigation so a slide assembles element by element
- ☐ [2026-06-16-narrative-step-spec.md](2026-06-16-narrative-step-spec.md) — Field-level spec for the narrative step model — authoring grammar and step data contract reusing the focus feature substrate
- ☐ [2026-06-16-orientation-in-the-form-model.md](2026-06-16-orientation-in-the-form-model.md) — Where portrait/landscape orientation lives in the Form model and how a layout declares vs is made to support portrait
- ☐ [2026-06-16-rtl-vertical-text-support.md](2026-06-16-rtl-vertical-text-support.md) — Design model for directional text — RTL, LTR, and vertical CJK via a dir directive, a logical-CSS refactor, and self-hosted OFL fonts
- ☐ [2026-06-15-webrtc-av-collaboration.md](2026-06-15-webrtc-av-collaboration.md) — Design exploration for adding talk-while-you-edit audio/video to the Drawing Board over the same WebRTC pipe as Yjs document sync
- ☐ [2026-06-14-deck-print-styling.md](2026-06-14-deck-print-styling.md) — Print support that survives the boardroom on paper, in colour and B&W, via a per-theme print token band and auto-paper-fit
- ☐ [2026-06-14-github-project-management.md](2026-06-14-github-project-management.md) — Kanban-light project management keeping ADRs in markdown while adding GitHub Issues as a claimable queue mirrored to BACKLOG.md
- ☐ [2026-06-14-plugin-extension-system.md](2026-06-14-plugin-extension-system.md) — LPM — a unified plugin model promoting Lattice's six ad-hoc extension idioms into one spec'd, shared-kernel system
- ☐ [2026-06-14-presentation-import.md](2026-06-14-presentation-import.md) — Importing across board + bench — brand-faithful themes (Workbench) and Lattice-native content (Drawing Board)
- ☐ [2026-06-14-read-aloud-kokoro.md](2026-06-14-read-aloud-kokoro.md) — A free, boardroom-quality read-aloud voice via a VoiceModel ladder (OpenRouter TTS then Kokoro WASM), banning speechSynthesis
- ◐ [2026-06-14-worked-exemplar-decks.md](2026-06-14-worked-exemplar-decks.md) — Worked exemplar decks that show what good looks like, replacing placeholder skeleton spines with finished real-content decks
- ☐ [2026-06-14-yjs-collaboration-exploration.md](2026-06-14-yjs-collaboration-exploration.md) — A zero-hosting-cost Yjs model for Google-Docs-style real-time collaboration on the static-hosted Drawing Board
- ☐ [2026-06-13-gate-strategy-change-detection.md](2026-06-13-gate-strategy-change-detection.md) — Whether every push/PR runs all gates or change-detection plus tiered scheduling can cut cost without losing the floor
- ◐ [2026-06-13-islands-sketch-density-collisions.md](2026-06-13-islands-sketch-density-collisions.md) — Islands and sketch chrome paints over content because its height is not subtracted from the content safe-area
- ☐ [2026-06-12-contracts-layout-swapping.md](2026-06-12-contracts-layout-swapping.md) — Design spec for contracts and layout-swapping as the third Workbench leg — same content, swap layout via one class
- ☐ [2026-06-12-p4-regression-gate-retire-marp.md](2026-06-12-p4-regression-gate-retire-marp.md) — P4 retire marp-cli — pivoted from a flaky pixel-regression gate to per-component semantic invariant testing
- ☐ [2026-06-10-design-studio-themes-layouts.md](2026-06-10-design-studio-themes-layouts.md) — The Workbench — crafting themes live and AI-authored layouts as local assets
- ◐ [2026-06-10-drawing-board-huge-deck-preview-perf.md](2026-06-10-drawing-board-huge-deck-preview-perf.md) — Scalable live preview for huge decks — incremental-patch path landed, viewport virtualization the remaining layer
- ☐ [2026-06-09-drawing-board-asset-import.md](2026-06-09-drawing-board-asset-import.md) — In-browser asset import for the Drawing Board — import, persistence, and the two consumers of imported assets
- ☐ [2026-06-09-map-spatial-form-spec.md](2026-06-09-map-spatial-form-spec.md) — Design spec for the `map` component and the new `spatial` form — geography-placed points/regions in the chart bucket
- ☐ [2026-06-09-slide-context-autocomplete.md](2026-06-09-slide-context-autocomplete.md) — Slide-context-sensitive autocompletion for the Drawing Board editor — class names, modifiers, slot scaffolds, data vocab
- ☐ [2026-06-08-architect-coach-features.md](2026-06-08-architect-coach-features.md) — Spec extending the Architect from deck builder into a four-stage presentation coach across build, review, annotate, and rehearse
- ☐ [2026-06-08-architect-modes.md](2026-06-08-architect-modes.md) — Spec redesigning Architect onboarding into Drafting and Freehand modes — when it leads with structure versus gets out of the way
- ☐ [2026-06-08-drawing-board-coach-vs-converse.md](2026-06-08-drawing-board-coach-vs-converse.md) — Reframes the Architect as a Coach (deterministic, no composer) versus Converse (real-model chat) toggle, replacing the chat framing
- ◐ [2026-06-08-drawing-board-phase-2-build.md](2026-06-08-drawing-board-phase-2-build.md) — Phase 2 build notes recording the Architect's voice decisions and the verification stance for tiers that can't run in the sandbox
- ☐ [2026-06-08-drawing-board-phase-2-plan.md](2026-06-08-drawing-board-phase-2-plan.md) — Phase 2 build plan for the Drawing Board Architect's voice — the ArchitectModel tier ladder behind the deterministic floor
- ☐ [2026-06-07-drawing-board-architect.md](2026-06-07-drawing-board-architect.md) — Design model for the Drawing Board browser-only deck studio and its on-device AI assistant, the Architect
- ☐ [2026-06-07-split-family-analysis.md](2026-06-07-split-family-analysis.md) — Analysis showing the six split-* components share one transform, with Option B consolidation ratified but execution pending
- ☐ [2026-05-19-typography-token-refactor.md](2026-05-19-typography-token-refactor.md) — Proposal to collapse the 16 --fs-* tokens to 10 organized as three role-based scales, migrated in five pixel-gated phases
- ☐ [2026-05-17-chart-family-refactor.md](2026-05-17-chart-family-refactor.md) — Deferred proposal to distribute chart-family internals into per-component folders to match the convention
- ☐ [2026-05-17-post-migration-improvements-proposal.md](2026-05-17-post-migration-improvements-proposal.md) — Pre-implementation proposal for post-migration improvements to the shared transformer registry, including bundle-size recovery
- ☐ [2026-05-17-treatments-rename.md](2026-05-17-treatments-rename.md) — Proposal to rename the bg-* treatment family to tint-* / mark-* split across orthogonal category, treatment, and placement axes
- ☐ [2026-05-16-html-assertion-refactor.md](2026-05-16-html-assertion-refactor.md) — Proposal to replace regex-on-HTML test assertions with parsed-DOM queries across chart-family and seven other test files
- ☐ [2026-05-16-post-foundation-followups.md](2026-05-16-post-foundation-followups.md) — Captures every workitem deferred or discovered late during the design-system-foundation branch, tracked as next
- ☐ [2026-05-12-kpi-candidates.md](2026-05-12-kpi-candidates.md) — Candidate exploration deck for the executive KPI system — one cohesive base with five layout modifiers
- ☐ [2026-05-12-workflow-debt.md](2026-05-12-workflow-debt.md) — Analysis of residual workflow friction after the 2026-05-12 reconciliation plus three concrete proposals for the next round
- ☐ [2026-05-11-inline-code-directives.md](2026-05-11-inline-code-directives.md) — Design for namespaced inline-code directives (icons, vars) with all five open questions resolved but nothing implemented yet
- ☐ [2026-05-10-tauri-exploration.md](2026-05-10-tauri-exploration.md) — v1 architectural shape for the SlideWright desktop app on Tauri, with personas, six-release plan, and engine-ownership decisions
- ☐ [2026-05-07-chart-family-proposals.md](2026-05-07-chart-family-proposals.md) — Chart-family layout proposals turning list/sublist plus inline-code pills into timelines, Gantts, pie and progress views
- ☐ [2026-05-04-authoring-proposals.md](2026-05-04-authoring-proposals.md) — Forward-looking authoring RFC covering the component model, modifier catalogue, new layout proposals, and rollout plan

### Shipped — pending teardown (absorb into canon, then delete)

- ☑ [2026-06-22-kanban-chart-redesign.md](2026-06-22-kanban-chart-redesign.md) — The kanban board read as busy and unrefined because colour was spent decoratively on CATEGORY (the card's least decision-relevant axis), encoded four redundant ways per card — gradient fill + 3px left stripe + colour dot + label — producing a paint-swatch patchwork, while STATUS (the decision axis) got one quiet chip. Explored five directions (each iterated 5× against a faithful render harness): Signal (flat, colour=status), Ledger (typographic/no cards), Lane-keyline (category as one edge), Tinted-columns (colour=stage), Premium-card (polished neutral tile). Decision — ship PREMIUM CARD as the default (uniform elevated neutral tiles; colour reserved for status, so a flagged card is the focal point), with two opt-in variants that restore disciplined colour coding: `keyline` (one crisp coloured left edge = category/ownership) and `tinted` (whisper-tinted columns = pipeline stage). Rejected as the default: Ledger (changes what the component IS, board→table) and the per-card category fill (the original busyness).
- ☑ [2026-06-21-chart-reveal-lean-tooltip.md](2026-06-21-chart-reveal-lean-tooltip.md) — In an interactive chart where only SOME marks authored detail, hovering a mark with no detail still reveals (the markCount gate from #465). Question — is "every mark revealable" right, and how should a no-detail reveal look? Decision — KEEP every-mark-revealable (it is the data-viz standard: Shneiderman details-on-demand + the universal tooltip convention), but split the reveal into two depths: a mark with no authored body/meta shows a COMPACT value-on-hover tooltip chip (label + value), while a mark with detail shows the full card. Family-wide via the shared reveal layer. Rejected: "highlight but no card" (content-free feedback) and "only authored marks interactive" (hidden affordance, re-opens the non-contiguous-index bug, breaks keyboard/touch uniformity).
- ☑ [2026-06-21-fluid-box-viewer-design.md](2026-06-21-fluid-box-viewer-design.md) — Design for the fluid-box viewer mode — the keystone that makes Lattice's already-built responsive runtime fire for the emailed-link-on-a-phone reader. Today every deck is a fixed-size artifact pinned to its authored aspect, so a phone gets a tiny letterboxed 16:9 rectangle; meanwhile the runtime already measures the live section and re-derives orientation/type/reflow on every resize — it just always measures the bolted-down authored box. Fluid mode unbolts the box for a *viewing* mode: the section sizes to the viewport, the phone makes it portrait, and the existing machinery fires reflow + the portrait type scale for free. Locked decisions — (1) reading model is one-slide-per-screen vertical scroll-snap (swipe), (2) opt-in only (off by default; a toggle / URL flag turns it on — NOT auto-on for shared HTML), (3) first slice is the keystone only (fluid box + reflow; no auto-shrink, no re-pagination). Additive and export-safe: the PDF and the canonical export HTML are untouched; fluid is a separate viewer output that keeps the runtime instead of stripping it.
- ☑ [2026-06-21-gantt-component-redesign.md](2026-06-21-gantt-component-redesign.md) — The shipped gantt was a categorical chart — bars snapped to discrete quarter/month columns, tokens sniffed loosely (a typo became silent garbage), no real dates, no milestones, no dependencies. Decision — keep the nested-list construct (least change for change-averse authors) but make the inline-code tokens typed + validated and move to a continuous time scale. A span is `START..END` (bar) or a single point (milestone); `..` is the only delimiter (retired `→ / – / ->`); tokens add `after:` (dependency, validated not drawn) and `milestone`; time points are ISO dates / quarters / months on one continuous axis (dates OR ordinals, not both); axis auto-derives, eyebrow overrides + opt-in `today` line. Chosen over a GFM-table contract (bigger departure for the target audience). Hard replace, no back-compat.
- ☑ [2026-06-20-adaptive-manifest-contract.md](2026-06-20-adaptive-manifest-contract.md) — Make adaptivity a REQUIRED, deterministic manifest declaration — `adapt.mode` ∈ {reflow, native, single-orientation} on every one of the 52 components — backed by a CI gate (check-ownership checkAdaptDeclarations) that cross-checks the declaration against reality, so it can never silently drift. Fixes the prior jank: 10 components declared adaptivity, 25 actually adapt, and nothing caught the gap. Backfilled all 52 (25 reflow / 25 native / 2 single-orientation). Reflow IMPLEMENTATION for components that still need it stays a tracked follow-up; the end-state goal is zero "unhandled" components.
- ☑ [2026-06-20-state-chart-simplify.md](2026-06-20-state-chart-simplify.md) — The state-chart read as a dashboard, not a flow — per-node status text pills widened the column and collided the spine edge-labels with the nodes (worst in the vertical `curved` variant). Decision — "cut the fat": status folds into the top-right index numeral (the index becomes a colour-coded badge — number + status in ONE element), decoded by a legend band (journey-style); the D3-style edge router is untouched. Authoring unchanged.
- ☑ [2026-06-20-typography-categories.md](2026-06-20-typography-categories.md) — Typography becomes three curated per-orientation coefficient sets (landscape/square/portrait), one manifest (lib/typography/scale.js) emitted by lib/typography/emit.js, selected per slide off the data-orientation stamp. Retires the single --canvas-scale type multiplier (spacing still uses it); landscape stays byte-identical. Phase 1 ships whole-slide categories + the --pill-fs fix + a raw-cqi-font drift guard; Phase 2 (true nested box-local via @container + a per-box cqi stamp) is scoped for when a cell shadows container-name:lattice.
- ☑ [2026-06-19-css-3d-charts-feasibility.md](2026-06-19-css-3d-charts-feasibility.md) — CSS-3D can't replace SVG for the chart family (PDF zoom rasterizes CSS, vector SVG stays crisp; preserve-3d is inert inside SVG). Decision — SVG stays canonical; CSS 3D is a present-mode-only tilt of the whole SVG. Shipped — piechart per-slice detail as an inert data-slice/<template> payload (byte-identical chart pixels) + a dispatch depth-aware fix, AND a parent-hosted present/practice interaction layer (hover/tap/number-key reveal, autoplay-pause) keeping the iframe a pure paint surface. Print fallback shipped (#452.1) as the speaker-notes channel (detail → slide note → PDF annotation, chart pixels byte-identical).
- ☑ [2026-06-18-chart-mermaid-style-separation.md](2026-06-18-chart-mermaid-style-separation.md) — Owned chart-family CSS and third-party Mermaid CSS share tokens but zero selectors/names — all Mermaid CSS in mermaid.css, the journey-section name split, radar !important confirmed load-bearing
- ☑ [2026-06-18-frame-recursion-cells.md](2026-06-18-frame-recursion-cells.md) — We considered making the Frame/Cell model recursive (a content cell holding a nested frame) and rejected it — cool but useless for slides. Frame stays; the real need (two components side by side) is met by a flat split layout, itself a Frame, whose cells host components.
- ☑ [2026-06-18-unified-site-header.md](2026-06-18-unified-site-header.md) — Collapse 8 copy-pasted topbars (two CSS systems) into one shared SiteHeader + a universal ⌘K command palette, with a single lg responsive breakpoint
- ☑ [2026-06-17-image-rearchitecture.md](2026-06-17-image-rearchitecture.md) — Re-architecting image rendering to a shared-engine CSS-background split with kernel asset URL resolution across PDF and web paths
- ☑ [2026-06-17-stacked-pr-fragmentation.md](2026-06-17-stacked-pr-fragmentation.md) — Process incident — one portrait feature shipped as a 7-PR stacked chain, codified into HARD RULE #17 (one feature = one branch = one PR)
- ☑ [2026-06-16-colour-blindness-accessibility.md](2026-06-16-colour-blindness-accessibility.md) — Per-viewer colour-blindness accommodation via CVD-curated first-class a11y palettes plus a Brettel/Machado CVD simulation and audit gate
- ☑ [2026-06-16-cvd-redundant-encoding.md](2026-06-16-cvd-redundant-encoding.md) — Empirical finding that colour alone cannot carry categorical data under dichromacy, making redundant texture/glyph encoding mandatory
- ☑ [2026-06-16-retire-section-as-grid.md](2026-06-16-retire-section-as-grid.md) — Retires the section-as-grid north star on merit; flex section with in-flow content-height bands is the canonical Form architecture
- ☑ [2026-06-16-social-mobile-portrait-sizes.md](2026-06-16-social-mobile-portrait-sizes.md) — Native portrait/square @size support for social and mobile surfaces via a unified size registry and orientation-aware engine reflow
- ☑ [2026-06-15-docs-perf-gating-policy.md](2026-06-15-docs-perf-gating-policy.md) — Durable policy for the docs-site perf gate, treating perf as a non-deterministic species of gate that flaps on runner variance
- ☑ [2026-06-15-form-chart-clip.md](2026-06-15-form-chart-clip.md) — Root-cause and fix for form-chart collapse-then-clip in dense PDF slides via robust content-box sizing
- ☑ [2026-06-15-form-implementation.md](2026-06-15-form-implementation.md) — Engineering ADR implementing the Form composition model (Frame/Cell/Tile) in engine + CSS, retiring islands and fixing chrome-over-content
- ☑ [2026-06-15-manifest-css-audit.md](2026-06-15-manifest-css-audit.md) — Cross-checking all 52 component manifests against the CSS/transforms that render them; 34 findings across 17 components, all remediated
- ☑ [2026-06-15-retire-drift-watch.md](2026-06-15-retire-drift-watch.md) — Retires the continuous background drift watch in favour of rebase-before-push plus one pre-merge re-check
- ☑ [2026-06-14-competitive-analysis.md](2026-06-14-competitive-analysis.md) — Durable, cited source-of-truth backing the public comparison page — Lattice versus AI deck generators and the field
- ☑ [2026-06-14-deck-preview-consolidation.md](2026-06-14-deck-preview-consolidation.md) — Consolidating the docs-site deck-preview render bridges behind shared modules so a render fix lands once, not eight times
- ☑ [2026-06-14-universal-chart-export.md](2026-06-14-universal-chart-export.md) — Universal chart export with a tiered SVG plus in-browser PNG path, correcting the earlier wrong call that PNG was not viable
- ☑ [2026-06-13-coach-canon-knowledge-pack.md](2026-06-13-coach-canon-knowledge-pack.md) — Distilled principle-card pack injecting the presentation canon's qualitative judgement into the cloud-tier Coach prompt
- ☑ [2026-06-13-export-to-marp.md](2026-06-13-export-to-marp.md) — Export to Marp — a portable, Marp-native deck bundle with baked splits, minified palette CSS, and browser runtime
- ☑ [2026-06-13-lfm-standard.md](2026-06-13-lfm-standard.md) — Naming and owning Lattice's Markdown dialect as LFM, a versioned standard over CommonMark and markdown-it
- ☑ [2026-06-13-shared-deck-preview.md](2026-06-13-shared-deck-preview.md) — One shared filmstrip preview controller for all four docs-site surfaces, ending the per-surface render drift
- ☑ [2026-06-13-split-frontmatter.md](2026-06-13-split-frontmatter.md) — A split front-matter key driving heading-based slide division, defaulting to headings, with Marp reframed as an export target
- ☑ [2026-06-13-svg-native-legend.md](2026-06-13-svg-native-legend.md) — SVG-native chart legend and spine via a shared builder, replacing the fixed HTML legend across all four keyed charts
- ☑ [2026-06-12-export-font-embedding.md](2026-06-12-export-font-embedding.md) — Drawing Board export embeds all web fonts, fixing the lazy-load race that dropped off-screen faces to fallbacks
- ☑ [2026-06-12-workbench-component-bridge.md](2026-06-12-workbench-component-bridge.md) — Bridge that carries CSS-only local Workbench components into live render and every export path on the Drawing Board
- ☑ [2026-06-11-autocomplete-self-maintenance.md](2026-06-11-autocomplete-self-maintenance.md) — Self-maintaining autocomplete with gates against central-list drift, plus an IDE-agnostic manifest capability surface
- ☑ [2026-06-11-chart-legend-system.md](2026-06-11-chart-legend-system.md) — Unified chart legend system — the 70/30 right rail, shared spine and catalog across colour-categorical chart members
- ☑ [2026-06-11-drawing-board-frontmatter-config.md](2026-06-11-drawing-board-frontmatter-config.md) — The Drawing Board Deck-setup drawer — a config surface that edits and persists deck front-matter behind the scenes
- ☑ [2026-06-11-emulator-on-engine-p2.md](2026-06-11-emulator-on-engine-p2.md) — P2 of the Marp replacement — put the emulator on lattice-engine, deleting the bespoke regex parser for one markdown impl
- ☑ [2026-06-11-sketch-finish.md](2026-06-11-sketch-finish.md) — Sketch finish — a palette-blind hand-drawn Finish modifier plus the curated carta palette, PDF-fidelity-safe
- ☑ [2026-06-11-universal-token-system.md](2026-06-11-universal-token-system.md) — Universal role-based token system — design, crosswalk, and the phased alias-then-flip migration, phases 1–7 implemented
- ☑ [2026-06-11-workbench-export-bridge.md](2026-06-11-workbench-export-bridge.md) — Export bridge carrying Workbench library themes into the Drawing Board and through every export; components deferred
- ☑ [2026-06-09-shadcn-migration.md](2026-06-09-shadcn-migration.md) — shadcn/React migration of every docs-site surface, website-only inside docs/ with Starlight kept for docs
- ☑ [2026-06-08-inline-code-contrast.md](2026-06-08-inline-code-contrast.md) — Surface-aware contrast contract for the inline-code chip, plus the cross-path pill over-match fix
- ☑ [2026-06-07-drawing-board-phase-1-plan.md](2026-06-07-drawing-board-phase-1-plan.md) — Slice-by-slice Phase 1 walking-skeleton plan for the Drawing Board, shipped gate-green across all six slices in PR #79
- ☑ [2026-06-07-layout-consolidation-result.md](2026-06-07-layout-consolidation-result.md) — Result deck for the layout consolidation that removed four redundant components (58 to 54), each rendered live through its survivor
- ☑ [2026-06-07-layout-redundancy-analysis.md](2026-06-07-layout-redundancy-analysis.md) — Re-opens the layout audit's no-cuts verdict and consolidates components that share form and slot grammar into one component plus variants
- ☑ [2026-06-07-layout-redundancy-clusters.md](2026-06-07-layout-redundancy-clusters.md) — Decision-aid deck rendering each redundancy cluster's members with parallel content to show keep / merge / drop calls
- ☑ [2026-06-07-slot-header-auto-lift.md](2026-06-07-slot-header-auto-lift.md) — Makes slotLabelLift auto-generate slot headers so card-style layouts no longer silently break when authors omit bold
- ☑ [2026-06-06-mermaid-dual-render-prune.md](2026-06-06-mermaid-dual-render-prune.md) — Brings the emulator to the runtime's per-section dual-render standard for Mermaid dark mode, then prunes the redundant CSS override layer
- ☑ [2026-06-05-token-structure-audit.md](2026-06-05-token-structure-audit.md) — Splits the overloaded decorative --text-muted token into independent contrast-graded structural-text roles per theme
- ☑ [2026-05-18-component-reorg-and-modular-css.md](2026-05-18-component-reorg-and-modular-css.md) — Groups the flat lib/components tree into design-system buckets and moves component-specific rules into per-component CSS
- ☑ [2026-05-18-important-audit-phase-35-prep.md](2026-05-18-important-audit-phase-35-prep.md) — Audit of lattice.css !important declarations for @layer activation, separating 21 cascade-workarounds from 331 legitimate library overrides
- ☑ [2026-05-17-chart-family-registry-migration.md](2026-05-17-chart-family-registry-migration.md) — Phase 1 migration of chart-family into the shared transformer registry, covering the HTML and per-section render paths
- ☑ [2026-05-17-roadmap-journey-word-cloud-registry-migration.md](2026-05-17-roadmap-journey-word-cloud-registry-migration.md) — Phase 1 migration of roadmap, journey, and word-cloud into the shared transformer registry, bringing the dispatch to five
- ☑ [2026-05-17-runtime-bundler-esbuild.md](2026-05-17-runtime-bundler-esbuild.md) — lattice-runtime.js becomes an esbuild bundle output that inlines the shared transformer registry, preserving the public path
- ☑ [2026-05-17-shared-transformer-registry.md](2026-05-17-shared-transformer-registry.md) — A shared transformer registry the three render paths consume through one interface, with split-panels as the pilot transformer
- ☑ [2026-05-17-split-panel-rename.md](2026-05-17-split-panel-rename.md) — Renames split-panel to split-list so each split-* suffix uniformly names what the right panel contains
- ☑ [2026-05-15-radar-chart.md](2026-05-15-radar-chart.md) — Design model for the native radar layout — series-major contract, six-variant lineup, shared geometry kernel
- ☑ [2026-05-15-shipped-without-proposal.md](2026-05-15-shipped-without-proposal.md) — Register of layouts that landed without going through the May 4 / May 7 speculative-proposal catalogues
- ☑ [2026-05-12-diagram-elevation.md](2026-05-12-diagram-elevation.md) — Making inner diagram elements read as cards on a categorical band, with band-tonality follow-up shipped in the same branch
- ☑ [2026-05-12-diagram-tokens.md](2026-05-12-diagram-tokens.md) — Migration from --mermaid-* to --diagram-* tokens with palette-blind role naming and contrast assertions
- ☑ [2026-05-12-kpi-redesign.md](2026-05-12-kpi-redesign.md) — Wholesale redesign of the kpi layout into one cohesive base with five layout modifiers built around executive needs
- ☑ [2026-05-12-roadmap-redesign.md](2026-05-12-roadmap-redesign.md) — Redesign of the visually inert roadmap layout into five table-driven concepts shipped as roadmap plus four modifiers
- ☑ [2026-05-11-4k-rendering-audit.md](2026-05-11-4k-rendering-audit.md) — Continuation guide for converting remaining component px values to cqi and resolving every reported 4K visual defect
- ☑ [2026-05-10-multi-resolution-strategy.md](2026-05-10-multi-resolution-strategy.md) — Multi-resolution support via native Marp @size, px-to-cqi refactor, and container-type size on section, opt-in by front-matter
- ☑ [2026-05-07-ascii-preview-geometry.md](2026-05-07-ascii-preview-geometry.md) — Canonical 43-wide pad-2 gap-5 geometry for every ASCII layout preview plus the ascii-preview auditor and builder
- ☑ [2026-05-07-chart-family-experiment-results.md](2026-05-07-chart-family-experiment-results.md) — Overnight experiment build of three chart-family layouts behind a shared chart-frame, feature-class gated
- ☑ [2026-04-30-mermaid-theming.md](2026-04-30-mermaid-theming.md) — Marp :root variable scoping root cause, Mermaid theming contract, and CDN-to-local bundle migration

### Historical — superseded

- ⊘ [2026-06-21-portrait-prose-deboost.md](2026-06-21-portrait-prose-deboost.md) — PURGED 2026-06-22. A deck-wide --prose-deboost token (0.66 portrait, 0.8 square, UNSET landscape) had dense families multiply their body+title font by var(--prose-deboost, 1) to fit the tall frame. The Fit Spine (2026-06-22-the-fit-spine.md) rejects this — it is shrink-to-fit, and readability is a hard floor; density is absorbed by collapse/shed/split, never by lowering the type. Removed from engine, runtime, and all component stylesheets. Kept as the record of why shrink was tried and rejected, so it is not re-introduced. → [2026-06-22-the-fit-spine.md](2026-06-22-the-fit-spine.md)
- ⊘ [2026-06-14-drift-watch-rebase-thrash.md](2026-06-14-drift-watch-rebase-thrash.md) — A watched PR thrashing CI on every main movement during a merge train — two root causes in HARD RULE #16 and the ci gate → [2026-06-15-retire-drift-watch.md](2026-06-15-retire-drift-watch.md)
- ⊘ [2026-06-11-islands.md](2026-06-11-islands.md) — The islands slide-composition model — inset tokens and masthead lift shipped; the canonical vocabulary moved to forms.md → [../../design/forms.md](../../design/forms.md)
- ⊘ [2026-06-10-marp-replacement-proposal.md](2026-06-10-marp-replacement-proposal.md) — Full proposal to replace Marp with the owned lattice-engine — Marp now fully retired as dependency and render path → [../marp-independence.md](../marp-independence.md)

_127 notes — 56 active, 67 shipped (pending teardown), 4 historical. Generated by `npm run decisions:index`; edit a note's front-matter, not this list._

<!-- decisions-index:end -->
