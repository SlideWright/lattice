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

## Where to go next

- [Themes & palettes](/lattice/guides/themes/) — choose or author a palette.
- [Component reference](/lattice/components/) — every layout's
  authoring contract.
- [`reference/skill.md`](https://github.com/slidewright/lattice/blob/main/reference/skill.md)
  in the repo — the full deck-authoring contract.
