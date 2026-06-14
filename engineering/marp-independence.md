# Marp independence — living status

> **Living document.** The running scorecard of where Lattice's owned engine
> stands against Marp. Update it whenever the engine gains or loses a capability,
> the benchmark is re-run, or a "worse" line resolves. **Last verified against the
> engine: 2026-06-14** (PR #263 — the marp-cli retirement).
>
> Point-in-time *rationale* lives in
> `engineering/decisions/2026-06-12-p4-regression-gate-retire-marp.md` — link there
> for *why*; keep *this* doc current for *where we are*.

## TL;DR

Marp is gone as a **dependency** and as our **render path**. `lib/engine/`
natively re-implements the Marpit core, and `npm install @slidewright/lattice`
pulls **zero** `@marp-team` packages. What remains is marp-*compatibility* by
choice (`marp.config.js`, Export-to-Marp, the marp-vscode CSS shims) — we are a
superset of marp authoring, not captive to it.

## 1. Is Marp gone? — the dependency / render reality

| Surface | State | Evidence |
|---|---|---|
| `dependencies` | **marp-free** | `ls node_modules/@marp-team` → absent after `npm ci` |
| Source imports | **zero** real `@marp-team` / `marpit` imports | repo-wide grep; remaining marp strings are comments citing the porting source |
| First-party render (CLI · emulator · playground) | **owned engine** | `lib/engine/` |
| `marp.config.js` | **stays — BYO** | shipped so a user *may* render with their own marp-cli |
| Export-to-Marp (#250 / #257) | **stays — generates recipient bundles** | the bundle pins marp-cli for the *recipient*, not for us |
| VS Code live preview | **still marp** | the marp-vscode extension renders via its own marp-core; we ride on top via CSS shims + `dist/lattice-runtime.js` |

**The one surface we don't own: VS Code preview.** Everything else is ours.

## 2. The foundation we own (`lib/engine/`)

The full Marpit pipeline, re-implemented as 7 modules:

| Module | Replaces (Marpit) |
|---|---|
| `slides.js` | slide tokenizer (`---` → sections) |
| `directives.js` | front-matter / comment directive parser |
| `css.js` | `ThemeSet.pack` + `scaffold.js` + `printable.js` — selector scoping, `@page` / print, `@import` / `@size` |
| `background-image.js` | `![bg]` plugin |
| `themes.js` | theme registry |
| `math.js` | marp-core math → KaTeX (ours) |
| `index.js` | the orchestrator |

On top sits the value-add Marp never had: 58 layouts, native charts, Mermaid, the
token design system. Output formats (PDF / PPTX / PNG / HTML) flow through the
owned CLI.

## 3. Performance (`npm run bench`)

Last run **2026-06-13**, marp-core still installed (the final apples-to-apples):

| corpus | slides | marp-core | owned engine | speedup |
|---|---|---|---|---|
| normal (jargon) | 79 | 207.7 ms | 39.3 ms | **5.3×** |
| charts | 14 | 192.3 ms | 34.7 ms | **5.5×** |
| stress (jargon ×6) | 469 | 407.8 ms | 129.1 ms | **3.2×** |

**3–5× faster.** Refresh with `npm run bench`. The marp baseline is retired
post-#263; the benchmark now tracks the engine over time.

## 4. Footprint

−**42M** off a consumer install: `marp-cli` 40M + `marp-core` 736K + `marpit`
348K (+ `marpit-svg-polyfill`) = **4 packages**. (`puppeteer` and `markdown-it`
are shared and stay — the honest delta is the marp tree only.)

## 5. Scorecard

### Better (7)

1. **Speed** — 3–5× faster render.
2. **Weight** — marp-free install, −42M.
3. **Control** — we fix our own browser-compat (e.g. the iOS `:root` cqi bug, P5) instead of waiting upstream.
4. **Capability** — structural components stock marp-core literally cannot render.
5. **CSS fidelity** — we drive selector scoping / specificity; no fighting marp's `!important` scaffold.
6. **No upstream coupling** — marp's version / roadmap / abandonment can't break us.
7. **Output ownership** — PDF / PPTX / PNG / HTML through our CLI.

### Worse / the cost (5)

1. **Maintenance burden** — we now own every Marpit bug marp-team used to fix. *(permanent)*
2. **Lost the second-renderer cross-check** — the parity gate rendered the full corpus through an *independent* engine; the semantic-invariant suite checks DOM / computed-style on one sample per component. Thinner defense against the CSS-regression class only a second renderer surfaces. *(watch — §6)*
3. **VS Code preview is still rendered by marp** — not 100% ours there. *(open)*
4. **Ecosystem** — community, plugins, docs, and browser-compat labor are now ours alone. *(permanent)*
5. **Compat-drift risk** — if marp-team changes the `marpit_*` token model or directive semantics, our shipped `marp.config.js` + export bundles can drift; we test color / chart / front-matter parity, not the full corpus. *(watch)*

## 6. Running risks — keep these honest

- **Coverage shape (worse #2).** The semantic-invariant suite is now the only
  visual gate. If a CSS-regression class slips it, prefer a lightweight *owned*
  second check (e.g. an independent CSS-resolver oracle) over re-adding marp.
- **Compat drift (worse #5).** While we market marp-compatibility, the
  color/chart/front-matter parity tests are the floor — widen them if the export
  bundle becomes a real product surface.
- **VS Code (worse #3).** Closes only if/when a first-party preview replaces the
  marp-vscode dependency.

## Update log

- **2026-06-14** — created alongside PR #263 (marp-cli retired, `engine-parity`
  gate removed, playground marp-core A/B dropped). Engine verified
  zero-marp-import; benchmark + footprint recorded above.
