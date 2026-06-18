---
status: shipped
summary: Migration from --mermaid-* to --diagram-* tokens with palette-blind role naming and contrast assertions
---

# Diagram tokens — eliminate Mermaid nomenclature, AA-test the brand

**Date:** 2026-05-12
**Branch:** `claude/investigate-themecss-lattice-rkKD0`
**Status:** design + implementation, single PR

> **Historical context.** This note captures the migration from
> `--mermaid-*` to `--diagram-*` as it landed on 2026-05-12. A follow-on
> migration on 2026-05-14 (commits A–E on the same branch) further
> consolidated `--diagram-band-*` + `--cat-*` + `--chart-*` into a single
> `--c1-light/-dark` … `--c12-light/-dark` categorical cycle plus a
> universal semantic palette (`--c-warm-*`, `--c-cool-*`, `--c-alarm*`,
> `--c-mark`, `--c-note`). The rationale below — palette-blind role
> naming, contrast assertions in `test/unit/contrast.test.js`, dropping
> Mermaid's `themeCSS` init parameter — still applies; only the specific
> token names have moved on. See `design/theming.md` for the current
> contract.

## Why

Three contamination points in the previous architecture:

1. **Mermaid nomenclature in palette files.** Palettes shipped tokens like
   `--mermaid-primary-color`, `--mermaid-pie-purple`, `--mermaid-quadrant-1-fill`,
   `--mermaid-gantt-active`. Every consumer of a categorical pale band had to
   know Mermaid's naming to find the right token.
2. **Mermaid's `themeCSS` init parameter.** The emulator path injected
   per-diagram CSS overrides through Mermaid's `%%{init}%%` directive,
   which forced literal hex resolution (Mermaid's parser rejects `var()`)
   and required a sentinel-comment extraction pass against the palette file.
   The mechanism is unnecessary: the SVG is embedded inline in the host
   HTML at PDF-render time, so the page's stylesheet cascades onto it
   naturally — same cascade the runtime preview already relies on.
3. **No AA contrast assertion.** The contract said "every text-bearing
   token clears WCAG AA against the surface it appears on" but nothing
   tested it. Palette tweaks could silently slip below 4.5:1.

## What

- **Token rename.** `--mermaid-*` → `--diagram-*` across both palettes and
  both renderer bridges. `--cat-*` (categorical mid-tones) stays — already
  role-named, consumed beyond Mermaid (KPI cards, chart-family, roadmap).
- **Band taxonomy.** A 12-slot pale-fill cycle indexed `--diagram-band-1`
  through `--diagram-band-12`, each paired with a tested-contrast
  `--diagram-band-text-N`. Replaces the unstructured
  `--mermaid-primary-color` / `--mermaid-pie-*` zoo.
- **Drop `themeCSS`.** Move the per-diagram CSS overrides (~540 lines) out
  of the post-sentinel section of each palette into the bottom of
  `lattice.css` under a "DIAGRAM OVERRIDES" section header. Every render
  path already loads lattice.css, so the rules cascade onto the inline
  SVG naturally — no Mermaid `themeCSS` init parameter needed. The
  emulator's sentinel-extraction + var-resolution + selector-rewrite
  passes are deleted.
- **Contrast test.** `test/unit/contrast.test.js` parses each shipped
  palette and asserts every band / band-text pair clears 4.5:1, light
  and dark.

## Token map (old → new)

### Surfaces (12-band cycle)

| Old | New | Role |
|---|---|---|
| `--mermaid-primary-color`   | `--diagram-band-1` | first cycle slot — flowchart node fill, journey/c4/kanban first section |
| `--mermaid-secondary-color` | `--diagram-band-2` | second cycle slot |
| `--mermaid-pie-purple`      | `--diagram-band-3` | third cycle slot |
| `--mermaid-pie-orange`      | `--diagram-band-4` | fourth |
| `--mermaid-pie-teal`        | `--diagram-band-5` | fifth |
| `--mermaid-pie-rose`        | `--diagram-band-6` | sixth |
| `--mermaid-pie-yellow`      | `--diagram-band-7` | seventh — pie/gitgraph |
| `--mermaid-pie-red`         | `--diagram-band-8` | eighth — pie/gitgraph |
| `--mermaid-pie-slate`       | `--diagram-band-9` | ninth — pie |
| `--mermaid-pie-sage`        | `--diagram-band-10` | tenth — pie |
| `--mermaid-pie-violet`      | `--diagram-band-11` | eleventh — pie |
| _(new)_                     | `--diagram-band-12` | twelfth — pie/cycle wrap |

Each band has a paired `--diagram-band-text-N` token (AA-tested), wired to
Mermaid's `cScaleLabel{0..11}` themeVariable so even uncovered selectors
(e.g. the timeline-first-period `section--1` quirk) get a tested text colour.

### Structural

| Old | New |
|---|---|
| `--mermaid-border` | `--diagram-stroke` |
| `--mermaid-line` | `--diagram-line` |
| `--mermaid-accent-warm` | `--diagram-accent-warm` |

### Quadrant (4-slot, fill + text paired)

`--mermaid-quadrant-{1..4}-fill` → `--diagram-quadrant-{1..4}-fill`
`--mermaid-quadrant-{1..4}-text` → `--diagram-quadrant-{1..4}-text`

### State (gantt-flavored, semantic — NOT a band cycle)

| Old | New |
|---|---|
| `--mermaid-gantt-active`        | `--diagram-state-active` |
| `--mermaid-gantt-active-border` | `--diagram-state-active-stroke` |
| `--mermaid-gantt-done`          | `--diagram-state-done` |
| `--mermaid-gantt-done-border`   | `--diagram-state-done-stroke` |
| `--mermaid-gantt-critical`        | `--diagram-state-critical` |
| `--mermaid-gantt-critical-border` | `--diagram-state-critical-stroke` |
| `--mermaid-gantt-today`         | `--diagram-state-today` |
| `--mermaid-gantt-grid`          | `--diagram-state-grid` |

### Note / error

| Old | New |
|---|---|
| `--mermaid-note-bg`     | `--diagram-note-bg` |
| `--mermaid-note-border` | `--diagram-note-stroke` |
| `--mermaid-error-bg`    | `--diagram-error-bg` |
| `--mermaid-error-text`  | `--diagram-error-text` |

## Plumbing change

Before:

```
palettes/<name>.css  ─┬─ :root tokens (--mermaid-*)
                     └─ /* ===== MERMAID THEME CSS ===== */  ◀── sentinel
                        section .section-N { fill: var(--mermaid-pie-purple) }
                        ...

lattice-emulator.js  ── splits palette on sentinel
                     ── resolves var() to hex literals
                     ── strips `section ` prefix
                     ── injects via Mermaid's %%{init}%% themeCSS

lattice-runtime.js   ── ignores sentinel; whole palette loads as page CSS
                     ── selectors cascade onto in-DOM SVG naturally
```

After:

```
palettes/<name>.css  ── :root tokens only (--diagram-*)
                        (no sentinel, no overrides block)

lattice.css          ── layout engine + DIAGRAM OVERRIDES section
                        (palette-blind selectors using var(--diagram-*),
                        appended at the bottom under a clearly marked
                        section header)

lattice-emulator.js  ── no sentinel logic
                     ── no themeCSS injection
                     ── mmdc SVG is embedded inline in host HTML;
                        host stylesheet (palette + lattice) cascades onto
                        the SVG at PDF-rasterize time — same mechanism
                        the runtime preview already uses
```

## Coverage gaps closed

| Symptom | Root cause | Fix |
|---|---|---|
| Timeline first period (`section--1`) renders unstyled | Mermaid's `f = r % h - 1` offset; both Mermaid's auto-CSS and our overrides start at `.section-0` | `lattice-diagram.css` adds `.section--1` rules paired with `.section-0` |
| 7th+ period of long timelines reads white-on-pale | Mermaid auto-emits `.section-${r-1} text { fill: cScaleLabel${r} }`; we never set `cScaleLabel*` so Mermaid derives white from our mid-tone cScale | Both renderers now set `cScaleLabel0..11 = --text-heading` (and the band-text tokens are tested) |
| Inconsistent contrast across diagrams | No AA assertion | `test/unit/contrast.test.js` asserts 4.5:1 across every band/text pair |

## Out of scope

- `--cat-*` rename. They're already role-named ("categorical"), consumed
  by kpi-row / chart-family / roadmap / git0-7 themeVar. Leaving them.
- Dark-mode contrast pairs beyond what the palettes already define.
- Renaming the consumer-facing Mermaid theme variables (`cScale*`, `pie*`,
  `fillType*`, `git*`) — those are Mermaid's API surface, not ours.
