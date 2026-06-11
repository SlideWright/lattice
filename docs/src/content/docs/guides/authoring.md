---
title: Authoring decks
description: How a Lattice deck is structured — front matter, slide separators, layouts, and the authoring contract.
---

A Lattice deck is one Markdown file. You compose it from **named
layouts**, one per slide, and the engine assembles each slide against
the deck's palette. You never set fonts, colors, or positions by hand.

## Anatomy of a deck

```markdown
---
marp: true
theme: indaco       # palette (see Themes & palettes)
paginate: true
header: "Quarterly Review"
---

<!-- _class: title -->

# Deck title

`Category · Date or audience`

One-line subtitle that frames the deck.

---

<!-- _class: cards-grid -->

## Three pillars

- Reliability
  - 99.95% uptime across the quarter.
- Velocity
  - Lead time down 40% since Q1.
- Cost
  - Unit economics improved 12%.
```

Three things to notice:

1. **Front matter** selects the palette (`theme:`) and global chrome
   (`paginate`, `header`, `footer`).
2. **`---`** separates slides.
3. **`<!-- _class: NAME -->`** picks the layout for that slide. The
   layout decides the structure; your Markdown fills the slots.

## Picking a layout

Each layout has a contract: which headings, lists, and slots it expects,
and what it's for. The layouts are organized into twelve buckets by the
job they do — anchor, statement, inventory, comparison, progression,
evidence, imagery, plus the substance buckets (chart, diagram, math,
code) and the legal domain set.

The fastest way to choose is the **[component reference](/lattice/components/)**:
an interactive catalog of every layout with its slots, variants, when to
reach for it, and when not to — and you can preview the whole thing in
any Lattice palette. The same content is also available as a single
[Markdown document](https://github.com/slidewright/lattice/blob/main/reference/components.md).

## The card-style nesting rule

Card-style layouts (`cards-grid`, `cards-side`, `cards-stack`,
`split-list`, `verdict-grid`, and others) expect **nested** list items,
not inline bold titles:

```markdown
- Title
  - body text continues here
```

Not `- **Title.** body text` — the autobold rule on those layouts would
make the body inherit the title's weight. The component reference flags
this per layout, and the repo's commit-time validator catches it across
every deck.

## Modifiers

Any layout accepts universal modifiers appended to the class —
`dark`, `compact`, `loose`, `accent`, state markers, and treatments.
For example `<!-- _class: cards-grid dark -->` renders the grid on the
dark canvas. The catalog of modifiers lives in the design system
reference in the repository.

## Autocomplete in the Drawing Board

The **[Drawing Board](/lattice/drawing-board/)** is the in-browser editor. It
completes the deck vocabulary as you type, from the same catalog the component
reference and the linter use. Every suggestion is deterministic and offline;
`Ctrl-Space` summons any of them on demand.

- **`theme:` in front matter** — the registered palette names. An unknown one
  renders an unstyled white deck, so the name stays valid.
- **Inside `<!-- _class: … -->`** — layout names (tagged by bucket), then the
  modifiers that layout accepts, its own variants first and the universal ones
  after.
- **On an empty slide** — a `skeleton` completion drops the layout's slot
  scaffold already in the correct nesting, so a card-style slide starts from
  the `- Title` / `  - body` shape rather than the inline-bold trap above.
- **Other slide directives** — `_paginate`, `_header`, `_footer`, and friends
  inside an HTML comment, plus `_paginate`'s `true` / `false` / `skip` values.
- **Fence languages** — the language id after ` ``` `, including the
  `mermaid` and `chart` blocks Lattice renders.
- **Inside a `mermaid` block** — the Mermaid diagram and flow keywords.
- **Inside a `map` slide's list** — the country, state, and group names the
  basemap resolves, including blocs and categories like `European Union` or
  `Global South`, so the spelling matches on the first try.

## Where to go next

- [Themes & palettes](/lattice/guides/themes/) — choose or author a palette.
- [Component reference](/lattice/components/) — every layout's
  authoring contract.
- [Drawing Board](/lattice/drawing-board/) — author a full deck in the
  browser (autocomplete, live linting).
- [`reference/skill.md`](https://github.com/slidewright/lattice/blob/main/reference/skill.md)
  in the repo — the full deck-authoring contract.
