# Form — implementing the composition model in code

**Status:** in progress 2026-06-15. Implements the canonical model in
`design/forms.md` (Form = Frame + Cell + Tile) as actual engine + CSS, fixing
the open chrome-over-content defect at its root and retiring the *islands*
vocabulary in code. `design/forms.md` owns the **model**; this note owns the
**execution** (per forms.md §11, "Doc ownership") and supersedes the forward
plan in `2026-06-11-islands.md` §8 and the open follow-ons in
`2026-06-13-islands-sketch-density-collisions.md`.

This is the engineering ADR `design/forms.md` §5/§11 defer the field-level
schema and execution plan to.

---

## 1. Why now — the model was real, the code was not

The Form vocabulary was ratified (`design/forms.md`, 2026-06-14) but lived
**only in docs**: no code used Frame/Cell/Tile, no `lib/forms/` manifest
existed, and the shipped `islands` feature was the incremental approximation —
*berths done with magic-number padding + a hard `overflow:hidden` clip*. It
"worked" but carried critical design flaws that are downstream of the model not
being real: there is no bounded content **Cell**, so chrome reservation is a
fixed guess and a chart has no concrete box to size into (the §6 LSP violation
in the flesh).

This ADR makes the model real in code, at the altitude the canonical doc locks:
**B-now (Cell-as-berth overlay) → A-later (section-as-grid)**.

## 2. Verified ground truth (rendered, not assumed)

Rendered `examples/` content under the Form toggle at HD via the owned engine
(`lattice-emulator.js`), 2026-06-15. The docs and prior notes **disagreed** on
the chart state; the render settles it:

- **Chart collapse was REAL and severe (now FIXED — see `2026-06-15-form-chart-clip.md`).**
  A `piechart donut` under the Form collapsed from a full ring to a ~40px
  thumbnail with an unreadable dot-legend. The M1 resolution note in
  `2026-06-13-islands-sketch-density-collisions.md` claims this was fixed; it
  was **not** at that point — that claim is stale and is corrected here. Root
  cause: the chart's height chain (`section` flex → `.chart-body` flex:1 →
  `.piechart-figure` flex:1 `container-type:size` → svg `height:100cqh`)
  collapses in PRINT media when the masthead `padding-top` reservation squeezes
  the flex column — a `flex:1` figure whose sole child is a replaced `<svg>`
  won't grow, so the `cqh`/`%` basis resolves toward 0. The robust fix sizes the
  SVG off the **chart-body's content box** (see §5 and the dedicated decision
  doc); sizing against the section with a `cqi` height — the first attempt —
  produced the opposite failure (overflow → `overflow:hidden` clip).
- **Footer ↔ progress-rail collision is REAL.** The left-aligned `footer:` text
  runs straight through the centred "SECTION 0n · …" progress label, because
  the two are independent absolutely-positioned elements sharing one row with
  no reserved horizontal budget (only a `max-width:24cqi` truncation hack on
  the rail).
- **Bottom reserve is a magic number.** `padding-bottom: 8.75cqi` is unrelated
  to the real footer/rail height.

(Rendered evidence retained in `.scratch/form-baseline/` on the 14-day scratch
lifecycle; reproduced by the committed gallery.)

## 3. The architecture — model → code

> **A Frame divides a box into Cells; each Cell holds a Tile — or a Frame.**

Mapped onto the existing three-band structure (the root chrome Frame):

| Model noun | Code realization |
|---|---|
| **Root Frame** | `section.form` — carries the chrome Frame (masthead · stage · footer bands). Stays `display:flex` (see §4). |
| **Masthead Cell** | `.cell-masthead` — absolute band; an internal sub-Frame splitting into `.masthead-lede` (kicker + title Tiles) and `.masthead-bay` (meta · logo · status Tiles). |
| **Stage Cell** | the section's **deterministic content region** between the absolute masthead and footer bands. *Not a wrapper element* (see §4) — its box is the fixed-size slide minus the reserved chrome Cells. |
| **Footer Cell** | a three-zone coordinate contract (`footer-left` · `progress-centre` · `pagination-right`) with reserved, non-overlapping horizontal budgets. Pagination is a `::after` pseudo-element, so the footer Cell is a **token contract**, not a DOM grid. |
| **Tiles** | `.tile-meta`, `.tile-progress`, `.tile-watermark`, plus the chrome `<footer>`/`::after`/`<header>` and the component DOM (the content Tile). |
| **z-planes** | `isolation` / `z-index` stacking contexts (already in use). **Distinct from CSS `@layer`** (inert; blocked by the `!important` competition — `engineering/cascade.md`, issues #283/#284). The Form does **not** touch `@layer`. |

## 4. The pivotal constraint — 242 child selectors → B-now, not A-now

The principled end-state (`design/forms.md` §10 "A — section-as-grid") makes the
stage Cell a real element. We **cannot** do that now: component CSS contains
**242 `section.X > …` direct-child selectors** (e.g. `section.decision > ul >
li`). Wrapping the body in a `.cell-stage` element — or any grid that needs a
stage wrapper for multi-child bodies — breaks every one of them. `display:
contents` does not help: selectors match the DOM tree, not the box tree.

That migration (rewriting 242 selectors + every component's flex assumption) is
exactly the "A-later" the canonical doc defers. So this ADR implements **B-now
faithfully**: the stage Cell is the section's already-deterministic content
region (fixed slide − absolute chrome), the chart-collapse is fixed at its
cqh-chain root, and the footer Cell is a token contract. The §6 contract
("every Cell resolves to a deterministic px box") is **satisfied** — the slide
is fixed-size and the chrome Cells are absolutely reserved, so the stage box is
deterministic without an element.

**A-later is now de-risked and quantified:** the only remaining work to reach
section-as-grid is the 242-selector migration (+ flex→grid component audit),
tracked as the staged north star. It pairs with `@layer` activation and stays
optional.

## 5. Flaw → root-cause fix

| Flaw | Fix |
|---|---|
| Chart collapse / clip | Under `section.form`, the SVG sizes off the **`.chart-body` content box** (`.chart-body{container-type:size}`, figure `display:contents`, svg `height:100cqh`). The chart-body fills the stage reliably via flex even in print; its cqh basis = fill height − own padding = the real available figure area, tracking every chrome combo (0/1/2-line subtitle ± caption). A first attempt sized against the **section** with a `cqi` height — that was wrong twice over: `cqi` is a WIDTH unit (~589px at HD), far taller than the squeezed band, so the SVG overflowed and `.chart-body{overflow:hidden}` CLIPPED the ring + legend to a fragment, and the `max-height:100cqh` guard (read against the section) never engaged. The print-media gotchas that forced this: a `flex:1` figure whose sole child is a replaced `<svg>` will NOT grow to fill the chart-body, and `cqh`/`%`/abs-inset read against that figure collapse — only the chart-body's own content-box cqh is trustworthy. See `2026-06-15-form-chart-clip.md`. |
| Footer ↔ rail collision | `.cell-footer` reserves three non-overlapping horizontal zones via shared tokens; footer-left yields the centre when a rail is present (`has-progress`). The truncation hack is removed. |
| Bottom overrun | The stage's bottom reserve derives from the **real** footer Cell height token, not the `8.75cqi` guess. |
| Top-left/board feel | Per-Cell **`fill`** discipline (`start` · `center` · `optical-center` · `anchor`) — the difference between "grid of boxes" and a board deck. |

## 6. First-class Form — the `lib/forms/` manifest

The model becomes a **single source of truth the engine reads**, generated
beside `dist/docs/components.json` (reusing the component manifest
infrastructure — HARD RULE 15):

```
lib/forms/
  frame/<frame>/<frame>.manifest.json   # slicers (selectable structural "themes")
  tile/<tile>/<tile>.manifest.json      # fillers (the registry rows)
  schema/cell.schema.json               # the shared slot definition
```

This is what makes the value real: **author once; consumers select a Frame and
the same authored Tiles re-flow into it.** It is the OCP fix (adding a Frame is
a folder, not edits to three kernels) and the precondition for designer- and
AI-authored Frames (`design/forms.md` §7). [Status: see §8.]

## 7. The rename (retiring island-jargon)

`islands → form` (class + toggle) · `berth → Cell` · `island → Tile` ·
`group → Frame`; `.isl-*` → `.cell-*`/`.tile-*`; `--isl-*` →
`--frame-*`/`--cell-*`; `islands:` toggle → `form: <frame>`. **Kept:**
`masthead`, `progress`, `watermark` (surviving Cell/Tile concepts, not
island-jargon). Cautions honored: `form` is a substring of `transform` (no
blind sed — only exact identifiers renamed); landed lock-step across all three
render paths (HARD RULE 1) and gated pixel-identical.

## 8. What ships here vs. staged

**Ships (this PR):** the rename to Form vocab (3 paths, pixel-identical); the
footer Cell token contract; the chart-collapse root fix; the bottom reserve
from real Cell heights; per-Cell `fill` discipline; the `lib/forms/` manifest
(engine-read catalog + generated `dist/docs/forms.json`); a
`design/forms.gallery.md` value demo + `examples/form.md` demo deck; docs sync
(`design-system.md` §2.5, CLAUDE.md row, CHANGELOG).

**Staged (documented, not in this PR):**
- **A — section-as-grid**: the 242-child-selector migration + flex→grid audit
  (§4). The B-now content Cell is its prerequisite and is now in place.
- **`@layer` activation** (#283/#284) — blocked, untouched.
- **Workbench Frame studio / AI-assisted Frame generation** (`forms.md` §7).

## 9. Gates

Three-renderer parity; per-component galleries (light + dark page-counts);
`tools/pixel-check.js` before/after on the baseline deck; **non-`form` decks
byte-identical** (every Form rule is `section.form`-scoped); visual review of
the gallery at HD light + dark, with the donut verified at HD **and** 4K.
