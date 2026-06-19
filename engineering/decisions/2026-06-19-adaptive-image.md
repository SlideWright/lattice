---
status: in-progress
summary: The `image` layout is the one whose content shape we don't control — an author hands us an arbitrary rectangle. It now RESOLVES one of five compositions (clean / split / spotlight / gallery / statement) from two axes — the asset's intrinsic aspect bucket (read from the file header at build, measured in the browser at preview) and the deck orientation — instead of making the author pick a modifier. Risk-gated: only content-safe treatments (clean / split / spotlight) auto-fire; gallery + statement are opt-in; an explicit author class always wins.
version: 1
supersedes: none
builds-on: 2026-06-17-image-rearchitecture.md, 2026-06-16-orientation-in-the-form-model.md
---

# Adaptive `image` — composition resolved from content × canvas

**Status:** in-progress (implemented on branch; export + runtime-preview parity landed).
**Branch:** `claude/image-reimagine`

## Problem

Every other Lattice layout controls the *shape* of its content — a `stats`
strip, a `cards-grid`, a `gantt` chart are all built from markup we generate, so
we can size them to the canvas. The `image` layout is the one exception: the
author hands us an **arbitrary rectangle**. A phone crop is tall, a scan is
square, a product screenshot is wide, a landscape photo is 3:2, a hero shot is a
panorama. We don't see the pixels and we can't predict the aspect.

The old layout pretended this wasn't true. It offered four hand-picked modifiers
(`full`, `contain`, `museum`, `mirror`) and made the *author* choose the
treatment per asset. That was a Marp-era constraint: with no way to read the
image's dimensions at build time, the only option was to push the decision onto
the author. The result was a layout nobody liked — a wide photo dumped into a
`full` bleed cropped its subject; a tall phone shot in the default half-canvas
split left a letterboxed sliver; every deck looked different because every
author guessed differently.

Now that Lattice owns its engine (Marp retired as a render path, HARD RULE #1),
we can read the asset and decide for the author.

## The model — two axes resolve one composition

A boardroom-ready treatment depends on **two** things the author shouldn't have
to reconcile by hand:

1. **The photo's own aspect** — measured from the file header at build time
   (`lib/core/image-dimensions.js`, zero-dependency parsers for SVG/PNG/JPEG/
   GIF/WebP) and bucketed (`lib/core/image-aspect.js`):

   | bucket | aspect (w/h) | the shape an author would recognise |
   |---|---|---|
   | `pano` | ≥ 2.0 | panorama / cinematic strip |
   | `wide` | 1.3–2.0 | landscape photo |
   | `square` | 0.77–1.3 | squarish — scan, crop, logo plate |
   | `tall` | 0.5–0.77 | portrait photo |
   | `column` | < 0.5 | very tall strip |

2. **The deck size in use** — `data-orientation` (`landscape` / `portrait` /
   `square`), already stamped deck-wide by `lib/engine/slides.js`.

The pair resolves to a **composition** (`resolveComposition`), stamped as
`data-img-composition` on the `<section>`. CSS (`image.styles.css`) keys the
entire layout off that one attribute. One resolution table, shared by the build
path and the browser-measure path — no second source of truth.

### The five compositions

| composition | what it is | crop |
|---|---|---|
| **clean** *(default)* | a floated card whose **aspect adapts to the photo** — a square photo gets a square card, a wide one a wide card — beside a text panel (landscape) or stacked (portrait) | ≈ zero |
| **split** | an extreme-aspect photo shown **whole**: full-height column (landscape) or full-width band (portrait) | ≈ zero |
| **spotlight** | full-bleed cover where the photo already **matches** the canvas, text in a **solid** card | fills (matched) |
| **gallery** *(opt-in)* | contain on a matte + placard — for diagrams / screenshots with meaningful whitespace | zero (letterboxed) |
| **statement** *(opt-in)* | full-bleed + scrim + editorial title | fills |

### The resolution tables

```
LANDSCAPE:  pano→spotlight  wide→clean   square→clean  tall→split      column→split
PORTRAIT:   pano→split      wide→split   square→clean  tall→spotlight  column→spotlight
```

## The load-bearing decision: risk-gating

The auto-resolver acts on content it **cannot see**. The pre-mortem ("what
wrecks each choice?") found the real failure axis is not *eagerness* but
**content loss and illegibility**: cropping out the subject, or dropping white
text onto a photo that turns out to be pale. So the resolver is **risk-gated** —
it only ever auto-fires a treatment that is safe for *any* photo of that bucket:

- **clean** never crops badly because the **card takes the photo's aspect** — a
  cover-fill of a card shaped like the photo loses almost nothing. This is why
  clean is the standing default for the moderate buckets (square, wide).
- **split** shows the whole extreme-aspect photo (column / band), and only
  fires when the aspect is extreme enough that a clean card would *waste* the
  canvas.
- **spotlight** only fires when the photo's aspect already *matches* the canvas
  (pano on landscape, tall on portrait), so the cover crop is negligible — and
  the text rides a **solid** card, so legibility never depends on the photo.

The two treatments that *can* lose or obscure content — **gallery** (matte
frame, for assets we can't detect are diagrams) and **statement** (white text on
a scrim over an unknown photo) — are **opt-in only**. They are never
auto-resolved.

## The author always wins

The resolver is a smart **default**, not a constraint:

```js
const composition = compositionFromClass(cls) || resolveComposition(bucket, orientation);
```

An explicit composition class is checked **first**. An author who wants
cover-and-crop just names it — `<!-- _class: image spotlight -->` forces a
full-bleed cover on any photo, accepting whatever crop results. Vocabulary:

- `clean` · `split` · `spotlight` · `gallery` · `statement` — explicit pick.
- Legacy aliases (back-compat): `full`→spotlight, `contain`→gallery,
  `museum`→gallery.
- `mirror` (or `![bg left]`) — flip the image/text side.

## One DOM, reshaped per composition

Because the composition is chosen *after* authoring, the markup must be
composition-agnostic. `wrapImageText` (`lib/core/bg-image.js`) now wraps **every**
image section's prose in `.image-text` (not just the half-canvas ones), so the
DOM is always `<.lattice-bg> + <.image-text>`. CSS reshapes that single DOM with
`grid-template-areas` per composition. The image rides as a CSS background (no
`<img>`), so no rule needs `!important`.

## Implementation notes / gotchas

- **PDF-safe shadows.** Card lift uses a **hard, zero-blur** offset shadow.
  A blurred `box-shadow` renders as a flat grey block in Apple PDFKit
  (Preview / iOS) and Skia (`engineering/gotchas.md`, `base.focus.css`). Hard
  shadow + inset hairline gives crisp definition that survives every viewer.
- **No-hex.** All palette colour goes through `var(--token)` / `color-mix`
  (HARD RULE #3); scrim/overlay use `rgba()` (an overlay on an unknown photo,
  not a palette surface — the old layout did the same).
- **Determinism.** Dimensions are read at build time, so the export (PDF/HTML)
  is deterministic — no waiting on image load. Remote / data-URL / unreadable
  assets stamp no bucket → fall to the **clean** floor, which is safe for any
  rectangle.

## Render-path parity

Both paths resolve through the *same* brain (`lib/core/image-aspect.js`):

- **Build / export** (`lattice-emulator.js`): reads the asset's dimensions from
  the file header (`lib/core/image-dimensions.js`) and stamps
  `data-img-bucket` + `data-img-composition` before the PDF renders.
- **Runtime / preview** (`lib/transformers/image-adaptive.js`, applyToDom):
  MEASURES the asset in the browser (`new Image()`) and stamps the identical
  attributes, so the docs-site preview / playground / live marp-preview resolve
  the same composition the export does. Remote / data-URL / load-failed assets
  fall to the Clean floor.

## Follow-ups

- **Gallery graduation.** The reimagined `image` slides in the long-running
  baseline gallery (`test/integration/baseline-decks/gallery.md`) still use the
  legacy `full`/`contain`/`museum` aliases (which still render — via spotlight /
  gallery / gallery). Refresh them to the new composition vocabulary in a
  separate post-review commit (HARD RULE #8).
