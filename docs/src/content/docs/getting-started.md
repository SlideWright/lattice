---
title: Getting started
description: Install the Lattice toolchain, render the example galleries, and build your first deck.
---

Lattice runs on Node.js. `npm install` pulls in Marp CLI, the Mermaid
CLI, and Puppeteer (which downloads a matching Chromium). Requires
**Node 22+**.

## Install

```sh
git clone https://github.com/slidewright/lattice.git
cd lattice
npm install
```

## Render the example galleries

The repository ships two gallery decks as ground-truth fixtures for what
the renderer produces. Render them with the bundled emulator (no network
required):

```sh
node lattice-emulator.js examples/gallery.md examples/gallery.pdf
node lattice-emulator.js examples/gallery-mermaid.md examples/gallery-mermaid.pdf
```

Open `examples/gallery.pdf` — that is the fastest answer to "what does
this produce?".

## Render your own deck

A deck is a Markdown file with a small front-matter block selecting a
palette. Each slide is separated by `---`, and a `<!-- _class: ... -->`
comment picks the layout.

```markdown
---
marp: true
theme: indaco
paginate: true
---

<!-- _class: title -->

# From Signal to Strategy

`Product Strategy · Q3 2025`

A decision framework for product leaders.

---

<!-- _class: big-number -->

## 38%

of pipeline stalls trace to a single approval step.
```

Build it to PDF with the preferred path, Marp CLI:

```sh
npx @marp-team/marp-cli deck.md --pdf --output deck.pdf
```

The same source can emit other delivery formats:

```sh
npx @marp-team/marp-cli deck.md --html   --output deck.html
npx @marp-team/marp-cli deck.md --pptx   --output deck.pptx
npx @marp-team/marp-cli deck.md --images png   # 3840×2160 PNG set
```

Run from outside the repo root? Pass the palettes explicitly:

```sh
npx @marp-team/marp-cli deck.md \
  --theme-set themes/indaco.css themes/cuoio.css lattice.css \
  --image-scale 3 --pdf --output deck.pdf
```

## What to read next

- [Authoring decks](/lattice/guides/authoring/) — the layout catalog and the
  authoring contract for each layout.
- [Themes & palettes](/lattice/guides/themes/) — pick a palette, or author your
  own.
- [Component reference](/lattice/components/) — every layout, slot,
  and modifier, browsable in any palette.
