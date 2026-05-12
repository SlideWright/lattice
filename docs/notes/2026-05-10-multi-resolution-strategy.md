---
status: design-decision
version: 1
supersedes: none
---

# Multi-resolution strategy

## Decision

Lattice will support multiple output resolutions via Marp's native `@size`
directive. Authors opt in with the front-matter `size:` key. No separate
CSS files, no theme changes, no new CLI flags.

## Sizes in scope

| Name       | Dimensions  | Status    | Use case                              |
|------------|-------------|-----------|---------------------------------------|
| `16:9`     | 1280 × 720  | shipping  | Default — projectors, screen sharing  |
| `16:9-4k`  | 3840 × 2160 | planned   | Hi-res display, premium print export  |
| `4:3`      | 960 × 720   | candidate | Legacy boardroom AV rigs              |

`4:3` is declared as a candidate — worth reserving the `@size` slot now so
the architecture doesn't need to be revisited, even if authoring guidance
and layout auditing come later. `16:9-2k` (2560 × 1440) is deliberately
omitted; authors who need it can export 4K at a lower image-scale.

## Why not a separate CSS file per resolution?

An earlier sketch proposed `lattice-4k.css` alongside `lattice.css`. This
was rejected because:

- Marp's `@size` directive already solves multi-resolution within one file.
- A separate file would need to shadow every theme's `@theme` import,
  creating 25+ `-4k` theme variants for no functional gain.
- All 25 themes are palette-only; none touch sizing. Keeping sizing
  centralised in `lattice.css` means zero theme changes for any new size.

## Scaling mechanism

`@size` changes the canvas dimensions. It does **not** scale design tokens
(fonts, spacing, radii), which are currently absolute px. Two changes give
us a single scale knob:

### 1 — px → rem refactor in lattice.css

Convert every `--fs-*` and `--sp-*` token from absolute `px` to `rem`,
and write all internal dimensions (padding, gap, named sizes) in `rem`.
The root `font-size` on `:root` becomes the universal scale factor.

Before: `--fs-display: 60px;`
After:  `--fs-display: 3.75rem;`  (at `font-size: 16px` root → 60 px)

At HD this is a byte-identical visual change. At 4K the root font-size
bumps (see below) and every token scales automatically.

Known hardcoded px sites requiring individual attention:
- Seven `calc(1280px - …)` patterns → `calc(80rem - …)`
- Pill padding `3px 9px` → `var(--sp-pill-y) var(--sp-pill-x)` tokens
- Border widths (`1px`, `2px`) — intentionally kept at `1px`/`2px`
  (sub-pixel at HD, hairline at 4K — correct behaviour, no change needed)
- Footer/header bottom offset (`24px`) → `var(--sp-md)` or `1.5rem`
- Numbered-card `padding-top: 30px` → `var(--sp-card-num)` token

### 2 — Container query on section

Mark each `section` as a size container. When the canvas is 4K-wide, the
query bumps the root font-size from 16 px to 48 px (3×), and every rem
value triples automatically.

```css
section { container-type: size; }

@container (min-width: 3000px) {
  :root { font-size: 48px; }   /* 16px × 3 → full 4K scale */
}
```

If `4:3` is promoted to shipping, a second breakpoint at, say,
`min-width: 900px and max-width: 1000px` would handle its scale if it
differs from HD. At 960 px it is close enough to 1280 that the same 16 px
root is likely fine — this needs a visual check before committing.

## Author experience

At HD (current default) — nothing changes. No front-matter required.

For 4K output:

```yaml
---
theme: indaco
size: 16:9-4k
---
```

That is the complete opt-in. Token scaling happens automatically through
the container query.

## Impact surface

| Area                  | Impact                                              |
|-----------------------|-----------------------------------------------------|
| Themes (all 25)       | None — palette-only files, no sizing               |
| lattice.css tokens    | Mechanical px → rem rewrite (one-time)             |
| lattice.css layout    | `calc(1280px - …)` → `calc(80rem - …)` (×7)       |
| Component details     | ~10–15 hardcoded px sites audited and tokenised     |
| lattice-emulator.js   | No change (emitter output is HTML/CSS, not px-aware)|
| marp.config.js / lib  | No change                                           |
| lattice-runtime.js    | No change                                           |
| Integration tests     | Add 4K size to `expected-page-counts.json` fixture  |
| Gallery              | Add a 4K sample slide or deck to smoke-test scaling |

## Implementation order

1. px → rem refactor in `lattice.css` — no visual change at HD, verifiable
   by diffing rendered output against the committed baseline PDF.
2. Audit and tokenise the hardcoded px outliers noted above.
3. Add `@size` declarations and the `@container` block to `lattice.css`.
4. Wire up a one-slide 4K smoke-test in the gallery or fixtures.
5. If `4:3` is confirmed, declare its `@size` slot and run a visual check.
