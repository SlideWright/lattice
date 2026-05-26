# Runtime bundler — esbuild

Date: 2026-05-17 (follow-up to the shared-transformer-registry pilot)
Branch: `claude/shared-transformer-library-Qv38u`

## What changed

`lattice-runtime.js` is now an **esbuild bundle output**, not a
hand-edited file. Source moved to `src/runtime/index.js`; the build
produces the runtime by inlining the shared transformer registry
(`lib/transformers/`) and its engine dependencies.

The public path is preserved: every committed example deck embeds
`<script src="../lattice-runtime.js">`, the README documents the same
URL for external consumers, and the npm package still ships
`lattice-runtime.js` at the package root. Nothing downstream notices
the move — only the contents are different.

## File layout

```
src/runtime/index.js              # esbuild ENTRY (was lattice-runtime.js)
lib/transformers/registry.js      # central plugin list
lib/transformers/split-panels.js  # adapter: applyToHtml + applyToSectionInner + applyToDom
lib/engine/split-panels.js        # HTML-string kernel
tools/build-runtime.js            # esbuild driver (CLI)

lattice-runtime.js                # BUILD OUTPUT — committed, served as-is
```

## Build commands

- `npm run runtime:build` — produce the bundle. ~480 KB → ~795 KB with
  inline source map (the JS itself is ~225 KB; the rest is base64
  source map). Deterministic — same source produces byte-identical
  output, which the freshness hook relies on.
- `npm run runtime:check` — rebuild to a tempfile next to the
  committed output and `diff -q`. Exits 1 with a friendly message
  when the bundle is stale. Used by the lefthook
  `runtime-bundle-freshness` pre-commit hook.
- `npm run runtime:watch` — rebuild on source change. Pair with
  `npm run preview:watch` for the inner-loop iteration on runtime
  behavior.

## What the registry now ships

`lib/transformers/registry.js` exposes `applyAllToHtml(html)` and
`applyAllToDom(root)`. The registered transformers are iterated in
order; each declares the subset of apply hooks it implements.

For `split-panels` (the only registered transformer so far) all three
hooks are present:

| Hook                  | Used by                                          |
|-----------------------|--------------------------------------------------|
| `applyToHtml`         | `marp.config.js` render hook                     |
| `applyToSectionInner` | `lattice-emulator.js` `parseSlide` per-section   |
| `applyToDom`          | `src/runtime/index.js` content-transform loop    |

The `applyToDom` migration also **closes a drift**: the legacy
hand-edited runtime only handled five of the six split-* layouts. It
omitted `split-list`, so web-export paths where the engine hook
didn't run lost the panel-left/panel-right wrappers and the watermark
glyph. The registry-shaped `applyToDom` implements all six layouts;
the per-component `split-list.gallery.pdf` is the visual proof.

## Bundle size honesty

The bundle (~225 KB executable + ~565 KB inline map) is ~100 KB
bigger than the hand-edited runtime. esbuild can't tree-shake the
inlined CommonJS dependency graph: `lib/transformers/split-panels.js`
imports `lib/engine/split-panels.js`, which imports
`lib/chart-family/chart-family.js`, which imports the chart-family
member kernels (radar, quadrant). The runtime never calls those
HTML-string functions, but esbuild can't prove that statically.

Mitigations (not in this PR):

- Convert `lib/transformers/*` to ESM and rely on esbuild's
  tree-shaking. Blocked by marp-cli still being CJS; see the ESM
  decision in the design discussion that preceded this work.
- Split each transformer into `*.html.js` + `*.dom.js` so the runtime
  bundle only imports the DOM half.
- Tag unused functions with `/* @__PURE__ */` so esbuild can drop
  them when call sites are dead.

For now the bundle is well under the 1 MB practical threshold for a
preview-time script, so this is documented but not urgent.

## Pre-commit hook

`lefthook.yml` gained `runtime-bundle-freshness`:

```yaml
- name: runtime-bundle-freshness
  glob:
    - 'src/runtime/**/*'
    - 'lib/transformers/**/*.js'
    - 'lib/engine/**/*.js'
    - 'lib/chart-family/**/*.js'
  run: npm run runtime:check --silent
```

Same pattern as `pdf-freshness`: any staged source under a glob the
bundle depends on must produce a bundle that matches `lattice-runtime.js`.
Bypassable via `--no-verify` only as a last resort.

A subtle gotcha worth noting in `reference/engineering/gotchas.md`: the
inline source map encodes source paths **relative to the outfile
location**. Building to `/tmp/check.js` produces different sourcemap
strings than building to `lattice-runtime.js`, even when the JS is
byte-identical. `tools/build-runtime.js`'s `--check` mode writes the
tempfile next to the real output (`lattice-runtime.js.check.tmp`) so
relative paths line up and `diff -q` only fails on real drift.

## Affected-tests rewiring

`tools/affected-tests.js` now:

- Removes `lattice-runtime.js` from the `FULL_SUITE_TRIGGER` set (it's
  a build artifact, not a source) and adds it to `isSkippable` —
  changes to the bundle alone don't fire tests.
- Maps `src/runtime/**/*.js` and `lib/transformers/**/*.js` to the
  new `test:transformers` scope.

`package.json` gained:

- `runtime:build`, `runtime:check`, `runtime:watch` scripts.
- `test:transformers` scope script.
- `esbuild` and `jsdom` as `devDependencies`.

## What's NOT in this PR

- **Chart-family / roadmap / journey / word-cloud migrations.** Each
  is still imported directly in `marp.config.js`. The pattern from
  `split-panels.js` applies mechanically; chart-family is the next
  pilot because it has the most duplicated code (~300 lines in
  `lattice-emulator.js` L1849–2150 will go away when chart-family
  joins the registry).
- **ESM migration.** Held until `@marp-team/marp-cli` ships its
  ESM-only major; see the prior design note for the rationale.
- **`marp.config.js` going through `registry.applyAllToHtml` for
  everything.** Today it calls `applyAllToHtml` (split-panels only)
  plus four direct imports. Once the other four migrate, that
  becomes a single registry call.
