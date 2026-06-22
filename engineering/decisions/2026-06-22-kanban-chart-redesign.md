---
status: shipped
summary: The kanban board read as busy and unrefined because colour was spent decoratively on CATEGORY (the card's least decision-relevant axis), encoded four redundant ways per card — gradient fill + 3px left stripe + colour dot + label — producing a paint-swatch patchwork, while STATUS (the decision axis) got one quiet chip. Explored five directions (each iterated 5× against a faithful render harness): Signal (flat, colour=status), Ledger (typographic/no cards), Lane-keyline (category as one edge), Tinted-columns (colour=stage), Premium-card (polished neutral tile). Decision — ship PREMIUM CARD as the default (uniform elevated neutral tiles; colour reserved for status, so a flagged card is the focal point), with two opt-in variants that restore disciplined colour coding: `keyline` (one crisp coloured left edge = category/ownership) and `tinted` (whisper-tinted columns = pipeline stage). Rejected as the default: Ledger (changes what the component IS, board→table) and the per-card category fill (the original busyness).
last-updated: 2026-06-22
companion:
  - ../../lib/components/chart/kanban/kanban.styles.css
  - ../../lib/components/chart/kanban/kanban.manifest.json
---

# Kanban — redesign: colour serves status, category coding is opt-in

**Date:** 2026-06-22 · **Status:** decided + shipped.

## Question

The kanban board looked busy and unrefined next to the rest of the chart
family. Diagnosis: each card carried **five** competing visual variables, and
the loudest channel — colour — was spent **decoratively on category**, the axis
a boardroom audience cares about least. Worse, category was encoded **four
redundant ways** on every card:

- a per-card lane **gradient fill**,
- a 3px lane-coloured **left stripe**,
- a lane-coloured **dot**, and
- the lane **text label**.

Eight cards each painted in their own hue produced a paint-swatch patchwork.
Meanwhile **status** — the actual decision axis ("what's in trouble?") — got a
single quiet chip. The eye landed everywhere and nowhere.

So: refine, or rethink? And does category colour coding (genuinely useful to
some teams for ownership-at-a-glance) get deleted or disciplined?

## Exploration

Five directions were built as standalone CSS over a faithful render harness (the
real `dist/lattice.css` + theme tokens + the real `lattice` container, screenshot
in both canvases), each **iterated five times** with a look-and-critique loop:

| # | Direction | Thesis |
|---|---|---|
| 1 | **Signal** | Flat neutral grid; colour reserved strictly for status. |
| 2 | **Ledger** | Remove card chrome entirely — typographic rows, like a set table. |
| 3 | **Lane keyline** | Keep category, disciplined to ONE crisp coloured left edge. |
| 4 | **Tinted columns** | Move colour off cards onto COLUMNS — colour encodes *stage*. |
| 5 | **Premium card** | Keep cards; polish to a uniform elevated neutral tile (Linear/Height). |

All five cleared the bar (every one is dramatically calmer than the original).
They split into three philosophies: *beautiful board* (1/5), *elegant table* (2),
and *keep colour coding* (3/4).

## Decision

Ship a **default + two-variant** system on one axis ("Colour coding"):

- **Default = Premium card (P5).** Every card is one uniform, neutral, elevated
  tile (canvas-aware depth: soft drop-shadow in light, inset top-highlight in
  dark), generous rhythm, a quiet neutral category dot+label, and a demoted size
  token. The per-card gradient and lane stripe are gone. **Colour on the surface
  is reserved for STATUS** — the shared status vocabulary maps to its state
  tokens and gently tints a flagged card, so the board stays calm and the flagged
  card(s) are the focal point. Keeps the kanban identity (still obviously a
  board); reads as a high-end product kanban.

- **`keyline` variant (P3).** Restores category coding as exactly one cue: every
  card is the same flat neutral tile marked by a single crisp coloured **left
  edge** (squared left corners so it reads as one continuous line). For teams who
  need to scan one workstream's load down a column. Status stays on the chip.

- **`tinted` variant (P4).** Moves colour onto the **columns**: each lane is
  whisper-tinted by pipeline stage (blue → orange → teal → pass-green, perceptually
  equalised, mixed a touch stronger on dark so it survives near-black) with a
  hue-keyed header underline; cards stay neutral and lift off the lane. Reinforces
  left-to-right flow. Status stays the one accent chip.

The status card-tint is scoped `:not(.keyline):not(.tinted)`, so the colour-coded
variants honour their own thesis (status on the chip alone) and don't double-encode.

### Why this split

- The default answers the original complaint directly: colour now serves the
  decision axis, and the board is calm by construction (most cards carry no
  status → neutral).
- Category coding isn't deleted, it's **disciplined** and made opt-in — a deck
  author reaches for `keyline`/`tinted` only when colour coding earns its keep,
  rather than paying the patchwork cost on every board.
- Two variants cover the two legitimate things colour can encode here —
  *ownership* (keyline) and *stage* (tinted) — without a combinatorial mess.

## Rejected

- **Ledger (P2) as the default.** The most editorial / lowest-ink result and
  genuinely beautiful, but it changes *what the component is* (board → typographic
  list) and loses the tile affordance that signals "kanban." Too far for the
  default; kept as a possible future variant if demand appears.
- **The original per-card category fill.** The source of the busyness. Retired.
- **Colour-coding by default (keyline or tinted as the base).** Re-spends colour
  on every board; the calm neutral default is the right resting state, with colour
  opt-in.

## Consequences

- `kanban.styles.css`: base rules replaced (premium tile + status mapping +
  demoted size/lane); two scoped variant blocks added; responsive box-local
  restructure preserved.
- `kanban.manifest.json`: `variants: [keyline, tinted]`, a "Colour coding"
  `variantAxes` group, and `variantDocs`; the generator emits the variant slides
  into `kanban.docs.md` / `kanban.gallery.md`, and the integration test's expected
  page count tracks automatically.
- No DOM/transform change — the redesign is entirely in CSS + manifest prose, so
  every existing kanban deck re-renders into the calm default with no re-authoring.
