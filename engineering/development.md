# Development environment

How the project is built, tested, linted, and shipped — every tool, every
script, every hook in one place. For *workflow* (branching, feature decks,
PR process, the three-renderer rule, the share-the-PDF rule), see
`workflow.md`. This file is the *tooling* counterpart.

Source-of-truth lives in the config files (`biome.json`, `lefthook.yml`,
`.c8rc.json`, `.nvmrc`, `jsconfig.json`, `.github/workflows/ci.yml`,
`tools/affected-tests.js`). This doc explains the *why* and the *when*.

## Quick reference

| What | Command |
| --- | --- |
| Inner-loop watch | `npm run test:watch` |
| Run one scope | `npm run test:<scope>` |
| Lint | `npm run lint` (`lint:fix` to auto-fix) |
| Full check | `npm test && npm run test:integration` |
| Coverage | `npm run test:coverage` → `.scratch/coverage/index.html` |
| Force integration rebuild | `LATTICE_TEST_NO_CACHE=1 npm run test:integration` |

Test scopes: `palette`, `mermaid`, `parsing`, `layouts`, `cli`. Integration
scopes: `galleries`, `parity`, `mermaid`, `screenshot`. Run via
`npm run test:<scope>` and `npm run test:integration:<scope>`.

## Node version policy

Three numbers, one purpose each:

- **`.nvmrc` = 22** — current active LTS, what `nvm use` puts devs on.
- **`engines.node` = `>=22.0.0`** — declared supported minimum.
- **CI matrix = `[22, 24]`** — verifies the engines claim on every push.

Drop a version from the matrix iff you also bump `engines`. Bump `engines`
iff you drop a version from the matrix. The original cause of the
`node --test <dir>` outage that started this whole overhaul was
matrix=Node-18 while devs ran Node 22 — keep the three numbers aligned.

**Node 18 + 20 are deliberately unsupported.** Node 18 has been EOL since
April 2025; Node 20 entered maintenance in April 2026. `node:test` moved
fast across 18 → 22 (the glob syntax in `package.json` scripts requires
Node 21+; describe-level `concurrency: true` requires Node 20.10+).
Supporting them would mean freezing into a pre-Node-21 API forever. If
a consumer needs Node 18 or 20, they pin to Lattice 1.x.

## npm scripts

**The full, always-current catalog of every script, tool, and framework is
[`engineering/capabilities.md`](./capabilities.md)** — generated from
`package.json` + the `tools/` headers and gated by `capabilities:check`, so it
can't drift. `npm run` lists every script live. **Before building any tool or
harness, look there first** (we already have a benchmark, a parity harness,
scaffolders, …). This section calls out only the daily inner-loop:

| Script | Purpose |
| --- | --- |
| `test` | Full unit suite (the inner loop) |
| `test:watch` | Re-run the unit suite on file change |
| `test:<scope>` | Scoped unit subset (`palette`/`mermaid`/`parsing`/`components`/`cli`/`engine`/`layout`/…) |
| `test:integration` | Cross-renderer integration tier (page-count + parity) |
| `bench` | tinybench render benchmark, marp-core vs lattice-engine (`-- --export` adds the rasterize tier, `-- --json` dumps machine-readable) |
| `parity` | Visual engine-parity harness — rasterise a deck through both engines and pixel-diff per slide (`-- --galleries` / `-- --jargon` / `-- --dark`) |
| `lint`, `lint:fix` | Biome check / Biome check --write (never `npx biome`) |
| `preview` | Fast visual-iteration loop (scope-detect, rebuild affected, pixel-diff) |
| `build`, `build:check` | Regenerate / freshness-gate every generated artifact |

Everything else — the `*:build` / `*:check` generators, `new:*` scaffolders,
gallery builds, release and docs-portal scripts — lives in `capabilities.md`.

## Test layout

```
test/unit/palette/      palette, palette-resolution, contrast
test/unit/mermaid/      mermaid-var-map
test/unit/parsing/      source-parse, match-section, splitter,
                        slot-label-lift, marp-plugins
test/unit/components/   component-manifest, journey, roadmap,
                        word-cloud, quadrant, radar
test/unit/cli/          cli
test/integration/galleries/   emulator.{gallery,gallery-mermaid},
                              marp.gallery
test/integration/parity/      parity, deck-class-fm, chart-family
test/integration/mermaid/     mermaid-smoke
test/integration/screenshot/  screenshot
test/benchmark/               engine-bench.mjs (npm run bench; not in npm test)
test/helpers/                 render.js, pdf.js, palette.js
test/fixtures/                small .md decks for integration
```

`tools/engine-parity.mjs` (`npm run parity`) is the visual-parity harness — it
rasterises every gallery slide through both render engines and pixel-diffs them,
exiting non-zero on any real divergence (the one intentional difference, Marp's
twemoji `<img>` vs the engine's font-glyph emoji, is skipped per slide). It is
**a required CI gate** — the `engine-parity` job in `ci.yml` runs
`npm run parity -- --galleries --jargon` on every code change, so the owned
engine can't regress against marp-core unseen (it's the safety net for bringing
the owned CSS emitter back, proposal P5). It is NOT in `npm test` or the pre-push
hook (too slow for the inner loop); run it locally when changing `lib/engine/`.

Each test file wraps its body in `describe('<file-basename>', () => {…})`
so TAP output groups by file. Source of truth: `package.json` scripts
plus the directory layout.

## Lint (Biome)

**Linter on. Formatter intentionally OFF.** The codebase has hand-tuned
compact style — palette arrays kept in columns, inline `{}[key]` lookup
tables — that the default formatter would explode. The lint rules catch
real bugs without restyling intentional code. (When Biome was first
adopted, the linter found 7 real correctness issues and 30+ style
issues; the formatter would have rewritten ~43 of 49 files.)

Run via `npm run lint` (read-only) or `npm run lint:fix` (`check --write`,
includes the unsafe auto-fixes). Source of truth: `biome.json`.

## Hooks (lefthook)

`npm install` wires the hooks automatically via the `prepare` script.
Configuration in `lefthook.yml`.

**pre-commit** (parallel, ~0.5s for scoped edits, ~5s for cross-cutting):
- `lint` — Biome on staged JS/JSON only
- `affected-tests` — `tools/affected-tests.js` maps staged paths to
  scoped scripts; runs only what's affected. See *Affected tests* below.

**pre-push** (serial, fail-fast cheap-first):
- `lint` — full tree
- `lint-deck` — repo-wide strict author-facing footgun sweep
- `build-check` — the CI/stale-artifact gate (regen + byte-diff of `dist/`)
- `unit-tests` — full unit suite
- `integration-tests` — full cross-renderer parity + PDF page-count tier.
  Skipped when a push touches no render-relevant files (the job mirrors CI's
  `code` paths-filter in `.github/workflows/ci.yml`; keep the two in sync).

**commit-msg** (~0.01s):
- `format` — `tools/check-commit-msg.sh` validates `area(scope): summary`.
  Pass-through for git's machine-generated messages
  (`Merge…`, `Revert…`, `fixup!`, `squash!`, `amend!`).

Bypass with `git commit --no-verify` only as a genuine last resort.

## Affected tests

`tools/affected-tests.js` is the brain of the pre-commit speedup. Given a
list of staged files, it picks the minimal set of npm scripts that cover
them.

```
lib/<X>.js              → SCRIPT_FOR_LIB[X]      (e.g. palette.js → test:palette)
test/unit/<scope>/*     → test:<scope>
themes/*.css            → test:palette
docs/, examples/, *.md  → skip — no tests needed
lattice-emulator.js,    → full unit suite        (safe fallback;
lattice-runtime.js,                                renderers touch everything)
lattice.css,
package.json, etc.
test/helpers/*          → full unit suite        (shared infra)
unknown lib/<X>.js      → full unit suite        (safe fallback)
```

When a staged file isn't recognised, the script falls back to the full
suite. Better to be slow than miss a regression. Pre-push runs the full
suite regardless as a second safety net.

## Coverage (c8)

Configured in `.c8rc.json`. Reports HTML to `.scratch/coverage/` (the
`.scratch/` tree is `.gitignored`) and a text-summary to the console.

**Coverage is NOT a CI gate** — it's a diagnostic for "what's untested
in the area I'm changing?" Baseline today: ~41% statements / ~80%
branches / ~77% functions. Statement number is low because
`lattice-emulator.js` and `lattice-runtime.js` are exercised by
integration tests, not unit tests.

## CI

`.github/workflows/ci.yml` is path-gated and browser-lean. A top-level
`concurrency` group cancels superseded runs on the same ref.

- **`changes`** — classifies the diff (`dorny/paths-filter`). `code` is
  true unless EVERY changed file is prose markdown; decks
  (`examples/**.md`, `baseline-decks/**.md`, `**.gallery.md`) count as
  code. **A docs-only change runs lint only** — `unit` and `integration`
  are skipped.
- **`lint`** — ALWAYS runs, single Node, browser-free
  (`PUPPETEER_SKIP_DOWNLOAD=1`). `npm run lint` + `npm run lint:deck:all`.
- **`unit`** — code changes only. Matrix Node 22/24, `fail-fast: false`,
  browser-free. `npm test`, plus `npm run build:check` once (on 22) — the
  render-free artifact-freshness gate (css, default bundle, runtime +
  emulator bundles, component docs, portal, dist README).
- **`integration`** — code changes only, `needs: unit`, single Node (22).
  The only tier that renders, so the only one that downloads Chromium —
  **cached** via `actions/cache` on `~/.cache/puppeteer` (keyed on the
  lockfile). Installs `poppler-utils` (for `pdfinfo`), runs
  `npm run test:integration`. ~2–3 min cold.
- **`ci`** — the single gate job (`if: always()`). **Set this as the only
  required status check** in branch protection: it passes when lint
  succeeds and the test tiers passed or were skipped, so the conditional
  jobs never leave a PR stuck on a pending required check.

Integration runs once because the Marp/Puppeteer/emulator pipeline
doesn't vary with Node version; matrix-testing the slow tier is paranoia,
not insurance. Only `integration` needs Chromium — `lint` and `unit` skip
the download (~150 MB) since neither renders.

## Integration test cache

`test/helpers/render.js` hashes all renderer inputs and reuses
`.scratch/test-cache/{emu,marp}-<hash>.{pdf,html}` when the hash matches.
Cold cache: 30s. Warm: 0.17s (170× speedup for re-runs against unchanged
inputs).

**Hash inputs** (any change invalidates):
- source `.md` content
- `lattice-emulator.js` or `marp.config.js`
- `lattice.css` + every `themes/*.css`
- every `lib/*.js`
- `mermaid-v11.min.js`
- `package-lock.json` (catches dependency upgrades)
- palette argument
- Node version

**Cache OFF when:**
- `CI=true` — CI must verify the real build, not the cache
- `LATTICE_TEST_NO_CACHE=1` — debug opt-out if cache seems stale

**Eviction:** `npm run clean:scratch` (14-day GC). Returned PDF paths
are owned by the cache; callers MUST NOT `unlinkSync` them.

## Editor setup

`jsconfig.json` gives VS Code / JetBrains / Neovim project-wide
IntelliSense and JSDoc resolution. `checkJs` is intentionally OFF —
enabling it surfaces ~33 DOM-narrowing errors in `lattice-runtime.js`
that would require `/** @type {HTMLElement} */` casts throughout; the
cast noise costs more readability than the type signal returns.

Recommended VS Code extensions:
- `biomejs.biome` — inline lint feedback from `biome.json`
- `marp-team.marp-vscode` — preview `.md` decks

## Previewing the docs site (Astro) + screenshots

The docs site under `docs/` (Astro + Starlight) hosts the landing page, the
**Drawing Board**, the **Workbench**, the **Playground**, and the component
pages. **You can build, run, AND screenshot it in the cloud sandbox** — this
is the visual-verification path for any web-UI change (the counterpart to
`tools/rasterize-for-review.sh` for PDFs). Don't claim a web-UI change is
unverifiable here; run the site and look.

> Reviewing something *large* — every gallery, a whole-bucket audit, a
> responsive pass over many routes? Don't do it serially. Fan out parallel
> reviewer agents (one per deck/bucket/breakpoint), each running the tools
> below on its slice. See `engineering/visual-review.md`.

### The loop

```bash
# 1. ONE-TIME per sandbox: docs/ is a SEPARATE npm package, NOT a root
#    workspace, so the root `npm install` does not cover it.
cd docs && npm install

# 2. Serve. Invoke the astro binary DIRECTLY — the `npm run dev` /
#    `npm run start` scripts trip `sh: 1: astro: not found` in this sandbox
#    (PATH quirk). Run the two sync steps first if you need fresh portal /
#    playground assets; for most UI work they're already staged.
npm run sync:portal --silent && npm run sync:playground --silent
nohup ./node_modules/.bin/astro dev --host 127.0.0.1 --port 4321 \
  > /tmp/astro.log 2>&1 &
#   wait until /tmp/astro.log prints "ready"; the `base` is /lattice, so
#   pages live under http://127.0.0.1:4321/lattice/… (trailing slash).

# 3. Screenshot any route, then VIEW the PNG with the Read tool (renders
#    inline) or SendUserFile.
cd ..   # back to repo root (puppeteer lives in the ROOT node_modules)
node tools/screenshot.js http://127.0.0.1:4321/lattice/drawing-board/ \
  .scratch/shots/drawing-board.png --width 1440 --height 900
```

`tools/screenshot.js` drives the puppeteer-cached Chromium
(`--no-sandbox`; resolves the binary from `CHROME_PATH` or the puppeteer
cache). Flags: `--width`/`--height`, `--full` (full-page), `--wait <css>`
(wait for a selector — useful for the Drawing Board's hydrated panels),
`--delay <ms>`. Write PNGs under `.scratch/` (gitignored, 14-day GC).

### Routes

| Route | URL |
| --- | --- |
| Landing | `http://127.0.0.1:4321/lattice/` |
| Drawing Board | `…/lattice/drawing-board/` |
| Playground | `…/lattice/playground/` |
| Components index | `…/lattice/components/` |

Nav links are defined in `docs/src/components/TopBar.astro` (+ injected via
`SocialIcons.astro`) — that's where a new top-level entry (e.g. the
Workbench) is added.

### Traps (full entries in `gotchas.md`)

- **`docs/` is a separate package** → its own `npm install`; the root
  install / SessionStart hook does not cover it.
- **`npm run dev` → `sh: astro: not found`** → call
  `./node_modules/.bin/astro` directly.
- **`pkill -f astro` self-kills** the shell whose command line contains
  "astro" → stop the server by PID or by port instead.
- **Base path `/lattice`** → a bare `http://127.0.0.1:4321/` 404s; use the
  `/lattice/…` prefix.

---

## Cross-cutting rules

These are the "when you do X, also do Y" patterns easy to forget.

### Editing a component manifest (`<name>.manifest.json`)
The prose/content fields (`sample`, `variants`, `variantDocs`,
`stressSample`) feed TWO generated decks, regenerated by DIFFERENT
commands:
1. the **per-component** gallery `<name>.gallery.md` — regenerated by
   `npm run build` (via `docs:components`) and gated by `build:check` +
   pre-commit (`docs:components:check`).
2. the **per-bucket survey** gallery `<bucket>.gallery.md` — embeds each
   member's `sample`; regenerated ONLY by `npm run build:bucket-galleries`.
   It is deliberately NOT part of `npm run build` (re-rendering the 18
   bucket PDFs is slow), so it lives in CI's `test:integration`.

So a `sample` edit refreshes the per-component gallery but silently
staled the bucket survey until CI catches it. After editing a manifest
`sample`, run BOTH `npm run build` AND
`npm run build:bucket-galleries --only <bucket>`, and commit both. See
gotchas.md → "Editing a manifest `sample` staled the bucket survey."

### Adding a new `lib/<name>.js`
1. Add an entry to `SCRIPT_FOR_LIB` in `tools/affected-tests.js` (else
   pre-commit falls back to the full suite for every edit to that file).
2. Add a unit test at `test/unit/<scope>/<name>.test.js`.
3. If it's a renderer transform, document its siblings in
   `marp.config.js` + `lattice-runtime.js` (per the three-renderer rule
   in `workflow.md`).

### Editing deck-lint rules
The footgun checks (card-style inline-title, ordered-list bold, split/number
bodyless items, unknown `_class`, …) live in **one place**:
`lib/authoring/lint-core.js` — a pure, `fs`-free, dependency-free module. Three
consumers share it, so edit the rule THERE, never duplicate it:
1. `lib/authoring/lint.js` — the Node binding (`npm run lint:deck`); builds the
   name/modifier vocab from the live manifests and delegates.
2. `lib/components/index.js`'s `validate()` — re-imports the detectors + layout
   sets from lint-core.
3. The **Drawing Board** docs-site editor (`docs/src/pages/drawing-board.astro`
   + `docs/src/playground/drawing-board-architect.js`) — runs the *same*
   lint-core client-side, with the vocab precomputed at docs-build time. Astro's
   `vite.build.commonjsOptions` applies the CJS→ESM transform so the browser
   imports the CommonJS core.

Tests: `test/unit/components/lint-core.test.js` (the pure API) +
`lint-deck.test.js` (the Node binding). Both routed via `SCRIPT_FOR_LIB`.

### Adding a new theme (`themes/<name>.css`)
No script change needed — `affected-tests.js` routes `themes/*.css` to
`test:palette` automatically. Just:
1. Drop the file with the required tokens (see `theming.md`).
2. `npm run test:palette` verifies WCAG contrast.

### Adding a new npm test script
Update the *Test layout* and *Quick reference* tables above, and update
the *Inner-loop scoping* table in `workflow.md`. The two docs reference
the same scripts but for different audiences (humans following PR
process vs. anyone configuring tooling).

### Renaming a test scope directory
The directory name is the script name (`test/unit/palette/` →
`test:palette`). Renaming requires updating:
1. `package.json` scripts
2. `tools/affected-tests.js` (the mapping)
3. `workflow.md` (the scoping table)
4. This file (the *Test layout* + *Affected tests* sections)

### Bumping the minimum Node version
1. `engines.node` in `package.json`
2. `.nvmrc` (if you want devs on something newer too)
3. CI matrix in `.github/workflows/ci.yml`
All three should move together — drift between them is what caused the
original `node --test <dir>` outage.
