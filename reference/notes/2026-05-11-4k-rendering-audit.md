---
status: resolved
version: 2
companion: 2026-05-10-multi-resolution-strategy.md
resolved: 2026-05-14
resolution: commit b3a327c — all 115 px/rem sites converted to cqi
---

# 4K rendering audit — post px→cqi refactor

## Context

Commit `d91decc` converted `:root` tokens, section structure, chrome positions,
and `calc(1280px - …)` patterns from `px` to `cqi`. At HD the output is
byte-identical. At 4K the content tokens (fonts, spacing, radii) scale
correctly because they're used *inside* section — which is a `container-type:
size` container. However, two classes of problem remain:

1. **Section-level cqi ambiguity** — critical, explains the header/footer bleed
2. **65+ component-level hardcoded px values** — explains all the small elements

---

## Critical issue: section-level cqi vs viewport fallback

### The rule

When `cqi` is used on an element that **is itself the size container**, the
spec says it falls back to the viewport for its own properties (a container
cannot query itself). Elements *inside* section correctly query section (3840px
at 4K). Section's own `padding-top: 6.875cqi` queries the nearest **ancestor**
container — which is likely the viewport.

### Consequence

| Context | Viewport | section padding-top (6.875cqi) | Elements inside (cqi) |
| --- | --- | --- | --- |
| HD PDF export | 1280px | 88px ✓ | 1280px basis ✓ |
| 4K PDF export (marp-cli) | **3840px if puppeteer viewport set correctly** | 264px ✓ | 3840px ✓ |
| VS Code preview (4K slide) | Editor pane width (~1200-2000px) | ~82-137px ✗ | 3840px ✓ |

The VS Code preview shows wrong padding because its viewport ≠ slide width.
PDF export might be correct if marp-cli sets the Puppeteer viewport to match
the slide dimensions. **This needs to be verified empirically.**

### User-reported symptom

"Padding significantly off, things bleeding into header and footer at 4K."

At 4K in VS Code preview:
- Header is at `top: 1.875cqi` = 72px (resolves from section = 3840px) ✓
- Section's `padding-top: 6.875cqi` ≈ 88–137px (resolves from viewport ≠ 3840px) ✗
- Content (using section tokens) starts at 72px–137px
- Content overlaps header (both are at ~72-88px from top)

### Fix options (evaluate in order)

**Option A — Empirical test first.** Render a 4K slide via `lattice-emulator.js`
and check the emitter's `--scale` flag or verify the Puppeteer viewport config
in `tools/screenshot.js`. If the viewport IS set to 3840px for 4K renders, the
issue only affects VS Code preview — acceptable, with a note in gotchas.

**Option B — `html { container-type: size }`.** Adds html as an ancestor
container. If html's width matches the viewport (= slide in PDF export), then
`cqi` on section falls back to html's size instead of viewport. Test: add
`html { container-type: size; }` to the top of `lattice.css` (after `:root`).
This might interact with Marp's internal layout so verify nothing breaks.

**Option C — Revert section own-properties to px, add size-class override.**
```css
section { padding-top: 88px; padding-bottom: 88px; border-top: 4px solid; }
/* Authored with size: 4k AND class: scale-4k */
section.scale-4k { padding-top: 6.875cqi; padding-bottom: 6.875cqi; border-top: 0.3125cqi solid; }
```
Downside: requires two front-matter keys for 4K slides.

**Option D — Keep as-is for PDF export; document VS Code preview limitation.**
Add a gotchas entry explaining that 4K slides in VS Code preview show incorrect
padding (viewport mismatch), while PDF export is correct.

### Recommended starting point

Run Option A first. Open a 4K slide in VS Code preview vs the PDF export and
compare the padding. If PDF is correct and only preview is wrong → Option D.
If PDF is also wrong → pursue Option B.

---

## Component-level hardcoded px audit

All 65 values below should be converted to cqi (formula: `px / 1280 * 100`).
Keep `1px`/`2px`/`3px` **borders and decorative hairlines** as px.

### Method: targeted sed pass

Run the following after reading and verifying each block. Do NOT use a blanket
`s/\([0-9]\+\)px/calc.../g` — it would corrupt border values.

```bash
grep -n "[0-9]px" lattice.css | grep -v "border:" | grep -v "border-top:" | grep -v "border-left:" | grep -v "border-bottom:" | grep -v "border-right:" | grep -v "box-shadow:" | grep -v "stroke-width" | grep -v "height:1px\|height:2px\|height:3px" | grep -v "border-radius:999"
```

Use this to find candidates, then convert each by hand or in small logical batches.

---

### 1. Corner badges (numbered cards, slot labels) — HIGH PRIORITY

Affects: cards-grid, cards-stack, cards-side, cards-wide, compare-prose,
before-after, decision, corner-tag layout.

**The pattern** (appears 8+ times): `padding-top: calc(var(--sp-sm) + 30px)`
30px → 2.34375cqi. Change to: `calc(var(--sp-sm) + 2.34375cqi)`

**Corner badge ::before** (appears 6+ times):
```css
/* current */
padding: 6px 14px; font-size: 16px;
/* fix */
padding: 0.46875cqi 1.09375cqi; font-size: 1.25cqi;
```

**Slot label badges** (before-after, decision, compare-prose — lines ~2863-2880):
```css
/* current */
padding: 6px 14px; font-size: 15px;
/* fix */
padding: 0.46875cqi 1.09375cqi; font-size: 1.171875cqi;
```

Key lines: 676, 681-682, 688, 693-694, 732, 737-738, 744, 749-750, 2861, 2870, 2875

---

### 2. Divider layout — HIGH PRIORITY (squished horizontally)

File: around line 491-496

```css
/* current */
section.divider { padding-left: 120px; }
section.divider::before { width: 6px; }
section.divider h1, section.divider h2 { max-width: 800px; }

/* fix */
section.divider { padding-left: 9.375cqi; }
section.divider::before { width: 0.46875cqi; }
section.divider h1, section.divider h2 { max-width: 62.5cqi; }
```

---

### 3. Closing layout — HIGH PRIORITY (squished horizontally)

File: around line 934-935

```css
/* current */
section.closing h2 { max-width: 700px; }
section.closing p  { max-width: 540px; }

/* fix */
section.closing h2 { max-width: 54.6875cqi; }
section.closing p  { max-width: 42.1875cqi; }
```

---

### 4. Subtopic layout — MEDIUM PRIORITY

```css
/* current — line ~502 */
section.subtopic p { max-width: 600px; }

/* fix */
section.subtopic p { max-width: 46.875cqi; }
```

---

### 5. Timeline — HIGH PRIORITY (circles and spine)

File: lines 807-832

```css
/* current */
section.timeline > :is(ol,ul)::before {
  top: 13px;
  left: calc(var(--sp-xl) + 90px); right: calc(var(--sp-xl) + 90px);
  height: 3px;      /* hairline — KEEP 3px? or convert */
}
section.timeline > :is(ol,ul) > li { width: 180px; }
section.timeline > ol > li::before { width: 26px; height: 26px; margin-bottom: 14px; }
section.timeline > ul > li::before { width: 26px; height: 26px; margin-bottom: 14px; }
section.timeline > :is(ol,ul) > li > strong { margin-bottom: 4px; }

/* fix */
section.timeline > :is(ol,ul)::before {
  top: 1.015625cqi;
  left: calc(var(--sp-xl) + 7.03125cqi); right: calc(var(--sp-xl) + 7.03125cqi);
  height: 3px;     /* decorative line — keep as px; fine at 4K */
}
section.timeline > :is(ol,ul) > li { width: 14.0625cqi; }
section.timeline > ol > li::before { width: 2.03125cqi; height: 2.03125cqi; margin-bottom: 1.09375cqi; }
section.timeline > ul > li::before { width: 2.03125cqi; height: 2.03125cqi; margin-bottom: 1.09375cqi; }
section.timeline > :is(ol,ul) > li > strong { margin-bottom: 0.3125cqi; }
```

Note on `height: 3px` (spine line): at 4K this will be hairline-thin. Converting
to `0.234375cqi` gives 9px at 4K which may look better. Visual judgement call.

---

### 6. Universal pill on list items — HIGH PRIORITY

File: around line 590-595

```css
/* current */
section > :where(ul, ol) > li > code:where(:last-child, ...) {
  padding: 3px 9px;
  /* border-radius: inherit from token — already cqi */
}

/* fix */
  padding: 0.234375cqi 0.703125cqi;
```

---

### 7. Split-panel layout — MEDIUM PRIORITY

File: lines 889-919

Key values:
- `grid-template-columns: 46px 1fr` → `3.59375cqi 1fr`
- `column-gap: 10px` → `0.78125cqi`
- `padding: 9px 16px 3px` → `0.703125cqi 1.25cqi 0.234375cqi`
- `padding-bottom: 9px` → `0.703125cqi`
- `padding: 0 16px 9px` → `0 1.25cqi 0.703125cqi`
- `gap: 4px` → `0.3125cqi`
- `margin: 4px 0 0 0` → `0.3125cqi 0 0 0`
- `top: 40px; left: 20px` (watermark) → `3.125cqi 1.5625cqi`

---

### 8. Split-steps layout — MEDIUM PRIORITY

File: lines 2311-2318

```css
/* current */
grid-template-columns: 40px 1fr; /* step number + content */
width: 40px; height: 40px;       /* step circle */
line-height: 40px;
left: 19px; top: 40px; width: 2px; /* connector line (width: KEEP 2px) */

/* fix */
grid-template-columns: 3.125cqi 1fr;
width: 3.125cqi; height: 3.125cqi;
line-height: 3.125cqi;
left: 1.484375cqi; top: 3.125cqi; /* connector line width stays 2px */
```

---

### 9. Featured cards — MEDIUM PRIORITY

File: lines 1052-1062, 2117-2134

```css
/* current */
section.featured .feat-card { padding: var(--sp-sm) 26px; }
section.featured .sub-card  { padding: 18px 22px; }

/* fix */
section.featured .feat-card { padding: var(--sp-sm) 2.03125cqi; }
section.featured .sub-card  { padding: 1.40625cqi 1.71875cqi; }
```

Same values for the non-`.feat-layout` fallback selectors (~lines 2117, 2134).

---

### 10. Verdict-grid — MEDIUM PRIORITY

File: lines 2084-2098

```css
/* current */
section.verdict-grid > ul > li { padding: 18px 22px; }
section.verdict-grid > ul > li::after { top: 8px; right: 8px; }
section.verdict-grid > ul > li > ul { gap: 5px; }

/* fix */
section.verdict-grid > ul > li { padding: 1.40625cqi 1.71875cqi; }
section.verdict-grid > ul > li::after { top: 0.625cqi; right: 0.625cqi; }
section.verdict-grid > ul > li > ul { gap: 0.390625cqi; }
```

---

### 11. List-tabular — MEDIUM PRIORITY

File: around line 854-855

```css
/* current */
section.list-tabular ol { gap: 10px; }
section.list-tabular ol > li { grid-template-columns: 44px 160px 1fr 240px; }

/* fix */
section.list-tabular ol { gap: 0.78125cqi; }
section.list-tabular ol > li { grid-template-columns: 3.4375cqi 12.5cqi 1fr 18.75cqi; }
```

---

### 12. Cards-wide — MEDIUM PRIORITY

File: lines 942, 950-951, 2149, 2155, 2160

```css
/* current */
gap: 12px (two occurrences)
border-radius: 6px; padding: 3px 9px (badge, two occurrences)
gap: 8px (nested gap)

/* fix */
gap: 0.9375cqi (×2)
border-radius: 0.46875cqi; padding: 0.234375cqi 0.703125cqi (×2)
gap: 0.625cqi
```

---

### 13. Compare-table and Glossary — LOW PRIORITY

```css
/* compare-table: lines 1006-1007 */
padding: 8px var(--sp-xs) 10px → 0.625cqi var(--sp-xs) 0.78125cqi
padding: 8px var(--sp-xs)      → 0.625cqi var(--sp-xs)

/* glossary: lines 1026-1027 */
padding: 6px var(--sp-sm) 10px → 0.46875cqi var(--sp-sm) 0.78125cqi
padding: 6px var(--sp-sm)      → 0.46875cqi var(--sp-sm)
```

---

### 14. Image layouts — LOW PRIORITY

Museum insets: `top/right/bottom/left: 20px` → `1.5625cqi` (lines ~1256-1307)
Image-razor: `56px` → `4.375cqi` (lines ~1363-1379)
Full museum: `40px` → `3.125cqi` (lines ~1295-1307)

---

### 15. Code / compare-code — LOW PRIORITY

`margin-bottom: 4px` on h3 → `0.3125cqi` (line ~1768)
`padding-bottom: calc(var(--sp-sm) + 3px)` → `calc(var(--sp-sm) + 0.234375cqi)` (lines ~1771, 1792)

---

### 16. Split-statement quote glyph — LOW PRIORITY

`top: -28px; left: 14px; font-size: 220px` (line ~2355)
→ `top: -2.1875cqi; left: 1.09375cqi; font-size: 17.1875cqi`

---

### 17. Eyebrow label spacing — LOW PRIORITY

`margin: 0 0 4px 0` (lines 341, 475) → `0 0 0.3125cqi 0`

---

### 18. Miscellaneous small gaps — LOW PRIORITY

```
blockquote gap: 6px → 0.46875cqi (line ~416)
blockquote margin: 6px → 0.46875cqi (line ~404)
content/diagram h3 margin: 4px → already fixed (done in d91decc)
list gap: 4px, 10px → 0.3125cqi, 0.78125cqi
split-brief/compare/metric margins: 4-6px → 0.3125-0.46875cqi
mermaid-error gap: 4px → 0.3125cqi (line ~1895)
mermaid-error max-height: 160px → 12.5cqi (line ~1929)
```

---

## Mermaid diagram sizing

### Symptom reported

"Mermaid diagrams look small (mostly because of fixed width/height container)."

### Root cause

The slide-context container rule now correctly uses `calc(100cqi - 2*var(--sp-2xl))`,
which at 4K = 3840 - 384 = 3456px. **This is correct.** However:

1. Mermaid reads `getBoundingClientRect()` during rendering. If the container
   resolves to 3456px *in CSS* but the browser layout hasn't committed yet
   (e.g., during VS Code preview initialization), Mermaid may read 0 or 1152px.
2. `lattice-runtime.js` may have hardcoded resize logic that needs to be
   checked for 4K awareness.
3. The non-slide fallback containers (lines 1835, 1874, 1897 — `width: 1152px`)
   stay at HD dimensions. This is intentional but means Mermaid that rendered
   in a non-slide context is HD-sized.

### Investigation steps

1. Check `lattice-runtime.js` for any `1152px` or fixed-width Mermaid logic.
2. In a 4K rendered PDF (not VS Code preview), check if the Mermaid SVG fills
   3456px or stays at ~1152px.
3. If the SVG is correctly sized, the issue is only a preview artifact.

---

## Implementation order for next session

### Step 1 — Investigate section-level cqi (30 min)

See "Critical issue" section above. Run Option A first:

```bash
# Check screenshot tool for viewport setup
grep -n "viewport\|width\|height" tools/screenshot.js | head -30
# Check emulator for how it handles 4K size
grep -n "size\|viewport\|3840\|4k" lattice-emulator.js | head -30
```

Render a single 4K slide and compare VS Code preview vs PDF to determine
which contexts have the padding issue.

### Step 2 — Fix high-priority component px values (2-3 hours)

Work through sections 1-6 of the audit above in order. These cover the
reported symptoms: corner badges, divider/closing squish, timeline circles,
universal pills.

For each section, use Edit tool with exact string match. Don't batch-replace
across different selectors — convert one logical block at a time and note the
line numbers for easy reverting if anything looks wrong.

Run `npm test` after each logical block. Run `npm run test:integration` after
the full pass.

### Step 3 — Fix medium-priority values (1-2 hours)

Sections 7-12 of the audit: split-panel, split-steps, featured, verdict-grid,
list-tabular, cards-wide.

### Step 4 — Fix low-priority values (1 hour)

Sections 13-18: compare-table, glossary, image layouts, code blocks, misc.

### Step 5 — Mermaid investigation

Check `lattice-runtime.js` for hardcoded px. Test a diagram slide at 4K
in PDF export. Verify SVG dimensions match the expected 3456px container.

### Step 6 — Visual check

Cannot do this in headless mode. Requires the desktop session (marp-vscode
preview or PDF viewer) to verify:
- HD slides look identical to pre-refactor
- 4K slides look proportionally correct (header/footer chrome, all components)
- Divider and closing slides fill horizontally
- Timeline circles are proportional
- Corner badges readable

### Step 7 — Commit

Use small focused commits per section if logical. Final commit includes:
- Component-level px→cqi conversions
- Any fix to section-level cqi (from Step 1)
- Gotchas entry for 4K rendering behavior

---

## Gotchas to document before committing

Add entries to `reference/engineering/gotchas.md`:

1. **cqi on the container element itself falls back to viewport** — section's
   own padding/border-top uses viewport for cqi resolution, not section's
   container dimensions. Elements *inside* section use section correctly.
   Impact: VS Code preview may show slightly different padding for 4K slides.

2. **Mermaid at 4K** — Describe the diagnosis result from Step 5 above.
