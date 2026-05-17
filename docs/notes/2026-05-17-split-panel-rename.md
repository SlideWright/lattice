# 2026-05-17 — split-panel rename proposal

**Status:** Deferred — proposal captured for a future cleanup pass.
Not blocking anything.

**Background.** During the Phase 5 lib/ reorganization, a naming
inconsistency surfaced in the split-* component family:

| Today | Right panel content |
|---|---|
| `split-panel` | list of supporting points |
| `split-brief` | lede paragraph + findings list |
| `split-statement` | pull quote + implications |
| `split-metric` | big number + caption |
| `split-steps` | numbered steps |
| `split-compare` | two options + verdict |

All six components have a dark left panel — they're all "split panels."
Calling one of them `split-panel` implies it's the canonical/parent of
the family when it's actually just one specific variant (the generic
list-of-points version).

## Proposed rename

`split-panel` → `split-list`.

Rationale: the suffix in `split-*` should tell you what the **right
panel contains**. `split-brief` = brief content. `split-statement` =
quote content. `split-list` would parallel them — the right panel is
a list.

**Alternatives considered:**

- `split-points` — also accurate ("list of supporting points"), but
  `list` is the more general word and matches the existing `list`
  component vocabulary.
- `split-section` — descriptive ("section opener with side points")
  but breaks the family pattern of naming-by-right-panel-content.

Going with `split-list`.

## What changes

- Component folder: `lib/components/split-panel/` → `lib/components/split-list/`
- 5 dotted files inside: `split-panel.{manifest.json, styles.css,
  docs.md, gallery.md, gallery.pdf}` → `split-list.*`
- Manifest `name` field: `"split-panel"` → `"split-list"`
- `<!-- _class: split-panel -->` slide directives everywhere → `split-list`
- `lattice-emulator.js:1478` split-panel post-processor: selector
  update from `cls.includes('split-panel')` to `cls.includes('split-list')`
- CSS rules in the moved styles.css: `section.split-panel` →
  `section.split-list` (sed-able)
- VS Code snippets regen (driven by manifest)
- ASCII catalog block ID: `T17-split-panel` → `T17-split-list`
- Cross-references in CLAUDE.md, README.md, design-system.md,
  per-component `related[]` entries pointing at split-panel
- Examples that use the layout: `examples/gallery.md`,
  `examples/gallery-jargon.md` — `_class:` directive update
- All split-* per-component docs that cross-reference split-panel as
  related — repoint to split-list

## Test plan when executing

1. Pre-flight pixel-diff baseline (top-level decks + per-component PDFs).
2. `git mv` the folder + files in transit.
3. Rename manifest `name` field.
4. Sed-pass CSS selectors in the moved styles.css.
5. Update emulator selector at `lattice-emulator.js:1478`.
6. Update ASCII catalog block ID in `tools/ascii-preview.py`.
7. Update every `<!-- _class: split-panel -->` directive across the
   repo: examples/, lib/components/*/gallery.md, etc.
8. Regenerate snippets.
9. Regenerate all per-component docs.md + gallery.md (the affected
   ones — split-list's own, and any with cross-references in `related[]`).
10. Rebuild lattice.css + every gallery PDF.
11. Pixel-diff against pre-flight baseline — every PDF must be
    pixel-clean (rename has no visual effect; only path/identifier
    changes).
12. `npm test` + integration tier — all assertions still pass.
13. Update CLAUDE.md / README.md / docs/ references.

## Cost estimate

~1 hour mechanical work, plus pixel-diff verification. Similar shape
to Phase 1's dotted-rename pass but smaller in scope (one component
folder, not 58).

## Why deferred

Phase 5 is already a multi-step refactor with rendering changes the
user wants to eyeball. Adding a component rename on top would inflate
review surface. The current naming is a quirk, not a bug — every
existing deck continues to work; only future readers wonder why one
of the six split-* components has the "split-panel" name.

Defer until after Phase 5 stabilizes. Then take this one as its own
isolated commit.

## Related

- `docs/notes/2026-05-17-chart-family-refactor.md` — similar deferred
  refactor for the chart-family subsystem.
- `docs/notes/2026-05-04-authoring-proposals.md` — original split-panel
  variant proposals (mirror shipped; chapter/metrics still open) that
  would also land more cleanly after the rename.
