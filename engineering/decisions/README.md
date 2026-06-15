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

- [2026-04-30-mermaid-theming.md](2026-04-30-mermaid-theming.md) — Marp's `:root`
  CSS variable scoping, Mermaid theming contract, CDN-to-local bundle
  migration. Was previously the repo-root `AgentNote.md`.
- [2026-05-04-authoring-proposals.md](2026-05-04-authoring-proposals.md) —
  forward-looking design RFC for the authoring system: component
  model, modifier catalogue, new layout proposals (§3.1–§3.14),
  authoring DX & rollout plan. Explicitly non-canonical; ground
  truth lives in per-component `lib/components/<name>/<name>.docs.md`
  and `examples/gallery.md`. **Status (2026-05-15):** 11/14 Part 3
  proposals Shipped; §3.11 / §3.13 / §3.14 Open. Each proposal
  carries an inline status tag.
- [2026-05-07-chart-family-proposals.md](2026-05-07-chart-family-proposals.md) —
  companion to the May 4 RFC: chart-family layouts that turn
  list/sublist + inline-code pills into timelines, Gantts, pie /
  progress / kanban, plus adjacent candidates. Same component-model
  frame; same non-canonical status. **Status (2026-05-15):** 5/5
  core layouts Shipped (§1 – §3.3); 0/5 adjacent candidates Shipped
  (§4.1 – §4.5). Each proposal carries an inline status tag.
- [2026-05-07-ascii-preview-geometry.md](2026-05-07-ascii-preview-geometry.md) —
  canonical 43-wide / pad-2 / gap-5 geometry for every `` ```text ``
  ASCII layout preview (now in per-component `<name>.docs.md` files
  via `anatomyBlock` manifest references), plus the
  [`tools/ascii-preview.py`](../../tools/ascii-preview.py) auditor
  and builder library.
- [2026-05-10-multi-resolution-strategy.md](2026-05-10-multi-resolution-strategy.md) —
  decision note for multi-resolution support (HD + 4K, candidate 4:3):
  native Marp `@size` + px→cqi refactor + `container-type:size` on section.
  No theme changes; authors opt in via front-matter `size:` key.
- [2026-05-10-tauri-exploration.md](2026-05-10-tauri-exploration.md) —
  v1 architectural shape for the SlideWright desktop app on Tauri.
  Names the personas (primary: Maya, the engineering leader;
  secondaries: Naveen the consultant, Jessamine the solo founder,
  Theo the DevRel/OSS maintainer, Camila the brand-conscious PM,
  Khoa the OSS maintainer; explicit anti-persona Diana, the visual
  designer — we don't compete with Figma/Keynote/Canva).
  **Project positioning: open-source first (MIT, matching Lattice),
  no consumer sales motion, potential enterprise tier later via
  three small v1.0 seams (policy tier in Settings, audit-event
  emission, identity capability hub).** Telemetry flipped to
  opt-in; viral "made with SlideWright" PDF badge; GitHub Sponsors
  funding before any paid tier. Captures
  the product vision (markdown authoring, focused/split/PiP editor
  layouts, collapsible workspace sidebar, multi-format export,
  cloud storage, collaboration, AI, brand theming, extensions &
  connectors) and the load-bearing decisions: no Node in v1, **own
  the engine** (`lattice-engine` replaces the runtime dependency on
  `@marp-team/marp-core`; marp-core stays as a bootstrap until
  gallery parity, then is dropped), Yjs document model, `EditorHost`
  facade over CodeMirror 6, `DiagramService` for Mermaid (with
  render cache), `SlideSegmenter` + `RenderCache` + `PreviewPane`
  for incremental rendering keyed by slide content hash,
  `LayoutShell` for focused/split/PiP modes, `WorkspaceView` for the
  file tree (storage-adapter-blind, opens with a file/folder/last-
  session), UI surfaces via a central command registry (palette ⌘K
  + quick switcher ⌘P + native menu + right-click + status bar;
  toolbar off by default; `when`-clause DSL hides irrelevant items),
  `Settings` (layered defaults → user → workspace; user
  tier in the OS app-config dir, workspace tier in
  `.slidewright/settings.json` parallel to `.vscode/`; extensions
  install at user scope only; secrets stay in keychain),
  `Onboarding` (welcome screen + welcome deck authored as a real
  Lattice deck + spotlight tour engine; extension-contributable),
  provider-agnostic AI (capability hub for any LLM — Claude in v1,
  bundled local model as suggested default in v1.x, Ollama / OpenAI
  / etc. via connectors; `DocsIndex` for RAG grounding over our own
  docs; `ChatPanel` with tool use; `Suggestions` for ambient hints;
  privacy mode forces local-only), `ThemeStudio` for brand palettes,
  worker-sandboxed
  extension runtime with capability hubs (the
  export/storage/AI/diagram/layout adapter interfaces become the
  public plugin API; first-party features dogfood the same API).
  v1-load-bearing probes (live preview parity, single-slide render,
  PDF, PNG, engine retirement) named as the next step, plus a
  Gaps section covering critical pre-v1 decisions (speaker notes
  + presentation mode, save semantics + crash recovery,
  operational infrastructure for auto-update / crash reporting /
  telemetry, code signing lead time, import strategy with PPTX as
  the lever, math rendering, app accessibility, table-stakes
  editor features, performance budgets, document format
  versioning). Authoritative six-release plan (v1.0 → v1.5)
  with three impactful capabilities per release and a cost
  constraint — no dependency on runtime costs we can't control,
  so cloud AI arrives at v1.5 as user-supplied keys only; local
  AI lands at v1.2 instead. Honest plan evaluation: 73/100
  (up from 60 when v1 was monolithic), with named remaining risks
  and probe-style mitigations (H5b / H6b for cross-platform
  WebView parity, H9 for local-AI quality, H10 for doc-drift CI;
  plus operational adds: public ROADMAP.md, Plan B shell of
  Electron + Puppeteer, extension-API semver policy, v1.0 framed
  as abandonment-tolerant). Closes with a development-leverage
  analysis: disciplined use of Claude Code realistically
  compresses v1 from ~18 months to ~10, with the architecture
  doc itself as the high-fidelity prompt. No desktop code yet.
- [2026-05-11-4k-rendering-audit.md](2026-05-11-4k-rendering-audit.md) —
  continuation guide: 65 remaining component-level px values to convert,
  root cause analysis for every reported 4K visual defect, section-level cqi
  ambiguity (padding bleed into header/footer), Mermaid sizing investigation,
  and step-by-step implementation order for the next session.
- [2026-05-15-radar-chart.md](2026-05-15-radar-chart.md) — decision note
  for the native `radar` layout: series-major authoring contract,
  auto-fit/eyebrow scale resolution, the six-variant lineup (each variant
  framed as one boardroom question), the shared geometry kernel, and the
  finding that `--fg` is an undefined token repo-wide.
- [2026-05-15-shipped-without-proposal.md](2026-05-15-shipped-without-proposal.md) —
  register of layouts that landed (in what was then `templates.md`,
  now per-component `<name>.docs.md`) without going through the May 4
  / May 7 speculative-proposals catalogues. Covers
  `word-cloud`, the Split family (Templates 30–34), `quadrant`,
  `radar`, the seven `math*` layouts, and the six legal-family
  layouts. Housekeeping, not history: when a layout ships outside
  the catalogues, add an entry here.
- [2026-06-10-marp-replacement-proposal.md](2026-06-10-marp-replacement-proposal.md) —
  full proposal to replace Marp. Audits exactly what Marp/Marpit does
  for Lattice today (one dep, `@marp-team/marp-cli`; the thin slide
  layer: GFM parse, `---` splitting, directives, `@theme`/`@size`,
  `<section>` chrome, `![bg]`, KaTeX, twemoji/auto-scaling) versus
  what's already ours (the markdown-it plugins, the transformer
  registry, `lattice.css`). Maps the four render paths (emulator +
  runtime already Marp-free; marp-cli + the docs playground still
  coupled), the emulator's hand-rolled-regex parser gaps vs GFM, the
  VS Code question (marp-vscode *is* Marp Core — Scope 1 keeps it),
  and the website's single render seam. Recommends building
  `lattice-engine` on `markdown-it` and a five-phase plan that keeps
  the baselines green. Expands the "Own the engine" section of the
  Tauri note. **Status: shipped / superseded** — Marp is fully retired;
  see [`engineering/marp-independence.md`](../marp-independence.md).
- [2026-06-13-coach-canon-knowledge-pack.md](2026-06-13-coach-canon-knowledge-pack.md) —
  design model for giving the cloud-tier Coach the presentation canon's
  *qualitative* judgement (Minto / Duarte / Knaflic / *Pitfalls* / Zen)
  via a distilled **principle-card pack** injected into the Converse prompt
  — not OpenRouter file upload (which re-bills a book per call and is
  copyright-exposed). Reuses the shipped `architect-knowledge.js` cloud-only
  injection pattern, retrieval-gating (`architect-retrieval.js`), prompt
  caching (`cache_control`), and the `usage.cost` budget tally; degrades to
  the deterministic floor. Cloud-tier-only by design. **Status: spec / open.**
- [2026-06-14-github-project-management.md](2026-06-14-github-project-management.md) —
  lightweight, kanban-light project management that keeps durable design knowledge
  in markdown ADRs (vendor-neutral) while adding GitHub Issues as a claimable work
  queue + a per-repo Project board, mirrored back to a generated `BACKLOG.md`. Flat
  cards grouped into swimlanes by label (decision doc = swimlane; no
  sub-issue trees), an `area/type/priority(critical–low)/status` taxonomy, an enforced
  Definition-of-Ready (template + label-gate Action), and the atomic-claim primitive
  that lets agents pick up work distributed-but-safe (L3, deferred — race-free lock
  designed then). Ship L1+L2 first. **Status: design-decision** (open questions
  resolved 2026-06-14).
- [2026-06-14-deck-print-styling.md](2026-06-14-deck-print-styling.md) —
  print support that survives the trip to the boardroom, on paper, in colour
  *and* black-and-white. Separates the two surfaces (the CLI/puppeteer colour
  PDF is already landscape/full-bleed/exact-colour and stays; the web "Print"
  button = bare `window.print()` into the browser's portrait dialog is the "ugly
  as sin"). Core gap: nothing survives grayscale (every palette encodes meaning
  in hue). Decision (paper-first; dedicated print theme mode; design-doc-first):
  a `--print-*` **token band** per theme selected by an explicit `print` mode —
  the same move as the existing `--dark-*` band, *not* plain `@media print`
  (which would also strip the colour PDF). B&W survivability via border + stepped
  lightness + SVG pattern fills, gated by extending `contrast.test.js` to white.
  Orientation prefill answered two ways: landscape PDF MediaBox + `/PrintScaling
  /None` (the strong, dialog-free path), and `@page { size: A4 landscape }`
  keyword to prefill the `window.print()` dialog. Resolves paper-fit
  (scale-to-fit-center, paper-blind; auto-pick closest sheet — 16:9→Legal,
  4:3→Letter/A4), grayscale ramp (borders + stepped grays + SVG pattern fills),
  the `mode: print` trigger (export option + front-matter), and CLI parity
  (engine `--print` flag). Recommends Build A (fix the web path) now + Build B
  (print band + auto-paper-fit PDF export) as the real deliverable.
  **Status: design-decision** (open questions resolved 2026-06-14).
- [2026-06-14-drift-watch-rebase-thrash.md](2026-06-14-drift-watch-rebase-thrash.md) —
  a watched PR rebased on *every* `main` movement during a parallel merge train,
  thrashing CI (~6 force-pushes, ~5 cancelled runs, a spurious red `ci` gate).
  Two root causes: HARD RULE #16 had no debounce and conflated *behind* with
  *must-rebase-now*; and the `ci` aggregate gate mapped a supersession
  `cancelled` → failure. Fix: rebase only at the moments that matter (conflict +
  the two merge-time checkpoints), keeping the watch as a detector; and treat a
  `cancelled` tier as non-failing. **Status: superseded-in-part** by
  `2026-06-15-retire-drift-watch.md` (the watch is dropped entirely; root-cause
  analysis still holds).
- [2026-06-15-retire-drift-watch.md](2026-06-15-retire-drift-watch.md) —
  retires the continuous background drift watch altogether. Even debounced, the
  poller + its self-check-in timers flooded the chat, and the async
  `mergeable_state` triage was brittle. Replaced with **rebase-before-push**: fetch
  + rebase-if-behind right before every push, plus one re-check before an
  authorized merge; a green PR may sit behind `main` until then (harmless under
  squash-merge). Merge queue remains the structural fix if cross-session races
  recur. **Status: design-decision.**
- [2026-06-14-read-aloud-kokoro.md](2026-06-14-read-aloud-kokoro.md) —
  design model for a free/near-free, boardroom-quality read-aloud voice. Bans
  the browser `speechSynthesis` (per-device lottery, never Siri — kept as a
  dev/test stand-in only) in favor of **one consistent voice** via a `VoiceModel`
  **voice ladder** (twin of `architect-model.js`). Two complementary production
  rungs: **`openrouter-tts`** (primary — OpenRouter shipped a real
  `POST /api/v1/audio/speech` endpoint in 2026 with gpt-4o-mini-tts / Gemini
  Flash TTS; reuses the app's existing **browser OAuth key + CORS**, so no new
  infra, **$0 to the project**, ~0.6¢/slide on the user's own credit) →
  **`kokoro-wasm`** (Kokoro-82M ONNX in-browser for the no-account/offline/
  privacy-max case — $0, ships ~80–330 MB weights) → `speechSynthesis` (test
  only) → `silent` floor. Corrects an earlier draft that wrongly called
  OpenRouter a dead end (it had no TTS *then*). First surface: **Practice/
  Rehearsal mode**, speaking the slide's speaker note (`notes-core.js`) synced to
  the existing dwell targets + pause beats; second: the **Tauri authoring
  preview** (gains a native Kokoro rung later). Includes a real cost table.
  **Status: design** — architecture settled; build scope (OpenRouter-first vs.
  full ladder) is the open call.
