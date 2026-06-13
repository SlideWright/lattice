# Islands + sketch density collisions — the chrome doesn't reserve its own space

**Status:** open defect, filed 2026-06-13. Found while auditing
`examples/gallery-jargon.md` ("the jargon gallery") under the Drawing-Board
A/B settings a user actually runs: **`finish: sketch` + `islands: on` + 4K +
`theme: crepuscolo`**. Sibling context: `2026-06-11-islands.md` (the islands
model) and `2026-06-11-sketch-finish.md` (the finish register).

## TL;DR

The committed jargon deck renders cleanly in its default **boardroom**
register. Two opt-in features — **islands** and, to a lesser degree, **sketch**
— surface a wave of layout collisions on content-dense slides because the
chrome those features add (masthead band, status bay, larger hand type) is
**not subtracted from the content safe-area**. Content is laid out as if it
owns the full canvas, then the chrome is painted over the top and bottom of it.

Severity is real: on the worst slide the `piechart donut` collapses from a
full ring to a half-ring and its legend drops 2 of 5 series. None of this
reproduces in boardroom.

## Repro

```sh
export CHROME_PATH=$(ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome | head -1)
# Boardroom (clean):
npx marp examples/gallery-jargon.md --config-file marp.config.js \
  --allow-local-files --images png -o .scratch/board.png
# User's settings (collisions): prepend `finish: sketch` + `islands: on`
#   to the front matter, then render the same way.
```

Compare any content-dense banded slide (e.g. `actors`, `roadmap`,
`piechart donut`, the `progress` trio, `list-criteria`) across the two.

## Defect 1 — islands chrome is not reserved in the safe-area (primary)

With `islands: on`, every **eligible** section (the toggle skips
title/divider/closing/math/compare-code/split-panel/split-compare/image/
featured — see `ISLANDS_TOGGLE_SKIP` in `lib/integrations/marp/plugins.js`)
gains a top **masthead band** and a bottom-centre **status bay + progress
rail**. The content box is not inset by their heights, so:

- **Heading clips into the masthead band** (top): `cards-grid`, `cards-stack`,
  `cards-stack compact`, `list-tabular`, `roadmap`, `progress`, `glossary`,
  `timeline-list`, `list-steps`. The heading's cap-line is sheared by the band.
- **Body/cards/columns clip at the bottom** or collide with the next item:
  `actors` (4 cards overrun top *and* bottom), `list-criteria` (each body runs
  into the next item's title), `timeline-list` (every column truncated
  mid-sentence), `list` (card overflow).
- **Footer collides with the centred section label**: whenever the left-aligned
  `_footer` text is long it runs straight through the centred
  "SECTION 0n · …" status-bay label + progress dots (`compare-prose decision`,
  `list-steps milestone lettered`, the `compare-prose transition` /
  `decision banner-tag` pairs, `list takeaway numbered`).
- **`piechart donut` breaks**: the compressed content zone collapses the donut
  to a **half-ring** and clips the legend to ~3.5 of 5 series (the
  "Toil and on-call 5%" wedge the slide's own caption brags about is dropped).
  Boardroom and `sketch`-without-islands both draw the full ring + 5 rows.

**Proof it's islands, not content:** `actors`, `list-criteria`, and
`piechart donut` each render **flawlessly** in boardroom *and* in
`sketch`-with-`islands: off`. Turning islands on is the only change that breaks
them.

### Fix direction

The masthead band and status-bay/progress-rail need to **reserve their height
from the content safe-area** (inset the layout box), the same way the deck
header/footer/pagination reservation already works — rather than being overlaid
on a full-canvas layout. The footer↔status-bay overlap is the horizontal twin:
the footer and the centred section label share one row with no width budget;
give the centred label a reserved centre column the footer can't enter.
This must land in all three render paths (emulator, marp-cli plugins, runtime)
to keep them in agreement (HARD RULE 1).

Until fixed, the safe authoring guidance for dense decks is `islands: off` or
`islands: minimal` (drops the progress rail but keeps the band+bay, so it
doesn't resolve the top-clip).

## Defect 2 — sketch ghosts numerals on the split-panel watermark (secondary)

On `split-panel watermark mirror` (jargon "Phase 01 through Phase 03 ships…"),
the heading's digits **01 / 03 render as near-invisible ghost glyphs** on the
purple watermark panel under `finish: sketch`. In boardroom the same heading is
crisp white. `split-panel` is islands-exempt, so this is purely the sketch
finish styling numerals in the watermark band at the watermark's own (very low)
opacity. Fix: ensure heading numerals on the watermark panel inherit heading
contrast, not the watermark ghost treatment.

## Defect 3 — sketch density tips already-tight slides over (tertiary)

The hand finish sets larger/looser type, so a few slides that fit boardroom
overflow under sketch even though they're islands-exempt (`featured`,
`image full`). This is expected register cost, not a layout bug; addressed in
the deck by trimming copy where it's cheap (see CHANGELOG 2026-06-13). The
durable lever, if we want sketch to be drop-in safe, is a small type-ramp or
safe-area concession for the hand register.

## Out of scope here

The jargon deck's *editorial* overflow rings in boardroom (e.g. `checklist`,
the two annotation `cards-grid` slides) are pre-existing and intentional to its
dense, satirical register; the per-build ring count also flickers because
webfonts are MITM'd in the sandbox and the detector measures against the serif
fallback (see `engineering/gotchas.md`). Not addressed here.
