---
status: experiment-results
date: 2026-05-07
companion: 2026-05-07-chart-family-proposals.md
---

# Chart-family experiment — overnight results

This is the experiment build for the chart-family proposal in
[2026-05-07-chart-family-proposals.md](2026-05-07-chart-family-proposals.md).
It is **not** a shippable feature — it is a "what would this look like?" pass
that lands behind feature classes only, can be deleted or promoted as one
chunk, and has zero impact on the existing gallery.

## Scope shipped

Three chart layouts implemented end-to-end behind a shared chart-frame:

| Layout            | Markdown contract                              | Emit                                  |
| ----------------- | ---------------------------------------------- | ------------------------------------- |
| `progress`        | flat `<ul>` with trailing `code` pct + status  | CSS-bar grid                          |
| `timeline-list`   | `<ol>` with leading date / trailing status     | horizontal spine + dots               |
| `piechart`        | flat `<ul>` with trailing magnitude pill       | inline SVG donut + legend             |

Two visual treatments of the chart-frame, both kept for review:

- **Treatment A — lucent strip** (default). Soft accent-tinted gradient that
  fades into the canvas, hairline rule beneath, eyebrow + h2 + subtitle
  centred inside.
- **Treatment B — `.minimal`** (modifier). Strip removed; centred
  typography over a short accent hairline. Same content, less chrome — the
  chart dominates more.

Deferred from the proposal scope: `gantt` and `kanban` (both 2-D layouts
with materially more parse + geometry work; deserve their own pass).

## Files touched

- [lattice.css](../../lattice.css) — appended chart-family section (~280 lines, all behind `section.chart-frame` / per-layout class). Palette-blind via tokens; dark variants included.
- [lattice-emulator.js](../../lattice-emulator.js) — added one transform block before the universal-below-note block. Uses exact-token class matching (collision risk: `agenda` already uses `progress-N` as a modifier).
- [examples/chart-family-experiment.md](../../examples/chart-family-experiment.md) — new gallery, 16 slides, both light + dark + both treatments.

Untouched (intentional): `gallery.md` regression baseline, `marp.config.js`, `lattice-runtime.js`.

## Validation

- `npm test` — 76/76 pass. Existing unit suite is unaffected.
- `node lattice-emulator.js examples/chart-family-experiment.md` — renders 16 slides, **0 overflow warnings**.
- `npx marp examples/chart-family-experiment.md` — file parses; theme loads; no errors. Chart structure is *not* rendered (transforms live only in the emulator path), but the CSS does not break other layouts. Porting the transforms to Marpit plugins is the obvious follow-up if the design is approved.
- `lattice-runtime.js` — not updated. VS Code preview will show raw lists, no chart rendering. Same fast-follow.

## Screenshots for inspection

All under [.scratch/chart-experiment-2026-05-07/](../../.scratch/chart-experiment-2026-05-07/).
The `.scratch/` lifecycle is 14 days, which is fine for an overnight review;
copy out anything you want to keep.

**Final v5 captures** (deck.html / deck.pdf, all 16 slides):

| # | Layout                          | Treatment | Canvas | Path |
| - | ------------------------------- | --------- | ------ | ---- |
| 1 | title (intro)                   |           | dark   | [v5/001.png](../../.scratch/chart-experiment-2026-05-07/v5/001.png) |
| 2 | subtopic (overview)             |           | light  | [v5/002.png](../../.scratch/chart-experiment-2026-05-07/v5/002.png) |
| 3 | progress (5 rows, full chrome)  | lucent    | light  | [v5/003.png](../../.scratch/chart-experiment-2026-05-07/v5/003.png) |
| 4 | progress dark                   | lucent    | dark   | [v5/004.png](../../.scratch/chart-experiment-2026-05-07/v5/004.png) |
| 5 | progress (no subtitle/caption)  | lucent    | light  | [v5/005.png](../../.scratch/chart-experiment-2026-05-07/v5/005.png) |
| 6 | timeline-list (4 items)         | lucent    | light  | [v5/006.png](../../.scratch/chart-experiment-2026-05-07/v5/006.png) |
| 7 | timeline-list dark              | lucent    | dark   | [v5/007.png](../../.scratch/chart-experiment-2026-05-07/v5/007.png) |
| 8 | timeline-list (3 items, terse)  | lucent    | light  | [v5/008.png](../../.scratch/chart-experiment-2026-05-07/v5/008.png) |
| 9 | piechart donut                  | lucent    | light  | [v5/009.png](../../.scratch/chart-experiment-2026-05-07/v5/009.png) |
| 10 | piechart donut dark            | lucent    | dark   | [v5/010.png](../../.scratch/chart-experiment-2026-05-07/v5/010.png) |
| 11 | piechart (solid wedge)         | lucent    | light  | [v5/011.png](../../.scratch/chart-experiment-2026-05-07/v5/011.png) |
| 12 | subtopic (treatment B intro)   |           | light  | [v5/012.png](../../.scratch/chart-experiment-2026-05-07/v5/012.png) |
| 13 | progress minimal                | minimal   | light  | [v5/013.png](../../.scratch/chart-experiment-2026-05-07/v5/013.png) |
| 14 | timeline-list minimal           | minimal   | light  | [v5/014.png](../../.scratch/chart-experiment-2026-05-07/v5/014.png) |
| 15 | piechart donut minimal          | minimal   | light  | [v5/015.png](../../.scratch/chart-experiment-2026-05-07/v5/015.png) |
| 16 | closing                         |           | dark   | [v5/016.png](../../.scratch/chart-experiment-2026-05-07/v5/016.png) |

Iteration history (kept for diffing the design choices):
- [v1/](../../.scratch/chart-experiment-2026-05-07/v1/) — first cut. Caption clashed with footer chrome; piechart donut and legend stacked vertically because `.piechart-figure` wasn't a flex row; horizontal overflow on every chart slide because `.chart-body` lacked `box-sizing: border-box`; timeline spine line sat above the dots.
- [v2/](../../.scratch/chart-experiment-2026-05-07/v2/) — fixed timeline order (dot above pill) and piechart figure flex; overflow still present.
- [v3/](../../.scratch/chart-experiment-2026-05-07/v3/) — `box-sizing: border-box` on header / body / caption resolved horizontal overflow. Strip presence lifted to ~14% / 7% gradient. Caption hairline added.
- [v4/](../../.scratch/chart-experiment-2026-05-07/v4/) — dark-canvas status pill colours rewritten (white-tinted text on stronger fill); progress fill colours lifted on dark.
- [v5/](../../.scratch/chart-experiment-2026-05-07/v5/) — Treatment B (`.minimal`) added; final state.

## Things I tried and held

- **Two header treatments kept**, not collapsed. Treatment A (lucent strip) reads as more brand-forward; Treatment B (minimal) reads as more editorial / report-figure. They serve different decks; my recommendation is **keep both** as a modifier pair, not pick one.
- **Solid `--accent-soft` band** (rather than gradient fade) was tried in head — discarded without rendering. Felt closer to the image-full chrome the user explicitly flagged as janky. The gradient fade reads as "lucent" the way the brief asked.
- **Eyebrow as a chip / pill** (rather than mono-uppercase letter-spaced text) — discarded. The chip would compete visually with the trailing `code` pills the chart layouts already use as data, and reads as a different primitive.
- **Centring the chart vertically inside the body** is the current behaviour. On slides with very little content (slide 5: progress, no subtitle / no caption), this leaves a lot of white space above the bars. Could be argued either way; left as-is for the experiment.

## Known gaps

1. **`gantt` and `kanban` not implemented.** Out of scope for tonight; both are 2-D and need their own design pass.
2. **`marp-cli` and `lattice-runtime.js` paths don't yet show charts.** The transforms live only in `lattice-emulator.js`. Porting them to Marpit plugins (mirroring the patterns of `verdictGridBadges` / `slotLabelLift` in `marp.config.js`) and to the runtime DOM rewriter is the natural next step if the design is approved.
3. **Linter rules** for the markdown contract (validate pill positions and counts) not added. The proposal calls them out as part of the family rollout; would land with the marp-cli port.
4. **Modifiers from the proposal not implemented**: `era` / `dated` for timeline-list; `target` / `stacked` / `radial` for progress; `half` / `legend-left` for piechart. Easy follow-ups.
5. **Caption is a single-line claim.** Multi-paragraph captions will only have the trailing one wrapped; the rest stay in body. Acceptable for the typical "Source: …" footnote usage.
6. **Class-token collision risk noted.** `agenda` uses `progress-N` as a modifier; the chart-family transform uses exact-token matching (`classTokens.includes('progress')`) to avoid the collision, but the principle applies to every future chart-family class — must not pick a name that's already a substring-modifier.

## Recommendation

Both treatments are viable and on-theme. The lucent strip carries more
brand identity, which I'd default to for boardroom decks; the minimal
variant suits research-style decks where the chart is the artefact. If the
visual direction holds, the next pass is:

1. Port the transforms to Marpit plugins (so marp-cli and VS Code preview agree with the emulator).
2. Implement `gantt` and `kanban` as the second wave.
3. Add the modifier set named in §1–§3 of the proposal.
4. Wire the linter rule into `components.json`.
