---
status: shipped
summary: Canonical 43-wide pad-2 gap-5 geometry for every ASCII layout preview plus the ascii-preview auditor and builder
---

# 2026-05-07 — ASCII layout previews in templates.md

## Convention

Every `` ```text `` ASCII preview block in
[engineering/templates.md](../references/templates.md) follows a single
canonical geometry:

| Property                | Value                                       |
| ----------------------- | ------------------------------------------- |
| Outer width             | **43** chars (`┌─…─┐` / `└─…─┘`)            |
| Outer wall pad          | **2** spaces, lead and trail                |
| Inner content area      | **37** chars (between the 2-pad walls)      |
| 2-card grid             | 16-wide cards + **5**-space gap (16+5+16=37) |
| Comparison arrow        | `  →  ` sits in the same 5-space gap        |
| 3-col table             | 11-wide columns with shared edges (37 total) |
| Footer / page-number    | `('split', 'footer', 'N/M')` → trail-2      |

## Tooling

[tools/ascii-preview.py](../../tools/ascii-preview.py) provides:

- `audit <file>` — scans every `` ```text `` block in a markdown file and
  reports any block whose framed rows aren't all 43 chars, plus any rows
  whose outer-wall padding is asymmetric or smaller than 2 spaces.
- `build` — prints canonical demo blocks built programmatically. Importable
  as a library (`frame()`, `card_top()`, `card_row()`, `two_cards()`,
  `table_row()`, etc.) for rebuilding a block in place.

## Known intentional deviations

The audit currently flags 7 lines as off-spec — these are accepted design
choices, not bugs:

- **Template 17 (Split Panel)** — sidebar starts at column 1; the panel itself
  reaches the left wall by design.
- **Template 20 (Numbered Criteria)** — 2-digit numbers (`01`, `02`, …) butt
  closer to the wall than the standard 2-pad.

When the audit reports new findings beyond those 7 lines, treat it as a real
regression to investigate.

## Why this exists

Two earlier rebalance/expansion passes left the file with mixed widths
(41 / 42 / 43), mixed outer pads (2 vs 3), and mixed inter-card gaps
(3 vs 5). One of those passes also masked a real renderer bug — an orphan
`` ```text `` fence that wrapped the bullet list and heading of the next
template, only visible in rendered preview.

Making the geometry programmatic means any future rebuild stays uniform,
and the audit pass catches drift before it ships.

## Editing flow

1. **Read first.** `python3 tools/ascii-preview.py audit engineering/templates.md`
2. **Rebuild a block** by composing `frame([...])` rows in a quick script
   or REPL — never hand-tweak spaces inside `│ … │`.
3. **Audit again** before committing.
4. If a block needs a genuine asymmetric layout (sidebar, numbered margin),
   add it to the "known intentional deviations" list above.
