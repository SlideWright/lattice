# 2026-05-12 — Roadmap layout redesign

Investigation note. The shipped `roadmap` layout (workstream × phase grid)
is readable but visually inert — a black-and-grey table with one
decorative numbered pill in each header cell. This note works through
five distinct table-driven roadmap concepts, five iterations each, picks
a winner per concept, and ships them as `roadmap` + four modifiers.

All five concepts use the markdown-table source contract. No bespoke
markdown shape; modifiers compose with the default `roadmap` class.

## Concept 1 — `roadmap` (default, refined)

Workstream × phase grid. The baseline.

| #  | Treatment                                                                              | Verdict |
| -- | -------------------------------------------------------------------------------------- | ------- |
| A  | Per-row categorical lane stripe; tight one-line phase headers; soft row tint           | **pick** — strong identity, reuses `--cat-*`, scales |
| B  | Every cell becomes a rounded tile with bg-alt fill                                     | too busy; loses scannability across columns |
| C  | Dark mono rail for the workstream column                                                | over-dramatic; clashes with the spectrum top stripe |
| D  | Per-row card with drop shadow and inset phase pills                                    | depth too heavy; reads ornamental, not editorial |
| E  | Header row gets a horizontal tick scale below it                                       | belongs on `roadmap milestones`, not the default |

Winner: A — categorical lane stripe on the workstream cell, tighter
phase header with the numbered badge on the same line as the phase
label, alternating row tint via `--bg-alt`, hairline vertical phase
column rules.

## Concept 2 — `roadmap status`

Status board. Cells carry a state marker (`[x]`, `[~]`, `[ ]`, `[-]`)
and read like a stand-up scorecard.

| #  | Treatment                                                                              | Verdict |
| -- | -------------------------------------------------------------------------------------- | ------- |
| A  | Chip word ("SHIPPED" / "IN FLIGHT" / …) prefix inside the cell                         | too verbose; pushes content right |
| B  | Entire cell background tinted in state colour                                          | overwhelms the grid; eye can't find content |
| C  | Top-edge accent ribbon per cell                                                        | weak signal when columns are tall |
| D  | Left-edge accent ribbon + small state dot + state-tinted cell tint                     | **pick** — state reads at a glance, content stays primary |
| E  | State-coloured dot prefix only                                                         | too subtle for a status board |

Winner: D. State is a left-edge ribbon (3px) + soft tinted background +
small state name as mono caps eyebrow above the cell content.

## Concept 3 — `roadmap horizons`

Now / Next / Later. Three vertical phase cards.

| #  | Treatment                                                                              | Verdict |
| -- | -------------------------------------------------------------------------------------- | ------- |
| A  | Three equal-height cards: eyebrow + big phase number + workstream:item rows           | **pick** — clean, scannable, no gimmicks |
| B  | Cards with a progress-dot indicator at top                                             | adds visual noise; the eyebrow already conveys position |
| C  | Cards in escalating dimness (NOW bright → LATER muted)                                 | hard to read on dim cards; fights theme contrast |
| D  | Cards connected by chevrons                                                            | gimmicky; cards already imply sequence |
| E  | Cards with a workstream-icon column inside                                              | requires icons; doesn't fit text-only contract |

Winner: A. Three vertical phase cards. Each carries a coloured top
stripe (cat rotation), an eyebrow ("NOW · PHASE 01" etc — derived from
the markdown header), and the workstream rows stacked inside the card,
each row showing the workstream label as a small mono caps line above
its commitment.

Requires DOM rewrite: table → three cards, gathering each column's
cells with their row labels. Implemented in the engine render hook
(`lib/roadmap-horizons.js`) so marp-vscode preview and the emulator
share one path; mirrored in `lattice-runtime.js` for web export.

## Concept 4 — `roadmap swimlane`

Per-workstream horizontal track of phase pills.

| #  | Treatment                                                                              | Verdict |
| -- | -------------------------------------------------------------------------------------- | ------- |
| A  | Each cell renders as a rounded pill on the row's cat tint                              | **pick** — most distinct from default grid; reads as a true swimlane |
| B  | Shared continuous bar background per row                                                | loses cell boundaries when phase content varies in length |
| C  | Phases as bordered pills, workstream column dominates                                  | overweights the label column |
| D  | Thin vertical rail per row only                                                         | indistinguishable from the default at a glance |
| E  | Phase numbered chip prefix inside each pill                                             | duplicates header chrome |

Winner: A. Workstream cell holds the lane label on a strong cat tint;
phase cells render as outlined pills with the row's accent on the left
edge, separated by visible gaps. Reads as a track.

## Concept 5 — `roadmap milestones`

Quarter-anchored. Calendar tick under the header, optional date prefix
in each cell.

| #  | Treatment                                                                              | Verdict |
| -- | -------------------------------------------------------------------------------------- | ------- |
| A  | Phase header carries a subtitle slot (e.g. `Q1 · 2026`); calendar tick under the row   | **pick** — clearest evocation of a timeline |
| B  | Date pill above every cell                                                              | author has to write four dates per row; tedious |
| C  | Spectrum gradient cool→warm across phase columns                                       | conflicts with the spectrum top stripe |
| D  | Diamond glyph prefix per cell                                                           | ornamental, no information value |
| E  | Sticky workstream + scrollable phase headers                                            | doesn't apply to a printed PDF |

Winner: A. Author writes the phase column header as
`Phase 01 \| Q1 2026` (pipe separator inside the header text). The CSS
splits the header into a phase-label line and a quarter-tick line.
Below the header row, a thin horizontal tick scale runs the width of
the phase columns.

## Shipping plan

- `lattice.css`: refactor existing `section.roadmap` block, add four
  modifier blocks (`.status`, `.horizons`, `.swimlane`, `.milestones`).
- `lib/roadmap-state.js`: cell-state-marker transform for `roadmap
  status`. Engine render hook + emulator + runtime mirror.
- `lib/roadmap-horizons.js`: table → three cards transform.
- `examples/gallery.md`: five demo slides, one per layout.
- `examples/gallery-guide.md`: five guide slides documenting each.
- `reference/engineering/templates.md`: roadmap section rewrite with the
  modifier matrix.
- `test/fixtures/expected-page-counts.json`: bump for the added slides.
- Rebuild gallery PDF.
