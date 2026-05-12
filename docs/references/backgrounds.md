# Background Library

`bg-*` classes apply atmospheric accent tints and SVG accent marks to slides. They are loaded automatically — no imports, no theme switching. Add a class name to any `<!-- _class: -->` directive alongside the layout class.

---

## Usage

**Per-slide:**
```markdown
<!-- _class: content bg-corner-tl -->
```

**Deck-wide (front-matter `class:`):**
```yaml
---
theme: indaco
class: bg-corner-tl
---
```
The deck-class propagator merges the bg token into every slide's class list. Per-slide `<!-- _class: -->` still wins for tokens it explicitly declares.

**Override one slide back to clean:**
```markdown
<!-- _class: content bg-none -->
```

**Layered (one radial-slot + one linear-slot):**
```markdown
<!-- _class: content bg-corner-tl bg-edge-right -->
```
See [Layer composability](#layer-composability) for rules.

---

## Dark mode

All `bg-*` gradients and SVG shapes use `var(--accent)` from the active palette. Because `--accent` resolves via the theme's `light-dark()` token, backgrounds are automatically on-brand in both light and dark presentations — including per-slide `dark` modifier slides:

```markdown
<!-- _class: content bg-micro-tr dark -->
```

No per-pattern overrides are needed.

---

## Catalogue

### Corner glows

Radial ellipse anchored at one corner. 12% peak accent; fades to transparent before the content zone.

| Class | Anchor |
|---|---|
| `bg-corner-tl` | Top-left |
| `bg-corner-tr` | Top-right |
| `bg-corner-bl` | Bottom-left |
| `bg-corner-br` | Bottom-right |

### Edge washes

Linear gradient from one edge. Gone before mid-slide.

| Class | Direction |
|---|---|
| `bg-edge-top` | Down from top, 35% fade |
| `bg-edge-bottom` | Up from bottom, 35% fade |
| `bg-edge-left` | Right from left, 30% fade |
| `bg-edge-right` | Left from right, 30% fade |

### Atmospheric

Full-canvas tonal effects. Center remains transparent.

| Class | Effect |
|---|---|
| `bg-vignette` | Accent-tinted perimeter, open center |
| `bg-spotlight` | Reverse vignette — accent wash at center |
| `bg-horizon` | Heavier at top, clear from 45% — aspiration, elevation |
| `bg-ground` | Heavier at bottom, clear from 45% — conclusion, landing |

### Multi-accent

Two or more gradient layers composed. Each layer runs at ~8–9% so the total matches a single-gradient pattern.

| Class | Effect |
|---|---|
| `bg-duotone` | Opposing corner pair — top-left + bottom-right |
| `bg-frame` | All four edges at half-weight |
| `bg-sweep` | Diagonal wash at 135° — forward motion, directionality |
| `bg-ambient` | Broad off-axis tint at 7% — the lowest-key option |

### SVG accent marks

Geometric shapes placed in the known-empty peripheral slots. A `::before` mask renders each mark in the active `--accent` color. Marks occupy **no gradient slot** — they combine freely with any gradient class.

| Class | Mark | Location |
|---|---|---|
| `bg-micro-tr` | 9 micro circles, r 2–4.5 | Top-right header band |
| `bg-tick-right` | 5 horizontal ticks | Far-right margin |
| `bg-orbit-br` | Concentric rings + satellites | Bottom-right corner |
| `bg-slash-tr` | 5 parallel 45° slashes | Top-right corner |
| `bg-seeds` | 12 elongated ellipses, 3 per corner | All four corners |
| `bg-pills-right` | 4 horizontal pill shapes | Far-right margin |
| `bg-asterisk-scatter` | Asterisks + micro dots | Opposing corners |
| `bg-thread-diagonal` | 3 hairline diagonals (stroke 0.5) | Top-right corner |
| `bg-bracket-right` | 2 bracket marks `]` | Far-right margin |
| `bg-grid-micro` | 4×4 dot grid, edge bleed | Top-right corner |
| `bg-chevron-bl` | 3 right-pointing chevrons | Bottom-left corner |

### Reset

| Class | Effect |
|---|---|
| `bg-none` | Clears a deck-wide background on this slide |

---

## Layer composability

The 16 gradient classes use two custom property slots assembled by a single compositor rule:

```css
section[class*="bg-"] {
  background-image: var(--_bg-radial, none), var(--_bg-linear, none);
}
```

| Slot | Gradient classes |
| --- | --- |
| `--_bg-radial` | Corner glows, `bg-vignette`, `bg-spotlight`, `bg-duotone`, `bg-asterisk-scatter` |
| `--_bg-linear` | Edge washes, `bg-horizon`, `bg-ground`, `bg-sweep`, `bg-ambient`, `bg-frame` |

The 11 SVG mark classes set **no slot property**. They render only via `::before` and are unconstrained — add any mark to any gradient without conflict.

**Valid combinations:**

```markdown
<!-- _class: content bg-corner-tl bg-edge-right -->          ✓ radial + linear
<!-- _class: content bg-vignette bg-micro-tr -->             ✓ gradient + any mark
<!-- _class: content bg-corner-tl bg-edge-right bg-seeds --> ✓ two gradients + mark
<!-- _class: content bg-horizon bg-seeds dark -->            ✓ gradient + mark + dark
```

**Gradient slot conflict (two radials or two linears):** the class defined later in `lattice.css` wins; the first gradient is silently dropped.

```markdown
<!-- _class: content bg-corner-tl bg-corner-tr -->    ✗ both radial — corner-tr wins
```

**Two SVG marks:** both `::before` rules apply but `::before` is a singleton — only the last-defined mark's shapes render. Avoid stacking two marks.

---

## Design constraints

1. **Peripheral only.** No gradient or SVG element crosses into the content zone. Safe peripheral slots: top-right band (`x > 1100, y 68–118`), right margin (`x > 1250`), bottom corners (`y > 595`).

2. **Opacity budget.** Gradient patterns cap at 12% accent. SVG patterns paint at 28% through a mask, so individual shapes are visible without competing with content.

3. **No hex.** Every color goes through `var(--accent)` + `color-mix()`. Palette swap = background color swap automatically.

4. **Divider layout + SVG patterns.** The `divider` layout defines its own `::before` bar. Combining `divider` with an SVG `bg-*` class loses the divider bar (`::before` collision). Use gradient-only patterns (`bg-corner-*`, `bg-edge-*`, `bg-spotlight`, etc.) on divider slides.
