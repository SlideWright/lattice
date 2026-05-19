# Typography contract

Lattice has **11 font-size tokens** organized as three independent scales.
Each token has a single, named role. Picking the right token is a
one-step decision, not a "which size feels right" judgement call.

This file is the canonical reference. The audit, methodology, and
migration history that produced this system live in
`docs/notes/2026-05-19-typography-token-refactor.md`.

## 1 — The 11 tokens

```
CONTENT (4)              HEADING (6)              DISPLAY (1)
fs-meta                  fs-h1                    fs-hero
fs-body-compact          fs-h2
fs-body                  fs-h3
fs-emphasis              fs-h4
                         fs-h5
                         fs-h6
```

Every size is declared in `cqi` (container-query inline-size) so visual
proportions hold across HD (1280×720), 4K (3840×2160), and any custom
size. The `pt @ HD` column below shows how the cqi values land at the
standard 1280-px slide.

### 1.1 Content scale

Anchored at `--fs-body = 2.5 cqi` — 24 pt @ HD, the projected-slide
readability floor (APA / Microsoft / Adobe presentation guidelines).
Four steps.

| Token | cqi | pt @ HD | Role |
|---|---|---|---|
| `--fs-meta` | 1.67 | 16 | Chrome only — pagination, footer, eyebrow labels, micro-captions. |
| `--fs-body-compact` | 1.875 | 18 | Card-body, table-cell, list-item body in dense layouts (cards-grid, list-steps, list-tabular, compare-table, legal grids). One step below the projection floor; used only by layouts that pack multi-sentence prose into tight surfaces. |
| `--fs-body` | 2.5 | 24 | **Slide-level body text.** Paragraphs in statement / quote / divider / centered layouts. Lead prose under headings. Anything author-written for "this is the slide's message." |
| `--fs-emphasis` | 3.75 | 36 | Lead paragraph, key-insight callout, step-forward block. *One* block per slide that should read first. |

### 1.2 Heading scale

Six independent decisions — not a modular ratio. Each h-level sized
against its own role, not derived from `--fs-h2`.

| Token | cqi | pt @ HD | Role |
|---|---|---|---|
| `--fs-h1` | 7.5 | 72 | Title-slide hero, deck title, "the slide IS this heading" layouts. Dominates the slide. |
| `--fs-h2` | 4.6875 | 45 | **Standard slide title.** Every content slide. |
| `--fs-h3` | 3.125 | 30 | Subheading, column header in multi-column layouts. |
| `--fs-h4` | 2.5 | 24 | Inline bold heading inside body prose. Same vertical rhythm as body, differentiated by weight. |
| `--fs-h5` | 1.875 | 18 | Small section marker, sub-list label. |
| `--fs-h6` | 1.5625 | 15 | Smallest heading — sits at the projection floor. |

### 1.3 Display tier

| Token | cqi | pt @ HD | Role |
|---|---|---|---|
| `--fs-hero` | 12.66 | 122 | KPI numerals, big-number, stats numerals, watermark backdrops, mega-quotes. **Class-driven only — never bound to an h-element.** "This number IS the slide." |

## 2 — Author's mental model

> **HTML heading**: use `--fs-h<level>`. `h1` → `fs-h1`. `h2` → `fs-h2`. …
> No decision about "which one fits"; it's the element you wrote.
>
> **Slide-level body text**: `--fs-body`. Paragraphs in statement,
> quote, divider, centered, big-number layouts. The "this is what the
> slide says" prose.
>
> **Dense body inside cards / tables / list items**: `--fs-body-compact`.
> A consumer's-choice override that card-style and table layouts use
> for their inner prose. Authors don't pick it — it's wired into the
> component CSS that hosts dense content.
>
> **Chrome and labels**: `--fs-meta`. Pagination, footers, eyebrow
> labels, micro-captions.
>
> **Lead paragraph or key-insight callout** (not a heading, but one
> block that needs to step forward): `--fs-emphasis`.
>
> **Backdrop / KPI / watermark / extreme display**: `--fs-hero`,
> selected by class.

The compact body is *not* a "which size feels right" decision — it's
the size the dense-layout components use internally. Slide-level prose
always reads `--fs-body`.

## 3 — HTML element → token mapping

`lib/base/base.elements.css` wires the headings automatically. Authors
who write `## Slide Title` get `--fs-h2` for free.

| Element | Token | Notes |
|---|---|---|
| `section` (default body) | `--fs-body` | Paragraphs inherit from this. |
| `section h1` | `--fs-h1` | Display font, weight 700. |
| `section h2` | `--fs-h2` | Display font, weight 700. |
| `section h3` | `--fs-h3` | Display font, weight 700. *Was eyebrow-styled in the legacy system; the eyebrow pattern is now the inline-code paragraph (`\`label\``).* |
| `section h4` | `--fs-h4` | Body font, weight 700. |
| `section h5` | `--fs-h5` | Display font, weight 700. *Was eyebrow-styled in the legacy system.* |
| `section h6` | `--fs-h6` | Display font, weight 700. |

The eyebrow visual (mono uppercase 13-ish px) is unchanged — it's
delivered by the `\`label\`` inline-code paragraph modifier in
`base.modifiers.css`, not by an h-tag.

## 4 — Anti-patterns

- **Picking a size by feel.** "A bit smaller than h2" → use `--fs-h3`,
  not "let me try `--fs-xl` or `--fs-2xl`." The old t-shirt names
  are gone; everything has a role.
- **Using `--fs-body-compact` for slide-level prose.** Compact is for
  card / cell / dense-list body. The blockquote in a quote slide, the
  lead paragraph under a title, the divider subtitle — those all read
  `--fs-body`.
- **Using `--fs-meta` to fit more body text.** If you find yourself
  reaching for `--fs-meta` to compress a paragraph, the slide has too
  much content — split it. Never shrink prose to fit.
- **Using an h-tag for the display tier.** `--fs-hero` is class-driven
  (`<div class="hero">…</div>`), never bound to `<h1>`. h1 is the
  *title* of the slide; hero is *the slide is this one number*.
- **Raw cqi font-sizes.** `font-size: 1.484375cqi` bypasses the token
  system. If a component genuinely needs a sub-token size (very small
  decorative labels inside dense charts), use a layout-local custom
  property and document why. Sub-token rawness in tokens.css is a bug.

## 5 — Migration from the legacy 16-token system

The legacy tokens (`fs-xs`, `fs-sm`, `fs-md`, `fs-content`, `fs-emphasis`,
`fs-lg`, `fs-xl`, `fs-2xl`, `fs-3xl`, `fs-display`, `fs-stat`, `fs-quote`,
`fs-watermark`, `fs-label`) map to the new system per the table in the
proposal note (§6), with one deviation: dense-layout consumers of
`--fs-body` and `--fs-md` migrate to `--fs-body-compact`, not
`--fs-body`. The compact token was the Risk #1 mitigation (c) the
proposal reserved for "if 3+ components legitimately need it."

Highlights:

- `--fs-label`, `--fs-xs`, `--fs-sm` → `--fs-meta` (chrome).
- `--fs-md`, `--fs-content` → `--fs-body` (slide-level prose) or
  `--fs-body-compact` (card-grid bodies, table cells, list-step bodies).
- Legacy `--fs-body`, `--fs-emphasis` → `--fs-body` for slide prose,
  `--fs-body-compact` for dense surfaces.
- `--fs-lg` (22 pt) → `--fs-emphasis` (36 pt).
- `--fs-2xl` → `--fs-h2`. `--fs-3xl`, `--fs-display` → `--fs-h1`.
- `--fs-stat`, `--fs-hero`, `--fs-watermark`, `--fs-quote` → `--fs-hero`.

During the migration the legacy names exist as values (kept at their
pre-refactor sizes) so component CSS keeps rendering until Phase 3
renames each use. The legacy declarations retire in Phase 4. See the
note for the migration plan.

## 6 — Cross-references

- `docs/notes/2026-05-19-typography-token-refactor.md` — solver,
  audit, migration plan, risk register.
- `lib/base/base.tokens.css` — the canonical declarations.
- `lib/base/base.elements.css` — h1–h6 wiring.
- `lib/base/base.modifiers.css` — eyebrow / subtitle / key-insight
  visual treatments that use `--fs-meta` and `--fs-body`.
