# Deck-preview consolidation — shared render bridges

**Status:** Tier 1 landed (`#327` follow-up, c91f4c2c); Tier 2 (drawing-board
controller extraction) done — see PR2 below. Follows the shadcn migration (PRs #319–#325).
**Why:** the docs site renders Lattice decks into live previews from ~7 bridges
with two real duplication classes. The migration left these copy-pasted; this
consolidates them behind shared modules so a render fix lands once, not eight
times. *No broken windows* — done surgically, behaviour-preserving, verified.

---

## The map (what renders a deck today)

| Bridge | File | Role |
|---|---|---|
| engine loader | `src/lib/load-engine.ts` | shared on-demand `window.LatticePlayground` injector (already shared — keep) |
| filmstrip controller | `src/playground/deck-preview.js` | **superset** multi-slide renderer (patch/rewrite, FIT/SYNC agents, content-visibility). Used by playground, drawing-board, both workbench studios — already shared (keep) |
| playground bridge | `src/lib/playground-engine.ts` | React bridge → deck-preview |
| landing bridge | `src/lib/landing-engine.ts` | single-slide srcdoc renderer for landing islands |
| specimen bridge | `src/playground/live-render.js` | single-slide srcdoc renderer for component pages |
| drawing-board controller | `src/pages/drawing-board.astro` (is:inline) | render loop → deck-preview (+ token-flip, cursor-sync) |
| practice / focus | `src/playground/drawing-board-{practice,focus}.js` | own single-slide srcdoc builders |
| studios | `src/playground/{theme,component}-studio.js` | render → deck-preview |

## The two duplication classes

1. **Theme fetch + `addThemes` (the "ensureThemes" pattern)** — copied across
   **8 modules**: playground-engine, landing-engine, live-render, drawing-board
   (inline), drawing-board-focus, drawing-board-practice, theme-studio,
   component-studio. Drawing-board adds a token-flip variant.
2. **Single-slide srcdoc renderer** — `landing-engine.ts` and `live-render.js`
   are ~150-line **byte-for-byte equivalent** modules (theme-fetch → srcdoc →
   iframe-scale). The ONLY real difference: `live-render` lazy-imports the
   font-embed CSS; `landing-engine` does not (a latent landing font bug). These
   back **3 landing islands + 53 component specimen pages = 56 render sites**.

`deck-preview.js` (filmstrip) is the already-consolidated multi-slide superset —
leave it; it is not the duplication.

---

## Consolidation boundary

**Extract (shared):**
- `src/lib/theme-fetch.ts` — `createThemeFetcher(themeBase)` → `{ fetch, ensure, has }`
  (fetch + cache + `PG.addThemes`). The 8 sites call it; drawing-board wraps it
  for its token-flip + universal-suffix variant (keeps that surface-specific bit).
- `src/lib/single-slide-render.ts` — one `createSingleSlideRenderer(opts)` →
  `{ renderInto, whenReady, onThemeChange }`, merging landing-engine + live-render.
  **Includes the font-embed lazy-import** so the landing gets it too (the fix).
- `src/components/DeckPreview.tsx` — the React single-slide wrapper (used by
  HeroPreview, RestyleShowcase, FieldCardsLive); Specimen uses the function form.
- *(optional)* `src/lib/use-deck-render.ts` — thin hook de-boilerplating the
  Playground/Workbench React mounts.

**Leave per-surface (intentional divergence):**
- `deck-preview.js` filmstrip (already shared superset).
- Playground `renderSig` (pure, in playground-controller.ts).
- Workbench studios (already render through deck-preview).
- Drawing-board cursor↔slide sync, token-flip, slide-start cache (Tier 2 only,
  and only the controller *shell* is extracted; the DB-specific logic stays).

---

## Plan (risk-isolated PR stack, merge bottom-up, never unasked)

**PR1 — shared render (this branch, low risk):**
1. `theme-fetch.ts` + migrate the React/bundled sites (8 → 1).
2. `single-slide-render.ts` + `<DeckPreview>`; rewire the 3 landing islands +
   specimen; delete the losing duplicate. Carry the font-embed fix.
3. *(optional)* `use-deck-render.ts`.

**PR2 — drawing-board/practice/focus (higher risk, separate branch):**
4. Extract the drawing-board inline controller to a vanilla module; keep the
   is:inline shim thin; preserve token-flip + cursor-sync exactly. **Done** —
   `src/playground/drawing-board-render.js` (`createRenderController(data)`); the
   `.astro` is:inline controller is replaced by a thin module-`<script>` bootstrap
   that imports + calls it. The controller is order-independent (event/global
   wiring + a PG/DP polling guard), so the deferred-module move preserves the prior
   is:inline behaviour. Theme fetch/cache delegates to the shared `theme-fetch.ts`;
   the DB-specific universal token-flip wrapper (`variantize`, suffixed
   `lattice-u`/`<pal>-u` registration) stays in the controller.
5. ~~Point practice + focus at the shared `buildSrcdoc`.~~ **Deferred — kept
   standalone (deliberate).** `buildSrcdoc` stacks *all* sections and scales to
   *width only* (`fitAgent` does `sc = w/SW`); practice's `frameDoc` and focus's
   `frame` render a *single* slide scaled to fit *both* width AND height, and
   practice additionally drives a `pv` postMessage slide-navigation. `buildSrcdoc`
   has no single-slide fit-both-dimensions mode and no `pv` agent even with
   `sync/clamp/contentVisibility=false`, so pointing them at it would be a
   behaviour regression (wrong fit math, lost presenter navigation) — exactly the
   "knob makes it riskier than the duplication it removes" carve-out. A future
   `buildSrcdoc` `mode: 'single'` (fit-both + optional `pv`) could reunify them;
   left for a dedicated change so this higher-risk tier stays behaviour-preserving.

   **Residual (noted, not done in Tier 2):** practice + focus still inline-copy the
   *raw theme fetch/cache* in their own `ensureTheme(name)` (practice 68-77, focus
   42-51) — duplication class #1, the "8 → 1" goal — so that count is really
   "6 → 1 + 2 copies." Migrating them onto `createThemeFetcher` is the low-risk
   *half* of goal #5, BUT it is not a no-op: their raw `fetch().then(r=>r.text())`
   skips the shared fetcher's `!r.ok` throw, the named-theme fetch is wrapped in
   `.catch(()=>{})`, and they call `ensureTheme(palette)` + `ensureTheme(palette+'-dark')`
   as two separate units rather than the shared `ensure(palette, mode)`. So a clean
   migration is a small behaviour change (a 404 would throw instead of feeding an
   error body to `addThemes`) — left out of this behaviour-preserving tier; land it
   as its own small PR1 follow-up, mapping `ensureTheme` onto `themeFetcher.fetch`/`ensure`.

## Verification (every PR)
- `npm run lint`, `npx vitest run`, `astro build`, `npm run check:overflow` — green.
- **Visual (the bar):** screenshot the landing previews + a representative
  component specimen page (and for PR2: drawing-board render, cursor-sync,
  practice, focus, a real export) at desktop/tablet/mobile; pixel-compare
  before/after — **byte-identical render output is the goal** (behaviour-preserving).
- Maker-checker (inspection + assessment) on each non-trivial diff.
- No `lib/`, `themes/`, `dist/` change (engine untouched).
