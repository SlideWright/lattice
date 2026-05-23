---
title: Component reference
description: The interactive, themable catalog of every Lattice layout, slot, variant, and modifier.
---

Every Lattice layout is documented from a single source of truth — its
manifest. The **component reference** aggregates all of them into one
browsable catalog.

<p>
	<a class="sl-link-button primary" href="/lattice/components.html">
		Open the component reference →
	</a>
</p>

## What's in it

The reference is a two-panel portal: a clickable bucket → component
sidebar (with live filtering) on the left, and the full reference on the
right. For each layout you get:

- its **Function · Form · Substance** classification,
- **when to use** it and **when not** to,
- the **authoring skeleton** to copy,
- the **slots** it exposes (selector, required, description),
- an **anatomy** sketch,
- layout-specific **variants**, and
- **related** components to consider instead.

## Themable

A palette dropdown lets you preview the entire reference in any Lattice
palette — `indaco`, `cuoio`, `carbone`, and the rest — in light or dark
mode, driven by the palettes' real tokens. It's the quickest way to see
how the system looks in a given palette before committing a deck to it.

## Also available as Markdown

The same content is generated as a single self-contained Markdown
document, handy for reading in an editor or feeding to an LLM:
[`docs/components.md`](https://github.com/slidewright/lattice/blob/main/docs/components.md).

Both editions are generated from the component manifests by
`tools/build-docs-portal.js`, so they never drift from the layouts they
document.
