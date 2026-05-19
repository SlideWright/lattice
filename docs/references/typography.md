# Typography contract

Lattice has **12 font-size tokens** organized as three independent scales.
Each token has a single, named role. Picking the right token is a
one-step decision, not a "which size feels right" judgement call.

This file is the canonical reference. The audit, methodology, and
migration history that produced this system live in
`docs/notes/2026-05-19-typography-token-refactor.md`.

## 1 — The 12 tokens

```
CONTENT (5)              HEADING (6)              DISPLAY (1)
fs-meta                  fs-h1                    fs-hero
fs-body-compact          fs-h2
fs-body                  fs-h3
fs-message               fs-h4
fs-emphasis              fs-h5
                         fs-h6
```

Every size is declared in `cqi` (container-query inline-size) so visual
proportions hold across HD (1920×1080), 4K (3840×2160), and any custom
size. The `pt @ HD` column below shows how the cqi values land at the
standard slide.

### 1.1 Content scale

The default container body anchors at `--fs-body = 1.875 cqi` (18 pt @
HD) — the size for cards, lists, and inline prose read at close range.
Slide-level statement bodies step up to `--fs-message = 2.5 cqi` (24 pt
@ HD), the long-distance projection floor. Five steps.

| Token | cqi | pt @ HD | Role |
|---|---|---|---|
| `--fs-meta` | 1.36 | 13 | Chrome only — pagination, footer, eyebrow labels, micro-captions, pills. |
| `--fs-body-compact` | 1.67 | 16 | **Dense reference cells** — table cells, glossary definitions, grid-quadrant prose (list-tabular, glossary, compare-table, matrix-2x2, verdict-grid, obligation-matrix, actors). Scanned, not read linearly; packs many cells in a fixed box, so it sits one step below the default body. |
| `--fs-body` | 1.875 | 18 | **Default container body.** Cards, lists, inline prose, list-item bodies. The cascade default (`section { font-size }`). |
| `--fs-message` | 2.5 | 24 | **Slide-level statement body.** Paragraphs in statement / quote / divider / centered layouts. Lead prose under headings. Anything author-written for "this is the slide's message." The projection floor. |
| `--fs-emphasis` | 3.75 | 36 | Lead paragraph, key-insight callout, step-forward block. *One* block per slide that should read first (1.5× message). |

### 1.2 Heading scale

Six independent decisions — not a modular ratio. Each h-level sized
against its own role. h4/h5/h6 are deliberately tied to the
message/body/meta content tiers (same size, weight-differentiated).

| Token | cqi | pt @ HD | Role |
|---|---|---|---|
| `--fs-h1` | 5.625 | 54 | Title-slide hero, deck title, "the slide IS this heading" layouts. Dominates the slide. |
| `--fs-h2` | 3.75 | 36 | **Standard slide title.** Every content slide. |
| `--fs-h3` | 2.8125 | 27 | Subheading, column header in multi-column layouts. |
| `--fs-h4` | 2.5 | 24 | Inline bold heading inside body prose (= `--fs-message`, weight-differentiated). |
| `--fs-h5` | 1.875 | 18 | Small section marker, sub-list label (= `--fs-body`). |
| `--fs-h6` | 1.36 | 13 | Smallest heading — chrome-sized (= `--fs-meta`). |

### 1.3 Display tier

| Token | cqi | pt @ HD | Role |
|---|---|---|---|
| `--fs-hero` | 10 | 96 | The ONE big number on a slide — big-number, kpi.spotlight/briefing primary, watermark backdrops. **Class-driven only — never bound to an h-element.** "This number IS the slide." Rows of comparable metrics (kpi.ops/compliance/trajectory, stats) use `--fs-h1` (54 pt), not hero. |

## 2 — Author's mental model

> **HTML heading**: use `--fs-h<level>`. `h1` → `fs-h1`. `h2` → `fs-h2`. …
> No decision about "which one fits"; it's the element you wrote.
>
> **Card / list / inline prose**: `--fs-body` (18 pt). The cascade
> default — most container content needs no override.
>
> **Dense table / grid cell**: `--fs-body-compact` (16 pt). Wired into
> the table/grid component CSS (list-tabular, glossary, compare-table,
> matrix-2x2, verdict-grid, obligation-matrix, actors). Authors don't
> pick it; the component does, because those surfaces pack many cells
> in a fixed box.
>
> **Slide-level statement body**: `--fs-message` (24 pt). Paragraphs in
> statement, quote, divider, centered, big-number layouts. The "this is
> what the slide says" prose.
>
> **Lead paragraph or key-insight callout** (not a heading, but one
> block that needs to step forward): `--fs-emphasis` (36 pt).
>
> **Chrome and labels**: `--fs-meta` (13 pt). Pagination, footers,
> eyebrow labels, micro-captions, pills.
>
> **Backdrop / KPI / watermark / extreme display**: `--fs-hero`,
> selected by class.

The default cascade lands on `--fs-body` (18 pt), so the common case —
cards, lists, prose — needs no opt-out. Dense tables/grids opt *down*
to compact; slide-level statements opt *up* to message. This inverts
the pre-rethink model, where the 24 pt default forced every dense
layout to opt out.

## 3 — HTML element → token mapping

`lib/base/base.elements.css` wires the headings automatically. Authors
who write `## Slide Title` get `--fs-h2` for free.

| Element | Token | Notes |
|---|---|---|
| `section` (default body) | `--fs-body` | 18 pt. Paragraphs / cards / lists inherit from this. |
| `section h1` | `--fs-h1` | Display font, weight 700. |
| `section h2` | `--fs-h2` | Display font, weight 700. |
| `section h3` | `--fs-h3` | Display font, weight 700. *The eyebrow pattern is the inline-code paragraph (`\`label\``), not an h-tag.* |
| `section h4` | `--fs-h4` | Body font, weight 700 (= `--fs-message`). |
| `section h5` | `--fs-h5` | Display font, weight 700 (= `--fs-body`). |
| `section h6` | `--fs-h6` | Display font, weight 700 (= `--fs-meta`). |

The eyebrow visual (mono uppercase 13-ish px) is unchanged — it's
delivered by the `\`label\`` inline-code paragraph modifier in
`base.modifiers.css`, not by an h-tag.

## 4 — Anti-patterns

- **Picking a size by feel.** "A bit smaller than h2" → use `--fs-h3`,
  not "let me try `--fs-xl` or `--fs-2xl`." The old t-shirt names
  are gone; everything has a role.
- **Using `--fs-body-compact` for slide-level prose.** Compact is for
  dense table/grid cells. The blockquote in a quote slide, the lead
  paragraph under a title, the divider subtitle — those read
  `--fs-message`; ordinary cards and lists read `--fs-body`.
- **Using `--fs-meta` to fit more body text.** If you find yourself
  reaching for `--fs-meta` to compress a paragraph, the slide has too
  much content — split it. Never shrink prose to fit.
- **Using `--fs-hero` for a row of metrics.** Hero is the ONE big
  number. Three or four comparable numbers (kpi.ops/compliance/
  trajectory, stats) use `--fs-h1`; a stack of supports beside a hero
  (kpi.briefing) uses a layout-local 45 pt. Hero on every cell overflows
  the grid.
- **Using an h-tag for the display tier.** `--fs-hero` is class-driven
  (`<div class="hero">…</div>`), never bound to `<h1>`. h1 is the
  *title* of the slide; hero is *the slide is this one number*.
- **Raw cqi font-sizes.** `font-size: 1.484375cqi` bypasses the token
  system. A few layouts legitimately need a size *between* tokens and
  use an explicit cqi value with a comment explaining why — the
  half-canvas pull-quote (split-statement, 4.6875cqi = 45 pt, between h2
  and h1), the split-list decorative watermark (12.66cqi = 122 pt, above
  hero), and the kpi.briefing supports (4.6875cqi = 45 pt, between h2 and
  h1). These are documented exceptions, not the norm. Undocumented
  sub-token rawness in tokens.css is a bug.

## 5 — History: the 16-token legacy and the rethink

The original refactor collapsed a 16-token t-shirt-sized scale
(`fs-xs` … `fs-watermark`, `fs-label`) into an 11-token role-named
system. A subsequent **rethink** (commit `392d4de`) corrected two flaws
the 11-token system shipped with, producing today's 12-token contract:

1. **Body default was backwards.** The 11-token system made `--fs-body`
   = 24 pt the slide default and `--fs-body-compact` = 18 pt the card
   escape. But cards/lists/tables are the common case (41 component
   sites) and slide-level statements the exception (15). The rethink
   inverted it: `--fs-body` = 18 pt is now the default; slide-level
   prose opts up to the new `--fs-message` = 24 pt. The whole heading
   scale shrank with it (h1 72→54, h2 45→36, h3 30→27, hero 122→96).

2. **No tier below the 18 pt default.** Folding the old compact value
   into `--fs-body` left nothing for dense reference cells. The compact
   tier was reintroduced at **16 pt** (below the 18 pt default) for
   tables, glossaries, and grids — surfaces scanned, not read.

A handful of layouts use explicit cqi sizes *between* tokens (see §4):
the half-canvas pull-quote and kpi.briefing supports at 45 pt (between
h2 and h1), and the split-list watermark at 122 pt (above hero). These
are documented in their component CSS.

## 6 — Cross-references

- `docs/notes/2026-05-19-typography-token-refactor.md` — solver,
  audit, migration plan, risk register.
- `lib/base/base.tokens.css` — the canonical declarations.
- `lib/base/base.elements.css` — h1–h6 wiring.
- `lib/base/base.modifiers.css` — eyebrow / subtitle / key-insight
  visual treatments that use `--fs-meta` and `--fs-body`.
