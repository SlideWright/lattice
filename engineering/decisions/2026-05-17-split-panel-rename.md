# 2026-05-17 — split-panel → split-list rename (shipped)

**Status:** Shipped. This note captures the design decision + executed
migration. See commit `fc65e97` for the implementation; commit
`0d3b25b` for the follow-up marp-cli post-processor that brought
split-list to parity with the rest of the split-* family.

**Background.** During the Phase 5 lib/ reorganization, a naming
inconsistency surfaced in the split-* component family:

| Before | Right panel content |
|---|---|
| `split-panel` | list of supporting points |
| `split-brief` | lede paragraph + findings list |
| `split-statement` | pull quote + implications |
| `split-metric` | big number + caption |
| `split-steps` | numbered steps |
| `split-compare` | two options + verdict |

All six components had a dark left panel — they were all "split panels."
Calling one of them `split-panel` implied it was the canonical/parent
of the family when it was actually just one specific variant (the
generic list-of-points version).

## What changed

`split-panel` → `split-list`. The suffix in `split-*` now uniformly
tells you what the **right panel contains**:

| Name | Right panel |
|---|---|
| `split-list` | list of supporting points (was `split-panel`) |
| `split-brief` | lede paragraph + findings list |
| `split-statement` | pull quote + implications |
| `split-metric` | big number + caption |
| `split-steps` | numbered steps |
| `split-compare` | two options + verdict |

**Alternatives considered and rejected.** `split-points` ("list of
supporting points") and `split-section` ("section opener with side
points") — both accurate but break the family pattern of
naming-by-right-panel-content.

## What the migration touched

- Component folder: `lib/components/split-panel/` → `lib/components/split-list/`
- 5 dotted files inside renamed in transit (`split-panel.{manifest.json,
  styles.css, docs.md, gallery.md, gallery.pdf}` → `split-list.*`)
- Manifest `name`, `sample` `_class:` directives, and prose mentions
  all updated
- CSS selectors: `section.split-panel` → `section.split-list` in the
  component CSS, plus `:is(.split-panel)` → `:is(.split-list)` and
  similar in `lib/base/base.modifiers.css`
- Engine code: `lattice-emulator.js:1478` post-processor selector
  updated; `marp.config.js`'s `splitPanelCounter` plugin now matches
  `\bsplit-list\b` and emits `data-split-list-n="01"` attributes;
  `lib/components/index.js` `CARD_STYLE_LAYOUTS` list updated
- Test fixtures: `test/unit/parsing/marp-plugins.test.js` selectors
  and assertions updated
- ASCII catalog: `T17-split-panel` → `T17-split-list` in
  `tools/ascii-preview.py`
- Slide directives: every `<!-- _class: split-panel -->` across
  `examples/`, `lib/components/*/gallery.md`, etc.
- Cross-references: `related[]` entries in `cards-side`, `split-brief`,
  `split-statement`, `split-steps` manifests
- Documentation: `CLAUDE.md`, `README.md`, `engineering/architecture.md`,
  `design/design-system.md`, `engineering/audit.md`, `lib/base/base.docs.md`
- Snippets and per-component docs regenerated
- All 60 gallery PDFs rebuilt

## Verification

- 441 unit tests pass
- 58 per-component integration tests pass
- Pixel diff against pre-rename baseline: zero pixel changes across
  all 60 PDFs (as expected — pure rename has no visual effect)

## What was left intentionally as historical references

- `CHANGELOG.md` — historical record of earlier commits when the
  component was named split-panel
- `engineering/decisions/2026-05-04-authoring-proposals.md` — dated snapshot from
  before the rename; the proposals discussed there reference
  `split-panel` because that was the name at proposal time
- `engineering/decisions/2026-05-11-4k-rendering-audit.md` — dated audit snapshot
- `lib/core/split-panels.js` (filename) — handles 5 split-* plurals
  (split-brief, split-statement, split-metric, split-steps,
  split-compare); the filename's plural is accurate for the file's
  job, not affected by the singular rename
- `marp.config.js` / `lattice-runtime.js` / `engineering/gotchas.md`
  — references to `lib/core/split-panels.js` (the file above)

## Related deferred work

- `split-list` `chapter` and `metrics` variants from
  `engineering/decisions/2026-05-04-authoring-proposals.md` (proposed but never
  implemented; would now apply to `split-list` post-rename)
- `lib/core/split-panels.js` could absorb `split-list` to bring all
  6 split-* layouts under one dispatcher — currently `split-list` runs
  through the `lattice-emulator.js` inline path on one side and the
  brand-new dedicated post-processor I added in commit `0d3b25b` on
  the marp-cli side. Unifying that is a small cleanup but adds nothing
  functionally.
