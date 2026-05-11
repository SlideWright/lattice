# Rendering and inspecting slides in a sandboxed session

**Symptom an agent will recognise.** You're asked to make a visual
change to a layout. CLAUDE.md says "If you cannot rebuild and inspect
the gallery PDFs, **say so explicitly**." You assume the sandbox can't
render, hand off the visual check to the user, and ship CSS untested.
The user renders it and finds bugs you would have caught yourself.

**Root cause.** The disclaimer in CLAUDE.md was written defensively and
got over-applied. The sandbox almost always *can* render and inspect —
the agent just has to try, not assume. In a fresh session against this
repo:

- `npm install` succeeds. Puppeteer ships its own Chromium binary and
  the system libraries it needs (`libnss3`, fontconfig, etc.) are
  present in the sandbox image.
- `node lattice-emulator.js <deck>.md <out>.pdf <theme>` runs Chromium
  headlessly and emits a PDF. Marp CLI via `npx marp` does the same.
- `apt-get install poppler-utils` installs `pdftoppm`, which the harness
  Read tool needs to rasterise PDF pages to PNG when you Read a `.pdf`.
- Once `pdftoppm` is installed, `Read /tmp/out.pdf` with a `pages`
  argument renders pages as images directly into the agent's context —
  the agent literally sees the slide.

The two-line recipe at the top of any visual-change session:

```bash
npm install                       # if node_modules is absent
apt-get install -y poppler-utils  # if pdftoppm is absent
```

Then build and view:

```bash
node lattice-emulator.js examples/<deck>.md /tmp/out.pdf indaco
mkdir -p /tmp/slides
pdftoppm -r 110 -png /tmp/out.pdf /tmp/slides/s
# Then Read /tmp/slides/s-NN.png for each slide
```

`-r 110` gives roughly 1467×825 PNGs, big enough for the agent to read
small chrome text but small enough that several fit in context.

You can also let the Read tool rasterise the PDF directly with a
`pages` argument (`Read /tmp/out.pdf pages="3-7"`) once `pdftoppm` is
installed, but rasterising once with `pdftoppm` and then reading the
PNGs is cheaper if you'll look at the same slide more than once.

## What this catches that source review doesn't

The `list-editorial .lede` bug that triggered this note: a CSS grid
with `grid-template-columns: 84px 1fr` auto-places li children into
cells. In default mode the li has one text node → cell (1,2). In `.lede`
mode the li gets a `<strong>display:block</strong>` child that grabs
(1,2), pushing the trailing inline text into (2,1) — the 84px counter
column. The text wrapped one word per line.

The bug was invisible in the markup and the source CSS. It showed up
on the first render. Source review will not catch CSS-grid
auto-placement collisions, baseline misalignment, text overflow,
contrast failures on the actual surface, or any case where the rendered
result diverges from what the author imagined.

## What can still fail

Cases where the sandbox genuinely can't render and the hand-off is
real:

- Fonts not bundled in the Puppeteer container, e.g. a deck that loads
  a Google Fonts family the sandbox can't fetch — fallbacks render but
  the visual judgement is wrong. Lattice's three fonts (Playfair
  Display, Outfit, JetBrains Mono) currently all resolve.
- A long deck that takes minutes to render through Puppeteer. Build a
  one-slide reduction first.
- A change that's only visible at PowerPoint export time (`marp --pptx`
  path is slower and occasionally diverges). Render PDF first; flag
  PPTX as out of scope for the sandbox.

In all these cases, render what you *can*, then explicitly hand off
the rest. The default is "try"; the fallback is "explain what you
couldn't try and why."

## Behavioural rule

For any visual change to lattice (CSS, layouts, themes, gallery,
mermaid diagrams):

1. Make the change.
2. Build the affected deck (or a one-slide reduction).
3. Rasterise and inspect every slide that exercises the change.
4. Only after steps 1–3 do you say "ready for review" or "ready to
   merge". Source review is not enough.

If the build fails or rasterisation fails, debug *that* before deciding
the sandbox can't render. Don't pre-emptively claim a limitation you
haven't tested.

## Commits

- `29ac027` — first iteration of `list-{editorial,tribune,spectrum,scorecard,index}`
  shipped without visual verification.
- `328fd67` — visual bugs caught after rendering: `.lede` grid
  collision repaired, spectrum-sequence counter bumped.
