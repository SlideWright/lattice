---
status: design-decision
version: 1
supersedes: none
---

# Multi-resolution strategy

> **Extended (2026-06-16):** portrait + square social/mobile sizes (`square`,
> `portrait`, `story`, `mobile`) and the orientation-aware `--canvas-scale`
> mechanism build directly on this `@size` + cqi foundation. See
> `2026-06-16-social-mobile-portrait-sizes.md`.

## Decision

Lattice will support multiple output resolutions via Marp's native `@size`
directive. Authors opt in with the front-matter `size:` key. No separate
CSS files, no theme changes, no new CLI flags.

## Sizes in scope

| Name       | Dimensions  | Status    | Use case                              |
|------------|-------------|-----------|---------------------------------------|
| `hd`     | 1280 × 720  | shipping  | Default — projectors, screen sharing  |
| `4K`  | 3840 × 2160 | planned   | Hi-res display, premium print export  |
| `standard`      | 960 × 720   | candidate | Legacy boardroom AV rigs              |

`standard` is declared as a candidate — worth reserving the `@size` slot now so
the architecture doesn't need to be revisited, even if authoring guidance
and layout auditing come later. `16:9-2k` (2560 × 1440) is deliberately
omitted; authors who need it can export 4K at a lower image-scale.

## Why not a separate CSS file per resolution?

An earlier sketch proposed `lattice-4k.css` alongside `lattice.css`. This
was rejected because:

- Marp's `@size` directive already solves multi-resolution within one file.
- A separate file would need to shadow every theme's `@theme` import,
  creating 25+ `-4K` theme variants for no functional gain.
- All 25 themes are palette-only; none touch sizing. Keeping sizing
  centralised in `lattice.css` means zero theme changes for any new size.

## Scaling mechanism

`@size` changes the canvas dimensions. It does **not** scale design tokens
(fonts, spacing, radii), which are currently absolute px. Two changes give
us automatic proportional scaling at any registered size:

### 1 — px → cqi refactor in lattice.css

Convert every `--fs-*`, `--sp-*`, and `--radius-*` token from absolute `px`
to **container query inline units** (`cqi`), using the HD slide width
(1280px) as the 100 cqi baseline.

Conversion formula: `cqi_value = px_value / 1280 * 100`

Before: `--fs-display: 60px;`
After:  `--fs-display: 4.6875cqi;`  (4.6875% of 1280px = 60px at HD)

At HD this is a byte-identical visual change. At 4K (3840px container)
the same `4.6875cqi` resolves to 180px — a perfect 3× scale with zero
additional rules.

**Why cqi, not rem?** The `rem` approach requires a `@container` query
to modify `:root { font-size }` from a descendant — but `@container`
rules only affect descendants of the container, not ancestors. `cqi` units
resolve at the point of use, so they scale automatically with the section's
inline size without any additional queries.

**Existing cqh usage:** The file already uses `cqh` (container query height)
in four `clamp()` expressions (principles, tldr layouts). This confirms the
rendering pipeline supports container query units. Adding `container-type:
size` to section formalises this and makes cqi resolution predictable.

### 2 — `container-type: size` on section

```css
section { container-type: size; }
```

With this declaration:

- Elements **inside** section resolve cqi/cqh against section's dimensions
- At HD: 100cqi = 1280px → all tokens identical to the old px values
- At 4K: 100cqi = 3840px → all tokens scale 3× automatically
- No `@container` breakpoint rules needed

Known hardcoded px sites requiring individual attention:

- `calc(1280px - …)` patterns (4 occurrences) → `calc(100cqi - …)`
- Pill padding `3px 9px` → cqi equivalents
- Border widths (`1px`, `2px`, `3px`) — intentionally kept as `px`
  (hairlines should remain hairline at all resolutions)
- Section's own `padding-top/bottom: 88px` → `6.875cqi` (falls back to
  viewport when used on the container element itself; in Marp's rendering
  context the viewport = slide dimensions, so this resolves correctly)

## Author experience

At HD (current default) — nothing changes. No front-matter required.

For 4K output:

```yaml
---
theme: indaco
size: 4K
---
```

That is the complete opt-in. Token scaling happens automatically through
the container query.

## Impact surface

| Area | Impact |
| --- | --- |
| Themes (all 25) | None — palette-only files, no sizing |
| lattice.css tokens | Mechanical px to cqi rewrite (one-time) |
| lattice.css layout | `calc(1280px - ...)` to `calc(100cqi - ...)` (x4 occurrences) |
| Component details | ~30-50 hardcoded px sites individually audited |
| lattice-emulator.js | No change (emitter output is HTML/CSS, not px-aware) |
| marp.config.js / lib | No change |
| lattice-runtime.js | No change |
| Integration tests | Add 4K size to `expected-page-counts.json` fixture |
| Gallery | Add a 4K sample slide or deck to smoke-test scaling |

## Implementation order

1. px → cqi refactor in `lattice.css` — add `container-type: size` to
   `section`; convert `:root` tokens, compact/loose overrides, chrome
   positions, and `calc(1280px - …)` patterns. No visual change at HD,
   verifiable by diffing rendered output against the committed baseline PDF.
2. Add `@size 4K` and `@size standard` declarations to `lattice.css`.
3. Audit and convert component-level hardcoded px sites (pill padding,
   card gaps, chart grid dimensions, etc.).
4. Wire up a one-slide 4K smoke-test in the gallery or fixtures.
5. If `standard` is confirmed as shipping, run a visual check and document
   any layout-specific authoring guidance needed for the narrower aspect.
