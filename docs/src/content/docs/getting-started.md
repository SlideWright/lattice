---
title: Getting started
description: Install the Lattice toolchain, render the example galleries, and build your first deck.
---

Lattice runs on Node.js. `npm install` pulls in the Mermaid CLI and
Puppeteer (which downloads a matching Chromium); it does **not** pull
Marp — the owned engine renders every first-party path. Requires
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

The output extension picks the format — the same render, delivered as a
vector PDF, a PowerPoint, or a PNG set:

```sh
node lattice-emulator.js examples/gallery.md gallery.pptx   # PowerPoint (image slides)
node lattice-emulator.js examples/gallery.md gallery.png    # → gallery.001.png, gallery.002.png, …
```

## Render your own deck

A deck is a Markdown file with a small front-matter block selecting a
palette. Each slide is separated by `---`, and a `<!-- _class: ... -->`
comment picks the component.

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

Build it with the bundled `lattice` CLI (the owned engine) — the output
extension picks the format:

```sh
node lattice-emulator.js deck.md deck.pdf     # vector PDF
node lattice-emulator.js deck.md deck.pptx    # PowerPoint (image slides)
node lattice-emulator.js deck.md deck.png     # → deck.001.png, deck.002.png, …
```

Need a copy someone can render with Marp? Use **Export to Marp** in the Drawing
Board (or `npm run export:marp`) to produce a self-contained `.zip` — splits
baked to literal `---`, themes, assets, and a zero-install bundled renderer.
Lattice itself never renders through Marp.

## What to read next

- [Authoring decks](/guides/authoring/) — the component catalog and the
  authoring contract for each component.
- [Themes & palettes](/guides/themes/) — pick a palette, or author your
  own.
- [Component reference](/components/) — every component, slot,
  and modifier, browsable in any palette.
