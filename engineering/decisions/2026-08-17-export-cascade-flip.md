---
status: shipped
summary: #1527 itself — the export path composed its stylesheet `paletteCSS + layoutCSS`, so `dist/lattice.css`'s universal defaults loaded LAST and won, and every value a palette curated for itself was overridden in the exported artifact while the Studio and the docs Playground rendered the theme's own value. One line in `lattice-emulator.js` flips it to `layoutCSS + paletteCSS`, matching `lib/engine/css.js` `composeCss` (HARD RULE #1). The file already contradicted itself — the var parser and the mermaid scratch doc composed layout-first while the RENDER composed palette-first, so the document the emulator drew disagreed with the token map it reasoned about; the flip removes the third order rather than adding one. Unblocked by #1681 (flat-over-pair) and #1704 (composed surfaces). Reproduced on a rebuilt 32-palette x 6-slide probe (the original harness lived in gitignored `.scratch/pcg/`): 2240 rendered text runs, 148 below AA before, 115 after, 760 runs moved, and exactly 4 regressions — all of them `redline stacked` `<ins>` on `a11y-tritanopia` (4.70 -> 4.45) and `concrete` (4.79 -> 4.17), which are `proactive: true` entries in the composed-contrast frozen baseline and agree with that static gate to within 0.01. Proactive means the CSS produces the pairing but no shipped deck writes the markup; the probe writes it deliberately to reach the surface. Nothing regresses on any surface a shipped deck renders, and the closest a still-passing run comes to its bar is +0.69. Also corrects three comments that asserted the old order as fact — in `check-ownership.js`, `hljs-contrast.test.js` and `composed-contrast.js` — where the base-against-every-panel arm SURVIVES the flip for a different reason (token inheritance, not cascade order), so the logic is unchanged and only the rationale moves.
---

# Flipping the export-path cascade

**2026-08-17 · branch `claude/cascade-flip-1527-240glf` · closes #1527**

**Area:** `lattice-emulator.js` (one line), three stale order comments in
`tools/check-ownership.js`, `test/unit/palette/hljs-contrast.test.js` and
`tools/composed-contrast.js`, the re-blessed gallery goldens, and
`examples/cascade-flip.md` (the demo deck, HARD RULE #9)

## The defect

`lattice-emulator.js` built the exported document's stylesheet as:

```js
const css = paletteCSS + '\n' + layoutCSS;
```

Palette first, layout second. CSS resolves equal-specificity `:root` declarations
in source order, so the sheet that comes **last** wins — which means
`dist/lattice.css`'s universal defaults in `base.tokens.css` overrode **every
value a palette curated for itself**. A theme's `--hljs-literal`, its status trio,
its sequential ramp: authored, gated, shipped, and then not painted, in the one
artifact a boardroom actually sees.

The engine has always composed the other way. `lib/engine/css.js` `composeCss`
puts the scaffold first and the theme (with `@import 'lattice'` inlined) second —
the order every palette is *authored* against, since a theme's `:root` is meant to
override the base it imports by coming later. So the Studio and the docs
Playground rendered a palette's curated value while the PDF rendered base's
default, from the same source deck.

## The file already disagreed with itself

This is what makes the change a one-liner rather than a redesign. Three other
sites in the same file already composed **layout-first**:

(Line numbers move; grep the symbol, not the number — #1527's own body still
pointed at line 691 by the time this was picked up.)

| site | order before this change |
|---|---|
| `const css = …` — the exported document's `<style>` | palette-first ✗ |
| `PALETTE_VARS` / `PALETTE_VARS_DARK` — the Mermaid var resolver | layout-first ✓ |
| `parsePaletteVars(…lookPaletteCss…)` — an `--image-mode` look palette | layout-first ✓ |
| `scratchDoc` — the Mermaid look scratch document's `<style>` | layout-first ✓ |

So the token map the emulator **reasoned** about (what `--pass` resolves to) was
computed under one cascade, and the document it **drew** used the other. Mermaid
diagrams baked their colors from the palette-wins map and then sat on a page whose
CSS resolved base-wins. Flipping line 782 **removes the third order**; it does not
introduce one.

Two further sites need no change and are worth naming so a later reader does not
"fix" them:

- **the `lattice-svg-look` style injection** — the look palette is appended to
  `<head>` at runtime, i.e. after the main sheet. Palette-last there is already
  consistent with the flipped order.
- **`paletteDecls`** — reads `paletteCSS` alone, comment-stripped, to decide the
  deck's `color-scheme`. Deliberately palette-only; not a two-sheet composition.

And the fourth render surface was never palette-first either: **export-to-Marp**
(`lib/core/marp-bundle.js`) ships `lattice.css` plus `themes/` as a Marp themeSet
and lets each palette's own `@import 'lattice'` pull the base in — which inlines it
at the TOP of the theme, layout-first, by construction. So of the four surfaces
that turn a deck into pixels — engine/Studio, docs Playground, export-to-Marp, and
the emulator's PDF — only the last one inverted the cascade. That is the whole
defect, and this is the whole fix.

## Why it was blocked, and why it is not any more

Flipping the order makes curated palette values *start* painting on the export
path — which is only an improvement if those values are actually better than the
defaults they replace. Two classes of defect made that false:

1. **Flat-over-pair** — a palette overriding a base `light-dark()` pair with a
   single flat hex, so "base wins" was accidentally protecting dark mode.
   Closed by #1681 (`2026-08-16-flat-palette-dark-companions.md`).
2. **Composed surfaces** — a curated value worse than the base default on a
   surface a *component* composes, which no gate could see. Closed by #1704
   (`2026-08-17-composed-surface-contrast.md`), which also built
   `tools/composed-contrast.js` to keep it closed.

Both are shipped. This note is the flip itself.

## Measured on the real render

The probe harness #1704 used lived under `.scratch/pcg/`, which is gitignored and
did not survive. It was rebuilt from that note's own description: 32 palettes × a
6-slide probe deck (`redline`, `redline dark`, `redline stacked`, `redline stacked
dark`, `word-cloud spectrum`, `word-cloud spectrum dark`), rendered to HTML through
`lattice-emulator.js` and scored with `check-slide-contrast.js`'s **own** browser-side
probe, sliced out of that tool rather than re-derived (HARD RULE #15) so the differ
cannot disagree with the gate about what a run scores.

The rebuilt deck's clause wording differs from the original, so absolute run counts
differ from #1704's (2240 runs here vs 2496 there). The before/after comparison is
same-probe, same-machine, and pairs runs individually rather than comparing totals.

| | runs below their bar |
|---|---|
| `origin/main` (af590c2, unflipped) | 148 / 2240 |
| with this flip | **115 / 2240** |

**760 runs move. 37 newly clear their bar. 4 regress.** All four are the same
surface:

```
concrete-dark     p3 redline stacked        ins  4.79 -> 4.17  (need 4.5)
concrete-dark     p4 redline stacked dark   ins  4.79 -> 4.17
concrete          p4 redline stacked dark   ins  4.79 -> 4.17
a11y-tritanopia   p3 redline stacked        ins  4.70 -> 4.45
```

That is `redline/ins-on-new-card` — `<ins>` on `--pass-bg` over the 5% NEW card,
two own-hue tints deep. It is `proactive: true` in
`tools/composed-contrast.js`'s catalog, meaning **the CSS produces the pairing but
no deck in the repo writes the markup**: `redline.docs.md` documents `stacked` as
two plain blockquotes, and the probe puts `<ins>`/`<del>` inside those cards
deliberately in order to reach the surface at all.

Those exact pairs are already in that gate's frozen baseline — `a11y-tritanopia|
light|redline/ins-on-new-card` at **4.44** and `concrete{,-dark}|dark|…` at
**4.18** — and the rendered numbers agree with the static gate to within **0.01**
(4.45 vs 4.44, 4.17 vs 4.18). Two independent models of the same surface, one
static and one from real pixels, landing on the same figure is the strongest
evidence here that the regression set is understood and complete.

**On every surface a shipped deck renders, nothing regresses.**

### Reading the large "degraded" bucket correctly

418 runs get a *lower* ratio while staying above their bar, and the biggest movers
look alarming in isolation — `word-cloud spectrum` on the a11y palettes goes
**21.00 → 5.74**. That is the flip working as designed, not damage: before, the
spectrum words took base's near-black default (21:1 against the canvas, and
visually a word cloud with no spectrum at all); now they take the palette's curated
`--seq-*` ramp, which is the appearance the component was designed for.

The number that matters is the **margin to the bar**, not the size of the drop.
The closest any still-passing run comes to failing after the flip is **+0.69**
(3.69 against a 3:1 bar). Nothing lands near the edge.

## The three comments that asserted the old order

Two gates and one tool documented the palette-first order **as a fact about the
export path**, and two of them said in so many words "until the flip lands". Left
alone they would have become confidently wrong — the exact drift that produced the
original defect.

The important finding is that **no gate logic needed to change.** The
base-against-every-panel arm in `checkHljsContrast` and its mirror test looked like
artifacts of the old cascade, but they survive the flip for a different and more
durable reason:

> A palette declares only *some* of the twelve `--hljs-*` tokens. Every token it
> leaves undeclared inherits the base's value onto **that palette's** `--code-bg`.

So the base still has to clear the floor on every panel — it just gets there by
inheritance now rather than by out-ordering the theme. Narrowing that arm to
base-on-base, which the old comment invited, would have stopped measuring the
majority of real panels. The theme-wins surface (a palette's own value on its own
panel) was already covered: `against = name === 'lattice' ? [...panels.keys()] :
[own]` in the gate, and the `no shipped value sits under the floor` test.

Only the rationale moves, in all three files.

## Gates

`npm run lint` · `npm test` (6621) · `npm run build` · `npm run build:check` ·
`npm run test:integration` (739 pass, 7 skipped) · `npm run regress` ·
`node tools/composed-contrast.js` (0 regressions / 0 unlisted / 0 degraded /
0 stale / 0 unresolved) · `node tools/contrast-audit.js` (0 failures, 736 pairs).

**What is verified, and on what surface** (HARD RULE #23): the contrast claims
come from 64 real HTML renders driven through headless Chromium — the actual
export pipeline, not a harness — measured with the shipping tool's own probe. The
regression gate re-renders all 65 galleries × 2 moods and pixel-diffs them against
the committed goldens, which is what establishes the visual blast radius on
shipped decks.

## Logged, not fixed

Unchanged from #1704, and both fail identically before and after the flip, so
neither is caused or worsened here (HARD RULE #18, off-path):

- **#1697** — the canvas-blind sequential ramp.
- **#1698** — the status trios on their own-hue tints.
