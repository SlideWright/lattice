---
title: What is Lattice?
description: Lattice is a Marp-based slide-deck engine that turns plain Markdown into polished, repeatable, version-controlled PDFs.
---

You have been on the receiving end of slide decks where every slide is
slightly different from the one before. The headline is in one font on
page 4 and another on page 5. The accent blue drifts between two
shades. A chart copied from a 2022 deck still says "FY22" in the
corner. Nobody planned the drift — it happens because slide tools
make every slide a blank canvas, and humans are humans.

**Lattice is what you build when you want to stop that from happening.**

The author writes the deck as a plain text file in Markdown — the same
format GitHub READMEs use. For each slide, the author picks one of the
named layouts ("split panel", "verdict grid", "big number"). The
engine assembles the slide using those layouts and a shared color
palette. Every deck looks like it came from the same team — because,
structurally, it did.

Think of it this way: **Lattice is to slide decks what Markdown was
to writing on the web.** A simple text source that produces something
polished, repeatable, and easy to change.

## See it first

The repository ships with a gallery deck that shows every layout the
engine knows. Open
[`examples/gallery.pdf`](https://github.com/slidewright/lattice/blob/main/examples/gallery.pdf).
That is the answer to "what does this actually produce?". For an
interactive tour of every layout — themable in any palette — see the
[component reference](/lattice/components/).

## What you get

- **A text file in, a polished PDF out.** No dragging, no nudging, no
  alignment guides.
- **One palette, every deck.** The brand colors live in one file.
  Change them once; every deck picks them up on the next build.
- **Themed diagrams.** Flowcharts and other diagrams render with the
  deck's palette automatically — no per-diagram styling.
- **Version control.** A deck is text. A normal `git diff` shows what
  changed between revisions, the way it does for code.
- **Accessibility built in.** Contrast is WCAG AA across every layout.
- **No service, no account, no telemetry.** Lattice runs on your
  laptop or in your build system. Fully offline-capable.

## A native vocabulary for every field

The layouts aren't generic boxes. You write plain Markdown — a list, a
table, a fenced code block, an inline `$x$` — and Lattice renders it in
the notation your discipline already uses:

- **Mathematicians, quants, and ML researchers** — KaTeX equations with
  Definition / Theorem / Proof cards, derivation chains that justify
  every step, matrix decompositions, and an equation set beside its plot.
- **Project leads** — gantt charts, kanban boards, roadmaps, journeys,
  and step ladders, rendered as native SVG from a list. No Visio, no
  pasted screenshots.
- **Engineers and architects** — all 25 Mermaid diagram types, themed to
  the deck, plus state charts and side-by-side code diffs.
- **Lawyers and compliance teams** — statute stacks, authority chains,
  obligation matrices, citation cards, and regulatory-update layouts.
- **Analysts** — radar, quadrant, KPI, stats, progress, pie, and
  word-cloud layouts that turn numbers into an argument.

Fifty-eight layouts in all, every one driven by the same Markdown you
already know — and every one rendered against your chosen palette, WCAG
AA throughout, and diffable in git.

## What changes for…

**Boards and executives** receive decks that look like one team made
them — whether the author sat in finance, engineering, or legal. The
argument lands without formatting drift competing for attention.

**Authors** stop fiddling with text boxes. They write the words, pick
a layout, and the deck assembles itself.

**Brand and design** set the visual system once, in one file, and
stop policing every deck individually.

**Architects and SREs** see a deterministic transform: same Markdown
in, same PDF out. Standard Node.js runtime. Nothing to run in
production.

**InfoSec, risk, and procurement** see a tool that takes no
credentials, reads no network, holds no data, and is MIT-licensed.
The output is a standard PDF. No lock-in: if your organization ever
moves away from Lattice, every deck it produced still opens in any
PDF reader.

## What it isn't

Lattice produces documents, not stage performances. There are no
animations, no slide transitions, no presenter timers. Use Keynote or
Google Slides when you need stagecraft. Use Lattice when the deck has
to *read* as well as it *presents* — board memos, briefing books,
regulatory submissions, anything that gets emailed and stands on its
own.

## Two ways to use it

- **From a terminal.** Install Node.js, write Markdown, run one
  command, get a PDF. See [Getting started](/lattice/getting-started/).
- **From a desktop app.** **SlideWright** is the editor application
  (under active development) that wraps the same Lattice engine for
  people who do not want to touch a terminal.

## Where to go next

- [Get started](/lattice/getting-started/) — install the toolchain and render
  your first deck.
- [Author decks](/lattice/guides/authoring/) — the layout catalog and authoring
  contract.
- [Browse components](/lattice/components/) — every layout,
  themable in any palette.
