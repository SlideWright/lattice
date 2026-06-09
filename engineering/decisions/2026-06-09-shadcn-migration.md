# shadcn migration — the website (and the shared SlideWright UI layer)

> Status: **PLAN — awaiting checker sign-off + author approval.** No
> production code has moved. This document is the contract we execute
> against. Each phase is a maker-checker gate; nothing merges until the
> checker passes the per-PR checklist in §5.

## 1. Why

We have been rolling our own website components — ~4,400 lines of bespoke
CSS, ~5,000 lines of vanilla-JS DOM apps, and hand-written Astro
components. That is good craftsmanship but it is not sustainable: the most
expensive, error-prone parts (focus management, keyboard nav, ARIA,
dialog/menu/tabs behavior) are re-implemented by hand on every surface.

Two things make a component framework worth the migration cost now:

1. **Our site is unusually app-like.** The Drawing Board and Playground
   are real apps (editors, chat, settings, dialogs) — shadcn's sweet spot,
   not a marketing-site over-reach.
2. **A second consumer amortizes the cost.** We are building a Tauri
   desktop app (SlideWright) that already embeds the same engine. A Tauri
   shell is a React webview; if the website and the desktop app share one
   component library and one token system, we build the authoring UI
   **once for both**. That flips the ROI on the riskiest surface (the
   Drawing Board) from "website maintenance" to "desktop's core UI, built
   ahead of time."

**Honest framing (the contract for the whole effort):** shadcn + Tailwind
become the spine for the *website's UI scaffolding and app surfaces*,
retiring bespoke CSS and hand-rolled interactive widgets. **Lattice's own
component catalog (the 12 buckets) and the slide-engine visual contract
(`lattice.css` + the palette tokens) are untouched.** shadcn governs the
*chrome and the authoring apps*; the Lattice catalog governs the *slide
components being showcased*. The token-bridge file (§4.2) is the one seam
where the two systems meet, and we keep it honest.

shadcn is **not** "less code" — its components are copied into our repo and
we own them. The win is *correct accessibility and a consistent vocabulary
we did not have to design*, plus a stack every AI tool already understands
(this is a heavily agent-driven repo).

## 2. End state

- One component spine — **React + Tailwind v4 + shadcn/ui** — across the
  whole website and, via a shared workspace package, the desktop app.
- **No Starlight.** It is kept only as disposable scaffolding through the
  early phases; the final phase replaces it with a shared React/shadcn MDX
  docs reader so the *one surface that cannot travel to desktop* stops
  being an exception. End state has a single token system and a single
  component model everywhere.
- **`packages/ui`** (React + shadcn, private workspace package) and
  **`packages/core`** (framework-agnostic pure logic — the model ladder,
  the architect/coach/chat engines, the editor adapter, the store) are
  consumed by `docs/` (website, first consumer) and `apps/desktop` (Tauri,
  second consumer).
- Selecting a palette in the topbar drives **shadcn components, the
  remaining bespoke CSS, and the rendered specimens** from the **single
  existing source of palette truth** (`themes/*.css`). All 14 palettes ×
  light/dark continue to work everywhere.
- The engine (`@slidewright/lattice`) is unchanged in behavior, build,
  publish, and exports. It simply also becomes the workspace root.

## 3. Decisions locked (the forks we already resolved)

| Fork | Decision | Why |
|---|---|---|
| Runtime / "is Astro-islands janky?" | **React islands**, principled boundary | Islands are Astro's first-class model; jank comes from undisciplined use, which §4.3 forbids. React (not Preact/Svelte port) because **desktop shares the exact components.** |
| Repo topology | **Monorepo, npm workspaces** | User decision. Shared `packages/ui` + `packages/core` consumed by web + desktop. |
| Engine package | **Stays at root**, becomes workspace root | Avoids moving `dist/`, `themes/`, `lib/`, the npm `exports`, and every CI path filter. Lowest blast radius (see §8). |
| Starlight | **Keep as scaffolding, replace in the final phase** | It is the only surface that *cannot* run in the React desktop app; a shared React docs reader serves both. Small content volume makes replacement cheap — but not Phase 1. |
| Drawing Board | **Strangler-fig**, engine port last, sub-phased | ~5k LOC vanilla JS, but the logic is already pure factories (§7). Reskin shell first, port engine module-by-module into `packages/core`. |
| Token strategy | **Bridge shadcn tokens onto the existing 10 palette tokens** via a generated file | Preserves the 14-palette product identity; one source of truth (§4.2). |

## 4. Architecture

### 4.1 Workspace layout (minimal-move)

```
lattice/
├── package.json          # @slidewright/lattice (engine) + "workspaces": ["docs","packages/*","apps/*"]
├── lib/ themes/ tools/ dist/   # ENGINE — unchanged paths (publish + CI filters stay valid)
├── docs/                 # Astro site — stays at this path; becomes a workspace member
├── packages/
│   ├── ui/               # @slidewright/ui  (private) — React + Tailwind + shadcn components + the token bridge
│   └── core/             # @slidewright/core (private) — framework-agnostic logic lifted from docs/src/playground
└── apps/
    └── desktop/          # Tauri + Vite + React (Phase 7 / handed to desktop kickoff) — consumes ui + core
```

Rules:
- Root **remains** the published `@slidewright/lattice`. `packages/*` and
  `apps/*` are `"private": true`, never published.
- **Do not move** `dist/`, `themes/`, `lib/`, or the `docs/` path. The
  engine build orchestration, the `docs/` asset-sync scripts, the GitHub
  Pages trigger paths, and the CI `code`/`docs` path filters all stay
  valid (§8 lists what *would* break if we moved them — we don't).
- `packages/ui` component names are **prefixed/namespaced** (or simply
  distinct) so none shadow an engine layout name (`card`, `grid`, …); the
  ownership guard is not workspace-aware (§8-G).
- `packages/core` is created lazily, when the first pure module is lifted
  (Phase 5b), to avoid premature abstraction.

### 4.2 The token bridge (the linchpin)

Single source of truth today: `themes/<name>.css` → `tools/build-docs-portal.js paletteCss()`
→ `tools/build-landing-tokens.js` → committed `docs/src/styles/lattice-tokens.generated.css`,
emitting 10 tokens per `html[data-palette][data-mode]` block (`--bg`,
`--bg-alt`, `--border`, `--text-heading`, `--text-body`, `--text-muted`,
`--accent`, `--accent-soft`, `--on-accent`, `--bg-dark`). Runtime: topbar
writes `data-palette`/`data-mode` on `<html>` + localStorage
(`lattice-docs-palette`/`lattice-docs-mode`), with a FOUC pre-paint script
and a `pageshow` re-sync.

We **extend the same generator** (or add a sibling `build-shadcn-bridge.js`
wired into `tools/build.js` with a `:check` freshness gate + a lefthook
glob) to emit shadcn's semantic tokens mapped onto those 10, per
palette/mode:

```css
html[data-palette="indaco"][data-mode="light"]{
  --background: var(--bg);          --foreground: var(--text-body);
  --card: var(--bg-alt);            --card-foreground: var(--text-body);
  --popover: var(--bg-alt);         --popover-foreground: var(--text-body);
  --primary: var(--accent);         --primary-foreground: var(--on-accent);
  --secondary: var(--bg-alt);       --secondary-foreground: var(--text-heading);
  --muted: var(--bg-alt);           --muted-foreground: var(--text-muted);
  --accent: var(--accent-soft);     --accent-foreground: var(--text-heading);
  --border: var(--border);          --input: var(--border);  --ring: var(--accent);
  --radius: <structural, not palette>;
}
/* …emitted for all 14 × 2 …  (mapping table reviewed once, generated forever) */
```

Consequences:
- A palette change **automatically** restyles every shadcn component — no
  per-component theming, because shadcn reads `--background`/`--primary`/…
  which now resolve through the palette tokens.
- The bridge is a **committed, freshness-gated artifact** (like
  `lattice-tokens.generated.css`) so it can never drift from `themes/`.
- Structural tokens (`--radius`, shadows, spacing) are **palette-blind** —
  defined once in `packages/ui`, mirroring the engine's "no hex literals,
  always `var(--token)`" rule.
- The rendered-deck iframes are unaffected: they already load raw
  `themes/<name>.css` into an isolated `srcdoc` and must keep doing so
  (Tailwind preflight must **not** leak in — see §6 risk T1).

### 4.3 The island boundary (what keeps it from being janky)

- **Astro owns** routing, page shells, layout, static content → ships zero
  JS where there is no interaction.
- **React + shadcn islands own** the interactive widgets → JS ships *only*
  where there is interaction. The previously-zero-JS landing stays close to
  zero-JS (only the palette/mode island hydrates).
- **One styling system.** Tailwind + the bridged tokens. Bespoke CSS for a
  surface is **deleted in the same PR** that migrates it — never left
  running in parallel "for now."
- **Cross-island shared state** via a tiny store (nanostores — Astro's own
  recommendation) for palette/mode and any handoff. Un-migrated vanilla
  surfaces keep working because they read `data-*` attributes, not the
  controls; the store keeps writing those attributes + localStorage.

### 4.4 Shared core (what survives the UI swap)

Recon confirms the heavy logic is already **pure, DOM-agnostic factories**:
the CodeMirror editor adapter, `live-render`, the model ladder
(`architect-model`), the architect/coach/chat engines, and the IndexedDB
store. These move into `packages/core` and are reused **unchanged** by the
desktop app. They import the engine's existing browser-safe authoring
modules (`lib/authoring/lint-core|review-core|scorecard`, `lib/families.mjs`)
exactly as they do today — those boundaries survive the framework change.

## 5. The maker-checker operating model

Two levels, as requested.

**Level A — producing this plan.** Drafted by a *maker*, reviewed
adversarially by a *checker* (see §10 changelog) before it reaches the
author. The author is the final checker.

**Level B — executing each phase.** Every phase ships as **one surface per
PR** (sub-phased where noted). Roles:

- **Maker** implements the surface on a feature branch, retires that
  surface's bespoke CSS in the same PR, and produces the evidence bundle:
  rasterized full-quality renders across representative palettes + the
  bundle-size delta.
- **Checker** (a separate agent pass or a human four-eyes) blocks merge
  until **every** item passes:

  1. **Visual parity** — rasterize via `tools/rasterize-for-review.sh`
     across ≥3 palettes (indaco, cuoio, carbone) in **both** light and
     dark; `tools/pixel-check.js diff` against a pre-change snapshot. Every
     intentional diff is justified in the PR; unexplained drift fails.
  2. **Token parity** — shadcn tokens resolve for **all 14 × 2**; zero
     hardcoded hex in island/component CSS (mirrors the engine rule).
  3. **No orphaned CSS** — the migrated surface's bespoke CSS is *deleted*,
     not dead-code. `grep` shows no remaining references.
  4. **A11y** — keyboard nav, visible focus ring, correct ARIA/roles
     (Radix gives most; the checker verifies, doesn't assume).
  5. **Bundle budget** — JS delta within the agreed cap for that surface;
     static pages that were zero-JS stay zero-JS except the named islands.
  6. **Engine untouched** — `npm run build:check`, `check:ownership`, the
     unit suite, and the integration parity tier are all green; the
     website's `lib/authoring` imports and the `window.LatticePlayground`
     global still load.
  7. **Naming isolation** — no `packages/ui` export shadows an engine
     layout name.
  8. **Reversible** — the PR is a clean single-revert; no phase depends on
     a half-finished earlier phase.

  CHANGELOG `## Unreleased` updated when a shipped surface changes
  (per repo rule). A failing gate is a root cause to fix, never a
  `--no-verify`.

## 6. Risk register

| # | Risk | Mitigation |
|---|---|---|
| T1 | **Tailwind preflight** (global reset) leaks into the deck `srcdoc` iframes or fights Starlight / remaining bespoke CSS | Scope Tailwind / disable preflight initially; the deck iframe is already isolated `srcdoc` (safe); the main document migrates surface-by-surface so reset only applies where a surface is fully migrated. Verified by the visual-parity gate each PR. |
| T2 | **Two Tailwinds** — Starlight uses Tailwind internally; class collisions | Scope our layer; Phase 6 removes Starlight entirely, ending the overlap. |
| T3 | **Bundle creep** on the previously-zero-JS landing | Island discipline (§4.3) + the per-PR bundle budget gate (§5-B5). |
| T4 | **DOM-id contract** — vanilla modules read `data-palette`; the controls move into React mid-migration | The shared store keeps writing `data-*` + localStorage, so un-migrated surfaces are unaffected. Phase 1 verifies this explicitly before any other surface moves. |
| T5 | **Deploy rewire** — `withastro/action@v3` runs `npm ci && npm run build` *inside* `docs/`; a hoisted workspace breaks that | Phase 0 rewires `docs.yml` to install at root + build the docs workspace, validated by a preview deploy before merge. (§8-A.) |
| T6 | **Generator drift** — the shadcn bridge goes stale vs `themes/` | Ship it as a committed, `:check`-gated artifact wired into `tools/build.js` + a lefthook glob (§4.2). |
| T7 | **biome blind spot** — it does not lint `.tsx` today; new React code is silently unchecked | Phase 0 extends `biome.json` `includes` to `**/*.{ts,tsx}` + React rules, before any `.tsx` lands. (§8-C.) |
| T8 | **Scope creep into the engine** — someone "shadcn-ifies" a Lattice slide component | The §1 contract is explicit; the checker rejects any PR touching `lib/`, `themes/`, or `dist/` under this effort. |

## 7. Phased roadmap

Order = lowest-risk-highest-leverage first, riskiest (Drawing Board engine)
last, Starlight removal final. Each phase is independently revertible.

### Phase 0 — Foundation (no visual change; the spike)
Workspaces (`"workspaces": ["docs","packages/*"]` on the root package);
create `packages/ui` (React 19 + Tailwind v4 via `@tailwindcss/vite` +
`npx shadcn init`); add `@astrojs/react` + Tailwind to `docs/` and register
the integration; biome `.tsx` scope + rules (T7); rewire `docs.yml` deploy
+ CI path filters for `packages/**` (T5); add the **token-bridge generator**
+ `:check` gate + lefthook glob (§4.2, T6); set Tailwind preflight scoping
(T1). **Exit criterion / the spike:** ship one trivial shadcn island in a
non-critical spot (e.g. a `Button`), themed through the bridge across all
palettes, deployed to a preview — proving the *entire* pipeline (build,
deploy, theming, hooks, a11y, bundle) end-to-end **before** touching a real
surface. This is the "prove the cost is real before committing" gate.

### Phase 1 — Shared chrome: the TopBar island
Rebuild brand + nav + **palette `Select`** + **mode toggle** as one shadcn
React island consumed by every standalone page (and later by Starlight via
override, and by desktop). The palette/mode controller moves into the island
+ the nanostore, which keeps writing `data-*` + localStorage so every
un-migrated vanilla surface still themes correctly (validates T4). Highest
leverage: one component, used everywhere, needed by desktop. Retire the
topbar bits of bespoke CSS.

### Phase 2 — Components reference (easy; the cost-judging surface)
Port `component-browser` + `Specimen` + `ComponentDocs`/`ComponentNav` to
React/shadcn (`Card`, `Tabs`, `Command` for fuzzy search, `Badge`). Keep
the pure `lib/families.mjs` grouping logic and the `live-render` specimen
factory untouched. Retire `components.css`. Good place for the author to
judge the real per-surface cost before committing the rest.

### Phase 3 — Playground (easy)
React shell + shadcn (`Tabs` edit/preview, `Popover`/`Command` template
picker, `Dialog` settings, `Select`, `Button`). Lift the editor +
`live-render` + template-picker *logic* into `packages/core`; the engine
globals and iframe sync stay. Retire `playground.css`.

### Phase 4 — Landing (low; mostly Tailwind)
Rebuild marketing sections with Tailwind + a few shadcn components. Stays
near-zero-JS (only the Phase-1 palette island hydrates). Retire
`landing.css`.

### Phase 5 — Drawing Board (medium; highest desktop value) — strangler-fig
Sub-phased per the recon's natural order; each sub-phase is its own PR:
- **5a** Render loop + editor host as React; iframe `srcdoc` stays vanilla.
- **5b** Store → React context/hook (IndexedDB layer unchanged). **Lift the
  store + model ladder + architect/coach/chat engines into `packages/core`**
  (the desktop-shared payload).
- **5c** Architect findings → shadcn `Card`s.
- **5d** Coach → shadcn chips/cards.
- **5e** Chat + edit-card diff → shadcn message thread.
- **5f** Chrome: panels, resizers, drawers → `Dialog`, mobile pane tabs →
  `Tabs`, export menu → `DropdownMenu`, model settings → `Dialog`/`Select`.
Retire `drawing-board.css`. The pure engine modules are now desktop-ready.

### Phase 6 — Replace Starlight (the no-Starlight end state)
Build the shared React/shadcn MDX docs reader in `packages/ui` (sidebar,
TOC, **Pagefind** search — not Starlight-locked). Migrate the handful of
guide pages. Remove the Starlight dependency, its `--sl-*` bridge CSS, and
the SocialIcons override. One token system, one component model everywhere.

### Phase 7 — Desktop bootstrap (validates the thesis; may be a separate kickoff)
Stand up `apps/desktop` (Tauri + Vite + React) consuming `packages/ui` +
`packages/core`. Proves the shared layer end-to-end. Likely handed to a
dedicated desktop kickoff, but the seam is *ready* the moment Phase 5b
lands.

## 8. Appendix — must-not-break (from build/deploy/hook recon)

- **A. Deploy** `withastro/action@v3` runs `npm ci && npm run build` inside
  `docs/`. Bringing `docs/` into the workspace (hoisted lockfile) breaks
  `npm ci` there → Phase 0 rewires `docs.yml` to root-install + workspace
  build, validated by a preview deploy.
- **B. Docs asset sync** `sync:portal`/`sync:playground` copy from `dist/`
  + `themes/`; `build-playground.js` writes **directly** to
  `docs/public/playground/`. Keep those paths; don't move `docs/`.
- **C. biome** lints only `.{js,mjs,cjs,json}` today; add `.{ts,tsx}` +
  React rules before any `.tsx` lands (T7).
- **D. Ownership guard** (`tools/check-ownership.js`) is not
  workspace-aware → keep `packages/ui` names distinct from engine layouts
  (T-naming).
- **E. CI path filters** (`code`/`docs` in `ci.yml`) + `docs.yml` triggers
  + `release.yml` all assume root paths → keeping engine + `docs/` in place
  means **no filter churn**; only *add* `packages/**`.
- **F. Pre-push is sequential** (`build:check` + integration share `dist/`)
  → don't parallelize; keep `dist/` at root.
- **G. session-start hook** installs at root → a hoisted workspace is
  *covered* by the existing root `npm install`; verify after conversion.

## 9. Open decisions for the author (checker-of-last-resort)

1. **`packages/core` now or lazily at 5b?** Plan defaults to lazy (avoid
   premature abstraction). Override if you want it stood up in Phase 0.
2. **Phase 7 (desktop) in this effort or a separate kickoff?** Plan treats
   the shared layer as the deliverable and desktop as a follow-on once 5b
   lands. Confirm.
3. **Bundle budget caps** per surface — propose numbers in Phase 0, ratify
   then.
4. **Starlight timing** — confirmed *last*; say so if you'd rather pull it
   earlier (the seam-cost vs. lower-value-than-apps trade is yours).

## 10. Changelog of this plan
- 2026-06-09 — Maker draft (after three grounded recon passes:
  build/deploy/hooks, Drawing Board architecture, token pipeline).
- _pending_ — Checker review.
