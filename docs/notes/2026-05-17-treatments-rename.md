---
status: implementation-ready
version: 2
supersedes: v1 (in-place revision, same date)
companion: none
last-status-update: 2026-05-17
---

# Treatments — rename `bg-*` to `tint-*` / `mark-*` with orthogonal placement

> **Not canonical.** This is a design proposal. When implemented it will land
> as its own PR (`claude/treatments-rename-*`). Until then, `bg-*` is the
> canonical name in `lib/base/base.decorations.css` and `examples/gallery.md`.

> **v2 changes.** v1 conflated two implementation mechanisms (gradient slots
> vs `::before` masks) under one "universal placement modifier" sketch, and
> the rename table had three entries that didn't match current behaviour.
> v2 acknowledges the two-mechanism reality, refactors all marks to the
> orbit pattern so placement actually works, fixes the table for
> `mark-asterisks` / `mark-grid` / `mark-threads`, replaces the global
> default-placement rule with per-treatment defaults, and adds a per-layer
> placement escape hatch.

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
| **Category** | `tint` · `mark` | Implementation differs (gradients write to section custom properties consumed by a compositor; graphics paint via `::before` with a cropped-viewBox mask). Authors don't need to know — the prefix tells the engine which mechanism to use. |
| **Treatment** | vignette, sweep, spotlight, corner, edge, frame, horizon, ground, ambient, duotone, orbit, chevron, asterisks, pills, grid, seeds, brackets, slashes, threads, ticks, micro | The visual itself. Extensible — adding a new treatment is one new CSS rule, no rename of others. |
| **Placement** *(optional, treatment-aware)* | Long: `top-left` `top-right` `bottom-left` `bottom-right` `top` `right` `bottom` `left` `center` `fullbleed` · Short: `at-tl` `at-tr` `at-bl` `at-br` `at-top` `at-right` `at-bottom` `at-left` `at-center` `at-fullbleed` · Per-layer: `tint-at-*` `mark-at-*` | Both long and short forms are CSS aliases that union to the same rules. Each placement-aware treatment carries its own default; some treatments are placement-agnostic and silently ignore `at-*`. See [Per-treatment defaults](#per-treatment-defaults). Per-layer modifiers (`tint-at-*` / `mark-at-*`) override the universal one for the named layer only — escape hatch for composing two layers at different placements. |

### Authoring shape

```markdown
<!-- _class: content tint-vignette -->                  (placement-agnostic gradient)
<!-- _class: content tint-corner at-tl -->              (corner: placement required — no default)
<!-- _class: content tint-corner top-left -->           (long form, same as at-tl)
<!-- _class: content tint-edge at-right -->             (edge: placement required)
<!-- _class: content mark-orbit -->                     (uses treatment default at-br)
<!-- _class: content mark-orbit at-tl -->               (override the default)
<!-- _class: content mark-chevron -->                   (uses treatment default at-bl)
<!-- _class: content mark-asterisks -->                 (placement-agnostic — opposing corners)
<!-- _class: content tint-corner at-tl mark-orbit -->   (both at TL — at-tl applies to both layers)
<!-- _class: content tint-corner tint-at-tl mark-orbit -->  (tint TL, mark default BR — per-layer)
```

### Composition with conflicting placements

When `at-*` appears alongside both a `tint-*` and a `mark-*`, it applies to **both layers**:

```markdown
<!-- _class: content tint-corner at-tl mark-orbit -->   ← tint TL, mark TL (overrides mark-orbit's at-br default)
```

This is usually what authors want. When you need different placements per layer, use the per-layer modifiers `tint-at-*` / `mark-at-*`, which carry higher specificity than the universal `at-*` and win:

```markdown
<!-- _class: content tint-corner tint-at-tl mark-orbit mark-at-br -->   ← tint TL, mark BR
<!-- _class: content tint-corner tint-at-tl mark-orbit -->              ← tint TL, mark at its default br
<!-- _class: content tint-corner mark-orbit mark-at-tl -->              ← tint at <required>, mark TL
```

CSS grammar (sketch):
```css
section.tint-corner.at-tl,
section.tint-corner.top-left,
section.tint-corner.tint-at-tl    { --_tcorner-x: 0%; --_tcorner-y: 0%; }
section.mark-orbit.at-tl::before,
section.mark-orbit.top-left::before,
section.mark-orbit.mark-at-tl::before { top: var(--_ti); left: var(--_ti); right: auto; bottom: auto; }
```

Each treatment's per-layer rule (`.tint-at-tl` / `.mark-at-tl`) appears AFTER the universal rule (`.at-tl`) in the stylesheet so it wins at equal specificity when both are on the section.

---

## Architectural reality — two mechanisms, one placement vocabulary

The `tint-*` and `mark-*` categories paint through completely different CSS mechanisms today. v1's implementation sketch only covered the `::before` case; v2 makes the two-mechanism design explicit so the rename PR can ship both correctly.

### Mechanism A — `tint-*` writes to gradient slots

Each tint class sets `--_bg-radial` or `--_bg-linear`; a single compositor rule on `section[class*="tint-"]` assembles them into `background-image`. To make placement-aware tints work, the gradient definition is parameterised over custom properties that the placement classes rewrite:

```css
section.tint-corner {
  --_tcorner-x: var(--_tcorner-x-default, 100%);   /* no global default — force placement */
  --_tcorner-y: var(--_tcorner-y-default, 100%);
  --_bg-radial: radial-gradient(
    ellipse 62% 55% at var(--_tcorner-x) var(--_tcorner-y),
    color-mix(in srgb, var(--accent) 12%, transparent) 0%,
    transparent 100%
  );
}
section.tint-corner.at-tl, section.tint-corner.top-left,
section.tint-corner.tint-at-tl { --_tcorner-x: 0%;   --_tcorner-y: 0%;   }
section.tint-corner.at-tr, section.tint-corner.top-right,
section.tint-corner.tint-at-tr { --_tcorner-x: 100%; --_tcorner-y: 0%;   }
section.tint-corner.at-bl, section.tint-corner.bottom-left,
section.tint-corner.tint-at-bl { --_tcorner-x: 0%;   --_tcorner-y: 100%; }
section.tint-corner.at-br, section.tint-corner.bottom-right,
section.tint-corner.tint-at-br { --_tcorner-x: 100%; --_tcorner-y: 100%; }
```

`tint-edge` works the same way, parameterising the `linear-gradient(to <dir>, …)` direction over a custom property.

### Mechanism B — `mark-*` is `::before` with a cropped viewBox

Every mark refactors to the `bg-orbit-br` pattern (already shipped for one mark) — a small absolutely-positioned `::before` with the SVG viewBox cropped to the mark's bounding box, and corner insets set via CSS rather than baked into the SVG:

```css
section.mark-orbit {
  --_mark-inset-block: 6.3cqi;
  --_mark-inset-inline: 2.5cqi;
  --_mark-width: 6cqi;
  --_mark-height: 4.5cqi;
}
section.mark-orbit::before {
  content: '';
  position: absolute;
  width: var(--_mark-width);
  height: var(--_mark-height);
  /* default placement set by per-treatment defaults block below */
  pointer-events: none;
  background: color-mix(in srgb, var(--accent) 28%, transparent);
  --m: url("data:image/svg+xml;utf8,<svg … viewBox='<cropped bbox>'>…</svg>");
  -webkit-mask: var(--m) center / contain no-repeat;
          mask: var(--m) center / contain no-repeat;
}
/* Treatment default */
section.mark-orbit:not(.at-tl):not(.at-tr):not(.at-bl):not(.at-top):not(.at-right):not(.at-bottom):not(.at-left):not(.at-center):not(.at-fullbleed)::before {
  bottom: var(--_mark-inset-block);
  right: var(--_mark-inset-inline);
}
/* Universal placement */
section.at-tl::before, section.top-left::before {
  top: var(--_mark-inset-block); left: var(--_mark-inset-inline);
  right: auto; bottom: auto;
}
/* … et al. */
```

Per-layer `mark-at-*` rules follow with higher selector specificity.

> **Selector grammar note.** v1's implementation sketch used `section[class*="mark-"]::before` to factor out the placement inset. That selector also matches the `mark-at-*` and `mark-grid` classes, which is fine because every mark wants the same `pointer-events: none; background: color-mix(...); mask: var(--m) ...` skeleton. The rename PR can keep this factoring.

### Why this matters for the migration

The orbit pattern was originally introduced as a Chromium-PDF mask-rendering workaround (see `docs/references/gotchas.md` and the comment on `bg-orbit-br` in current code). Refactoring all 11 marks to the same pattern fixes that gotcha for the whole family at once, in addition to enabling true placement. The cost is 11 SVG viewBox crops and 11 mark rules rewritten — a focused mechanical pass.

---

## Per-treatment defaults

The default placement for each placement-aware treatment is the location its current single-variant ships at today. This preserves existing visual intent and makes the migration sed script mechanical (no need to translate `bg-orbit-br` → `mark-orbit at-br`; just `mark-orbit` is enough because `at-br` is the default).

`tint-corner` and `tint-edge` are exceptions: their old families had four equally-valid variants, so no single corner / edge is the "natural" default. The rename PR treats both as **placement-required** — omitting `at-*` is an authoring error. A small build-time validator entry catches this.

| Treatment | Default | Rationale |
|---|---|---|
| `tint-corner` | *(required)* | Old family had `tl/tr/bl/br` equally — no natural default |
| `tint-edge` | *(required)* | Same reasoning |
| `tint-vignette` | n/a | Placement-agnostic |
| `tint-spotlight` | n/a | Placement-agnostic |
| `tint-sweep` | n/a | Placement-agnostic (diagonal wash) |
| `tint-ambient` | n/a | Placement-agnostic |
| `tint-duotone` | n/a | Placement-agnostic (opposing corners baked in) |
| `tint-frame` | n/a | Fullbleed |
| `tint-horizon` | n/a | Placement-agnostic |
| `tint-ground` | n/a | Placement-agnostic |
| `mark-orbit` | `at-br` | Current single variant is bottom-right |
| `mark-chevron` | `at-bl` | Current single variant is bottom-left |
| `mark-slashes` | `at-tr` | Current single variant is top-right |
| `mark-threads` | `at-tr` | Current single variant is top-right (despite v1's "diagonal" framing — pattern direction, not placement) |
| `mark-micro` | `at-tr` | Current single variant is top-right header band |
| `mark-pills` | `at-right` | Current single variant is right margin |
| `mark-ticks` | `at-right` | Current single variant is right margin |
| `mark-brackets` | `at-right` | Current single variant is right margin |
| `mark-asterisks` | n/a | Placement-agnostic (opposing corners — TR + BL, baked into SVG) |
| `mark-grid` | n/a | Placement-agnostic (top-right band; not truly fullbleed despite v1's table, and SVG ships only the one location for now — see [open question 1](#open-questions)) |
| `mark-seeds` | n/a | Placement-agnostic (all four corners, scattered) |

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

| Old name | New name | Notes |
|---|---|---|
| `bg-vignette` | `tint-vignette` | placement-agnostic |
| `bg-spotlight` | `tint-spotlight` | placement-agnostic |
| `bg-sweep` | `tint-sweep` | placement-agnostic |
| `bg-ambient` | `tint-ambient` | placement-agnostic |
| `bg-duotone` | `tint-duotone` | placement-agnostic |
| `bg-frame` | `tint-frame` | fullbleed |
| `bg-horizon` | `tint-horizon` | placement-agnostic |
| `bg-ground` | `tint-ground` | placement-agnostic |
| `bg-corner-tl` | `tint-corner at-tl` | placement required |
| `bg-corner-tr` | `tint-corner at-tr` | placement required |
| `bg-corner-bl` | `tint-corner at-bl` | placement required |
| `bg-corner-br` | `tint-corner at-br` | placement required |
| `bg-edge-top` | `tint-edge at-top` | placement required |
| `bg-edge-right` | `tint-edge at-right` | placement required |
| `bg-edge-bottom` | `tint-edge at-bottom` | placement required |
| `bg-edge-left` | `tint-edge at-left` | placement required |

### Graphics → `mark-*`

| Old name | New name | Notes |
|---|---|---|
| `bg-orbit-br` | `mark-orbit` | default `at-br`; refactored to orbit pattern |
| `bg-chevron-bl` | `mark-chevron` | default `at-bl`; refactored to orbit pattern |
| `bg-slash-tr` | `mark-slashes` | default `at-tr`; refactored to orbit pattern |
| `bg-thread-diagonal` | `mark-threads` | default `at-tr`; refactored to orbit pattern (v1 table said "placement-agnostic diagonal" — wrong; pattern direction is diagonal but the placement is top-right corner) |
| `bg-micro-tr` | `mark-micro` | default `at-tr`; refactored to orbit pattern |
| `bg-pills-right` | `mark-pills` | default `at-right`; refactored to orbit pattern |
| `bg-tick-right` | `mark-ticks` | default `at-right`; refactored to orbit pattern |
| `bg-bracket-right` | `mark-brackets` | default `at-right`; refactored to orbit pattern |
| `bg-asterisk-scatter` | `mark-asterisks` | **placement-agnostic** (opposing corners — `at-*` is a no-op; v1 table said default `at-br` — wrong) |
| `bg-seeds` | `mark-seeds` | placement-agnostic (all four corners) |
| `bg-grid-micro` | `mark-grid` | **placement-agnostic** for v1 of the rename; SVG ships top-right only (v1 table said "fullbleed" — wrong, the 4×4 dot grid sits in the top-right header band). See [open question 1](#open-questions). |

Note the editorial cleanups: `bg-asterisk-scatter` → `mark-asterisks`, `bg-slash-tr` → `mark-slashes`, `bg-bracket-right` → `mark-brackets`, `bg-thread-diagonal` → `mark-threads`, `bg-micro-tr` → `mark-micro` all drop redundant suffixes now that placement is either explicit, defaulted, or genuinely agnostic.

### Other renames

- `lib/base/base.decorations.css` → `lib/base/base.treatments.css`
- `docs/references/backgrounds.md` → `docs/references/treatments.md`
- `tools/build-css.js`: update the `BACKGROUNDS_SOURCE` constant to `TREATMENTS_SOURCE`.
- **Stale comment cleanup:** the current header banner in `base.decorations.css` lists `asterisk-scatter` under `--_bg-radial`, but the rule for it is `::before`-only (no `--_bg-radial`). The rename PR drops this misleading entry while it's already rewriting the file.

---

## Migration

**Hard rename, breaking change.** No alias period.

### What ships in the rename PR

1. `lib/base/base.treatments.css` with new class names. All 11 marks
   refactored to the orbit pattern (small `::before` with cropped
   viewBox, placement via CSS insets).
2. `tools/build-css.js` updated to use the new filename.
3. `examples/*.md` swept for `bg-*` → new names (sed + manual review).
4. `lib/components/**/*.docs.md` and `lib/base/base.docs.md` updated.
5. `docs/references/treatments.md` (new file, replaces `backgrounds.md`).
6. `docs/skill.md`, `docs/design-system.md` swept.
7. Validator entry that flags `tint-corner` / `tint-edge` without an
   `at-*` (or `top-left` / `at-top` / etc.) class.
8. `CHANGELOG.md` breaking-change entry with the migration sed script:
   ```bash
   # In your deck source:
   sed -i \
     -e 's/\bbg-orbit-br\b/mark-orbit/g' \
     -e 's/\bbg-chevron-bl\b/mark-chevron/g' \
     -e 's/\bbg-slash-tr\b/mark-slashes/g' \
     -e 's/\bbg-thread-diagonal\b/mark-threads/g' \
     -e 's/\bbg-micro-tr\b/mark-micro/g' \
     -e 's/\bbg-pills-right\b/mark-pills/g' \
     -e 's/\bbg-tick-right\b/mark-ticks/g' \
     -e 's/\bbg-bracket-right\b/mark-brackets/g' \
     -e 's/\bbg-asterisk-scatter\b/mark-asterisks/g' \
     -e 's/\bbg-seeds\b/mark-seeds/g' \
     -e 's/\bbg-grid-micro\b/mark-grid/g' \
     -e 's/\bbg-corner-tl\b/tint-corner at-tl/g' \
     -e 's/\bbg-corner-tr\b/tint-corner at-tr/g' \
     -e 's/\bbg-corner-bl\b/tint-corner at-bl/g' \
     -e 's/\bbg-corner-br\b/tint-corner at-br/g' \
     -e 's/\bbg-edge-top\b/tint-edge at-top/g' \
     -e 's/\bbg-edge-right\b/tint-edge at-right/g' \
     -e 's/\bbg-edge-bottom\b/tint-edge at-bottom/g' \
     -e 's/\bbg-edge-left\b/tint-edge at-left/g' \
     -e 's/\bbg-vignette\b/tint-vignette/g' \
     -e 's/\bbg-spotlight\b/tint-spotlight/g' \
     -e 's/\bbg-sweep\b/tint-sweep/g' \
     -e 's/\bbg-ambient\b/tint-ambient/g' \
     -e 's/\bbg-duotone\b/tint-duotone/g' \
     -e 's/\bbg-frame\b/tint-frame/g' \
     -e 's/\bbg-horizon\b/tint-horizon/g' \
     -e 's/\bbg-ground\b/tint-ground/g' \
     -e 's/\bbg-none\b/treatment-none/g' \
     examples/*.md
   ```
9. Pre-commit hook entry in `lefthook.yml` that fails on staged `bg-*`
   strings in `examples/*.md` with a pointer to the migration script.
10. `docs/references/gotchas.md` entry pointing to this note as the
    rationale, and updating the existing Chromium-PDF mask gotcha to
    note that the orbit-pattern fix now applies to all marks.

### Estimated diff size

- 27 → ~30 CSS rules in `base.treatments.css` (new) + `base.decorations.css` (deleted).
  - 11 mark rules rewritten to the orbit pattern with cropped viewBoxes.
  - 2 placement-parameterised tint families (`tint-corner`, `tint-edge`),
    each gaining a base rule + 4 placement-modifier rules.
  - Universal placement-modifier ruleset for marks (10 `at-*` rules).
- ~20 example decks edited (`gallery.md`, `gallery-mermaid.md`,
  `chart-family-experiment.md`, `design-system.md`, …).
- ~15 doc files swept.
- ~3 test files updated for class-name assertions.
- 1 validator entry for placement-required tints.

Total: probably 50–70 files touched. One focused day of work given the
mark refactor; the rename alone would be a half-day.

---

## Open questions

1. **Should `mark-grid` ship a true fullbleed variant?** Today the SVG
   is a 4×4 dot grid in the top-right header band only — calling it
   `mark-grid` (no placement, suggesting "the slide has a grid") is
   slightly misleading. Two options: (a) ship it as-is, accept that
   `mark-grid` means "grid accent in the top-right" and revisit later;
   or (b) add a second SVG variant in the rename PR for the true
   fullbleed case and make the existing one `mark-grid at-tr`. The
   rename PR can defer this — it's a follow-up feature, not a rename
   decision.
2. **Should the orbit-pattern refactor land before, with, or after the
   rename?** Three sequencings: (a) one PR for everything (proposed —
   atomic, but big diff); (b) refactor marks to orbit pattern first in
   a no-rename PR (`bg-*` keeps its names, every mark gets cropped
   viewBox), then a smaller rename PR follows (smaller blast radius
   per PR, but two breaking churns through the gallery); (c) rename
   first, refactor follow-up (means `mark-*` ships with broken
   placement for 10 of 11 marks — bad UX). Recommend (a) unless the
   reviewer prefers split.

---

## Status checklist

- [x] Design model agreed (this note)
- [x] Prefix words agreed (`tint`, `mark`)
- [x] Placement modifier vocabulary agreed (`top-left` long form + `at-tl` short form, both as CSS aliases; per-layer `tint-at-*` / `mark-at-*` escape hatch)
- [x] Migration strategy agreed (hard rename, no alias period)
- [x] Rename table reviewed in detail (treatment-by-treatment, v2 corrections applied)
- [x] Default placement per placement-aware treatment confirmed (per-treatment, matches current single-variant home; `tint-corner` / `tint-edge` are placement-required)
- [x] Architectural reality acknowledged (two mechanisms; `mark-*` refactor to orbit pattern is part of the rename PR)
- [ ] Open question 1 (mark-grid fullbleed variant) — defer or decide
- [ ] Open question 2 (refactor sequencing) — confirm single-PR vs split
- [ ] Implementation PR opened (`claude/treatments-rename-*`)
- [ ] All example decks migrated and rebuilt
- [ ] Docs swept
- [ ] CHANGELOG breaking-change entry
- [ ] Gotchas entry pointing here + updated mask-rendering note
