# Shared transformer registry — pilot

Date: 2026-05-17
Branch: `claude/shared-transformer-library-Qv38u`

## What changed

Lattice now has a transformer registry at `lib/transformers/registry.js`
that the three render paths (marp-cli via `marp.config.js`,
`lattice-emulator.js`, and — eventually — `lattice-runtime.js`) consume
through a single interface. `split-panels` is the pilot transformer.

Concretely:

- New `lib/transformers/registry.js` — exports `TRANSFORMERS` (ordered
  list), `applyAllToHtml(html)`, `applyAllToDom(root)`, `getByName(name)`.
- New `lib/transformers/split-panels.js` — registry adapter wrapping
  the engine kernel at `lib/core/split-panels.js`.
- `lib/core/split-panels.js` — added `liftFirstListItems()` so the
  right-panel rebuild works without depending on the Marpit
  `slotLabelLift` plugin having already run. Idempotent on inputs that
  were already lifted (the marp-cli path).
- `marp.config.js` — render hook now calls
  `registry.applyAllToHtml(result.html)` instead of importing
  `split-panels.js` directly. Other transforms (`chart-family`,
  `roadmap`, `journey`, `word-cloud`) stay as direct calls for now.
- `lattice-emulator.js` — the inline split-* block (~170 lines covering
  all six split-* layouts plus a local `liftListItems` helper) is
  deleted. `parseSlide` now calls
  `splitPanelsTransformer.applyToSectionInner(html, classAttr)`.
- `lattice-runtime.js` — header comment updated to point at the
  canonical kernel; the hand-edited DOM mirror stays in place pending
  the bundler decision.
- New `test/unit/transformers/registry.test.js` — 14 tests pinning the
  registry's shape contract and the split-panels adapter's behavior.

## Output verification

Built `examples/gallery.md` via the emulator before and after the
refactor; the HTML sidecars are byte-identical (`diff` produces no
output). The PDF stage couldn't run in the remote container (no
Chromium binary), but the upstream HTML is the only stage the refactor
touches.

Unit-suite delta: +14 tests, +14 pass, 0 new failures. Pre-existing
environmental failures (`marp-core` not in this container,
`screenshot` CLI missing) are unchanged.

## Transformer shape

A transformer module exports:

```js
module.exports = {
  name: 'split-panels',                   // unique, stable
  selector: 'section.split-list, ...',    // CSS selector identifying sections
  layouts: [...],                          // optional — class tokens this transformer owns
  applyToHtml(html, ctx?) { ... },        // full-deck HTML rewrite
  applyToSectionInner(inner, cls, ctx?),  // per-section primitive (emulator)
  applyToDom(root, ctx?) { ... },         // live-DOM walk (runtime; nullable for pilot)
};
```

See `lib/transformers/registry.js` for the long-form contract.

## What's NOT in this PR

- **`lattice-runtime.js` migration.** The runtime is a 3713-line
  browser IIFE with no `require()`. Wiring it to the registry needs
  either a bundler (esbuild) or a hand-rolled concat step. The pilot
  defers that decision; the runtime keeps its hand-edited DOM mirror
  for split-panels, and a header comment points at the canonical
  kernel. A parity test enforced via a jsdom harness can be added
  once the runtime side is converted.
- **Other transformers.** `chart-family`, `roadmap`, `journey`, and
  `word-cloud` still have their own direct imports in `marp.config.js`
  and (in the case of chart-family) inline duplicates in
  `lattice-emulator.js`. Each migrates in a follow-up PR using the
  same shape proved here.

## Follow-up sequence

1. Migrate `chart-family` to the registry. This deletes ~300 lines of
   chart logic duplicated in `lattice-emulator.js` (L1849–2150).
2. Migrate `roadmap`, `journey`, `word-cloud`. Each is already a
   `*.transform.js` module exporting `applyToRenderedHtml` — the
   adapter pattern from this PR applies directly.
3. Decide the runtime strategy: esbuild bundle, hand-rolled concat,
   or generated mirror with a parity test.
4. Once 3 is decided, fill in `applyToDom` on every transformer module
   and delete the inline DOM blocks from `lattice-runtime.js`.

## Why a registry instead of just sharing modules

Before: each renderer hand-rolled its dispatch list and reimplemented
the per-transform logic inline. Adding a new transform required
editing three files in lock-step; drift was caught only by visual
diff of the gallery PDFs.

After: each transformer declares itself once. The renderers iterate
the registry. Adding a new transformer means writing one file and
appending it to `TRANSFORMERS`. The three renderers pick it up
automatically (modulo the runtime constraint above).

The registry also gives us a place to enforce shape, ordering, and
idempotence as machine contracts — replacing the previous social
contract of "name your siblings in a header comment."
