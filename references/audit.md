# Part 11: Parity Audit Workflow

When asked to compare lattice.js output against marp-cli (or to verify fixes), follow this exact sequence every time. Do not re-derive these commands.

## 11.1 Canonical Render Commands

**marp-cli reference render** (ground truth — always run this first):

```bash
npx @marp-team/marp-cli \
  --theme-set lattice.css themes/indaco.css \
  --theme indaco \
  --images png \
  --output /tmp/marp-out \
  examples/gallery.md
```

Output files: `/tmp/marp-out.001`, `/tmp/marp-out.002`, … `/tmp/marp-out.NNN`
**These files have no extension but are valid PNGs.** To view them as images, copy with `.png` suffix:

```bash
for f in /tmp/marp-out.???; do
  n=$(echo "$f" | grep -o '\.[0-9]*$' | tr -d '.')
  cp "$f" "/tmp/marp-slides/${n}.png"
done
```

**lattice.js render**:

```bash
node lattice.js examples/gallery.md lattice.css /tmp/lattice-out.pdf indaco
# produces /tmp/lattice-out.html
```

## 11.2 Screenshot Script

The screenshot script lives at `screenshot-slides.js` in the workspace root. **Do not recreate it** — it already exists. Usage:

```bash
# Default: reads /tmp/lattice-out.html, writes to /tmp/lattice-slides/
node screenshot-slides.js

# Custom paths:
node screenshot-slides.js /tmp/my-deck.html /tmp/my-slides
```

Output: `/tmp/lattice-slides/001.png` … `NNN.png` — real PNGs, viewable with `view_image`.

## 11.3 Build the Slide Manifest — ALWAYS FIRST

**Never derive slide numbers by counting `---` in the markdown source.** Frontmatter, comments, per-slide directives, and code blocks all affect the count and produce wrong numbers.

**Always build the manifest from the rendered HTML** immediately after rendering. The manifest is the ground truth for which slide number corresponds to which layout and content.

```bash
python3 -c "
import re, html as h
raw = open('/tmp/lattice-out.html').read()
sections = re.findall(r'<section[^>]*class=\"([^\"]*?)\"[^>]*>([\s\S]*?)</section>', raw)
for i, (cls, body) in enumerate(sections, 1):
    # Extract first heading text (h1/h2/h3/h4) — strip all tags
    m = re.search(r'<h[1-4][^>]*>(.*?)</h[1-4]>', body)
    heading = re.sub(r'<[^>]+>', '', m.group(1)).strip() if m else '—'
    heading = h.unescape(heading)[:60]
    print(f'{i:03d}  {cls:<30}  {heading}')
"
```

This produces output like:

```text
001  title                           The tokenization platform, designed…
002  split-panel                     Three acts and five appendices.
003  divider                         The shape of the design.
004  content                         We need to protect sensitive data…
019  split-panel                     Every architecture is a set of bets.
```

**Reference this manifest for every slide lookup.** When you want to find slide `split-panel`, read the number from the manifest — do not guess.

Also run the same command against the marp-cli HTML to confirm slide numbering is identical:

```bash
# marp-cli produces one HTML file when rendered with --output as .html
npx @marp-team/marp-cli \
  --theme-set lattice.css themes/indaco.css \
  --theme indaco \
  --output /tmp/marp-out.html \
  examples/gallery.md

python3 -c "
import re, html as h
raw = open('/tmp/marp-out.html').read()
sections = re.findall(r'<section[^>]*class=\"([^\"]*?)\"[^>]*>([\s\S]*?)</section>', raw)
for i, (cls, body) in enumerate(sections, 1):
    m = re.search(r'<h[1-4][^>]*>(.*?)</h[1-4]>', body)
    heading = re.sub(r'<[^>]+>', '', m.group(1)).strip() if m else '—'
    print(f'{i:03d}  {cls:<30}  {h.unescape(heading)[:60]}')
"
```

If the slide count differs between the two manifests, stop — there is a parsing error in `lattice.js`.

## 11.4 Comparison Workflow

1. Build the manifest (§11.3) — confirm slide count matches between marp and lattice
2. Copy marp PNG output to named files: `for f in /tmp/marp-out.???; do n=$(echo "$f" | grep -o '\.[0-9]*$' | tr -d '.'); cp "$f" "/tmp/marp-slides/${n}.png"; done`
3. Run lattice.js screenshot: `node screenshot-slides.js /tmp/lattice-out.html /tmp/lattice-slides`
4. Look up the target slide number in the manifest, then compare:

```text
view_image /tmp/marp-slides/019.png      ← reference
view_image /tmp/lattice-slides/019.png   ← candidate
```

**Prioritize by layout class.** From the manifest, collect all slides whose class includes any of these — these are the **structured layouts** with JS post-processor logic most likely to diverge (full list and definition: [templates.md → Layout Inventory](./templates.md#layout-inventory-structured-vs-unstructured)):

| Class keyword       | Why it's risky                             |
| ------------------- | ------------------------------------------ |
| `split-panel`       | Code-p and h5 placement in panel-left      |
| `featured`          | extractCard plain-text title fallback      |
| `list-criteria`     | Depth-aware `<li>` + `.crit-body` wrapping |
| `cards-wide`        | Ordered badge vs CSS counter               |
| `cards-stack`       | Inline `**Title.**` parsing inside `.card` |
| `compare-prose`     | `.compare-prose-inner` scaffold            |
| `compare-code`      | Two-block `.code-cols` wrapping            |
| `verdict-grid`      | Nested `<ul>` → badge rows                 |
| `image`             | `![bg]` anchor stripping                   |

## 11.5 Inspecting Generated HTML for a Specific Slide

To debug a specific slide's structure, extract it by its **manifest number** (convert to zero-based index):

```bash
python3 -c "
import re
html = open('/tmp/lattice-out.html').read()
sections = re.findall(r'<section[^>]*>([\s\S]*?)</section>', html)
idx = 18  # manifest number minus 1
print(sections[idx][:2000])
"
```

Compare the output against what `lattice.css` expects. **The CSS is the truth** — if the generated HTML structure does not match what the CSS selectors target, fix `lattice.js`, not the CSS.

## 11.6 Fix Verification Pattern

After editing `lattice.js` or `lattice.css`:

1. Verify syntax: `node -e "require('./lattice.js')"` — should print usage, not an error
2. Re-render: `node lattice.js examples/gallery.md lattice.css /tmp/lattice-fixed.pdf indaco`
3. Re-screenshot: `node screenshot-slides.js /tmp/lattice-fixed.html /tmp/lattice-fixed`
4. Compare **only the affected slides** — look up their numbers in the manifest, do not re-compare all slides

## 11.7 CSS vs lattice.js — Ground Rules

- `lattice.css` is the single source of truth for structure and appearance
- `lattice.js` post-processors must produce HTML that matches the CSS selectors exactly
- When comparing output, always ask: "Does the generated HTML match what the CSS expects?"
- Never add inline styles to `lattice.js` output to compensate for a CSS gap — fix the CSS
- CSS fallback rules (`:not(:has(.panel-left))`) describe the _intent_; the post-processed path must replicate that intent with real DOM structure
