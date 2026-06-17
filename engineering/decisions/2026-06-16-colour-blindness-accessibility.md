---
status: design-decision
last-updated: 2026-06-16
companion:
  - ../../design/theming.md
  - ./2026-06-14-deck-print-styling.md
  - ../../lib/core/resolve-palette.js
  - ../../CLAUDE.md
---

# Colour-blindness accessibility — curated CVD palettes that win the name-resolution chain

> **Update (2026-06-16) — superseded by "a11y-* are first-class themes."**
> This ADR originally shipped CVD accommodation as a *separate axis* that
> **overrode** the theme: an `accessibility:` front-matter key / `LATTICE_ACCESSIBILITY`
> env / Drawing Board workspace control, resolved by `lib/core/resolve-accessibility.js`,
> which won the palette name-resolution chain. **That layer is removed.** The four
> `a11y-<type>` palettes are now plain, selectable themes (`theme: a11y-deuteranopia`,
> same chain as any theme; grouped under "Accessibility" in the picker), and
> **mode-invariant** — fixed palettes that ignore the light/dark toggle — sharing a
> `themes/a11y-base.css` foundation; the four `a11y-*-dark.css` files and the resolver
> are deleted. The redundant-encoding mechanism (textures/glyphs/line-styles) is
> unchanged; only its *activation* changed (pick the theme, no override), and the
> texture `<defs>` now emit on every render (no `/^a11y-/` gate). An accessibility need
> is met by choosing the theme — simpler, no precedence magic, one uniform theme model.
> The sections below describe the original override design, kept for history.

**Context.** Lattice encodes *meaning* in hue. Three token families do it:
the categorical cycle (`--cat-1-fill`..`--cat-12-fill` / `-mark`), the
chart-family spectrum (`--chart-cat1`..`--chart-cat8`), and the semantic
signals (`--pass` / `--warn` / `--fail`). To a normal-sighted viewer those
read as a dozen distinct categories; to the ~8% of men (and ~0.5% of women)
with a colour-vision deficiency (CVD) they collapse — red↔green under
deuteranomaly/protanomaly (the common cases), blue↔green and yellow↔pink
under tritanomaly, and *all* hue under achromatopsia. This is the same
"meaning lives in hue" gap the print-styling note
([`2026-06-14-deck-print-styling.md`](./2026-06-14-deck-print-styling.md))
found for grayscale paper — here the surface is the screen and the PDF, and
the *palette* fix is per-viewer, not per-medium. (The phase-2 **encoding** fix,
by contrast, *is* medium-independent and closes the print gap too — see the
[redundant-encoding ADR § Side-benefit](./2026-06-16-cvd-redundant-encoding.md).)

**The ask (owner, 2026-06-16).** Not a per-theme tweak and not an official
theme. *"In the land of the blind the one-eyed man is king — themes go out
the window."* A **dynamic, CVD-curated palette** the deck can enable via a
front-matter `accessibility:` key (so the deck *carries* it) **or** a viewer
can force from a workspace setting; rendered correctly in every preview, in
Present mode, and in Practice mode; and **accessibility takes precedence over
the theme, always.**

## Decision

Ship **CVD-curated palettes that win the palette *name-resolution* chain** —
not a CSS overlay layered on a theme. When accessibility is active the deck's
`theme:` is fully superseded by one curated palette tuned for that deficiency.
Because every render surface already resolves a theme *by name* (see
[Why this shape](#why-this-shape)), this needs no new rendering layer.

| Decision | Choice | Rationale |
|---|---|---|
| Mechanism | Curated palettes that **win name resolution** (theme doesn't load) | "Full replacement" = a complete palette; resolving by name reuses every existing gate (contrast suite, dark variants, emulator Mermaid collapse, VS Code registration) |
| Precedence | **workspace > front-matter `accessibility:` > off**; and accessibility > `theme:` always | The live viewer's declared need can't be overridden by an author's guess |
| Scope | **Full** colour-contract replacement | Owner: "themes go out the window" |
| v1 deficiencies | **deuteranopia, protanopia, tritanopia** (the three dichromacies), each × light/dark | Palette-only genuinely works for these; covers ~99% of CVD |
| Achromatopsia | deferred in v1; **shipped in phase 2** | Under total colour-blindness hue carries *zero* information; it works now that redundant encoding has landed (resolves via the `accessibility:` key like the dichromacies) |
| Redundant encoding | v1 palette-only; **shipped in phase 2** (textures / line-styles / ✓!✗ glyphs) | Lifts the ≤8-category ceiling, makes achromatopsia function, and — being medium-independent — doubles as a grayscale-**print** accommodation (see [redundant-encoding ADR § Side-benefit](./2026-06-16-cvd-redundant-encoding.md)) |

## Why this shape

A parallel render-path audit (2026-06-16) confirmed the load-bearing fact:
**every surface selects a palette by name, so accessibility is a
name-resolution problem.**

| Surface | How it gets the palette | Accessibility seam |
|---|---|---|
| Emulator (PDF) | name → `themes/<name>.css`, inlined into `<style>`; precedence CLI > env > front-matter > default (`lib/core/resolve-palette.js`) | `resolve-accessibility.js` returns the CVD palette name in place of `theme:` |
| Drawing Board · Present · Practice | each reads `data-palette` + `data-mode` off `<html>`, fetches `themeBase + name + '.css'`, calls `PG.render(src, name)`; persisted in `localStorage` (`lattice-docs-palette` / `-mode`) | a new `data-a11y` attribute + `lattice-docs-a11y` key, consulted **before** `data-palette` |
| VS Code / runtime | theme file loaded by the host; `lattice-runtime.js` reads computed values via `getComputedStyle()` | inherits whatever palette resolved upstream |

This is exactly the rail `color-scheme` / `light-dark()` already rides — a
CSS-scope decision that reaches all paths uniformly, no per-renderer logic.
An "overlay layered on the theme" would have invented a second precedence
cascade to debug; resolving by name reuses the one we have.

### The pieces

1. **`lib/core/resolve-accessibility.js`** — a resolver that sits *above* the
   existing `resolvePalette` chain. Inputs: workspace setting, front-matter
   `accessibility:`, the resolved theme. Output: the active palette name
   (the CVD palette when accessibility is on, else the theme). Pure, fs-free,
   shareable — same discipline as `resolve-palette.js`.
2. **The palettes** — `themes/a11y-deuteranopia.css`, `-protanopia.css`,
   `-tritanopia.css`, each with a `-dark` sibling. **6 files in v1** (3 ×
   light/dark), mirroring the `indaco` / `indaco-dark` pattern so they inherit
   every theme gate. They are authored as ordinary palettes per
   [`design/theming.md`](../../design/theming.md) — they just optimise for
   perceptual separation instead of brand. Add each to
   `test/unit/palette/contrast.test.js`'s loop (it only runs indaco+cuoio
   today; siblings inherit by cascade, but these define their own values).
3. **One shared client resolver** — the three Drawing Board controllers
   (`drawing-board-render.js`, `-present.js`, `-practice.js`) each
   independently resolve the theme name from `data-palette`/front-matter.
   Extract that resolution into one module mirroring
   `resolve-accessibility.js` so "accessibility wins" is implemented **once**,
   not three times (HARD RULE #1 in spirit — the shared kernel keeps the
   surfaces in step).
4. **Activation surfaces** — (a) front-matter `accessibility: deuteranopia`
   parsed in the kernel (sibling to `readFrontMatterTheme`); (b) a workspace
   toggle (UI control + `lattice-docs-a11y` localStorage, stamped onto
   `data-a11y` by the pre-paint script alongside `data-palette`/`data-mode`).

## The validation prerequisite — build the audit gate first

There is **no CVD simulation anywhere in the repo**, and
`test/unit/palette/contrast.test.js` checks only WCAG sRGB luminance contrast
(plus OKLab distance on `chart-1..6`). You cannot hand-curate palettes that
*actually separate under a deficiency* by eye — that is precisely the
perceptual judgement CVD destroys. So the build order is:

1. **Add CVD simulation** (Brettel-1997 or Machado-2009) to `lib/theme/`,
   which already houses `color.js` / `contrast.js` / `derive.js`.
2. **Add a CVD audit + regression gate** — a sibling to
   `tools/contrast-audit.js` / `contrast.test.js` that simulates each
   deficiency and **fails** adjacent categorical/chart/semantic pairs that
   collapse below a perceptual-distance floor (and reports *which* slots
   collapse, so the ≤8-category ceiling is visible per palette).
3. **Then curate** the three palettes against that gate, so "separable under
   deuteranopia" is asserted, not asserted-by-vibes.

Palette strategy per type: lead with **luminance** separation (the one channel
every CVD preserves), then place hues on the axis the deficiency *keeps*
(blue/orange/yellow for red-green types; red/cyan for tritan). The
known-good categorical references are Okabe-Ito (8) and Paul Tol's schemes;
beyond ~8 distinct categories, palette alone cannot win — that is the wall
phase-2 redundant encoding exists to break.

## Known limits (state them; don't overclaim)

1. **The ≤8-distinguishable ceiling.** 12 categorical + 8 chart slots cannot
   all stay distinct under dichromacy by colour alone. v1 serves the common
   ≤8-category cases well; dense diagrams stay imperfect until phase-2
   patterns. The audit *reports* the collapsed slots rather than pretending.
2. **Workspace-wins holds only at *live* render.** A distributed PDF is baked
   with whatever type was active at export (the deck's front-matter); a
   downstream viewer's workspace preference can't retro-apply to a static
   file. The guarantee is "workspace wins wherever the deck renders live
   (playground / Present / Practice / runtime)."
3. **Achromatopsia shipped in phase 2.** It was held back in v1 because
   palette-only would resolve but not function; with redundant encoding landed it
   now works and resolves via the `accessibility:` key like the dichromacies.
4. **Raster images / photos are uncorrected.** The token approach can't touch
   embedded bitmaps — acceptable, noted.

## Build sequence

1. CVD simulation in `lib/theme/` + the audit gate + regression test *(the
   read-only prerequisite — gives per-slot collapse data before any palette
   exists)*.
2. `resolve-accessibility.js` + the front-matter `accessibility:` parse +
   precedence (workspace > front-matter > off; accessibility > theme).
3. Curate the three dichromacy palettes (× light/dark) against the gate; add
   them to the contrast loop.
4. ~~Extract the shared client resolver; wire the workspace toggle
   (`data-a11y` + `lattice-docs-a11y`) into the three controllers.~~
   **Superseded — NOT shipped (see top banner).** This step built a client
   resolver (`resolve-a11y-client.js`), a `lattice-docs-a11y` workspace pref
   (`a11y-prefs.js`) surfaced as a "Colour-vision accessibility" settings
   control with an "Apply to deck" action, and kept the `a11y-*` palettes OUT of
   the theme picker. **All of that was removed.** What actually shipped: the
   `a11y-*` palettes ARE first-class picker themes (no `data-a11y`, no client
   resolver, no workspace axis); the texture `<defs>` are injected into the
   preview/Present/Practice iframes on every render (not gated on an "active a11y
   palette"). The remaining true statement is the defs-injection as the
   runtime-path counterpart to the emulator's.
5. Verify across all live paths (emulator PDF + playground + Present +
   Practice) and a representative demo deck.
6. **Phase 2:** redundant non-colour encoding (patterns / markers / shapes /
   ✓!✗ semantic glyphs) + the achromatopsia palette.

Per-feature deliverables (demo deck `examples/<slug>.md` + committed PDF,
`CHANGELOG.md` entry, the `accessibility:` key documented in
[`lib/base/base.docs.md`](../../lib/base/base.docs.md)) land with the
implementation per the workflow contract.

**Status: shipped** — mechanism, precedence, and scope aligned with the owner
2026-06-16 (workspace-wins; full replacement). All four types ship (three
dichromacies + achromatopsia); phase-2 redundant encoding (textures,
line-styles, glyphs) landed and is detailed in the
[redundant-encoding ADR](./2026-06-16-cvd-redundant-encoding.md).
