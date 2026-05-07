# Part 6: Rendering Pipeline

## 6.1 Architecture

```text
Source:     deck.md (Marp markdown + CSS theme)
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           │           │
 .mmd files     │           │
 (extracted)    │           │
    │           │           │
    ▼           │           │
 .svg files     │           │
 (via mmdc)     │           │
    │           │           │
    ├──► .png   │           │
    │  (sharp)  │           │
    │    │      ▼           │
    │    │   deck.html      │
    │    │   (SVGs inline)  │
    │    │      │           │
    │    │      ▼           │
    │    │   deck.pdf       │
    │    │   (Puppeteer)    │
    │    │      │           │
    │    │      ▼           │
    │    │   slide-*.jpg    │
    │    │   (pdftoppm)     │
    │    │                  │
    │    ▼                  │
    │  deck.pptx            │
    │  (PptxGenJS + PNGs)   │
    └───────────────────────┘
```

## 6.2 Architecture Decisions

**Why not Marp CLI?** Sandboxed LLM environments often lack network access. The custom renderer handles the subset of Markdown the deck uses. If Marp CLI IS available, use it — but don't depend on it.

**Why Puppeteer/Playwright for PDF?** The decks use CSS-driven layouts that LaTeX cannot reproduce. The PDF must be pixel-identical to the browser render.

**Why pre-render Mermaid to SVG?** JavaScript-dependent diagrams fail during PDF print. Pre-rendered SVGs are static content that Puppeteer prints reliably.

**Why SVG to PNG for PPTX?** PowerPoint does not natively render SVG. PNG is universally supported.

## 6.3 Prerequisites Check

```bash
# Required tools
which node && node --version
which npx
which mmdc && mmdc --version
which pdftoppm

# Find Chrome binary (STORE THIS PATH)
CHROME_PATH=$(find /home/claude/.cache/puppeteer -name "chrome" -type f 2>/dev/null | grep chrome-linux64 | head -1)
echo "Chrome: $CHROME_PATH"

# If no Puppeteer Chrome, check Playwright
PLAYWRIGHT_CHROME=$(find /home/claude/.cache -path "*/chromium*/chrome" -type f 2>/dev/null | head -1)
echo "Playwright Chrome: $PLAYWRIGHT_CHROME"

# npm packages
for pkg in pptxgenjs sharp @mermaid-js/mermaid-cli; do
  ls /home/claude/.npm-global/lib/node_modules/$pkg 2>/dev/null && echo "$pkg: found" || echo "$pkg: MISSING"
done
```

## 6.4 Step 1: Render Mermaid Diagrams

### Create Puppeteer Config

```bash
CHROME_PATH=$(find /home/claude/.cache/puppeteer -name "chrome" -type f | grep chrome-linux64 | head -1)

cat > /home/claude/puppeteer-config.json << EOF
{
  "executablePath": "$CHROME_PATH",
  "args": ["--no-sandbox", "--disable-setuid-sandbox"]
}
EOF
```

### Create .mmd Files

```bash
cat > /home/claude/diagram1.mmd << 'EOF'
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#EDE6D8',
  'primaryTextColor': '#3A342C',
  'primaryBorderColor': '#D4C5A0',
  'lineColor': '#B0A898',
  'fontFamily': 'Nunito Sans, sans-serif',
  'fontSize': '14px'
}}}%%
mindmap
  root{{Root}}
    [Category]
      (Item)
EOF
```

### Render to SVG

```bash
mmdc -i /home/claude/diagram1.mmd \
     -o /home/claude/diagrams/diagram1.svg \
     -b transparent \
     -p /home/claude/puppeteer-config.json
```

### Convert SVG to PNG

```javascript
const sharp = require('/home/claude/.npm-global/lib/node_modules/sharp');
const path = require('path');

async function convert(name) {
  await sharp(path.join('/home/claude/diagrams', `${name}.svg`), { density: 200 })
    .png()
    .toFile(path.join('/home/claude/diagrams', `${name}.png`));
}

const diagrams = ['diagram1', 'diagram2'];
Promise.all(diagrams.map(convert)).catch(console.error);
```

## 6.5 Step 2: Build HTML

The HTML file must:
- Set `@page { size: 1280px 720px; margin: 0; }` for 16:9 slides
- Use `page-break-after: always` on each slide element
- Embed pre-rendered SVGs directly (read SVG file contents, insert into HTML)
- Include all CSS inline
- Load fonts via Google Fonts `<link>` tag
- NOT require any JavaScript execution

```bash
SVG1=$(cat /home/claude/diagrams/diagram1.svg)

cat > /home/claude/deck.html << HTMLEOF
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=FONTS&display=swap" rel="stylesheet">
<style>
@page { size: 1280px 720px; margin: 0; }
.slide {
  width: 1280px; height: 720px;
  page-break-after: always;
}
/* Full CSS theme */
</style>
</head>
<body>
<div class="slide slide-title"><!-- content --></div>
<div class="slide slide-diagram">
  <div class="mermaid-box">$SVG1</div>
</div>
</body>
</html>
HTMLEOF
```

### Alternative: Custom Markdown-to-HTML Renderer

For pure-Markdown decks with no HTML divs, write a renderer that parses Marp markdown directly:

```javascript
const fs = require('fs');
const md = fs.readFileSync('deck.md', 'utf8');
const css = fs.readFileSync('theme.css', 'utf8');

// Strip frontmatter, split slides, parse markdown, wrap in HTML
// See Part 8 for renderer requirements
```

## 6.6 Step 3: Render PDF

### With Puppeteer

```javascript
const puppeteer = require('/home/claude/.npm-global/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve('/home/claude/deck.html'), {
    waitUntil: 'networkidle0', timeout: 30000
  });
  await page.pdf({
    path: '/home/claude/deck.pdf',
    width: '1280px', height: '720px',
    printBackground: true,
    preferCSSPageSize: true
  });
  await browser.close();
})();
```

### With Playwright

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file:///home/claude/deck.html', { waitUntil: 'networkidle' });
  await page.pdf({
    path: '/home/claude/deck.pdf',
    width: '1280px', height: '720px',
    printBackground: true
  });
  await browser.close();
})();
```

### Critical PDF Settings

| Setting | Value | Why |
|---------|-------|-----|
| `printBackground` | `true` | Background colors won't render without this |
| `preferCSSPageSize` | `true` | Respects `@page` dimensions (Puppeteer only) |
| `waitUntil` | `networkidle0` / `networkidle` | Ensures Google Fonts load |
| `width` / `height` | `1280px` / `720px` | 16:9 slide dimensions |

## 6.7 Step 4: Convert to Images

```bash
mkdir -p /home/claude/slides
pdftoppm -jpeg -r 200 /home/claude/deck.pdf /home/claude/slides/slide
ls /home/claude/slides/slide-*.jpg
```

Filenames are zero-padded: `slide-1.jpg` for <10 pages, `slide-01.jpg` for 10-99. Always use `ls` to find actual filenames.

## 6.8 Step 5: Convert to PPTX

```javascript
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";  // 10" × 5.625"

// Mirror CSS palette
const C = { bg: "F5F0E8", text: "3A342C", accent: "8B6914", /* ... */ };

// Title slide
const s1 = pres.addSlide();
s1.background = { fill: C.text };
s1.addText("Title", { x: 0, y: 2, w: 10, h: 1, fontSize: 54, fontFace: "Georgia", color: C.bg, align: "center" });

// Diagram slide with embedded PNG
const sN = pres.addSlide();
sN.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.8, y: 1.9, w: 8.4, h: 3.3,
  fill: { color: C.bg }, line: { color: C.border, width: 1 }, rectRadius: 0.12
});
sN.addImage({
  path: "/home/claude/diagrams/diagram1.png",
  x: 1.2, y: 2.0, w: 7.6, h: 3.0,
  sizing: { type: "contain", w: 7.6, h: 3.0 }
});

pres.writeFile({ fileName: "/home/claude/deck.pptx" });
```

### PPTX Layout Reference

| Element | Position (inches) |
|---------|------------------|
| Category label | x:0, y:0.4, w:10, align:center |
| Slide title | x:0, y:0.8, w:10, align:center |
| Subtitle | x:0, y:1.4, w:10, align:center |
| Diagram container | x:0.8, y:1.9, w:8.4, h:3.3 |
| Diagram image | x:1.2, y:2.0, w:7.6, h:3.0 |
| Body text | x:1.5, y:2.2, w:7, h:varies |
| Stat number | fontSize:40, fontFace:"Georgia" |
| Stat label | fontSize:9, charSpacing:2 |
| Page number | x:8.8, y:5.1, w:1, align:right |

### PPTX Tips

- Use `sizing: { type: "contain" }` for images
- Use `charSpacing` not `letterSpacing` (silently ignored)
- Use `rectRadius` on `ROUNDED_RECTANGLE` for cards
- Set `margin: 0` on text boxes when aligning with shapes
- Use `breakLine: true` in text arrays for multi-line
- Never use unicode bullets — use `bullet: true`

## 6.9 Step 6: Deliver

```bash
cp /home/claude/deck.md /mnt/user-data/outputs/
cp /home/claude/deck.pdf /mnt/user-data/outputs/
cp /home/claude/deck.pptx /mnt/user-data/outputs/
cp /home/claude/slides/*.jpg /mnt/user-data/outputs/
# Present via present_files tool
```

---

# Part 7: Custom Renderer Requirements

When Marp CLI is unavailable, the custom renderer must handle:

## From Frontmatter

- `marp: true` — confirm it's a Marp deck
- `theme` — ignored (CSS is inline)
- `paginate` — true/false, controls page number rendering
- `html` — true, enables HTML passthrough
- `header` — string, persistent header text
- `footer` — string, persistent footer text
- `style` — CSS block, inline into `<style>` tag

## From Slide Content

- Slide splitting on `\n---\n`
- Class directives: `<!-- _class: X -->` → class on `<section>`
- Pagination override: `<!-- _paginate: false -->`
- Header/footer overrides (both `_` and non-`_` variants)
- Markdown: headings, paragraphs, lists (2 levels), blockquotes, horizontal rules, inline bold/italic/code
- HTML passthrough: `<div>`, `<span>`, `<script>`, etc.

## Into HTML Output

- Each slide as `<section>` with class attribute
- Page number injected unless suppressed
- Header/footer injected unless suppressed
- CSS inlined in `<style>` tag
- Google Fonts loaded via `<link>` tag

## What the Renderer Does NOT Handle

- Tables (use cards instead)
- Ordered lists (use unordered with manual numbering)
- Images (embed as HTML `<img>`)
- Links (not clickable in PDF/PPTX)
- Nesting beyond 2 levels
- Marp-specific sizing directives (`w:`, `h:`, `bg:`)

## CSS Element Order Dependency

CSS themes use positional selectors (`p:first-of-type`, `p:nth-of-type(2)`, `ul > li:first-child`) to style elements by position. **Reordering elements in the Markdown breaks layout.** Document the required element order for each slide class in a per-deck companion file.

---

# Part 8: Workflow Checklist

```
□ Create Marp markdown source (deck.md) with CSS theme in frontmatter
□ Find Chrome binary path (Puppeteer or Playwright)
□ Create Puppeteer config (puppeteer-config.json)
□ Extract Mermaid blocks to .mmd files (if any diagrams)
□ Render .mmd → .svg using mmdc with puppeteer config
□ Convert .svg → .png using sharp (for PPTX embedding)
□ Build HTML with embedded SVGs and full CSS inline
□ Render HTML → PDF using Puppeteer or Playwright
□ Convert PDF → image set using pdftoppm
□ Build PPTX using PptxGenJS with embedded PNGs
□ Copy all outputs to /mnt/user-data/outputs/
□ Present files to user
```

---

# Part 9: Troubleshooting

| Problem | Fix |
|---------|-----|
| `mmdc` fails with `EISDIR` | `-p` flag needs a JSON file path, not a directory |
| PDF has no background colors | Add `printBackground: true` |
| Fonts don't render in PDF | Use `waitUntil: 'networkidle0'`, ensure Google Fonts `<link>` in HTML |
| SVGs don't appear in PPTX | Convert to PNG first using `sharp` |
| `pdftoppm` filename padding | Auto-pads by page count — use `ls` to find files |
| Puppeteer Chrome not found | `find /home/claude/.cache/puppeteer -name "chrome" -type f` |
| npm packages not found | Use full paths: `require('/home/claude/.npm-global/lib/...')` |
| Mermaid theme not applying | Include `%%{init: {...}}%%` at top of each `.mmd` |
| `str_replace` match fails | Always `view` file before editing — previous edits make views stale |
| Font size cascade | Use `px` values, not `em` — base section font-size affects `em` |
| Slide splitter eating `---` | Use `***` or `___` for horizontal rules inside slides |
| `charSpacing` in PPTX | Use `charSpacing`, not `letterSpacing` (silently ignored) |
| Google Fonts offline | Download fonts, use `@font-face` instead of `@import` |
| Heading overflow | Shorten text or widen column — never shrink font |
| Double bullets in PPTX | Never use unicode `•` — use `bullet: true` |
| Content overflows into page number | Increase bottom padding or reduce content |
| Cards touching slide edges | Add minimum 48px padding from all edges |

---

# Part 10: File Naming Convention

```
project_deck.md             Marp markdown source
project_deck.html           Intermediate HTML (debugging)
project_deck.pdf            Final PDF
project_deck.pptx           PowerPoint version
project_slide-01.jpg        Individual slide images
puppeteer-config.json       Puppeteer Chrome config
diagrams/                   Mermaid .mmd, .svg, .png files
```

---

