# Studio depth — session handoff

> **Status:** work-in-progress on PR #567, branch
> `claude/app-ui-ux-redesign-9nye8h`. This doc is a handoff for continuing the
> "make the Studio genuinely deep" effort. **Delete it before the PR merges.**

## The mission

The Studio (`docs/src/components/studio/`, route `/studio/`) is the app-redesign
prototype. It started as a high-fidelity shell where many controls were
placeholder toasts. The standing directive: **replace every placeholder with
real functionality wired to the existing engine/playground cores, verify
visually, test it, and keep going until the Studio is feature-complete** — it
"felt hollow" at ~⅓ parity with the shipped Drawing Board. We are closing that
gap, surface by surface.

**The golden rule (HARD RULE #1 + #15): reuse the real cores, don't reinvent.**
Almost everything is wiring the Studio to code that already exists in
`docs/src/playground/*` and `lib/*`. Before building anything, find the core.

## How to run / verify / gate

- **Tests (inner loop):** `cd docs && npm run test -- src/components/studio/`
  (currently **99 passing**). Run the WHOLE docs suite before a push:
  `npm run test` (≈196). Vitest config has the `@/` alias; run from `docs/`.
- **Lint:** `cd docs && npx biome check src/components/studio` (auto-fix:
  `--write`). Biome enforces import sorting + `noArrayIndexKey` +
  `useExhaustiveDependencies` — expect to add `// biome-ignore` with a reason or
  refactor. `npm run lint` is the repo-wide gate.
- **Build (prod, catches what dev masks):** `cd docs && npm run build` (builds
  the `/studio/` route; also re-versions playground assets → **dev server goes
  stale, restart it after any build**).
- **Dev + visual verify:** `cd docs && npm run dev` → `http://localhost:4321/studio/`.
  After a build, `rm -rf node_modules/.vite` then restart. Vite re-optimizes deps
  on first load of a new bundle import (504 "Outdated Optimize Dep") — **the
  puppeteer scripts reload once after ~3.5s to dodge this**. Visual checks use
  `node` + the vendored puppeteer (`process.env.CHROME_PATH`); see
  `/tmp/.../scratchpad/shot-*.js` patterns (navigate → wait 3.5s → reload → drive
  UI → screenshot). Engine renders inside an iframe; the studio loads the engine
  on demand (`window.LatticePlayground`).
- **Commit msgs:** `area(scope): summary`; end with the Co-Authored-By +
  Claude-Session trailers (see existing commits). Hooks run affected-tests + lint
  on commit; pre-push runs more. Rebase onto `origin/main` before an authorized
  merge (branch is ~7 behind; those commits don't touch studio files).
- **Merge is a human gate** — never self-merge. The GitHub MCP server may be
  disconnected mid-session; if so you can't post/merge, only push via git.

## Architecture / key files (Studio)

- `StudioShell.tsx` — the orchestrator island (~700 lines). Holds source/deck
  state, the front-matter split, all handlers, renders the panels. **Read this
  first.** Props: `{ options, components, lintVocab }` from `studio.astro`.
- `studio.astro` — the page. **Build-time Node** reads `dist/docs/components.json`
  (the insert/autocomplete catalog) and `buildVocab(loadAll())` (the lint vocab),
  serialized as island props. Add new build-time data here.
- `deck-ops.ts` — pure slide ops (add/duplicate/delete/move/replaceSlide);
  front-matter-preserving. Tested.
- `front-matter.ts` — read/write the leading `---` block (size/paginate/header/…).
  `slides` is derived from `stripFrontMatter(source)`. Tested.
- `slide-notes.ts` — read/write a slide's `<!-- note: … -->` speaker note. Tested.
- `studio-store.ts` — ALL localStorage persistence (`lattice-studio-*`): deck
  index, per-deck source, settings, checkpoints (version history), chat history.
  Tested. `Date.now()` is fine here (app code).
- `architect.ts` — the AI layer. `runArchitect` (one-shot actions),
  `chatComplete` (chat turns → reply + proposed diff), `useArchitectStatus`,
  connect/disconnect OAuth, `architectSpend`/`setBudget`. Wraps
  `architect-model.js` + `architect-edits.js`. Honest offline/blocked.
- `editor-complete.ts` — CodeMirror autocomplete source (components/front-matter/
  fences). `Editor.tsx` wires autocomplete + the real lint (via
  `@/playground/editor-diagnostics.js` + `authoring-core.generated.js`).
- `read-aloud.ts` — `slideToSpeech` + `useReadAloud` (teleprompter + voice ladder
  `voice-model.js`). `share-export.ts` — Share via `drawing-board-export.js`.
- Components: `ArchitectChat.tsx`, `Fabricate.tsx`, `PresentOverlay.tsx`,
  `ShareSheet.tsx`, `WorkspaceSheet.tsx`, `InsertComponent.tsx`,
  `CommandPalette.tsx`, `Editor.tsx`, `DeckPreview` (`@/components/DeckPreview`).

## DONE (all committed, tested, visually verified, green on #567)

Original 7 "honest wins" (replaced toasts): Fabricate theme derivation;
read-aloud teleprompter + voice ladder; Share exports (PDF/PPTX/Marp/Print/MD);
rehearsal planner in Present; deck/edit/settings persistence; Inspector
front-matter controls; honest AI Architect (connect/spend/edit-apply). Plus a
maker-checker pass (budget-cap gate + 5 correctness fixes).

Depth slices since the gap audit:
- **Compose (complete):** slide toolbar (add/dup/move/delete, `deck-ops.ts` +
  rail toolbar); insert-component palette over all 53 components
  (`InsertComponent.tsx`, catalog from `studio.astro`); context-aware
  autocomplete (`editor-complete.ts`); **real grammar lint** — the shared
  `lint-core` via `editor-diagnostics.js` + `authoring-core.generated.js`
  (severity tiers, hover fix, per-finding quick-fix, real Fix-all).
- **Settings + library (partial):** deck import (`.md` → titled deck); version
  history (Inspector timeline, manual + auto-before-AI checkpoints, restore);
  editable session budget cap.
- **Architect (core done):** real chat thread with **Apply/Discard diff cards**
  (`ArchitectChat.tsx` + `chatComplete`); honest connect/spend in Workspace.
- **Present + Fabricate (partial):** speaker notes (author → exported LFM note →
  read aloud); Fabricate starter palettes (Dusk/Ember/Pine/Slate).

## TODO — remaining depth (prioritized; reuse cores noted)

Each should: reuse the existing core, be visually verified, carry tests, and be
its own commit. Rough order by value.

1. **Present: dual-screen presenter window.** **DONE** (branch
   `claude/studio-depth-presenter-window`): extracted a shared kernel
   `presenter-window.js` (buildStageDoc + buildPresenterDoc + the window.open /
   postMessage controller) from `drawing-board-present.js`; the Drawing Board now
   drives the kernel (no behavior change), and the Studio's "Presenter screen"
   button opens the synced second window via `studio-presenter.ts` (full-deck
   render → stage doc; current+next+notes+timer). **Gotcha fixed:** the stage
   doc's runtime `<script src>` must be ABSOLUTE — in the second window the
   srcdoc iframe's base is `about:blank`, so a root-relative URL stalls the
   inline reveal/fit scripts (slides parse but stay hidden). Headless note: these
   scaled stage iframes don't paint in puppeteer screenshots (the shipped DB
   Present shows the same), so the slide paint is DOM-verified, not pixel-shot.
2. **Fabricate: real Component/Layout Studio.** The "Layout" tab is a density
   radio only. Reuse `component-studio.js` + `layout-core.generated.js` (manifest
   inspect, CSS/skeleton, gate findings).
   - **DONE — Theme-tab depth** (branch `claude/studio-depth-fabricate-theme`):
     all 10 essentials editable; light/dark specimen toggle via a `modeOverride`
     threaded through `single-slide-render.ts`/`DeckPreview` (emits
     `color-scheme` so `light-dark()` resolves); **save-to-library** via
     `theme-library.ts` over the shared `asset-store.js` (IndexedDB
     `lattice-workbench`) + `themeAsset`, with saved themes selectable in the
     Inspector Look group + topbar menu and threaded into the compose preview,
     Present, and Share/export (`extraTheme`). **Gotcha fixed:** the saved CSS's
     `@theme <name>` must equal the record name (slug of the label) or the engine
     registers the theme under the CSS name while the deck renders by record name
     → a blank, unthemed render. Re-serialize at save with the slug name.
   - **DONE — Component/Layout Studio** (branch
     `claude/studio-depth-layout-studio`): the Layout tab is now a real local-
     component authoring surface (`LayoutStudio.tsx`) — name a `.<name>`-scoped
     component, write CSS + skeleton, see the live deterministic gate
     (`layout-core.generated.js` `gateCss`/`skeletonInvokes`: no-hex, scope-leak,
     skeleton-invokes), preview it live (new `extraCss` hook on
     `single-slide-render.ts`/`DeckPreview`), and save to the shared library
     (`component-library.ts` over `asset-store` + `componentAsset`).
   - **DONE — Insert + render saved local components** (branch
     `claude/studio-insert-local-component`): saved local components surface in the
     InsertComponent palette under a `local` group (front of `BUCKET_ORDER`);
     inserting drops the skeleton as a new slide. The CSS of the local components
     the deck actually uses (`usedComponents(source)` ∩ saved) is composed into one
     `usedLocalCss` string and injected as `extraCss` everywhere the deck renders —
     compose preview, presenter window (`studio-presenter.ts` → `buildDeckRender`),
     and Share exports (`share-export.ts` `buildDeckRender`/`sharePdf`/`sharePptx`/
     `sharePrintDeck`). Local names also fold into the editor's known-set
     (`knownWithLocal`) + completion list so validation never flags them.
     **Gotcha fixed:** `refreshComponents` must keep a STABLE array reference when
     the resolved list is unchanged (the store resolves async to a fresh — often
     empty — array each call); otherwise `localComponents` identity flips,
     `knownWithLocal` churns, and the editor re-inits mid-edit and wipes its doc.
3. **Settings: model picker + voice/weight management.** Reuse
   `architect-model.js` `listOpenRouterModels()`/`setOpenRouterModel()` and
   `voice-model.js` (`createVoiceModel().availability()`, Kokoro summon/download,
   voice list + play-sample) and `drawing-board-settings.js`. Note: the picker
   only works once OAuth-connected, so it's lower demo value without a key.
4. **Present: rendered slide thumbnails + autoplay.**
   - **DONE — slide sorter** (branch `claude/studio-present-thumbnails`): a
     **Slides** button + **G** key open `SlideOverview.tsx` — a grid of rendered
     thumbnails (DeckPreview, the same engine render as the stage) over the presented
     set; click to jump + close, current marked. **Perf:** thumbnails are WINDOWED —
     each defers its render via `DeckPreview active={false}` until an
     `IntersectionObserver` brings it into view (then renders once and stays), so a
     long deck never mounts dozens of iframes at once. **Gotcha fixed (visual only):**
     the thumbnail render is an engine iframe, which swallows the click (separate
     document) — the DeckPreview must be `pointer-events-none` so the wrapping
     button's onClick fires. jsdom has no real iframe, so the unit test passed while
     the live UI was dead until the pointer-events fix; caught by puppeteer.
   - **TODO — autoplay:** chain read-aloud across slides. `useReadAloud` `advance()`
     calls `stop()` at the end but exposes no "finished naturally" signal (it also
     stops on slide change / manual pause) — add an `onFinish` option fired only on
     natural completion, then on finish advance + auto-play the next slide's reader
     (mind the text-change `stop` effect — play AFTER it settles). Voice-gated, so
     lower value without a connected voice.
5. **Architect: selection Refine + per-finding AI fix.**
   - **DONE — selection Refine** (branch `claude/studio-architect-refine`):
     selecting prose in the editor reveals a **Refine** dropdown
     (Polish/Formalize/Elaborate/Shorten) that rewrites JUST the selection via the
     model and applies it as one undoable transaction, checkpointing first. Reuses
     the pure refine kernel from `drawing-board-refine.js` (`REFINE_ACTIONS` +
     `buildRefinePrompt` + `cleanRewrite`) through a new `architect.ts`
     `refineSelection(action, text)` (honest `offline`/`blocked`/`nochange`). New
     editor-selection plumbing: the `EditorHandle` gained `getSelection()` +
     `replaceSelection()`, and an `onSelectionChange(hasSelection)` prop gates the
     control. **jsdom note:** CodeMirror selection can't be driven headless, so the
     apply path is proven via a stubbed-Editor wiring test
     (`studio.refine.test.tsx`) + `refineSelection` honesty units, and the live
     selection→menu was verified visually.
   - **DONE — per-finding AI fix** (branch `claude/studio-architect-finding-fix`):
     the Coach panel surfaces the deck's real lint-core findings (new
     `studio-lint.ts` `listFindings` over `authoring-core.generated.js`
     `lintTextWith` — the same list the editor underlines, local names folded in) as
     a "N to address" card; with a model ready each row grows a **Fix with AI**
     button → `architect.ts` `requestFindingFix` (wraps `architect-fix.js`
     `requestSlideFix`, passing the `components` prop as the catalog) → a reviewable
     diff via the chat's now-exported `DiffCard`. Apply checkpoints + splices via
     `applyDeckEdit`; Discard drops it. Honest with no model (list shows, no fix
     button, points at Workspace). **This completes the Architect depth line of #580.**
6. **Present depth misc:** progress spine, fullscreen, swipe gestures
   (`drawing-board-present.js`).

The original gap audit (the authoritative remaining-work list) is summarized in
the PR thread; the full Drawing Board surface lives in `docs/src/playground/`.

## Conventions / gotchas

- **Reuse, don't reinvent.** Find the core in `playground/`/`lib/` first.
- **Build-time data → `studio.astro`** (Node), serialized to the island. The
  catalog + lint vocab already flow this way; add more there.
- **Persistence → `studio-store.ts`** (`lattice-studio-*`). Tests clear
  localStorage in `vitest.setup.ts` afterEach.
- **The rail's slide count must equal the slide total** — a fuzz test asserts
  `nav[aria-label="Slide navigator"] button.length === total`. Keep toolbars
  OUTSIDE the `<nav>`.
- **Editor rebuilds on `knownComponents` identity change** (validation toggle);
  the real lint gates on `known.size > 0`.
- **jsdom gaps** are polyfilled in `vitest.setup.ts` (matchMedia, ResizeObserver,
  Range rects, `window.prompt`, `Element.scrollTo` is guarded with `?.`).
- **Don't fake AI.** With no model the floor returns only the fallback — degrade
  honestly (`offline`/`blocked`), never a fabricated edit. The architect respects
  the hard budget cap.
- **Async lint/chat import** the heavy bundle lazily; tests use a generous
  `waitFor` timeout (~5–6s) for the first import.
