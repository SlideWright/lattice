# Marp Slide Deck Pipeline — Lattice Skill

## What This Skill Covers

Instructions for creating, rendering, and auditing Lattice presentation decks. Marp-flavored Markdown is the single source of truth; output formats are PDF, HTML, PPTX, and PNG sets.

**`lattice.css` is the source of truth for visual output.** All rendering modes must produce output faithful to the CSS spec. When output deviates, the CSS wins — not the renderer.

---

## Load the Right Reference

Open the relevant file before starting work. Only load what the current task needs.

| Task | Load |
|------|------|
| Writing or editing slide content | [references/design.md](./references/design.md) + [references/templates.md](./references/templates.md) |
| Choosing a layout class or template | [references/templates.md](./references/templates.md) |
| Adding a Mermaid diagram | [references/mermaid.md](./references/mermaid.md) |
| Running the render pipeline (PDF/HTML/PPTX) | [references/pipeline.md](./references/pipeline.md) |
| Comparing lattice-emulator.js vs marp-cli output | [references/audit.md](./references/audit.md) |

**Do not load all files at once.** Load only what the task requires.

---

## Rendering Modes (quick reference)

Three modes, same `.md` source file — no source changes needed.

| Situation | Use |
|-----------|-----|
| VS Code preview / quick export | Mode 1 — Marp Extension |
| Final PDF/HTML/PPTX for delivery | Mode 2 — Marp CLI (preferred) |
| LLM environment without Marp CLI | Mode 3 — lattice-emulator.js emulator |
| Verifying layout spec compliance | Mode 2 preferred, Mode 3 acceptable |

**Check for Marp CLI first:**
```bash
npx @marp-team/marp-cli --version   # use this if it returns a version
marp --version                       # or this
```
Only fall back to `lattice-emulator.js` when both commands fail.

**Mode 2 — Marp CLI:** run from the repo root and the deck's `theme:` front matter selects the palette. [`marp.config.js`](../marp.config.js) registers both `indaco` and `cuoio`; the deck declares which one it wants. Switch only the output flag for different delivery formats.
```bash
# Run from repo root — picks up marp.config.js (themeSet + imageScale: 3)
npx @marp-team/marp-cli deck.md --pdf        --output output.pdf
npx @marp-team/marp-cli deck.md --html       --output output.html
npx @marp-team/marp-cli deck.md --pptx       --output output.pptx
npx @marp-team/marp-cli deck.md --images png --output output/
```

If you must invoke from outside the repo root, pass both palettes explicitly so front matter still selects:
```bash
npx @marp-team/marp-cli deck.md \
  --theme-set themes/indaco.css themes/cuoio.css lattice.css \
  --image-scale 3 --pdf --output output.pdf
```

**Image quality.** PDF and HTML are vector end-to-end (text, SVG-rendered Mermaid, code highlighting) — no DPI knob to turn. PNG export rasterizes through Chromium and is governed by `--image-scale`; the project's [`marp.config.js`](../marp.config.js) sets `imageScale: 3` so invocations from the repo root emit 3840×2160 PNGs (3× the 1280×720 slide). Keep the explicit flag in pipelines that may not run from the repo root.

**Mode 3 — lattice-emulator.js:** `lattice.css` is auto-resolved (always included); the deck's `theme:` front matter selects the palette; explicit CLI arg only when overriding.
```bash
node lattice-emulator.js examples/gallery.md output.pdf
# produces output.html alongside the PDF; uses bundled lattice.css; palette from front matter
node lattice-emulator.js examples/gallery.md output.pdf cuoio
# explicit palette override (CLI arg has highest precedence)
node lattice-emulator.js examples/gallery.md custom-layouts.css output.pdf
# pass-through for an alternate layout CSS (rare — only for layout-engine dev work)
node lattice-emulator.js -o output.pdf -p cuoio examples/gallery.md
# named flags: -o/--output, -p/--palette, -c/--css, -q/--quiet (positional still works)
```

Palette resolution precedence: CLI flag > positional palette > `LATTICE_PALETTE` env > deck front matter `theme:` > default `indaco`. Run `node lattice-emulator.js --help` for the full reference. Exit codes: `0` success, `1` usage/file/render error.

The 2nd positional accepts either an output path or a `.css` path; if it ends in `.css` the emulator treats it as a custom layout CSS and shifts the remaining args right (backward-compat with the old 3-arg form).

Full rendering pipeline (Mermaid, PPTX, image conversion): see [references/pipeline.md](./references/pipeline.md).

---

## Visual testing — pick the right path

Four paths can produce a slide screenshot. They have meaningfully different costs; choose by what's changing and how many slides.

| Need                                                | Path                                              | 1 slide (cold) | 4 slides (amortized) | Resolution  |
| --------------------------------------------------- | ------------------------------------------------- | -------------: | -------------------: | ----------- |
| Inspect **committed baseline** (CSS unchanged)      | `pdftoppm` on `examples/gallery.pdf`              |          0.3s  |              0.1s/slide | 4000×2250   |
| **Single slide, fastest**                           | `lattice-emulator` → `screenshot-slides.js`       |          1.6s  |              0.5s/slide | configurable (use scale 3 → 3840×2160) |
| **Multi-slide, simplest** (default)                 | `marp-cli --images png --image-scale 3`           |          2.4s  |              0.7s/slide | 3840×2160   |
| Iterative loop on prebuilt HTML                     | `screenshot-slides.js` against existing HTML      |          1.6s  |              0.5s/slide | configurable |
| Cross-renderer regression                           | `npm run test:integration`                        |             —  |                  ~30s | full check  |

**Picking the path.**

- **No CSS changes? Just inspecting what's shipped?** → `pdftoppm` on the committed gallery PDF. ~10× faster than any render path because no browser is involved.
- **Single-slide spot check on current CSS?** → `lattice-emulator` to produce HTML, then `screenshot-slides.js` against that HTML. Skips marp-cli's pipeline overhead — meaningfully faster than `marp-cli --images png` for one slide.
- **Multi-slide preview, or you don't already have an HTML on disk?** → `marp-cli --images png --image-scale 3`. Single command, picks up `marp.config.js` automatically from the repo root. Per-slide cost amortizes well across a deck.
- **Iterative inner loop (changing the deck or screenshotting different slides repeatedly)?** → Build HTML once with `lattice-emulator`, then loop `screenshot-slides.js [html] [out] <idx> 3`. Each screenshot is ~1.6s with no Marp re-parse.
- **Suspect renderer drift?** → `npm run test:integration` rebuilds both galleries through both renderers and asserts page counts.

**Identifying which slide.** Don't count `---` separators in source — that's fragile during authoring (code fences containing `---`, WIP decks with stray rules, `headingDivider` mode). The reliable way is to identify slides by their *content*. `tools/screenshot-slides.js` accepts a content selector as its 3rd positional arg or `--selector EXPR`:

| Selector form        | Matches                                              |
| -------------------- | ---------------------------------------------------- |
| `all`                | every slide (default)                                |
| `<integer>`          | 1-based index (e.g. `47`)                            |
| `h2:<substring>`     | first slide whose first `<h2>` contains substring    |
| `class:<substring>`  | first slide whose `<section class="…">` contains substring |
| `footer:<substring>` | first slide whose `<footer>` contains substring     |
| `match:<substring>`  | first slide matching any of the above               |

Substring match is case-insensitive; first hit wins. When a selector matches zero slides the tool prints the first 10 H2 titles to help you correct the term.

The emulator's source splitter is fence-aware — `---` lines inside fenced code blocks (` ``` ` or `~~~`) are *not* treated as slide breaks, and `headingDivider: N` from front matter splits on h1..hN as Marp does. Rendered HTML therefore reliably has one `<section>` per intended slide, which is what the selector logic above walks.

**Recipes.**

```bash
# 1. Inspect the committed baseline (no render — fastest)
mkdir -p .scratch/peek
pdftoppm -png -r 300 -f 47 -l 47 examples/gallery.pdf .scratch/peek/slide

# 2. Single slide on current CSS, by H2 substring (no slide-counting)
mkdir -p .scratch/peek
node lattice-emulator.js deck.md .scratch/peek/deck.pdf
#  lattice.css auto-resolved · palette from front matter (no CLI args needed) ↑
node tools/screenshot-slides.js .scratch/peek/deck.html .scratch/peek h2:banner-tag 3
#                                                                    │             │
#                                                content selector ───┘             └─ deviceScaleFactor (3 = retina)

# 3. Multi-slide, single-step (simplest, no HTML on disk)
mkdir -p .scratch/peek
npx @marp-team/marp-cli deck.md --images png --output .scratch/peek/
# Run from repo root: marp.config.js registers both palettes and sets imageScale:3.
# Front matter `theme:` selects which palette. Outputs are .scratch/peek.NNN.
```

`screenshot-slides.js` 4th arg is `scale` — defaults to **3** (retina/projection-quality 3840×2160, matching marp-cli's `--image-scale 3` and `marp.config.js`). Pass `1` for fast smoke-tests where pixel quality doesn't matter. Run `node tools/screenshot-slides.js --help` for all options. Exit codes: `0` success, `1` HTML missing or selector matched no slide, `2` selector syntax error. Named-flag form: `--html PATH --out DIR --selector EXPR --scale N --quiet` — positional still works.

Numbers benchmarked on this repo with a 4-slide preview deck. Cold-start dominates single-slide cost; per-slide cost on larger decks amortizes the Chromium launch. Loading a large HTML (e.g. the 74-page gallery) into Puppeteer adds ~1s of DOM-parse time on top of Chromium cold-start, even when only one slide is screenshotted — so for repeated single-slide work against the same HTML, a future `--watch` mode that keeps the page hot would drop subsequent screenshots to ~200ms.

---

