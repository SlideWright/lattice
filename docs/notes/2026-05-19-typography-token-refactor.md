# Typography token refactor — proposal

**Status:** proposed (not executed). Reviewer can act on this directly or
counter-propose specific changes.

**TL;DR.** Collapse the 16 existing `--fs-*` tokens to **10 tokens**
organized as three independent scales (3 content + 6 heading + 1 hero),
each token sized against the projection-readability floor instead of
a single modular ratio. Migrate in 5 phases with per-bucket pixel-diff
gates.

---

## 1 — Context

`lib/base/base.tokens.css` declares 16 font-size tokens:

```
fs-watermark fs-hero fs-quote fs-display fs-stat fs-3xl fs-2xl fs-xl
fs-lg fs-content fs-md fs-emphasis fs-body fs-sm fs-label fs-xs
```

No documentation explains what each token is *for*. Authors and refactor
passes pick by feel. Direct evidence of the resulting chaos, observed
during the image-component refactor (commits `0396852`, `7ef13a9`):

- `--fs-body` (16 px @ HD) and `--fs-content` (19 px @ HD) used
  interchangeably for body prose across the codebase
- The same component family (image) used different body tokens for
  different variants — half-canvas on `--fs-content`, full-bleed
  overlay on `--fs-body`
- The 12–22 px band is covered by **7 separate tokens**, each barely
  distinguishable from its neighbour
- The 30–60 px band is covered by **5 separate tokens** with overlapping
  use cases

The mental model burden is real: every author and every refactor pass
has to re-derive the role contract that doesn't exist. Token names
suggest size ranks (`xs`, `sm`, `md`, …) rather than roles, which
encourages picking by feel ("a bit smaller than that other one").

---

## 2 — Principles

The refactor solves against four constraints:

1. **Cross-resolution consistency.** Every size in `cqi`
   (container-query inline-size), so visual proportions are identical
   whether the deck renders at HD (1280×720), 4K (3840×2160), or any
   custom size.

2. **Readability across output formats.** Lattice exports to PDF, HTML,
   and PowerPoint. The harshest constraint sets the floor: projected
   slide-deck viewing at ~20 ft distance requires body text ≥ 24 pt
   minimum (APA / MS / Adobe presentation guidelines).

3. **Maintainability.** Token count and naming determine mental model
   burden. Industry benchmark for slide-deck systems lands at 5–10
   total sizes; tokens should be named by **role**, not by t-shirt
   size, so the author has a single rule to apply.

4. **Solve each token family independently from its neighbours.** The
   *content* scale's constraint (readability of running prose) is
   different from the *heading* scale's constraint (visual dominance
   of a slide). Forcing both onto one modular ratio produces
   middle-band sizes nobody asked for. Each scale gets its own anchor,
   own steps, own rationale.

---

## 3 — Solver methodology

For each token in the proposed system, the solver answers:

- **What's its single, distinguishable role?** (rejection criterion for
  "barely different from neighbour" tokens)
- **What sizes does that role demand at the projection floor?**
- **Is the name role-based or rank-based?** (rejection criterion for
  `fs-md` / `fs-content` / `fs-emphasis` — three rank-style names that
  don't map to a role)

For each scale (content, heading, display):

- **What's the anchor point?** Body anchors at 24 pt projection floor;
  h2 anchors at canonical slide-title size; hero anchors at "this
  number IS the slide" extreme.
- **What ratio (if any) governs adjacent steps?** Content scale uses
  1.5 because it's a short scale. Heading scale uses **no single
  ratio** — each h-level is solved independently against its own role.
- **Which legacy tokens collapse into each new token, and why?**

---

## 4 — Audit findings

### 4.1 Current usage counts (from `lib/` + `themes/`)

| Token | cqi | px @ HD | # uses |
|---|---|---|---|
| `fs-label` | 1.016 | 13 | 92 |
| `fs-body` | 1.25 | 16 | 70 |
| `fs-sm` | 1.172 | 15 | 38 |
| `fs-md` | 1.406 | 18 | 36 |
| `fs-xs` | 0.938 | 12 | 23 |
| `fs-lg` | 1.719 | 22 | 14 |
| `fs-xl` | 2.344 | 30 | 13 |
| `fs-2xl` | 2.656 | 34 | 13 |
| `fs-3xl` | 3.75 | 48 | 11 |
| `fs-emphasis` | 1.328 | 17 | 10 |
| `fs-content` | 1.484 | 19 | 7 |
| `fs-hero` | 8.594 | 110 | 5 |
| `fs-stat` | 4.063 | 52 | 4 |
| `fs-watermark` | 14.063 | 180 | 3 |
| `fs-display` | 4.688 | 60 | 2 |
| `fs-quote` | 6.25 | 80 | 0 (declared but unused) |

### 4.2 Pattern observations

- **`fs-label` is the most-used token (92 hits)** — almost all of them
  paired with `font-family: var(--font-mono); text-transform: uppercase;`.
  This is a *label* semantic, not a size choice; the size 13 px is
  incidental.
- **`fs-body` (70 hits) is used for "data-table-cell-ish" content** —
  legal layouts, comparison cells, list items.
- **`fs-md` (36 hits) is mostly the section default cascade** — many
  components inherit it rather than declaring explicitly.
- **`fs-xl` (13 hits) has no consistent role** — appears in 4
  unrelated contexts: secondary h2, inline arrows, quote text,
  citation-card author lines.
- **`fs-stat`, `fs-hero`, `fs-watermark` (12 hits combined)** all
  serve "extreme display for KPI / numerals / backdrop." Three
  tokens, one role.

---

## 5 — Proposed token system

### 5.1 Three scales, ten tokens

```
CONTENT (3)              HEADING (6)              DISPLAY (1)
fs-meta                  fs-h1                    fs-hero
fs-body                  fs-h2
fs-emphasis              fs-h3
                         fs-h4
                         fs-h5
                         fs-h6
```

### 5.2 Content scale

Anchored at `--fs-body = 2.5 cqi` (24 pt @ HD, projection floor).
Modular ratio 1.5 (short scale, ratio works).

| Token | cqi | pt @ HD | pt @ 4K | Role (single, named) |
|---|---|---|---|---|
| `--fs-meta` | 1.67 | 16 | 48 | Chrome only — pagination, footer, eyebrow labels, micro-captions. Smallest size that stays readable at projection. |
| `--fs-body` | 2.5 | 24 | 72 | **All body text.** Paragraphs, list items, table cells, card text, captions, image overlays — every paragraph reads at this size. |
| `--fs-emphasis` | 3.75 | 36 | 108 | Lead paragraph, key-insight callout, step-forward block. One block per slide that needs to read first. |

### 5.3 Heading scale (per-level independent decisions)

Each heading sized against its own constraint, *not* derived from a
shared ratio with `--fs-h2` or any other anchor.

| Token | cqi | pt @ HD | pt @ 4K | Role |
|---|---|---|---|---|
| `--fs-h1` | 7.5 | 72 | 216 | Title-slide hero, deck title, "the slide IS this heading" layouts. Dominates the slide. |
| `--fs-h2` | 4.6875 | 45 | 135 | Standard slide title. Every content slide. Heading is clearly heading-tier; body coexists below. |
| `--fs-h3` | 3.125 | 30 | 90 | Subheading, column header in multi-column layouts. Distinctly heading; smaller than h2; fits inside a column. |
| `--fs-h4` | 2.5 | 24 | 72 | Inline bold heading inside body prose. Same vertical rhythm as body, differentiated by weight. |
| `--fs-h5` | 1.875 | 18 | 54 | Small section marker, sub-list label. Above the projection floor. |
| `--fs-h6` | 1.5625 | 15 | 45 | Smallest heading — projection floor (14 pt minimum). |

### 5.4 Display tier

| Token | cqi | pt @ HD | pt @ 4K | Role |
|---|---|---|---|---|
| `--fs-hero` | 12.66 | 122 | 366 | KPI numerals, big-number, stats numerals, watermark backdrops, mega-quotes. **Class-driven only — never bound to an h-element.** "This number IS the slide." |

### 5.5 Author's mental model — the entire rule set

> **HTML heading**: use `--fs-h<level>`. h1 → `fs-h1`. h2 → `fs-h2`. …
> No decision about "which one fits"; it's the element you wrote.
>
> **Body text**: `--fs-body`. Always. Paragraphs, lists, tables, cells,
> captions — everywhere a paragraph reads.
>
> **Chrome and labels**: `--fs-meta`. Pagination, footers, eyebrow
> labels, micro-captions.
>
> **Lead paragraph or key-insight callout** (not a heading, but one
> block that needs to step forward): `--fs-emphasis`.
>
> **Backdrop / KPI / watermark / extreme display**: `--fs-hero`,
> selected by class.

---

## 6 — Migration map

Every existing token has a single new destination. Authors do not need
to remember the mapping; aliases in the transitional phase handle it.

| Current | → | New | Rationale |
|---|---|---|---|
| `--fs-xs` | → | `--fs-meta` | 9 → 16 pt (projection-floor uplift) |
| `--fs-label` | → | `--fs-meta` | Mono-uppercase carried by font-family + text-transform, not the size token |
| `--fs-sm` | → | `--fs-meta` | |
| `--fs-body` | → | `--fs-body` | Rename in place; value 16 → 24 pt (projection floor) |
| `--fs-emphasis` | → | `--fs-body` | Old `fs-emphasis` was 17 pt — body-tier, not emphasis-tier |
| `--fs-md` | → | `--fs-body` | Section-default body |
| `--fs-content` | → | `--fs-body` | Prose body |
| `--fs-lg` | → | `--fs-emphasis` | 22 → 36 pt |
| `--fs-xl` | → | `--fs-h3` *or* `--fs-h2` | Per-site: image-overlay h2 → `fs-h2`; compare-prose connector → `fs-h3` or layout-local |
| `--fs-2xl` | → | `--fs-h2` | Canonical slide title |
| `--fs-3xl` | → | `--fs-h1` | Section-break headings ARE h1 in role |
| `--fs-stat` | → | `--fs-hero` | Numeric display |
| `--fs-display` | → | `--fs-h1` | h1 IS the display heading |
| `--fs-quote` | → | `--fs-h1` *or* layout-local | Quote text → h1; decorative quote-marks → layout-local |
| `--fs-hero` | → | `--fs-hero` | Rename in place; 83 → 122 pt |
| `--fs-watermark` | → | `--fs-hero` | 135 → 122 pt |

---

## 7 — Refactor plan

Five phases, ~15 commits, ~70 files touched. Each phase is independently
revertable.

### Phase 0 — Foundation
**Commit:** `docs(typography): typography contract`

- Write `docs/references/typography.md`: the 10 tokens, each role, sizing rationale, author rules, HTML-element mapping
- Update `CLAUDE.md` "high-friction reminders": one-line summary + link
- No code or rebuild

### Phase 1 — Token definition with aliases
**Commit:** `tokens(typography): redefine fs scale, keep old names as aliases`

- Rewrite the `--fs-*` block in `lib/base/base.tokens.css` to declare the 10 new tokens
- Below them, declare every legacy token as an alias (`--fs-2xl: var(--fs-h2)`, …) so existing component CSS continues to work
- Rebuild `lattice.css`. No component touched. **No visual changes** (legacy CSS resolves through aliases unchanged)
- Verify: `npm test` + 9 parity tests green. No PDF regen

### Phase 2 — Base element migration
**Commit:** `base(elements): map h1–h6 to new fs-h tokens`

- Update `lib/base/base.elements.css` `section h1`…`section h6` rules to point at `--fs-h1` … `--fs-h6` directly (drop alias indirection)
- Rebuild `lattice.css`
- **First intentional visual change** — body and headings grow on every slide
- Pixel-diff every gallery; reviewer evaluates "looks bigger, in a good way" once
- Update integration test expectations if page-counts drift

### Phase 3 — Component migration (one commit per bucket)
**Commits:** `<bucket>(typography): migrate to new fs tokens` × 9

For each bucket in order (smallest blast radius first):

1. anchor (closing, divider, subtopic, title)
2. statement (big-number, content, quote, split-brief, split-list, split-statement)
3. inventory (12 components)
4. comparison (8 components)
5. progression (6 components)
6. evidence (kpi, split-metric, stats)
7. imagery (featured, image — image already partially modernized)
8. chart (9 components)
9. diagram + math + code + legal (4 buckets together)

Per bucket:
- `sed`-replace per the migration map
- Rebuild bucket galleries via `npm run build:bucket-galleries`
- Pixel-diff vs Phase 2 baseline; spot-check 2–3 slides visually
- Commit with diff summary

### Phase 4 — Cleanup
**Commit:** `tokens(typography): retire legacy fs aliases`

- Remove alias declarations from `base.tokens.css`
- `grep -r "fs-2xl\|fs-content\|fs-md\|fs-stat\|fs-watermark"` should return 0 hits in `lib/`
- Any stragglers fixed in the same commit
- Rebuild; run all tests

### Phase 5 — Verification & docs
**Commit:** `docs(typography): finalize references; update gotchas`

- Update every `lib/components/*/<name>.docs.md` that mentions a font size
- Add gotchas entry: "Old `--fs-*` token names retired — see typography.md"
- Update `docs/references/design-system.md` typography section
- Final integration test pass + full bucket-gallery rebuild + visual spot-check

---

## 8 — Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Body size growth (16 → 24 pt) overflows tight components (legal tables, cards-grid, list-tabular, compare-table) | High | Phase 2 pixel-diff identifies overflow per-slide. Per-overflow decision: (a) accept and let layout breathe; (b) layout-local `font-size:` override; (c) introduce a 7th `--fs-body-compact` only if 3+ components legitimately need it. **Decided per-overflow, not preemptively.** |
| Integration tests fail because slide count drifts (text reflow pushes to a new page) | Medium | Per-deck: tighten margins, accept new count and update expectation, or split content. The page-count tests are gates, not regressions to avoid. |
| Aliases create subtle precedence bugs | Low | Aliases use `var()` (zero specificity); they behave identically to direct references. Phase 1 tests this in isolation before any component moves |
| Some component CSS uses raw cqi values instead of tokens (`font-size: 1.484375cqi`) | Low | Phase 4 grep audit catches and replaces |
| Old committed gallery PDFs become a noise floor that obscures real diffs | Certain | Update `tools/pixel-check.js` snapshot label to `pre-fs-refactor` once Phase 2 lands. Anchor future diffs there |
| Author confusion during migration (old + new tokens coexist for several commits) | Low | Aliases mean "either works"; nothing breaks until Phase 4 |

---

## 9 — Verification approach

| What | When | How |
|---|---|---|
| Token aliases unchanged at parse | Phase 1 | `npm test`; pixel-diff committed PDFs (expect zero) |
| Base element typography intentional | Phase 2 | Pixel-diff committed gallery; reviewer signs off on "bigger, intentional" |
| Per-component visual contract | Phase 3 | Per-bucket pixel-diff; layout-overflow check |
| No legacy token references remain | Phase 4 | `grep` audit, integration suite |
| Documentation reflects code | Phase 5 | Component docs regenerate from manifest; gotchas links resolve |
| Cross-renderer parity | Phase 5 | All 9 parity tests + emulator/marp-cli baseline pixel-diff at known tolerance |

---

## 10 — Out of scope (future work)

The following token families have analogous problems but are not part of
this proposal. They earn their own solver runs after typography lands:

- `--lh-*` (line heights): 4 tokens (`tight`, `snug`, `base`, `relaxed`). `snug` and `base` are barely distinguishable (1.5 vs 1.6); likely 3 is enough.
- `--sp-*` (spacing): 8 tokens (`3xs` through `2xl`). `3xs` (2 px) and `2xs` (4 px) are barely used; likely 6 is enough.
- `--radius-*`: 3 tokens. Probably fine.
- Palette / color tokens: managed per-theme; not part of base system.

Each of these will follow the same solver pattern: principles, audit,
proposed structure, migration plan.

---

## 11 — Approval checkpoints

This proposal is decision-bearing. Before Phase 0 begins, confirm:

- [ ] **Body anchor** at 2.5 cqi (24 pt @ HD) — clears projection floor, matches PowerPoint conventions
- [ ] **Heading anchor** for h2 at 4.6875 cqi (45 pt @ HD) — slide-title canonical size
- [ ] **Per-h-level independent sizing** (h1, h2, h3, h4, h5, h6 are six separate decisions, not derived from a ratio)
- [ ] **Hero is class-driven, not h-tag-driven** (replaces `fs-hero`, `fs-stat`, `fs-watermark`, `fs-quote`)
- [ ] **10 tokens** is the right count (not 6, not 16)
- [ ] **Migration map** as listed — no token has a different destination in your mental model

If any box is unchecked, the proposal iterates before Phase 0.
