---
status: design-speculation
version: 1
supersedes: none
last-status-update: 2026-06-14
---

# Print styling — a deck that survives the trip to the boardroom, on paper, in colour *and* black-and-white

> **Not canonical.** Design-speculation, written ahead of implementation.
> No shipped behaviour yet. When this note and a shipped surface disagree,
> the shipped surface wins. Purpose: fix the *shape* of print support — the
> two deliverables, the dedicated print theme band, and how we prefill
> orientation — before any CSS or transform lands.

## Symptom — "our print export is about as ugly as sin"

The complaint is real, but it points at **one** of two print surfaces, and
they are not equally bad.

**The engine PDF (CLI / puppeteer) is already decent.** `lib/engine/css.js:121`
emits `@page { size: <slide-w> <slide-h>; margin: 0 }` plus a `@media print`
block that forces one slide per page and `print-color-adjust: exact` (headless
Chromium otherwise re-quantizes background fills, washing the palette out).
Every theme `@size` (`themes/*.css` header) is landscape. So the CLI PDF is
landscape, full-bleed, exact-colour, one-slide-per-page — the boardroom
artifact. Keep it.

**The web "Print" button is the ugly one.** `docs/src/playground/drawing-board-export.js:352`
is literally `doc.title = …; win.print()`, leaning on a thin print stylesheet
(`docs/src/playground/deck-preview.js:188`) that sets `@page { size: <px> <px> }`,
forces `background:#fff`, and strips shadow/radius. Then it drops the user into
the **browser's native print dialog**, whose defaults are **portrait, A4/Letter
with margins, and a URL/date header-footer**. A 16:9 landscape slide gets
shrunk into a portrait sheet with whitespace and a `localhost — 6/14/26`
footer. That is the "ugly as sin."

**The deeper gap, true of *both* surfaces: nothing survives black-and-white.**
Every palette encodes meaning in **hue** — `--cat-1..12`, `--chart-*`,
`--diagram-band-1..12`, the tint/mark treatments. On a grayscale office printer
two tints that differ only in hue collapse to the *same gray*: comparison
tables, tinted cards, and chart series go mushy and unreadable. There is no
print/monochrome token band anywhere in the codebase. A deck that looks 10/10
on screen can reach the boardroom as a stack of indistinguishable grays.

## Decision frame (resolved 2026-06-14)

Three forks were put to the owner and answered:

1. **Print target → "Both, paper-first."** Treat *physical paper* (someone hits
   ⌘P on an office printer) as the demanding case; let a clean digital PDF fall
   out of it.
2. **B&W survivability → "Dedicated print theme mode."** A curated print/monochrome
   token band per theme where category distinction comes from **border, rule,
   weight, and pattern**, not hue — not an auto de-hue, not color-only.
3. **Scope this round → "Design doc first."** This note. No code yet.

Everything below follows from those three.

## The architecture already has the shape we need

Lattice's colour model is a **token band selected by a mode**:

- The screen model swaps a **light** and a **dark** band through CSS
  `color-scheme` + `light-dark(L, D)` (`themes/indaco.css:94`). Author flips
  whole-deck dark via `style: ":root{color-scheme:dark}"`.
- `section.dark` (in `lattice.css`) remaps the *main* tokens to a `--dark-*`
  band (`themes/indaco.css:170`) so the same layout structure reskins for a
  dark canvas — cover/divider/closing.

**A print band is the same move on a third axis.** Each theme declares a
`--print-*` band; a `print` mode remaps the main tokens to it, exactly as
`section.dark` remaps to `--dark-*`. Nothing about the layouts changes — they
are palette-blind by contract (`CLAUDE.md`), so they inherit the print band for
free. This is why "dedicated print theme mode" is cheap to express and
consistent with the engine.

### Why NOT plain `@media print`

The obvious-but-wrong move is `@media print { :root { --bg:#fff; … } }`.
It is too blunt: **our colour PDF export renders *through* the print path**
(puppeteer prints to PDF), so a `@media print` token remap would also strip the
colour out of the boardroom colour PDF we want to keep. The print band must be
an **explicit opt-in** (export option / front-matter `mode: print`), decoupled
from the raw `@media print` trigger, so the two deliverables stay distinct:

| Deliverable | Trigger | Tokens | Page |
|---|---|---|---|
| **Colour PDF** (screen/projector/email) | default export | full light/dark palette | slide-px landscape, full-bleed |
| **Print handout** (paper, B&W-safe) | explicit `mode: print` | the `--print-*` band | paper-size landscape, scale-to-fit + safe margin |

`@media print and (monochrome)` stays as an *enhancement* layer only — Chromium
reports `(monochrome)` unreliably at print time (often color even for a B&W
printer, often 0 in preview), so it can sharpen the band when detected but must
never be the sole trigger.

## The print band — what "B&W-safe" actually requires

De-hueing destroys hue-only distinction, so the print band must carry meaning
on channels that survive grayscale:

- **Ink:** near-pure black body/heading on white; no light-gray body text
  (cheap printers crush it).
- **Every fill gets a stroke.** Adjacent fills that merge in gray must be
  separated by a defined border — promote `--border` to a real ink rule in the
  print band, applied to cards, table cells, chart bars, diagram nodes.
- **Category ramps collapse to lightness + pattern, not hue.** `--cat-*` /
  `--chart-*` / `--diagram-band-*` must map onto a small set distinguishable by
  **stepped lightness and/or SVG pattern fills** (hatch/dot/cross), plus their
  text labels. This is the genuinely hard part — see Open Questions.
- **Signals keep their semantics by shape, not just colour.** `--pass/--warn/--fail`
  lose red/green/amber in gray; lean on the existing glyph/label, and give each
  a distinct lightness + border so a printed RAG status is still legible.
- **Backgrounds:** bookend slides (cover/divider/closing) that are dark
  full-bleed on screen become ink-on-white framed panels in print — a dark
  flood wastes toner and prints as a muddy rectangle.

**Contrast guarantee extends to the band.** `test/unit/contrast.test.js`
already asserts every text-bearing token clears WCAG AA against its surface
(`themes/indaco.css:39`). The print band gets the same assertion against
**white**, so "B&W-safe" is a *gated* claim, not a hope.

## Orientation — yes, we can "tell the printer," two honest mechanisms

**Q: "Can we actually tell the printer how to print — prefilled orientation?"**
Yes. Two levers, depending on surface:

1. **The downloaded PDF tells the printer by its geometry.** Orientation is
   intrinsic to the page MediaBox (landscape = width > height). A landscape PDF
   opens landscape and prints landscape by default — *no dialog roulette*. Add
   `/ViewerPreferences << /PrintScaling /None >>` so viewers don't "fit to
   page"-shrink it. This is the strong path and it's why **paper-first wants a
   real downloaded PDF**, not `window.print()`. The jsPDF export
   (`drawing-board-export.js`, the image-PDF path) already lets us set
   `orientation: 'landscape'` explicitly.

2. **`window.print()` can prefill the dialog.** Switch the paper-print
   stylesheet from `@page { size: <px> <px> }` (a weird custom paper that
   Chromium scales badly onto A4/Letter) to the **keyword form**
   `@page { size: A4 landscape }` (or `letter landscape`). That *pre-selects
   landscape* in Chromium's dialog, and `margin: 0` removes the default
   header/footer. We cannot delete the dialog or force the printer's own
   driver, but we can make every default correct on arrival.

### The paper-fit crux (the real cost of "paper-first")

Our canvas is 16:9 (1280×720, ratio ≈ 1.778). **A4 landscape ≈ 1.414, Letter
landscape ≈ 1.294 — both *narrower* than 16:9.** So a 16:9 slide on A4/Letter
landscape *must* either letterbox (white bands top & bottom, scaled to width)
or crop. The honest defaults:

- **Scale-to-fit-width, centered, with a small safe margin (~8–10mm)** and
  accept top/bottom whitespace. Predictable, never crops content.
- **Offer 4:3 handout authoring.** The existing `standard 960×720` size (4:3 ≈
  1.333) fits Letter landscape almost exactly — a deck authored or re-sized to
  4:3 prints edge-to-edge. Worth surfacing as the "designed for paper" size.

A safe margin also dodges the unprintable-edge clipping every physical printer
has (full-bleed `margin:0` loses ~3–5mm at the paper edge on real hardware).

## The two builds that follow

**Build A — fix the web Print path (small, ships the reported wound).**
In `deck-preview.js:188`, swap the px `@page` for `@page { size: <paper>
landscape; margin: <safe> }`, scale the slide to fit width centered, keep the
fidelity caveat at the export action. Turns "ugly as sin" into "correct
defaults." ~half a day, no engine change.

**Build B — the dedicated print band + paper-PDF export (the substantive
piece).**
1. Add a `--print-*` band to each theme (`themes/*.css`), mirroring the
   `--dark-*` band's structure.
2. Add a `print` mode that remaps main tokens to `--print-*` — a `section`-level
   rule in `lattice.css` (sibling to `section.dark`) gated by an explicit
   trigger (front-matter `mode: print` and/or an export option), **not**
   `@media print`.
3. Resolve the category-ramp → lightness+pattern mapping (SVG pattern fills for
   chart/diagram; stepped grays + borders for cards/tables).
4. Extend `test/unit/contrast.test.js` to assert the print band vs white.
5. A **"Print handout (B&W-safe, landscape)"** export that produces a downloaded
   PDF (paper-size landscape MediaBox + `/PrintScaling /None`) in the print
   band — the artifact that "survives the trip," no dialog.
6. Per-feature demo deck `examples/<slug>.md` + committed PDF, rendered in both
   the colour and the print band, for owner sign-off (the export-change STOP
   rule in `CLAUDE.md` applies — print output is exported content).

## Open questions / risks

- **Category ramp in grayscale is the hard problem.** Stepped lightness alone
  tops out at ~4–5 reliably-distinct grays on cheap printers; beyond that we
  need **SVG pattern fills**, which touch the chart/diagram renderers, not just
  tokens. Scope: how many categories must survive B&W, and do we cap series in
  print mode or always pattern them? *Leaning: borders + ≤5 grays for
  cards/tables; pattern fills for chart/diagram series.*
- **4:3 vs 16:9 for paper.** Do we recommend (or auto-offer) 4:3 re-size for the
  print handout, or always letterbox 16:9? *Leaning: letterbox by default, offer
  4:3 as the "designed for paper" size — never silently crop.*
- **Where the mode trigger lives.** Front-matter `mode: print`, an export-time
  flag, or both? The export option is the must-have (it's a render-time choice,
  not a deck property); front-matter is a convenience. *Leaning: export option
  primary; front-matter optional.*
- **Speaker-notes handout** (slide + notes per page) is the classic boardroom
  leave-behind and a natural sibling, but it's a separate feature — out of scope
  here unless folded in deliberately.
- **CLI parity.** Build B's print band should be reachable from the `lattice`
  CLI (a `--print` flag), not just the Drawing Board, so the shared-kernel rule
  (`CLAUDE.md` HARD RULE #1) holds — the mode is a render option, it belongs in
  the engine, not the web UI.

## Recommendation

Ship **Build A now** (it's the literal reported wound and is low-risk), and
commit to **Build B** as the real deliverable, sequenced: print band + contrast
gate → paper-PDF export → category-ramp pattern work → demo deck for sign-off.
Resolve the four open questions in one round before B's CSS lands.
