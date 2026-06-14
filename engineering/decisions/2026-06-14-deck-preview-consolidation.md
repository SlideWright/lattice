# Deck-preview consolidation — shared render bridges

**Status:** in progress (Tier 1 first). Follows the shadcn migration (PRs #319–#325).
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
   is:inline shim thin; preserve token-flip + cursor-sync exactly.
5. Point practice + focus at the shared `buildSrcdoc` (`sync/clamp/contentVisibility=false`).

## Verification (every PR)
- `npm run lint`, `npx vitest run`, `astro build`, `npm run check:overflow` — green.
- **Visual (the bar):** screenshot the landing previews + a representative
  component specimen page (and for PR2: drawing-board render, cursor-sync,
  practice, focus, a real export) at desktop/tablet/mobile; pixel-compare
  before/after — **byte-identical render output is the goal** (behaviour-preserving).
- Maker-checker (inspection + assessment) on each non-trivial diff.
- No `lib/`, `themes/`, `dist/` change (engine untouched).
