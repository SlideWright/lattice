---
status: design-speculation
version: 1
supersedes: none
companion: none
last-status-update: 2026-05-17
---

# Treatments — rename `bg-*` to `tint-*` / `mark-*` with orthogonal placement

> **Not canonical.** This is a design proposal. When implemented it will land as its own PR (`claude/treatments-rename-*`) after the custom-logo branch merges. Until then, `bg-*` is the canonical name in `lib/base/base.decorations.css` and `examples/gallery.md`.

---

## Why this is its own note

The current `bg-*` family conflates three concerns into a single flat class name:

1. **What** the visual is (a gradient wash, an SVG accent mark)
2. **Where** it sits (corner / edge / center / fullbleed)
3. **That it is a "background"** — which is the framing being rejected

`bg-orbit-br` is "orbit graphic AT bottom-right BACKGROUND". Three axes, one fused string. Adding a new graphic at a new placement means a new class name; adding the same graphic at a different placement means a *second* new class name; the catalogue grows quadratically and authors have to memorise which `bg-foo-XY` combinations the engine actually ships.

The rejection is more fundamental than the naming: **these are not backgrounds, they are treatments.** A vignette is a tint applied to the canvas; an orbit is a graphic mark placed on the canvas. Neither is "the background" — the canvas underneath is the background.

The proposal: split treatments cleanly across **category** (tint vs mark), **treatment** (the visual itself), and **placement** (where it sits) — three orthogonal axes that compose flatly in the class list. New treatments add one rule; new placements re-use the universal placement modifier.

---

## Design model

Three orthogonal axes:

| Axis | Values | Notes |
|---|---|---|
| **Category** | `tint` · `mark` | Implementation differs (gradients paint via section `background-image` slots; graphics paint via `::before` with optional mask). Authors don't need to know — the prefix tells the engine which mechanism to use. |
| **Treatment** | vignette, sweep, spotlight, corner, edge, frame, horizon, ground, ambient, duotone, orbit, chevron, asterisks, pills, grid, seeds, brackets, slashes, threads, ticks, … | The visual itself. Extensible — adding a new treatment is one new CSS rule, no rename of others. |
| **Placement** *(optional)* | Long: `top-left` `top-right` `bottom-left` `bottom-right` `top` `right` `bottom` `left` `center` `fullbleed` · Short: `at-tl` `at-tr` `at-bl` `at-br` `at-top` `at-right` `at-bottom` `at-left` `at-center` `at-fullbleed` | Both forms are CSS selectors that union to the same rules — authors pick whichever they prefer. Default `at-br` when omitted *and* the treatment supports placement. Placement-agnostic treatments (vignette, sweep, spotlight, ambient) silently ignore `at-*`. |

### Authoring shape

```markdown
<!-- _class: content tint-vignette -->                  (placement-agnostic gradient)
<!-- _class: content tint-corner -->                    (defaults to at-br)
<!-- _class: content tint-corner top-left -->           (override placement, long form)
<!-- _class: content tint-corner at-tl -->              (override placement, short form)
<!-- _class: content tint-edge at-right -->             (edge treatment, placement required)
<!-- _class: content mark-orbit -->                     (defaults to at-br)
<!-- _class: content mark-orbit top-left -->            (override)
<!-- _class: content mark-asterisks at-tr -->           (universal placement axis)
<!-- _class: content tint-corner at-tl mark-orbit -->   (compose: tint at TL, mark at default BR)
```

### Composition with conflicting placements

When `at-*` appears alongside both a `tint-*` and a `mark-*`, it applies to *both*:

```markdown
<!-- _class: content tint-corner at-tl mark-orbit at-tl -->  ← both at top-left (overlap)
```

This is rare in practice. Authors who want different placements per layer can write them once on each treatment:

```markdown
<!-- _class: content tint-corner mark-orbit -->                ← both at default br
<!-- _class: content tint-corner top-left mark-orbit at-br --> ← tint TL, mark BR
```

CSS selector grammar handles this naturally because each `at-*` / `top-left` class affects all `tint-*` / `mark-*` rules on the section via `section.tint-corner.at-tl::before` and `section.mark-orbit.at-tl::before` style selectors. When only one of those is present, only that one positions. When both are present at different placements, both honour their own.

---

## Why `tint` and `mark`

Both four letters, both nouns, both describe what the thing *is* (not what it does or where it sits). Discarded alternatives:

| Candidate | Issue |
|---|---|
| `gradient-*` / `graphic-*` | Verbose; reads as "I want a gradient" rather than "I want a tint of the canvas." |
| `wash-*` / `art-*` | `wash` is good but `art` is too vague. |
| `glow-*` / `accent-*` | Too specific; overloaded with existing accent semantics. |
| `paint-*` (single prefix) | Hides the mechanism distinction; "paint a spotlight" and "paint an orbit" feel like the same thing but render through different pipelines. |
| `motif-*` (single prefix) | Too academic. |
| `treat-*` (single prefix) | Plausible alternative if the two-prefix split feels like over-classification. Doesn't tell the engine which mechanism to use without a lookup. |

Two prefixes (`tint`, `mark`) mirror the mental model the user stated explicitly: *"gradient and graphic treatments."*

---

## Rename table

### Gradients → `tint-*`

| Old name | New name | Placement |
|---|---|---|
| `bg-vignette` | `tint-vignette` | placement-agnostic |
| `bg-spotlight` | `tint-spotlight` | placement-agnostic |
| `bg-sweep` | `tint-sweep` | placement-agnostic |
| `bg-ambient` | `tint-ambient` | placement-agnostic |
| `bg-duotone` | `tint-duotone` | placement-agnostic |
| `bg-frame` | `tint-frame` | fullbleed |
| `bg-horizon` | `tint-horizon` | placement-agnostic |
| `bg-ground` | `tint-ground` | placement-agnostic |
| `bg-corner-tl` | `tint-corner at-tl` (or `tint-corner top-left`) | placement-aware |
| `bg-corner-tr` | `tint-corner at-tr` | placement-aware |
| `bg-corner-bl` | `tint-corner at-bl` | placement-aware |
| `bg-corner-br` | `tint-corner at-br` | placement-aware |
| `bg-edge-top` | `tint-edge at-top` | placement-aware |
| `bg-edge-right` | `tint-edge at-right` | placement-aware |
| `bg-edge-bottom` | `tint-edge at-bottom` | placement-aware |
| `bg-edge-left` | `tint-edge at-left` | placement-aware |

### Graphics → `mark-*`

| Old name | New name | Placement |
|---|---|---|
| `bg-orbit-br` | `mark-orbit` (default `at-br`) | placement-aware |
| `bg-asterisk-scatter` | `mark-asterisks` (default `at-br`) | placement-aware |
| `bg-chevron-bl` | `mark-chevron at-bl` | placement-aware |
| `bg-bracket-right` | `mark-bracket at-right` | placement-aware |
| `bg-grid-micro` | `mark-grid` | fullbleed |
| `bg-pills-right` | `mark-pills at-right` | placement-aware |
| `bg-seeds` | `mark-seeds` | placement-agnostic (scattered) |
| `bg-slash-tr` | `mark-slashes at-tr` | placement-aware |
| `bg-thread-diagonal` | `mark-threads` | placement-agnostic (diagonal) |
| `bg-tick-right` | `mark-ticks at-right` | placement-aware |
| `bg-micro-tr` | `mark-micro at-tr` | placement-aware |

Note the small editorial cleanups (`bg-asterisk-scatter` → `mark-asterisks`, `bg-slash-tr` → `mark-slashes at-tr`) that drop redundant suffixes now that the axis is explicit.

### Other renames

- `lib/base/base.decorations.css` → `lib/base/base.treatments.css`
- `docs/references/backgrounds.md` → `docs/references/treatments.md`
- `tools/build-css.js`: update the `BACKGROUNDS_SOURCE` constant to `TREATMENTS_SOURCE`.

---

## Implementation sketch

Each placement-aware treatment factors out the placement coordinates into a shared rule:

```css
/* Universal placement modifier for any tint-* or mark-* that uses ::before */
section[class*="mark-"]::before,
section[class*="tint-corner"]::before,
section[class*="tint-edge"]::before {
  /* coordinates set by the placement classes below */
}

section.at-tl::before, section.top-left::before {
  top: var(--treatment-inset-block, 1.875cqi);
  left: var(--treatment-inset-inline, 2.34375cqi);
  right: auto; bottom: auto;
}
section.at-tr::before, section.top-right::before {
  top: var(--treatment-inset-block, 1.875cqi);
  right: var(--treatment-inset-inline, 2.34375cqi);
  left: auto; bottom: auto;
}
section.at-bl::before, section.bottom-left::before { /* ... */ }
section.at-br::before, section.bottom-right::before { /* default placement */ }
```

Each treatment defines its `--treatment-inset-*` variables, its mask SVG, and its accent-mix opacity. Placement rules are universal.

For placement-agnostic treatments (`tint-vignette`, `tint-sweep`, `mark-seeds`, `mark-threads`, `mark-grid`), the `::before` is `inset: 0` and the `at-*` modifier is a no-op (the placement rules don't match because the treatment selector doesn't include them in the cascade chain).

---

## Migration

**Hard rename, breaking change.** No alias period.

### What ships in the rename PR

1. `lib/base/base.treatments.css` with new class names.
2. `tools/build-css.js` updated to use the new filename.
3. `examples/*.md` swept for `bg-*` → new names (sed + manual review).
4. `lib/components/**/*.docs.md` and `lib/base/base.docs.md` updated.
5. `docs/references/treatments.md` (new file, replaces `backgrounds.md`).
6. `docs/skill.md`, `docs/design-system.md` swept.
7. `CHANGELOG.md` breaking-change entry with the migration sed script:
   ```bash
   # In your deck source:
   sed -i \
     -e 's/\bbg-orbit-br\b/mark-orbit/g' \
     -e 's/\bbg-corner-tl\b/tint-corner at-tl/g' \
     # ... full table from docs/notes/2026-05-17-treatments-rename.md
   ```
8. Pre-commit hook entry in `lefthook.yml` that fails on staged `bg-*` strings in `examples/*.md` with a pointer to the migration script.
9. `docs/references/gotchas.md` entry pointing to this note as the rationale.

### Estimated diff size

- 27 CSS rules touched in `base.treatments.css` (new) + `base.decorations.css` (deleted).
- ~20 example decks edited (`gallery.md`, `gallery-mermaid.md`, `chart-family-experiment.md`, `design-system.md`, …).
- ~15 doc files swept.
- ~3 test files updated for class-name assertions.

Total: probably 40-60 files touched. One focused half-day of work.

---

## Open questions

1. **Default placement when `at-*` is omitted on a placement-aware treatment.** Proposal says `at-br`. Some treatments (`tint-corner`) currently have no notion of "default" — every existing class is explicitly cornered. Should `tint-corner` default to `at-tl` (per gallery convention) or `at-br` (matches `mark-*`)? Probably `at-br` for cross-category consistency.
2. **Should the rename PR also collapse `bg-asterisk-scatter` → `mark-asterisks` etc.?** Yes — the editorial cleanups are nearly free if the rename is hard anyway.
3. **Backwards-compat shim for the `bg-*` names in user decks in the wild?** None. The migration sed script + pre-commit hook are the support story. (Decision per the user: "Hard rename, update all examples, breaking change.")

---

## Status checklist

- [x] Design model agreed (this note)
- [x] Prefix words agreed (`tint`, `mark`)
- [x] Placement modifier vocabulary agreed (`top-left` long form + `at-tl` short form, both as CSS aliases)
- [x] Migration strategy agreed (hard rename, no alias period)
- [ ] Rename table reviewed in detail (treatment-by-treatment)
- [ ] Default placement per placement-aware treatment confirmed
- [ ] Implementation PR opened (`claude/treatments-rename-*`)
- [ ] All example decks migrated and rebuilt
- [ ] Docs swept
- [ ] CHANGELOG breaking-change entry
